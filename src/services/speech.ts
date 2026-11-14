/** Synthèse vocale en français (Web Speech API). Silencieuse si l'appareil ne la propose pas. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function frenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'fr-FR') ?? voices.find((v) => v.lang.toLowerCase().startsWith('fr'));
}

export function speakFrench(text: string): boolean {
  if (!speechAvailable()) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85; // un peu plus lent, pour les petites oreilles
    utterance.pitch = 1.1;
    const voice = frenchVoice();
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
