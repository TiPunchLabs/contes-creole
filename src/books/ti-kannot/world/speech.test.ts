import type { Story } from "@app/contract";
import { describe, expect, it } from "vitest";
import { dialogueLines, lineFor } from "./speech";

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: [
    {
      id: "a",
      label: "A",
      title: "A",
      blocks: [
        { kind: "text", text: "Narration.", html: "Narration." },
        { kind: "dialogue", text: "– Poukwa ?", html: "– Poukwa ?" },
        { kind: "dialogue", text: "– Pou jou ké rivé !", html: "– Pou jou ké rivé !" },
      ],
    },
    { id: "b", label: "B", title: "B", blocks: [{ kind: "text", text: "Pa ni pawòl.", html: "" }] },
  ],
};

describe("speech", () => {
  it("lists a page's dialogue lines without their dash", () => {
    expect(dialogueLines(story, 0)).toEqual(["Poukwa ?", "Pou jou ké rivé !"]);
  });

  it("gives Gwo Rako the first line and Ti Kannot the second (v13)", () => {
    const lines = dialogueLines(story, 0);
    expect(lineFor("crab", lines)).toBe("Poukwa ?");
    expect(lineFor("bird", lines)).toBe("Pou jou ké rivé !");
  });

  it("falls back to their calls on a page without dialogue", () => {
    expect(lineFor("crab", dialogueLines(story, 1))).toBe("Grrr…");
    expect(lineFor("bird", dialogueLines(story, 1))).toBe("Tchip tchip !");
  });
});
