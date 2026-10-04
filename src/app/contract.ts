/** Story languages: Guadeloupean Creole (ISO 639-3), French, English. */
export type Lang = "gcf" | "fr" | "en";
export const LANGS: readonly Lang[] = ["gcf", "fr", "en"];

export interface StoryBlock {
  kind: "text" | "dialogue";
  /** Plain text, Markdown markers removed. Dialogue keeps its leading "– ". */
  text: string;
  /** Escaped HTML with <em>/<strong> only. */
  html: string;
}

export interface StoryPage {
  id: string;
  label: string;
  title: string;
  blocks: StoryBlock[];
  summary?: string;
}

export interface Story {
  lang: Lang;
  title: string;
  pages: StoryPage[];
}

/** Every language file of a book; only Kréyòl is required. */
export interface Stories {
  gcf: Story;
  fr?: Story;
  en?: Story;
}

/** Plain text plus escaped HTML with <em>/<strong> only. */
export interface InlineText {
  text: string;
  html: string;
}

/** A sentence quoted from the tale, with its source page and translation. */
export interface LanguageExample {
  /** Id of the source page in story/gcf.md. */
  pageId: string;
  gcf: InlineText;
  translation: InlineText;
}

export interface LanguageNote {
  id: string;
  title: string;
  summary: InlineText[];
  examples: LanguageExample[];
  /** "Pou alé pli lwen" paragraphs; absent when the note has none. */
  more?: InlineText[];
  moreExamples?: LanguageExample[];
}

/** A book's `langue/<lang>.md`: language notes illustrated by the tale. */
export interface LanguageNotes {
  lang: Lang;
  title: string;
  /** Not yet validated by a Creole speaker. */
  draft: boolean;
  notes: LanguageNote[];
}

export interface ScreenAnchor {
  x: number;
  y: number;
  visible: boolean;
}

/** Shared speech bubble; `anchor` is polled every frame while the bubble is shown. */
export interface Bubble {
  show(text: string, anchor: () => ScreenAnchor): void;
  hide(): void;
}

export interface BookCard {
  title: string;
  sub: string;
  theme: string;
}

export interface BookContext {
  /** Story in the current reading language (Kréyòl when Bileng). */
  story: Story;
  page: number;
  bubble: Bubble;
}

export interface BookHandle {
  /** Target page; the world animates towards it. */
  setPage(index: number): void;
  setStory(story: Story): void;
  /** Must stop the render loop and release GPU resources. */
  dispose(): void;
}

export interface BookWorld {
  mount(container: HTMLElement, ctx: BookContext): BookHandle | Promise<BookHandle>;
}

export interface BookManifest {
  id: string;
  order: number;
  ready: boolean;
  card: BookCard;
  /** Paints the card cover; the tree calls it on a 512×720 canvas. Locked books omit it. */
  cover?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Lazy world module; its import also pulls the book's theme.css. Absent when !ready. */
  world?: () => Promise<{ default: BookWorld }>;
}

export interface TreeContext {
  books: BookManifest[];
  bubble: Bubble;
  onEnter(bookId: string): void;
}

export interface TreeHandle {
  /** Resolves when the dive animation ends and the flash may cover the screen. */
  dive(bookId: string): Promise<void>;
  pause(): void;
  /** Restarts the loop; with a book id, the camera is back at that book's card. */
  resume(fromBookId?: string): void;
  dispose(): void;
}

/** Mounts the tree universe. Throws when WebGL is unavailable. */
export type MountTree = (container: HTMLElement, ctx: TreeContext) => TreeHandle;

/** Identity helper giving type checking to a book's `book.ts`. */
export function defineBook(manifest: BookManifest): BookManifest {
  return manifest;
}

/** Identity helper giving type checking to a book's world module. */
export function defineWorld(world: BookWorld): BookWorld {
  return world;
}
