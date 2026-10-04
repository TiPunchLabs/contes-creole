import * as THREE from "three";
import type { Rng } from "../random";

export interface GlowOptions {
  size?: number;
  a?: string;
  b?: string;
  drift?: number;
  rain?: boolean;
  fall?: number;
}

export type GlowPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

const VERTEX = `attribute float aPhase, aSize, aMix; uniform float uTime, uSize, uDrift, uFall; varying float vPhase, vMix, vNear;
  void main(){ vPhase=aPhase; vMix=aMix; vec3 p=position;
    p.x+=sin(uTime*.4+aPhase*6.283)*uDrift; p.y+=cos(uTime*.3+aPhase*9.4)*uDrift*.6; p.z+=sin(uTime*.35+aPhase*4.1)*uDrift;
    if(uFall>0.){ p.y=mod(p.y-uTime*uFall+aPhase*20., 20.); }
    vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(aSize*uSize*(320./-mv.z), 26.); vNear=smoothstep(1.5,5.,-mv.z); }`;

const FRAGMENT = `uniform vec3 cA,cB; uniform float uTime,uOpacity,uRain; varying float vPhase,vMix,vNear;
  void main(){ vec2 q=gl_PointCoord-.5; float d=uRain>.5?length(q*vec2(6.,1.)):length(q); float a=smoothstep(.5,.08,d);
    float tw=uRain>.5?1.:.55+.45*sin(uTime*1.7+vPhase*6.283); gl_FragColor=vec4(mix(cA,cB,vMix)*(tw+.2), a*uOpacity*tw*vNear); }`;

/** Glowing point cloud (leaves, fireflies, plankton, rain) with twinkle, drift and optional fall. */
export function glowPoints(
  rng: Rng,
  count: number,
  place: (index: number) => readonly [number, number, number],
  opts: GlowOptions = {},
): GlowPoints {
  const position = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const mix = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    position.set(place(i), i * 3);
    phase[i] = rng();
    size[i] = 0.5 + rng();
    mix[i] = rng();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aMix", new THREE.BufferAttribute(mix, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uSize: { value: opts.size ?? 0.4 },
      cA: { value: new THREE.Color(opts.a ?? "#3ad6c8") },
      cB: { value: new THREE.Color(opts.b ?? "#f6c66a") },
      uDrift: { value: opts.drift ?? 0 },
      uRain: { value: opts.rain ? 1 : 0 },
      uFall: { value: opts.fall ?? 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
