import unittest
from unittest.mock import Mock, patch

from scraper.jane.aggregator import build_stats
from scraper.jane.parsers import clean_solver_names
from scraper.jane.pipeline import get_leaderboard_names, merge_solvers_with_timestamps


class SolverAliasTests(unittest.TestCase):
    def test_only_confirmed_alias_is_renamed(self):
        self.assertEqual(
            clean_solver_names([
                " elias botsford (team) ", "Elias Botsford", "ELIAS BOTSFORD",
                "elias other", "Other Solver",
            ]),
            [
                "Elias Botsford", "Elias Botsford", "ELIAS BOTSFORD",
                "elias other", "Other Solver",
            ],
        )

    def test_upstream_refresh_preserves_merged_history_and_timestamp(self):
        first_seen = "2026-11-02T21:20:28.870652+00:00"
        with patch("scraper.jane.pipeline.fetch_json", return_value={
            "leaders": ["elias botsford", "Other Solver", "Elias Botsford"],
        }):
            solvers = get_leaderboard_names(Mock(), "2026-11-01-pressure-points")
        timestamps = merge_solvers_with_timestamps(solvers, {
            "Elias Botsford": first_seen,
        })
        self.assertEqual(timestamps["Elias Botsford"], first_seen)
        self.assertNotIn("elias botsford", timestamps)
        self.assertEqual(solvers, ["Elias Botsford", "Other Solver", "Elias Botsford"])

        stats = build_stats([
            {"date_text": "November 2026", "solvers": solvers,
             "solver_timestamps": timestamps},
            {"date_text": "October 2026", "solvers": ["Elias Botsford"]},
        ])
        merged = next(s for s in stats["topSolvers"] if s["name"] == "Elias Botsford")
        self.assertEqual(merged["puzzlesSolved"], 2)
        self.assertEqual(merged["firstAppearance"], "October 2026")
        self.assertEqual(merged["lastSolve"], "November 2026")
        self.assertEqual(stats["uniqueSolvers"], 2)
        self.assertEqual(stats["longestStreaks"], [{
            "solver": "Elias Botsford", "start": "Oct 2026", "end": "Nov 2026", "length": 2,
        }])


if __name__ == "__main__":
    unittest.main()
