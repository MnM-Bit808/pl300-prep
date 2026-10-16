/**
 * Googly: the app's mark and its one character. It's "300" with the zeros drawn as eyes, on the
 * highlighter-yellow tile, so the exam's number is the face. public/icon.svg is the idle face.
 *
 * Moods change the eyes and mouth: happy (smiling eyes, open smile), oops (worried brows, wobbly
 * mouth), wow, puzzled. The pupils look wherever `look` points, or follow the pointer. All the
 * motion is CSS, so Reduce motion (the device's or the app's) stills it.
 * Decorative unless given a label, and it keeps its own colours in forced-colours mode, like any
 * logo.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { prefersReducedMotion } from '@/app/prefs';
import styles from './Googly.module.css';

export type Mood = 'idle' | 'happy' | 'oops' | 'wow' | 'puzzled';
export type Move = 'hop' | 'pop' | 'wobble';

const TILE = '#e6f36b';
const INK = '#1a1d2e';
/** The two zeros. */
const EYES = [280, 420] as const;
const EYE_Y = 242;

/** Where each mood looks by default, -1 to 1 on each axis. */
const LOOK: Record<Mood, { x: number; y: number }> = {
  idle: { x: 0.6, y: 0.5 },
  happy: { x: 0, y: -0.35 },
  oops: { x: -0.5, y: 0.85 },
  wow: { x: 0, y: 0 },
  puzzled: { x: -0.7, y: -0.7 },
};

/** Clamp a look to the unit circle, so a pupil never leaves its eye. */
function unit({ x, y }: { x: number; y: number }) {
  const d = Math.hypot(x, y);
  return d > 1 ? { x: x / d, y: y / d } : { x, y };
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'happy':
      return (
        <>
          <path
            d="M272 366 Q350 472 428 366 Z"
            fill={INK}
            stroke={INK}
            strokeWidth={14}
            strokeLinejoin="round"
          />
          <ellipse cx={350} cy={403} rx={26} ry={9} fill="#f27d9b" />
        </>
      );
    case 'oops':
      return (
        <path
          d="M296 398 q18 -14 36 0 t36 0 t36 0"
          stroke={INK}
          strokeWidth={18}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'wow':
      return <ellipse cx={350} cy={398} rx={20} ry={24} fill={INK} />;
    case 'puzzled':
      return <path d="M306 404 L394 388" stroke={INK} strokeWidth={20} strokeLinecap="round" />;
    default:
      return (
        <path
          d="M280 384 Q350 420 420 384"
          stroke={INK}
          strokeWidth={22}
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

/** Happy: cheeks push the bottom of each eye up into a curve, leaving a smiling dome. */
function SmilingEye({ cx }: { cx: number }) {
  const w = 54.3;
  const cheek = `M${cx - w} 300 Q${cx} 236 ${cx + w} 300`;
  return (
    <>
      <path d={`${cheek} A70 92 0 0 1 ${cx - w} 300 Z`} fill={TILE} />
      <path d={cheek} stroke={INK} strokeWidth={22} fill="none" strokeLinecap="round" />
      <path
        d={`M${cx - w} 300 A70 92 0 1 1 ${cx + w} 300`}
        stroke={INK}
        strokeWidth={32}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

/** Worried brows for oops: raised where they meet, over the eyes. */
const Brows = () => (
  <path
    d="M236 120 L306 102 M394 102 L464 120"
    stroke={INK}
    strokeWidth={18}
    strokeLinecap="round"
  />
);

interface Props {
  mood?: Mood;
  /** Where the pupils point, -1 to 1 on each axis (right and down are positive). */
  look?: { x: number; y: number };
  /** Pupils follow the pointer (the header's mark). */
  follow?: boolean;
  /** Blink every few seconds. */
  blink?: boolean;
  /** A one-off move as it appears. */
  move?: Move;
  className?: string | undefined;
  /** Exposes it as an image with this name. Leave out when it's decoration. */
  label?: string;
}

export function Googly({ mood = 'idle', look, follow, blink, move, className, label }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const gaze = unit(look ?? LOOK[mood]);

  useEffect(() => {
    const el = ref.current;
    if (!follow || !el) return;
    let frame = 0;
    let at = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      at = { x: e.clientX, y: e.clientY };
      if (frame || prefersReducedMotion()) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const dx = at.x - (r.left + r.width / 2);
        const dy = at.y - (r.top + r.height / 2);
        // Full reach a short way from the mark; a pointer right on top looks straight out.
        const reach = Math.min(1, Math.hypot(dx, dy) / 240);
        const d = Math.hypot(dx, dy) || 1;
        el.style.setProperty('--lx', ((dx / d) * reach).toFixed(2));
        el.style.setProperty('--ly', ((dy / d) * reach).toFixed(2));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [follow]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 512 512"
      className={`${styles.googly}${className ? ` ${className}` : ''}`}
      data-mood={mood}
      data-move={move}
      data-blink={blink || undefined}
      style={{ '--lx': gaze.x.toFixed(2), '--ly': gaze.y.toFixed(2) } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill={TILE} />
      {/* Drawn on a face-sized grid, then fitted inside the maskable icon's safe circle. */}
      <g transform="translate(256 256) scale(0.8) translate(-269 -274)">
        <path
          d="M54 200 A40 40 0 1 1 94 240 A44 44 0 1 1 50 284"
          stroke={INK}
          strokeWidth={36}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {EYES.map((cx) => (
          <g key={cx} className={styles.eye}>
            <ellipse cx={cx} cy={EYE_Y} rx={70} ry={92} fill="#fff" />
            <g className={styles.pupil}>
              <circle cx={cx} cy={EYE_Y} r={30} fill={INK} />
              <circle cx={cx + 10} cy={EYE_Y - 10} r={9} fill="#fff" />
            </g>
            {mood === 'happy' ? (
              <SmilingEye cx={cx} />
            ) : (
              <ellipse
                cx={cx}
                cy={EYE_Y}
                rx={70}
                ry={92}
                fill="none"
                stroke={INK}
                strokeWidth={32}
              />
            )}
          </g>
        ))}
        {mood === 'oops' && <Brows />}
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}
