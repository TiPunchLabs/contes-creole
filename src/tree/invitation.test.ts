import { describe, expect, it } from "vitest";
import type { BookManifest } from "@app/contract";
import { CLASSES_PAGE, INVITATION, RETURN_HASH, isInvitation, treeSlots } from "./invitation";

const book = (id: string, ready: boolean): BookManifest => ({
  id,
  order: 1,
  ready,
  card: { title: id, sub: "", theme: "" },
});

describe("treeSlots", () => {
  it("keeps the published books in order and ends with one invitation", () => {
    const a = book("a", true);
    const b = book("b", true);
    expect(treeSlots([a, b])).toEqual([a, b, INVITATION]);
  });

  it("replaces every pending book with a single invitation, never one per book", () => {
    const ready = book("ti-kannot", true);
    const slots = treeSlots([ready, book("zanba", false), book("konpe-lapen", false)]);
    expect(slots).toEqual([ready, INVITATION]);
    expect(slots.filter(isInvitation)).toHaveLength(1);
  });

  it("leaves the books it is given untouched", () => {
    const books = [book("a", true), book("b", false)];
    treeSlots(books);
    expect(books.map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("INVITATION", () => {
  it("is not a book: no world to dive into, no cover to paint", () => {
    expect(INVITATION.ready).toBe(false);
    expect(INVITATION.world).toBeUndefined();
    expect(INVITATION.cover).toBeUndefined();
  });

  it("leads to the classes page, whose way back names the slot", () => {
    expect(CLASSES_PAGE).toBe("/contes-des-classes/");
    expect(RETURN_HASH).toBe("#invitation");
  });
});
