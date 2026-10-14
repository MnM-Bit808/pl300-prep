import sizes from 'virtual:exhibit-sizes';

const FALLBACK: readonly [number, number] = [880, 400];

/** Intrinsic [width, height] of a bank image, read from the SVG at build time. */
export const exhibitSize = (src: string) => sizes[src] ?? FALLBACK;
