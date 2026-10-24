import { useEffect, useRef, type RefObject } from 'react';

/**
 * A living field of ASCII fragments drawn over the stage.
 *
 * The field "follows the light": every few frames the source (video or generated meadow) is sampled
 * at one pixel per grid cell, and bright cells are more likely to grow a cluster of glyphs.
 * Near the pointer glyphs spawn more often, glow brighter and warm towards yellow / pale green;
 * scrolling briefly boosts the whole field. Each glyph is a short stride-7 run through the alphabet
 * (e.g. `DKRYfmt07(`) that re-scrambles every ~120 ms, holds, then decays.
 *
 * All glyph state lives in preallocated typed arrays; the loop allocates nothing per frame apart
 * from the re-scrambled strings.
 */

export interface GlyphPalette {
  /** Base colour as "r, g, b". */
  base: string;
  warm: string;
  green: string;
}

interface Props {
  sourceRef: RefObject<HTMLVideoElement | HTMLCanvasElement | null>;
  /** 0–1 multiplier for how many clusters spawn. */
  density?: number;
  /** Pointer influence radius in CSS pixels. */
  cursorRadius?: number;
  palette?: GlyphPalette;
}

const DEFAULT_PALETTE: GlyphPalette = { base: '255, 249, 217', warm: '255, 229, 138', green: '207, 239, 199' };

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SYMBOLS = '[]{}()<>$%#@!?+-;:/|*&=,';
const CAP = 900;
const FONT_PX = 13;
const SCRAMBLE_MS = 120;
const FADE_IN = 0.25;
const DECAY = 1.2;
const SCROLL_EASE_MS = 600;

function fragment(start: number, stride: number, len: number, sym: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALNUM[(start + i * stride) % ALNUM.length];
  for (let i = 0; i < sym; i++) s += SYMBOLS[(start * 7 + i * 11) % SYMBOLS.length];
  return s;
}

