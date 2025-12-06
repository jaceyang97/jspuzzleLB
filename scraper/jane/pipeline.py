from __future__ import annotations

import concurrent.futures
from typing import List, Dict, Any, Optional
from datetime import datetime

from loguru import logger

from .client import fetch_html, fetch_json, build_session, DEFAULT_TIMEOUT
from .models import Puzzle, PuzzleMeta
from .parsers import parse_archive_page, parse_solution_page, clean_solver_name
from .storage import load_existing, save_puzzles


def get_leaderboard_names(session, puzzle_id: str, timeout: int = DEFAULT_TIMEOUT) -> List[str]:
    json_url = f"https://www.janestreet.com/puzzles/{puzzle_id}-leaderboard.json"
    try:
        data = fetch_json(session, json_url, timeout=timeout)
        solvers = data.get("leaders", [])
        return [clean_solver_name(solver) for solver in solvers]
    except Exception as exc:  # pragma: no cover - network/HTML errors
        logger.warning(f"Failed to fetch leaderboard {puzzle_id}: {exc}")
        return []


def _puzzle_key(meta: PuzzleMeta) -> str:
    return f"{meta.date_text}_{meta.name}"


def enrich_puzzle(session, meta: PuzzleMeta, timeout: int = DEFAULT_TIMEOUT) -> Puzzle:
    """
    Fetch leaderboard/solvers for a puzzle based on its solution page.
    """
    solvers: List[str] = []
    try:
        solution_html = fetch_html(session, meta.solution_url, timeout=timeout)
        puzzle_id = parse_solution_page(solution_html)
        if puzzle_id and meta.date >= datetime(2015, 11, 1):
            solvers = get_leaderboard_names(session, puzzle_id, timeout=timeout)
    except Exception as exc:  # pragma: no cover - network/HTML errors
        logger.warning(f"Failed to enrich puzzle {meta.name}: {exc}")

    return Puzzle(
        date_text=meta.date_text,
        name=meta.name,
        solution_url=meta.solution_url,
        solvers=solvers,
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
    to_enrich: List[PuzzleMeta] = []

    for meta in metas:
        if meta.solution_url:
            to_enrich.append(meta)
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
            results = list(executor.map(lambda m: enrich_puzzle(session, m, timeout), to_enrich))
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

    logger.info(f"Starting scrape from {base_url} (max_pages={max_pages or 'all'})")
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

    logger.info(f"Total puzzles found: {len(all_puzzles)}")
    save_puzzles(output_path, all_puzzles)
    return all_puzzles


