// Plain, functional styles for the dev-only editor.
export const css = `
:root { color-scheme: light dark; --bg:#f6f7f9; --panel:#fff; --line:#d9dce1; --text:#16181d; --muted:#626873; --accent:#0a66d8; --err:#c62828; --errbg:#fdecec; --ok:#1b7f3b; --warn:#a15c00; }
@media (prefers-color-scheme: dark) { :root { --bg:#121316; --panel:#1b1d21; --line:#33363d; --text:#eceef2; --muted:#9aa0aa; --accent:#5aa2ff; --err:#ff6b6b; --errbg:#3a1d1d; --ok:#4cc27a; --warn:#f0a94a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
button, input, textarea, select { font: inherit; color: inherit; }
.editor { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar { position: sticky; top: 0; height: 100vh; overflow: auto; padding: 16px 12px; border-right: 1px solid var(--line); background: var(--panel); display: flex; flex-direction: column; gap: 16px; }
.brand { font-weight: 700; padding: 0 8px; }
.badge { font-size: 11px; font-weight: 600; color: var(--warn); border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; margin-left: 4px; }
.sidebar ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.sidebar nav button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 8px; border: 0; border-radius: 6px; background: none; cursor: pointer; text-align: left; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.sidebar nav button:hover { background: var(--bg); }
.sidebar nav button.active { background: var(--accent); color: #fff; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.dot.ok { background: var(--ok); } .dot.bad { background: var(--err); }
.unsaved { margin-left: auto; }
.links { margin-top: auto; display: grid; gap: 4px; padding: 0 8px; }
.links a { color: var(--accent); text-decoration: none; }
.main { min-width: 0; }
.toolbar { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 24px; background: color-mix(in srgb, var(--panel) 92%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.toolbar h1 { margin: 0; font-size: 17px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.status { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.status.ok { color: var(--ok); } .status.error { color: var(--err); }
.errcount { color: var(--err); font-weight: 600; }
.toolbar-actions { display: flex; gap: 8px; }
.toolbar-actions button { padding: 8px 18px; border-radius: 8px; border: 0; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
.toolbar-actions button.secondary { background: var(--bg); color: var(--text); border: 1px solid var(--line); }
.toolbar-actions button:disabled { opacity: .45; cursor: default; }
.banner { margin: 16px 24px 0; padding: 10px 12px; border-radius: 8px; background: var(--errbg); color: var(--err); }
.form { padding: 20px 24px 80px; max-width: 1200px; display: grid; gap: 14px; }
.form > fieldset.group { border: 0; padding: 0; margin: 0; display: grid; gap: 14px; }
.group { margin: 0; padding: 12px 14px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); display: grid; gap: 12px; min-width: 0; }
.group .group { background: var(--bg); }
legend { padding: 0 6px; font-weight: 700; }
.count { font-weight: 400; color: var(--muted); }
.field { display: grid; gap: 4px; min-width: 0; }
.label { font-weight: 600; font-size: 13px; }
.label small { font-weight: 400; color: var(--muted); }
.hint { margin: 0; color: var(--muted); font-size: 12px; }
input, textarea, select { width: 100%; padding: 7px 9px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); }
textarea { resize: vertical; line-height: 1.45; }
input:focus, textarea:focus, select:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
[aria-invalid="true"], .has-err > input, .has-err > textarea { border-color: var(--err); background: var(--errbg); }
.locales { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 900px) { .locales { grid-template-columns: 1fr; } .editor { grid-template-columns: 1fr; } .sidebar { position: static; height: auto; } }
.locale { display: grid; gap: 3px; align-content: start; }
.locale-tag { font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--muted); }
.locale-tag em { font-style: normal; color: var(--err); }
.locale-tag small { font-weight: 400; letter-spacing: 0; }
.locale.missing input, .locale.missing textarea { border-style: dashed; border-color: var(--err); }
.err { margin: 2px 0 0; padding: 0; list-style: none; color: var(--err); font-size: 12px; font-weight: 600; }
.items { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.item { border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px 10px; background: var(--panel); display: grid; gap: 8px; }
.item > .group { border: 0; padding: 0; background: none; }
.item-bar { display: flex; align-items: center; gap: 8px; }
.item-bar strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sum { font-weight: 400; color: var(--muted); margin-left: 6px; }
.item-actions { display: flex; gap: 4px; margin-left: auto; }
.item-actions button { width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); cursor: pointer; }
.item-actions button:disabled { opacity: .35; cursor: default; }
.item-actions button.danger:hover { color: var(--err); border-color: var(--err); }
.chips { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.chip-row input { flex: 1; }
.add { justify-self: start; padding: 6px 12px; border: 1px dashed var(--accent); border-radius: 6px; background: none; color: var(--accent); cursor: pointer; font-weight: 600; }
.open { font-size: 12px; color: var(--accent); justify-self: start; }
.image-row { display: flex; gap: 12px; align-items: flex-start; }
.preview { width: 180px; aspect-ratio: 16/10; flex: none; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; display: grid; place-items: center; background: var(--bg); color: var(--muted); }
.preview img { width: 100%; height: 100%; object-fit: cover; }
.image-controls { flex: 1; display: grid; gap: 6px; }
.upload { justify-self: start; padding: 6px 12px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; font-weight: 600; background: var(--panel); }
.upload input { display: none; }
`;
