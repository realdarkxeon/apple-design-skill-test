import { useEffect, useRef, useState } from 'react';

interface Props {
  calLink: string;
  title: string;
  loadingText: string;
  failedText: string;
}

type Status = 'idle' | 'loading' | 'ready' | 'failed';

declare global {
  interface Window {
    Cal?: CalFn;
  }
}
type CalFn = ((...args: unknown[]) => void) & { ns: Record<string, (...args: unknown[]) => void>; q?: unknown[]; loaded?: boolean };

const EMBED_SRC = 'https://app.cal.com/embed/embed.js';
const NAMESPACE = 'madsdev';
const TIMEOUT_MS = 15000;

/** The embed must be initialised once per page (a second init doubles its namespace). */
let started = false;

/** Official Cal.com loader snippet, unchanged apart from formatting. */
function installCal(onError: () => void) {
  /* eslint-disable */
  (function (C: any, A: string, L: string) {
    const p = function (a: any, ar: any) {
      a.q.push(ar);
    };
    const d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const s = d.head.appendChild(d.createElement('script'));
          s.src = A;
          s.onerror = onError;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api: any = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
  })(window, EMBED_SRC, 'init');
}

/**
 * Cal.com inline booking. Loads only when the section approaches the viewport, and
 * reports failure (script blocked, offline, timeout) so the always-visible fallback
 * links next to it are the obvious next step.
 */
export default function CalEmbed({ calLink, title, loadingText, failedText }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    const fail = () => setStatus((s) => (s === 'ready' ? s : 'failed'));
    // Readiness comes from Cal's own postMessages (originator "CAL"), which is robust to
    // namespace handling inside the embed script.
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { originator?: string; type?: string } | null;
      if (!d || d.originator !== 'CAL' || typeof d.type !== 'string') return;
      if (d.type === 'linkFailed') fail();
      else if (!d.type.startsWith('__iframeReady')) {
        clearTimeout(timer);
        setStatus((s) => (s === 'failed' && d.type !== 'linkReady' ? s : 'ready'));
      }
    };
    window.addEventListener('message', onMessage);
    const start = () => {
      timer = window.setTimeout(fail, TIMEOUT_MS);
      setStatus((s) => (s === 'idle' ? 'loading' : s));
      if (started) return;
      started = true;
      installCal(fail);
      const Cal = window.Cal!;
      Cal('init', NAMESPACE, { origin: 'https://app.cal.com' });
      Cal.ns[NAMESPACE]('inline', {
        elementOrSelector: `#${el.id}`,
        calLink,
        config: { layout: 'month_view', theme: 'auto' },
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [calLink]);

  return (
    <div className="cal" data-status={status}>
      <div id="cal-inline" ref={ref} className="cal-frame" role="region" aria-label={title} aria-busy={status === 'loading'} />
      {status === 'loading' && (
        <p className="cal-note" role="status">
          {loadingText}
        </p>
      )}
      {status === 'failed' && (
        <p className="cal-note cal-failed" role="alert">
          {failedText}
        </p>
      )}
    </div>
  );
}
