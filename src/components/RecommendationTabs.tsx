import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Spring, prefersReducedMotion, project, rubberband } from '../lib/spring';
import './RecommendationTabs.css';

interface Item {
  title: string;
  creator: string;
  link: string;
  why: string;
}

interface Tab {
  key: string;
  label: string;
  items: Item[];
}

interface Props {
  tabs: Tab[];
  tablistLabel: string;
  opensInNewTab: string;
}

interface Drag {
  pointerId: number;
  x0: number;
  y0: number;
  p0: number;
  from: number;
  axis: 'x' | 'y' | null;
  samples: { x: number; t: number }[];
}

const HYSTERESIS = 10; // px before committing to a direction (§10)

/**
 * Read / Watch / Use tabs.
 * One spring drives both the panel track and the segmented-control thumb, so the
 * thumb follows the finger while swiping (hint in the direction of the gesture, §8).
 * Swipes track 1:1, rubber-band at the ends, project momentum on release and hand
 * the release velocity to the spring (§2, §5, §6, §9). Everything is interruptible.
 */
export default function RecommendationTabs({ tabs, tablistLabel, opensInNewTab }: Props) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const springRef = useRef<Spring | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const draggedRef = useRef(false);
  const id = useId();
  const count = tabs.length;

  useEffect(() => {
    springRef.current = new Spring(0, (p) => {
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-p * 100}%, 0, 0)`;
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(${p * 100}%, 0, 0)`;
    });
    return () => springRef.current?.stop();
  }, []);

  const select = (next: number, velocity?: number, damping = 1) => {
    const target = Math.max(0, Math.min(count - 1, next));
    indexRef.current = target;
    setIndex(target);
    const spring = springRef.current;
    if (!spring) return;
    if (prefersReducedMotion()) spring.set(target);
    else spring.to(target, { damping, response: 0.4, velocity });
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + count) % count;
    select(next);
    tabRefs.current[next]?.focus();
  };

  /* ---------------------------------------------------------------- swipe */

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    draggedRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      p0: springRef.current?.value ?? indexRef.current,
      from: indexRef.current,
      axis: null,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const spring = springRef.current;
    const width = viewportRef.current?.clientWidth ?? 1;
    if (!drag || !spring || e.pointerId !== drag.pointerId) return;

    if (drag.axis === null) {
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (Math.hypot(dx, dy) < HYSTERESIS) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        dragRef.current = null; // vertical: let the page scroll
        return;
      }
      drag.axis = 'x';
      e.currentTarget.setPointerCapture(e.pointerId);
      // Grab the panel wherever it is right now — even mid-animation (§3).
      spring.stop();
      drag.p0 = spring.value;
      drag.x0 = e.clientX;
      draggedRef.current = true;
    }

    const raw = drag.p0 - (e.clientX - drag.x0) / width;
    const max = count - 1;
    let p = raw;
    if (raw < 0) p = -rubberband(-raw * width, width) / width;
    else if (raw > max) p = max + rubberband((raw - max) * width, width) / width;
    spring.set(p);

    drag.samples.push({ x: e.clientX, t: e.timeStamp });
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > 100) drag.samples.shift();
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const spring = springRef.current;
    if (!drag || drag.axis !== 'x' || !spring) return;
    const width = viewportRef.current?.clientWidth ?? 1;

    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    const vx = dt > 0 && e.type === 'pointerup' ? (last.x - first.x) / dt : 0; // px/s
    const pVelocity = -vx / width; // pages/s

    // Choose the target from where the flick is heading, not where it was released (§6).
    const projected = spring.value + project(-vx) / width;
    const target = Math.max(drag.from - 1, Math.min(drag.from + 1, Math.round(projected)));
    // Bounce only because momentum preceded it (§4).
    select(target, pVelocity, Math.abs(vx) > 300 ? 0.85 : 1);
  };

  return (
    <div className="recs">
      <div className="segmented" role="tablist" aria-label={tablistLabel}>
        <span className="segmented-thumb" ref={thumbRef} aria-hidden="true" style={{ width: `calc((100% - 0.5rem) / ${count})` }} />
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.key}`}
            aria-selected={i === index}
            aria-controls={`${id}-panel-${tab.key}`}
            tabIndex={i === index ? 0 : -1}
            onPointerDown={(e) => e.button === 0 && select(i)}
            onClick={() => select(i)}
            onKeyDown={onTabKey}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            draggedRef.current = false;
          }
        }}
      >
        <div className="track" ref={trackRef}>
          {tabs.map((tab, i) => (
            <div
              key={tab.key}
              className="panel"
              role="tabpanel"
              id={`${id}-panel-${tab.key}`}
              aria-labelledby={`${id}-tab-${tab.key}`}
              data-active={i === index || undefined}
              inert={i !== index}
            >
              <ol className="items" role="list">
                {tab.items.map((item) => (
                  <li key={item.link} className="item">
                    <a href={item.link} target="_blank" rel="noopener" className="item-link">
                      <span className="item-title">{item.title}</span>
                      <span className="item-creator">{item.creator}</span>
                      <span className="item-why">{item.why}</span>
                      <span className="visually-hidden">{opensInNewTab}</span>
                      <svg className="item-arrow" aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
                        <path d="M4 10L10 4M5 4h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
