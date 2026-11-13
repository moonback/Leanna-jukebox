import { useEffect, useRef, useState } from 'react';
import { createYouTubePlayer, PlayerLoadError, type PlayerController } from '../services/youtube/youtubePlayer';
import { describePlayerError, type PlayerErrorMessage } from '../services/youtube/youtubeErrors';
import { setNowPlaying } from '../services/nowPlaying';

export type PlayerStatus = 'demo' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  status: PlayerStatus;
  error?: PlayerErrorMessage;
  currentTime: number;
  duration: number;
}

interface UsePlayerOptions {
  songId: string;
  /** Identifiant YouTube ; vide = chanson de démonstration (aucune vidéo à charger). */
  videoId: string;
  /** Lancer la lecture au chargement (navigation suivant/précédent) ou seulement mettre en attente. */
  autoplay: boolean;
  volume: number;
  onStarted: (songId: string) => void;
  onEnded: () => void;
}

/**
 * Cycle de vie du lecteur officiel : une seule instance par page, rechargée à chaque changement de vidéo.
 * La lecture ne démarre que sur demande explicite (`play`) ou sur navigation explicite (`autoplay`).
 */
export function usePlayer(options: UsePlayerOptions) {
  const { songId, videoId, autoplay, volume, onStarted, onEnded } = options;
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const loadedRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlayerState>({
    status: videoId ? 'loading' : 'demo',
    currentTime: 0,
    duration: 0,
  });

  const latest = useRef({ songId, onStarted, onEnded, videoId, autoplay, volume });
  latest.current = { songId, onStarted, onEnded, videoId, autoplay, volume };

  // Création du lecteur (une fois par tentative) ; détruit proprement au démontage.
  useEffect(() => {
    const { videoId: initialId } = latest.current;
    const host = hostRef.current;
    if (!initialId || !host) return;
    let cancelled = false;
    const mount = document.createElement('div');
    mount.className = 'yt-mount';
    host.replaceChildren(mount);
    setReady(false);
    setState((s) => ({ ...s, status: 'loading', error: undefined }));

    createYouTubePlayer(mount, initialId, {
      onReady: () => undefined,
      onPlaying: () => {
        setState((s) => ({ ...s, status: 'playing' }));
        setNowPlaying(latest.current.songId);
        latest.current.onStarted(latest.current.songId);
      },
      onPaused: () => {
        setState((s) => ({ ...s, status: 'paused' }));
        setNowPlaying(null);
      },
      onEnded: () => {
        setNowPlaying(null);
        latest.current.onEnded();
      },
      onError: (code) => {
        setNowPlaying(null);
        setState((s) => ({ ...s, status: 'error', error: describePlayerError(code) }));
      },
    })
      .then((controller) => {
        if (cancelled) {
          controller.destroy();
          return;
        }
        controllerRef.current = controller;
        controller.setVolume(latest.current.volume);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const offline = error instanceof PlayerLoadError && error.failure !== 'timeout';
        setState((s) => ({ ...s, status: 'error', error: describePlayerError(null, offline) }));
      });

    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      loadedRef.current = null;
      setNowPlaying(null);
    };
  }, [attempt]);

  // Changement de chanson : charger la nouvelle vidéo, avec ou sans lecture immédiate.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!ready || !controller || !videoId) return;
    if (loadedRef.current === videoId) return;
    loadedRef.current = videoId;
    if (autoplay) controller.load(videoId);
    else controller.cue(videoId);
    setState((s) => ({ ...s, status: 'ready', error: undefined, currentTime: 0, duration: 0 }));
  }, [videoId, autoplay, ready]);

  useEffect(() => {
    if (ready) controllerRef.current?.setVolume(volume);
  }, [volume, ready]);

  // Progression lorsque disponible (lecture uniquement).
  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => {
      const controller = controllerRef.current;
      if (!controller) return;
      setState((s) => ({ ...s, currentTime: controller.getTime(), duration: controller.getDuration() }));
    }, 500);
    return () => window.clearInterval(id);
  }, [state.status]);

  // Jamais de lecture en arrière-plan : la vidéo se met en pause quand l'app n'est plus visible.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') controllerRef.current?.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return {
    hostRef,
    state,
    play: () => controllerRef.current?.play(),
    pause: () => controllerRef.current?.pause(),
    retry: () => setAttempt((a) => a + 1),
  };
}
