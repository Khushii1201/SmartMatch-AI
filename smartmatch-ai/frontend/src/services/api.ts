import type {
  Candidate,
  CandidateSkill,
  Job,
  JobRequirement,
  SampleJob,
  MatchReport,
  GapAnalysisReport,
  JobComparisonReport,
  SessionSummary,
  SessionDetail,
  ResumeExtractResult,
  ExtractedSkillItem,
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // fallback to status text
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Candidates
  async listCandidates(): Promise<Candidate[]> {
    const res = await fetch(`${API_BASE}/candidates`);
    return handleResponse<Candidate[]>(res);
  },

  async getCandidate(id: number): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${id}`);
    return handleResponse<Candidate>(res);
  },

  async createCandidate(name: string): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<Candidate>(res);
  },

  async getCandidateSkills(candidateId: number): Promise<CandidateSkill[]> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/skills`);
    return handleResponse<CandidateSkill[]>(res);
  },

  async upsertCandidateSkill(
    candidateId: number,
    skill_name: string,
    proficiency: number,
    source: string = 'manual'
  ): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_name, proficiency, source }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async batchUpsertCandidateSkills(
    candidateId: number,
    skills: { skill_name: string; proficiency: number; source: string }[]
  ): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/skills/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async deleteCandidateSkill(candidateId: number, skillName: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/skills/${encodeURIComponent(skillName)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },

  async uploadResume(file: File): Promise<ResumeExtractResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/candidates/upload-resume`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ResumeExtractResult>(res);
  },

  // Skills
  async getCanonicalSkills(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/skills/canonical`);
    return handleResponse<string[]>(res);
  },

  async getSkillsDictionary(): Promise<{ canonical_skills: string[]; dictionary: Record<string, string[]> }> {
    const res = await fetch(`${API_BASE}/skills/dictionary`);
    return handleResponse<{ canonical_skills: string[]; dictionary: Record<string, string[]> }>(res);
  },

  // Jobs
  async listJobs(): Promise<Job[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    return handleResponse<Job[]>(res);
  },

  async getJob(id: number): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    return handleResponse<Job>(res);
  },

  async createJob(
    title: string,
    description: string,
    requirements: { skill_name: string; importance: number; mandatory: boolean }[]
  ): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, requirements }),
    });
    return handleResponse<Job>(res);
  },

  async deleteJob(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },

  async getSampleJobs(): Promise<SampleJob[]> {
    const res = await fetch(`${API_BASE}/jobs/samples`);
    return handleResponse<SampleJob[]>(res);
  },

  async extractRequirements(text: string): Promise<{
    extracted_skills: ExtractedSkillItem[];
    suggested_requirements: JobRequirement[];
  }> {
    const res = await fetch(`${API_BASE}/jobs/extract-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse<{
      extracted_skills: ExtractedSkillItem[];
      suggested_requirements: JobRequirement[];
    }>(res);
  },

  // Matching
  async runMatch(candidateId: number, jobId: number): Promise<MatchReport> {
    const res = await fetch(`${API_BASE}/matching/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
    });
    return handleResponse<MatchReport>(res);
  },

  async getGapAnalysis(candidateId: number, jobId: number): Promise<GapAnalysisReport> {
    const res = await fetch(`${API_BASE}/matching/gap-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
    });
    return handleResponse<GapAnalysisReport>(res);
  },

  async compareJobs(candidateId: number, jobIds: number[]): Promise<JobComparisonReport> {
    const res = await fetch(`${API_BASE}/matching/compare-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, job_ids: jobIds }),
    });
    return handleResponse<JobComparisonReport>(res);
  },

  async downloadMatchCsv(candidateId: number, jobId: number, filename: string): Promise<void> {
    const res = await fetch(`${API_BASE}/matching/export-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
    });
    if (!res.ok) throw new Error('Failed to generate CSV export.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // History
  async listSessions(candidateId?: number): Promise<SessionSummary[]> {
    const url = candidateId
      ? `${API_BASE}/history/sessions?candidate_id=${candidateId}`
      : `${API_BASE}/history/sessions`;
    const res = await fetch(url);
    return handleResponse<SessionSummary[]>(res);
  },

  async getSessionDetail(sessionId: number): Promise<SessionDetail> {
    const res = await fetch(`${API_BASE}/history/sessions/${sessionId}`);
    return handleResponse<SessionDetail>(res);
  },

  async downloadSessionCsv(sessionId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/history/sessions/${sessionId}/export-csv`);
    if (!res.ok) throw new Error('Failed to download session CSV.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartmatch_session_${sessionId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
