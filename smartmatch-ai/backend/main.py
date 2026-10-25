"""
FastAPI application entry point for SmartMatch AI.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from backend.routers import candidates, jobs, skills, matching, history


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist on startup
    init_db()
    yield


app = FastAPI(
    title="SmartMatch AI API",
    description="Fuzzy-logic job-skill matcher and career gap analysis REST API.",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for Vite dev server and standard frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(skills.router)
app.include_router(matching.router)
app.include_router(history.router)


@app.get("/")
def root():
    return {
        "name": "SmartMatch AI API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "status": "online",
        "disclaimer": "All match scores are skill-alignment indicators, not hiring predictions.",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
