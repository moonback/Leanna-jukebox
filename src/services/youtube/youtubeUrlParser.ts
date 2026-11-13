export type ParseResult = { ok: true; videoId: string } | { ok: false; reason: 'empty' | 'invalid-url' | 'unsupported-domain' | 'unsupported-format' | 'invalid-id' };

/** Hôtes YouTube officiels acceptés. Comparaison exacte : pas de sous-chaîne ni de suffixe. */
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PATH_PREFIXES = ['/embed/', '/shorts/', '/live/'];

/**
 * Extrait l'identifiant vidéo d'une URL YouTube acceptée.
 * Formats : youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/, youtube.com/live/.
 * Un schéma absent (« youtube.com/watch?v=… ») est accepté ; tout autre domaine est refusé.
 */
export function parseYouTubeUrl(input: string): ParseResult {
  const raw = input.trim();
  if (raw === '') return { ok: false, reason: 'empty' };

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'invalid-url' };

  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (SHORT_HOSTS.has(host)) {
    candidate = url.pathname.slice(1).split('/')[0] ?? null;
  } else if (WATCH_HOSTS.has(host)) {
    const path = url.pathname;
    if (path === '/watch') {
      candidate = url.searchParams.get('v');
    } else {
      const prefix = PATH_PREFIXES.find((p) => path.startsWith(p));
      if (!prefix) return { ok: false, reason: 'unsupported-format' };
      candidate = path.slice(prefix.length).split('/')[0] ?? null;
    }
  } else {
    return { ok: false, reason: 'unsupported-domain' };
  }

  if (candidate === null || candidate === '') return { ok: false, reason: 'unsupported-format' };
  if (!VIDEO_ID_PATTERN.test(candidate)) return { ok: false, reason: 'invalid-id' };
  return { ok: true, videoId: candidate };
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
