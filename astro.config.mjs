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
  // Glass Field type system, downloaded at build time and self-hosted:
  // display = Pixelify Sans (EN/RU) / Tiny5 (KK — Pixelify lacks Ә Ғ Қ Ң Ө Ү Һ), UI = JetBrains Mono,
  // body = Inter, wordmark = Instrument Serif. See the --font-* tokens in global.css.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Pixelify Sans',
      cssVariable: '--font-pixelify',
      weights: ['400'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Tiny5',
      cssVariable: '--font-tiny5',
      weights: ['400'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument',
      weights: ['400'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
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
