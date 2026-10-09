import os
import pandas as pd
import numpy as np

# Team name normalization mapping for IPL franchise renames/aliases
TEAM_NAME_MAP = {
    "Rising Pune Supergiants": "Rising Pune Supergiant",
    "Royal Challengers Bengaluru": "Royal Challengers Bangalore",
    "Delhi Daredevils": "Delhi Capitals",
    "Kings XI Punjab": "Punjab Kings",
}

# Core performance metric pillars for cricket teams
METRIC_COLUMNS = [
    "WinRate",
    "DefendWinRate",
    "ChaseWinRate",
    "TossWinRate",
    "TossConversion",
]

# Legacy subject keys for backward compatibility
SUBJECTS = ["Python", "SQL", "Power BI", "AI"]


def determine_innings(df):
    """Determine which team batted first and which team chased (batted second)."""
    def get_bat_first(row):
        toss_dec = str(row.get("toss_decision", "")).strip().lower()
        toss_win = row.get("toss_winner")
        team1 = row.get("team1")
        team2 = row.get("team2")
        if toss_dec == "bat":
            return toss_win
        elif toss_dec == "field":
            return team2 if toss_win == team1 else team1
        return None

    df["bat_first"] = df.apply(get_bat_first, axis=1)
    df["bat_second"] = df.apply(
        lambda r: r["team2"] if r["bat_first"] == r["team1"] else r["team1"],
        axis=1,
    )
    return df


def preprocess_data(file_path="sports.csv"):
    """
    Convert the raw match-level sports data into an enriched team-performance dataset
    with complete match metrics, win rates, chasing/defending statistics, and tier rankings.
    """
    if not os.path.exists(file_path):
        alt_path = os.path.join(os.path.dirname(__file__), "..", file_path)
        if os.path.exists(alt_path):
            file_path = alt_path

    raw_df = pd.read_csv(file_path)
    raw_df.columns = raw_df.columns.str.strip()
    raw_df = raw_df.drop_duplicates().copy()
    raw_df = raw_df.replace({"NA": pd.NA, "": pd.NA})

    # Standardize team names across all relevant columns
    for col in ["team1", "team2", "winner", "toss_winner"]:
        if col in raw_df.columns:
            raw_df[col] = raw_df[col].replace(TEAM_NAME_MAP)

    raw_df = determine_innings(raw_df)

    # Collect unique valid teams
    teams = sorted(
        set(raw_df["team1"].dropna().unique()).union(
            set(raw_df["team2"].dropna().unique())
        )
    )

    team_records = []
    for team in teams:
        team_matches = raw_df[
            (raw_df["team1"] == team) | (raw_df["team2"] == team)
        ]
        matches_count = len(team_matches)
        if matches_count == 0:
            continue

        wins = len(team_matches[team_matches["winner"] == team])
        toss_wins = len(team_matches[team_matches["toss_winner"] == team])
        toss_match_wins = len(
            team_matches[
                (team_matches["toss_winner"] == team)
                & (team_matches["winner"] == team)
            ]
        )

        bat_first_matches = len(team_matches[team_matches["bat_first"] == team])
        bat_first_wins = len(
            team_matches[
                (team_matches["bat_first"] == team)
                & (team_matches["winner"] == team)
            ]
        )

        chase_matches = len(team_matches[team_matches["bat_second"] == team])
        chase_wins = len(
            team_matches[
                (team_matches["bat_second"] == team)
                & (team_matches["winner"] == team)
            ]
        )

        losses = matches_count - wins
        win_rate = round((wins / matches_count) * 100, 1)
        toss_win_rate = round((toss_wins / matches_count) * 100, 1)
        toss_conversion = (
            round((toss_match_wins / toss_wins) * 100, 1) if toss_wins > 0 else 0.0
        )
        defend_win_rate = (
            round((bat_first_wins / bat_first_matches) * 100, 1)
            if bat_first_matches > 0
            else 0.0
        )
        chase_win_rate = (
            round((chase_wins / chase_matches) * 100, 1)
            if chase_matches > 0
            else 0.0
        )

        if win_rate >= 55.0:
            tier = "Elite"
        elif win_rate >= 50.0:
            tier = "Strong"
        elif win_rate >= 45.0:
            tier = "Competitive"
        else:
            tier = "Developing"

        # Legacy backward-compatibility aliases
        record = {
            "Team": team,
            "Matches": matches_count,
            "Wins": wins,
            "Losses": losses,
            "WinRate": win_rate,
            "BatFirstMatches": bat_first_matches,
            "BatFirstWins": bat_first_wins,
            "DefendWinRate": defend_win_rate,
            "ChaseMatches": chase_matches,
            "ChaseWins": chase_wins,
            "ChaseWinRate": chase_win_rate,
            "TossWins": toss_wins,
            "TossWinRate": toss_win_rate,
            "TossMatchWins": toss_match_wins,
            "TossConversion": toss_conversion,
            "Tier": tier,
            # Legacy fields for any old references:
            "Python": win_rate,
            "SQL": defend_win_rate,
            "Power BI": chase_win_rate,
            "AI": toss_win_rate,
            "Attendance": toss_win_rate,
            "Grade": "A+" if tier == "Elite" else ("A" if tier == "Strong" else ("B" if tier == "Competitive" else "C")),
            "Total Marks": round(win_rate + defend_win_rate + chase_win_rate + toss_win_rate, 1),
            "Average": win_rate,
        }
        team_records.append(record)

    df_teams = (
        pd.DataFrame(team_records)
        .sort_values(["Wins", "WinRate"], ascending=False)
        .reset_index(drop=True)
    )
    df_teams.insert(0, "Rank", range(1, len(df_teams) + 1))
    return df_teams