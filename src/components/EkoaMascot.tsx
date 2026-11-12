import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { MARK_PARTS } from './EkoaLogo';

// The Ekoa figure, drawn as plain shapes so it can move. It uses currentColor: set the
// colour with a text class (text-ink, text-moss). Poses:
//   loading  – the figure stands still while three rings widen around it, one step at a time
//   thumbsUp – the logo's raised hand closes into a fist with a thumb up, and sparks flash
//   jump     – the logo crouches, leaps with arms up and lands, with no rings
//   idle     – the logo, exactly as drawn
// Motion lives in index.css (.ekoa-*). Reduced-motion users get the still pose.

export type MascotPose = 'idle' | 'loading' | 'thumbsUp' | 'jump';

// Every pose is built from the logo mark's own outlines (MARK_PARTS), never redrawn, so the
// still pose is exactly the logo. Rings 2 and 3 are one outline in the mark; a circle around
// the head splits them so each ring can move on its own.
const [FIGURE, RINGS23_OUTER, RINGS23_HOLE, HEAD, RING1] = MARK_PARTS;
const RINGS23 = RINGS23_OUTER + RINGS23_HOLE;
const CX = 64; // head centre, which is also the ring centre
const CY = 64;

const STROKE = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function EkoaMascot({ pose = 'idle', size = 96, className = '', title }: { pose?: MascotPose; size?: number; className?: string; title?: string }) {
  const id = useId();
  const c = (n: string) => `${id}-${n}`;
  const rings = pose === 'idle' || pose === 'loading';

  return (
    <svg
      viewBox="0 0 127 130"
      width={size}
      height={(size * 130) / 127}
      className={`ekoa-mascot ekoa-${pose} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
      fillRule="evenodd"
    >
      <defs>
        <clipPath id={c('inner')}><circle cx={CX} cy={CY} r="46" /></clipPath>
        <clipPath id={c('outer')}><path clipRule="evenodd" d={`M-10 -10H140V140H-10Z M${CX - 46} ${CY}a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z`} /></clipPath>
      </defs>

      {rings && (
        <>
          <g className="ekoa-ring ekoa-ring-0"><path d={RING1} /></g>
          <g clipPath={`url(#${c('inner')})`}><g className="ekoa-ring ekoa-ring-1"><path d={RINGS23} /></g></g>
          <g clipPath={`url(#${c('outer')})`}><g className="ekoa-ring ekoa-ring-2"><path d={RINGS23} /></g></g>
        </>
      )}

      {pose === 'jump' && <ellipse className="ekoa-shadow" cx={CX} cy="127" rx="15" ry="2.2" opacity="0.18" />}

      <g className="ekoa-figure-inner">
        <path d={HEAD} />
        <path d={FIGURE} />
        {pose === 'thumbsUp' && (
          <>
            {/* the logo's raised right hand closes into a chunky fist, thumb up */}
            <g className="ekoa-hand">
              <mask id={c('fist')}>
                <rect x="70" y="30" width="45" height="60" fill="#fff" />
                <path d="M92 65.5H98M92 70.5H98" stroke="#000" strokeWidth="1.6" strokeLinecap="round" />
              </mask>
              <g mask={`url(#${c('fist')})`}>
                <rect x="76" y="60" width="26" height="17" rx="8" />
                <rect x="77.5" y="48" width="13.5" height="19" rx="6.75" />
              </g>
            </g>
            <g className="ekoa-spark" {...STROKE} strokeWidth="3">
              <path d="M76 51L71 46M84.5 43L84.5 36M93 51L98 46" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

/** Full-screen green loading page: the logo on moss, with the rings widening around it. */
export function FullScreenLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-moss text-paper" role="status">
      <EkoaMascot pose="loading" size={180} />
      <span className="text-sm text-paper/80">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moments: a small card that pops up in the corner with the figure reacting.
//   thumbsUp – after something is submitted
//   jump     – when the school reaches the top five
// ---------------------------------------------------------------------------

type Moment = { id: number; pose: 'thumbsUp' | 'jump'; message: string };
type Api = { thumbsUp: (message?: string) => void; victory: (message?: string) => void };

const MomentContext = createContext<Api>({ thumbsUp: () => {}, victory: () => {} });
export const useMoments = () => useContext(MomentContext);

export function MomentProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<Moment | null>(null);
  const n = useRef(0);
  const show = useCallback((pose: Moment['pose'], message: string) => setMoment({ id: ++n.current, pose, message }), []);

  useEffect(() => {
    if (!moment) return;
    const t = window.setTimeout(() => setMoment(null), moment.pose === 'jump' ? 4200 : 2600);
    return () => window.clearTimeout(t);
  }, [moment]);

  const api = useMemo<Api>(() => ({
    thumbsUp: (message = 'Submitted') => show('thumbsUp', message),
    victory: (message = 'Your school is in the top five') => show('jump', message),
  }), [show]);

  return (
    <MomentContext.Provider value={api}>
      {children}
      {moment && (
        <div
          key={moment.id}
          role="status"
          className="ekoa-moment pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-panel border border-paper-line bg-white py-2 pl-3 pr-5 text-moss shadow-lg"
        >
          <EkoaMascot pose={moment.pose} size={64} />
          <span className="font-display text-lg font-semibold text-ink">{moment.message}</span>
        </div>
      )}
    </MomentContext.Provider>
  );
}
