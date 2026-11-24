import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export type FinishQuality = "high" | "low";

/** Lighter brush for touch devices and very dense screens. */
export function finishQuality(coarsePointer: boolean, pixelRatio: number): FinishQuality {
  return coarsePointer || pixelRatio > 2 ? "low" : "high";
}

const VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

// One brush for the whole sheet, so painted cut-outs and lit volumes end in the same hand: a small
// Kuwahara stroke whose edges wander with the paper's tooth, pigment pooled along value edges,
// granulation in the darks. The grain is a painted, static texture: nothing crawls between frames.
const FRAGMENT = `uniform sampler2D tDiffuse; uniform sampler2D uGrain; uniform vec2 uTexel; uniform float uAspect; uniform vec3 uPaper; varying vec2 vUv;
  vec3 kuwahara(vec2 uv){
    vec3 m0=vec3(0.),m1=vec3(0.),m2=vec3(0.),m3=vec3(0.),s0=vec3(0.),s1=vec3(0.),s2=vec3(0.),s3=vec3(0.);
    for(int j=0;j<=RADIUS;j++){ for(int i=0;i<=RADIUS;i++){
      vec2 o=vec2(float(i),float(j))*uTexel*SPREAD; vec3 c;
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
  float luma(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
  void main(){
    vec2 g=vUv*vec2(uAspect,1.)*3.2;
    vec3 tooth=texture2D(uGrain,g).rgb;
    vec2 wander=(texture2D(uGrain,g*.31).gb-.5)*uTexel*7.;
    vec4 raw=texture2D(tDiffuse,vUv);
    vec3 c=mix(raw.rgb,kuwahara(vUv+wander),raw.a);
    float lx=luma(texture2D(tDiffuse,vUv+vec2(uTexel.x*2.,0.)).rgb)-luma(texture2D(tDiffuse,vUv-vec2(uTexel.x*2.,0.)).rgb);
    float ly=luma(texture2D(tDiffuse,vUv+vec2(0.,uTexel.y*2.)).rgb)-luma(texture2D(tDiffuse,vUv-vec2(0.,uTexel.y*2.)).rgb);
    float edge=clamp(length(vec2(lx,ly))*5.,0.,1.);
    c*=1.-edge*(.22+.3*tooth.b)*raw.a;
    float l=luma(c);
    c*=1.-(tooth.r-.5)*.2*(1.-.55*l);
    c*=1.+(tooth.g-.5)*.07;
    c=mix(c,c*uPaper,.14);
    gl_FragColor=vec4(c,1.); }`;

/**
 * The sheet's finish: renders the scene, then lays the brush, the pooled edges and the paper's
 * tooth over the whole picture. Owns its render targets.
 */
export function createFinish(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  grain: THREE.Texture,
  quality: FinishQuality,
): { render(): void; dispose(): void } {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: quality === "high" ? 4 : 0,
  });
  const composer = new EffectComposer(renderer, target);
  const brush = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uGrain: { value: grain },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uAspect: { value: 1 },
      uPaper: { value: new THREE.Color("#fbf1df") },
    },
    defines: { RADIUS: quality === "high" ? 3 : 2, SPREAD: quality === "high" ? "1.1" : "1.4" },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(brush);
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
        brush.uniforms.uTexel.value.set(1 / (width * ratio), 1 / (height * ratio));
        brush.uniforms.uAspect.value = width / height;
      }
      composer.render();
    },
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      target.dispose();
    },
  };
}
