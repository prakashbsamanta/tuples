import { useEffect, useRef } from 'react';

interface AtmosphereProps {
  /** Hex accent the particles glow in, e.g. '#5dcaa5'. */
  tint: string;
  /** 0..1 — overall brightness multiplier. */
  intensity?: number;
  /** Particles per 10,000 px². */
  density?: number;
  className?: string;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A drifting, twinkling particle field on a plain 2D canvas — the ambient
 * "light" of a world. Replaces the three.js background at ~1% of its weight.
 * Pauses when offscreen or the tab is hidden; renders one static frame under
 * prefers-reduced-motion.
 */
export function Atmosphere({ tint, intensity = 1, density = 0.6, className = '' }: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [r, g, b] = hexToRgb(tint);
    let motes: Mote[] = [];
    let raf = 0;
    let running = false;
    let onscreen = true;
    let tabVisible = document.visibilityState === 'visible';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Smoothed intensity so hover transitions glow gradually, not in steps.
    let level = intensityRef.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(14, Math.round(((w * h) / 10_000) * density));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.02 + Math.random() * 0.1),
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.9,
      }));
    };

    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      level += (intensityRef.current - level) * 0.06;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; }
        if (m.x < -4) m.x = w + 4;
        else if (m.x > w + 4) m.x = -4;
        const tw = 0.45 + 0.55 * Math.sin(m.phase + t * 0.001 * m.speed);
        const a = tw * 0.5 * level;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        // Soft halo on the larger motes.
        if (m.r > 1.6) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${r},${g},${b},${(a * 0.18).toFixed(3)})`;
          ctx.arc(m.x, m.y, m.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const sync = () => {
      const shouldRun = onscreen && tabVisible && !reduced;
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    seed();
    if (reduced) {
      draw(0); // one static frame — presence without motion
    }

    const ro = new ResizeObserver(() => { seed(); if (reduced) draw(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; sync(); });
    io.observe(canvas);
    const onVis = () => { tabVisible = document.visibilityState === 'visible'; sync(); };
    document.addEventListener('visibilitychange', onVis);
    sync();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tint, density]);

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
