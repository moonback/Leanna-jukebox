import { IMAGIER_ITEMS } from '../data/imagier';

// shortcut: stocké sur cet appareil seulement, à synchroniser avec le cloud si on veut les retrouver ailleurs.
const KEY = 'leanna-stickers';

/** Autocollants gagnés (emoji), du plus ancien au plus récent. */
export function getStickers(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Donne un autocollant au hasard parmi les images de l'imagier et le renvoie. */
export function awardSticker(random = Math.random): string {
  const emoji = IMAGIER_ITEMS[Math.floor(random() * IMAGIER_ITEMS.length)]!.emoji;
  try {
    localStorage.setItem(KEY, JSON.stringify([...getStickers(), emoji]));
  } catch {
    // Stockage indisponible (navigation privée) : l'enfant voit quand même son autocollant.
  }
  return emoji;
}
