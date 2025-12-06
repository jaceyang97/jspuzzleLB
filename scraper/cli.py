from __future__ import annotations

import argparse
import os

from loguru import logger

from .jane.pipeline import scrape_all


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

    # Determine the output path - use src/data/data.json for React app if it exists
    output_path = args.output
    react_output_path = "src/data/data.json"
    if os.path.exists("src/data"):
        output_path = react_output_path
        logger.info(f"React project detected, will save data to {output_path}")
    else:
        logger.info(f"Using output path: {output_path}")

    scrape_all(
        base_url=base_url,
        max_pages=args.max_pages,
        output_path=output_path,
        force_refresh=args.force_refresh,
        workers=args.workers,
        timeout=args.timeout,
    )


if __name__ == "__main__":
    main()


