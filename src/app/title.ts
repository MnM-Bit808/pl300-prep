import { useEffect } from 'react';

export const APP_NAME = 'PL-300 Prep';

/** Names the page in the browser tab and history, and for screen readers when it opens. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
