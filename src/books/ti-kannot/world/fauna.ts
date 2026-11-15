import * as THREE from "three";
import { createRng } from "@shared/random";
import type { MixedEnv } from "./env";

// Each creature is two wing quads. The vertex shader flies it on a wobbling loop around its home,
// turns it to face where it goes and beats its wings; the fragment shader cuts the wing's outline.
const VERTEX = `attribute vec3 aHome,aTint; attribute vec4 aSeed; attribute float aSize;
  uniform float uTime,uShow,uBob,uBeat,uLift;
  varying vec2 vUv; varying vec3 vTint; varying float vLight;
  void main(){
    float ph=aSeed.x*6.283,R=aSeed.y,t=uTime*aSeed.z+ph;
    vec3 c=aHome+vec3(sin(t)*R,sin(t*2.3+ph)*R*uBob,cos(t*.8+ph*.5)*R);
    vec2 d=normalize(vec2(cos(t),-sin(t*.8+ph*.5)*.8)+1e-4);
    float beat=sin(uTime*aSeed.w+ph*3.)*uBeat+uLift;
    float span=position.x*aSize*uShow;
    vec3 l=vec3(span*cos(beat),abs(span)*sin(beat),position.z*aSize*uShow);
    vec3 w=c+vec3(l.x*d.y+l.z*d.x,l.y,-l.x*d.x+l.z*d.y);
    vUv=uv; vTint=aTint; vLight=.82+.18*cos(beat);
    gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`;
const FRAGMENT = `uniform float uKind; uniform vec3 cFog; uniform float uFog;
  varying vec2 vUv; varying vec3 vTint; varying float vLight;
  void main(){
    float inside; vec3 c=vTint;
    if(uKind<.5){
      // Butterfly: a large fore wing and a rounder hind wing, dark-edged, with one pale spot.
      float fore=length((vUv-vec2(.48,.66))/vec2(.5,.32)),hind=length((vUv-vec2(.36,.26))/vec2(.36,.25));
      float m=min(fore,hind); inside=1.-m;
      c=mix(c*.35,c,smoothstep(1.,.72,m));
      c=mix(c,vec3(1.,.97,.85),smoothstep(.16,.08,length(vUv-vec2(.62,.68))));
    } else {
      // Frigatebird: a long, narrow wing, crooked at the wrist and swept back to a point.
      float chord=.17*(1.-vUv.x*.88);
      inside=chord-abs(vUv.y-.52-.2*sin(vUv.x*3.1416)+vUv.x*.34);
    }
    if(inside<0.) discard;
    gl_FragColor=vec4(mix(c*vLight,cFog,uFog),1.); }`;

interface Flight {
  /** 0 = butterfly, 1 = frigatebird. */
  kind: 0 | 1;
  /** Vertical wobble as a share of the loop's radius. */
  bob: number;
  /** Wing beat amplitude and resting dihedral, in radians. */
  beat: number;
  lift: number;
}

interface Flyer {
  home: readonly [number, number, number];
  radius: number;
  speed: number;
  rate: number;
  size: number;
  tint: string;
}

/** One mesh carrying every creature of a kind. */
function flyers(list: Flyer[], flight: Flight, rng: () => number): THREE.Mesh {
  const n = list.length;
  const position = new Float32Array(n * 8 * 3);
  const uv = new Float32Array(n * 8 * 2);
  const home = new Float32Array(n * 8 * 3);
  const tint = new Float32Array(n * 8 * 3);
  const seed = new Float32Array(n * 8 * 4);
  const size = new Float32Array(n * 8);
  const index: number[] = [];
  const color = new THREE.Color();
  list.forEach((f, i) => {
    const phase = rng();
    color.set(f.tint);
    for (let wing = 0; wing < 2; wing++) {
      const side = wing ? 1 : -1;
      for (let k = 0; k < 4; k++) {
        const v = i * 8 + wing * 4 + k;
        const u = k % 2;
        const w = k < 2 ? 0 : 1;
        position.set([side * u, 0, w - 0.5], v * 3);
        uv.set([u, w], v * 2);
        home.set(f.home, v * 3);
        color.toArray(tint, v * 3);
        seed.set([phase, f.radius, f.speed, f.rate], v * 4);
        size[v] = f.size;
      }
      const o = i * 8 + wing * 4;
      index.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute("aHome", new THREE.BufferAttribute(home, 3));
  geometry.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uShow: { value: 1 },
        uKind: { value: flight.kind },
        uBob: { value: flight.bob },
        uBeat: { value: flight.beat },
        uLift: { value: flight.lift },
        cFog: { value: new THREE.Color() },
        uFog: { value: 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}

const BUTTERFLY_TINTS = ["#f6c531", "#f28a2e", "#fdf6e3", "#5aa9e6", "#f6c531", "#e8553d"];
const MAX_BUTTERFLIES = 18;
const FRIGATES = 4;

/**
 * The island's small life: butterflies around the flowers (`flowers`: x, y, z of each bloom) and
 * frigatebirds gliding high over the sea. They leave at night and in the rain.
 */
export function createFauna(flowers: readonly (readonly [number, number, number])[]): {
  group: THREE.Group;
  update(env: MixedEnv, time: number): void;
} {
  const rng = createRng(73);
  const step = Math.max(1, Math.floor(flowers.length / MAX_BUTTERFLIES));
  const butterflies = flyers(
    flowers
      .filter((_, i) => i % step === 0)
      .slice(0, MAX_BUTTERFLIES)
      .map(([x, y, z], i) => ({
        home: [x, y + 0.9 + rng() * 0.6, z] as const,
        radius: 0.6 + rng() * 0.8,
        speed: 0.45 + rng() * 0.5,
        rate: 13 + rng() * 7,
        size: 0.13 + rng() * 0.06,
        tint: BUTTERFLY_TINTS[i % BUTTERFLY_TINTS.length],
      })),
    { kind: 0, bob: 0.35, beat: 1.05, lift: 0.25 },
    rng,
  );
  const frigates = flyers(
    Array.from({ length: FRIGATES }, (_, i) => ({
      home: [(rng() - 0.5) * 20, 15 + i * 2.5, (rng() - 0.5) * 20 - 6] as const,
      radius: 17 + rng() * 10,
      speed: 0.07 + rng() * 0.04,
      rate: 1.6 + rng(),
      size: 1.5 + rng() * 0.5,
      tint: "#2f2c36",
    })),
    { kind: 1, bob: 0.06, beat: 0.2, lift: 0.12 },
    rng,
  );
  const group = new THREE.Group();
  group.add(butterflies, frigates);
  return {
    group,
    update(env, time) {
      const fair = (1 - env.night) * (1 - env.rain);
      const bu = butterflies.material as THREE.ShaderMaterial;
      bu.uniforms.uTime.value = time;
      bu.uniforms.uShow.value = fair * (1 - env.wilt * 0.5);
      const fu = frigates.material as THREE.ShaderMaterial;
      fu.uniforms.uTime.value = time;
      fu.uniforms.uShow.value = 1 - env.night;
      // Far above the sea, the frigates take the haze of the sky.
      fu.uniforms.cFog.value.copy(env.horizon);
      fu.uniforms.uFog.value = 0.3;
    },
  };
}
