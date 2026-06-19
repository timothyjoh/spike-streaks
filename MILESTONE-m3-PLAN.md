# MILESTONE m3 Plan: 365-day heatmap grid + toggle day + streak display

## Scope

Add a pure heatmap-grid builder module (`src/heatmap.ts`), render a GitHub-style 53-column × 7-row heatmap per habit inline in the existing `habit-list` UI, wire cell click + "mark today" button to `store.toggleDate`, display current + longest streak per habit, and cover the grid builder with vitest unit tests. No Playwright e2e in this milestone (that is m4).

End state: `npm test` passes with `executed > 0` (all prior tests + new heatmap tests); app runs in the browser with heatmap, toggle, and streaks per habit; state survives reload.

---

## Files to create / modify

```
spike-streaks/
├── src/
│   ├── heatmap.ts        ← NEW: pure grid builder (no DOM)
│   ├── heatmap.test.ts   ← NEW: vitest unit tests for heatmap builder
│   └── main.ts           ← MODIFY: add heatmap render + toggle + streak display per habit
```

`store.ts`, `streak.ts`, `store.test.ts`, `streak.test.ts`, `index.html`, `tsconfig.json`, `vite.config.ts`, `package.json` are **unchanged**.

---

## src/heatmap.ts — pure grid builder

### Decision: alignment and layout

- **Columns start on Sunday.** Each column represents a calendar week (Sunday through Saturday, rows 0–6).
- **Grid dimensions:** 53 columns × 7 rows = **371 cells total**.
- **In-range cells:** exactly **365** cells are `inRange: true`. The remaining 6 cells are `inRange: false` (padding at the front of the grid).
- **Layout rationale:**
  - Compute `today`'s UTC weekday (0 = Sunday, …, 6 = Saturday).
  - The last cell in the grid (column 52, row `todayWeekday`) is today.
  - Walking backward 364 days from today gives the full 365-day window.
  - The grid starts at column 0, row 0. Column 0 begins on the Sunday of the week containing the day 364 days before today.
  - If that Sunday precedes the 365-day window start (= today − 364 days), the leading cells in column 0 before the window start are `inRange: false`.
  - Cells after today (in the current week, if today is not Saturday) are also `inRange: false`.

### Exact cell-count derivation

```
windowStart = today − 364 days   // earliest in-range date (inclusive)
todayWeekday = getUTCDay(today)  // 0=Sun … 6=Sat

gridStartDate = windowStart − (windowStart's weekday) days
  // the Sunday of the week that contains windowStart
  // = windowStart − windowStart.getUTCDay() days
  // In most years, gridStartDate < windowStart, giving 0–6 out-of-range prefix cells.

Total grid cells: 53 × 7 = 371
In-range cells: 365 (from windowStart to today inclusive)
Out-of-range prefix: windowStart.getUTCDay() cells  (0 to 6)
Out-of-range suffix: 6 − todayWeekday cells  (0 to 6, cells after today in final column)
Prefix + suffix = windowStart.getUTCDay() + (6 − todayWeekday)
                = (day-of-week of 365th-day-ago) + (days after today in current week)
```

The prefix + suffix always sum to `371 − 365 = 6` because `53 × 7 − 365 = 6`.

### Date math conventions

All date arithmetic uses UTC, matching `src/streak.ts` exactly:
- Parse ISO strings with `new Date(s + "T00:00:00Z")`.
- Arithmetic via `date.getTime() ± n * 86_400_000`.
- Serialize back with `getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()`.

### API

```ts
// src/heatmap.ts

export interface HeatmapCell {
  date: string;      // "YYYY-MM-DD" — valid for every cell (even inRange:false; this is the actual calendar date of the cell slot)
  done: boolean;     // true iff date is in doneDates set (always false for inRange:false cells)
  inRange: boolean;  // true iff date falls within [windowStart, today] inclusive
}

/**
 * Build the trailing-365-day heatmap grid.
 *
 * Returns a flat array of 371 cells in row-major order within columns:
 *   cells[colIndex * 7 + rowIndex]
 * where colIndex ∈ [0, 52], rowIndex ∈ [0, 6] (0 = Sunday).
 *
 * today: ISO "YYYY-MM-DD" representing the current day (UTC).
 * doneDates: ISO date strings for completed days (duplicates tolerated).
 *
 * Cell layout:
 *   - Column 0, Row 0 = the Sunday of the week containing (today − 364 days).
 *   - Column 52, Row todayWeekday = today.
 *   - Cells before (today − 364 days): inRange:false.
 *   - Cells after today: inRange:false.
 */
export function buildHeatmapGrid(today: string, doneDates: string[]): HeatmapCell[] {
  // implementation described below
}

/** Convenience: total cells in the grid (always 371). */
export const GRID_TOTAL = 371;

/** Convenience: columns in the grid (always 53). */
export const GRID_COLS = 53;

/** Convenience: rows per column / days per week (always 7). */
export const GRID_ROWS = 7;
```

