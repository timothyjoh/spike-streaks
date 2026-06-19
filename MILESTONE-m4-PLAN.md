# MILESTONE m4 — JSON Export / Import

AC #5: export all habits to JSON, import back.

---

## Files to create / modify

| File | Action | Purpose |
|---|---|---|
| `src/io.ts` | **create** | Pure serialization helpers: `exportHabits`, `importHabits` |
| `src/io.test.ts` | **create** | Unit tests for io.ts (vitest) |
| `src/main.ts` | **modify** | Wire Export/Import UI into existing `render()` + `wireEvents()` |

`src/store.ts` is **not modified** — io.ts imports `Habit` from it.

---

## API: `src/io.ts`

```ts
import type { Habit } from "./store.js";

/** Serialize all habits to a pretty-printed JSON string. */
export function exportHabits(habits: Habit[]): string;

/** Parse + validate a JSON string into Habit[].
 *  Throws Error with a human-readable message on any failure.
 *  Valid individual habits are returned; see validation contract below. */
export function importHabits(json: string): Habit[];
```

### Validation contract

`importHabits` is **strict-throw**: any invalid input throws `Error`. The caller catches and shows the message.

Validation layers (in order):

1. **JSON.parse** — if it throws (syntax error), rethrow as `Error("Invalid JSON: <parse message>")`.
2. **Top-level array** — if not an array, throw `Error("Expected a JSON array of habits")`.
3. **Per-element shape** — iterate; for each element check:
   - `id` is a non-empty string
   - `name` is a non-empty string
   - `color` is a non-empty string
   - `doneDates` is an array where every entry is a string matching `/^\d{4}-\d{2}-\d{2}$/`
   - If any required field is missing or wrong type, **throw** `Error("Habit at index N is invalid: <detail>")` — do NOT silently drop.
   - Rationale: silent dropping could lose real data (e.g. a typo in the export); throw-on-first-bad-habit forces the user to fix their JSON rather than silently importing a subset.
4. **Return** the validated array (typed as `Habit[]`). Do not add or remove fields beyond the four required ones — extra unknown fields on an element are **ignored** (stripped via explicit pick on `id`/`name`/`color`/`doneDates`).

Error messages must be human-readable (shown directly in the UI).

---

## DOM structure added to `src/main.ts`

Added inside the `.streaks-app` div, **below the habit list** (after `<ul data-testid="habit-list">`):

```html
<section data-testid="export-import-section">

  <!-- EXPORT -->
  <button data-testid="export-btn">Export habits to JSON</button>
  <!-- Hidden element holding last exported JSON — readable by e2e tests.
       Updated every time export is clicked. Empty string on page load. -->
  <pre data-testid="export-output" style="display:none" aria-hidden="true"></pre>

  <!-- IMPORT -->
  <textarea
    data-testid="import-input"
    placeholder="Paste exported JSON here…"
    rows="6"
  ></textarea>
  <button data-testid="import-btn">Import habits from JSON</button>
  <!-- Shown only when the last import failed. Empty / hidden otherwise. -->
  <p data-testid="import-error" style="color:red;display:none"></p>

</section>
```

### Behaviour spec

**Export click** (`data-testid="export-btn"`):
1. Call `exportHabits(habits)` to get the JSON string.
2. Write the string into `[data-testid="export-output"]` textContent and set its `display` to `block` (e2e reads this).
3. Trigger a real file download: `new Blob([json], { type: "application/json" })` → create an `<a>` with `href = URL.createObjectURL(blob)` and `download = "streaks-export.json"` → programmatically click → `URL.revokeObjectURL`.
4. Clear any previous import error (`import-error` hidden, empty).

**Import click** (`data-testid="import-btn"`):
1. Read `[data-testid="import-input"]` value.
2. Call `importHabits(value)` inside a `try/catch`.
3. **On success**: call `saveHabits(validated)`, set `habits = validated`, call `render()`. Clear `import-error`. Clear the textarea.
4. **On failure** (caught Error): set `[data-testid="import-error"]` textContent to `err.message`, set its `display` to `block`. Do NOT modify `habits` or call `saveHabits`.

