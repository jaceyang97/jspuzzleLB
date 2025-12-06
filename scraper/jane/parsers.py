from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

from bs4 import BeautifulSoup

from .models import PuzzleMeta


def clean_solver_name(name: str) -> str:
    """
    Remove parenthetical notes from solver names to normalize entries.
    """
    return re.sub(r"\s*\([^)]*\)", "", name).strip()


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


