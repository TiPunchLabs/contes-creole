/** Height of the morne around the tree (v13 `gH`): a gentle plateau falling towards the hills. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  return (
    -0.6 +
    Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 * Math.min(1, d / 12) +
    Math.sin(x * 0.05 + 1) * Math.sin(z * 0.06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30))
  );
}

/** Size and resolution of the rendered ground plane (landscape.ts). */
export const GROUND_SIZE = 200;
export const GROUND_SEGMENTS = 90;

/**
 * Height of the rendered ground mesh at (x, z): `groundHeight` at the grid's vertices, linearly
 * interpolated over the same two triangles per cell as three's PlaneGeometry, so a decal laid on
 * it follows the faceted surface exactly instead of the smooth function.
 */
export function groundMeshHeight(x: number, z: number): number {
  const step = GROUND_SIZE / GROUND_SEGMENTS;
  const half = GROUND_SIZE / 2;
  const gx = Math.min(GROUND_SEGMENTS - 1e-6, Math.max(0, (x + half) / step));
  const gz = Math.min(GROUND_SEGMENTS - 1e-6, Math.max(0, (z + half) / step));
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const u = gx - ix;
  const v = gz - iz;
  const h = (i: number, j: number): number => groundHeight(-half + i * step, -half + j * step);
  // Each cell splits along the diagonal from (ix, iz + 1) to (ix + 1, iz).
  if (u + v <= 1) {
    return h(ix, iz) + u * (h(ix + 1, iz) - h(ix, iz)) + v * (h(ix, iz + 1) - h(ix, iz));
  }
  return (
    h(ix + 1, iz + 1) +
    (1 - u) * (h(ix, iz + 1) - h(ix + 1, iz + 1)) +
    (1 - v) * (h(ix + 1, iz) - h(ix + 1, iz + 1))
  );
}
