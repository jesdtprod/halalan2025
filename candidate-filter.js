const selectedCandidateNames = new Map();
let activeCandidateFilterKey = null;

export function getCandidateFilterKey(categoryKey, title) {
  return `${categoryKey}:${title}`;
}

export function filterCandidateRows(filterKey, rows) {
  const selected = selectedCandidateNames.get(filterKey);
  return selected ? rows.filter((row) => selected.has(row.name)) : rows;
}

export function createCandidateFilter({ mount, card, categoryKey, title, rows, onChange }) {
  const filterKey = getCandidateFilterKey(categoryKey, title);
  const candidates = [...new Set(rows.map((row) => row.name))].sort((a, b) => a.localeCompare(b));
  const selected = selectedCandidateNames.get(filterKey);
  const isFiltered = selected !== undefined;
  const label = categoryKey === "party_list" ? "political parties" : "candidates";
  const isOpen = activeCandidateFilterKey === filterKey;

  card.classList.toggle("party-filter-active", isOpen);
  mount.replaceChildren();

  const control = document.createElement("div");
  control.className = "party-filter-control";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `btn btn-ghost btn-icon-only party-filter-button ${isFiltered ? "is-filtered" : ""} ${isOpen ? "is-active" : ""}`;
  button.title = `Filter ${label}`;
  button.setAttribute("aria-label", `Filter ${label}`);
  button.setAttribute("aria-expanded", String(isOpen));
  button.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <line x1="7" y1="12" x2="17" y2="12"></line>
      <line x1="10" y1="18" x2="14" y2="18"></line>
    </svg>
    ${isFiltered ? '<span class="party-filter-indicator" aria-hidden="true"></span>' : ""}
  `;
  button.onclick = (event) => {
    event.stopPropagation();
    activeCandidateFilterKey = isOpen ? null : filterKey;
    onChange();
  };
  control.append(button);

  if (isOpen) {
    const selectedCount = selected ? selected.size : candidates.length;
    const menu = document.createElement("div");
    menu.className = "party-filter-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", `Filter ${label}`);
    menu.innerHTML = `
      <div class="party-filter-menu-head">
        <strong class="party-filter-title">Show ${label}</strong>
        <span class="party-filter-badge">${selectedCount} of ${candidates.length}</span>
      </div>
      <div class="party-filter-menu-actions">
        <button type="button" class="party-filter-action-btn" data-candidate-action="all">
          <i data-lucide="check-check" class="action-icon"></i>
          <span>Select all</span>
        </button>
        <button type="button" class="party-filter-action-btn" data-candidate-action="none">
          <i data-lucide="x" class="action-icon"></i>
          <span>Deselect all</span>
        </button>
      </div>
      <div class="party-filter-options"></div>
    `;
    menu.querySelectorAll("[data-candidate-action]").forEach((action) => {
      action.onclick = (event) => {
        event.stopPropagation();
        if (action.dataset.candidateAction === "all") {
          selectedCandidateNames.delete(filterKey);
        } else {
          selectedCandidateNames.set(filterKey, new Set());
        }
        onChange();
      };
    });
    const options = menu.querySelector(".party-filter-options");
    candidates.forEach((candidate) => {
      const checked = !selected || selected.has(candidate);
      const option = document.createElement("label");
      option.className = `party-filter-option ${checked ? "is-checked" : ""}`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "party-filter-checkbox-input";
      input.dataset.candidateName = candidate;
      input.dataset.filterKey = filterKey;
      input.checked = checked;
      input.onchange = () => {
        const next = new Set(selected || candidates);
        input.checked ? next.add(candidate) : next.delete(candidate);
        if (next.size === candidates.length) {
          selectedCandidateNames.delete(filterKey);
        } else {
          selectedCandidateNames.set(filterKey, next);
        }
        onChange(candidate, filterKey);
      };
      const check = document.createElement("span");
      check.className = "party-filter-custom-check";
      check.setAttribute("aria-hidden", "true");
      check.innerHTML = '<svg class="check-svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 4.5"></polyline></svg>';
      const text = document.createElement("span");
      text.className = "party-filter-name";
      text.textContent = candidate;
      option.append(input, check, text);
      options.append(option);
    });
    control.append(menu);
  }
  mount.append(control);
  if (isOpen && typeof window !== "undefined" && window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function closeCandidateFilter() {
  if (!activeCandidateFilterKey) return false;
  activeCandidateFilterKey = null;
  return true;
}

export function hasOpenCandidateFilter() {
  return Boolean(activeCandidateFilterKey);
}
