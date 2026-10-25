"""
Skill dictionary loading and synonym normalization.

Loads data/skills.json, which maps a canonical skill name to a list of
synonym strings (e.g. "Python" -> ["python", "py"]), and builds a
reverse lookup so any synonym can be normalized back to its canonical
form. This is deliberately simple dictionary-based normalization, not
a trained model -- it is reliable and fully explainable, which matters
for an academic viva.
"""

import json
from functools import lru_cache

from config import SKILLS_DICTIONARY_PATH


@lru_cache(maxsize=1)
def load_skill_dictionary() -> dict:
    """Returns {canonical_name: [synonym1, synonym2, ...]}."""
    with open(SKILLS_DICTIONARY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def build_synonym_lookup() -> dict:
    """
    Returns {synonym_lowercase: canonical_name}, including the canonical
    name itself (lowercased) as a key so exact canonical mentions are
    also matched.
    """
    skill_dict = load_skill_dictionary()
    lookup = {}
    for canonical, synonyms in skill_dict.items():
        lookup[canonical.lower()] = canonical
        for syn in synonyms:
            lookup[syn.lower().strip()] = canonical
    return lookup


def normalize_skill(raw_term: str) -> str | None:
    """
    Given a raw string the user typed or that was matched in text,
    return its canonical skill name, or None if it is not in the
    configured skill dictionary.
    """
    lookup = build_synonym_lookup()
    return lookup.get(raw_term.lower().strip())


def all_canonical_skills() -> list[str]:
    """Returns the sorted list of every canonical skill name configured."""
    return sorted(load_skill_dictionary().keys())


def clear_cache() -> None:
    """Call after editing data/skills.json at runtime (e.g. in tests)."""
    load_skill_dictionary.cache_clear()
    build_synonym_lookup.cache_clear()
