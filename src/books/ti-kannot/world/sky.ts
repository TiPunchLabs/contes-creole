import * as THREE from "three";
import type { Rng } from "@shared/random";
import { glowPoints } from "@shared/three/glow-points";
import { softSprite } from "@shared/three/soft-sprite";
import { clamp } from "@shared/math";
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
    // The moon is drawn larger than the sun, with a wide pale halo.
    float disc=smoothstep(mix(.99935,.9986,uNight),mix(.99975,.9989,uNight),s);
    c+=cSun*pow(s,220.)*uNight*.35;
    c+=cSun*(disc*1.2+pow(s,900.)*.9+pow(s,60.)*.3+pow(s,12.)*.3+pow(s,3.)*.2+pow(s,2.)*exp(-d.y*6.)*.25);
    // A warm band low on the horizon, strongest towards the sun.
    c+=cSun*exp(-h*9.)*(.06+.1*pow(s,2.));
    vec2 p=d.xz/(d.y+.25);
    float f=fbm(p*1.6+vec2(uTime*.01,0.));
    float f2=fbm(p*3.4+vec2(-uTime*.016,4.7));
    // Painted cloud banks resting on the horizon, as on the poster, and a few high wisps.
    float bank=smoothstep(.02,.1,d.y)*(1.-smoothstep(.22,.5,d.y));
    float cl=smoothstep(.42,.8,f)*max(bank,.35*smoothstep(.1,.3,d.y));
    cl=clamp(cl+smoothstep(.56,.84,f2)*smoothstep(.16,.42,d.y)*.22,0.,1.);
    vec3 lit=mix(vec3(1.,.96,.9),cSun,.25);
    vec3 shade=mix(cZenith,vec3(1.,.86,.82),.45);
    vec3 cloud=mix(shade,lit,smoothstep(.45,.95,f+(d.y-.1)));
    // Silver lining: the thin edges of a cloud glow where they face the sun.
    cloud+=cSun*smoothstep(.2,.0,abs(cl-.3))*pow(s,4.)*.35;
    cloud=mix(cloud,cHorizon*.85,uCloud*.55);
    c=mix(c,cloud,cl*(.6+uCloud*.35));
    vec2 g=floor(d.xz/max(d.y,.05)*60.);
    float star=hash(g);
    c+=step(.992,star)*smoothstep(.05,.3,d.y)*uNight*(1.-cl)*(.55+.45*sin(uTime*(1.5+star*40.)+star*90.));
    gl_FragColor=vec4(c,1.); }`;

const RAINBOW_VERTEX = `varying float vR; varying float vUp; void main(){ vR=length(position.xy); vUp=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RAINBOW_FRAGMENT = `uniform float uOpacity; varying float vR; varying float vUp;
  void main(){ float t=clamp((vR-34.)/4.,0.,1.);
    vec3 c=clamp(abs(mod((1.-t)*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
    gl_FragColor=vec4(c*.9,smoothstep(0.,.3,t)*smoothstep(1.,.7,t)*smoothstep(3.,16.,vUp)*uOpacity); }`;

const ISLET_TINT = new THREE.Color("#7fae9a");
const ISLET_FLATTEN = 0.3;
/** Aqua the far haze leans to, so distance reads sea-blue rather than sand. */
const SEA_HAZE = new THREE.Color("#bfe6d8");
const GROUND_LIGHT = new THREE.Color("#e2cc9e");
const WHITE = new THREE.Color("#ffffff");
const HAZE = 0.0075;
const NIGHT_GROUND = new THREE.Color("#4a5f8f");

/** Half width of the sun's shadow frustum for a shot at `distance`: tight on close shots. */
export function shadowReach(distance: number): number {
  return clamp(distance * 0.85, 13, 34);
}

const SUN_DISTANCE = 70;

/**
 * Painted sky dome, sun light (casting soft shadows on a `shadows`-pixel map, none at 0), far
 * islets, rain, fireflies, sunlit motes (unless `motes` is off), low mist and the final rainbow.
 */
export function createSky(
  rng: Rng,
  { shadows = 0, motes: drifting = true }: { shadows?: number; motes?: boolean } = {},
): {
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
  const islets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), isletMaterial, 7);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < islets.count; i++) {
    const angle = (i / islets.count) * Math.PI * 2 + rng() * 0.5;
    const r = 110 + rng() * 40;
    const size = 14 + rng() * 14;
    // Low and far, like the poster's open horizon: hazy humps, never a wall behind the island.
    m4.compose(
      new THREE.Vector3(Math.sin(angle) * r, -2.5, Math.cos(angle) * r),
      q.setFromAxisAngle(up, rng() * 6),
      new THREE.Vector3(size * 1.6, size * (0.35 + rng() * 0.3) * ISLET_FLATTEN, size),
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
    { size: 0.38, drift: 0.8, a: "#fff2a0", b: "#c8ff9a" },
  );
  const mists = Array.from({ length: 10 }, () => {
    const sprite = softSprite("#fff1e0", 14 + rng() * 10, 0, false);
    const angle = rng() * Math.PI * 2;
    sprite.position.set(Math.sin(angle) * 14, 1 + rng() * 2, Math.cos(angle) * 14);
    return { sprite, phase: rng() * 6.28 };
  });

  // Pollen and dust drifting in the sunlight around whatever the page looks at.
  const motes = glowPoints(
    rng,
    140,
    () => [(rng() - 0.5) * 26, 0.6 + rng() * 7, (rng() - 0.5) * 26],
    { size: 0.16, drift: 0.9, a: "#fff6d8", b: "#ffe9b0" },
  );

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
  if (shadows > 0) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadows, shadows);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = SUN_DISTANCE * 2.2;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    sun.shadow.radius = 3;
  }
  // A faint light from the side opposite the sun: it rounds the shaded flanks instead of leaving
  // them flat, like the reflected light a painter keeps in a shadow.
  const bounce = new THREE.DirectionalLight("#ffffff", 0.3);
  const fog = new THREE.FogExp2("#f6d9c0", HAZE);
  const dir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const over = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const group = new THREE.Group();
  group.add(
    dome,
    islets,
    rain,
    fireflies,
    motes,
    rainbow,
    hemi,
    sun,
    sun.target,
    bounce,
    bounce.target,
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
      fog.color.copy(env.horizon).lerp(SEA_HAZE, 0.35 * (1 - env.night));
      isletMaterial.color.copy(ISLET_TINT).lerp(fog.color, 0.6);
      sun.color.copy(env.sunColor);
      sun.intensity = env.sunIntensity * 1.45 * (1 - env.rain * 0.4);
      aim.copy(env.shot.focus);
      if (shadows > 0) {
        // The shadow frustum follows the shot in whole texels, so shadows do not crawl as it glides.
        const half = shadowReach(env.shot.distance);
        const camera = sun.shadow.camera;
        if (Math.abs(camera.right - half) > 1e-3) {
          camera.left = camera.bottom = -half;
          camera.right = camera.top = half;
          camera.updateProjectionMatrix();
        }
        const texel = (half * 2) / shadows;
        right.crossVectors(UP, dir).normalize();
        over.crossVectors(dir, right);
        const dx = aim.dot(right);
        const dy = aim.dot(over);
        aim
          .addScaledVector(right, Math.round(dx / texel) * texel - dx)
          .addScaledVector(over, Math.round(dy / texel) * texel - dy);
      }
      sun.position.copy(aim).addScaledVector(dir, SUN_DISTANCE);
      sun.target.position.copy(aim);
      bounce.color.copy(env.horizon).lerp(WHITE, 0.3);
      bounce.intensity = 0.28 * (1 - env.night * 0.5);
      bounce.position
        .copy(env.shot.focus)
        .addScaledVector(dir, -30)
        .setY(env.shot.focus.y + 12);
      bounce.target.position.copy(env.shot.focus);
      hemi.color.copy(env.zenith).lerp(WHITE, 0.35);
      hemi.groundColor.copy(GROUND_LIGHT).lerp(NIGHT_GROUND, env.night);
      // At night the sky gives less: the moon's shadows and the lanterns' glow carry the scene.
      hemi.intensity = 1.45 - env.night * 0.4;
      rain.position.set(env.shot.focus.x, 0, env.shot.focus.z);
      rain.material.uniforms.uTime.value = time;
      rain.material.uniforms.uOpacity.value = env.rain * 0.7;
      motes.position.set(env.shot.focus.x, 0, env.shot.focus.z);
      motes.material.uniforms.uTime.value = time;
      motes.material.uniforms.uOpacity.value = drifting
        ? (1 - env.night) * (1 - env.rain) * 0.55
        : 0;
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
