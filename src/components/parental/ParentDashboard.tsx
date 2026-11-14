import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { Illustration } from '../../illustrations/Illustration';
import { Button } from '../ui/Button';
import { SongEditor } from './SongEditor';
import { PlaylistEditor } from './PlaylistEditor';
import { CategoryEditor } from './CategoryEditor';
import { SettingsPanel } from './SettingsPanel';
import { deleteSong, moveSong, toggleFavorite } from '../../storage/songRepository';
import { db } from '../../storage/database';
import { toUserMessage } from '../../services/errors';
import type { Song } from '../../types/song';

type Tab = 'songs' | 'playlists' | 'categories' | 'settings';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'songs', label: 'Chansons' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'categories', label: 'Catégories' },
  { key: 'settings', label: 'Réglages' },
];

/** Espace parents (une fois déverrouillé) : onglets chansons, playlists, catégories, réglages. */
export function ParentDashboard() {
  const [tab, setTab] = useState<Tab>('songs');
  return (
    <div className="stack" style={{ width: '100%' }}>
      <nav aria-label="Sections parents" className="row-wrap parent-tabs" style={{ gap: 8 }}>
        {TABS.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? 'primary' : 'secondary'}
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      {tab === 'songs' && <SongsTab />}
      {tab === 'playlists' && <PlaylistEditor />}
      {tab === 'categories' && <CategoryEditor />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

function SongsTab() {
  const { songs, categories } = useMusicLibrary();
  const [editing, setEditing] = useState<Song | 'new' | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const categoryTitle = (id: string) => categories.find((c) => c.id === id)?.title ?? '—';

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  return (
    <section className="stack" aria-label="Gestion des chansons">
      <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Mes chansons ({songs.length})</h2>
        <Button variant="primary" icon={<Plus size={20} />} onClick={() => setEditing('new')} disabled={categories.length === 0}>
          Ajouter une chanson
        </Button>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {songs.length === 0 && <p className="muted">Aucune chanson pour le moment. Colle un lien YouTube pour commencer.</p>}
      {songs.map((song, index) => (
        <div key={song.id} className="item-row">
          <div style={{ width: 52, height: 52, background: '#fff', borderRadius: 14, flex: '0 0 auto' }}>
            <Illustration name={song.illustration} style={{ width: 52, height: 52 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="item-row__title">
              {song.title} {song.isDemo && <span className="muted">(démo, fictive)</span>}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {categoryTitle(song.categoryId)}
              {song.youtubeVideoId ? ` · ${song.youtubeVideoId}` : ' · pas de vidéo'}
            </div>
          </div>
          <div className="row-wrap" style={{ gap: 6 }}>
            <Button size="icon" label="Monter" disabled={index === 0} onClick={() => run(() => moveSong(song.id, -1, db))} icon={<ArrowUp size={20} />} />
            <Button size="icon" label="Descendre" disabled={index === songs.length - 1} onClick={() => run(() => moveSong(song.id, 1, db))} icon={<ArrowDown size={20} />} />
            <Button size="icon" label={song.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => run(() => toggleFavorite(song.id, db))} icon={<Star size={20} fill={song.favorite ? 'currentColor' : 'none'} />} />
            <Button size="icon" label="Modifier" onClick={() => setEditing(song)} icon={<Pencil size={20} />} />
            {confirmId === song.id ? (
              <>
                <Button variant="danger" onClick={() => run(() => deleteSong(song.id, db)).then(() => setConfirmId(null))}>
                  Supprimer
                </Button>
                <Button onClick={() => setConfirmId(null)}>Non</Button>
              </>
            ) : (
              <Button size="icon" variant="danger" label="Supprimer la chanson" onClick={() => setConfirmId(song.id)} icon={<Trash2 size={20} />} />
            )}
          </div>
        </div>
      ))}
      {editing && (
        <SongEditor
          song={editing === 'new' ? undefined : editing}
          categories={categories}
          defaultCategoryId={categories[0]?.id ?? ''}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
