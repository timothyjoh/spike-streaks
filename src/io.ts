import type { Habit } from "./store.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Serialize all habits to a pretty-printed JSON string. */
export function exportHabits(habits: Habit[]): string {
  return JSON.stringify(habits, null, 2);
}

/** Parse + validate a JSON string into Habit[].
 *  Throws Error with a human-readable message on any failure. */
export function importHabits(json: string): Habit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of habits");
  }

  const result: Habit[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const el = parsed[i] as Record<string, unknown>;

    if (typeof el !== "object" || el === null) {
      throw new Error(`Habit at index ${i} is invalid: expected an object`);
    }

    if (typeof el.id !== "string" || el.id === "") {
      throw new Error(`Habit at index ${i} is invalid: "id" must be a non-empty string`);
    }

    if (typeof el.name !== "string" || el.name === "") {
      throw new Error(`Habit at index ${i} is invalid: "name" must be a non-empty string`);
    }

    if (typeof el.color !== "string" || el.color === "") {
      throw new Error(`Habit at index ${i} is invalid: "color" must be a non-empty string`);
    }

    if (!Array.isArray(el.doneDates)) {
      throw new Error(`Habit at index ${i} is invalid: "doneDates" must be an array`);
    }

    for (let j = 0; j < (el.doneDates as unknown[]).length; j++) {
      const entry = (el.doneDates as unknown[])[j];
      if (typeof entry !== "string" || !DATE_RE.test(entry)) {
        throw new Error(
          `Habit at index ${i} is invalid: "doneDates[${j}]" must be a date string matching YYYY-MM-DD`
        );
      }
    }

    // Pick only the four required fields — strip unknown extras
    result.push({
      id: el.id as string,
      name: el.name as string,
      color: el.color as string,
      doneDates: el.doneDates as string[],
    });
  }

  return result;
}
