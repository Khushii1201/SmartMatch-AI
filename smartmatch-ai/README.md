# SmartMatch AI: Intelligent Job-Skill Matching and Career Gap Analysis System

SmartMatch AI is an intelligent, explainable career analytics platform that matches talent profiles to job descriptions using natural language processing (NLP) and fuzzy logic inference.

---

## 1. Executive Summary

Traditional applicant tracking systems (ATS) rely heavily on naive exact-keyword matching or uninterpretable machine learning classifiers. This creates significant problems:
- Candidates who use synonyms or alternate phrasing are erroneously penalized.
- Binary keyword filters fail to evaluate whether a candidate's self-assessed depth of proficiency is genuinely suited to the seniority and importance demanded by the employer.
- Black-box classifiers provide no actionable feedback on where a candidate fell short or how to address the deficit.

SmartMatch AI solves this by introducing a transparent, explainable pipeline:
1. **Dictionary-Based NLP Extraction:** Uses word-boundary-aware regex patterns to match canonical technical skills and known synonyms from resumes and job descriptions without false substring matches (e.g., distinguishing "Java" from "JavaScript").
2. **Mamdani Fuzzy Logic Inference:** Evaluates skill suitability through a 9-rule fuzzy inference system with triangular membership functions and centroid defuzzification, capturing human-like qualitative reasoning.
3. **Importance-Weighted Match Scoring:** Computes overall alignment by weighting per-skill suitability against the employer's stated requirement priorities.
4. **Actionable Gap Prioritization:** Calculates priority scores for deficient skills and links them to a curated catalog of verified learning resources.
5. **Multi-Job Comparative Analysis:** Simultaneously evaluates a candidate across multiple targets to identify optimal career alignment.

---

## 2. System Architecture

```
+-------------------------------------------------------------------------+
|                        Frontend Presentation Layer                      |
|                  React 19 + TypeScript + Vite + Tailwind CSS v4          |
|      - Responsive Dark SaaS Interface                                   |
|      - Interactive Recharts Visualizations (Semi-circle Gauges, Bars)    |
|      - Lucide Professional Iconography (Zero Emojis)                    |
+-------------------------------------------------------------------------+
                                     |
                                     | RESTful JSON API (/api)
                                     v
+-------------------------------------------------------------------------+
|                         FastAPI Backend Layer                           |
|      - Uvicorn High-Performance ASGI Engine                             |
|      - Pydantic v2 Request/Response Validation                          |
|      - CORS Middleware configured for local and network clients         |
|      - Modular Routers: Candidates, Jobs, Matching, History, Skills     |
+-------------------------------------------------------------------------+
            |                             |                       |
            v                             v                       v
+-----------------------+     +-----------------------+    +--------------+
|     AI Core Engine    |     |   PDF & Data Utilities|    | SQLite Store |
| - fuzzy_engine.py     |     | - pdf_parser.py       |    | - db.py      |
| - matching_engine.py  |     |   (PyMuPDF + pypdf)   |    | - schema.sql |
| - skill_extractor.py  |     | - validators.py       |    | - repos.py   |
| - skill_normalizer.py |     | - report_exporter.py  |    +--------------+
| - gap_analyzer.py     |     +-----------------------+
| - recommender.py      |
+-----------------------+
```

---

## 3. Core Mathematical and Algorithmic Foundations

### 3.1 Mamdani Fuzzy Inference Engine

The suitability of each skill is computed via Mamdani fuzzy inference (`ai/fuzzy_engine.py`):

- **Input 1: Candidate Proficiency** ($P \in [0, 10]$)
  - `low`: triangular [0, 0, 5]
  - `medium`: triangular [2, 5, 8]
  - `high`: triangular [5, 10, 10]
- **Input 2: Job Requirement Importance** ($I \in [0, 10]$)
  - `low`: triangular [0, 0, 5]
  - `medium`: triangular [2, 5, 8]
  - `high`: triangular [5, 10, 10]
- **Output: Suitability Score** ($S \in [0, 100]$)
  - `low`: triangular [0, 0, 50]
  - `moderate`: triangular [20, 50, 80]
  - `high`: triangular [50, 100, 100]

#### Complete 9-Rule Inference Matrix

