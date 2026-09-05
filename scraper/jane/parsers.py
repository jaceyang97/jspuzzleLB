from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

from bs4 import BeautifulSoup

from .models import PuzzleMeta


# Jane Street's archived JSON mixes these exact presentation rows into its
# leaders arrays. Do not strip arbitrary HTML or symbols from real aliases.
_NON_SOLVER_ROWS = frozenset({
    "<b>Best trips from:</b><br>",
    "<b>Best grids from:</b><br>",
    "<br><b>Other perfectly cromulent entries from:</b><br>",
    "Exact answers from:",
    "Correct to 10 decimals from:",
    "<br/><br/>",
    "<b>Top-scoring entries:</b><br>",
    "<br><b>Other perfectly cromulent entries:</b><br>",
    "<b>Lowest scores:</b><br>",
    "<b>Maximum scores:</b><br>",
    "<br><b>Other high-scoring entries:</b><br>",
    "<br><i>*second-highest solution</i>",
    "<i>ordered from least expensive to most expensive</i><br>",
})


def clean_solver_name(name: str) -> str:
    """
    Remove parenthetical notes from solver names to normalize entries.
    """
    # A leading byte-order mark is an encoding artifact, not part of a name.
    name = name.strip().lstrip("\ufeff")
    return re.sub(r"\s*\([^)]*\)", "", name).strip()


def clean_solver_names(names: List[str]) -> List[str]:
    """Repair misdecoded names only when this roster also publishes the original.

    Some upstream lists contain both a correct name and its UTF-8 bytes decoded
    as Latin-1 or Windows-1252. Require that exact published counterpart before
    repairing anything. Discard blank entries and known presentation rows;
    preserve the order and duplicate named rows used for solve percentiles.
    """
    cleaned = []
    for name in names:
        name = clean_solver_name(name)
        if name and name not in _NON_SOLVER_ROWS:
            cleaned.append(name)
    published = set(cleaned)
    replacements = {}
    for name in published:
        if name.isascii():
            continue
        for encoding in ("latin-1", "cp1252"):
            try:
                candidate = name.encode(encoding).decode("utf-8")
            except UnicodeError:
                continue
            if candidate != name and candidate in published:
                replacements[name] = candidate
                break
    return [replacements.get(name, name) for name in cleaned]


def parse_archive_page(html: str) -> List[PuzzleMeta]:
    """
    Parse the archive page HTML and return puzzle metadata entries with dates and solution URLs.
    """
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one("body > div.site-wrap > main > div > div.container > div > div")
    if not container:
        return []

    rows = container.select("div.row")
    puzzles: List[PuzzleMeta] = []

    for row in rows:
        date_tag = row.select_one(".left span.date")
        name_tag = row.select_one(".left span.name")
        solution_link_tag = row.select_one(".right a.solution-link")

        if not (date_tag and name_tag):
            continue

        date_text = date_tag.get_text(strip=True).rstrip(":")
        try:
            date = datetime.strptime(date_text, "%B %Y")
        except ValueError:
            # Skip malformed dates to avoid poisoning downstream logic.
            continue

        puzzle_name = name_tag.get_text(strip=True)
        solution_url = ""
        if solution_link_tag and solution_link_tag.has_attr("href"):
            href = solution_link_tag["href"]
            solution_url = "https://www.janestreet.com" + (href if isinstance(href, str) else str(href))

        puzzles.append(
            PuzzleMeta(
                date_text=date_text,
                name=puzzle_name,
                solution_url=solution_url,
                date=date,
            )
        )

    return puzzles


def parse_solution_page(html: str) -> Optional[str]:
    """
    Extract the puzzle leaderboard directory id from a solution page.
    Returns the puzzle id string or None if not found.
    """
    soup = BeautifulSoup(html, "html.parser")
    submissions_tag = soup.select_one("p.correct-submissions")
    if submissions_tag and submissions_tag.has_attr("data-directory"):
        return str(submissions_tag["data-directory"])
    return None


