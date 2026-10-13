/**
 * Content schemas — the single source of truth for every JSON file in src/content.
 *
 * Used by:
 *  - the site build (src/lib/content.ts), which throws on any invalid file;
 *  - the dev-only editor (integrations/content-editor), which validates before writing
 *    and builds its form from `z.toJSONSchema()` of these schemas.
 *
 * Field kinds are carried in `.meta({ ui })` so the editor can pick a widget:
 *   i18n      short translatable text  → three inputs (en / ru / kk)
 *   i18nLong  long translatable text   → three textareas
 *   long      long plain text          → textarea
 *   url       absolute URL             → URL input
 *   email     email address            → email input
 *   image     path under /public       → upload with preview
 */
import { z } from 'zod';

export const LOCALES = ['en', 'ru', 'kk'] as const;
export type Locale = (typeof LOCALES)[number];

type UiKind = 'i18n' | 'i18nLong' | 'long' | 'url' | 'email' | 'image' | 'month';

const localeText = (locale: Locale) =>
  z.string().trim().min(1, { error: `Missing ${locale.toUpperCase()} text` });

const translatable = () => z.object({ en: localeText('en'), ru: localeText('ru'), kk: localeText('kk') });

const withUi = <T extends z.ZodType>(schema: T, ui: UiKind, extra: Record<string, unknown> = {}) =>
  schema.meta({ ui, ...extra });

/** Short translatable text, e.g. a title. */
export const i18n = (description?: string) => withUi(translatable(), 'i18n', description ? { description } : {});

/** Long translatable text, optionally with a word-count range enforced per locale. */
export const i18nLong = (opts: { description?: string; minWords?: number; maxWords?: number } = {}) => {
  const { minWords, maxWords, description } = opts;
  let schema: z.ZodType<Record<Locale, string>> = translatable();
  if (minWords || maxWords) {
    schema = translatable().superRefine((value, ctx) => {
      for (const locale of LOCALES) {
        const words = value[locale].trim().split(/\s+/).filter(Boolean).length;
        if ((minWords && words < minWords) || (maxWords && words > maxWords)) {
          ctx.addIssue({
            code: 'custom',
            path: [locale],
            message: `${locale.toUpperCase()}: ${words} words — must be ${minWords ?? 0}–${maxWords ?? '∞'}`,
          });
        }
      }
    });
  }
  return withUi(schema, 'i18nLong', { ...(description ? { description } : {}), minWords, maxWords });
};

export const url = () =>
  withUi(z.url({ protocol: /^https?$/, error: 'Must be a full http(s):// URL' }), 'url');

export const email = () => withUi(z.email({ error: 'Must be a valid email address' }), 'email');

export const image = () =>
  withUi(
    z
      .string()
      .regex(/^\/images\/[A-Za-z0-9._\-/]+\.(png|jpe?g|webp|avif|svg)$/i, {
        error: 'Must be an image path like /images/name.webp (upload one)',
      }),
    'image',
  );

const text = () => z.string().trim().min(1, { error: 'Required' });

/* ------------------------------------------------------------------ settings.json */

export const settingsSchema = z.object({
  siteUrl: url().meta({ description: 'Public origin, e.g. https://username.github.io (CI overrides it)' }),
  basePath: z
    .string()
    .regex(/^\/[A-Za-z0-9._\-/]*$/, { error: 'Starts with /, e.g. / or /repo-name' })
    .meta({ description: 'Base path for local builds (CI overrides it)' }),
  calUsername: text().meta({ description: 'Cal.com username or username/event-slug' }),
  email: email(),
  telegram: url(),
  linkedin: url(),
  github: url(),
});

/* ------------------------------------------------------------------ ui.json */

export const uiSchema = z.object({
  meta: z.object({ title: i18n(), description: i18nLong(), ogImageAlt: i18n() }),
  languages: z.object({
    en: z.object({ name: text(), short: text() }),
    ru: z.object({ name: text(), short: text() }),
    kk: z.object({ name: text(), short: text() }),
  }),
  header: z.object({
    brand: text(),
    homeLabel: i18n(),
    navLabel: i18n(),
    languageLabel: i18n(),
    bookCall: i18n(),
  }),
  nav: z.object({
    services: i18n(),
    experience: i18n(),
    projects: i18n(),
    mission: i18n(),
    library: i18n(),
    contact: i18n(),
  }),
  a11y: z.object({ skipLink: i18n(), opensInNewTab: i18n() }),
  projects: z.object({ problem: i18n(), solution: i18n(), result: i18n(), stack: i18n(), viewProject: i18n() }),
  experience: z.object({ result: i18n(), forYou: i18n() }),
  recommendations: z.object({ read: i18n(), watch: i18n(), use: i18n(), tabsLabel: i18n(), open: i18n() }),
  people: z.object({ visit: i18n() }),
  library: z.object({ title: i18n(), metaTitle: i18n(), intro: i18nLong(), description: i18nLong() }),
  contact: z.object({
    email: i18n(),
    telegram: i18n(),
    linkedin: i18n(),
    github: i18n(),
    calTitle: i18n(),
    calLoading: i18n(),
  }),
  footer: z.object({
    brandFull: i18n(),
    copyright: i18n('Use {year} for the current year'),
    backToTop: i18n(),
  }),
  notFound: z.object({ title: i18n(), body: i18nLong(), home: i18n(), otherLanguages: i18n() }),
  redirect: z.object({ message: i18n(), link: i18n() }),
});

