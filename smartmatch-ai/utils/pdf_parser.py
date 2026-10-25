"""
PDF text extraction using PyMuPDF (imported as `fitz`).
"""

import fitz  # PyMuPDF


class PDFParsingError(Exception):
    """Raised when a PDF cannot be opened or contains no extractable text."""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract plain text from a PDF given as raw bytes (e.g. from a
    Streamlit file_uploader). Raises PDFParsingError on a malformed
    file or empty/non-text PDF rather than letting a cryptic exception
    propagate to the UI.
    """
    if not file_bytes:
        raise PDFParsingError("The uploaded file is empty.")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise PDFParsingError(f"Could not open file as a PDF: {exc}") from exc

    try:
        text_parts = [page.get_text() for page in doc]
    finally:
        doc.close()

    full_text = "\n".join(text_parts).strip()

    if not full_text:
        raise PDFParsingError(
            "No extractable text was found in this PDF. "
            "It may be a scanned image without a text layer."
        )

    return full_text
