# CLAUDE.md

MadsDev: a multilingual (en/ru/kk) Astro static site with a dev-only content editor at `/admin`.
`PROMPT.md` holds the original requirements and `PLAN.md` the architecture.

## Design

The visual design follows the "Glass Field" brief in **[DESIGN.md](DESIGN.md)**. Read it before any
visual or layout change. It maps each design element to its file and lists where the site departs from
the brief on purpose. The look in DESIGN.md replaces the apple-design skill's visual style. The skill's
interaction rules (feedback, restraint, reduced motion) still apply.

## Commands

Astro 7 needs Node ≥ 22.12 (`nvm use 24`).

- `npm run dev`: dev server, including the `/admin` content editor
- `npm run check`: type checks plus the scan for hardcoded strings
- `npm run build`: production build plus the `dist` verification

## Rules

- No hardcoded user-facing text. All copy goes in `src/content/*.json` in all three locales, and Kazakh
  uses correct Kazakh Cyrillic.
- Internal links and assets must go through the base-aware `url()` helper (`src/lib/url.ts`).
