import * as THREE from "three";

/** Warm lights the painted (unlit) layers answer to: hero calabash, lantern, the tree's glow. */
export const GLOW_LIGHTS = 3;

/** Uniforms shared by every material of the tale; the world updates them once per frame. */
export interface Wash {
  uGrain: { value: THREE.Texture };
  uTime: { value: number };
  /** Light the painted layers are seen in (the page's key: dusk, night, dawn). */
  uAmbient: { value: THREE.Color };
  uGlowPos: { value: THREE.Vector3[] };
  uGlowCol: { value: THREE.Color[] };
  uGlowRange: { value: number[] };
  /** Foliage sway (0 under reduced motion). */
  uWind: { value: number };
  /** Share of the calabashes in the branches that are lit (0..1), and their look (0 green, 1 gold). */
  uLit: { value: number };
  uGold: { value: number };
}

/** Creates the shared uniforms around the paper-grain texture. */
export function createWash(grain: THREE.Texture): Wash {
  return {
    uGrain: { value: grain },
    uTime: { value: 0 },
    uAmbient: { value: new THREE.Color(1, 1, 1) },
    uGlowPos: { value: Array.from({ length: GLOW_LIGHTS }, () => new THREE.Vector3()) },
    uGlowCol: { value: Array.from({ length: GLOW_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
    uGlowRange: { value: Array.from({ length: GLOW_LIGHTS }, () => 1) },
    uWind: { value: 1 },
    uLit: { value: 0 },
    uGold: { value: 0 },
  };
}

/** Soft ramp of the toon shading: many close values, so forms turn like a graded wash. */
export function softRamp(): THREE.DataTexture {
  const values = [84, 112, 140, 168, 192, 214, 232, 246, 255];
  const t = new THREE.DataTexture(new Uint8Array(values), values.length, 1, THREE.RedFormat);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export interface WashedOptions {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  vertexColors?: boolean;
  side?: THREE.Side;
  alphaTest?: number;
  /** Pigment granulation in the paper's tooth (0..1). */
  gran?: number;
  /** Pigment pooled at the silhouette (0..1). */
  pool?: number;
  /** Grain scale in object space (repeats per metre). */
  scale?: number;
  /** Extra shader code; each kind is its own program. */
  kind?: "plain" | "leaves" | "ground" | "gourd" | "gourds" | "dress";
  /** Ground only: the earth texture blended in by the vertex colour. */
  earth?: THREE.Texture;
  /**
   * Share of the sheet's brush this surface takes (1 by default). Faces take little, so the
   * finish never smears eyes and mouths; the value travels in the frame's alpha.
   */
  brush?: number;
  /** Hero calabash only: its own light (0..1). */
  glow?: { value: number };
}

const WASH_PARS = `
uniform sampler2D uGrain; uniform float uGran; uniform float uPool; uniform float uWcScale;
varying vec3 vWcP; varying vec3 vWcN;
float wcGrain(vec3 p, vec3 n){ vec3 w=abs(n)+1e-3; w/=w.x+w.y+w.z;
  return texture2D(uGrain,p.yz).r*w.x+texture2D(uGrain,p.xz).r*w.y+texture2D(uGrain,p.xy).r*w.z; }
`;

/** Granulation and pooled edges, applied to the lit colour just before it is written. */
const WASH_FRAGMENT = `
{ vec3 wp=vWcP*uWcScale; float wg=wcGrain(wp,vWcN); float wb=texture2D(uGrain,wp.xz*.19+wp.y*.13).g;
  float wf=1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.);
  outgoingLight*=1.+uGran*((wg-.5)*1.1+(wb-.5)*.5);
  outgoingLight*=1.-uPool*smoothstep(.5,1.,wf+(wg-.5)*.4); }
`;

/**
 * A lit, painted surface: soft toon shading, the painted texture, pigment granulation fixed to the
 * object (it never crawls on screen) and a darker pooled edge where the form turns away.
 */
export function washed(
  wash: Wash,
  ramp: THREE.Texture,
  options: WashedOptions = {},
): THREE.MeshToonMaterial {
  const { gran = 0.35, pool = 0.22, scale = 1.6, kind = "plain", brush = 1 } = options;
  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(options.color ?? "#ffffff"),
    map: options.map ?? null,
    gradientMap: ramp,
    vertexColors: options.vertexColors ?? false,
    side: options.side ?? THREE.FrontSide,
    alphaTest: options.alphaTest ?? 0,
  });
  const glow = options.glow ?? { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGrain = wash.uGrain;
    sh.uniforms.uGran = { value: gran };
    sh.uniforms.uPool = { value: pool };
    sh.uniforms.uWcScale = { value: scale };
    sh.uniforms.uTime = wash.uTime;
    sh.uniforms.uWind = wash.uWind;
    sh.uniforms.uLit = wash.uLit;
    sh.uniforms.uGold = wash.uGold;
    sh.uniforms.uGlow = glow;
    sh.uniforms.uBrush = { value: brush };
    if (options.earth) sh.uniforms.uEarth = { value: options.earth };
    let vertexHead = "varying vec3 vWcP; varying vec3 vWcN;\n";
    let vertexBody = "vWcP=position; vWcN=normal;\n";
    let fragmentHead = WASH_PARS + "uniform float uBrush;\n";
    let diffuse = "";
    let emissive = "";
    if (kind === "leaves") {
      // Colour attribute (not a tint): r = how far the card's corner sways, g = its phase.
      vertexHead += "attribute vec4 color; uniform float uTime; uniform float uWind;\n";
      vertexBody += `{ float ph=color.g*6.283; float k=color.r*uWind;
        transformed.x+=sin(uTime*.9+ph)*.035*k; transformed.z+=cos(uTime*.7+ph*1.3)*.03*k;
        transformed.y+=sin(uTime*1.3+ph*2.1)*.012*k; }\n`;
    } else if (kind === "dress") {
      // Mila's flounces: each hem (aHem 0 at the seam, 1 at the edge) stirs a little in the air.
      vertexHead += "attribute float aHem; uniform float uTime; uniform float uWind;\n";
      vertexBody += `{ float an=atan(transformed.z,transformed.x); float hh=aHem*aHem*uWind;
        transformed.x+=sin(uTime*1.6+an*3.+transformed.y*9.)*.009*hh;
        transformed.z+=cos(uTime*1.3+an*2.)*.008*hh; }\n`;
    } else if (kind === "ground") {
      vertexHead += "attribute vec4 color; varying vec2 vMask;\n";
      vertexBody += "vMask=color.rg;\n";
      fragmentHead += "uniform sampler2D uEarth; varying vec2 vMask;\n";
      // r = beaten earth of the path (edge broken by the grain), g = shade under the tree.
      diffuse = `{ float e=smoothstep(.3,.7,vMask.r+(texture2D(uGrain,vMapUv*3.1).g-.5)*.7);
        diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uEarth,vMapUv*2.3).rgb,e);
        diffuseColor.rgb*=1.-vMask.g*.42; }\n`;
    } else if (kind === "gourd" || kind === "gourds") {
      fragmentHead += "uniform float uLit; uniform float uGold; uniform float uGlow;\n";
      if (kind === "gourds") {
        vertexHead += "attribute vec4 color; varying float vGroup;\n";
        vertexBody += "vGroup=color.r;\n";
        fragmentHead += "varying float vGroup;\n";
      }
      // Lit from inside: the shell warms to gold and glows most where it faces the eye.
      const lit =
        kind === "gourds" ? "smoothstep(vGroup*.72,vGroup*.72+.28,uLit)*step(.001,uLit)" : "uGlow";
      diffuse = `float gLit=${lit}; diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,1.08,.62),uGold*gLit);\n`;
      emissive = `{ float gf=clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.);
        totalEmissiveRadiance+=vec3(1.,.72,.26)*gLit*uGold*(.12+.4*gf*gf); }\n`;
    }
    sh.vertexShader =
      vertexHead +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n" + vertexBody);
    sh.fragmentShader =
      fragmentHead +
      sh.fragmentShader
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + diffuse)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + emissive)
        .replace("#include <opaque_fragment>", WASH_FRAGMENT + "#include <opaque_fragment>")
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\ngl_FragColor.a=uBrush;",
        );
  };
  mat.customProgramCacheKey = () => `wash:${kind}`;
  return mat;
}

