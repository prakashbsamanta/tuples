import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface BentoLayoutProps {
  header: ReactNode;
  pathVisualizer: ReactNode;
  narrative: ReactNode;
  terminal: ReactNode;
  visualizer: ReactNode;
  results: ReactNode;
}

/** Glass drag handle between resizable panels. */
function Handle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  const vertical = direction === 'vertical'; // a vertical group → handle is a horizontal bar
  return (
    <PanelResizeHandle
      className={
        'group relative shrink-0 bg-white/5 transition-colors data-[resize-handle-state=hover]:bg-indigo-500/40 ' +
        'data-[resize-handle-state=drag]:bg-indigo-500/60 ' +
        (vertical ? 'h-px w-full cursor-row-resize' : 'w-px h-full cursor-col-resize')
      }
    >
      {/* Widened invisible hit-area + centered grip */}
      <div className={vertical ? 'absolute inset-x-0 -top-2 -bottom-2' : 'absolute inset-y-0 -left-2 -right-2'} />
      <div
        className={
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15 ' +
          'opacity-0 group-hover:opacity-100 transition-opacity ' +
          (vertical ? 'h-1 w-8' : 'w-1 h-8')
        }
      />
    </PanelResizeHandle>
  );
}

const panelGlass = 'bg-[#0A0E1A]/45 backdrop-blur-xl';

export function BentoLayout({ header, pathVisualizer, narrative, terminal, visualizer, results }: BentoLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Center column = briefing (fixed) + a resizable editor / results vertical split.
  const centerColumn = (
    <div className="flex flex-col h-full min-h-0">
      <div className={`shrink-0 border-b border-white/5 px-6 py-5 ${panelGlass}`}>{narrative}</div>
      {isDesktop ? (
        <PanelGroup direction="vertical" autoSaveId="tuples-center-v" className="flex-1 min-h-0">
          <Panel defaultSize={58} minSize={25} className="flex flex-col min-h-0">
            {terminal}
          </Panel>
          <Handle direction="vertical" />
          <Panel defaultSize={42} minSize={15} className={`flex flex-col min-h-0 ${panelGlass}`}>
            {results}
          </Panel>
        </PanelGroup>
      ) : (
        <>
          <div className="flex flex-col min-h-[360px]">{terminal}</div>
          <div className={`flex flex-col min-h-[220px] border-t border-white/5 ${panelGlass}`}>{results}</div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-transparent text-gray-100 overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full bg-indigo-600/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-violet-600/5 blur-[80px]" />
      </div>

      {/* Header (glass) */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-bar relative z-20 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 shrink-0 flex-wrap"
      >
        {header}
      </motion.header>

      {/* Main */}
      {isDesktop ? (
        <PanelGroup direction="horizontal" autoSaveId="tuples-cols-v2" className="relative z-10 flex-1 min-h-0">
          <Panel defaultSize={16} minSize={11} maxSize={28} className={`flex flex-col min-h-0 ${panelGlass}`}>
            {pathVisualizer}
          </Panel>
          <Handle direction="horizontal" />
          <Panel defaultSize={52} minSize={30} className="flex flex-col min-h-0">
            {centerColumn}
          </Panel>
          <Handle direction="horizontal" />
          <Panel defaultSize={32} minSize={18} className={`flex flex-col min-h-0 ${panelGlass}`}>
            {visualizer}
          </Panel>
        </PanelGroup>
      ) : (
        <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className={`w-full max-h-56 overflow-y-auto border-b border-white/5 ${panelGlass}`}>{pathVisualizer}</div>
          <div className="flex flex-col w-full border-b border-white/5">{centerColumn}</div>
          <div className={`flex flex-col w-full min-h-[320px] ${panelGlass}`}>{visualizer}</div>
        </div>
      )}
    </div>
  );
}
