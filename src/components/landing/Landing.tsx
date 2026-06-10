import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, FlaskConical, LineChart, Rocket, Database, Terminal, GitBranch } from 'lucide-react';
import { domains } from '../../domains';

gsap.registerPlugin(ScrollTrigger);

interface LandingProps {
  onEnter: () => void;
}

const HERO_QUERY = "SELECT skill FROM you\n  JOIN tuples USING (curiosity);";

const HERO_ROWS = [
  ['CREATE TABLE', 'novice'],
  ['INNER JOIN', 'operator'],
  ['WINDOW FUNCTIONS', 'architect'],
];

const domainMeta: Record<string, { icon: React.ReactNode; accent: string; ring: string }> = {
  'clinical-trials-research': {
    icon: <FlaskConical size={22} />,
    accent: 'text-emerald-400',
    ring: 'group-hover:border-emerald-500/30',
  },
  'algorithmic-trading': {
    icon: <LineChart size={22} />,
    accent: 'text-indigo-400',
    ring: 'group-hover:border-indigo-500/30',
  },
  'space-logistics': {
    icon: <Rocket size={22} />,
    accent: 'text-amber-400',
    ring: 'group-hover:border-amber-500/30',
  },
};

const PHASES = [
  { name: 'Novice', desc: 'Tables, rows, your first SELECT', icon: <Database size={18} /> },
  { name: 'Operator', desc: 'Joins, aggregates, GROUP BY fluency', icon: <Terminal size={18} /> },
  { name: 'Architect', desc: 'CTEs, windows, views — production SQL', icon: <GitBranch size={18} /> },
];

