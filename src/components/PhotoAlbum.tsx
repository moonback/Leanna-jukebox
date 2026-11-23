import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, RefreshCw, Trash2, X } from 'lucide-react';
import { supabase } from '../storage/cloud/supabaseClient';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const BUCKET = 'family-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_COMPRESSED_SIZE = 1024 * 1024;

async function compressPhoto(file: File): Promise<File> {
  if (file.size <= MAX_COMPRESSED_SIZE) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('La compression de cette photo est impossible.');

    for (let attempt = 0; attempt < 12; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', Math.max(0.35, 0.86 - attempt * 0.07));
      });
      if (!blob) throw new Error('La compression de cette photo a échoué.');
      if (blob.size <= MAX_COMPRESSED_SIZE) {
        const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const name = file.name.replace(/\\.[^.]+$/, '') || 'photo';
        return new File([blob], `${name}.${extension}`, {
          type: blob.type || 'image/jpeg',
          lastModified: file.lastModified,
        });
      }
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    throw new Error(`${file.name} ne peut pas être réduite sous 1 Mo.`);
  } finally {
    bitmap.close();
  }
}

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activityKey, setActivityKey] = useState(0);

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

  // En diaporama, avance après 10 secondes sans interaction.
  useEffect(() => {
    if (selectedIndex === null || photos.length < 2) return;
    const timeout = window.setTimeout(() => {
      setSelectedIndex((current) => current === null ? null : (current + 1) % photos.length);
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [selectedIndex, photos.length, activityKey]);

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
        const compressedFile = await compressPhoto(file);
        const extension = compressedFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, compressedFile, {
          contentType: compressedFile.type,
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
      setSelectedIndex((current) => current === null ? null : current >= photos.length - 1 ? null : current > photos.indexOf(photo) ? current - 1 : current);
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
              <button
                type="button"
                onClick={() => setSelectedIndex(photos.findIndex((item) => item.id === photo.id))}
                aria-label={`Afficher la photo ${photos.findIndex((item) => item.id === photo.id) + 1} en grand`}
                style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'zoom-in' }}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? 'Photo de l’album familial'}
                  loading="lazy"
                  style={{ display: 'block', width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
                />
              </button>
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
      {selectedIndex !== null && photos[selectedIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse de photos"
          onClick={(event) => { setActivityKey((key) => key + 1); if (event.target === event.currentTarget) setSelectedIndex(null); }}
          onPointerDown={() => setActivityKey((key) => key + 1)}
          onKeyDown={(event) => {
            setActivityKey((key) => key + 1);
            if (event.key === 'Escape') setSelectedIndex(null);
            if (event.key === 'ArrowLeft') setSelectedIndex((index) => index === null ? null : (index - 1 + photos.length) % photos.length);
            if (event.key === 'ArrowRight') setSelectedIndex((index) => index === null ? null : (index + 1) % photos.length);
          }}
          tabIndex={0}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 12, padding: 16, background: 'rgba(0,0,0,.92)', color: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{selectedIndex + 1} / {photos.length}</span>
            <button type="button" onClick={() => setSelectedIndex(null)} aria-label="Fermer" style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>
              <X size={28} />
            </button>
          </div>
          <div style={{ minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <button type="button" disabled={photos.length < 2} onClick={() => setSelectedIndex((index) => index === null ? null : (index - 1 + photos.length) % photos.length)} aria-label="Photo précédente" style={{ border: 0, borderRadius: 999, padding: 10, background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer' }}>
              <ChevronLeft size={30} />
            </button>
            <img src={photos[selectedIndex].url} alt={photos[selectedIndex].caption ?? 'Photo de l’album familial'} style={{ maxWidth: 'min(100%, 1100px)', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            <button type="button" disabled={photos.length < 2} onClick={() => setSelectedIndex((index) => index === null ? null : (index + 1) % photos.length)} aria-label="Photo suivante" style={{ border: 0, borderRadius: 999, padding: 10, background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer' }}>
              <ChevronRight size={30} />
            </button>
          </div>
          <p style={{ margin: 0, textAlign: 'center', opacity: .8 }}>Utilise les flèches pour passer à la photo précédente ou suivante.</p>
        </div>
      )}
      <p className="muted">Les photos sont privées et visibles uniquement avec le compte familial connecté.</p>
    </section>
  );
}
