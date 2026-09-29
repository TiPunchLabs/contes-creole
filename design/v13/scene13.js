import * as THREE from '__THREE__';
// v13 — Pyébwa a Sav dans un morne tropical sobre : sol en relief, mornes au loin, quelques palmiers et arbres épars, herbes basses.
// v8 — Pyébwa a Sav : un arbre de lumière autour duquel on grimpe au défilement ; ses cartes-livres ouvrent des mondes.
// Monde de « Ti Kannot é Gwo Rako » : une rivière de nuit, au fil de l'eau, dont le niveau, le ciel et les habitants changent page après page.

let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (t) => t * t * (3 - 2 * t);

// --- particules lumineuses (feuilles, lucioles, plancton, pluie) ---
function glowPoints(n, place, opts = {}) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n), mx = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = place(i); pos.set(p, i * 3); ph[i] = rnd(); sz[i] = .5 + rnd(); mx[i] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aMix', new THREE.BufferAttribute(mx, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uSize: { value: opts.size || .4 }, cA: { value: new THREE.Color(opts.a || '#3ad6c8') }, cB: { value: new THREE.Color(opts.b || '#f6c66a') }, uDrift: { value: opts.drift || 0 }, uRain: { value: opts.rain ? 1 : 0 }, uFall: { value: opts.fall || 0 } },
    vertexShader: `attribute float aPhase, aSize, aMix; uniform float uTime, uSize, uDrift, uFall; varying float vPhase, vMix, vNear;
      void main(){ vPhase=aPhase; vMix=aMix; vec3 p=position;
        p.x+=sin(uTime*.4+aPhase*6.283)*uDrift; p.y+=cos(uTime*.3+aPhase*9.4)*uDrift*.6; p.z+=sin(uTime*.35+aPhase*4.1)*uDrift;
        if(uFall>0.){ p.y=mod(p.y-uTime*uFall+aPhase*20., 20.); }
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=min(aSize*uSize*(320./-mv.z), 26.); vNear=smoothstep(1.5,5.,-mv.z); }`,
    fragmentShader: `uniform vec3 cA,cB; uniform float uTime,uOpacity,uRain; varying float vPhase,vMix,vNear;
      void main(){ vec2 q=gl_PointCoord-.5; float d=uRain>.5?length(q*vec2(6.,1.)):length(q); float a=smoothstep(.5,.08,d);
        float tw=uRain>.5?1.:.55+.45*sin(uTime*1.7+vPhase*6.283); gl_FragColor=vec4(mix(cA,cB,vMix)*(tw+.2), a*uOpacity*tw*vNear); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}
function softSprite(color, size, opacity = .5, add = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.set(size, size, 1); return s;
}

// --- couverture des cartes-livres (texture peinte) ---
function coverTex(tale) {
  const W = 512, H = 720, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const draw = () => {
    const g = x.createLinearGradient(0, 0, 0, H);
    if (tale.ready) { g.addColorStop(0, '#0b1f33'); g.addColorStop(.55, '#155a63'); g.addColorStop(1, '#0a2a30'); } else { g.addColorStop(0, '#141a22'); g.addColorStop(1, '#0c1014'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(255,240,200,${rnd() * .05})`; x.fillRect(rnd() * W, rnd() * H, 2, 2); }
    if (tale.ready) {
      const mx = W * .68, my = H * .24, mr = 46;
      const glow = x.createRadialGradient(mx, my, mr, mx, my, mr * 4); glow.addColorStop(0, 'rgba(246,211,138,.35)'); glow.addColorStop(1, 'rgba(246,211,138,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
      x.fillStyle = '#f6e3b0'; x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,245,220,${.3 + rnd() * .6})`; x.beginPath(); x.arc(rnd() * W, rnd() * H * .45, .8 + rnd() * 1.6, 0, Math.PI * 2); x.fill(); }
      // rivière qui descend vers nous, reflet de lune
      x.fillStyle = '#2f9a98'; x.beginPath(); x.moveTo(W * .47, H * .5); x.quadraticCurveTo(W * .3, H * .7, W * .12, H); x.lineTo(W * .92, H); x.quadraticCurveTo(W * .6, H * .7, W * .53, H * .5); x.fill();
      for (let i = 0; i < 40; i++) { const yy = H * (.52 + rnd() * .46), t = (yy - H * .5) / (H * .5); x.strokeStyle = `rgba(255,240,200,${.15 + rnd() * .5})`; x.lineWidth = 1 + rnd() * 1.5; const cx = W * (.5 + t * .18) + (rnd() - .5) * W * .25 * t; x.beginPath(); x.moveTo(cx, yy); x.lineTo(cx + 8 + rnd() * 24, yy); x.stroke(); }
      x.fillStyle = '#071c22'; x.beginPath(); x.moveTo(0, H * .5); x.quadraticCurveTo(W * .25, H * .42, W * .47, H * .5); x.quadraticCurveTo(W * .3, H * .7, W * .12, H); x.lineTo(0, H); x.fill();
      x.beginPath(); x.moveTo(W, H * .5); x.quadraticCurveTo(W * .75, H * .44, W * .53, H * .5); x.quadraticCurveTo(W * .6, H * .7, W * .92, H); x.lineTo(W, H); x.fill();
      // Ti Kannot (oiseau doré) sur une branche à gauche, Gwo Rako (crabe) à droite
      x.strokeStyle = '#c98a4a'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, H * .6); x.quadraticCurveTo(W * .12, H * .56, W * .24, H * .58); x.stroke();
      x.fillStyle = '#f2c46d'; x.beginPath(); x.ellipse(W * .2, H * .555, 14, 9, -.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(W * .225, H * .535, 6.5, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(W * .187, H * .552); x.lineTo(W * .155, H * .53); x.lineTo(W * .16, H * .56); x.fill();
      x.fillStyle = '#e07a3a'; x.beginPath(); x.moveTo(W * .237, H * .535); x.lineTo(W * .26, H * .54); x.lineTo(W * .237, H * .545); x.fill();
      const rx = W * .78, ry = H * .66; x.fillStyle = '#d9603a'; x.beginPath(); x.ellipse(rx, ry, 30, 19, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#d9603a'; x.lineWidth = 4; for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(rx + d * 22, ry + i * 5); x.lineTo(rx + d * (36 + i * 6), ry + 8 + i * 7); x.lineTo(rx + d * (42 + i * 6), ry + 20 + i * 5); x.stroke(); }
      for (const d of [-1, 1]) { x.beginPath(); x.arc(rx + d * 40, ry - 16, 11, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f6e3b0'; x.beginPath(); x.arc(rx + d * 8, ry - 22, 4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d9603a'; }
      for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(90,230,210,${.4 + rnd() * .6})`; x.beginPath(); x.arc(rnd() * W, H * (.55 + rnd() * .45), 1 + rnd() * 2.2, 0, Math.PI * 2); x.fill(); }
    } else {
      x.strokeStyle = 'rgba(180,200,210,.35)'; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, H * .38, 34, Math.PI, 0); x.moveTo(W / 2 - 34, H * .38); x.lineTo(W / 2 - 34, H * .46); x.lineTo(W / 2 + 34, H * .46); x.lineTo(W / 2 + 34, H * .38); x.stroke();
      x.fillStyle = 'rgba(180,200,210,.35)'; x.beginPath(); x.arc(W / 2, H * .5, 6, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = tale.ready ? 'rgba(242,196,109,.7)' : 'rgba(160,180,190,.3)'; x.lineWidth = 3; x.strokeRect(22, 22, W - 44, H - 44); x.lineWidth = 1; x.strokeRect(32, 32, W - 64, H - 64);
    x.textAlign = 'center'; x.fillStyle = tale.ready ? '#f6ead0' : 'rgba(200,210,220,.55)';
    x.font = `500 26px 'Quicksand', sans-serif`; x.fillText(tale.sub.toUpperCase(), W / 2, H * .745);
    x.font = `italic 600 54px 'Cormorant Garamond', serif`;
    const words = tale.title.split(' '), lines = []; let cur = '';
    for (const w of words) { if (x.measureText(cur + ' ' + w).width > W - 120 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } lines.push(cur);
    lines.forEach((l, i) => x.fillText(l, W / 2, H * .83 + i * 54));
    x.font = `400 20px 'Quicksand', sans-serif`; x.fillStyle = tale.ready ? 'rgba(90,230,210,.9)' : 'rgba(200,210,220,.4)'; x.fillText(tale.theme, W / 2, H * .1);
    t.needsUpdate = true;
  };
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return t;
}

