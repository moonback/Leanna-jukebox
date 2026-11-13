import { useState, type FormEvent } from 'react';
import { DownloadCloud } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IllustrationPicker } from '../ui/IllustrationPicker';
import { addSong, updateSong } from '../../storage/songRepository';
import { db } from '../../storage/database';
import { parseYouTubeUrl } from '../../services/youtube/youtubeUrlParser';
import { fetchVideoTitle } from '../../services/youtube/youtubeMetadata';
import { toUserMessage } from '../../services/errors';
import type { Song } from '../../types/song';
import type { Category } from '../../types/category';
import type { IllustrationKey } from '../../illustrations/illustrationKeys';

const URL_ERRORS: Record<string, string> = {
  empty: 'Colle le lien YouTube de la chanson.',
  'invalid-url': 'Ce lien n’est pas valide.',
  'unsupported-domain': 'Seuls les liens YouTube sont acceptés (youtube.com ou youtu.be).',
  'unsupported-format': 'Format de lien non reconnu. Utilise un lien de vidéo YouTube.',
  'invalid-id': 'Identifiant de vidéo invalide.',
};

interface SongEditorProps {
  song?: Song;
  categories: Category[];
  defaultCategoryId: string;
  onClose: () => void;
}

/** Ajout ou modification d'une chanson : lien YouTube validé, titre, catégorie, illustration, favori. */
export function SongEditor({ song, categories, defaultCategoryId, onClose }: SongEditorProps) {
  const isEdit = song !== undefined;
  const [link, setLink] = useState('');
  const [title, setTitle] = useState(song?.title ?? '');
  const [categoryId, setCategoryId] = useState(song?.categoryId ?? defaultCategoryId);
  const [illustration, setIllustration] = useState<IllustrationKey>(song?.illustration ?? 'note');
  const [favorite, setFavorite] = useState(song?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchTitle = async () => {
    setError(null);
    const parsed = parseYouTubeUrl(link);
    if (!parsed.ok) {
      setError(URL_ERRORS[parsed.reason] ?? 'Lien invalide.');
      return;
    }
    setFetching(true);
    const found = await fetchVideoTitle(parsed.videoId);
    setFetching(false);
    if (found) setTitle(found);
    else setError('Impossible de récupérer le titre. Saisis-le toi-même.');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let videoId: string | undefined;
    if (link.trim() !== '' || !isEdit) {
      const parsed = parseYouTubeUrl(link);
      if (!parsed.ok) {
        setError(URL_ERRORS[parsed.reason] ?? 'Lien invalide.');
        return;
      }
      videoId = parsed.videoId;
    }
    setBusy(true);
    try {
      if (isEdit && song) {
        await updateSong(song.id, { title, categoryId, illustration, favorite, ...(videoId ? { youtubeVideoId: videoId } : {}) }, db);
      } else {
        await addSong({ title, youtubeVideoId: videoId ?? '', categoryId, illustration, favorite }, db);
      }
      onClose();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Modifier la chanson' : 'Ajouter une chanson'} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          Lien YouTube {isEdit && song?.isDemo ? '(à ajouter pour rendre la chanson jouable)' : ''}
          <div className="row-wrap">
            <input
              style={{ flex: 1, minWidth: 0 }}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={isEdit && !song?.isDemo ? 'Laisser vide pour garder la vidéo actuelle' : 'https://youtu.be/…'}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={fetchTitle} disabled={fetching || link.trim() === ''} icon={<DownloadCloud size={20} />}>
              {fetching ? 'Recherche…' : 'Titre auto'}
            </Button>
          </div>
        </label>
        <label className="field">
          Nom de la chanson
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Au clair de la lune" />
        </label>
        <label className="field">
          Catégorie
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <IllustrationPicker value={illustration} onChange={setIllustration} />
        <label className="field field--row">
          Ajouter aux favoris
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} style={{ width: 26, height: 26 }} />
        </label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
