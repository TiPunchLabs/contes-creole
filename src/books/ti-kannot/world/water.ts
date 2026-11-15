import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { clamp } from "@shared/math";
import { createRng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { sunDirection, type MixedEnv } from "./env";
import { DAM } from "./island/source";
import { ISLAND_RADIUS, islandHeight, riverPoint } from "./island/terrain";

const NOISE = `float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }`;

// With REFLECT, the Reflector feeds the mirrored scene (tDiffuse, textureMatrix) and the
// translucent shallow water carries it, rippled; without, the water keeps its own colours.
const SEA_VERTEX = `varying vec3 vW; varying vec4 vRefl;
  #ifdef REFLECT
  uniform mat4 textureMatrix;
  #endif
  void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz;
    #ifdef REFLECT
    vRefl=textureMatrix*vec4(position,1.);
    #else
    vRefl=vec4(0.);
    #endif
    gl_Position=projectionMatrix*viewMatrix*w; }`;
const SEA_FRAGMENT = `uniform float uTime,uRadius; uniform vec3 cShallow,cDeep,cHorizon,cSun,uCam,uSunDir;
  varying vec3 vW; varying vec4 vRefl;
  #ifdef REFLECT
  uniform sampler2D tDiffuse; uniform vec3 color;
  #endif
  ${NOISE}
  float swellAt(vec2 p){ return noise(p*.35+vec2(uTime*.05,uTime*.03))+.5*noise(p*1.3-uTime*.08); }
  // A net of light: bright where two drifting layers of noise cross.
  float caustic(vec2 p){ float a=noise(p+vec2(uTime*.22,uTime*.15)),b=noise(p*1.7-vec2(uTime*.18,-uTime*.26)+3.1);
    return pow(clamp(1.-abs(a-b)*2.3,0.,1.),5.); }
  void main(){
    float r=length(vW.xz*vec2(1.,1.1))/uRadius;
    float n=swellAt(vW.xz);
    vec2 slope=vec2(swellAt(vW.xz+vec2(.35,0.))-n,swellAt(vW.xz+vec2(0.,.35))-n);
    vec3 N=normalize(vec3(-slope.x*1.6,1.,-slope.y*1.6));
    vec3 c=mix(cDeep,cShallow,smoothstep(1.6,.85,r));
    c=mix(c,cShallow*1.06+vec3(.04,.03,0.),smoothstep(.99,.87,r)*.55);
    // Sunlight dancing on the sandy shallows, fading as the bottom drops away.
    float lagoon=smoothstep(1.35,.9,r);
    c+=vec3(.95,1.,.86)*caustic(vW.xz*.55)*lagoon*.2;
    c*=1.+(n-.75)*.07;
    vec3 v=normalize(uCam-vW);
    float fres=pow(1.-max(dot(v,N),0.),3.);
    #ifdef REFLECT
    vec4 q=vRefl; q.xy+=(vec2(noise(vW.xz*.8+uTime*.3),noise(vW.zx*.8-uTime*.25))-.5)*q.w*.04;
    // The reflection keeps the water's own hue: a peach sky must not turn the turquoise grey.
    vec3 refl=texture2DProj(tDiffuse,q).rgb;
    c=mix(c,mix(cShallow,refl,.5)*vec3(.92,1.02,1.04),.15+fres*.25);
    #endif
    vec3 haze=mix(cShallow,cHorizon,.4);
    c=mix(c,haze,fres*.35);
    // Three broken lines of foam that breathe on the shore, the last one a thin lace.
    float swell=sin(uTime*.55)*.006;
    float f1=smoothstep(.024,0.,abs(r-.865-n*.03-swell))*smoothstep(.3,.62,noise(vW.xz*1.7+uTime*.05));
    float f2=smoothstep(.016,0.,abs(r-.905-n*.04+swell))*smoothstep(.42,.75,noise(vW.xz*1.2-uTime*.04));
    float f3=smoothstep(.012,0.,abs(r-.95-n*.05-swell*1.5))*smoothstep(.5,.8,noise(vW.xz*.9+uTime*.03));
    float lace=caustic(vW.xz*1.6)*smoothstep(.93,.87,r)*smoothstep(.8,.85,r);
    c=mix(c,vec3(1.,.99,.95),clamp(f1*.75+f2*.45+f3*.3+lace*.35,0.,.82));
    c+=cShallow*smoothstep(1.,1.3,n)*.1;
    vec3 h=normalize(v+uSunDir);
    float gloss=max(dot(N,h),0.);
    // The sun's path: a soft sheen, and sparks where a ripple turns just right.
    float spark=smoothstep(.72,.95,noise(vW.xz*5.+vec2(uTime*.9,-uTime*.6)));
    c+=cSun*(pow(gloss,260.)*(.3+n*.5)+pow(gloss,40.)*spark*.55+pow(gloss,10.)*.05);
    c=mix(c,haze,smoothstep(50.,200.,length(vW.xz-uCam.xz)));
    gl_FragColor=vec4(c,1.); }`;

const RIVER_VERTEX = `attribute float aSteep,aFlow,aDry; varying vec2 vUv; varying vec3 vW; varying float vSteep,vFlow,vDry;
  void main(){ vUv=uv; vSteep=aSteep; vFlow=aFlow; vDry=aDry; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
// Deeper in the middle, shallow and see-through over the bed at the edges. The current carries a
// net of light, streaks and a lace of foam along the banks; the surface takes the sky at a glancing
// angle and sparks in the sun. Where the bed drops (vSteep), the water runs faster and breaks white.
const RIVER_FRAGMENT = `uniform float uTime,uFlow,uLength; uniform vec3 cWater,cSky,cSun,uCam,uSunDir;
  varying vec2 vUv; varying vec3 vW; varying float vSteep,vFlow,vDry;
  ${NOISE}
  void main(){ float s=abs(vUv.x-.5)*2.;
    float deep=1.-smoothstep(0.,.85,s);
    // vFlow is how much of the current is left here (held back by the dam, spent by the drought):
    // without it the water neither breaks white nor draws streaks, it lies still.
    float fall=vSteep*uFlow*vFlow;
    vec2 f=vec2((vUv.x-.5)*3.,vUv.y*uLength*.5-uTime*(.55+fall*1.9));
    float w1=noise(f*vec2(2.2,1.1)),w2=noise(f*vec2(4.5,2.3)+7.);
    vec3 c=mix(cWater*1.18+vec3(.06,.05,-.02),cWater*vec3(.5,.74,.84),deep*.85);
    c*=.95+.1*noise(vW.xz*1.4);
    c+=vec3(.9,1.,.85)*pow(clamp(1.-abs(w1-w2)*2.4,0.,1.),5.)*(.1+.18*(1.-deep))*(1.-fall);
    vec3 n=normalize(vec3((w1-noise((f+vec2(.08,0.))*vec2(2.2,1.1)))*3.,1.,(w1-noise((f+vec2(0.,.08))*vec2(2.2,1.1)))*3.));
    vec3 v=normalize(uCam-vW);
    c=mix(c,cSky,pow(1.-max(dot(v,n),0.),3.)*.45);
    c+=cSun*pow(max(dot(n,normalize(v+uSunDir)),0.),90.)*.6;
    float streak=smoothstep(.62,.92,noise(vec2(vUv.x*7.,f.y*3.2)))*(1.-s*.7);
    c=mix(c,vec3(1.),streak*(.2+fall*.4)*vFlow);
    float froth=smoothstep(.25,.75,noise(vec2(vUv.x*9.,f.y*7.)))*.6+.4;
    c=mix(c,vec3(.97,1.,.99),fall*froth*.72);
    float lace=smoothstep(.8,.92,s+(noise(vec2(vUv.x*3.,f.y*2.5))-.5)*.3)*smoothstep(1.,.93,s);
    c=mix(c,vec3(1.,.99,.96),lace*.32*uFlow*(1.-fall)*vFlow);
    float alpha=mix(.92*(1.-smoothstep(.7,1.,s)*.7),.96,fall);
    // Where the river runs dry (vDry) the thread breaks into puddles with bare bed between them.
    float puddle=smoothstep(.34,.58,noise(vec2(3.7,vUv.y*uLength*.5)));
    gl_FragColor=vec4(c,alpha*smoothstep(1.,.93,s)*mix(1.,puddle,vDry)); }`;

const SEGMENTS = 200;
/** Quads across the ribbon. */
const ACROSS = 6;
/** The ribbon reaches a little past the water's edge, where it fades into the bank. */
const MARGIN = 1.12;
const SPRAY_COUNT = 70;
const SHALLOW = new THREE.Color("#a6ecd2");
const DEEP = new THREE.Color("#3bb8bf");
const RIVER = new THREE.Color("#6fd2cc");
/** River slope (height per unit of length) at which the water is all white cascade. */
const CASCADE_SLOPE = 0.55;
const MUDDY = new THREE.Color("#a7b48a");

const SEA_SIZE = 500;
const REFLECTION_SIZE = 768;

/** Length of the river's centre line, in world units. */
function riverLength(): number {
  const a = new THREE.Vector2();
  const b = new THREE.Vector2();
  let length = 0;
  for (let i = 0; i < 100; i++)
    length += riverPoint(i / 100, a).distanceTo(riverPoint((i + 1) / 100, b));
  return length;
}

/** 0 below `a`, 1 above `b`, eased in between. */
const ramp = (v: number, a: number, b: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface Reach {
  /** Width of the water as a share of the full river's. */
  width: number;
  /** Height of the surface above the bed's lowest line. */
  level: number;
  /** How much of the current is left (1 = running freely, 0 = still). */
  flow: number;
  /** How broken the water is (0 = one ribbon, 1 = scattered puddles). */
  dry: number;
}

/**
 * The river at `t` along its course (0 = source, 1 = mouth) for a water level and a dam weight.
 * The level tells the season: full, low after weeks without rain, a thread in the drought. The
 * dam tells who holds the water: above it the river is held back in a still pond, below it the bed
 * is all but dry, a broken trickle, whatever the season.
 */
export function riverReach(t: number, water: number, dam: number): Reach {
  const below = dam * ramp(t, DAM.t - 0.012, DAM.t + 0.012);
  const pond = dam * (1 - ramp(t, DAM.t - 0.012, DAM.t + 0.012));
  const season = clamp(1 + water * 0.62, 0.1, 1.2);
  const drought = ramp(-water, 1.0, 1.35);
  return {
    width: season * (1 - 0.82 * below) * (1 + 0.5 * pond),
    level: (0.55 + water * 0.35) * (1 - 0.86 * below) + 0.22 * pond,
    flow: clamp(1 + water * 0.7, 0.12, 1) * (1 - 0.88 * below) * (1 - 0.75 * pond),
    dry: Math.max(drought * 0.85, below * 0.9),
  };
}

/** Uniforms shared by both sea variants. */
function seaUniforms(): Record<string, THREE.IUniform> {
  return {
    uTime: { value: 0 },
    uRadius: { value: ISLAND_RADIUS },
    cShallow: { value: SHALLOW.clone() },
    cDeep: { value: DEEP.clone() },
    cHorizon: { value: new THREE.Color() },
    cSun: { value: new THREE.Color() },
    uCam: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  };
}

/** The sea: a mirror of the island when `reflect`, else a plain painted surface. */
function createSea(reflect: boolean): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE);
  const sea = reflect
    ? new Reflector(geometry, {
        textureWidth: REFLECTION_SIZE,
        textureHeight: REFLECTION_SIZE,
        clipBias: 0.003,
        multisample: 0,
        shader: {
          name: "IslandSea",
          uniforms: {
            ...seaUniforms(),
            color: { value: null },
            tDiffuse: { value: null },
            textureMatrix: { value: null },
          },
          vertexShader: `#define REFLECT\n${SEA_VERTEX}`,
          fragmentShader: `#define REFLECT\n${SEA_FRAGMENT}`,
        },
      })
    : new THREE.Mesh(
        geometry,
        new THREE.ShaderMaterial({
          uniforms: seaUniforms(),
          vertexShader: SEA_VERTEX,
          fragmentShader: SEA_FRAGMENT,
        }),
      );
  sea.rotation.x = -Math.PI / 2;
  return sea as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
}

