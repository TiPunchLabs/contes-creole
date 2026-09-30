import type { Story } from "@app/contract";

export type CharacterName = "bird" | "crab";

const CALLS: Record<CharacterName, string> = { crab: "Grrr…", bird: "Tchip tchip !" };

/** Dialogue lines of a page, without their leading dash. */
export function dialogueLines(story: Story, page: number): string[] {
  return (story.pages[page]?.blocks ?? [])
    .filter((b) => b.kind === "dialogue")
    .map((b) => b.text.replace(/^–\s*/, ""));
}

/** v13 rule: Gwo Rako speaks first when present and Ti Kannot answers; otherwise their call. */
export function lineFor(name: CharacterName, lines: string[]): string {
  return lines[name === "crab" ? 0 : 1] ?? lines[0] ?? CALLS[name];
}
