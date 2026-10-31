// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { CONTACT_URL, SUBJECT } from "../invitation";
import { createInvitationDialog } from "./invitation";

/** Mounts the dialog in a tree-like container with a canvas and an opener button. */
function mount() {
  const container = document.createElement("div");
  const canvas = document.createElement("canvas");
  const opener = document.createElement("button");
  container.append(canvas, opener);
  document.body.append(container);
  const dialog = createInvitationDialog(container);
  const panel = container.querySelector<HTMLElement>(".tree-invite");
  if (!panel) throw new Error("no panel");
  return { container, canvas, opener, dialog, panel };
}

afterEach(() => document.body.replaceChildren());

describe("createInvitationDialog", () => {
  it("is a hidden, labelled, French modal dialog until opened", () => {
    const { panel, dialog } = mount();
    expect(panel.hidden).toBe(true);
    expect(dialog.isOpen).toBe(false);
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.lang).toBe("fr");
    const title = document.getElementById(panel.getAttribute("aria-labelledby") ?? "");
    expect(title?.textContent).toContain("Et si le prochain conte venait de votre classe");
  });

  it("links to the existing contact form, in a new tab that is announced", () => {
    const { panel } = mount();
    const links = panel.querySelectorAll("a");
    expect(links).toHaveLength(1);
    const cta = links[0];
    expect(cta.getAttribute("href")).toBe(CONTACT_URL);
    expect(cta.target).toBe("_blank");
    expect(cta.rel).toContain("noopener");
    expect(cta.textContent).toContain("Proposer un projet de classe");
    expect(cta.textContent).toContain("nouvel onglet");
  });

  it("asks only for the four project facts, after the subject line, and nothing about pupils", () => {
    const { panel } = mount();
    const text = panel.textContent ?? "";
    expect(panel.querySelector("form, input, textarea, select")).toBeNull();
    expect(panel.querySelector(".tree-invite-subject")?.textContent).toBe(SUBJECT);
    for (const fact of ["nom de l'école et la commune", "niveau de la classe", "langue envisagée"])
      expect(text).toContain(fact);
    expect(text).toContain("même s'il n'est encore qu'une idée");
    expect(text).toContain("Aucune information sur les élèves n'est nécessaire");
  });

  it("promises no publication: it is a proposal, decided together", () => {
    const text = mount().panel.textContent ?? "";
    expect(text).toContain("La publication d'un");
    expect(text).toContain("se décide ensemble");
    expect(text).not.toMatch(/gratuit|garanti|délai/i);
  });

  it("opens with focus inside and the rest of the tree inert", () => {
    const { dialog, panel, canvas, opener } = mount();
    opener.focus();
    dialog.open();
    expect(dialog.isOpen).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(canvas.hasAttribute("inert")).toBe(true);
    expect(opener.hasAttribute("inert")).toBe(true);
    expect(panel.hasAttribute("inert")).toBe(false);
  });

  it("closes on Escape and gives focus back to its opener", () => {
    const { dialog, panel, canvas, opener } = mount();
    opener.focus();
    dialog.open();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(dialog.isOpen).toBe(false);
    expect(panel.hidden).toBe(true);
    expect(canvas.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it("closes from the close button and from the scrim", () => {
    const { dialog, container, panel } = mount();
    dialog.open();
    panel.querySelector<HTMLButtonElement>(".tree-invite-close")?.click();
    expect(dialog.isOpen).toBe(false);
    dialog.open();
    container.querySelector<HTMLElement>(".tree-invite-scrim")?.click();
    expect(dialog.isOpen).toBe(false);
  });

  it("keeps Tab inside the dialog", () => {
    const { dialog, panel } = mount();
    dialog.open();
    const close = panel.querySelector<HTMLButtonElement>(".tree-invite-close");
    const cta = panel.querySelector<HTMLAnchorElement>("a");
    cta?.focus();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(close);
    panel.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(cta);
  });

  it("removes itself and lifts inert on dispose", () => {
    const { dialog, container, canvas } = mount();
    dialog.open();
    dialog.dispose();
    expect(container.querySelector(".tree-invite, .tree-invite-scrim")).toBeNull();
    expect(canvas.hasAttribute("inert")).toBe(false);
  });
});
