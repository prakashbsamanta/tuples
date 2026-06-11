import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  FlaskConical, LineChart, Rocket, ArrowRight, ArrowDown,
  Award, EyeOff, Gauge,
} from 'lucide-react';
import { domains } from '../../domains';
import { WORLDS, type World, type WorldId } from '../../lib/worlds';
import { useProgressStore } from '../../store/useProgressStore';
import { Atmosphere } from '../Atmosphere';

gsap.registerPlugin(ScrollTrigger);

const ProofTerminal = lazy(() => import('./ProofTerminal'));

const worldIcons: Record<WorldId, React.ReactNode> = {
  lab: <FlaskConical size={15} />,
  floor: <LineChart size={15} />,
  belt: <Rocket size={15} />,
};

interface WorldState {
  total: number;
  current: number;
  pct: number;
  certified: boolean;
  cta: string;
}

function useWorldState(world: World): WorldState {
  const progress = useProgressStore((s) => s.progressByDomain[world.domainId]);
  const certification = useProgressStore((s) => s.certifications[world.domainId]);
  const total = domains[world.domainId]?.curriculumMatrix.length ?? 0;
  const current = Math.min(progress?.currentStepIndex ?? 0, total);
  const complete = current >= total && total > 0;
  const cta = certification
    ? 'Certified ★ — revisit'
    : complete
      ? 'Take the exam'
      : current > 0
        ? `Continue — step ${current + 1}/${total}`
        : `Enter ${world.name}`;
  return { total, current, pct: total ? Math.round((current / total) * 100) : 0, certified: !!certification, cta };
}

function WorldPanel({ world, hot, onHot, onEnter }: {
  world: World;
  hot: WorldId | null;
  onHot: (id: WorldId | null) => void;
  onEnter: (world: World) => void;
}) {
  const s = useWorldState(world);
  const isHot = hot === world.id;
  const dimmed = hot !== null && !isHot;

  return (
    <button
      type="button"
      data-world={world.id}
      data-testid={`world-${world.id}`}
      onClick={() => onEnter(world)}
      onMouseEnter={() => onHot(world.id)}
      onMouseLeave={() => onHot(null)}
      onFocus={() => onHot(world.id)}
      onBlur={() => onHot(null)}
      style={{ flexGrow: isHot ? 1.6 : dimmed ? 0.82 : 1, backgroundColor: world.bg }}
      className="group relative min-h-[200px] basis-0 overflow-hidden text-left outline-none
        transition-[flex-grow,opacity] duration-500 ease-out cursor-pointer
        border-t md:border-t-0 md:border-l border-white/5 first:border-0
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--world-border)"
    >
      <Atmosphere
        tint={world.accent}
        intensity={isHot ? 1 : dimmed ? 0.25 : 0.55}
        density={0.8}
        className="absolute inset-0 w-full h-full"
      />
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isHot ? 1 : 0,
          background: `radial-gradient(80% 60% at 50% 100%, ${world.accent}14 0%, transparent 70%)`,
        }}
      />

      {/* Vertical role marker */}
      <span
        className="absolute top-6 right-5 font-mono text-[10px] tracking-[0.35em] uppercase transition-colors duration-500 hidden md:block"
        style={{ writingMode: 'vertical-rl', color: isHot ? world.accent : 'rgba(160,165,180,0.45)' }}
      >
        {world.role}
      </span>

      <div className="relative z-10 flex h-full flex-col justify-end p-6 md:p-8">
        <p className="font-mono text-[11px] mb-1.5" style={{ color: world.accent }}>
          {world.index} <span className="text-gray-600 md:hidden">· {world.role.toUpperCase()}</span>
        </p>
        <h2 className="text-2xl md:text-[1.9rem] font-bold tracking-tight text-white mb-1">
          {world.name}
        </h2>
        <p className="text-sm text-gray-400 mb-4 max-w-xs leading-relaxed">{world.epithet}</p>

        <div className="h-0.5 w-full max-w-[260px] bg-white/8 rounded-full mb-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${s.pct}%`, backgroundColor: world.accent }}
          />
        </div>
        <p
          className="font-mono text-[11px] tracking-wider uppercase flex items-center gap-1.5 transition-colors duration-300"
          style={{ color: isHot ? world.accent : 'rgb(148 155 170)' }}
        >
          {s.certified && <Award size={11} />}
          {s.cta}
          <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" />
        </p>
        <p className="font-mono text-[10px] text-gray-600 mt-1">{s.total} steps · {domains[world.domainId]?.examPool.length ?? 0}-question exam</p>
      </div>
    </button>
  );
}

