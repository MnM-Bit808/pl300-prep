/**
 * After moving to another page, put focus on its heading, as a full page load would put a screen
 * reader at the top. Pages that place focus themselves (an exam question, a finish card) keep it.
 * Nothing moves on the first load, or when only the query string changes.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const GIVE_UP_MS = 5000;

function focusHeading(): boolean {
  const main = document.querySelector('main');
  const active = document.activeElement;
  if (main && active && active !== document.body && main.contains(active)) return true;
  const heading = main?.querySelector('h1') ?? document.querySelector('h1');
  if (!heading) return false;
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
    heading.dataset.routeFocus = '';
  }
  // Scroll position is ScrollRestoration's job.
  heading.focus({ preventScroll: true });
  return true;
}

export function RouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (focusHeading()) return;
    // The page is still loading its questions: wait for its heading to arrive.
    const observer = new MutationObserver(() => {
      if (focusHeading()) stop();
    });
    const timer = window.setTimeout(() => stop(), GIVE_UP_MS);
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
    }
    observer.observe(document.body, { childList: true, subtree: true });
    return stop;
  }, [pathname]);

  return null;
}
