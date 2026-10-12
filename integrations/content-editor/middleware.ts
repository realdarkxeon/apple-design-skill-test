/**
 * Dev-only JSON API for the content editor (mounted by the integration in `astro dev` only).
 *
 *   GET  /__editor/api/files            → list of content files with validity
 *   GET  /__editor/api/content/:name    → { data, schema } (schema = JSON Schema from zod)
 *   POST /__editor/api/content/:name    → validate with zod; 400 { errors } or write file
 *   POST /__editor/api/upload           → { filename, data(base64) } → saved to public/images/uploads
 *
 * Schemas are loaded through Vite on every request, so edits to schemas.ts apply without a restart.
 */
import { existsSync } from 'node:fs';
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, extname, basename } from 'node:path';
import type { ViteDevServer } from 'vite';

type SchemasModule = typeof import('../../src/content/schemas');

const API = '/__editor/api/';
const MAX_BODY = 8 * 1024 * 1024;
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg']);

export function createEditorMiddleware(server: ViteDevServer, root: URL) {
  const contentDir = new URL('src/content/', root).pathname;
  const uploadDir = new URL('public/images/uploads/', root).pathname;
  const loadSchemas = () => server.ssrLoadModule('/src/content/schemas.ts') as Promise<SchemasModule>;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? '';
    const at = url.indexOf(API);
    if (at === -1) return next();
    const route = url.slice(at + API.length).split('?')[0];

    try {
      // Only accept requests from the editor page itself (blocks cross-site writes to localhost).
      if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'Cross-origin request refused' });

      const mod = await loadSchemas();
      const { contentSchemas, fieldErrors } = mod;

      if (req.method === 'GET' && route === 'files') {
        const files = await Promise.all(
          mod.contentNames.map(async (name) => {
            const parsed = await readJson(join(contentDir, `${name}.json`));
            const result = parsed.ok ? contentSchemas[name].safeParse(parsed.value) : null;
            return { name, valid: !!result?.success, error: parsed.ok ? undefined : parsed.error };
          }),
        );
        return send(res, 200, { files });
      }

      const match = route.match(/^content\/([a-z]+)$/);
      if (match) {
        const name = match[1] as keyof typeof contentSchemas;
        const schema = contentSchemas[name];
        if (!schema) return send(res, 404, { error: `Unknown content file: ${name}` });
        const file = join(contentDir, `${name}.json`);

        if (req.method === 'GET') {
          const parsed = await readJson(file);
          if (!parsed.ok) return send(res, 500, { error: parsed.error });
          const jsonSchema = mod.toEditorSchema(schema);
          return send(res, 200, { data: parsed.value, schema: jsonSchema });
        }

        if (req.method === 'POST') {
          const body = await readBody(req);
          let data: unknown;
          try {
            data = JSON.parse(body);
          } catch {
            return send(res, 400, { errors: { '(root)': ['Body is not valid JSON'] } });
          }
          const result = schema.safeParse(data);
          if (!result.success) return send(res, 400, { errors: fieldErrors(result.error) });
          // Write the submitted shape (not the parsed output) so key order and formatting stay stable.
          const tmp = `${file}.${process.pid}.tmp`;
          await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
          await rename(tmp, file);
          return send(res, 200, { ok: true });
        }
      }

      if (req.method === 'POST' && route === 'upload') {
        const { filename, data } = JSON.parse(await readBody(req)) as { filename?: string; data?: string };
        if (!filename || !data) return send(res, 400, { error: 'filename and data are required' });
        const ext = extname(filename).toLowerCase();
        if (!IMAGE_EXT.has(ext)) return send(res, 400, { error: `Unsupported image type ${ext || '(none)'}` });
        const stem =
          basename(filename, extname(filename))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'image';
        await mkdir(uploadDir, { recursive: true });
        let out = `${stem}${ext}`;
        for (let i = 2; existsSync(join(uploadDir, out)); i++) out = `${stem}-${i}${ext}`;
        const target = join(uploadDir, out);
        // Vite only serves a new public file once its watcher has seen it; answer after that,
        // so the editor's preview never requests the image too early.
        const seen = waitForWatcher(server, target);
        await writeFile(target, Buffer.from(data, 'base64'));
        await seen;
        return send(res, 200, { path: `/images/uploads/${out}` });
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      return send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  };
}

function waitForWatcher(server: ViteDevServer, file: string, timeoutMs = 3000) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      server.watcher.off('add', onAdd);
      server.watcher.off('change', onAdd);
      resolve();
    };
    const onAdd = (path: string) => path === file && done();
    const timer = setTimeout(done, timeoutMs);
    server.watcher.on('add', onAdd);
    server.watcher.on('change', onAdd);
  });
}

function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (req.headers['x-content-editor'] !== '1') return false;
  if (!origin) return true; // same-origin fetches may omit Origin on some browsers; the custom header already forces CORS
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJson(file: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: JSON.parse(await readFile(file, 'utf8')) };
  } catch (err) {
    return { ok: false, error: `${basename(file)}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
