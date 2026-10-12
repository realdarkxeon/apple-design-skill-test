/**
 * Schema-driven content editor (dev only).
 * The form is generated from the JSON Schema of each zod schema — there is no per-section form code.
 * Validation runs live in the browser with the same zod schemas, and again on the server before writing.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { contentSchemas, fieldErrors, LOCALES, type ContentName } from '../../../src/content/schemas';
import { css } from './styles';

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: unknown[];
  format?: string;
  ui?: string;
  description?: string;
  minItems?: number;
  maxItems?: number;
  minWords?: number;
  maxWords?: number;
}

type Json = null | string | number | boolean | Json[] | { [k: string]: Json };
type Errors = Record<string, string[]>;
type Path = (string | number)[];

interface FileInfo {
  name: ContentName;
  valid: boolean;
  error?: string;
}

const LOCALE_LABEL: Record<string, string> = { en: 'EN', ru: 'RU', kk: 'KK' };

/* ------------------------------------------------------------------ helpers */

const keyOf = (path: Path) => path.map(String).join('.');

function humanize(key: string | number): string {
  if (typeof key === 'number') return `#${key + 1}`;
  const s = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function setIn(obj: Json, path: Path, value: Json): Json {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = obj.slice();
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy;
  }
  const o = (obj ?? {}) as Record<string, Json>;
  return { ...o, [head]: setIn(o[head as string] ?? null, rest, value) };
}

/** Unwrap `anyOf: [X, null]` (nullable fields). */
function unwrap(schema: JsonSchema): { schema: JsonSchema; nullable: boolean } {
  if (schema.anyOf) {
    const nonNull = schema.anyOf.filter((s) => s.type !== 'null');
    if (nonNull.length === 1) {
      return { schema: { ...nonNull[0], description: schema.description ?? nonNull[0].description }, nullable: true };
    }
  }
  return { schema, nullable: false };
}

function defaultFor(schema: JsonSchema): Json {
  const { schema: s, nullable } = unwrap(schema);
  if (nullable) return null;
  if (s.enum) return s.enum[0] as Json;
  if (s.type === 'object') {
    return Object.fromEntries(Object.entries(s.properties ?? {}).map(([k, v]) => [k, defaultFor(v)]));
  }
  if (s.type === 'array') return [];
  if (s.type === 'number' || s.type === 'integer') return 0;
  if (s.type === 'boolean') return false;
  return '';
}

/** A readable label for an array item: its title/name/role in English, if any. */
function summary(value: Json): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return typeof value === 'string' ? value : '';
  for (const k of ['title', 'name', 'role', 'key']) {
    const v = value[k];
    if (typeof v === 'string' && v) return v;
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.en === 'string' && v.en) return v.en;
  }
  return '';
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/* ------------------------------------------------------------------ field renderer */

interface FieldProps {
  schema: JsonSchema;
  value: Json;
  path: Path;
  label: string;
  errors: Errors;
  onChange: (path: Path, value: Json) => void;
  ctx: { base: string; upload: (file: File) => Promise<string> };
}

