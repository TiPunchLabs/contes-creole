import { describe, expect, it } from "vitest";
import { parseStory, renderInline } from "./parse";

const md = (body: string, lang = "gcf"): string =>
  `---\nlang: ${lang}\ntitle: Ti Kannot é Gwo Rako\n---\n\n${body}`;

const PAGE = "## Larivyè Klè {#ye-krik}\n\n<!-- label: Yé krik ! -->\n\nOn lè, té ni on larivyè.\n";

describe("parseStory", () => {
  it("reads the front matter", () => {
    const story = parseStory(md(PAGE), "story/gcf.md");
    expect(story).toMatchObject({ lang: "gcf", title: "Ti Kannot é Gwo Rako" });
  });

  it("starts a page on each ## heading, with its id, label and title", () => {
    const story = parseStory(
      md(`${PAGE}\n## « Poukwa ? » {#on-lide-gwo-rako}\n\nGwo Rako pran on kalbas.\n`),
      "story/gcf.md",
    );
    expect(story.pages.map((p) => [p.id, p.label, p.title])).toEqual([
      ["ye-krik", "Yé krik !", "Larivyè Klè"],
      ["on-lide-gwo-rako", "", "« Poukwa ? »"],
    ]);
  });

  it("reads the > summary", () => {
    const story = parseStory(
      md("## Rivière Claire {#ye-krik}\n\n> Il était une fois\n> une rivière.\n\nTexte.\n", "fr"),
      "story/fr.md",
    );
    expect(story.pages[0].summary).toBe("Il était une fois une rivière.");
    expect(story.pages[0].blocks).toHaveLength(1);
  });

  it("joins wrapped lines and splits – dialogue lines, even without a blank line", () => {
    const story = parseStory(
      md(
        "## T {#a}\n\nGwo Rako pran\non kalbas.\n\n– Poukwa ou ka pran dlo-tala ?\n– Pou jou ké rivé !\n",
      ),
      "story/gcf.md",
    );
    expect(story.pages[0].blocks).toEqual([
      { kind: "text", text: "Gwo Rako pran on kalbas.", html: "Gwo Rako pran on kalbas." },
      {
        kind: "dialogue",
        text: "– Poukwa ou ka pran dlo-tala ?",
        html: "– Poukwa ou ka pran dlo-tala ?",
      },
      { kind: "dialogue", text: "– Pou jou ké rivé !", html: "– Pou jou ké rivé !" },
    ]);
  });

  it("renders *italic* and **bold** and escapes everything else", () => {
    const story = parseStory(md(`## T {#a}\n\n**Gwo** *Rako* <b>&"'</b>\n`), "story/gcf.md");
    expect(story.pages[0].blocks[0]).toEqual({
      kind: "text",
      text: `Gwo Rako <b>&"'</b>`,
      html: "<strong>Gwo</strong> <em>Rako</em> &lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;",
    });
  });

  it("renders Prettier's _italic_ but keeps underscores inside words", () => {
    expect(renderInline("_sous-la_, _piti_ é snake_case_word")).toEqual({
      text: "sous-la, piti é snake_case_word",
      html: "<em>sous-la</em>, <em>piti</em> é snake_case_word",
    });
  });

  it.each([
    ["no front matter", "## T {#a}\n\nX\n", "gcf.md", /gcf\.md:1: missing front matter/],
    ["unknown lang", md(PAGE, "de"), "de.md", /de\.md:1: unknown lang "de"/],
    ["lang not matching the file", md(PAGE, "fr"), "gcf.md", /gcf\.md:1: lang "fr" does not match/],
    [
      "heading without id",
      md("## Larivyè Klè\n\nX\n"),
      "gcf.md",
      /gcf\.md:6: page heading needs an id/,
    ],
    [
      "duplicate id",
      md(`${PAGE}\n## Bis {#ye-krik}\n\nX\n`),
      "gcf.md",
      /duplicate page id "ye-krik"/,
    ],
    [
      "text before the first page",
      md(`Intro.\n\n${PAGE}`),
      "gcf.md",
      /gcf\.md:6: text before the first page/,
    ],
    [
      "page without text",
      md("## T {#a}\n\n<!-- label: A -->\n"),
      "gcf.md",
      /gcf\.md:6: page "a" has no text/,
    ],
  ])("rejects %s", (_, source, file, error) => {
    expect(() => parseStory(source, `story/${file}`)).toThrow(error);
  });
});
