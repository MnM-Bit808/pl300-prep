/**
 * Installing the app. Chromium browsers fire `beforeinstallprompt` once, early, so this module
 * listens from startup (main.tsx imports it) and keeps the event until Settings offers the
 * Install button. Safari has no such event: Settings explains Add to Home Screen instead.
 */
import { useSyncExternalStore } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | 'installed' // running as the installed app
  | 'available' // the browser will install it on request
  | 'ios' // Safari on iPhone or iPad: Share, then Add to Home Screen
  | 'manual'; // anything else: the browser's own menu, if it can

let deferred: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our own button instead of the browser's mini-infobar.
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function getState(): InstallState {
  if (justInstalled || standalone()) return 'installed';
  if (deferred) return 'available';
  return isIos() ? 'ios' : 'manual';
}

/** Shows the browser's install dialog. Resolves true if the learner accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // the event can only be used once
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome === 'accepted';
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useInstallState = () => useSyncExternalStore(subscribe, getState, getState);
