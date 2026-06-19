import { describe, it, expect } from "vitest";
import { currentStreak, longestStreak } from "../src/streak.js";

describe("currentStreak", () => {
  it("C1: single day, today done", () => {
    expect(currentStreak(["2024-03-10"], "2024-03-10")).toBe(1);
  });

  it("C2: 3-day run, today is last", () => {
    expect(
      currentStreak(["2024-03-08", "2024-03-09", "2024-03-10"], "2024-03-10")
    ).toBe(3);
  });

  it("C3: gap breaks streak — today done but gap before", () => {
    expect(currentStreak(["2024-03-07", "2024-03-10"], "2024-03-10")).toBe(1);
  });

  it("C4: today NOT done, yesterday done → streak from yesterday", () => {
    expect(currentStreak(["2024-03-08", "2024-03-09"], "2024-03-10")).toBe(2);
  });

  it("C5: today NOT done, yesterday NOT done → 0", () => {
    expect(currentStreak(["2024-03-07", "2024-03-08"], "2024-03-10")).toBe(0);
  });

  it("C6: empty list → 0", () => {
    expect(currentStreak([], "2024-03-10")).toBe(0);
  });

  it("C7: duplicates in input (idempotent)", () => {
    expect(
      currentStreak(["2024-03-10", "2024-03-10", "2024-03-09"], "2024-03-10")
    ).toBe(2);
  });

  it("C8: today done but input unsorted", () => {
    expect(
      currentStreak(["2024-03-10", "2024-03-09", "2024-03-08"], "2024-03-10")
    ).toBe(3);
  });
});

describe("longestStreak", () => {
  it("L1: empty → 0", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("L2: single day", () => {
    expect(longestStreak(["2024-03-10"])).toBe(1);
  });

  it("L3: 5-day run", () => {
    expect(
      longestStreak([
        "2024-03-01",
        "2024-03-02",
        "2024-03-03",
        "2024-03-04",
        "2024-03-05",
      ])
    ).toBe(5);
  });

  it("L4: gap splits into two runs (3 and 2) → 3", () => {
    expect(
      longestStreak([
        "2024-03-01",
        "2024-03-02",
        "2024-03-03",
        "2024-03-05",
        "2024-03-06",
      ])
    ).toBe(3);
  });

  it("L5: full year — 365 consecutive days", () => {
    const dates: string[] = [];
    const start = new Date(Date.UTC(2024, 0, 1)); // Jan 1 2024 UTC
    for (let i = 0; i < 365; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${day}`);
    }
    expect(longestStreak(dates)).toBe(365);
  });

  it("L6: unsorted input", () => {
    expect(longestStreak(["2024-03-03", "2024-03-01", "2024-03-02"])).toBe(3);
  });

  it("L7: duplicates present", () => {
    expect(longestStreak(["2024-03-01", "2024-03-01", "2024-03-02"])).toBe(2);
  });
});
