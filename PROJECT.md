# Streaks — habit tracker with year heatmap

Track daily habits with a **GitHub-style 365-day heatmap** and streak stats.
Single-page app, no backend, persists to **localStorage**.

## Stack (required)
- Vite + TypeScript. Vanilla TS or lit — NO heavy framework.
- Persistence: `localStorage` only (+ JSON export/import).
- Unit tests: **vitest**. E2E: **Playwright** (Chromium).
- Dev server MUST run on **port 5181** (`vite --port 5181`).

## Core domain
- `habit: { id, name, color, doneDates: string[] }` (ISO `YYYY-MM-DD`).
- **Heatmap**: last ~53 weeks (365 days), one cell per day, filled if done.
- **Streak calc** (pure, exported): `currentStreak` (consecutive days ending today)
  and `longestStreak` (max run across history), correct across gaps and when today
  is not yet done.

## Acceptance criteria
1. **Habit CRUD** — create/rename/delete habits; persists to localStorage; survives
   reload.
2. **Toggle a day** — mark today done; click any past heatmap cell to toggle that
   day; heatmap cell visually reflects state.
3. **Heatmap** — renders the trailing 365 days in a week-column grid; intensity/fill
   reflects completion.
4. **Streaks** — current + longest streak shown per habit, computed correctly.
5. **Export / import** — export all habits to JSON, import back.

## Required tests
- **Unit** (`npm test`): streak calculator — single day, multi-day run, a gap
  breaking the streak, today-not-done, full-year. `executed > 0`, all pass.
- **E2E** (`npm run e2e`): create a habit → mark today done → heatmap cell for today
  fills → current streak shows 1 → reload → state persisted.

## npm scripts expected
`dev` (port 5181), `build`, `test` (vitest run), `e2e` (playwright test).

## Definition of done
App builds, unit + e2e pass with `executed > 0`, and the **tester subagent** drives
real Chrome to create a habit, mark today done, and observe the heatmap cell fill +
streak update — returns PASS with a screenshot. Passing unit tests alone is NOT done.
