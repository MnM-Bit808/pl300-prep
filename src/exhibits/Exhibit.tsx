import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { bankAssetUrl } from '@/bank/load';
import type { BankImage } from '@/bank/schema';
import { ExpandIcon } from '@/ui/icons';
import { ExhibitViewer } from './ExhibitViewer';
import { exhibitSize } from './sizes';
import styles from './Exhibit.module.css';

interface Props {
  image: BankImage;
  /** Names the exhibit in the viewer, e.g. the question id. */
  label: string;
  /** Let wide exhibits break out of the reading column (question view). */
  breakout?: boolean;
}

export function Exhibit({ image, label, breakout = false }: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const enlargeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  // The viewer unmounts on close, so hand focus back to the control that opened it.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) enlargeRef.current?.focus();
    wasOpen.current = open;
  }, [open]);
  const [w, h] = exhibitSize(image.src);
  const url = bankAssetUrl(image.src);

  return (
    <figure
      className={styles.figure}
      data-breakout={breakout || undefined}
      style={{ '--natural-w': `${w}px` } as CSSProperties}
    >
      <div className={styles.frame}>
        {failed ? (
          <p className={styles.failed} role="img" aria-label={image.alt}>
            This exhibit didn't load. Its description: {image.alt}
          </p>
        ) : (
          <img
            className={styles.image}
            src={url}
            alt={image.alt}
            width={w}
            height={h}
            style={{ aspectRatio: `${w} / ${h}` }}
            loading="lazy"
            decoding="async"
            onClick={() => setOpen(true)}
            onError={() => setFailed(true)}
          />
        )}
        {!failed && (
          <button
            ref={enlargeRef}
            type="button"
            className={styles.enlarge}
            onClick={() => setOpen(true)}
          >
            <ExpandIcon />
            <span>Enlarge</span>
            <span className="sr-only"> exhibit</span>
          </button>
        )}
      </div>
      {open && (
        <ExhibitViewer url={url} alt={image.alt} natural={[w, h]} label={label} onClose={close} />
      )}
    </figure>
  );
}
