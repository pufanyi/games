const list = document.getElementById("games");
const search = document.getElementById("search");
const noResults = document.getElementById("no-results");
const buttons = document.querySelectorAll(".view-toggle button");
const VIEW_KEY = "arcade:view";

function setView(view) {
  if (list) list.dataset.view = view;
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  }
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Storage may be unavailable (private mode); the toggle still works.
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => setView(button.dataset.view));
}

try {
  const saved = localStorage.getItem(VIEW_KEY);
  if (saved === "grid" || saved === "list") setView(saved);
} catch {
  // Fall back to the default grid view.
}

search?.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const item of list?.children ?? []) {
    const match = item.dataset.search.includes(query);
    item.hidden = !match;
    if (match) visible++;
  }
  if (noResults) noResults.hidden = visible > 0;
});
