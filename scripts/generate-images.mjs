// Generates the demo project illustrations, favicon set and Open Graph image into public/.
// Run once (or after changing the brand): node scripts/generate-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const ui = JSON.parse(readFileSync(new URL('../src/content/ui.json', import.meta.url), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const brand = esc(ui.header.brand);
const tagline = esc(ui.meta.title.en.split(' — ').pop());
const brandFull = esc(ui.footer.brandFull.en);

const out = (p) => new URL(`../public/${p}`, import.meta.url);
mkdirSync(out('images/projects'), { recursive: true });

const frame = (id, [a, b], body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
  <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
</defs>
<rect width="1600" height="1000" fill="url(#${id}-bg)"/>
${body}
</svg>`;

const glass = (x, y, w, h, r = 36, o = 0.22) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" fill-opacity="${o}" stroke="#fff" stroke-opacity="0.45" stroke-width="2"/>`;

const images = {
  'delivery-agent': frame('a', ['#0a5bd8', '#6ec3ff'], `
    <circle cx="1250" cy="230" r="260" fill="#9be7ff" opacity="0.5" filter="url(#a-soft)"/>
    ${glass(170, 200, 560, 120)}${glass(330, 360, 520, 120)}${glass(170, 520, 440, 120)}
    <path d="M900 760 C 1050 760 1050 520 1200 520 S 1350 300 1450 300" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 28"/>
    <circle cx="900" cy="760" r="26" fill="#fff"/><circle cx="1450" cy="300" r="34" fill="#fff"/>
    <rect x="210" y="240" width="300" height="20" rx="10" fill="#fff" opacity="0.9"/><rect x="210" y="275" width="200" height="16" rx="8" fill="#fff" opacity="0.6"/>
    <rect x="370" y="400" width="330" height="20" rx="10" fill="#fff" opacity="0.9"/><rect x="370" y="435" width="240" height="16" rx="8" fill="#fff" opacity="0.6"/>
    <rect x="210" y="560" width="260" height="20" rx="10" fill="#fff" opacity="0.9"/><rect x="210" y="595" width="180" height="16" rx="8" fill="#fff" opacity="0.6"/>`),
  'invoice-pipeline': frame('b', ['#1f2a44', '#3c6e71'], `
    <circle cx="300" cy="800" r="300" fill="#7fd1ae" opacity="0.35" filter="url(#b-soft)"/>
    ${[0, 1, 2, 3].map((i) => glass(160 + i * 70, 180 + i * 50, 300, 400, 28, 0.12 + i * 0.05)).join('')}
    <rect x="820" y="470" width="620" height="60" rx="30" fill="#fff" fill-opacity="0.18"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${850 + i * 115}" y="483" width="80" height="34" rx="17" fill="#7fd1ae" opacity="${0.4 + i * 0.12}"/>`).join('')}
    <path d="M1180 600 v120 M1180 720 h-160 M1180 720 h160" stroke="#fff" stroke-opacity="0.7" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${glass(930, 740, 180, 110, 24)}${glass(1250, 740, 180, 110, 24)}
    <path d="M985 800 l25 25 l50 -55" stroke="#7fd1ae" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="1340" cy="795" r="22" fill="#ffd166"/>`),
  'clinic-hub': frame('c', ['#f2f7f5', '#cfe8ff'], `
    <circle cx="800" cy="500" r="330" fill="#6ec3ff" opacity="0.35" filter="url(#c-soft)"/>
    ${[0, 1, 2, 3, 4].map((i) => {
      const a = (-90 + i * 72) * (Math.PI / 180);
      const x = 800 + Math.cos(a) * 340;
      const y = 500 + Math.sin(a) * 340;
      return `<line x1="800" y1="500" x2="${x}" y2="${y}" stroke="#0a5bd8" stroke-opacity="0.35" stroke-width="6"/><circle cx="${x}" cy="${y}" r="70" fill="#fff" stroke="#0a5bd8" stroke-opacity="0.25" stroke-width="4"/><circle cx="${x}" cy="${y}" r="22" fill="#0a5bd8" opacity="${0.35 + i * 0.12}"/>`;
    }).join('')}
    <circle cx="800" cy="500" r="110" fill="#0a5bd8"/><path d="M800 450 v100 M750 500 h100" stroke="#fff" stroke-width="22" stroke-linecap="round"/>`),
  'sales-copilot': frame('d', ['#2b1d52', '#b06ab3'], `
    <circle cx="1300" cy="780" r="280" fill="#ffb4a2" opacity="0.4" filter="url(#d-soft)"/>
    <path d="${Array.from({ length: 40 }, (_, i) => {
      const x = 140 + i * 16;
      const h = 30 + Math.abs(Math.sin(i * 0.7) * 160) + (i % 3) * 18;
      return `M${x} ${500 - h / 2} V${500 + h / 2}`;
    }).join(' ')}" stroke="#fff" stroke-opacity="0.85" stroke-width="8" stroke-linecap="round"/>
    <path d="M800 500 h80" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 22"/>
    ${glass(930, 260, 520, 480)}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="980" y="${320 + i * 64}" width="${[420, 380, 400, 300, 360, 220][i]}" height="22" rx="11" fill="#fff" opacity="${i === 0 ? 0.95 : 0.6}"/>`).join('')}`),
};

for (const [name, svg] of Object.entries(images)) {
  writeFileSync(out(`images/projects/${name}.svg`), svg.replace(/\n\s*/g, '\n'));
}

// Favicon: monogram on the accent colour.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#0071e3"/>
<path d="M16 46V18h6l10 14 10-14h6v28h-7V30l-9 12-9-12v16z" fill="#fff"/>
</svg>`;
writeFileSync(out('favicon.svg'), favicon);
await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile(out('favicon-32.png').pathname);
await sharp(Buffer.from(favicon.replace('rx="14"', 'rx="0"'))).resize(180, 180).png().toFile(out('apple-touch-icon.png').pathname);

// Open Graph image (1200×630), English strings from ui.json (one shared image for all locales).
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a2a66"/><stop offset="1" stop-color="#0071e3"/></linearGradient>
  <filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
</defs>
<rect width="1200" height="630" fill="url(#g)"/>
<circle cx="1000" cy="120" r="220" fill="#6ec3ff" opacity="0.45" filter="url(#s)"/>
<rect x="80" y="80" width="88" height="88" rx="20" fill="#fff"/>
<path d="M102 150V98h11l18 26 18-26h11v52h-13v-30l-16 22-16-22v30z" fill="#0071e3"/>
<text x="80" y="330" font-family="Helvetica Neue, Arial, sans-serif" font-size="92" font-weight="700" letter-spacing="-2" fill="#fff">${brand}</text>
<text x="80" y="410" font-family="Helvetica Neue, Arial, sans-serif" font-size="44" font-weight="500" fill="#fff" fill-opacity="0.92">${tagline}</text>
<text x="80" y="540" font-family="Helvetica Neue, Arial, sans-serif" font-size="28" fill="#fff" fill-opacity="0.7">${brandFull}</text>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(out('images/og.png').pathname);
console.log('images generated');
