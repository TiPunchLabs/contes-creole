/** Short status message at the top of the screen, removed after `ms`; returns it so callers can set its lang. */
export function showNotice(root: HTMLElement, text: string, ms = 4000): HTMLElement {
  const el = document.createElement("div");
  el.className = "app-notice";
  el.setAttribute("role", "status");
  el.textContent = text;
  root.append(el);
  setTimeout(() => el.remove(), ms);
  return el;
}
