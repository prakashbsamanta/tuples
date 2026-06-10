// Visual-only celebration layer. The app is intentionally silent — there is no
// audio. Celebrations are sleek expanding pulse rings instead of confetti,
// rendered with plain DOM + WAAPI so no canvas dependency is needed.

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function pulse(color: string, { size = 480, duration = 700, delay = 0 }: { size?: number; duration?: number; delay?: number } = {}) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    top: '50%',
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: '50%',
    border: `1.5px solid ${color}`,
    boxShadow: `0 0 60px ${color}, inset 0 0 40px ${color}`,
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '90',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);

  const anim = el.animate(
    [
      { transform: 'scale(0.25)', opacity: 0.9 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
  );
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

/** Correct answer: a volt pulse ring that scales with the combo. */
export function celebrateSolve(combo: number) {
  if (reduceMotion()) return;
  const intensity = Math.min(combo, 8);
  pulse('rgba(200,255,61,0.5)', { size: 420 + intensity * 30, duration: 650 });
  if (intensity >= 3) pulse('rgba(200,255,61,0.3)', { size: 560 + intensity * 30, duration: 800, delay: 90 });
}

/** Level up: a triple expanding ring cascade. */
export function celebrateLevelUp() {
  if (reduceMotion()) return;
  pulse('rgba(200,255,61,0.55)', { size: 520, duration: 700 });
  pulse('rgba(129,140,248,0.45)', { size: 720, duration: 850, delay: 120 });
  pulse('rgba(200,255,61,0.3)', { size: 920, duration: 1000, delay: 240 });
}
