# Design reference: "Glass Field"

The public site's visual design follows this brief. The visual reference was https://wundernn.io/connectome,
used for style only, with none of its brand, logo or text.

Part 1 says where each part of the design lives in this repo and where the site departs from the brief.
Part 2 is the original brief, kept word for word.

## Part 1: How this repo implements it

| Brief element | Where it lives |
| --- | --- |
| Colour tokens, type scale, cards, chips, reveal motion | `src/styles/global.css` (`:root` tokens) |
| Passe-partout frame and fixed stage | `src/layouts/Base.astro`, `src/components/stage/Stage.tsx` |
| Background video, or the generated meadow when no video is set | `src/components/stage/Stage.tsx` |
| ASCII glyph field | `src/components/stage/GlyphField.tsx` (props `sourceRef`, `density`, `cursorRadius`, `palette`) |
| Logo, right-side nav pills, mobile menu pill | `src/components/Header.astro` |
| Sticky CTA | `src/components/StickyCta.astro` |
| Timeline bar | `src/components/TimelineBar.astro` (used in `Experience.astro`) |
| Stat grid (cyan ranks) | `src/components/Services.astro` |
| Data table | `src/components/Projects.astro` |
| Sign-off card | `src/components/Mission.astro` |

Departures from the brief, all on purpose:

- **Stack:** the brief assumes React + Vite. This site is Astro (static output, three locales), and React is
  used only for islands. Every visible string still comes from `src/content/*.json`, as `PROMPT.md` requires.
- **Video:** set by `backgroundVideo` in `src/content/settings.json`, as a path inside `public/`
  (H.264 MP4, about 1080p, under 8 MB). When it is empty, `Stage.tsx` draws a generated, softly blurred
  meadow, and the glyph field follows the brightness of that instead.
- **Fonts:** all self-hosted, with no CDNs. Display is Pixelify Sans, swapped for Tiny5 on `/kk/` because
  Pixelify has no Kazakh letters. Mono is JetBrains Mono, body is Inter, and the logo is Instrument Serif.
- **Section order:** hero → services (stat grid) → process → founder/experience (timeline bar) →
  projects (table) → mission letter (sign-off) → contact (Cal.com booking). The sticky CTA hides once the
  booking calendar is in view.
- **Header on small screens:** once the page scrolls, the logo and menu pill switch to a darker fill
  (60% black). The brief's nav fill is too faint where the header sits over the cards.
- **Project illustrations:** toned down with a CSS filter in `Projects.astro` so they fit the warm palette.

To change the look, edit the tokens in `global.css` first. Change a component only when the change is
specific to it. Keep the brief's don'ts in Part 2, section 11.

---

## Part 2: Original brief (verbatim)

## Role and goal

You are a senior frontend engineer and visual designer. Build `[[PROJECT NAME]]`, a single-page site for `[[WHAT IT IS / WHO IT'S FOR]]`. Stack: React + TypeScript + Vite + Tailwind. Follow this design system exactly. The look is: a dark, cinematic, nature-video background seen through a soft blur, a living field of ASCII glyphs drawn on top of it, and calm translucent black cards with warm cream text, framed inside a cream "passe-partout" border. It should feel like a hacker terminal placed inside a quiet film shot: technical, warm, a little retro, not neon cyberpunk.

Use this as a style reference only. Use my own name, logo, copy and data; do not reuse any other brand's logo, wordmark or text.

## 1. Page frame (the passe-partout)

- `body` / outer wrapper background: cream `#FFF9D9`.
- The whole visual stage is a `position: fixed` layer with `inset: 8px` on mobile and `inset: 12px` from `md` up, `border-radius: 20px` mobile / `24px` desktop, `overflow: hidden`, fallback background `#24332D` (deep moss green) while the video loads.
- Page content scrolls over this fixed stage; the cream border stays visible on all four edges at all times, so the site looks like a framed photograph.

## 2. Background video

