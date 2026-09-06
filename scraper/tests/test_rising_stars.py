import copy
import unittest

from scraper.jane.aggregator import build_stats
from scraper.jane.rising_stars import RISING_STARS_RULE, build_rising_stars


def puzzle(month, names, **fields):
    return {
        "date_text": month,
        "name": f"Puzzle {month}",
        "solution_url": f"https://example.test/{month}/solution/",
        "solvers": names,
        **fields,
    }


class RisingStarsTests(unittest.TestCase):
    def test_completed_archive_anchors_window_and_excludes_open_or_unknown_lists(self):
        records = [
            puzzle("January 2020", ["Ada"]),
            puzzle("February 2020", ["Ada"]),
            puzzle("March 2020", []),
            puzzle("April 2020", ["Ada"]),
            puzzle("May 2020", ["Ada", "Open only"], solution_url=""),
            puzzle("December 2030", []),
        ]
        stats = build_stats(records)
        self.assertEqual(stats["risingStarsAsOf"], "Apr 2020")
        self.assertEqual(stats["risingStarsRule"], RISING_STARS_RULE)
        self.assertEqual(stats["risingStars"], [{
            "solver": "Ada", "puzzlesSolved": 3, "opportunities": 3,
            "solveRate": 1, "firstAppearance": "January 2020", "rank": 1,
        }])
        # Other boards continue to include currently published solver names.
        self.assertEqual(stats["uniqueSolvers"], 2)

    def test_eighteen_calendar_month_boundary_is_inclusive_and_not_eighteen_observed_puzzles(self):
        records = [
            puzzle("February 2025", ["Too old"]),
            puzzle("March 2025", ["Eligible"]),
            puzzle("April 2025", []),
            puzzle("July 2026", ["Too old", "Eligible"]),
            puzzle("August 2026", ["Too old", "Eligible"]),
            puzzle("September 2026", ["Open only"], solution_url=""),
        ]
        rows, as_of = build_rising_stars(records)
        self.assertEqual(as_of, "Aug 2026")
        self.assertEqual([row["solver"] for row in rows], ["Eligible"])
        self.assertEqual(rows[0]["opportunities"], 3)
        self.assertEqual(rows[0]["firstAppearance"], "March 2025")

    def test_two_distinct_solves_and_three_opportunities_are_both_required(self):
        records = [
            puzzle("January 2026", ["Ada", "Twice", "Once", "Once", "Once"]),
            puzzle("February 2026", ["Ada", "Twice", "Too soon"]),
            puzzle("March 2026", ["Ada", "Too soon"]),
        ]
        rows, _ = build_rising_stars(records)
        self.assertEqual([row["solver"] for row in rows], ["Ada", "Twice"])
        self.assertEqual(rows[0]["puzzlesSolved"], 3)
        self.assertEqual(rows[1]["puzzlesSolved"], 2)
        self.assertEqual(rows[1]["opportunities"], 3)
        self.assertEqual(rows[1]["solveRate"], 2 / 3)

    def test_duplicate_records_union_names_and_publication_without_adding_opportunities(self):
        for identities in (
            ({"puzzle_id": "stable"}, {"id": "stable"}),
            ({"puzzle_url": "https://example.test/puzzle"}, {"url": "https://example.test/puzzle"}),
            ({}, {}),
        ):
            with self.subTest(identities=identities):
                original = puzzle("January 2026", ["Ada", "Ada"], solution_url="", **identities[0])
                duplicate = puzzle("Jan 2026", ["Bea"], name=original["name"], **identities[1])
                records = [original, duplicate,
                           puzzle("February 2026", ["Ada", "Bea"]),
                           puzzle("March 2026", ["Ada", "Bea"])]
                untouched = copy.deepcopy(records)
                rows, _ = build_rising_stars(records)
                self.assertEqual([(row["solver"], row["puzzlesSolved"], row["opportunities"], row["rank"])
                                  for row in rows], [("Ada", 3, 3, 1), ("Bea", 3, 3, 1)])
                self.assertEqual(build_rising_stars(records), build_rising_stars(list(reversed(records))))
                self.assertEqual(records, untouched)

    def test_distinct_puzzles_in_debut_month_all_count_as_opportunities(self):
        for identities in (
            ({"puzzle_id": "one", "name": "Same title"}, {"puzzle_id": "two", "name": "Same title"}),
            ({"name": "First puzzle"}, {"name": "Second puzzle"}),
        ):
            with self.subTest(identities=identities):
                records = [
                    puzzle("January 2026", ["Another name"], **identities[0]),
                    puzzle("January 2026", ["Ada"], **identities[1]),
                    puzzle("February 2026", ["Ada"]),
                    puzzle("March 2026", ["Ada"]),
                ]
                rows, _ = build_rising_stars(records)
                self.assertEqual(rows[0]["puzzlesSolved"], 3)
                self.assertEqual(rows[0]["opportunities"], 4)
                self.assertEqual(rows[0]["solveRate"], .75)

    def test_three_same_month_puzzles_can_qualify_without_waiting_three_months(self):
        records = [puzzle("January 2026", ["Ada"], name=f"Distinct puzzle {i}") for i in range(3)]
        rows, _ = build_rising_stars(records)
        self.assertEqual(rows[0]["puzzlesSolved"], 3)
        self.assertEqual(rows[0]["opportunities"], 3)
        self.assertEqual(rows[0]["solveRate"], 1)

    def test_rate_then_more_solves_then_shared_competition_rank(self):
        months = ["January", "February", "March", "April", "May", "June", "July", "August"]
        histories = {
            "Six of eight": {0, 1, 2, 3, 4, 7},
            "Tie A": {4, 5, 7},
            "Tie B": {4, 5, 7},
            "Three of five": {3, 4, 7},
        }
        records = [puzzle(f"{month} 2026", [f"Filler {i}"] + [
            name for name, solved in histories.items() if i in solved
        ]) for i, month in enumerate(months)]
        rows, _ = build_rising_stars(records)
        self.assertEqual([(row["solver"], row["solveRate"], row["rank"]) for row in rows], [
            ("Six of eight", .75, 1), ("Tie A", .75, 2), ("Tie B", .75, 2),
            ("Three of five", .6, 4),
        ])

    def test_returns_all_eligible_names_including_whole_boundary_tie(self):
        names = [f"Newcomer {i:02}" for i in range(25)]
        records = [puzzle("January 2026", ["Four of four"])] + [
            puzzle(f"{month} 2026", ["Four of four", *names])
            for month in ("February", "March", "April")
        ]
        rows, _ = build_rising_stars(records)
        self.assertEqual(len(rows), 26)
        self.assertEqual(rows[0]["rank"], 1)
        self.assertTrue(all(row["rank"] == 2 for row in rows[1:]))
        self.assertTrue(all(0 <= row["solveRate"] <= 1 for row in rows))

    def test_no_valid_completed_roster_has_no_as_of_month(self):
        for records in ([], [
            puzzle("January 2026", []),
            puzzle("February 2026", ["Open"], solution_url=" \t"),
            puzzle("not a month", ["Undated"]),
            puzzle("March 2026", ["", "   "]),
        ]):
            with self.subTest(records=records):
                self.assertEqual(build_rising_stars(records), ([], None))


if __name__ == "__main__":
    unittest.main()