const CARD_VERTEX = `
uniform vec4 uCell; uniform float uTime; uniform float uWind; uniform float uSway;
varying vec2 vUv; varying vec3 vWorld;
void main(){ vUv=vec2(uv.x,1.-uv.y)*uCell.zw+uCell.xy; vec3 p=position;
  p.x+=sin(uTime*.6+modelMatrix[3].x*1.7)*uSway*uWind*uv.y*uv.y;
  vec4 w=modelMatrix*vec4(p,1.); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }
`;

const CARD_FRAGMENT = `
uniform sampler2D map; uniform vec3 uAmbient; uniform vec3 uTint; uniform float uOpacity;
uniform vec3 uGlowPos[${GLOW_LIGHTS}]; uniform vec3 uGlowCol[${GLOW_LIGHTS}]; uniform float uGlowRange[${GLOW_LIGHTS}];
varying vec2 vUv; varying vec3 vWorld;
void main(){ vec4 t=texture2D(map,vUv); if(t.a<.02) discard;
  vec3 light=uAmbient;
  for(int i=0;i<${GLOW_LIGHTS};i++){ float k=max(0.,1.-distance(vWorld,uGlowPos[i])/uGlowRange[i]); light+=uGlowCol[i]*k*k; }
  gl_FragColor=vec4(t.rgb*uTint*light,t.a*uOpacity);
  #include <colorspace_fragment>
}
`;

