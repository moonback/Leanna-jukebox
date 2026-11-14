import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Modal } from '../components/ui/Modal';
import { PinPad } from '../components/parental/PinPad';
import { useParentAuth } from '../hooks/useParentAuth';
import { SimplePlayer } from '../components/music/SimplePlayer';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Illustration } from '../illustrations/Illustration';
import { youtubeThumbnailUrl } from '../services/youtube/youtubeUrlParser';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { useSettings } from '../hooks/useSettings';
import { markPlayed } from '../storage/songRepository';
import { db } from '../storage/database';
import { playUiSound } from '../services/sound';

/**
 * Mode simple : une grande grille de chansons. Un appui sur une chanson affiche la vidéo en petit
 * et la lance ; un appui sur une autre chanson la remplace. À la fin, la chanson suivante démarre.
 */
export function SimpleModePage() {
  const library = useMusicLibrary();
  const { settings } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const auth = useParentAuth();
  const navigate = useNavigate();

  // Désactive le clic droit (menu contextuel) tant que le mode simple est affiché.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  if (!library.ready) return <AppShell><LoadingState /></AppShell>;

  const songs = library.songs;
  const index = songs.findIndex((s) => s.id === selectedId);
  const current = index >= 0 ? songs[index] : undefined;

  const choose = (id: string) => {
    playUiSound(settings.soundsEnabled);
    setSelectedId(id);
  };

  return (
    <AppShell showNavigation={false}>
      <header className="row-wrap" style={{ gap: 12, justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 900 }}>Leanna-Jukebox</h1>
        {/* Sortie protégée : seul un parent avec le code PIN peut quitter ce mode. */}
        <button
          type="button"
          className="btn btn--secondary btn--icon"
          aria-label="Sortir du mode simple (code parent)"
          title="Sortir du mode simple (code parent)"
          onClick={() => {
            if (auth.hasPin) setExitOpen(true);
            else navigate('/');
          }}
        >
          <Lock size={24} />
        </button>
      </header>

      {exitOpen && (
        <Modal title="Sortir du mode simple" onClose={() => setExitOpen(false)}>
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <PinPad
              title="Code parent"
              hint="Saisis le code PIN pour quitter le mode simple."
              submitLabel="Sortir"
              onSubmit={async (pin) => {
                const result = await auth.unlock(pin);
                if (result.status === 'ok') {
                  setExitOpen(false);
                  navigate('/');
                  return null;
                }
                if (result.status === 'locked') return 'Trop d’essais. Patiente un instant.';
                return 'Code incorrect.';
              }}
            />
          </div>
        </Modal>
      )}

      {songs.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <EmptyState illustration="cloud" title="Pas encore de chansons" description="Un parent peut ajouter des chansons." />
        </div>
      ) : (
        <div className="simple-layout">
          {/* Gauche : les titres. */}
          <div className="simple-list" role="list">
            {songs.map((song) => {
              const selected = song.id === selectedId;
              return (
                <button
                  key={song.id}
                  type="button"
                  role="listitem"
                  aria-pressed={selected}
                  aria-label={`Écouter ${song.title}`}
                  className={selected ? 'simple-row simple-row--selected' : 'simple-row'}
                  onClick={() => choose(song.id)}
                >
                  {selected && (
                    <span className="simple-row__eq" aria-hidden="true">
                      <i /><i /><i />
                    </span>
                  )}
                  {song.youtubeVideoId ? (
                    <img
                      src={youtubeThumbnailUrl(song.youtubeVideoId)}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12 }}
                    />
                  ) : (
                    <Illustration name={song.illustration} style={{ width: 56, height: 56, flex: '0 0 auto' }} />
                  )}
                  <span className="simple-row__title">{song.title}</span>
                </button>
              );
            })}
          </div>

          {/* Droite : la vidéo, lancée automatiquement au choix d'un titre. */}
          <div className="simple-player-column">
            {current ? (
              <SimplePlayer
                key={current.id}
                song={current}
                volume={settings.maxVolumePreference}
                onStarted={(id) => {
                  void markPlayed(id, db);
                }}
                onEnded={() => {
                  const next = songs[index + 1];
                  if (next) setSelectedId(next.id);
                }}
                onClose={() => setSelectedId(null)}
                onPrevious={index > 0 ? () => choose(songs[index - 1].id) : undefined}
                onNext={index < songs.length - 1 ? () => choose(songs[index + 1].id) : undefined}
              />
            ) : (
              <div className="glass simple-placeholder">
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>Choisis une chanson à gauche</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