| Candidate Proficiency | Job Importance | Inferred Suitability | Semantic Rationale |
| :--- | :--- | :--- | :--- |
| **High** | **High** | **High** | Strong candidate proficiency on a critical requirement. |
| **High** | **Medium** | **High** | Candidate comfortably satisfies a secondary skill. |
| **High** | **Low** | **Moderate** | Strong skill, but not an employer priority. |
| **Medium** | **High** | **Moderate** | Partial fit on a critical requirement; room for growth. |
| **Medium** | **Medium** | **Moderate** | Balanced fit on a standard requirement. |
| **Medium** | **Low** | **Moderate** | Candidate meets a minor preference. |
| **Low** | **High** | **Low** | Critical gap; candidate lacks proficiency on a vital role need. |
| **Low** | **Medium** | **Low** | Notable gap on a desired requirement. |
| **Low** | **Low** | **Moderate** | Deficit is negligible because requirement importance is low. |

All active rules contribute to the output through fuzzy union and are defuzzified into a crisp suitability percentage using the centroid method.

### 3.2 Overall Match Aggregation Formula

The overall match score aggregates individual skill suitability weighted by employer importance (`ai/matching_engine.py`):

$$\text{Overall Score} = \frac{\sum_{i=1}^{N} \left( \text{Importance}_i \times \text{Suitability}_i \right)}{\sum_{i=1}^{N} \text{Importance}_i}$$

If no requirements are defined or total importance is zero, the score safely defaults to 0.0 without division-by-zero errors.

### 3.3 Skill-Gap Prioritization Formula

Skills with status `weak` (suitability < 50.0) or `missing` (candidate proficiency = 0) are prioritized for career remediation (`ai/skill_gap_analyzer.py`):

$$\text{Priority Score} = \text{Job Importance} \times (10 - \text{Candidate Proficiency})$$

- Mandatory job requirements are sorted ahead of preferred requirements at equal priority scores.
- Highest priority is assigned to mandatory skills of high importance where candidate proficiency is zero.

---

## 4. REST API Endpoint Reference

The backend exposes a fully documented OpenAPI specification at `/docs`.

### Candidates (`/api/candidates`)
- `GET /api/candidates` — List all candidates (newest first).
- `POST /api/candidates` — Create a new candidate profile (`{ "name": string }`).
- `GET /api/candidates/{id}` — Retrieve candidate profile details.
- `GET /api/candidates/{id}/skills` — List all saved skills and proficiencies for a candidate.
- `POST /api/candidates/{id}/skills` — Upsert a single skill with proficiency (0-10) and source tag.
- `POST /api/candidates/{id}/skills/batch` — Bulk upsert multiple skills confirmed from resume parsing.
- `DELETE /api/candidates/{id}/skills/{skill_name}` — Remove a skill from a candidate profile.
- `POST /api/candidates/upload-resume` — Multipart upload of a PDF resume. Extracts raw text and detects candidate skills.

### Jobs (`/api/jobs`)
- `GET /api/jobs` — List all saved jobs and their skill requirements.
- `POST /api/jobs` — Create a new job with title, description, and list of requirements.
- `GET /api/jobs/{id}` — Retrieve job details and requirement list.
- `DELETE /api/jobs/{id}` — Delete a job and its associated requirements.
- `GET /api/jobs/samples` — Retrieve pre-configured sample jobs from `data/sample_jobs.json`.
- `POST /api/jobs/extract-requirements` — Scan free text to suggest skills and default importance levels.
- `GET /api/jobs/{id}/requirements` — List requirements for a specific job.
- `POST /api/jobs/{id}/requirements` — Upsert a requirement on an existing job.

### Matching & Analytics (`/api/matching`)
- `POST /api/matching/run` — Compute fuzzy match between a candidate and job; persists session to SQLite.
- `POST /api/matching/gap-analysis` — Generate gap isolation and curated learning recommendations.
- `POST /api/matching/compare-jobs` — Compare a single candidate against multiple jobs, returning ranked fit.
- `POST /api/matching/export-csv` — Generate and stream downloadable CSV match report.

### Match History (`/api/history`)
- `GET /api/history/sessions` — List past evaluation sessions (optional `?candidate_id=` filter).
- `GET /api/history/sessions/{id}` — Retrieve detailed per-skill breakdown of a past session.
- `GET /api/history/sessions/{id}/export-csv` — Export a past session to CSV.

### Skills Dictionary (`/api/skills`)
- `GET /api/skills/canonical` — List all ~65 canonical skill names sorted alphabetically.
- `GET /api/skills/dictionary` — Retrieve the full canonical-to-synonyms mapping dictionary.

### System (`/api/health`)
- `GET /api/health` — Backend health check (`{ "status": "healthy" }`).

---

## 5. Technology Stack and Dependencies

