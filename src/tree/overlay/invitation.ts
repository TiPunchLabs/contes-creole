import { CONTACT_URL, SUBJECT } from "../invitation";

export interface InvitationDialog {
  /** Opens the invitation; focus comes back to the element that had it when it closes. */
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

const CROSS = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m1 1 12 12M13 1 1 13"/></svg>`;
const OUT = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2 7 9"/></svg>`;
const TITLE_ID = "tree-invite-title";
const FOCUSABLE = "button, a[href]";

/**
 * The invitation to classes, in French only (no new Kréyòl text): who does what, what to write in
 * the message, and a link to the owner's existing contact form. Nothing is collected here.
 */
const BODY = `
  <header class="tree-invite-head">
    <p class="tree-invite-kicker">Histoire à inventer</p>
    <h2 class="tree-invite-title" id="${TITLE_ID}">Et si le prochain conte venait de votre classe&nbsp;?</h2>
    <button type="button" class="tree-invite-close" aria-label="Fermer">${CROSS}</button>
  </header>
  <div class="tree-invite-body">
    <p class="tree-invite-lead">Vos élèves imaginent une histoire, en français, en créole guadeloupéen
      ou dans les deux langues. Contes Créoles peut lui donner vie dans le Pyébwa a Konesans, avec
      sa propre couverture, ses personnages et son univers.</p>
    <section class="tree-invite-part">
      <h3>En classe</h3>
      <ul>
        <li>Les élèves imaginent et écrivent leur conte.</li>
        <li>Vous organisez les ateliers d'écriture et de narration, et choisissez les langues de
          travail.</li>
        <li>Une personne qui connaît bien le créole guadeloupéen peut vous accompagner.</li>
        <li>La classe participe à la validation de sa création.</li>
      </ul>
    </section>
    <section class="tree-invite-part">
      <h3>Contes Créoles</h3>
      <ul>
        <li>Étudie votre proposition avec vous.</li>
        <li>Accompagne l'adaptation artistique et numérique du conte retenu&nbsp;: couverture,
          illustrations, univers visuel, en 2D, en mouvement ou en 3D selon le récit.</li>
        <li>L'intègre au site pour qu'il puisse être lu et partagé.</li>
      </ul>
    </section>
    <section class="tree-invite-part">
      <h3>Présenter votre projet</h3>
      <p>Commencez votre message par «&nbsp;<strong class="tree-invite-subject">${SUBJECT}</strong>&nbsp;», puis
        indiquez&nbsp;:</p>
      <ul>
        <li>le nom de l'école et la commune&nbsp;;</li>
        <li>le niveau de la classe&nbsp;;</li>
        <li>la langue envisagée&nbsp;: français, créole guadeloupéen ou les deux&nbsp;;</li>
        <li>quelques lignes sur le projet, même s'il n'est encore qu'une idée.</li>
      </ul>
      <p>Aucune information sur les élèves n'est nécessaire.</p>
    </section>
    <p class="tree-invite-note">Chaque proposition fait l'objet d'un échange. La publication d'un
      conte se décide ensemble, après validation de son adaptation et accord sur les autorisations
      nécessaires.</p>
  </div>
  <footer class="tree-invite-foot">
    <a class="tree-invite-cta" href="${CONTACT_URL}" target="_blank" rel="noopener">
      <span>Proposer un projet de classe</span>${OUT}<span class="tree-invite-sr"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  </footer>`;

/**
 * Tree-owned invitation dialog (modal): the rest of the tree goes inert while it is open, Tab stays
 * inside, Escape, the close button and the scrim close it. The panel itself scrolls, so arrow keys
 * scroll it from any focused control.
 */
export function createInvitationDialog(container: HTMLElement): InvitationDialog {
  const scrim = document.createElement("div");
  scrim.className = "tree-invite-scrim";
  scrim.hidden = true;
  const panel = document.createElement("div");
  panel.className = "tree-invite";
  panel.hidden = true;
  panel.lang = "fr";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", TITLE_ID);
  panel.innerHTML = BODY;
  const closeButton = panel.querySelector<HTMLButtonElement>(".tree-invite-close");
  container.append(scrim, panel);

  let isOpen = false;
  let opener: HTMLElement | null = null;
  let inerted: Element[] = [];

  const setBackgroundInert = (on: boolean): void => {
    if (on) {
      inerted = [...container.children].filter(
        (el) => el !== panel && el !== scrim && !el.hasAttribute("inert"),
      );
      for (const el of inerted) el.setAttribute("inert", "");
    } else {
      for (const el of inerted) el.removeAttribute("inert");
      inerted = [];
    }
  };

  const open = (): void => {
    if (isOpen) return;
    isOpen = true;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBackgroundInert(true);
    scrim.hidden = false;
    panel.hidden = false;
    panel.scrollTop = 0;
    closeButton?.focus();
  };
  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;
    setBackgroundInert(false);
    scrim.hidden = true;
    panel.hidden = true;
    if (opener?.isConnected) opener.focus();
    opener = null;
  };

  closeButton?.addEventListener("click", close);
  scrim.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
    dispose() {
      if (isOpen) setBackgroundInert(false);
      scrim.remove();
      panel.remove();
    },
  };
}
