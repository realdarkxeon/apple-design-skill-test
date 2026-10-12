// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import contentEditor from './integrations/content-editor/index.ts';

const settings = JSON.parse(readFileSync(new URL('./src/content/settings.json', import.meta.url), 'utf8'));

// GitHub Actions passes SITE_URL / BASE_PATH from actions/configure-pages.
// Locally the values in src/content/settings.json are used.
const site = (process.env.SITE_URL || settings.siteUrl).replace(/\/+$/, '');
const rawBase = process.env.BASE_PATH ?? settings.basePath ?? '/';
const base = '/' + rawBase.replace(/^\/+|\/+$/g, '');

const locales = ['en', 'ru', 'kk'];

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  // Heading fonts, downloaded at build time and self-hosted. Plus Jakarta Sans has no basic Cyrillic,
  // so EN headings use it and RU/KK headings use Onest, which covers all Kazakh letters
  // (Manrope lacks Ә Ғ Қ Ң Ұ). See --font-heading in global.css.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Plus Jakarta Sans',
      cssVariable: '--font-jakarta',
      weights: ['500 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Onest',
      cssVariable: '--font-onest',
      weights: ['500 800'],
      styles: ['normal'],
      subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
    },
  ],
  build: { format: 'directory' },
  // Tailwind powers the shadcn/ui components in src/components/ui (see global.css for the layer setup).
  vite: { plugins: [tailwindcss()] },
  i18n: {
    locales,
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', ru: 'ru', kk: 'kk' } },
      // Only the localized pages: skip the root redirect, 404s and the dev-only editor.
      filter: (page) => {
        const path = new URL(page).pathname.slice(base.length).replace(/^\/+/, '');
        return path !== '' && !/(^|\/)(404|admin)\/?$/.test(path);
      },
    }),
    contentEditor(),
  ],
});
