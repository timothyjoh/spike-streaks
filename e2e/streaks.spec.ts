import { test, expect } from "@playwright/test";

// Mirror app's todayISO(): uses UTC date
function todayUTC(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test.beforeEach(async ({ page }) => {
  // Clear localStorage before each test for isolation
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("core flow: create habit, mark today done, streak=1, persists on reload", async ({ page }) => {
  const today = todayUTC();

  // Create a habit named "Workout"
  await page.fill('[data-testid="habit-name-input"]', "Workout");
  await page.click('[data-testid="add-habit-btn"]');

  // Habit item should appear
  await expect(page.locator('[data-testid="habit-item"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="habit-name"]')).toHaveText("Workout");

  // Today's heatmap cell should exist and NOT be done yet
  const todayCell = page.locator(`[data-testid="heatmap-cell"][data-date="${today}"]`).first();
  await expect(todayCell).toBeVisible();
  await expect(todayCell).not.toHaveClass(/cell--done/);

  // Click "Mark today done"
  await page.locator('[data-testid="mark-today-btn"]').first().click();

  // Today's cell should now have class cell--done
  await expect(todayCell).toHaveClass(/cell--done/);

  // Current streak should show "1"
  const streak = page.locator('[data-testid="current-streak"]').first();
  await expect(streak).toHaveText("1");

  // Reload and verify persistence
  await page.reload();

  const todayCellAfterReload = page.locator(`[data-testid="heatmap-cell"][data-date="${today}"]`).first();
  await expect(todayCellAfterReload).toHaveClass(/cell--done/);
  await expect(page.locator('[data-testid="current-streak"]').first()).toHaveText("1");
});

test("export/import round-trip: create+mark, export, clear, import, habit restored", async ({ page }) => {
  const today = todayUTC();

  // Create a habit
  await page.fill('[data-testid="habit-name-input"]', "Reading");
  await page.click('[data-testid="add-habit-btn"]');
  await expect(page.locator('[data-testid="habit-item"]')).toHaveCount(1);

  // Mark today done
  await page.locator('[data-testid="mark-today-btn"]').first().click();
  await expect(page.locator('[data-testid="current-streak"]').first()).toHaveText("1");

  // Export habits — click export button; JSON appears in export-output pre element
  await page.click('[data-testid="export-btn"]');
  const exportOutput = page.locator('[data-testid="export-output"]');
  await expect(exportOutput).toBeVisible();
  const exportedJson = await exportOutput.textContent();
  expect(exportedJson).toBeTruthy();

  // Validate exported JSON has our habit and today's done date
  const parsed = JSON.parse(exportedJson!);
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed).toHaveLength(1);
  expect(parsed[0].name).toBe("Reading");
  expect(parsed[0].doneDates).toContain(today);

  // Clear localStorage and reload
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // After clear+reload, no habits
  await expect(page.locator('[data-testid="habit-item"]')).toHaveCount(0);

  // Import the JSON
  await page.fill('[data-testid="import-input"]', exportedJson!);
  await page.click('[data-testid="import-btn"]');

  // Habit should be restored
  await expect(page.locator('[data-testid="habit-item"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="habit-name"]')).toHaveText("Reading");

  // Streak should still be 1
  await expect(page.locator('[data-testid="current-streak"]').first()).toHaveText("1");

  // Today's cell should be done
  const todayCell = page.locator(`[data-testid="heatmap-cell"][data-date="${today}"]`).first();
  await expect(todayCell).toHaveClass(/cell--done/);
});
