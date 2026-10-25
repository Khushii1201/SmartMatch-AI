"""
SmartMatch AI — Streamlit application entry point.

A single-file UI (per the project's required structure) that wires
together the database, AI, and utils layers. Run with:

    streamlit run app.py
"""

import json

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from config import SAMPLE_JOBS_PATH
from database.db import init_db
from database import repositories as repo
from ai.skill_extractor import extract_skills_from_text
from ai.skill_normalizer import all_canonical_skills, normalize_skill
from ai.matching_engine import compute_match
from ai.skill_gap_analyzer import analyze_gaps, matched_skills
from ai.recommendation_engine import build_recommendations
from utils.pdf_parser import extract_text_from_pdf, PDFParsingError
from utils.validators import (
    validate_pdf_upload,
    validate_proficiency,
    validate_importance,
    validate_job_description,
    validate_candidate_name,
)
from utils.report_exporter import export_match_report_csv, match_report_to_dataframe


# ---------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------

st.set_page_config(page_title="SmartMatch AI", layout="wide", page_icon="🎯")
init_db()

if "candidate_id" not in st.session_state:
    st.session_state.candidate_id = None
if "pending_extracted_skills" not in st.session_state:
    st.session_state.pending_extracted_skills = []
if "last_match_report" not in st.session_state:
    st.session_state.last_match_report = None
if "last_match_job_title" not in st.session_state:
    st.session_state.last_match_job_title = None


def get_current_candidate():
    if st.session_state.candidate_id is None:
        return None
    return repo.get_candidate(st.session_state.candidate_id)


# ---------------------------------------------------------------------
# Sidebar navigation
# ---------------------------------------------------------------------

PAGES = [
    "Home",
    "Candidate Profile",
    "Job Description Management",
    "AI Matching Dashboard",
    "Skill-Gap Analysis",
    "Job Comparison",
    "Reports & History",
]

st.sidebar.title("SmartMatch AI")
page = st.sidebar.radio("Navigate", PAGES)

candidate = get_current_candidate()
st.sidebar.markdown("---")
if candidate:
    st.sidebar.success(f"Active candidate: **{candidate['name']}**")
else:
    st.sidebar.warning("No candidate profile selected yet.")

existing_candidates = repo.list_candidates()
if existing_candidates:
    st.sidebar.markdown("**Switch candidate:**")
    options = {c["name"]: c["id"] for c in existing_candidates}
    chosen = st.sidebar.selectbox(
        "Select an existing candidate",
        ["(none)"] + list(options.keys()),
        label_visibility="collapsed",
    )
    if chosen != "(none)":
        st.session_state.candidate_id = options[chosen]


# ---------------------------------------------------------------------
# PAGE: Home
# ---------------------------------------------------------------------

