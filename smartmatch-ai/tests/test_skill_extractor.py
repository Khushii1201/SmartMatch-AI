"""
Tests for skill normalization and dictionary-based extraction.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.skill_normalizer import normalize_skill, all_canonical_skills
from ai.skill_extractor import extract_skills_from_text


def test_normalize_known_synonym():
    # "js" is a configured synonym for "JavaScript"; normalization should
    # resolve it to the canonical name.
    assert normalize_skill("js") == "JavaScript"


def test_normalize_known_synonym_case_insensitive():
    assert normalize_skill("PYTHON") == "Python"
    assert normalize_skill("Postgres") == "PostgreSQL"


def test_normalize_unknown_term_returns_none():
    assert normalize_skill("flibbertigibbet") is None


def test_extract_explicit_vs_synonym_mentions():
    text = "Skilled in Python and js, also used sklearn for modeling."
    skills = {s.canonical_name: s for s in extract_skills_from_text(text)}
    assert "Python" in skills
    assert skills["Python"].match_type == "explicit"
    assert "JavaScript" in skills
    assert skills["JavaScript"].match_type == "synonym"
    assert "scikit-learn" in skills


def test_extract_does_not_false_positive_substring():
    # "java" should NOT match inside "javascript"
    text = "I only know JavaScript, not the Java language."
    skills = {s.canonical_name for s in extract_skills_from_text(text)}
    assert "JavaScript" in skills
    assert "Java" in skills  # "Java" also appears as its own word later


def test_extract_no_false_match_for_substring_only():
    text = "I have worked extensively with JavaScript frameworks."
    skills = {s.canonical_name for s in extract_skills_from_text(text)}
    # "Java" must not be wrongly detected purely from "JavaScript"
    assert "Java" not in skills


def test_extract_empty_text_returns_empty_list():
    assert extract_skills_from_text("") == []
    assert extract_skills_from_text("   ") == []


def test_extract_multiword_phrase():
    text = "Strong background in machine learning and REST APIs."
    skills = {s.canonical_name for s in extract_skills_from_text(text)}
    assert "Machine Learning" in skills
    assert "REST APIs" in skills


def test_all_canonical_skills_nonempty_and_sorted():
    skills = all_canonical_skills()
    assert len(skills) > 0
    assert skills == sorted(skills)
