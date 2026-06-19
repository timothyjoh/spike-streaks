/** Parse an ISO YYYY-MM-DD string as UTC midnight to avoid TZ offset issues. */
function toDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}

/** Add n days to a UTC Date, returning a new Date. */
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Serialize a UTC Date back to YYYY-MM-DD. */
function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Current streak: length of the consecutive-day run ending on or immediately
 * before `today`.
 *
 * - today in doneDates  → count from today backward.
 * - today NOT done, yesterday done → count from yesterday backward (streak live).
 * - neither today nor yesterday done → 0 (chain broken).
 */
export function currentStreak(doneDates: string[], today: string): number {
  const set = new Set(doneDates);
  if (set.size === 0) return 0;

  const todayDate = toDate(today);
  const yesterdayKey = dateKey(addDays(todayDate, -1));

  let anchor: string;
  if (set.has(today)) {
    anchor = today;
  } else if (set.has(yesterdayKey)) {
    anchor = yesterdayKey;
  } else {
    return 0;
  }

  let count = 0;
  let cursor = toDate(anchor);
  while (set.has(dateKey(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/**
 * Longest streak: max-length consecutive-day run across all history.
 */
export function longestStreak(doneDates: string[]): number {
  if (doneDates.length === 0) return 0;

  // Deduplicate and sort ascending.
  const sorted = [...new Set(doneDates)].sort();
  if (sorted.length === 0) return 0;

  let max = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = toDate(sorted[i - 1]);
    const curr = toDate(sorted[i]);
    const diffMs = curr.getTime() - prev.getTime();
    if (diffMs === 86_400_000) {
      // Exactly one day apart — extend run.
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }

  return max;
}
