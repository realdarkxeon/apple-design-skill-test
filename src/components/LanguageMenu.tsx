import { useState } from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

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
 * Language menu (shadcn/ui DropdownMenu on Radix). Radix opens it on press, handles
 * focus, arrow keys and Escape, and grows it from the trigger's corner. Switching
 * locale keeps the reader's current section (/en/#projects → /ru/#projects).
 */
export default function LanguageMenu({ current, label, languages }: Props) {
  const active = languages.find((l) => l.code === current) ?? languages[0];
  // Read the section in view when the menu opens, so the links are plain, correct hrefs
  // (modified clicks and "copy link" keep working; Radix turns Enter into a click).
  const [section, setSection] = useState('');
  const withSection = (href: string) => (section ? `${href}#${section}` : href);

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (open) setSection(document.documentElement.dataset.section || location.hash.slice(1));
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5 px-3 text-sm tracking-[0.01em] active:scale-95">
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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={label}>
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            asChild
            className={l.code === current ? 'font-semibold text-link focus:text-link' : undefined}
          >
            <a
              href={withSection(l.href)}
              hrefLang={l.code}
              lang={l.code}
              aria-current={l.code === current ? 'page' : undefined}
            >
              <span>{l.name}</span>
              {l.code === current && (
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
                  <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
