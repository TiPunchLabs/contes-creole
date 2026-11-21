/** The central tree shown: the published one, or a silhouette proposal under review. */
export type TreeChoice = "current" | "a" | "b";

export const TREE_CHOICES: readonly TreeChoice[] = ["current", "a", "b"];

/**
 * The tree asked for by `?tree=current|a|b`, or null without the parameter (or with an unknown
 * value, or when the preview is not `enabled`): the public journey, no switch shown. The preview is
 * enabled on the dev server and in builds made with `VITE_TREE_PREVIEW=1` (Netlify deploy
 * previews, see netlify.toml); production never carries it (index.ts).
 */
export function readTreeChoice(search: string, enabled: boolean): TreeChoice | null {
  if (!enabled) return null;
  const asked = new URLSearchParams(search).get("tree");
  return TREE_CHOICES.find((choice) => choice === asked) ?? null;
}
