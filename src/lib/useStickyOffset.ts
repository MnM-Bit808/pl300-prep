import { useLayoutEffect, type RefObject } from 'react';

/**
 * Publishes a sticky header's height as `--sticky-offset` on its screen, so other sticky
 * things inside (the case bar and panel) pin below it instead of sliding underneath.
 */
export function useStickyOffset(
  header: RefObject<HTMLElement | null>,
  screen: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const h = header.current;
    const s = screen.current;
    if (!h || !s) return;
    const set = () => s.style.setProperty('--sticky-offset', `${h.offsetHeight}px`);
    set();
    // Without ResizeObserver (old browsers, test DOMs) the first measurement stands.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(h);
    return () => ro.disconnect();
  }, [header, screen]);
}