function ErrorList({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <ul className="err" role="alert">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}

function Hint({ text }: { text?: string }) {
  return text ? <p className="hint">{text}</p> : null;
}

function Field(props: FieldProps): ReactNode {
  const { schema: raw, value, path, label, errors, onChange } = props;
  const { schema, nullable } = unwrap(raw);
  const k = keyOf(path);
  const own = errors[k];

  // Translatable text: en / ru / kk side by side.
  if (schema.ui === 'i18n' || schema.ui === 'i18nLong') {
    const v = (value ?? {}) as Record<string, string>;
    const long = schema.ui === 'i18nLong';
    return (
      <div className={`field i18n ${own ? 'has-err' : ''}`}>
        <div className="label">{label}</div>
        <Hint text={schema.description} />
        <div className="locales">
          {LOCALES.map((l) => {
            const lk = `${k}.${l}`;
            const text = v[l] ?? '';
            const missing = !text.trim();
            const Tag = long ? 'textarea' : 'input';
            return (
              <label key={l} className={`locale ${missing ? 'missing' : ''} ${errors[lk] ? 'has-err' : ''}`}>
                <span className="locale-tag">
                  {LOCALE_LABEL[l]}
                  {missing && <em> missing</em>}
                  {long && schema.minWords && <small> {wordCount(text)} words</small>}
                </span>
                <Tag
                  lang={l}
                  value={text}
                  rows={long ? Math.min(14, Math.max(3, Math.ceil(text.length / 70))) : undefined}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange([...path, l], e.target.value)}
                  aria-invalid={!!errors[lk] || undefined}
                />
                <ErrorList messages={errors[lk]} />
              </label>
            );
          })}
        </div>
        <ErrorList messages={own} />
      </div>
    );
  }

  if (schema.type === 'object' && schema.properties) {
    const v = (value ?? {}) as Record<string, Json>;
    return (
      <fieldset className="group">
        {path.length > 0 && <legend>{label}</legend>}
        <Hint text={schema.description} />
        {Object.entries(schema.properties).map(([key, sub]) => (
          <Field key={key} {...props} schema={sub} value={v[key] ?? null} path={[...path, key]} label={humanize(key)} />
        ))}
        <ErrorList messages={own} />
      </fieldset>
    );
  }

  if (schema.type === 'array' && schema.items) {
    const list = (Array.isArray(value) ? value : []) as Json[];
    const item = schema.items;
    const simple = item.type === 'string' && !item.ui;
    const move = (from: number, to: number) => {
      const next = list.slice();
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      onChange(path, next);
    };
    const bounds =
      schema.minItems !== undefined && schema.minItems === schema.maxItems
        ? `exactly ${schema.minItems}`
        : [schema.minItems !== undefined && `min ${schema.minItems}`, schema.maxItems !== undefined && `max ${schema.maxItems}`]
            .filter(Boolean)
            .join(', ');
    return (
      <fieldset className={`group array ${own ? 'has-err' : ''}`}>
        <legend>
          {label} <span className="count">({list.length}{bounds ? ` · ${bounds}` : ''})</span>
        </legend>
        <Hint text={schema.description} />
        <ErrorList messages={own} />
        <ol className={simple ? 'chips' : 'items'}>
          {list.map((entry, i) => (
            <li key={i} className={simple ? 'chip-row' : 'item'}>
              <div className="item-bar">
                {!simple && (
                  <strong>
                    {humanize(i)} {summary(entry) && <span className="sum">{summary(entry)}</span>}
                  </strong>
                )}
                {simple && (
                  <input
                    value={(entry as string) ?? ''}
                    aria-label={`${label} ${i + 1}`}
                    onChange={(e) => onChange([...path, i], e.target.value)}
                    aria-invalid={!!errors[`${k}.${i}`] || undefined}
                  />
                )}
                <span className="item-actions">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} title="Move up" aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === list.length - 1} title="Move down" aria-label="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    className="danger"
                    title="Remove"
                    aria-label="Remove"
                    onClick={() => onChange(path, list.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </span>
              </div>
              {simple ? (
                <ErrorList messages={errors[`${k}.${i}`]} />
              ) : (
                <Field {...props} schema={item} value={entry} path={[...path, i]} label="" />
              )}
            </li>
          ))}
        </ol>
        <button type="button" className="add" onClick={() => onChange(path, [...list, defaultFor(item)])}>
          + Add {simple ? 'value' : 'item'}
        </button>
      </fieldset>
    );
  }

  if (schema.ui === 'image') return <ImageField {...props} schema={schema} />;

  if (schema.enum) {
    return (
      <label className={`field ${own ? 'has-err' : ''}`}>
        <span className="label">{label}</span>
        <select value={String(value ?? '')} onChange={(e) => onChange(path, e.target.value)}>
          {schema.enum.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
        <ErrorList messages={own} />
      </label>
    );
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <label className={`field ${own ? 'has-err' : ''}`}>
        <span className="label">{label}</span>
        <input type="number" value={value as number} onChange={(e) => onChange(path, Number(e.target.value))} />
        <ErrorList messages={own} />
      </label>
    );
  }

  // Plain strings: url / email / month / long text / text.
  const inputType =
    schema.ui === 'url' || schema.format === 'uri' ? 'url' : schema.ui === 'email' ? 'email' : schema.ui === 'month' ? 'month' : 'text';
  const str = (value as string) ?? '';
  return (
    <label className={`field ${own ? 'has-err' : ''}`}>
      <span className="label">
        {label}
        {nullable && <small> (optional — leave empty)</small>}
      </span>
      <Hint text={schema.description} />
      {schema.ui === 'long' ? (
        <textarea value={str} rows={4} onChange={(e) => onChange(path, e.target.value)} />
      ) : (
        <input
          type={inputType}
          value={str}
          placeholder={inputType === 'url' ? 'https://' : inputType === 'month' ? 'YYYY-MM' : undefined}
          onChange={(e) => onChange(path, nullable && e.target.value === '' ? null : e.target.value)}
          aria-invalid={!!own || undefined}
        />
      )}
      {inputType === 'url' && str && /^https?:\/\//.test(str) && (
        <a className="open" href={str} target="_blank" rel="noreferrer">
          open ↗
        </a>
      )}
      <ErrorList messages={own} />
    </label>
  );
}