- `<video autoplay muted loop playsinline preload="auto">` with `object-fit: cover; position: absolute; inset: 0; width: 100%; height: 100%`.
- Footage: slow, shallow depth-of-field nature shot (wildflowers, grass, leaves moving in wind), mostly out of focus with a few soft bright highlights. The blur comes mainly from the footage itself; if my clip is sharp, add `filter: blur(6px)` and scale the video to `1.05` to hide blurred edges.
- Apply `filter: brightness(0.7) contrast(1) saturate(1)` so cream text always reads.
- Fade it in: start at `opacity: 0`, switch to `opacity: 1` on `canplay` with `transition: opacity 700ms ease-out`.
- Provide a poster image (first frame) and a compressed web MP4 (H.264, ~1080p, under 8 MB) plus a WebM. On `prefers-reduced-motion: reduce`, pause the video and show the poster.
- Video source: `[[MY VIDEO URL]]`.

## 3. ASCII glyph field (the "code that gets brighter")

A full-stage `<canvas>` above the video and below the content: `position: absolute; inset: 0; pointer-events: none`, rendered at `devicePixelRatio` resolution.

Behaviour:

- Divide the canvas into a monospace grid (cell ~9×16 px at 13px mono font).
- Every frame, sample the video into a small offscreen canvas (e.g. 1/16 resolution) and read the luminance per cell. Cells over bright parts of the video (flower highlights) are more likely to show a glyph. The text field should "follow" the light in the footage.
- Glyphs are short fragments of a scrambled string rather than single random letters, e.g. `QXelsz6]`, `DKRYfmt07(`, `$FMTahov2`, `!#ELSZgn`, `PWdkry5[+?`, `CJQXe`, `%GNUbip`. Character pool: `A–Z a–z 0–9 [ ] { } ( ) < > $ % # @ ! ? + - ; : / | * & = ,`.
- Each glyph has a life: it fades in, holds briefly while characters re-scramble every ~120 ms, then decays to 0 over ~1.2 s. Clusters spawn as small vertical blocks of 3–6 lines with ragged left edges.
- Cursor proximity: within a ~180 px radius of the pointer, spawn probability and alpha increase with a smooth falloff `(1 - d/r)^2`. Glyphs near the cursor shift toward warm yellow `#FFE58A` / pale green `#CFEFC7`; far ones stay cream at 35–55% alpha. Moving the mouse leaves a short fading trail.
- Scroll: scroll velocity (`|Δy| / Δt`) temporarily boosts global spawn rate and brightness, then eases back over ~600 ms.
- Base colour `rgba(255, 249, 217, α)` with α 0.25–0.9. Optional soft glow: `shadowBlur: 6, shadowColor: rgba(255,249,217,0.35)` only for the brightest glyphs.
- Font: the mono font from section 5.
- Performance: one `requestAnimationFrame` loop, cap at 30 fps on mobile, pause when the tab is hidden, store glyphs in a typed-array pool (no per-frame allocations). On `prefers-reduced-motion`, render a sparse static field.

## 4. Colour tokens

```css
:root {
  --frame: #FFF9D9;          /* cream border, CTA fill, primary text */
  --stage-fallback: #24332D; /* moss green behind video */
  --text: #FFF9D9;
  --text-muted: rgba(255, 249, 217, 0.70);
  --card: rgba(0, 0, 0, 0.55);       /* main content cards */
  --chip: rgba(0, 0, 0, 0.40);       /* hero subtitle box, date/prize chips */
  --nav: rgba(0, 0, 0, 0.25);        /* right-side nav pills */
  --nav-hover: rgba(0, 0, 0, 0.35);
  --divider: rgba(255, 249, 217, 0.12);
  --accent-cyan: #22D3EE;            /* rank numbers, table "#" */
  --accent-orange-glow: rgba(255, 149, 0, 0.80); /* CTA halo */
  --label: #FFEDD5;                  /* small uppercase section labels */
  --glyph-warm: #FFE58A;
  --glyph-green: #CFEFC7;
  /* timeline markers */
  --tl-start: #84CC16; --tl-elapsed: #FFF1E0; --tl-remaining: #8A8A80;
  --tl-merge: #6D5FB8; --tl-finish: #C27A1E; --tl-post: #3A4250; --tl-end: #B91C1C;
}
```

No light mode for the stage itself; the cream frame is the light element.

## 5. Typography

Three-voice system. The contrast between them is the whole personality.

