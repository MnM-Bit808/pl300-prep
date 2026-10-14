import { useEffect, useState } from 'react';

/** Milliseconds until `endsAt` (epoch ms), updated every second and on returning to the tab.
 * Wall-clock based: a throttled background tab or a reload can't stretch the time. */
export function useCountdown(endsAt: number): number {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, endsAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endsAt]);
  return left;
}

/** 1:05:09 or 9:07 */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
