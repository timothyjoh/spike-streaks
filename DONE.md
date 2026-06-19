# Streaks — DONE

Habit tracker with a GitHub-style 365-day heatmap and streak stats. Single-page
Vite + TypeScript (vanilla, no framework), persists to localStorage, JSON
export/import. **All 5 milestones shipped, all gates green.**

## What shipped (all 5 acceptance criteria)
1. **Habit CRUD** — create / inline-rename / delete habits; persists to
   localStorage; survives reload. (m2)
2. **Toggle a day** — `mark-today-btn` marks today; clicking any in-range past
   heatmap cell toggles that day; cells reflect state visually (`cell--done`). (m3)
3. **Heatmap** — trailing 365 days as a 53×7 week-column grid (371 cells, 365
   in-range, Sunday-aligned), per-habit, fill driven by completion. (m3)
4. **Streaks** — `currentStreak` + `longestStreak` shown per habit, computed by a
   pure exported calculator (UTC date math, gap-aware, today-not-done handled). (m1)
5. **Export / import** — export all habits to JSON (real download + readable
   output); import back with strict validation (bad JSON / bad shape rejected,
   store never corrupted). (m4)

## Milestones
| id | title | state | sha |
|----|-------|-------|-----|
| m1 | Scaffold + pure streak calculator | done | 8ecdcdb |
| m2 | localStorage store + CRUD UI | done | 80199c3 |
| m3 | 365-day heatmap + toggle + streak display | done | f75baa7 |
| m4 | JSON export/import | done | 6d5adfd |
| m5 | Playwright e2e + full browser verify | done | 1d76dca |

## Test counts (all executed > 0, all pass)
- **Unit (vitest, `npm test`): 66 passed** — streak 15, store 20, heatmap 16, io 15.
- **E2E (Playwright, `npm run e2e`): 2 passed** — core flow (create → mark today →
  cell fills → streak 1 → reload persists) + export/import round-trip.
- **Browser VERIFY (real Chromium, tester subagent):** all 5 ACs driven end-to-end,
  no console/page/network errors. Today's cell observed filling
  (`heatmap-cell cell--done cell--today`), current+longest streak = "1", 371 cells
  rendered, state persisted across reload, export/import round-trip restored a habit
  with its streak. Screenshots in `test-artifacts/m5-*.png`.

## How to run
```
npm install
npm run dev     # http://localhost:5181
npm test        # vitest — 66 unit tests
npm run e2e     # playwright — 2 e2e (auto-starts dev server on 5181)
npm run build   # tsc + vite, clean
```

## Layout
- `src/streak.ts` — pure streak calculator (exported).
- `src/store.ts` — localStorage-backed, storage-injectable habit store.
- `src/heatmap.ts` — pure 365-day grid builder.
- `src/io.ts` — JSON export/import with strict validation.
- `src/main.ts` — vanilla-TS UI (CRUD, heatmap, streaks, export/import).
- `tests/*.test.ts` — vitest unit suites.
- `e2e/streaks.spec.ts` + `playwright.config.ts` — committed e2e.

## Blocked
None.
