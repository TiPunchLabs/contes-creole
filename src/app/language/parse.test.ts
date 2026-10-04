import { describe, expect, it } from "vitest";
import { NotesParseError, parseNotes } from "./parse";

const FILE = "langue/fr.md";
const md = (body: string, front = "lang: fr\ntitle: Lang kréyòl"): string =>
  `---\n${front}\n---\n\n${body}`;
const NOTE =
  "## « té ka » {#te-ka}\n\nL'**imparfait**.\n\n> Larivyè-la **té ka** chanté. {ye-krik}\n> La rivière chantait.\n";

describe("parseNotes", () => {
  it("reads the front matter; draft defaults to false", () => {
    expect(parseNotes(md(NOTE), FILE)).toMatchObject({
      lang: "fr",
      title: "Lang kréyòl",
      draft: false,
    });
    expect(parseNotes(md(NOTE, "lang: fr\ntitle: T\ndraft: true"), FILE).draft).toBe(true);
  });

  it("reads a note: id, title, summary and a two-line example", () => {
    const [note] = parseNotes(md(NOTE), FILE).notes;
    expect(note).toMatchObject({ id: "te-ka", title: "« té ka »" });
    expect(note.summary).toEqual([
      { text: "L'imparfait.", html: "L&#39;<strong>imparfait</strong>." },
    ]);
    expect(note.examples).toEqual([
      {
        pageId: "ye-krik",
        gcf: {
          text: "Larivyè-la té ka chanté.",
          html: "Larivyè-la <strong>té ka</strong> chanté.",
        },
        translation: { text: "La rivière chantait.", html: "La rivière chantait." },
      },
    ]);
    expect(note.more).toBeUndefined();
    expect(note.moreExamples).toBeUndefined();
  });

  it("joins wrapped lines, keeps several paragraphs and several examples", () => {
    const [note] = parseNotes(
      md(
        "## A {#a}\n\nUn\ndeux.\n\nTrois.\n\n> Tèks en. {p1}\n> Texte un.\n\n> Tèks dé. {p2}\n> Texte deux.\n",
      ),
      FILE,
    ).notes;
    expect(note.summary.map((s) => s.text)).toEqual(["Un deux.", "Trois."]);
    expect(note.examples.map((e) => e.pageId)).toEqual(["p1", "p2"]);
  });

  it("reads the Pou alé pli lwen level and several notes", () => {
    const { notes } = parseNotes(
      md(
        `${NOTE}\n### Pou alé pli lwen\n\nPlis.\n\n> Tèks. {p3}\n> Texte.\n\n## B {#b}\n\nS.\n\n> T. {p1}\n> T.\n`,
      ),
      FILE,
    );
    expect(notes.map((n) => n.id)).toEqual(["te-ka", "b"]);
    expect(notes[0].more?.map((m) => m.text)).toEqual(["Plis."]);
    expect(notes[0].moreExamples?.map((e) => e.pageId)).toEqual(["p3"]);
    expect(notes[1].more).toBeUndefined();
  });

  it("escapes HTML in every text", () => {
    const [note] = parseNotes(
      md("## A {#a}\n\n<b>x</b>\n\n> <i>y</i> {p}\n> <script>z</script>\n"),
      FILE,
    ).notes;
    expect(note.summary[0].html).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(note.examples[0].gcf.html).toBe("&lt;i&gt;y&lt;/i&gt;");
    expect(note.examples[0].translation.html).toBe("&lt;script&gt;z&lt;/script&gt;");
  });

  it("reports errors as NotesParseError with file and line", () => {
    expect(() => parseNotes(md("## A\n"), FILE)).toThrow(NotesParseError);
    expect(() => parseNotes(md("## A\n"), FILE)).toThrow(
      /^langue\/fr\.md:6: note heading needs an id/,
    );
  });

  it.each([
    ["missing front matter", "## A {#a}\n", /:1: missing front matter/],
    ["lang not matching the file", md(NOTE, "lang: gcf\ntitle: T"), /does not match the file name/],
    ["missing title", md(NOTE, "lang: fr"), /missing title/],
    ["duplicate id", md(`${NOTE}\n${NOTE}`), /duplicate note id "te-ka"/],
    ["text before the first note", md(`Tèks.\n\n${NOTE}`), /:6: text before the first note/],
    ["one-line example", md("## A {#a}\n\nS.\n\n> Tèks. {p}\n"), /:10: an example is two lines/],
    [
      "three-line example",
      md("## A {#a}\n\nS.\n\n> T. {p}\n> T.\n> T.\n"),
      /an example is two lines/,
    ],
    [
      "example without page id",
      md("## A {#a}\n\nS.\n\n> Tèks.\n> Texte.\n"),
      /example needs its source page/,
    ],
    ["note without summary", md("## A {#a}\n\n> T. {p}\n> T.\n"), /:6: note "a" has no summary/],
    ["note without example", md("## A {#a}\n\nS.\n"), /note "a" has no example/],
    ["unknown subheading", md(`${NOTE}\n### Autre\n`), /unknown subheading "### Autre"/],
    [
      "duplicate more",
      md(`${NOTE}\n### Pou alé pli lwen\n\nX.\n\n### Pou alé pli lwen\n`),
      /duplicate "### Pou alé pli lwen"/,
    ],
    [
      "empty more",
      md(`${NOTE}\n### Pou alé pli lwen\n`),
      /note "te-ka": "Pou alé pli lwen" is empty/,
    ],
    ["no note at all", md(""), /:1: no note/],
  ])("rejects %s", (_name, source, error) => {
    expect(() => parseNotes(source, FILE)).toThrow(error);
  });
});
