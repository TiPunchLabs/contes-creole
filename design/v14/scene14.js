import * as THREE from '__THREE__';
// v14.2 — Konpè Lapen et Konpè Zanba se promènent librement dans la clairière (formes rondes, madras et bakoua en touche), réagissent au toucher.
// v14.1 — végétation guadeloupéenne sobre autour de l'arbre (arbre à pain, flamboyant, bananier, balisier, fougère arborescente) ; 3 cocotiers en touche.
// v14 Jeunesse — univers doux et chaleureux pour les enfants : crépuscule pêche / lavande, grande lune qui se lève, canopée ronde et vivante (respire, frémit au survol), creux lumineux dans le tronc, lucioles dorées ; cartes plus grandes et claires ; mode « léger » pour tablettes.
// v13.2 — collisions personnages / décor : positions résolues par station (source, barrage, citerne), zones libres pour rochers et arbres, calage au sol sur l'empreinte, kalbas placées côté dégagé.
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
    if (tale.ready) { g.addColorStop(0, '#b9b3e3'); g.addColorStop(.3, '#f7c4a6'); g.addColorStop(.5, '#ffe2b4'); g.addColorStop(1, '#ffe2b4'); } else { g.addColorStop(0, '#f6e8cf'); g.addColorStop(1, '#ead6b2'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(120,80,50,${rnd() * .04})`; x.fillRect(rnd() * W, rnd() * H, 2, 2); }
    if (tale.ready) {
      const mx = W * .68, my = H * .24, mr = 46;
      const glow = x.createRadialGradient(mx, my, mr, mx, my, mr * 4); glow.addColorStop(0, 'rgba(255,246,220,.6)'); glow.addColorStop(1, 'rgba(255,246,220,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
      x.fillStyle = '#fff6dc'; x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(255,250,235,${.5 + rnd() * .5})`; x.beginPath(); x.arc(rnd() * W, rnd() * H * .45, .8 + rnd() * 1.6, 0, Math.PI * 2); x.fill(); }
      // rivière qui descend vers nous, reflet de lune
      x.fillStyle = '#5bbcb6'; x.beginPath(); x.moveTo(W * .47, H * .5); x.quadraticCurveTo(W * .3, H * .7, W * .12, H); x.lineTo(W * .92, H); x.quadraticCurveTo(W * .6, H * .7, W * .53, H * .5); x.fill();
      for (let i = 0; i < 40; i++) { const yy = H * (.52 + rnd() * .46), t = (yy - H * .5) / (H * .5); x.strokeStyle = `rgba(255,255,245,${.35 + rnd() * .5})`; x.lineWidth = 1 + rnd() * 1.5; const cx = W * (.5 + t * .18) + (rnd() - .5) * W * .25 * t; x.beginPath(); x.moveTo(cx, yy); x.lineTo(cx + 8 + rnd() * 24, yy); x.stroke(); }
      x.fillStyle = '#7bab4e'; x.beginPath(); x.moveTo(0, H * .5); x.quadraticCurveTo(W * .25, H * .42, W * .47, H * .5); x.quadraticCurveTo(W * .3, H * .7, W * .12, H); x.lineTo(0, H); x.fill();
      x.beginPath(); x.moveTo(W, H * .5); x.quadraticCurveTo(W * .75, H * .44, W * .53, H * .5); x.quadraticCurveTo(W * .6, H * .7, W * .92, H); x.lineTo(W, H); x.fill();
      // Ti Kannot (oiseau doré) sur une branche à gauche, Gwo Rako (crabe) à droite
      x.strokeStyle = '#7a5236'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, H * .6); x.quadraticCurveTo(W * .12, H * .56, W * .24, H * .58); x.stroke();
      x.fillStyle = '#f2c46d'; x.beginPath(); x.ellipse(W * .2, H * .555, 14, 9, -.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(W * .225, H * .535, 6.5, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(W * .187, H * .552); x.lineTo(W * .155, H * .53); x.lineTo(W * .16, H * .56); x.fill();
      x.fillStyle = '#e07a3a'; x.beginPath(); x.moveTo(W * .237, H * .535); x.lineTo(W * .26, H * .54); x.lineTo(W * .237, H * .545); x.fill();
      const rx = W * .78, ry = H * .66; x.fillStyle = '#d9603a'; x.beginPath(); x.ellipse(rx, ry, 30, 19, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#d9603a'; x.lineWidth = 4; for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(rx + d * 22, ry + i * 5); x.lineTo(rx + d * (36 + i * 6), ry + 8 + i * 7); x.lineTo(rx + d * (42 + i * 6), ry + 20 + i * 5); x.stroke(); }
      for (const d of [-1, 1]) { x.beginPath(); x.arc(rx + d * 40, ry - 16, 11, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f6e3b0'; x.beginPath(); x.arc(rx + d * 8, ry - 22, 4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d9603a'; }
      for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,236,150,${.5 + rnd() * .5})`; x.beginPath(); x.arc(rnd() * W, H * (.55 + rnd() * .45), 1 + rnd() * 2.2, 0, Math.PI * 2); x.fill(); }
    } else {
      x.strokeStyle = '#a0805e'; x.lineWidth = 5; x.beginPath(); x.arc(W / 2, H * .38, 34, Math.PI, 0); x.moveTo(W / 2 - 34, H * .38); x.lineTo(W / 2 - 34, H * .46); x.lineTo(W / 2 + 34, H * .46); x.lineTo(W / 2 + 34, H * .38); x.stroke();
      x.fillStyle = '#a0805e'; x.beginPath(); x.arc(W / 2, H * .5, 7, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#fff7e8'; x.beginPath(); x.roundRect(30, H * .69, W - 60, H * .27, 22); x.fill();
    x.strokeStyle = tale.ready ? '#c4572e' : '#b39a7a'; x.lineWidth = 8; x.beginPath(); x.roundRect(12, 12, W - 24, H - 24, 30); x.stroke();
    x.textAlign = 'center'; x.fillStyle = tale.ready ? '#3a2a20' : 'rgba(58,42,32,.6)';
    x.font = `700 26px 'Baloo 2', 'Andika', sans-serif`; x.fillText(tale.sub.toUpperCase(), W / 2, H * .745);
    x.font = `800 52px 'Baloo 2', 'Andika', sans-serif`;
    const words = tale.title.split(' '), lines = []; let cur = '';
    for (const w of words) { if (x.measureText(cur + ' ' + w).width > W - 120 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } lines.push(cur);
    lines.forEach((l, i) => x.fillText(l, W / 2, H * .83 + i * 54));
    x.font = `700 24px 'Andika', sans-serif`; x.fillStyle = tale.ready ? '#3a2a20' : 'rgba(58,42,32,.55)'; x.fillText(tale.theme, W / 2, H * .1);
    t.needsUpdate = true;
  };
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return t;
}

export function createScene(canvas, data, opts = {}) {
  const { TALES, PAGES } = data; const LITE = !!opts.lite, K = LITE ? .45 : 1, N = (n) => Math.max(1, Math.round(n * K));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LITE ? 1 : 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
  const scene = new THREE.Scene();

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), s3 = V();
  // ================= HUB : le Pyébwa a Sav =================
  const hub = new THREE.Group(); scene.add(hub);
  const hubFog = new THREE.FogExp2('#f6cfae', .0105);
  hub.add(new THREE.HemisphereLight('#ffe9cc', '#86a35a', 1.6));
  const canopyLight = new THREE.PointLight('#ffd890', 26, 30, 1.6); canopyLight.position.set(0, 11, 0); hub.add(canopyLight);
  const baseLight = new THREE.PointLight('#ffb878', 14, 22, 1.6); baseLight.position.set(1, 2, -3); hub.add(baseLight);
  const rim = new THREE.DirectionalLight('#ffd2a0', 1.7); rim.position.set(-30, 26, 60); hub.add(rim);
  const key = new THREE.DirectionalLight('#fff3e2', .9); key.position.set(10, 20, -40); hub.add(key);
  // ciel du soir : lavande en haut, pêche puis or au ras des mornes
  const hubSky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 hz=vec3(1.,.87,.66), mid=vec3(.98,.76,.66), top=vec3(.66,.64,.86);
      vec3 c=mix(hz,mid,smoothstep(-.02,.18,h)); c=mix(c,top,smoothstep(.15,.7,h)); gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }` })); hub.add(hubSky);
  // sol : plateau autour de l'arbre, qui ondule doucement puis descend vers les mornes
  const gH = (x, z) => { const d = Math.hypot(x, z); return -.6 + Math.sin(x * .21) * Math.cos(z * .17) * .35 * Math.min(1, d / 12) + Math.sin(x * .05 + 1) * Math.sin(z * .06) * 1.2 * Math.min(1, Math.max(0, (d - 20) / 30)); };
  { const gg = new THREE.PlaneGeometry(200, 200, 90, 90); gg.rotateX(-Math.PI / 2); const p = gg.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#7ea552'), cB = new THREE.Color('#b8c96c');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = gH(x, z); p.setY(i, y); const t = clamp((y + 1) / 2, 0, 1) * (.5 + .5 * rnd()); const c = cA.clone().lerp(cB, t); col.set([c.r, c.g, c.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals(); hub.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }))); }
  // mornes : silhouettes de collines au loin, deux plans
  for (const [r, hh, col, n] of [[62, 14, '#c9a7b4', 9], [88, 24, '#b9a6cc', 7]]) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * .5, m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, roughness: 1, flatShading: true })); m.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); m.scale.set(18 + rnd() * 20, hh * (.6 + rnd() * .7), 14 + rnd() * 14); hub.add(m); }
  // végétation éparse : palmiers (pyé koko), arbres à pain ronds, fougères et touffes d'herbe — jamais sur le chemin de la caméra (r 17–21)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#9a7458', roughness: 1, flatShading: true }), frondMat = new THREE.MeshStandardMaterial({ color: '#5f9c46', roughness: 1, flatShading: true, side: THREE.DoubleSide }), bushMat = new THREE.MeshStandardMaterial({ color: '#6ea44a', roughness: 1, flatShading: true });
  const frondGeo = new THREE.PlaneGeometry(.5, 3.2, 1, 4); frondGeo.translate(0, 1.6, 0); { const p = frondGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 3.2; p.setZ(i, -y * y * 1.4); p.setX(i, p.getX(i) * (1 - y * .7)); } frondGeo.computeVertexNormals(); }
  const palm = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, gH(x, z), z); const lean = (rnd() - .5) * .3, t = new THREE.Mesh(new THREE.CylinderGeometry(.09, .16, h, 6), trunkMat); t.position.y = h / 2; t.rotation.z = lean; g.add(t);
    const crown = new THREE.Group(); crown.position.set(Math.sin(-lean) * h * .5, Math.cos(lean) * h, 0); for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(frondGeo, frondMat); f.rotation.y = i / 8 * Math.PI * 2 + rnd() * .3; f.rotation.x = -.35 - rnd() * .35; f.scale.setScalar(.8 + rnd() * .4); crown.add(f); } g.add(crown); g.userData.crown = crown; g.rotation.y = rnd() * 6.28; hub.add(g); return g; };
  // flore de Guadeloupe, sobre : arbres à pain et flamboyants au loin, bananiers et balisiers près de la clairière, fougères arborescentes (Basse-Terre) ; trois cocotiers seulement, la « petite note »
  const palms = [], put = (g, x, z) => { g.position.set(x, gH(x, z), z); g.rotation.y = rnd() * 6.28; hub.add(g); palms.push(g); return g; };
  for (const [x, z, h] of [[-9.5, -10, 6.5], [11, -8, 5.5], [-28, 22, 8]]) palms.push(palm(x, z, h));
  const breadMat = new THREE.MeshStandardMaterial({ color: '#4c8a3a', roughness: .75, flatShading: true }), fruitMat = new THREE.MeshStandardMaterial({ color: '#b9d05c', roughness: .7 });
  const breadfruit = (x, z, k) => { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(.22 * k, .34 * k, 2.6 * k, 6), trunkMat); t.position.y = 1.3 * k; g.add(t);
    const crown = new THREE.Group(); crown.position.y = 3.3 * k; for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry((1 + rnd() * .4) * k, 1), breadMat); const a = i / 5 * Math.PI * 2; p.position.set(Math.cos(a) * .9 * k, (rnd() - .3) * .6 * k, Math.sin(a) * .9 * k); p.scale.y = .8; crown.add(p); }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * k, 1), breadMat); top.position.y = .7 * k; crown.add(top);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.16 * k, 8, 6), fruitMat), a = rnd() * 6.28; f.position.set(Math.cos(a) * 1.6 * k, -.5 * k, Math.sin(a) * 1.6 * k); crown.add(f); }
    g.add(crown); g.userData.crown = crown; return put(g, x, z); };
  const flamGreen = new THREE.MeshStandardMaterial({ color: '#6a9e46', roughness: .85, flatShading: true }), flamRed = new THREE.MeshStandardMaterial({ color: '#e5582e', roughness: .8, flatShading: true, emissive: '#7a2410', emissiveIntensity: .15 });
  const flamboyant = (x, z, k) => { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(.22 * k, .34 * k, 2.4 * k, 6), trunkMat); t.position.y = 1.2 * k; g.add(t);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, br = new THREE.Mesh(new THREE.CylinderGeometry(.08 * k, .14 * k, 1.9 * k, 5), trunkMat); br.position.set(Math.cos(a) * .55 * k, 3 * k, Math.sin(a) * .55 * k); br.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); g.add(br); }
    const crown = new THREE.Group(); crown.position.y = 3.9 * k; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + rnd() * .3, rr = i ? 1.7 * k : 0, p = new THREE.Mesh(new THREE.SphereGeometry(1.15 * k, 10, 6), rnd() < .62 ? flamRed : flamGreen); p.position.set(Math.cos(a) * rr, rnd() * .25 * k, Math.sin(a) * rr); p.scale.set(1.25, .38, 1.25); crown.add(p); }
    g.add(crown); g.userData.crown = crown; return put(g, x, z); };
  const bLeafGeo = new THREE.PlaneGeometry(.75, 2.4, 1, 6); bLeafGeo.translate(0, 1.2, 0); { const p = bLeafGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 2.4; p.setZ(i, -y * y * 1.2); p.setX(i, p.getX(i) * Math.sin(Math.min(1, y * 1.3 + .15) * Math.PI) * 1.1); } bLeafGeo.computeVertexNormals(); }
  const bananaMat = new THREE.MeshStandardMaterial({ color: '#86b84e', roughness: .8, side: THREE.DoubleSide, flatShading: true }), stemMat = new THREE.MeshStandardMaterial({ color: '#8da45a', roughness: 1 });
  const banana = (x, z, h) => { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, h, 7), stemMat); t.position.y = h / 2; g.add(t);
    const crown = new THREE.Group(); crown.position.y = h; for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(bLeafGeo, bananaMat); l.rotation.y = i / 7 * Math.PI * 2 + rnd() * .4; l.rotation.x = -.25 - rnd() * .45; l.scale.setScalar(.85 + rnd() * .3); crown.add(l); } g.add(crown); g.userData.crown = crown; return put(g, x, z); };
  const bractMat = new THREE.MeshStandardMaterial({ color: '#d8432a', roughness: .6, emissive: '#6a1a0a', emissiveIntensity: .15 }), tipMat = new THREE.MeshStandardMaterial({ color: '#f2c84a', roughness: .6 });
  const balisier = (x, z) => { const g = new THREE.Group(), crown = new THREE.Group(); g.add(crown);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(bLeafGeo, bananaMat); l.rotation.y = i / 6 * Math.PI * 2 + rnd() * .5; l.rotation.x = -.12 - rnd() * .2; l.scale.set(.55, .62 + rnd() * .2, .55); crown.add(l); }
    for (let k = 0; k < 2; k++) { const stalk = new THREE.Group(), hh = 1.2 + rnd() * .4; stalk.position.set((rnd() - .5) * .5, 0, (rnd() - .5) * .5); const st = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, hh, 4), stemMat); st.position.y = hh / 2; stalk.add(st);
      for (let j = 0; j < 4; j++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.07, .3, 5), bractMat), sd = j % 2 ? 1 : -1; c.position.set(sd * .11, hh - .1 - j * .17, 0); c.rotation.z = sd * -1.15; const tp = new THREE.Mesh(new THREE.SphereGeometry(.035, 5, 4), tipMat); tp.position.set(sd * .14, .1, 0); c.add(tp); stalk.add(c); } crown.add(stalk); }
    g.userData.crown = crown; return put(g, x, z); };
  const tfernTrunk = new THREE.MeshStandardMaterial({ color: '#5a4232', roughness: 1, flatShading: true }), tfernMat = new THREE.MeshStandardMaterial({ color: '#6aa848', roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const treeFern = (x, z, h) => { const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(.1, .15, h, 6), tfernTrunk); t.position.y = h / 2; t.rotation.z = (rnd() - .5) * .12; g.add(t);
    const crown = new THREE.Group(); crown.position.y = h; for (let i = 0; i < 11; i++) { const f = new THREE.Mesh(frondGeo, tfernMat); f.rotation.y = i / 11 * Math.PI * 2; f.rotation.x = -.7 - rnd() * .3; f.scale.set(.75, .62, .75); crown.add(f); } g.add(crown); g.userData.crown = crown; return put(g, x, z); };
  // au loin (au-delà du chemin de la caméra, r > 23) : arbres à pain et flamboyants
  for (const [x, z, k] of [[30, 8, 1.15], [-34, -6, 1.3], [8, 36, 1.2], [-14, -34, 1.1], [36, -22, 1.25]]) breadfruit(x, z, k);
  flamboyant(-25, 7, 1.15); flamboyant(23, -17, 1.05); flamboyant(-6, 31, 1.2);
  // près de la clairière (r < 15, hors cadre caméra et Konteur) : bananiers, balisiers, fougères arborescentes
  for (const [x, z, h] of [[-12, 4, 2.4], [13, 3.5, 2.1], [-11.5, 6.5, 1.8]]) banana(x, z, h);
  for (const [x, z] of [[-4, -12.8], [-7.2, -9.4], [7.6, -10.6], [3, 11.5], [-9.8, -2]]) balisier(x, z);
  for (const [x, z, h] of [[-4, 13.6, 4.2], [5.5, 13.2, 3.6], [13.8, -3.5, 4.6]]) treeFern(x, z, h);
  const bladeGeo = frondGeo.clone(); bladeGeo.scale(.45, .3, .45);
  const fern = new THREE.InstancedMesh(bladeGeo, frondMat, 64 * 7); { let k = 0; for (let i = 0; i < 64; i++) { const a = rnd() * Math.PI * 2, r = i < 22 ? 4 + rnd() * 8 : 22 + rnd() * 28, x = Math.cos(a) * r, z = Math.sin(a) * r, y = gH(x, z), sc = .7 + rnd() * .8, e = new THREE.Euler();
    for (let j = 0; j < 7; j++) { e.set(-.5 - rnd() * .6, j / 7 * Math.PI * 2 + rnd() * .5, 0, 'YXZ'); m4.compose(V(x, y, z), q.setFromEuler(e), s3.set(sc, sc * (.8 + rnd() * .5), sc)); fern.setMatrixAt(k++, m4); } } } hub.add(fern);
  const grass = glowPoints(N(600), () => { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 14, x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, gH(x, z) + .1 + rnd() * .3, z]; }, { size: .14, drift: .06, a: '#6f9e42', b: '#9cbf58' }); grass.material.blending = THREE.NormalBlending; grass.material.uniforms.uOpacity.value = .7; hub.add(grass);
  const pool = softSprite('#ffd890', 14, .22); pool.position.set(0, -.4, 0); hub.add(pool);
  // l'arbre : branches instanciées + racines
  const branches = [], tips = [];
  const grow = (p, dir, len, rad, depth) => {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    branches.push({ p0: p, p1: end, r: rad, len, dir });
    if (depth >= 6 || rad < .04) { tips.push(end); return; }
    // tronc droit et couronne équilibrée : 1re fourche symétrique + flèche centrale, inclinaisons bornées ensuite
    if (depth === 0) { const off = rnd() * 6.28; for (let i = 0; i < 3; i++) { const a = off + i / 3 * Math.PI * 2; grow(end, V(Math.cos(a) * .7, 1, Math.sin(a) * .7).normalize(), len * .68, rad * .62, 1); } grow(end, V(0, 1, 0), len * .55, rad * .55, 2); return; }
    const n = depth < 2 ? 3 : rnd() < .65 ? 2 : 3, base = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = base + i / n * Math.PI * 2 + (rnd() - .5) * .6, tilt = .35 + rnd() * .4;
      const d = dir.clone().multiplyScalar(1.4).add(V(Math.cos(a) * tilt, 0, Math.sin(a) * tilt)).add(V(0, .18, 0)).normalize(); if (d.y < .45) { d.y = .45; d.normalize(); }
      grow(end, d, len * (.62 + rnd() * .14), rad * .6, depth + 1);
    }
  };
  grow(V(0, -.8, 0), V(0, 1, 0), 4.6, 1.05, 0);
  // racines : contreforts courts et épais qui plongent dans le sol (pas de planches posées)
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + rnd() * .3, L = 1.7 + rnd() * .4; branches.push({ p0: V(0, .9, 0), p1: V(Math.cos(a) * L, -.9, Math.sin(a) * L), r: .5, len: 2.4 }); }
  { const c = tips.reduce((a, t) => a.add(V(t.x, 0, t.z)), V()).multiplyScalar(1 / tips.length), y0 = 3.8;
    const shift = (p) => { if (p.y > y0) { const k = Math.min(1, (p.y - y0) / 3); p.x -= c.x * k; p.z -= c.z * k; } };
    const seen = new Set(); for (const b of branches) for (const p of [b.p0, b.p1]) if (!seen.has(p)) { seen.add(p); shift(p); } for (const t of tips) if (!seen.has(t)) { seen.add(t); shift(t); } }
  const barkGeo = new THREE.CylinderGeometry(.62, 1, 1, 7, 1); barkGeo.translate(0, .5, 0);
  const bark = new THREE.InstancedMesh(barkGeo, new THREE.MeshStandardMaterial({ color: '#9a6a46', roughness: .9, flatShading: true }), branches.length);
  branches.forEach((b, i) => { const d = b.p1.clone().sub(b.p0), L = d.length(); q.setFromUnitVectors(up, d.normalize()); s3.set(b.r, L, b.r); m4.compose(b.p0, q, s3); bark.setMatrixAt(i, m4); });
  hub.add(bark);
  // canopée : touffes rondes et douces (quelques fleurs de flamboyant), qui respirent et frémissent
  const canopy = new THREE.Group(); hub.add(canopy);
  const puffN = tips.length + 26, puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, LITE ? 1 : 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, emissive: '#3a5a1c', emissiveIntensity: .25 }), puffN);
  { const pc = new THREE.Color(), greens = ['#6fae4a', '#86bf55', '#a2cd62', '#5c9d42'];
    for (let i = 0; i < puffN; i++) { const t = tips[i % tips.length], j = i >= tips.length, r = (j ? .8 : 1.05) + rnd() * .55; m4.compose(V(t.x + (j ? (rnd() - .5) * 1.6 : 0), t.y + (j ? (rnd() - .3) * 1.2 : 0), t.z + (j ? (rnd() - .5) * 1.6 : 0)), q.identity(), s3.set(r * 1.1, r * .85, r * 1.1)); puffs.setMatrixAt(i, m4);
      puffs.setColorAt(i, pc.set(rnd() < .1 ? '#f0793c' : greens[(rnd() * greens.length) | 0])); } }
  canopy.add(puffs);
  // le creux du tronc, côté arrivée : une petite fenêtre chaude, la « maison » des contes
  const hollow = new THREE.Group(); hollow.position.set(0, 2.1, -.9); hollow.rotation.x = -.08; hub.add(hollow);
  { const rimH = new THREE.Mesh(new THREE.TorusGeometry(.4, .09, 8, 20), new THREE.MeshStandardMaterial({ color: '#6e4a30', roughness: 1 })); rimH.scale.y = 1.25;
    const inner = new THREE.Mesh(new THREE.CircleGeometry(.4, 20), new THREE.MeshBasicMaterial({ color: '#ffcf7e' })); inner.scale.y = 1.25; inner.rotation.y = Math.PI; inner.position.z = .01;
    const hg = softSprite('#ffc870', 2.6, .45); hg.position.z = -.15; hollow.add(rimH, inner, hg); hollow.userData = { hg, inner }; }
  const leaves = glowPoints(N(tips.length * 6), (i) => { const t = tips[i % tips.length], r = 1.25 * Math.cbrt(rnd()), th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1); return [t.x + r * Math.sin(ph) * Math.cos(th), t.y + r * Math.cos(ph) * .8, t.z + r * Math.sin(ph) * Math.sin(th)]; }, { size: .26, drift: .12, a: '#fff4b8', b: '#ffd27a' });
  canopy.add(leaves);
  const fireflies = glowPoints(N(340), () => { const a = rnd() * Math.PI * 2, r = 3 + rnd() * 13; return [Math.cos(a) * r, rnd() * 15, Math.sin(a) * r]; }, { size: .24, drift: 1.2, a: '#fff2a8', b: '#ffcf6a' });
  hub.add(fireflies);
  const hubStars = glowPoints(N(90), () => { const th = rnd() * Math.PI * 2, ph = .55 + rnd() * .8; return [Math.cos(th) * Math.cos(ph) * 220, Math.sin(ph) * 220 + 10, Math.sin(th) * Math.cos(ph) * 220]; }, { size: 1.2, a: '#ffffff', b: '#fff6dc' }); hubStars.material.uniforms.uOpacity.value = .55;
  hub.add(hubStars);
  const moonHub = softSprite('#fff6dc', 34, 1, false); moonHub.position.set(-46, 30, 120); moonHub.material.fog = false; hub.add(moonHub);
  { const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: '#fff8e6', fog: false })); disc.position.copy(moonHub.position).add(V(0, 0, 2)); disc.lookAt(0, 8, 0); hub.add(disc); }
  const mists = []; for (let i = 0; i < N(12); i++) { const s = softSprite('#fff0dc', 14 + rnd() * 14, .16, false); s.position.set((rnd() - .5) * 40, -.2 + rnd() * 1.5, (rnd() - .5) * 40); s.userData.ph = rnd() * 6.28; mists.push(s); hub.add(s); }
  // le Konteur : le personnage (découpe photo) assis au pied de l'arbre, avec sa lanterne
  const teller = new THREE.Group(); teller.position.set(5.2, gH(5.2, -12.5) + .02, -12.5); hub.add(teller);
  const tellerTex = new THREE.TextureLoader().load((window.__resources && window.__resources.konteur) || '../konteur.png'); tellerTex.colorSpace = THREE.SRGBColorSpace; tellerTex.anisotropy = 8;
  const TH = 1.75, TW = TH * .588; // adulte assis ≈ 1,5 m ; ratio de l'image
  const tellerMat = new THREE.MeshStandardMaterial({ map: tellerTex, transparent: true, alphaTest: .08, roughness: .9, color: '#ffffff', emissive: '#6a5040', emissiveMap: tellerTex, emissiveIntensity: .18, side: THREE.DoubleSide });
  const tellerPlane = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), tellerMat); tellerPlane.position.y = TH / 2 - .02; teller.add(tellerPlane);
  const tellerShadow = softSprite('#5a3a24', 1.6, .35, false); tellerShadow.material.rotation = 0; tellerShadow.position.set(0, .02, .2); tellerShadow.scale.set(1.7, .5, 1); teller.add(tellerShadow);
  { const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .24, 8), new THREE.MeshStandardMaterial({ color: '#f6d38a', emissive: '#f0a850', emissiveIntensity: 1.6, roughness: .3 })); lampGlass.position.set(.7, .13, .15);
    const lampCap = new THREE.Mesh(new THREE.ConeGeometry(.12, .09, 8), new THREE.MeshStandardMaterial({ color: '#2a2a30', metalness: .5, roughness: .6 })); lampCap.position.set(.7, .3, .15);
    const lampLight = new THREE.PointLight('#f0b860', 4, 8, 1.6); lampLight.position.set(.7, .5, .45);
    const fill = new THREE.PointLight('#f6d8a8', 10, 7, 1.4); fill.position.set(-.4, 1.4, 2.2); teller.add(fill);
    const glow = softSprite('#f0b860', 2, .2); glow.position.set(.7, .2, .15);
    const seat = new THREE.Mesh(new THREE.DodecahedronGeometry(.55, 0), new THREE.MeshStandardMaterial({ color: '#8a6a52', roughness: 1, flatShading: true })); seat.position.set(0, -.12, -.25); seat.scale.set(1.3, .42, 1); seat.rotation.set(.2, .6, .1); teller.add(seat);
    teller.add(lampGlass, lampCap, lampLight, glow); teller.userData = { lampLight, plane: tellerPlane, glow, lampGlass, lit: 0 }; }
  // ---- Konpè Lapen & Konpè Zanba : personnages tout en rondeurs, qui flânent dans la clairière ----
  const MT = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .82 }, o));
  const SPH = new THREE.SphereGeometry(1, 22, 16), eyeMat = MT('#2a1d16', { roughness: .25 }), shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mk = (geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; };
  const eye = (x, y, z, r) => { const g = new THREE.Group(); g.position.set(x, y, z); g.add(mk(SPH, eyeMat, 0, 0, 0, r, r * 1.2, r * .8)); g.add(mk(SPH, shineMat, r * .35, r * .45, r * .6, r * .32)); return g; };
  const madrasTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#e8b23a'; x.fillRect(0, 0, 64, 64);
    for (const [col, p, w] of [['#d2432c', 0, 14], ['#d2432c', 32, 14], ['#3f8a4a', 18, 5], ['#3f8a4a', 50, 5]]) { x.fillStyle = col; x.globalAlpha = .85; x.fillRect(p, 0, w, 64); x.fillRect(0, p, 64, w); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(70,40,20,.45)'); g.addColorStop(1, 'rgba(70,40,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blob = (r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .03; return m; };
  // Konpè Lapen : petit, malin, foulard madras
  const lapen = new THREE.Group(); { const fur = MT('#c99868'), cream = MT('#f5e6cc'), pink = MT('#eaa79a'), body = new THREE.Group(); lapen.add(body);
    body.add(mk(SPH, fur, 0, .55, 0, .42, .5, .38), mk(SPH, cream, 0, .5, .16, .3, .37, .26), mk(SPH, cream, 0, .46, -.37, .14));
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(.25, .065, 10, 24), MT('#ffffff', { map: madrasTex })); scarf.position.set(0, .9, .02); scarf.rotation.x = Math.PI / 2 - .15; body.add(scarf);
    body.add(mk(SPH, MT('#ffffff', { map: madrasTex }), .1, .84, .27, .07, .1, .05));
    const head = new THREE.Group(); head.position.set(0, 1.12, .07); body.add(head);
    head.add(mk(SPH, fur, 0, 0, 0, .34, .31, .31), mk(SPH, cream, 0, -.09, .22, .17, .12, .13), mk(SPH, pink, 0, -.02, .33, .05, .04, .04), mk(SPH, pink, .2, -.08, .19, .06, .04, .03), mk(SPH, pink, -.2, -.08, .19, .06, .04, .03));
    head.add(eye(.13, .05, .25, .055), eye(-.13, .05, .25, .055));
    const ears = [-1, 1].map((sd) => { const e = new THREE.Group(); e.position.set(sd * .11, .24, -.03); e.add(mk(SPH, fur, 0, .3, 0, .095, .33, .055), mk(SPH, pink, 0, .3, .035, .06, .26, .02)); e.rotation.z = -sd * .16; head.add(e); return e; });
    const feet = [-1, 1].map((sd) => { const f = mk(SPH, cream, sd * .2, .07, .1, .12, .07, .22); lapen.add(f); return f; });
    const paws = [-1, 1].map((sd) => { const p = mk(SPH, fur, sd * .2, .4, .27, .08, .11, .08); body.add(p); return p; });
    lapen.add(blob(.55)); lapen.scale.setScalar(.66); lapen.userData = { who: 'lapen', body, head, ears, feet, paws }; hub.add(lapen); }
  // Konpè Zanba : grand, gourmand, bakoua sur la tête
  const zanba = new THREE.Group(); { const skin = MT('#b0a2b9'), light = MT('#cdbfd2'), pink = MT('#e9b3ad'), nail = MT('#f3e6d2'), straw = MT('#e2c07a'), body = new THREE.Group(); zanba.add(body);
    body.add(mk(SPH, skin, 0, 1.18, -.1, .86, .74, 1.0), mk(SPH, light, 0, 1.0, .35, .62, .52, .55), mk(SPH, skin, 0, 1.25, -1.05, .07, .22, .07));
    const LEG = new THREE.CapsuleGeometry(.23, .42, 6, 14);
    const legs = [[.44, .5], [-.44, .5], [.44, -.6], [-.44, -.6]].map(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, .78, z); g.add(mk(LEG, skin, 0, -.4, 0, 1, 1, 1)); for (const k of [-1, 0, 1]) g.add(mk(SPH, nail, k * .1, -.72, .18, .055, .045, .04)); zanba.add(g); g.userData.ph = i === 0 || i === 3 ? 0 : Math.PI; return g; });
    const head = new THREE.Group(); head.position.set(0, 1.62, .8); body.add(head);
    head.add(mk(SPH, skin, 0, 0, 0, .56, .52, .5), mk(SPH, pink, .3, -.12, .34, .09, .06, .04), mk(SPH, pink, -.3, -.12, .34, .09, .06, .04));
    head.add(eye(.21, .1, .4, .07), eye(-.21, .1, .4, .07));
    const ears = [-1, 1].map((sd) => { const e = new THREE.Group(); e.position.set(sd * .5, .05, -.08); e.add(mk(SPH, skin, sd * .2, -.05, 0, .42, .5, .07), mk(SPH, pink, sd * .2, -.05, .05, .3, .38, .03)); e.rotation.y = sd * .5; head.add(e); return e; });
    const trunk = []; { let parent = new THREE.Group(); parent.position.set(0, -.12, .44); head.add(parent);
      for (let k = 0; k < 5; k++) { const r = .17 - k * .022; parent.add(mk(SPH, skin, 0, -.1, 0, r, .15, r)); if (k === 4) parent.add(mk(SPH, light, 0, -.24, 0, r * .9, .05, r * .9)); trunk.push(parent); const nx = new THREE.Group(); nx.position.set(0, -.19, .015); parent.add(nx); parent = nx; } }
    const hat = new THREE.Group(); hat.position.set(.06, .5, -.05); hat.rotation.set(-.12, 0, -.12); head.add(hat);
    hat.add(mk(new THREE.ConeGeometry(.34, .34, 18), straw, 0, .17, 0), mk(new THREE.CylinderGeometry(.58, .6, .035, 24), straw, 0, .01, 0), mk(new THREE.CylinderGeometry(.3, .32, .06, 18), MT('#c4572e'), 0, .06, 0));
    zanba.add(blob(1.3)); zanba.scale.setScalar(.8); zanba.userData = { who: 'zanba', body, head, ears, trunk, legs }; hub.add(zanba); }
  // promenade libre : cibles tirées dans la clairière, hors arbre / Konteur / plantes, sans traverser le tronc
  const obstacles = [[0, 0, 4.2], [5.2, -12.5, 1.9], [-9.5, -10, 1], [11, -8, 1], [-12, 4, 1.4], [13, 3.5, 1.4], [-11.5, 6.5, 1.3], [-4, -12.8, .9], [-7.2, -9.4, .9], [7.6, -10.6, .9], [3, 11.5, .9], [-9.8, -2, .9], [-4, 13.6, 1], [5.5, 13.2, 1], [13.8, -3.5, 1]];
  const freeAt = (x, z, r) => obstacles.every((o) => Math.hypot(x - o[0], z - o[1]) > o[2] + r);
  const clearOfTree = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = clamp(-(a[0] * dx + a[1] * dz) / L2, 0, 1); return Math.hypot(a[0] + dx * t, a[1] + dz * t) > 4.4; };
  const critters = [
    { g: lapen, name: 'lapen', r: .55, speed: 2.4, step: 9, pos: [-6, -5.5], yaw: .4, wait: 1.2, tgt: null, moving: 0, phase: 0, react: 0, look: false, top: 1.55 },
    { g: zanba, name: 'zanba', r: 1.5, speed: .95, step: 4.2, pos: [7.5, 5.5], yaw: -2.2, wait: 2.5, tgt: null, moving: 0, phase: 0, react: 0, look: false, top: 2.55 }];
  const pickTarget = (c) => { for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, r = 5.2 + rnd() * 8.5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (freeAt(x, z, c.r) && clearOfTree(c.pos, [x, z]) && Math.hypot(x - c.pos[0], z - c.pos[1]) > 2.5) return [x, z]; } return null; };
  const angTo = (c, x, z) => { let d = Math.atan2(x - c.pos[0], z - c.pos[1]) - c.yaw; return Math.atan2(Math.sin(d), Math.cos(d)); };
  let lastT = 0;
  const updateCritters = (time) => { const dt = Math.min(.05, Math.max(0, time - lastT)); lastT = time;
    for (const c of critters) { c.react = Math.max(0, c.react - dt);
      if (c.react > 0) { c.yaw += angTo(c, camera.position.x, camera.position.z) * Math.min(1, dt * 5); c.moving = lerp(c.moving, 0, .2); }
      else if (c.wait > 0) { c.wait -= dt; c.moving = lerp(c.moving, 0, .12); if (c.look) c.yaw += angTo(c, camera.position.x, camera.position.z) * Math.min(1, dt * 2); if (c.wait <= 0) { c.tgt = pickTarget(c); if (!c.tgt) c.wait = 1; } }
      else if (c.tgt) { const dx = c.tgt[0] - c.pos[0], dz = c.tgt[1] - c.pos[1], d = Math.hypot(dx, dz);
        if (d < .25) { c.tgt = null; c.wait = 1.8 + rnd() * 4; c.look = rnd() < .6; }
        else { const dy = angTo(c, c.tgt[0], c.tgt[1]); c.yaw += dy * Math.min(1, dt * 3.5); const sp = c.speed * dt * (Math.abs(dy) < .7 ? 1 : .25), nx = c.pos[0] + Math.sin(c.yaw) * sp, nz = c.pos[1] + Math.cos(c.yaw) * sp, o = critters.find((k) => k !== c);
          if (Math.hypot(nx - o.pos[0], nz - o.pos[1]) < c.r + o.r + .4) { c.tgt = null; c.wait = .9 + rnd(); c.look = true; } else { c.pos[0] = nx; c.pos[1] = nz; } c.moving = lerp(c.moving, 1, .12); } }
      else c.wait = .4;
      c.phase += dt * c.step * Math.max(.15, c.moving);
      c.g.position.set(c.pos[0], gH(c.pos[0], c.pos[1]), c.pos[1]); c.g.rotation.y = c.yaw; }
    // Lapen : petits bonds, oreilles qui suivent ; saut de joie quand on le touche
    { const c = critters[0], u = lapen.userData, hop = Math.abs(Math.sin(c.phase * .5)) * c.moving, jump = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      u.body.position.y = hop * .32 + jump * .9; u.body.scale.set(1 + (1 - hop) * c.moving * .05, 1 - (1 - hop) * c.moving * .07 + hop * .04, 1);
      u.feet.forEach((f) => { f.position.y = .07 + hop * .25 + jump * .8; });
      const tw = Math.sin(time * 3.1) > .96 ? .25 : 0; u.ears.forEach((e, i) => { e.rotation.x = -.12 - hop * .45 + jump * .5 + Math.sin(time * 1.3 + i) * .05; e.rotation.z = (i ? -1 : 1) * (.16 + tw * (i ? 1 : 0) + jump * .25); });
      u.head.rotation.z = Math.sin(time * .9) * .06 * (1 - c.moving); u.paws.forEach((p, i) => { p.position.y = .4 + jump * .25 + (c.react > 0 ? Math.sin(time * 14 + i) * .04 : 0); }); }
    // Zanba : pas lourds et balancés, oreilles qui éventent, trompe qui ondule ; il lève la trompe quand on le touche
    { const c = critters[1], u = zanba.userData, up = c.react > 0 ? Math.sin((1 - c.react) * Math.PI) : 0;
      u.legs.forEach((l) => { l.rotation.x = Math.sin(c.phase + l.userData.ph) * .32 * c.moving; });
      u.body.rotation.z = Math.sin(c.phase) * .045 * c.moving; u.body.position.y = Math.abs(Math.cos(c.phase)) * .05 * c.moving + Math.sin(time * 1.1) * .012;
      u.ears.forEach((e, i) => { const sd = i ? 1 : -1; e.rotation.y = sd * (.5 + Math.sin(time * 1.6 + i * .4) * .16 + up * .3); });
      u.trunk.forEach((t, k) => { t.rotation.x = lerp(Math.sin(time * 1.3 - k * .7) * .14 + .06, -.62, up); });
      u.head.rotation.x = -up * .18 + Math.sin(time * .7) * .03; }
  };
  // chemin de caméra en spirale autour de l'arbre
  const hubCam = (t, out, look) => { const a = -Math.PI / 2 + t * Math.PI * 1.55, r = 20 - t * 4, y = 1.3 + t * 6.4; out.set(Math.cos(a) * r, y, Math.sin(a) * r); look.set(0, y + 2.2 - t * 1.2, 0); return a; };
  // cartes-livres suspendues aux branches
  const NT = TALES.length, cardTs = TALES.map((_, i) => NT === 1 ? .5 : .2 + i * (.68 / (NT - 1))), cards = [], tmpA = V(), tmpB = V(), CS = 1.18;
  const threadMat = new THREE.LineBasicMaterial({ color: '#7a5236', transparent: true, opacity: .85 });
  const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  TALES.forEach((tale, i) => {
    const t = cardTs[i], a = hubCam(t, tmpA, tmpB) + (i % 2 ? .06 : -.06), r = 12.2, y = tmpA.y + .3;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ map: coverTex(tale), transparent: true }));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshBasicMaterial({ color: '#f3e3c3', side: THREE.BackSide }));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.4), new THREE.MeshBasicMaterial({ map: haloTex, color: tale.ready ? '#ffe08a' : '#fff0d8', transparent: true, opacity: .0, depthWrite: false }));
    halo.position.z = -.02; g.add(halo, back, plane); g.userData = { i, tale, t, hover: 0 }; plane.userData.card = i; hub.add(g);
    // fil vers la branche la plus proche
    let best = tips[0], bd = 1e9; for (const tp of tips) { const d = tp.distanceTo(g.position); if (d < bd) { bd = d; best = tp; } }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([best, g.position.clone().add(V(0, 1.05, 0))]), threadMat); hub.add(line);
    cards.push({ g, plane, halo, line, top: g.position.clone().add(V(0, 1.05, 0)), tip: best, t });
  });

  // ================= MONDE : Larivyè Klè =================
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const worldFog = new THREE.FogExp2('#f2d2b4', .015);
  const STEP = 17, meander = (z) => Math.sin(z * .028) * 4 + Math.sin(z * .011) * 2;
  const noise = (x, z) => Math.sin(x * .9 + z * .7) * .5 + Math.sin(x * 2.3 - z * 1.7) * .25 + Math.sin(x * .3 + z * .21) * .8;
  const H = (x, z) => { const u = Math.abs(x - meander(z)); return .12 * Math.pow(u, 1.7) - 2.7 + noise(x, z) * .45 * Math.min(1, u / 4); };
  const hemi = new THREE.HemisphereLight('#ffe6c8', '#6a8a4a', 1.3); world.add(hemi);
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
  { const p = gg.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#5e8a46'), cB = new THREE.Color('#7fa852'), cC = new THREE.Color('#b9c46e');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = H(x, z); p.setY(i, h); const t = clamp((h + 2.7) / 6, 0, 1), c = t < .5 ? cA.clone().lerp(cB, t * 2) : cB.clone().lerp(cC, (t - .5) * 2); col.set([c.r, c.g, c.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals(); }
  world.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  // l'eau
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, cDeep: { value: new THREE.Color('#2f8a92') }, cShallow: { value: new THREE.Color('#6cc6bf') }, uMoon: { value: V(0, 10, -70) }, cMoon: { value: new THREE.Color('#fff1c8') }, uGlow: { value: 1 }, uFog: { value: new THREE.Color('#f2d2b4') }, uFogD: { value: .016 }, uCam: { value: V() } },
    vertexShader: `uniform float uTime; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.); w.y+=sin(w.x*.7+uTime*1.1)*.05+sin(w.z*.5-uTime*.8)*.06; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uGlow,uFogD; uniform vec3 cDeep,cShallow,uMoon,cMoon,uFog,uCam; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.98,78.23)))*43758.5); }
      void main(){ vec3 vd=normalize(uCam-vW); float fr=pow(1.-max(vd.y,0.),3.);
        vec3 c=mix(cDeep,cShallow,.25+fr*.6);
        vec2 dm=vW.xz-uMoon.xz; float streak=exp(-abs(dm.x+sin(vW.z*.6+uTime)*1.2)*.32)*clamp(1.-abs(dm.y)/90.,0.,1.);
        float shim=.5+.5*sin(vW.z*3.+uTime*3.+sin(vW.x*2.+uTime)); c+=cMoon*streak*shim*.8;
        float r=sin(vW.x*3.+uTime*1.6)*sin(vW.z*3.5-uTime*1.3); c+=cShallow*smoothstep(.86,1.,r)*.6;
        vec2 cell=floor(vW.xz*2.); vec2 fp=fract(vW.xz*2.)-.5; float n=hash(cell); c+=vec3(1.,.95,.6)*step(.975,n)*smoothstep(.22,.04,length(fp))*(.5+.5*sin(uTime*2.+n*60.))*uGlow;
        float dist=distance(uCam,vW); float f=1.-exp(-dist*dist*uFogD*uFogD); c=mix(c,uFog,f);
        gl_FragColor=vec4(c,.94); }`, transparent: true,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(gW, gL, 60, 100), waterMat); water.rotation.x = -Math.PI / 2; water.position.z = -gL / 2 + 40; world.add(water);
  // ---- v13.2 : obstacles fixes (source + roche + barrage, citerne) et positions libres des personnages par station ----
  const stZ = (i) => -i * STEP, R_CRAB = 2.0, R_BIRD = 1.05, R_KAL = 1.3;
  const obst = [];
  { const sp = new Set([4]); PAGES.forEach((p, i) => { if (p.env.spring || p.env.dam) sp.add(i); });
    for (const i of sp) { const z = stZ(i) - 7, x = meander(z) - 6.8; obst.push([x, z, 1.1], [x - 1.2, z - 1, 1.75], [x, z, 2.3]); }
    const tz = stZ(10) - 8; obst.push([meander(tz) + 5.2, tz, 1.95]); }
  const pushOut = (p, r, list) => { for (let it = 0; it < 4; it++) for (const o of list) { const dx = p[0] - o[0], dz = p[1] - o[1], d = Math.hypot(dx, dz) || 1e-3, m = r + o[2] + .2; if (d < m) { p[0] = o[0] + dx / d * m; p[1] = o[1] + dz / d * m; } } return p; };
  const clearance = (p, r, list) => list.reduce((a, o) => Math.min(a, Math.hypot(p[0] - o[0], p[1] - o[1]) - r - o[2]), 99);
  const RES = PAGES.map((pg, i) => { const e = pg.env, z = stZ(i), mz = (zz) => meander(zz);
    const bird = pushOut([mz(z) + e.bird[0], z + e.bird[2]], R_BIRD, obst);
    let crab = null, kal = null;
    if (e.crab) { crab = pushOut([mz(z) + e.crab[0], z + e.crab[1]], R_CRAB, obst.concat([[bird[0], bird[1], R_BIRD]]));
      // kalbas : le côté le plus dégagé autour du crabe (en évitant la caméra, placée vers +z)
      const others = obst.concat([[bird[0], bird[1], R_BIRD], [crab[0], crab[1], R_CRAB]]), dd = R_CRAB + R_KAL + .3; let best = -1e9;
      for (const a of [0, -.6, .6, -1.2, 1.2, Math.PI, -2.2, 2.2]) { const c = [crab[0] + Math.cos(a) * dd, crab[1] - Math.abs(Math.sin(a)) * dd * .6], sc = clearance(c, R_KAL, others) - Math.abs(c[0] - mz(c[1])) * .02; if (sc > best) { best = sc; kal = c; } } }
    const cam = [mz(z) + 1.4, z + 8.5];
    return { bird, crab, kal, cam }; });
  // zones à garder libres pour le décor : personnages, kalbas, caméra, et le couloir de vue caméra → personnages
  const keep = [];
  for (const r of RES) { keep.push([r.bird[0], r.bird[1], R_BIRD + .3], [r.cam[0], r.cam[1], 2.4]); if (r.crab) keep.push([r.crab[0], r.crab[1], R_CRAB + .3], [r.kal[0], r.kal[1], R_KAL + .3]);
    for (const tg of [r.bird, r.crab].filter(Boolean)) for (let k = 1; k < 6; k++) { const f = k / 6; keep.push([r.cam[0] + (tg[0] - r.cam[0]) * f, r.cam[1] + (tg[1] - r.cam[1]) * f, .8]); } }
  for (const o of obst) keep.push(o);
  const isFree = (x, z, r) => { for (const k of keep) if (Math.hypot(x - k[0], z - k[1]) < r + k[2]) return false; return true; };
  const footH = (x, z, r) => { let m = H(x, z); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; m = Math.max(m, H(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; };
  // arbres des berges (silhouettes), flè wouj, rochers du lit
  const treeGeo = new THREE.IcosahedronGeometry(1.3, 1); treeGeo.scale(1, .85, 1); treeGeo.translate(0, 2.4, 0);
  const treeTrunks = new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(.14, .22, 2.2, 5); g.translate(0, 1.1, 0); return g; })(), new THREE.MeshStandardMaterial({ color: '#8a6448', roughness: 1 }), 260); world.add(treeTrunks);
  const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshStandardMaterial({ color: '#5f9a46', roughness: 1, flatShading: true }), 260);
  const flowers = [];
  for (let i = 0; i < 260; i++) { let z, x, s, side = i % 2 ? 1 : -1, ok = false; for (let tr = 0; tr < 14 && !ok; tr++) { z = 30 - rnd() * 240; x = meander(z) + side * (8 + rnd() * 22); s = .8 + rnd() * 2.2; ok = isFree(x, z, s * .85); } if (!ok) { m4.makeScale(0, 0, 0); trees.setMatrixAt(i, m4); treeTrunks.setMatrixAt(i, m4); continue; } const y = H(x, z) - .1; m4.compose(V(x, y, z), q.setFromAxisAngle(up, rnd() * 6.28), s3.set(s * (.7 + rnd() * .5), s, s * (.7 + rnd() * .5))); trees.setMatrixAt(i, m4); treeTrunks.setMatrixAt(i, m4); if (rnd() < .3) for (let k = 0; k < 6; k++) flowers.push([x + (rnd() - .5) * s * 1.4, y + s * (1.5 + rnd() * 1.6), z + (rnd() - .5) * s * 1.4]); }
  world.add(trees);
  const flePts = glowPoints(flowers.length, (i) => flowers[i], { size: .3, a: '#ff6a4a', b: '#ffb347', drift: .05 }); world.add(flePts);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#a89482', roughness: 1, flatShading: true }), 220);
  for (let i = 0; i < 220; i++) { let z, x, s, ok = false; for (let tr = 0; tr < 14 && !ok; tr++) { z = 30 - rnd() * 240; x = meander(z) + (rnd() - .5) * 13; s = .25 + rnd() * .7; ok = isFree(x, z, s); } if (!ok) { m4.makeScale(0, 0, 0); rocks.setMatrixAt(i, m4); continue; } m4.compose(V(x, H(x, z) + s * .3, z), q.setFromAxisAngle(V(rnd(), rnd(), rnd()).normalize(), rnd() * 6.28), s3.set(s, s * .7, s)); rocks.setMatrixAt(i, m4); }
  world.add(rocks);
  const plankton = glowPoints(N(900), () => { const z = 30 - rnd() * 240; return [meander(z) + (rnd() - .5) * 14, .1 + rnd() * 3.5, z]; }, { size: .2, drift: .9, a: '#fff0a8', b: '#ffd27a' }); world.add(plankton);
  const worldStarsDummy = null;
  const rain = glowPoints(N(2000), () => [(rnd() - .5) * 40, rnd() * 20, (rnd() - .5) * 40], { size: .5, a: '#cfe9f5', b: '#e8f6ff', rain: true, fall: 14 }); rain.material.uniforms.uOpacity.value = 0; world.add(rain);
  const wMists = []; for (let i = 0; i < 16; i++) { const z = 20 - rnd() * 220, s = softSprite('#fff0e0', 12 + rnd() * 14, .14, false); s.position.set(meander(z) + (rnd() - .5) * 18, .6 + rnd() * 1.2, z); s.userData.ph = rnd() * 6.28; wMists.push(s); world.add(s); }
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
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 1.7, 6), new THREE.MeshStandardMaterial({ color: '#4a2e1e', roughness: 1 })); perch.rotation.z = Math.PI / 2 + .12; perch.position.set(-.35, -.46, 0);
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
  const kalbasOff = []; for (let i = 0; i < 24; i++) kalbasOff.push([(rnd() - .5) * 1.9, (rnd() - .5) * 1.5, .28 + Math.floor(i / 10) * .42]);

  // ================= état & interpolation =================
  const S = { mode: 'hub', t: 0, dive: 0, card: 0, pageF: 0, pointer: { x: 0, y: 0 }, hover: null, tellerHover: false };
  const cam = V(), look = V(), tmp = V(), tmp2 = V();
  const worldCam = (pf, out, lk) => {
    const i0 = Math.floor(clamp(pf, 0, PAGES.length - 1)), i1 = Math.min(i0 + 1, PAGES.length - 1), f = sm(clamp(pf - i0, 0, 1));
    const pos = (i) => { const z = st(i), w = PAGES[i].env.water; return V(meander(z) + 1.4, w + 2.6, z + 8.5); };
    const lkp = (i) => { const z = st(i) - 10; return V(meander(z), PAGES[i].env.water + .4, z); };
    out.copy(pos(i0)).lerp(pos(i1), f); lk.copy(lkp(i0)).lerp(lkp(i1), f); return { i0, i1, f };
  };
  const hsl = {}, soft = (c) => { c.getHSL(hsl); return c.setHSL(hsl.h, Math.min(.75, hsl.s * .9 + .05), .3 + hsl.l * .62); };
  const env = {}; const cTmp = new THREE.Color(), cTmp2 = new THREE.Color();
  const mixEnv = (i0, i1, f) => {
    const a = PAGES[i0].env, b = PAGES[i1].env, num = (k) => lerp(a[k] || 0, b[k] || 0, f), col = (ca, cb) => soft(cTmp.set(ca).lerp(cTmp2.set(cb), f).clone());
    env.water = num('water'); env.stars = num('stars'); env.rain = num('rain'); env.glow = num('glow'); env.warm = num('warm'); env.dam = num('dam'); env.tank = num('tank'); env.spring = num('spring'); env.empty = num('empty');
    env.kalbas = Math.round(lerp(a.kalbas, b.kalbas, f)); env.top = col(a.sky[0], b.sky[0]); env.bot = col(a.sky[1], b.sky[1]);
    env.moon = [0, 1, 2, 5].map((k) => lerp(a.moon[k] ?? a.moon[4], b.moon[k] ?? b.moon[4], f)); env.moonCol = col(a.moon[3], b.moon[3]);
    const bi = f < .5 ? i0 : i1, e = PAGES[bi].env, z = st(bi);
    if ((e.spring || e.dam) && springPage !== bi) { springPage = bi; placeSpring(bi); }
    const rs = RES[bi]; env.bird = V(rs.bird[0], e.water + e.bird[1], rs.bird[1]);
    env.crab = rs.crab ? V(rs.crab[0], 0, rs.crab[1]) : null; env.kalOff = rs.kal ? [rs.kal[0] - rs.crab[0], rs.kal[1] - rs.crab[1]] : null;
  };
  const birdPos = V(), crabPos = V(); let crabVis = 0, rustle = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let w = 1, h = 1, t0 = performance.now();
  const project = (p) => { tmp.copy(p).project(camera); return [(tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * h, tmp.z < 1]; };

  function frame(now, st_) {
    Object.assign(S, st_);
    const time = (now - t0) / 1000;
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    if (cw !== w || ch !== h) { w = cw; h = ch; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const inHub = S.mode === 'hub' || S.mode === 'dive';
    hub.visible = inHub; world.visible = !inHub; scene.fog = inHub ? hubFog : worldFog; scene.background = null;
    const out = { cards: [], chars: {} };
    if (inHub) {
      hubCam(S.t, cam, look);
      const c = cards[S.card] || cards[0];
      if (S.mode === 'dive') { const d = sm(S.dive); tmp.copy(c.g.position); tmp2.copy(cam).sub(c.g.position).normalize().multiplyScalar(-.6); tmp.add(tmp2); cam.lerp(tmp, d); look.lerp(c.g.position, d); camera.fov = lerp(50, 95, d); camera.updateProjectionMatrix(); }
      else if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      camera.position.copy(cam); camera.position.x += S.pointer.x * .5; camera.position.y += S.pointer.y * .3; camera.lookAt(look);
      leaves.material.uniforms.uTime.value = time; fireflies.material.uniforms.uTime.value = time; hubStars.material.uniforms.uTime.value = time;
      canopyLight.intensity = 24 + Math.sin(time * .9) * 4; pool.material.opacity = .2 + Math.sin(time * 1.3) * .04;
      hubSky.position.copy(camera.position);
      // l'arbre respire, et frémit quand on s'approche d'un livre
      rustle = lerp(rustle, S.hover != null ? 1 : 0, .06); const br = 1 + Math.sin(time * .8) * .012;
      canopy.scale.set(br, 1 + Math.sin(time * .8 + .6) * .01, br); canopy.rotation.y = Math.sin(time * .25) * .015 + Math.sin(time * 9) * .006 * rustle; canopy.rotation.z = Math.sin(time * .4) * .006 + Math.sin(time * 11) * .004 * rustle;
      hollow.userData.hg.material.opacity = .35 + Math.sin(time * 1.6) * .1 + rustle * .25;
      // billboard : le Konteur fait toujours face à la caméra (rotation Y seule), respire légèrement
      tmp.copy(camera.position).sub(teller.position); teller.userData.plane.rotation.y = Math.atan2(tmp.x, tmp.z); teller.userData.plane.scale.y = 1 + Math.sin(time * 1.3) * .006;
      { const u = teller.userData; u.lit = lerp(u.lit, S.tellerHover ? 1 : 0, .1); const fl = Math.sin(time * 7) * .08 + Math.sin(time * 3.3) * .06;
        u.lampLight.intensity = lerp(3, 22, u.lit) * (1 + fl); u.glow.material.opacity = lerp(.18, .75, u.lit) * (1 + fl); u.glow.scale.setScalar(lerp(1.6, 3.4, u.lit)); u.lampGlass.material.emissiveIntensity = lerp(.5, 2.4, u.lit); }
      updateCritters(time); for (const c of critters) { const pp = project(tmp2.set(c.pos[0], c.g.position.y + c.top, c.pos[1])); out.chars[c.name] = { x: pp[0], y: pp[1], vis: pp[2] }; }
      palms.forEach((p, i) => { p.userData.crown.rotation.z = Math.sin(time * .7 + i) * .04; p.userData.crown.rotation.x = Math.cos(time * .5 + i * 1.3) * .03; }); grass.material.uniforms.uTime.value = time;
      mists.forEach((s) => { s.position.x += Math.sin(time * .1 + s.userData.ph) * .004; s.material.opacity = .12 + Math.sin(time * .3 + s.userData.ph) * .05; });
      cards.forEach((c, i) => {
        c.g.lookAt(camera.position); c.g.rotation.z += Math.sin(time * .8 + i) * .03; c.g.position.y += Math.sin(time * .6 + i * 2) * .0015;
        const near = 1 - clamp(Math.abs(S.t - c.t) / .22, 0, 1); c.g.userData.hover = lerp(c.g.userData.hover, S.hover === i ? 1 : 0, .12);
        const sc = CS * (1 + near * .1 + c.g.userData.hover * .08); c.g.scale.setScalar(sc); c.halo.material.opacity = .2 + near * .35 + c.g.userData.hover * .35; c.g.rotation.z += Math.sin(time * 5) * .03 * c.g.userData.hover;
        c.line.geometry.attributes.position.setXYZ(1, c.g.position.x, c.g.position.y + 1.05 * sc, c.g.position.z); c.line.geometry.attributes.position.needsUpdate = true;
        const [x, y, vis] = project(tmp2.copy(c.g.position).add(V(0, -1.25 * sc, 0))); out.cards.push({ x, y, vis, near, i });
      });
      const tp = project(tmp2.copy(teller.position).add(V(.35, 1.85, 0))); out.chars.teller = { x: tp[0], y: tp[1], vis: tp[2] };
    } else {
      const { i0, i1, f } = worldCam(S.pageF, cam, look); mixEnv(i0, i1, f);
      camera.position.copy(cam); camera.position.x += S.pointer.x * .6; camera.position.y += S.pointer.y * .35; camera.lookAt(look);
      if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      water.position.y = env.water; waterMat.uniforms.uTime.value = time; waterMat.uniforms.uCam.value.copy(camera.position); waterMat.uniforms.uGlow.value = env.glow;
      waterMat.uniforms.cShallow.value.copy(env.bot).lerp(cTmp.set('#6cc6bf'), .6); waterMat.uniforms.cDeep.value.copy(env.top).lerp(cTmp.set('#2f8a92'), .6);
      worldFog.color.copy(env.bot).lerp(cTmp.set('#ffe6cc'), .3); waterMat.uniforms.uFog.value.copy(worldFog.color);
      skyMat.uniforms.cTop.value.copy(env.top); skyMat.uniforms.cBot.value.copy(env.bot); skyMat.uniforms.uStars.value = env.stars; skyMat.uniforms.uTime.value = time;
      sky.position.set(camera.position.x, 0, camera.position.z);
      moon.position.set(camera.position.x + env.moon[0], env.moon[1], camera.position.z + env.moon[2]); moon.scale.setScalar(12 * env.moon[3]); moon.material.color.copy(env.moonCol);
      moonHalo.position.copy(moon.position); moonHalo.scale.setScalar(40 * env.moon[3]); moonHalo.material.color.copy(env.moonCol); moonHalo.material.opacity = .25 + env.warm * .2;
      waterMat.uniforms.uMoon.value.copy(moon.position); waterMat.uniforms.cMoon.value.copy(env.moonCol);
      sun.position.copy(moon.position); sun.target.position.set(camera.position.x, 0, camera.position.z - 12); sun.color.copy(env.moonCol); sun.intensity = 1.0 + env.warm * 1.6;
      hemi.color.copy(env.bot).lerp(cTmp.set('#fff2e0'), .5); hemi.intensity = 1.2 + env.glow * .2;
      plankton.material.uniforms.uTime.value = time; plankton.material.uniforms.uOpacity.value = env.glow; flePts.material.uniforms.uTime.value = time;
      rain.position.set(camera.position.x, env.water, camera.position.z - 6); rain.material.uniforms.uTime.value = time; rain.material.uniforms.uOpacity.value = env.rain * .55;
      wMists.forEach((s) => { s.material.opacity = (.1 + Math.sin(time * .3 + s.userData.ph) * .04) * (1 - env.warm * .6); s.position.y = env.water + .8 + Math.sin(time * .2 + s.userData.ph) * .3; });
      springPts.material.uniforms.uTime.value = time; springLight.intensity = (18 + Math.sin(time * 2) * 6) * (.4 + env.spring * .6); spring.children[1].material.opacity = .4 + env.spring * .5;
      dam.scale.setScalar(lerp(dam.scale.x, env.dam, .08)); tank.scale.setScalar(lerp(tank.scale.x, env.tank, .08));
      // personnages
      birdPos.lerp(env.bird, .06); birdPos.y = Math.max(birdPos.y, footH(birdPos.x, birdPos.z, .7) + .6, env.water + .5); bird.position.copy(birdPos); bird.position.y += Math.sin(time * 2.2) * .04; bird.rotation.y = Math.PI * .15 + Math.sin(time * .5) * .2;
      bird.userData.wings.forEach((wg) => { wg.rotation.x = (wg.userData.s > 0 ? 0 : Math.PI) + Math.sin(time * 9) * .35 * wg.userData.s; });
      if (env.crab) { crabPos.lerp(env.crab, .06); crabVis = lerp(crabVis, 1, .08); } else crabVis = lerp(crabVis, 0, .1);
      crabPos.y = Math.max(footH(crabPos.x, crabPos.z, 1.0), env.water - .1) + .05; crab.position.copy(crabPos); crab.scale.setScalar(Math.max(.001, crabVis)); crab.rotation.y = -.5 + Math.sin(time * .4) * .15; crab.position.y += Math.abs(Math.sin(time * 3)) * .03;
      crab.userData.claws.forEach((c) => { c.rotation.z = Math.sin(time * 1.4 + c.userData.s) * .18 * c.userData.s; });
      crab.userData.legs.forEach((l) => { l.rotation.x = Math.sin(time * 4 + l.userData.ph * 2) * .18; });
      const kb = env.crab ? env.kalbas : 0; kalbas.count = kb; kalbasM.color.set(env.empty > .5 ? '#7a6a55' : '#c9a061');
      for (let i = 0; i < kb; i++) { const o = kalbasOff[i], kc = env.kalOff ? [crabPos.x + env.kalOff[0], crabPos.z + env.kalOff[1]] : [crabPos.x + 3.3, crabPos.z], x = kc[0] + o[0], z = kc[1] + o[1], y = Math.max(footH(x, z, .28), env.water - .2) + o[2]; m4.compose(tmp.set(x, y, z), q.identity(), s3.set(1, 1.2, 1)); kalbas.setMatrixAt(i, m4); }
      kalbas.instanceMatrix.needsUpdate = true;
      const bp = project(tmp2.copy(bird.position).add(V(0, .6, 0))), cp = project(tmp2.copy(crab.position).add(V(0, 1.5, 0)));
      out.chars.bird = { x: bp[0], y: bp[1], vis: bp[2] }; out.chars.crab = { x: cp[0], y: cp[1], vis: cp[2] && crabVis > .5 };
    }
    renderer.render(scene, camera);
    return out;
  }
  function pick(nx, ny) {
    ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
    if (S.mode === 'hub') { const hits = ray.intersectObjects([...cards.map((c) => c.plane), teller.userData.plane, lapen, zanba], true); if (!hits.length) return null; const o0 = hits[0].object; if (o0 === teller.userData.plane) return { type: 'teller' };
      let o = o0; while (o && !(o.userData && o.userData.who)) o = o.parent; if (o) return { type: 'critter', name: o.userData.who }; return o0.userData.card != null ? { type: 'card', i: o0.userData.card } : null; }
    if (S.mode === 'tale') { const hits = ray.intersectObjects([bird, crab], true); if (!hits.length) return null; let o = hits[0].object; while (o && !o.userData.name) o = o.parent; return o ? { type: 'char', name: o.userData.name } : null; }
    return null;
  }
  function resetWorld(pf) { const { i0, i1, f } = worldCam(pf, cam, look); mixEnv(i0, i1, f); birdPos.copy(env.bird); if (env.crab) { crabPos.copy(env.crab); crabVis = 1; } else crabVis = 0; }
  function dispose() { renderer.dispose(); renderer.forceContextLoss(); }
  const poke = (name) => { const c = critters.find((k) => k.name === name); if (c && c.react <= 0) c.react = 1; };
  return { frame, pick, resetWorld, dispose, poke, cardT: (i) => cards[i] ? cards[i].t : 0 };
}
