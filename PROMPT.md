# Task
Build a multilingual personal website plus a local-only content editor, end to end, in this session. Work autonomously. Ask me only if you are truly blocked.

# Step 0: Plan first
1. Load the `apple-design` skill. It is the ONLY source of visual and interaction design decisions for the public site. Do not add design rules of your own beyond it.
2. Check current Astro docs for: i18n routing, the integration API (`astro:config:setup`, `injectRoute`, the `command` value, Vite plugin `configureServer`), and GitHub Pages deployment. Do not rely on memory for these APIs.
3. Write PLAN.md: file tree, content schema, phases, and how you will verify each phase. Then execute it.

# Identity (demo content)
Brand: MadsDev (Modern AI Design and Systems Development). Invent a plausible founder name, bio, projects, experience, and testimonials. Do not use any real personal data. Real, well-known books, videos, tools, websites, and public figures are allowed in Recommendations and People.
Positioning: builds AI agents and business automations for clients.
Primary goal: visitor books a call. Secondary goal: visitor understands who MadsDev is and why they do this work.

# Stack
- Astro + TypeScript, static output. React only where interactivity needs it (tabs, booking embed, language switcher, the editor).
- Hosting: GitHub Pages, deployed by a GitHub Actions workflow on push to main.
- Read the base path from config so the site works both at username.github.io and at username.github.io/repo-name/. Every internal link and asset must respect Astro's `base`.
- Self-host any fonts. No external font or script CDNs, except the Cal.com embed.
- No CMS, no auth, no database, no serverless functions, no third-party services besides Cal.com.

# Languages
- Locales: en, ru, kk (Kazakh, ISO code `kk`). Default: en.
- Routes: /en/, /ru/, /kk/. Root / redirects to /en/.
- Language switcher in the header that keeps the current section anchor.
- Every visible string comes from content files, including UI labels. There must be no hardcoded text in components.
- Write the demo content natively in all three languages, not word-for-word translated. Kazakh must use correct Kazakh Cyrillic.
- hreflang alternate tags plus `lang` on <html>. The font stack must render Ә Ғ Қ Ң Ө Ұ Ү Һ І on macOS, iOS, Windows, and Android.

# Page structure (single page per locale, sections in this order)
1. Hero: name, one-line offer, "Book a call" CTA visible without scrolling.
2. Mission ("Why I do this"): first person, 150 to 250 words, sincere, no corporate tone.
3. Services: 3 offers (AI agents, workflow automation, integrations). Each one gets a concrete example outcome with a number.
4. Projects: 4 cards, each with problem, solution, result, tech stack, link, and image.
5. Experience: timeline of 3 to 4 entries (role, organization, period, one line of impact).
6. Recommendations: tabs for Read / Watch / Use, 5 items each (title, creator, link, one-line why).
7. People I learn from: 5 people (name, who they are, what they mean to me in 1 to 2 sentences, link).
8. Let's talk: Cal.com inline embed (username from settings; demo value `madsdev`), plus always-visible fallback links (email, Telegram, LinkedIn, GitHub). If the embed fails to load, the fallback links still work.
Also include a 404 page in all locales.

# Content model
- All content in /src/content as JSON, one file per section, plus ui.json (UI labels) and settings.json (site URL, Cal.com username, social links).
- Translatable fields are objects: { "en": "...", "ru": "...", "kk": "..." }. Non-translatable fields (URLs, images, dates, tech stack) are plain values.
- One zod schema per file in /src/content/schemas.ts, used by both the site build and the editor. A broken edit must fail loudly, never render empty.
- Images in /public/images.

# Local editor (/admin)
- /admin exists ONLY in `npm run dev`. Inject the route through a small Astro integration when `command === 'dev'`. It must not exist in the production build: verify that `dist/` contains no admin files.
- A dev-only Vite middleware exposes GET and POST endpoints that read and write the JSON files in /src/content, plus an image upload endpoint that saves to /public/images. Validate with the zod schema before writing; on failure, return field-level errors and write nothing.
- The editor UI is generated from the schemas, so you do not hand-build a form per section:
  - sidebar listing every content file;
  - string → input, long text → textarea, url → input with validation, image → upload with preview, arrays → add / remove / reorder;
  - translatable fields show en / ru / kk side by side, so a missing translation is obvious;
  - Save button, unsaved-changes warning, inline validation errors.
- The editor is a working tool: clean and functional, and it does not need to follow the apple-design skill.
- After saving, the dev site hot-reloads with the new content.

# Phases (finish and verify each before moving on)
1. Scaffold: Astro, TypeScript, i18n routing, base path, GitHub Actions workflow. Check: `npm run build` passes.
2. Content: schemas plus all demo content in en/ru/kk. Check: `astro check` reports zero errors.
3. Public UI: all sections per the apple-design skill, responsive from 360px up. Check: build passes, and a search of components finds no hardcoded user-facing strings.
4. Editor: integration, middleware, schema-driven UI. Check: in dev, edit a field in each locale, save, and see it on the page; submit an invalid value and see it rejected; `npm run build` produces no /admin in dist.
5. SEO and polish: meta tags, Open Graph image, sitemap with i18n alternates, robots.txt, favicon. Check: Lighthouse performance and accessibility 90+ on the built site.
6. README: create the repo, enable GitHub Pages via Actions, set the base path, run `npm run dev` and open /admin, the edit → save → commit → push flow, connect Cal.com, replace the demo content.

# Done when
- `npm run build` and `astro check` pass with zero errors.
- All three locales render every section from content files.
- /admin works in dev, writes valid JSON, and is absent from the production build.
- Finish with a short report: what was built, what I must do manually, and any deviations from this prompt and why.
