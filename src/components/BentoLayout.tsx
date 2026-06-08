import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BentoLayoutProps {
  header: ReactNode;
  pathVisualizer: ReactNode;
  narrative: ReactNode;
  terminal: ReactNode;
  visualizer: ReactNode;
  results: ReactNode;
}

// A draggable vertical divider used between resizable columns (desktop only).
function Resizer({ onPointerDown, label }: { onPointerDown: (e: React.PointerEvent) => void; label: string }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      className="relative w-px shrink-0 bg-white/5 hover:bg-indigo-500/50 cursor-col-resize transition-colors z-20"
    >
      {/* Widened invisible hit area */}
      <div className="absolute inset-y-0 -left-2 -right-2" />
    </div>
  );
}

export function BentoLayout({ header, pathVisualizer, narrative, terminal, visualizer, results }: BentoLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // FIX #8: switch between resizable desktop layout and stacked mobile layout.
  const [isDesktop, setIsDesktop] = useState(true);
  // FIX #9: user-resizable columns.
  const [pathWidth, setPathWidth] = useState(240);
  const [centerFrac, setCenterFrac] = useState(0.57);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const beginDrag = (onMove: (e: PointerEvent) => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => onMove(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const startPathDrag = beginDrag((ev) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPathWidth(Math.min(420, Math.max(180, ev.clientX - rect.left)));
  });

  const startSplitDrag = beginDrag((ev) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const remaining = rect.width - pathWidth;
    if (remaining <= 0) return;
    const frac = (ev.clientX - rect.left - pathWidth) / remaining;
    setCenterFrac(Math.min(0.8, Math.max(0.3, frac)));
  });

  // Shared column contents (identical in both layouts).
  const centerColumn = (
    <>
      <div className="shrink-0 border-b border-white/5 px-6 py-5 bg-[#090D1A]/60">
        {narrative}
      </div>
      <div className="flex-1 flex flex-col min-h-[360px] lg:min-h-0">
        {terminal}
      </div>
    </>
  );

  const rightColumn = (
    <>
      <div className="flex-[4] border-b border-white/5 overflow-hidden flex flex-col min-h-[260px] lg:min-h-0">
        {visualizer}
      </div>
      <div className="flex-[3] overflow-hidden flex flex-col min-h-[220px] lg:min-h-0">
        {results}
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-[#080C14] text-gray-100 overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full bg-indigo-600/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-violet-600/5 blur-[80px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/5 bg-[#0A0E1A]/90 backdrop-blur-xl shrink-0 flex-wrap"
      >
        {header}
      </motion.header>

      {/* Main Content */}
      {isDesktop ? (
        // ── Desktop: resizable 3-column layout ──
        <div ref={containerRef} className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
          <div
            style={{ width: pathWidth }}
            className="shrink-0 overflow-hidden flex flex-col bg-[#0A0E1A]/60"
          >
            {pathVisualizer}
          </div>
          <Resizer onPointerDown={startPathDrag} label="Resize mission path" />
          <div
            style={{ flexGrow: centerFrac, flexBasis: 0 }}
            className="flex flex-col min-w-0 overflow-hidden"
          >
            {centerColumn}
          </div>
          <Resizer onPointerDown={startSplitDrag} label="Resize editor and schema panels" />
          <div
            style={{ flexGrow: 1 - centerFrac, flexBasis: 0 }}
            className="flex flex-col min-w-0 overflow-hidden"
          >
            {rightColumn}
          </div>
        </div>
      ) : (
        // ── Mobile / tablet: vertically stacked, scrollable ──
        <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="w-full max-h-56 overflow-y-auto border-b border-white/5 bg-[#0A0E1A]/60 shrink-0">
            {pathVisualizer}
          </div>
          <div className="flex flex-col w-full border-b border-white/5">
            {centerColumn}
          </div>
          <div className="flex flex-col w-full">
            {rightColumn}
          </div>
        </div>
      )}
    </div>
  );
}
