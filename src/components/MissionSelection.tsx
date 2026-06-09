import React from 'react';
import { motion } from 'framer-motion';
import {
  DatabaseZap, Rocket, LineChart, FlaskConical, ArrowRight,
  CheckCircle, Trophy, Star, Zap, RotateCcw
} from 'lucide-react';
import { domains } from '../domains';
import { useProgressStore } from '../store/useProgressStore';

const domainConfig: Record<string, { icon: React.ReactNode; color: string; accentBg: string; bar: string; tag: string }> = {
  'clinical-trials-research': {
    icon: <FlaskConical size={28} />,
    color: 'text-emerald-400',
    accentBg: 'from-emerald-500/20 to-teal-500/10',
    bar: 'from-emerald-500 to-teal-400',
    tag: 'Life Sciences'
  },
  'algorithmic-trading': {
    icon: <LineChart size={28} />,
    color: 'text-indigo-400',
    accentBg: 'from-indigo-500/20 to-blue-500/10',
    bar: 'from-indigo-500 to-blue-400',
    tag: 'Finance'
  },
  'space-logistics': {
    icon: <Rocket size={28} />,
    color: 'text-amber-400',
    accentBg: 'from-amber-500/20 to-orange-500/10',
    bar: 'from-amber-500 to-orange-400',
    tag: 'Aerospace'
  }
};

export function MissionSelection() {
  const { setActiveDomain, progressByDomain, resetDomain } = useProgressStore();
  const domainList = Object.values(domains);

  const handleReset = (e: React.MouseEvent, domainId: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Reset all progress for "${name}"? This cannot be undone.`)) {
      resetDomain(domainId);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-100 relative overflow-hidden flex flex-col">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Top Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <DatabaseZap size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Tuples</span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <Zap size={12} className="text-yellow-500" />
          <span>35 STEPS PER MISSION</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 text-center pt-16 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <Star size={14} className="fill-violet-400 text-violet-400" />
            Interactive SQL Learning Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-none">
            Choose Your<br />
            <span className="text-gradient-brand">Mission Domain</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Master SQL by building real production databases from scratch. 
            35 progressive steps per mission — from CREATE TABLE to advanced window functions.
          </p>
        </motion.div>
      </div>

      {/* Mission Cards */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {domainList.map((domain, idx) => {
            const config = domainConfig[domain.domainId];
            const progress = progressByDomain[domain.domainId];
            const currentStep = progress?.currentStepIndex || 0;
            const totalSteps = domain.curriculumMatrix.length;
            const percent = Math.round((currentStep / totalSteps) * 100);
            const isStarted = currentStep > 0;
            const isComplete = currentStep >= totalSteps;

            // Phase breakdown
            const noviceSteps = domain.curriculumMatrix.filter(s => s.phase === 'Novice').length;
            const operatorSteps = domain.curriculumMatrix.filter(s => s.phase === 'Operator').length;
            const architectSteps = domain.curriculumMatrix.filter(s => s.phase === 'Architect').length;

            return (
              <motion.div
                key={domain.domainId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.5 }}
                onClick={() => setActiveDomain(domain.domainId)}
                className="group cursor-pointer relative"
              >
                <div className="relative surface-1 rounded-2xl p-7 h-full flex flex-col overflow-hidden
                  hover:border-white/15 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                  
                  {/* Top gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${config.accentBg}`} />
                  
                  {/* Background gradient */}
                  <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${config.accentBg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-6 relative">
                    <div className={`p-3 rounded-xl bg-white/5 border border-white/8 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/8 ${config.color}`}>
                        {config.tag}
                      </span>
                      {isComplete && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center gap-1">
                          <Trophy size={10} /> Complete
                        </span>
                      )}
                      {isStarted && !isComplete && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white mb-2 relative">{domain.domainName}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed relative flex-1 mb-6">{domain.domainDescription}</p>

                  {/* Phase Pills */}
                  <div className="flex gap-2 mb-6 relative">
                    {[
                      { label: 'Novice', count: noviceSteps, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
                      { label: 'Operator', count: operatorSteps, color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
                      { label: 'Architect', count: architectSteps, color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' }
                    ].map(phase => (
                      <div key={phase.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${phase.color}`}>
                        <span className="font-mono font-bold">{phase.count}</span>
                        <span className="opacity-80">{phase.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="relative space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-gray-500">{isStarted ? `Step ${currentStep}/${totalSteps}` : 'Not started'}</span>
                      <div className="flex items-center gap-2">
                        {isStarted && (
                          <button
                            onClick={(e) => handleReset(e, domain.domainId, domain.domainName)}
                            title="Reset progress"
                            aria-label={`Reset progress for ${domain.domainName}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-gray-600 hover:text-red-400
                              hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                          >
                            <RotateCcw size={11} /> Reset
                          </button>
                        )}
                        <span className={config.color}>{percent}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 + 0.3, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${config.bar}`}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button className={`mt-6 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                    bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 
                    text-gray-200 transition-all duration-200 relative group/btn`}>
                    {isComplete ? (
                      <><CheckCircle size={16} className="text-emerald-400" /> Review Mission</>
                    ) : isStarted ? (
                      <>Continue Mission <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" /></>
                    ) : (
                      <>Begin Mission <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500"
        >
          {[
            { label: 'Total Questions', value: `${domainList.reduce((a, d) => a + d.curriculumMatrix.length, 0)}` },
            { label: 'Mission Domains', value: `${domainList.length}` },
            { label: 'SQL Concepts', value: '30+' },
            { label: 'Progress Saved', value: 'Locally' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
              <div className="text-xs font-mono uppercase tracking-widest text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
