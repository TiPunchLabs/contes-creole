// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBubble } from "./bubble";

const anchor = () => ({ x: 100, y: 200, visible: true });

afterEach(() => {
  document.body.replaceChildren();
});

describe("bubble action", () => {
  it("ends the bubble with a button that runs the action once per press", () => {
    const bubble = createBubble(document.body);
    const run = vi.fn();
    bubble.show([{ lang: "gcf", text: "Yé krik !" }], anchor, {
      lang: "fr",
      text: "Cliquez ici pour accéder à un conte au hasard.",
      run,
    });
    const button = document.querySelector<HTMLButtonElement>(".app-bubble-action");
    expect(button?.textContent).toBe("Cliquez ici pour accéder à un conte au hasard.");
    expect(button?.lang).toBe("fr");
    expect(document.querySelector<HTMLElement>(".app-bubble")?.inert).toBe(false);
    button?.click();
    expect(run).toHaveBeenCalledTimes(1);
    bubble.dispose();
  });

  it("is inert once hidden, and a plain line brings no button", () => {
    const bubble = createBubble(document.body);
    bubble.show("Paj en tèks.", anchor);
    expect(document.querySelector(".app-bubble-action")).toBeNull();
    bubble.hide();
    expect(document.querySelector<HTMLElement>(".app-bubble")?.inert).toBe(true);
    bubble.dispose();
  });
});
