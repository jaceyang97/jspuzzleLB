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

## Data Pipeline
The project uses a Python scraper (`main.py`) to collect puzzle solver data:
- Scrapes the Jane Street puzzles archive and leaderboards
- Processes and normalizes solver names
- Stores data in JSON format at `src/data/data.json`

## Development

### Data Collection
```bash
# Run the scraper
python main.py

# Options
python main.py --force-refresh  # Refresh all data
python main.py --max-pages 5    # Limit pages to scrape
```

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/jaceyang97/jspuzzleLB.git

# Install dependencies
npm install

# Start development server
npm start
```

## License
MIT License

## Disclaimer
This project is not affiliated with Jane Street. All data is compiled from publicly available information. Jane Street and related trademarks are the property of their respective owners.

## Acknowledgments
Created by [Jace Yang](https://www.jaceyang.com/).

## TODO
- [✅] Add solvers [category features](https://public.tableau.com/app/profile/heidi.stockton/viz/PuzzlesofJaneStreet/JaneStreet)
- [✅] Add a search bar