/* ------------------------------------------------------------------ sections */

export const heroSchema = z.object({
  name: i18n(),
  role: i18n(),
  offer: i18n(),
  subline: i18nLong(),
  primaryCta: i18n(),
  secondaryCta: i18n(),
  availability: i18n(),
  brandExpansion: z
    .array(z.object({ short: z.string(), full: text() }))
    .min(1)
    .meta({ description: 'What the brand name stands for; the "short" parts joined must spell the brand' }),
});

export const missionSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  body: i18nLong({ minWords: 150, maxWords: 250, description: '150–250 words per language' }),
  signature: i18n(),
});

const serviceItem = z.object({
  key: z.enum(['agents', 'automation', 'integrations']),
  title: i18n(),
  description: i18nLong(),
  metric: i18n('Short number-led outcome, e.g. “−70% handling time”'),
  example: i18nLong(),
});

export const servicesSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  intro: i18nLong(),
  items: z.array(serviceItem).length(3, { error: 'Exactly 3 services' }),
});

const processStep = z.object({
  key: z.enum(['talk', 'pilot', 'result', 'care']).meta({ description: 'Which animated scene this step shows' }),
  title: i18n('2–4 words'),
  caption: i18nLong({ description: 'One short sentence' }),
});

export const processSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  steps: z.array(processStep).length(4, { error: 'Exactly 4 steps' }),
  you: i18n('Label under the client in the demo'),
  pilotBadge: i18n('Pilot length shown in the demo'),
  result: z.object({
    metric: i18n(),
    beforeLabel: i18n(),
    beforeValue: i18n(),
    afterLabel: i18n(),
    afterValue: i18n(),
    source: i18n('Which real project the numbers come from'),
  }),
  status: i18n(),
  cta: i18n(),
  play: i18n(),
  pause: i18n(),
});

const projectItem = z.object({
  title: i18n(),
  client: i18n(),
  problem: i18nLong(),
  solution: i18nLong(),
  result: i18nLong(),
  testimonial: z.object({ quote: i18nLong(), author: i18n('Role only — no real names') }),
  stack: z.array(text()).min(1, { error: 'Add at least one technology' }),
  link: url(),
  image: image(),
  imageAlt: i18n(),
});

export const projectsSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  items: z.array(projectItem).length(4, { error: 'Exactly 4 projects' }),
});

const proofItem = z.object({
  title: i18n(),
  period: i18n('e.g. “2017–2022”'),
  story: i18nLong({ description: 'Situation and what you did, 1–2 sentences' }),
  result: i18nLong(),
  forYou: i18nLong({ description: 'What this means for a client, one sentence' }),
  image: image(),
  imageAlt: i18n(),
});

export const experienceSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  portrait: image(),
  portraitAlt: i18n(),
  name: i18n(),
  role: i18n(),
  about: i18nLong({ maxWords: 260, description: 'Paragraphs separated by a blank line' }),
  proofTitle: i18n(),
  proofs: z.array(proofItem).min(3, { error: '3–5 proofs' }).max(5, { error: '3–5 proofs' }),
  whyTitle: i18n(),
  why: z
    .array(z.object({ title: i18n(), body: i18nLong() }))
    .length(3, { error: 'Exactly 3 differentiators' }),
  timelineTitle: i18n(),
  timeline: z.array(z.object({ period: i18n(), what: i18n() })).min(3, { error: 'At least 3 rows' }),
});

const recommendation = z.object({ title: text(), creator: text(), link: url(), why: i18n() });
const five = z.array(recommendation).length(5, { error: 'Exactly 5 items' });

export const recommendationsSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  intro: i18nLong(),
  read: five,
  watch: five,
  use: five,
});

export const peopleSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  items: z
    .array(z.object({ name: text(), who: i18n(), meaning: i18nLong(), link: url() }))
    .length(5, { error: 'Exactly 5 people' }),
});

export const contactSchema = z.object({
  eyebrow: i18n(),
  title: i18n(),
  intro: i18nLong(),
  fallbackTitle: i18n(),
  embedFailed: i18n(),
});

/* ------------------------------------------------------------------ registry */

export const contentSchemas = {
  settings: settingsSchema,
  ui: uiSchema,
  hero: heroSchema,
  mission: missionSchema,
  services: servicesSchema,
  process: processSchema,
  projects: projectsSchema,
  experience: experienceSchema,
  recommendations: recommendationsSchema,
  people: peopleSchema,
  contact: contactSchema,
} as const;

export type ContentName = keyof typeof contentSchemas;
export const contentNames = Object.keys(contentSchemas) as ContentName[];
export type Content = { [K in ContentName]: z.infer<(typeof contentSchemas)[K]> };
export type I18nText = Record<Locale, string>;

/** JSON Schema (with `ui` meta) the editor builds its form from. */
export const toEditorSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

/** Turn a zod error into `{ "items.2.title.ru": ["Missing RU text"] }`. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '(root)';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
