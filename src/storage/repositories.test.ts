import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JukeboxDatabase } from './database';
import { ensureSeeded, DEFAULT_CATEGORIES } from './seed';
import {
  addSong,
  deleteSong,
  listSongs,
  markPlayed,
  moveSong,
  recentSongs,
  toggleFavorite,
  updateSong,
} from './songRepository';
import { addSongToPlaylist, createPlaylist, deletePlaylist, listPlaylists, movePlaylistSong, removeSongFromPlaylist, updatePlaylist } from './playlistRepository';
import { addCategory, deleteCategory, listCategories, updateCategory } from './categoryRepository';
import { getSettings, updateSettings } from './settingsRepository';
import { AppError } from '../services/errors';

const VIDEO = 'dQw4w9WgXcQ';
let database: JukeboxDatabase;

beforeEach(async () => {
  database = new JukeboxDatabase(`test-${Math.random().toString(36).slice(2)}`);
  await ensureSeeded(database);
});

afterEach(async () => {
  database.close();
  await database.delete();
});

const base = { youtubeVideoId: VIDEO, categoryId: 'cat-comptines', illustration: 'bunny' as const };

describe('amorçage de la base', () => {
  it('crée les catégories par défaut et les chansons d’exemple jouables', async () => {
    const categories = await listCategories(database);
    expect(categories.map((c) => c.title)).toEqual(DEFAULT_CATEGORIES.map((c) => c.title));
    const songs = await listSongs(database);
    expect(songs.length).toBe(2);
    expect(songs.every((s) => !s.isDemo && s.youtubeVideoId.length === 11)).toBe(true);
  });

  it('est idempotent : un second amorçage ne duplique rien', async () => {
    await ensureSeeded(database);
    expect(await database.categories.count()).toBe(DEFAULT_CATEGORIES.length);
    expect(await database.songs.count()).toBe(2);
  });
});

