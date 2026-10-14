/**
 * Puts a case study next to its question, as the exam does.
 * - Wide screens: a sticky panel beside the question, scrolling on its own.
 * - Narrow screens: a sticky bar above the question opens the case in a bottom sheet. The sheet
 *   stays mounted while closed, so its tab and scroll position survive between looks.
 *
 * Render with `key={caseStudy.id}`: moving between questions of one case keeps the open tab.
 */
import { useId, useRef, useState, type ReactNode } from 'react';
import type { CaseStudy } from '@/bank/schema';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { CloseIcon } from '@/ui/icons';
import { CaseTabs } from './CaseTabs';
import styles from './CaseFrame.module.css';

export const SPLIT_QUERY = '(min-width: 1040px)';

interface Props {
  caseStudy: CaseStudy;
  /** e.g. "Question 2 of 7 in this case". */
  position?: string | undefined;
  children: ReactNode;
}

export function CaseFrame({ caseStudy, position, children }: Props) {
  const split = useMediaQuery(SPLIT_QUERY);
  const uid = useId().replace(/:/g, '');
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const panelScroller = useRef<HTMLDivElement>(null);
  const sheetScroller = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const titleId = `${uid}-title`;

  const openSheet = () => {
    sheetRef.current?.showModal();
    setOpen(true);
  };
  // State and focus update right here, not in the dialog's "close" event: that event is queued
  // as a task, so relying on it leaves aria-expanded stale until the browser gets round to it.
  const closeSheet = () => {
    if (sheetRef.current?.open) sheetRef.current.close();
    setOpen(false);
    openerRef.current?.focus();
  };

  const heading = (
    <div className={styles.heading}>
      <p className={styles.kind}>Case study</p>
      <h2 id={titleId} className={styles.title}>
        {caseStudy.title}
      </h2>
    </div>
  );

  // One tree for both layouts, with the question at a stable key: crossing the breakpoint
  // (rotating a tablet, resizing a window) must never remount it and lose the answer.
  return (
    <div className={styles.frame} data-layout={split ? 'split' : 'stacked'}>
      {split ? (
        <aside key="panel" className={styles.panel} aria-labelledby={titleId}>
          {heading}
          <div ref={panelScroller} className={styles.scroller}>
            <CaseTabs
              caseStudy={caseStudy}
              selected={tab}
              onSelect={setTab}
              uid={uid}
              scrollerRef={panelScroller}
            />
          </div>
        </aside>
      ) : (
        <div key="bar" className={styles.bar}>
          <p className={styles.barText}>
            <span className={styles.kind}>Case study</span>
            <strong>{caseStudy.title}</strong>
          </p>
          <button
            ref={openerRef}
            type="button"
            className={styles.open}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={openSheet}
          >
            Read case
          </button>
        </div>
      )}

      <div key="question" className={styles.question} data-contained={split || undefined}>
        {position && <p className={styles.position}>{position}</p>}
        {children}
      </div>

      {!split && (
        <dialog
          key="sheet"
          ref={sheetRef}
          className={styles.sheet}
          aria-labelledby={titleId}
          onCancel={(e) => {
            // Esc: close through the same path as the buttons.
            e.preventDefault();
            closeSheet();
          }}
          onClose={() => setOpen(false)}
          onClick={(e) => {
            // A click on the backdrop lands on the <dialog> itself.
            if (e.target === e.currentTarget) closeSheet();
          }}
        >
          <div className={styles.sheetHead}>
            {heading}
            <button
              type="button"
              className={styles.close}
              onClick={closeSheet}
              aria-label="Close case study"
            >
              <CloseIcon />
            </button>
          </div>
          <div ref={sheetScroller} className={styles.sheetBody}>
            <CaseTabs
              caseStudy={caseStudy}
              selected={tab}
              onSelect={setTab}
              uid={`${uid}-sheet`}
              scrollerRef={sheetScroller}
            />
          </div>
          <div className={styles.sheetFoot}>
            <button type="button" className={styles.back} onClick={closeSheet}>
              Back to the question
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
