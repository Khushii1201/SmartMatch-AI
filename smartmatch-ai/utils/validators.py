"""
Input validation helpers used across the Streamlit UI and the AI
pipeline. Each validator returns (is_valid: bool, error_message: str).
"""

MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_pdf_upload(filename: str, file_bytes: bytes) -> tuple[bool, str]:
    if not filename.lower().endswith(".pdf"):
        return False, "Only .pdf files are accepted."
    if not file_bytes:
        return False, "The uploaded file is empty."
    if len(file_bytes) > MAX_PDF_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        return False, f"File is {size_mb:.1f} MB; the limit is 10 MB."
    return True, ""


def validate_proficiency(value) -> tuple[bool, str]:
    try:
        v = int(value)
    except (TypeError, ValueError):
        return False, "Proficiency must be a whole number."
    if not (0 <= v <= 10):
        return False, "Proficiency must be between 0 and 10."
    return True, ""


def validate_importance(value) -> tuple[bool, str]:
    try:
        v = int(value)
    except (TypeError, ValueError):
        return False, "Importance must be a whole number."
    if not (0 <= v <= 10):
        return False, "Importance must be between 0 and 10."
    return True, ""


def validate_job_description(title: str, requirements: list) -> tuple[bool, str]:
    if not title or not title.strip():
        return False, "Job title cannot be empty."
    if not requirements:
        return False, "Add at least one skill requirement before saving this job."
    return True, ""


def validate_candidate_name(name: str) -> tuple[bool, str]:
    if not name or not name.strip():
        return False, "Candidate name cannot be empty."
    if len(name.strip()) > 100:
        return False, "Candidate name is too long (max 100 characters)."
    return True, ""
