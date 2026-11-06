/** One page of the tale: title, lines and an optional interaction hint (prototype `PAGES`). */
export interface MilaPage {
  title: string;
  lines: readonly string[];
  hint?: string;
}

/** The tale, verbatim from the prototype "Le monde de Mila V3" (French, with its Kréyòl formula). */
export const PAGES: readonly MilaPage[] = [
  {
    title: "Là où la vague s'endort",
    lines: [
      "« Yé krik ! » — « Yé krak ! »",
      "Au bord de l'anse, Mila connaissait le bruit de chaque vague.",
      "Mais un soir, dans le lambi qu'elle porta à son oreille,",
      "elle n'entendit plus rien.",
    ],
  },
  {
    title: "La voix dans la spirale",
    lines: [
      "« Trois voix me manquent », murmura le coquillage.",
      "« Les pas de ceux qui vivent sur le sable, le souffle du jardin sous l'eau,",
      "et le battement de ce qui grandira demain.",
      "Retrouve-les, ti-moun. Alors la mer chantera de nouveau. »",
    ],
  },
  {
    title: "Le soir où la mer se tut",
    lines: [
      "Mila se souvint des mots de sa grand-mère :",
      "« Quand le lambi se tait, c'est que la mer a oublié quelque chose. »",
      "Au large, les reflets d'or s'éteignirent un à un.",
      "Même les grenouilles cessèrent de siffler.",
    ],
  },
  {
    title: "Le chemin que personne ne voyait",
    lines: [
      "Mila posa un pied dans l'écume.",
      "Sous ses pas, un fil de lumière s'étira sur l'eau.",
      "Et le fil la conduisit jusqu'au plus petit des gardiens.",
    ],
  },
  {
    title: "Le bruit des petits pas",
    lines: [
      "« Je n'ai ni or ni perle », dit le crabe, coincé derrière ce que d'autres avaient laissé.",
      "Mila lui ouvrit pourtant le passage.",
      "Alors il lui offrit le bruit de ses petits pas.",
    ],
    hint: "Touchez les déchets pour libérer le passage du crabe",
  },
  {
    title: "Le seuil de l'eau",
    lines: [
      "L'eau de la nuit était noire et profonde.",
      "Mila noua le lambi à son cou, comme sa grand-mère nouait ses clés.",
      "Les petits pas du crabe s'allumèrent devant elle.",
      "Elle prit une grande inspiration… et plongea.",
    ],
  },
  {
    title: "Le jardin qu'on n'emporte pas",
    lines: [
      "Sous la surface, un jardin dansait dans le courant.",
      "Mila tendit la main vers une longue feuille.",
      "« Regarde d'abord », souffla la tortue.",
      "Elle retint son geste : tout un petit monde vivait là.",
    ],
  },
  {
    title: "Ceux qui nagent ensemble",
    lines: [
      "Plus loin, l'eau devenait froide et sombre.",
      "Un banc de poissons vint tourner autour d'elle, mille écailles comme une seule.",
      "« Ensemble, le noir fait moins peur », chantaient-ils.",
      "Et ils lui ouvrirent le chemin des profondeurs.",
    ],
  },
  {
    title: "La perle de demain",
    lines: [
      "« Prends cette lumière : elle brillera une nuit.",
      "Laisse-la grandir : elle éclairera ceux qui viendront. »",
      "Mila ouvrit sa main… puis la referma, vide.",
    ],
  },
  {
    title: "La fenêtre de lune",
    lines: [
      "Mila remonta, les trois voix serrées contre elle.",
      "Au-dessus, la surface brillait comme une fenêtre ouverte sur la lune.",
      "Elle comprit qu'elle n'avait rien pris à la mer :",
      "elle avait seulement appris à l'écouter.",
    ],
  },
  {
    title: "Trois voix pour une mer",
    lines: [
      "Revenue sur le sable, Mila approcha le lambi de son oreille.",
      "Les pas du crabe, le souffle du jardin,",
      "le battement de ce qui grandirait demain :",
      "trois voix se nouèrent dans la spirale.",
    ],
  },
  {
    title: "Ce que Mila rapporta",
    lines: [
      "Au large, les reflets d'or se rallumèrent et la mer se remit à chanter.",
      "Mila revint sans or et sans perle, avec un conte pour les petits et les grands.",
      "Depuis, dans les coquillages, la mer raconte",
      "à ceux qui savent lui laisser une place.",
    ],
  },
];

export const PAGE_COUNT = PAGES.length;

/** Page whose debris must be cleared before the tale goes on (the crab, page 5). */
export const CRAB_PAGE = 5;
