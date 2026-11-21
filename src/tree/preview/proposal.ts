import * as THREE from "three";
import { withTreeWind } from "../scene/canopy";

/** Node names of the attach points in the models (art/flamboyant/build_flamboyant.py). */
const ATTACH = /^attach-(\d+)$/;

/** A silhouette proposal ready for the scene. */
export interface Proposal {
  group: THREE.Group;
  /** Attach points at rest, in the order of their numbers (`attach-1` first). */
  rest: THREE.Vector3[];
  /** Where the wind has them now: what the threads hang from. */
  tips: THREE.Vector3[];
}

/**
 * Prepares a loaded model: its meshes keep their matte materials, bent by the tree's own wind, so
 * wood and foliage masses move together like the published tree; its `attach-N` nodes become the
 * points the threads hang from. The model is authored in the scene's frame: no turn, no offset.
 */
export function readProposal(group: THREE.Group): Proposal {
  group.updateMatrixWorld(true);
  const found: { index: number; at: THREE.Vector3 }[] = [];
  const seen = new Set<THREE.Material>();
  group.traverse((o) => {
    const attach = ATTACH.exec(o.name);
    if (attach)
      found.push({ index: Number(attach[1]), at: o.getWorldPosition(new THREE.Vector3()) });
    if (!(o instanceof THREE.Mesh)) return;
    const material = o.material as THREE.Material;
    if (seen.has(material)) return;
    seen.add(material);
    withTreeWind(material);
  });
  if (!found.length) throw new Error("tree preview: the model has no attach point");
  const rest = found.sort((p, q) => p.index - q.index).map((f) => f.at);
  return { group, rest, tips: rest.map((p) => p.clone()) };
}
