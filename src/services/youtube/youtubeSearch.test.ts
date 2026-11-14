import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouTubeSearchFailure, searchYouTube } from './youtubeSearch';

const reply = (status: number, body: unknown) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('searchYouTube', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renvoie les vidéos avec titres décodés et ignore les identifiants invalides', async () => {
    const fetchMock = reply(200, {
      items: [
        { id: { videoId: 'abcdefghijk' }, snippet: { title: 'L&#39;âne &amp; le bœuf', channelTitle: 'Comptines', thumbnails: { medium: { url: 'https://i.ytimg.com/x.jpg' } } } },
        { id: { videoId: 'trop-court' }, snippet: { title: 'Mauvais' } },
        { id: { channelId: 'UC123' }, snippet: { title: 'Une chaîne' } },
      ],
    });
    const results = await searchYouTube('âne', 'cle-test');
    expect(results).toEqual([{ videoId: 'abcdefghijk', title: "L'âne & le bœuf", channel: 'Comptines', thumbnail: 'https://i.ytimg.com/x.jpg' }]);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get('safeSearch')).toBe('strict');
    expect(url.searchParams.get('videoEmbeddable')).toBe('true');
    expect(url.searchParams.get('q')).toBe('âne');
  });

  it('signale une clé absente sans appeler le réseau', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(searchYouTube('chat', '')).rejects.toMatchObject({ reason: 'no-key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, '', 'bad-key'],
    [400, 'keyInvalid', 'bad-key'],
    [403, 'accessNotConfigured', 'not-enabled'],
    [500, '', 'failed'],
  ])('traduit l’erreur %i %s en %s', async (status, reason, expected) => {
    reply(status, { error: { errors: [{ reason }] } });
    await expect(searchYouTube('chat', 'cle-test')).rejects.toMatchObject({ reason: expected });
  });

  it('signale le quota dépassé (403)', async () => {
    reply(403, { error: { errors: [{ reason: 'quotaExceeded' }] } });
    const error = await searchYouTube('chat', 'cle-test').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YouTubeSearchFailure);
    expect((error as YouTubeSearchFailure).reason).toBe('quota');
  });
});
