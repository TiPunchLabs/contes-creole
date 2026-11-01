import type { BookManifest } from "@app/contract";

/** The "Les contes des classes" page: a static page of its own, reachable by a shareable URL. */
export const CLASSES_PAGE = "/contes-des-classes/";

/** URL hash the page's way back uses: the tree then opens on the invitation's slot. */
export const RETURN_HASH = "#invitation";

/**
 * The tree's one "story still to invent" slot, inviting a class to write the next tale. It is not a
 * book: no world, no cover, never entered. Its card, fiche and shelf entry lead to CLASSES_PAGE.
 */
export const INVITATION: BookManifest = {
  id: "invitation",
  order: Number.POSITIVE_INFINITY,
  ready: false,
  card: {
    title: "Le prochain conte",
    sub: "Et s'il venait de votre classe ?",
    theme: "Histoire à inventer",
  },
};

/** The near-slot fiche of the invitation (the card keeps the shorter INVITATION.card texts). */
export const INVITATION_FICHE = {
  kicker: "Histoire à inventer",
  title: "Et si le prochain conte venait de votre classe ?",
  sub: "Une invitation aux enseignants du primaire",
  action: "Comment participer",
} as const;

/** Whether a tree slot is the invitation rather than a book. */
export function isInvitation(book: BookManifest): boolean {
  return book === INVITATION;
}

/**
 * The slots the tree shows: the published books in order, then the invitation once, at the top of
 * the climb. Pending books stay in the repo but are not shown: the invitation speaks for them.
 */
export function treeSlots(books: readonly BookManifest[]): BookManifest[] {
  return [...books.filter((book) => book.ready), INVITATION];
}
