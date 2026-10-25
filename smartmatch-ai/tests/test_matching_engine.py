"""
Tests for the weighted matching engine and skill-gap analysis.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.matching_engine import compute_match
from ai.skill_gap_analyzer import analyze_gaps, matched_skills


SAMPLE_REQUIREMENTS = [
    {"skill_name": "Python", "importance": 9, "mandatory": True},
    {"skill_name": "SQL", "importance": 6, "mandatory": True},
    {"skill_name": "Machine Learning", "importance": 8, "mandatory": True},
    {"skill_name": "Docker", "importance": 3, "mandatory": False},
]


def test_missing_skill_is_flagged_and_treated_as_zero_proficiency():
    report = compute_match({"Python": 7}, SAMPLE_REQUIREMENTS)
    docker_result = next(r for r in report.skill_results if r.skill_name == "Docker")
    assert docker_result.candidate_proficiency == 0
    assert docker_result.status == "missing"


def test_empty_job_requirements_returns_zero_safely():
    report = compute_match({"Python": 9}, [])
    assert report.overall_score == 0.0
    assert report.skill_results == []


def test_empty_candidate_skills_does_not_crash():
    report = compute_match({}, SAMPLE_REQUIREMENTS)
    assert report.overall_score >= 0.0
    assert len(report.skill_results) == len(SAMPLE_REQUIREMENTS)
    assert all(r.status == "missing" for r in report.skill_results)


def test_overall_score_increases_when_proficiency_increases():
    low = compute_match({"Python": 2, "SQL": 2, "Machine Learning": 2}, SAMPLE_REQUIREMENTS)
    high = compute_match({"Python": 9, "SQL": 9, "Machine Learning": 9}, SAMPLE_REQUIREMENTS)
    assert high.overall_score > low.overall_score


def test_overall_score_bounds():
    report = compute_match({"Python": 10, "SQL": 10, "Machine Learning": 10}, SAMPLE_REQUIREMENTS)
    assert 0.0 <= report.overall_score <= 100.0


def test_weak_status_for_low_suitability_present_skill():
    report = compute_match({"Machine Learning": 1}, SAMPLE_REQUIREMENTS)
    ml_result = next(r for r in report.skill_results if r.skill_name == "Machine Learning")
    assert ml_result.candidate_proficiency == 1
    assert ml_result.status in ("weak", "missing") or ml_result.status == "matched"
    # proficiency 1 against importance 8 should not be a full match
    assert ml_result.status != "matched"


def test_duplicate_skill_keys_collapse_naturally():
    # dict input structurally cannot hold duplicate keys; this verifies
    # the function works fine with a dict assembled from deduplication
    # upstream (the repository layer enforces UNIQUE(candidate_id, skill_name)).
    candidate = {"Python": 8}
    candidate["Python"] = 9  # overwritten, as a real dict would behave
    report = compute_match(candidate, SAMPLE_REQUIREMENTS)
    python_result = next(r for r in report.skill_results if r.skill_name == "Python")
    assert python_result.candidate_proficiency == 9


def test_gap_analysis_prioritizes_mandatory_and_high_importance():
    report = compute_match({"Python": 9}, SAMPLE_REQUIREMENTS)
    gaps = analyze_gaps(report)
    gap_names = [g.skill_name for g in gaps]
    # Machine Learning (importance 8, mandatory) should outrank
    # Docker (importance 3, preferred) in priority.
    assert gap_names.index("Machine Learning") < gap_names.index("Docker")


def test_matched_skills_excludes_gaps():
    report = compute_match(
        {"Python": 9, "SQL": 8, "Machine Learning": 9, "Docker": 7}, SAMPLE_REQUIREMENTS
    )
    matched = matched_skills(report)
    matched_names = {m.skill_name for m in matched}
    gaps = analyze_gaps(report)
    gap_names = {g.skill_name for g in gaps}
    assert matched_names.isdisjoint(gap_names)
