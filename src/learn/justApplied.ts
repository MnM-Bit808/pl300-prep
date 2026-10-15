/**
 * The lesson just completed, handed from the lesson screen to the Learn page so its step can
 * play the one celebratory moment: the highlighter sweeping across it. Session storage, so it
 * survives the navigation but not a new visit; every access is guarded because storage can be
 * blocked.
 */
const KEY = 'pl300.justApplied';

export function markJustApplied(lessonId: string) {
  try {
    sessionStorage.setItem(KEY, lessonId);
  } catch {
    /* no storage: no animation, nothing lost */
  }
}

/** Read without clearing (a render may run twice); clear separately once shown. */
export function peekJustApplied(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearJustApplied() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
