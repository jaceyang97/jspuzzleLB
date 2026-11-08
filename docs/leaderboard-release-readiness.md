# Leaderboard review checkpoint

Review started on 7 November 2026. The UI checkpoints are `f52efe7` and `bdfde10`. Production release was authorized on 8 November 2026 after the writing and README changes.

## Source files

The application entry is `src/features/leaderboard/Leaderboard.tsx`. The selected local preview at `/proto/leaderboard/?view=central` loads the same application.

The page components live in `src/features/leaderboard/page/`:

| Area | Files |
| --- | --- |
| Ranking layout and mobile statistics dialog | `LeaderboardPage.jsx`, `styles/layout.css`, `styles/viewport.css` |
| Rows, rank changes and crown | `Rankings.jsx`, `WinnerCrown.jsx`, `styles/rows.css` |
| Header and new-solver names | `LeaderboardHeader.jsx`, `CurrentPuzzleNotice.jsx`, `styles/header.css`, `styles/current-puzzle-notice.css` |
| Charts, solver categories and puzzle archive | `Insights.jsx`, individual card components, `styles/sidebar.css` |
| Feedback form and project information | `ProjectInfoCard.jsx` |
| Elevator scroll, audio and messages | `useElevator.js`, `elevatorSound.js`, `elevatorMotion.js`, `ElevatorMessages.jsx`, `ElevatorUpIcon.jsx` |
| Theme toggle | `usePageTheme.js`, `styles/theme.css` |
| Profile URLs, browser history and analytics | `../hooks/useSolverProfile.ts` |
| Loading and retry screens | `LeaderboardLoading.jsx`, `styles/states.css` |

Production imports no prototype modules. Card and control corners share a 14px radius. The announcement centers the speaker, puzzle title, names and remainder as one group. It measures the text to decide how many names fit. On narrow screens, the puzzle title sits above the names.

The November 7 review included `origin/main` through `c4929a6`, with that day's data and the Elias Botsford alias correction. This UI work did not change the scraper's ranking rules or regenerate puzzle data.

## Fixes before the checkpoint

- Virtualized rows transfer keyboard focus to a visible row before removing the focused button.
- Search announces the match count. Shared solver URLs and browser back/forward navigation still open and close profiles.
- Theme selection works when the browser blocks storage. The favicon and browser theme color follow the selected theme.
- Short landscape profile dialogs scroll as a whole, so puzzle history remains accessible.
- The loading screen reserves space for the header, cards and ranking. Failed requests show a retry button.
- Geist Mono is preloaded. Light-theme chart labels use `#6e6e73` for contrast.
- Three design studies and their fonts were moved out of `public/` into `prototypes/legacy-public-designs/`. Their contents are preserved.

The `/rising-stars` article keeps its route-specific `noindex`. The root page remains indexable. Icon and font notices are in `public/licenses/` and `public/fonts/`; audio source notes sit beside the audio files.

## Recorded checks

These checks passed for the UI checkpoint:

```text
.\node_modules\.bin\tsc.cmd --noEmit
PASS

.\node_modules\.bin\eslint.cmd src/features/leaderboard/Leaderboard.tsx src/features/leaderboard/hooks/useSolverProfile.ts src/features/leaderboard/hooks/__tests__/useSolverProfile.test.tsx src/features/leaderboard/page --ext .js,.jsx,.tsx
PASS

$env:CI='true'; .\node_modules\.bin\react-scripts.cmd test --watchAll=false --runInBand
Test Suites: 20 passed, 20 total
Tests:       126 passed, 126 total

npm run build
Compiled successfully.
```

The build prints a stale Browserslist database notice. Dependencies were not updated during this work.

After the writing changes, all 131 frontend tests and 19 Python tests passed. The production build and saved article-data check also passed. The README now has React, TypeScript, Python and MIT badges; all four image URLs were checked.

Twenty-four production-build browser cases covered eight viewport sizes in both themes, profile links and history, search, keyboard tabs, landscape history, loading/error/retry, blocked storage and the article route. Thirty announcement cases checked different name lengths at six widths. All requested card and control corners computed to 14px on desktop and mobile in both themes.

The full ranking loaded all 17,647 solvers while mounting 22 rows at the end of the list. Five-digit ranks left a 10px gap before rank changes. During the headless elevator test, scrolling and music ended about 18 ms apart. All four messages appeared in order; Escape and reduced motion worked. The document did not reload.

## Remaining checks

Use a real phone to check input zoom, the software keyboard, safe areas and landscape rotation. Check screen-reader reading order and scrolling under load. Listen to the elevator's volume and ding timing on speakers or headphones. Headless checks do not cover these device behaviors.

Feedback delivery is not connected. Send remains disabled.

Local test output is in `.cache/production-prep/`. The development preview is `http://localhost:3001/proto/leaderboard/?view=central`. The compiled preview is `http://127.0.0.1:4173/` while its local server is running.

The historical workbench remains local and untracked. Use `npm start` or `npm run build` to run the committed application.
