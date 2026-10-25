"""
Tests for database initialization and repository persistence.

Uses a temporary database file (monkeypatched config paths) so these
tests never touch a developer's real smartmatch.db.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """
    Redirect DATABASE_PATH/DATABASE_DIR to a temp directory for the
    duration of one test, then re-import db/repositories so they pick
    up the patched paths.
    """
    import config

    temp_dir = tmp_path / "database"
    temp_dir.mkdir()
    temp_db_path = temp_dir / "test_smartmatch.db"

    monkeypatch.setattr(config, "DATABASE_DIR", temp_dir)
    monkeypatch.setattr(config, "DATABASE_PATH", temp_db_path)

    # database.db reads DATABASE_PATH/DATABASE_DIR at import time via
    # "from config import ...", so patch its local references too.
    import database.db as db_module

    monkeypatch.setattr(db_module, "DATABASE_PATH", temp_db_path)
    monkeypatch.setattr(db_module, "DATABASE_DIR", temp_dir)

    db_module.init_db()
    yield db_module
    if temp_db_path.exists():
        temp_db_path.unlink()


def test_init_db_creates_file(temp_db):
    from config import DATABASE_PATH  # noqa: F401 (patched value checked via temp_db)
    assert temp_db.DATABASE_PATH.exists()


def test_create_and_fetch_candidate(temp_db):
    from database import repositories as repo

    candidate_id = repo.create_candidate("Test Candidate")
    assert candidate_id is not None

    candidate = repo.get_candidate(candidate_id)
    assert candidate["name"] == "Test Candidate"


def test_upsert_candidate_skill_handles_duplicates(temp_db):
    from database import repositories as repo

    candidate_id = repo.create_candidate("Dup Test")
    repo.upsert_candidate_skill(candidate_id, "Python", 5, source="manual")
    repo.upsert_candidate_skill(candidate_id, "Python", 8, source="manual")  # should update, not duplicate

    skills = repo.get_candidate_skills(candidate_id)
    python_entries = [s for s in skills if s["skill_name"] == "Python"]
    assert len(python_entries) == 1
    assert python_entries[0]["proficiency"] == 8


def test_job_and_requirements_roundtrip(temp_db):
    from database import repositories as repo

    job_id = repo.create_job("Test Job", "A fictional sample job for testing.")
    repo.upsert_job_requirement(job_id, "SQL", importance=7, mandatory=True)
    repo.upsert_job_requirement(job_id, "Docker", importance=3, mandatory=False)

    reqs = repo.get_job_requirements(job_id)
    assert len(reqs) == 2
    skill_names = {r["skill_name"] for r in reqs}
    assert skill_names == {"SQL", "Docker"}


def test_match_session_and_results_persist(temp_db):
    from database import repositories as repo

    candidate_id = repo.create_candidate("Session Test")
    job_id = repo.create_job("Session Job")

    session_id = repo.save_match_session(candidate_id, job_id, overall_score=72.5)
    repo.save_match_results(
        session_id,
        [
            {
                "skill_name": "Python",
                "candidate_proficiency": 8,
                "job_importance": 9,
                "suitability_score": 81.4,
                "status": "matched",
            }
        ],
    )

    sessions = repo.list_match_sessions(candidate_id)
    assert len(sessions) == 1
    assert sessions[0]["overall_score"] == 72.5

    results = repo.get_match_results(session_id)
    assert len(results) == 1
    assert results[0]["skill_name"] == "Python"


def test_empty_database_lists_return_empty_not_error(temp_db):
    from database import repositories as repo

    assert repo.list_candidates() == []
    assert repo.list_jobs() == []
