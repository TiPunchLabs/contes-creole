import type { BookManifest } from "@app/contract";

/** The owner's existing contact form: a class project starts there, never in a form of our own. */
export const CONTACT_URL = "https://xgueret.tipunchlabs.fr/#tp-contact";

/** First words of the teacher's message, so the owner can spot class projects. */
export const SUBJECT = "Projet Contes Créoles — Classe";

/**
 * The tree's one "story still to invent" slot, inviting a class to write the next tale. It is not a
 * book: no world, no cover, never entered. Its card, fiche and shelf entry open the invitation.
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
