import type { AstroIntegration } from 'astro';
import { createEditorMiddleware } from './middleware';

/**
 * Dev-only content editor. Everything here is gated on `command === 'dev'`,
 * so `astro build` never sees the /admin route or the API middleware.
 */
export default function contentEditor(): AstroIntegration {
  let enabled = false;
  let root: URL;
  return {
    name: 'madsdev-content-editor',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute, logger }) => {
        if (command !== 'dev') return;
        enabled = true;
        root = config.root;
        injectRoute({
          pattern: '/admin',
          entrypoint: new URL('./AdminPage.astro', import.meta.url),
          prerender: false,
        });
        logger.info('Content editor enabled at /admin (dev only)');
      },
      'astro:server:setup': ({ server }) => {
        if (!enabled) return;
        server.middlewares.use(createEditorMiddleware(server, root));
      },
    },
  };
}
