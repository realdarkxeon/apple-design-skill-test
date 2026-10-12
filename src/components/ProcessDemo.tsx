import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import './ProcessDemo.css';

/**
 * "How working with us looks like" as a self-playing, wordless demo.
 *
 * One stage (SVG, 600×420 coordinate space) where the same two actors — the client and the team —
 * move between four scenes, so the story reads as one continuous picture rather than four slides.
 * Scenes advance on their own while the stage is on screen; any step can be picked at any moment,
 * and the demo can be paused. Reduced motion: no autoplay, no loops, scenes cross-fade.
 */

type SceneKey = 'talk' | 'pilot' | 'result' | 'care';

interface Props {
  steps: { key: SceneKey; title: string; caption: string }[];
  you: string;
  brand: string;
  pilotBadge: string;
  result: {
    metric: string;
    beforeLabel: string;
    beforeValue: string;
    afterLabel: string;
    afterValue: string;
    source: string;
  };
  status: string;
  play: string;
  pause: string;
  children?: ReactNode;
}

const SCENE_MS = 6500;
const W = 600;
const H = 420;

// Critically damped (§4): actors glide between scenes without overshoot.
const glide: Transition = { type: 'spring', bounce: 0, duration: 0.8 };
const fade: Transition = { duration: 0.35, ease: [0.25, 1, 0.5, 1] };

interface Pose {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Name under the node; hidden where wires would run through it. */
  label?: boolean;
}

const ACTORS: Record<SceneKey, { client: Pose; team: Pose }> = {
  talk: { client: { x: 150, y: 250, scale: 1, opacity: 1 }, team: { x: 450, y: 250, scale: 1, opacity: 1 } },
  pilot: { client: { x: 80, y: 250, scale: 0.8, opacity: 1 }, team: { x: 300, y: 250, scale: 1.15, opacity: 1 } },
  result: { client: { x: 80, y: 250, scale: 0.6, opacity: 0 }, team: { x: 300, y: 250, scale: 0.6, opacity: 0 } },
  care: { client: { x: 95, y: 215, scale: 0.8, opacity: 1 }, team: { x: 300, y: 215, scale: 1.15, opacity: 1, label: false } },
};

/* ------------------------------------------------------------------ icons (24×24, centred on 0,0) */

type IconName = 'mail' | 'doc' | 'sheet' | 'chat' | 'calendar' | 'card' | 'person' | 'check';

