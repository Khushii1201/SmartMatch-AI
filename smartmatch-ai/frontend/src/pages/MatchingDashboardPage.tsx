import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Play,
  Download,
  AlertCircle,
  TrendingUp,
  Briefcase,
  ChevronRight,
  User,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Job, MatchReport } from '../types';
import { ScoreGauge } from '../components/ScoreGauge';
import { MatchStatusBadge } from '../components/SkillStatusBadge';
import { ExplainabilityBanner } from '../components/ExplainabilityBanner';
import { CardSkeleton, GaugeSkeleton } from '../components/LoadingSkeleton';

export const MatchingDashboardPage: React.FC = () => {
  const {
    activeCandidate,
    setCurrentPage,
    lastMatchReport,
    setLastMatchReport,
    addToast,
  } = useApp();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | ''>('');
  const [isRunningMatch, setIsRunningMatch] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Load jobs list
  useEffect(() => {
    async function loadJobs() {
      setIsLoadingJobs(true);
      try {
        const list = await api.listJobs();
        setJobs(list);
        if (list.length > 0 && selectedJobId === '') {
          setSelectedJobId(list[0].id);
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to load jobs', message: err.message });
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  // When activeCandidate changes, check if lastMatchReport matches
  const currentReport: MatchReport | null = useMemo(() => {
    if (!lastMatchReport || !activeCandidate) return null;
    if (lastMatchReport.candidate_id !== activeCandidate.id) return null;
    return lastMatchReport;
  }, [lastMatchReport, activeCandidate]);

  // Run AI Fuzzy Match
  const handleRunMatch = async () => {
    if (!activeCandidate) {
      addToast({ type: 'error', title: 'Please select an active candidate first.' });
      return;
    }
    if (!selectedJobId) {
      addToast({ type: 'error', title: 'Please select a job target.' });
      return;
    }

    setIsRunningMatch(true);
    try {
      const report = await api.runMatch(activeCandidate.id, selectedJobId as number);
      setLastMatchReport(report);
      addToast({
        type: 'success',
        title: 'Match Engine Complete',
        message: `Calculated alignment score of ${report.overall_score.toFixed(1)}/100 for '${report.job_title}'.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Matching failed', message: err.message });
    } finally {
      setIsRunningMatch(false);
    }
  };

  // Export CSV
  const handleDownloadCsv = async () => {
    if (!currentReport || !activeCandidate) return;
    setIsExportingCsv(true);
    try {
      const filename = `smartmatch_${activeCandidate.name}_${currentReport.job_title}.csv`.replace(
        /\s+/g,
        '_'
      );
      await api.downloadMatchCsv(activeCandidate.id, currentReport.job_id, filename);
      addToast({ type: 'success', title: 'CSV Downloaded' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'CSV export failed', message: err.message });
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Prepare chart data (sorted by suitability score ascending for horizontal bar chart)
  const chartData = useMemo(() => {
    if (!currentReport) return [];
    return [...currentReport.skill_results]
      .sort((a, b) => a.suitability_score - b.suitability_score)
      .map((r) => ({
        skill: r.skill_name,
        suitability: Math.round(r.suitability_score),
        status: r.status,
        proficiency: r.candidate_proficiency,
        importance: r.job_importance,
        color:
          r.status === 'matched'
            ? '#10b981'
            : r.status === 'weak'
            ? '#f59e0b'
            : '#f43f5e',
      }));
  }, [currentReport]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Target className="w-7 h-7 text-indigo-400" />
          <span>AI Matching Dashboard</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Non-linear fuzzy logic inference engine calculating overall skill-alignment and per-skill suitability.
        </p>
      </div>

      {/* Mandatory Transparency Note */}
      <ExplainabilityBanner />

      {/* Match Setup Controls */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Active Candidate */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Candidate Profile</span>
            </label>
            {activeCandidate ? (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-bold text-white flex items-center justify-between">
                <span>{activeCandidate.name}</span>
                <span className="text-[11px] text-indigo-400 font-mono">ID #{activeCandidate.id}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentPage('profile')}
                className="w-full p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-950/30 transition-colors text-left"
              >
                + Select or create a candidate
              </button>
            )}
          </div>

          {/* Job Target */}
          <div>
            <label htmlFor="target-job-role-select" className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target Job Role</span>
            </label>
            <select
              id="target-job-role-select"
              aria-label="Target Job Role"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(Number(e.target.value))}
              disabled={isLoadingJobs || jobs.length === 0}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 cursor-pointer"
            >
              {jobs.length === 0 ? (
                <option value="">No jobs found. Add one in Job Management</option>
              ) : (
                jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.requirements.length} requirements)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Run Match Button */}
          <div>
            <button
              onClick={handleRunMatch}
              disabled={isRunningMatch || !activeCandidate || !selectedJobId}
              className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs md:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunningMatch ? 'Executing Fuzzy Engine...' : 'Run AI Match'}</span>
            </button>
          </div>
        </div>

        {jobs.length === 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You have no jobs saved yet. Go to{' '}
              <button
                onClick={() => setCurrentPage('jobs')}
                className="underline font-bold hover:text-white"
              >
                Job Management
              </button>{' '}
              to add or load sample roles.
            </span>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {isRunningMatch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <GaugeSkeleton />
          </div>
          <div className="md:col-span-2">
            <CardSkeleton rows={4} />
          </div>
        </div>
      )}

      {/* Results View */}
      {!isRunningMatch && currentReport && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Row: Overall Score Gauge + Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Gauge */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Overall Alignment
              </h3>
              <ScoreGauge score={currentReport.overall_score} size={240} />
            </div>

            {/* Match Overview Summary */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 md:col-span-2 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Match Report for:
                    </span>
                    <h3 className="text-lg font-bold text-white">{currentReport.job_title}</h3>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Session #{currentReport.session_id}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Strong Matches</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {currentReport.skill_results.filter((s) => s.status === 'matched').length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Weak Matches</span>
                    <span className="text-xl font-bold font-mono text-amber-400">
                      {currentReport.skill_results.filter((s) => s.status === 'weak').length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Missing Skills</span>
                    <span className="text-xl font-bold font-mono text-rose-400">
                      {currentReport.skill_results.filter((s) => s.status === 'missing').length}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                  {currentReport.disclaimer}
                </p>
              </div>

              {/* Actions: Export CSV & View Gap Analysis */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleDownloadCsv}
                  disabled={isExportingCsv}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingCsv ? 'Exporting...' : 'Download Report CSV'}</span>
                </button>

                <button
                  onClick={() => setCurrentPage('gaps')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Explore Skill-Gap Breakdown</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart: Fuzzy Suitability Score per Skill */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Fuzzy Suitability Score per Skill</span>
              </h3>
              <p className="text-xs text-slate-400">
                Non-linear membership evaluation output (0-100) per requirement.
              </p>
            </div>

            <div style={{ width: '100%', height: Math.max(280, chartData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    stroke="#e2e8f0"
                    tick={{ fontSize: 12, fill: '#f1f5f9' }}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
                            <p className="font-bold text-white">{data.skill}</p>
                            <p className="text-slate-300">
                              Suitability: <strong className="text-indigo-400">{data.suitability}/100</strong>
                            </p>
                            <p className="text-slate-400">
                              Candidate Proficiency: {data.proficiency}/10
                            </p>
                            <p className="text-slate-400">
                              Job Importance: {data.importance}/10
                            </p>
                            <p className="text-slate-400 capitalize">
                              Status: <span style={{ color: data.color }}>{data.status}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="suitability" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Skill Breakdown Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Skill-by-Skill Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                    <th className="py-3 px-4">Skill</th>
                    <th className="py-3 px-4">Candidate Proficiency (0-10)</th>
                    <th className="py-3 px-4">Job Importance (0-10)</th>
                    <th className="py-3 px-4">Mandatory</th>
                    <th className="py-3 px-4">Suitability Score</th>
                    <th className="py-3 px-4">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {currentReport.skill_results.map((r) => (
                    <tr key={r.skill_name} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{r.skill_name}</td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-bold ${
                            r.candidate_proficiency > 0 ? 'text-indigo-300' : 'text-slate-500'
                          }`}
                        >
                          {r.candidate_proficiency} / 10
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300">{r.job_importance} / 10</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            r.mandatory
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {r.mandatory ? 'Mandatory' : 'Preferred'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm">
                        {r.suitability_score.toFixed(1)} / 100
                      </td>
                      <td className="py-3 px-4">
                        <MatchStatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State before running match */}
      {!isRunningMatch && !currentReport && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Ready to Run AI Matching</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select a target job from the dropdown above and click &quot;Run AI Match&quot; to calculate the explainable skill-alignment report.
          </p>
        </div>
      )}
    </div>
  );
};
