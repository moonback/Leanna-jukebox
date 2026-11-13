import type { ReactNode } from 'react';
import { ChildNavigation } from './ChildNavigation';

interface AppShellProps {
  children: ReactNode;
  showNavigation?: boolean;
  variant?: 'default' | 'player';
}

/** Cadre commun : marges de sécurité Android, pas de débordement horizontal, navigation enfant en bas. */
export function AppShell({ children, showNavigation = true, variant = 'default' }: AppShellProps) {
  return (
    <div className={variant === 'player' ? 'app-shell app-shell--player' : 'app-shell'}>
      {children}
      {showNavigation && <ChildNavigation />}
    </div>
  );
}
