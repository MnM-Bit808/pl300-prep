/**
 * The exam domains' visual identity: a short name, an icon and a colour. The colour is set by
 * `data-domain` on any element (global.css maps it to --d), so components style with
 * `var(--d)` and never repeat a hex value. The name always travels with the colour.
 */
import { DOMAIN_SHORT, type Domain } from '@/bank/constants';
import { CaseIcon, ManageIcon, ModelIcon, PrepareIcon, VisualizeIcon } from './icons';
import styles from './domains.module.css';

const ICONS = {
  prepare: PrepareIcon,
  model: ModelIcon,
  visualize: VisualizeIcon,
  manage: ManageIcon,
  case: CaseIcon,
} as const satisfies Record<Domain, unknown>;

/** The domain's icon in its colour. Decorative: the domain's name is always beside it. */
export function DomainIcon({
  domain,
  className,
}: {
  domain: Domain;
  className?: string | undefined;
}) {
  const Icon = ICONS[domain];
  return (
    <span className={`${styles.icon} ${className ?? ''}`} data-domain={domain} aria-hidden="true">
      <Icon />
    </span>
  );
}

/** Icon and short name together: the tag that marks a question, a bar or a row. */
export function DomainTag({ domain }: { domain: Domain }) {
  return (
    <span className={styles.tag} data-domain={domain}>
      <DomainIcon domain={domain} />
      {DOMAIN_SHORT[domain]}
    </span>
  );
}
