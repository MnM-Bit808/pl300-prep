import { useLayoutEffect, useRef } from 'react';
import { CloseIcon, FitIcon, ZoomInIcon, ZoomOutIcon } from '@/ui/icons';
import { usePanZoom } from './usePanZoom';
import styles from './ExhibitViewer.module.css';

interface Props {
  url: string;
  alt: string;
  natural: readonly [number, number];
  label: string;
  onClose: () => void;
}

/** Full-screen exhibit viewer. A native modal <dialog> gives focus trapping, Esc to close and
 * inert background for free; the stage handles pinch, drag, wheel and keyboard zoom. */
export function ExhibitViewer({ url, alt, natural, label, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Open before usePanZoom's layout effect measures the stage (a closed dialog measures 0).
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    stageRef.current?.focus();
    return () => dialog.close();
  }, []);

  const pz = usePanZoom(stageRef, { natural });

  const { scale, x, y } = pz.view;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={`Exhibit for ${label}`}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.toolbar}>
        <p className={styles.title}>Exhibit for {label}</p>
        <div className={styles.controls} role="group" aria-label="Zoom">
          <button
            type="button"
            onClick={() => pz.zoomBy(0.8)}
            disabled={!pz.canZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOutIcon />
          </button>
          <button
            type="button"
            className={styles.readout}
            onClick={pz.actualSize}
            aria-label={`Zoom ${pz.percent}%. Show at actual size`}
          >
            {pz.percent}%
          </button>
          <button
            type="button"
            onClick={() => pz.zoomBy(1.25)}
            disabled={!pz.canZoomIn}
            aria-label="Zoom in"
          >
            <ZoomInIcon />
          </button>
          <button
            type="button"
            onClick={pz.fit}
            disabled={!pz.canZoomOut}
            aria-label="Fit to screen"
          >
            <FitIcon />
          </button>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close exhibit">
          <CloseIcon />
        </button>
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        tabIndex={0}
        role="application"
        aria-roledescription="zoomable image"
        aria-label={`${alt}. Use plus and minus to zoom, arrow keys to move, 0 to fit.`}
        onKeyDown={pz.onKeyDown}
        data-zoomed={scale > 1 || undefined}
      >
        <img
          className={styles.image}
          src={url}
          alt=""
          draggable={false}
          style={{
            width: pz.base.w,
            height: pz.base.h,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
          }}
        />
      </div>

      <p className={styles.hint}>
        Pinch or scroll to zoom, drag to move, double-tap to zoom in or out.
      </p>
    </dialog>
  );
}
