"""
Job description management and requirements endpoints.
"""

import json
from fastapi import APIRouter, HTTPException
from config import SAMPLE_JOBS_PATH
from database import repositories as repo
from utils.validators import validate_job_description, validate_importance
from ai.skill_extractor import extract_skills_from_text
from backend.schemas import (
    JobCreate,
    JobOut,
    JobRequirementIn,
    JobRequirementOut,
    SampleJobOut,
    ExtractRequirementsRequest,
    ExtractRequirementsResponse,
    ExtractedSkillItem,
)

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("", response_model=list[JobOut])
def list_jobs():
    """List all saved jobs with their requirements."""
    jobs = repo.list_jobs()
    result = []
    for j in jobs:
        reqs = repo.get_job_requirements(j["id"])
        result.append(
            JobOut(
                id=j["id"],
                title=j["title"],
                description=j["description"] or "",
                created_at=str(j["created_at"]),
                requirements=[
                    JobRequirementOut(
                        id=r["id"] if "id" in r else None,
                        job_id=r["job_id"],
                        skill_name=r["skill_name"],
                        importance=r["importance"],
                        mandatory=bool(r["mandatory"]),
                    )
                    for r in reqs
                ],
            )
        )
    return result


@router.get("/samples", response_model=list[SampleJobOut])
def get_sample_jobs():
    """Load fictional sample jobs from disk as starting points."""
    try:
        with open(SAMPLE_JOBS_PATH, "r", encoding="utf-8") as f:
            sample_jobs = json.load(f)
        return [
            SampleJobOut(
                title=j["title"],
                description=j["description"],
                requirements=[
                    JobRequirementIn(
                        skill_name=r["skill_name"],
                        importance=r["importance"],
                        mandatory=r["mandatory"],
                    )
                    for r in j.get("requirements", [])
                ],
            )
            for j in sample_jobs
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load sample jobs: {exc}")


@router.post("/extract-requirements", response_model=ExtractRequirementsResponse)
def extract_requirements(payload: ExtractRequirementsRequest):
    """Scan free text job description and extract candidate skill requirements."""
    text = payload.text
    if not text or not text.strip():
        return ExtractRequirementsResponse(extracted_skills=[], suggested_requirements=[])

    extracted = extract_skills_from_text(text)
    extracted_items = [
        ExtractedSkillItem(
            canonical_name=e.canonical_name,
            matched_text=e.matched_text,
            match_type=e.match_type,
            default_proficiency=5,
        )
        for e in extracted
    ]
    suggested = [
        JobRequirementIn(
            skill_name=e.canonical_name,
            importance=5,
            mandatory=True,
        )
        for e in extracted
    ]
    return ExtractRequirementsResponse(
        extracted_skills=extracted_items,
        suggested_requirements=suggested,
    )


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate):
    """Create a new job and save its skill requirements."""
    req_dicts = [r.model_dump() for r in payload.requirements]
    valid, msg = validate_job_description(payload.title, req_dicts)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # Validate each importance value
    for r in payload.requirements:
        v_ok, v_msg = validate_importance(r.importance)
        if not v_ok:
            raise HTTPException(status_code=400, detail=f"Skill '{r.skill_name}': {v_msg}")

    job_id = repo.create_job(payload.title.strip(), payload.description.strip())
    for req in payload.requirements:
        repo.upsert_job_requirement(
            job_id,
            skill_name=req.skill_name.strip(),
            importance=req.importance,
            mandatory=req.mandatory,
        )

    job_row = repo.get_job(job_id)
    if not job_row:
        raise HTTPException(status_code=500, detail="Failed to retrieve newly created job.")

    saved_reqs = repo.get_job_requirements(job_id)
    return JobOut(
        id=job_row["id"],
        title=job_row["title"],
        description=job_row["description"] or "",
        created_at=str(job_row["created_at"]),
        requirements=[
            JobRequirementOut(
                id=r["id"] if "id" in r else None,
                job_id=r["job_id"],
                skill_name=r["skill_name"],
                importance=r["importance"],
                mandatory=bool(r["mandatory"]),
            )
            for r in saved_reqs
        ],
    )


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int):
    """Get job details by ID."""
    job_row = repo.get_job(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found.")
    reqs = repo.get_job_requirements(job_id)
    return JobOut(
        id=job_row["id"],
        title=job_row["title"],
        description=job_row["description"] or "",
        created_at=str(job_row["created_at"]),
        requirements=[
            JobRequirementOut(
                id=r["id"] if "id" in r else None,
                job_id=r["job_id"],
                skill_name=r["skill_name"],
                importance=r["importance"],
                mandatory=bool(r["mandatory"]),
            )
            for r in reqs
        ],
    )


@router.delete("/{job_id}", status_code=200)
def delete_job(job_id: int):
    """Delete a job and its associated requirements."""
    job_row = repo.get_job(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found.")
    repo.delete_job(job_id)
    return {"message": f"Job '{job_row['title']}' deleted successfully."}


@router.get("/{job_id}/requirements", response_model=list[JobRequirementOut])
def get_job_requirements(job_id: int):
    """Get requirements for a specific job."""
    job_row = repo.get_job(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found.")
    reqs = repo.get_job_requirements(job_id)
    return [
        JobRequirementOut(
            id=r["id"] if "id" in r else None,
            job_id=r["job_id"],
            skill_name=r["skill_name"],
            importance=r["importance"],
            mandatory=bool(r["mandatory"]),
        )
        for r in reqs
    ]


@router.post("/{job_id}/requirements", status_code=200)
def upsert_job_requirement(job_id: int, payload: JobRequirementIn):
    """Add or update a skill requirement for a job."""
    job_row = repo.get_job(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found.")

    v_ok, v_msg = validate_importance(payload.importance)
    if not v_ok:
        raise HTTPException(status_code=400, detail=v_msg)

    repo.upsert_job_requirement(
        job_id,
        skill_name=payload.skill_name.strip(),
        importance=payload.importance,
        mandatory=payload.mandatory,
    )
    return {"message": f"Requirement '{payload.skill_name}' saved."}
