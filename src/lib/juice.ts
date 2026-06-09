import confetti from 'canvas-confetti';

// Visual-only celebration layer. The app is intentionally silent — there is no
// audio. (A previous version played synth sounds via Tone.js; that was removed.)

const BRAND = ['#818cf8', '#c084fc', '#38bdf8', '#34d399'];

/** Correct answer: a confetti pop that scales with the combo. */
export function celebrateSolve(combo: number) {
  confetti({
    particleCount: 55 + Math.min(combo, 8) * 14,
    spread: 70,
    origin: { y: 0.7 },
    scalar: 0.9,
    colors: BRAND,
    disableForReducedMotion: true,
  });
}

/** Level up: a big burst + a meteor shower from the top edge. */
export function celebrateLevelUp() {
  confetti({
    particleCount: 200,
    spread: 130,
    startVelocity: 55,
    origin: { y: 0.5 },
    colors: BRAND,
    disableForReducedMotion: true,
  });
  confetti({
    particleCount: 90,
    angle: 270,
    spread: 120,
    startVelocity: 45,
    gravity: 1.4,
    scalar: 1.2,
    origin: { y: 0 },
    colors: ['#fbbf24', '#c084fc', '#818cf8'],
    disableForReducedMotion: true,
  });
}
