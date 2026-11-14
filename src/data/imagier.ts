/** Imagier : mots illustrés (emoji) prononcés en français quand l'enfant touche la carte. */
export type ImagierCategory = 'animaux' | 'fruits' | 'legumes' | 'vehicules' | 'maison' | 'nature';

export interface ImagierItem {
  id: string;
  /** Mot sans article, utilisé pour le tri alphabétique et l'affichage. */
  name: string;
  /** Article prononcé avant le mot (« le », « la », « l’ », « un »…). */
  article: string;
  emoji: string;
  category: ImagierCategory;
}

export const IMAGIER_CATEGORIES: { id: ImagierCategory | 'tout'; label: string; emoji: string }[] = [
  { id: 'tout', label: 'Tout', emoji: '🌈' },
  { id: 'animaux', label: 'Animaux', emoji: '🐾' },
  { id: 'fruits', label: 'Fruits', emoji: '🍓' },
  { id: 'legumes', label: 'Légumes', emoji: '🥕' },
  { id: 'vehicules', label: 'Véhicules', emoji: '🚗' },
  { id: 'maison', label: 'Maison', emoji: '🏠' },
  { id: 'nature', label: 'Nature', emoji: '🌳' },
];

const raw: [string, string, string, ImagierCategory][] = [
  // Animaux
  ['abeille', 'l’', '🐝', 'animaux'],
  ['âne', 'l’', '🫏', 'animaux'],
  ['baleine', 'la', '🐋', 'animaux'],
  ['canard', 'le', '🦆', 'animaux'],
  ['chat', 'le', '🐱', 'animaux'],
  ['cheval', 'le', '🐴', 'animaux'],
  ['chien', 'le', '🐶', 'animaux'],
  ['cochon', 'le', '🐷', 'animaux'],
  ['coccinelle', 'la', '🐞', 'animaux'],
  ['crocodile', 'le', '🐊', 'animaux'],
  ['dauphin', 'le', '🐬', 'animaux'],
  ['éléphant', 'l’', '🐘', 'animaux'],
  ['escargot', 'l’', '🐌', 'animaux'],
  ['girafe', 'la', '🦒', 'animaux'],
  ['grenouille', 'la', '🐸', 'animaux'],
  ['hérisson', 'le', '🦔', 'animaux'],
  ['hibou', 'le', '🦉', 'animaux'],
  ['kangourou', 'le', '🦘', 'animaux'],
  ['lapin', 'le', '🐰', 'animaux'],
  ['lion', 'le', '🦁', 'animaux'],
  ['loup', 'le', '🐺', 'animaux'],
  ['mouton', 'le', '🐑', 'animaux'],
  ['ours', 'l’', '🐻', 'animaux'],
  ['panda', 'le', '🐼', 'animaux'],
  ['papillon', 'le', '🦋', 'animaux'],
  ['pingouin', 'le', '🐧', 'animaux'],
  ['poisson', 'le', '🐟', 'animaux'],
  ['poule', 'la', '🐔', 'animaux'],
  ['renard', 'le', '🦊', 'animaux'],
  ['singe', 'le', '🐵', 'animaux'],
  ['souris', 'la', '🐭', 'animaux'],
  ['tigre', 'le', '🐯', 'animaux'],
  ['tortue', 'la', '🐢', 'animaux'],
  ['vache', 'la', '🐮', 'animaux'],
  ['zèbre', 'le', '🦓', 'animaux'],
  // Fruits
  ['ananas', 'l’', '🍍', 'fruits'],
  ['banane', 'la', '🍌', 'fruits'],
  ['cerise', 'la', '🍒', 'fruits'],
  ['citron', 'le', '🍋', 'fruits'],
  ['fraise', 'la', '🍓', 'fruits'],
  ['kiwi', 'le', '🥝', 'fruits'],
  ['mangue', 'la', '🥭', 'fruits'],
  ['melon', 'le', '🍈', 'fruits'],
  ['myrtille', 'la', '🫐', 'fruits'],
  ['noix de coco', 'la', '🥥', 'fruits'],
  ['orange', 'l’', '🍊', 'fruits'],
  ['pastèque', 'la', '🍉', 'fruits'],
  ['pêche', 'la', '🍑', 'fruits'],
  ['poire', 'la', '🍐', 'fruits'],
  ['pomme', 'la', '🍎', 'fruits'],
  ['raisin', 'le', '🍇', 'fruits'],
  // Légumes
  ['aubergine', 'l’', '🍆', 'legumes'],
  ['avocat', 'l’', '🥑', 'legumes'],
  ['brocoli', 'le', '🥦', 'legumes'],
  ['carotte', 'la', '🥕', 'legumes'],
  ['champignon', 'le', '🍄', 'legumes'],
  ['concombre', 'le', '🥒', 'legumes'],
  ['maïs', 'le', '🌽', 'legumes'],
  ['oignon', 'l’', '🧅', 'legumes'],
  ['petits pois', 'les', '🫛', 'legumes'],
  ['poivron', 'le', '🫑', 'legumes'],
  ['pomme de terre', 'la', '🥔', 'legumes'],
  ['tomate', 'la', '🍅', 'legumes'],
  // Véhicules
  ['avion', 'l’', '✈️', 'vehicules'],
  ['bateau', 'le', '⛵', 'vehicules'],
  ['bus', 'le', '🚌', 'vehicules'],
  ['camion', 'le', '🚚', 'vehicules'],
  ['fusée', 'la', '🚀', 'vehicules'],
  ['hélicoptère', 'l’', '🚁', 'vehicules'],
  ['moto', 'la', '🏍️', 'vehicules'],
  ['tracteur', 'le', '🚜', 'vehicules'],
  ['train', 'le', '🚂', 'vehicules'],
  ['vélo', 'le', '🚲', 'vehicules'],
  ['voiture', 'la', '🚗', 'vehicules'],
  // Maison
  ['ballon', 'le', '⚽', 'maison'],
  ['brosse à dents', 'la', '🪥', 'maison'],
  ['chaise', 'la', '🪑', 'maison'],
  ['clé', 'la', '🔑', 'maison'],
  ['gâteau', 'le', '🎂', 'maison'],
  ['lit', 'le', '🛏️', 'maison'],
  ['livre', 'le', '📖', 'maison'],
  ['nounours', 'le', '🧸', 'maison'],
  ['parapluie', 'le', '☂️', 'maison'],
  ['téléphone', 'le', '📱', 'maison'],
  // Nature
  ['arbre', 'l’', '🌳', 'nature'],
  ['arc-en-ciel', 'l’', '🌈', 'nature'],
  ['étoile', 'l’', '⭐', 'nature'],
  ['feuille', 'la', '🍃', 'nature'],
  ['fleur', 'la', '🌸', 'nature'],
  ['lune', 'la', '🌙', 'nature'],
  ['montagne', 'la', '⛰️', 'nature'],
  ['neige', 'la', '❄️', 'nature'],
  ['nuage', 'le', '☁️', 'nature'],
  ['soleil', 'le', '☀️', 'nature'],
];

