"""
Export match results as CSV (always available, no extra dependencies).
Returns bytes suitable for st.download_button.
"""

import io
import pandas as pd

from ai.matching_engine import MatchReport


def match_report_to_dataframe(report: MatchReport) -> pd.DataFrame:
    rows = [
        {
            "Skill": r.skill_name,
            "Candidate Proficiency (0-10)": r.candidate_proficiency,
            "Job Importance (0-10)": r.job_importance,
            "Mandatory": "Yes" if r.mandatory else "Preferred",
            "Suitability Score (0-100)": r.suitability_score,
            "Status": r.status,
        }
        for r in report.skill_results
    ]
    return pd.DataFrame(rows)


def export_match_report_csv(report: MatchReport) -> bytes:
    df = match_report_to_dataframe(report)
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return buffer.getvalue().encode("utf-8")
