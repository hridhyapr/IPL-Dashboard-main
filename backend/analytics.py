import os
import pandas as pd


def analyze_data(df, file_path="sports.csv"):
    """Compute cricket team rankings, performance benchmarks, and sports data quality metrics."""
    df = df.copy()

    # If raw match data file exists, compute overall tournament metrics from it
    if not os.path.exists(file_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", file_path)
        if os.path.exists(alt_path):
            file_path = alt_path

    total_matches = 0
    avg_target = 0.0
    chasing_win_rate = 0.0
    defending_win_rate = 0.0
    toss_advantage = 0.0
    quality = {
        "Rows": len(df),
        "Columns": len(df.columns),
        "Missing Values": int(df.isnull().sum().sum()),
        "Duplicate Rows": int(df.duplicated().sum()),
    }

    if os.path.exists(file_path):
        raw_df = pd.read_csv(file_path)
        raw_df.columns = raw_df.columns.str.strip()
        total_matches = len(raw_df)
        target_series = pd.to_numeric(raw_df["target_runs"], errors="coerce").dropna()
        avg_target = round(float(target_series.mean()), 1) if not target_series.empty else 0.0

        wickets_wins = len(raw_df[raw_df["result"] == "wickets"])
        runs_wins = len(raw_df[raw_df["result"] == "runs"])
        chasing_win_rate = (
            round((wickets_wins / total_matches) * 100, 1) if total_matches > 0 else 0.0
        )
        defending_win_rate = (
            round((runs_wins / total_matches) * 100, 1) if total_matches > 0 else 0.0
        )

        toss_matches = raw_df[raw_df["toss_winner"].notnull() & raw_df["winner"].notnull()]
        toss_and_match = len(
            toss_matches[toss_matches["toss_winner"] == toss_matches["winner"]]
        )
        toss_advantage = (
            round((toss_and_match / len(toss_matches)) * 100, 1)
            if len(toss_matches) > 0
            else 0.0
        )

        quality = {
            "Rows": len(raw_df),
            "Columns": len(raw_df.columns),
            "Missing Values": int(raw_df.isnull().sum().sum()),
            "Duplicate Rows": int(raw_df.duplicated().sum()),
        }

    ranking = (
        df.sort_values(["Wins", "WinRate"], ascending=False)
        .reset_index(drop=True)
        .copy()
    )
    if "Rank" in ranking.columns:
        ranking = ranking.drop(columns=["Rank"])
    ranking.insert(0, "Rank", range(1, len(ranking) + 1))

    topper_team = ranking.iloc[0]["Team"]
    lowest_team = ranking.iloc[-1]["Team"]
    highest_win_rate_val = round(float(ranking["WinRate"].max()), 1)
    highest_win_rate_team = ranking.loc[ranking["WinRate"].idxmax()]["Team"]

    metrics = {
        "total_teams": len(df),
        "total_matches": total_matches or int(df["Matches"].sum() // 2),
        "most_wins": int(ranking.iloc[0]["Wins"]),
        "highest_win_rate": highest_win_rate_val,
        "highest_win_team": highest_win_rate_team,
        "topper": topper_team,
        "needs_support": lowest_team,
        "avg_target": avg_target,
        "chasing_win_rate": chasing_win_rate,
        "defending_win_rate": defending_win_rate,
        "toss_advantage": toss_advantage,
        # Legacy compatibility keys:
        "average_score": total_matches or int(df["Matches"].sum() // 2),
        "highest_average": int(ranking.iloc[0]["Wins"]),
        "above_85": chasing_win_rate,
        "below_60": toss_advantage,
    }

    performance = {
        "top5": ranking.head(5).to_dict("records"),
        "bottom5": ranking.tail(5).to_dict("records"),
        "elite_teams": ranking[ranking["Tier"] == "Elite"]["Team"].tolist(),
    }

    numeric_cols = [
        c
        for c in [
            "Matches",
            "Wins",
            "Losses",
            "WinRate",
            "BatFirstWins",
            "ChaseWins",
            "TossWinRate",
            "TossConversion",
        ]
        if c in df.columns
    ]
    statistics = df[numeric_cols].describe().round(2).to_dict()

    return metrics, ranking, performance, statistics, quality