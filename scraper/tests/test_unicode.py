import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import requests

from scraper.jane.aggregator import build_stats
from scraper.jane.client import fetch_html, fetch_json
from scraper.jane.parsers import clean_solver_names, parse_archive_page
from scraper.jane.pipeline import get_leaderboard_names
from scraper.jane.storage import load_puzzles_list, save_puzzles_raw


def response_with_bytes(content):
    response = requests.Response()
    response.status_code = 200
    response._content = content
    # The official HTML responses can omit a charset, producing this default.
    response.encoding = "ISO-8859-1"
    return Mock(get=Mock(return_value=response))


class SourceUnicodeTests(unittest.TestCase):
    def test_utf8_archive_titles_ignore_http_latin1_default(self):
        titles = ["Chess Pains – White To Move", "It’s Symmetric!"]
        rows = "".join(
            '<div class="row"><div class="left">'
            '<span class="date">April 2014:</span>'
            f'<span class="name">{title}</span></div>'
            '<div class="right"><a class="solution-link" href="/puzzles/example-solution/">'
            'Solution</a></div></div>'
            for title in titles
        )
        html = (
            '<body><div class="site-wrap"><main><div><div class="container">'
            f'<div><div>{rows}</div></div></div></div></main></div></body>'
        )
        for encoding in ("utf-8", "utf-8-sig"):
            with self.subTest(encoding=encoding):
                session = response_with_bytes(html.encode(encoding))
                puzzles = parse_archive_page(fetch_html(session, "https://example.test"))
                self.assertEqual([puzzle.name for puzzle in puzzles], titles)

    def test_json_bytes_preserve_international_names_despite_http_charset(self):
        leaders = ["Thaddäus Tentakel", "Andrej Kolar Požun", "蒋小猫", "Δημήτρης", "Мария", "😀"]
        payload = json.dumps({"leaders": leaders}, ensure_ascii=False)
        for encoding in ("utf-8", "utf-8-sig"):
            with self.subTest(encoding=encoding):
                session = response_with_bytes(payload.encode(encoding))
                self.assertEqual(fetch_json(session, "https://example.test")["leaders"], leaders)

    def test_invalid_utf8_fails_instead_of_replacing_characters(self):
        for fetch, content in (
            (fetch_html, b"<html>\xff</html>"),
            (fetch_json, b'{"leaders":["\xff"]}'),
        ):
            with self.subTest(fetch=fetch.__name__):
                with self.assertRaises(UnicodeDecodeError):
                    fetch(response_with_bytes(content), "https://example.test")

    def test_only_published_counterparts_repair_names_and_preserve_positions(self):
        names = [
            "Thaddäus Tentakel   ", "ThaddÃ¤us Tentakel", "Andrej Kolar Požun",
            "Andrej Kolar PoÅ¾un", "O’Neil", "Oâ€™Neil", "Oâ\u0080\u0099Neil",
            "ThaddÃ¤us Other", "Aleksej Ðukić", "Anton Åkerman", "Raphaël Bellaïche",
            "蒋小猫", "Δημήτρης", "Мария", "😀", "Ａda", "Ada (team)",
        ]
        expected = names.copy()
        expected[:7] = [
            "Thaddäus Tentakel", "Thaddäus Tentakel", "Andrej Kolar Požun",
            "Andrej Kolar Požun", "O’Neil", "O’Neil", "O’Neil",
        ]
        expected[-1] = "Ada"
        with patch("scraper.jane.pipeline.fetch_json", return_value={"leaders": names}):
            self.assertEqual(get_leaderboard_names(Mock(), "example"), expected)
        self.assertEqual(clean_solver_names(expected), expected)

    def test_blank_entries_are_not_solver_identities(self):
        self.assertEqual(clean_solver_names(["", "  ", "\t\n", "Ada", " (team) ", "Ada "]), ["Ada", "Ada"])

    def test_source_section_rows_are_removed_without_stripping_alias_markup(self):
        names = [
            "<b>Best trips from:</b><br>", "Sticky <3", "<br/><br/>", "Geoffrey > Jessie",
            "Exact answers from:", "Let Epsilon<=0", "Correct to 10 decimals from:",
            "<br><i>*second-highest solution</i>", "<b>Ada</b>",
            "<br><b>Other perfectly cromulent entries from:</b><br>", "Exact answers from: Ada",
            "<i>ordered from least expensive to most expensive</i><br>",
        ]
        self.assertEqual(clean_solver_names(names), [
            "Sticky <3", "Geoffrey > Jessie", "Let Epsilon<=0", "<b>Ada</b>", "Exact answers from: Ada",
        ])

    def test_only_leading_bom_is_removed_from_names(self):
        self.assertEqual(clean_solver_names([" \ufeffChristoph Dietrich ", "Chris\ufefftoph", "蒋小猫"]), [
            "Christoph Dietrich", "Chris\ufefftoph", "蒋小猫",
        ])

    def test_repaired_roster_round_trip_counts_each_solver_once(self):
        names = clean_solver_names(["Thaddäus Tentakel", "蒋小猫", "ThaddÃ¤us Tentakel"])
        puzzles = [{
            "date_text": "October 2025", "name": "It’s Symmetric!", "solution_url": "",
            "solvers": names, "puzzle_id": "example", "archived_at": "2025-11-01T00:00:00Z",
            "solver_timestamps": {"蒋小猫": "2025-10-02T03:04:05Z"},
        }]
        with tempfile.TemporaryDirectory() as directory:
            path = str(Path(directory) / "data.json")
            save_puzzles_raw(path, puzzles)
            self.assertNotIn(b"\r\n", Path(path).read_bytes())
            restored = load_puzzles_list(path)
        self.assertEqual(restored, puzzles)
        stats = build_stats(restored)
        self.assertEqual(stats["uniqueSolvers"], 2)
        self.assertEqual({solver["name"]: solver["puzzlesSolved"] for solver in stats["topSolvers"]}, {
            "Thaddäus Tentakel": 1, "蒋小猫": 1,
        })


if __name__ == "__main__":
    unittest.main()
