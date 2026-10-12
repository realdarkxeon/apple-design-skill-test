// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
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
  build: { format: 'directory' },
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
