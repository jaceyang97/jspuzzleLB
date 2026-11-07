# Leaderboard release preparation

Prepared locally on 2026-11-07 as a review checkpoint. Code checks passed; production is held at the user's request for further adjustments. No push, deployment hook, or hosting publish has been run.

## Implementation

The CRA application now renders the selected leaderboard from `src/features/leaderboard/Leaderboard.tsx`. The existing `src/components/Leaderboard.tsx` import remains compatible. The selected local preview at `/proto/leaderboard/?view=central` boots this same application, so future adjustments have one source of truth.

The production implementation is in `src/features/leaderboard/page/`:

| Area | Files |
| --- | --- |
| Page layout, sticky rails, mobile statistics dialog | `LeaderboardPage.jsx`, `styles/layout.css`, `styles/viewport.css` |
| Row hierarchy, rank changes, crown | `Rankings.jsx`, `WinnerCrown.jsx`, `styles/rows.css` |
| Header and selected new-solver nameplates | `LeaderboardHeader.jsx`, `CurrentPuzzleNotice.jsx`, `styles/header.css`, `styles/current-puzzle-notice.css` |
| Charts, square grid, puzzle archive, feedback card | `Insights.jsx`, individual card components, `styles/sidebar.css` |
| Elevator, music, ding and plaques | `useElevator.js`, `elevatorSound.js`, `elevatorMotion.js`, `ElevatorMessages.jsx`, `ElevatorUpIcon.jsx` |
| Theme transition and persistence | `usePageTheme.js`, `styles/theme.css` |
| Shared solver links, browser navigation and analytics | `../hooks/useSolverProfile.ts` |
| Loading and error states | `LeaderboardLoading.jsx`, `styles/states.css` |

Selected runtime modules and required assets were promoted into `src`; production imports no prototype modules. Selected CSS was reduced from 175,418 to about 88,000 bytes before bundling, keeping the approved ranking and card layout.

The announcement centers the speaker, puzzle context, names and remainder together. Name fitting measures the available width and actual text; the narrow layout stacks the puzzle context above the names. Thirty browser cases covering varying name lengths and six viewport widths passed, with no horizontal overflow.

The branch was fast-forwarded to the existing `origin/main` baseline `c4929a6`, retaining the November 7 data and confirmed Elias Botsford alias correction. No scraper rules or generated data were changed locally for this release.

## Findings and fixes

### A. Accessibility

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | Virtualized rows could remove the focused button. | `page/usePageWindow.js:38` and `:81` move focus to a visible row when recycling it. | Keyboard navigation continues in the visible ranking. | Fixed |
| Should fix | Filtering changed the ranking without announcing results. | `page/LeaderboardPage.jsx:103` keeps a live match count outside the keyed results. | Screen-reader users receive search feedback. | Fixed |
| Should fix | Light chart axis text used `#86868b` on white. | `src/hooks/useThemeColors.ts:14` uses existing secondary text color `#6e6e73`. | Small informational labels meet normal text contrast. | Fixed |

### B. Performance

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | Geist Mono was discovered after CSS/JS loaded. | `public/index.html:9` preloads the same file declared in `public/fonts/leaderboard.css`. | Earlier font discovery reduces numeric layout shifts. | Fixed |

Long-list virtualization and lazy chart chunks remain. With all 17,647 solvers loaded, only 22 ranking rows were mounted at the end of the list.

### C. Mobile

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | Profile history collapsed to zero height in landscape. | `page/styles/base.css:310` lets short profile dialogs scroll as a whole. | Solved puzzles and pagination stay accessible. | Fixed |
| Should fix | Safe-area styles had no matching viewport declaration. | `public/index.html:6` includes `viewport-fit=cover` and `interactive-widget=resizes-content`. | Fixed controls can respect safe areas and the keyboard viewport. | Fixed |

### D. Forms

No new defects. Search has a real label, clear action and keyboard submission. Feedback retains its approved textarea and small disabled Send button; email delivery is intentionally outside the current implementation.

