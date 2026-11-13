/** Son d'interface facultatif (désactivé par défaut) : un court « pop » généré sans fichier audio. */
let context: AudioContext | null = null;

export function playUiSound(enabled: boolean): void {
  if (!enabled) return;
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    context ??= new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // Le son est facultatif : un échec ne doit jamais bloquer l'interface.
  }
}
