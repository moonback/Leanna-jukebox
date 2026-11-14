import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JukeboxDatabase } from './database';
import { ensureSeeded } from './seed';
import { addSong, listSongs } from './songRepository';
import { createPlaylist, addSongToPlaylist } from './playlistRepository';
import { buildBackup, BACKUP_FORMAT, deleteAllData, parseBackup, restoreBackup } from './backup';
import { updateSettings, getSettings } from './settingsRepository';
import { AppError } from '../services/errors';

let database: JukeboxDatabase;
let target: JukeboxDatabase;

beforeEach(async () => {
  database = new JukeboxDatabase(`backup-src-${Math.random().toString(36).slice(2)}`);
  target = new JukeboxDatabase(`backup-dst-${Math.random().toString(36).slice(2)}`);
  await ensureSeeded(database);
  await ensureSeeded(target);
});

afterEach(async () => {
  database.close();
  target.close();
  await database.delete();
  await target.delete();
});

describe('sauvegarde locale', () => {
  it('exporte chansons, playlists et catégories, mais jamais le PIN ni les réglages', async () => {
    await updateSettings({ pinHash: 'SECRET-HASH', pinSalt: 'SECRET-SALT', pinIterations: 1000 }, database);
    const song = await addSong({ title: 'Ma chanson', youtubeVideoId: 'dQw4w9WgXcQ', categoryId: 'cat-comptines', illustration: 'bunny' }, database);
    const playlist = await createPlaylist({ title: 'Ma liste', illustration: 'star' }, database);
    await addSongToPlaylist(playlist.id, song.id, database);

    const backup = await buildBackup(database, new Date('2026-01-01T00:00:00Z'));
    const json = JSON.stringify(backup);

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.songs.length).toBe(3);
    expect(json).not.toContain('SECRET-HASH');
    expect(json).not.toContain('SECRET-SALT');
    expect(json).not.toContain('pinHash');
  });

  it('restaure à l’identique après un aller-retour JSON', async () => {
    const song = await addSong({ title: 'Aller-retour', youtubeVideoId: 'dQw4w9WgXcQ', categoryId: 'cat-danse', illustration: 'sun' }, database);
    const playlist = await createPlaylist({ title: 'Danse', illustration: 'cloud' }, database);
    await addSongToPlaylist(playlist.id, song.id, database);

    const json = JSON.stringify(await buildBackup(database));
    await restoreBackup(parseBackup(JSON.parse(json)), target);

    const restored = await listSongs(target);
    expect(restored.map((s) => s.title)).toEqual((await listSongs(database)).map((s) => s.title));
    expect((await target.playlists.toArray())[0]?.songIds).toEqual([song.id]);
  });

  it('supprime toutes les données et réinitialise les réglages', async () => {
    await updateSettings({ pinHash: 'x', pinSalt: 'y', pinIterations: 10, childMode: true }, database);
    await deleteAllData(database);
    const settings = await getSettings(database);
    expect(settings.pinHash).toBeUndefined();
    expect(settings.childMode).toBe(false);
    expect(await database.songs.count()).toBe(2);
    expect(await database.categories.count()).toBe(7);
  });
});

describe('validation d’un fichier de sauvegarde (frontière de confiance)', () => {
  const validBackup = () => ({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    categories: [{ id: 'c1', title: 'Comptines', illustration: 'note', sortOrder: 0 }],
    songs: [
      {
        id: 's1',
        title: 'Chanson',
        youtubeVideoId: 'dQw4w9WgXcQ',
        categoryId: 'c1',
        illustration: 'bear',
        favorite: true,
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    playlists: [{ id: 'p1', title: 'Liste', illustration: 'star', songIds: ['s1', 'fantome'], sortOrder: 0, createdAt: 1 }],
  });

  it('accepte une sauvegarde valide et retire les références à des chansons absentes', () => {
    const data = parseBackup(validBackup());
    expect(data.songs).toHaveLength(1);
    expect(data.playlists[0]?.songIds).toEqual(['s1']);
  });

  it.each([
    ['format inconnu', (b: ReturnType<typeof validBackup>) => ({ ...b, format: 'autre' })],
    ['lien YouTube invalide', (b: ReturnType<typeof validBackup>) => ({ ...b, songs: [{ ...b.songs[0], youtubeVideoId: '<script>' }] })],
    ['catégorie inexistante', (b: ReturnType<typeof validBackup>) => ({ ...b, songs: [{ ...b.songs[0], categoryId: 'nope' }] })],
    ['illustration inconnue', (b: ReturnType<typeof validBackup>) => ({ ...b, songs: [{ ...b.songs[0], illustration: 'dragon' }] })],
    ['identifiants en double', (b: ReturnType<typeof validBackup>) => ({ ...b, songs: [b.songs[0], b.songs[0]] })],
    ['titre vide', (b: ReturnType<typeof validBackup>) => ({ ...b, songs: [{ ...b.songs[0], title: '' }] })],
    ['champ manquant', (b: ReturnType<typeof validBackup>) => ({ ...b, playlists: undefined })],
  ])('rejette : %s', (_label, mutate) => {
    expect(() => parseBackup(mutate(validBackup()))).toThrow(AppError);
  });

  it('rejette une valeur qui n’est pas un objet', () => {
    expect(() => parseBackup('pas un objet')).toThrow(AppError);
    expect(() => parseBackup(null)).toThrow(AppError);
  });
});
