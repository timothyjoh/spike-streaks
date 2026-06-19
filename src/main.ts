import { loadHabits, addHabit, renameHabit, deleteHabit, type Habit } from "./store.js";

let habits: Habit[] = loadHabits();
let renamingId: string | null = null;

const app = document.getElementById("app")!;

function render(): void {
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
        ${habits.map((h) => renderHabitItem(h)).join("")}
      </ul>
    </div>
  `;

  wireEvents();
}

function renderHabitItem(h: Habit): string {
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

function wireEvents(): void {
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
      // Focus the rename input after re-render
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
}

render();
