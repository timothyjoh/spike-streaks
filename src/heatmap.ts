export interface HeatmapCell {
  date: string;      // "YYYY-MM-DD" — always valid calendar date
  done: boolean;     // true iff date is in doneDates AND inRange
  inRange: boolean;  // true iff date falls within [windowStart, today] inclusive
}

/** Total cells in the grid (53 columns × 7 rows). */
export const GRID_TOTAL = 371;

/** Number of columns in the grid. */
export const GRID_COLS = 53;

/** Rows per column (days per week). */
export const GRID_ROWS = 7;

/**
 * Build the trailing-365-day heatmap grid.
 *
 * Returns a flat array of 371 cells in column-major order:
 *   cells[colIndex * 7 + rowIndex]
 * where colIndex ∈ [0, 52], rowIndex ∈ [0, 6] (0 = Sunday).
 *
 * @param today    ISO "YYYY-MM-DD" representing the current day (UTC).
 * @param doneDates  ISO date strings for completed days (duplicates tolerated).
 */
export function buildHeatmapGrid(today: string, doneDates: string[]): HeatmapCell[] {
  const doneSet = new Set(doneDates);

  // today as UTC epoch ms
  const todayMs = new Date(today + "T00:00:00Z").getTime();

  // windowStart: today - 364 days (365-day window inclusive of today)
  const windowStartMs = todayMs - 364 * 86_400_000;

  // gridStart: Sunday of the week containing windowStart
  const windowStartWeekday = new Date(windowStartMs).getUTCDay(); // 0=Sun
  const gridStartMs = windowStartMs - windowStartWeekday * 86_400_000;

  const cells: HeatmapCell[] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
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
