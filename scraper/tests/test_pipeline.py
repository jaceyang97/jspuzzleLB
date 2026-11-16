import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch

from scraper.jane.models import PuzzleMeta
from scraper.jane.pipeline import update_current


OCTOBER_ID = "2026-10-01-it-s-a-metric-too"
NOVEMBER_ID = "2026-11-01-pressure-points"
OCTOBER_SOLUTION = "https://www.janestreet.com/puzzles/it-s-a-metric-too-solution"
FIRST_SEEN = "2026-10-02T01:00:00+00:00"


class CurrentPuzzleUpdateTests(unittest.TestCase):
    def october(self, puzzle_id="2026-10-01-its-a-metric-too", solution_url=""):
        return {
            "date_text": "October 2026",
            "name": "It's a Metric, Too",
            "solution_url": solution_url,
            "puzzle_id": puzzle_id,
            "solvers": ["Ada"],
            "solver_timestamps": {"Ada": FIRST_SEEN},
        }

    def run_update(self, puzzles, puzzle_id, solvers, metas=(), final_solvers=()):
        with tempfile.TemporaryDirectory() as directory:
            data_path = Path(directory) / "data.json"
            stats_path = Path(directory) / "stats.json"
            data_path.write_text(json.dumps(puzzles), encoding="utf-8")
            with (
                patch("scraper.jane.pipeline.build_session", return_value=Mock()),
                patch("scraper.jane.pipeline.scrape_current_puzzle", return_value=(puzzle_id, solvers)),
                patch("scraper.jane.pipeline.refresh_recent_archives", return_value={}),
                patch("scraper.jane.pipeline.fetch_html", return_value="fixture"),
                patch("scraper.jane.pipeline.parse_archive_page", return_value=list(metas)),
                patch("scraper.jane.pipeline.parse_solution_page", return_value=OCTOBER_ID),
                patch("scraper.jane.pipeline.get_leaderboard_names", return_value=list(final_solvers)),
            ):
                updated, notification = update_current(
                    "https://www.janestreet.com/puzzles/archive/",
                    str(data_path), str(stats_path),
                )
            self.assertEqual(json.loads(data_path.read_text(encoding="utf-8")), updated)
            stats = json.loads(stats_path.read_text(encoding="utf-8"))
        return updated, notification, stats

    def test_slug_change_updates_same_month_without_duplicating_puzzle(self):
        puzzles, notification, stats = self.run_update(
            [self.october()], OCTOBER_ID, ["Ada", "Grace"],
        )
        self.assertEqual(len(puzzles), 1)
        self.assertEqual(puzzles[0]["date_text"], "October 2026")
        self.assertEqual(puzzles[0]["name"], "It's a Metric, Too")
        self.assertEqual(puzzles[0]["solution_url"], "")
        self.assertEqual(puzzles[0]["puzzle_id"], OCTOBER_ID)
        self.assertEqual(puzzles[0]["solvers"], ["Ada", "Grace"])
        self.assertEqual(puzzles[0]["solver_timestamps"]["Ada"], FIRST_SEEN)
        self.assertIn("Grace", puzzles[0]["solver_timestamps"])
        self.assertEqual(notification["new_solvers"], ["Grace"])
        self.assertEqual(stats["totalPuzzles"], 1)
        self.assertEqual({s["name"]: s["puzzlesSolved"] for s in stats["topSolvers"]}, {
            "Ada": 1, "Grace": 1,
        })

        repeated, notification, repeated_stats = self.run_update(
            puzzles, OCTOBER_ID, ["Ada", "Grace"],
        )
        self.assertEqual(repeated, puzzles)
        self.assertEqual(notification["new_solvers"], [])
        self.assertEqual(repeated_stats["totalPuzzles"], 1)

    def test_real_month_transition_finalizes_old_puzzle_with_or_without_stored_id(self):
        metas = [
            PuzzleMeta("November 2026", "Pressure Points", "", datetime(2026, 11, 1)),
            PuzzleMeta("October 2026", "It's a Metric, Too", OCTOBER_SOLUTION, datetime(2026, 10, 1)),
        ]
        for has_stored_id in (True, False):
            with self.subTest(has_stored_id=has_stored_id):
                old = self.october()
                if not has_stored_id:
                    del old["puzzle_id"]
                puzzles, notification, stats = self.run_update(
                    [old], NOVEMBER_ID, ["Grace"], metas, ["Ada", "Late Solver"],
                )
                self.assertEqual(len(puzzles), 2)
                self.assertEqual(puzzles[0]["date_text"], "November 2026")
                self.assertEqual(puzzles[0]["name"], "Pressure Points")
                self.assertEqual(puzzles[0]["puzzle_id"], NOVEMBER_ID)
                self.assertEqual(puzzles[1]["solution_url"], OCTOBER_SOLUTION)
                self.assertEqual(puzzles[1]["puzzle_id"], OCTOBER_ID)
                self.assertEqual(puzzles[1]["solvers"], ["Ada", "Late Solver"])
                self.assertEqual(puzzles[1]["solver_timestamps"]["Ada"], FIRST_SEEN)
                self.assertIn("archived_at", puzzles[1])
                self.assertEqual(notification["puzzle_date"], "November 2026")
                self.assertEqual(notification["new_solvers"], ["Grace"])
                self.assertEqual(stats["totalPuzzles"], 2)

    def test_unresolved_older_entry_does_not_hide_existing_current_puzzle(self):
        old = self.october()
        current = {
            "date_text": "November 2026", "name": "Pressure Points",
            "solution_url": "", "puzzle_id": NOVEMBER_ID,
            "solvers": ["Grace"], "solver_timestamps": {"Grace": FIRST_SEEN},
        }
        puzzles, notification, stats = self.run_update(
            [old, current], NOVEMBER_ID, ["Grace", "New Solver"],
        )
        self.assertEqual(len(puzzles), 2)
        self.assertEqual(puzzles[0], old)
        self.assertEqual(puzzles[1]["solvers"], ["Grace", "New Solver"])
        self.assertEqual(notification["puzzle_date"], "November 2026")
        self.assertEqual(notification["new_solvers"], ["New Solver"])
        self.assertEqual(stats["totalPuzzles"], 2)

    def test_stale_archive_metadata_does_not_label_new_month_as_old_puzzle(self):
        stale_meta = PuzzleMeta("October 2026", "It's a Metric, Too", "", datetime(2026, 10, 1))
        puzzles, _, stats = self.run_update(
            [self.october()], NOVEMBER_ID, ["Grace"], [stale_meta],
        )
        self.assertEqual(len(puzzles), 2)
        self.assertEqual(puzzles[0]["date_text"], "November 2026")
        self.assertEqual(puzzles[0]["name"], "Pressure Points")
        self.assertEqual(puzzles[1]["date_text"], "October 2026")
        self.assertEqual(stats["totalPuzzles"], 2)

        repeated, notification, _ = self.run_update(puzzles, NOVEMBER_ID, ["Grace"])
        self.assertEqual(repeated, puzzles)
        self.assertEqual(notification["new_solvers"], [])

    def test_missing_id_on_same_month_keeps_existing_history(self):
        old = self.october()
        del old["puzzle_id"]
        puzzles, notification, stats = self.run_update([old], OCTOBER_ID, ["Ada"])
        self.assertEqual(len(puzzles), 1)
        self.assertEqual(puzzles[0]["puzzle_id"], OCTOBER_ID)
        self.assertEqual(puzzles[0]["solver_timestamps"]["Ada"], FIRST_SEEN)
        self.assertEqual(notification["new_solvers"], [])
        self.assertEqual(stats["totalPuzzles"], 1)

    def test_existing_published_puzzle_is_not_added_again(self):
        old = self.october(OCTOBER_ID, OCTOBER_SOLUTION)
        puzzles, _, stats = self.run_update([old], OCTOBER_ID, ["Ada"])
        self.assertEqual(puzzles, [old])
        self.assertEqual(stats["totalPuzzles"], 1)

    def test_new_current_puzzle_is_added_when_all_existing_entries_are_archived(self):
        old = self.october(OCTOBER_ID, OCTOBER_SOLUTION)
        puzzles, notification, stats = self.run_update([old], NOVEMBER_ID, ["Grace"])
        self.assertEqual(len(puzzles), 2)
        self.assertEqual(puzzles[0]["date_text"], "November 2026")
        self.assertEqual(puzzles[0]["puzzle_id"], NOVEMBER_ID)
        self.assertEqual(puzzles[1], old)
        self.assertEqual(notification["new_solvers"], ["Grace"])
        self.assertEqual(stats["totalPuzzles"], 2)


if __name__ == "__main__":
    unittest.main()
