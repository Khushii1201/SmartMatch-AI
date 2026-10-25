"""
Weighted aggregation of per-skill fuzzy suitability scores into one
overall job-match score.

Formula (documented, as required):

    Overall Score = Sum(importance_i * suitability_i) / Sum(importance_i)

where importance_i is the job's stated importance (0-10) for skill i,
and suitability_i is this skill's fuzzy-engine output (0-100).

This is a skill-alignment indicator, not a prediction of hiring
probability -- it says nothing about interview performance, other
candidates, company-specific hiring bar, or non-skill factors.
"""

from dataclasses import dataclass, field

from ai.fuzzy_engine import compute_suitability

WEAK_SUITABILITY_THRESHOLD = 50.0  # below this, a present skill counts as "weak"


@dataclass
class SkillMatchResult:
    skill_name: str
    candidate_proficiency: int  # 0 if the candidate does not have this skill
    job_importance: int
    mandatory: bool
    suitability_score: float
    status: str  # "matched", "weak", "missing"


@dataclass
class MatchReport:
    overall_score: float
    skill_results: list[SkillMatchResult] = field(default_factory=list)


def compute_match(
    candidate_skills: dict[str, int], job_requirements: list[dict]
) -> MatchReport:
    """
    candidate_skills: {skill_name: proficiency (0-10)}
    job_requirements: list of {"skill_name": str, "importance": int, "mandatory": bool}

    Handles missing skills (treated as proficiency 0, not an error) and
    an empty requirements list (returns overall_score 0.0 safely instead
    of dividing by zero).
    """
    if not job_requirements:
        return MatchReport(overall_score=0.0, skill_results=[])

    skill_results: list[SkillMatchResult] = []
    weighted_sum = 0.0
    weight_total = 0.0

    for req in job_requirements:
        skill_name = req["skill_name"]
        importance = int(req.get("importance", 0))
        mandatory = bool(req.get("mandatory", False))
        proficiency = int(candidate_skills.get(skill_name, 0))

        suitability = compute_suitability(proficiency, importance)

        if proficiency == 0:
            status = "missing"
        elif suitability < WEAK_SUITABILITY_THRESHOLD:
            status = "weak"
        else:
            status = "matched"

        skill_results.append(
            SkillMatchResult(
                skill_name=skill_name,
                candidate_proficiency=proficiency,
                job_importance=importance,
                mandatory=mandatory,
                suitability_score=suitability,
                status=status,
            )
        )

        weighted_sum += importance * suitability
        weight_total += importance

    overall_score = round(weighted_sum / weight_total, 2) if weight_total > 0 else 0.0

    return MatchReport(overall_score=overall_score, skill_results=skill_results)
