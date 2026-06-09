import confetti from 'canvas-confetti';

// Sound is opt-out; persisted in localStorage so it survives reloads.
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('tuples_muted') === '1';
let started = false;
let ToneMod: typeof import('tone') | null = null;
let synth: any = null;

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('tuples_muted', m ? '1' : '0'); } catch { /* ignore */ }
}
export function getMuted() { return muted; }

async function ensureAudio() {
  if (muted) return false;
  if (!ToneMod) {
    ToneMod = await import('tone');
    synth = new ToneMod.PolySynth(ToneMod.Synth).toDestination();
    synth.volume.value = -12;
  }
  if (!started) { await ToneMod.start(); started = true; }
  return !!synth;
}

const ARPEGGIO = ['C5', 'E5', 'G5', 'B5', 'D6', 'F6', 'A6', 'C7'];
const BRAND = ['#818cf8', '#c084fc', '#38bdf8', '#34d399'];

/** Correct answer: a confetti pop + an arpeggio that climbs with the combo. */
export async function celebrateSolve(combo: number) {
  confetti({
    particleCount: 55 + Math.min(combo, 8) * 14,
    spread: 70, origin: { y: 0.7 }, scalar: 0.9,
    colors: BRAND, disableForReducedMotion: true,
  });
  if (!(await ensureAudio())) return;
  const steps = Math.min(Math.max(combo, 1), ARPEGGIO.length);
  const now = ToneMod!.now();
  for (let i = 0; i < steps; i++) synth.triggerAttackRelease(ARPEGGIO[i], '16n', now + i * 0.07);
}

/** Level up: a big burst + a meteor shower from the top + a short fanfare. */
export async function celebrateLevelUp() {
  confetti({ particleCount: 200, spread: 130, startVelocity: 55, origin: { y: 0.5 }, colors: BRAND, disableForReducedMotion: true });
  // meteor shower: streaks raining from the top edge
  confetti({ particleCount: 90, angle: 270, spread: 120, startVelocity: 45, gravity: 1.4, scalar: 1.2, origin: { y: 0 }, colors: ['#fbbf24', '#c084fc', '#818cf8'], disableForReducedMotion: true });
  if (!(await ensureAudio())) return;
  const now = ToneMod!.now();
  ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => synth.triggerAttackRelease(n, '8n', now + i * 0.09));
}
