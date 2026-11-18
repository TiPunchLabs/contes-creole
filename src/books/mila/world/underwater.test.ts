import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { addSeaFog, seaLight, type SeaUniforms } from "./underwater";

const uniforms = (): SeaUniforms => ({
  uSea: { value: 0 },
  uSeaSun: { value: new THREE.Vector3(0, 1, 0) },
  uFlow: { value: 0 },
  uSway: { value: 1 },
});

/** The shader object Three.js hands to `onBeforeCompile`, reduced to what the patch touches. */
const shader = (): {
  uniforms: Record<string, unknown>;
  vertexShader: string;
  fragmentShader: string;
} => ({
  uniforms: {},
  vertexShader: "void main(){\n#include <fog_vertex>\n}",
  fragmentShader: "void main(){\n#include <fog_fragment>\n}",
});
type Hook = (sh: ReturnType<typeof shader>, renderer: unknown) => void;
const compile = (m: THREE.Material): ReturnType<typeof shader> => {
  const sh = shader();
  (m.onBeforeCompile as unknown as Hook)(sh, null);
  return sh;
};

describe("seaLight", () => {
  it("bends a low moon towards the vertical and keeps its bearing", () => {
    const moon = new THREE.Vector3(0.02, 0.42, -1).normalize();
    const l = seaLight(moon);
    expect(l.length()).toBeCloseTo(1, 12);
    expect(l.y).toBeGreaterThan(moon.y);
    expect(Math.atan2(l.x, l.z)).toBeCloseTo(Math.atan2(moon.x, moon.z), 12);
    // Snell: sin(air) = 1.33 sin(water)
    expect(Math.hypot(moon.x, moon.z) / Math.hypot(l.x, l.z)).toBeCloseTo(1.33, 12);
  });

  it("never comes down flatter than the critical angle, and stays vertical under a zenith moon", () => {
    const grazing = seaLight(new THREE.Vector3(1, 0, 0));
    expect(Math.hypot(grazing.x, grazing.z)).toBeCloseTo(1 / 1.33, 12);
    expect(seaLight(new THREE.Vector3(0, 1, 0)).toArray()).toEqual([0, 1, 0]);
  });
});

describe("addSeaFog", () => {
  it("keeps what the material already did before compiling and adds the water", () => {
    const m = new THREE.MeshLambertMaterial();
    m.onBeforeCompile = (sh) => {
      sh.uniforms.mine = { value: 1 };
    };
    const u = uniforms();
    addSeaFog(m, u);
    const sh = compile(m);
    expect(sh.uniforms.mine).toEqual({ value: 1 });
    expect(sh.uniforms.uSea).toBe(u.uSea);
    expect(sh.vertexShader).toContain("vSeaV=");
    expect(sh.fragmentShader).toContain("seaFog(seaBase,vSeaV)");
    expect(sh.fragmentShader).toContain("#include <fog_fragment>");
  });

  it("gives materials patched differently before it different programs", () => {
    const a = new THREE.MeshLambertMaterial();
    const b = new THREE.MeshLambertMaterial();
    b.onBeforeCompile = (sh) => {
      sh.vertexShader += "// other";
    };
    const plain = new THREE.MeshLambertMaterial();
    const glow = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending });
    const u = uniforms();
    [a, b, plain, glow].forEach((m) => addSeaFog(m, u));
    expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey());
    expect(a.customProgramCacheKey()).toBe(plain.customProgramCacheKey());
    // additive light is only dimmed by the water, never tinted towards it
    expect(compile(glow).fragmentShader).toContain("#define SEA_ADDITIVE");
    expect(compile(a).fragmentShader).not.toContain("#define SEA_ADDITIVE");
    expect(glow.customProgramCacheKey()).not.toBe(
      new THREE.MeshBasicMaterial().customProgramCacheKey(),
    );
  });
});
