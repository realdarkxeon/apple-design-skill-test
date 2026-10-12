// Post-build guard: the production output must contain every locale and no trace of the dev-only editor.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(dist);

for (const f of files) {
  const rel = f.slice(dist.length);
  if (/(^|\/)admin(\/|\.|$)/i.test(rel)) problems.push(`admin file in dist: ${rel}`);
  if (/\.(html|js|css)$/.test(f)) {
    const text = readFileSync(f, 'utf8');
    if (text.includes('__editor') || text.includes('madsdev-content-editor')) problems.push(`editor code referenced in ${rel}`);
  }
}

for (const p of ['index.html', '404.html', 'en/index.html', 'ru/index.html', 'kk/index.html', 'en/404/index.html', 'robots.txt', 'sitemap-index.xml']) {
  if (!existsSync(join(dist, p))) problems.push(`missing ${p}`);
}

if (problems.length) {
  console.error('✗ dist verification failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`✓ dist verified: ${files.length} files, all locales present, no admin/editor files`);
