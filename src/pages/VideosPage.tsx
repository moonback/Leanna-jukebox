import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { VideoAlbum } from '../components/VideoAlbum';

/** Album consultable depuis l'espace enfant ; la gestion reste dans l'espace parents. */
export function VideosPage() {
  return (
    <AppShell showNavigation={false}>
      <header className="row-wrap" style={{ alignItems: 'center', marginBottom: 20 }}>
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon">
          <ChevronLeft size={28} />
        </Link>
        <div>
          <h1 style={{ margin: 0 }}>Mes vidéos</h1>
          <p className="muted">Les souvenirs vidéo de la famille</p>
        </div>
      </header>
      <VideoAlbum />
    </AppShell>
  );
}
