/// <reference types="vite/client" />

declare module 'virtual:exhibit-sizes' {
  /** Intrinsic [width, height] of each bank image, keyed by its bank path. */
  const sizes: Readonly<Record<string, readonly [number, number]>>;
  export default sizes;
}
