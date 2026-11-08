# Development

The frontend is a React app, the feedback endpoint runs as a Vercel Function, and a Python scraper maintains the public puzzle data. Use Node.js 22 and Python 3.13 to match the deployed function and scraper workflow.

## Run locally

```sh
npm ci
npm start
```

The frontend runs at `http://localhost:3000`. Gmail delivery needs the server environment described in [Feedback delivery](feedback.md); the React development server does not run the Vercel Function.

## Checks

```sh
npm run typecheck
npm test -- --watchAll=false --runInBand
npm run test:api
npm run build
```

Install the Python dependencies and run the scraper tests:

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s scraper/tests -v
```

## Code layout

| Path | Purpose |
| --- | --- |
| [`src/features/leaderboard/`](../src/features/leaderboard/) | Leaderboard data loading, page layout, rankings, profiles, and elevator |
| [`src/features/rising-stars/`](../src/features/rising-stars/) | The article explaining the Rising stars study |
| [`src/components/`](../src/components/) | Shared charts, navigation title, theme controls, and tooltips |
| [`src/hooks/`](../src/hooks/) and [`src/utils/`](../src/utils/) | Shared hooks, ranking calculations, and formatting |
| [`api/`](../api/) and [`tests/api/`](../tests/api/) | Feedback endpoint and server tests |
| [`scraper/`](../scraper/) | Scraper, statistics generation, notifications, and Python tests |
| [`public/data/`](../public/data/) | Generated puzzle records and precomputed statistics |
| [`analysis/`](../analysis/) | Research protocols, scripts, and saved results |

Frontend tests live beside their components in `__tests__/`. Fonts and third-party notices are in [`public/fonts/`](../public/fonts/) and [`public/licenses/`](../public/licenses/). Audio source notes live beside the audio files.

## Reference

- [Data collection and text handling](data.md)
- [Interface behavior](interface.md)
- [Feedback delivery](feedback.md)
- [Ranking research](../analysis/README.md)
