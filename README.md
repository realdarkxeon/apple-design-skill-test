# MadsDev — multilingual personal site + local content editor

A static Astro site in English, Russian and Kazakh, deployed to GitHub Pages, with a content editor at
`/admin` that exists **only** while you run `npm run dev`.

- **Site:** one page per locale (`/en/`, `/ru/`, `/kk/`), `/` redirects to `/en/`, localized 404s.
- **Content:** every visible string lives in `src/content/*.json`, validated by zod schemas in
  `src/content/schemas.ts`. A broken file stops the build with the exact field path.
- **Editor:** generated from the same schemas; validates before writing; hot-reloads the dev site.
- **No** CMS, database, auth, serverless functions or third-party services besides the Cal.com embed.
  No web fonts: the system font stack covers Kazakh Cyrillic on macOS, iOS, Windows and Android.

> All names, projects, testimonials and contact handles are **invented demo content**.
> Replace them before publishing (see [Replace the demo content](#replace-the-demo-content)).

## Requirements

- Node.js **22.12 or newer** (Astro 7). `.nvmrc` pins Node 24: run `nvm use`.
- npm 10+.

```bash
npm install
npm run dev        # http://localhost:4321/en/  ·  editor: http://localhost:4321/admin
npm run check      # astro check + "no hardcoded strings" check
npm run build      # static build to dist/ + verification (all locales present, no admin files)
npm run preview    # serve dist/ locally
```

## Project structure

```
src/content/          JSON content (one file per section) + schemas.ts
src/components/       Astro sections; React islands: LanguageMenu, RecommendationTabs, CalEmbed
src/lib/              content loader (validates), i18n helpers, base-aware url(), spring physics
src/pages/            [lang]/index.astro, [lang]/404.astro, 404.astro, index.astro (redirect), robots.txt
integrations/content-editor/   dev-only Astro integration: /admin route, JSON API, React editor
public/images/        project images, uploads, og.png
scripts/              verify-dist, check-strings, validate-content, generate-images
.github/workflows/deploy.yml   build + deploy to GitHub Pages on push to main
```

## Publish on GitHub Pages

1. **Create the repository** on GitHub and push this folder to its `main` branch:
   ```bash
   git init && git add -A && git commit -m "Initial site"
   git branch -M main
   git remote add origin git@github.com:<username>/<repo>.git
   git push -u origin main
   ```
   Name it `<username>.github.io` to serve the site at the root, or anything else to serve it at
   `https://<username>.github.io/<repo>/`.
2. **Enable Pages via Actions:** repository **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The workflow runs
   `astro check`, builds, and deploys `dist/`.

### Base path

You don't set it by hand for deployment. The workflow reads the Pages URL with
`actions/configure-pages` and passes it to the build as `SITE_URL` and `BASE_PATH`, so the same
code works at `username.github.io/` and `username.github.io/repo-name/`. Every internal link and
asset goes through `url()` in `src/lib/url.ts`, which respects Astro's `base`.

For local builds, `astro.config.mjs` falls back to `siteUrl` and `basePath` in
`src/content/settings.json`. To test a sub-path build locally:

```bash
SITE_URL=https://username.github.io BASE_PATH=/repo-name npm run build && npm run preview
```

With a custom domain, set the domain in **Settings → Pages**; `configure-pages` then reports it and
the base path becomes `/`.

## Edit content with the local editor

1. `npm run dev` and open **http://localhost:4321/admin** (with a base path: `/repo-name/admin`).
2. Pick a file in the sidebar. The form is generated from its schema:
   - translatable fields show **EN / RU / KK side by side**; an empty translation is marked *missing*;
   - URLs, emails and months get matching inputs; images get **upload with preview**
     (saved to `public/images/uploads/`);
   - lists support add, remove and move up/down, and show their size rules (for example "exactly 4").
3. Errors appear inline as you type. **Save** (or ⌘/Ctrl+S) writes the JSON only if the server-side
   zod validation passes. Otherwise it shows the field errors and writes nothing.
4. Any open site tab reloads with the new content automatically.
5. Leaving with unsaved changes asks for confirmation.

Then publish:

```bash
git add src/content public/images
git commit -m "Update content"
git push            # GitHub Actions rebuilds and deploys
```

The editor is wired in by `integrations/content-editor/` only when `command === 'dev'`, so it
does not exist in production. `npm run build` checks this: it fails if `dist/` contains any
admin or editor file.

## Connect Cal.com

1. Create an event type on [cal.com](https://cal.com), for example a 30-minute call.
2. In the editor, open `settings.json` and set **Cal Username** to `your-username/your-event-slug`
   (for example `madsdev/30min`). The demo value `madsdev` isn't a real Cal.com account, so the demo
   shows the "calendar didn't load" message.

   An event link (`user/event`) opens straight into the booking calendar and is what I tested. A bare
   username also works if your Cal.com profile page loads in an embed, but an event link is the
   reliable choice.
3. The embed loads lazily when the contact section comes near the viewport. If the script is
   blocked, the link fails or nothing loads within 15 seconds, the page shows a message. The
   email, Telegram, LinkedIn and GitHub links next to the calendar are plain links and always work.

## Replace the demo content

Everything is in the editor (or directly in `src/content/`):

| File | What to change |
| --- | --- |
| `settings.json` | site URL, Cal.com link, email, Telegram, LinkedIn, GitHub |
| `hero.json` | your name, role, one-line offer, CTA labels, availability |
| `mission.json` | your "why" (the schema enforces 150–250 words per language) |
| `services.json` | three offers, each with a number-led example outcome |
| `projects.json` | four projects: problem, solution, result, testimonial, stack, link, image (upload in the editor) |
| `experience.json` | 3–4 roles; leave **End** empty for "present" |
| `recommendations.json` | five each to read, watch and use |
| `people.json` | five people and why they matter to you |
| `contact.json` | section copy and the embed-failure message |
| `ui.json` | every UI label: navigation, buttons, 404, meta title and description |

Also:

- **Project images:** upload in the editor, or put files in `public/images/` and reference them as
  `/images/name.webp`. Keep about a 16:10 ratio.
- **OG image and favicons:** edit `scripts/generate-images.mjs` (the OG text comes from `ui.json`), then
  run `node scripts/generate-images.mjs`. It also regenerates the demo project illustrations, so
  delete those lines if you've replaced them.
- Remove "Demo content" from `footer.copyright` in `ui.json`.

## Design notes

The public site follows the `apple-design` skill (`.claude/skills/apple-design`):

- **Typography:** system font with optical sizing; letter-spacing tightens as size grows
  (−0.025em display, 0 body, slightly positive on small text); line-height tightens with size; `rem`
  sizing respects the user's text size.
- **Materials:** a translucent header (`backdrop-filter`) whose lower edge fades out instead of a
  1px divider, and that only appears once content scrolls under it. The language menu grows from
  its trigger.
- **Response:** buttons and cards give press feedback on pointer-down. The language menu opens on
  press. `touch-action: manipulation` removes the tap delay.
- **Motion:** Read / Watch / Use is a swipeable pager driven by one interruptible spring
  (damping 1.0, response 0.4) that moves both the panels and the segmented-control thumb:
  - 10px hysteresis and direction lock, then 1:1 tracking;
  - rubber-banding at the ends;
  - momentum projection on release and velocity handed off to the spring;
  - slight bounce only after a flick.
- **Accessibility:** honours `prefers-reduced-motion` (cross-fade instead of slide),
  `prefers-reduced-transparency` (solid surfaces) and `prefers-contrast: more` (solid surfaces and
  borders). It also has a skip link, inert inactive tab panels, keyboard tabs (arrows, Home, End),
  `lang` on `<html>` and hreflang alternates.

The editor is a plain working tool and deliberately does not follow the skill.

## Checks

| Command | What it verifies |
| --- | --- |
| `npm run check` | `astro check` (types, 0 errors) + no hardcoded user-facing text in components |
| `npm run build` | build + `scripts/verify-dist.mjs`: every locale, 404, robots, sitemap present; no admin files |
| `node scripts/validate-content.ts` | every content file against its schema |
