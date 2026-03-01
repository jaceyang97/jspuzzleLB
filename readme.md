<div align="center">
  <h1><strong>Jane Street</strong> | Puzzle Leaderboard</h1>
  <p>An interactive dashboard tracking solvers for Jane Street's monthly puzzles.</p>
  <img src="public/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle Leaderboard Logo" width="150px" />
  <br><br>
  <a href="https://jspuzzle-lb.vercel.app/">Live Site</a>
</div>

## Setup

```bash
npm ci && npm start        # Frontend
python main.py             # Scrape & generate stats
```

## Tech

- **Frontend**: React, TypeScript, Recharts
- **Scraper**: Python, BeautifulSoup
- **Data**: Auto-updated monthly via GitHub Actions

## Disclaimer

Not affiliated with Jane Street. All data from publicly available sources.

## License

MIT — Created by [Jace Yang](https://www.jaceyang.com/)
