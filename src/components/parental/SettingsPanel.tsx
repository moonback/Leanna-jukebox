import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../ui/Button';
import { PinPad } from './PinPad';
import { CloudSyncCard } from './CloudSyncCard';
import { updateSettings } from '../../storage/settingsRepository';
import { buildBackup, deleteAllData, parseBackup, restoreBackup } from '../../storage/backup';
import { db } from '../../storage/database';
import { createPinCredentials, validatePinFormat } from '../../security/pinService';
import { playUiSound } from '../../services/sound';
import { toUserMessage, AppError } from '../../services/errors';

const SESSION_OPTIONS = [0, 10, 20, 30, 45, 60];

/** Réglages parents : volume, durée indicative, mode enfant, PIN, export/import, suppression. */
export function SettingsPanel() {
  const { settings } = useSettings();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changingPin, setChangingPin] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (patch: Parameters<typeof updateSettings>[0]) => {
    setError(null);
    try {
      await updateSettings(patch, db);
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  const exportLibrary = async () => {
    setError(null);
    try {
      const backup = await buildBackup(db);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leanna-jukebox-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Sauvegarde exportée.');
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  const readImport = async (file: File) => {
    setError(null);
    setPendingImport(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new AppError('validation', 'Fichier trop volumineux pour une sauvegarde.');
      const data = parseBackup(JSON.parse(await file.text()) as unknown);
      setPendingImport(data);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Ce fichier n’est pas un JSON valide.' : toUserMessage(err));
    }
  };

  return (
    <section className="parent-layout parent-layout--split" aria-label="Réglages parents">
      <div className="stack">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Volume maximal</h2>
          <p className="muted" style={{ margin: 0 }}>
            Limite le volume du lecteur. Les boutons de volume de la tablette restent disponibles.
          </p>
          <label className="field">
            {settings.maxVolumePreference} %
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.maxVolumePreference}
              onChange={(e) => save({ maxVolumePreference: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Durée maximale d’écoute</h2>
          <label className="field">
            Mettre le lecteur en pause après
            <select value={settings.maxSessionMinutes} onChange={(e) => save({ maxSessionMinutes: Number(e.target.value) })}>
              {SESSION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Pas de limite' : `${m} minutes`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Préférences enfant</h2>
          <label className="field field--row">
            Mode enfant (accès parents par appui long)
            <input type="checkbox" checked={settings.childMode} onChange={(e) => save({ childMode: e.target.checked })} style={{ width: 26, height: 26 }} />
          </label>
          <label className="field field--row">
            Plein écran au lancement d’une chanson
            <input type="checkbox" checked={settings.fullscreenMode} onChange={(e) => save({ fullscreenMode: e.target.checked })} style={{ width: 26, height: 26 }} />
          </label>
          <label className="field field--row">
            Sons d’interface (désactivés par défaut)
            <input
              type="checkbox"
              checked={settings.soundsEnabled}
              onChange={(e) => {
                save({ soundsEnabled: e.target.checked });
                playUiSound(e.target.checked);
              }}
              style={{ width: 26, height: 26 }}
            />
          </label>
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Code PIN</h2>
          {changingPin ? (
            <div className="row-wrap" style={{ justifyContent: 'center' }}>
              <PinPad
                title="Nouveau code PIN"
                hint="4 à 6 chiffres."
                submitLabel="Changer le code"
                onSubmit={async (pin) => {
                  if (validatePinFormat(pin)) return 'Le code doit contenir entre 4 et 6 chiffres.';
                  const credentials = await createPinCredentials(pin);
                  await updateSettings({ ...credentials, failedAttempts: 0, lockedUntil: 0 }, db);
                  setChangingPin(false);
                  setMessage('Code PIN modifié.');
                  return null;
                }}
              />
            </div>
          ) : (
            <Button onClick={() => setChangingPin(true)}>Changer le code PIN</Button>
          )}
        </div>
      </div>

      <div className="stack">
        <CloudSyncCard />
        {error && <p className="error-text" role="alert">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 800, color: 'var(--color-mint-deep)' }}>{message}</p>}

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Sauvegarde</h2>
          <p className="muted" style={{ margin: 0 }}>
            L’export contient les chansons, playlists et catégories. Le code PIN n’est jamais exporté.
          </p>
          <Button variant="primary" icon={<Download size={20} />} onClick={exportLibrary}>
            Exporter la bibliothèque
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Fichier de sauvegarde à importer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readImport(file);
              e.target.value = '';
            }}
          />
          <Button icon={<Upload size={20} />} onClick={() => fileRef.current?.click()}>
            Importer une sauvegarde
          </Button>
          {pendingImport && (
            <div className="glass" style={{ padding: 14, display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontWeight: 800 }}>
                Remplacer toutes les données par ce fichier ({pendingImport.songs.length} chansons, {pendingImport.playlists.length} playlists) ?
              </p>
              <div className="row-wrap">
                <Button variant="danger" onClick={async () => {
                  try {
                    await restoreBackup(pendingImport, db);
                    setPendingImport(null);
                    setMessage('Sauvegarde restaurée.');
                  } catch (err) {
                    setError(toUserMessage(err));
                  }
                }}>
                  Remplacer
                </Button>
                <Button onClick={() => setPendingImport(null)}>Annuler</Button>
              </div>
            </div>
          )}
        </div>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Supprimer toutes les données</h2>
          <p className="muted" style={{ margin: 0 }}>Efface les chansons, playlists, catégories et le code PIN. Cette action est définitive.</p>
          {confirmErase ? (
            <div className="row-wrap">
              <Button variant="danger" onClick={async () => {
                try {
                  await deleteAllData(db);
                  setConfirmErase(false);
                  setMessage('Données effacées.');
                } catch (err) {
                  setError(toUserMessage(err));
                }
              }}>
                Oui, tout effacer
              </Button>
              <Button onClick={() => setConfirmErase(false)}>Annuler</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmErase(true)}>
              Supprimer toutes les données
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
