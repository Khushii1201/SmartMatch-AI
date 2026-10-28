# SmartMatch AI

An intelligent job-skill matching and career gap analysis system using natural language processing (NLP) and fuzzy logic inference.

---

## 1. System Overview

SmartMatch AI addresses the shortcomings of conventional keyword-matching applicant systems. Rather than relying on rigid binary keyword presence or opaque black-box models, it implements an explainable fuzzy inference pipeline that evaluates non-linear skill alignment, isolates critical capability gaps, and recommends verified learning tracks.

### Key Capabilities

- **Resume Parsing & Skill Extraction:** Extracts text from PDF resumes using PyMuPDF (with automated fallback to pure-Python `pypdf`) and identifies canonical skills and synonyms via regex boundary matching.
- **Job Description Parsing:** Extracts candidate requirements from free-text job descriptions and loads realistic pre-configured engineering profiles.
- **Mamdani Fuzzy Logic Inference:** Evaluates skill suitability through a 9-rule Mamdani fuzzy inference system with triangular membership functions and centroid defuzzification.
- **Weighted Match Aggregation:** Combines per-skill fuzzy suitability scores into a normalized overall alignment score weighted by employer-specified importance.
- **Career Gap Analysis & Priority Scoring:** Isolates missing and weak competencies, prioritizing them by `Job Importance x (10 - Proficiency)`, with mandatory prerequisites prioritized.
- **Curated Learning Recommendations:** Recommends verified courses, documentation, and tutorials from a local catalogue (`data/learning_resources.json`).
- **Multi-Role Job Comparison:** Evaluates a single candidate across multiple saved roles simultaneously to identify optimal career alignment.
- **Session History & CSV Export:** Persists evaluation sessions and skill breakdowns in SQLite, with one-click CSV export functionality.

---

## 2. Architecture and Technology Stack

```
+-------------------------------------------------------------+
|                     Client Interface                        |
|        React 19 + TypeScript + Vite + Tailwind CSS v4       |
|                 Recharts Data Visualizations                |
+-------------------------------------------------------------+
                              |
                              | HTTP REST / JSON (/api)
                              v
+-------------------------------------------------------------+
|                     FastAPI Backend                         |
|   - routers: candidates, jobs, matching, history, skills    |
|   - pydantic: request / response validation schemas        |
|   - CORS middleware configured for Vite development         |
+-------------------------------------------------------------+
         |                     |                      |
         v                     v                      v
+-----------------+   +-----------------+   +------------------+
|    AI Engine    |   | PDF & Utilities |   | SQLite Database  |
| - fuzzy_engine  |   | - pdf_parser    |   | - smartmatch.db  |
| - matcher       |   | - validators    |   | - schema.sql     |
| - gap_analyzer  |   | - report_export |   | - repositories   |
| - normalizer    |   +-----------------+   +------------------+
| - recommender   |
+-----------------+
```

### Backend Components
- **Language & Runtime:** Python 3.11 / 3.12
- **Framework:** FastAPI with Uvicorn ASGI server
- **Fuzzy Inference:** `scikit-fuzzy`, `numpy`, `scipy`
- **PDF Extraction:** `PyMuPDF` with resilient `pypdf` fallback
- **Data Persistence:** SQLite with parameterized queries (`sqlite3`)

### Frontend Components
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 with curated dark SaaS palette
- **Data Visualizations:** Recharts (score gauges, horizontal suitability charts, trend comparisons)
- **Icons:** `lucide-react` (zero emojis across the interface)

---

## 3. Directory Structure

```
smartmatch-ai/
|-- backend/
|   |-- main.py                 # FastAPI application and CORS setup
|   |-- schemas.py              # Pydantic data schemas
|   |-- routers/
|       |-- candidates.py       # Candidate profiles, skills, and resume upload
|       |-- jobs.py             # Job creation, requirements, and text extraction
|       |-- matching.py         # Fuzzy matching, gap analysis, and comparison
|       |-- history.py          # Session logs and CSV report downloads
|       |-- skills.py           # Canonical dictionary endpoints
|-- ai/
|   |-- fuzzy_engine.py         # 9-rule Mamdani fuzzy inference system
|   |-- matching_engine.py      # Weighted overall score aggregation
|   |-- skill_extractor.py      # Word-boundary regex pattern matching
|   |-- skill_normalizer.py     # Synonym mapping and canonical dictionary
|   |-- skill_gap_analyzer.py   # Gap identification and priority calculation
|   |-- recommendation_engine.py# Learning resource mapping
|-- database/
|   |-- db.py                   # SQLite connection and table initialization
|   |-- schema.sql              # Relational schema definition
|   |-- repositories.py         # Parameterized CRUD data access functions
|-- utils/
|   |-- pdf_parser.py           # Resilient PDF text extraction engine
|   |-- report_exporter.py      # CSV export generation
|   |-- validators.py           # Server-side input validation rules
|-- data/
|   |-- skills.json             # ~65 canonical skills and synonyms
|   |-- learning_resources.json # Verified learning resources catalogue
|   |-- sample_jobs.json        # Pre-configured job description templates
|-- frontend/
|   |-- src/
|       |-- pages/              # Seven dedicated dashboard views
|       |-- components/         # Reusable gauges, badges, banners, tables
|       |-- context/            # Global AppContext and toast notifications
|       |-- services/           # Typed API service client
|       |-- types/              # TypeScript interfaces
|-- tests/                      # Automated test suite (Pytest)
|-- requirements.txt            # Python dependencies
|-- .env.example                # Environment configuration template
|-- README.md                   # System documentation
```

---

## 4. Setup and Installation

### Prerequisites
- Python 3.11 or 3.12
- Node.js 18+ and npm

### Backend Setup

1. Open PowerShell or a terminal in the project directory:
   ```powershell
   cd c:\Users\Dell\Downloads\smartmatch-ai-full\smartmatch-ai
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *(If script execution is disabled on Windows, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`)*

3. Upgrade pip and install backend dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Initialize the SQLite database (optional, tables are automatically verified on startup):
   ```powershell
   python database/db.py
   ```

5. Launch the FastAPI server:
   ```powershell
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   The interactive Swagger documentation will be available at: `http://127.0.0.1:8000/docs`

### Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```powershell
   cd c:\Users\Dell\Downloads\smartmatch-ai-full\smartmatch-ai\frontend
   ```

2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   The application dashboard will be live at: `http://localhost:5173`

---

## 5. Running the Test Suite

Execute the automated test suite across all AI engine, database, and API modules:

```powershell
pytest -v
```

The test suite covers:
- Fuzzy membership functions and rule defuzzification
- Word-boundary skill extraction and synonym normalization
- Weighted match score mathematical bounds
- Missing and weak skill gap prioritization
- Database CRUD and foreign key constraints
- FastAPI REST endpoints and status codes

---

## 6. Academic and Design Transparency Notes

- **Pattern Matching Transparency:** Dictionary extraction relies on word-boundary regex expressions. It does not perform semantic negation detection (e.g., "no experience with Docker" will still extract "Docker"). For this reason, all extracted skills are presented to the candidate for review and manual proficiency confirmation before saving.
- **Skill-Alignment Indicator:** All match scores represent mathematical alignment between declared skills and stated job requirements. They do not constitute hiring outcome predictions or evaluations of soft skills, cultural fit, or candidate interview performance.
- **Explainability First:** The Mamdani inference system combines all fired rules weighted by their degree of membership rather than operating as an uninterpretable neural network.