function ImageField({ value, path, label, errors, onChange, ctx, schema }: FieldProps) {
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const own = errors[keyOf(path)];
  const src = typeof value === 'string' && value ? `${ctx.base}${value}` : '';
  return (
    <div className={`field image ${own ? 'has-err' : ''}`}>
      <span className="label">{label}</span>
      <Hint text={schema.description} />
      <div className="image-row">
        <div className="preview">{src ? <img src={src} alt="" /> : <span>No image</span>}</div>
        <div className="image-controls">
          <input value={(value as string) ?? ''} onChange={(e) => onChange(path, e.target.value)} aria-label={`${label} path`} />
          <label className="upload">
            {busy ? 'Uploading…' : 'Upload image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setBusy(true);
                setUploadError('');
                try {
                  onChange(path, await ctx.upload(file));
                } catch (err) {
                  setUploadError(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <ErrorList messages={uploadError ? [uploadError] : undefined} />
          <ErrorList messages={own} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ app */

export default function Editor({ base }: { base: string }) {
  const api = `${base}/__editor/api`;
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [current, setCurrent] = useState<ContentName | null>(null);
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [data, setData] = useState<Json>(null);
  const [saved, setSaved] = useState('');
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'error'; text: string }>({ kind: 'idle', text: '' });
  const [loadError, setLoadError] = useState('');
  const dirty = data !== null && JSON.stringify(data) !== saved;
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${api}/${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'x-content-editor': '1', ...(init?.headers ?? {}) },
      });
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    },
    [api],
  );

  const refreshFiles = useCallback(async () => {
    const { ok, body } = await request('files');
    if (ok) setFiles(body.files);
    else setLoadError(body.error ?? 'Could not list files');
  }, [request]);

  const open = useCallback(
    async (name: ContentName) => {
      if (dirtyRef.current && !confirm('You have unsaved changes. Discard them?')) return;
      const { ok, body } = await request(`content/${name}`);
      if (!ok) {
        setLoadError(body.error ?? `Could not load ${name}`);
        return;
      }
      setLoadError('');
      setCurrent(name);
      setSchema(body.schema);
      setData(body.data);
      setSaved(JSON.stringify(body.data));
      setServerErrors({});
      setStatus({ kind: 'idle', text: '' });
      history.replaceState(null, '', `#${name}`);
    },
    [request],
  );

  useEffect(() => {
    refreshFiles();
    const initial = location.hash.slice(1) as ContentName;
    open(initial in contentSchemas ? initial : 'hero');
  }, [refreshFiles, open]);

  // Unsaved-changes warning on tab close / reload.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Live validation with the same zod schema the build uses.
  const clientErrors = useMemo<Errors>(() => {
    if (!current || data === null) return {};
    const result = contentSchemas[current].safeParse(data);
    return result.success ? {} : fieldErrors(result.error);
  }, [current, data]);

  const errors = Object.keys(serverErrors).length ? serverErrors : clientErrors;
  const errorCount = Object.values(errors).reduce((n, m) => n + m.length, 0);

  const onChange = useCallback((path: Path, value: Json) => {
    setData((d) => setIn(d, path, value));
    setServerErrors({});
    setStatus({ kind: 'idle', text: '' });
  }, []);

  const save = async () => {
    if (!current) return;
    setStatus({ kind: 'saving', text: 'Saving…' });
    const { ok, body } = await request(`content/${current}`, { method: 'POST', body: JSON.stringify(data) });
    if (ok) {
      setSaved(JSON.stringify(data));
      setServerErrors({});
      setStatus({ kind: 'ok', text: 'Saved. The dev site reloads with the new content.' });
      refreshFiles();
    } else {
      setServerErrors(body.errors ?? { '(root)': [body.error ?? 'Save failed'] });
      setStatus({ kind: 'error', text: 'Not saved — fix the highlighted fields. Nothing was written.' });
    }
  };

  const upload = useCallback(
    async (file: File) => {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const { ok, body } = await request('upload', { method: 'POST', body: JSON.stringify({ filename: file.name, data: btoa(bin) }) });
      if (!ok) throw new Error(body.error ?? 'Upload failed');
      return body.path as string;
    },
    [request],
  );

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[data-save]')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="editor">
      <style>{css}</style>
      <aside className="sidebar">
        <div className="brand">
          Content editor <span className="badge">dev only</span>
        </div>
        <nav>
          <ul>
            {files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  className={f.name === current ? 'active' : ''}
                  onClick={() => open(f.name)}
                  title={f.valid ? 'Valid' : f.error ?? 'Has validation errors'}
                >
                  <span className={`dot ${f.valid ? 'ok' : 'bad'}`} aria-hidden="true" />
                  {f.name}.json
                  {f.name === current && dirty && <span className="unsaved">●</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="links">
          {LOCALES.map((l) => (
            <a key={l} href={`${base}/${l}/`} target="_blank" rel="noreferrer">
              View /{l}/ ↗
            </a>
          ))}
        </div>
      </aside>

      <main className="main">
        <header className="toolbar">
          <div>
            <h1>{current ? `${current}.json` : 'Loading…'}</h1>
            <p className={`status ${status.kind}`} role="status">
              {status.text || (dirty ? 'Unsaved changes' : 'No changes')}
              {errorCount > 0 && <span className="errcount"> · {errorCount} validation error{errorCount > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div className="toolbar-actions">
            <button type="button" disabled={!dirty} onClick={() => current && open(current)} className="secondary">
              Revert
            </button>
            <button type="button" data-save disabled={!dirty || status.kind === 'saving'} onClick={save}>
              Save
            </button>
          </div>
        </header>
        {loadError && <p className="banner">{loadError}</p>}
        {errors['(root)'] && <ErrorList messages={errors['(root)']} />}
        {schema && data !== null && (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field schema={schema} value={data} path={[]} label="" errors={errors} onChange={onChange} ctx={{ base, upload }} />
          </form>
        )}
      </main>
    </div>
  );
}
