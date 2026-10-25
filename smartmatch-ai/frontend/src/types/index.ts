export interface Candidate {
  id: number;
  name: string;
  created_at: string;
}

export interface CandidateSkill {
  candidate_id: number;
  skill_name: string;
  proficiency: number;
  source: 'manual' | 'resume_extracted' | string;
}

export interface ExtractedSkillItem {
  canonical_name: string;
  matched_text: string;
  match_type: 'explicit' | 'synonym' | string;
  default_proficiency: number;
}

export interface ResumeExtractResult {
  text: string;
  skills: ExtractedSkillItem[];
}

export interface JobRequirement {
  id?: number;
  job_id?: number;
  skill_name: string;
  importance: number; // 0-10
  mandatory: boolean;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  created_at: string;
  requirements: JobRequirement[];
}

export interface SampleJob {
  title: string;
  description: string;
  requirements: {
    skill_name: string;
    importance: number;
    mandatory: boolean;
  }[];
}

export interface SkillMatchResult {
  skill_name: string;
  candidate_proficiency: number;
  job_importance: number;
  mandatory: boolean;
  suitability_score: number;
  status: 'matched' | 'weak' | 'missing';
}

export interface MatchReport {
  session_id?: number;
  candidate_id: number;
  candidate_name: string;
  job_id: number;
  job_title: string;
  overall_score: number;
  skill_results: SkillMatchResult[];
  disclaimer: string;
}

export interface GapItem {
  skill_name: string;
  status: 'missing' | 'weak';
  candidate_proficiency: number;
  job_importance: number;
  mandatory: boolean;
  priority_score: number;
}

export interface RecommendationResource {
  title: string;
  url: string;
  type: string;
}

export interface Recommendation {
  skill_name: string;
  priority_score: number;
  mandatory: boolean;
  status: 'missing' | 'weak';
  resources: RecommendationResource[];
}

export interface GapAnalysisReport {
  candidate_id: number;
  candidate_name: string;
  job_id: number;
  job_title: string;
  overall_score: number;
  matched_skills: SkillMatchResult[];
  gaps: GapItem[];
  recommendations: Recommendation[];
  disclaimer: string;
}

export interface JobComparisonItem {
  job_id: number;
  job_title: string;
  overall_score: number;
  strong_matches_count: number;
  gaps_count: number;
  top_priority_gap: string;
  skill_results: SkillMatchResult[];
}

export interface JobComparisonReport {
  candidate_id: number;
  candidate_name: string;
  results: JobComparisonItem[];
  disclaimer: string;
}

export interface SessionSummary {
  id: number;
  candidate_id: number;
  candidate_name: string;
  job_id: number;
  job_title: string;
  overall_score: number;
  created_at: string;
}

export interface MatchResultDetail {
  id?: number;
  session_id: number;
  skill_name: string;
  candidate_proficiency: number;
  job_importance: number;
  suitability_score: number;
  status: 'matched' | 'weak' | 'missing';
}

export interface SessionDetail {
  session: SessionSummary;
  results: MatchResultDetail[];
}

export type PageId =
  | 'home'
  | 'profile'
  | 'jobs'
  | 'matching'
  | 'gaps'
  | 'comparison'
  | 'reports';
