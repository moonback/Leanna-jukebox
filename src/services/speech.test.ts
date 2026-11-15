import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakFrench, speechAvailable } from './speech';

class MockUtterance {
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(public text: string) {}
}

describe('synthèse vocale française', () => {
  let synth: { cancel: ReturnType<typeof vi.fn>; getVoices: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn> };
  let notices: string[];

  beforeEach(() => {
    notices = [];
    synth = { cancel: vi.fn(), getVoices: vi.fn(() => []), speak: vi.fn() };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    window.addEventListener('leanna:speech-notice', ((event: CustomEvent<string>) => notices.push(event.detail)) as EventListener);
  });

  afterEach(() => {
    window.removeEventListener('leanna:speech-notice', ((event: CustomEvent<string>) => notices.push(event.detail)) as EventListener);
    delete (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    delete (globalThis as typeof globalThis & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance;
  });

  it('utilise la voix système et prévient si aucune voix française est installée', () => {
    expect(speechAvailable()).toBe(true);
    expect(speakFrench('Bonjour')).toBe(true);
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(notices.some((message) => message.includes('Aucune voix française'))).toBe(true);
  });

  it('signale clairement l’absence de prise en charge de la synthèse vocale', () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: undefined });
    expect(speechAvailable()).toBe(false);
    expect(speakFrench('Bonjour')).toBe(false);
    expect(notices.some((message) => message.includes('pas disponible'))).toBe(true);
  });
});
