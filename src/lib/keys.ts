/** True when a key press belongs to the focused control, so global shortcuts must leave it. */
export function isTypingTarget(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable ||
      /^(SELECT|TEXTAREA)$/.test(el.tagName) ||
      (el instanceof HTMLInputElement && !['radio', 'checkbox'].includes(el.type)))
  );
}

/** True while a modal dialog (exhibit viewer, case sheet, confirm) owns the keyboard. */
export const dialogOpen = () => Boolean(document.querySelector('dialog[open]'));
