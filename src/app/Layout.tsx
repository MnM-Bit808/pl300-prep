/**
 * The site frame. One navigation, two shapes: a row in the header on wide screens, and a
 * bottom tab bar on phones (where five sections don't fit across the top, and a thumb
 * reaches the bottom anyway). Settings is the gear in the header.
 */
import { Suspense, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { ChartIcon, ClockIcon, GearIcon, NoteIcon, StepsIcon, TargetIcon } from '@/ui/icons';
import styles from './Layout.module.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const SECTIONS: { to: string; label: string; icon: Icon; end?: boolean }[] = [
  { to: '/', label: 'Learn', icon: StepsIcon, end: true },
  { to: '/practice', label: 'Practice', icon: TargetIcon },
  { to: '/mock', label: 'Mock', icon: ClockIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
  { to: '/workings', label: 'Workings', icon: NoteIcon },
];

export function Layout() {
  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.brand ?? ''}>
            PL-300 Prep
          </NavLink>
          <nav aria-label="Main" className={styles.nav}>
            {SECTIONS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end ?? false} className={styles.navLink ?? ''}>
                <Icon className={styles.navIcon} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
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
    </>
  );
}
