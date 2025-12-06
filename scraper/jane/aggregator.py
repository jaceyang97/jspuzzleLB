from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Any


def _parse_date(date_text: str) -> datetime:
    try:
        return datetime.strptime(date_text, "%B %Y")
    except Exception:
        try:
            return datetime.strptime(date_text, "%b %Y")
        except Exception:
            return datetime.now(timezone.utc)


def _format_month_year(dt: datetime) -> str:
    return dt.strftime("%b %Y")


def build_stats(puzzles: List[Dict[str, Any]]) -> Dict[str, Any]:
    solver_map: Dict[str, Dict[str, Any]] = {}
    all_months = set()

    # Sort newest first
    sorted_puzzles = sorted(puzzles, key=lambda p: _parse_date(p.get("date_text", "")), reverse=True)

    for puzzle in sorted_puzzles:
        puzzle_date = _parse_date(puzzle.get("date_text", ""))
        month_key = _format_month_year(puzzle_date)
        all_months.add(month_key)

        solvers = puzzle.get("solvers") or []
        if not solvers:
            continue

        for solver_name in solvers:
            if solver_name not in solver_map:
                solver_map[solver_name] = {
                    "name": solver_name,
                    "puzzlesSolved": 0,
                    "firstAppearance": puzzle.get("date_text", "N/A"),
                    "lastSolve": puzzle.get("date_text", "N/A"),
                    "monthlyActivity": set(),
                    "streaks": [],
                }

            solver = solver_map[solver_name]
            solver["puzzlesSolved"] += 1
            solver["monthlyActivity"].add(month_key)

            if _parse_date(puzzle.get("date_text", "")) < _parse_date(solver["firstAppearance"]):
                solver["firstAppearance"] = puzzle.get("date_text", "N/A")
            if _parse_date(puzzle.get("date_text", "")) > _parse_date(solver["lastSolve"]):
                solver["lastSolve"] = puzzle.get("date_text", "N/A")

    # Top solvers by solve count
    top_solvers = sorted(solver_map.values(), key=lambda s: s["puzzlesSolved"], reverse=True)

    # Streaks
    for solver in top_solvers:
        months = sorted(list(solver["monthlyActivity"]), key=lambda m: _parse_date(m))
        if not months:
            continue

        current = {"start": months[0], "end": months[0], "length": 1}
        for i in range(1, len(months)):
            prev_date = _parse_date(months[i - 1])
            curr_date = _parse_date(months[i])
            month_diff = (curr_date.year - prev_date.year) * 12 + (curr_date.month - prev_date.month)
            if month_diff == 1:
                current["end"] = months[i]
                current["length"] += 1
            else:
                if current["length"] >= 2:
                    solver["streaks"].append(current.copy())
                current = {"start": months[i], "end": months[i], "length": 1}

        if current["length"] >= 2:
            solver["streaks"].append(current.copy())

        solver["streaks"].sort(key=lambda s: s["length"], reverse=True)

    longest_streaks = (
        [
            {"solver": s["name"], **s["streaks"][0]}
            for s in top_solvers
            if s["streaks"]
        ]
    )
    longest_streaks = sorted(longest_streaks, key=lambda s: s["length"], reverse=True)[:20]

    # Rising stars
    now = datetime.now(timezone.utc)
    one_year_ago = datetime(now.year, now.month, 1).replace(year=now.year - 1)

    rising_stars = []
    for solver in solver_map.values():
        first_date = _parse_date(solver["firstAppearance"])
        months_since = max(1, (now.year - first_date.year) * 12 + (now.month - first_date.month))
        if first_date >= one_year_ago and solver["puzzlesSolved"] >= 3:
            rising_stars.append(
                {
                    "solver": solver["name"],
                    "puzzlesSolved": solver["puzzlesSolved"],
                    "solveRate": solver["puzzlesSolved"] / months_since,
                    "firstAppearance": solver["firstAppearance"],
                }
            )
    rising_stars = sorted(rising_stars, key=lambda s: s["solveRate"], reverse=True)[:20]

    # Monthly participation
    sorted_months = sorted(list(all_months), key=lambda m: _parse_date(m))
    if len(sorted_months) > 48:
        sampled_months = [m for idx, m in enumerate(sorted_months) if idx % 3 == 0 or idx == len(sorted_months) - 1]
    else:
        sampled_months = sorted_months

    monthly_participation = []
    for month in sampled_months:
        solvers_count = sum(1 for solver in solver_map.values() if month in solver["monthlyActivity"])
        monthly_participation.append({"month": month, "solvers": solvers_count})

    # Solvers growth (cumulative new solvers per month)
    solvers_growth = []
    total = 0
    for month in sorted_months:
        new_solvers = sum(
            1
            for solver in solver_map.values()
            if _format_month_year(_parse_date(solver["firstAppearance"])) == month
        )
        total += new_solvers
        solvers_growth.append({"month": month, "totalSolvers": total})
    if solvers_growth:
        solvers_growth[-1]["totalSolvers"] = len(solver_map)

    most_solved_puzzles = (
        sorted(
            [
                {
                    "id": f"{_parse_date(p['date_text']).year}-{_parse_date(p['date_text']).month}",
                    "name": p.get("name", "Unknown"),
                    "solvers": len(p.get("solvers") or []),
                    "solution_url": p.get("solution_url", ""),
                }
                for p in sorted_puzzles
            ],
            key=lambda p: p["solvers"],
            reverse=True,
        )[:20]
    )

    return {
        "totalPuzzles": len(puzzles),
        "uniqueSolvers": len(solver_map),
        "topSolvers": [
            {
                "name": solver["name"],
                "puzzlesSolved": solver["puzzlesSolved"],
                "firstAppearance": solver["firstAppearance"],
                "lastSolve": solver["lastSolve"],
            }
            for solver in top_solvers
        ],
        "longestStreaks": longest_streaks,
        "risingStars": rising_stars,
        "monthlyParticipation": monthly_participation,
        "solversGrowth": solvers_growth,
        "mostSolvedPuzzles": most_solved_puzzles,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def save_stats(file_path: str, stats: Dict[str, Any]) -> None:
    import json
    import os

    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)