export default function Landing({ onEnter }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // ── Hero: staggered headline reveal ──
        gsap.from('[data-hero-line]', {
          yPercent: 120,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power4.out',
          delay: 0.15,
        });
        gsap.from('[data-hero-fade]', {
          opacity: 0,
          y: 16,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          delay: 0.7,
        });

        // ── Hero: self-typing query, then result rows materialize ──
        const target = queryRef.current;
        if (target) {
          const counter = { i: 0 };
          const tl = gsap.timeline({ delay: 1.0 });
          tl.to(counter, {
            i: HERO_QUERY.length,
            duration: 1.8,
            ease: 'none',
            snap: { i: 1 },
            onUpdate: () => {
              target.textContent = HERO_QUERY.slice(0, counter.i);
            },
          });
          tl.fromTo(
            '[data-hero-row]',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.45, stagger: 0.15, ease: 'power2.out' },
            '+=0.2'
          );
        }

        // ── Domains: panels rise in on scroll ──
        gsap.from('[data-domain-card]', {
          opacity: 0,
          y: 60,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '[data-domains]', start: 'top 72%' },
        });

        // ── Path: line draws as you scroll, phases pop in ──
        const path = rootRef.current?.querySelector<SVGPathElement>('[data-path-line]');
        if (path) {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: { trigger: '[data-path]', start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
          });
        }
        gsap.from('[data-phase]', {
          opacity: 0,
          y: 30,
          duration: 0.7,
          stagger: 0.18,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-path]', start: 'top 65%' },
        });

        // ── Section headings: subtle rise everywhere ──
        gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 28,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 82%' },
          });
        });
      });

      // Reduced motion: show the finished state, no choreography.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (queryRef.current) queryRef.current.textContent = HERO_QUERY;
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const domainList = Object.values(domains);

  return (
    <div ref={rootRef} className="relative min-h-screen text-gray-100 grain">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-30 glass-bar flex items-center justify-between px-6 sm:px-10 py-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-volt text-lg leading-none">(,)</span>
          <span className="font-bold tracking-tight text-white">Tuples</span>
        </div>
        <button
          onClick={onEnter}
          className="text-xs font-mono text-gray-400 hover:text-volt transition-colors flex items-center gap-1.5"
        >
          SKIP INTRO <ArrowRight size={12} />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-10 max-w-6xl mx-auto pt-24 pb-16">
        <p data-hero-fade className="font-mono text-xs tracking-[0.3em] text-volt mb-6 uppercase">
          In-browser SQL · zero setup · all local
        </p>

        <h1 className="font-bold tracking-tight leading-[1.02] text-white text-[clamp(3rem,9vw,7.5rem)]">
          {/* pb offsets keep descenders inside the overflow-hidden reveal masks */}
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]"><span data-hero-line className="block">Speak</span></span>
          <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]"><span data-hero-line className="block">to <span className="text-gradient-brand">data.</span></span></span>
        </h1>

        <div className="mt-10 grid lg:grid-cols-2 gap-10 items-start">
          <div data-hero-fade>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Learn SQL by building real production databases — clinical trials,
              trading systems, orbital logistics — one query at a time, entirely
              in your browser.
            </p>
            <div className="mt-8 flex items-center gap-5">
              <button
                onClick={onEnter}
                data-testid="landing-cta"
                className="group px-6 py-3.5 bg-volt text-black font-bold text-sm rounded-xl
                  hover:bg-volt-dim transition-colors flex items-center gap-2 glow-volt"
              >
                Start building
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <span className="font-mono text-xs text-gray-600">105 steps · 3 missions · 0 servers</span>
            </div>
          </div>

          {/* Self-typing query terminal */}
          <div data-hero-fade className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-volt/40" />
              <span className="ml-3 font-mono text-[10px] text-gray-600 tracking-widest">TUPLES.SQL</span>
            </div>
            <div className="p-5 font-mono text-sm">
              <pre className="text-volt whitespace-pre-wrap min-h-[3.5rem]"><code ref={queryRef} /><span className="animate-pulse">▌</span></pre>
              <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5">
                {HERO_ROWS.map(([skill, phase]) => (
                  <div key={skill} data-hero-row className="flex justify-between text-xs">
                    <span className="text-gray-300">{skill}</span>
                    <span className="text-gray-600">{phase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Domains ── */}
      <section data-domains className="relative px-6 sm:px-10 py-28 max-w-6xl mx-auto">
        <h2 data-rise className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
          Three worlds. <span className="text-gray-600">One language.</span>
        </h2>
        <p data-rise className="text-gray-500 max-w-lg mb-14">
          Every mission is a real schema you build from nothing — 35 progressive
          steps from your first table to window functions.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {domainList.map((d) => {
            const meta = domainMeta[d.domainId];
            return (
              <div
                key={d.domainId}
                data-domain-card
                className={`group surface-1 rounded-2xl p-7 transition-colors duration-300 ${meta?.ring ?? ''}`}
              >
                <div className={`mb-5 ${meta?.accent ?? 'text-gray-300'}`}>{meta?.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{d.domainName}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{d.domainDescription}</p>
                <p className="mt-5 font-mono text-[10px] tracking-widest text-gray-600 uppercase">
                  {d.curriculumMatrix.length} steps
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Skill path ── */}
      <section data-path className="relative px-6 sm:px-10 py-28 max-w-6xl mx-auto">
        <h2 data-rise className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-16">
          Novice to <span className="text-gradient-brand">architect.</span>
        </h2>

        {/* Connecting line (draws on scroll) */}
        <svg className="absolute left-0 right-0 mx-auto w-full max-w-4xl h-16 hidden md:block" viewBox="0 0 800 60" fill="none" aria-hidden>
          <path data-path-line d="M 40 30 H 760" stroke="rgba(200,255,61,0.35)" strokeWidth="1.5" />
        </svg>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {PHASES.map((p, i) => (
            <div key={p.name} data-phase className="relative">
              <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/25 text-volt flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-gray-600 mb-1">PHASE 0{i + 1}</p>
              <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative px-6 sm:px-10 py-32 text-center">
        <h2 data-rise className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-8">
          Your first table<br />is waiting.
        </h2>
        <div data-rise>
          <button
            onClick={onEnter}
            className="group px-8 py-4 bg-volt text-black font-bold rounded-xl
              hover:bg-volt-dim transition-colors inline-flex items-center gap-2 glow-volt"
          >
            Choose a mission
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-6 font-mono text-xs text-gray-600">
            No sign-up. No data leaves your browser.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 sm:px-10 py-8 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-mono text-xs text-gray-600">(,) Tuples — open source, MIT</span>
        <span className="font-mono text-xs text-gray-700">SQLite · WebAssembly · React</span>
      </footer>
    </div>
  );
}
