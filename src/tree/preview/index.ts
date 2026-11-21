import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { disposeObject } from "@shared/three/dispose";
import urlA from "../assets/flamboyant-a.glb?url";
import urlB from "../assets/flamboyant-b.glb?url";
import { treeWindAt } from "../scene/canopy";
import { TREE_CHOICES, type TreeChoice } from "./choice";
import { readProposal, type Proposal } from "./proposal";

const MODELS: Record<Exclude<TreeChoice, "current">, string> = { a: urlA, b: urlB };
const LABELS: Record<TreeChoice, string> = {
  current: "Actuel",
  a: "A · parasol",
  b: "B · asymétrique",
};
/** On narrow screens the intro band fills the top: short labels, above the shelf's right end. */
const SHORT: Record<TreeChoice, string> = { current: "Actuel", a: "A", b: "B" };
const NARROW = "(max-width: 700px)";
/** What the preview needs from the tree universe. */
export interface PreviewHost {
  container: HTMLElement;
  scene: THREE.Scene;
  /** The published tree's group and thread tips. */
  current: { group: THREE.Group; tips: readonly THREE.Vector3[] };
  /** Re-hangs the cards' threads (cards.ts `hang`). */
  hang(tips: readonly THREE.Vector3[]): void;
}

export interface TreePreview {
  /** Moves the thread tips with the wind; call once per frame. */
  update(): void;
  dispose(): void;
}

/** Fetches and prepares a proposal's model. */
async function loadProposal(url: string): Promise<Proposal> {
  return readProposal((await new GLTFLoader().loadAsync(url)).scene);
}

/**
 * The silhouette review switch: three buttons that swap the central tree in place (published, A,
 * B) while the camera, the lights, the scenery, the cards and the Konteur stay as they are. Only
 * the central tree's group and the threads' upper ends change.
 */
export function mountTreePreview(host: PreviewHost, first: TreeChoice): TreePreview {
  const loaded = new Map<TreeChoice, Promise<Proposal>>();
  let shown: Proposal | null = null;
  let asked: TreeChoice = first;
  let disposed = false;

  const bar = document.createElement("div");
  bar.className = "tree-preview";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Silhouette du flamboyant (aperçu)");
  bar.style.cssText =
    "position:absolute;z-index:30;display:flex;gap:4px;padding:4px;" +
    "border-radius:999px;background:rgba(255,250,240,.88);font:600 13px/1 system-ui,sans-serif";
  const narrow = window.matchMedia?.(NARROW);
  /** Places the bar and sizes its labels for the screen. */
  const place = (): void => {
    const small = narrow?.matches ?? false;
    bar.style.left = small ? "auto" : "12px";
    bar.style.top = small ? "auto" : "12px";
    bar.style.right = small ? "12px" : "auto";
    bar.style.bottom = small ? "104px" : "auto";
    for (const [choice, button] of buttons) {
      button.textContent = small ? SHORT[choice] : LABELS[choice];
      button.setAttribute("aria-label", LABELS[choice]);
    }
  };
  const buttons = new Map<TreeChoice, HTMLButtonElement>();
  for (const choice of TREE_CHOICES) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText =
      "border:0;border-radius:999px;padding:8px 12px;cursor:pointer;font:inherit;color:#23233f";
    button.addEventListener("click", () => select(choice));
    buttons.set(choice, button);
    bar.append(button);
  }
  place();
  narrow?.addEventListener("change", place);
  host.container.append(bar);
  // For the QA kit (qa/flamboyant.mjs `scenery`): the scene, read-only use.
  (window as { __treePreview?: { scene: THREE.Scene } }).__treePreview = { scene: host.scene };

  /** Marks the pressed button and, once the tree is in the scene, what is shown. */
  const mark = (ready: boolean): void => {
    for (const [choice, button] of buttons) {
      const on = choice === asked;
      button.setAttribute("aria-pressed", String(on));
      button.style.background = on ? "#23233f" : "transparent";
      button.style.color = on ? "#fffaf0" : "#23233f";
    }
    if (ready) bar.dataset.treePreview = asked;
    else delete bar.dataset.treePreview;
  };

  /** Puts `proposal` (null: the published tree) in the scene and re-hangs the threads. */
  const show = (proposal: Proposal | null): void => {
    if (shown) host.scene.remove(shown.group);
    shown = proposal;
    host.current.group.visible = proposal === null;
    if (proposal) host.scene.add(proposal.group);
    host.hang(proposal ? proposal.tips : host.current.tips);
    mark(true);
  };

  /** Shows a tree, loading its model on first use; the address keeps the choice for a reload. */
  function select(choice: TreeChoice): void {
    asked = choice;
    mark(false);
    const url = new URL(location.href);
    url.searchParams.set("tree", choice);
    history.replaceState(null, "", url);
    if (choice === "current") {
      show(null);
      return;
    }
    let pending = loaded.get(choice);
    if (!pending) {
      pending = loadProposal(MODELS[choice]);
      loaded.set(choice, pending);
    }
    pending.then(
      (proposal) => {
        if (disposed) disposeObject(proposal.group);
        else if (asked === choice) show(proposal);
      },
      (err: unknown) => {
        console.error(err);
        loaded.delete(choice);
        if (!disposed && asked === choice) select("current");
      },
    );
  }
  select(first);

  return {
    update() {
      const { rest, tips } = shown ?? { rest: [], tips: [] };
      rest.forEach((p, i) => treeWindAt(p, tips[i]));
    },
    dispose() {
      disposed = true;
      narrow?.removeEventListener("change", place);
      delete (window as { __treePreview?: unknown }).__treePreview;
      bar.remove();
      for (const pending of loaded.values())
        void pending.then(
          (proposal) => {
            // The one in the scene is disposed with it by the stage.
            if (proposal !== shown) disposeObject(proposal.group);
          },
          () => undefined,
        );
    },
  };
}
