import { useEffect, useId, useRef, useState } from 'react';

interface Language {
  code: string;
  name: string;
  short: string;
  href: string;
}

interface Props {
  current: string;
  label: string;
  languages: Language[];
}

/**
 * Language menu. Opens on press (not release), originates from its trigger
 * (transform-origin = trigger corner), and keeps the reader's current section
 * when switching locale (/en/#projects → /ru/#projects).
 */
export default function LanguageMenu({ current, label, languages }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pressedRef = useRef(false);
  const menuId = useId();
  const active = languages.find((l) => l.code === current) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const withSection = (href: string) => {
    const section = document.documentElement.dataset.section || location.hash.slice(1);
    return section ? `${href}#${section}` : href;
  };

  return (
    <div className="lang" ref={rootRef} data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pressedRef.current = true;
          setOpen((o) => !o);
        }}
        onClick={() => {
          // Keyboard activation (pointer presses were already handled on pointer-down).
          if (pressedRef.current) {
            pressedRef.current = false;
            return;
          }
          setOpen((o) => !o);
        }}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M1.6 8h12.8M8 1.4c1.8 1.9 2.7 4.1 2.7 6.6S9.8 12.7 8 14.6M8 1.4C6.2 3.3 5.3 5.5 5.3 8s.9 4.7 2.7 6.6"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
        {/* Accessible name starts with the visible code (label-in-name), then explains it. */}
        <span>{active.short}</span>
        <span className="visually-hidden">{` — ${label}: ${active.name}`}</span>
      </button>
      <ul id={menuId} className="lang-menu" role="list" aria-label={label}>
        {languages.map((l) => (
          <li key={l.code}>
            <a
              href={l.href}
              hrefLang={l.code}
              lang={l.code}
              aria-current={l.code === current ? 'page' : undefined}
              tabIndex={open ? 0 : -1}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                window.location.href = withSection(l.href);
              }}
            >
              <span>{l.name}</span>
              {l.code === current && (
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
                  <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </a>
          </li>
        ))}
      </ul>
      <style>{css}</style>
    </div>
  );
}

const css = `
.lang { position: relative; }
.lang-trigger {
  display: inline-flex; align-items: center; gap: 0.375rem;
  min-height: 2.25rem; padding: 0.375rem 0.75rem;
  border: 0; border-radius: 999px;
  background: var(--fill); color: var(--text);
  font: inherit; font-size: 0.875rem; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: transform 160ms var(--ease-out), background-color 160ms var(--ease-out);
}
.lang-trigger:active { transform: scale(0.95); background: var(--fill-strong); transition-duration: 100ms; }
.lang-menu {
  position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 60;
  min-width: 11rem; margin: 0; padding: 0.375rem; list-style: none;
  border-radius: var(--radius);
  background: var(--material);
  -webkit-backdrop-filter: blur(30px) saturate(180%); backdrop-filter: blur(30px) saturate(180%);
  box-shadow: var(--shadow-lg), inset 0 1px 0 var(--material-edge);
  transform-origin: top right;
  opacity: 0; transform: scale(0.94); filter: blur(4px); visibility: hidden;
  transition: opacity 180ms var(--ease-in), transform 180ms var(--ease-in), filter 180ms var(--ease-in), visibility 0s linear 180ms;
}
.lang[data-open] .lang-menu {
  opacity: 1; transform: none; filter: none; visibility: visible;
  transition: opacity 240ms var(--ease-out), transform 240ms var(--ease-out), filter 240ms var(--ease-out), visibility 0s;
}
.lang-menu a {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  min-height: 2.75rem; padding: 0.5rem 0.75rem; border-radius: 0.75rem;
  color: var(--text); font-size: 1rem; font-weight: 500; letter-spacing: 0; text-decoration: none;
}
.lang-menu a:hover, .lang-menu a:focus-visible { background: var(--fill); }
.lang-menu a:active { background: var(--fill-strong); }
.lang-menu a[aria-current] { color: var(--link); font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .lang-menu, .lang[data-open] .lang-menu { transform: none; filter: none; }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .lang-menu { background: var(--bg-raised); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
@media (prefers-contrast: more) { .lang-menu { border: 1px solid var(--text); } }
`;
