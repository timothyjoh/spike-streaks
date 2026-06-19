export interface Habit {
  id: string;
  name: string;
  color: string;
  doneDates: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const HABITS_KEY = "streaks:habits";

const DEFAULT_STORAGE: StorageLike =
  typeof localStorage !== "undefined"
    ? localStorage
    : { getItem: () => null, setItem: () => {} };

export function loadHabits(storage: StorageLike = DEFAULT_STORAGE): Habit[] {
  try {
    const raw = storage.getItem(HABITS_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Habit[];
  } catch {
    return [];
  }
}

export function saveHabits(
  habits: Habit[],
  storage: StorageLike = DEFAULT_STORAGE
): void {
  storage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function addHabit(
  habits: Habit[],
  name: string,
  color?: string,
  storage: StorageLike = DEFAULT_STORAGE
): Habit[] {
  const newHabit: Habit = {
    id: crypto.randomUUID(),
    name,
    color: color ?? "#6366f1",
    doneDates: [],
  };
  const next = [...habits, newHabit];
  saveHabits(next, storage);
  return next;
}

export function renameHabit(
  habits: Habit[],
  id: string,
  name: string,
  storage: StorageLike = DEFAULT_STORAGE
): Habit[] {
  const next = habits.map((h) => (h.id === id ? { ...h, name } : h));
  saveHabits(next, storage);
  return next;
}

export function deleteHabit(
  habits: Habit[],
  id: string,
  storage: StorageLike = DEFAULT_STORAGE
): Habit[] {
  const next = habits.filter((h) => h.id !== id);
  saveHabits(next, storage);
  return next;
}

export function toggleDate(
  habits: Habit[],
  id: string,
  date: string,
  storage: StorageLike = DEFAULT_STORAGE
): Habit[] {
  const next = habits.map((h) => {
    if (h.id !== id) return h;
    const has = h.doneDates.includes(date);
    const doneDates = has
      ? h.doneDates.filter((d) => d !== date)
      : [...h.doneDates, date];
    return { ...h, doneDates };
  });
  saveHabits(next, storage);
  return next;
}
