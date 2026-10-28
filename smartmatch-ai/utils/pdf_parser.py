"""
PDF text extraction with PyMuPDF (fitz) and pure-Python pypdf fallback.
"""

import io

try:
    import fitz  # PyMuPDF
except (ImportError, ModuleNotFoundError, Exception):
    fitz = None

try:
    import pypdf
except (ImportError, ModuleNotFoundError, Exception):
    pypdf = None


class PDFParsingError(Exception):
    """Raised when a PDF cannot be opened or contains no extractable text."""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract plain text from a PDF given as raw bytes.
    First attempts extraction via PyMuPDF (fitz); if unavailable or fails,
    falls back to pypdf. Raises PDFParsingError on invalid/empty files.
    """
    if not file_bytes:
        raise PDFParsingError("The uploaded file is empty.")

    text_parts: list[str] = []
    extracted_successfully = False

    # Attempt 1: PyMuPDF (fitz)
    if fitz is not None:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            try:
                text_parts = [page.get_text() for page in doc]
                extracted_successfully = True
            finally:
                doc.close()
        except Exception:
            # Fall through to pypdf fallback
            extracted_successfully = False

    # Attempt 2: pypdf fallback
    if not extracted_successfully:
        if pypdf is not None:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text_parts = [page.extract_text() or "" for page in reader.pages]
                extracted_successfully = True
            except Exception as exc:
                raise PDFParsingError(f"Could not parse file as PDF: {exc}") from exc
        else:
            if fitz is None:
                raise PDFParsingError(
                    "No PDF extraction engine is installed. Please install 'pymupdf' or 'pypdf'."
                )

    full_text = "\n".join(text_parts).strip()

    if not full_text:
        raise PDFParsingError(
            "No extractable text was found in this PDF. "
            "It may be a scanned image without an OCR text layer."
        )

    return full_text

