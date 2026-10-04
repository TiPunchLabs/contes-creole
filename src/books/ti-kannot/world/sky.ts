import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import { sunDirection, type MixedEnv } from "./env";

const DOME_VERTEX = `varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const DOME_FRAGMENT = `uniform vec3 cZenith,cHorizon,cSun,uSunDir; uniform float uNight,uCloud,uTime; varying vec3 vD;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
  void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.);
    vec3 c=mix(cHorizon,cZenith,pow(h,.55));
    float s=max(dot(d,uSunDir),0.);
    c+=cSun*(pow(s,600.)*1.5+pow(s,12.)*.35+pow(s,3.)*.22+pow(s,2.)*exp(-d.y*6.)*.25);
    vec2 p=d.xz/(d.y+.25);
    float cl=smoothstep(.45,.85,fbm(p*1.6+vec2(uTime*.01,0.)))*smoothstep(0.,.25,d.y);
    c=mix(c,mix(vec3(1.,.98,.95),cHorizon*.8,uCloud*.6),cl*(.55+uCloud*.4));
    vec2 g=floor(d.xz/max(d.y,.05)*60.);
    c+=step(.992,hash(g))*smoothstep(.05,.3,d.y)*uNight*(1.-cl);
    gl_FragColor=vec4(c,1.); }`;

const RAINBOW_VERTEX = `varying float vR; void main(){ vR=length(position.xy); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RAINBOW_FRAGMENT = `uniform float uOpacity; varying float vR;
  void main(){ float t=clamp((vR-34.)/4.,0.,1.);
    vec3 c=clamp(abs(mod((1.-t)*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
    gl_FragColor=vec4(c*.9,smoothstep(0.,.15,t)*smoothstep(1.,.85,t)*uOpacity); }`;

const ISLET_TINT = new THREE.Color("#5f9a86");
const GROUND_LIGHT = new THREE.Color("#e2cc9e");
const WHITE = new THREE.Color("#ffffff");
const HAZE = 0.0075;
const NIGHT_GROUND = new THREE.Color("#4a5f8f");

/** Painted sky dome, sun light, far islets, rain, fireflies, low mist and the final rainbow. */
export function createSky(rng: Rng): {
  group: THREE.Group;
  fog: THREE.FogExp2;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const domeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      cZenith: { value: new THREE.Color() },
      cHorizon: { value: new THREE.Color() },
      cSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uNight: { value: 0 },
      uCloud: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: DOME_VERTEX,
    fragmentShader: DOME_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), domeMaterial);
  dome.renderOrder = -1;

  const isletMaterial = new THREE.MeshBasicMaterial({ color: ISLET_TINT });
  const islets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), isletMaterial, 7);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < islets.count; i++) {
    const angle = (i / islets.count) * Math.PI * 2 + rng() * 0.5;
    const r = 110 + rng() * 40;
    const size = 14 + rng() * 14;
    m4.compose(
      new THREE.Vector3(Math.sin(angle) * r, -2, Math.cos(angle) * r),
      q.setFromAxisAngle(up, rng() * 6),
      new THREE.Vector3(size * 1.6, size * (0.35 + rng() * 0.3), size),
    );
    islets.setMatrixAt(i, m4);
  }

  const rain = glowPoints(rng, 2200, () => [(rng() - 0.5) * 50, rng() * 20, (rng() - 0.5) * 50], {
    size: 0.5,
    a: "#e6f2f7",
    b: "#ffffff",
    rain: true,
    fall: 14,
  });
  const fireflies = glowPoints(
    rng,
    260,
    () => [(rng() - 0.5) * 26, 0.8 + rng() * 3, (rng() - 0.5) * 28],
    { size: 0.25, drift: 0.8, a: "#fff2a0", b: "#c8ff9a" },
  );
  const mists = Array.from({ length: 10 }, () => {
    const sprite = softSprite("#ffffff", 14 + rng() * 10, 0, false);
    const angle = rng() * Math.PI * 2;
    sprite.position.set(Math.sin(angle) * 14, 1 + rng() * 2, Math.cos(angle) * 14);
    return { sprite, phase: rng() * 6.28 };
  });

  const rainbowMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: RAINBOW_VERTEX,
    fragmentShader: RAINBOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const rainbow = new THREE.Mesh(
    new THREE.RingGeometry(34, 38, 96, 1, 0, Math.PI),
    rainbowMaterial,
  );
  rainbow.position.set(0, -4, -70);

  const hemi = new THREE.HemisphereLight("#bfe6ff", GROUND_LIGHT, 0.9);
  const sun = new THREE.DirectionalLight("#ffffff", 1.4);
  const fog = new THREE.FogExp2("#f6d9c0", HAZE);
  const dir = new THREE.Vector3();

  const group = new THREE.Group();
  group.add(
    dome,
    islets,
    rain,
    fireflies,
    rainbow,
    hemi,
    sun,
    sun.target,
    ...mists.map((m) => m.sprite),
  );
  const u = domeMaterial.uniforms;
  return {
    group,
    fog,
    update(env, time, camera) {
      sunDirection(env, dir);
      u.cZenith.value.copy(env.zenith);
      u.cHorizon.value.copy(env.horizon);
      u.cSun.value.copy(env.sunColor);
      u.uSunDir.value.copy(dir);
      u.uNight.value = env.night;
      u.uCloud.value = 0.25 + env.rain * 0.75;
      u.uTime.value = time;
      dome.position.copy(camera);
      fog.color.copy(env.horizon);
      isletMaterial.color.copy(ISLET_TINT).lerp(env.horizon, 0.45);
      sun.color.copy(env.sunColor);
      sun.intensity = env.sunIntensity * 1.15 * (1 - env.rain * 0.4);
      sun.position.copy(env.shot.focus).addScaledVector(dir, 50);
      sun.target.position.copy(env.shot.focus);
      hemi.color.copy(env.zenith).lerp(WHITE, 0.35);
      hemi.groundColor.copy(GROUND_LIGHT).lerp(NIGHT_GROUND, env.night);
      hemi.intensity = 1.5 + env.night * 0.3;
      rain.position.set(env.shot.focus.x, 0, env.shot.focus.z);
      rain.material.uniforms.uTime.value = time;
      rain.material.uniforms.uOpacity.value = env.rain * 0.7;
      fireflies.material.uniforms.uTime.value = time;
      fireflies.material.uniforms.uOpacity.value = env.night;
      rainbowMaterial.uniforms.uOpacity.value = env.rainbow * 0.45;
      for (const { sprite, phase } of mists) {
        sprite.material.opacity = env.mist * (0.28 + Math.sin(time * 0.3 + phase) * 0.06);
        sprite.position.y = 1.5 + Math.sin(time * 0.2 + phase) * 0.4;
      }
    },
  };
}
