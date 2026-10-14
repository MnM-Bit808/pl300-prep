import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useTheme, type ThemePref } from './theme';
import styles from './Layout.module.css';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Layout() {
  const [theme, setTheme] = useTheme();
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
            <NavLink to="/" end>
              Learn
            </NavLink>
            <NavLink to="/lab">Question lab</NavLink>
          </nav>
          <label className={styles.theme}>
            <span className="sr-only">Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePref)}>
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<p className="loading">Loading questions…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