### Implementation outline (for the build worker)

```ts
export function buildHeatmapGrid(today: string, doneDates: string[]): HeatmapCell[] {
  const doneSet = new Set(doneDates);

  // today as UTC epoch
  const todayMs = new Date(today + "T00:00:00Z").getTime();
  const todayWeekday = new Date(todayMs).getUTCDay(); // 0=Sun

  // windowStart: today - 364 days
  const windowStartMs = todayMs - 364 * 86_400_000;

  // gridStart: Sunday of the week containing windowStart
  const windowStartWeekday = new Date(windowStartMs).getUTCDay();
  const gridStartMs = windowStartMs - windowStartWeekday * 86_400_000;

  const cells: HeatmapCell[] = [];
  for (let col = 0; col < 53; col++) {
    for (let row = 0; row < 7; row++) {
      const cellMs = gridStartMs + (col * 7 + row) * 86_400_000;
      const d = new Date(cellMs);
      const date = [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
        String(d.getUTCDate()).padStart(2, "0"),
      ].join("-");
      const inRange = cellMs >= windowStartMs && cellMs <= todayMs;
      cells.push({ date, done: inRange && doneSet.has(date), inRange });
    }
  }
  return cells;
}
```

---

## src/main.ts — modifications

### Selection model decision

**Each habit renders its own inline heatmap**, directly under the habit row in the list. No separate "selected habit" concept. This is the simplest model: one habit → one heatmap block, all visible simultaneously. Playwright e2e can target a habit's heatmap by scoping within its `[data-testid="habit-item"][data-id="<id>"]` ancestor, or by `data-date` attribute on cells.

### Updated DOM structure per habit `<li>`

The `renderHabitItem` function grows to include:
1. A streak stat row.
2. A "mark today" button.
3. A heatmap grid.

```html
<li data-testid="habit-item" data-id="<habit.id>">

  <!-- existing: color swatch + name + rename + delete (unchanged) -->
  <span class="habit-color-swatch" style="background: <habit.color>" aria-hidden="true"></span>
  <span data-testid="habit-name"><habit.name></span>
  <button data-testid="rename-btn" data-id="<habit.id>">Rename</button>
  <button data-testid="delete-btn" data-id="<habit.id>">Delete</button>

  <!-- NEW: streak stats -->
  <div class="habit-streaks">
    <span>
      Current streak:
      <strong data-testid="current-streak" data-id="<habit.id>"><N></strong>
    </span>
    <span>
      Longest streak:
      <strong data-testid="longest-streak" data-id="<habit.id>"><N></strong>
    </span>
  </div>

  <!-- NEW: mark-today button -->
  <button
    data-testid="mark-today-btn"
    data-id="<habit.id>"
    data-date="<today ISO>"
  >
    Mark today done
  </button>

  <!-- NEW: heatmap container -->
  <div
    data-testid="heatmap"
    data-id="<habit.id>"
    class="heatmap-grid"
    aria-label="<habit.name> heatmap"
  >
    <!-- 371 cells, one per day slot -->
    <!-- cells rendered as columns (CSS grid: 53 cols × 7 rows) -->
    <div
      data-testid="heatmap-cell"
      data-id="<habit.id>"
      data-date="<cell.date>"
      class="heatmap-cell [cell--done] [cell--out-of-range]"
      title="<cell.date>"
      style="background: <habit.color or empty>"
      aria-label="<cell.date>[, done]"
    ></div>
    <!-- ...371 total -->
  </div>

</li>
```

### data-testid and data-date attributes (exact and complete)

