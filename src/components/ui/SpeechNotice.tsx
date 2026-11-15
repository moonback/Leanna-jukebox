import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SPEECH_NOTICE_EVENT = 'leanna:speech-notice';

export function SpeechNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string' && detail.trim()) setMessage(detail);
    };
    window.addEventListener(SPEECH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(SPEECH_NOTICE_EVENT, onNotice);
  }, []);

  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', zIndex: 1000, left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        display: 'flex', alignItems: 'center', gap: 12, maxWidth: 680, margin: '0 auto',
        padding: '14px 16px', borderRadius: 18, background: '#fff', color: '#393447',
        boxShadow: '0 8px 28px rgba(30, 25, 45, .2)', fontWeight: 700,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" aria-label="Fermer le message vocal" onClick={() => setMessage(null)} style={{ minWidth: 48, minHeight: 48, display: 'grid', placeItems: 'center' }}>
        <X size={22} />
      </button>
    </div>
  );
}
