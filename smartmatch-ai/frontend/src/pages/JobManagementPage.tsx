import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Job, SampleJob, JobRequirement } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const JobManagementPage: React.FC = () => {
  const { addToast } = useApp();

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [sampleJobs, setSampleJobs] = useState<SampleJob[]>([]);

  // Form State
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [draftRequirements, setDraftRequirements] = useState<
    (JobRequirement & { included: boolean })[]
  >([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Extra skill adder state
  const [canonicalSkills, setCanonicalSkills] = useState<string[]>([]);
  const [extraSkillSelect, setExtraSkillSelect] = useState('');
  const [extraSkillSearch, setExtraSkillSearch] = useState('');

  // Expanded jobs accordion
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // Load jobs and sample jobs on mount
  useEffect(() => {
    fetchJobs();
    loadSamplesAndSkills();
  }, []);

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const list = await api.listJobs();
      setJobs(list);
      if (list.length > 0 && expandedJobId === null) {
        setExpandedJobId(list[0].id);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load jobs', message: err.message });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const loadSamplesAndSkills = async () => {
    try {
      const [samples, skills] = await Promise.all([
        api.getSampleJobs(),
        api.getCanonicalSkills(),
      ]);
      setSampleJobs(samples);
      setCanonicalSkills(skills);
    } catch {
      // quiet
    }
  };

  // Load a sample job into the builder form
  const handleLoadSample = (sample: SampleJob) => {
    setJobTitle(sample.title);
    setJobDescription(sample.description);
    setDraftRequirements(
      sample.requirements.map((r) => ({
        skill_name: r.skill_name,
        importance: r.importance,
        mandatory: r.mandatory,
        included: true,
      }))
    );
    addToast({
      type: 'info',
      title: 'Sample Job Loaded',
      message: `Loaded template: '${sample.title}' with ${sample.requirements.length} skill requirements.`,
    });
  };

  // Extract candidate requirements from job description text
  const handleExtractFromText = async () => {
    if (!jobDescription.trim()) {
      addToast({ type: 'error', title: 'Please paste a job description first.' });
      return;
    }
    setIsExtracting(true);
    try {
      const res = await api.extractRequirements(jobDescription);
      if (res.suggested_requirements.length === 0) {
        addToast({
          type: 'info',
          title: 'No matching skills found',
          message: 'Try adding skills manually using the search box below.',
        });
      } else {
        setDraftRequirements(
          res.suggested_requirements.map((r) => ({
            ...r,
            included: true,
          }))
        );
        addToast({
          type: 'success',
          title: 'Skill Requirements Extracted',
          message: `Identified ${res.suggested_requirements.length} candidate skills from text.`,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Extraction failed', message: err.message });
    } finally {
      setIsExtracting(false);
    }
  };

  // Add extra skill requirement
  const handleAddExtraSkill = () => {
    if (!extraSkillSelect) return;
    if (draftRequirements.some((r) => r.skill_name === extraSkillSelect)) {
      addToast({ type: 'info', title: 'Skill already added to requirements.' });
      return;
    }
    setDraftRequirements((prev) => [
      ...prev,
      { skill_name: extraSkillSelect, importance: 5, mandatory: true, included: true },
    ]);
    setExtraSkillSelect('');
    setExtraSkillSearch('');
  };

  // Save Job to Database
  const handleSaveJob = async () => {
    if (!jobTitle.trim()) {
      addToast({ type: 'error', title: 'Job title cannot be empty.' });
      return;
    }

    const finalReqs = draftRequirements.filter((r) => r.included);
    if (finalReqs.length === 0) {
      addToast({
        type: 'error',
        title: 'Please include at least one skill requirement before saving.',
      });
      return;
    }

    setIsSavingJob(true);
    try {
      const created = await api.createJob(
        jobTitle.trim(),
        jobDescription.trim(),
        finalReqs.map((r) => ({
          skill_name: r.skill_name,
          importance: r.importance,
          mandatory: r.mandatory,
        }))
      );
      addToast({
        type: 'success',
        title: 'Job Saved',
        message: `'${created.title}' saved with ${created.requirements.length} requirements.`,
      });

      // Reset form
      setJobTitle('');
      setJobDescription('');
      setDraftRequirements([]);
      await fetchJobs();
      setExpandedJobId(created.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to save job', message: err.message });
    } finally {
      setIsSavingJob(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete job "${title}"?`)) return;
    try {
      await api.deleteJob(jobId);
      addToast({ type: 'info', title: `Job '${title}' deleted.` });
      await fetchJobs();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to delete job', message: err.message });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-cyan-400" />
          <span>Job Description Management</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Create target job descriptions, extract skill requirements, and calibrate importance weights for fuzzy matching.
        </p>
      </div>

      {/* Sample Job Presets Loader */}
      {sampleJobs.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load Sample Job Template</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quick-start with ready-made fictional roles from <code>data/sample_jobs.json</code>.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sampleJobs.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job Definition Form */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Step 1 — Job Title & Description</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Provide the job title and paste the full job posting text below.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Job Title *</label>
            <input
              type="text"
              placeholder="e.g. Senior Machine Learning Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Job Description Text
            </label>
            <textarea
              rows={5}
              placeholder="Paste job posting details here (e.g. responsibilities, technical stack, required qualifications)..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleExtractFromText}
            disabled={isExtracting || !jobDescription.trim()}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isExtracting ? 'Scanning text...' : 'Extract Candidate Requirements from Description'}</span>
          </button>
        </div>

        {/* Step 2: Requirements Customizer */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Step 2 — Calibrate Skill Requirements & Importance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set importance weight (0-10) for each requirement and toggle whether it is Mandatory or Preferred.
            </p>
          </div>

          {draftRequirements.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
              No skill requirements drafted yet. Click &quot;Extract Candidate Requirements&quot; above, load a sample, or add skills manually below.
            </div>
          ) : (
            <div className="space-y-3">
              {draftRequirements.map((req, idx) => (
                <div
                  key={`${req.skill_name}-${idx}`}
                  className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    req.included
                      ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                      : 'bg-slate-950/40 border-slate-850 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={req.included}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setDraftRequirements((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, included: val } : r))
                        );
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white">{req.skill_name}</span>
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {req.mandatory ? 'Mandatory' : 'Preferred'}
                      </span>
                    </div>
                  </div>

                  {req.included && (
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      {/* Importance Slider */}
                      <div className="flex items-center gap-2.5">
                        <label htmlFor={`draft-imp-${idx}-${req.skill_name}`} className="text-[11px] text-slate-400 font-medium">Importance:</label>
                        <input
                          id={`draft-imp-${idx}-${req.skill_name}`}
                          type="range"
                          min="0"
                          max="10"
                          value={req.importance}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDraftRequirements((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, importance: val } : r))
                            );
                          }}
                          className="w-24 accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                        />
                        <span className="font-mono text-xs font-bold text-cyan-300 w-8 text-right">
                          {req.importance}/10
                        </span>
                      </div>

                      {/* Mandatory Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setDraftRequirements((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, mandatory: !r.mandatory } : r))
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          req.mandatory
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {req.mandatory ? 'Mandatory' : 'Preferred'}
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() =>
                          setDraftRequirements((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add extra skill to requirements */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search canonical skill to add (e.g. Kubernetes, SQL, PyTorch)..."
                value={extraSkillSearch}
                onChange={(e) => setExtraSkillSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleAddExtraSkill}
              disabled={!extraSkillSelect}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Requirements</span>
            </button>
          </div>

          {/* Filtered suggestions chips */}
          {extraSkillSearch && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800 max-h-28 overflow-y-auto">
              {canonicalSkills
                .filter((s) => s.toLowerCase().includes(extraSkillSearch.toLowerCase()))
                .slice(0, 15)
                .map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      setExtraSkillSelect(skill);
                      setExtraSkillSearch(skill);
                    }}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      extraSkillSelect === skill
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSaveJob}
              disabled={isSavingJob}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingJob ? 'Saving Job...' : 'Save Job to Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Jobs Accordion List */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Saved Target Jobs ({jobs.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Expand any job to review its full requirement breakdown or delete it.
          </p>
        </div>

        {isLoadingJobs ? (
          <TableSkeleton cols={3} rows={3} />
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No jobs saved yet. Create a job or load a sample above!
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        #{job.id}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{job.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {job.requirements.length} skill requirements &bull; Created{' '}
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id, job.title);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
                      {job.description && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Description:
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                            {job.description}
                          </p>
                        </div>
                      )}

                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Skill Requirements:
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                                <th className="py-2 px-3">Skill</th>
                                <th className="py-2 px-3">Importance (0-10)</th>
                                <th className="py-2 px-3">Requirement Type</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {job.requirements.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-900/40">
                                  <td className="py-2 px-3 font-semibold text-white">
                                    {r.skill_name}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-cyan-300 font-bold">
                                    {r.importance}/10
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        r.mandatory
                                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {r.mandatory ? 'Mandatory' : 'Preferred'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
