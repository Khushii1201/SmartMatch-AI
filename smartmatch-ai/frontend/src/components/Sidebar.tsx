import React from 'react';
import {
  Home,
  User,
  Briefcase,
  Target,
  Sparkles,
  GitCompare,
  History,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    activeCandidate,
    setActiveCandidate,
    candidates,
    isBackendHealthy,
  } = useApp();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home Overview', icon: Home },
    { id: 'profile', label: 'Candidate Profile', icon: User },
    { id: 'jobs', label: 'Job Management', icon: Briefcase },
    { id: 'matching', label: 'AI Matching Dashboard', icon: Target },
    { id: 'gaps', label: 'Skill-Gap Analysis', icon: Sparkles },
    { id: 'comparison', label: 'Job Comparison', icon: GitCompare },
    { id: 'reports', label: 'Reports & History', icon: History },
  ];

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 flex flex-col glass-panel border-r border-slate-800/80 z-40 overflow-hidden">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-white tracking-tight">SmartMatch</h1>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Fuzzy Logic Job-Skill Engine</p>
          </div>
        </div>
      </div>

      {/* Active Candidate Quick Widget */}
      <div className="px-4 py-3 border-b border-slate-800/70 bg-slate-900/40">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Active Candidate</span>
          <button
            onClick={() => setCurrentPage('profile')}
            className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-[11px]"
            title="Create candidate"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {activeCandidate ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-bold">
                {activeCandidate.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{activeCandidate.name}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setCurrentPage('profile')}
            className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs cursor-pointer hover:bg-amber-950/30 transition-colors"
          >
            No candidate selected. Click here to create or select one.
          </div>
        )}

        {/* Candidate Switcher dropdown if candidates exist */}
        {candidates.length > 0 && (
          <div className="mt-2 relative">
            <label htmlFor="candidate-switcher" className="sr-only">Switch Candidate</label>
            <select
              id="candidate-switcher"
              aria-label="Switch Candidate"
              value={activeCandidate ? activeCandidate.id : ''}
              onChange={(e) => {
                const selected = candidates.find((c) => c.id.toString() === e.target.value);
                setActiveCandidate(selected || null);
              }}
              className="w-full text-xs bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none pr-7"
            >
              <option value="" disabled>Switch candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group text-left ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                }`}
              />
              <span className="flex-1">{item.label}</span>
              {item.id === 'matching' && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Fuzzy
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          {isBackendHealthy ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>API: {isBackendHealthy ? 'FastAPI Online' : 'Connecting...'}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">v2.0 (React)</span>
      </div>
    </aside>
  );
};
