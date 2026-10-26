import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Sparkles } from 'lucide-react';
import type { PageId } from '../types';

const PAGE_TITLES: Record<PageId, string> = {
  home: 'Home Overview',
  profile: 'Candidate Profile',
  jobs: 'Job Management',
  matching: 'AI Matching Dashboard',
  gaps: 'Skill-Gap Analysis',
  comparison: 'Job Comparison',
  reports: 'Reports & History',
};

export const Navbar: React.FC = () => {
  const { currentPage, activeCandidate, setCurrentPage } = useApp();

  return (
    <header className="h-16 shrink-0 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">SmartMatch AI</span>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-xs font-bold text-white tracking-wide">
          {PAGE_TITLES[currentPage]}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {activeCandidate ? (
          <button
            onClick={() => setCurrentPage('profile')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-xs transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
              {activeCandidate.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-slate-200 font-semibold">{activeCandidate.name}</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage('profile')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Select Candidate Profile</span>
          </button>
        )}

        <button
          onClick={() => setCurrentPage('matching')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Match</span>
        </button>
      </div>
    </header>
  );
};
