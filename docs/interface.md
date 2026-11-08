# Interface behavior

The application starts in [`src/features/leaderboard/Leaderboard.tsx`](../src/features/leaderboard/Leaderboard.tsx). Page components and styles live in its [`page/`](../src/features/leaderboard/page/) directory.

## Rankings

Top solvers, Longest streaks, and Rising stars share one row layout. Keep each published Rising stars rank when filtering; tied solvers keep the same rank. Rank changes sit independently to the right of the rank number. Increases are green, decreases red, and new entries blue.

The page windows long rankings instead of mounting every row. Keep keyboard focus on a visible result when removing rows from the window. Solver profile URLs and browser back/forward navigation are handled by `hooks/useSolverProfile.ts`.

## News banner

Center the whole group, from the speaker through the last pill. Measure the available width and actual names to choose how many names fit. Only the puzzle title is a link in the announcement text.

The banner and the +N dropdown share the same name-pill typography, padding, and 14px corners. The dropdown is one scrollable column of individually elevated pills with a transparent outer container and no visible scrollbar. Align the first pill's left edge with +N, then clamp to the viewport.

Follow +N while the page scrolls, and close immediately when the trigger leaves the visible viewport. Scrolling inside the names list keeps it open.

Use short, staggered entry motion. Keyboard and reduced-motion actions are immediate. Returning from a profile opened through the dropdown restores focus to +N.

## Solver profile

Center the Varsity Patch avatar over the solver name. Group First recorded with Overall rank, Puzzles solved, and Latest solve. The patch initial uses the Unicode-aware solver-name helper and the existing theme colors.

History is newest first, with no sorting label or inner scroll area. Measure the available height and row heights to choose the page size, capped at ten records. Keep pagination in a stable position on loading and final pages. Narrow screens stack identity above history.

Placement help uses the same plain i and tooltip surface as INTRO. Hover or focus anywhere on its combined label opens the explanation; touch also works. Escape closes the explanation before closing the profile.

## Elevator

Show Back to top after roughly eight viewport heights, with a lower hide threshold to avoid flicker. The audio clock controls the ride, including its acceleration and slowdown. The end of scrolling follows the end of the music; the arrival chime has a separate timing offset.

Messages appear in the side whitespace and stop before reaching the first screen. Escape interrupts the ride. Reduced motion returns directly to the top without the elevator sequence.