### Backend Dependencies (`requirements.txt`)
- **FastAPI (`>=0.110.0`):** Modern asynchronous REST framework.
- **Uvicorn (`>=0.28.0`):** Lightning-fast ASGI web server.
- **Pydantic (`>=2.6.0`):** High-performance type validation.
- **scikit-fuzzy (`>=0.4.2`):** Python fuzzy logic toolkit for Mamdani inference.
- **numpy (`>=1.26.0,<2.3.0`):** Numerical array operations.
- **scipy (`>=1.11.0`):** Scientific algorithms.
- **pandas (`>=2.2.0`):** Tabular data representation and CSV export formatting.
- **PyMuPDF (`>=1.24.0`):** High-speed PDF text extraction engine.
- **pypdf (`>=4.0.0`):** Pure-Python fallback PDF parser.
- **python-multipart (`>=0.0.9`):** Streaming multipart file upload handling.
- **httpx (`>=0.27.0`):** Async HTTP client for integration testing.
- **pytest (`>=8.0.0`):** Automated test runner.

### Frontend Dependencies (`frontend/package.json`)
- **React 19 (`^19.3.1`):** UI component framework.
- **TypeScript (`~6.0.3`):** Strict type safety.
- **Vite (`^8.3.4`):** Modern build tool and development server.
- **Tailwind CSS v4 (`^4.3.3`):** Utility-first styling engine.
- **Recharts (`^3.10.1`):** Composable SVG chart library.
- **lucide-react (`^1.61.0`):** Clean, professional icon set (no emojis).

---

## 6. Directory Layout

```
smartmatch-ai/
|-- backend/
|   |-- main.py                 # FastAPI application, CORS, lifespan, and root endpoints
|   |-- schemas.py              # Pydantic validation models
|   |-- routers/
|       |-- candidates.py       # Candidate profile, skills, and resume upload endpoints
|       |-- jobs.py             # Job creation, requirements, and text extraction
|       |-- matching.py         # Match calculation, gap analysis, and comparison
|       |-- history.py          # Session history and CSV report generation
|       |-- skills.py           # Canonical skills dictionary endpoints
|-- ai/
|   |-- fuzzy_engine.py         # 9-rule Mamdani fuzzy inference system
|   |-- matching_engine.py      # Weighted overall match aggregation formula
|   |-- skill_extractor.py      # Word-boundary regex pattern matching
|   |-- skill_normalizer.py     # Synonym mapping and canonical dictionary lookup
|   |-- skill_gap_analyzer.py   # Gap isolation and priority ranking
|   |-- recommendation_engine.py# Learning resource mapping engine
|-- database/
|   |-- db.py                   # SQLite connection and schema execution
|   |-- schema.sql              # Relational database schema with foreign keys
|   |-- repositories.py         # Parameterized SQL data access operations
|-- utils/
|   |-- pdf_parser.py           # Dual-engine PDF text extractor (PyMuPDF + pypdf)
|   |-- report_exporter.py      # CSV match report export utilities
|   |-- validators.py           # Validation rules for proficiencies, importance, PDFs
|-- data/
|   |-- skills.json             # Canonical skills and synonym aliases
|   |-- learning_resources.json # Curated learning resources catalogue
|   |-- sample_jobs.json        # Pre-configured sample job specifications
|-- frontend/
|   |-- src/
|       |-- pages/              # Seven dashboard views
|       |-- components/         # Gauges, banners, badges, tables, skeletons
|       |-- context/            # Global AppContext and toast notifications
|       |-- services/           # Typed REST API client
|       |-- types/              # Domain TypeScript interfaces
|       |-- index.css           # Design tokens, typography, glassmorphism styles
|       |-- App.tsx             # Root layout and view switcher
|       |-- main.tsx            # React application entry point
|   |-- package.json
|   |-- vite.config.ts          # Vite configuration and backend API proxy
|-- tests/
|   |-- test_api.py             # FastAPI integration tests
|   |-- test_database.py        # SQLite schema and repository tests
|   |-- test_fuzzy_engine.py    # Mamdani inference and rule verification tests
|   |-- test_matching_engine.py # Weighted match score bound tests
|   |-- test_skill_extractor.py # Regex boundary and synonym normalization tests
|-- requirements.txt            # Python backend dependencies
|-- .env.example                # Environment configuration template
|-- .gitignore                  # Git ignore rules for Python, Node, and databases
|-- README.md                   # Comprehensive project documentation
```

---

## 7. Setup and Execution Guide

### Prerequisites
- Python 3.11 or 3.12 installed
- Node.js 18+ and npm installed

### 7.1 Backend Setup

1. Open PowerShell or a terminal in the project root:
   ```powershell
   cd c:\Users\Dell\Downloads\smartmatch-ai-full\smartmatch-ai
   ```

