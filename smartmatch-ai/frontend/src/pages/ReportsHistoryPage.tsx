import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Download,
  Calendar,
  Briefcase,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SessionSummary, SessionDetail } from '../types';
import { MatchStatusBadge } from '../components/SkillStatusBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const ReportsHistoryPage: React.FC = () => {
  const { activeCandidate, addToast } = useApp();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);
      try {
        const list = await api.listSessions(activeCandidate?.id);
        setSessions(list);
        if (list.length > 0 && selectedSessionId === null) {
          setSelectedSessionId(list[0].id);
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to load sessions', message: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, [activeCandidate, addToast]);

  // Load session detail whenever selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      return;
    }
    async function loadDetail() {
      setIsLoadingDetail(true);
      try {
        const detail = await api.getSessionDetail(selectedSessionId!);
        setSessionDetail(detail);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to load session details', message: err.message });
      } finally {
        setIsLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedSessionId, addToast]);

  const handleDownloadSessionCsv = async (sessionId: number) => {
    setIsExporting(true);
    try {
      await api.downloadSessionCsv(sessionId);
      addToast({ type: 'success', title: 'CSV Downloaded' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to export CSV', message: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare line chart data (chronological order)
  const chartData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((s) => ({
        date: new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: new Date(s.created_at).toLocaleString(),
        score: Math.round(s.overall_score),
        job: s.job_title,
      }));
  }, [sessions]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <History className="w-7 h-7 text-indigo-400" />
          <span>Match Reports & History</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Historical record of fuzzy match evaluations, alignment trends, and downloadable CSV audit reports.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} rows={4} />
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
          <History className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-bold text-white">No Match Sessions Recorded</h3>
          <p className="text-xs text-slate-400 mt-1">
            Run a match on the Matching Dashboard to generate sessions and track historical alignment scores.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Trend Line Chart */}
          {chartData.length > 1 && (
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>Score History Over Time</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evolution of overall alignment score across consecutive sessions.
                  </p>
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white">{data.job}</p>
                              <p className="text-indigo-400 font-mono font-bold">
                                Score: {data.score} / 100
                              </p>
                              <p className="text-slate-400 text-[10px]">{data.fullDate}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#818cf8', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sessions Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">Recorded Match Sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Job Role</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {sessions.map((s) => {
                    const isSelected = selectedSessionId === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/40 text-white'
                            : 'hover:bg-slate-850/40 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-400">#{s.id}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{new Date(s.created_at).toLocaleString()}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{s.candidate_name}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{s.job_title}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-extrabold text-white text-sm">
                          {s.overall_score.toFixed(1)} / 100
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSessionCsv(s.id);
                            }}
                            disabled={isExporting}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Export session CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Session Detail Breakdown Card */}
          {selectedSessionId && (
            <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Session #{selectedSessionId} Skill Breakdown</span>
                  </h3>
                  {sessionDetail && (
                    <p className="text-xs text-slate-400">
                      {sessionDetail.session.candidate_name} &bull; {sessionDetail.session.job_title} &bull; Score:{' '}
                      <strong className="text-indigo-400">
                        {sessionDetail.session.overall_score.toFixed(1)}/100
                      </strong>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSessionCsv(selectedSessionId)}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download This Session CSV</span>
                </button>
              </div>

              {isLoadingDetail ? (
                <TableSkeleton cols={5} rows={3} />
              ) : sessionDetail ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                        <th className="py-2.5 px-3">Skill</th>
                        <th className="py-2.5 px-3">Candidate Proficiency</th>
                        <th className="py-2.5 px-3">Job Importance</th>
                        <th className="py-2.5 px-3">Suitability Score</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-medium">
                      {sessionDetail.results.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-bold text-white">{r.skill_name}</td>
                          <td className="py-2.5 px-3 font-mono text-indigo-300">
                            {r.candidate_proficiency} / 10
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300">
                            {r.job_importance} / 10
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            {r.suitability_score.toFixed(1)} / 100
                          </td>
                          <td className="py-2.5 px-3">
                            <MatchStatusBadge status={r.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