/** One cell of a painted atlas: (column, row from the top, columns, rows). */
export type Cell = readonly [number, number, number, number];

/**
 * A painted cut-out seen in the page's light: unlit, tinted by the ambient key and warmed by the
 * nearby glows, so it darkens and lights up with the 3D things around it.
 */
export function cardMaterial(
  wash: Wash,
  map: THREE.Texture,
  cell: Cell,
  tint: THREE.ColorRepresentation = "#ffffff",
  sway = 0,
): THREE.ShaderMaterial {
  const [cx, cy, cols, rows] = cell;
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uCell: { value: new THREE.Vector4(cx / cols, cy / rows, 1 / cols, 1 / rows) },
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uSway: { value: sway },
      uTime: wash.uTime,
      uWind: wash.uWind,
      uAmbient: wash.uAmbient,
      uGlowPos: wash.uGlowPos,
      uGlowCol: wash.uGlowCol,
      uGlowRange: wash.uGlowRange,
    },
    vertexShader: CARD_VERTEX,
    fragmentShader: CARD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const SKY_VERTEX = `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w; }`;

const SKY_FRAGMENT = `
uniform sampler2D uWashMap; uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uCloud; uniform float uCloudK;
varying vec3 vDir;
void main(){ vec3 d=normalize(vDir); float h=clamp(d.y*1.6+.08,0.,1.);
  vec2 uv=vec2(atan(d.x,-d.z)/6.2832+.5,clamp(.92-d.y*1.25,0.,1.));
  vec3 w=texture2D(uWashMap,uv*vec2(2.,1.)).rgb;
  // A graded wash: the horizon colour rises into the zenith colour, unevenly, as a wet sheet dries.
  float g=smoothstep(0.,1.,h+(w.g-.5)*.22);
  vec3 c=mix(uLow,uTop,g);
  c=mix(c,uCloud,w.r*uCloudK*smoothstep(.0,.25,d.y+.1)*(1.-.5*h));
  c*=1.+(w.b-.5)*.05;
  gl_FragColor=vec4(c,1.);
  #include <colorspace_fragment>
}
`;

/** The sky dome: a graded wash between the key's horizon and zenith colours, with cloud blooms. */
export function skyMaterial(washMap: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWashMap: { value: washMap },
      uTop: { value: new THREE.Color() },
      uLow: { value: new THREE.Color() },
      uCloud: { value: new THREE.Color() },
      uCloudK: { value: 0.5 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
  });
}

const STAR_VERTEX = `
attribute float aGroup; attribute float aSize; uniform float uLit; uniform float uPixel;
varying float vOn;
void main(){ vOn=smoothstep(aGroup,aGroup+.12,uLit)*step(.001,uLit);
  vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_Position.z=gl_Position.w;
  gl_PointSize=aSize*uPixel; }
`;

const STAR_FRAGMENT = `
uniform vec3 uColor; varying float vOn;
void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d)*vOn; if(a<.01) discard;
  gl_FragColor=vec4(uColor,a);
  #include <colorspace_fragment>
}
`;

/** Stars as steady points in ordered groups: `uLit` 1 lights them all, 0 puts every one out. */
export function starMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLit: { value: 1 },
      uPixel: { value: 1 },
      uColor: { value: new THREE.Color("#fff3cf") },
    },
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
}
