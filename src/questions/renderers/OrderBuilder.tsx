/**
 * "Select the actions and arrange them in order." Two zones, as in the exam:
 * - Actions: the shuffled pool, including distractors. Tap one to place it.
 * - Answer area: the sequence. Reorder by dragging the grip (pointer, touch or keyboard via
 *   dnd-kit), or with the move buttons; remove sends a step back to the pool.
 */
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CrossIcon, GripIcon, PlusIcon } from '@/ui/icons';
import { InlineText } from '@/ui/RichText';
import type { RendererProps } from './types';
import styles from './OrderBuilder.module.css';

interface StepProps {
  id: string;
  position: number;
  count: number;
  text: string;
  revealed: boolean;
  correct: boolean | undefined;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

function Step({ id, position, count, text, revealed, correct, onMove, onRemove }: StepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: revealed });

  return (
    <li
      ref={setNodeRef}
      className={styles.step}
      data-dragging={isDragging || undefined}
      data-mark={correct === undefined ? undefined : correct ? 'correct' : 'wrong'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <span className={styles.slot} aria-hidden="true">
        {position + 1}
      </span>
      {!revealed && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={styles.grip}
          aria-label={`Reorder step ${position + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}
      <span className={styles.stepText}>
        <InlineText text={text} />
        {correct !== undefined && (
          <span className={styles.mark}>
            {correct ? <CheckIcon /> : <CrossIcon />}
            {correct ? 'Right place' : 'Wrong place or not needed'}
          </span>
        )}
      </span>
      {!revealed && (
        <span className={styles.stepActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onMove(-1)}
            disabled={position === 0}
            aria-label={`Move step ${position + 1} up`}
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onMove(1)}
            disabled={position === count - 1}
            aria-label={`Move step ${position + 1} down`}
          >
            <ArrowDownIcon />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onRemove}
            aria-label={`Remove step ${position + 1}`}
          >
            <CrossIcon />
          </button>
        </span>
      )}
    </li>
  );
}

export function OrderBuilder({
  question,
  answer,
  layout,
  onChange,
  revealed,
  uid,
  onStatus,
}: RendererProps<'order'>) {
  const textOf = new Map(question.items.map((i) => [i.id, i.text]));
  const sequence = answer.sequence;
  const pool = layout.order.filter((id) => !sequence.includes(id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Every change is computed from the latest sequence, by id, so quick taps can't collide. */
  const update = (fn: (seq: string[]) => string[]) =>
    onChange((prev) => ({ ...prev, sequence: fn(prev.sequence) }));
  const moveId = (seq: string[], id: string, to: (from: number) => number) => {
    const from = seq.indexOf(id);
    const target = to(from);
    return from < 0 || target < 0 || target >= seq.length ? seq : arrayMove(seq, from, target);
  };
  const label = (id: string | number) => `"${textOf.get(String(id)) ?? ''}"`;
  const pos = (id: string | number) => sequence.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${label(active.id)}, step ${pos(active.id)} of ${sequence.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${label(active.id)} is over position ${pos(over.id)} of ${sequence.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${label(active.id)} at step ${pos(over.id)}.`
        : `Dropped ${label(active.id)}.`,
    onDragCancel: ({ active }) => `Cancelled. ${label(active.id)} stays at step ${pos(active.id)}.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    update((seq) => moveId(seq, String(active.id), () => seq.indexOf(overId)));
  };

  const add = (id: string) => {
    update((seq) => (seq.includes(id) ? seq : [...seq, id]));
    onStatus?.(`Added ${label(id)}.`);
  };
  const move = (id: string, index: number, delta: -1 | 1) => {
    update((seq) => moveId(seq, id, (from) => from + delta));
    onStatus?.(`Moved to step ${index + delta + 1}.`);
  };
  const remove = (id: string) => {
    update((seq) => seq.filter((s) => s !== id));
    onStatus?.(`Removed ${label(id)}.`);
  };

  const answerHeading = `${uid}-answer`;
  const poolHeading = `${uid}-pool`;

  return (
    <div className={styles.zones}>
      <section className={styles.zone} aria-labelledby={poolHeading}>
        <h3 id={poolHeading} className={styles.zoneTitle}>
          Actions
        </h3>
        {pool.length ? (
          <ul className={styles.pool}>
            {pool.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className={styles.poolItem}
                  onClick={() => add(id)}
                  disabled={revealed}
                >
                  <span className={styles.plus} aria-hidden="true">
                    <PlusIcon />
                  </span>
                  <span>
                    <InlineText text={textOf.get(id) ?? ''} />
                  </span>
                  <span className="sr-only">, add to answer</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Every action is in the answer area.</p>
        )}
      </section>

      <section className={styles.zone} data-answer aria-labelledby={answerHeading}>
        <h3 id={answerHeading} className={styles.zoneTitle}>
          Answer area
        </h3>
        {sequence.length ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable:
                  'To reorder, press Space or Enter to pick up, use the arrow keys to move, and press Space or Enter again to drop. Press Escape to cancel.',
              },
            }}
          >
            <SortableContext items={sequence} strategy={verticalListSortingStrategy}>
              <ol className={styles.sequence}>
                {sequence.map((id, i) => (
                  <Step
                    key={id}
                    id={id}
                    position={i}
                    count={sequence.length}
                    text={textOf.get(id) ?? ''}
                    revealed={revealed}
                    correct={revealed ? question.answer[i] === id : undefined}
                    onMove={(d) => move(id, i, d)}
                    onRemove={() => remove(id)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <p className={styles.empty}>Tap the actions you need, in the order you'd do them.</p>
        )}
      </section>
    </div>
  );
}
