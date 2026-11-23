import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../storage/cloud/supabaseClient';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const BUCKET = 'family-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface PhotoRow {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}
interface AlbumPhoto extends PhotoRow { url: string }

interface PhotoAlbumProps { parentMode?: boolean }

/** Album partagé entre les appareils connectés au même compte Supabase. */
export function PhotoAlbum({ parentMode = false }: PhotoAlbumProps) {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadPhotos = useCallback(async () => {
    if (!supabase) {
      setPhotos([]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setPhotos([]);
        return;
      }
      const { data, error: queryError } = await supabase
        .from('photo_album')
        .select('id,user_id,storage_path,caption,created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      const rows = (data ?? []) as PhotoRow[];
      const signed = await Promise.all(rows.map(async (photo) => {
        const { data: signedData, error: signedError } = await supabase!.storage
          .from(BUCKET).createSignedUrl(photo.storage_path, 60 * 60);
        if (signedError) throw signedError;
        return { ...photo, url: signedData.signedUrl };
      }));
      setPhotos(signed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les photos.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void loadPhotos(); }, [loadPhotos, reloadKey]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || !supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Connecte-toi au compte familial dans Réglages pour ajouter des photos.');
      let uploaded = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name} n’est pas une image.`);
        if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} dépasse la limite de 10 Mo.`);
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('photo_album').insert({
          user_id: userData.user.id,
          storage_path: path,
          caption: file.name,
        });
        if (insertError) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insertError;
        }
        uploaded += 1;
      }
      setInfo(`${uploaded} photo${uploaded > 1 ? 's ajoutée' : ' ajoutée'}${uploaded > 1 ? 's' : ''} à l’album.`);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Envoi des photos impossible.');
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (photo: AlbumPhoto) => {
    if (!supabase || !window.confirm('Supprimer définitivement cette photo ?')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from('photo_album').delete().eq('id', photo.id);
      if (rowError) throw rowError;
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!supabase) {
    return <EmptyState title="Album photo indisponible" description="Configure Supabase pour activer le stockage des photos." />;
  }

  return (
    <section className="stack" aria-label="Album photo">
      <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Album photo</h2>
          <p className="muted">{photos.length} photo{photos.length > 1 ? 's' : ''}</p>
        </div>
        <div className="row-wrap">
          {parentMode && (
            <label className="btn btn--primary" style={{ cursor: busy ? 'wait' : 'pointer' }}>
              <ImagePlus size={20} /> Ajouter des photos
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                onChange={upload}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                aria-label="Sélectionner des photos"
              />
            </label>
          )}
          <Button icon={<RefreshCw size={18} />} disabled={busy} onClick={() => setReloadKey((key) => key + 1)}>
            Actualiser
          </Button>
        </div>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {info && <p role="status" className="muted">{info}</p>}
      {!busy && photos.length === 0 ? (
        <EmptyState
          title="Aucune photo pour le moment"
          description={parentMode ? 'Ajoute des photos pour créer votre album familial.' : 'Les photos ajoutées par les parents apparaîtront ici.'}
          illustration="cloud"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
          {photos.map((photo) => (
            <figure key={photo.id} className="glass" style={{ margin: 0, padding: 8, overflow: 'hidden' }}>
              <img
                src={photo.url}
                alt={photo.caption ?? 'Photo de l’album familial'}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
              />
              {parentMode && (
                <figcaption style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                  <Button variant="danger" icon={<Trash2 size={18} />} disabled={busy} onClick={() => void removePhoto(photo)}>
                    Supprimer
                  </Button>
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
      {busy && <p className="muted" role="status">Chargement…</p>}
      <p className="muted">Les photos sont privées et visibles uniquement avec le compte familial connecté.</p>
    </section>
  );
}