if page == "Home":
    st.title("🎯 SmartMatch AI")
    st.subheader("Intelligent Job–Skill Matching and Career Gap Analysis")

    st.markdown(
        """
        SmartMatch AI compares a candidate's skills against one or more job
        descriptions using **fuzzy logic**, not simple keyword counting.
        It produces an explainable match score, highlights skill gaps, and
        recommends what to learn next.
        """
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("### 1. Build a profile")
        st.write("Upload a resume PDF or manually add skills with a proficiency (0–10) for each.")
    with col2:
        st.markdown("### 2. Define jobs")
        st.write("Paste job descriptions; skills and their importance (0–10) are extracted automatically and are editable.")
    with col3:
        st.markdown("### 3. Get matched")
        st.write("A fuzzy inference engine scores each skill, then an overall weighted score and a prioritized gap list are generated.")

    st.markdown("---")
    st.markdown(
        """
        **Important:** the match score is a *skill-alignment indicator*, not a
        prediction of hiring probability. It reflects only how well your
        stated skills and proficiencies line up with a job's stated skill
        requirements — it says nothing about interview performance, other
        candidates, or non-skill hiring factors.
        """
    )

    if not candidate:
        st.info("Start by creating a candidate profile from the sidebar.")


# ---------------------------------------------------------------------
# PAGE: Candidate Profile
# ---------------------------------------------------------------------

elif page == "Candidate Profile":
    st.title("Candidate Profile")

    with st.expander("Create a new candidate", expanded=(candidate is None)):
        new_name = st.text_input("Candidate name (fictional/sample names recommended for testing)")
        if st.button("Create candidate"):
            valid, msg = validate_candidate_name(new_name)
            if not valid:
                st.error(msg)
            else:
                new_id = repo.create_candidate(new_name.strip())
                st.session_state.candidate_id = new_id
                st.success(f"Candidate '{new_name}' created.")
                st.rerun()

    candidate = get_current_candidate()
    if not candidate:
        st.stop()

    st.markdown(f"### Editing profile: **{candidate['name']}**")

    st.markdown("#### Step 1 — Upload resume (optional)")
    uploaded = st.file_uploader("Upload a PDF resume", type=["pdf"])
    if uploaded is not None:
        file_bytes = uploaded.read()
        valid, msg = validate_pdf_upload(uploaded.name, file_bytes)
        if not valid:
            st.error(msg)
        else:
            try:
                resume_text = extract_text_from_pdf(file_bytes)
                st.success("Text extracted from resume.")
                with st.expander("View extracted resume text"):
                    st.text_area("Extracted text", resume_text, height=200, label_visibility="collapsed")

                extracted = extract_skills_from_text(resume_text)
                st.session_state.pending_extracted_skills = extracted
            except PDFParsingError as e:
                st.error(str(e))

    st.markdown("#### Step 2 — Review, correct, and confirm extracted skills")
    if st.session_state.pending_extracted_skills:
        st.caption(
            "These skills were detected automatically. 'explicit' means the "
            "skill name itself appeared; 'synonym' means an alternate "
            "spelling/abbreviation was normalized. Uncheck anything incorrect, "
            "then set a proficiency and confirm."
        )
        confirmed_rows = []
        for skill in st.session_state.pending_extracted_skills:
            c1, c2, c3, c4 = st.columns([0.1, 0.35, 0.25, 0.3])
            with c1:
                include = st.checkbox("", value=True, key=f"inc_{skill.canonical_name}")
            with c2:
                st.write(f"**{skill.canonical_name}**")
            with c3:
                st.caption(f"{skill.match_type} (\"{skill.matched_text}\")")
            with c4:
                prof = st.slider(
                    "Proficiency", 0, 10, 5, key=f"prof_{skill.canonical_name}",
                    label_visibility="collapsed",
                )
            if include:
                confirmed_rows.append((skill.canonical_name, prof))

        if st.button("Save confirmed skills to profile"):
            for skill_name, prof in confirmed_rows:
                repo.upsert_candidate_skill(candidate["id"], skill_name, prof, source="resume_extracted")
            st.session_state.pending_extracted_skills = []
            st.success(f"Saved {len(confirmed_rows)} skill(s) to profile.")
            st.rerun()
    else:
        st.caption("No pending extracted skills. Upload a resume above, or add skills manually below.")

    st.markdown("#### Step 3 — Add or edit skills manually")
    manual_col1, manual_col2, manual_col3 = st.columns([0.4, 0.3, 0.3])
    with manual_col1:
        manual_skill = st.selectbox("Skill", [""] + all_canonical_skills(), key="manual_skill_select")
    with manual_col2:
        manual_prof = st.slider("Proficiency (0-10)", 0, 10, 5, key="manual_prof_slider")
    with manual_col3:
        st.write("")
        st.write("")
        if st.button("Add / update skill"):
            if manual_skill:
                repo.upsert_candidate_skill(candidate["id"], manual_skill, manual_prof, source="manual")
                st.success(f"'{manual_skill}' set to proficiency {manual_prof}.")
                st.rerun()
            else:
                st.error("Choose a skill first.")

    st.markdown("#### Current saved skills")
    current_skills = repo.get_candidate_skills(candidate["id"])
    if current_skills:
        df = pd.DataFrame(current_skills)[["skill_name", "proficiency", "source"]]
        df.columns = ["Skill", "Proficiency (0-10)", "Source"]
        st.dataframe(df, use_container_width=True, hide_index=True)

        remove_skill = st.selectbox(
            "Remove a skill", ["(none)"] + [s["skill_name"] for s in current_skills]
        )
        if remove_skill != "(none)" and st.button("Remove selected skill"):
            repo.delete_candidate_skill(candidate["id"], remove_skill)
            st.rerun()
    else:
        st.info("No skills saved yet for this candidate.")


# ---------------------------------------------------------------------
# PAGE: Job Description Management
# ---------------------------------------------------------------------

elif page == "Job Description Management":
    st.title("Job Description Management")

    with st.expander("Load a fictional sample job (optional starting point)"):
        with open(SAMPLE_JOBS_PATH, "r", encoding="utf-8") as f:
            sample_jobs = json.load(f)
        sample_choice = st.selectbox(
            "Sample jobs", ["(none)"] + [j["title"] for j in sample_jobs]
        )
        if sample_choice != "(none)" and st.button("Load this sample into the form below"):
            chosen_job = next(j for j in sample_jobs if j["title"] == sample_choice)
            st.session_state["job_title_input"] = chosen_job["title"]
            st.session_state["job_desc_input"] = chosen_job["description"]
            st.session_state["sample_requirements"] = chosen_job["requirements"]
            st.rerun()

    st.markdown("#### Step 1 — Job title and description")
    job_title = st.text_input("Job title", key="job_title_input")
    job_desc = st.text_area("Paste the job description here", height=180, key="job_desc_input")

    extracted_reqs = []
    if job_desc.strip() and st.button("Extract candidate skill requirements from description"):
        extracted = extract_skills_from_text(job_desc)
        st.session_state["draft_requirements"] = [
            {"skill_name": s.canonical_name, "importance": 5, "mandatory": True}
            for s in extracted
        ]

    if "sample_requirements" in st.session_state and "draft_requirements" not in st.session_state:
        st.session_state["draft_requirements"] = st.session_state.pop("sample_requirements")

    st.markdown("#### Step 2 — Confirm skills, set importance, mark mandatory vs preferred")
    draft_requirements = st.session_state.get("draft_requirements", [])

    if draft_requirements:
        final_requirements = []
        for i, req in enumerate(draft_requirements):
            c1, c2, c3, c4 = st.columns([0.1, 0.3, 0.3, 0.3])
            with c1:
                include = st.checkbox("", value=True, key=f"job_inc_{i}_{req['skill_name']}")
            with c2:
                st.write(f"**{req['skill_name']}**")
            with c3:
                importance = st.slider(
                    "Importance", 0, 10, req.get("importance", 5),
                    key=f"job_imp_{i}_{req['skill_name']}", label_visibility="collapsed",
                )
            with c4:
                mandatory = st.checkbox(
                    "Mandatory", value=req.get("mandatory", True),
                    key=f"job_mand_{i}_{req['skill_name']}",
                )
            if include:
                final_requirements.append(
                    {"skill_name": req["skill_name"], "importance": importance, "mandatory": mandatory}
                )

        add_skill_col1, add_skill_col2 = st.columns([0.6, 0.4])
        with add_skill_col1:
            extra_skill = st.selectbox(
                "Add another required skill", [""] + all_canonical_skills(), key="extra_job_skill"
            )
        with add_skill_col2:
            st.write("")
            st.write("")
            if st.button("Add this skill to requirements") and extra_skill:
                st.session_state["draft_requirements"].append(
                    {"skill_name": extra_skill, "importance": 5, "mandatory": True}
                )
                st.rerun()

        st.markdown("#### Step 3 — Save job")
        if st.button("Save job to database", type="primary"):
            valid, msg = validate_job_description(job_title, final_requirements)
            if not valid:
                st.error(msg)
            else:
                job_id = repo.create_job(job_title.strip(), job_desc.strip())
                for req in final_requirements:
                    repo.upsert_job_requirement(
                        job_id, req["skill_name"], req["importance"], req["mandatory"]
                    )
                st.success(f"Job '{job_title}' saved with {len(final_requirements)} requirement(s).")
                st.session_state.pop("draft_requirements", None)
                st.rerun()
    else:
        st.caption(
            "Paste a description above and click 'Extract candidate skill requirements', "
            "or load a sample job, to populate the requirement list."
        )

    st.markdown("---")
    st.markdown("#### Saved jobs")
    jobs = repo.list_jobs()
    if jobs:
        for job in jobs:
            with st.expander(f"{job['title']}"):
                reqs = repo.get_job_requirements(job["id"])
                if reqs:
                    df = pd.DataFrame(reqs)[["skill_name", "importance", "mandatory"]]
                    df["mandatory"] = df["mandatory"].map({1: "Mandatory", 0: "Preferred"})
                    df.columns = ["Skill", "Importance (0-10)", "Requirement Type"]
                    st.dataframe(df, use_container_width=True, hide_index=True)
                else:
                    st.caption("No requirements saved for this job.")
                if st.button("Delete this job", key=f"del_job_{job['id']}"):
                    repo.delete_job(job["id"])
                    st.rerun()
    else:
        st.info("No jobs saved yet.")


# ---------------------------------------------------------------------
# PAGE: AI Matching Dashboard
# ---------------------------------------------------------------------

elif page == "AI Matching Dashboard":
    st.title("AI Matching Dashboard")

    if not candidate:
        st.warning("Select or create a candidate profile first.")
        st.stop()

    jobs = repo.list_jobs()
    if not jobs:
        st.warning("No jobs saved yet. Add one on the 'Job Description Management' page.")
        st.stop()

    job_titles = {j["title"]: j["id"] for j in jobs}
    chosen_job_title = st.selectbox("Select a job to match against", list(job_titles.keys()))
    chosen_job_id = job_titles[chosen_job_title]

    candidate_skills_rows = repo.get_candidate_skills(candidate["id"])
    candidate_skills = {s["skill_name"]: s["proficiency"] for s in candidate_skills_rows}
    job_requirements = repo.get_job_requirements(chosen_job_id)

    if not candidate_skills:
        st.warning("This candidate has no saved skills yet. Add some on the Candidate Profile page.")
        st.stop()

    if st.button("Run AI match", type="primary"):
        report = compute_match(candidate_skills, job_requirements)
        st.session_state.last_match_report = report
        st.session_state.last_match_job_title = chosen_job_title

        session_id = repo.save_match_session(candidate["id"], chosen_job_id, report.overall_score)
        repo.save_match_results(
            session_id,
            [
                {
                    "skill_name": r.skill_name,
                    "candidate_proficiency": r.candidate_proficiency,
                    "job_importance": r.job_importance,
                    "suitability_score": r.suitability_score,
                    "status": r.status,
                }
                for r in report.skill_results
            ],
        )

    report = st.session_state.last_match_report
    if report and st.session_state.last_match_job_title == chosen_job_title:
        st.markdown("### Overall Skill-Alignment Score")
        score_col, gauge_col = st.columns([0.3, 0.7])
        with score_col:
            st.metric("Overall Score", f"{report.overall_score:.1f} / 100")
        with gauge_col:
            fig = go.Figure(
                go.Indicator(
                    mode="gauge+number",
                    value=report.overall_score,
                    gauge={"axis": {"range": [0, 100]},
                           "bar": {"color": "#2563eb"},
                           "steps": [
                               {"range": [0, 50], "color": "#fecaca"},
                               {"range": [50, 75], "color": "#fef08a"},
                               {"range": [75, 100], "color": "#bbf7d0"},
                           ]},
                )
            )
            fig.update_layout(height=220, margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig, use_container_width=True)

        st.caption(
            "This score is a skill-alignment indicator (weighted by how important each "
            "skill is to the job), not a prediction of hiring probability."
        )

        st.markdown("### Skill-by-Skill Breakdown")
        df = match_report_to_dataframe(report)
        status_color = {"matched": "🟢", "weak": "🟡", "missing": "🔴"}
        df_display = df.copy()
        df_display["Status"] = df_display["Status"].map(lambda s: f"{status_color.get(s,'')} {s}")
        st.dataframe(df_display, use_container_width=True, hide_index=True)

        chart_df = df.sort_values("Suitability Score (0-100)", ascending=True)
        fig2 = px.bar(
            chart_df, x="Suitability Score (0-100)", y="Skill", orientation="h",
            color="Status", color_discrete_map={"matched": "#22c55e", "weak": "#eab308", "missing": "#ef4444"},
            title="Fuzzy suitability score per skill",
        )
        fig2.update_layout(height=max(300, 40 * len(chart_df)))
        st.plotly_chart(fig2, use_container_width=True)

        csv_bytes = export_match_report_csv(report)
        st.download_button(
            "Download this match report as CSV", data=csv_bytes,
            file_name=f"smartmatch_{candidate['name']}_{chosen_job_title}.csv".replace(" ", "_"),
            mime="text/csv",
        )
    else:
        st.info("Click 'Run AI match' to generate a score.")


# ---------------------------------------------------------------------
# PAGE: Skill-Gap Analysis
# ---------------------------------------------------------------------

elif page == "Skill-Gap Analysis":
    st.title("Skill-Gap Analysis")

    report = st.session_state.last_match_report
    if not report:
        st.info("Run a match on the 'AI Matching Dashboard' page first.")
        st.stop()

    st.caption(f"Based on the most recent match against: **{st.session_state.last_match_job_title}**")

    gaps = analyze_gaps(report)
    matched = matched_skills(report)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"### ✅ Strong matches ({len(matched)})")
        if matched:
            for m in matched:
                st.write(f"**{m.skill_name}** — suitability {m.suitability_score:.0f}/100 "
                         f"(your proficiency: {m.candidate_proficiency}/10, job importance: {m.job_importance}/10)")
        else:
            st.caption("No strong matches yet.")

    with col2:
        st.markdown(f"### ⚠️ Gaps to address ({len(gaps)})")
        if gaps:
            for g in gaps:
                badge = "🔴 Missing" if g.status == "missing" else "🟡 Weak"
                mand = "Mandatory" if g.mandatory else "Preferred"
                st.write(
                    f"{badge} — **{g.skill_name}** ({mand}) — priority score {g.priority_score:.0f} "
                    f"(your proficiency: {g.candidate_proficiency}/10, job importance: {g.job_importance}/10)"
                )
        else:
            st.success("No skill gaps detected for this job!")

    if gaps:
        st.markdown("### 📚 Recommended learning priorities")
        recs = build_recommendations(gaps)
        for rec in recs:
            with st.expander(f"{rec['skill_name']} (priority {rec['priority_score']:.0f})"):
                if rec["resources"]:
                    for res in rec["resources"]:
                        st.write(f"- [{res['title']}]({res['url']}) — *{res['type']}*")
                else:
                    st.caption("No curated resources on file for this skill yet.")


