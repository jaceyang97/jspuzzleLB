from __future__ import annotations

import concurrent.futures
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from loguru import logger

from .client import fetch_html, fetch_json, build_session, DEFAULT_TIMEOUT
from .models import Puzzle, PuzzleMeta
from .parsers import parse_archive_page, parse_solution_page, clean_solver_name
from .storage import load_existing, save_puzzles, load_puzzles_list, save_puzzles_raw

CURRENT_PUZZLE_URL = "https://www.janestreet.com/puzzles/current-puzzle/"


def get_leaderboard_names(session, puzzle_id: str, timeout: int = DEFAULT_TIMEOUT) -> List[str]:
    json_url = f"https://www.janestreet.com/puzzles/{puzzle_id}-leaderboard.json"
    try:
        data = fetch_json(session, json_url, timeout=timeout)
        solvers = data.get("leaders", [])
        return [clean_solver_name(solver) for solver in solvers]
    except Exception as exc:  # pragma: no cover - network/HTML errors
        logger.warning(f"Failed to fetch leaderboard {puzzle_id}: {exc}")
        return []


def merge_solvers_with_timestamps(
    fresh_solvers: List[str],
    existing_timestamps: Dict[str, str],
) -> Dict[str, str]:
    """Assign first-seen timestamps to newly observed solvers, preserving existing ones."""
    now = datetime.now(timezone.utc).isoformat()
    merged = dict(existing_timestamps)
    for solver in fresh_solvers:
        if solver not in merged:
            merged[solver] = now
    return merged


def _puzzle_key(meta: PuzzleMeta) -> str:
    return f"{meta.date_text}_{meta.name}"


def _puzzle_key_from_dict(entry: Dict[str, Any]) -> str:
    return f"{entry.get('date_text', '')}_{entry.get('name', '')}"


def scrape_current_puzzle(
    session,
    timeout: int = DEFAULT_TIMEOUT,
) -> Optional[Tuple[str, List[str]]]:
    """
    Fetch the current (unsolved) puzzle's leaderboard from its dedicated page.
    Returns (puzzle_id, solvers) or None if unavailable.
    """
    try:
        html = fetch_html(session, CURRENT_PUZZLE_URL, timeout=timeout)
        puzzle_id = parse_solution_page(html)
        if not puzzle_id:
            logger.warning("No data-directory found on current puzzle page")
            return None
        solvers = get_leaderboard_names(session, puzzle_id, timeout=timeout)
        logger.info(f"Current puzzle {puzzle_id}: {len(solvers)} solvers")
        return puzzle_id, solvers
    except Exception as exc:
        logger.warning(f"Failed to scrape current puzzle page: {exc}")
        return None


