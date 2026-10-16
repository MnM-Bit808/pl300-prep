/**
 * A burst of highlighter strokes and ticks from an element: the party at the end of a lesson.
 * Decoration only, hidden from assistive tech, and not drawn at all when motion is reduced. The
 * burst is the same every time (a fixed seed), which keeps render pure and tests predictable.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { prefersReducedMotion } from '@/app/prefs';
import { seededRandom } from '@/lib/random';
import styles from './Confetti.module.css';

/** The highlighter, the four exam domains and indigo: the app's own colours. */
const COLOURS = ['--mark', '--d-prepare', '--d-model', '--d-visualize', '--d-manage', '--indigo'];

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo);

function makePieces(count: number) {
  const r = seededRandom(300);
  return Array.from({ length: count }, (_, i) => {
    const side = r() < 0.5 ? -1 : 1;
    const tick = i % 7 === 3;
    const w = tick ? 14 : Math.round(between(r, 14, 28));
    return {
      shape: tick ? 'tick' : 'stroke',
      style: {
        '--c': `var(${COLOURS[Math.floor(r() * COLOURS.length)]})`,
        '--w': `${w}px`,
        '--h': tick ? '8px' : `${Math.round(between(r, 6, 9))}px`,
        '--dx': `${Math.round(side * between(r, 0, 340))}px`,
        // How far up it flies: a share of the room above the origin, so phones get an arc too.
        '--f': between(r, 0.35, 1).toFixed(2),
        '--fall': `${Math.round(between(r, 45, 80))}vh`,
        '--rot': `${Math.round(between(r, -600, 600))}deg`,
        '--delay': `${Math.round(between(r, 0, 160))}ms`,
        '--dur': `${Math.round(between(r, 1500, 2300))}ms`,
      } as CSSProperties,
    };
  });
}

const PIECES = makePieces(44);
/** Longer than the slowest piece, then the layer goes. */
const LIFETIME = 2800;

export function Confetti({ from }: { from: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [still] = useState(prefersReducedMotion);
  const [over, setOver] = useState(false);

  // Burst from the middle of the element (or near the top of the screen without one).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = from.current?.getBoundingClientRect();
    el.style.setProperty('--ox', `${r ? r.left + r.width / 2 : window.innerWidth / 2}px`);
    el.style.setProperty('--oy', `${r ? r.top + r.height / 2 : window.innerHeight / 3}px`);
  }, [from]);

  useEffect(() => {
    const t = setTimeout(() => setOver(true), LIFETIME);
    return () => clearTimeout(t);
  }, []);

  if (still || over) return null;
  return (
    <div ref={ref} className={styles.confetti} aria-hidden="true">
      {PIECES.map((p, i) => (
        <span key={i} className={styles.piece} data-shape={p.shape} style={p.style} />
      ))}
    </div>
  );
}
