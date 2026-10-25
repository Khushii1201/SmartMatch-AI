-- SmartMatch AI database schema
-- Designed for SQLite. Run via database/db.py:init_db()

CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency INTEGER NOT NULL CHECK (proficiency >= 0 AND proficiency <= 10),
    source TEXT NOT NULL DEFAULT 'manual', -- 'resume_explicit', 'resume_synonym', 'manual'
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    UNIQUE (candidate_id, skill_name)
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    importance INTEGER NOT NULL CHECK (importance >= 0 AND importance <= 10),
    mandatory INTEGER NOT NULL DEFAULT 0, -- 0 = preferred, 1 = mandatory
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE (job_id, skill_name)
);

CREATE TABLE IF NOT EXISTS match_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    overall_score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    candidate_proficiency INTEGER NOT NULL,
    job_importance INTEGER NOT NULL,
    suitability_score REAL NOT NULL,
    status TEXT NOT NULL, -- 'matched', 'weak', 'missing'
    FOREIGN KEY (session_id) REFERENCES match_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_requirements_job ON job_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_match_sessions_candidate ON match_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_results_session ON match_results(session_id);
