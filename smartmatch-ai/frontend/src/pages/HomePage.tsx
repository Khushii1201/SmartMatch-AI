import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  UserCheck,
  Briefcase,
  Target,
  Brain,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExplainabilityBanner } from '../components/ExplainabilityBanner';
import { api } from '../services/api';

export const HomePage: React.FC = () => {
  const { setCurrentPage, activeCandidate } = useApp();
  const [stats, setStats] = useState({
    candidatesCount: 0,
    jobsCount: 0,
    sessionsCount: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [candList, jobList, sessionList] = await Promise.all([
          api.listCandidates(),
          api.listJobs(),
          api.listSessions(),
        ]);
        setStats({
          candidatesCount: candList.length,
          jobsCount: jobList.length,
          sessionsCount: sessionList.length,
        });
      } catch {
        // quiet fallback
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 md:p-12 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fuzzy-Logic Job-Skill Matcher & Gap Analysis</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Match talent to roles with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300">
              Explainable AI
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            SmartMatch AI compares a candidate’s skills against real job descriptions using
            <strong> fuzzy logic inference</strong>—not simplistic keyword counts. It evaluates
            skill suitability, isolates priority learning gaps, and provides verified learning resources.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentPage('matching')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Run AI Matching</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage('profile')}
              className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs md:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>{activeCandidate ? `Active: ${activeCandidate.name}` : 'Setup Candidate Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Explainability Banner */}
      <ExplainabilityBanner />

      {/* Live System Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{stats.candidatesCount}</div>
            <div className="text-xs text-slate-400 font-medium">Candidate Profiles</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{stats.jobsCount}</div>
            <div className="text-xs text-slate-400 font-medium">Saved Job Targets</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{stats.sessionsCount}</div>
            <div className="text-xs text-slate-400 font-medium">Match Sessions Run</div>
          </div>
        </div>
      </div>

      {/* How it Works: 3 Steps */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">How SmartMatch AI Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => setCurrentPage('profile')}
            className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold font-mono text-sm mb-4 group-hover:scale-110 transition-transform">
              1
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Build a Profile
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Upload your PDF resume to automatically extract skills or add them manually. Set your proficiency from 0 to 10 for each skill.
            </p>
          </div>

          <div
            onClick={() => setCurrentPage('jobs')}
            className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm mb-4 group-hover:scale-110 transition-transform">
              2
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Define Jobs
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Paste job descriptions or load pre-built sample roles. SmartMatch extracts required skills with customizable importance (0–10) and mandatory flags.
            </p>
          </div>

          <div
            onClick={() => setCurrentPage('matching')}
            className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold font-mono text-sm mb-4 group-hover:scale-110 transition-transform">
              3
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Get Matched & Gap Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Our Scikit-Fuzzy engine computes non-linear skill suitability, aggregates a weighted alignment score, and pinpoints prioritized learning gaps.
            </p>
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Core Engine Principles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white">Continuous Fuzzy Logic:</strong> Avoids rigid boolean pass/fail cutoffs. A candidate with proficiency 7 on a requirement of 8 scores high partial suitability.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Brain className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white">Pattern Traceability:</strong> Every extracted skill is tagged as explicit (literal keyword) or synonym (normalized alias) with evidence text.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white">Zero Hallucination:</strong> All recommendations are derived from curated learning resources—no fake courses are invented client-side.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white">Objective Gap Priority:</strong> Prioritized as <code>importance × (10 - proficiency)</code>, ensuring critical missing requirements rank highest.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
