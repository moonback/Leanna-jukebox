/** Sons générés sans fichier audio (Web Audio) : interface, piano, feu d'artifice, applaudissements, erreur. */
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** Contexte audio partagé, ou null si l'appareil n'en propose pas. Le son est facultatif. */
function audio(): AudioContext | null {
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    context ??= new AudioCtor();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

/** Une seconde de bruit blanc, réutilisée pour les claquements, boums et crépitements. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function noiseBurst(ctx: AudioContext, at: number, duration: number, filter: BiquadFilterType, frequency: number, volume: number): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  source.connect(biquad).connect(gain).connect(ctx.destination);
  source.start(at, Math.random() * 0.5);
  source.stop(at + duration);
}

function glide(ctx: AudioContext, at: number, duration: number, from: number, to: number, type: OscillatorType, volume: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, at);
  oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

/** Son d'interface facultatif (désactivé par défaut) : un court « pop ». */
export function playUiSound(enabled: boolean): void {
  if (enabled) playTone(660, 0.12, 'sine', 0.08);
}

/** Note synthétisée (piano, « pop » des ballons), qui s'éteint en douceur. */
export function playTone(frequency: number, duration = 0.3, type: OscillatorType = 'sine', volume = 0.15): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    glide(ctx, ctx.currentTime, duration, frequency, frequency, type, volume);
  } catch {
    // Le son est facultatif : un échec ne doit jamais bloquer l'interface.
  }
}

/** Fusée : sifflement qui monte, « boum » grave puis crépitements. `explodeIn` = secondes avant l'explosion. */
export function playFirework(explodeIn: number): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const boom = ctx.currentTime + explodeIn;
    if (explodeIn > 0.55) glide(ctx, boom - 0.55, 0.5, 500, 1600, 'sine', 0.025);
    noiseBurst(ctx, boom, 0.9, 'lowpass', 220, 0.45);
    glide(ctx, boom, 0.5, 90, 40, 'sine', 0.35);
    for (let i = 0; i < 10; i++) noiseBurst(ctx, boom + 0.25 + Math.random() * 1, 0.03, 'highpass', 4000, 0.06);
  } catch {
    // facultatif
  }
}

/** Applaudissements : des dizaines de claquements aléatoires sur un léger brouhaha. */
export function playApplause(duration = 3, delay = 0): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delay;
    for (let i = 0; i < 110; i++) {
      const t = duration * Math.pow(Math.random(), 1.3); // plus dense au début, s'éteint à la fin
      noiseBurst(ctx, start + t, 0.03 + Math.random() * 0.04, 'bandpass', 1100 + Math.random() * 1900, 0.16 * (1 - (t / duration) * 0.7));
    }
    noiseBurst(ctx, start, duration, 'bandpass', 900, 0.04);
  } catch {
    // facultatif
  }
}

/** Erreur : deux notes douces qui descendent (« bou-bouh »), pas effrayant. */
export function playWrong(): void {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    glide(ctx, now, 0.22, 330, 300, 'triangle', 0.16);
    glide(ctx, now + 0.2, 0.4, 247, 196, 'triangle', 0.16);
  } catch {
    // facultatif
  }
}
