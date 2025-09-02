import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
from loguru import logger
import concurrent.futures
import argparse
import json
from typing import List, Dict, Any, Optional
import os


def get_leaderboard_names(puzzle_id: str) -> List[str]:
    """Fetch and clean solver names from a puzzle's leaderboard."""
    json_url = f"https://www.janestreet.com/puzzles/{puzzle_id}-leaderboard.json"
    try:
        data = requests.get(json_url, verify=False).json()
        solvers = data.get("leaders", [])
        return [re.sub(r"\s*\([^)]*\)", "", solver).strip() for solver in solvers]
    except:
        return []


def get_page_puzzles(
    page_url: str, existing_puzzles: Optional[Dict[str, Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """Fetch puzzles from a single page of the Jane Street archive."""
    if existing_puzzles is None:
        existing_puzzles = {}

    try:
        response = requests.get(page_url, verify=False)
        soup = BeautifulSoup(response.text, "html.parser")
        container = soup.select_one(
            "body > div.site-wrap > main > div > div.container > div > div"
        )

        if not container:
            return []

        rows = container.select("div.row")
        page_puzzles = []
        puzzle_info_list = []

        for row in rows:
            date_tag = row.select_one(".left span.date")
            name_tag = row.select_one(".left span.name")
            solution_link_tag = row.select_one(".right a.solution-link")

            if not (date_tag and name_tag):
                continue

            date_text = date_tag.get_text(strip=True).rstrip(":")
            date = datetime.strptime(date_text, "%B %Y")
            puzzle_name = name_tag.get_text(strip=True)

            # Create a unique key for this puzzle
            puzzle_key = f"{date_text}_{puzzle_name}"

            if solution_link_tag and solution_link_tag.has_attr("href"):
                href = solution_link_tag["href"]
                solution_url = "https://www.janestreet.com" + (
                    href if isinstance(href, str) else str(href)
                )

                # Always fetch new data for puzzles with solution URLs
                puzzle_info = {
                    "date_text": date_text,
                    "name": puzzle_name,
                    "solution_url": solution_url,
                    "date": date,
                }
                puzzle_info_list.append(puzzle_info)
            else:
                # For puzzles without solution URLs (current month)
                # Check if we have existing data for this puzzle
                if puzzle_key in existing_puzzles:
                    # If we have existing data, use it
                    page_puzzles.append(existing_puzzles[puzzle_key])
                else:
                    # If no existing data, create new entry
                    puzzle_data = {
                        "date_text": date_text,
                        "name": puzzle_name,
                        "solution_url": "",
                        "solvers": [],
                    }
                    page_puzzles.append(puzzle_data)

        # Process solution URLs concurrently
        if puzzle_info_list:
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(get_puzzle_solvers, puzzle_info_list))
                page_puzzles.extend(results)

        return page_puzzles
    except Exception as e:
        logger.error(f"Error processing page {page_url}: {e}")
        return []


def get_puzzle_solvers(puzzle_info: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch solver data for a single puzzle."""
    date_text = puzzle_info["date_text"]
    puzzle_name = puzzle_info["name"]
    solution_url = puzzle_info["solution_url"]
    date = puzzle_info["date"]

    try:
        response = requests.get(solution_url, verify=False)
        submissions_tag = BeautifulSoup(response.text, "html.parser").select_one(
            "p.correct-submissions"
        )

        if submissions_tag and submissions_tag.has_attr("data-directory"):
            puzzle_id = submissions_tag["data-directory"]
            if date >= datetime(2015, 11, 1):
                # Ensure puzzle_id is a string
                if isinstance(puzzle_id, str):
                    solvers = get_leaderboard_names(puzzle_id)
                else:
                    solvers = get_leaderboard_names(str(puzzle_id))
            else:
                solvers = []
        else:
            solvers = []
    except:
        solvers = []

    return {
        "date_text": date_text,
        "name": puzzle_name,
        "solution_url": solution_url,
        "solvers": solvers,
    }


def load_existing_puzzles(file_path: str) -> Dict[str, Dict[str, Any]]:
    """Load existing puzzles from a JSON file into a dictionary keyed by puzzle name and date."""
    if not os.path.exists(file_path):
        return {}

    try:
        with open(file_path, "r") as f:
            puzzles_list = json.load(f)

        # Convert list to dictionary with keys as "date_text_name" for quick lookup
        puzzles_dict = {}
        for puzzle in puzzles_list:
            key = f"{puzzle['date_text']}_{puzzle['name']}"
            puzzles_dict[key] = puzzle

        logger.info(f"Loaded {len(puzzles_dict)} existing puzzles from {file_path}")
        return puzzles_dict
    except Exception as e:
        logger.warning(f"Failed to load existing puzzles: {e}")
        return {}


def scrape_all_puzzles(
    base_url: str,
    max_pages: Optional[int] = None,
    existing_puzzles: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Scrape multiple pages of Jane Street puzzles."""
    if existing_puzzles is None:
        existing_puzzles = {}

    all_puzzles = []
    page_num = 1

    logger.info(f"Starting to scrape puzzles from {base_url}")
    logger.info(f"Using {len(existing_puzzles)} existing puzzles as reference")

    while True:
        page_url = (
            f"{base_url}{'page'+str(page_num)+'/' if page_num > 1 else ''}index.html"
        )
        logger.info(f"Scraping page {page_num}")

        page_puzzles = get_page_puzzles(page_url, existing_puzzles)
        if not page_puzzles:
            break

        logger.info(f"Found {len(page_puzzles)} puzzles")
        all_puzzles.extend(page_puzzles)

        if max_pages and page_num >= max_pages:
            break

        page_num += 1

    logger.info(f"Total puzzles found: {len(all_puzzles)}")
    return all_puzzles


def parse_arguments():
    """Parse command line arguments."""
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
    return parser.parse_args()


def main():
    """Run the Jane Street puzzle scraper."""
    args = parse_arguments()
    base_url = "https://www.janestreet.com/puzzles/archive/"

    logger.info("Starting Jane Street puzzle scraper")

    # Determine the output path - use src/data/data.json for React app if it exists
    output_path = args.output
    react_output_path = "src/data/data.json"

    # Check if we're in a React project by looking for the src/data directory
    if os.path.exists("src/data"):
        output_path = react_output_path
        logger.info(f"React project detected, will save data to {output_path}")
    else:
        logger.info(f"Using output path: {output_path}")

    # Load existing puzzles if not forcing a refresh
    existing_puzzles = {} if args.force_refresh else load_existing_puzzles(output_path)

    # Scrape puzzles, using existing data where possible
    puzzles = scrape_all_puzzles(base_url, args.max_pages, existing_puzzles)

    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(
            puzzles, f, indent=2, default=str
        )  # Added default=str to handle datetime serialization

    logger.info(f"Scraped {len(puzzles)} puzzles and saved to {output_path}")


if __name__ == "__main__":
    main()