export const IMAGIER_ITEMS: ImagierItem[] = raw.map(([name, article, emoji, category]) => ({
  id: `${category}-${name}`,
  name,
  article,
  emoji,
  category,
}));

// Illustrations 3D Fluent Emoji (Microsoft, licence MIT), nommées par code Unicode sans FE0F : « 1f41d.webp ».
const IMAGES = import.meta.glob<string>('../assets/imagier/*.webp', { eager: true, query: '?url', import: 'default' });

/** Image 3D réaliste d'un emoji, ou `undefined` si absente (on affiche alors l'emoji texte). */
export function emojiImage(emoji: string): string | undefined {
  const code = [...emoji].map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0')).filter((c) => c !== 'fe0f').join('-');
  return IMAGES[`../assets/imagier/${code}.webp`];
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/** Lettre de regroupement sans accent : « éléphant » → « E ». */
export function initialOf(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
}

/** Mot prononcé avec son article : « l’abeille », « le chat », « les petits pois ». */
export function spokenWord(item: ImagierItem): string {
  return item.article.endsWith('’') ? `${item.article}${item.name}` : `${item.article} ${item.name}`;
}

/** Nom des lettres, écrit pour que la synthèse vocale les prononce comme à l'école. */
const LETTER_NAMES: Record<string, string> = {
  A: 'a', B: 'bé', C: 'cé', D: 'dé', E: 'eu', F: 'èf', G: 'gé', H: 'hache', I: 'i', J: 'ji', K: 'ka', L: 'èl', M: 'èm',
  N: 'èn', O: 'o', P: 'pé', Q: 'ku', R: 'èr', S: 'èss', T: 'té', U: 'u', V: 'vé', W: 'double vé', X: 'iks', Y: 'i grec', Z: 'zèd',
};

/** Phrase d'apprentissage prononcée au toucher : « B comme ballon ». */
export function letterPhrase(item: ImagierItem): string {
  const letter = initialOf(item.name);
  return `${LETTER_NAMES[letter] ?? letter}, comme ${item.name}`;
}

/** Cherche et trouve : `count` images aux emoji distincts, dont une à trouver. */
export function pickRound(items: ImagierItem[], count: number, random = Math.random): { choices: ImagierItem[]; target: ImagierItem } {
  const pool = [...items];
  const choices: ImagierItem[] = [];
  while (choices.length < count && pool.length) {
    const item = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
    if (!choices.some((c) => c.emoji === item.emoji)) choices.push(item);
  }
  return { choices, target: choices[Math.floor(random() * choices.length)]! };
}

/** Filtre par catégorie puis regroupe par lettre, dans l'ordre alphabétique français. */
export function groupByLetter(items: ImagierItem[], category: ImagierCategory | 'tout'): { letter: string; items: ImagierItem[] }[] {
  const sorted = items
    .filter((item) => category === 'tout' || item.category === category)
    .sort((a, b) => collator.compare(a.name, b.name));
  const groups: { letter: string; items: ImagierItem[] }[] = [];
  for (const item of sorted) {
    const letter = initialOf(item.name);
    const last = groups[groups.length - 1];
    if (last?.letter === letter) last.items.push(item);
    else groups.push({ letter, items: [item] });
  }
  return groups;
}
