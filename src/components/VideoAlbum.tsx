import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Trash2, Upload, Video, X } from 'lucide-react';
import { supabase } from '../storage/cloud/supabaseClient';
import { EmptyState } from './ui/EmptyState';
import { Button } from './ui/Button';

const BUCKET = 'family-videos';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

interface VideoRow {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}
interface AlbumVideo extends VideoRow { url: string }
interface VideoAlbumProps { parentMode?: boolean }

/** Album vidéo privé partagé entre les appareils connectés au même compte familial. */
export function VideoAlbum({ parentMode = false }: VideoAlbumProps) {
  const [videos, setVideos] = useState<AlbumVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; percent: number; stage: string } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const loadVideos = useCallback(async () => {
    if (!supabase) {
      setVideos([]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setVideos([]);
        return;
      }
      const { data, error: queryError } = await supabase
        .from('video_album')
        .select('id,user_id,storage_path,caption,created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      const rows = (data ?? []) as VideoRow[];
      const signed = await Promise.all(rows.map(async (item) => {
        const { data: signedData, error: signedError } = await supabase!.storage
          .from(BUCKET).createSignedUrl(item.storage_path, 60 * 60);
        if (signedError) throw signedError;
        return { ...item, url: signedData.signedUrl };
      }));
      setVideos(signed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les vidéos.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void loadVideos(); }, [loadVideos, reloadKey]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || !supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setUploadProgress({ completed: 0, total: files.length, percent: 0, stage: 'Préparation…' });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Connecte-toi au compte familial dans Réglages pour ajouter des vidéos.');
      let uploaded = 0;
      for (const [index, file] of files.entries()) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          throw new Error(`${file.name} : format non pris en charge. Utilise MP4, WebM, MOV ou OGG.`);
        }
        if (file.size > MAX_VIDEO_SIZE) throw new Error(`${file.name} dépasse la limite de 50 Mo.`);
        setUploadProgress({ completed: index, total: files.length, percent: Math.round((index / files.length) * 100), stage: `Envoi de la vidéo ${index + 1}/${files.length}…` });
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
        const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('video_album').insert({
          user_id: userData.user.id,
          storage_path: path,
          caption: file.name,
        });
        if (insertError) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insertError;
        }
        uploaded += 1;
        setUploadProgress({ completed: uploaded, total: files.length, percent: Math.round((uploaded / files.length) * 100), stage: `${uploaded}/${files.length} vidéo${uploaded > 1 ? 's importées' : ' importée'}` });
      }
      setInfo(`${uploaded} vidéo${uploaded > 1 ? 's ajoutées' : ' ajoutée'} à l’album.`);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Envoi des vidéos impossible.');
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  const removeVideo = async (item: AlbumVideo) => {
    if (!supabase || !window.confirm('Supprimer définitivement cette vidéo ?')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from('video_album').delete().eq('id', item.id);
      if (rowError) throw rowError;
      const removedIndex = videos.indexOf(item);
      setVideos((current) => current.filter((video) => video.id !== item.id));
      setSelectedIndex((current) => current === null ? null : current === removedIndex ? null : current > removedIndex ? current - 1 : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (!supabase) {
    return <EmptyState title="Album vidéo indisponible" description="Configure Supabase pour activer le stockage des vidéos." />;
  }

  return (
    <section className="stack" aria-label="Album vidéo">
      <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Album vidéo</h2>
          <p className="muted">{videos.length} vidéo{videos.length > 1 ? 's' : ''}</p>
        </div>
        <div className="row-wrap">
          {parentMode && (
            <label className="btn btn--primary" style={{ cursor: busy ? 'wait' : 'pointer' }}>
              <Upload size={20} /> Ajouter des vidéos
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                multiple
                disabled={busy}
                onChange={upload}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                aria-label="Sélectionner des vidéos"
              />
            </label>
          )}
          <Button icon={<RefreshCw size={18} />} disabled={busy} onClick={() => setReloadKey((key) => key + 1)}>
            Actualiser
          </Button>
        </div>
      </div>
      {uploadProgress && (
        <div className="stack" role="status" aria-live="polite" style={{ gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{uploadProgress.stage}</span><strong>{uploadProgress.percent}%</strong>
          </div>
          <div role="progressbar" aria-label="Progression de l’import des vidéos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress.percent} style={{ height: 12, width: '100%', overflow: 'hidden', borderRadius: 999, background: 'var(--color-border, rgba(0,0,0,.12))' }}>
            <div style={{ height: '100%', width: `${uploadProgress.percent}%`, borderRadius: 999, background: 'var(--color-primary, #8b75c9)', transition: 'width .25s ease' }} />
          </div>
          <span className="muted">{uploadProgress.completed} sur {uploadProgress.total} vidéo{uploadProgress.total > 1 ? 's' : ''}</span>
        </div>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
      {info && <p role="status" className="muted">{info}</p>}
      {!busy && videos.length === 0 ? (
        <EmptyState title="Aucune vidéo pour le moment" description={parentMode ? 'Ajoute des vidéos pour créer votre album familial.' : 'Les vidéos ajoutées par les parents apparaîtront ici.'} illustration="cloud" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
          {videos.map((item, index) => (
            <figure key={item.id} className="glass" style={{ margin: 0, padding: 8, overflow: 'hidden' }}>
              <button type="button" onClick={() => setSelectedIndex(index)} aria-label={`Lire la vidéo ${index + 1}`} style={{ display: 'block', position: 'relative', width: '100%', padding: 0, border: 0, background: '#111', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
                <video src={item.url} preload="metadata" muted playsInline style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', background: 'rgba(0,0,0,.15)' }}><Video size={38} /></span>
              </button>
              <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.caption ?? 'Vidéo familiale'}</span>
                {parentMode && <Button variant="danger" icon={<Trash2 size={18} />} disabled={busy} onClick={() => void removeVideo(item)}>Supprimer</Button>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {busy && <p className="muted" role="status">Chargement…</p>}
      {selectedIndex !== null && videos[selectedIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lecteur de vidéos"
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedIndex(null); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelectedIndex(null);
            if (event.key === 'ArrowLeft') setSelectedIndex((index) => index === null ? null : (index - 1 + videos.length) % videos.length);
            if (event.key === 'ArrowRight') setSelectedIndex((index) => index === null ? null : (index + 1) % videos.length);
          }}
          tabIndex={0}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 12, padding: 16, background: 'rgba(0,0,0,.94)', color: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{selectedIndex + 1} / {videos.length}</span>
            <button type="button" onClick={() => setSelectedIndex(null)} aria-label="Fermer" style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}><X size={28} /></button>
          </div>
          <div
            onTouchStart={(event) => {
              const touch = event.touches.item(0);
              touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchEnd={(event) => {
              if (!touchStart.current) return;
              const touch = event.changedTouches.item(0);
              if (!touch) { touchStart.current = null; return; }
              const deltaX = touch.clientX - touchStart.current.x;
              const deltaY = touch.clientY - touchStart.current.y;
              touchStart.current = null;
              if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && videos.length > 1) {
                setSelectedIndex((index) => index === null ? null : (index + (deltaX < 0 ? 1 : -1) + videos.length) % videos.length);
              }
            }}
            onTouchCancel={() => { touchStart.current = null; }}
            style={{ minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, touchAction: 'pan-y' }}
          >
            <button type="button" disabled={videos.length < 2} onClick={() => setSelectedIndex((index) => index === null ? null : (index - 1 + videos.length) % videos.length)} aria-label="Vidéo précédente" style={{ border: 0, borderRadius: 999, padding: 10, background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={30} /></button>
            <video key={videos[selectedIndex].id} src={videos[selectedIndex].url} controls autoPlay playsInline preload="metadata" style={{ maxWidth: 'min(100%, 1200px)', maxHeight: '100%', width: '100%', objectFit: 'contain', background: '#000', borderRadius: 8 }} />
            <button type="button" disabled={videos.length < 2} onClick={() => setSelectedIndex((index) => index === null ? null : (index + 1) % videos.length)} aria-label="Vidéo suivante" style={{ border: 0, borderRadius: 999, padding: 10, background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer' }}><ChevronRight size={30} /></button>
          </div>
          <p style={{ margin: 0, textAlign: 'center', opacity: .8 }}>Balaye l’écran ou utilise les flèches pour passer à la vidéo précédente ou suivante.</p>
        </div>
      )}
      <p className="muted">Les vidéos sont privées et visibles uniquement avec le compte familial connecté. Taille maximale : 50 Mo par vidéo.</p>
    </section>
  );
}
