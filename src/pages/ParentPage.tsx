import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ParentGate } from '../components/parental/ParentGate';
import { ParentDashboard } from '../components/parental/ParentDashboard';

/** Espace parents : protégé par PIN, avec retour à l'accueil enfant. */
export function ParentPage() {
  return (
    <AppShell showNavigation={false}>
      <div className="parent-page">
        <header className="parent-header glass">
          <Link to="/" aria-label="Retour à l’accueil enfant" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
            <ChevronLeft size={28} />
          </Link>
          <div>
            <h1 className="parent-header__title">Espace parents</h1>
            <p className="muted parent-header__sub"><ShieldCheck size={15} /> Gestion sécurisée du jukebox</p>
          </div>
        </header>
        <ParentGate>
          <ParentDashboard />
        </ParentGate>
      </div>
    </AppShell>
  );
}
