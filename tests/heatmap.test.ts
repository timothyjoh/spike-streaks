import { describe, it, expect } from "vitest";
import { buildHeatmapGrid, GRID_TOTAL, GRID_COLS, GRID_ROWS } from "../src/heatmap.js";

// Fixed today for deterministic tests: 2025-06-19 is a Thursday (weekday=4)
const TODAY = "2025-06-19";

describe("buildHeatmapGrid", () => {
  // H1: grid has exactly 371 cells
  it("H1: grid has exactly 371 cells", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    expect(cells.length).toBe(GRID_TOTAL);
    expect(GRID_TOTAL).toBe(371);
  });

  // H2: exactly 365 cells are inRange
  it("H2: exactly 365 cells are inRange", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    expect(cells.filter((c) => c.inRange).length).toBe(365);
  });

  // H3: exactly 6 cells are out-of-range
  it("H3: exactly 6 cells are out-of-range", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    expect(cells.filter((c) => !c.inRange).length).toBe(6);
  });

  // H4: today's cell is inRange and present
  it("H4: today's cell is inRange:true", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    const todayCells = cells.filter((c) => c.date === TODAY);
    expect(todayCells.length).toBe(1);
    expect(todayCells[0].inRange).toBe(true);
  });

  // H5: today's cell is done when in doneDates
  it("H5: today's cell is done:true when in doneDates", () => {
    const cells = buildHeatmapGrid(TODAY, [TODAY]);
    const todayCell = cells.find((c) => c.date === TODAY)!;
    expect(todayCell.done).toBe(true);
  });

  // H6: today's cell is not done when not in doneDates
  it("H6: today's cell is done:false when not in doneDates", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    const todayCell = cells.find((c) => c.date === TODAY)!;
    expect(todayCell.done).toBe(false);
  });

  // H7: a known past date in doneDates maps to done:true
  it("H7: past date in doneDates is done:true and inRange:true", () => {
    const past = "2025-06-01";
    const cells = buildHeatmapGrid(TODAY, [past]);
    const cell = cells.find((c) => c.date === past)!;
    expect(cell).toBeDefined();
    expect(cell.done).toBe(true);
    expect(cell.inRange).toBe(true);
  });

  // H8: a date outside the 365-day window maps to done:false
  // windowStart = 2025-06-19 - 364 = 2024-06-20; the day before is 2024-06-19
  it("H8: date before windowStart is not inRange:true", () => {
    const outsideDate = "2024-06-19"; // one day before windowStart 2024-06-20
    const cells = buildHeatmapGrid(TODAY, [outsideDate]);
    const cell = cells.find((c) => c.date === outsideDate);
    // Cell may or may not exist (out-of-range cells are still in the grid if within gridStart)
    // But if it exists, it must have inRange:false and done:false
    if (cell) {
      expect(cell.inRange).toBe(false);
      expect(cell.done).toBe(false);
    }
    // Verify windowStart is indeed 2024-06-20
    const windowStartCell = cells.find((c) => c.date === "2024-06-20");
    expect(windowStartCell?.inRange).toBe(true);
  });

  // H9: out-of-range cells are always done:false
  it("H9: out-of-range cells are always done:false", () => {
    // Pass many dates including ones that might fall out-of-range
    const cells = buildHeatmapGrid(TODAY, [TODAY, "2025-06-01", "2024-06-01"]);
    expect(cells.filter((c) => !c.inRange).every((c) => !c.done)).toBe(true);
  });

  // H10: first cell date is the Sunday starting the grid
  // today=2025-06-19 (Thursday=4); windowStart=2024-06-20 (Thursday=4);
  // gridStart = 2024-06-20 - 4 days = 2024-06-16 (Sunday)
  it("H10: first cell date is gridStart Sunday 2024-06-16", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    expect(cells[0].date).toBe("2024-06-16");
  });

  // H11: cells[0..6] are consecutive Sun–Sat of week 0
  it("H11: cells[0..6] are consecutive days Sun–Sat of first week", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    const expected = [
      "2024-06-16", "2024-06-17", "2024-06-18", "2024-06-19",
      "2024-06-20", "2024-06-21", "2024-06-22",
    ];
    expect(cells.slice(0, 7).map((c) => c.date)).toEqual(expected);
  });

  // H12: last in-range cell is today
  it("H12: last in-range cell is today", () => {
    const cells = buildHeatmapGrid(TODAY, []);
    const inRange = cells.filter((c) => c.inRange);
    expect(inRange.at(-1)!.date).toBe(TODAY);
  });

  // H13: duplicate doneDates handled — no double-done cells
  it("H13: duplicate doneDates are deduplicated", () => {
    const cells = buildHeatmapGrid(TODAY, [TODAY, TODAY]);
    const todayDoneCells = cells.filter((c) => c.date === TODAY && c.done);
    expect(todayDoneCells.length).toBe(1);
    expect(cells.filter((c) => c.done).length).toBe(1);
  });

  // H14: Saturday alignment — today on Saturday means 0 suffix out-of-range in last col
  // 2025-06-21 is a Saturday (weekday=6)
  it("H14: Saturday today has 0 suffix out-of-range cells in last column", () => {
    const saturday = "2025-06-21";
    const cells = buildHeatmapGrid(saturday, []);
    // Last cell (col 52, row 6) should be today and inRange
    const lastCell = cells[cells.length - 1];
    expect(lastCell.date).toBe(saturday);
    expect(lastCell.inRange).toBe(true);
    // All 6 out-of-range cells must be prefix (before windowStart), not suffix
    const outOfRange = cells.filter((c) => !c.inRange);
    expect(outOfRange.length).toBe(6);
    // All out-of-range cells should come before any in-range cell
    const firstInRangeIdx = cells.findIndex((c) => c.inRange);
    outOfRange.forEach((c) => {
      const idx = cells.indexOf(c);
      expect(idx).toBeLessThan(firstInRangeIdx);
    });
  });

  // H15: Sunday alignment — today on Sunday means 6 suffix out-of-range cells
  // 2025-06-22 is a Sunday (weekday=0)
  it("H15: Sunday today has 6 suffix out-of-range cells and 0 prefix out-of-range", () => {
    const sunday = "2025-06-22";
    const cells = buildHeatmapGrid(sunday, []);
    // windowStart = 2025-06-22 - 364 = 2024-06-23 (Sunday, weekday=0)
    // gridStart = 2024-06-23 - 0 = 2024-06-23 (no prefix)
    // cells[0..6] first column; cells[0] is gridStart = 2024-06-23
    expect(cells[0].inRange).toBe(true); // prefix=0 so first cell is in range
    // suffix: col 52, rows 1-6 should be out-of-range
    const suffixCells = cells.slice(cells.length - 6); // last 6
    expect(suffixCells.every((c) => !c.inRange)).toBe(true);
    expect(cells.filter((c) => !c.inRange).length).toBe(6);
  });

  // Verify GRID constants
  it("constants: GRID_COLS=53, GRID_ROWS=7", () => {
    expect(GRID_COLS).toBe(53);
    expect(GRID_ROWS).toBe(7);
  });
});
