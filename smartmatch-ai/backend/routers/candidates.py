"""
Candidate profile and skills management endpoints.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from database import repositories as repo
from utils.validators import validate_candidate_name, validate_proficiency, validate_pdf_upload
from utils.pdf_parser import extract_text_from_pdf, PDFParsingError
from ai.skill_extractor import extract_skills_from_text
from backend.schemas import (
    CandidateCreate,
    CandidateOut,
    CandidateSkillUpsert,
    CandidateSkillBatchUpsert,
    CandidateSkillOut,
    ResumeExtractOut,
    ExtractedSkillItem,
)

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


@router.get("", response_model=list[CandidateOut])
def list_candidates():
    """List all candidates ordered by newest first."""
    rows = repo.list_candidates()
    return [
        CandidateOut(
            id=r["id"],
            name=r["name"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.post("", response_model=CandidateOut, status_code=201)
def create_candidate(payload: CandidateCreate):
    """Create a new candidate profile."""
    valid, msg = validate_candidate_name(payload.name)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    candidate_id = repo.create_candidate(payload.name.strip())
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=500, detail="Failed to retrieve newly created candidate.")

    return CandidateOut(
        id=cand["id"],
        name=cand["name"],
        created_at=str(cand["created_at"]),
    )


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: int):
    """Get candidate details by ID."""
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return CandidateOut(
        id=cand["id"],
        name=cand["name"],
        created_at=str(cand["created_at"]),
    )


@router.get("/{candidate_id}/skills", response_model=list[CandidateSkillOut])
def get_candidate_skills(candidate_id: int):
    """Get all saved skills for a candidate."""
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    skills = repo.get_candidate_skills(candidate_id)
    return [
        CandidateSkillOut(
            candidate_id=s["candidate_id"],
            skill_name=s["skill_name"],
            proficiency=s["proficiency"],
            source=s["source"],
        )
        for s in skills
    ]


@router.post("/{candidate_id}/skills", status_code=200)
def upsert_candidate_skill(candidate_id: int, payload: CandidateSkillUpsert):
    """Insert or update a skill for a candidate."""
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    valid, msg = validate_proficiency(payload.proficiency)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    repo.upsert_candidate_skill(
        candidate_id,
        skill_name=payload.skill_name.strip(),
        proficiency=payload.proficiency,
        source=payload.source,
    )
    return {"message": f"Skill '{payload.skill_name}' saved successfully."}


@router.post("/{candidate_id}/skills/batch", status_code=200)
def upsert_candidate_skills_batch(candidate_id: int, payload: CandidateSkillBatchUpsert):
    """Insert or update multiple skills at once (e.g. from confirmed resume skills)."""
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    saved_count = 0
    for s in payload.skills:
        valid, msg = validate_proficiency(s.proficiency)
        if not valid:
            continue
        repo.upsert_candidate_skill(
            candidate_id,
            skill_name=s.skill_name.strip(),
            proficiency=s.proficiency,
            source=s.source,
        )
        saved_count += 1

    return {"message": f"Saved {saved_count} skill(s) to candidate profile."}


@router.delete("/{candidate_id}/skills/{skill_name}", status_code=200)
def delete_candidate_skill(candidate_id: int, skill_name: str):
    """Delete a skill from a candidate profile."""
    cand = repo.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    repo.delete_candidate_skill(candidate_id, skill_name)
    return {"message": f"Skill '{skill_name}' removed."}


@router.post("/upload-resume", response_model=ResumeExtractOut)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a PDF resume, extract text using PyMuPDF, and detect skills
    via dictionary pattern matching tagging explicit vs synonym matches.
    """
    file_bytes = await file.read()
    filename = file.filename or "resume.pdf"

    valid, msg = validate_pdf_upload(filename, file_bytes)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    try:
        text = extract_text_from_pdf(file_bytes)
    except PDFParsingError as e:
        raise HTTPException(status_code=422, detail=str(e))

    extracted = extract_skills_from_text(text)
    return ResumeExtractOut(
        text=text,
        skills=[
            ExtractedSkillItem(
                canonical_name=item.canonical_name,
                matched_text=item.matched_text,
                match_type=item.match_type,
                default_proficiency=5,
            )
            for item in extracted
        ],
    )