const ICONS: Record<IconName, ReactNode> = {
  mail: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  doc: <path d="M6 2h8l4 4v16H6zM9 12h6M9 16h6" />,
  sheet: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18M9 4v16" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

function Icon({ name, size = 24, className = 'pd-icon' }: { name: IconName; size?: number; className?: string }) {
  const s = size / 24;
  return (
    <g className={className} transform={`scale(${s}) translate(-12 -12)`}>
      {ICONS[name]}
    </g>
  );
}

const Sparkle = ({ size = 30 }: { size?: number }) => (
  <path
    className="pd-sparkle"
    transform={`scale(${size / 24}) translate(-12 -12)`}
    d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"
  />
);

/** A small document-like card holding an icon. */
const TaskCard = ({ icon, w = 46, h = 56 }: { icon: IconName; w?: number; h?: number }) => (
  <>
    <rect className="pd-card" x={-w / 2} y={-h / 2} width={w} height={h} rx="9" />
    <Icon name={icon} size={w * 0.48} />
  </>
);

/* ------------------------------------------------------------------ scenes */

const PILE: { icon: IconName; x: number; y: number; r: number }[] = [
  { icon: 'mail', x: 86, y: 152, r: -12 },
  { icon: 'sheet', x: 120, y: 128, r: -4 },
  { icon: 'doc', x: 156, y: 138, r: 7 },
  { icon: 'card', x: 190, y: 158, r: 13 },
  { icon: 'chat', x: 132, y: 172, r: 2 },
];

function TalkScene({ still }: { still: boolean }) {
  return (
    <>
      {/* The pile of work sitting on the client, fidgeting. */}
      {PILE.map((c, i) => (
        <g key={c.icon} transform={`translate(${c.x} ${c.y})`}>
          <motion.g
            initial={{ rotate: c.r, y: -8, opacity: 0 }}
            animate={
              still
                ? { rotate: c.r, y: 0, opacity: 1 }
                : { rotate: [c.r, c.r + 4, c.r - 3, c.r], y: 0, opacity: 1 }
            }
            transition={{
              rotate: { duration: 2.6, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' },
              default: { ...glide, delay: i * 0.05 },
            }}
          >
            <TaskCard icon={c.icon} />
          </motion.g>
        </g>
      ))}

      {/* The conversation: a line between the two of you, messages travelling both ways. */}
      <line className="pd-link" x1="205" y1="250" x2="395" y2="250" />
      {!still &&
        [0, 1].map((dir) => (
          <motion.circle
            key={dir}
            className="pd-dot"
            r="5"
            cy="250"
            initial={{ cx: dir ? 395 : 205, opacity: 0 }}
            animate={{ cx: dir ? [395, 205] : [205, 395], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5, delay: dir * 1.5, ease: 'easeInOut' }}
          />
        ))}
      {[
        { x: 252, y: 186, delay: 0, flip: false },
        { x: 348, y: 186, delay: 1.5, flip: true },
      ].map((b) => (
        <motion.g
          key={b.x}
          transform={`translate(${b.x} ${b.y})`}
          initial={{ opacity: 0 }}
          animate={still ? { opacity: 1 } : { opacity: [0, 1, 1, 0, 0] }}
          transition={{ duration: 3, times: [0, 0.08, 0.42, 0.5, 1], repeat: Infinity, delay: b.delay }}
        >
          <path
            className={b.flip ? 'pd-bubble pd-bubble-team' : 'pd-bubble'}
            d={b.flip ? 'M-30 -18h60a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-4l2 10-12-10h-46a8 8 0 0 1-8-8v-20a8 8 0 0 1 8-8z' : 'M-30 -18h60a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-46l-12 10 2-10h-4a8 8 0 0 1-8-8v-20a8 8 0 0 1 8-8z'}
          />
          {[-12, 0, 12].map((dx, i) => (
            <motion.circle
              key={dx}
              className={b.flip ? 'pd-typing pd-typing-team' : 'pd-typing'}
              cx={dx}
              cy="0"
              r="3.5"
              animate={still ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, repeatDelay: 0.3 }}
            />
          ))}
        </motion.g>
      ))}
    </>
  );
}

const FLOW: IconName[] = ['mail', 'doc', 'sheet', 'card'];
const FLOW_STEP = 0.7; // seconds between items

function PilotScene({ still }: { still: boolean }) {
  // Ticks up as finished items land in the tray: the task is now doing itself.
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (still) return;
    let tick: ReturnType<typeof setInterval> | undefined;
    // The first finished item reaches the tray ~2.9s in (its delay + travel time).
    const start = setTimeout(() => {
      setDone(1);
      tick = setInterval(() => setDone((n) => n + 1), FLOW_STEP * 1000);
    }, 2900);
    return () => {
      clearTimeout(start);
      clearInterval(tick);
    };
  }, [still]);

  return (
    <>
      <line className="pd-track" x1="130" y1="250" x2="490" y2="250" />

      {/* The engine is the team node; this ring turns while it works. */}
      <motion.circle
        className="pd-ring"
        cx="300"
        cy="250"
        r="62"
        animate={still ? undefined : { rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {!still &&
        FLOW.map((icon, i) => (
          <g key={icon}>
            {/* In: raw work leaves the client and goes into the engine… */}
            <motion.g
              initial={{ x: 150, y: 250, opacity: 0 }}
              animate={{ x: [150, 262], opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.5] }}
              transition={{
                duration: 1.4,
                times: [0, 0.15, 0.8, 1],
                repeat: Infinity,
                repeatDelay: FLOW_STEP * FLOW.length - 1.4,
                delay: 0.5 + i * FLOW_STEP,
                ease: 'easeInOut',
              }}
            >
              <TaskCard icon={icon} w={34} h={42} />
            </motion.g>
            {/* …out: it comes back done. */}
            <motion.g
              initial={{ x: 338, y: 250, opacity: 0 }}
              animate={{ x: [338, 472], opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.8] }}
              transition={{
                duration: 1.4,
                times: [0, 0.2, 0.85, 1],
                repeat: Infinity,
                repeatDelay: FLOW_STEP * FLOW.length - 1.4,
                delay: 1.5 + i * FLOW_STEP,
                ease: 'easeInOut',
              }}
            >
              <circle className="pd-done" r="16" />
              <Icon name="check" size={18} className="pd-icon pd-icon-on" />
            </motion.g>
          </g>
        ))}

      {still && (
        <>
          <g transform="translate(190 250)">
            <TaskCard icon="mail" w={34} h={42} />
          </g>
          <g transform="translate(410 250)">
            <circle className="pd-done" r="16" />
            <Icon name="check" size={18} className="pd-icon pd-icon-on" />
          </g>
        </>
      )}

      {/* The tray of finished work. */}
      <g transform="translate(522 250)">
      <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...glide, delay: 0.15 }}>
        <rect className="pd-tray" x="-36" y="-36" width="72" height="72" rx="18" />
        {still || done === 0 ? (
          <Icon name="check" size={30} className="pd-icon pd-icon-positive" />
        ) : (
          <motion.text
            key={done}
            className="pd-count"
            textAnchor="middle"
            dominantBaseline="central"
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={glide}
          >
            {done}
          </motion.text>
        )}
      </motion.g>
      </g>
    </>
  );
}

