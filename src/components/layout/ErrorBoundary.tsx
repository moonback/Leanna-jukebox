import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

/** Filet de sécurité : une erreur inattendue affiche un message d'enfant, sans écran blanc. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erreur inattendue', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div className="glass" style={{ padding: 24, display: 'grid', gap: 14, justifyItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>Oups, le jukebox s’est arrêté.</p>
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            Recommencer
          </button>
        </div>
      </div>
    );
  }
}
