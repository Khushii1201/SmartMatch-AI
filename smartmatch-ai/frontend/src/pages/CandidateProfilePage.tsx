import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Upload,
  Plus,
  Trash2,
  FileText,
  Search,
  Check,
  CheckCircle2,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { CandidateSkill, ExtractedSkillItem } from '../types';
import { SourceBadge } from '../components/SkillStatusBadge';
import { TableSkeleton } from '../components/LoadingSkeleton';

export const CandidateProfilePage: React.FC = () => {
  const {
    activeCandidate,
    setActiveCandidate,
    candidates,
    refreshCandidates,
    addToast,
  } = useApp();

  // New Candidate creation state
  const [newCandidateName, setNewCandidateName] = useState('');
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false);

  // Resume Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [extractedResumeText, setExtractedResumeText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [pendingSkills, setPendingSkills] = useState<
    (ExtractedSkillItem & { selected: boolean; proficiency: number })[]
  >([]);

  // Canonical skills list for search
  const [canonicalSkills, setCanonicalSkills] = useState<string[]>([]);
  const [manualSkillSearch, setManualSkillSearch] = useState('');
  const [selectedManualSkill, setSelectedManualSkill] = useState('');
  const [manualProficiency, setManualProficiency] = useState(7);
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Saved skills for active candidate
  const [savedSkills, setSavedSkills] = useState<CandidateSkill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Load canonical skills on mount
  useEffect(() => {
    async function loadCanonical() {
      try {
        const list = await api.getCanonicalSkills();
        setCanonicalSkills(list);
      } catch {
        // quiet
      }
    }
    loadCanonical();
  }, []);

  // Load candidate saved skills
  useEffect(() => {
    if (!activeCandidate) {
      setSavedSkills([]);
      return;
    }
    let isCancelled = false;
    async function fetchSkills() {
      setIsLoadingSkills(true);
      try {
        const skills = await api.getCandidateSkills(activeCandidate!.id);
        if (!isCancelled) {
          setSavedSkills(skills);
        }
      } catch (err: any) {
        if (!isCancelled) {
          addToast({ type: 'error', title: 'Failed to load skills', message: err.message });
        }
      } finally {
        if (!isCancelled) setIsLoadingSkills(false);
      }
    }
    fetchSkills();
    return () => {
      isCancelled = true;
    };
  }, [activeCandidate, addToast]);

  // Handle Candidate Creation
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) {
      addToast({ type: 'error', title: 'Candidate name cannot be empty.' });
      return;
    }
    setIsCreatingCandidate(true);
    try {
      const created = await api.createCandidate(newCandidateName.trim());
      addToast({ type: 'success', title: `Candidate '${created.name}' created.` });
      setNewCandidateName('');
      await refreshCandidates();
      setActiveCandidate(created);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error creating candidate', message: err.message });
    } finally {
      setIsCreatingCandidate(false);
    }
  };

  // Handle PDF Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({ type: 'error', title: 'Only PDF files are supported.' });
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadResume(file);
      setExtractedResumeText(result.text);
      setPendingSkills(
        result.skills.map((s) => ({
          ...s,
          selected: true,
          proficiency: s.default_proficiency || 5,
        }))
      );
      addToast({
        type: 'success',
        title: 'Resume parsed successfully',
        message: `Extracted text and found ${result.skills.length} potential skills.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Resume parsing failed', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm extracted resume skills
  const handleSaveConfirmedSkills = async () => {
    if (!activeCandidate) {
      addToast({ type: 'error', title: 'Please select or create an active candidate first.' });
      return;
    }

    const toSave = pendingSkills.filter((s) => s.selected);
    if (toSave.length === 0) {
      addToast({ type: 'info', title: 'No skills selected to save.' });
      return;
    }

    try {
      await api.batchUpsertCandidateSkills(
        activeCandidate.id,
        toSave.map((s) => ({
          skill_name: s.canonical_name,
          proficiency: s.proficiency,
          source: 'resume_extracted',
        }))
      );

      addToast({
        type: 'success',
        title: 'Skills saved to profile',
        message: `Added ${toSave.length} skill(s) to ${activeCandidate.name}.`,
      });

      setPendingSkills([]);
      setExtractedResumeText('');

      // Refresh saved skills list
      const updated = await api.getCandidateSkills(activeCandidate.id);
      setSavedSkills(updated);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed saving skills', message: err.message });
    }
  };

  // Manual skill add/update
  const handleAddManualSkill = async () => {
    if (!activeCandidate) {
      addToast({ type: 'error', title: 'Please select an active candidate first.' });
      return;
    }
    if (!selectedManualSkill) {
      addToast({ type: 'error', title: 'Please select a skill from the list.' });
      return;
    }

    setIsAddingManual(true);
    try {
      await api.upsertCandidateSkill(
        activeCandidate.id,
        selectedManualSkill,
        manualProficiency,
        'manual'
      );
      addToast({
        type: 'success',
        title: 'Skill saved',
        message: `'${selectedManualSkill}' set to proficiency ${manualProficiency}/10.`,
      });
      setSelectedManualSkill('');
      setManualSkillSearch('');
      const updated = await api.getCandidateSkills(activeCandidate.id);
      setSavedSkills(updated);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to save skill', message: err.message });
    } finally {
      setIsAddingManual(false);
    }
  };

  // Inline proficiency update on already saved skill
  const handleUpdateProficiency = async (skillName: string, newProf: number) => {
    if (!activeCandidate) return;
    try {
      await api.upsertCandidateSkill(activeCandidate.id, skillName, newProf, 'manual');
      setSavedSkills((prev) =>
        prev.map((s) => (s.skill_name === skillName ? { ...s, proficiency: newProf } : s))
      );
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    }
  };

  // Delete saved skill
  const handleDeleteSkill = async (skillName: string) => {
    if (!activeCandidate) return;
    try {
      await api.deleteCandidateSkill(activeCandidate.id, skillName);
      setSavedSkills((prev) => prev.filter((s) => s.skill_name !== skillName));
      addToast({ type: 'info', title: `Skill '${skillName}' removed.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to remove skill', message: err.message });
    }
  };

  // Filtered canonical skills for search
  const filteredCanonical = useMemo(() => {
    if (!manualSkillSearch) return canonicalSkills.slice(0, 15);
    return canonicalSkills
      .filter((s) => s.toLowerCase().includes(manualSkillSearch.toLowerCase()))
      .slice(0, 20);
  }, [canonicalSkills, manualSkillSearch]);

  // Filtered saved skills
  const filteredSavedSkills = useMemo(() => {
    if (!filterQuery) return savedSkills;
    return savedSkills.filter((s) =>
      s.skill_name.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [savedSkills, filterQuery]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <User className="w-7 h-7 text-indigo-400" />
            <span>Candidate Profile Management</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Build your talent profile via automated PDF resume extraction or manual proficiency scoring.
          </p>
        </div>

        {/* Candidate Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="active-candidate-selector" className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Profile:</label>
          <div className="relative">
            <select
              id="active-candidate-selector"
              aria-label="Active Candidate Profile"
              value={activeCandidate?.id || ''}
              onChange={(e) => {
                const found = candidates.find((c) => c.id.toString() === e.target.value);
                setActiveCandidate(found || null);
              }}
              className="bg-slate-900 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-400 pr-8 cursor-pointer"
            >
              <option value="" disabled>Select profile...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Section A: Create New Candidate Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Create New Candidate Profile</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Give the profile a name (e.g., sample candidate or team member).
        </p>

        <form onSubmit={handleCreateCandidate} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Candidate Name (e.g. Maya Chen, Senior ML Engineer)"
            value={newCandidateName}
            onChange={(e) => setNewCandidateName(e.target.value)}
            className="w-full sm:flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isCreatingCandidate}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isCreatingCandidate ? 'Creating...' : 'Create Profile'}</span>
          </button>
        </form>
      </div>

      {!activeCandidate ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-amber-500/20 bg-amber-950/10">
          <User className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-base font-bold text-amber-200">No Candidate Profile Selected</h4>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
            Please create a profile above or select an existing candidate from the top-right switcher to start uploading resumes and managing skills.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Profile Info Banner */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow">
                {activeCandidate.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{activeCandidate.name}</h3>
                <p className="text-[11px] text-slate-400">
                  Profile ID #{activeCandidate.id} &bull; Created {new Date(activeCandidate.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {savedSkills.length} Saved Skills
            </span>
          </div>

          {/* STEP 1: Upload Resume */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Step 1 — Upload PDF Resume (Optional)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  PyMuPDF will parse the document text and regex-match against the canonical skills dictionary.
                </p>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-6 transition-all cursor-pointer bg-slate-900/30 hover:bg-slate-900/50">
              <FileText className="w-8 h-8 text-indigo-400/80 mb-2" />
              <span className="text-xs font-semibold text-white">
                {isUploading ? 'Extracting text and scanning skills...' : 'Click to select or drop a PDF resume here'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">PDF up to 10MB</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {extractedResumeText && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtractedText(!showExtractedText)}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showExtractedText ? 'Hide extracted text' : 'View extracted plain text'}</span>
                </button>

                {showExtractedText && (
                  <textarea
                    readOnly
                    value={extractedResumeText}
                    rows={6}
                    className="w-full mt-2 bg-slate-950 font-mono text-[11px] p-3 rounded-xl border border-slate-800 text-slate-300 focus:outline-none"
                  />
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Review and Confirm Extracted Skills */}
          {pendingSkills.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border border-cyan-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Step 2 — Review & Confirm Extracted Skills</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Detected via dictionary search. Uncheck any false matches and tune your proficiency (0–10).
                  </p>
                </div>

                <button
                  onClick={handleSaveConfirmedSkills}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Confirmed Skills to Profile</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {pendingSkills.map((item, idx) => (
                  <div
                    key={item.canonical_name}
                    className={`p-3 rounded-xl border transition-all ${
                      item.selected
                        ? 'bg-slate-900/80 border-slate-700/80 shadow-sm'
                        : 'bg-slate-950/40 border-slate-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setPendingSkills((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, selected: val } : s))
                            );
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white">{item.canonical_name}</span>
                      </label>
                      <SourceBadge source={item.match_type} evidence={item.matched_text} />
                    </div>

                    {item.selected && (
                      <div className="mt-3 flex items-center gap-3">
                        <label htmlFor={`extracted-prof-${item.canonical_name}`} className="text-[11px] text-slate-400 font-medium">Proficiency:</label>
                        <input
                          id={`extracted-prof-${item.canonical_name}`}
                          type="range"
                          min="0"
                          max="10"
                          value={item.proficiency}
                          onChange={(e) => {
                            const p = parseInt(e.target.value, 10);
                            setPendingSkills((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, proficiency: p } : s))
                            );
                          }}
                          className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <span className="w-8 text-right font-mono text-xs font-bold text-indigo-300">
                          {item.proficiency}/10
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Add Skills Manually with Searchable Chips */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Step 3 — Add or Edit Skills Manually</span>
            </h3>
            <p className="text-xs text-slate-400">
              Type to search from 40+ canonical skills or select from the quick chips below.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter or search skill (e.g. Python, Docker, PyTorch)..."
                  value={manualSkillSearch}
                  onChange={(e) => setManualSkillSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2">
                <label htmlFor="manual-proficiency-slider" className="text-xs text-slate-400 whitespace-nowrap">Proficiency:</label>
                <input
                  id="manual-proficiency-slider"
                  type="range"
                  min="0"
                  max="10"
                  value={manualProficiency}
                  onChange={(e) => setManualProficiency(parseInt(e.target.value, 10))}
                  className="w-28 accent-indigo-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-indigo-300 w-8 text-right">
                  {manualProficiency}/10
                </span>
              </div>

              <button
                onClick={handleAddManualSkill}
                disabled={isAddingManual || !selectedManualSkill}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Save Skill</span>
              </button>
            </div>

            {/* Searchable Skill Chips */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Skill:
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {filteredCanonical.map((skill) => {
                  const isSelected = selectedManualSkill === skill;
                  const alreadySaved = savedSkills.some((s) => s.skill_name === skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => setSelectedManualSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : alreadySaved
                          ? 'bg-slate-800/80 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400'
                          : 'bg-slate-900 text-slate-300 border border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <span>{skill}</span>
                      {alreadySaved && <span className="text-[10px] text-emerald-400">&bull;</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Saved Skills Table with Search and Inline Sliders */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Current Saved Skills ({savedSkills.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  You can adjust proficiency sliders live below; changes are instantly persisted.
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter saved skills..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {isLoadingSkills ? (
              <TableSkeleton cols={3} rows={4} />
            ) : filteredSavedSkills.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {savedSkills.length === 0
                  ? 'No skills saved yet. Upload a resume or add skills manually above!'
                  : 'No skills matched your search filter.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] font-semibold">
                      <th className="py-3 px-4">Skill Name</th>
                      <th className="py-3 px-4">Proficiency (0-10)</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSavedSkills.map((skill) => (
                      <tr key={skill.skill_name} className="hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {skill.skill_name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 max-w-xs">
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={skill.proficiency}
                              onChange={(e) =>
                                handleUpdateProficiency(
                                  skill.skill_name,
                                  parseInt(e.target.value, 10)
                                )
                              }
                              className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="font-mono text-xs font-bold text-indigo-300 w-10 text-right">
                              {skill.proficiency} / 10
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <SourceBadge source={skill.source} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSkill(skill.skill_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove skill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
