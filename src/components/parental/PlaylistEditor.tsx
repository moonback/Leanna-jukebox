import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { usePlaylistSongs } from '../../hooks/usePlaylists';
import { Button } from '../ui/Button';
import { SwipeRow } from '../ui/SwipeRow';
import { IllustrationPicker } from '../ui/IllustrationPicker';
import { Illustration } from '../../illustrations/Illustration';
import { createPlaylist, deletePlaylist, addSongToPlaylist, movePlaylistSong, removeSongFromPlaylist, updatePlaylist } from '../../storage/playlistRepository';
import { db } from '../../storage/database';
import { toUserMessage } from '../../services/errors';
import type { IllustrationKey } from '../../illustrations/illustrationKeys';

/** Création, édition, réordonnancement et suppression des playlists. */
export function PlaylistEditor() {
  const { playlists, songs } = useMusicLibrary();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newIllustration, setNewIllustration] = useState<IllustrationKey>('star');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { playlist, songs: playlistSongs } = usePlaylistSongs(selectedId ?? undefined);
  const [addSongId, setAddSongId] = useState('');

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  const available = songs.filter((s) => !playlist?.songIds.includes(s.id));

  return (
    <section className="parent-layout parent-layout--split" aria-label="Gestion des playlists">
      <div className="stack">
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const created = await createPlaylist({ title: newTitle, illustration: newIllustration }, db);
              setNewTitle('');
              setSelectedId(created.id);
            });
          }}
        >
          <h2 style={{ margin: 0 }}>Nouvelle playlist</h2>
          <label className="field">
            Nom
            <input value={newTitle} maxLength={60} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex. : Pour danser" />
          </label>
          <IllustrationPicker value={newIllustration} onChange={setNewIllustration} />
          <Button type="submit" variant="primary" icon={<Plus size={20} />} disabled={newTitle.trim() === ''}>
            Créer la playlist
          </Button>
        </form>
        {playlists.length === 0 && <p className="muted">Aucune playlist. Crée-en une, par exemple « Avant de dormir ».</p>}
        {playlists.map((p) => (
          <button
            key={p.id}
            type="button"
            className="item-row"
            aria-pressed={p.id === selectedId}
            onClick={() => {
              setSelectedId(p.id);
              setConfirmDelete(false);
            }}
            style={{ outline: p.id === selectedId ? '3px solid var(--color-lavender-deep)' : 'none', textAlign: 'left' }}
          >
            <Illustration name={p.illustration} style={{ width: 44, height: 44 }} />
            <span className="item-row__title">{p.title}</span>
            <span className="muted">{p.songIds.length} chanson(s)</span>
          </button>
        ))}
      </div>

      <div className="stack">
        {error && <p className="error-text" role="alert">{error}</p>}
        {playlist ? (
          <div className="card stack">
            <h2 style={{ margin: 0 }}>{playlist.title}</h2>
            <label className="field">
              Nom
              <input
                defaultValue={playlist.title}
                key={playlist.id + playlist.title}
                maxLength={60}
                onBlur={(e) => {
                  if (e.target.value.trim() !== playlist.title) run(() => updatePlaylist(playlist.id, { title: e.target.value }, db));
                }}
              />
            </label>
            <IllustrationPicker
              value={playlist.illustration}
              onChange={(illustration) => run(() => updatePlaylist(playlist.id, { illustration }, db))}
            />
            <h3 style={{ margin: '8px 0 0' }}>Chansons de la playlist</h3>
            {playlistSongs.length === 0 && <p className="muted">Ajoute des chansons ci-dessous.</p>}
            {playlistSongs.map((song, index) => (
              <div key={song.id} className="item-row">
                <span className="item-row__title">{song.title}</span>
                <Button size="icon" label="Monter" disabled={index === 0} onClick={() => run(() => movePlaylistSong(playlist.id, song.id, -1, db))} icon={<ArrowUp size={20} />} />
                <Button size="icon" label="Descendre" disabled={index === playlistSongs.length - 1} onClick={() => run(() => movePlaylistSong(playlist.id, song.id, 1, db))} icon={<ArrowDown size={20} />} />
                <Button size="icon" label="Retirer de la playlist" onClick={() => run(() => removeSongFromPlaylist(playlist.id, song.id, db))} icon={<X size={20} />} />
              </div>
            ))}
            <div className="row-wrap">
              <select value={addSongId} onChange={(e) => setAddSongId(e.target.value)} style={{ flex: 1, minHeight: 48, borderRadius: 16, padding: '8px 12px' }} aria-label="Chanson à ajouter">
                <option value="">Choisir une chanson…</option>
                {available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                disabled={addSongId === ''}
                onClick={() =>
                  run(async () => {
                    await addSongToPlaylist(playlist.id, addSongId, db);
                    setAddSongId('');
                  })
                }
              >
                Ajouter
              </Button>
            </div>
            <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
              {confirmDelete ? (
                <>
                  <Button variant="danger" onClick={() => run(() => deletePlaylist(playlist.id, db)).then(() => setSelectedId(null))}>
                    Supprimer définitivement
                  </Button>
                  <Button onClick={() => setConfirmDelete(false)}>Annuler</Button>
                </>
              ) : (
                <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setConfirmDelete(true)}>
                  Supprimer la playlist
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="muted">Sélectionne une playlist pour la modifier.</p>
        )}
      </div>
    </section>
  );
}
