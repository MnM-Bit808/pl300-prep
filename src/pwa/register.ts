/**
 * Registers the service worker (production builds only; main.tsx imports this lazily). New
 * versions wait for the learner to choose to reload, and the app checks for one every hour while
 * it's open, so an installed app left running doesn't fall behind.
 */
import { registerSW } from 'virtual:pwa-register';
import { setSwState, setUpdater } from './state';

const CHECK_EVERY_MS = 60 * 60 * 1000;

export function startServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh: () => setSwState({ needRefresh: true }),
    onOfflineReady: () => setSwState({ offlineReady: true }),
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Already controlling the page from an earlier visit: it's been offline-ready all along.
      if (navigator.serviceWorker.controller)
        setSwState({ offlineReady: true, offlineNoted: true });
      window.setInterval(() => {
        if (navigator.onLine && document.visibilityState === 'visible') void registration.update();
      }, CHECK_EVERY_MS);
    },
    onRegisterError: (error) => console.warn('[pwa] service worker not registered', error),
  });
  setUpdater(() => update(true));
}
