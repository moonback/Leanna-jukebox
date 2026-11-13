import { Link } from 'react-router-dom';
import { Illustration } from '../../illustrations/Illustration';
import { sourceKey } from '../../services/sources';
import type { Playlist } from '../../types/playlist';

export function PlaylistCard({ playlist, count }: { playlist: Playlist; count: number }) {
  return (
    <Link
      to={`/list/${encodeURIComponent(sourceKey('pl', playlist.id))}`}
      className="glass"
      aria-label={`Playlist ${playlist.title}`}
      style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: 16, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
    >
      <Illustration name={playlist.illustration} style={{ width: 84, height: 84 }} />
      <span style={{ fontWeight: 900, textAlign: 'center', overflowWrap: 'anywhere' }}>{playlist.title}</span>
      <span className="muted">{count} chanson{count > 1 ? 's' : ''}</span>
    </Link>
  );
}
