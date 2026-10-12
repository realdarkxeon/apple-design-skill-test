'use client';

import { motion, useInView, useReducedMotion, type Transition } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Unfolds a brand acronym into its full name and back (MadsDev ⇄ Modern Agent Design and Systems Development).
 * Written in the style of React Bits text animations, on top of `motion`:
 * each segment springs its width between the short and full form while the two cross-fade with a blur.
 * It always takes the full name's width, so surrounding layout never shifts.
 * Server render and reduced motion show plain text; the loop pauses while off screen.
 */

export interface AcronymSegment {
  short: string;
  full: string;
}

interface Props {
  segments: AcronymSegment[];
  /** Spoken/read text for assistive tech; the animated glyphs are hidden from it. */
  label: string;
  /** How long each form stays on screen, in ms. */
  holdShort?: number;
  holdFull?: number;
  className?: string;
}

const spring: Transition = { type: 'spring', visualDuration: 0.55, bounce: 0 };
const STAGGER = 0.07;

export default function AcronymMorph({ segments, label, holdShort = 2200, holdFull = 5200, className = '' }: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [widths, setWidths] = useState<{ short: number; full: number }[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Full forms carry the space to the next word, so the collapsed acronym has no gaps.
  const parts = segments.map((s, i) => ({ short: s.short, full: i < segments.length - 1 ? `${s.full} ` : s.full }));

  // Measure both forms of every segment off-screen; re-measure when fonts load or the text size changes.
  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    const measure = () => {
      const spans = [...box.children] as HTMLElement[];
      setWidths(
        parts.map((_, i) => ({
          short: spans[i * 2].getBoundingClientRect().width,
          full: spans[i * 2 + 1].getBoundingClientRect().width,
        })),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  // Alternate forms while visible. Reduced motion simply shows the full name.
  useEffect(() => {
    if (reduce || !inView || !widths) return;
    const id = window.setTimeout(() => setExpanded((e) => !e), expanded ? holdFull : holdShort);
    return () => window.clearTimeout(id);
  }, [reduce, inView, widths, expanded, holdShort, holdFull]);

  const showFull = reduce ? true : expanded;
  const last = parts.length - 1;

  return (
    <span ref={rootRef} className={`acronym-morph ${className}`}>
      <span className="visually-hidden">{label}</span>
      {/* Reserves the full name's width from the first paint, so nothing around it reflows. */}
      <span aria-hidden="true" className="acronym-morph-sizer">
        {parts.map((p) => p.full).join('')}
      </span>
      <span aria-hidden="true" className="acronym-morph-glyphs">
        {parts.map((p, i) => {
          if (!widths) return <span key={i}>{reduce ? p.full : p.short}</span>;
          // Unfold left → right, fold right → left.
          const delay = (showFull ? i : last - i) * STAGGER;
          const fade: Transition = { duration: 0.28, ease: [0.25, 1, 0.5, 1], delay: delay + (showFull ? 0.05 : 0) };
          return (
            <motion.span
              key={i}
              className="acronym-morph-seg"
              initial={false}
              animate={{ width: showFull ? widths[i].full : widths[i].short }}
              transition={{ ...spring, delay }}
            >
              <motion.span
                className="acronym-morph-short"
                initial={false}
                animate={{ opacity: showFull ? 0 : 1, filter: showFull ? 'blur(4px)' : 'blur(0px)' }}
                transition={fade}
              >
                {p.short}
              </motion.span>
              <motion.span
                className="acronym-morph-full"
                initial={false}
                animate={{ opacity: showFull ? 1 : 0, filter: showFull ? 'blur(0px)' : 'blur(4px)' }}
                transition={fade}
              >
                {p.full}
              </motion.span>
            </motion.span>
          );
        })}
      </span>
      <span ref={measureRef} aria-hidden="true" className="acronym-morph-measure">
        {parts.flatMap((p, i) => [<span key={`s${i}`}>{p.short}</span>, <span key={`f${i}`}>{p.full}</span>])}
      </span>
      <style>{css}</style>
    </span>
  );
}

const css = `
/* overflow: hidden keeps the off-screen measurer from widening the page. */
.acronym-morph { position: relative; display: inline-grid; white-space: pre; overflow: hidden; }
.acronym-morph-glyphs, .acronym-morph-sizer { grid-area: 1 / 1; line-height: 1.4em; }
.acronym-morph-glyphs { display: inline-flex; align-items: flex-start; }
.acronym-morph-sizer { visibility: hidden; }
.acronym-morph-seg { position: relative; display: inline-block; height: 1.4em; overflow: hidden; vertical-align: bottom; }
.acronym-morph-short, .acronym-morph-full { position: absolute; top: 0; left: 0; line-height: 1.4em; white-space: pre; }
.acronym-morph-measure { position: absolute; top: 0; left: 0; display: flex; visibility: hidden; pointer-events: none; white-space: pre; }
`;
