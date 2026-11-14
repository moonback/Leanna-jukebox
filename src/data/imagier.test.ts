import { describe, expect, it } from 'vitest';
import { IMAGIER_CATEGORIES, IMAGIER_ITEMS, emojiImage, groupByLetter, initialOf, memoryDeck, pickRound, spokenWord } from './imagier';

describe('imagier', () => {
  it('mémoire : chaque image apparaît exactement deux fois', () => {
    const deck = memoryDeck(IMAGIER_ITEMS, 6);
    expect(deck).toHaveLength(12);
    expect(new Set(deck.map((c) => c.key)).size).toBe(12);
    const counts = new Map<string, number>();
    deck.forEach((c) => counts.set(c.item.id, (counts.get(c.item.id) ?? 0) + 1));
    expect([...counts.values()]).toEqual(Array(6).fill(2));
  });

  it('cherche et trouve : 4 images différentes dont la cible', () => {
    for (let i = 0; i < 50; i++) {
      const { choices, target } = pickRound(IMAGIER_ITEMS, 4);
      expect(choices).toHaveLength(4);
      expect(new Set(choices.map((c) => c.emoji)).size).toBe(4);
      expect(choices).toContain(target);
    }
  });

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
