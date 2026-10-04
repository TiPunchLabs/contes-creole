import type * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Welds a low-poly shape's faces so light flows over it smoothly instead of in hard facets. */
export function soften(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  const welded = mergeVertices(geometry);
  welded.computeVertexNormals();
  geometry.dispose();
  return welded;
}
