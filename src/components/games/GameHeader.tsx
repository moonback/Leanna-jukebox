import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/** En-tête commun des jeux : retour, titre et une action facultative à droite. */
export function GameHeader({ title, back = '/jeux', children }: { title: string; back?: string; children?: ReactNode }) {
  return (
    <header className="imagier-hero glass">
      <Link to={back} aria-label="Retour" className="btn btn--secondary btn--icon imagier-hero__back" style={{ textDecoration: 'none' }}>
        <ChevronLeft size={28} />
      </Link>
      <div className="imagier-hero__text">
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
