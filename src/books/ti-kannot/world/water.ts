import * as THREE from "three";
import { clamp } from "@shared/math";
import { sunDirection, type MixedEnv } from "./env";
import { ISLAND_RADIUS, islandHeight, riverPoint } from "./island/terrain";

const NOISE = `float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }`;

const SEA_VERTEX = `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const SEA_FRAGMENT = `uniform float uTime,uRadius; uniform vec3 cShallow,cDeep,cHorizon,cSun,uCam,uSunDir; varying vec3 vW;
  ${NOISE}
  void main(){
    float r=length(vW.xz*vec2(1.,1.1))/uRadius;
    float n=noise(vW.xz*.35+vec2(uTime*.05,uTime*.03))+.5*noise(vW.xz*1.3-uTime*.08);
    vec3 c=mix(cDeep,cShallow,smoothstep(1.6,.85,r));
    c=mix(c,vec3(1.),smoothstep(.07,0.,abs(r-.87-n*.04))*.75);
    c+=cShallow*smoothstep(1.,1.3,n)*.2;
    vec3 v=normalize(uCam-vW); vec3 h=normalize(v+uSunDir);
    c+=cSun*pow(max(h.y,0.),400.)*(.4+n);
    c=mix(c,cHorizon,pow(1.-max(v.y,0.),4.)*.7);
    c=mix(c,cHorizon,smoothstep(60.,220.,length(vW.xz-uCam.xz)));
    gl_FragColor=vec4(c,1.); }`;

const RIVER_VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RIVER_FRAGMENT = `uniform float uTime; uniform vec3 cWater; varying vec2 vUv;
  void main(){ float s=abs(vUv.x-.5)*2.; vec3 c=mix(cWater*1.2,cWater,s);
    float flow=sin(vUv.y*220.-uTime*3.+sin(vUv.x*9.+vUv.y*40.)*1.5);
    c=mix(c,vec3(1.),smoothstep(.85,1.,flow)*.35); gl_FragColor=vec4(c,.9); }`;

const SEGMENTS = 120;
const SHALLOW = new THREE.Color("#7fdccc");
const DEEP = new THREE.Color("#2f9fa6");
const RIVER = new THREE.Color("#79d3cf");
const MUDDY = new THREE.Color("#a7b48a");

/** Sea around the island and the river ribbon whose width and level follow `env.water`. */
export function createWater(): {
  group: THREE.Group;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const seaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: ISLAND_RADIUS },
      cShallow: { value: SHALLOW.clone() },
      cDeep: { value: DEEP.clone() },
      cHorizon: { value: new THREE.Color() },
      cSun: { value: new THREE.Color() },
      uCam: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    },
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), seaMaterial);

  const riverGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array((SEGMENTS + 1) * 2 * 3);
  const uvs = new Float32Array((SEGMENTS + 1) * 2 * 2);
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    uvs.set([0, i / SEGMENTS, 1, i / SEGMENTS], i * 4);
    if (i < SEGMENTS) {
      const k = i * 2;
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  riverGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  riverGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  riverGeometry.setIndex(index);
  const riverMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, cWater: { value: RIVER.clone() } },
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

  /** Rebuilds the ribbon for a water level: narrower and lower as the river dries. */
  const shape = (water: number): void => {
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      riverPoint(t, p);
      if (t < 1) riverPoint(t + 0.005, q).sub(p);
      else q.copy(p).sub(riverPoint(t - 0.005, q));
      q.normalize();
      const half = ((1.5 + t * 1.2) / 2) * clamp(1 + water * 0.55, 0.22, 1.2);
      const y = Math.max(islandHeight(p.x, p.y) + 0.55 + water * 0.35, 0.02);
      positions.set(
        [p.x + q.y * half, y, p.y - q.x * half, p.x - q.y * half, y, p.y + q.x * half],
        i * 6,
      );
    }
    riverGeometry.getAttribute("position").needsUpdate = true;
  };

  const group = new THREE.Group();
  group.add(sea, river);
  const u = seaMaterial.uniforms;
  return {
    group,
    update(env, time, camera) {
      if (Math.abs(env.water - lastWater) > 0.004) {
        lastWater = env.water;
        shape(env.water);
      }
      u.uTime.value = time;
      u.uCam.value.copy(camera);
      u.cHorizon.value.copy(env.horizon);
      u.cSun.value.copy(env.sunColor).multiplyScalar(1 - env.night * 0.6);
      sunDirection(env, u.uSunDir.value);
      u.cShallow.value.copy(SHALLOW).lerp(env.horizon, env.night * 0.5);
      u.cDeep.value.copy(DEEP).lerp(env.zenith, env.night * 0.6);
      riverMaterial.uniforms.uTime.value = time;
      riverMaterial.uniforms.cWater.value.copy(RIVER).lerp(MUDDY, clamp(-env.water, 0, 1) * 0.5);
    },
  };
}
