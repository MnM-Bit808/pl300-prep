/**
 * Pan and zoom for one element inside a stage: pinch (two pointers), drag, wheel or trackpad,
 * double-tap or double-click, and keyboard (+ − 0 and arrows). Written against Pointer Events
 * so mouse, pen and touch share one code path.
 *
 * Coordinates: the content is centred in the stage at its "fit" size; the view is a
 * translate (x, y, in stage pixels from centre) and a scale (1 = fit).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

export interface View {
  scale: number;
  x: number;
  y: number;
}

interface Options {
  /** Intrinsic size of the content. */
  natural: readonly [number, number];
  /** Largest zoom, as a multiple of the content's natural size. */
  maxNatural?: number;
}

const FIT: View = { scale: 1, x: 0, y: 0 };
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 10;

export function usePanZoom(
  stageRef: RefObject<HTMLElement | null>,
  { natural, maxNatural = 3 }: Options,
) {
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [view, setViewState] = useState<View>(FIT);
  // Gesture handlers read the latest view synchronously, between renders.
  const viewRef = useRef(view);
  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  // Fit size: contain the content in the stage, never enlarging past natural size.
  const [nw, nh] = natural;
  const fitRatio = stage.w && stage.h ? Math.min(stage.w / nw, stage.h / nh, 1) : 1;
  const base = { w: nw * fitRatio, h: nh * fitRatio };
  const maxScale = Math.max(1, (maxNatural * nw) / Math.max(base.w, 1));
  /** Scale at which the content shows at its natural (100%) size. */
  const actualScale = 1 / fitRatio;

  const geometry = useRef({ base, stage, maxScale });
  useLayoutEffect(() => {
    geometry.current = { base, stage, maxScale };
  });

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef]);

  const clamp = useCallback((v: View): View => {
    const { base, stage, maxScale } = geometry.current;
    const scale = Math.min(Math.max(v.scale, 1), maxScale);
    const maxX = Math.max(0, (base.w * scale - stage.w) / 2);
    const maxY = Math.max(0, (base.h * scale - stage.h) / 2);
    return {
      scale,
      x: Math.min(Math.max(v.x, -maxX), maxX),
      y: Math.min(Math.max(v.y, -maxY), maxY),
    };
  }, []);

  const apply = useCallback((next: View) => setView(clamp(next)), [clamp, setView]);

  /** Zoom to `scale`, keeping the stage point (px, py from centre) fixed on screen. */
  const zoomAt = useCallback(
    (scale: number, px = 0, py = 0) => {
      const v = viewRef.current;
      const target = Math.min(Math.max(scale, 1), geometry.current.maxScale);
      const k = target / v.scale;
      apply({ scale: target, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    },
    [apply],
  );

  const zoomBy = useCallback((factor: number) => zoomAt(viewRef.current.scale * factor), [zoomAt]);
  const fit = useCallback(() => setView(FIT), [setView]);
  const actualSize = useCallback(() => zoomAt(actualScale), [zoomAt, actualScale]);

  // Re-clamp when the stage resizes (rotation, window resize).
  useLayoutEffect(() => {
    setView(clamp(viewRef.current));
  }, [stage.w, stage.h, clamp, setView]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let lastTap = { t: 0, x: 0, y: 0 };
    let downAt = { x: 0, y: 0 };
    let moved = false;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Capture is a nicety (keeps a drag alive outside the stage); never let it stop the gesture.
      }
      pointers.set(e.pointerId, local(e));
      if (pointers.size === 1) {
        downAt = local(e);
        moved = false;
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const now = local(e);

      if (pointers.size === 1) {
        if (Math.hypot(now.x - downAt.x, now.y - downAt.y) > TAP_SLOP) moved = true;
        const v = viewRef.current;
        apply({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y });
      } else if (pointers.size === 2) {
        moved = true;
        const [a, b] = [...pointers.entries()].map(([id, p]) => (id === e.pointerId ? now : p)) as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        const [pa, pb] = [...pointers.values()] as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        const before = Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1;
        const after = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const midBefore = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const midAfter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const v = viewRef.current;
        const target = Math.min(Math.max(v.scale * (after / before), 1), geometry.current.maxScale);
        const k = target / v.scale;
        apply({
          scale: target,
          x: midAfter.x - (midBefore.x - v.x) * k,
          y: midAfter.y - (midBefore.y - v.y) * k,
        });
      }
      pointers.set(e.pointerId, now);
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size > 0 || moved) return;
      // A clean tap: two in quick succession toggle between fit and a readable zoom.
      const p = local(e);
      const t = performance.now();
      if (
        t - lastTap.t < DOUBLE_TAP_MS &&
        Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < TAP_SLOP * 3
      ) {
        if (viewRef.current.scale > 1.05) setView(FIT);
        else zoomAt(Math.max(2.5, actualScale), p.x, p.y);
        lastTap = { t: 0, x: 0, y: 0 };
      } else {
        lastTap = { t, ...p };
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      // Trackpad pinch arrives as ctrl+wheel with small deltas; scale its sensitivity up.
      const intensity = e.ctrlKey ? 0.01 : 0.0015;
      zoomAt(viewRef.current.scale * Math.exp(-e.deltaY * intensity), p.x, p.y);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [stageRef, apply, zoomAt, actualScale, setView]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const step = 48;
      const v = viewRef.current;
      const handled: Record<string, () => void> = {
        '+': () => zoomBy(1.25),
        '=': () => zoomBy(1.25),
        '-': () => zoomBy(0.8),
        '0': fit,
        '1': actualSize,
        ArrowLeft: () => apply({ ...v, x: v.x + step }),
        ArrowRight: () => apply({ ...v, x: v.x - step }),
        ArrowUp: () => apply({ ...v, y: v.y + step }),
        ArrowDown: () => apply({ ...v, y: v.y - step }),
      };
      const action = handled[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    },
    [apply, zoomBy, fit, actualSize],
  );

  return {
    view,
    base,
    /** Zoom as a share of natural size, for the readout. */
    percent: Math.round(view.scale * fitRatio * 100),
    canZoomIn: view.scale < maxScale - 0.001,
    canZoomOut: view.scale > 1.001,
    zoomBy,
    fit,
    actualSize,
    onKeyDown,
  };
}
