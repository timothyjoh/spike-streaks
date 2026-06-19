import { loadHabits, saveHabits, addHabit, renameHabit, deleteHabit, toggleDate, type Habit } from "./store.js";
import { currentStreak, longestStreak } from "./streak.js";
import { buildHeatmapGrid } from "./heatmap.js";
import { exportHabits, importHabits } from "./io.js";

let habits: Habit[] = loadHabits();
let renamingId: string | null = null;
let lastExportJson = "";

const app = document.getElementById("app")!;

function todayISO(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function render(): void {
  const today = todayISO();
  app.innerHTML = `
    <div class="streaks-app">
      <form data-testid="add-habit-form">
        <input
          type="text"
          data-testid="habit-name-input"
          placeholder="Habit name"
          required
        />
        <input
          type="color"
          data-testid="habit-color-input"
          value="#6366f1"
        />
        <button type="submit" data-testid="add-habit-btn">Add</button>
      </form>
      <ul data-testid="habit-list">
        ${habits.map((h) => renderHabitItem(h, today)).join("")}
      </ul>

      <section data-testid="export-import-section">

        <!-- EXPORT -->
        <button data-testid="export-btn">Export habits to JSON</button>
        <pre data-testid="export-output" style="display:none" aria-hidden="true"></pre>

        <!-- IMPORT -->
        <textarea
          data-testid="import-input"
          placeholder="Paste exported JSON here…"
          rows="6"
        ></textarea>
        <button data-testid="import-btn">Import habits from JSON</button>
        <p data-testid="import-error" style="color:red;display:none"></p>

      </section>
    </div>
  `;

  // Restore export output across re-renders
  if (lastExportJson) {
    const exportOutput = app.querySelector<HTMLElement>('[data-testid="export-output"]');
    if (exportOutput) {
      exportOutput.textContent = lastExportJson;
      exportOutput.style.display = "block";
    }
  }

  wireEvents(today);
}

function renderHeatmap(h: Habit, today: string): string {
  const cells = buildHeatmapGrid(today, h.doneDates);
  const cellHtml = cells
    .map((c) => {
      const classes = [
        "heatmap-cell",
        c.done ? "cell--done" : "",
        !c.inRange ? "cell--out-of-range" : "",
        c.date === today ? "cell--today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const style = c.done ? `background:${escapeAttr(h.color)}` : "";
      const ariaLabel = c.done ? `${c.date}, done` : c.date;
      return `<div
        data-testid="heatmap-cell"
        data-id="${escapeAttr(h.id)}"
        data-date="${escapeAttr(c.date)}"
        class="${classes}"
        title="${escapeAttr(c.date)}"
        ${style ? `style="${style}"` : ""}
        aria-label="${escapeAttr(ariaLabel)}"
      ></div>`;
    })
    .join("");

  return `<div
    data-testid="heatmap"
    data-id="${escapeAttr(h.id)}"
    class="heatmap-grid"
    aria-label="${escapeHtml(h.name)} heatmap"
  >${cellHtml}</div>`;
}

function renderHabitItem(h: Habit, today: string): string {
  const cs = currentStreak(h.doneDates, today);
  const ls = longestStreak(h.doneDates);
  const isRenaming = renamingId === h.id;
  const nameSection = isRenaming
    ? `<input
         data-testid="rename-input"
         type="text"
         value="${escapeAttr(h.name)}"
         data-id="${h.id}"
       />
       <button data-testid="rename-save-btn" data-id="${h.id}">Save</button>`
    : `<span data-testid="habit-name">${escapeHtml(h.name)}</span>
       <button data-testid="rename-btn" data-id="${h.id}">Rename</button>`;

  return `
    <li data-testid="habit-item" data-id="${h.id}">
      <span
        class="habit-color-swatch"
        style="background: ${escapeAttr(h.color)}"
        aria-hidden="true"
      ></span>
      ${nameSection}
      <button data-testid="delete-btn" data-id="${h.id}">Delete</button>
      <div class="habit-streaks">
        <span>Current streak: <strong data-testid="current-streak" data-id="${h.id}">${cs}</strong></span>
        <span>Longest streak: <strong data-testid="longest-streak" data-id="${h.id}">${ls}</strong></span>
      </div>
      <button data-testid="mark-today-btn" data-id="${h.id}" data-date="${today}">Mark today done</button>
      ${renderHeatmap(h, today)}
    </li>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function wireEvents(today: string): void {
  // Add-habit form submit
  const form = app.querySelector<HTMLFormElement>('[data-testid="add-habit-form"]')!;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = form.querySelector<HTMLInputElement>('[data-testid="habit-name-input"]')!;
    const colorInput = form.querySelector<HTMLInputElement>('[data-testid="habit-color-input"]')!;
    const name = nameInput.value.trim();
    if (!name) return;
    const color = colorInput.value || "#6366f1";
    habits = addHabit(habits, name, color);
    renamingId = null;
    render();
  });

  // Habit list event delegation
  const list = app.querySelector<HTMLUListElement>('[data-testid="habit-list"]')!;
  list.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Rename button — enter inline rename mode
    if (target.matches('[data-testid="rename-btn"]')) {
      renamingId = target.dataset.id ?? null;
      render();
      const input = app.querySelector<HTMLInputElement>('[data-testid="rename-input"]');
      input?.focus();
      input?.select();
      return;
    }

    // Save rename button
    if (target.matches('[data-testid="rename-save-btn"]')) {
      const id = target.dataset.id ?? "";
      const input = list.querySelector<HTMLInputElement>(`[data-testid="rename-input"][data-id="${id}"]`);
      const newName = input?.value.trim() ?? "";
      if (newName) {
        habits = renameHabit(habits, id, newName);
      }
      renamingId = null;
      render();
      return;
    }

    // Delete button
    if (target.matches('[data-testid="delete-btn"]')) {
      const id = target.dataset.id ?? "";
      habits = deleteHabit(habits, id);
      if (renamingId === id) renamingId = null;
      render();
      return;
    }

    // Toggle via heatmap cell click (in-range cells only; out-of-range have pointer-events:none)
    if (target.matches('[data-testid="heatmap-cell"]')) {
      const id = target.dataset.id ?? "";
      const date = target.dataset.date ?? "";
      if (!id || !date) return;
      habits = toggleDate(habits, id, date);
      render();
      return;
    }

    // Toggle via mark-today button
    if (target.matches('[data-testid="mark-today-btn"]')) {
      const id = target.dataset.id ?? "";
      const date = target.dataset.date ?? today;
      if (!id) return;
      habits = toggleDate(habits, id, date);
      render();
      return;
    }
  });

  // Enter key on rename input commits save
  list.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (target.matches('[data-testid="rename-input"]') && (e as KeyboardEvent).key === "Enter") {
      const id = target.dataset.id ?? "";
      const newName = (target as HTMLInputElement).value.trim();
      if (newName) {
        habits = renameHabit(habits, id, newName);
      }
      renamingId = null;
      render();
    }
  });

  // Export button
  const exportBtn = app.querySelector<HTMLButtonElement>('[data-testid="export-btn"]');
  exportBtn?.addEventListener("click", () => {
    const json = exportHabits(habits);
    lastExportJson = json;

    // Show JSON in the output element (for e2e tests)
    const exportOutput = app.querySelector<HTMLElement>('[data-testid="export-output"]');
    if (exportOutput) {
      exportOutput.textContent = json;
      exportOutput.style.display = "block";
    }

    // Clear any previous import error
    const importError = app.querySelector<HTMLElement>('[data-testid="import-error"]');
    if (importError) {
      importError.textContent = "";
      importError.style.display = "none";
    }

    // Trigger real file download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "streaks-export.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import button
  const importBtn = app.querySelector<HTMLButtonElement>('[data-testid="import-btn"]');
  importBtn?.addEventListener("click", () => {
    const importInput = app.querySelector<HTMLTextAreaElement>('[data-testid="import-input"]');
    const importError = app.querySelector<HTMLElement>('[data-testid="import-error"]');
    const value = importInput?.value ?? "";

    try {
      const validated = importHabits(value);
      saveHabits(validated);
      habits = validated;

      // Clear error
      if (importError) {
        importError.textContent = "";
        importError.style.display = "none";
      }

      // Clear textarea before re-render so it doesn't persist
      if (importInput) importInput.value = "";

      render();
    } catch (err) {
      if (importError) {
        importError.textContent = (err as Error).message;
        importError.style.display = "block";
      }
    }
  });
}

render();
