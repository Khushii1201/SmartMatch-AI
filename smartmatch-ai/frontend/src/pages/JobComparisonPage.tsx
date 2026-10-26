import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  Play,
  Briefcase,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Job, JobComparisonReport } from '../types';
import { MatchStatusBadge } from '../components/SkillStatusBadge';
import { ExplainabilityBanner } from '../components/ExplainabilityBanner';
import { CardSkeleton, TableSkeleton } from '../components/LoadingSkeleton';

export const JobComparisonPage: React.FC = () => {
  const { activeCandidate, addToast } = useApp();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [comparisonReport, setComparisonReport] = useState<JobComparisonReport | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  useEffect(() => {
    async function loadJobs() {
      setIsLoadingJobs(true);
      try {
        const list = await api.listJobs();
        setJobs(list);
        // Default select up to 3 jobs
        if (list.length > 0) {
          setSelectedJobIds(list.slice(0, 3).map((j) => j.id));
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to load jobs', message: err.message });
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, [addToast]);

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleRunComparison = async () => {
    if (!activeCandidate) {
      addToast({ type: 'error', title: 'Please select an active candidate first.' });
      return;
    }
    if (selectedJobIds.length === 0) {
      addToast({ type: 'error', title: 'Select at least one job to compare.' });
      return;
    }

    setIsComparing(true);
    try {
      const res = await api.compareJobs(activeCandidate.id, selectedJobIds);
      setComparisonReport(res);
      addToast({
        type: 'success',
        title: 'Comparison Complete',
        message: `Ranked ${res.results.length} job(s) for ${activeCandidate.name}.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Comparison failed', message: err.message });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <GitCompare className="w-7 h-7 text-indigo-400" />
          <span>Multi-Job Alignment Comparison</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Evaluate an active candidate across multiple job roles simultaneously to determine best-fit career tracks.
        </p>
      </div>

      <ExplainabilityBanner />

      {/* Job Multi-Selector Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span>Select Jobs to Compare ({selectedJobIds.length} selected)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click jobs to toggle selection, then run the multi-role evaluation.
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isComparing || !activeCandidate || selectedJobIds.length === 0}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-40 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isComparing ? 'Evaluating Roles...' : 'Compare Selected Jobs'}</span>
          </button>
        </div>

        {isLoadingJobs ? (
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-800 rounded-xl animate-pulse" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No jobs found. Create jobs in Job Management first.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {jobs.map((job) => {
              const isSelected = selectedJobIds.includes(job.id);
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => toggleJobSelection(job.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-cyan-300' : 'bg-slate-500'
                    }`}
                  />
                  <span>{job.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({job.requirements.length} reqs)
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {isComparing && (
        <div className="space-y-6">
          <CardSkeleton rows={3} />
          <TableSkeleton cols={5} rows={3} />
        </div>
      )}

      {/* Comparison Results */}
      {!isComparing && comparisonReport && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Comparative Bar Chart */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Overall Alignment Score by Job Role</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Weighted fuzzy suitability score comparison (0-100 scale).
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonReport.results.map((r) => ({
                    job: r.job_title,
                    score: Math.round(r.overall_score),
                  }))}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="job" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#f1f5f9' }} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
                            <p className="font-bold text-white">{payload[0].payload.job}</p>
                            <p className="text-indigo-400 font-mono font-bold">
                              Score: {payload[0].value} / 100
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {comparisonReport.results.map((entry, index) => (
                      <Cell
                        key={`comp-cell-${index}`}
                        fill={
                          entry.overall_score >= 75
                            ? '#10b981'
                            : entry.overall_score >= 50
                            ? '#6366f1'
                            : '#f43f5e'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranked Comparison Results Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">
              Ranked Comparison Summary (Sorted by Match Score)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Target Job</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Strong Matches</th>
                    <th className="py-3 px-4">Gaps</th>
                    <th className="py-3 px-4">Top Priority Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {comparisonReport.results.map((item, idx) => (
                    <tr key={item.job_id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">#{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-white">{item.job_title}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-extrabold text-white">
                          {item.overall_score.toFixed(1)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">/100</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-mono font-semibold">
                        {item.strong_matches_count}
                      </td>
                      <td className="py-3 px-4 text-rose-400 font-mono font-semibold">
                        {item.gaps_count}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-amber-300">
                          {item.top_priority_gap}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Skill Breakdown Expander per Job */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Detailed Per-Job Skill Breakdown</h3>
            <div className="space-y-3">
              {comparisonReport.results.map((item) => {
                const isExpanded = expandedJobId === item.job_id;
                return (
                  <div
                    key={item.job_id}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedJobId(isExpanded ? null : item.job_id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{item.job_title}</span>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded">
                          {item.overall_score.toFixed(1)}/100
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{item.skill_results.length} skills</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                                <th className="py-2 px-3">Skill</th>
                                <th className="py-2 px-3">Proficiency</th>
                                <th className="py-2 px-3">Importance</th>
                                <th className="py-2 px-3">Suitability</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {item.skill_results.map((s) => (
                                <tr key={s.skill_name} className="hover:bg-slate-900/40">
                                  <td className="py-2 px-3 font-semibold text-white">
                                    {s.skill_name}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-indigo-300">
                                    {s.candidate_proficiency}/10
                                  </td>
                                  <td className="py-2 px-3 font-mono text-cyan-300">
                                    {s.job_importance}/10
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold">
                                    {s.suitability_score.toFixed(1)}/100
                                  </td>
                                  <td className="py-2 px-3">
                                    <MatchStatusBadge status={s.status} size="sm" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
