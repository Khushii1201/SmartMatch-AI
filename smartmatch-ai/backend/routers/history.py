"""
Session history and past match reports endpoints.
"""

import io
import pandas as pd
from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from database import repositories as repo
from backend.schemas import (
    SessionSummaryOut,
    SessionDetailOut,
    MatchResultDetailOut,
)

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("/sessions", response_model=list[SessionSummaryOut])
def list_sessions(candidate_id: Optional[int] = None):
    """List past match sessions, optionally filtered by candidate ID."""
    rows = repo.list_match_sessions(candidate_id=candidate_id)
    return [
        SessionSummaryOut(
            id=r["id"],
            candidate_id=r["candidate_id"],
            candidate_name=r["candidate_name"],
            job_id=r["job_id"],
            job_title=r["job_title"],
            overall_score=r["overall_score"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
def get_session_detail(session_id: int):
    """Retrieve full detail and skill breakdown for a past session."""
    # Find the session row
    all_sessions = repo.list_match_sessions()
    session_row = next((s for s in all_sessions if s["id"] == session_id), None)
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found.")

    results_rows = repo.get_match_results(session_id)
    return SessionDetailOut(
        session=SessionSummaryOut(
            id=session_row["id"],
            candidate_id=session_row["candidate_id"],
            candidate_name=session_row["candidate_name"],
            job_id=session_row["job_id"],
            job_title=session_row["job_title"],
            overall_score=session_row["overall_score"],
            created_at=str(session_row["created_at"]),
        ),
        results=[
            MatchResultDetailOut(
                id=r["id"] if "id" in r else None,
                session_id=r["session_id"],
                skill_name=r["skill_name"],
                candidate_proficiency=r["candidate_proficiency"],
                job_importance=r["job_importance"],
                suitability_score=r["suitability_score"],
                status=r["status"],
            )
            for r in results_rows
        ],
    )


@router.get("/sessions/{session_id}/export-csv")
def export_session_csv(session_id: int):
    """Export past session skill results as CSV."""
    results = repo.get_match_results(session_id)
    if not results:
        raise HTTPException(status_code=404, detail="No results found for this session.")

    rdf = pd.DataFrame(results)[
        ["skill_name", "candidate_proficiency", "job_importance", "suitability_score", "status"]
    ]
    rdf.columns = ["Skill", "Proficiency", "Importance", "Suitability", "Status"]

    buffer = io.StringIO()
    rdf.to_csv(buffer, index=False)
    csv_bytes = buffer.getvalue().encode("utf-8")

    filename = f"smartmatch_session_{session_id}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