| Element | data-testid | data-id | data-date | Notes |
|---|---|---|---|---|
| `<li>` habit item | `habit-item` | habit.id | — | unchanged from m2 |
| `<strong>` current streak | `current-streak` | habit.id | — | text = number |
| `<strong>` longest streak | `longest-streak` | habit.id | — | text = number |
| `<button>` mark today | `mark-today-btn` | habit.id | today ISO | triggers toggle for today |
| `<div>` heatmap container | `heatmap` | habit.id | — | wraps all 371 cells |
| `<div>` each cell | `heatmap-cell` | habit.id | cell.date ISO | 371 total per habit |

### Cell CSS classes

- `.heatmap-cell` — base class, always present.
- `.cell--done` — added when `cell.done === true` (today IS in doneDates). Cell background set to `habit.color` via inline style.
- `.cell--out-of-range` — added when `cell.inRange === false`. Renders as empty/grey; not interactive.
- No class for in-range + not-done (base `.heatmap-cell` style covers it: light background).

### CSS grid layout for the heatmap

```css
/* in index.html <style> or injected */
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(53, 1fr);
  grid-auto-rows: min-content;
  gap: 2px;
}
.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: #ebedf0;   /* default: not done, in range */
  cursor: pointer;
}
.heatmap-cell.cell--out-of-range {
  background: transparent;
  cursor: default;
  pointer-events: none;
}
.heatmap-cell.cell--done {
  /* background set by inline style to habit.color */
}
```

Cells are rendered in the flat order returned by `buildHeatmapGrid` (column-major: col 0 rows 0–6, then col 1 rows 0–6, …). CSS grid with `grid-template-columns: repeat(53, 1fr)` and no explicit row assignment means cells fill left-to-right top-to-bottom in DOM order. Since we emit col-major (all 7 rows of col 0, then all 7 rows of col 1, …), we need CSS grid column flow, not row flow.

**Fix:** Use `grid-auto-flow: column` to make cells fill column by column:

```css
.heatmap-grid {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  grid-auto-flow: column;
  grid-auto-columns: 12px;
  gap: 2px;
}
```

This makes the 371-cell flat array fill correctly: cells[0..6] → column 0, cells[7..13] → column 1, etc.

### Heatmap rendering function (in main.ts)

```ts
import { buildHeatmapGrid } from "./heatmap.js";
import { currentStreak, longestStreak } from "./streak.js";
import { toggleDate } from "./store.js";

function todayISO(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderHeatmap(h: Habit, today: string): string {
  const cells = buildHeatmapGrid(today, h.doneDates);
  const cellHtml = cells.map((c) => {
    const classes = [
      "heatmap-cell",
      c.done ? "cell--done" : "",
      !c.inRange ? "cell--out-of-range" : "",
    ].filter(Boolean).join(" ");
    const style = c.done ? `background:${escapeAttr(h.color)}` : "";
    const ariaLabel = c.done ? `${c.date}, done` : c.date;
    return `<div
      data-testid="heatmap-cell"
      data-id="${escapeAttr(h.id)}"
      data-date="${escapeAttr(c.date)}"
      class="${classes}"
      title="${escapeAttr(c.date)}"
      ${style ? `style="${style}"` : ""}
      aria-label="${escapeAttr(ariaLabel)}"
    ></div>`;
  }).join("");

  return `<div
    data-testid="heatmap"
    data-id="${escapeAttr(h.id)}"
    class="heatmap-grid"
    aria-label="${escapeHtml(h.name)} heatmap"
  >${cellHtml}</div>`;
}
```

### Updated renderHabitItem (in main.ts)

```ts
function renderHabitItem(h: Habit, today: string): string {
  const cs = currentStreak(h.doneDates, today);
  const ls = longestStreak(h.doneDates);
  const isRenaming = renamingId === h.id;
  const nameSection = isRenaming
    ? `<input data-testid="rename-input" type="text" value="${escapeAttr(h.name)}" data-id="${h.id}" />
       <button data-testid="rename-save-btn" data-id="${h.id}">Save</button>`
    : `<span data-testid="habit-name">${escapeHtml(h.name)}</span>
       <button data-testid="rename-btn" data-id="${h.id}">Rename</button>`;

  return `
    <li data-testid="habit-item" data-id="${h.id}">
      <span class="habit-color-swatch" style="background:${escapeAttr(h.color)}" aria-hidden="true"></span>
      ${nameSection}
      <button data-testid="delete-btn" data-id="${h.id}">Delete</button>
      <div class="habit-streaks">
        <span>Current streak: <strong data-testid="current-streak" data-id="${h.id}">${cs}</strong></span>
        <span>Longest streak: <strong data-testid="longest-streak" data-id="${h.id}">${ls}</strong></span>
      </div>
      <button data-testid="mark-today-btn" data-id="${h.id}" data-date="${today}">Mark today done</button>
      ${renderHeatmap(h, today)}
    </li>
  `;
}
```

