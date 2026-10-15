/** Height of the morne around the tree (v13 `gH`): a gentle plateau falling towards the hills. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  return (
    -0.6 +
    Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 * Math.min(1, d / 12) +
    Math.sin(x * 0.05 + 1) * Math.sin(z * 0.06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30))
  );
}
