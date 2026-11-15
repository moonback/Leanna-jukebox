import { db as defaultDb, type JukeboxDatabase } from './database';
import { AppError } from '../services/errors';
import { isIllustrationKey, type IllustrationKey } from '../illustrations/illustrationKeys';
import type { Category } from '../types/category';
import { enqueueSyncOperation } from './syncOutbox';
import { MAX_PLAYLIST_TITLE } from './playlistRepository';

export async function listCategories(database: JukeboxDatabase = defaultDb): Promise<Category[]> {
  return database.categories.orderBy('sortOrder').toArray();
}

function checkCategory(title: string, illustration: unknown): { title: string; illustration: IllustrationKey } {
  const trimmed = title.trim();
  if (trimmed.length === 0) throw new AppError('validation', 'Donne un nom à la catégorie.');
  if (trimmed.length > MAX_PLAYLIST_TITLE) {
    throw new AppError('validation', `Le nom ne doit pas dépasser ${MAX_PLAYLIST_TITLE} caractères.`);
  }
  if (!isIllustrationKey(illustration)) throw new AppError('validation', 'Choisis une illustration.');
  return { title: trimmed, illustration };
}

export async function addCategory(
  input: { title: string; illustration: IllustrationKey },
  database: JukeboxDatabase = defaultDb,
): Promise<Category> {
  const valid = checkCategory(input.title, input.illustration);
  return database.transaction('rw', database.categories, database.syncOutbox, async () => {
    const last = await database.categories.orderBy('sortOrder').last();
    const category: Category = {
      id: crypto.randomUUID?.() ?? `cat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ...valid,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    };
    await database.categories.add(category);
    await enqueueSyncOperation(database, 'category', category.id, 'upsert', { ...category });
    return category;
  });
}

export async function updateCategory(
  id: string,
  patch: { title?: string; illustration?: IllustrationKey },
  database: JukeboxDatabase = defaultDb,
): Promise<void> {
  const current = await database.categories.get(id);
  if (!current) throw new AppError('not-found', 'Cette catégorie n’existe plus.');
  const valid = checkCategory(patch.title ?? current.title, patch.illustration ?? current.illustration);
  await database.transaction('rw', database.categories, database.syncOutbox, async () => {
    await database.categories.update(id, valid);
    await enqueueSyncOperation(database, 'category', id, 'upsert', valid);
  });
}

/**
 * Supprime une catégorie. Ses chansons sont déplacées dans la première catégorie restante,
 * pour qu'aucune chanson ne disparaisse par erreur. Impossible de supprimer la dernière catégorie.
 */
export async function deleteCategory(id: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.categories, database.songs, database.syncOutbox, async () => {
    const all = await database.categories.orderBy('sortOrder').toArray();
    if (all.length <= 1) throw new AppError('validation', 'Il faut garder au moins une catégorie.');
    const fallback = all.find((c) => c.id !== id);
    if (!fallback) throw new AppError('validation', 'Il faut garder au moins une catégorie.');
    const movedSongs = await database.songs.where('categoryId').equals(id).toArray();
    const updatedAt = Date.now();
    for (const song of movedSongs) {
      await database.songs.update(song.id, { categoryId: fallback.id, updatedAt });
      await enqueueSyncOperation(database, 'song', song.id, 'upsert', { categoryId: fallback.id, updatedAt });
    }
    await database.categories.delete(id);
    await enqueueSyncOperation(database, 'category', id, 'delete');
  });
}
