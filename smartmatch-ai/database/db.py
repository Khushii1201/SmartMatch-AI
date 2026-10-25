"""
Database connection and initialization for SmartMatch AI.

Uses SQLite. The database file lives at config.DATABASE_PATH so the path
is resolved relative to the project root regardless of the working
directory the app is launched from (avoids Windows relative-path bugs).
"""

import sqlite3
from pathlib import Path

from config import DATABASE_PATH, DATABASE_DIR

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection() -> sqlite3.Connection:
    """
    Return a new SQLite connection with foreign keys enabled and rows
    returned as dict-like Row objects.
    """
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Create all tables if they do not already exist. Safe to call every
    time the application starts.
    """
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()


def reset_db() -> None:
    """
    DEVELOPMENT ONLY: deletes the database file entirely and recreates
    an empty schema. Use this when you want to wipe all candidates,
    jobs, and match history during development/testing.
    """
    if DATABASE_PATH.exists():
        DATABASE_PATH.unlink()
    init_db()


if __name__ == "__main__":
    # Allows running: python database/db.py  (from the project root)
    init_db()
    print(f"Database initialized at: {DATABASE_PATH}")