export default function GlyphField({ sourceRef, density = 1, cursorRadius = 180, palette = DEFAULT_PALETTE }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const mobile = matchMedia('(max-width: 47.99rem)').matches;
    const dens = density * (mobile ? 0.5 : 1);
    const frameMs = coarse || mobile ? 1000 / 30 : 0;

    // ---- glyph pool (structure of arrays)
    const col = new Float32Array(CAP);
    const row = new Float32Array(CAP);
    const age = new Float32Array(CAP);
    const hold = new Float32Array(CAP);
    const peak = new Float32Array(CAP);
    const start = new Uint8Array(CAP);
    const stride = new Uint8Array(CAP);
    const len = new Uint8Array(CAP);
    const sym = new Uint8Array(CAP);
    const hue = new Uint8Array(CAP); // 0 warm, 1 green
    const alive = new Uint8Array(CAP);
    const text: string[] = new Array(CAP).fill('');
    let free = 0; // next slot to try (ring)

    // ---- grid + luminance
    let w = 0;
    let h = 0;
    let cellW = 8;
    let cellH = mobile ? 18 : 16;
    let cols = 0;
    let rows = 0;
    let lum = new Float32Array(0);
    const sample = document.createElement('canvas');
    const sctx = sample.getContext('2d', { willReadFrequently: true });

    let fontFamily = 'monospace';
    const readFont = () => {
      fontFamily = getComputedStyle(canvas).fontFamily || 'monospace';
      ctx.font = `${FONT_PX}px ${fontFamily}`;
      cellW = Math.max(7, Math.round(ctx.measureText('M').width + 1));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readFont();
      cols = Math.max(1, Math.floor(w / cellW));
      rows = Math.max(1, Math.floor(h / cellH));
      sample.width = cols;
      sample.height = rows;
      lum = new Float32Array(cols * rows).fill(0.25);
    };

    const readLuminance = () => {
      const src = sourceRef.current;
      if (!src || !sctx) return;
      if (src instanceof HTMLVideoElement && src.readyState < 2) return;
      try {
        sctx.drawImage(src, 0, 0, cols, rows);
        const d = sctx.getImageData(0, 0, cols, rows).data;
        for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
          lum[i] = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255;
        }
      } catch {
        // A cross-origin video taints the canvas; keep the last (or flat) luminance.
      }
    };

    // ---- pointer + scroll state
    let px = -1e4;
    let py = -1e4;
    let moved = 0;
    let scrollBoost = 0;
    let lastY = window.scrollY;
    let lastScrollT = performance.now();

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      moved += Math.hypot(nx - px, ny - py);
      px = nx;
      py = ny;
    };
    const onLeave = () => {
      px = py = -1e4;
    };
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastScrollT);
      const v = Math.abs(window.scrollY - lastY) / dt; // px per ms
      lastY = window.scrollY;
      lastScrollT = now;
      scrollBoost = Math.min(1, Math.max(scrollBoost, v / 2.5));
    };

    const proximity = (x: number, y: number) => {
      const d = Math.hypot(x - px, y - py);
      if (d >= cursorRadius) return 0;
      const f = 1 - d / cursorRadius;
      return f * f;
    };

    const spawnGlyph = (c: number, r: number, bright: number) => {
      for (let n = 0; n < CAP; n++) {
        const i = (free + n) % CAP;
        if (alive[i]) continue;
        free = (i + 1) % CAP;
        alive[i] = 1;
        col[i] = c;
        row[i] = r;
        age[i] = 0;
        hold[i] = 0.35 + Math.random() * 0.8;
        peak[i] = Math.min(0.9, 0.25 + 0.3 * Math.random() + 0.35 * bright);
        start[i] = (Math.random() * ALNUM.length) | 0;
        stride[i] = Math.random() < 0.8 ? 7 : 5;
        len[i] = 3 + ((Math.random() * 7) | 0);
        sym[i] = Math.random() < 0.55 ? 1 + ((Math.random() * 2) | 0) : 0;
        hue[i] = Math.random() < 0.6 ? 0 : 1;
        text[i] = fragment(start[i], stride[i], len[i], sym[i]);
        return;
      }
    };

    /** A small vertical block of 3–6 lines with a ragged left edge. */
    const spawnCluster = (c0: number, r0: number, bright: number) => {
      const lines = 3 + ((Math.random() * 4) | 0);
      for (let k = 0; k < lines; k++) {
        const r = r0 + k;
        if (r >= rows) break;
        spawnGlyph(Math.max(0, c0 + ((Math.random() * 5) | 0) - 2), r, bright);
      }
    };

    /** Pick a random cell, preferring bright parts of the source. */
    const trySpawn = (tries: number) => {
      for (let t = 0; t < tries; t++) {
        const c = (Math.random() * cols) | 0;
        const r = (Math.random() * rows) | 0;
        const l = lum[r * cols + c] ?? 0.25;
        const near = proximity(c * cellW, r * cellH);
        const p = 0.08 + 0.9 * l * l * 1.6 + near * 0.8;
        if (Math.random() < p) {
          spawnCluster(c, r, Math.min(1, l + near));
          return;
        }
      }
    };

    // ---- loop
    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    let lastScramble = 0;
    let frame = 0;
    let spawnDebt = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${FONT_PX}px ${fontFamily}`;
      ctx.textBaseline = 'top';
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 1) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = `rgba(${palette.base}, 0.35)`;
        }
        for (let i = 0; i < CAP; i++) {
          if (!alive[i]) continue;
          const a = age[i];
          const env = a < FADE_IN ? a / FADE_IN : a < FADE_IN + hold[i] ? 1 : 1 - (a - FADE_IN - hold[i]) / DECAY;
          const x = col[i] * cellW;
          const y = row[i] * cellH;
          const near = proximity(x + 20, y + 8);
          const alpha = Math.min(0.95, env * (peak[i] + near * 0.5 + scrollBoost * 0.15));
          if (alpha <= 0.01) continue;
          const bright = alpha > 0.72;
          if ((pass === 1) !== bright) continue;
          const rgb = near > 0.15 ? (hue[i] ? palette.green : palette.warm) : palette.base;
          ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
          ctx.fillText(text[i], x, y);
        }
      }
      ctx.shadowBlur = 0;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (frameMs && now - lastDraw < frameMs) return;
      lastDraw = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frame++;

      if (frame % 3 === 1) readLuminance();

      // Scroll boost eases back over ~600 ms.
      scrollBoost *= Math.exp((-dt * 1000) / (SCROLL_EASE_MS / 3));

      // Spawning: base rate, boosted by scroll; pointer movement leaves a short trail.
      spawnDebt += dt * 16 * dens * (1 + 3 * scrollBoost);
      while (spawnDebt >= 1) {
        spawnDebt -= 1;
        trySpawn(6);
      }
      if (moved > 24 && px > -1e3) {
        const n = Math.min(3, Math.floor(moved / 24));
        moved = 0;
        for (let k = 0; k < n; k++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * cursorRadius * 0.6;
          const c = Math.round((px + Math.cos(ang) * rad) / cellW);
          const r = Math.round((py + Math.sin(ang) * rad) / cellH);
          if (c >= 0 && c < cols && r >= 0 && r < rows) spawnCluster(c, r, 0.8);
        }
      }

      // Age + scramble.
      const scramble = now - lastScramble > SCRAMBLE_MS;
      if (scramble) lastScramble = now;
      for (let i = 0; i < CAP; i++) {
        if (!alive[i]) continue;
        age[i] += dt;
        if (age[i] > FADE_IN + hold[i] + DECAY) {
          alive[i] = 0;
          continue;
        }
        if (scramble && age[i] < FADE_IN + hold[i]) {
          start[i] = (start[i] + 1) % ALNUM.length;
          text[i] = fragment(start[i], stride[i], len[i], sym[i]);
        }
      }

      draw();
    };

    /** Reduced motion: one sparse, still field. */
    const drawStatic = () => {
      alive.fill(0);
      readLuminance();
      for (let k = 0; k < Math.round(28 * dens); k++) trySpawn(8);
      for (let i = 0; i < CAP; i++) {
        if (!alive[i]) continue;
        age[i] = FADE_IN;
        peak[i] *= 0.6;
      }
      draw();
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) drawStatic();
    });

    resize();
    ro.observe(canvas);
    document.fonts?.ready.then(() => {
      readFont();
      if (reduced) drawStatic();
    });

    if (reduced) {
      // Wait a moment so the meadow/video has drawn something to sample.
      const t = window.setTimeout(drawStatic, 400);
      return () => {
        clearTimeout(t);
        ro.disconnect();
      };
    }

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sourceRef, density, cursorRadius, palette]);

  return <canvas ref={canvasRef} className="glyph-field" aria-hidden="true" />;
}
