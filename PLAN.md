# MadsDev site — build plan

Astro 7 (static) + TypeScript, React islands only where interaction needs it, zod 4 schemas shared by the
site build and a dev-only `/admin` editor. Deployed to GitHub Pages by GitHub Actions.

Runtime note: Astro 7 requires Node ≥ 22.12. The local default here is Node 20, so all commands run with
Node 24 (`~/.nvm/versions/node/v24.13.0`); `.nvmrc` pins 24 and `package.json#engines` documents it.

## Docs checked (Oct 2026)

- i18n: `i18n.locales`, `defaultLocale`, `routing.prefixDefaultLocale`, `routing.redirectToDefaultLocale`;
  `astro:i18n` helpers (`getRelativeLocaleUrl`). With static output, `src/pages/index.astro` always renders at `/`.
- Integration API: `astro:config:setup` gets `command: 'dev' | 'build' | 'preview' | 'sync'` and `injectRoute({ pattern, entrypoint, prerender })`
  (entrypoint may be a `URL`). `astro:server:setup` gets the Vite dev `server` → `server.middlewares.use(...)`.
- GitHub Pages: `site` + `base`; workflow with `actions/checkout@v7`, `actions/deploy-pages@v5`.
  `actions/configure-pages@v6` outputs `origin` and `base_path`, which feed `SITE_URL` / `BASE_PATH`.
- `import.meta.env.BASE_URL` follows `trailingSlash`; all links go through one `url()` helper that normalises it.

## File tree

```
.github/workflows/deploy.yml        build + deploy on push to main
astro.config.mjs                    site/base from env → settings.json fallback; i18n; integrations
integrations/content-editor/
  index.ts                          Astro integration: injectRoute('/admin') + middleware, only when command === 'dev'
  middleware.ts                     GET/POST /__editor/api/* (read/validate/write JSON, image upload)
  AdminPage.astro                   page shell that mounts the editor (client:only)
  editor/                           React editor (schema → form)
src/content/
  schemas.ts                        one zod schema per file (+ field meta: i18n, long, url, image)
  settings.json ui.json hero.json mission.json services.json projects.json
  experience.json recommendations.json people.json contact.json
src/lib/
  content.ts                        load + validate every JSON file at build (throws with field paths)
  i18n.ts url.ts                    locale list, t(), base-aware url()
src/components/                     Header, Hero, Mission, Services, Projects, Experience,
                                    Recommendations (React tabs), People, Contact (React Cal embed),
                                    LanguageSwitcher (React), Footer, Seo
src/layouts/Base.astro              <html lang>, hreflang, OG, theme, skip link
src/pages/index.astro               / → /en/ (meta refresh + link)
src/pages/[lang]/index.astro        the single page per locale
src/pages/[lang]/404.astro          localized 404
src/pages/404.astro                 root 404 served by GitHub Pages; picks locale from the URL
src/pages/robots.txt.ts             robots with sitemap URL
public/images/                      project images, OG image, favicon
scripts/                            check-strings, verify-dist, OG image generation
```

## Content schema

Translatable field = `{ en, ru, kk }`, each non-empty (missing translation fails validation).
Field kinds carried in zod `.meta({ ui })`: `i18n`, `i18nLong`, `url`, `image`, `email`, plain string.
The editor walks `z.toJSONSchema(schema)` and picks widgets from `ui` / `format`.

| File | Shape (abridged) |
| --- | --- |
| settings.json | siteUrl, basePath, calUsername, email, telegram, linkedin, github, founderName |
| ui.json | nav labels, CTA labels, section eyebrows, lang names, 404 copy, meta title/description, aria labels |
| hero.json | name, offer, subline, primaryCta, secondaryCta, availability |
| mission.json | title, body (150–250 words per locale, enforced by schema), signature |
| services.json | title, intro, items[3]: { key, title, description, example, metric } |
| projects.json | title, items[4]: { title, problem, solution, result, stack[], link, image, imageAlt } |
| experience.json | title, items[3–4]: { role, organization, start, end?, impact } |
| recommendations.json | title, tabs { read, watch, use }: 5 × { title, creator, link, why } |
| people.json | title, items[5]: { name, role, meaning, link } |
| contact.json | title, intro, fallbackTitle, embedFailed |

## Phases and verification

1. **Scaffold** — package.json, Astro config (i18n en/ru/kk, prefix all, base from env), root redirect,
   GitHub workflow. ✔ `npm run build` passes; `dist/en/`, `dist/ru/`, `dist/kk/` exist; build with
   `BASE_PATH=/repo` puts base in links.
2. **Content** — schemas + all demo content written natively in en/ru/kk. ✔ `astro check` 0 errors;
   a content-validation script parses every file; a deliberately broken file makes the build fail.
3. **Public UI** — sections per apple-design (system font stack with Kazakh coverage, size-specific
   tracking/leading, translucent header with scroll-edge mask, press feedback on pointer-down,
   critically-damped interruptible springs for tab indicator, reduced motion/transparency/contrast).
   ✔ build passes; `scripts/check-strings.mjs` finds no hardcoded user-facing text in components;
   screenshots at 360px and desktop.
4. **Editor** — integration + middleware + schema-driven React UI. ✔ in dev: POST an edit in each locale,
   page HTML shows it; invalid POST returns 400 with field errors and file is unchanged; drive the UI in
   headless Chrome (Playwright); `npm run build` → no `admin` in `dist/`.
5. **SEO/polish** — meta, OG image (PNG), sitemap with hreflang alternates, robots.txt, favicon,
   hreflang links. ✔ Lighthouse (perf + a11y ≥ 90) against `astro preview`.
6. **README** — setup, Pages, base path, editor flow, Cal.com, replacing content.

## Status (2026-10-12) — all phases done and verified

1. Scaffold — `npm run build` passes; `BASE_PATH=/repo` build prefixes every link and asset.
2. Content — `astro check` 0 errors; an emptied translation fails the build with `hero.json → name.ru`.
3. Public UI — no horizontal overflow at 360px; hero CTA above the fold at 360×640 in en/ru/kk;
   string checker passes (and catches injected test strings); touch swipe, rubber-band, keyboard tabs,
   language switch keeping `#section`, and localized 404 all exercised in Chrome.
4. Editor — edited `hero.offer` in all three locales via the UI: saved, written, an open `/ru/` tab
   hot-reloaded, all locales showed it. Invalid values rejected inline and by the server (400, file
   unchanged). Upload with preview, reorder, add/remove, unsaved-changes guard verified.
   `dist/` has no admin files (checked on every build).
5. SEO — Lighthouse (mobile): performance 99–100, accessibility/best practices/SEO 100 on en, ru, kk.
   axe: 0 violations in light and dark. Sitemap has hreflang alternates; robots.txt; OG PNG; favicons.
6. README written.