# ---------------------------------------------------------------------
# PAGE: Job Comparison
# ---------------------------------------------------------------------

elif page == "Job Comparison":
    st.title("Job Comparison")

    if not candidate:
        st.warning("Select or create a candidate profile first.")
        st.stop()

    jobs = repo.list_jobs()
    if len(jobs) < 1:
        st.warning("No jobs saved yet.")
        st.stop()

    job_titles = {j["title"]: j["id"] for j in jobs}
    selected_titles = st.multiselect(
        "Select jobs to compare", list(job_titles.keys()), default=list(job_titles.keys())[: min(3, len(jobs))]
    )

    candidate_skills_rows = repo.get_candidate_skills(candidate["id"])
    candidate_skills = {s["skill_name"]: s["proficiency"] for s in candidate_skills_rows}

    if not candidate_skills:
        st.warning("This candidate has no saved skills yet.")
        st.stop()

    if selected_titles and st.button("Compare selected jobs", type="primary"):
        comparison_rows = []
        detailed_reports = {}
        for title in selected_titles:
            job_id = job_titles[title]
            reqs = repo.get_job_requirements(job_id)
            report = compute_match(candidate_skills, reqs)
            detailed_reports[title] = report
            gaps = analyze_gaps(report)
            matched = matched_skills(report)
            top_gap = gaps[0].skill_name if gaps else "None"
            comparison_rows.append(
                {
                    "Job": title,
                    "Overall Score": report.overall_score,
                    "Strong Matches": len(matched),
                    "Gaps": len(gaps),
                    "Top Priority Gap": top_gap,
                }
            )

        df = pd.DataFrame(comparison_rows).sort_values("Overall Score", ascending=False)
        st.markdown("### Comparison results (sorted by match score)")
        st.dataframe(df, use_container_width=True, hide_index=True)

        fig = px.bar(df, x="Job", y="Overall Score", color="Overall Score",
                     color_continuous_scale="Blues", title="Overall match score by job")
        fig.update_layout(yaxis_range=[0, 100])
        st.plotly_chart(fig, use_container_width=True)

        with st.expander("View detailed skill breakdown per job"):
            for title, report in detailed_reports.items():
                st.markdown(f"**{title}** — {report.overall_score:.1f}/100")
                st.dataframe(match_report_to_dataframe(report), use_container_width=True, hide_index=True)


