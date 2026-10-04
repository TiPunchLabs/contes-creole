import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export type PaintQuality = "high" | "low";

/** Lighter pass for touch devices (phones, tablets) and displays denser than 2×. */
export function paintQuality(coarsePointer: boolean, pixelRatio: number): PaintQuality {
  return coarsePointer || pixelRatio > 2 ? "low" : "high";
}

const VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

// Kuwahara brush, wet edges, pigment granulation, paper grain and a ragged paper vignette.
const FRAGMENT = `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uTime; uniform vec3 uPaper; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
  vec3 kuwahara(vec2 uv){
    vec3 m0=vec3(0.),m1=vec3(0.),m2=vec3(0.),m3=vec3(0.),s0=vec3(0.),s1=vec3(0.),s2=vec3(0.),s3=vec3(0.);
    for(int j=0;j<=RADIUS;j++){ for(int i=0;i<=RADIUS;i++){
      vec2 o=vec2(float(i),float(j))*uTexel; vec3 c;
      c=texture2D(tDiffuse,uv-o).rgb; m0+=c; s0+=c*c;
      c=texture2D(tDiffuse,uv+vec2(o.x,-o.y)).rgb; m1+=c; s1+=c*c;
      c=texture2D(tDiffuse,uv+vec2(-o.x,o.y)).rgb; m2+=c; s2+=c*c;
      c=texture2D(tDiffuse,uv+o).rgb; m3+=c; s3+=c*c; } }
    float n=float((RADIUS+1)*(RADIUS+1));
    m0/=n; m1/=n; m2/=n; m3/=n;
    vec3 v0=abs(s0/n-m0*m0), v1=abs(s1/n-m1*m1), v2=abs(s2/n-m2*m2), v3=abs(s3/n-m3*m3);
    float e0=v0.r+v0.g+v0.b, e1=v1.r+v1.g+v1.b, e2=v2.r+v2.g+v2.b, e3=v3.r+v3.g+v3.b;
    vec3 best=m0; float e=e0;
    if(e1<e){ e=e1; best=m1; } if(e2<e){ e=e2; best=m2; } if(e3<e){ best=m3; }
    return best; }
  void main(){
    vec2 aspect=vec2(uTexel.y/uTexel.x,1.);
    vec2 bleed=(vec2(fbm(vUv*6.+uTime*.02),fbm(vUv*6.+7.3))-.5)*uTexel*6.;
    vec3 c=kuwahara(vUv+bleed);
    vec3 lx=texture2D(tDiffuse,vUv+vec2(uTexel.x*2.,0.)).rgb-texture2D(tDiffuse,vUv-vec2(uTexel.x*2.,0.)).rgb;
    vec3 ly=texture2D(tDiffuse,vUv+vec2(0.,uTexel.y*2.)).rgb-texture2D(tDiffuse,vUv-vec2(0.,uTexel.y*2.)).rgb;
    float edge=clamp(length(vec2(dot(lx,vec3(.333)),dot(ly,vec3(.333))))*3.,0.,1.);
    c*=1.-edge*.35;
    c*=.9+.12*fbm(vUv*aspect*40.);
    c=mix(c,c*uPaper,.25);
    c+=(fbm(vUv*aspect*180.)-.5)*.05;
    vec2 q=(vUv-.5)*vec2(1.,.85);
    float vig=smoothstep(.62,.42-fbm(vUv*8.)*.08,length(q));
    c=mix(uPaper,c,.15+.85*vig);
    gl_FragColor=vec4(c,1.); }`;

/** Post-processing chain giving the scene its watercolour look; owns its render targets. */
export function createPaint(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  quality: PaintQuality,
): { render(): void; update(time: number): void; dispose(): void } {
  if (quality === "low") renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const composer = new EffectComposer(renderer);
  const watercolour = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uTime: { value: 0 },
      uPaper: { value: new THREE.Color("#f4ead6") },
    },
    defines: { RADIUS: quality === "high" ? 4 : 2 },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(watercolour);
  composer.addPass(new OutputPass());
  const size = new THREE.Vector2();
  let width = 0;
  let height = 0;
  return {
    render() {
      renderer.getSize(size);
      if (size.x !== width || size.y !== height) {
        width = size.x;
        height = size.y;
        const ratio = renderer.getPixelRatio();
        composer.setPixelRatio(ratio);
        composer.setSize(width, height);
        watercolour.uniforms.uTexel.value.set(1 / (width * ratio), 1 / (height * ratio));
      }
      composer.render();
    },
    update(time) {
      watercolour.uniforms.uTime.value = time;
    },
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
    },
  };
}
