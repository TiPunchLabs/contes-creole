/*
 * Mila's water: how the sea colours distance, carries the light and moves what lives in it.
 *
 * Four fragments below are adapted from "Abyssal Garden" by Maksymilian Dendura
 * (https://github.com/Noniv/abyssal-garden, commit a596354eff400d458bc2aeb9bdf5e0a9734b2bcf,
 * file source/src/shaders.js, WGSL, rewritten here in GLSL for Three.js). Each one carries an
 * "Adapted from" comment naming the upstream lines. They are used under its licence:
 *
 * MIT License
 *
 * Copyright (c) 2026 Maksymilian Dendura
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as THREE from "three";
import type { Rng } from "@shared/random";

type Uniform<T> = { value: T };

/** What every underwater shader reads; one set per scene, shared by all its materials. */
export interface SeaUniforms {
  /** 0 with the camera in the air, 1 under water. */
  uSea: Uniform<number>;
  /** Direction towards the light once it has entered the water (unit vector, pointing up). */
  uSeaSun: Uniform<THREE.Vector3>;
  /** Clock of the decorative motion (current, caustics, dust); slower under reduced motion. */
  uFlow: Uniform<number>;
  /** Amplitude of the decorative motion: 1, or less under reduced motion. */
  uSway: Uniform<number>;
}

/** Refractive index of sea water. */
const WATER_INDEX = 1.33;

/**
 * Direction towards the moon as seen from under a flat sea (Snell's law): the light of a low moon
 * comes down much more steeply in the water than in the air.
 */
export function seaLight(moon: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  const m = out.copy(moon).normalize();
  const sinAir = Math.hypot(m.x, m.z);
  if (sinAir < 1e-6) return out.set(0, 1, 0);
  const sinWater = sinAir / WATER_INDEX;
  const k = sinWater / sinAir;
  return out.set(m.x * k, Math.sqrt(1 - sinWater * sinWater), m.z * k);
}

/** Declares `uSeaSun` once, however many patches of one shader need it. */
export const SEA_SUN_GLSL = `#ifndef SEA_SUN
#define SEA_SUN
uniform vec3 uSeaSun;
#endif
`;

/**
 * The colour of the water along a ray, and what it does to a colour seen through it. Needs the
 * world-space vector from the camera to the fragment.
 *
 * Adapted from Abyssal Garden, source/src/shaders.js lines 194-217 (`SIG`, `fogIn`) and 266-269
 * (`fog`): the light a colour loses to the water is taken per channel, red first, and replaced by
 * light the water scatters in, which depends on the direction looked in, on the depth and on the
 * angle to the light. Simplified here: no ray integral, no shadow volume, and a short clear zone
 * near the camera so the characters keep their own colours.
 */
export const SEA_GLSL = `
uniform float uSea;
${SEA_SUN_GLSL}const vec3 SEA_SIG=vec3(.135,.058,.05);
const vec3 SEA_DEPTH=vec3(.1,.042,.032);
vec3 seaWater(vec3 rd,float y){
 vec3 c=mix(vec3(.01,.2,.225),vec3(.075,.42,.4),smoothstep(-.05,.9,rd.y));
 c=mix(c,vec3(.002,.05,.085),smoothstep(.1,-.55,rd.y));
 c*=exp(SEA_DEPTH*min(y,0.));
 float mu=max(dot(rd,uSeaSun),0.);
 return c*(1.+.5*mu*mu)+vec3(1.,.78,.5)*pow(mu,10.)*.12*exp(.1*min(y,0.));
}
vec3 seaFog(vec3 c,vec3 v){
 float d=length(v);vec3 T=exp(-SEA_SIG*d*d/(d+4.));
#ifdef SEA_ADDITIVE
 return c*T;
#else
 return c*T+seaWater(v/max(d,1e-4),cameraPosition.y+.8*v.y)*(1.-T);
#endif
}
`;

/**
 * Replaces the scene fog of `material` by the water above while the camera is under the surface.
 * Works on any material that includes Three.js' fog chunks (built-in or `ShaderMaterial`); what the
 * material already does in `onBeforeCompile` is kept.
 */
export function addSeaFog(material: THREE.Material, u: SeaUniforms): void {
  const inner = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  const additive = material.blending === THREE.AdditiveBlending;
  material.onBeforeCompile = (sh, renderer) => {
    inner.call(material, sh, renderer);
    sh.uniforms.uSea = u.uSea;
    sh.uniforms.uSeaSun = u.uSeaSun;
    sh.vertexShader =
      "varying vec3 vSeaV;\n" +
      sh.vertexShader.replace(
        "#include <fog_vertex>",
        "#include <fog_vertex>\n vSeaV=(vec4(mvPosition.xyz,0.)*viewMatrix).xyz;",
      );
    sh.fragmentShader =
      (additive ? "#define SEA_ADDITIVE\n" : "") +
      "varying vec3 vSeaV;\n" +
      SEA_GLSL +
      sh.fragmentShader.replace(
        "#include <fog_fragment>",
        `vec3 seaBase=gl_FragColor.rgb;
#include <fog_fragment>
 if(uSea>.001)gl_FragColor.rgb=mix(gl_FragColor.rgb,seaFog(seaBase,vSeaV),uSea);`,
      );
  };
  material.customProgramCacheKey = () => `${key}|sea${additive ? "+" : ""}`;
}

