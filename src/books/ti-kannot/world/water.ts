import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints, type GlowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { MixedEnv } from "./env";
import { meander } from "./terrain";
import { VALLEY_LENGTH, VALLEY_WIDTH } from "./valley";

const VERTEX = `uniform float uTime; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.); w.y+=sin(w.x*.7+uTime*1.1)*.05+sin(w.z*.5-uTime*.8)*.06; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FRAGMENT = `uniform float uTime,uGlow,uFogD; uniform vec3 cDeep,cShallow,uMoon,cMoon,uFog,uCam; varying vec3 vW;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.98,78.23)))*43758.5); }
  void main(){ vec3 vd=normalize(uCam-vW); float fr=pow(1.-max(vd.y,0.),3.);
    vec3 c=mix(cDeep,cShallow,.25+fr*.6);
    vec2 dm=vW.xz-uMoon.xz; float streak=exp(-abs(dm.x+sin(vW.z*.6+uTime)*1.2)*.32)*clamp(1.-abs(dm.y)/90.,0.,1.);
    float shim=.5+.5*sin(vW.z*3.+uTime*3.+sin(vW.x*2.+uTime)); c+=cMoon*streak*shim*.8;
    float r=sin(vW.x*3.+uTime*1.6)*sin(vW.z*3.5-uTime*1.3); c+=cShallow*smoothstep(.86,1.,r)*.6;
    vec2 cell=floor(vW.xz*2.); vec2 fp=fract(vW.xz*2.)-.5; float n=hash(cell); c+=vec3(.35,.95,.85)*step(.975,n)*smoothstep(.22,.04,length(fp))*(.5+.5*sin(uTime*2.+n*60.))*uGlow;
    float dist=distance(uCam,vW); float f=1.-exp(-dist*dist*uFogD*uFogD); c=mix(c,uFog,f);
    gl_FragColor=vec4(c,.94); }`;

export interface Mist {
  sprite: THREE.Sprite;
  phase: number;
}

/** Plankton cloud over the river. Built apart so the mount keeps the v13 order of random draws. */
export function createPlankton(rng: Rng): GlowPoints {
  return glowPoints(
    rng,
    1400,
    () => {
      const z = 30 - rng() * 240;
      return [meander(z) + (rng() - 0.5) * 14, 0.1 + rng() * 3.5, z];
    },
    { size: 0.16, drift: 0.9, a: "#7af0dc", b: "#ffe6a0" },
  );
}

/** Sixteen low mist sprites along the river. Built apart, like the plankton. */
export function createMists(rng: Rng): Mist[] {
  return Array.from({ length: 16 }, () => {
    const z = 20 - rng() * 220;
    const sprite = softSprite("#4aa08a", 12 + rng() * 14, 0.14, false);
    sprite.position.set(meander(z) + (rng() - 0.5) * 18, 0.6 + rng() * 1.2, z);
    return { sprite, phase: rng() * 6.28 };
  });
}

/** River surface with moon streak and plankton sparkles, plankton cloud and low mist. */
export function createRiver(
  plankton: GlowPoints,
  mists: Mist[],
): {
  group: THREE.Group;
  update(env: MixedEnv, time: number, camera: THREE.Vector3, moon: THREE.Vector3): void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      cDeep: { value: new THREE.Color("#0a3a44") },
      cShallow: { value: new THREE.Color("#2e8a8c") },
      uMoon: { value: new THREE.Vector3(0, 10, -70) },
      cMoon: { value: new THREE.Color("#fff1c8") },
      uGlow: { value: 1 },
      uFog: { value: new THREE.Color("#2f8a8c") },
      uFogD: { value: 0.016 },
      uCam: { value: new THREE.Vector3() },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
  });
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(VALLEY_WIDTH, VALLEY_LENGTH, 60, 100),
    material,
  );
  water.rotation.x = -Math.PI / 2;
  water.position.z = -VALLEY_LENGTH / 2 + 40;
  const group = new THREE.Group();
  group.add(water, plankton, ...mists.map((m) => m.sprite));
  const shallow = new THREE.Color("#2e8a8c");
  const deep = new THREE.Color("#0a3a44");
  const u = material.uniforms;
  return {
    group,
    update(env, time, cam, moon) {
      water.position.y = env.water;
      u.uTime.value = time;
      u.uCam.value.copy(cam);
      u.uGlow.value = env.glow;
      u.cShallow.value.copy(env.bot).lerp(shallow, 0.5);
      u.cDeep.value.copy(env.top).lerp(deep, 0.5);
      u.uFog.value.copy(env.bot);
      u.uMoon.value.copy(moon);
      u.cMoon.value.copy(env.moonColor);
      plankton.material.uniforms.uTime.value = time;
      plankton.material.uniforms.uOpacity.value = env.glow;
      for (const { sprite, phase } of mists) {
        sprite.material.opacity =
          (0.1 + Math.sin(time * 0.3 + phase) * 0.04) * (1 - env.warm * 0.6);
        sprite.position.y = env.water + 0.8 + Math.sin(time * 0.2 + phase) * 0.3;
      }
    },
  };
}
