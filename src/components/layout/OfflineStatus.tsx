import { useEffect, useState } from 'react';
import { Download, WifiOff } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** Indique l'état réseau et propose l'installation PWA quand le navigateur l'autorise. */
export function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install(): Promise<void> {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  if (online && (!installPrompt || installed)) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', zIndex: 1000, left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px', borderRadius: 18, background: online ? '#fff7d6' : '#fff0e8',
        boxShadow: '0 4px 18px rgba(50,30,50,.16)', color: '#493b49', fontWeight: 800,
      }}
    >
      {!online && <><WifiOff size={18} aria-hidden="true" /><span>Mode hors ligne — tes jeux et images enregistrés restent disponibles. YouTube nécessite Internet.</span></>}
      {online && installPrompt && !installed && (
        <button type="button" className="btn btn--primary" onClick={() => void install()}>
          <Download size={18} aria-hidden="true" /> Installer Leanna
        </button>
      )}
    </aside>
  );
}