/**
 * The current every rooted plant shares: `seaSway(root, h, flex, seed)` is the sideways offset,
 * per metre of plant, at `h` (0 at the root, 1 at the tip) of a plant standing at `root`.
 *
 * Adapted from Abyssal Garden, source/src/shaders.js lines 389-393 (`sway`) and 423-425 (the
 * per-leaf bend and the ripple climbing the blade): one field for the whole sea bed, its phase
 * taken from the place of the root so neighbours move together, an amplitude growing faster than
 * the height so the root holds, and a delay up the plant so the tip follows the base instead of
 * the whole blade tilting at once. Added here: a steady lean down-current and a slow swell.
 */
export const SWAY_GLSL = `
uniform float uFlow,uSway;
const vec2 SEA_CURRENT=vec2(.92,.39);
vec2 seaSway(vec2 root,float h,float flex,float seed){
 float ph=dot(root,vec2(.5,.3));
 float lag=h*(1.1+seed*1.5);
 float swell=.6+.4*sin(uFlow*.21+dot(root,vec2(.09,-.06)));
 vec2 w=vec2(sin(uFlow*.8+ph-lag),cos(uFlow*.62+ph*1.3-lag*.8)*.55)
  +.3*vec2(sin(uFlow*1.9+ph*3.-lag*2.2+seed*6.3),cos(uFlow*1.6+ph*2.-lag*1.7+seed*4.));
 return (SEA_CURRENT*.42+w*.4*uSway)*swell*flex*pow(h,1.6);
}
`;

export type SeaDust = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

/** Side of the cube of water the dust lives in, centred on the camera (metres). */
const DUST_BOX = 14;

/**
 * Motes hanging in the water: a small cloud that wraps around the camera, so the water has the
 * same grain wherever the tale goes. They drift with the plants' current, fade out close to the
 * lens and into the distance, and take the pink of the conch when they pass by it.
 *
 * Adapted from Abyssal Garden, source/src/shaders.js lines 662-682 (`vsSnow`, `fsSnow`): the
 * wrapped volume, the per-mote wobble and the near and far fades.
 */
export function createSeaDust(
  rng: Rng,
  count: number,
  u: SeaUniforms,
  conch: Uniform<THREE.Vector3>,
  conchGlow: Uniform<number>,
): SeaDust {
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < seed.length; i++) seed[i] = rng();
  const geometry = new THREE.BufferGeometry();
  // Three.js wants a position attribute; the shader places each mote from its seed alone.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSea: u.uSea,
      uSeaSun: u.uSeaSun,
      uFlow: u.uFlow,
      uSway: u.uSway,
      uConch: conch,
      uConchGlow: conchGlow,
      uPx: { value: 1 },
    },
    vertexShader: `
attribute vec4 aSeed;uniform float uFlow,uSway,uPx,uSea,uConchGlow;uniform vec3 uConch;
varying float vA;varying vec3 vC;
const float B=${DUST_BOX.toFixed(1)};
void main(){
 vec3 p=aSeed.xyz*B+vec3(.92,.12,.39)*uFlow*.11
  +.35*uSway*vec3(sin(uFlow*.3+aSeed.x*60.),sin(uFlow*.23+aSeed.y*50.),cos(uFlow*.27+aSeed.z*70.));
 p=cameraPosition+(fract((p-cameraPosition)/B+.5)-.5)*B;
 vec4 mv=viewMatrix*vec4(p,1.);float d=length(mv.xyz);
 float size=.02+.034*aSeed.w*aSeed.w;
 float px=size*uPx/max(d,.1);
 gl_PointSize=clamp(px,1.5,9.);
 float tw=.7+.3*sin(uFlow*(.6+aSeed.w)+aSeed.x*100.);
 vA=smoothstep(B*.5,B*.3,d)*smoothstep(.9,2.6,d)*smoothstep(-.1,-.8,p.y)*min(1.,px/1.5)*tw*uSea;
 float near=smoothstep(1.3,.2,distance(p,uConch))*clamp(uConchGlow*1.6,0.,1.);
 vC=mix(vec3(.62,.95,.86),vec3(1.,.5,.56),near)*exp(vec3(.06,.03,.025)*min(p.y,0.))*(1.+near);
 gl_Position=projectionMatrix*mv;
}`,
    fragmentShader: `
varying float vA;varying vec3 vC;
void main(){float r=length(gl_PointCoord-.5)*2.;float m=smoothstep(1.,.15,r);gl_FragColor=vec4(vC*m*m*vA*.85,1.);}`,
  });
  const dust: SeaDust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  return dust;
}
