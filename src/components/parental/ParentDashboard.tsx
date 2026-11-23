import { useState } from 'react';
import { ArrowDown, ArrowUp, FolderOpen, Images, ListMusic, Music, Pencil, Plus, Search, Settings, Star, Trash2, Video, type LucideIcon } from 'lucide-react';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { Illustration } from '../../illustrations/Illustration';
import { Button } from '../ui/Button';
import { SwipeRow } from '../ui/SwipeRow';
import { SongEditor } from './SongEditor';
import { PlaylistEditor } from './PlaylistEditor';
import { CategoryEditor } from './CategoryEditor';
import { SettingsPanel } from './SettingsPanel';
import { deleteSong, moveSong, toggleFavorite } from '../../storage/songRepository';
import { db } from '../../storage/database';
import { toUserMessage } from '../../services/errors';
import type { Song } from '../../types/song';
import { PhotoAlbum } from '../PhotoAlbum';
import { VideoAlbum } from '../VideoAlbum';

type Tab = 'songs' | 'playlists' | 'categories' | 'photos' | 'videos' | 'settings';

const TABS: Array<{ key: Tab; label: string; Icon: LucideIcon }> = [
  { key: 'songs', label: 'Chansons', Icon: Music },
  { key: 'playlists', label: 'Playlists', Icon: ListMusic },
  { key: 'categories', label: 'Catégories', Icon: FolderOpen },
  { key: 'photos', label: 'Photos', Icon: Images },
  { key: 'videos', label: 'Vidéos', Icon: Video },
  { key: 'settings', label: 'Réglages', Icon: Settings },
];

/** Espace parents (une fois déverrouillé) : onglets chansons, playlists, catégories, réglages. */
export function ParentDashboard() {
  const [tab, setTab] = useState<Tab>('songs');
  return (
    <div className="stack parent-dashboard">
      <nav aria-label="Sections parents" className="parent-tabs">
        {TABS.map((item) => (
          <Button
            key={item.key}
            variant={tab === item.key ? 'primary' : 'secondary'}
            aria-pressed={tab === item.key}
            icon={<item.Icon size={18} />}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      {tab === 'songs' && <SongsTab />}
      {tab === 'playlists' && <PlaylistEditor />}
      {tab === 'categories' && <CategoryEditor />}
      {tab === 'photos' && <PhotoAlbum parentMode />}
      {tab === 'videos' && <VideoAlbum parentMode />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

function SongsTab() {
  const { songs, categories } = useMusicLibrary();
  const [editing, setEditing] = useState<Song | 'new' | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const categoryTitle = (id: string) => categories.find((c) => c.id === id)?.title ?? '—';
  const [query, setQuery] = useState('');
  const favCount = songs.filter((s) => s.favorite).length;
  const needle = query.trim().toLowerCase();
  const activeFilter = filter === 'fav' && favCount === 0 ? 'all' : filter;
  const visible = songs.filter(
    (s) =>
      (activeFilter === 'all' || (activeFilter === 'fav' ? s.favorite : s.categoryId === activeFilter)) &&
      (!needle || s.title.toLowerCase().includes(needle)),
  );
  const reorderable = activeFilter === 'all' && !needle;

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  return (
    <section className="stack songs-admin" aria-label="Gestion des chansons">
      <div className="songs-admin__head">
        <div>
          <h2 style={{ margin: 0 }}>Mes chansons</h2>
          <p className="muted songs-admin__count">
            {songs.length} chanson{songs.length > 1 ? 's' : ''} · glisse une ligne pour agir
          </p>
        </div>
        <Button variant="primary" className="songs-admin__add" icon={<Plus size={20} />} onClick={() => setEditing('new')} disabled={categories.length === 0}>
          <span className="songs-admin__add-label">Ajouter</span>
        </Button>
      </div>

      <label className="songs-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Rechercher une chanson…"
          aria-label="Rechercher une chanson"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {(categories.length > 1 || favCount > 0) && (
        <div className="chip-scroll" role="tablist" aria-label="Filtrer par catégorie">
          <button type="button" className={`chip${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>
            Toutes
          </button>
          {favCount > 0 && (
            <button type="button" className={`chip${filter === 'fav' ? ' is-active' : ''}`} onClick={() => setFilter('fav')}>
              ★ Favoris ({favCount})
            </button>
          )}
          {categories.map((c) => (
            <button key={c.id} type="button" className={`chip${filter === c.id ? ' is-active' : ''}`} onClick={() => setFilter(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      {visible.length === 0 && (
        <p className="muted">
          {songs.length === 0 ? 'Aucune chanson ici. Colle un lien YouTube pour commencer.' : 'Aucune chanson ne correspond.'}
        </p>
      )}

      {visible.map((song) => {
        const index = songs.findIndex((s) => s.id === song.id);
        const confirming = confirmId === song.id;
        return (
          <SwipeRow
            key={song.id}
            rightWidth={168}
            closeSignal={confirming ? null : song.id + String(song.favorite)}
            leftAction={
              <button type="button" className="swipe-action swipe-action--fav" onClick={() => run(() => toggleFavorite(song.id, db))}>
                <Star size={22} fill={song.favorite ? 'currentColor' : 'none'} />
                <span>{song.favorite ? 'Retirer' : 'Favori'}</span>
              </button>
            }
            rightActions={
              <>
                <button type="button" className="swipe-action swipe-action--edit" onClick={() => setEditing(song)}>
                  <Pencil size={22} />
                  <span>Modifier</span>
                </button>
                {confirming ? (
                  <button
                    type="button"
                    className="swipe-action swipe-action--danger is-confirm"
                    onClick={() => run(() => deleteSong(song.id, db)).then(() => setConfirmId(null))}
                  >
                    <Trash2 size={22} />
                    <span>Confirmer ?</span>
                  </button>
                ) : (
                  <button type="button" className="swipe-action swipe-action--danger" onClick={() => setConfirmId(song.id)}>
                    <Trash2 size={22} />
                    <span>Supprimer</span>
                  </button>
                )}
              </>
            }
          >
            <div className="song-row">
              <div className="song-row__thumb">
                {song.youtubeVideoId ? (
                  <img src={`https://i.ytimg.com/vi/${song.youtubeVideoId}/mqdefault.jpg`} alt="" loading="lazy" draggable={false} />
                ) : (
                  <Illustration name={song.illustration} style={{ width: '100%', height: '100%' }} />
                )}
              </div>
              <div className="song-row__body">
                <div className="song-row__title">
                  {song.favorite && <Star size={14} fill="currentColor" className="song-row__star" />}
                  {song.title}
                </div>
                <div className="song-row__meta">
                  <span className="chip chip--small">{categoryTitle(song.categoryId)}</span>
                  {song.isDemo && <span className="muted">démo</span>}
                  {!song.youtubeVideoId && <span className="muted">pas de vidéo</span>}
                </div>
              </div>
              {reorderable && (
                <div className="song-row__move">
                  <button type="button" aria-label="Monter" disabled={index === 0} onClick={() => run(() => moveSong(song.id, -1, db))}>
                    <ArrowUp size={18} />
                  </button>
                  <button type="button" aria-label="Descendre" disabled={index === songs.length - 1} onClick={() => run(() => moveSong(song.id, 1, db))}>
                    <ArrowDown size={18} />
                  </button>
                </div>
              )}
            </div>
          </SwipeRow>
        );
      })}

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
