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

# Jane Street sometimes adds late solvers to the previous month's puzzle after
# it has already moved into the archive. Re-check archived puzzles whose
# nominal archival date is within this many days of "now" on each daily run,
# so those late additions land on the leaderboard.
LEEWAY_DAYS = 30


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
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Lightweight daily update: only refresh the current puzzle's leaderboard.
    Handles month transitions (new puzzle appearing) automatically.

    Returns (puzzles, notification) where notification contains info about
    new solvers detected during this run.
    """
    from .aggregator import build_stats, save_stats

    empty_notification: Dict[str, Any] = {
        "puzzle_name": "", "puzzle_date": "", "new_solvers": [], "total_solvers": 0,
        "late_solvers_by_puzzle": {},
    }

    session = build_session()
    puzzles = load_puzzles_list(output_path)

    if not puzzles:
        logger.error("No existing data found. Run with --full to do initial scrape.")
        return puzzles, empty_notification

    # Scrape the current puzzle page
    result = scrape_current_puzzle(session, timeout=timeout)
    if result is None:
        logger.warning("Could not fetch current puzzle; saving stats and exiting")
        stats = build_stats(puzzles)
        save_stats(stats_path, stats)
        return puzzles, empty_notification

    puzzle_id, fresh_solvers = result
    notification = dict(empty_notification)

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
            new_solver_names = [s for s in fresh_solvers if s not in existing_ts]
            current_entry["solvers"] = fresh_solvers
            current_entry["solver_timestamps"] = merged_ts
            current_entry["puzzle_id"] = puzzle_id

            notification["puzzle_name"] = current_entry.get("name", "")
            notification["puzzle_date"] = current_entry.get("date_text", "")
            notification["new_solvers"] = new_solver_names
            notification["total_solvers"] = len(fresh_solvers)

            logger.info(
                f"Updated current puzzle: {len(fresh_solvers)} solvers "
                f"({len(new_solver_names)} new)"
            )
        else:
            # Case B: New puzzle detected — month transition
            logger.info(f"New puzzle detected (was {stored_id}, now {puzzle_id})")
            _handle_month_transition(
                session, base_url, puzzles, current_idx,
                puzzle_id, fresh_solvers, timeout,
            )
            # After transition, new puzzle is at index 0
            notification["puzzle_name"] = puzzles[0].get("name", "")
            notification["puzzle_date"] = puzzles[0].get("date_text", "")
            notification["new_solvers"] = fresh_solvers
            notification["total_solvers"] = len(fresh_solvers)
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

        notification["puzzle_name"] = new_entry["name"]
        notification["puzzle_date"] = new_entry["date_text"]
        notification["new_solvers"] = fresh_solvers
        notification["total_solvers"] = len(fresh_solvers)

    # Re-check recently archived puzzles for late solver additions that
    # Jane Street made after the puzzle moved into the archive.
    late_by_puzzle = refresh_recent_archives(session, puzzles, timeout=timeout)
    if late_by_puzzle:
        total_late = sum(len(v) for v in late_by_puzzle.values())
        logger.info(
            f"Picked up {total_late} late solver(s) across "
            f"{len(late_by_puzzle)} archived puzzle(s)"
        )
        notification["late_solvers_by_puzzle"] = late_by_puzzle

    save_puzzles_raw(output_path, puzzles)
    stats = build_stats(puzzles)
    save_stats(stats_path, stats)
    return puzzles, notification


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

    # Step 2: Try to finalize the old puzzle with its solution page data.
    # We keep `puzzle_id` on the archived entry (rather than popping it) so
    # subsequent daily runs can re-fetch the leaderboard cheaply and pick up
    # late solver additions during the LEEWAY_DAYS window.
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
                    old_entry["puzzle_id"] = solution_puzzle_id
                    old_entry["archived_at"] = datetime.now(timezone.utc).isoformat()
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


def _approx_archive_date(date_text: str) -> Optional[datetime]:
    """Approximate when a puzzle was archived: the 1st of the month after `date_text`."""
    try:
        puzzle_dt = datetime.strptime(date_text, "%B %Y")
    except Exception:
        return None
    if puzzle_dt.month == 12:
        return datetime(puzzle_dt.year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(puzzle_dt.year, puzzle_dt.month + 1, 1, tzinfo=timezone.utc)


def _days_since_archived(entry: Dict[str, Any]) -> Optional[int]:
    """How many days ago was this puzzle archived (None if undeterminable)."""
    archived_at = entry.get("archived_at")
    archived_dt: Optional[datetime] = None
    if archived_at:
        try:
            archived_dt = datetime.fromisoformat(archived_at)
            if archived_dt.tzinfo is None:
                archived_dt = archived_dt.replace(tzinfo=timezone.utc)
        except Exception:
            archived_dt = None
    if archived_dt is None:
        archived_dt = _approx_archive_date(entry.get("date_text", ""))
    if archived_dt is None:
        return None
    return (datetime.now(timezone.utc) - archived_dt).days


def _ensure_puzzle_id(
    session,
    entry: Dict[str, Any],
    timeout: int,
) -> Optional[str]:
    """Return puzzle_id for an archived entry, fetching the solution page if needed."""
    pid = entry.get("puzzle_id")
    if pid:
        return pid
    solution_url = entry.get("solution_url")
    if not solution_url:
        return None
    try:
        html = fetch_html(session, solution_url, timeout=timeout)
        pid = parse_solution_page(html)
    except Exception as exc:
        logger.warning(
            f"Failed to fetch solution page for {entry.get('name', '?')}: {exc}"
        )
        return None
    if pid:
        entry["puzzle_id"] = pid
    return pid


def refresh_archived_entry(
    session,
    entry: Dict[str, Any],
    timeout: int,
) -> List[str]:
    """
    Re-fetch leaderboard for a single archived puzzle entry, merge late solvers,
    and return the list of newly-added solver names (empty if none).
    """
    puzzle_id = _ensure_puzzle_id(session, entry, timeout)
    if not puzzle_id:
        return []
    fresh_solvers = get_leaderboard_names(session, puzzle_id, timeout=timeout)
    if not fresh_solvers:
        return []
    existing_solvers = set(entry.get("solvers") or [])
    late_solvers = [s for s in fresh_solvers if s not in existing_solvers]
    if not late_solvers:
        # Still keep the leaderboard list in sync (handles renames/removals are
        # rare; only overwrite if the content actually changed).
        if list(entry.get("solvers") or []) != fresh_solvers:
            entry["solvers"] = fresh_solvers
        return []

    existing_ts = entry.get("solver_timestamps", {})
    merged_ts = merge_solvers_with_timestamps(fresh_solvers, existing_ts)
    entry["solvers"] = fresh_solvers
    entry["solver_timestamps"] = merged_ts
    logger.info(
        f"Late additions for {entry.get('name', '?')} "
        f"({entry.get('date_text', '?')}): {len(late_solvers)} new solver(s)"
    )
    return late_solvers


def refresh_recent_archives(
    session,
    puzzles: List[Dict[str, Any]],
    timeout: int,
    leeway_days: int = LEEWAY_DAYS,
) -> Dict[str, List[str]]:
    """
    Re-check archived puzzles whose archive date is within `leeway_days`,
    merging in any late solvers Jane Street has added since last run.

    Returns a mapping {"<date_text> - <name>": [late_solvers]} for any
    entries that gained new names; empty if nothing changed.
    """
    late_by_puzzle: Dict[str, List[str]] = {}
    for entry in puzzles:
        if not entry.get("solution_url"):
            continue  # current puzzle, handled elsewhere
        age = _days_since_archived(entry)
        if age is None or age < 0 or age > leeway_days:
            continue
        late = refresh_archived_entry(session, entry, timeout)
        if late:
            label = f"{entry.get('date_text', '?')} - {entry.get('name', '?')}"
            late_by_puzzle[label] = late
    return late_by_puzzle


def backfill_archives(
    session,
    puzzles: List[Dict[str, Any]],
    timeout: int,
    months: int = 24,
) -> Dict[str, List[str]]:
    """
    One-shot retroactive scan: re-fetch leaderboards for archived puzzles up to
    `months` old, regardless of the leeway window. Used to recover late solvers
    that were previously dropped on finalize. Stamps `puzzle_id` and
    `archived_at` on entries that lack them.
    """
    late_by_puzzle: Dict[str, List[str]] = {}
    cutoff_days = months * 31  # generous, calendar approximation
    for entry in puzzles:
        if not entry.get("solution_url"):
            continue
        age = _days_since_archived(entry)
        if age is None or age < 0 or age > cutoff_days:
            continue
        late = refresh_archived_entry(session, entry, timeout)
        # Stamp archived_at so subsequent leeway-window checks work cleanly.
        if not entry.get("archived_at"):
            approx = _approx_archive_date(entry.get("date_text", ""))
            if approx is not None:
                entry["archived_at"] = approx.isoformat()
        if late:
            label = f"{entry.get('date_text', '?')} - {entry.get('name', '?')}"
            late_by_puzzle[label] = late
    return late_by_puzzle


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
