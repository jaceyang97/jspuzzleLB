from __future__ import annotations

import argparse
import os

from loguru import logger

from .jane.pipeline import scrape_all, update_current
from .jane.aggregator import build_stats, save_stats
from .jane.notifier import send_notification


def parse_arguments():
    parser = argparse.ArgumentParser(description="Jane Street Puzzle Scraper")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Full archive scrape (for initial setup or data rebuild). "
             "Default mode only updates the current puzzle.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum number of pages to scrape in --full mode (default: all pages)",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Force refresh all puzzles in --full mode, ignoring existing data",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="Max concurrent workers for --full mode solution fetches (default: 10)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Per-request timeout in seconds (default: 10)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data.json",
        help="Output file path (default: data.json)",
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
    stats_path = os.path.join(output_dir, "stats.json")

    logger.info(f"Using output directory: {output_dir}")

    if args.full:
        logger.info("Running full archive scrape")
        puzzles = scrape_all(
            base_url=base_url,
            max_pages=args.max_pages,
            output_path=output_path,
            force_refresh=args.force_refresh,
            workers=args.workers,
            timeout=args.timeout,
        )
        stats = build_stats([p.to_dict() if hasattr(p, "to_dict") else p for p in puzzles])
        save_stats(stats_path, stats)
        logger.info(f"Saved leaderboard stats to {stats_path}")
    else:
        logger.info("Running lightweight current-puzzle update")
        puzzles, notification = update_current(
            base_url=base_url,
            output_path=output_path,
            stats_path=stats_path,
            timeout=args.timeout,
        )

        # Send daily email notification
        send_notification(notification)


if __name__ == "__main__":
    main()