function ResultScene({ result, still }: { result: Props['result']; still: boolean }) {
  const bar = (delay: number): Transition => (still ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 1.1, delay });
  return (
    <>
      <text className="pd-metric" x={W / 2} y="96" textAnchor="middle">
        {result.metric}
      </text>

      <text className="pd-axis" x="60" y="190" dominantBaseline="central">
        {result.beforeLabel}
      </text>
      <motion.rect
        className="pd-bar-before"
        x="160"
        y="166"
        width="380"
        height="48"
        rx="12"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={bar(0.2)}
      />
      <motion.text
        className="pd-value"
        x="524"
        y="190"
        textAnchor="end"
        dominantBaseline="central"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...fade, delay: still ? 0 : 0.9 }}
      >
        {result.beforeValue}
      </motion.text>

      <text className="pd-axis" x="60" y="276" dominantBaseline="central">
        {result.afterLabel}
      </text>
      <motion.rect
        className="pd-bar-after"
        x="160"
        y="252"
        width="16"
        height="48"
        rx="8"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={bar(1.1)}
      />
      <motion.text
        className="pd-value pd-value-after"
        x="192"
        y="276"
        dominantBaseline="central"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ ...glide, delay: still ? 0 : 1.4 }}
      >
        {result.afterValue}
      </motion.text>
    </>
  );
}

const SYSTEMS: { icon: IconName; x: number; y: number }[] = [
  { icon: 'mail', x: 175, y: 95 },
  { icon: 'chat', x: 425, y: 95 },
  { icon: 'sheet', x: 505, y: 215 },
  { icon: 'calendar', x: 425, y: 335 },
  { icon: 'card', x: 175, y: 335 },
];
const CENTER = { x: 300, y: 215 };

