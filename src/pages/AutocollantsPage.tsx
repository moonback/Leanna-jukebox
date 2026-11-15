import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { migrateLegacyStickers } from '../services/stickers';
import { db } from '../storage/database';

/** Album des autocollants gagnés dans les jeux. */
export function AutocollantsPage() {
  const stickers = useLiveQuery(async () => {
    await migrateLegacyStickers(db);
    return db.stickers.orderBy('createdAt').toArray();
  }, [], []) ?? [];

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Mes autocollants" back="/">
        <span className="cherche-stars" aria-label={`${stickers.length} autocollants`}>⭐ {stickers.length}</span>
      </GameHeader>
      {stickers.length === 0 ? (
        <div className="memo-win">
          <p style={{ fontSize: '1.4rem' }}>Gagne des jeux pour avoir des autocollants !</p>
          <Link to="/jeux" className="cherche-question" style={{ textDecoration: 'none', width: 'auto', paddingInline: 28 }}>
            🎮 Jouer
          </Link>
        </div>
      ) : (
        <div className="stickers-album">
          {stickers.map((sticker, i) => (
            <span key={sticker.id} className="sticker imagier-card__emoji" style={{ rotate: `${((i * 37) % 21) - 10}deg`, animationDelay: `${Math.min(i * 40, 600)}ms` }}>
              <EmojiPicture emoji={sticker.emoji} />
            </span>
          ))}
        </div>
      )}
    </AppShell>
  );
}
