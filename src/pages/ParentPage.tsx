import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ParentGate } from '../components/parental/ParentGate';
import { ParentDashboard } from '../components/parental/ParentDashboard';

/** Espace parents : protégé par PIN, avec retour à l'accueil enfant. */
export function ParentPage() {
  return (
    <AppShell showNavigation={false}>
      <header className="row-wrap" style={{ gap: 12, marginBottom: 12 }}>
        <Link to="/" aria-label="Retour à l’accueil enfant" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <div><h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 900 }}>Espace parents</h1><p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}><ShieldCheck size={15} /> Gestion sécurisée du jukebox</p></div>
      </header>
      <ParentGate>
        <ParentDashboard />
      </ParentGate>
    </AppShell>
  );
}
