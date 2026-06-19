import { describe, it, expect } from "vitest";
import {
  loadHabits,
  saveHabits,
  addHabit,
  renameHabit,
  deleteHabit,
  toggleDate,
  HABITS_KEY,
  type StorageLike,
} from "../src/store.js";

function makeFakeStorage(): StorageLike & { _data: Record<string, string> } {
  const _data: Record<string, string> = {};
  return {
    _data,
    getItem: (k) => _data[k] ?? null,
    setItem: (k, v) => {
      _data[k] = v;
    },
  };
}

// S1: empty storage returns []
it("S1: loadHabits — empty storage returns []", () => {
  const s = makeFakeStorage();
  expect(loadHabits(s)).toEqual([]);
});

// S2: corrupt JSON returns []
it("S2: loadHabits — corrupt JSON returns []", () => {
  const s = makeFakeStorage();
  s._data[HABITS_KEY] = "not json";
  expect(loadHabits(s)).toEqual([]);
});

// S3: non-array JSON returns []
it("S3: loadHabits — non-array JSON returns []", () => {
  const s = makeFakeStorage();
  s._data[HABITS_KEY] = "42";
  expect(loadHabits(s)).toEqual([]);
});

// S4: saveHabits + loadHabits round-trip
it("S4: saveHabits + loadHabits — round-trip persists full habit", () => {
  const s = makeFakeStorage();
  const habit = { id: "abc", name: "Run", color: "#ff0000", doneDates: ["2024-01-01"] };
  saveHabits([habit], s);
  const loaded = loadHabits(s);
  expect(loaded).toHaveLength(1);
  expect(loaded[0]).toEqual(habit);
});

// S5: addHabit creates habit with name + color
it("S5: addHabit — creates habit with name + color", () => {
  const s = makeFakeStorage();
  const habits = addHabit([], "Run", "#ff0000", s);
  expect(habits).toHaveLength(1);
  expect(habits[0].name).toBe("Run");
  expect(habits[0].color).toBe("#ff0000");
  expect(habits[0].doneDates).toEqual([]);
  expect(typeof habits[0].id).toBe("string");
  expect(habits[0].id.length).toBeGreaterThan(0);
});

// S6: addHabit default color applied when omitted
it("S6: addHabit — default color applied when omitted", () => {
  const s = makeFakeStorage();
  const habits = addHabit([], "Read", undefined, s);
  expect(habits[0].color).toBe("#6366f1");
});

// S7: addHabit persists to storage
it("S7: addHabit — persists to storage", () => {
  const s = makeFakeStorage();
  addHabit([], "Run", "#ff0000", s);
  const loaded = loadHabits(s);
  expect(loaded).toHaveLength(1);
});

// S8: two habits → length 2, distinct ids
it("S8: addHabit — two habits have distinct ids", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  habits = addHabit(habits, "Read", "#00ff00", s);
  expect(habits).toHaveLength(2);
  expect(habits[0].id).not.toBe(habits[1].id);
});

// S9: renameHabit renames by id
it("S9: renameHabit — renames by id", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  habits = renameHabit(habits, id, "Jog", s);
  expect(habits[0].name).toBe("Jog");
});

// S10: renameHabit unknown id is no-op
it("S10: renameHabit — unknown id is no-op", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  habits = renameHabit(habits, "bogus-id", "Jog", s);
  expect(habits).toHaveLength(1);
  expect(habits[0].name).toBe("Run");
});

// S11: renameHabit persists to storage
it("S11: renameHabit — persists to storage", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  renameHabit(habits, id, "Jog", s);
  const loaded = loadHabits(s);
  expect(loaded[0].name).toBe("Jog");
});

// S12: deleteHabit removes by id
it("S12: deleteHabit — removes by id", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  habits = addHabit(habits, "Read", "#00ff00", s);
  const idToDelete = habits[0].id;
  habits = deleteHabit(habits, idToDelete, s);
  expect(habits).toHaveLength(1);
  expect(habits.find((h) => h.id === idToDelete)).toBeUndefined();
});

// S13: deleteHabit unknown id is no-op
it("S13: deleteHabit — unknown id is no-op", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  habits = deleteHabit(habits, "bogus-id", s);
  expect(habits).toHaveLength(1);
});

// S14: deleteHabit persists to storage
it("S14: deleteHabit — persists to storage", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  deleteHabit(habits, id, s);
  const loaded = loadHabits(s);
  expect(loaded.find((h) => h.id === id)).toBeUndefined();
});

// S15: toggleDate adds date when absent
it("S15: toggleDate — adds date when absent", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  habits = toggleDate(habits, id, "2024-01-01", s);
  expect(habits[0].doneDates).toContain("2024-01-01");
});

// S16: toggleDate removes date when present
it("S16: toggleDate — removes date when present", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  habits = toggleDate(habits, id, "2024-01-01", s);
  habits = toggleDate(habits, id, "2024-01-01", s);
  expect(habits[0].doneDates).not.toContain("2024-01-01");
});

// S17: two toggles → back to absent
it("S17: toggleDate — two toggles returns to original absent state", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  // toggle in → present
  habits = toggleDate(habits, id, "2024-01-01", s);
  expect(habits[0].doneDates).toContain("2024-01-01");
  // toggle out → absent
  habits = toggleDate(habits, id, "2024-01-01", s);
  expect(habits[0].doneDates).not.toContain("2024-01-01");
});

// S18: toggleDate unknown habit id is no-op
it("S18: toggleDate — unknown habit id is no-op", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const before = habits[0].doneDates.length;
  habits = toggleDate(habits, "bogus-id", "2024-01-01", s);
  expect(habits[0].doneDates.length).toBe(before);
});

// S19: toggleDate persists to storage
it("S19: toggleDate — persists to storage", () => {
  const s = makeFakeStorage();
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  toggleDate(habits, id, "2024-01-01", s);
  const loaded = loadHabits(s);
  expect(loaded[0].doneDates).toContain("2024-01-01");
});

// S20: toggleDate does not duplicate date
it("S20: toggleDate — does not duplicate date on toggle-in", () => {
  const s = makeFakeStorage();
  // Start with the date already present
  let habits = addHabit([], "Run", "#ff0000", s);
  const id = habits[0].id;
  habits = toggleDate(habits, id, "2024-01-01", s);
  // Toggle again would remove, so let's test the single add case differently:
  // Re-add from scratch to test no-dup guarantee
  const s2 = makeFakeStorage();
  let h2 = addHabit([], "Run", "#ff0000", s2);
  const id2 = h2[0].id;
  h2 = toggleDate(h2, id2, "2024-01-01", s2);
  // Now manually put the date in twice via the raw store to simulate potential dup
  // Actually: test that a single toggleDate from absent produces exactly 1 occurrence
  expect(h2[0].doneDates.filter((d) => d === "2024-01-01").length).toBe(1);
});