/** Sea around the island and the river ribbon whose width and level follow `env.water`. */
export function createWater({ reflect }: { reflect: boolean }): {
  group: THREE.Group;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
  /** Frees the reflection's render target (the scene disposal handles the rest). */
  dispose(): void;
} {
  const sea = createSea(reflect);
  const seaMaterial = sea.material;

  const riverGeometry = new THREE.BufferGeometry();
  const row = ACROSS + 1;
  const positions = new Float32Array((SEGMENTS + 1) * row * 3);
  const uvs = new Float32Array((SEGMENTS + 1) * row * 2);
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    for (let j = 0; j < row; j++) {
      uvs.set([j / ACROSS, i / SEGMENTS], (i * row + j) * 2);
      if (i < SEGMENTS && j < ACROSS) {
        const k = i * row + j;
        index.push(k, k + row, k + 1, k + 1, k + row, k + row + 1);
      }
    }
  }
  riverGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  riverGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  const steep = new Float32Array((SEGMENTS + 1) * row);
  riverGeometry.setAttribute("aSteep", new THREE.BufferAttribute(steep, 1));
  const flow = new Float32Array((SEGMENTS + 1) * row);
  const dry = new Float32Array((SEGMENTS + 1) * row);
  riverGeometry.setAttribute("aFlow", new THREE.BufferAttribute(flow, 1));
  riverGeometry.setAttribute("aDry", new THREE.BufferAttribute(dry, 1));
  const heights = new Float32Array(SEGMENTS + 1);
  const centres: THREE.Vector2[] = [];
  riverGeometry.setIndex(index);
  const riverMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 1 },
      uLength: { value: riverLength() },
      cWater: { value: RIVER.clone() },
      cSky: { value: new THREE.Color() },
      cSun: { value: new THREE.Color() },
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: RIVER_VERTEX,
    fragmentShader: RIVER_FRAGMENT,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const river = new THREE.Mesh(riverGeometry, riverMaterial);
  river.frustumCulled = false;

  const p = new THREE.Vector2();
  const q = new THREE.Vector2();
  let lastWater = Infinity;
  let lastDam = Infinity;

  /**
   * Rebuilds the ribbon for a water level and a dam: narrower and lower as the river dries, held
   * back above the dam and all but cut below it.
   */
  const shape = (water: number, dam: number): void => {
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      riverPoint(t, p);
      if (t < 1) riverPoint(t + 0.005, q).sub(p);
      else q.copy(p).sub(riverPoint(t - 0.005, q));
      q.normalize();
      const reach = riverReach(t, water, dam);
      const half = Math.max(((1.5 + t * 1.2) / 2) * reach.width * MARGIN, 0.06);
      const y = Math.max(islandHeight(p.x, p.y) + reach.level, 0.02);
      flow.fill(reach.flow, i * row, (i + 1) * row);
      dry.fill(reach.dry, i * row, (i + 1) * row);
      for (let j = 0; j < row; j++) {
        const k = (1 - (j / ACROSS) * 2) * half;
        positions.set([p.x + q.y * k, y, p.y - q.x * k], (i * row + j) * 3);
      }
      heights[i] = y;
      (centres[i] ??= new THREE.Vector2()).copy(p);
    }
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = Math.max(i - 1, 0);
      const b = Math.min(i + 1, SEGMENTS);
      const drop = (heights[a] - heights[b]) / Math.max(centres[a].distanceTo(centres[b]), 1e-3);
      // a cascade needs a current: where the water is held back or spent, it does not break
      const run = clamp(flow[i * row] * 1.6, 0, 1);
      steep.fill(clamp(drop / CASCADE_SLOPE, 0, 1) * run, i * row, (i + 1) * row);
    }
    placeSpray();
    riverGeometry.getAttribute("position").needsUpdate = true;
    riverGeometry.getAttribute("aSteep").needsUpdate = true;
    riverGeometry.getAttribute("aFlow").needsUpdate = true;
    riverGeometry.getAttribute("aDry").needsUpdate = true;
  };

  // Spray: droplets hanging in the air over the white water, where the cascades run.
  const sprayRng = createRng(53);
  const spray = glowPoints(sprayRng, SPRAY_COUNT, () => [0, 0, 0], {
    size: 0.3,
    drift: 0.22,
    a: "#ffffff",
    b: "#dff6f2",
  });
  const sprayAt = Array.from({ length: SPRAY_COUNT }, () => [
    sprayRng(),
    sprayRng() - 0.5,
    sprayRng(),
  ]);
  /** Moves the droplets onto the steepest reaches of the current ribbon. */
  function placeSpray(): void {
    const white: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) if (steep[i * row] > 0.45) white.push(i);
    const at = spray.geometry.getAttribute("position");
    sprayAt.forEach(([along, across, lift], k) => {
      const i = white.length ? white[Math.floor(along * white.length)] : 0;
      const a = i * row * 3;
      const b = a + ACROSS * 3;
      const u = 0.5 + across * 0.7;
      at.setXYZ(
        k,
        positions[a] + (positions[b] - positions[a]) * u,
        white.length ? heights[i] + 0.1 + lift * 0.7 : -50,
        positions[a + 2] + (positions[b + 2] - positions[a + 2]) * u,
      );
    });
    at.needsUpdate = true;
  }

  const group = new THREE.Group();
  group.add(sea, river, spray);
  const u = seaMaterial.uniforms;
  return {
    group,
    update(env, time, camera) {
      if (Math.abs(env.water - lastWater) > 0.004 || Math.abs(env.dam - lastDam) > 0.004) {
        lastWater = env.water;
        lastDam = env.dam;
        shape(env.water, env.dam);
      }
      u.uTime.value = time;
      u.uCam.value.copy(camera);
      u.cHorizon.value.copy(env.horizon);
      u.cSun.value.copy(env.sunColor).multiplyScalar(1 - env.night * 0.6);
      sunDirection(env, u.uSunDir.value);
      u.cShallow.value.copy(SHALLOW).lerp(env.horizon, env.night * 0.5);
      u.cDeep.value.copy(DEEP).lerp(env.zenith, env.night * 0.6);
      const ru = riverMaterial.uniforms;
      ru.uCam.value.copy(camera);
      ru.uSunDir.value.copy(u.uSunDir.value);
      ru.cSun.value.copy(u.cSun.value);
      ru.cSky.value.copy(env.horizon).lerp(env.zenith, 0.35);
      spray.material.uniforms.uTime.value = time;
      spray.material.uniforms.uOpacity.value =
        clamp(1 + env.water * 0.7, 0, 1) * (0.5 - env.night * 0.3);
      riverMaterial.uniforms.uTime.value = time;
      // A thread of water still tumbles, but it no longer breaks white.
      // the pace of the whole river: slower as it dries, and slower still once the dam is up
      riverMaterial.uniforms.uFlow.value =
        clamp(1 + env.water * 0.7, 0.25, 1) * (1 - env.dam * 0.5);
      riverMaterial.uniforms.cWater.value.copy(RIVER).lerp(MUDDY, clamp(-env.water, 0, 1) * 0.5);
    },
    dispose() {
      if (sea instanceof Reflector) sea.dispose();
    },
  };
}