describe('chansons — ajout, validation, modification, suppression', () => {
  it('ajoute une chanson en fin de liste avec un identifiant unique', async () => {
    const song = await addSong({ ...base, title: 'Au clair de la lune' }, database);
    const all = await listSongs(database);
    expect(all.at(-1)?.id).toBe(song.id);
    expect(song.youtubeVideoId).toBe(VIDEO);
    expect(song.favorite).toBe(false);
  });

  it.each([
    ['titre vide', { title: '   ' }, 'Donne un nom'],
    ['titre trop long', { title: 'a'.repeat(81) }, 'ne doit pas dépasser'],
    ['lien invalide', { title: 'Ok', youtubeVideoId: 'pas-un-id' }, 'lien YouTube est invalide'],
    ['catégorie inconnue', { title: 'Ok', categoryId: 'inconnue' }, 'catégorie existante'],
    ['illustration inconnue', { title: 'Ok', illustration: 'dragon' as never }, 'illustration'],
  ])('refuse : %s', async (_label, patch, message) => {
    await expect(addSong({ ...base, ...patch }, database)).rejects.toThrow(message);
    await expect(addSong({ ...base, ...patch }, database)).rejects.toBeInstanceOf(AppError);
  });

  it('modifie le titre, la catégorie et l’illustration', async () => {
    const song = await addSong({ ...base, title: 'Ancien' }, database);
    const updated = await updateSong(song.id, { title: 'Nouveau', categoryId: 'cat-danse', illustration: 'star' }, database);
    expect(updated.title).toBe('Nouveau');
    expect(updated.categoryId).toBe('cat-danse');
    expect(updated.illustration).toBe('star');
    expect((await listSongs(database)).find((s) => s.id === song.id)?.title).toBe('Nouveau');
  });

  it('rend jouable une chanson de démonstration dès qu’un lien est donné', async () => {
    const demo = (await listSongs(database))[0];
    if (!demo) throw new Error('démo absente');
    const updated = await updateSong(demo.id, { youtubeVideoId: 'abcdefghijk' }, database);
    expect(updated.isDemo).toBeUndefined();
    expect(updated.youtubeVideoId).toBe('abcdefghijk');
  });

  it('supprime une chanson et la retire de toutes les playlists', async () => {
    const song = await addSong({ ...base, title: 'À supprimer' }, database);
    const playlist = await createPlaylist({ title: 'Mes favoris', illustration: 'star' }, database);
    await addSongToPlaylist(playlist.id, song.id, database);
    await deleteSong(song.id, database);
    expect((await listSongs(database)).some((s) => s.id === song.id)).toBe(false);
    expect((await listPlaylists(database))[0]?.songIds).toEqual([]);
  });

  it('bascule les favoris', async () => {
    const song = await addSong({ ...base, title: 'Fav' }, database);
    await toggleFavorite(song.id, database);
    expect((await database.songs.get(song.id))?.favorite).toBe(true);
    await toggleFavorite(song.id, database);
    expect((await database.songs.get(song.id))?.favorite).toBe(false);
  });

  it('réordonne les chansons vers le haut puis vers le bas', async () => {
    const first = await addSong({ ...base, title: 'Un' }, database);
    const second = await addSong({ ...base, title: 'Deux' }, database);
    await moveSong(second.id, -1, database);
    let ids = (await listSongs(database)).map((s) => s.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    await moveSong(second.id, 1, database);
    ids = (await listSongs(database)).map((s) => s.id);
    expect(ids.indexOf(second.id)).toBeGreaterThan(ids.indexOf(first.id));
  });

  it('ne fait rien quand on monte la première chanson', async () => {
    const [first] = await listSongs(database);
    if (!first) throw new Error('aucune chanson');
    await moveSong(first.id, -1, database);
    expect((await listSongs(database))[0]?.id).toBe(first.id);
  });

  it('signale une chanson inexistante', async () => {
    await expect(updateSong('absente', { title: 'x' }, database)).rejects.toThrow('n’existe plus');
  });
});

describe('dernières chansons écoutées', () => {
  it('classe les lectures récentes de la plus récente à la plus ancienne', async () => {
    const a = await addSong({ ...base, title: 'A' }, database);
    const b = await addSong({ ...base, title: 'B' }, database);
    await markPlayed(a.id, database, 1000);
    await markPlayed(b.id, database, 2000);
    const recent = await recentSongs(10, database);
    expect(recent.map((s) => s.id)).toEqual([b.id, a.id]);
  });
});

describe('playlists', () => {
  it('crée, renomme, change l’illustration et supprime une playlist', async () => {
    const playlist = await createPlaylist({ title: 'Pour danser', illustration: 'sun' }, database);
    await updatePlaylist(playlist.id, { title: 'Danse', illustration: 'star' }, database);
    const [stored] = await listPlaylists(database);
    expect(stored).toMatchObject({ title: 'Danse', illustration: 'star' });
    await deletePlaylist(playlist.id, database);
    expect(await listPlaylists(database)).toHaveLength(0);
  });

  it('refuse un nom vide ou une illustration inconnue', async () => {
    await expect(createPlaylist({ title: ' ', illustration: 'sun' }, database)).rejects.toThrow('Donne un nom');
    await expect(createPlaylist({ title: 'Ok', illustration: 'x' as never }, database)).rejects.toThrow('illustration');
  });

  it('ajoute des chansons sans doublon, puis les retire et les réordonne', async () => {
    const [s1, s2] = await listSongs(database);
    if (!s1 || !s2) throw new Error('démos absentes');
    const playlist = await createPlaylist({ title: 'Comptines', illustration: 'note' }, database);
    await addSongToPlaylist(playlist.id, s1.id, database);
    await addSongToPlaylist(playlist.id, s2.id, database);
    await addSongToPlaylist(playlist.id, s1.id, database);
    expect((await listPlaylists(database))[0]?.songIds).toEqual([s1.id, s2.id]);

    await movePlaylistSong(playlist.id, s2.id, -1, database);
    expect((await listPlaylists(database))[0]?.songIds).toEqual([s2.id, s1.id]);

    await movePlaylistSong(playlist.id, s2.id, -1, database);
    expect((await listPlaylists(database))[0]?.songIds).toEqual([s2.id, s1.id]);

    await removeSongFromPlaylist(playlist.id, s2.id, database);
    expect((await listPlaylists(database))[0]?.songIds).toEqual([s1.id]);
  });

  it('refuse d’ajouter une chanson inexistante', async () => {
    const playlist = await createPlaylist({ title: 'Vide', illustration: 'cloud' }, database);
    await expect(addSongToPlaylist(playlist.id, 'fantome', database)).rejects.toThrow('n’existe plus');
  });
});

describe('catégories', () => {
  it('ajoute et renomme une catégorie', async () => {
    const category = await addCategory({ title: 'Matin', illustration: 'sun' }, database);
    await updateCategory(category.id, { title: 'Chansons du matin' }, database);
    expect((await listCategories(database)).at(-1)?.title).toBe('Chansons du matin');
  });

  it('supprime une catégorie en déplaçant ses chansons vers une autre', async () => {
    const song = await addSong({ ...base, title: 'Dans la comptine' }, database);
    await deleteCategory('cat-comptines', database);
    expect((await database.songs.get(song.id))?.categoryId).not.toBe('cat-comptines');
    expect((await listCategories(database)).some((c) => c.id === 'cat-comptines')).toBe(false);
  });

  it('garde toujours au moins une catégorie', async () => {
    const categories = await listCategories(database);
    for (const category of categories.slice(0, -1)) {
      await deleteCategory(category.id, database);
    }
    const last = (await listCategories(database))[0];
    if (!last) throw new Error('catégorie absente');
    await expect(deleteCategory(last.id, database)).rejects.toThrow('au moins une catégorie');
  });
});

describe('réglages parents', () => {
  it('fournit des valeurs par défaut sûres : pas de son, pas de mode enfant, aucun PIN', async () => {
    const settings = await getSettings(database);
    expect(settings).toMatchObject({ soundsEnabled: false, childMode: false, fullscreenMode: false, failedAttempts: 0, lockedUntil: 0 });
    expect(settings.pinHash).toBeUndefined();
  });

  it('enregistre une modification sans écraser les autres réglages', async () => {
    await updateSettings({ maxVolumePreference: 40 }, database);
    const settings = await getSettings(database);
    expect(settings.maxVolumePreference).toBe(40);
    expect(settings.soundsEnabled).toBe(false);
  });
});
