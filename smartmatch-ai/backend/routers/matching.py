"""
Matching, Gap Analysis, and Job Comparison endpoints.
"""

from fastapi import APIRouter, HTTPException, Response
from database import repositories as repo
from ai.matching_engine import compute_match
from ai.skill_gap_analyzer import analyze_gaps, matched_skills
from ai.recommendation_engine import build_recommendations
from utils.report_exporter import export_match_report_csv
from backend.schemas import (
    MatchRequest,
    MatchReportOut,
    SkillMatchResultOut,
    GapAnalysisOut,
    GapItemOut,
    RecommendationOut,
    RecommendationResourceOut,
    JobComparisonRequest,
    JobComparisonOut,
    JobComparisonItemOut,
)

router = APIRouter(prefix="/api/matching", tags=["Matching"])


def _load_candidate_and_skills(candidate_id: int):
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail=f"Candidate with ID {candidate_id} not found.")
    skills_rows = repo.get_candidate_skills(candidate_id)
    skills_map = {s["skill_name"]: s["proficiency"] for s in skills_rows}
    return cand, skills_map


def _load_job_and_requirements(job_id: int):
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found.")
    reqs = repo.get_job_requirements(job_id)
    return job, reqs


@router.post("/run", response_model=MatchReportOut)
def run_match(payload: MatchRequest):
    """
    Run fuzzy-logic matching between a candidate's saved skills and a job's requirements.
    Saves session and skill-by-skill results to the database.
    """
    cand, candidate_skills = _load_candidate_and_skills(payload.candidate_id)
    job, job_requirements = _load_job_and_requirements(payload.job_id)

    if not candidate_skills:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate '{cand['name']}' has no saved skills. Please add skills first.",
        )

    if not job_requirements:
        raise HTTPException(
            status_code=400,
            detail=f"Job '{job['title']}' has no requirements defined.",
        )

    report = compute_match(candidate_skills, job_requirements)

    # Persist session and results
    session_id = repo.save_match_session(cand["id"], job["id"], report.overall_score)
    repo.save_match_results(
        session_id,
        [
            {
                "skill_name": r.skill_name,
                "candidate_proficiency": r.candidate_proficiency,
                "job_importance": r.job_importance,
                "suitability_score": r.suitability_score,
                "status": r.status,
            }
            for r in report.skill_results
        ],
    )

    return MatchReportOut(
        session_id=session_id,
        candidate_id=cand["id"],
        candidate_name=cand["name"],
        job_id=job["id"],
        job_title=job["title"],
        overall_score=report.overall_score,
        skill_results=[
            SkillMatchResultOut(
                skill_name=r.skill_name,
                candidate_proficiency=r.candidate_proficiency,
                job_importance=r.job_importance,
                mandatory=r.mandatory,
                suitability_score=r.suitability_score,
                status=r.status,
            )
            for r in report.skill_results
        ],
    )


@router.post("/gap-analysis", response_model=GapAnalysisOut)
def get_gap_analysis(payload: MatchRequest):
    """
    Perform skill-gap analysis and fetch curated learning recommendations
    for weak/missing skills, prioritized by job importance and gap size.
    """
    cand, candidate_skills = _load_candidate_and_skills(payload.candidate_id)
    job, job_requirements = _load_job_and_requirements(payload.job_id)

    report = compute_match(candidate_skills, job_requirements)
    gaps = analyze_gaps(report)
    matched = matched_skills(report)
    recommendations_data = build_recommendations(gaps)

    return GapAnalysisOut(
        candidate_id=cand["id"],
        candidate_name=cand["name"],
        job_id=job["id"],
        job_title=job["title"],
        overall_score=report.overall_score,
        matched_skills=[
            SkillMatchResultOut(
                skill_name=m.skill_name,
                candidate_proficiency=m.candidate_proficiency,
                job_importance=m.job_importance,
                mandatory=m.mandatory,
                suitability_score=m.suitability_score,
                status=m.status,
            )
            for m in matched
        ],
        gaps=[
            GapItemOut(
                skill_name=g.skill_name,
                status=g.status,
                candidate_proficiency=g.candidate_proficiency,
                job_importance=g.job_importance,
                mandatory=g.mandatory,
                priority_score=g.priority_score,
            )
            for g in gaps
        ],
        recommendations=[
            RecommendationOut(
                skill_name=rec["skill_name"],
                priority_score=rec["priority_score"],
                mandatory=rec["mandatory"],
                status=rec["status"],
                resources=[
                    RecommendationResourceOut(
                        title=res["title"],
                        url=res["url"],
                        type=res["type"],
                    )
                    for res in rec["resources"]
                ],
            )
            for rec in recommendations_data
        ],
    )


@router.post("/compare-jobs", response_model=JobComparisonOut)
def compare_jobs(payload: JobComparisonRequest):
    """
    Compare a single candidate against multiple jobs in one operation,
    ranking them by overall skill alignment score.
    """
    cand, candidate_skills = _load_candidate_and_skills(payload.candidate_id)
    if not payload.job_ids:
        raise HTTPException(status_code=400, detail="Please select at least one job to compare.")

    comparison_results = []
    for jid in payload.job_ids:
        job, reqs = _load_job_and_requirements(jid)
        report = compute_match(candidate_skills, reqs)
        gaps = analyze_gaps(report)
        matched = matched_skills(report)
        top_gap = gaps[0].skill_name if gaps else "None"

        comparison_results.append(
            JobComparisonItemOut(
                job_id=job["id"],
                job_title=job["title"],
                overall_score=report.overall_score,
                strong_matches_count=len(matched),
                gaps_count=len(gaps),
                top_priority_gap=top_gap,
                skill_results=[
                    SkillMatchResultOut(
                        skill_name=r.skill_name,
                        candidate_proficiency=r.candidate_proficiency,
                        job_importance=r.job_importance,
                        mandatory=r.mandatory,
                        suitability_score=r.suitability_score,
                        status=r.status,
                    )
                    for r in report.skill_results
                ],
            )
        )

    # Sort descending by overall match score
    comparison_results.sort(key=lambda x: x.overall_score, reverse=True)

    return JobComparisonOut(
        candidate_id=cand["id"],
        candidate_name=cand["name"],
        results=comparison_results,
    )


@router.post("/export-csv")
def export_csv(payload: MatchRequest):
    """Export match results report as CSV."""
    cand, candidate_skills = _load_candidate_and_skills(payload.candidate_id)
    job, job_requirements = _load_job_and_requirements(payload.job_id)

    report = compute_match(candidate_skills, job_requirements)
    csv_bytes = export_match_report_csv(report)

    filename = f"smartmatch_{cand['name']}_{job['title']}.csv".replace(" ", "_")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
