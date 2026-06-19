import { describe, it, expect } from "vitest";
import { exportHabits, importHabits } from "../src/io.js";
import type { Habit } from "../src/store.js";

const habit1: Habit = {
  id: "abc-123",
  name: "Exercise",
  color: "#6366f1",
  doneDates: ["2024-01-01", "2024-01-02"],
};

const habit2: Habit = {
  id: "def-456",
  name: "Read",
  color: "#ec4899",
  doneDates: ["2024-01-03"],
};

describe("exportHabits", () => {
  it("returns valid JSON string", () => {
    const result = exportHabits([]);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(Array.isArray(JSON.parse(result))).toBe(true);
  });

  it("serializes id/name/color/doneDates", () => {
    const result = JSON.parse(exportHabits([habit1]));
    expect(result[0].id).toBe(habit1.id);
    expect(result[0].name).toBe(habit1.name);
    expect(result[0].color).toBe(habit1.color);
    expect(result[0].doneDates).toEqual(habit1.doneDates);
  });

  it("serializes multiple habits", () => {
    const result = JSON.parse(exportHabits([habit1, habit2]));
    expect(result.length).toBe(2);
  });

  it("preserves doneDates order", () => {
    const dates = ["2024-03-01", "2024-01-15", "2024-02-20"];
    const h: Habit = { id: "x", name: "Y", color: "#fff", doneDates: dates };
    const result = JSON.parse(exportHabits([h]));
    expect(result[0].doneDates).toEqual(dates);
  });
});

describe("importHabits", () => {
  it("round-trips exportHabits output", () => {
    const habits = [habit1, habit2];
    const imported = importHabits(exportHabits(habits));
    expect(imported).toEqual(habits);
  });

  it("throws on JSON syntax error", () => {
    expect(() => importHabits("not json")).toThrow(/Invalid JSON/);
  });

  it("throws on non-array JSON", () => {
    expect(() => importHabits("{}")).toThrow(/array/);
  });

  it("throws on missing id", () => {
    const bad = JSON.stringify([{ name: "X", color: "#fff", doneDates: [] }]);
    expect(() => importHabits(bad)).toThrow(/index 0/);
  });

  it("throws on missing name", () => {
    const bad = JSON.stringify([{ id: "1", color: "#fff", doneDates: [] }]);
    expect(() => importHabits(bad)).toThrow(/name/);
  });

  it("throws on missing color", () => {
    const bad = JSON.stringify([{ id: "1", name: "X", doneDates: [] }]);
    expect(() => importHabits(bad)).toThrow(/color/);
  });

  it("throws on missing doneDates", () => {
    const bad = JSON.stringify([{ id: "1", name: "X", color: "#fff" }]);
    expect(() => importHabits(bad)).toThrow(/doneDates/);
  });

  it("throws on non-array doneDates", () => {
    const bad = JSON.stringify([{ id: "1", name: "X", color: "#fff", doneDates: "2024-01-01" }]);
    expect(() => importHabits(bad)).toThrow(/doneDates/);
  });

  it("throws on invalid date string in doneDates", () => {
    const bad = JSON.stringify([{ id: "1", name: "X", color: "#fff", doneDates: ["not-a-date"] }]);
    expect(() => importHabits(bad)).toThrow(/doneDates/);
  });

  it("strips unknown extra fields", () => {
    const input = JSON.stringify([{ id: "1", name: "X", color: "#fff", doneDates: [], foo: "bar" }]);
    const result = importHabits(input);
    expect((result[0] as unknown as Record<string, unknown>).foo).toBeUndefined();
  });

  it("accepts empty habits array", () => {
    expect(importHabits("[]")).toEqual([]);
  });
});
