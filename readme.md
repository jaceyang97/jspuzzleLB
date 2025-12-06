<div align="center">
  <h1><strong>Jane Street</strong> | Puzzle Leaderboard</h1>
  <p>A modern, interactive dashboard tracking solvers for Jane Street's monthly puzzles.</p>
  <img src="public/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle Leaderboard Logo" width="150px" />
</div>

## Overview
An interactive dashboard that visualizes data from Jane Street's monthly puzzles and their solvers.
Check out the [live page](https://jspuzzle-lb.vercel.app/) to see in action.

## Features
- **Top Solvers Leaderboard**: Track the most prolific puzzle solvers
- **Longest Streaks**: View solvers with the most consecutive months of solutions
- **Rising Stars**: Discover new solvers who have recently joined the community
- **Interactive Charts**: Visualize solver growth and most solved puzzles

## Usage
- Browse through different leaderboards and statistics
- Scroll through tables to see more entries
- Click on the "PUZZLES" button to visit Jane Street's official puzzles page

## Technology Stack
- **Frontend**: React and TypeScript
- **Data Collection**: Python web scraping with BeautifulSoup and Requests

## Project Structure
- `src/` React app
  - `components/` page-level UI (e.g., `Leaderboard.tsx`)
  - `features/leaderboard/` tables, charts, hooks, services, types
  - `utils/leaderboardUtils.ts` client-side fallback calculations
- `public/data/data.json` raw scraped puzzles (served alongside stats)
- `public/data/stats.json` precomputed leaderboard stats served to the app
- `scraper/` Python scraper (`main.py` entry, `scraper/jane/*` pipeline and stats aggregation)
- `.github/workflows/update-puzzles.yml` monthly CI to scrape and rebuild stats

## Data Pipeline
The project uses a Python scraper (`main.py`) to collect puzzle solver data:
- Scrapes the Jane Street puzzles archive and leaderboards
- Processes and normalizes solver names
- Stores data in JSON format at `public/data/data.json`

## Development

### Data Collection & Stats Generation
```bash
python main.py                  # Scrape and generate stats to public/data/
python main.py --force-refresh  # Ignore cache, re-scrape everything
python main.py --max-pages 5    # Limit to 5 archive pages
python main.py --workers 20     # Increase concurrency (default: 10)
python main.py --timeout 15     # Per-request timeout in seconds (default: 10)
```

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/jaceyang97/jspuzzleLB.git

# Install dependencies
npm ci

# Start development server
npm start
```

### Local Test Loop
- `python main.py` → refreshes `public/data/data.json` and `public/data/stats.json`
- `npm start` → dev server; Network tab should show `GET /data/stats.json`
- To test fallback, temporarily move/rename `public/data/stats.json` and reload; UI will compute in-browser (slower).

## License
MIT License

## Disclaimer
This project is not affiliated with Jane Street. All data is compiled from publicly available information. Jane Street and related trademarks are the property of their respective owners.

## Acknowledgments
Created by [Jace Yang](https://www.jaceyang.com/).

## Changelog

### Completed
- [✅] Solvers category features ([inspiration](https://public.tableau.com/app/profile/heidi.stockton/viz/PuzzlesofJaneStreet/JaneStreet)) (Features)
- [✅] Search bar with original rank display preservation (Features)
- [✅] Solver Distribution Chart (Features)
- [✅] Dark/light theme toggle with CSS variables (Features)
- [✅] Solvers Growth chart with "Ongoing" indicator for current month (Features)
- [✅] Top 10 Most Solved Puzzles table (Features)
- [✅] Refactorization of codebase 1.0 (Code Quality)
- [✅] Type safety improvements (Code Quality)
- [✅] Performance optimizations (Code Quality)
- [✅] Added `aria-labels` and `scope` attributes to table headers (Accessibility & UX)
- [✅] Added `focus-visible` outline to theme toggle (Accessibility & UX)
- [✅] Improved layout responsiveness (Accessibility & UX)
- [✅] Mobile-friendly layout with responsive design (Accessibility & UX)
- [✅] Precomputed stats via `stats.json` with client-side fallback (Infrastructure)
- [✅] Automated monthly data updates via GitHub Actions (Infrastructure)
- [✅] Enhanced error handling in data loading and scraper (Infrastructure)

### Planned
- [ ] Major update on scraping method to collect daily solve data throughout the month