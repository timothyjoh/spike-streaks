# MILESTONE m2 Plan: localStorage habit store + Habit CRUD UI

## Scope

Implement a persistence module backed by localStorage and a vanilla-TS CRUD UI rendered into `#app`. End state: `npm test` passes with `executed > 0` (store unit tests); app runs in the browser with add/rename/delete; state survives reload. No heatmap, no streak display — those are m3.

---

## Files to create / modify

```
spike-streaks/
├── src/
│   ├── store.ts          ← NEW: habit domain type + localStorage-backed store
│   ├── main.ts           ← MODIFY: replace placeholder with CRUD UI render loop
│   └── streak.ts         ← UNCHANGED
└── src/
    └── store.test.ts     ← NEW: vitest unit tests for store (no browser required)
```

`index.html`, `tsconfig.json`, `vite.config.ts`, `package.json` are **unchanged**.

---

## Domain type

```ts
// src/store.ts
export interface Habit {
  id: string;       // crypto.randomUUID() at creation time
  name: string;     // user-supplied label
  color: string;    // CSS color string, e.g. "#22c55e"
  doneDates: string[]; // ISO YYYY-MM-DD strings, deduplicated, unsorted OK
}
```

`doneDates` must be kept ready for m3 heatmap + streak display — every `toggleDate` call must correctly add or remove the date.

---

## src/store.ts — full API

### Storage-injection approach

The store receives a `StorageLike` interface instead of calling `localStorage` directly. This keeps every function unit-testable with a plain in-memory object — no DOM, no browser, no `jsdom` setup required.

```ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
```

All exported functions accept a `storage: StorageLike` as their **last** parameter with `localStorage` as the default:

```ts
const DEFAULT_STORAGE: StorageLike =
  typeof localStorage !== "undefined" ? localStorage : { getItem: () => null, setItem: () => {} };
```

The browser entry point (`main.ts`) never passes `storage` explicitly — it relies on the default. Tests always pass a fake.

### localStorage key

```ts
export const HABITS_KEY = "streaks:habits";
```

Single constant, one place. Used by both `loadHabits` and `saveHabits`.

### Function signatures

```ts
/** Read and deserialize habits from storage. Returns [] on missing or corrupt data. */
export function loadHabits(storage?: StorageLike): Habit[];

/** Serialize and write habits array to storage. */
export function saveHabits(habits: Habit[], storage?: StorageLike): void;

/**
 * Add a new habit. Generates a fresh UUID id.
 * color defaults to "#6366f1" (indigo) when omitted.
 * Returns the new array.
 */
export function addHabit(
  habits: Habit[],
  name: string,
  color?: string,
  storage?: StorageLike
): Habit[];

/**
 * Rename a habit by id. No-op (returns same array) if id not found.
 * Returns the new array (immutable update).
 */
export function renameHabit(
  habits: Habit[],
  id: string,
  name: string,
  storage?: StorageLike
): Habit[];

/**
 * Delete a habit by id. No-op if id not found.
 * Returns the new array.
 */
export function deleteHabit(
  habits: Habit[],
  id: string,
  storage?: StorageLike
): Habit[];

/**
 * Toggle a date string (YYYY-MM-DD) in habit.doneDates.
 * Adds if absent, removes if present.
 * No-op on unknown id.
 * Returns the new array.
 */
export function toggleDate(
  habits: Habit[],
  id: string,
  date: string,
  storage?: StorageLike
): Habit[];
```

### Implementation notes

- Every mutating function (`addHabit`, `renameHabit`, `deleteHabit`, `toggleDate`) calls `saveHabits` internally before returning, so callers never forget to persist.
- All functions are **pure with respect to input** — they never mutate the `habits` argument; they build a new array/object.
- `loadHabits`: wraps `JSON.parse` in try/catch; validates result is an array; returns `[]` on any error (missing key, invalid JSON, non-array value). Does NOT attempt per-item schema validation — partial corruption returns `[]` for safety.
- `addHabit` color default: `"#6366f1"`.
- `toggleDate`: deduplicates `doneDates` on toggle-in (adds only if not already present).

---

## src/main.ts — CRUD UI

### Structure

Replace the placeholder entirely. `main.ts` owns:
1. A module-level mutable `let habits: Habit[]` state variable, initialized via `loadHabits()`.
2. A single `render()` function that wipes `#app` innerHTML and rebuilds the whole UI from `habits`. No virtual DOM, no diffing.
3. Every mutation: update `habits = <store function>(habits, ...)`, then call `render()`.

### DOM structure (exact)

```html
<!-- injected into #app by render() -->
<div class="streaks-app">

  <!-- Add-habit form -->
  <form data-testid="add-habit-form">
    <input
      type="text"
      data-testid="habit-name-input"
      placeholder="Habit name"
      required
    />
    <input
      type="color"
      data-testid="habit-color-input"
      value="#6366f1"
    />
    <button type="submit" data-testid="add-habit-btn">Add</button>
  </form>

  <!-- Habit list -->
  <ul data-testid="habit-list">
    <!-- one <li> per habit, repeated: -->
    <li data-testid="habit-item" data-id="<habit.id>">
      <span
        class="habit-color-swatch"
        style="background: <habit.color>"
        aria-hidden="true"
      ></span>
      <span data-testid="habit-name"><habit.name></span>
      <button data-testid="rename-btn" data-id="<habit.id>">Rename</button>
      <button data-testid="delete-btn" data-id="<habit.id>">Delete</button>
    </li>
  </ul>

</div>
```

