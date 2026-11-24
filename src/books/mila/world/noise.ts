export { fbm, smooth, vnoise } from "@shared/mila/noise";

/** Cosine ease in and out. */
export const easeIO = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Cubic ease in and out. */
export const easeIO3 = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Constant speed with a gentle start and stop (Mila walking). */
export const walkEase = (k: number): number => {
  const a = 0.2;
  if (k < a) return (k * k) / (2 * a * (1 - a));
  if (k > 1 - a) return 1 - ((1 - k) * (1 - k)) / (2 * a * (1 - a));
  return (k - a / 2) / (1 - a);
};

/** Interpolates two angles the short way round. */
export const lerpAngle = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** GLSL twins of the helpers above, plus sRGB-to-linear `lin`. */
export const GLSL_NOISE = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p*=2.03;a*=.5;}return s;}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
`;
