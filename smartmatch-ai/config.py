"""
Central configuration for SmartMatch AI.
Paths are built relative to this file so the app works regardless of
the current working directory when launched (avoids Windows path bugs).
"""

from pathlib import Path

# Project root = the folder this file lives in
BASE_DIR = Path(__file__).resolve().parent

# Data files
DATA_DIR = BASE_DIR / "data"
SKILLS_DICTIONARY_PATH = DATA_DIR / "skills.json"
LEARNING_RESOURCES_PATH = DATA_DIR / "learning_resources.json"
SAMPLE_JOBS_PATH = DATA_DIR / "sample_jobs.json"

# Database
DATABASE_DIR = BASE_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "smartmatch.db"

# Fuzzy matching bounds (used across ai/ modules in later phases)
PROFICIENCY_MIN = 0
PROFICIENCY_MAX = 10
IMPORTANCE_MIN = 0
IMPORTANCE_MAX = 10
SUITABILITY_MIN = 0
SUITABILITY_MAX = 100
