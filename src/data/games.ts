/** Données des mini-jeux pour les tout-petits (3 ans). */

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
