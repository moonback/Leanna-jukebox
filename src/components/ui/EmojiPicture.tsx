import { emojiImage } from '../../data/imagier';

/** Illustration 3D de l'emoji, avec l'emoji texte en secours. */
export function EmojiPicture({ emoji }: { emoji: string }) {
  const src = emojiImage(emoji);
  return src ? <img src={src} alt="" draggable={false} className="imagier-picture" /> : <>{emoji}</>;
}
