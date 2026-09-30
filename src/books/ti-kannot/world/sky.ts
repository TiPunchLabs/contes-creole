import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints, type GlowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import type { MixedEnv } from "./env";

const VERTEX = `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FRAGMENT = `uniform vec3 cTop,cBot; uniform float uStars,uTime; varying vec3 vP;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){ vec3 d=normalize(vP); float h=clamp(d.y*1.6+.1,0.,1.); vec3 c=mix(cBot,cTop,pow(h,.7));
    c+=cBot*.35*exp(-abs(d.y)*9.);
    vec2 g=floor(d.xz/max(d.y,.02)*40.); float n=hash(g); float st=step(.985,n)*smoothstep(.02,.2,d.y)*(.6+.4*sin(uTime*2.+n*40.));
    c+=vec3(.9,.95,1.)*st*uStars; gl_FragColor=vec4(c,1.); }`;

/**
 * Rain cloud following the camera. Built apart from the sky so the mount can keep the v13
 * order of random draws (plankton, then rain, then mist).
 */
export function createRain(rng: Rng): GlowPoints {
  const rain = glowPoints(rng, 2600, () => [(rng() - 0.5) * 40, rng() * 20, (rng() - 0.5) * 40], {
    size: 0.5,
    a: "#cfe9f5",
    b: "#e8f6ff",
    rain: true,
    fall: 14,
  });
  rain.material.uniforms.uOpacity.value = 0;
  return rain;
}

/** Gradient sky dome with stars, moon and halo, and the rain following the camera. */
export function createSky(rain: GlowPoints): {
  group: THREE.Group;
  moon: THREE.Sprite;
  update(env: MixedEnv, time: number, camera: THREE.Vector3): void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cTop: { value: new THREE.Color("#0d2b3e") },
      cBot: { value: new THREE.Color("#3aa2a0") },
      uStars: { value: 0.2 },
      uTime: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), material);
  const moon = softSprite("#f6e3b0", 14, 1);
  const halo = softSprite("#f6e3b0", 44, 0.35);
  const group = new THREE.Group();
  group.add(dome, moon, halo, rain);
  return {
    group,
    moon,
    update(env, time, cam) {
      material.uniforms.cTop.value.copy(env.top);
      material.uniforms.cBot.value.copy(env.bot);
      material.uniforms.uStars.value = env.stars;
      material.uniforms.uTime.value = time;
      dome.position.set(cam.x, 0, cam.z);
      moon.position.set(cam.x + env.moon[0], env.moon[1], cam.z + env.moon[2]);
      moon.scale.setScalar(12 * env.moon[3]);
      moon.material.color.copy(env.moonColor);
      halo.position.copy(moon.position);
      halo.scale.setScalar(40 * env.moon[3]);
      halo.material.color.copy(env.moonColor);
      halo.material.opacity = 0.25 + env.warm * 0.2;
      rain.position.set(cam.x, env.water, cam.z - 6);
      rain.material.uniforms.uTime.value = time;
      rain.material.uniforms.uOpacity.value = env.rain * 0.8;
    },
  };
}