function CareScene({ still }: { still: boolean }) {
  const ends = [{ x: 95, y: 215 }, ...SYSTEMS];
  return (
    <>
      {ends.map((n, i) => (
        <motion.path
          key={`line-${i}`}
          className="pd-wire"
          d={`M${CENTER.x} ${CENTER.y}L${n.x} ${n.y}`}
          initial={{ pathLength: still ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: still ? 0 : 0.6, delay: 0.2 + i * 0.1, ease: [0.25, 1, 0.5, 1] }}
        />
      ))}

      {/* Data moving between the tools — out and back. */}
      {!still &&
        ends.map((n, i) => {
          const out = i % 2 === 0;
          return (
            <motion.circle
              key={`pulse-${i}`}
              className="pd-dot"
              r="4.5"
              initial={{ opacity: 0, cx: CENTER.x, cy: CENTER.y }}
              animate={{
                cx: out ? [CENTER.x, n.x] : [n.x, CENTER.x],
                cy: out ? [CENTER.y, n.y] : [n.y, CENTER.y],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 1.2, delay: 1 + i * 0.35, ease: 'easeInOut' }}
            />
          );
        })}

      {SYSTEMS.map((n, i) => (
        <g key={n.icon} transform={`translate(${n.x} ${n.y})`}>
          <motion.g
            initial={{ scale: still ? 1 : 0, opacity: still ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={still ? { duration: 0 } : { ...glide, delay: 0.5 + i * 0.1 }}
          >
            <circle className="pd-system" r="30" />
            <Icon name={n.icon} size={24} />
          </motion.g>
        </g>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ actors */

function Actor({ pose, label, still, children }: { pose: Pose; label: string; still: boolean; children: ReactNode }) {
  const { label: showLabel = true, ...target } = pose;
  return (
    <motion.g initial={false} animate={target} transition={still ? { duration: 0.25 } : glide}>
      {children}
      <motion.text
        className="pd-label"
        y="72"
        textAnchor="middle"
        initial={false}
        animate={{ opacity: showLabel ? 1 : 0 }}
        transition={fade}
      >
        {label}
      </motion.text>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ component */

export default function ProcessDemo(props: Props) {
  const { steps, you, brand, pilotBadge, result, status, play, pause, children } = props;
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bars = useRef([] as (HTMLSpanElement | null)[]);
  const elapsed = useRef(0);

  const scene = steps[index].key;
  const autoplay = playing && !reduced;

  // Only play while the demo is actually on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Advance scenes; the active step's bar shows how long until the next one.
  useEffect(() => {
    const paint = (p: number) =>
      bars.current.forEach((b, i) => b && (b.style.transform = `scaleX(${i === index ? p : 0})`));
    paint(elapsed.current / SCENE_MS);
    if (!autoplay || !inView) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      const p = Math.min(1, elapsed.current / SCENE_MS);
      paint(p);
      if (p >= 1) {
        elapsed.current = 0;
        setIndex((i) => (i + 1) % steps.length);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [index, autoplay, inView, steps.length]);

  const select = (i: number) => {
    elapsed.current = 0;
    setIndex(i);
  };

  const pose = ACTORS[scene];

  return (
    <div className="pd" ref={root} data-autoplay={autoplay ? '' : undefined}>
      <div className="pd-stage">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          <AnimatePresence>
            <motion.g
              key={scene}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {scene === 'talk' && <TalkScene still={reduced} />}
              {scene === 'pilot' && <PilotScene still={reduced} />}
              {scene === 'result' && <ResultScene result={result} still={reduced} />}
              {scene === 'care' && <CareScene still={reduced} />}
            </motion.g>
          </AnimatePresence>

          <Actor pose={pose.client} label={you} still={reduced}>
            <circle className="pd-node" r="40" />
            <Icon name="person" size={30} />
          </Actor>
          <Actor pose={pose.team} label={brand} still={reduced}>
            <circle className="pd-node pd-node-team" r="40" />
            <Sparkle />
          </Actor>
        </svg>

        {/* Chips that need real text layout live in HTML over the stage. */}
        <AnimatePresence>
          {scene === 'pilot' && (
            <motion.span
              key="badge"
              className="pd-chip pd-chip-badge"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={glide}
            >
              {pilotBadge}
            </motion.span>
          )}
          {scene === 'result' && (
            <motion.span
              key="source"
              className="pd-source"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...fade, delay: reduced ? 0 : 1.6 }}
            >
              {result.source}
            </motion.span>
          )}
          {scene === 'care' && (
            <motion.span
              key="status"
              className="pd-chip pd-chip-status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ ...glide, delay: reduced ? 0 : 1 }}
            >
              <span className="pd-pulse" aria-hidden="true" />
              {status}
            </motion.span>
          )}
        </AnimatePresence>

        {!reduced && (
          <button
            type="button"
            className="pd-toggle"
            aria-label={playing ? pause : play}
            onClick={() => setPlaying((p) => !p)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {playing ? <path d="M8 5h3v14H8zM13 5h3v14h-3z" /> : <path d="M8 5l11 7-11 7z" />}
            </svg>
          </button>
        )}
      </div>

      <div className="pd-panel">
        <ol className="pd-steps" role="list">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                className="pd-step"
                aria-current={i === index ? 'step' : undefined}
                onClick={() => select(i)}
              >
                <span className="pd-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pd-text">
                  <span className="pd-title">{s.title}</span>
                  <span className="pd-caption">
                    <span>{s.caption}</span>
                  </span>
                </span>
                <span className="pd-progress" aria-hidden="true">
                  <span ref={(el) => void (bars.current[i] = el)} />
                </span>
              </button>
            </li>
          ))}
        </ol>
        {children}
      </div>
    </div>
  );
}
