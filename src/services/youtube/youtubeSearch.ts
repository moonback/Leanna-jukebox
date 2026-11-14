import { youtubeThumbnailUrl } from './youtubeUrlParser';

/**
 * Recherche de vidéos via l'API officielle YouTube Data v3 (espace parent uniquement).
 * Filtre strict pour enfants, vidéos intégrables seulement (sinon le lecteur ne pourrait pas les lire).
 */
export interface YouTubeResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

export type YouTubeSearchError = 'no-key' | 'bad-key' | 'not-enabled' | 'offline' | 'quota' | 'failed';

export class YouTubeSearchFailure extends Error {
  constructor(readonly reason: YouTubeSearchError) {
    super(reason);
  }
}

// shortcut: clé côté client (visible dans l'app) ; la restreindre à l'API YouTube Data dans Google Cloud,
// ou passer par une fonction serveur (Supabase Edge Function) si l'app devient publique.
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

export function youtubeSearchAvailable(apiKey = API_KEY): boolean {
  return Boolean(apiKey);
}

/** Les titres de l'API arrivent encodés en HTML (« L&#39;âne »). */
function decodeHtml(text: string): string {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent ?? text;
}

/** Traduit l'erreur Google (`error.errors[0].reason`) en cause compréhensible par le parent. */
async function errorReason(response: Response): Promise<YouTubeSearchError> {
  const body = (await response.json().catch(() => null)) as { error?: { errors?: { reason?: string }[] } } | null;
  const reason = body?.error?.errors?.[0]?.reason ?? '';
  if (/quota|limitexceeded/i.test(reason)) return 'quota';
  if (reason === 'accessNotConfigured' || reason === 'SERVICE_DISABLED') return 'not-enabled';
  if (response.status === 400 || response.status === 401 || response.status === 403) return 'bad-key';
  return 'failed';
}

export async function searchYouTube(query: string, apiKey = API_KEY, timeoutMs = 10000): Promise<YouTubeResult[]> {
  if (!apiKey) throw new YouTubeSearchFailure('no-key');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new YouTubeSearchFailure('offline');
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    relevanceLanguage: 'fr',
    q: query.trim().slice(0, 100),
    key: apiKey,
  });
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: controller.signal });
  } catch {
    throw new YouTubeSearchFailure('failed');
  } finally {
    window.clearTimeout(timer);
  }
  if (!response.ok) throw new YouTubeSearchFailure(await errorReason(response));
  const data = (await response.json().catch(() => null)) as { items?: unknown } | null;
  if (!data || !Array.isArray(data.items)) return [];
  return data.items.flatMap((raw): YouTubeResult[] => {
    const item = raw as { id?: { videoId?: unknown }; snippet?: { title?: unknown; channelTitle?: unknown; thumbnails?: { medium?: { url?: unknown } } } };
    const videoId = item.id?.videoId;
    // Même règle que le parseur de liens : 11 caractères sûrs.
    if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return [];
    const thumb = item.snippet?.thumbnails?.medium?.url;
    return [
      {
        videoId,
        title: decodeHtml(String(item.snippet?.title ?? '')).slice(0, 80),
        channel: decodeHtml(String(item.snippet?.channelTitle ?? '')),
        thumbnail: typeof thumb === 'string' && thumb.startsWith('https://') ? thumb : youtubeThumbnailUrl(videoId),
      },
    ];
  });
}
