"""
Tests for the fuzzy inference engine: membership functions, rule
behavior, and output bounds.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.fuzzy_engine import compute_suitability


def test_output_always_within_bounds():
    for p in range(0, 11):
        for i in range(0, 11):
            score = compute_suitability(p, i)
            assert 0.0 <= score <= 100.0, f"Out of bounds for p={p}, i={i}: {score}"


def test_high_proficiency_high_importance_gives_high_suitability():
    score = compute_suitability(10, 10)
    assert score >= 70.0


def test_low_proficiency_high_importance_gives_low_suitability():
    # This is the classic "skill gap" case: the system should flag it
    # with a low score, not a moderate/neutral one.
    score = compute_suitability(0, 10)
    assert score <= 30.0


def test_clamps_out_of_range_inputs():
    # Inputs outside 0-10 should be clamped, not raise an exception.
    score_high = compute_suitability(15, 20)
    score_low = compute_suitability(-5, -3)
    assert 0.0 <= score_high <= 100.0
    assert 0.0 <= score_low <= 100.0


def test_suitability_increases_monotonically_with_proficiency():
    # Holding importance fixed, raising proficiency should never
    # decrease the suitability score.
    importance = 8
    scores = [compute_suitability(p, importance) for p in range(0, 11)]
    for earlier, later in zip(scores, scores[1:]):
        assert later >= earlier - 0.01  # small tolerance for triangular MF edges


def test_suitability_increases_with_importance_when_proficiency_high():
    # A highly proficient candidate should score at least as well when
    # the job cares more about the skill.
    proficiency = 9
    low_importance_score = compute_suitability(proficiency, 1)
    high_importance_score = compute_suitability(proficiency, 9)
    assert high_importance_score >= low_importance_score
