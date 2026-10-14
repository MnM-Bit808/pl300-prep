/** One simulator: what it shows, the simulator itself (loaded on demand), the rule to keep,
 * and a way into practice on the same subtopics. */
import { Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { useBank } from '@/bank/useBank';
import buttons from '@/ui/buttons.module.css';
import { conceptById, CONCEPTS } from './registry';
import sim from './ui/sim.module.css';
import styles from './ConceptPage.module.css';
import { useDocumentTitle } from '@/app/title';

export function ConceptPage() {
  const { id = '' } = useParams();
  const bank = useBank();
  const concept = conceptById.get(id);
  useDocumentTitle(concept ? `${concept.title} simulator` : 'Simulator not found');
  if (!concept) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Simulator not found</h1>
        <Link to="/concepts">All concept simulators</Link>
      </div>
    );
  }
  const { Component } = concept;
  const related = bank.questions.filter((q) => concept.subtopics.includes(q.subtopic));
  const subtopic = concept.subtopics[0]!;
  const index = CONCEPTS.indexOf(concept);
  const next = CONCEPTS[(index + 1) % CONCEPTS.length]!;

  return (
    <div className={styles.page}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link to="/concepts">Concept simulators</Link>
      </nav>
      <header className={styles.head}>
        <h1 className={styles.title}>{concept.title}</h1>
        <p className={styles.lead}>{concept.summary}</p>
      </header>

      <Suspense fallback={<p className="loading">Loading the simulator…</p>}>
        <Component />
      </Suspense>

      <section className={styles.keep} aria-labelledby="keep">
        <h2 id="keep" className={styles.h2}>
          The rule to keep
        </h2>
        <div className={sim.formula}>
          <span className={sim.fx} aria-hidden="true">
            fx
          </span>
          <code className={styles.rule}>
            <mark className={styles.mark}>{concept.rule}</mark>
          </code>
        </div>
      </section>

      <div className={styles.actions}>
        <Link
          className={buttons.primary}
          to={`/practice/run?mode=custom&topic=${encodeURIComponent(concept.topic)}&subtopic=${encodeURIComponent(subtopic)}&n=10`}
        >
          Practise {subtopic.toLowerCase()} ({related.filter((q) => q.subtopic === subtopic).length}{' '}
          questions)
        </Link>
        <Link className={buttons.secondary} to={`/concepts/${next.id}`}>
          Next simulator: {next.title}
        </Link>
      </div>
    </div>
  );
}
