# SmartMatch AI

An intelligent job–skill matching and career gap analysis system using
NLP-based skill extraction and fuzzy logic inference. Built as a
third-year BTech CSE academic project.

## What it does

1. Extracts skills from an uploaded resume PDF (or lets you add them
   manually), using a configurable dictionary of ~65 skills and their
   synonyms (`data/skills.json`).
2. Extracts required skills from a pasted job description the same way,
   with editable importance (0–10) and mandatory/preferred flags.
3. Scores each candidate skill against each job requirement using a real
   Mamdani fuzzy inference system (`ai/fuzzy_engine.py`, built with
   scikit-fuzzy): triangular membership functions, 9 IF-THEN rules, and
   centroid defuzzification.
4. Combines per-skill scores into one overall score using a documented
   weighted formula (`ai/matching_engine.py`).
5. Identifies missing/weak skills, prioritizes them by importance × gap
   size, and recommends resources from a local catalogue
   (`data/learning_resources.json`) — nothing invented.
6. Lets you compare one candidate against multiple saved jobs, and keeps
   a history of past match sessions in SQLite.

## Running it (Windows / VS Code)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
streamlit run app.py
```

If PowerShell blocks activation, run once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Running tests

```powershell
pytest -v
```

30 tests cover skill normalization/extraction, fuzzy membership and rule
behavior, weighted matching and gap prioritization, and database
persistence.

## Resetting the database

The SQLite file lives at `database/smartmatch.db` and is excluded from
git via `.gitignore`. To wipe it during development, either delete that
file and restart the app (tables are recreated automatically), or run:

```powershell
python -c "from database.db import reset_db; reset_db()"
```

## Known limitations (be upfront about these in the viva)

- **Dictionary-based extraction does not detect negation.** A resume
  sentence like "no experience with Docker" will still cause "Docker"
  to be extracted, because the matcher looks for the term's presence,
  not its grammatical context. This is why Phase 3's extraction UI
  always shows extracted skills for the user to correct before saving.
- **Proficiency is user-confirmed, not inferred from resume text.** The
  system does not claim to measure actual skill level from wording.
- **The overall score is a skill-alignment indicator**, not a hiring
  probability — it reflects only stated skills vs. stated requirements.
- Synthetic/fictional sample data is used throughout; no real hiring
  outcomes were measured, so no accuracy/improvement percentage is
  claimed anywhere in this project.

## Project structure

```
smartmatch-ai/
    app.py                  # Streamlit UI (all pages)
    config.py                # Central paths and fuzzy bounds
    requirements.txt
    ai/
        skill_extractor.py    # Dictionary-based extraction from text
        skill_normalizer.py   # Synonym -> canonical skill mapping
        fuzzy_engine.py        # Mamdani fuzzy inference system
        matching_engine.py     # Weighted overall score
        skill_gap_analyzer.py  # Missing/weak skill prioritization
        recommendation_engine.py
    database/
        db.py                  # Connection + init
        schema.sql
        repositories.py        # Parameterized CRUD
    utils/
        pdf_parser.py           # PyMuPDF text extraction
        validators.py
        report_exporter.py      # CSV export
    data/
        skills.json             # Skill dictionary + synonyms
        learning_resources.json # Local resource catalogue
        sample_jobs.json         # Fictional sample jobs
    tests/                        # 30 pytest tests, all passing
```
