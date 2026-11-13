import { youtubeWatchUrl } from './youtubeUrlParser';

/**
 * Titre d'une vidéo via le point de terminaison oEmbed officiel de YouTube (pas de scraping).
 * Renvoie null en cas d'échec : le parent saisit alors le titre lui-même.
 */
export async function fetchVideoTitle(videoId: string, timeoutMs = 8000): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}&format=json`;
    const response = await fetch(url, { signal: controller.signal, referrerPolicy: 'strict-origin-when-cross-origin' });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'title' in data && typeof data.title === 'string') {
      return data.title.slice(0, 80);
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
