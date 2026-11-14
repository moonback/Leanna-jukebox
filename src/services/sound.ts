/** Son d'interface facultatif (désactivé par défaut) : un court « pop » généré sans fichier audio. */
let context: AudioContext | null = null;

export function playUiSound(enabled: boolean): void {
  if (enabled) playTone(660, 0.12, 'sine', 0.08);
}

/** Note synthétisée (piano, « pop » des ballons), qui s'éteint en douceur. */
export function playTone(frequency: number, duration = 0.3, type: OscillatorType = 'sine', volume = 0.15): void {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    context ??= new AudioCtor();
    if (context.state === 'suspended') void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch {
    // Le son est facultatif : un échec ne doit jamais bloquer l'interface.
  }
}
