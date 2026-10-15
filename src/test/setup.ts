import '@testing-library/jest-dom/vitest';
import { loadBank } from '@/bank/load';

// Pages that read the bank suspend until it loads. Loading it once up front means a test never
// renders a "Loading" fallback because the machine was busy when it ran.
beforeAll(() => loadBank());

// jsdom gaps the app relies on.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