2. Activate the virtual environment (or create one if needed):
   ```powershell
   # If creating fresh:
   python -m venv .venv

   # Activate on Windows:
   .\.venv\Scripts\Activate.ps1
   ```
   *(If PowerShell reports a script execution policy restriction, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once).*

3. Upgrade pip and install the backend dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Initialize the SQLite database:
   ```powershell
   python database/db.py
   ```

5. Start the FastAPI backend server:
   ```powershell
   python -m uvicorn backend.main:app --reload --port 8000
   ```
   - API Root: `http://127.0.0.1:8000`
   - Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`
   - ReDoc Documentation: `http://127.0.0.1:8000/redoc`

### 7.2 Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```powershell
   cd c:\Users\Dell\Downloads\smartmatch-ai-full\smartmatch-ai\frontend
   ```

2. Install npm dependencies:
   ```powershell
   npm install
   ```

3. Launch the Vite development server:
   ```powershell
   npm run dev
   ```
   - Application URL: `http://localhost:5173`

---

## 8. Automated Testing

The automated test suite provides regression protection across all AI modules, database repositories, and API endpoints:

```powershell
pytest -v
```

### Test Coverage Highlights
- **`test_fuzzy_engine.py`:** Validates membership functions, edge-case proficiency/importance values, and centroid output bounds ($0 \le S \le 100$).
- **`test_skill_extractor.py`:** Ensures word-boundary safety (e.g., verifying that "Java" does not match within "JavaScript"), checks punctuation handling (e.g., "C++"), and verifies synonym alias resolution.
- **`test_matching_engine.py`:** Confirms weighted aggregation mathematics, verifies that score monotonically increases with proficiency, and ensures that empty candidate skill sets are handled cleanly without dividing by zero.
- **`test_database.py`:** Tests foreign key constraints, table creation idempotency, and repository CRUD functions.
- **`test_api.py`:** Tests the entire REST workflow from candidate creation, PDF upload, job requirement extraction, matching session execution, to CSV downloading.

---

## 9. Dashboard Pages and User Workflows

1. **Home Overview (`/`):** Executive KPI cards (candidate counts, saved job roles, historical sessions), interactive explainability notes, and high-level architecture cards.
2. **Candidate Profile (`/profile`):**
   - Drag-and-drop PDF resume uploader.
   - Skill extraction review table allowing candidates to confirm or uncheck detected skills and adjust self-assessed proficiency (0-10).
   - Fast manual skill adder with canonical dictionary search.
   - Real-time inline proficiency updater and skill deletion.
3. **Job Management (`/jobs`):**
   - Free-text job description analyzer that extracts candidate requirements with default importance levels.
   - 1-click sample job loader with realistic software engineering profiles.
   - Requirement importance sliders (0-10) and mandatory vs. preferred flags.
4. **AI Matching Dashboard (`/matching`):**
   - Quick candidate selector with live skill count indicator.
   - Animated semi-circular SVG score gauge indicating alignment tier.
   - Recharts horizontal bar chart depicting per-skill fuzzy suitability.
   - Tabular breakdown of candidate proficiency vs. job importance.
   - One-click CSV export button.
5. **Skill-Gap Analysis (`/gaps`):**
   - Isolates strong matches from critical gaps.
   - Prioritizes gaps by `Job Importance x (10 - Proficiency)`.
   - Recommends verified tutorials, official documentation, and courses from `data/learning_resources.json`.
6. **Multi-Job Comparison (`/comparison`):**
   - Compare an active candidate against multiple saved jobs simultaneously.
   - Visual comparative bar chart ranking overall suitability across target roles.
7. **Reports & Session History (`/reports`):**
   - Historical audit log of every match execution stored in SQLite.
   - Timeline chart showing score trends.
   - Detailed session breakdown inspector with CSV download capability.

---

## 10. Design and Academic Transparency Notes

- **Pattern Matching Boundaries:** The extraction engine uses dictionary-driven word-boundary regular expressions rather than an opaque LLM. It does not perform grammatical negation detection (for example, "no experience with Kubernetes" will match "Kubernetes"). For this reason, the UI requires explicit user confirmation before saving detected skills.
- **Skill-Alignment Indicator:** All calculated match scores are skill-alignment indicators reflecting the correspondence between declared competencies and stated requirements. They do not claim to forecast real-world hiring decisions, interview success, or non-technical cultural alignment.
- **Explainability by Design:** Every suitability percentage can be traced directly back to the fired Mamdani rules and centroid defuzzification, ensuring complete explainability for academic and engineering evaluation.
- **Professional UI Standards:** The application enforces a clean dark SaaS aesthetic with consistent typography, subtle glassmorphic panels, structured visual hierarchy, and professional Lucide icons without any emojis.