The `render()` call site passes `todayISO()` once and threads it through:

```ts
function render(): void {
  const today = todayISO();
  app.innerHTML = `
    <div class="streaks-app">
      <form data-testid="add-habit-form">
        <input type="text" data-testid="habit-name-input" placeholder="Habit name" required />
        <input type="color" data-testid="habit-color-input" value="#6366f1" />
        <button type="submit" data-testid="add-habit-btn">Add</button>
      </form>
      <ul data-testid="habit-list">
        ${habits.map((h) => renderHabitItem(h, today)).join("")}
      </ul>
    </div>
  `;
  wireEvents(today);
}
```

### Toggle / persist / re-render flow

1. User clicks a `[data-testid="heatmap-cell"]` with `inRange:true` OR clicks `[data-testid="mark-today-btn"]`.
2. Event delegation on `[data-testid="habit-list"]` intercepts the click.
3. Read `data-id` (habit id) and `data-date` (the date to toggle) from the target element.
4. `habits = toggleDate(habits, id, date)` — persists to localStorage internally.
5. `render()` — full re-render; streak stats and cell `.cell--done` classes update immediately.

`mark-today-btn` is just a convenience alias for clicking today's cell: it carries `data-date=<today>` so the same handler works for both.

### Updated wireEvents (additions only — existing rename/delete logic unchanged)

```ts
// Inside wireEvents(today: string):
list.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;

  // --- existing rename-btn, rename-save-btn, delete-btn handlers (unchanged) ---

  // Toggle via heatmap cell click
  if (target.matches('[data-testid="heatmap-cell"]')) {
    const id = target.dataset.id ?? "";
    const date = target.dataset.date ?? "";
    if (!id || !date) return;
    // out-of-range cells have pointer-events:none in CSS; belt-and-suspenders guard:
    const cell = habits
      .find((h) => h.id === id)
      ?.doneDates;  // just for guard; inRange checked via CSS; trust CSS
    habits = toggleDate(habits, id, date);
    render();
    return;
  }

  // Toggle via mark-today button
  if (target.matches('[data-testid="mark-today-btn"]')) {
    const id = target.dataset.id ?? "";
    const date = target.dataset.date ?? today;
    if (!id) return;
    habits = toggleDate(habits, id, date);
    render();
    return;
  }
});
```

### Streak display wiring

`currentStreak` and `longestStreak` from `src/streak.ts` are called inside `renderHabitItem` on every `render()`. No separate update path — the full re-render keeps them in sync. Values appear in:
- `data-testid="current-streak"` — text content = `currentStreak(h.doneDates, today)`.
- `data-testid="longest-streak"` — text content = `longestStreak(h.doneDates)`.

---

## src/heatmap.test.ts — unit tests (vitest)

All tests are pure: pass explicit `today` and `doneDates` strings. No DOM, no localStorage. Import only `buildHeatmapGrid`, `GRID_TOTAL`, `GRID_COLS`, `GRID_ROWS`.

### Test cases

