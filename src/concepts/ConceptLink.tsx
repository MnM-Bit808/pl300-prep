/** "See it working" link from an answered question to the simulator for its subtopic. */
import { Link, useInRouterContext } from 'react-router';
import { conceptFor } from './registry';
import styles from './ConceptLink.module.css';

export function ConceptLink({ subtopic }: { subtopic: string }) {
  const routed = useInRouterContext();
  const concept = conceptFor(subtopic);
  // Outside a router (a bare component test) there's nowhere to link to.
  if (!concept || !routed) return null;
  return (
    <p className={styles.link}>
      <span>See it working:</span>{' '}
      <Link to={`/concepts/${concept.id}`}>{concept.title} simulator</Link>
    </p>
  );
}
