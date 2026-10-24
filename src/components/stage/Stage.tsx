import { useEffect, useRef, useState } from 'react';
import GlyphField from './GlyphField';

/**
 * The fixed visual stage behind the page: a soft, out-of-focus nature shot and the ASCII glyph field.
 *
 * With `videoSrc` it plays that clip (muted, looping, faded in on canplay, paused for reduced motion).
 * Without it, a generated meadow stands in: a few dozen soft blobs — leaves, grass and warm bokeh
 * highlights — swaying in a slow wind, drawn on a tiny canvas that CSS scales up, so the blur is free.
 */

interface Props {
  videoSrc?: string;
  posterSrc?: string;
}

const MEADOW_W = 160;

interface Blob {
  x: number;
  y: number;
  r: number;
  rgb: string;
  a: number;
  sway: number;
  speed: number;
  phase: number;
  pulse: number;
}

function makeMeadow(aspect: number): Blob[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const blobs: Blob[] = [];
  const add = (n: number, make: () => Omit<Blob, 'phase' | 'speed'>) => {
    for (let i = 0; i < n; i++) blobs.push({ ...make(), phase: rand() * Math.PI * 2, speed: 0.25 + rand() * 0.35 });
  };
  const H = MEADOW_W / aspect;
  // Deep foliage.
  add(18, () => ({ x: rand() * MEADOW_W, y: H * (0.35 + rand() * 0.7), r: 14 + rand() * 26, rgb: ['22, 38, 28', '34, 56, 38', '46, 70, 44'][(rand() * 3) | 0], a: 0.75, sway: 2 + rand() * 3, pulse: 0 }));
  // Sunlit grass and leaves.
  add(14, () => ({ x: rand() * MEADOW_W, y: H * (0.15 + rand() * 0.75), r: 8 + rand() * 16, rgb: ['92, 124, 70', '120, 146, 84', '74, 104, 62'][(rand() * 3) | 0], a: 0.5, sway: 3 + rand() * 4, pulse: 0 }));
  // Flowers: pale pink, cream and violet smudges.
  add(9, () => ({ x: rand() * MEADOW_W, y: H * (0.3 + rand() * 0.6), r: 3 + rand() * 6, rgb: ['236, 196, 210', '246, 236, 214', '182, 160, 214'][(rand() * 3) | 0], a: 0.55, sway: 4 + rand() * 4, pulse: 0.15 }));
  // Bokeh highlights — what the glyph field follows.
  add(8, () => ({ x: rand() * MEADOW_W, y: H * (0.05 + rand() * 0.6), r: 4 + rand() * 9, rgb: ['255, 244, 200', '255, 232, 160', '240, 255, 220'][(rand() * 3) | 0], a: 0.85, sway: 2 + rand() * 3, pulse: 0.35 }));
  return blobs;
}

function Meadow({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let blobs: Blob[] = [];
    let H = 90;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const aspect = Math.max(0.4, rect.width / Math.max(1, rect.height));
      H = Math.round(MEADOW_W / aspect);
      canvas.width = MEADOW_W;
      canvas.height = H;
      blobs = makeMeadow(aspect);
    };

    const draw = (t: number) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#3b4c3a');
      sky.addColorStop(0.45, '#2a3a30');
      sky.addColorStop(1, '#141c17');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, MEADOW_W, H);
      // A slow gust that rolls across the field.
      const gust = Math.sin(t * 0.13) * 0.6 + 0.4;
      for (const b of blobs) {
        const s = Math.sin(t * b.speed + b.phase);
        const x = b.x + s * b.sway * (0.6 + gust * 0.6) + (b.y / H) * gust * 1.5;
        const y = b.y + Math.cos(t * b.speed * 0.7 + b.phase) * b.sway * 0.25;
        const a = b.a * (1 - b.pulse + b.pulse * (0.5 + 0.5 * Math.sin(t * 0.9 + b.phase * 3)));
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        g.addColorStop(0, `rgba(${b.rgb}, ${a})`);
        g.addColorStop(1, `rgba(${b.rgb}, 0)`);
        ctx.globalCompositeOperation = b.pulse > 0.3 ? 'lighter' : 'source-over';
        ctx.fillStyle = g;
        ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now() / 1000);
    });
    ro.observe(canvas);
    draw(0);
    if (reduced) return () => ro.disconnect();

    let raf = 0;
    let lastDraw = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastDraw < 1000 / 30) return; // the footage is slow; 30 fps is plenty
      lastDraw = now;
      draw(now / 1000);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [canvasRef]);

  return <canvas ref={canvasRef} className="stage-media stage-meadow" aria-hidden="true" />;
}

export default function Stage({ videoSrc, posterSrc }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const meadowRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(!videoSrc);
  // The glyph loop starts after first paint so it never competes with the page content.
  const [glyphs, setGlyphs] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTimeout(() => setGlyphs(true), 250));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause();
      v.removeAttribute('autoplay');
    }
  }, []);

  return (
    <>
      {videoSrc ? (
        <video
          ref={videoRef}
          className="stage-media stage-video"
          data-ready={ready ? '' : undefined}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setReady(true)}
        />
      ) : (
        <Meadow canvasRef={meadowRef} />
      )}
      {glyphs && <GlyphField sourceRef={videoSrc ? videoRef : meadowRef} />}
      <style>{`
        .stage-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.7) contrast(1) saturate(1);
        }
        .stage-meadow {
          filter: blur(6px) brightness(0.85);
          transform: scale(1.05);
        }
        .stage-video {
          opacity: 0;
          transition: opacity 700ms ease-out;
        }
        .stage-video[data-ready] {
          opacity: 1;
        }
        .glyph-field {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          font-family: var(--font-mono);
        }
      `}</style>
    </>
  );
}