export default function Home() {
  const setActiveDomain = useProgressStore((s) => s.setActiveDomain);
  const rootRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLElement>(null);
  const [hot, setHot] = useState<WorldId | null>(null);
  const [proofAwake, setProofAwake] = useState(false);

  const totalSteps = WORLDS.reduce((a, w) => a + (domains[w.domainId]?.curriculumMatrix.length ?? 0), 0);
  const totalConcepts = new Set(
    WORLDS.flatMap((w) => domains[w.domainId]?.curriculumMatrix.map((s) => s.conceptFocus) ?? [])
  ).size;

  // Wake the real SQL engine only when the proof section approaches.
  useEffect(() => {
    const el = proofRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setProofAwake(true); io.disconnect(); } },
      { rootMargin: '500px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-line]', {
          yPercent: 130, duration: 0.9, stagger: 0.1, ease: 'power4.out', delay: 0.2,
        });
        gsap.from('[data-hero-fade]', {
          opacity: 0, y: 14, duration: 0.7, stagger: 0.12, ease: 'power2.out', delay: 0.8,
        });
        gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
          gsap.from(el, {
            opacity: 0, y: 30, duration: 0.8, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 84%' },
          });
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const enter = (world: World) => setActiveDomain(world.domainId);

  return (
    <div ref={rootRef} className="relative min-h-screen text-gray-100 grain bg-canvas">
      {/* ── Act 1 · The triptych ── */}
      <section className="relative flex min-h-svh flex-col">
        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 sm:px-8 py-4 pointer-events-none">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-volt text-lg leading-none">(,)</span>
            <span className="font-bold tracking-tight text-white">Tuples</span>
          </div>
          <span className="font-mono text-[10px] tracking-widest text-gray-500 hidden sm:block">
            {totalSteps} STEPS · 3 WORLDS · ALL LOCAL
          </span>
        </nav>

        {/* Center headline floats above the panels on desktop, flows above them on mobile */}
        <div className="z-10 pointer-events-none px-6 pt-24 pb-10 text-center md:absolute md:inset-x-0 md:top-[16vh] md:p-0">
          <h1 className="font-bold tracking-tight text-white leading-[1.04] text-[clamp(2.2rem,5.5vw,4.6rem)]">
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]"><span data-hero-line className="block">Every world runs</span></span>
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]"><span data-hero-line className="block">on a <span className="text-gradient-brand">database.</span></span></span>
          </h1>
          <p data-hero-fade className="mt-4 text-gray-400 text-sm sm:text-base">
            Learn SQL by running three of them. In your browser. For real.
          </p>
          <p data-hero-fade className="mt-6 font-mono text-[10px] tracking-[0.3em] text-gray-600 uppercase hidden md:flex items-center justify-center gap-2">
            Pick a world · or scroll for proof <ArrowDown size={11} />
          </p>
        </div>

        <div className="flex flex-1 flex-col md:flex-row">
          {WORLDS.map((w) => (
            <WorldPanel key={w.id} world={w} hot={hot} onHot={setHot} onEnter={enter} />
          ))}
        </div>
      </section>

      {/* ── Act 2 · Proof ── */}
      <section ref={proofRef} className="relative px-6 sm:px-10 py-24 md:py-32 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div data-rise>
            <p className="font-mono text-xs tracking-[0.3em] text-volt uppercase mb-5">Act II · Proof</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              This isn't a video.
            </h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              A real SQLite engine just woke up in this page. Every mission runs on one —
              your queries execute against real schemas, real data, real query plans.
              Nothing leaves your browser. Try it.
            </p>
          </div>
          <div data-rise className="min-h-[280px]">
            {proofAwake ? (
              <Suspense fallback={<div className="glass-card rounded-2xl h-64 flex items-center justify-center font-mono text-xs text-gray-600">-- waking the engine…</div>}>
                <ProofTerminal />
              </Suspense>
            ) : (
              <div className="glass-card rounded-2xl h-64" />
            )}
          </div>
        </div>
      </section>

      {/* ── Act 3 · The method ── */}
      <section className="relative px-6 sm:px-10 py-24 max-w-6xl mx-auto">
        <h2 data-rise className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
          Rigor is the <span className="text-gradient-brand">feature.</span>
        </h2>
        <p data-rise className="text-gray-500 max-w-lg mb-12">
          Three disciplines, one standard: if your query only works by accident, it doesn't pass.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: <EyeOff size={18} />,
              title: 'Hidden test datasets',
              body: 'Every answer is re-checked against a second, differently-seeded database. Hardcoded results fail with a note explaining why.',
            },
            {
              icon: <Gauge size={18} />,
              title: 'Real query plans',
              body: 'The Optimizer track grades EXPLAIN QUERY PLAN output — your query must not just be right, it must use the index.',
            },
            {
              icon: <Award size={18} />,
              title: 'Certification exams',
              body: 'Finish a world and face 8 questions on the database you built. No hints, one attempt each. Pass and it sticks.',
            },
          ].map((f) => (
            <div key={f.title} data-rise className="surface-1 rounded-2xl p-6">
              <div className="w-9 h-9 rounded-xl bg-volt/10 border border-volt/20 text-volt flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
        <div data-rise className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            [String(totalSteps), 'steps'],
            ['3', 'worlds'],
            [String(totalConcepts), 'SQL concepts'],
            ['0', 'servers'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-bold text-white">{v}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gray-600">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Act 4 · Closing ── */}
      <section className="relative px-6 sm:px-10 pt-16 pb-20 max-w-6xl mx-auto">
        <div data-rise className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pick your world.
          </h2>
        </div>
        <div data-rise className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              data-world={w.id}
              onClick={() => enter(w)}
              className="group surface-1 rounded-2xl p-5 text-left transition-all duration-300
                hover:-translate-y-0.5 hover:border-(--world-border)"
            >
              <div className="flex items-center gap-2 mb-1.5" style={{ color: w.accent }}>
                {worldIcons[w.id]}
                <span className="font-bold text-white text-sm">{w.name}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{w.epithet}</p>
              <span className="font-mono text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: w.accent }}>
                {w.role} track <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-14 text-center font-mono text-[11px] text-gray-600">
          <span className="text-volt">(,)</span> Tuples — SQL, spoken fluently. Progress saved locally.
        </p>
      </section>
    </div>
  );
}
