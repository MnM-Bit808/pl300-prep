/**
 * Zod, configured once. The Content-Security-Policy has no 'unsafe-eval', so Zod's compiled fast
 * path (built with `new Function`) is switched off rather than tried and refused; parsing is the
 * same, only interpreted. Import `z` from here, not from 'zod'.
 */
import { z } from 'zod';

z.config({ jitless: true });

export { z };