Key rules:
- `data-testid` attributes are **stable and exact** as shown — Playwright e2e in m4 will query by them.
- `data-id` on `<li>` and action buttons carries the habit UUID so event delegation can resolve the target.
- Color swatch is a non-interactive `<span>` — color picker is only in the add-form.
- No inline `onclick`. All events wired via `addEventListener` after render.

### Event wiring (after render)

```
form[data-testid="add-habit-form"] submit
  → e.preventDefault()
  → read name + color inputs
  → habits = addHabit(habits, name, color)
  → render()

button[data-testid="rename-btn"] click  (event delegation on habit-list)
  → read data-id
  → newName = window.prompt("New name:", currentName)  // simple prompt for m2; inline edit deferred to m3
  → if (newName?.trim()) habits = renameHabit(habits, id, newName.trim())
  → render()

button[data-testid="delete-btn"] click  (event delegation on habit-list)
  → read data-id
  → habits = deleteHabit(habits, id)
  → render()
```

`window.prompt` for rename is intentionally simple — no inline edit widget in m2. m3 can replace with an `<input>` in-place if desired.

### Re-render strategy

Full innerHTML replace on every mutation. Acceptable for the habit count expected in this app (< 100 items). No keyed reconciliation. After `render()`, re-attach all event listeners (they are declared inside `render()` or wired in a `wireEvents()` function called at the end of `render()`).

---

## src/store.test.ts — unit test cases (vitest)

### In-memory storage fake

```ts
function makeFakeStorage(): StorageLike & { _data: Record<string, string> } {
  const _data: Record<string, string> = {};
  return {
    _data,
    getItem: (k) => _data[k] ?? null,
    setItem: (k, v) => { _data[k] = v; },
  };
}
```

All tests pass `makeFakeStorage()` as the storage argument. Zero browser APIs touched.

### Test cases

| # | suite | description | inputs | expected outcome |
|---|---|---|---|---|
| S1 | loadHabits | empty storage returns [] | fresh fake storage | `[]` |
| S2 | loadHabits | corrupt JSON returns [] | storage with key = `"not json"` | `[]` |
| S3 | loadHabits | non-array JSON returns [] | storage with key = `"42"` | `[]` |
| S4 | saveHabits + loadHabits | round-trip persists full habit | save one habit, load it back | same habit object deep-equal |
| S5 | addHabit | creates habit with name + color | `addHabit([], "Run", "#ff0000", s)` | array length 1; `name="Run"`, `color="#ff0000"`, `doneDates=[]`, `id` is non-empty string |
| S6 | addHabit | default color applied when omitted | `addHabit([], "Read", undefined, s)` | `color === "#6366f1"` |
| S7 | addHabit | persists to storage | call addHabit, then loadHabits on same storage | loaded array length 1 |
| S8 | addHabit | two habits → length 2, distinct ids | call addHabit twice | `habits.length === 2`; `habits[0].id !== habits[1].id` |
| S9 | renameHabit | renames by id | add habit, rename it | `habit.name` equals new name |
| S10 | renameHabit | unknown id is no-op | rename with bogus id | array unchanged (same length, same names) |
| S11 | renameHabit | persists to storage | rename, then loadHabits | loaded habit has new name |
| S12 | deleteHabit | removes by id | add two habits, delete one | array length 1; deleted id not present |
| S13 | deleteHabit | unknown id is no-op | delete with bogus id | array length unchanged |
| S14 | deleteHabit | persists to storage | delete, then loadHabits | deleted habit absent in loaded result |
| S15 | toggleDate | adds date when absent | `toggleDate(habits, id, "2024-01-01", s)` | `doneDates` contains `"2024-01-01"` |
| S16 | toggleDate | removes date when present | add date, toggle again | `doneDates` does not contain the date |
| S17 | toggleDate | idempotent add | toggle same date twice from absent | net result: date present (add → remove = absent — toggle is NOT idempotent on two calls; two calls → absent again is correct) |
| S18 | toggleDate | unknown habit id is no-op | bogus id | array unchanged |
| S19 | toggleDate | persists to storage | toggleDate, then loadHabits | loaded doneDates matches |
| S20 | toggleDate | does not duplicate date | toggle when already present in doneDates; check count | `doneDates.filter(d => d === "2024-01-01").length === 1` after toggle-in |

> **Note on S17:** toggle is a true toggle — calling it twice on the same date returns to the original state (absent → present → absent). The test for S17 should assert the correct final state after two toggles, not an "idempotent" behavior (the description in the table is a deliberate clarification).

Total: **20 test cases**. All must pass, `executed > 0`.

---

## Verification

After implementation, the BUILD worker must run:

```sh
npm test
```

Expected: 20 store tests + 15 streak tests = 35 total, all pass, `executed > 0`, exit 0.

```sh
npm run build
```

Must exit 0 (no TypeScript errors). `tsc --noEmit` must also pass.

Smoke test in browser (not automated in m2 — Playwright e2e deferred to m4):
- `npm run dev` → open http://localhost:5181 → add a habit → reload → habit still present.

---

## What is NOT in m2

- No heatmap rendering (m3).
- No streak display (m3).
- No Playwright e2e test (m4 — requires heatmap + streak for full acceptance criteria).
- No JSON export/import (m4 or m5).
- No inline rename widget — `window.prompt` is sufficient for m2.
- No per-habit "mark today done" button in the list — that comes with heatmap in m3 (the store's `toggleDate` is ready).
