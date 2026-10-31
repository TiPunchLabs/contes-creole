// M4 contrast check: oklch -> linear sRGB -> WCAG 2.x ratio, for every pair the tree HUD uses.
// Values are copied from src/shared/theme/tokens.css; the script fails (exit 1) on any miss.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const T = {
  paper: [0.985, 0.012, 85],
  paperWarm: [0.965, 0.02, 80],
  ink: [0.27, 0.045, 280],
  inkSoft: [0.44, 0.035, 280],
  lamp: [0.78, 0.14, 70],
  ember: [0.55, 0.15, 40],
  skyLow: [0.88, 0.08, 65],
  skyHigh: [0.82, 0.05, 300],
  skyMiddle: [0.86, 0.07, 30],
  skyGlow: [0.92, 0.07, 80],
};

/** Converts oklch to clamped linear sRGB channels. */
function linear([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // Gamut clamp happens in gamma space, as the browser shows it.
  return rgb.map((c) => {
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.abs(c) ** (1 / 2.4) - 0.055;
    const gc = Math.min(1, Math.max(0, g));
    return gc <= 0.04045 ? gc / 12.92 : ((gc + 0.055) / 1.055) ** 2.4;
  });
}

const lum = (c) => {
  const [r, g, b] = linear(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg) => {
  const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [usage, fg, bg, minimum]: 4.5 for body text (all HUD text is < 24px), 3 for non-text UI.
const pairs = [
  ["bubble text (tree)", "ink", "paper", 4.5],
  ["bubble French line (tree)", "inkSoft", "paper", 4.5],
  ["notice text (tree)", "ink", "paper", 4.5],
  ["site title / intro motto / label title", "ink", "paper", 4.5],
  ["intro kicker, intro text, invitation fiche kicker and sub", "inkSoft", "paper", 4.5],
  ["intro gloss, intro hint", "inkSoft", "paper", 4.5],
  ["intro hint icon (non-text)", "ember", "paper", 3],
  ["shelf label", "inkSoft", "paperWarm", 4.5],
  ["shelf title", "ink", "paper", 4.5],
  ["shelf sub", "inkSoft", "paper", 4.5],
  ["enter button text", "paper", "ink", 4.5],
  ["reading back, language buttons, page arrow, page counter (shell chips)", "ink", "paper", 4.5],
  ["Ti Kannot sound button icon (shell chip, non-text)", "ink", "paper", 3],
  ["reading language buttons not pressed, hint", "inkSoft", "paper", 4.5],
  ["reading language pressed, next page arrow", "paper", "ink", 4.5],
  ["shelf dot number", "paper", "ink", 4.5],
  ["focus ring ink edge on paper", "ink", "paper", 3],
  ["focus ring ink edge on paper-warm shelf", "ink", "paperWarm", 3],
  ["focus ring ink edge on sky high", "ink", "skyHigh", 3],
  ["focus ring ink edge on sky low", "ink", "skyLow", 3],
  ["focus ring ink edge on 3D sky middle (M5 rose)", "ink", "skyMiddle", 3],
  ["focus ring ink edge on 3D sky horizon glow (M5)", "ink", "skyGlow", 3],
  ["near shelf book ink border on paper-warm", "ink", "paperWarm", 3],
  ["card title, sub and label (canvas, M9)", "ink", "paper", 4.5],
  ["invitation card text (canvas, M2)", "inkSoft", "paper", 4.5],
  ["invitation card quill and first words on blank page (canvas, M2)", "inkSoft", "paperWarm", 3],
  ["invitation dialog text, title, close and fiche button (M2)", "ink", "paper", 4.5],
  ["invitation dialog kicker (M2)", "inkSoft", "paper", 4.5],
  ["invitation dialog note on paper-warm (M2)", "inkSoft", "paperWarm", 4.5],
  ["invitation dialog link button (M2)", "paper", "ink", 4.5],
  ["invitation list bullets (M2, non-text)", "ember", "paper", 3],
  ["invitation shelf '+' on paper-warm (M2)", "ink", "paperWarm", 4.5],
  ["climb thumb on track", "ink", "paper", 3],
  ["loader and fallback title / line on dusk sky (rose band)", "ink", "skyMiddle", 4.5],
  ["loader and fallback title / line on dusk sky (low band)", "ink", "skyLow", 4.5],
  ["fallback text on dusk sky (rose band)", "inkSoft", "skyMiddle", 4.5],
  ["fallback text on dusk sky (low band)", "inkSoft", "skyLow", 4.5],
  ["fallback button text", "paper", "ink", 4.5],
  ["reference: lamp on paper-warm (never text)", "lamp", "paperWarm", null],
];

let fail = 0;
const rows = pairs.map(([use, fg, bg, min]) => {
  const r = ratio(T[fg], T[bg]);
  const status = min === null ? "INFO" : r >= min ? "PASS" : "FAIL";
  if (status === "FAIL") fail++;
  console.log(
    `${status}  ${r.toFixed(2).padStart(5)}  (min ${min ?? "-"})  ${fg} on ${bg}  — ${use}`,
  );
  return { use, fg, bg, ratio: Number(r.toFixed(2)), min, status };
});
const out = process.env.OUT ?? new URL("./out/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "contrast.json"), JSON.stringify(rows, null, 2));
process.exit(fail ? 1 : 0);
