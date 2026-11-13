export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'grid', placeItems: 'center', gap: 12, padding: 40 }}>
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}