# ---------------------------------------------------------------------
# PAGE: Reports & History
# ---------------------------------------------------------------------

elif page == "Reports & History":
    st.title("Reports & History")

    if not candidate:
        st.warning("Select or create a candidate profile first.")
        st.stop()

    sessions = repo.list_match_sessions(candidate["id"])
    if not sessions:
        st.info("No match sessions saved yet. Run a match on the AI Matching Dashboard page.")
        st.stop()

    df = pd.DataFrame(sessions)[["created_at", "job_title", "overall_score"]]
    df.columns = ["Date", "Job", "Overall Score"]
    st.dataframe(df, use_container_width=True, hide_index=True)

    fig = px.line(df.sort_values("Date"), x="Date", y="Overall Score", color="Job", markers=True,
                  title="Score history over time")
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("### View a past session's detail")
    session_options = {
        f"{s['job_title']} — {s['created_at']} — {s['overall_score']:.1f}/100": s["id"]
        for s in sessions
    }
    chosen = st.selectbox("Select a session", list(session_options.keys()))
    if chosen:
        session_id = session_options[chosen]
        results = repo.get_match_results(session_id)
        if results:
            rdf = pd.DataFrame(results)[
                ["skill_name", "candidate_proficiency", "job_importance", "suitability_score", "status"]
            ]
            rdf.columns = ["Skill", "Proficiency", "Importance", "Suitability", "Status"]
            st.dataframe(rdf, use_container_width=True, hide_index=True)

            csv_buffer = rdf.to_csv(index=False).encode("utf-8")
            st.download_button("Download this session as CSV", data=csv_buffer,
                                file_name=f"smartmatch_session_{session_id}.csv", mime="text/csv")
