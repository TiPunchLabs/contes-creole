// Prints Mila's scene source with a read-only probe added, for a measurement build that is never
// committed or shipped: `window.__mila` then gives qa/mila-clearance.mjs the living forms and the
// solids of the running scene. The probe goes right before the scene's `update()`, a line present
// in every version since the tale was added, so one build of an older commit can be measured the
// same way.
// Usage: node qa/mila-probe-inject.mjs path/to/scene.ts > probed-scene.ts
//   (build the probed copy with `pnpm exec vite build --outDir <dir>`: the probe is not typed)
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: node qa/mila-probe-inject.mjs path/to/scene.ts");
const src = readFileSync(file, "utf8");
const ANCHOR = "  function update(): void {\n";
if (src.split(ANCHOR).length !== 2) throw new Error("anchor `function update()` not found once");
const has = (name) => new RegExp(`\\b(const|let) ${name}\\b`).test(src);
const optional = ["camera", "solids", "freed"]
  .filter(has)
  .map((n) => `get ${n}() { return ${n}; },`)
  .join(" ");
const probe = `  // PROBE added by qa/mila-probe-inject.mjs: never committed
  (globalThis as unknown as Record<string, unknown>).__mila = {
    THREE, scene, groundH, rockMat, ${optional}
    get mila() { return mila; }, get turtle() { return turtle; }, get fish() { return fish; },
    get school() { return school; }, get crab() { return crab; }, get debris() { return debris; },
    get liveConch() { return liveConch; }, get pearl() { return pearl; },
    get bigConch() { return bigConch; }, get page() { return page; },
    get moving() { return !!trans; },
  };
`;
process.stdout.write(src.replace(ANCHOR, probe + ANCHOR));
