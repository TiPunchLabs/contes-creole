/** Screen shown when WebGL stays unavailable after every retry. */
export function showFallback(root: HTMLElement): void {
  const el = document.createElement("div");
  el.className = "app-fallback";
  el.innerHTML = `
    <div class="app-fallback-title">Pyébwa-la pa ka limé…</div>
    <div class="app-fallback-text">Le navigateur a suspendu l'affichage 3D (WebGL). Recharge l'onglet ; si rien ne change, ferme puis rouvre le navigateur.</div>
    <button type="button">Rechaje</button>`;
  el.querySelector("button")?.addEventListener("click", () => location.reload());
  root.append(el);
}