### E. Stability and states

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | The prototype theme hook accessed storage without protection. | `page/usePageTheme.js:9` and `:55` tolerate denied reads/writes. | The application renders and toggles themes when storage is blocked. | Fixed |
| Should fix | The prototype did not preserve solver URL/history behavior or profile analytics. | `hooks/useSolverProfile.ts:6` preserves shared links, popstate, profile source and dwell time. | Existing production links and navigation continue working. | Fixed |
| Should fix | The prototype used a full-screen loading placeholder. | `page/LeaderboardLoading.jsx:9` reserves the selected header, rails and ranking structure. | Loading does not replace a blank screen with the entire layout. | Fixed |

Legacy `?view=rising-stars` and `?view=streaks` links also select the corresponding ranking. Failed data requests show a retry action.

### F. Motion

No open defects found in the selected motion. The chosen crown sheen, navigation underline, theme reveal, elevator curve, music fade and plaque sequence are retained. Escape/manual input cancel the lift. Reduced motion returns directly to the top without starting audio.

### G. Theming

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Should fix | The favicon used black circles in both themes. | `public/index.html:5` and `page/usePageTheme.js:36` select the existing dark-logo variant when appropriate. | The mark remains visible in a dark browser tab. | Fixed |
| Polish | Browser theme color stayed black. | Bootstrap and theme toggle update it to the existing page surface color. | Browser chrome follows the chosen theme. | Fixed |

### H. Content and leftovers

| Severity | Before | After | Why | Status |
| --- | --- | --- | --- | --- |
| Blocker | Three interactive studies and their fonts lived in `public/designs`. | Preserved in `prototypes/legacy-public-designs/`, outside the production public directory. | CRA no longer publishes the studies. All 17 archived files retain their original content. | Fixed |

Prototype pickers and catalog modules stay outside the production import graph. `.cache/` is ignored. Icon/theme/font licenses are included in `public/licenses/` and `public/fonts/`. Existing audio source notes remain beside the selected assets.

### I. Content route and metadata

The existing `/rising-stars` article and its deliberate route-specific `noindex` remain. Root production HTML is indexable and contains no prototype redirect. No new social image or marketing claims were invented.

## Needs a device or a human

- On a real iPhone, check landscape rotation, keyboard/input zoom and safe-area clearance. Chrome touch emulation passed, but does not establish Safari hardware behavior.
- On a real phone, check scrolling under load, screen-reader reading order and the elevator's perceived music/ding timing and volume. Headless audio-clock checks are not a listening test.
- Continue the planned design adjustments before publishing. Feedback email delivery remains unconnected; its Send button is intentionally disabled.

## Verification

Commands run after integration:

```text
.\node_modules\.bin\tsc.cmd --noEmit
PASS

.\node_modules\.bin\eslint.cmd src/features/leaderboard/Leaderboard.tsx src/features/leaderboard/hooks/useSolverProfile.ts src/features/leaderboard/hooks/__tests__/useSolverProfile.test.tsx src/features/leaderboard/page --ext .js,.jsx,.tsx
PASS (no lint errors or warnings)

$env:CI='true'; .\node_modules\.bin\react-scripts.cmd test --watchAll=false --runInBand
Test Suites: 20 passed, 20 total
Tests:       126 passed, 126 total

npm run build
Compiled successfully.
```

The build tool also prints its existing stale Browserslist database notice. No dependency update was made during release preparation.

Production-build browser checks: 24 cases passed, covering eight viewport sizes in both themes, profile deep links/back/forward, the canonical solver alias, search/tab keyboard behavior, landscape history, loading/error/retry, denied storage, the article route and bundle/public-asset hygiene. Additional lift checks loaded the complete ranking, verified five-digit rank/change spacing, all four plaques, cancellation and reduced motion. The measured scroll/music finish difference was approximately 18 ms in headless Chrome; the document did not reload.

Local evidence is under `.cache/production-prep/`. The existing live development preview stays at `http://localhost:3001/proto/leaderboard/?view=central`; the compiled build is available locally at `http://127.0.0.1:4173/` while the verification server is running. Neither is a production publish.

The historical leaderboard workbench remains local and untracked; reproduce the committed application with `npm start` or `npm run build`. The requested unslop pass has only been scanned so far; cleanup is deferred to the next review session.
