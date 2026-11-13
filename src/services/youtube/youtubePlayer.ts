/**
 * Intégration du lecteur officiel YouTube IFrame Player API uniquement.
 * Aucune extraction de flux, aucun téléchargement, aucune superposition sur l'iframe.
 */
export interface YTPlayer {
  cueVideoById(videoId: string): void;
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string;
      height?: string;
      videoId?: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type PlayerLoadFailure = 'offline' | 'network' | 'timeout';

export class PlayerLoadError extends Error {
  readonly failure: PlayerLoadFailure;

  constructor(failure: PlayerLoadFailure) {
    super(`Chargement du lecteur impossible : ${failure}`);
    this.name = 'PlayerLoadError';
    this.failure = failure;
  }
}

const IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const PLAYER_HOST = 'https://www.youtube-nocookie.com';
let apiPromise: Promise<YTNamespace> | null = null;

/** Charge le script officiel une seule fois. Échec explicite (réseau, délai) : jamais de promesse pendante. */
export function loadYouTubeApi(timeoutMs = 10_000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(new PlayerLoadError('offline'));
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      apiPromise = null;
      reject(new PlayerLoadError('timeout'));
    }, timeoutMs);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      previous?.();
      if (window.YT) resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = IFRAME_API_URL;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      apiPromise = null;
      script.remove();
      reject(new PlayerLoadError('network'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export interface PlayerEvents {
  onReady: () => void;
  onPlaying: () => void;
  onPaused: () => void;
  onEnded: () => void;
  onError: (code: number) => void;
}

export interface PlayerController {
  cue(videoId: string): void;
  load(videoId: string): void;
  play(): void;
  pause(): void;
  setVolume(volume: number): void;
  getTime(): number;
  getDuration(): number;
  destroy(): void;
}

export async function createYouTubePlayer(
  element: HTMLElement,
  videoId: string,
  events: PlayerEvents,
): Promise<PlayerController> {
  const YT = await loadYouTubeApi();
  const origin = window.location.protocol.startsWith('http') ? window.location.origin : undefined;
  let player: YTPlayer | null = null;

  return new Promise<PlayerController>((resolve) => {
    player = new YT.Player(element, {
      width: '100%',
      height: '100%',
      videoId,
      host: PLAYER_HOST,
      playerVars: {
        playsinline: 1,
        rel: 0,
        enablejsapi: 1,
        ...(origin ? { origin } : {}),
      },
      events: {
        onReady: () => {
          events.onReady();
          const ready = player as YTPlayer;
          resolve({
            cue: (id) => ready.cueVideoById(id),
            load: (id) => ready.loadVideoById(id),
            play: () => ready.playVideo(),
            pause: () => ready.pauseVideo(),
            // Volume en 0–100 (échelle de l'API). Le son est explicitement réactivé : un lecteur lancé
            // automatiquement peut démarrer coupé.
            setVolume: (v) => {
              ready.unMute();
              ready.setVolume(Math.max(0, Math.min(100, v)));
            },
            getTime: () => ready.getCurrentTime(),
            getDuration: () => ready.getDuration(),
            destroy: () => ready.destroy(),
          });
        },
        onStateChange: ({ data }) => {
          if (data === YT.PlayerState.PLAYING) events.onPlaying();
          else if (data === YT.PlayerState.PAUSED) events.onPaused();
          else if (data === YT.PlayerState.ENDED) events.onEnded();
        },
        onError: ({ data }) => events.onError(data),
      },
    });
  });
}
