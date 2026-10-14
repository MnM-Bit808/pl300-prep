/** The concept simulators, in exam order. */
import { Link } from 'react-router';
import { useBank } from '@/bank/useBank';
import { CONCEPTS } from './registry';
import styles from './ConceptsPage.module.css';

export function ConceptsPage() {
  const bank = useBank();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Concept simulators</h1>
      <p className={styles.lead}>
        Four ideas the exam leans on, as things you can poke. Change the inputs and watch what Power
        Query or DAX does with them.
      </p>
      <ul className={styles.grid}>
        {CONCEPTS.map((c) => {
          const n = bank.questions.filter((q) => c.subtopics.includes(q.subtopic)).length;
          return (
            <li key={c.id}>
              <Link to={`/concepts/${c.id}`} className={styles.card}>
                <span className={styles.cardTitle}>{c.title}</span>
                <span className={styles.cardText}>{c.summary}</span>
                <span className={styles.cardMeta}>
                  {c.topic}, {n} related questions
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
