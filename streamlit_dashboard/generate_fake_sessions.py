import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# Simple faker for sessions.jsonl using the same fields the app writes
# Writes to json-logs/sessions.jsonl at repo root

DISTRACTIONS = [
    "eyes closed",
    "look away",
    "watch phone",
    "chat",
    "music",
    "stretch",
]
APPS = [
    ("VS Code", ["edit code", "read file", "debug"]),
    ("Chrome", ["YouTube", "Docs", "Search"]),
    ("Terminal", ["run build", "git status", "install deps"]),
    ("Slack", ["reply", "read thread"]),
    ("Figma", ["browse designs", "inspect"]),
]


def generate_session() -> dict:
    start_dt = datetime.now() - timedelta(days=random.randint(0, 9),
                                          hours=random.randint(0, 10),
                                          minutes=random.randint(0, 59))
    duration_min = random.randint(15, 60)
    total_sec = duration_min * 60

    # Unfocused between 5% and 45%
    unfocused_ratio = random.uniform(0.05, 0.45)
    total_unfocused_sec = int(total_sec * unfocused_ratio)

    # Longest streak up to 1/3 of unfocused
    longest_streak = random.randint(15, min(600, max(30, total_unfocused_sec // 3))) if total_unfocused_sec > 0 else 0

    app, acts = random.choice(APPS)
    act = random.choice(acts)

    distraction = random.choice(DISTRACTIONS)
    occurrences = random.randint(1, 8)

    end_dt = start_dt + timedelta(seconds=total_sec)

    return {
        "sessionStart": start_dt.isoformat(timespec="seconds"),
        "sessionEnd": end_dt.isoformat(timespec="seconds"),
        "totalDurationSec": total_sec,
        "totalUnfocusedSec": total_unfocused_sec,
        "focusRatio": round((total_sec - total_unfocused_sec) / total_sec, 3),
        "longestUnfocusedStreakSec": longest_streak,
        "mostCommonDistraction": {"activity": distraction, "occurrences": occurrences},
        "mostUsedAppActivity": {"app": app, "activity": act, "occurrences": random.randint(2, 12)},
    }


def main(num_sessions: int = 25):
    repo_root = Path(__file__).resolve().parents[1]
    json_logs = repo_root / "json-logs"
    json_logs.mkdir(parents=True, exist_ok=True)
    out_path = json_logs / "sessions.jsonl"

    # Overwrite with fresh data
    if out_path.exists():
        out_path.unlink()

    with out_path.open("a", encoding="utf-8") as f:
        for _ in range(num_sessions):
            s = generate_session()
            s_with_ts = {"ts": datetime.now().isoformat(timespec="seconds"), **s}
            f.write(json.dumps(s_with_ts) + "\n")

    print(f"Wrote {num_sessions} sessions to {out_path}")


if __name__ == "__main__":
    main()
