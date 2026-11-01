// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import HTML from "../../../contes-des-classes/index.html?raw";
import { enhanceCopy } from "./copy";

const SUBJECT = "Projet Contes Créoles — Classe";

/** Loads the page's static markup into the test document. */
function load(): Document {
  document.documentElement.innerHTML = new DOMParser()
    .parseFromString(HTML, "text/html")
    .documentElement.innerHTML.replace(/<script[\s\S]*?<\/script>/g, "");
  return document;
}

describe("Les contes des classes page", () => {
  beforeEach(load);

  it("leads to the owner's existing contact form in a new tab, saying so", () => {
    const cta = document.querySelector<HTMLAnchorElement>(".cc-cta");
    expect(cta?.getAttribute("href")).toBe("https://xgueret.tipunchlabs.fr/#tp-contact");
    expect(cta?.target).toBe("_blank");
    expect(cta?.rel).toContain("noopener");
    expect(cta?.textContent).toContain("Proposer un projet de classe");
    expect(cta?.textContent).toContain("nouvel onglet");
    expect(document.querySelectorAll("form, input, textarea")).toHaveLength(0);
  });

  it("gives the subject and asks only for school, level, language and a few lines", () => {
    expect(document.querySelector(".cc-subject-text")?.textContent).toBe(SUBJECT);
    const asked = [...document.querySelectorAll(".cc-sheet-list li")].map((li) =>
      li.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(asked).toEqual([
      "le nom de l'école et la commune ;",
      "le niveau de la classe ;",
      "la langue envisagée : français, créole guadeloupéen ou les deux ;",
      "quelques lignes sur le projet, même s'il n'est encore qu'une idée.",
    ]);
    expect(document.querySelector(".cc-privacy")?.textContent).toContain(
      "Aucune information sur les élèves",
    );
  });

  it("leaves the Creole language support to the class, not to Contes Créoles", () => {
    const [classe, contes] = [...document.querySelectorAll(".cc-voice .cc-list")].map((v) =>
      v.textContent?.replace(/\s+/g, " "),
    );
    expect(classe).toContain(
      "Si nécessaire, vous vous entourez d'intervenants pour accompagner le travail en créole guadeloupéen.",
    );
    expect(contes).toContain("Prend ensuite le relais pour donner vie au conte retenu");
    expect(contes).not.toMatch(/créole|linguisti|traduction|accompagn/i);
  });

  it("goes back to the tree, opened on the invitation", () => {
    const backs = [...document.querySelectorAll<HTMLAnchorElement>(".cc-back")];
    expect(backs).toHaveLength(2);
    for (const back of backs) expect(back.getAttribute("href")).toBe("/#invitation");
  });

  it("has one h1, French as its language, and the tree's name marked as Kréyòl", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(HTML).toMatch(/<html lang="fr">/);
    expect(document.querySelector('[lang="gcf"]')?.textContent).toBe("Pyébwa a Konesans");
    expect(document.querySelector(".cc-card")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("enhanceCopy", () => {
  beforeEach(load);

  it("keeps the copy button hidden without a clipboard", () => {
    enhanceCopy(document, undefined);
    expect(document.querySelector<HTMLButtonElement>(".cc-copy")?.hidden).toBe(true);
  });

  it("copies the exact subject and announces it", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    enhanceCopy(document, { writeText });
    const button = document.querySelector<HTMLButtonElement>(".cc-copy");
    expect(button?.hidden).toBe(false);
    button?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(SUBJECT);
    expect(document.querySelector(".cc-copy-status")?.textContent).toBe("Objet copié");
  });

  it("tells the teacher to copy by hand when the clipboard refuses", async () => {
    enhanceCopy(document, { writeText: () => Promise.reject(new Error("denied")) });
    document.querySelector<HTMLButtonElement>(".cc-copy")?.click();
    await new Promise((r) => setTimeout(r));
    expect(document.querySelector(".cc-copy-status")?.textContent).toContain("recopiez");
  });
});
