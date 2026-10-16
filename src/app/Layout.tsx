/**
 * The site frame. One navigation, two shapes: a row in the header on wide screens, and a
 * bottom tab bar on phones (where five sections don't fit across the top, and a thumb
 * reaches the bottom anyway). Settings is the gear in the header.
 */
import { Suspense, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { UpdatePrompt } from '@/pwa/UpdatePrompt';
import { Googly } from '@/ui/Googly';
import { ChartIcon, ClockIcon, GearIcon, NoteIcon, StepsIcon, TargetIcon } from '@/ui/icons';
import styles from './Layout.module.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
interface Section {
  to: string;
  label: string;
  icon: Icon;
  /** Only the exact path counts (Learn is "/", which every path starts with). */
  end?: boolean;
  /** Other pages that belong to this section. */
  also?: string[];
}
const SECTIONS: Section[] = [
  { to: '/', label: 'Learn', icon: StepsIcon, end: true, also: ['/concepts'] },
  { to: '/practice', label: 'Practice', icon: TargetIcon },
  { to: '/mock', label: 'Mock', icon: ClockIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
  { to: '/workings', label: 'Workings', icon: NoteIcon },
];

const under = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

const inSection = (pathname: string, s: Section) =>
  (s.end ? pathname === s.to : under(pathname, s.to)) ||
  (s.also ?? []).some((p) => under(pathname, p));

export function Layout() {
  const { pathname } = useLocation();
  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand ?? ''}>
            <Googly className={styles.logo} follow blink />
            PL-300 Prep
          </NavLink>
          <nav aria-label="Main" className={styles.nav}>
            {SECTIONS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={styles.navLink}
                aria-current={inSection(pathname, s) ? 'page' : undefined}
              >
                <s.icon className={styles.navIcon} aria-hidden="true" />
                <span>{s.label}</span>
              </Link>
            ))}
          </nav>
          <NavLink to="/settings" className={styles.settings ?? ''} aria-label="Settings">
            <GearIcon aria-hidden="true" />
          </NavLink>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<p className="loading">Loading questions…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className={styles.footer}>
        <Link to="/lab">Question lab</Link>
        <Link to="/dev/bank">Bank check</Link>
        <span>Not affiliated with Microsoft. All questions are original.</span>
      </footer>
      <UpdatePrompt />
    </>
  );
}
