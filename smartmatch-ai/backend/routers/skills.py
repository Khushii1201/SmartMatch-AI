"""
Skills dictionary endpoints.
"""

from fastapi import APIRouter
from ai.skill_normalizer import all_canonical_skills, load_skill_dictionary
from backend.schemas import SkillsDictionaryOut

router = APIRouter(prefix="/api/skills", tags=["Skills"])


@router.get("/canonical", response_model=list[str])
def get_canonical_skills():
    """Return all known canonical skill names sorted alphabetically."""
    return all_canonical_skills()


@router.get("/dictionary", response_model=SkillsDictionaryOut)
def get_skills_dictionary():
    """Return the entire skill dictionary (canonical names to synonyms)."""
    canonical = all_canonical_skills()
    dictionary = load_skill_dictionary()
    return SkillsDictionaryOut(canonical_skills=canonical, dictionary=dictionary)
