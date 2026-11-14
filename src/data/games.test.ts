import { describe, expect, it } from 'vitest';
import { countingRound, groupChoices, plural, quantity } from './games';
import { IMAGIER_ITEMS } from './imagier';

const item = (name: string) => IMAGIER_ITEMS.find((i) => i.name === name)!;

describe('compter jusqu’à 3', () => {
  it('tire un nombre entre 1 et 3 et un objet au genre connu', () => {
    for (let i = 0; i < 200; i++) {
      const { item: it, count } = countingRound(3);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
      expect(['le', 'la']).toContain(it.article);
    }
  });

  it('propose les groupes 1, 2 et 3 une seule fois chacun', () => {
    expect(groupChoices(3).sort()).toEqual([1, 2, 3]);
  });

  it('dit la quantité correctement en français', () => {
    expect(quantity(item('pomme'), 1)).toBe('une pomme');
    expect(quantity(item('lapin'), 1)).toBe('un lapin');
    expect(quantity(item('lapin'), 2)).toBe('deux lapins');
    expect(quantity(item('cheval'), 3)).toBe('trois chevaux');
    expect(quantity(item('souris'), 3)).toBe('trois souris');
    expect(plural('hibou')).toBe('hiboux');
  });
});