| Role | Reference font | Free substitute | Usage |
|---|---|---|---|
| Display / headings | **PP Mondwest** (pixel-edged serif, Pangram Pangram) | Tiny5 / Silkscreen are too blocky; keep Mondwest if possible, otherwise **"Pixelify Sans"** at weight 400 | H1, H2 only |
| Mono / UI | **CoFo Sans Semi-Mono** and **CoFo Sans Mono** (Contrast Foundry) | **JetBrains Mono** or **Geist Mono** | nav, buttons, labels, table cells, ASCII canvas |
| Body | **Inter** (variable 100–900) | Inter | paragraphs |
| Logo wordmark | **PP Editorial New** (thin editorial serif) | **Instrument Serif** or **Fraunces** light | logo only |

Scale:

- H1: 30px mobile → 36 → 60 → **72px** desktop, `line-height: 1` (tight), `letter-spacing: 0.025em`, weight 400, centred, colour `--text`, glow `text-shadow: 0 0 12px rgba(255,249,217,0.65), 0 0 32px rgba(255,249,217,0.45)`.
- H2: 30px mobile → **48px** desktop, line-height 1, weight 400, no glow, left-aligned inside cards.
- Section label (H3): mono semi-mono, 18px, **bold, uppercase, `tracking-wide`**, colour `--label`.
- Body: Inter 16px, line-height 1.5, colour `--text`. Emphasis uses italic, not bold. Inline links are underlined cream.
- Hero subtitle: Inter, uppercase, 18px, `tracking-wide`, centred.
- Nav and CTA labels: semi-mono 24px, lowercase (`log in`, `docs`, `join →`).

## 6. Layout

- Content column: `max-width: 660px`, centred, `padding-inline: 16px` mobile.
- Logo top-left (fixed): hexagon badge with a single italic serif letter + two-line lowercase wordmark (`[[brand]]` / `[[subtitle]]`).
- Right-side nav panel (fixed, top-right, `md` and up): a vertical stack of pills aligned to the right edge, `gap: 8px`. Each pill: `padding: 4px 12px`, `background: var(--nav)`, `border-radius: 8px`, `backdrop-filter: blur(2px)`, semi-mono 24px cream, icon + label allowed (e.g. Discord/GitHub glyph). Hover: `--nav-hover`, 150 ms colour transition. Pills differ in width because they hug their text; that ragged right-aligned stack is intentional. On mobile, collapse into a single menu pill.
  Items: `[[nav item 1]]`, `[[nav item 2]]`, `[[nav item 3]]`, `[[nav item 4]]`.
- Sticky CTA: fixed to the bottom of the viewport inside the frame, same 660px width, `bottom: 12–16px`.

## 7. Components

**Hero**
1. H1 over three lines with glow: `[[HEADLINE LINE 1]] / [[LINE 2]] / [[LINE 3]]`.
2. Subtitle box: `background: var(--chip)`, `border-radius: 8px`, `padding: 16px 40px`, two uppercase sentences stacked: `[[VALUE PROP 1]]`, `[[VALUE PROP 2]]`.
3. Two chips side by side below it, same style, uppercase Inter 18px: `[[DATE RANGE / STAT 1]]` and `[[KEY NUMBER / STAT 2]]`.

**Content card** (repeat per section)
- `background: var(--card)`, `border-radius: 14px` mobile / `20px` desktop, `padding: 24px 20px` → `32px 28px`, `backdrop-filter: blur(2px)`, flex column with `gap: 20px` → `32px`, `margin-bottom: 48px`. No border, no shadow. The video should still be faintly visible through it.
- Starts with an H2 in the display font, then Inter paragraphs.
- A sign-off variant: right-aligned italic lines at the end (e.g. `Welcome and have fun. / — [[team]]`).
- "Hosted by"/partner variant: H2 in light caps + an icon + the partner name in bold semi-mono caps on one line.

