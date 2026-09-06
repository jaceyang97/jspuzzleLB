"""Rising stars ranked on completed, published opportunities since debut."""

from __future__ import annotations

from bisect import bisect_left
from datetime import datetime
from fractions import Fraction
from typing import Any, Dict, List, Optional, Tuple

RISING_STARS_RULE = "W18-S2-E3-raw"
DEBUT_WINDOW_MONTHS = 18
MIN_SOLVES = 2
MIN_OPPORTUNITIES = 3


def _month(date_text: Any) -> Optional[datetime]:
    if not isinstance(date_text, str):
        return None
    for date_format in ("%B %Y", "%b %Y"):
        try:
            return datetime.strptime(date_text.strip(), date_format)
        except ValueError:
            pass
    # Undated records cannot define a calendar window or an opportunity.
    return None


def _identity(puzzle: Dict[str, Any], month: datetime) -> tuple:
    for field in ("puzzle_id", "id"):
        value = puzzle.get(field)
        if value is not None and str(value).strip():
            return ("id", str(value).strip())
    for field in ("puzzle_url", "url"):
        value = puzzle.get(field)
        if isinstance(value, str) and value.strip():
            return ("url", value.strip())
    return ("month-name", month.year, month.month, puzzle.get("name", ""))


def build_rising_stars(
    puzzles: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """Return every eligible record and the latest completed month.

    Duplicate records contribute one puzzle, with the union of their exact
    names. Publication in any copy establishes that puzzle's closed status.
    Distinct puzzles in the same month each remain an opportunity. If copies
    disagree about the month, their earliest valid month is used consistently.
    """
    distinct: Dict[tuple, Dict[str, Any]] = {}
    for puzzle in puzzles:
        month = _month(puzzle.get("date_text"))
        if month is None:
            continue
        identity = _identity(puzzle, month)
        record = distinct.setdefault(identity, {
            "month": month, "solvers": set(), "published": False,
        })
        record["month"] = min(record["month"], month)
        record["solvers"].update(
            name for name in (puzzle.get("solvers") or [])
            if isinstance(name, str) and name.strip()
        )
        solution_url = puzzle.get("solution_url")
        record["published"] |= isinstance(solution_url, str) and bool(solution_url.strip())

    completed = sorted(
        (record for record in distinct.values() if record["published"] and record["solvers"]),
        key=lambda record: record["month"],
    )
    if not completed:
        return [], None

    months = [record["month"] for record in completed]
    as_of = months[-1]
    solvers: Dict[str, Dict[str, Any]] = {}
    for record in completed:
        for name in record["solvers"]:
            solver = solvers.setdefault(name, {"solves": 0, "debut": record["month"]})
            solver["solves"] += 1

    rows = []
    for name, solver in solvers.items():
        debut = solver["debut"]
        age = (as_of.year - debut.year) * 12 + as_of.month - debut.month
        solved = solver["solves"]
        if not (0 <= age < DEBUT_WINDOW_MONTHS and solved >= MIN_SOLVES):
            continue
        # Include every published puzzle in the debut month, even if another
        # puzzle in that month is the name's first recorded solve.
        opportunities = len(months) - bisect_left(months, debut)
        if opportunities < MIN_OPPORTUNITIES:
            continue
        rows.append({
            "solver": name,
            "puzzlesSolved": solved,
            "opportunities": opportunities,
            "solveRate": solved / opportunities,
            "firstAppearance": debut.strftime("%B %Y"),
        })

    # Fractions compare exact records without a rounded percentage changing
    # the order. Names order equal records for display, never for their rank.
    rows.sort(key=lambda row: (
        -Fraction(row["puzzlesSolved"], row["opportunities"]),
        -row["puzzlesSolved"], row["solver"],
    ))
    previous = None
    rank = 0
    for index, row in enumerate(rows):
        record = (Fraction(row["puzzlesSolved"], row["opportunities"]), row["puzzlesSolved"])
        if record != previous:
            rank = index + 1
            previous = record
        row["rank"] = rank
    return rows, as_of.strftime("%b %Y")
