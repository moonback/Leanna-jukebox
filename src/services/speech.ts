const SPEECH_NOTICE_EVENT = 'leanna:speech-notice';

function notifySpeechFallback(message: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SPEECH_NOTICE_EVENT, { detail: message }));
  }
}

/** Synthèse vocale en français (Web Speech API), avec un retour visible si la voix manque. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function frenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang.toLowerCase() === 'fr-fr')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('fr'));
}

export function speakFrench(text: string): boolean {
  if (!speechAvailable()) {
    notifySpeechFallback('La lecture vocale n’est pas disponible sur cette tablette. Tu peux continuer à utiliser les images et les jeux.');
    return false;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    const voice = frenchVoice();
    if (voice) {
      utterance.voice = voice;
    } else {
      // La synthèse reste utilisable avec la voix système, mais on prévient le parent.
      notifySpeechFallback('Aucune voix française n’est installée. La voix par défaut de la tablette sera utilisée ; installe une voix française dans les réglages Android pour un meilleur résultat.');
    }
    synth.speak(utterance);
    return true;
  } catch {
    notifySpeechFallback('La tablette n’a pas pu lancer la lecture vocale. Les activités restent disponibles sans audio.');
    return false;
  }
}
