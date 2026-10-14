/**
 * The case study's tabs (Overview, Data, Requirements, Exhibit…), following the WAI-ARIA tabs
 * pattern: one tab stop for the tab list, arrow keys / Home / End to move between tabs, and
 * automatic activation. Each tab keeps its own scroll position, so flicking between
 * Requirements and the question never loses your place.
 */
import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { CaseStudy } from '@/bank/schema';
import { Exhibit } from '@/exhibits/Exhibit';
import { RichText } from '@/ui/RichText';
import styles from './CaseTabs.module.css';

interface Props {
  caseStudy: CaseStudy;
  selected: number;
  onSelect: (index: number) => void;
  /** Unique prefix for tab and panel ids. */
  uid: string;
  /** The element that scrolls the panel (the sticky column or the sheet body). */
  scrollerRef: RefObject<HTMLElement | null>;
}

export function CaseTabs({ caseStudy, selected, onSelect, uid, scrollerRef }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollByTab = useRef(new Map<number, number>());
  const tab = caseStudy.tabs[selected] ?? caseStudy.tabs[0];

  // Restore this tab's scroll position after switching to it.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = scrollByTab.current.get(selected) ?? 0;
  }, [selected, scrollerRef]);

  const select = (index: number, focus = false) => {
    const el = scrollerRef.current;
    if (el) scrollByTab.current.set(selected, el.scrollTop);
    onSelect(index);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const last = caseStudy.tabs.length - 1;
    const next = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next < 0 ? last : next > last ? 0 : next, true);
  };

  return (
    <div className={styles.wrap}>
      <div
        className={styles.tablist}
        role="tablist"
        aria-label={`${caseStudy.title} case study`}
        onKeyDown={onKeyDown}
      >
        {caseStudy.tabs.map((t, i) => (
          <button
            key={t.title}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${i}`}
            className={styles.tab}
            aria-selected={i === selected}
            aria-controls={`${uid}-panel`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => select(i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tab && (
        <div
          id={`${uid}-panel`}
          role="tabpanel"
          className={styles.panel}
          aria-labelledby={`${uid}-tab-${selected}`}
          tabIndex={0}
        >
          {tab.paragraphs.map((p, i) => (
            <RichText key={i} text={p} className={styles.paragraph} />
          ))}
          {tab.image && <Exhibit image={tab.image} label={`${caseStudy.title}, ${tab.title}`} />}
        </div>
      )}
    </div>
  );
}