| # | description | inputs | expected |
|---|---|---|---|
| H1 | grid has exactly 371 cells | `today="2025-06-19"`, `doneDates=[]` | `cells.length === 371` |
| H2 | exactly 365 cells are inRange | same | `cells.filter(c => c.inRange).length === 365` |
| H3 | exactly 6 cells are out-of-range | same | `cells.filter(c => !c.inRange).length === 6` |
| H4 | today's cell is inRange and present | `today="2025-06-19"`, `doneDates=[]` | exactly one cell with `date === "2025-06-19"` and `inRange === true` |
| H5 | today's cell is marked done when in doneDates | `today="2025-06-19"`, `doneDates=["2025-06-19"]` | cell with `date === "2025-06-19"` has `done === true` |
| H6 | today's cell is not done when not in doneDates | `today="2025-06-19"`, `doneDates=[]` | cell with `date === "2025-06-19"` has `done === false` |
| H7 | a known past date in doneDates maps to done:true | `today="2025-06-19"`, `doneDates=["2025-06-01"]` | cell with `date === "2025-06-01"` has `done === true` and `inRange === true` |
| H8 | a date outside the 365-day window maps to done:false | `today="2025-06-19"`, `doneDates=["2024-06-18"]` (one day before window start 2024-06-20) | no cell with `date === "2024-06-18"` is `inRange:true`; if it exists, `done:false` |
| H9 | out-of-range cells are always done:false | any | `cells.filter(c => !c.inRange).every(c => !c.done)` |
| H10 | first cell date is the Sunday starting the grid | `today="2025-06-19"` (Thursday, weekday=4); windowStart = 2024-06-20 (Thursday, weekday=4); gridStart = Sunday 2024-06-16 | `cells[0].date === "2024-06-16"` |
| H11 | grid is column-major: cells[0..6] are Sun–Sat of week 0 | `today="2025-06-19"` | `cells[0].date` to `cells[6].date` are consecutive days Sun through Sat of 2024-06-16 week |
| H12 | last in-range cell is today | `today="2025-06-19"` | `cells.filter(c => c.inRange).at(-1)!.date === "2025-06-19"` |
| H13 | duplicate doneDates handled (no double-done cells) | `today="2025-06-19"`, `doneDates=["2025-06-19", "2025-06-19"]` | exactly one cell with `date === "2025-06-19"` and `done === true`; `cells.filter(c => c.done).length === 1` |
| H14 | Saturday alignment: today on Saturday means 0 suffix out-of-range in last col | choose a Saturday for today | suffix out-of-range cells = 0; only prefix out-of-range cells exist |
| H15 | Sunday alignment: today on Sunday means 6 suffix out-of-range cells in last col | choose a Sunday for today | prefix out-of-range cells = 0 (windowStart 364 days ago is also a Sunday); suffix = 6; total out-of-range = 6 |

> H10 derivation check: `today="2025-06-19"` → `getUTCDay` = Thursday = 4. `windowStart = today − 364 = 2024-06-20` → `getUTCDay` = Thursday = 4. `gridStart = windowStart − 4 days = 2024-06-16` (Sunday). So `cells[0].date === "2024-06-16"`.

> H15 correction: when today is Sunday (weekday=0), today's cell is at row 0 of col 52, rows 1–6 of col 52 are all out-of-range (6 suffix cells). windowStart = today − 364 days is also a Sunday (weekday=0), so prefix = 0 cells. Total out-of-range = 6. ✓

Total: **15 test cases**. All must pass, `executed > 0`.

---

## How "today's cell" is findable in e2e (m4)

The Playwright e2e test must:
1. Know today's ISO date string (via `new Date().toISOString().slice(0, 10)` in the test).
2. Query `[data-testid="heatmap-cell"][data-date="<today>"]` — guaranteed unique within a habit's heatmap (one cell per date).
3. After toggling, assert the cell has class `cell--done`.

No positional math needed. The `data-date` attribute on every cell is the canonical locator.

---

## Verification after implementation

The build worker must run:

```sh
npm test
```

Expected: 15 streak tests (m1) + 20 store tests (m2) + 15 heatmap tests (m3) = **50 total**, all pass, `executed > 0`, exit 0.

```sh
npm run build
```

Must exit 0. `tsc --noEmit` must pass (no type errors).

Smoke test in browser (not automated — Playwright e2e deferred to m4):
- `npm run dev` → open http://localhost:5181 → add a habit → heatmap appears → click a past cell or "Mark today done" → cell fills with habit color → streak numbers update → reload → state persists.

---

## What is NOT in m3

- No Playwright e2e test (m4 — requires full AC coverage).
- No JSON export/import (m4 or m5).
- No inline rename widget change (m2's `window.prompt`/inline input stays as-is; either approach already in `main.ts` is acceptable).
- No intensity/opacity gradient based on frequency (cells are binary: done or not done). Gradient would be a nice-to-have for m5+.
- No tooltip popovers beyond `title` attribute.
- No keyboard navigation for heatmap cells.
