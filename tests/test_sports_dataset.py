import unittest

from backend.preprocessing import preprocess_data
from backend.analytics import analyze_data
from backend.charts import prepare_chart_data


class SportsDatasetConversionTests(unittest.TestCase):
    def test_preprocess_data_supports_sports_csv(self):
        df = preprocess_data("sports.csv")

        self.assertIn("Team", df.columns)
        self.assertTrue({"Matches", "Wins", "Losses", "WinRate", "Tier"}.issubset(df.columns))
        self.assertGreater(len(df), 0)
        self.assertTrue((df["WinRate"] >= 0).all())
        self.assertTrue((df["WinRate"] <= 100).all())
        self.assertTrue((df["TossWinRate"] >= 0).all())
        self.assertTrue((df["TossWinRate"] <= 100).all())
        self.assertIn("Tier", df.columns)

    def test_analytics_and_charts(self):
        df = preprocess_data("sports.csv")
        metrics, ranking, performance, statistics, quality = analyze_data(df, "sports.csv")
        charts = prepare_chart_data(ranking, "sports.csv")

        self.assertEqual(metrics["total_teams"], len(ranking))
        self.assertGreater(metrics["total_matches"], 1000)
        self.assertIn("top_teams_wins", charts)
        self.assertIn("win_method_distribution", charts)
        self.assertIn("win_rate_vs_matches", charts)
        self.assertIn("radar_chart", charts)


if __name__ == "__main__":
    unittest.main()
