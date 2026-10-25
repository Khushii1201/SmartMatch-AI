"""
Fuzzy inference engine for skill-match suitability.

This is a genuine Mamdani-style fuzzy inference system built with
scikit-fuzzy, not a disguised weighted multiplication. It defines:

  - Two input (antecedent) variables, each with three membership
    functions: candidate proficiency (0-10) and job requirement
    importance (0-10), each split into "low", "medium", "high" using
    triangular membership functions.
  - One output (consequent) variable: skill-match suitability (0-100),
    split into "low", "moderate", "high".
  - Nine IF-THEN rules covering every combination of the two inputs'
    three membership levels, designed so that:
      * high proficiency + high importance -> high suitability
      * low proficiency + high importance -> low suitability (a real gap)
      * high proficiency + low importance -> moderate/high suitability
        (the skill is not wasted, but it wasn't the priority)
      * medium combinations -> moderate suitability
  - Mamdani inference with centroid defuzzification (the scikit-fuzzy
    default), which combines all fired rules weighted by their
    membership degree rather than picking a single winning rule.

A fresh ControlSystemSimulation is built per call. This is less
performant than reusing one simulation object across calls, but it is
simpler and avoids subtle state-leak bugs between calls in a
Streamlit app that reruns the whole script on every interaction.
"""

import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

from config import (
    PROFICIENCY_MIN,
    PROFICIENCY_MAX,
    IMPORTANCE_MIN,
    IMPORTANCE_MAX,
    SUITABILITY_MIN,
    SUITABILITY_MAX,
)


def _build_control_system() -> ctrl.ControlSystem:
    proficiency = ctrl.Antecedent(
        np.arange(PROFICIENCY_MIN, PROFICIENCY_MAX + 1, 1), "proficiency"
    )
    importance = ctrl.Antecedent(
        np.arange(IMPORTANCE_MIN, IMPORTANCE_MAX + 1, 1), "importance"
    )
    suitability = ctrl.Consequent(
        np.arange(SUITABILITY_MIN, SUITABILITY_MAX + 1, 1), "suitability"
    )

    # Triangular membership functions spanning the 0-10 input ranges.
    proficiency["low"] = fuzz.trimf(proficiency.universe, [0, 0, 5])
    proficiency["medium"] = fuzz.trimf(proficiency.universe, [2, 5, 8])
    proficiency["high"] = fuzz.trimf(proficiency.universe, [5, 10, 10])

    importance["low"] = fuzz.trimf(importance.universe, [0, 0, 5])
    importance["medium"] = fuzz.trimf(importance.universe, [2, 5, 8])
    importance["high"] = fuzz.trimf(importance.universe, [5, 10, 10])

    suitability["low"] = fuzz.trimf(suitability.universe, [0, 0, 50])
    suitability["moderate"] = fuzz.trimf(suitability.universe, [20, 50, 80])
    suitability["high"] = fuzz.trimf(suitability.universe, [50, 100, 100])

    rules = [
        # proficiency HIGH
        ctrl.Rule(proficiency["high"] & importance["high"], suitability["high"]),
        ctrl.Rule(proficiency["high"] & importance["medium"], suitability["high"]),
        ctrl.Rule(proficiency["high"] & importance["low"], suitability["moderate"]),
        # proficiency MEDIUM
        ctrl.Rule(proficiency["medium"] & importance["high"], suitability["moderate"]),
        ctrl.Rule(proficiency["medium"] & importance["medium"], suitability["moderate"]),
        ctrl.Rule(proficiency["medium"] & importance["low"], suitability["moderate"]),
        # proficiency LOW
        ctrl.Rule(proficiency["low"] & importance["high"], suitability["low"]),
        ctrl.Rule(proficiency["low"] & importance["medium"], suitability["low"]),
        ctrl.Rule(proficiency["low"] & importance["low"], suitability["moderate"]),
    ]

    return ctrl.ControlSystem(rules)


def compute_suitability(proficiency_value: float, importance_value: float) -> float:
    """
    Run the fuzzy inference system for one (proficiency, importance)
    pair and return the defuzzified suitability score in [0, 100].

    proficiency_value: candidate's self-rated or confirmed proficiency, 0-10
    importance_value: job's stated importance for this skill, 0-10
    """
    proficiency_value = max(PROFICIENCY_MIN, min(PROFICIENCY_MAX, proficiency_value))
    importance_value = max(IMPORTANCE_MIN, min(IMPORTANCE_MAX, importance_value))

    system = _build_control_system()
    sim = ctrl.ControlSystemSimulation(system)
    sim.input["proficiency"] = proficiency_value
    sim.input["importance"] = importance_value
    sim.compute()
    return round(float(sim.output["suitability"]), 2)