def update_current(
    base_url: str,
    output_path: str,
    stats_path: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> List[Dict[str, Any]]:
    """
    Lightweight daily update: only refresh the current puzzle's leaderboard.
    Handles month transitions (new puzzle appearing) automatically.
    """
    from .aggregator import build_stats, save_stats

    session = build_session()
    puzzles = load_puzzles_list(output_path)

    if not puzzles:
        logger.error("No existing data found. Run with --full to do initial scrape.")
        return puzzles

    # Scrape the current puzzle page
    result = scrape_current_puzzle(session, timeout=timeout)
    if result is None:
        logger.warning("Could not fetch current puzzle; saving stats and exiting")
        stats = build_stats(puzzles)
        save_stats(stats_path, stats)
        return puzzles

    puzzle_id, fresh_solvers = result

    # Find the existing "current" entry (no solution_url)
    current_idx = None
    for i, entry in enumerate(puzzles):
        if not entry.get("solution_url"):
            current_idx = i
            break

    if current_idx is not None:
        current_entry = puzzles[current_idx]
        stored_id = current_entry.get("puzzle_id", "")

        if stored_id == puzzle_id or not stored_id:
            # Case A: Same puzzle — merge solvers + timestamps
            existing_ts = current_entry.get("solver_timestamps", {})
            merged_ts = merge_solvers_with_timestamps(fresh_solvers, existing_ts)
            current_entry["solvers"] = fresh_solvers
            current_entry["solver_timestamps"] = merged_ts
            current_entry["puzzle_id"] = puzzle_id
            logger.info(
                f"Updated current puzzle: {len(fresh_solvers)} solvers "
                f"({len(merged_ts) - len(existing_ts)} new)"
            )
        else:
            # Case B: New puzzle detected — month transition
            logger.info(f"New puzzle detected (was {stored_id}, now {puzzle_id})")
            _handle_month_transition(
                session, base_url, puzzles, current_idx,
                puzzle_id, fresh_solvers, timeout,
            )
    else:
        # No current entry found — add the new puzzle
        logger.info("No current puzzle entry found; adding new entry")
        merged_ts = merge_solvers_with_timestamps(fresh_solvers, {})
        new_entry = {
            "date_text": _date_text_from_puzzle_id(puzzle_id),
            "name": _name_from_puzzle_id(puzzle_id),
            "solution_url": "",
            "solvers": fresh_solvers,
            "solver_timestamps": merged_ts,
            "puzzle_id": puzzle_id,
        }
        puzzles.insert(0, new_entry)

    save_puzzles_raw(output_path, puzzles)
    stats = build_stats(puzzles)
    save_stats(stats_path, stats)
    return puzzles


def _handle_month_transition(
    session,
    base_url: str,
    puzzles: List[Dict[str, Any]],
    old_current_idx: int,
    new_puzzle_id: str,
    new_solvers: List[str],
    timeout: int,
) -> None:
    """
    Handle the case where the current puzzle has changed (new month).
    Finalize the old puzzle and start tracking the new one.
    """
    # Step 1: Fetch archive page 1 to find the old puzzle's solution URL
    # and the new puzzle's metadata
    try:
        page_url = f"{base_url}index.html"
        html = fetch_html(session, page_url, timeout=timeout)
        metas = parse_archive_page(html)
    except Exception as exc:
        logger.error(f"Failed to fetch archive page for transition: {exc}")
        metas = []

    old_entry = puzzles[old_current_idx]
    old_key = _puzzle_key_from_dict(old_entry)

    # Step 2: Try to finalize the old puzzle with its solution page data
    for meta in metas:
        key = f"{meta.date_text}_{meta.name}"
        if key == old_key and meta.solution_url:
            logger.info(f"Finalizing old puzzle: {meta.name}")
            try:
                solution_html = fetch_html(session, meta.solution_url, timeout=timeout)
                solution_puzzle_id = parse_solution_page(solution_html)
                if solution_puzzle_id:
                    final_solvers = get_leaderboard_names(session, solution_puzzle_id, timeout=timeout)
                    existing_ts = old_entry.get("solver_timestamps", {})
                    merged_ts = merge_solvers_with_timestamps(final_solvers, existing_ts)
                    old_entry["solvers"] = final_solvers
                    old_entry["solver_timestamps"] = merged_ts
                    old_entry["solution_url"] = meta.solution_url
                    old_entry.pop("puzzle_id", None)
            except Exception as exc:
                logger.warning(f"Failed to finalize old puzzle: {exc}")
            break

    # Step 3: Find the new puzzle's metadata from archive
    new_entry_name = ""
    new_entry_date = ""
    for meta in metas:
        if not meta.solution_url:
            new_entry_name = meta.name
            new_entry_date = meta.date_text
            break

    if not new_entry_name:
        # Derive from puzzle_id as fallback
        new_entry_date = _date_text_from_puzzle_id(new_puzzle_id)
        new_entry_name = _name_from_puzzle_id(new_puzzle_id)

    # Step 4: Add the new current puzzle
    merged_ts = merge_solvers_with_timestamps(new_solvers, {})
    new_entry = {
        "date_text": new_entry_date,
        "name": new_entry_name,
        "solution_url": "",
        "solvers": new_solvers,
        "solver_timestamps": merged_ts,
        "puzzle_id": new_puzzle_id,
    }
    puzzles.insert(0, new_entry)
    logger.info(f"Added new puzzle: {new_entry_name} ({new_entry_date})")


def _date_text_from_puzzle_id(puzzle_id: str) -> str:
    """Extract 'Month Year' from a puzzle_id like '2026-03-01-planetary-parade'."""
    try:
        parts = puzzle_id.split("-")
        dt = datetime(int(parts[0]), int(parts[1]), 1)
        return dt.strftime("%B %Y")
    except Exception:
        return ""


def _name_from_puzzle_id(puzzle_id: str) -> str:
    """Extract a human-readable name from a puzzle_id like '2026-03-01-planetary-parade'."""
    try:
        parts = puzzle_id.split("-")
        slug = "-".join(parts[3:])
        return slug.replace("-", " ").title()
    except Exception:
        return puzzle_id


# ---------------------------------------------------------------------------
# Full archive scrape (--full mode)
# ---------------------------------------------------------------------------


def enrich_puzzle(
    session,
    meta: PuzzleMeta,
    existing_entry: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Puzzle:
    """Fetch leaderboard/solvers for a puzzle based on its solution page."""
    solvers: List[str] = []
    try:
        solution_html = fetch_html(session, meta.solution_url, timeout=timeout)
        puzzle_id = parse_solution_page(solution_html)
        if puzzle_id and meta.date >= datetime(2015, 11, 1):
            solvers = get_leaderboard_names(session, puzzle_id, timeout=timeout)
    except Exception as exc:  # pragma: no cover - network/HTML errors
        logger.warning(f"Failed to enrich puzzle {meta.name}: {exc}")

    # Preserve existing timestamps if available
    solver_timestamps: Dict[str, str] = {}
    if existing_entry and existing_entry.get("solver_timestamps"):
        solver_timestamps = merge_solvers_with_timestamps(
            solvers, existing_entry["solver_timestamps"]
        )

    return Puzzle(
        date_text=meta.date_text,
        name=meta.name,
        solution_url=meta.solution_url,
        solvers=solvers,
        solver_timestamps=solver_timestamps,
    )


def scrape_page(
    session,
    page_url: str,
    existing: Dict[str, Dict[str, Any]],
    timeout: int,
    workers: int,
) -> List[Puzzle]:
    """
    Scrape a single archive page, returning puzzle entries enriched with solvers where available.
    """
    try:
        html = fetch_html(session, page_url, timeout=timeout)
        metas = parse_archive_page(html)
    except Exception as exc:  # pragma: no cover - network/HTML errors
        logger.error(f"Error processing page {page_url}: {exc}")
        return []

    puzzles: List[Puzzle] = []
    to_enrich: List[Tuple[PuzzleMeta, Optional[Dict[str, Any]]]] = []

    for meta in metas:
        if meta.solution_url:
            key = _puzzle_key(meta)
            to_enrich.append((meta, existing.get(key)))
        else:
            key = _puzzle_key(meta)
            existing_entry = existing.get(key)
            if existing_entry:
                puzzles.append(
                    Puzzle(
                        date_text=existing_entry["date_text"],
                        name=existing_entry["name"],
                        solution_url=existing_entry.get("solution_url", ""),
                        solvers=existing_entry.get("solvers", []),
                        solver_timestamps=existing_entry.get("solver_timestamps", {}),
                    )
                )
            else:
                puzzles.append(
                    Puzzle(
                        date_text=meta.date_text,
                        name=meta.name,
                        solution_url="",
                        solvers=[],
                    )
                )

    if to_enrich:
        pool_size = max(1, min(workers, len(to_enrich)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=pool_size) as executor:
            results = list(executor.map(
                lambda args: enrich_puzzle(session, args[0], args[1], timeout),
                to_enrich,
            ))
            puzzles.extend(results)

    return puzzles


def scrape_all(
    base_url: str,
    max_pages: Optional[int],
    output_path: str,
    force_refresh: bool = False,
    workers: int = 10,
    timeout: int = DEFAULT_TIMEOUT,
) -> List[Puzzle]:
    session = build_session()
    existing = {} if force_refresh else load_existing(output_path)

    all_puzzles: List[Puzzle] = []
    page_num = 1

    logger.info(f"Starting full scrape from {base_url} (max_pages={max_pages or 'all'})")
    logger.info(f"Using {len(existing)} existing puzzles as reference")

    while True:
        page_url = f"{base_url}{'page'+str(page_num)+'/' if page_num > 1 else ''}index.html"
        logger.info(f"Scraping page {page_num} at {page_url}")

        page_puzzles = scrape_page(session, page_url, existing, timeout, workers)
        if not page_puzzles:
            break

        logger.info(f"Found {len(page_puzzles)} puzzles on page {page_num}")
        all_puzzles.extend(page_puzzles)

        if max_pages and page_num >= max_pages:
            break

        page_num += 1

    # Also scrape the current puzzle for timestamps
    result = scrape_current_puzzle(session, timeout=timeout)
    if result:
        puzzle_id, fresh_solvers = result
        for i, p in enumerate(all_puzzles):
            if not p.solution_url:
                merged_ts = merge_solvers_with_timestamps(
                    fresh_solvers,
                    p.solver_timestamps or {},
                )
                all_puzzles[i] = Puzzle(
                    date_text=p.date_text,
                    name=p.name,
                    solution_url=p.solution_url,
                    solvers=fresh_solvers,
                    solver_timestamps=merged_ts,
                )
                break

    logger.info(f"Total puzzles found: {len(all_puzzles)}")
    save_puzzles(output_path, all_puzzles)
    return all_puzzles
