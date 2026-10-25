"""
Recommends learning resources for skill gaps, using a locally
maintained catalogue (data/learning_resources.json). Never invents
courses or certifications -- if a skill has no curated entry, it falls
back to the generic "_default" resources rather than fabricating one.
"""

import json
from functools import lru_cache

from config import LEARNING_RESOURCES_PATH
from ai.skill_gap_analyzer import GapItem


@lru_cache(maxsize=1)
def load_resource_catalogue() -> dict:
    with open(LEARNING_RESOURCES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def recommend_for_skill(skill_name: str) -> list[dict]:
    catalogue = load_resource_catalogue()
    return catalogue.get(skill_name, catalogue.get("_default", []))


def build_recommendations(gaps: list[GapItem]) -> list[dict]:
    """
    Returns a list of {skill_name, priority_score, mandatory, resources}
    in the same priority order as the input gap list.
    """
    recommendations = []
    for gap in gaps:
        recommendations.append(
            {
                "skill_name": gap.skill_name,
                "priority_score": gap.priority_score,
                "mandatory": gap.mandatory,
                "status": gap.status,
                "resources": recommend_for_skill(gap.skill_name),
            }
        )
    return recommendations


def clear_cache() -> None:
    load_resource_catalogue.cache_clear()
