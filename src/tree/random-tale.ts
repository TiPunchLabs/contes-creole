import type { BookManifest } from "@app/contract";
import { isInvitation } from "./invitation";

/** The storyteller's call to a tale picked at random (owner's wording, French only). */
export const RANDOM_TALE_ACTION = "Cliquez ici pour accéder à un conte au hasard.";

/** Said instead when no tale can be opened (proposal, awaiting the owner's wording). */
export const RANDOM_TALE_NONE = "Aucun conte n'est disponible pour le moment.";

/**
 * The tales the storyteller may open: ready books with a universe to enter. The invitation
 * ("Histoire à inventer"), pending books and anything without a world never qualify.
 */
export function eligibleTales(books: readonly BookManifest[]): BookManifest[] {
  return books.filter(
    (book) => book.ready && !isInvitation(book) && Boolean(book.world ?? book.immersive),
  );
}

/**
 * One eligible tale, each with the same chance; null when there is none. `random` returns a
 * number in [0, 1), like Math.random.
 */
export function pickRandomTale(
  books: readonly BookManifest[],
  random: () => number,
): BookManifest | null {
  const tales = eligibleTales(books);
  if (!tales.length) return null;
  return tales[Math.min(tales.length - 1, Math.floor(random() * tales.length))];
}
