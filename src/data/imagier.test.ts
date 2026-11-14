import { describe, expect, it } from 'vitest';
import { IMAGIER_CATEGORIES, IMAGIER_ITEMS, emojiImage, groupByLetter, initialOf, spokenWord } from './imagier';

describe('imagier', () => {
  it('range les mots par ordre alphabétique, accents compris', () => {
    const names = groupByLetter(IMAGIER_ITEMS, 'animaux').flatMap((g) => g.items.map((i) => i.name));
    expect(names.slice(0, 2)).toEqual(['abeille', 'âne']);
    expect(names.indexOf('éléphant')).toBeGreaterThan(names.indexOf('dauphin'));
    expect(names.indexOf('éléphant')).toBeLessThan(names.indexOf('escargot'));
  });

  it('regroupe les lettres accentuées avec la lettre simple', () => {
    expect(initialOf('éléphant')).toBe('E');
    const letters = groupByLetter(IMAGIER_ITEMS, 'tout').map((g) => g.letter);
    expect(new Set(letters).size).toBe(letters.length);
  });

  it('filtre par catégorie', () => {
    const items = groupByLetter(IMAGIER_ITEMS, 'fruits').flatMap((g) => g.items);
    expect(items.every((i) => i.category === 'fruits')).toBe(true);
  });

  it('prononce le mot avec son article', () => {
    const find = (name: string) => IMAGIER_ITEMS.find((i) => i.name === name)!;
    expect(spokenWord(find('chat'))).toBe('le chat');
    expect(spokenWord(find('abeille'))).toBe('l’abeille');
  });

  it('n’a pas de doublon', () => {
    const ids = IMAGIER_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a une illustration 3D pour chaque mot et chaque catégorie', () => {
    const missing = [...IMAGIER_ITEMS, ...IMAGIER_CATEGORIES].filter((x) => !emojiImage(x.emoji)).map((x) => x.emoji);
    expect(missing).toEqual([]);
  });
});
