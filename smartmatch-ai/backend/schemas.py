"""
Pydantic schemas for the SmartMatch AI FastAPI backend.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------
# Candidate schemas
# ---------------------------------------------------------------------

class CandidateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Candidate name")


class CandidateOut(BaseModel):
    id: int
    name: str
    created_at: str


class CandidateSkillUpsert(BaseModel):
    skill_name: str = Field(..., min_length=1)
    proficiency: int = Field(..., ge=0, le=10, description="Proficiency between 0 and 10")
    source: str = Field("manual", description="manual or resume_extracted")


class CandidateSkillBatchUpsert(BaseModel):
    skills: list[CandidateSkillUpsert]


class CandidateSkillOut(BaseModel):
    candidate_id: int
    skill_name: str
    proficiency: int
    source: str


class ExtractedSkillItem(BaseModel):
    canonical_name: str
    matched_text: str
    match_type: str  # "explicit" or "synonym"
    default_proficiency: int = 5


class ResumeExtractOut(BaseModel):
    text: str
    skills: list[ExtractedSkillItem]


# ---------------------------------------------------------------------
# Skills dictionary schemas
# ---------------------------------------------------------------------

class SkillsDictionaryOut(BaseModel):
    canonical_skills: list[str]
    dictionary: dict[str, list[str]]


# ---------------------------------------------------------------------
# Job schemas
# ---------------------------------------------------------------------

class JobRequirementIn(BaseModel):
    skill_name: str = Field(..., min_length=1)
    importance: int = Field(5, ge=0, le=10)
    mandatory: bool = True


class JobRequirementOut(BaseModel):
    id: Optional[int] = None
    job_id: int
    skill_name: str
    importance: int
    mandatory: bool


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", description="Job description text")
    requirements: list[JobRequirementIn] = Field(default_factory=list)


class JobOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: str
    requirements: list[JobRequirementOut] = Field(default_factory=list)


class SampleJobOut(BaseModel):
    title: str
    description: str
    requirements: list[JobRequirementIn]


class ExtractRequirementsRequest(BaseModel):
    text: str


class ExtractRequirementsResponse(BaseModel):
    extracted_skills: list[ExtractedSkillItem]
    suggested_requirements: list[JobRequirementIn]


# ---------------------------------------------------------------------
# Matching schemas
# ---------------------------------------------------------------------

class MatchRequest(BaseModel):
    candidate_id: int
    job_id: int


class SkillMatchResultOut(BaseModel):
    skill_name: str
    candidate_proficiency: int
    job_importance: int
    mandatory: bool
    suitability_score: float
    status: str  # "matched", "weak", "missing"


class MatchReportOut(BaseModel):
    session_id: Optional[int] = None
    candidate_id: int
    candidate_name: str
    job_id: int
    job_title: str
    overall_score: float
    skill_results: list[SkillMatchResultOut]
    disclaimer: str = (
        "This score is a skill-alignment indicator (weighted by how important each skill "
        "is to the job), not a prediction of hiring probability. It reflects only how well "
        "your stated skills and proficiencies line up with a job's stated skill requirements."
    )


# ---------------------------------------------------------------------
# Skill-Gap Analysis schemas
# ---------------------------------------------------------------------

class GapItemOut(BaseModel):
    skill_name: str
    status: str
    candidate_proficiency: int
    job_importance: int
    mandatory: bool
    priority_score: float


class RecommendationResourceOut(BaseModel):
    title: str
    url: str
    type: str


class RecommendationOut(BaseModel):
    skill_name: str
    priority_score: float
    mandatory: bool
    status: str
    resources: list[RecommendationResourceOut] = Field(default_factory=list)


class GapAnalysisOut(BaseModel):
    candidate_id: int
    candidate_name: str
    job_id: int
    job_title: str
    overall_score: float
    matched_skills: list[SkillMatchResultOut]
    gaps: list[GapItemOut]
    recommendations: list[RecommendationOut]
    disclaimer: str = (
        "This score is a skill-alignment indicator, not a prediction of hiring probability."
    )


# ---------------------------------------------------------------------
# Job Comparison schemas
# ---------------------------------------------------------------------

class JobComparisonRequest(BaseModel):
    candidate_id: int
    job_ids: list[int]


class JobComparisonItemOut(BaseModel):
    job_id: int
    job_title: str
    overall_score: float
    strong_matches_count: int
    gaps_count: int
    top_priority_gap: str
    skill_results: list[SkillMatchResultOut]


class JobComparisonOut(BaseModel):
    candidate_id: int
    candidate_name: str
    results: list[JobComparisonItemOut]
    disclaimer: str = (
        "This comparison reflects skill-alignment indicators across jobs, not hiring probabilities."
    )


# ---------------------------------------------------------------------
# Match Session History schemas
# ---------------------------------------------------------------------

class SessionSummaryOut(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    job_id: int
    job_title: str
    overall_score: float
    created_at: str


class MatchResultDetailOut(BaseModel):
    id: Optional[int] = None
    session_id: int
    skill_name: str
    candidate_proficiency: int
    job_importance: int
    suitability_score: float
    status: str


class SessionDetailOut(BaseModel):
    session: SessionSummaryOut
    results: list[MatchResultDetailOut]