**Timeline bar** (dashboard element)
- Header row of milestones: label uppercase bold semi-mono 12px, date below it in 12px mono; first milestone left-aligned, others right-aligned above their tick.
- Bar: a row of ~90 thin vertical segments (2–3px wide, 1–2px gap, ~36px tall). Colours: start tick `--tl-start`, elapsed ticks `--tl-elapsed`, remaining ticks `--tl-remaining`, merge marker `--tl-merge`, finish marker `--tl-finish`, post-finish ticks `--tl-post`, final marker `--tl-end`. Compute "elapsed" from today's date. On hover show a tooltip with the date of that tick.
- Below: plain list lines starting with `— ` for each milestone.
- Data: `[[milestones with dates]]`.

**Prize / stat grid** (dashboard element)
- Two-column grid, rows `height: ~32px`, `background: rgba(255,249,217,0.04)`, `border: 1px solid var(--divider)`, `border-radius: 6px`. Left: rank in bold semi-mono `--accent-cyan`; right: value right-aligned in mono cream.
- Data: `[[rank → value list]]`.

**Leaderboard / data table** (dashboard element)
- H2 title, then a full-width table. Header row: muted cream Inter 15px, lowercase (`#`, `name`, `score`, `count`, `updated`); `#` header in cyan.
- Rows: 40px tall, `border-bottom: 1px solid var(--divider)`. Rank bold cyan semi-mono; name in mono; numbers right-aligned with tabular figures; relative time ("2 hours ago") in mono muted.
- Row hover: `background: rgba(255,249,217,0.05)`.
- Footer link centred: underlined, `--text-muted`, hover to full cream: `Full [[table]] →`.
- Data: `[[table rows or API endpoint]]`.

**Primary CTA (sticky)**
- Full width of the column, `padding: 12px` (desktop horizontal 112px), `border-radius: 12px`, `background: #FFF9D9`, text black semi-mono 24px lowercase with arrow: `[[cta text]] →`.
- Orange halo: `box-shadow: 0 0 20px 0 rgba(255,149,0,0.80)`; hover `0 0 25px 0 rgba(255,149,0,0.90)`, 300 ms.
- Under the CTA, a short dark gradient behind it so scrolled cards don't clash with the button.

## 8. Motion

- Sections reveal on enter: from `opacity: 0; translateY(16px)` to `opacity: 1; translateY(0)`, `duration: 1000ms`, `ease-out`, staggered `delay: 0 / 150 / 300 ms` for title, chips and cards. Use IntersectionObserver, run once.
- Everything else is quiet: colour transitions 150–300 ms, no bounce, no parallax on cards. The movement comes from the video and the ASCII field only.
- Respect `prefers-reduced-motion` everywhere.

## 9. Responsive

- Breakpoints: phone (<480), phone-lg (≥480), tablet (≥768), desktop (≥1024).
- Below 768: frame inset 8px, radius 20px, right nav collapses, H1 30–36px, cards padding 20px, chips stack vertically, table hides the least important column, ASCII grid density halves.
- No horizontal scroll at 360px width.

## 10. Accessibility and quality bar

- Body text contrast on `--card` must pass WCAG AA (cream on 55% black over a 0.7-brightness video does; verify with the brightest frame of my footage and raise card opacity to 0.65 if needed).
- Canvas and video are `aria-hidden="true"`.
- All nav pills and CTA are real `<a>`/`<button>` elements with visible focus rings (`outline: 2px solid #FFF9D9; outline-offset: 2px`).
- Self-host fonts with `font-display: swap` and size-adjusted fallbacks to avoid layout shift.
- Lighthouse performance ≥ 85 on mobile: lazy-start the canvas loop after first paint, lazy-load the video after the poster.

## 11. Don'ts

- No pure white, no pure black text; cream and black-alpha only.
- No borders or drop shadows on cards; only the CTA glows.
- No gradients on text, no neon colours, no glassmorphism with heavy blur (keep backdrop blur at 2px).
- Don't use the display font for body or UI; don't use Inter for headings.
- Don't put more than one accent colour (cyan) in data UI; orange is reserved for the CTA glow.

## Deliverable

Start with the frame, video, canvas and tokens, show me that shell running, then build sections in this order: hero → `[[section 1]]` → timeline/stats dashboard → table → `[[section N]]` → CTA. Keep the ASCII field in its own `GlyphField.tsx` component with props `{ videoRef, density, cursorRadius, palette }` so I can tune it.
