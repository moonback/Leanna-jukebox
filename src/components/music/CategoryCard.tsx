import { Link } from 'react-router-dom';
import { Illustration } from '../../illustrations/Illustration';
import { sourceKey } from '../../services/sources';
import type { Category } from '../../types/category';

/** Grande tuile de catégorie : une seule action (ouvrir la liste). */
export function CategoryCard({ category, count }: { category: Category; count?: number }) {
  return (
    <Link
      to={`/list/${encodeURIComponent(sourceKey('cat', category.id))}`}
      className="glass"
      aria-label={`Catégorie ${category.title}`}
      style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: 16, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
    >
      <Illustration name={category.illustration} style={{ width: 84, height: 84 }} />
      <span style={{ fontWeight: 900, textAlign: 'center', overflowWrap: 'anywhere' }}>{category.title}</span>
      {count !== undefined && <span className="muted">{count} chanson{count > 1 ? 's' : ''}</span>}
    </Link>
  );
}
