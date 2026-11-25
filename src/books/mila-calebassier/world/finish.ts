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
    // Additive lights (halos, sparks) can push the mask past 1 in a float target.
    raw.a=clamp(raw.a,0.,1.);
    vec3 c=mix(raw.rgb,kuwahara(vUv+wander),raw.a);
    float l0=luma(texture2D(tDiffuse,vUv+vec2(uTexel.x*2.,0.)).rgb);
    float l1=luma(texture2D(tDiffuse,vUv-vec2(uTexel.x*2.,0.)).rgb);
    float l2=luma(texture2D(tDiffuse,vUv+vec2(0.,uTexel.y*2.)).rgb);
    float l3=luma(texture2D(tDiffuse,vUv-vec2(0.,uTexel.y*2.)).rgb);
    float edge=clamp(length(vec2(l0-l1,l2-l3))*5.,0.,1.);
    // Pigment pools on the dark side of an edge; small lights (stars, sparks) are left alone.
    edge*=1.-smoothstep(0.,.06,luma(raw.rgb)-(l0+l1+l2+l3)*.25);
    c*=1.-edge*(.3+.4*tooth.b)*raw.a;
    float l=luma(c);
    c*=1.-(tooth.r-.5)*.2*(1.-.55*l);
    c*=1.+(tooth.g-.5)*.07;
    // Dry brush: where a light wash crosses the tooth, specks of bare paper show through.
    float bare=smoothstep(.74,.93,tooth.r)*smoothstep(.25,.8,l)*raw.a;
    c=mix(c,max(c,uPaper*(.55+.45*l)),bare*.32);
    c=mix(c,c*uPaper,.14);
    gl_FragColor=vec4(c,1.); }`;

// Page change: the picture of the page just left stays on the sheet and the new page soaks through
// it, as a wet wash eats into a dry one. The edge follows the paper's tooth (large blotches, fine
// grain), runs across the sheet the way the pages turn, and carries a darker rim of pooled pigment.
// `uPlain` is the reduced-motion version: an even cross-fade, no travelling edge.
const WASH_FRAGMENT = `uniform sampler2D uHeld; uniform sampler2D uGrain; uniform float uAspect; uniform float uLeft; uniform float uWay; uniform float uPlain; varying vec2 vUv;
  void main(){
    vec3 held=texture2D(uHeld,vUv).rgb;
    vec2 g=vUv*vec2(uAspect,1.);
    float blot=texture2D(uGrain,g*.11+.17).r*.7+texture2D(uGrain,g*.47).g*.22+texture2D(uGrain,g*2.3).b*.08;
    float across=uWay>0.?1.-vUv.x:vUv.x;
    float n=clamp((blot*.5+across*.5-.14)/.72,0.,1.);
    float soft=.11;
    float t=(1.-uLeft)*(1.+2.*soft)-soft;
    float a=mix(smoothstep(t-soft,t+soft,n),uLeft,uPlain);
    float rim=a*(1.-a)*4.*(1.-uPlain);
    held*=1.-.3*rim;
    gl_FragColor=vec4(held,a); }`;

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
): {
  /** Keeps the picture now on the screen, for the next page to soak through (`render`'s `left`). */
  hold(): void;
  /**
   * Draws the frame. `left` (1 → 0) is how much of the held picture remains over it; `way` is +1
   * towards the next page, −1 back; `plain` asks for an even cross-fade.
   */
  render(left?: number, way?: number, plain?: boolean): void;
  dispose(): void;
} {
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
  let held: THREE.FramebufferTexture | null = null;
  const wash = new THREE.ShaderMaterial({
    uniforms: {
      uHeld: { value: null },
      uGrain: { value: grain },
      uAspect: { value: 1 },
      uLeft: { value: 0 },
      uWay: { value: 1 },
      uPlain: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: WASH_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wash);
  sheet.frustumCulled = false;
  const overlay = new THREE.Scene();
  overlay.add(sheet);
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const buffer = new THREE.Vector2();
  return {
    hold() {
      renderer.getDrawingBufferSize(buffer);
      if (!held || held.image.width !== buffer.x || held.image.height !== buffer.y) {
        held?.dispose();
        held = new THREE.FramebufferTexture(buffer.x, buffer.y);
        wash.uniforms.uHeld.value = held;
      }
      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(held);
    },
    render(left = 0, way = 1, plain = false) {
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
      // A screen resized or turned since the picture was held: nothing sensible to soak through.
      renderer.getDrawingBufferSize(buffer);
      if (left <= 0 || !held || held.image.width !== buffer.x || held.image.height !== buffer.y) {
        return;
      }
      wash.uniforms.uLeft.value = left;
      wash.uniforms.uWay.value = way;
      wash.uniforms.uPlain.value = plain ? 1 : 0;
      wash.uniforms.uAspect.value = size.x / size.y;
      const auto = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setRenderTarget(null);
      renderer.render(overlay, flat);
      renderer.autoClear = auto;
    },
    dispose() {
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      target.dispose();
      held?.dispose();
      wash.dispose();
      sheet.geometry.dispose();
    },
  };
}
