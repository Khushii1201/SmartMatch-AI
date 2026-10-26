import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { GapAnalysisReport } from '../types';
import { MatchStatusBadge } from '../components/SkillStatusBadge';
import { CardSkeleton } from '../components/LoadingSkeleton';

export const SkillGapPage: React.FC = () => {
  const { activeCandidate, lastMatchReport, setCurrentPage, addToast } = useApp();
  const [gapReport, setGapReport] = useState<GapAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useEffect(() => {
    async function loadGapAnalysis() {
      if (!activeCandidate || !lastMatchReport) {
        setGapReport(null);
        return;
      }
      setIsLoading(true);
      try {
        const data = await api.getGapAnalysis(activeCandidate.id, lastMatchReport.job_id);
        setGapReport(data);
        if (data.recommendations.length > 0) {
          setExpandedSkill(data.recommendations[0].skill_name);
        }
      } catch (err: any) {
        addToast({ type: 'error', title: 'Gap analysis failed', message: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadGapAnalysis();
  }, [activeCandidate, lastMatchReport, addToast]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-emerald-400" />
          <span>Skill-Gap Analysis & Learning Priorities</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Objective gap isolation prioritized by{' '}
          <code>Job Importance &times; (10 &minus; Proficiency)</code> with curated learning tracks.
        </p>
      </div>

      {!activeCandidate || !lastMatchReport ? (
        <div className="glass-panel rounded-2xl p-10 text-center border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Recent Match to Analyze</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please run an AI match on the Matching Dashboard first to generate the skill-gap evaluation and personalized learning roadmap.
          </p>
          <button
            onClick={() => setCurrentPage('matching')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <span>Go to Matching Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      ) : gapReport ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Active Job Target Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Target Role
              </span>
              <h3 className="text-sm font-bold text-white">{gapReport.job_title}</h3>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Overall Alignment
              </span>
              <div className="text-base font-bold font-mono text-indigo-400">
                {gapReport.overall_score.toFixed(1)} / 100
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Strong Matches vs Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Strong Matches */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Strong Matches ({gapReport.matched_skills.length})</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Solid Alignment
                </span>
              </div>

              {gapReport.matched_skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">No strong matches recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {gapReport.matched_skills.map((skill) => (
                    <div
                      key={skill.skill_name}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{skill.skill_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Proficiency: <strong className="text-indigo-300">{skill.candidate_proficiency}/10</strong> &bull; Importance: <strong className="text-cyan-300">{skill.job_importance}/10</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {skill.suitability_score.toFixed(0)}/100
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">suitability</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Gaps to Address */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Gaps to Address ({gapReport.gaps.length})</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Prioritized by Impact
                </span>
              </div>

              {gapReport.gaps.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                  Outstanding! Zero skill gaps identified for this role.
                </div>
              ) : (
                <div className="space-y-3">
                  {gapReport.gaps.map((gap) => (
                    <div
                      key={gap.skill_name}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/30 transition-all flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MatchStatusBadge status={gap.status} size="sm" />
                          <h4 className="text-xs font-bold text-white">{gap.skill_name}</h4>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              gap.mandatory
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {gap.mandatory ? 'Mandatory' : 'Preferred'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Your proficiency: <strong className="text-indigo-300">{gap.candidate_proficiency}/10</strong> &bull; Importance: <strong className="text-cyan-300">{gap.job_importance}/10</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-rose-400 block">
                          Priority {gap.priority_score.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-500">imp &times; gap</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Learning Priorities */}
          {gapReport.recommendations.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>Curated Learning Recommendations</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hand-curated documentation, courses, and tutorials mapped from <code>data/learning_resources.json</code>.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {gapReport.recommendations.map((rec) => {
                  const isExpanded = expandedSkill === rec.skill_name;
                  return (
                    <div
                      key={rec.skill_name}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all"
                    >
                      <div
                        onClick={() => setExpandedSkill(isExpanded ? null : rec.skill_name)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs md:text-sm font-bold text-white">
                              {rec.skill_name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Priority Score: <strong className="text-rose-400">{rec.priority_score.toFixed(0)}</strong> &bull;{' '}
                              {rec.mandatory ? 'Mandatory Requirement' : 'Preferred Skill'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono font-medium text-slate-400">
                            {rec.resources.length} resource{rec.resources.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
                          {rec.resources.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              No curated resources on file for this specific skill yet.
                            </p>
                          ) : (
                            rec.resources.map((res, rIdx) => (
                              <a
                                key={rIdx}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
                              >
                                <div className="space-y-0.5">
                                  <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                                    <span>{res.title}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                                    {res.url}
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700/60">
                                  {res.type}
                                </span>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
