import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { applyPrefs } from './app/prefs';
// Listens for the browser's install offer from the first moment (see pwa/install.ts).
import './pwa/install';
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import './styles/global.css';

// Theme, text size and motion before the first paint, so nothing flashes.
applyPrefs();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: production only, so development never serves stale files from a cache.
if (import.meta.env.PROD) void import('./pwa/register').then((m) => m.startServiceWorker());
