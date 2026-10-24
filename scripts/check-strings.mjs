// Fails if a component, layout or page contains hardcoded user-facing text.
// Every visible string must come from src/content/*.json.
// Checks: text between tags (Astro/JSX) and literal values of user-facing attributes.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const dirs = ['components', 'layouts', 'pages'];
const LETTER = /\p{L}/u;
const ATTRS = /\b(aria-label|alt|title|placeholder|aria-description|content)=["']([^"'{}]*)["']/g;
// Attribute values that are not prose (meta names, technical tokens).
const ALLOWED_ATTR_VALUES = new Set(['website', 'summary_large_image', 'noindex', 'width=device-width, initial-scale=1', 'width=device-width, initial-scale=1, viewport-fit=cover', 'utf-8', '1200', '630', '#fbfbfd', '#000000', '#FFF9D9']);

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const strip = (src, file) => {
  let s = src;
  if (file.endsWith('.astro')) s = s.replace(/^---[\s\S]*?\n---/, (m) => m.replace(/[^\n]/g, ' '));
  // Drop <style>/<script> bodies, CSS-in-JS template strings, and comments.
  s = s.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, (m) => m.replace(/[^\n]/g, ' '));
  s = s.replace(/`[\s\S]*?`/g, (m) => m.replace(/[^\n]/g, ' '));
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  return s;
};

const problems = [];
for (const file of dirs.flatMap((d) => walk(join(root, d)))) {
  if (!/\.(astro|tsx|jsx)$/.test(file)) continue;
  const src = strip(readFileSync(file, 'utf8'), file);
  let body = src;
  if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
    // Only look inside JSX: from the first "return (" onward.
    const i = src.search(/return\s*\(\s*</);
    body = i >= 0 ? src.slice(i).replace(/[^\n]/g, (c) => c) : '';
    if (i >= 0) body = src.slice(0, i).replace(/[^\n]/g, ' ') + src.slice(i);
  }
  const line = (idx) => body.slice(0, idx).split('\n').length;
  // Text nodes: between ">" and "<", not inside {expressions}.
  for (const m of body.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].trim();
    if (text && LETTER.test(text) && !/^[\s\w.-]*=>/.test(text) && !/[;=]\s*$/.test(text)) {
      problems.push(`${file.slice(root.length)}:${line(m.index)} text "${text.slice(0, 60)}"`);
    }
  }
  for (const m of body.matchAll(ATTRS)) {
    const value = m[2].trim();
    if (value && LETTER.test(value) && !ALLOWED_ATTR_VALUES.has(value)) {
      problems.push(`${file.slice(root.length)}:${line(m.index)} ${m[1]}="${value}"`);
    }
  }
}

if (problems.length) {
  console.error('✗ hardcoded user-facing strings found:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('✓ no hardcoded user-facing strings in components, layouts or pages');
