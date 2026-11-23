import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { PhotoAlbum } from '../components/PhotoAlbum';

/** Album consultable depuis l'espace enfant ; la gestion reste dans l'espace parents. */
export function PhotosPage() {
  return (
    <AppShell>
      <header className="row-wrap" style={{ alignItems: 'center', marginBottom: 20 }}>
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon">
          <ChevronLeft size={28} />
        </Link>
        <div>
          <h1 style={{ margin: 0 }}>Mes photos</h1>
          <p className="muted">Les souvenirs de la famille</p>
        </div>
      </header>
      <PhotoAlbum />
    </AppShell>
  );
}
