from __future__ import annotations

import argparse
import os

from loguru import logger

from .jane.pipeline import scrape_all
from .jane.aggregator import build_stats, save_stats


def parse_arguments():
    parser = argparse.ArgumentParser(description="Jane Street Puzzle Scraper")
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum number of pages to scrape (default: all pages)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data.json",
        help="Output file path (default: data.json)",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Force refresh all puzzles, ignoring existing data",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="Max concurrent workers for solution fetches (default: 10)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Per-request timeout in seconds (default: 10)",
    )
    return parser.parse_args()


def main():
    args = parse_arguments()
    base_url = "https://www.janestreet.com/puzzles/archive/"

    logger.info("Starting Jane Street puzzle scraper")

    # Keep data.json and stats.json side by side for the frontend
    react_data_dir = os.path.join("public", "data")
    output_dir = react_data_dir if os.path.exists("public") else (os.path.dirname(args.output) or ".")
    output_path = os.path.join(output_dir, "data.json") if os.path.exists("public") else args.output

    logger.info(f"Using output directory: {output_dir}")

    puzzles = scrape_all(
        base_url=base_url,
        max_pages=args.max_pages,
        output_path=output_path,
        force_refresh=args.force_refresh,
        workers=args.workers,
        timeout=args.timeout,
    )

    # Derive stats JSON alongside the scraped data for the frontend
    stats_output = os.path.join(output_dir, "stats.json")
    stats = build_stats([p.to_dict() if hasattr(p, "to_dict") else p for p in puzzles])
    save_stats(stats_output, stats)
    logger.info(f"Saved leaderboard stats to {stats_output}")


if __name__ == "__main__":
    main()


