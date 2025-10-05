import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

st.set_page_config(page_title="LockedIn Sessions", page_icon="🔒", layout="wide")

# Glassmorphism styles
st.markdown(
    """
    <style>
    .glass {
      background: linear-gradient(135deg, rgba(34,34,34,0.55), rgba(34,34,34,0.30));
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
      backdrop-filter: blur(18px) saturate(120%);
      -webkit-backdrop-filter: blur(18px) saturate(120%);
      border-radius: 14px;
      padding: 16px;
      color: #f5f5f5;
    }
    .metric { font-weight: 700; font-size: 22px; }
    .subtle { color: #9aa0a6; font-size: 12px; }
    .ok { color: #69e688; }
    .warn { color: #ee8686; }
    .cool { color: #c7d4ff; }
    </style>
    """,
    unsafe_allow_html=True,
)

# Resolve repo root and potential json-logs locations
repo_root = Path(__file__).resolve().parents[1]

# Preferred top-level json-logs path at repo root
sessions_candidates = [
    repo_root.parent / "json-logs" / "sessions.jsonl",            # ../json-logs/sessions.jsonl
    repo_root / "json-logs" / "sessions.jsonl",                   # ./json-logs/sessions.jsonl (under lockedin-private)
]

# Pick the first existing sessions.jsonl
sessions_path = next((p for p in sessions_candidates if p.exists()), None)

st.sidebar.title("Controls")
if st.sidebar.button("Refresh data"):
    st.rerun()

if not sessions_path:
    st.warning(
        "No sessions.jsonl found. Expected at one of: "
        + "\n- " + str(sessions_candidates[0])
        + "\n- " + str(sessions_candidates[1])
        + "\nGenerate with generate_fake_sessions.py or run the Electron app to create sessions."
    )
    st.stop()

records = []
with sessions_path.open("r", encoding="utf-8") as f:
    for line in f:
        if not line.strip():
            continue
        try:
            records.append(json.loads(line))
        except Exception:
            # Skip malformed lines
            pass

if not records:
    st.warning("No valid session records in sessions.jsonl")
    st.stop()

# Normalize into DataFrame

def to_dt(x):
    try:
        return datetime.fromisoformat(x.replace("Z", ""))
    except Exception:
        return None

for r in records:
    r["sessionStart_dt"] = to_dt(r.get("sessionStart"))
    r["sessionEnd_dt"] = to_dt(r.get("sessionEnd"))

df = pd.DataFrame.from_records(records)

# Header
st.markdown("<h2 style='margin-bottom:8px'>🔒 LockedIn - Session Dashboard</h2>", unsafe_allow_html=True)

# Top summary cards
col1, col2, col3, col4 = st.columns([1,1,1,1])
with col1:
    st.markdown("<div class='glass'><div class='subtle'>Total sessions</div><div class='metric ok'>%d</div></div>" % len(df), unsafe_allow_html=True)
with col2:
    total_hours = df["totalDurationSec"].sum() / 3600
    st.markdown("<div class='glass'><div class='subtle'>Total time</div><div class='metric cool'>%.1f h</div></div>" % total_hours, unsafe_allow_html=True)
with col3:
    denom = df["totalDurationSec"].sum()
    avg_focus = (1 - (df["totalUnfocusedSec"].sum() / denom)) if denom > 0 else 1.0
    st.markdown("<div class='glass'><div class='subtle'>Avg focus ratio</div><div class='metric ok'>%d%%</div></div>" % round(avg_focus*100), unsafe_allow_html=True)
with col4:
    longest = df["longestUnfocusedStreakSec"].max()
    st.markdown("<div class='glass'><div class='subtle'>Longest unfocused streak</div><div class='metric warn'>%d s</div></div>" % int(longest), unsafe_allow_html=True)

st.markdown("\n")

# Time series: focus ratio over time
if "sessionEnd_dt" in df:
    df_ts = df.dropna(subset=["sessionEnd_dt"]).sort_values("sessionEnd_dt")
    df_ts["focusPct"] = (1 - (df_ts["totalUnfocusedSec"] / df_ts["totalDurationSec"])) * 100
    fig = px.line(df_ts, x="sessionEnd_dt", y="focusPct", markers=True, title="Focus ratio over time (%)")
    fig.update_layout(template="plotly_dark", height=280, margin=dict(l=10,r=10,t=50,b=10))
    st.plotly_chart(fig, use_container_width=True)

# Breakdown: most common distraction

distractions = df["mostCommonDistraction"].dropna().apply(lambda x: x.get("activity") if isinstance(x, dict) else None)
apps = df["mostUsedAppActivity"].dropna().apply(lambda x: (x.get("app") + " — " + x.get("activity")) if isinstance(x, dict) else None)

colA, colB = st.columns([1,1])
with colA:
    top_d = distractions.value_counts().reset_index()
    top_d.columns = ["activity", "count"]
    fig = px.bar(top_d.head(8), x="activity", y="count", title="Top distractions")
    fig.update_layout(template="plotly_dark", height=300, margin=dict(l=10,r=10,t=50,b=10))
    st.plotly_chart(fig, use_container_width=True)
with colB:
    top_a = apps.value_counts().reset_index()
    top_a.columns = ["app_activity", "count"]
    fig = px.bar(top_a.head(8), x="app_activity", y="count", title="Most used app/activity")
    fig.update_layout(template="plotly_dark", height=300, margin=dict(l=10,r=10,t=50,b=10))
    st.plotly_chart(fig, use_container_width=True)

# Table of sessions
st.markdown("<div class='glass'>", unsafe_allow_html=True)
st.markdown("<div class='subtle'>All sessions</div>", unsafe_allow_html=True)
show_cols = [
    "sessionStart", "sessionEnd", "totalDurationSec", "totalUnfocusedSec", "focusRatio",
    "longestUnfocusedStreakSec", "mostCommonDistraction", "mostUsedAppActivity"
]
view = df[show_cols].copy()
view["focusPct"] = (view["focusRatio"] * 100).round(1)
st.dataframe(view, use_container_width=True, hide_index=True)
st.markdown("</div>", unsafe_allow_html=True)
