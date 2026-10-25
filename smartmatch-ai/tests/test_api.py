"""
Integration tests for the SmartMatch AI FastAPI backend.
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from database.db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "SmartMatch AI API"
    assert "skill-alignment indicator" in data["disclaimer"]


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_skills_endpoints():
    res = client.get("/api/skills/canonical")
    assert res.status_code == 200
    canonical = res.json()
    assert isinstance(canonical, list)
    assert "Python" in canonical
    assert "SQL" in canonical

    res_dict = client.get("/api/skills/dictionary")
    assert res_dict.status_code == 200
    data = res_dict.json()
    assert "canonical_skills" in data
    assert "dictionary" in data
    assert "Python" in data["dictionary"]


def test_candidate_lifecycle():
    # 1. Create candidate
    create_res = client.post("/api/candidates", json={"name": "Alex TestDev"})
    assert create_res.status_code == 201
    candidate = create_res.json()
    cand_id = candidate["id"]
    assert candidate["name"] == "Alex TestDev"

    # 2. Get candidate
    get_res = client.get(f"/api/candidates/{cand_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Alex TestDev"

    # 3. Add skill
    skill_res = client.post(
        f"/api/candidates/{cand_id}/skills",
        json={"skill_name": "Python", "proficiency": 8, "source": "manual"},
    )
    assert skill_res.status_code == 200

    # 4. Batch add skills
    batch_res = client.post(
        f"/api/candidates/{cand_id}/skills/batch",
        json={
            "skills": [
                {"skill_name": "SQL", "proficiency": 7, "source": "manual"},
                {"skill_name": "Docker", "proficiency": 6, "source": "resume_extracted"},
            ]
        },
    )
    assert batch_res.status_code == 200

    # 5. List skills
    list_res = client.get(f"/api/candidates/{cand_id}/skills")
    assert list_res.status_code == 200
    skills = list_res.json()
    skill_names = {s["skill_name"] for s in skills}
    assert "Python" in skill_names
    assert "SQL" in skill_names
    assert "Docker" in skill_names

    # 6. Delete a skill
    del_res = client.delete(f"/api/candidates/{cand_id}/skills/Docker")
    assert del_res.status_code == 200

    # Verify deletion
    list_res2 = client.get(f"/api/candidates/{cand_id}/skills")
    skill_names2 = {s["skill_name"] for s in list_res2.json()}
    assert "Docker" not in skill_names2


def test_job_lifecycle_and_samples():
    # 1. Check sample jobs
    sample_res = client.get("/api/jobs/samples")
    assert sample_res.status_code == 200
    samples = sample_res.json()
    assert len(samples) > 0
    assert "title" in samples[0]

    # 2. Extract requirements from text
    extract_res = client.post(
        "/api/jobs/extract-requirements",
        json={"text": "Looking for a Python backend engineer with strong SQL and AWS experience."},
    )
    assert extract_res.status_code == 200
    extract_data = extract_res.json()
    extracted_names = {s["canonical_name"] for s in extract_data["extracted_skills"]}
    assert "Python" in extracted_names
    assert "SQL" in extracted_names

    # 3. Create job
    create_job_res = client.post(
        "/api/jobs",
        json={
            "title": "Backend AI Engineer",
            "description": "Develop fuzzy inference APIs.",
            "requirements": [
                {"skill_name": "Python", "importance": 9, "mandatory": True},
                {"skill_name": "SQL", "importance": 7, "mandatory": True},
                {"skill_name": "Docker", "importance": 5, "mandatory": False},
            ],
        },
    )
    assert create_job_res.status_code == 201
    job = create_job_res.json()
    job_id = job["id"]
    assert job["title"] == "Backend AI Engineer"
    assert len(job["requirements"]) == 3

    # 4. Get job
    get_job_res = client.get(f"/api/jobs/{job_id}")
    assert get_job_res.status_code == 200
    assert get_job_res.json()["title"] == "Backend AI Engineer"


def test_matching_and_gap_analysis():
    # Create candidate with known skills
    c_res = client.post("/api/candidates", json={"name": "Match Candidate"})
    cand_id = c_res.json()["id"]

    client.post(
        f"/api/candidates/{cand_id}/skills",
        json={"skill_name": "Python", "proficiency": 9, "source": "manual"},
    )
    client.post(
        f"/api/candidates/{cand_id}/skills",
        json={"skill_name": "SQL", "proficiency": 4, "source": "manual"},
    )

    # Create job
    j_res = client.post(
        "/api/jobs",
        json={
            "title": "Match Job Target",
            "description": "Test matching job",
            "requirements": [
                {"skill_name": "Python", "importance": 9, "mandatory": True},
                {"skill_name": "SQL", "importance": 8, "mandatory": True},
                {"skill_name": "Machine Learning", "importance": 7, "mandatory": True},
            ],
        },
    )
    job_id = j_res.json()["id"]

    # Run match
    match_res = client.post(
        "/api/matching/run",
        json={"candidate_id": cand_id, "job_id": job_id},
    )
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert 0.0 <= match_data["overall_score"] <= 100.0
    assert "skill-alignment indicator" in match_data["disclaimer"]
    assert len(match_data["skill_results"]) == 3

    # Check statuses: Python (prof 9 vs imp 9) should be matched
    py_res = next(r for r in match_data["skill_results"] if r["skill_name"] == "Python")
    assert py_res["status"] == "matched"

    # Machine Learning was not provided by candidate => missing
    ml_res = next(r for r in match_data["skill_results"] if r["skill_name"] == "Machine Learning")
    assert ml_res["status"] == "missing"
    assert ml_res["candidate_proficiency"] == 0

    # Run Gap Analysis
    gap_res = client.post(
        "/api/matching/gap-analysis",
        json={"candidate_id": cand_id, "job_id": job_id},
    )
    assert gap_res.status_code == 200
    gap_data = gap_res.json()
    assert len(gap_data["matched_skills"]) >= 1
    assert len(gap_data["gaps"]) >= 1
    assert len(gap_data["recommendations"]) >= 1

    # Check Job Comparison
    comp_res = client.post(
        "/api/matching/compare-jobs",
        json={"candidate_id": cand_id, "job_ids": [job_id]},
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["results"]) == 1
    assert comp_data["results"][0]["job_title"] == "Match Job Target"

    # Check History Sessions
    hist_res = client.get(f"/api/history/sessions?candidate_id={cand_id}")
    assert hist_res.status_code == 200
    sessions = hist_res.json()
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]

    detail_res = client.get(f"/api/history/sessions/{session_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["results"]) == 3
