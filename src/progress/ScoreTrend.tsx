/**
 * Mock scores over time: one series on the 0–1,000 scale with the 700 pass line.
 * - Hover (or touch) anywhere over the plot: a crosshair snaps to the nearest mock and a
 *   tooltip shows its date and score.
 * - Keyboard: focus the chart, then ←/→ step between mocks; the active one is announced.
 * - A table view below carries the same numbers for screen readers and print.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { formatDate } from '@/lib/dates';
import { PASS_MARK } from '@/mock/build';
import styles from './ScoreTrend.module.css';

export interface TrendPoint {
  id: string;
  at: string;
  score: number;
  passed: boolean;
}

const H = 220;
const M = { top: 16, right: 20, bottom: 30, left: 44 };
const TICKS = [0, 250, 500, 750, 1000];

function useWidth(ref: RefObject<HTMLElement | null>, fallback = 600) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(el.clientWidth || fallback);
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

export function ScoreTrend({ points }: { points: readonly TrendPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const width = useWidth(wrap);
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(1, width - M.left - M.right);
  const plotH = H - M.top - M.bottom;
  const x = (i: number) =>
    M.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const y = (v: number) => M.top + plotH * (1 - v / 1000);
  const path = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(' ');

  const nearest = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect || !points.length) return null;
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    return best;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End')
      return;
    e.preventDefault();
    const last = points.length - 1;
    const cur = active ?? last;
    const next = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: last }[e.key]!;
    setActive(Math.max(0, Math.min(last, next)));
  };

  const a = active === null ? null : points[active];
  // Keep the tooltip inside the chart.
  const tipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80);

  return (
    <figure className={styles.figure}>
      <div
        ref={wrap}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={`Mock scores over time, ${points.length} ${points.length === 1 ? 'mock' : 'mocks'}. Use the left and right arrow keys to step through them.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((v) => v ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={(e: PointerEvent) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
      >
        <svg width={width} height={H} aria-hidden="true" className={styles.svg}>
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text
                x={M.left - 8}
                y={y(t)}
                className={styles.tick}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {t}
              </text>
            </g>
          ))}
          <line
            x1={M.left}
            x2={width - M.right}
            y1={y(PASS_MARK)}
            y2={y(PASS_MARK)}
            className={styles.pass}
          />
          {/* At the left: the latest mock sits at the right edge, often right on the line. */}
          <text x={M.left + 6} y={y(PASS_MARK) - 6} className={styles.passLabel} textAnchor="start">
            Pass {PASS_MARK}
          </text>

          {a && active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={M.top}
              y2={M.top + plotH}
              className={styles.crosshair}
            />
          )}
          {points.length > 1 && <path d={path} className={styles.line} />}
          {points.map((p, i) => (
            <circle
              key={p.id}
              cx={x(i)}
              cy={y(p.score)}
              r={i === active ? 7 : 5}
              className={styles.dot}
            />
          ))}

          {/* First and last dates; every date when there are only a few. */}
          {points.map((p, i) =>
            points.length <= 6 || i === 0 || i === points.length - 1 ? (
              <text key={p.id} x={x(i)} y={H - 8} className={styles.tick} textAnchor="middle">
                {new Date(p.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </text>
            ) : null,
          )}
        </svg>

        {a && active !== null && (
          <div className={styles.tip} style={{ left: tipLeft, top: Math.max(0, y(a.score) - 64) }}>
            <span className={styles.tipDate}>{formatDate(a.at)}</span>
            <strong>{a.score}</strong> {a.passed ? 'pass' : 'below pass'}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {a ? `${formatDate(a.at)}: ${a.score}, ${a.passed ? 'pass' : 'below the pass mark'}.` : ''}
      </p>

      <details className={styles.tableToggle}>
        <summary>Show as a table</summary>
        <table className={styles.table}>
          <caption className="sr-only">Mock exam scores</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Score</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.at)}</td>
                <td>{p.score}</td>
                <td>{p.passed ? 'Pass' : 'Below pass'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
