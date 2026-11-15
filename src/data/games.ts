/** Données des mini-jeux pour les tout-petits (3 ans). */
import { IMAGIER_ITEMS, shuffle, type ImagierItem } from './imagier';

export const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq'];

// Article « le / la » obligatoire pour dire « un lapin » / « une pomme » sans se tromper de genre.
const COUNTABLE = IMAGIER_ITEMS.filter(
  (i) => ['fruits', 'legumes', 'animaux'].includes(i.category) && (i.article === 'le' || i.article === 'la') && !i.name.includes(' '),
);

/** Pluriel simple : « pomme » → « pommes », « cheval » → « chevaux », « souris » ne change pas. */
export function plural(name: string): string {
  if (/[sxz]$/.test(name)) return name;
  if (/al$/.test(name)) return `${name.slice(0, -2)}aux`;
  if (name === 'hibou') return 'hiboux';
  return `${name}s`;
}

/** « une pomme », « deux lapins », « trois chevaux ». */
export function quantity(item: ImagierItem, count: number): string {
  if (count === 1) return `${item.article === 'la' ? 'une' : 'un'} ${item.name}`;
  return `${NUMBER_WORDS[count]} ${plural(item.name)}`;
}

/** Un objet et un nombre entre 1 et `max`. */
export function countingRound(max = 3, random = Math.random): { item: ImagierItem; count: number } {
  return { item: COUNTABLE[Math.floor(random() * COUNTABLE.length)]!, count: 1 + Math.floor(random() * max) };
}

/** Les groupes 1, 2, 3… mélangés, pour « Où y a-t-il deux lapins ? ». */
export function groupChoices(max = 3, random = Math.random): number[] {
  return shuffle(Array.from({ length: max }, (_, i) => i + 1), random);
}

export const BALLOON_COLORS = [
  { name: 'rouge', hex: '#ef5b5b' },
  { name: 'bleu', hex: '#4f8fe6' },
  { name: 'jaune', hex: '#f5c842' },
  { name: 'vert', hex: '#5cbf6a' },
  { name: 'orange', hex: '#f59a3c' },
  { name: 'violet', hex: '#9b6fd8' },
  { name: 'rose', hex: '#f48fb1' },
] as const;

/** Piano : gamme de do majeur, une couleur et un animal par touche. */
export const PIANO_KEYS = [
  { note: 'do', freq: 261.63, color: '#ef5b5b', emoji: '🐱' },
  { note: 'ré', freq: 293.66, color: '#f59a3c', emoji: '🐶' },
  { note: 'mi', freq: 329.63, color: '#f5c842', emoji: '🐸' },
  { note: 'fa', freq: 349.23, color: '#5cbf6a', emoji: '🐰' },
  { note: 'sol', freq: 392.0, color: '#4fb8b0', emoji: '🐻' },
  { note: 'la', freq: 440.0, color: '#4f8fe6', emoji: '🐼' },
  { note: 'si', freq: 493.88, color: '#9b6fd8', emoji: '🦊' },
  { note: 'do', freq: 523.25, color: '#f48fb1', emoji: '🐵' },
];