Events are wired in `wireEvents()` using `document.querySelector` on the new `data-testid` elements (same pattern as existing event wiring). They do NOT use event delegation through the habit list; they attach directly to the two buttons.

`render()` must preserve `[data-testid="export-output"]` content across re-renders: after setting `app.innerHTML`, if `lastExportJson` (module-level variable, initially `""`) is non-empty, repopulate the element and set display to `block`. This ensures an e2e test that exports before triggering a re-render can still read the data.

---

## E2E strategy (how tests drive export/import)

Playwright tests do NOT rely on the file-download dialog. Instead:

**Export read path:**
```ts
await page.click('[data-testid="export-btn"]');
const json = await page.locator('[data-testid="export-output"]').textContent();
// json is the full exported JSON string
```

**Import drive path:**
```ts
await page.fill('[data-testid="import-input"]', json);
await page.click('[data-testid="import-btn"]');
// then assert habits re-rendered, or assert import-error hidden
```

**Error case drive path:**
```ts
await page.fill('[data-testid="import-input"]', 'not json at all');
await page.click('[data-testid="import-btn"]');
await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
```

---

## Unit tests: `src/io.test.ts`

All tests use vitest. No DOM required — `importHabits`/`exportHabits` are pure functions.

| # | Test name | What it asserts |
|---|---|---|
| 1 | `exportHabits returns valid JSON string` | `JSON.parse(exportHabits([]))` does not throw; result is an array |
| 2 | `exportHabits serializes id/name/color/doneDates` | single habit round-trips: all four fields present and equal |
| 3 | `exportHabits serializes multiple habits` | array length matches input length |
| 4 | `exportHabits preserves doneDates order` | doneDates array in output equals input order |
| 5 | `importHabits round-trips exportHabits output` | `importHabits(exportHabits(habits))` deep-equals `habits` for 2-habit fixture with doneDates |
| 6 | `importHabits throws on JSON syntax error` | `importHabits("not json")` throws Error; message contains "Invalid JSON" |
| 7 | `importHabits throws on non-array JSON` | `importHabits("{}")` throws Error; message contains "array" |
| 8 | `importHabits throws on missing id` | element without `id` field throws Error mentioning "index 0" |
| 9 | `importHabits throws on missing name` | element without `name` field throws Error |
| 10 | `importHabits throws on missing color` | element without `color` field throws Error |
| 11 | `importHabits throws on missing doneDates` | element without `doneDates` field throws Error |
| 12 | `importHabits throws on non-array doneDates` | `doneDates: "2024-01-01"` throws Error |
| 13 | `importHabits throws on invalid date string in doneDates` | `doneDates: ["not-a-date"]` throws Error |
| 14 | `importHabits strips unknown extra fields` | extra field `foo: "bar"` on element is absent in returned object |
| 15 | `importHabits accepts empty habits array` | `importHabits("[]")` returns `[]` without throwing |

All 15 tests must produce `executed > 0, all pass` in vitest run output.

---

## Implementation notes for the implementor

- `src/io.ts` has zero DOM dependencies — importable in Node/vitest without jsdom.
- `exportHabits` uses `JSON.stringify(habits, null, 2)` (pretty-print, stable field order from object literal).
- `importHabits` picks only `{ id, name, color, doneDates }` from each element after validation to prevent prototype pollution or unexpected field bleed.
- ISO date regex: `/^\d{4}-\d{2}-\d{2}$/` — no semantic range check needed (the heatmap already handles out-of-range dates gracefully).
- The `lastExportJson` module variable in `main.ts` holds the last export across re-renders; initialized to `""`. Set it in the export handler before calling `render()`.
- `render()` reads `lastExportJson` after setting `app.innerHTML` and, if non-empty, sets `[data-testid="export-output"]` textContent + display.
- The download anchor is created, clicked, and immediately removed — never appended to the DOM longer than needed.
- The import textarea is NOT cleared on a failed import, so the user can edit and retry.
- `import-error` element is reset to `display:none` + empty string at the start of every successful import and every export click.
