import type { Portrait } from "../pages";
import { paintLapen } from "./lapen";
import { paintZanba } from "./zanba";

/**
 * Editorial data: the characters of the oral tradition presented in the book, each placed after a
 * tale's page. Adding a portrait = adding an entry here (and its painter); the book and its page
 * turn need no change. Names and sources: docs/missions/2026-11-19-accueil-veillee/characters.md.
 */
export const PORTRAITS: readonly Portrait[] = [
  {
    id: "konpe-lapen",
    name: "Konpè Lapen",
    frenchName: "Compère Lapin",
    text: "Konpè Lapen est un tout petit lapin, mais sa tête est pleine d'idées. Un jour, il a fait semblant d'avoir la fièvre pour que Zamba le porte sur son dos comme un cheval ! Avec ses longues oreilles, rien ne lui échappe.",
    after: "ti-kannot",
    paint: paintLapen,
  },
  {
    id: "konpe-zanba",
    name: "Konpè Zanba",
    frenchName: "Compère Zamba",
    text: "Konpè Zanba est un éléphant immense et très fort. Il a toujours faim : sa trompe flaire le moindre fruit mûr. Il croit tout ce qu'on lui raconte, alors Konpè Lapen lui joue souvent des tours.",
    after: "mila",
    paint: paintZanba,
  },
];
