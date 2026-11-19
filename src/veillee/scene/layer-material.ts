import * as THREE from "three";

export interface LayerOptions {
  map: THREE.Texture;
  /** UV drift per second (clouds); the texture repeats horizontally. */
  scroll?: number;
  /** Horizontal sway of the top of the card, in UV units (canopy groups). */
  sway?: number;
  /** Phase of the sway, in seconds (staggers the groups). */
  phase?: number;
  /** Sway period in seconds. */
  period?: number;
  /** Strength of a warm light band crossing the layer (the slope's light variation). */
  band?: number;
  /** Period of the band's crossing, in seconds. */
  bandPeriod?: number;
  opacity?: number;
}

/**
 * Material of a painted 2D layer: the painted colours as they are (no tone mapping), with optional
 * cloud drift, top sway and a crossing light band, all driven by one `time` uniform.
 */
export function layerMaterial(options: LayerOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: options.map },
      time: { value: 0 },
      scroll: { value: options.scroll ?? 0 },
      sway: { value: options.sway ?? 0 },
      phase: { value: options.phase ?? 0 },
      period: { value: options.period ?? 5 },
      band: { value: options.band ?? 0 },
      bandPeriod: { value: options.bandPeriod ?? 23 },
      opacity: { value: options.opacity ?? 1 },
    },
    vertexShader: /* glsl */ `
      uniform float time, sway, phase, period;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        if (sway > 0.0) {
          float w = 6.2831853 / period;
          float s = sin((time + phase) * w) + 0.35 * sin((time + phase) * w * 2.3 + 1.7);
          p.x += sway * uv.y * uv.y * s;
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float time, scroll, sway, band, bandPeriod, opacity;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        uv.x += scroll * time;
        vec4 c = texture2D(map, uv);
        if (band > 0.0) {
          float x = fract(time / bandPeriod) * 1.6 - 0.3;
          float b = exp(-pow((vUv.x - x) * 5.0, 2.0)) * smoothstep(0.1, 0.9, vUv.y);
          c.rgb += vec3(0.9, 0.55, 0.3) * b * band * c.a;
        }
        gl_FragColor = vec4(c.rgb, c.a * opacity);
        if (gl_FragColor.a < 0.004) discard;
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

/** Steps every layer material found under `root` to `time`. */
export function tickLayers(materials: readonly THREE.ShaderMaterial[], time: number): void {
  for (const m of materials) if (m.uniforms.time) m.uniforms.time.value = time;
}
