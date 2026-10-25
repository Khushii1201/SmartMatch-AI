"""
Skill-gap analysis: turns a MatchReport into a prioritized list of
missing and weak skills the candidate should focus on.

Priority score = job_importance * proficiency_gap, where
proficiency_gap = (10 - candidate_proficiency), scaled 0-10. This means
a highly important skill the candidate completely lacks gets the
highest priority, while a less important skill the candidate is
already decent at gets a low priority. Mandatory requirements are
listed ahead of preferred ones at equal priority score.
"""

from dataclasses import dataclass

from ai.matching_engine import MatchReport, SkillMatchResult


@dataclass
class GapItem:
    skill_name: str
    status: str  # "missing" or "weak"
    candidate_proficiency: int
    job_importance: int
    mandatory: bool
    priority_score: float


def analyze_gaps(report: MatchReport) -> list[GapItem]:
    gaps = []
    for r in report.skill_results:
        if r.status in ("missing", "weak"):
            proficiency_gap = 10 - r.candidate_proficiency
            priority_score = round(r.job_importance * proficiency_gap, 2)
            gaps.append(
                GapItem(
                    skill_name=r.skill_name,
                    status=r.status,
                    candidate_proficiency=r.candidate_proficiency,
                    job_importance=r.job_importance,
                    mandatory=r.mandatory,
                    priority_score=priority_score,
                )
            )

    # Sort by: mandatory first, then priority score descending
    gaps.sort(key=lambda g: (not g.mandatory, -g.priority_score))
    return gaps


def matched_skills(report: MatchReport) -> list[SkillMatchResult]:
    """Convenience helper: the skills that are already a solid match."""
    return [r for r in report.skill_results if r.status == "matched"]
