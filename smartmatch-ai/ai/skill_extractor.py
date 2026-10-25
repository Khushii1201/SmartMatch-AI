"""
Dictionary-based skill extraction from free text (resumes or job
descriptions).

Approach: for every synonym/canonical phrase in the skill dictionary,
search the text using word-boundary-aware regex so "java" does not
match inside "javascript", and multi-word phrases like "machine
learning" are matched as whole phrases. Each match is tagged as
"explicit" (the canonical name itself appeared) or "synonym" (an
alternate spelling/abbreviation was normalized to the canonical name),
so the UI can show users exactly what evidence led to each skill being
listed -- this is honest about being pattern matching, not a trained
classifier.
"""

import re
from dataclasses import dataclass

from ai.skill_normalizer import load_skill_dictionary


@dataclass
class ExtractedSkill:
    canonical_name: str
    matched_text: str
    match_type: str  # "explicit" or "synonym"


def _build_pattern(term: str) -> re.Pattern:
    """
    Build a case-insensitive, word-boundary regex for a (possibly
    multi-word) term. Escapes regex special characters in the term
    itself (e.g. "C++", "scikit-learn") so they are treated literally.
    """
    escaped = re.escape(term.strip())
    # \b doesn't work well around "+" or "#", so we use lookaround on
    # whitespace/punctuation boundaries instead of \b for safety.
    pattern = r"(?<![A-Za-z0-9])" + escaped + r"(?![A-Za-z0-9])"
    return re.compile(pattern, re.IGNORECASE)


def extract_skills_from_text(text: str) -> list[ExtractedSkill]:
    """
    Scan text for every configured skill (by canonical name or any of
    its synonyms) and return the matches found, deduplicated per
    canonical skill (keeping the first/explicit match if both an
    explicit and synonym mention exist).
    """
    if not text or not text.strip():
        return []

    skill_dict = load_skill_dictionary()
    found: dict[str, ExtractedSkill] = {}

    for canonical, synonyms in skill_dict.items():
        # Check the canonical name itself first (explicit mention)
        pattern = _build_pattern(canonical)
        match = pattern.search(text)
        if match:
            found[canonical] = ExtractedSkill(
                canonical_name=canonical,
                matched_text=match.group(0),
                match_type="explicit",
            )
            continue  # already found via explicit mention, skip synonyms

        # Otherwise check each synonym
        for syn in synonyms:
            pattern = _build_pattern(syn)
            match = pattern.search(text)
            if match:
                found[canonical] = ExtractedSkill(
                    canonical_name=canonical,
                    matched_text=match.group(0),
                    match_type="synonym",
                )
                break

    return sorted(found.values(), key=lambda s: s.canonical_name)
