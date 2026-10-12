/**
 * Base-aware URLs. Every internal link and asset goes through here so the site works at
 * username.github.io/ and username.github.io/repo-name/ alike.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** url('en/') → '/repo/en/'; url('/images/a.svg') → '/repo/images/a.svg' */
export function url(path = ''): string {
  return `${BASE}/${path.replace(/^\/+/, '')}`;
}

export const localeHome = (locale: string) => url(`${locale}/`);

/** Absolute URL for canonical / OG / hreflang. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(url(path), site ?? 'http://localhost').href;
}
