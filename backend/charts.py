import os
import pandas as pd

RADAR_CATEGORIES = [
    "Win Rate %",
    "Defend Win %",
    "Chase Win %",
    "Toss Win %",
    "Toss-to-Win %",
]


def prepare_chart_data(df, file_path="sports.csv"):
    """
    Prepare all cricket dashboard chart data using authentic match and team metrics.
    """
    if not os.path.exists(file_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", file_path)
        if os.path.exists(alt_path):
            file_path = alt_path

    raw_df = None
    if os.path.exists(file_path):
        raw_df = pd.read_csv(file_path)
        raw_df.columns = raw_df.columns.str.strip()

    # 1. Top Teams Wins Breakdown (Defending vs Chasing)
    top_teams = df.head(10)
    top_teams_wins = {
        "teams": top_teams["Team"].tolist(),
        "bat_first_wins": top_teams["BatFirstWins"].tolist(),
        "chase_wins": top_teams["ChaseWins"].tolist(),
        "total_wins": top_teams["Wins"].tolist(),
        # Aliases for backwards compatibility
        "subjects": top_teams["Team"].tolist(),
        "marks": top_teams["Wins"].tolist(),
    }
    subject_average = {
        "subjects": top_teams["Team"].tolist(),
        "marks": top_teams["Wins"].tolist(),
    }

    # 2. Win Method Distribution (Donut Chart)
    if raw_df is not None and "result" in raw_df.columns:
        result_map = {
            "wickets": "Chased (Wickets)",
            "runs": "Defended (Runs)",
            "tie": "Tied (Super Over)",
            "no result": "No Result",
        }
        res_counts = raw_df["result"].map(result_map).value_counts()
        win_method_distribution = {
            "labels": res_counts.index.tolist(),
            "values": res_counts.values.tolist(),
        }
    else:
        tier_counts = df["Tier"].value_counts()
        win_method_distribution = {
            "labels": tier_counts.index.tolist(),
            "values": tier_counts.values.tolist(),
        }

    grade_distribution = win_method_distribution

    # 3. Matches Played vs Win Rate (Bubble / Scatter Chart)
    win_rate_vs_matches = {
        "team": df["Team"].tolist(),
        "matches": df["Matches"].tolist(),
        "win_rate": df["WinRate"].tolist(),
        "wins": df["Wins"].tolist(),
        "tier": df["Tier"].tolist(),
        # Legacy compatibility aliases
        "average": df["WinRate"].tolist(),
    }

    # 4. Season Scoring Trend (Line Chart)
    if (
        raw_df is not None
        and "season" in raw_df.columns
        and "target_runs" in raw_df.columns
    ):
        raw_clean = raw_df.dropna(subset=["season", "target_runs"]).copy()
        raw_clean["target_runs"] = pd.to_numeric(
            raw_clean["target_runs"], errors="coerce"
        )
        season_trend = (
            raw_clean.groupby("season", as_index=False)["target_runs"]
            .mean()
            .round(1)
        )
        scoring_trend = {
            "seasons": season_trend["season"].tolist(),
            "avg_targets": season_trend["target_runs"].tolist(),
        }
    else:
        scoring_trend = {
            "seasons": df["Team"].tolist(),
            "avg_targets": df["WinRate"].tolist(),
        }

    team_average = {
        "team": scoring_trend["seasons"],
        "average": scoring_trend["avg_targets"],
    }

    # 5. Team Radar Chart (Polar Chart)
    radar_chart = {
        "categories": RADAR_CATEGORIES,
        "teams": [],
    }
    for _, row in df.iterrows():
        stats = [
            float(row.get("WinRate", 0)),
            float(row.get("DefendWinRate", 0)),
            float(row.get("ChaseWinRate", 0)),
            float(row.get("TossWinRate", 0)),
            float(row.get("TossConversion", 0)),
        ]
        radar_chart["teams"].append({
            "name": row["Team"],
            "marks": stats,
            "stats": stats,
        })

    # 6. Correlation Heatmap
    metric_cols = [
        "Matches",
        "Wins",
        "Losses",
        "WinRate",
        "BatFirstWins",
        "ChaseWins",
        "TossWinRate",
        "TossConversion",
    ]
    corr_df = (
        df[metric_cols]
        .rename(
            columns={
                "WinRate": "Win Rate %",
                "BatFirstWins": "Bat 1st Wins",
                "ChaseWins": "Chase Wins",
                "TossWinRate": "Toss Win %",
                "TossConversion": "Toss Conv %",
            }
        )
        .corr()
        .round(2)
    )

    heatmap = {
        "labels": corr_df.columns.tolist(),
        "values": corr_df.values.tolist(),
    }

    return {
        "top_teams_wins": top_teams_wins,
        "subject_average": subject_average,
        "win_method_distribution": win_method_distribution,
        "grade_distribution": grade_distribution,
        "win_rate_vs_matches": win_rate_vs_matches,
        "win_rate_vs_average": win_rate_vs_matches,
        "scoring_trend": scoring_trend,
        "team_average": team_average,
        "radar_chart": radar_chart,
        "heatmap": heatmap,
    }