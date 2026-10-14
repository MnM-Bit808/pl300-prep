/** The pages for a link that goes nowhere and for a page that failed to load. */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import buttons from '@/ui/buttons.module.css';
import { useDocumentTitle } from './title';
import styles from './Fallbacks.module.css';

export function Loading() {
  return <p className="loading">Loading…</p>;
}

export function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>
        There’s nothing at this address. The link may be old, or mistyped.
      </p>
      <Link to="/" className={buttons.primary}>
        Go to Learn
      </Link>
    </div>
  );
}

/** A deploy renames every chunk; a tab opened before it asks for files that no longer exist. */
const isChunkError = (error: unknown) =>
  error instanceof TypeError &&
  /dynamically imported module|Importing a module script/i.test(error.message);

export function RouteError() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  useDocumentTitle(missing ? 'Page not found' : 'Something went wrong');
  if (missing)
    return (
      <main id="main" className={styles.standalone}>
        <NotFound />
      </main>
    );

  return (
    <main id="main" className={`${styles.page} ${styles.standalone}`}>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.text}>
        {isChunkError(error)
          ? 'Part of the app didn’t load. You may be offline, or a new version came out since this tab opened.'
          : 'This page hit an error. Your progress is saved on this device, so reloading is safe.'}
      </p>
      <button type="button" className={buttons.primary} onClick={() => window.location.reload()}>
        Reload
      </button>
      <a href="/" className={buttons.secondary}>
        Go to Learn
      </a>
    </main>
  );
}
