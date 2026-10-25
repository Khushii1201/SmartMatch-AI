"""
Repository functions for SmartMatch AI.

Every function opens its own short-lived connection and uses
parameterized queries exclusively (never string-formatted SQL) to avoid
injection issues and to handle special characters in skill names safely.
"""

from typing import Optional

from database.db import get_connection


# ---------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------

def create_candidate(name: str) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO candidates (name) VALUES (?)", (name,)
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_candidate(candidate_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM candidates WHERE id = ?", (candidate_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_candidates() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM candidates ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------
# Candidate skills
# ---------------------------------------------------------------------

def upsert_candidate_skill(
    candidate_id: int, skill_name: str, proficiency: int, source: str = "manual"
) -> None:
    """
    Insert a candidate skill, or update proficiency/source if the skill
    already exists for this candidate (duplicate skills are collapsed,
    not duplicated as separate rows).
    """
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO candidate_skills (candidate_id, skill_name, proficiency, source)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(candidate_id, skill_name)
            DO UPDATE SET proficiency = excluded.proficiency, source = excluded.source
            """,
            (candidate_id, skill_name, proficiency, source),
        )
        conn.commit()
    finally:
        conn.close()


def delete_candidate_skill(candidate_id: int, skill_name: str) -> None:
    conn = get_connection()
    try:
        conn.execute(
            "DELETE FROM candidate_skills WHERE candidate_id = ? AND skill_name = ?",
            (candidate_id, skill_name),
        )
        conn.commit()
    finally:
        conn.close()


def get_candidate_skills(candidate_id: int) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM candidate_skills WHERE candidate_id = ? ORDER BY skill_name",
            (candidate_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------

def create_job(title: str, description: str = "") -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO jobs (title, description) VALUES (?, ?)",
            (title, description),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_job(job_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_jobs() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def delete_job(job_id: int) -> None:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------
# Job requirements
# ---------------------------------------------------------------------

def upsert_job_requirement(
    job_id: int, skill_name: str, importance: int, mandatory: bool
) -> None:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO job_requirements (job_id, skill_name, importance, mandatory)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(job_id, skill_name)
            DO UPDATE SET importance = excluded.importance, mandatory = excluded.mandatory
            """,
            (job_id, skill_name, importance, int(mandatory)),
        )
        conn.commit()
    finally:
        conn.close()


def get_job_requirements(job_id: int) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM job_requirements WHERE job_id = ? ORDER BY importance DESC",
            (job_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ---------------------------------------------------------------------
# Match sessions and results
# ---------------------------------------------------------------------

def save_match_session(candidate_id: int, job_id: int, overall_score: float) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO match_sessions (candidate_id, job_id, overall_score)
            VALUES (?, ?, ?)
            """,
            (candidate_id, job_id, overall_score),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def save_match_results(session_id: int, results: list[dict]) -> None:
    """
    results: list of dicts each with keys:
        skill_name, candidate_proficiency, job_importance,
        suitability_score, status
    """
    conn = get_connection()
    try:
        conn.executemany(
            """
            INSERT INTO match_results
                (session_id, skill_name, candidate_proficiency, job_importance,
                 suitability_score, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    session_id,
                    r["skill_name"],
                    r["candidate_proficiency"],
                    r["job_importance"],
                    r["suitability_score"],
                    r["status"],
                )
                for r in results
            ],
        )
        conn.commit()
    finally:
        conn.close()


def list_match_sessions(candidate_id: Optional[int] = None) -> list[dict]:
    conn = get_connection()
    try:
        if candidate_id is not None:
            rows = conn.execute(
                """
                SELECT ms.*, j.title AS job_title, c.name AS candidate_name
                FROM match_sessions ms
                JOIN jobs j ON j.id = ms.job_id
                JOIN candidates c ON c.id = ms.candidate_id
                WHERE ms.candidate_id = ?
                ORDER BY ms.created_at DESC
                """,
                (candidate_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT ms.*, j.title AS job_title, c.name AS candidate_name
                FROM match_sessions ms
                JOIN jobs j ON j.id = ms.job_id
                JOIN candidates c ON c.id = ms.candidate_id
                ORDER BY ms.created_at DESC
                """
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_match_results(session_id: int) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM match_results WHERE session_id = ? ORDER BY job_importance DESC",
            (session_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
