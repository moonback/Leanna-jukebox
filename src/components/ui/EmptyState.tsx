import type { ReactNode } from 'react';
import { Illustration } from '../../illustrations/Illustration';
import type { IllustrationKey } from '../../illustrations/illustrationKeys';

interface EmptyStateProps {
  illustration?: IllustrationKey;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Écran vide élégant : aucune chanson, aucune playlist, aucun favori. */
export function EmptyState({ illustration = 'cloud', title, description, action }: EmptyStateProps) {
  return (
    <div className="glass anim-pop" style={{ textAlign: 'center', padding: '32px 20px', display: 'grid', justifyItems: 'center', gap: 12 }}>
      <Illustration name={illustration} className="anim-float" style={{ width: 120, height: 120 }} />
      <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
