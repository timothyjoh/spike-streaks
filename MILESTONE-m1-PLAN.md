# MILESTONE m1 Plan: Project scaffold + streak calculator (pure, unit-tested)

## Scope

Scaffold the Vite + TypeScript project and implement + fully test the pure streak calculator. No UI, no localStorage, no heatmap. End state: `npm test` passes with `executed > 0`.

---

## Files to create

```
spike-streaks/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts
│   └── streak.ts
└── tests/
    └── streak.test.ts
```

(`.gitignore` already exists.)

---

## package.json — exact content

```json
{
  "name": "spike-streaks",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5181",
    "build": "tsc && vite build",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

Run `npm install` after writing this file.

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

---

## vite.config.ts

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5181 },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

(Vitest inherits from `vite.config.ts` via the `test` key.)

---

## index.html

Minimal HTML shell — just enough for Vite to serve something.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Streaks</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## src/main.ts

Placeholder only — m1 does not implement UI.

```ts
// Placeholder — UI implemented in m2+
const app = document.getElementById("app")!;
app.textContent = "Streaks (coming soon)";
```

---

## Streak semantics decision

### `currentStreak(doneDates, today)`

**Semantics (decided here, used verbatim in implementation):**

> The current streak is the length of the longest consecutive-day run that **ends on or immediately before `today`**.
>
> - If `today` is in `doneDates`: count the run that ends on `today`. E.g., `["2024-01-01","2024-01-02","2024-01-03"]` with `today = "2024-01-03"` → **3**.
> - If `today` is NOT in `doneDates`: count the run that ends on `yesterday` (`today - 1 day`). E.g., same list with `today = "2024-01-04"` → **3**. Rationale: the day isn't over yet; the streak from yesterday is still "live" and has not been broken.
> - If neither `today` nor `yesterday` is in `doneDates`: streak is **0** — the chain is broken.

This matches the natural user expectation: opening the app at 9 AM before checking in should not show 0.

**Algorithm:**
1. Deduplicate + sort `doneDates` descending.
2. Let `anchor = today` if today is done, else `yesterday`.
3. If `anchor` is not in the set → return 0.
4. Walk backward day-by-day from `anchor`, counting consecutive done days.

### `longestStreak(doneDates)`

> Max-length consecutive-day run across all history (no `today` parameter).

**Algorithm:**
1. Deduplicate + sort ascending.
2. Linear scan: extend current run when next date is exactly `prev + 1 day`; else reset.
3. Return the max.

---

## src/streak.ts — public API

```ts
export function currentStreak(doneDates: string[], today: string): number;
export function longestStreak(doneDates: string[]): number;
```

Internal helpers (not exported):
- `toDate(s: string): Date` — `new Date(s + "T00:00:00Z")` to avoid TZ offset issues.
- `addDays(d: Date, n: number): Date`
- `dateKey(d: Date): string` — `YYYY-MM-DD`

All date arithmetic in UTC to avoid DST surprises.

---

## tests/streak.test.ts — exhaustive test cases

Use `import { describe, it, expect } from "vitest"`.

### Test suite: `currentStreak`

| # | description | doneDates | today | expected |
|---|---|---|---|---|
| C1 | single day, today done | `["2024-03-10"]` | `"2024-03-10"` | `1` |
| C2 | 3-day run, today is last | `["2024-03-08","2024-03-09","2024-03-10"]` | `"2024-03-10"` | `3` |
| C3 | gap breaks streak — today done but gap before | `["2024-03-07","2024-03-10"]` | `"2024-03-10"` | `1` |
| C4 | today NOT done, yesterday done → streak from yesterday | `["2024-03-08","2024-03-09"]` | `"2024-03-10"` | `2` |
| C5 | today NOT done, yesterday NOT done → 0 | `["2024-03-07","2024-03-08"]` | `"2024-03-10"` | `0` |
| C6 | empty list → 0 | `[]` | `"2024-03-10"` | `0` |
| C7 | duplicates in input (idempotent) | `["2024-03-10","2024-03-10","2024-03-09"]` | `"2024-03-10"` | `2` |
| C8 | today done but input unsorted | `["2024-03-10","2024-03-09","2024-03-08"]` | `"2024-03-10"` | `3` |

### Test suite: `longestStreak`

| # | description | doneDates | expected |
|---|---|---|---|
| L1 | empty → 0 | `[]` | `0` |
| L2 | single day | `["2024-03-10"]` | `1` |
| L3 | 5-day run | `["2024-03-01","2024-03-02","2024-03-03","2024-03-04","2024-03-05"]` | `5` |
| L4 | gap splits into two runs (3 and 2) → 3 | `["2024-03-01","2024-03-02","2024-03-03","2024-03-05","2024-03-06"]` | `3` |
| L5 | full year — 365 consecutive days | build array Jan 1 – Dec 31 2024 in the test | `365` |
| L6 | unsorted input | `["2024-03-03","2024-03-01","2024-03-02"]` | `3` |
| L7 | duplicates present | `["2024-03-01","2024-03-01","2024-03-02"]` | `2` |

> **L5 implementation note:** Build the array in the test with a helper loop — do not hand-write 365 strings. Vitest will still count it as 1 test (`executed += 1`).

---

## Verification

After implementation, the BUILD worker must run:

```sh
npm install
npm test
```

Expected output: all 15 tests pass, `executed > 0`, exit 0.

`npm run build` (tsc + vite build) must also exit 0 (no type errors).

---

## What is NOT in m1

- No UI (`main.ts` is a stub).
- No localStorage.
- No heatmap rendering.
- No Playwright e2e test (e2e requires a running UI — deferred to m2/m3).
- No habit CRUD.