export function createScene(canvas, data) {
  const { TALES, PAGES } = data;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
  const scene = new THREE.Scene();

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), s3 = V();
  // ================= HUB : le Pyébwa a Sav =================
  const hub = new THREE.Group(); scene.add(hub);
  const hubFog = new THREE.FogExp2('#07131a', .013);
  hub.add(new THREE.HemisphereLight('#2d6f7a', '#0a1410', 1.1));
  const canopyLight = new THREE.PointLight('#5be0d0', 40, 40, 1.6); canopyLight.position.set(0, 11, 0); hub.add(canopyLight);
  const baseLight = new THREE.PointLight('#f0b860', 18, 22, 1.6); baseLight.position.set(1, 2, 2); hub.add(baseLight);
  const rim = new THREE.DirectionalLight('#5be0d0', 1.2); rim.position.set(-8, 14, -10); hub.add(rim);
  // sol : plateau autour de l'arbre, qui ondule doucement puis descend vers les mornes
  const gH = (x, z) => { const d = Math.hypot(x, z); return -.6 + Math.sin(x * .21) * Math.cos(z * .17) * .35 * Math.min(1, d / 12) + Math.sin(x * .05 + 1) * Math.sin(z * .06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30)); };
  { const gg = new THREE.PlaneGeometry(200, 200, 90, 90); gg.rotateX(-Math.PI / 2); const p = gg.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#0d1c1a'), cB = new THREE.Color('#1b3328');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = gH(x, z); p.setY(i, y); const t = clamp((y + 1) / 2, 0, 1) * (.5 + .5 * rnd()); const c = cA.clone().lerp(cB, t); col.set([c.r, c.g, c.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals(); hub.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }))); }
  // mornes : silhouettes de collines au loin, deux plans
  for (const [r, hh, col, n] of [[62, 14, '#0e2028', 9], [88, 24, '#0b1820', 7]]) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * .5, m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, roughness: 1, flatShading: true })); m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); m.scale.set(18 + rnd() * 20, hh * (.6 + rnd() * .7), 14 + rnd() * 14); hub.add(m); }
  // végétation éparse : palmiers (pyé koko), arbres à pain ronds, fougères et touffes d'herbe — jamais sur le chemin de la caméra (r 17–21)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#2b2530', roughness: 1, flatShading: true }), frondMat = new THREE.MeshStandardMaterial({ color: '#173a30', roughness: 1, flatShading: true, side: THREE.DoubleSide }), bushMat = new THREE.MeshStandardMaterial({ color: '#12291f', roughness: 1, flatShading: true });
  const frondGeo = new THREE.PlaneGeometry(.5, 3.2, 1, 4); frondGeo.translate(0, 1.6, 0); { const p = frondGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 3.2; p.setZ(i, -y * y * 1.4); p.setX(i, p.getX(i) * (1 - y * .7)); } frondGeo.computeVertexNormals(); }
  const palm = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, gH(x, z), z); const lean = (rnd() - .5) * .3, t = new THREE.Mesh(new THREE.CylinderGeometry(.09, .16, h, 6), trunkMat); t.position.y = h / 2; t.rotation.z = lean; g.add(t);
    const crown = new THREE.Group(); crown.position.set(Math.sin(-lean) * h * .5, Math.cos(lean) * h, 0); for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(frondGeo, frondMat); f.rotation.y = i / 8 * Math.PI * 2 + rnd() * .3; f.rotation.x = -.35 - rnd() * .35; f.scale.setScalar(.8 + rnd() * .4); crown.add(f); } g.add(crown); g.userData.crown = crown; g.rotation.y = rnd() * 6.28; hub.add(g); return g; };
  const palms = []; for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, r = 24 + rnd() * 20; palms.push(palm(Math.cos(a) * r, Math.sin(a) * r, 5 + rnd() * 4)); }
  // près de la clairière, de part et d'autre du cadre d'arrivée (caméra en z ≈ −21 regardant +z) et de la mi-montée
  for (const [x, z, h] of [[-9.5, -10, 6.5], [11, -8, 5.5], [-12, 4, 7], [8, 12.5, 6], [-4, 13.5, 5]]) palms.push(palm(x, z, h));
  for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, r = 26 + rnd() * 24, x = Math.cos(a) * r, z = Math.sin(a) * r, g = new THREE.Group(); g.position.set(x, gH(x, z), z); const t = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 2.6, 6), trunkMat); t.position.y = 1.3; const c = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + rnd() * .8, 1), bushMat); c.position.y = 3.4; c.scale.y = .8; g.add(t, c); hub.add(g); }
  const bladeGeo = frondGeo.clone(); bladeGeo.scale(.45, .3, .45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7); { let k = 0; for (let i = 0; i < 64; i++) { const a = rnd() * Math.PI * 2, r = i < 22 ? 4 + rnd() * 8 : 22 + rnd() * 28, x = Math.cos(a) * r, z = Math.sin(a) * r, y = gH(x, z), sc = .7 + rnd() * .8, e = new THREE.Euler();
    for (let j = 0; j < 7; j++) { e.set(-.5 - rnd() * .6, j / 7 * Math.PI * 2 + rnd() * .5, 0, 'YXZ'); m4.compose(V(x, y, z), q.setFromEuler(e), s3.set(sc, sc * (.8 + rnd() * .5), sc)); fern.setMatrixAt(k++, m4); } } } hub.add(fern);
  const grass = glowPoints(600, () => { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 14, x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, gH(x, z) + .1 + rnd() * .3, z]; }, { size: .14, drift: .06, a: '#2c6a4a', b: '#4a8a5a' }); grass.material.blending = THREE.NormalBlending; grass.material.uniforms.uOpacity.value = .7; hub.add(grass);
  const pool = softSprite('#2fa89a', 16, .35); pool.position.set(0, -.4, 0); hub.add(pool);
  // l'arbre : branches instanciées + racines
  const branches = [], tips = [];
  const grow = (p, dir, len, rad, depth) => {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    branches.push({ p0: p, p1: end, r: rad, len, dir });
    if (depth >= 6 || rad < .04) { tips.push(end); return; }
    const n = depth < 2 ? 3 : rnd() < .65 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const axis = V(rnd() - .5, rnd() * .4 - .1, rnd() - .5).normalize();
      const d = dir.clone().applyAxisAngle(axis, .35 + rnd() * .55).add(V(0, .12 + depth * .02, 0)).normalize();
      grow(end, d, len * (.66 + rnd() * .16), rad * .6, depth + 1);
    }
  };
  grow(V(0, -.6, 0), V(0, 1, 0), 5.2, 1.1, 0);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + rnd() * .5; branches.push({ p0: V(0, .2, 0), p1: V(Math.cos(a) * 2.6, -.55, Math.sin(a) * 2.6), r: .34, len: 2.8 }); }
  const barkGeo = new THREE.CylinderGeometry(.62, 1, 1, 7, 1); barkGeo.translate(0, .5, 0);
  const bark = new THREE.InstancedMesh(barkGeo, new THREE.MeshStandardMaterial({ color: '#3a2f44', roughness: .9, flatShading: true }), branches.length);
  branches.forEach((b, i) => { const d = b.p1.clone().sub(b.p0), L = d.length(); q.setFromUnitVectors(up, d.normalize()); s3.set(b.r, L, b.r); m4.compose(b.p0, q, s3); bark.setMatrixAt(i, m4); });
  hub.add(bark);
  const leaves = glowPoints(tips.length * 26, (i) => { const t = tips[i % tips.length], r = 1.25 * Math.cbrt(rnd()), th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1); return [t.x + r * Math.sin(ph) * Math.cos(th), t.y + r * Math.cos(ph) * .8, t.z + r * Math.sin(ph) * Math.sin(th)]; }, { size: .34, drift: .12 });
  hub.add(leaves);
  const fireflies = glowPoints(900, () => [(rnd() - .5) * 36, rnd() * 16 - .5, (rnd() - .5) * 36], { size: .22, drift: 1.4, a: '#9af5e6', b: '#ffd98a' });
  hub.add(fireflies);
  const hubStars = glowPoints(700, () => { const th = rnd() * Math.PI * 2, ph = rnd() * 1.2; return [Math.cos(th) * Math.cos(ph) * 220, Math.sin(ph) * 220 + 10, Math.sin(th) * Math.cos(ph) * 220]; }, { size: 1.1, a: '#dfe9ff', b: '#fff1c8' });
  hub.add(hubStars);
  const moonHub = softSprite('#f6e3b0', 26, .9); moonHub.position.set(-60, 55, -90); hub.add(moonHub);
  const mists = []; for (let i = 0; i < 14; i++) { const s = softSprite('#1c4a52', 14 + rnd() * 14, .16, false); s.position.set((rnd() - .5) * 40, -.2 + rnd() * 1.5, (rnd() - .5) * 40); s.userData.ph = rnd() * 6.28; mists.push(s); hub.add(s); }
  // le Konteur : le personnage (découpe photo) assis au pied de l'arbre, avec sa lanterne
  const teller = new THREE.Group(); teller.position.set(5.2, gH(5.2, -12.5) + .02, -12.5); hub.add(teller);
  const tellerTex = new THREE.TextureLoader().load(window.__resources.konteur); tellerTex.colorSpace = THREE.SRGBColorSpace; tellerTex.anisotropy = 8;
  const TH = 1.75, TW = TH * .588; // adulte assis ≈ 1,5 m ; ratio de l'image
  const tellerMat = new THREE.MeshStandardMaterial({ map: tellerTex, transparent: true, alphaTest: .08, roughness: .9, color: '#ffffff', emissive: '#6a5040', emissiveMap: tellerTex, emissiveIntensity: .35, side: THREE.DoubleSide });
  const tellerPlane = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), tellerMat); tellerPlane.position.y = TH / 2 - .02; teller.add(tellerPlane);
  const tellerShadow = softSprite('#000000', 1.6, .55, false); tellerShadow.material.rotation = 0; tellerShadow.position.set(0, .02, .2); tellerShadow.scale.set(1.7, .5, 1); teller.add(tellerShadow);
  { const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .24, 8), new THREE.MeshStandardMaterial({ color: '#f6d38a', emissive: '#f0a850', emissiveIntensity: 1.6, roughness: .3 })); lampGlass.position.set(.7, .13, .15);
    const lampCap = new THREE.Mesh(new THREE.ConeGeometry(.12, .09, 8), new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: .5, roughness: .6 })); lampCap.position.set(.7, .3, .15);
    const lampLight = new THREE.PointLight('#f0b860', 4, 8, 1.6); lampLight.position.set(.7, .5, .45);
    const fill = new THREE.PointLight('#f6d8a8', 10, 7, 1.4); fill.position.set(-.4, 1.4, 2.2); teller.add(fill);
    const glow = softSprite('#f0b860', 2, .2); glow.position.set(.7, .2, .15);
    const seat = new THREE.Mesh(new THREE.DodecahedronGeometry(.55, 0), new THREE.MeshStandardMaterial({ color: '#2a2430', roughness: 1, flatShading: true })); seat.position.set(0, -.12, -.25); seat.scale.set(1.3, .42, 1); seat.rotation.set(.2, .6, .1); teller.add(seat);
    teller.add(lampGlass, lampCap, lampLight, glow); teller.userData = { lampLight, plane: tellerPlane, glow, lampGlass, lit: 0 }; }
  // chemin de caméra en spirale autour de l'arbre
  const hubCam = (t, out, look) => { const a = -Math.PI / 2 + t * Math.PI * 1.55, r = 21 - t * 4, y = 1.4 + t * 8.6; out.set(Math.cos(a) * r, y, Math.sin(a) * r); look.set(0, y + 2.2 - t * 1.2, 0); return a; };
  // cartes-livres suspendues aux branches
  const cardTs = [.24, .55, .84], cards = [], tmpA = V(), tmpB = V();
  const threadMat = new THREE.LineBasicMaterial({ color: '#8fd9cf', transparent: true, opacity: .35 });
  TALES.forEach((tale, i) => {
    const t = cardTs[i % cardTs.length], a = hubCam(t, tmpA, tmpB), r = 12.2, y = tmpA.y + .3;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ map: coverTex(tale), transparent: true }));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ color: '#0a1a22', side: THREE.BackSide }));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.7), new THREE.MeshBasicMaterial({ color: tale.ready ? '#2fa89a' : '#2a3a44', transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.z = -.02; g.add(halo, back, plane); g.userData = { i, tale, t, hover: 0 }; plane.userData.card = i; hub.add(g);
    // fil vers la branche la plus proche
    let best = tips[0], bd = 1e9; for (const tp of tips) { const d = tp.distanceTo(g.position); if (d < bd) { bd = d; best = tp; } }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([best, g.position.clone().add(V(0, 1.05, 0))]), threadMat); hub.add(line);
    cards.push({ g, plane, halo, line, top: g.position.clone().add(V(0, 1.05, 0)), tip: best, t });
  });

  // ================= MONDE : Larivyè Klè =================
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const worldFog = new THREE.FogExp2('#2f8a8c', .016);
  const STEP = 17, meander = (z) => Math.sin(z * .028) * 4 + Math.sin(z * .011) * 2;
  const noise = (x, z) => Math.sin(x * .9 + z * .7) * .5 + Math.sin(x * 2.3 - z * 1.7) * .25 + Math.sin(x * .3 + z * .21) * .8;
  const H = (x, z) => { const u = Math.abs(x - meander(z)); return .12 * Math.pow(u, 1.7) - 2.7 + noise(x, z) * .45 * Math.min(1, u / 4); };
  const hemi = new THREE.HemisphereLight('#3aa2a0', '#0b1a1c', .9); world.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1c8', 1.6); world.add(sun); world.add(sun.target);
  // ciel : dôme dégradé + étoiles
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { cTop: { value: new THREE.Color('#0d2b3e') }, cBot: { value: new THREE.Color('#3aa2a0') }, uStars: { value: .2 }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 cTop,cBot; uniform float uStars,uTime; varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ vec3 d=normalize(vP); float h=clamp(d.y*1.6+.1,0.,1.); vec3 c=mix(cBot,cTop,pow(h,.7));
        c+=cBot*.35*exp(-abs(d.y)*9.);
        vec2 g=floor(d.xz/max(d.y,.02)*40.); float n=hash(g); float st=step(.985,n)*smoothstep(.02,.2,d.y)*(.6+.4*sin(uTime*2.+n*40.));
        c+=vec3(.9,.95,1.)*st*uStars; gl_FragColor=vec4(c,1.); }`, side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), skyMat); world.add(sky);
  const moon = softSprite('#f6e3b0', 14, 1); world.add(moon);
  const moonHalo = softSprite('#f6e3b0', 44, .35); world.add(moonHalo);
  // vallée : plan déplacé, couleurs de sommets
  const gW = 160, gL = 260, gg = new THREE.PlaneGeometry(gW, gL, 110, 200); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -gL / 2 + 40);
  { const p = gg.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#0b1d1c'), cB = new THREE.Color('#183a30'), cC = new THREE.Color('#3b6a4a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = H(x, z); p.setY(i, h); const t = clamp((h + 2.7) / 6, 0, 1), c = t < .5 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cC, (t - .5) * 2); col.set([c.r, c.g, c.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals(); }
  world.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  // l'eau
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, cDeep: { value: new THREE.Color('#0a3a44') }, cShallow: { value: new THREE.Color('#2e8a8c') }, uMoon: { value: V(0, 10, -70) }, cMoon: { value: new THREE.Color('#fff1c8') }, uGlow: { value: 1 }, uFog: { value: new THREE.Color('#2f8a8c') }, uFogD: { value: .016 }, uCam: { value: V() } },
    vertexShader: `uniform float uTime; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.); w.y+=sin(w.x*.7+uTime*1.1)*.05+sin(w.z*.5-uTime*.8)*.06; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uGlow,uFogD; uniform vec3 cDeep,cShallow,uMoon,cMoon,uFog,uCam; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.98,78.23)))*43758.5); }
      void main(){ vec3 vd=normalize(uCam-vW); float fr=pow(1.-max(vd.y,0.),3.);
        vec3 c=mix(cDeep,cShallow,.25+fr*.6);
        vec2 dm=vW.xz-uMoon.xz; float streak=exp(-abs(dm.x+sin(vW.z*.6+uTime)*1.2)*.32)*clamp(1.-abs(dm.y)/90.,0.,1.);
        float shim=.5+.5*sin(vW.z*3.+uTime*3.+sin(vW.x*2.+uTime)); c+=cMoon*streak*shim*.8;
        float r=sin(vW.x*3.+uTime*1.6)*sin(vW.z*3.5-uTime*1.3); c+=cShallow*smoothstep(.86,1.,r)*.6;
        vec2 cell=floor(vW.xz*2.); vec2 fp=fract(vW.xz*2.)-.5; float n=hash(cell); c+=vec3(.35,.95,.85)*step(.975,n)*smoothstep(.22,.04,length(fp))*(.5+.5*sin(uTime*2.+n*60.))*uGlow;
        float dist=distance(uCam,vW); float f=1.-exp(-dist*dist*uFogD*uFogD); c=mix(c,uFog,f);
        gl_FragColor=vec4(c,.94); }`, transparent: true,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(gW, gL, 60, 100), waterMat); water.rotation.x = -Math.PI / 2; water.position.z = -gL / 2 + 40; world.add(water);
  // arbres des berges (silhouettes), flè wouj, rochers du lit
  const treeGeo = new THREE.ConeGeometry(1, 3.2, 6); treeGeo.translate(0, 1.6, 0);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: '#0b1e1c', roughness: 1, flatShading: true }), 260);
  const flowers = [];
  for (let i = 0; i < 260; i++) { const z = 30 - rnd() * 240, side = i % 2 ? 1 : -1, x = meander(z) + side * (8 + rnd() * 22), s = .8 + rnd() * 2.2, y = H(x, z) - .1; m4.compose(V(x, y, z), q.setFromAxisAngle(up, rnd() * 6.28), s3.set(s * (.7 + rnd() * .5), s, s * (.7 + rnd() * .5))); trees.setMatrixAt(i, m4); if (rnd() < .3) for (let k = 0; k < 6; k++) flowers.push([x + (rnd() - .5) * s * 1.4, y + s * (1.5 + rnd() * 1.6), z + (rnd() - .5) * s * 1.4]); }
  world.add(trees);
  const flePts = glowPoints(flowers.length, (i) => flowers[i], { size: .3, a: '#ff6a4a', b: '#ffb347', drift: .05 }); world.add(flePts);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#233a3e', roughness: 1, flatShading: true }), 220);
  for (let i = 0; i < 220; i++) { const z = 30 - rnd() * 240, x = meander(z) + (rnd() - .5) * 13, s = .25 + rnd() * .7; m4.compose(V(x, H(x, z) + s * .3, z), q.setFromAxisAngle(V(rnd(), rnd(), rnd()).normalize(), rnd() * 6.28), s3.set(s, s * .7, s)); rocks.setMatrixAt(i, m4); }
  world.add(rocks);
  const plankton = glowPoints(1400, () => { const z = 30 - rnd() * 240; return [meander(z) + (rnd() - .5) * 14, .1 + rnd() * 3.5, z]; }, { size: .16, drift: .9, a: '#7af0dc', b: '#ffe6a0' }); world.add(plankton);
  const worldStarsDummy = null;
  const rain = glowPoints(2600, () => [(rnd() - .5) * 40, rnd() * 20, (rnd() - .5) * 40], { size: .5, a: '#cfe9f5', b: '#e8f6ff', rain: true, fall: 14 }); rain.material.uniforms.uOpacity.value = 0; world.add(rain);
  const wMists = []; for (let i = 0; i < 16; i++) { const z = 20 - rnd() * 220, s = softSprite('#4aa08a', 12 + rnd() * 14, .14, false); s.position.set(meander(z) + (rnd() - .5) * 18, .6 + rnd() * 1.2, z); s.userData.ph = rnd() * 6.28; wMists.push(s); world.add(s); }
  // la source (station 5), le barrage (page 6), le réservoir (page 11)
  const st = (i) => -i * STEP;
  const spring = new THREE.Group(); const placeSpring = (i) => { const z = st(i) - 7, x = meander(z) - 6.8; spring.position.set(x, H(x, z) + .3, z); dam.position.copy(spring.position); }; let springPage = 4;
  const springLight = new THREE.PointLight('#7af0dc', 30, 18, 1.8); springLight.position.y = 1; spring.add(springLight);
  spring.add(softSprite('#9af5e6', 5, .8)); const springPts = glowPoints(160, () => [(rnd() - .5) * 1.6, rnd() * 2.5, (rnd() - .5) * 1.6], { size: .2, drift: .3, a: '#9af5e6', b: '#dffcf6', fall: -1.2 }); spring.add(springPts);
  const springRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), rocks.material); springRock.position.set(-1.2, .4, -1); spring.add(springRock); world.add(spring);
  const dam = new THREE.Group(); world.add(dam); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = new THREE.Mesh(rockGeo, rocks.material); r.position.set(Math.cos(a) * 1.7, .1, Math.sin(a) * 1.7); r.scale.setScalar(.28 + rnd() * .18); dam.add(r); } dam.scale.setScalar(0); placeSpring(4);
  const tank = new THREE.Group(); { const z = st(10) - 8, x = meander(z) + 5.2; tank.position.set(x, H(x, z) + .1, z); }
  tank.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 1.5, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: .9, side: THREE.DoubleSide })));
  { const wd = new THREE.Mesh(new THREE.CircleGeometry(1.55, 16), new THREE.MeshStandardMaterial({ color: '#2e8a8c', emissive: '#1a5a5c', roughness: .2 })); wd.rotation.x = -Math.PI / 2; wd.position.y = .6; tank.add(wd); for (let i = 0; i < 3; i++) { const tap = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5), new THREE.MeshStandardMaterial({ color: '#c19a52', metalness: .6, roughness: .4 })); const a = -.6 + i * .6; tap.rotation.z = Math.PI / 2; tap.rotation.y = a; tap.position.set(Math.sin(a) * 1.7, -.1, Math.cos(a) * 1.7); tank.add(tap); } }
  tank.scale.setScalar(0); world.add(tank);
  // les personnages
  const gold = new THREE.MeshStandardMaterial({ color: '#f2c46d', emissive: '#a86a20', emissiveIntensity: .35, roughness: .6 });
  const bird = new THREE.Group(); { const body = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 10), gold); body.scale.set(1.3, .9, .9); const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), gold); head.position.set(.42, .22, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.07, .26, 6), new THREE.MeshStandardMaterial({ color: '#e07a3a' })); beak.rotation.z = -Math.PI / 2; beak.position.set(.68, .2, 0);
    const eyeM = new THREE.MeshStandardMaterial({ color: '#0b1a1c' }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 6), eyeM); e.position.set(.54, .28, s * .12); bird.add(e); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 5), gold); tail.rotation.z = Math.PI / 2; tail.position.set(-.55, .05, 0);
    const wingGeo = new THREE.PlaneGeometry(.6, .35); wingGeo.translate(0, 0, .3); const wings = [-1, 1].map((s) => { const w = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: '#f2c46d', emissive: '#a86a20', emissiveIntensity: .3, side: THREE.DoubleSide })); w.rotation.x = s > 0 ? 0 : Math.PI; w.rotation.y = .1; w.position.set(-.05, .18, 0); w.userData.s = s; bird.add(w); return w; });
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#4a2e1e', roughness: 1 })); perch.rotation.z = Math.PI / 2 + .25; perch.position.set(-1.2, -.5, 0);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .35, 4), new THREE.MeshStandardMaterial({ color: '#e07a3a' })); legs.position.set(0, -.4, 0);
    bird.add(body, head, beak, tail, perch, legs); bird.scale.setScalar(.8); bird.userData = { wings, name: 'bird', headY: .6 }; world.add(bird); }
  const crabM = new THREE.MeshStandardMaterial({ color: '#d9603a', emissive: '#7a2a10', emissiveIntensity: .35, roughness: .7 });
  const crab = new THREE.Group(); { const body = new THREE.Mesh(new THREE.SphereGeometry(.9, 14, 10), crabM); body.scale.set(1.1, .5, .8); body.position.y = .5;
    const claws = [-1, 1].map((s) => { const g = new THREE.Group(); const arm = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .9, 6), crabM); arm.rotation.z = s * -.9; arm.position.set(s * .4, .1, 0); const c = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), crabM); c.scale.set(1.2, .8, .9); c.position.set(s * .75, .4, 0); g.add(arm, c); g.position.set(s * .9, .5, .45); g.userData.s = s; crab.add(g); return g; });
    const legs = []; for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, 1.1, 5), crabM); l.position.set(s * 1.05, .35, -.25 + i * .35); l.rotation.z = s * 1.0; l.userData.ph = i; legs.push(l); crab.add(l); }
    for (const s of [-1, 1]) { const st2 = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .3, 4), crabM); st2.position.set(s * .25, 1.0, .55); const e = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), new THREE.MeshStandardMaterial({ color: '#f6e3b0', emissive: '#f6e3b0', emissiveIntensity: .5 })); e.position.set(s * .25, 1.17, .55); const p = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 6), new THREE.MeshStandardMaterial({ color: '#0b1a1c' })); p.position.set(s * .25, 1.17, .64); crab.add(st2, e, p); }
    crab.add(body); crab.userData = { claws, legs, name: 'crab', headY: 1.4 }; world.add(crab); }
  const kalbasM = new THREE.MeshStandardMaterial({ color: '#c9a061', roughness: .8 });
  const kalbas = new THREE.InstancedMesh(new THREE.SphereGeometry(.28, 10, 8), kalbasM, 24); kalbas.count = 0; world.add(kalbas);
  const kalbasOff = []; for (let i = 0; i < 24; i++) kalbasOff.push([(rnd() - .5) * 3.2, (rnd() - .5) * 2.4, .28 + Math.floor(i / 12) * .45]);

  // ================= état & interpolation =================
  const S = { mode: 'hub', t: 0, dive: 0, card: 0, pageF: 0, pointer: { x: 0, y: 0 }, hover: null, tellerHover: false };
  const cam = V(), look = V(), tmp = V(), tmp2 = V();
  const worldCam = (pf, out, lk) => {
    const i0 = Math.floor(clamp(pf, 0, PAGES.length - 1)), i1 = Math.min(i0 + 1, PAGES.length - 1), f = sm(clamp(pf - i0, 0, 1));
    const pos = (i) => { const z = st(i), w = PAGES[i].env.water; return V(meander(z) + 1.4, w + 2.6, z + 8.5); };
    const lkp = (i) => { const z = st(i) - 10; return V(meander(z), PAGES[i].env.water + .4, z); };
    out.copy(pos(i0)).lerp(pos(i1), f); lk.copy(lkp(i0)).lerp(lkp(i1), f); return { i0, i1, f };
  };
  const env = {}; const cTmp = new THREE.Color(), cTmp2 = new THREE.Color();
  const mixEnv = (i0, i1, f) => {
    const a = PAGES[i0].env, b = PAGES[i1].env, num = (k) => lerp(a[k] || 0, b[k] || 0, f), col = (ca, cb) => cTmp.set(ca).lerp(cTmp2.set(cb), f).clone();
    env.water = num('water'); env.stars = num('stars'); env.rain = num('rain'); env.glow = num('glow'); env.warm = num('warm'); env.dam = num('dam'); env.tank = num('tank'); env.spring = num('spring'); env.empty = num('empty');
    env.kalbas = Math.round(lerp(a.kalbas, b.kalbas, f)); env.top = col(a.sky[0], b.sky[0]); env.bot = col(a.sky[1], b.sky[1]);
    env.moon = [0, 1, 2, 5].map((k) => lerp(a.moon[k] ?? a.moon[4], b.moon[k] ?? b.moon[4], f)); env.moonCol = col(a.moon[3], b.moon[3]);
    const bi = f < .5 ? i0 : i1, e = PAGES[bi].env, z = st(bi);
    if ((e.spring || e.dam) && springPage !== bi) { springPage = bi; placeSpring(bi); }
    env.bird = V(meander(z) + e.bird[0], e.water + e.bird[1], z + e.bird[2]);
    env.crab = e.crab ? V(meander(z) + e.crab[0], 0, z + e.crab[1]) : null; if (env.crab) env.crab.y = Math.max(H(env.crab.x, env.crab.z), e.water - .2) + .05;
  };
  const birdPos = V(), crabPos = V(); let crabVis = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let w = 1, h = 1, t0 = performance.now();
  const project = (p) => { tmp.copy(p).project(camera); return [(tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * h, tmp.z < 1]; };

  function frame(now, st_) {
    Object.assign(S, st_);
    const time = (now - t0) / 1000;
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    if (cw !== w || ch !== h) { w = cw; h = ch; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const inHub = S.mode === 'hub' || S.mode === 'dive';
    hub.visible = inHub; world.visible = !inHub; scene.fog = inHub ? hubFog : worldFog; scene.background = inHub ? hubFog.color : null;
    const out = { cards: [], chars: {} };
    if (inHub) {
      hubCam(S.t, cam, look);
      const c = cards[S.card] || cards[0];
      if (S.mode === 'dive') { const d = sm(S.dive); tmp.copy(c.g.position); tmp2.copy(cam).sub(c.g.position).normalize().multiplyScalar(-.6); tmp.add(tmp2); cam.lerp(tmp, d); look.lerp(c.g.position, d); camera.fov = lerp(50, 95, d); camera.updateProjectionMatrix(); }
      else if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      camera.position.copy(cam); camera.position.x += S.pointer.x * .5; camera.position.y += S.pointer.y * .3; camera.lookAt(look);
      leaves.material.uniforms.uTime.value = time; fireflies.material.uniforms.uTime.value = time; hubStars.material.uniforms.uTime.value = time;
      canopyLight.intensity = 36 + Math.sin(time * .9) * 6; pool.material.opacity = .28 + Math.sin(time * 1.3) * .06;
      // billboard : le Konteur fait toujours face à la caméra (rotation Y seule), respire légèrement
      tmp.copy(camera.position).sub(teller.position); teller.userData.plane.rotation.y = Math.atan2(tmp.x, tmp.z); teller.userData.plane.scale.y = 1 + Math.sin(time * 1.3) * .006;
      { const u = teller.userData; u.lit = lerp(u.lit, S.tellerHover ? 1 : 0, .1); const fl = Math.sin(time * 7) * .08 + Math.sin(time * 3.3) * .06;
        u.lampLight.intensity = lerp(3, 22, u.lit) * (1 + fl); u.glow.material.opacity = lerp(.18, .75, u.lit) * (1 + fl); u.glow.scale.setScalar(lerp(1.6, 3.4, u.lit)); u.lampGlass.material.emissiveIntensity = lerp(.5, 2.4, u.lit); }
      palms.forEach((p, i) => { p.userData.crown.rotation.z = Math.sin(time * .7 + i) * .04; p.userData.crown.rotation.x = Math.cos(time * .5 + i * 1.3) * .03; }); grass.material.uniforms.uTime.value = time;
      mists.forEach((s) => { s.position.x += Math.sin(time * .1 + s.userData.ph) * .004; s.material.opacity = .12 + Math.sin(time * .3 + s.userData.ph) * .05; });
      cards.forEach((c, i) => {
        c.g.lookAt(camera.position); c.g.rotation.z += Math.sin(time * .8 + i) * .03; c.g.position.y += Math.sin(time * .6 + i * 2) * .0015;
        const near = 1 - clamp(Math.abs(S.t - c.t) / .22, 0, 1); c.g.userData.hover = lerp(c.g.userData.hover, S.hover === i ? 1 : 0, .12);
        const sc = 1 + near * .08 + c.g.userData.hover * .08; c.g.scale.setScalar(sc); c.halo.material.opacity = .12 + near * .2 + c.g.userData.hover * .35;
        c.line.geometry.attributes.position.setXYZ(1, c.g.position.x, c.g.position.y + 1.05 * sc, c.g.position.z); c.line.geometry.attributes.position.needsUpdate = true;
        const [x, y, vis] = project(tmp2.copy(c.g.position).add(V(0, -1.25 * sc, 0))); out.cards.push({ x, y, vis, near, i });
      });
      const tp = project(tmp2.copy(teller.position).add(V(.35, 1.85, 0))); out.chars.teller = { x: tp[0], y: tp[1], vis: tp[2] };
    } else {
      const { i0, i1, f } = worldCam(S.pageF, cam, look); mixEnv(i0, i1, f);
      camera.position.copy(cam); camera.position.x += S.pointer.x * .6; camera.position.y += S.pointer.y * .35; camera.lookAt(look);
      if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      water.position.y = env.water; waterMat.uniforms.uTime.value = time; waterMat.uniforms.uCam.value.copy(camera.position); waterMat.uniforms.uGlow.value = env.glow;
      waterMat.uniforms.cShallow.value.copy(env.bot).lerp(cTmp.set('#2e8a8c'), .5); waterMat.uniforms.cDeep.value.copy(env.top).lerp(cTmp.set('#0a3a44'), .5);
      waterMat.uniforms.uFog.value.copy(env.bot); worldFog.color.copy(env.bot).lerp(cTmp.set('#000000'), .15);
      skyMat.uniforms.cTop.value.copy(env.top); skyMat.uniforms.cBot.value.copy(env.bot); skyMat.uniforms.uStars.value = env.stars; skyMat.uniforms.uTime.value = time;
      sky.position.set(camera.position.x, 0, camera.position.z);
      moon.position.set(camera.position.x + env.moon[0], env.moon[1], camera.position.z + env.moon[2]); moon.scale.setScalar(12 * env.moon[3]); moon.material.color.copy(env.moonCol);
      moonHalo.position.copy(moon.position); moonHalo.scale.setScalar(40 * env.moon[3]); moonHalo.material.color.copy(env.moonCol); moonHalo.material.opacity = .25 + env.warm * .2;
      waterMat.uniforms.uMoon.value.copy(moon.position); waterMat.uniforms.cMoon.value.copy(env.moonCol);
      sun.position.copy(moon.position); sun.target.position.set(camera.position.x, 0, camera.position.z - 12); sun.color.copy(env.moonCol); sun.intensity = 1.0 + env.warm * 1.6;
      hemi.color.copy(env.bot); hemi.intensity = .7 + env.glow * .3;
      plankton.material.uniforms.uTime.value = time; plankton.material.uniforms.uOpacity.value = env.glow; flePts.material.uniforms.uTime.value = time;
      rain.position.set(camera.position.x, env.water, camera.position.z - 6); rain.material.uniforms.uTime.value = time; rain.material.uniforms.uOpacity.value = env.rain * .8;
      wMists.forEach((s) => { s.material.opacity = (.1 + Math.sin(time * .3 + s.userData.ph) * .04) * (1 - env.warm * .6); s.position.y = env.water + .8 + Math.sin(time * .2 + s.userData.ph) * .3; });
      springPts.material.uniforms.uTime.value = time; springLight.intensity = (18 + Math.sin(time * 2) * 6) * (.4 + env.spring * .6); spring.children[1].material.opacity = .4 + env.spring * .5;
      dam.scale.setScalar(lerp(dam.scale.x, env.dam, .08)); tank.scale.setScalar(lerp(tank.scale.x, env.tank, .08));
      // personnages
      birdPos.lerp(env.bird, .06); bird.position.copy(birdPos); bird.position.y += Math.sin(time * 2.2) * .04; bird.rotation.y = Math.PI * .15 + Math.sin(time * .5) * .2;
      bird.userData.wings.forEach((wg) => { wg.rotation.x = (wg.userData.s > 0 ? 0 : Math.PI) + Math.sin(time * 9) * .35 * wg.userData.s; });
      if (env.crab) { crabPos.lerp(env.crab, .06); crabVis = lerp(crabVis, 1, .08); } else crabVis = lerp(crabVis, 0, .1);
      crab.position.copy(crabPos); crab.scale.setScalar(Math.max(.001, crabVis)); crab.rotation.y = -.5 + Math.sin(time * .4) * .15; crab.position.y += Math.abs(Math.sin(time * 3)) * .03;
      crab.userData.claws.forEach((c) => { c.rotation.z = Math.sin(time * 1.4 + c.userData.s) * .18 * c.userData.s; });
      crab.userData.legs.forEach((l) => { l.rotation.x = Math.sin(time * 4 + l.userData.ph * 2) * .18; });
      const kb = env.crab ? env.kalbas : 0; kalbas.count = kb; kalbasM.color.set(env.empty > .5 ? '#7a6a55' : '#c9a061');
      for (let i = 0; i < kb; i++) { const o = kalbasOff[i], x = crabPos.x + 2.2 + o[0], z = crabPos.z + o[1], y = Math.max(H(x, z), env.water - .2) + o[2]; m4.compose(tmp.set(x, y, z), q.identity(), s3.set(1, 1.2, 1)); kalbas.setMatrixAt(i, m4); }
      kalbas.instanceMatrix.needsUpdate = true;
      const bp = project(tmp2.copy(bird.position).add(V(0, .6, 0))), cp = project(tmp2.copy(crab.position).add(V(0, 1.5, 0)));
      out.chars.bird = { x: bp[0], y: bp[1], vis: bp[2] }; out.chars.crab = { x: cp[0], y: cp[1], vis: cp[2] && crabVis > .5 };
    }
    renderer.render(scene, camera);
    return out;
  }
  function pick(nx, ny) {
    ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
    if (S.mode === 'hub') { const hits = ray.intersectObjects([...cards.map((c) => c.plane), teller.userData.plane], false); if (!hits.length) return null; return hits[0].object === teller.userData.plane ? { type: 'teller' } : { type: 'card', i: hits[0].object.userData.card }; }
    if (S.mode === 'tale') { const hits = ray.intersectObjects([bird, crab], true); if (!hits.length) return null; let o = hits[0].object; while (o && !o.userData.name) o = o.parent; return o ? { type: 'char', name: o.userData.name } : null; }
    return null;
  }
  function resetWorld(pf) { const { i0, i1, f } = worldCam(pf, cam, look); mixEnv(i0, i1, f); birdPos.copy(env.bird); if (env.crab) { crabPos.copy(env.crab); crabVis = 1; } else crabVis = 0; }
  function dispose() { renderer.dispose(); renderer.forceContextLoss(); }
  return { frame, pick, resetWorld, dispose, cardT: (i) => cards[i] ? cards[i].t : 0 };
}
