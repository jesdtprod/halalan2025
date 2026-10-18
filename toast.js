// ==========================================================================
// Halalan 2025 — Global Centralized Floating Toast Notification System
// (Rule: Always use global and centralized floating toast notification)
// ==========================================================================

export function showToast(msg, type = "info", duration = 3200) {
  if (typeof document === "undefined") return null;

  // Auto-create toast container if not in DOM
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");

  let iconName = "info";
  if (type === "success") iconName = "check-circle-2";
  else if (type === "error") iconName = "alert-circle";
  else if (type === "warning") iconName = "alert-triangle";

  const safeMsg = String(msg || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  toast.innerHTML = `
    <div class="toast-icon-wrap" aria-hidden="true">
      <i data-lucide="${iconName}" class="toast-icon"></i>
    </div>
    <div class="toast-content">
      <span class="toast-message">${safeMsg}</span>
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss notification">
      <i data-lucide="x" class="toast-close-icon"></i>
    </button>
  `;

  container.appendChild(toast);

  // Initialize Lucide icons if available
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  // Animate in with smooth inertial transition
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const dismiss = () => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 380);
  };

  const timer = setTimeout(dismiss, duration);

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearTimeout(timer);
      dismiss();
    });
  }

  toast.addEventListener("click", () => {
    clearTimeout(timer);
    dismiss();
  });

  return toast;
}

// Guarantee global availability across all scripts and event handlers
if (typeof window !== "undefined") {
  window.showGlobalToast = showToast;
}
