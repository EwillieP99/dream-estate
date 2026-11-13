import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as plan from './sitePlan.js';
import { buildExteriors } from './exteriors.js';
import { H, SEA_LEVEL, buildTerrain, ribbon, samplePath, registerClear, isClear, fbm, flatMask } from './terrain.js';

const P = plan.palette;
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.53;
controls.minDistance = 4;
controls.maxDistance = 1600;
controls.zoomToCursor = true;

// ---------- materials ----------
const M = {
  stucco: new THREE.MeshStandardMaterial({ color: P.stucco, roughness: 0.85 }),
  timber: new THREE.MeshStandardMaterial({ color: P.timber, roughness: 0.8 }),
  trim: new THREE.MeshStandardMaterial({ color: P.trim, roughness: 0.35, metalness: 0.8 }),
  accent: new THREE.MeshStandardMaterial({ color: P.accent, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: P.glass, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, emissive: 0xffc67a, emissiveIntensity: 0 }),
  basement: new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }),
  stone: new THREE.MeshStandardMaterial({ color: P.stone, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  road: new THREE.MeshStandardMaterial({ color: P.road, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  water: new THREE.MeshStandardMaterial({ color: P.water, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.88, emissive: 0x1fb6d6, emissiveIntensity: 0.05 }),
  pond: new THREE.MeshStandardMaterial({ color: P.pond, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 }),
  rock: new THREE.MeshStandardMaterial({ color: P.rock, roughness: 1, flatShading: true }),
  soil: new THREE.MeshStandardMaterial({ color: P.soil, roughness: 1 }),
  crop: new THREE.MeshStandardMaterial({ color: P.crop, roughness: 1 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.4, metalness: 0.85 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
};

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); // y is the bottom of the box
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function gableRoof(w, d, h, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

const glowMats = [];
function registerGlow(mat, base = 1, min = 0) { glowMats.push({ mat, base, min }); }
registerGlow(M.glass, 1);

// ---------- labels ----------
const labelLayer = document.getElementById('labels');
const labels = [];
function addLabel(text, anchor, kind = 'zone', maxDist = 900) {
  const el = document.createElement('div');
  el.className = 'label ' + kind;
  el.textContent = text;
  labelLayer.appendChild(el);
  labels.push({ el, anchor, kind, maxDist });
}
function anchorAt(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

// ---------- terrain, sea, mountains ----------
const terrain = buildTerrain();
scene.add(terrain);

const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(40000, 40000),
  new THREE.MeshStandardMaterial({ color: 0x2a6f8e, roughness: 0.25, metalness: 0.3 }),
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = SEA_LEVEL;
scene.add(sea);

function buildMountains() {
  const g = new THREE.Group();
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 16; i++) {
    const ang = THREE.MathUtils.degToRad(-62 + i * 7.6 + rnd() * 4); // an arc across the north
    const dist = 1500 + rnd() * 800;
    const h = 300 + rnd() * 330, r = 330 + rnd() * 300;
    const geo = new THREE.ConeGeometry(r, h, 9, 5);
    const p = geo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const rockC = new THREE.Color(0x6f6a78), snow = new THREE.Color(0xf4f2f0), c = new THREE.Color();
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      if (y < h / 2 - 1) {
        p.setX(k, p.getX(k) + (rnd() - 0.5) * r * 0.22);
        p.setZ(k, p.getZ(k) + (rnd() - 0.5) * r * 0.22);
        p.setY(k, y + (rnd() - 0.5) * h * 0.08);
      }
      c.copy(rockC).lerp(snow, THREE.MathUtils.smoothstep(y / h, 0.05, 0.3));
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    m.position.set(Math.sin(ang) * dist, h / 2 + 20, -Math.cos(ang) * dist);
    g.add(m);
  }
  return g;
}
scene.add(buildMountains());

// ---------- mansion ----------
const mansionLevels = [];
const greyOnly = []; // grey-box pieces shown only when the floors are opened up
let roofGroup;
function buildMansion() {
  const g = new THREE.Group();
  g.position.set(plan.mansion.position[0], 0, plan.mansion.position[1]);
  let stack = 2;
  plan.mansion.levels.forEach((L, i) => {
    const lg = new THREE.Group();
    const [w, d] = L.footprint;
    const above = L.base >= 0;
    lg.position.y = L.base;
    lg.userData = { base: L.base, exploded: stack + i * 6 };
    stack += L.height;

    lg.add(box(w, 0.3, d, M.stucco, 0, 0, 0)); // floor slab
    const wallH = L.height - 0.3;
    const env = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, wallH, d - 0.3), above ? M.glass : M.basement);
    env.position.y = 0.3 + wallH / 2;
    env.renderOrder = 2;
    lg.add(env); greyOnly.push(env);
    // Structure: corner and mid posts.
    const postMat = above ? M.timber : M.stucco;
    for (const sx of [-1, -1 / 3, 1 / 3, 1]) for (const sz of [-1, 1]) {
      const post = box(0.45, wallH, 0.45, postMat, sx * (w / 2 - 0.22), 0.3, sz * (d / 2 - 0.22));
      lg.add(post); greyOnly.push(post);
    }
    // Rooms as coloured floor plates.
    for (const r of L.rooms) {
      const [rx, rz, rw, rd] = r.rect;
      const solid = r.name.startsWith('Climbing');
      const plate = box(rw - 0.25, solid ? wallH : 0.14, rd - 0.25, new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.9, transparent: solid, opacity: solid ? 0.85 : 1 }), rx, 0.3, rz);
      plate.castShadow = solid;
      lg.add(plate);
      if (!(r.name === 'Climbing wall' && L.id !== 'L1')) addLabel(r.name, anchorAt(lg, rx, solid ? wallH + 0.6 : 1.4, rz), 'room', 260);
    }
    // Main stair and lift core.
    const core = plan.mansion.core;
    if (L.id !== 'L-1' && Math.abs(core.x) < w / 2) lg.add(box(core.size[0], wallH, core.size[1], M.white, core.x, 0.3, core.z));
    // Spiral stair turret (behind the secret bookshelf in the primary bedroom).
    const sp = plan.mansion.spiralStair;
    const order = plan.mansion.levels.map((l) => l.id);
    if (i >= order.indexOf(sp.fromLevel) && i <= order.indexOf(sp.toLevel)) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, wallH, 20), M.stucco);
      t.position.set(sp.x, 0.3 + wallH / 2, sp.z);
      t.castShadow = true;
      lg.add(t); greyOnly.push(t);
    }
    addLabel(L.name, anchorAt(lg, w / 2 + 3, L.height / 2, d / 2), 'level', 320);
    g.add(lg);
    mansionLevels.push(lg);
  });

  const byId = Object.fromEntries(plan.mansion.levels.map((l, i) => [l.id, mansionLevels[i]]));

  // Front door and curved canopy (south face).
  const door = box(2.4, 3.2, 0.3, M.accent, 0, 0.3, 8.05);
  byId.L1.add(door); greyOnly.push(door);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 24, 1, false, -Math.PI / 2, Math.PI), M.timber);
  canopy.position.set(0, 3.8, 8); canopy.castShadow = true;
  byId.L1.add(canopy); greyOnly.push(canopy);

  // Curved balconies on the north face (valley and pool side).
  function balcony(level, x, r, y) {
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 28, 1, false, Math.PI / 2, Math.PI), M.stucco);
    slab.position.set(x, y, -8); slab.castShadow = true;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.1, 28, 1, true, Math.PI / 2, Math.PI), M.glass.clone());
    rail.material.side = THREE.DoubleSide; rail.material.opacity = 0.35;
    rail.position.set(x, y + 0.67, -8);
    level.add(slab, rail); greyOnly.push(slab, rail);
  }
  balcony(byId.L2, -5, 5, 0.15);
  balcony(byId.L3, 5, 3.5, 0.15);

  // Roof: terrace slab over the studio with a low barrel vault and a turret cap.
  roofGroup = new THREE.Group();
  const top = plan.mansion.levels.at(-1);
  roofGroup.add(box(top.footprint[0] + 1.2, 0.35, top.footprint[1] + 1.2, M.timber, 0, top.height, 0));
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, top.footprint[0] - 2, 28, 1, false, -Math.PI / 2, Math.PI), M.stucco);
  vault.rotation.z = Math.PI / 2; vault.scale.set(0.32, 1, 1);
  vault.position.y = top.height + 0.35; vault.castShadow = true;
  roofGroup.add(vault);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 3.2, 20), M.accent);
  cap.position.set(plan.mansion.spiralStair.x, top.height + 1.9, plan.mansion.spiralStair.z); cap.castShadow = true;
  roofGroup.add(cap);
  byId.L4.add(roofGroup);

  addLabel('Mansion', anchorAt(g, 0, 28, 0), 'zone');
  return g;
}
const mansionGroup = buildMansion();
scene.add(mansionGroup);

// Three exterior designs to choose between.
const exteriors = buildExteriors({ M, registerGlow });
const exteriorRoot = new THREE.Group();
for (const e of exteriors) exteriorRoot.add(e.group);
mansionGroup.add(exteriorRoot);
let exteriorId = 'A';
function setExterior(id) {
  if (!exteriors.some((e) => e.id === id)) return;
  exteriorId = id;
  for (const e of exteriors) e.group.visible = e.id === id;
  document.querySelectorAll('[data-ext]').forEach((b) => b.classList.toggle('on', b.dataset.ext === id));
  try { localStorage.setItem('dream-estate-exterior', id); } catch (err) { /* storage is optional */ }
}

// ---------- arrival: gate, driveway, forecourt, garage ----------
function buildArrival() {
  const g = new THREE.Group();
  g.add(ribbon(plan.driveway.points, plan.driveway.width, M.road, 0.14));

  const fc = plan.forecourt;
  const court = new THREE.Mesh(new THREE.CircleGeometry(fc.radius, 48), M.road);
  court.rotation.x = -Math.PI / 2; court.position.set(fc.position[0], 0.1, fc.position[1]); court.receiveShadow = true;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.2, 0.5, 32), M.stone);
  island.position.set(fc.position[0], 0.25, fc.position[1]); island.receiveShadow = true;
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.42, 120, 14), M.bronze);
  knot.position.set(fc.position[0], 3.3, fc.position[1]); knot.castShadow = true;
  g.add(court, island, box(1.4, 1.2, 1.4, M.stucco, fc.position[0], 0.5, fc.position[1]), knot);
  g.add(ribbon([[-13, 40], [-33, 40]], 7, M.road, 0.12));

  // Garage: separate building, four doors facing the forecourt.
  const [gx, gz] = plan.garage.position;
  const gh = plan.garage.size[2];
  const garage = new THREE.Group();
  garage.position.set(gx, 0, gz);
  garage.add(box(8, gh, 15, M.stucco), box(9, 0.3, 16, M.timber, 0, gh, 0));
  for (let i = 0; i < plan.garage.cars; i++) garage.add(box(0.12, 2.6, 3, M.black, 4.02, 0, -5.25 + i * 3.5));
  addLabel('Garage · 4 cars', anchorAt(garage, 0, gh + 3, 0), 'zone', 260);
  g.add(garage);

  // Gate: black with a central emblem, flanked by walls.
  const gt = plan.gate;
  const gate = new THREE.Group();
  gate.position.set(gt.position[0], H(gt.position[0], gt.position[1]), gt.position[1]);
  for (const s of [-1, 1]) {
    gate.add(box(1.3, 4.4, 1.3, M.stucco, s * (gt.width / 2 + 0.65), 0, 0));
    gate.add(box(gt.width / 2 - 0.1, 3.2, 0.16, M.black, s * gt.width / 4, 0.2, 0));
    gate.add(box(gt.wall, 2.6, 0.6, M.stucco, s * (gt.width / 2 + 1.3 + gt.wall / 2), 0, 0));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc67a, emissiveIntensity: 0.6 }));
    lamp.position.set(s * (gt.width / 2 + 0.65), 4.9, 0);
    gate.add(lamp);
  }
  const emblem = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 12, 40), M.bronze);
  emblem.position.set(0, 1.9, 0.12);
  gate.add(emblem);
  addLabel('Front gate', anchorAt(gate, 0, 7, 0), 'zone');
  g.add(gate);

  // Sculptures along the drive.
  const dpts = samplePath(plan.driveway.points, 2);
  const shapes = [
    () => new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 90, 12, 2, 5), M.bronze),
    () => new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), M.accent),
    () => new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 14, 40), M.white),
    () => new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), M.trim),
    () => new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.28, 90, 12, 3, 4), M.accent),
  ];
  shapes.forEach((make, i) => {
    const p = dpts[Math.floor(((i + 0.6) / shapes.length) * (dpts.length - 12))];
    const side = i % 2 ? 1 : -1;
    const x = p.x + side * 5.5, z = p.y;
    const y = H(x, z);
    const s = make();
    s.position.set(x, y + 3.2, z); s.castShadow = true;
    g.add(box(1.1, 1.6, 1.1, M.stucco, x, y, z), s);
  });
  return g;
}
scene.add(buildArrival());

// ---------- pool ----------
function blobShape(outline, scale = 1) {
  const pts = outline.map(([x, z]) => new THREE.Vector2(x * scale, -z * scale));
  const curve = new THREE.SplineCurve([...pts, pts[0]]);
  // Closed smooth outline.
  const closed = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), true, 'catmullrom', 0.5);
  void curve;
  return new THREE.Shape(closed.getPoints(90).map((p) => new THREE.Vector2(p.x, p.y)));
}
function buildPool() {
  const g = new THREE.Group();
  const [cx, cz] = plan.pool.center;
  g.position.set(cx, 0, cz);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(blobShape(plan.pool.outline, 1.5)), M.stone);
  deck.rotation.x = -Math.PI / 2; deck.position.y = 0.08; deck.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.ShapeGeometry(blobShape(plan.pool.outline, 1)), M.water);
  water.rotation.x = -Math.PI / 2; water.position.y = 0.2; water.name = 'poolWater';
  g.add(deck, water);

  // Water feature: rocks with a small fall at the north edge.
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + rnd() * 1.1, 0), M.rock);
    r.position.set(2 + (rnd() - 0.5) * 7, 0.6 + rnd() * 1.6, -7.5 - rnd() * 2.5);
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); r.castShadow = true;
    g.add(r);
  }
  // Cabana.
  const [kx, kz] = plan.pool.cabana;
  const cab = new THREE.Group(); cab.position.set(kx - cx, 0, kz - cz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cab.add(box(0.3, 3, 0.3, M.timber, sx * 3, 0.1, sz * 2.4));
  cab.add(box(7, 0.25, 5.8, M.stucco, 0, 3.1, 0), box(5, 0.5, 2.4, M.white, 0, 0.1, 0));
  g.add(cab);
  addLabel('Cabana', anchorAt(cab, 0, 4.6, 0), 'detail', 130);
  // Outdoor kitchen under a pergola.
  const [ox, oz] = plan.pool.outdoorKitchen;
  const ok = new THREE.Group(); ok.position.set(ox - cx, 0, oz - cz);
  ok.add(box(6, 1, 1.2, M.stone, 0, 0.1, -1.6), box(1.2, 1, 3, M.stone, -2.4, 0.1, 0.5), box(1.4, 0.5, 0.9, M.black, 1.2, 1.1, -1.6));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ok.add(box(0.25, 2.9, 0.25, M.timber, sx * 3.4, 0.1, sz * 2.4));
  for (let i = 0; i < 7; i++) ok.add(box(0.18, 0.18, 5.6, M.timber, -3.4 + i * 1.13, 3, 0));
  g.add(ok);
  addLabel('Outdoor kitchen', anchorAt(ok, 0, 4.4, 0), 'detail', 130);
  // Loungers along the west deck.
  for (let i = 0; i < 5; i++) {
    const l = box(0.8, 0.35, 2, M.white, -17.5 + i * 0.4, 0.1, -3 + i * 2.2);
    l.rotation.y = 0.5;
    g.add(l);
  }
  addLabel('Lagoon pool', anchorAt(g, 0, 5, 0), 'zone');
  return g;
}
scene.add(buildPool());

// ---------- waterfall, pond, garden ----------
const koi = [];
let fallTexture;
function buildWaterfall() {
  const g = new THREE.Group();
  const [wx, wz] = plan.waterfall.position;
  const hgt = plan.waterfall.height;
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Rock wall, tallest in the middle.
  for (let i = 0; i < 60; i++) {
    const u = rnd() * 2 - 1; // along the wall
    const top = hgt * (1 - 0.75 * u * u);
    const y = rnd() * top;
    const size = 1.8 + rnd() * 1.8;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), M.rock);
    r.position.set(wx + u * 15, y, wz - 2.2 - rnd() * 2.5 - Math.abs(u) * -3);
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    r.castShadow = true; r.receiveShadow = true;
    g.add(r);
  }
  // Overhanging lip so the water falls clear of the wall and you can walk behind it.
  const lip = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), M.rock);
  lip.scale.set(1.6, 0.5, 1.5); lip.position.set(wx, hgt, wz); lip.castShadow = true;
  g.add(lip);
  g.add(box(16, 0.3, 2.2, M.stone, wx, 0.05, wz - 0.4)); // walkway behind the falls

  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(150,215,235,0.55)'; ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
    ctx.fillRect(rnd() * 64, rnd() * 256, 1 + rnd() * 2.5, 20 + rnd() * 70);
  }
  fallTexture = new THREE.CanvasTexture(cv);
  fallTexture.wrapS = fallTexture.wrapT = THREE.RepeatWrapping;
  fallTexture.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(5, hgt), new THREE.MeshStandardMaterial({ map: fallTexture, transparent: true, side: THREE.DoubleSide, roughness: 0.3, depthWrite: false, emissive: 0x9fd8ea, emissiveIntensity: 0.12 }));
  sheet.position.set(wx, hgt / 2, wz + 1.9);
  g.add(sheet);
  const foam = new THREE.Mesh(new THREE.CircleGeometry(3.6, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.6 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(wx, 0.24, wz + 3.4);
  g.add(foam);

  // Koi pond.
  const pd = plan.waterfall.pond;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.pond);
  pond.rotation.x = -Math.PI / 2; pond.scale.set(pd.radius[0], pd.radius[1], 1);
  pond.position.set(pd.center[0], 0.18, pd.center[1]);
  g.add(pond);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) > 0.9 && Math.cos(a) * 0 === 0 && Math.sin(a) < 0) continue; // leave the falls side open
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rnd() * 0.6, 0), M.rock);
    r.position.set(pd.center[0] + Math.cos(a) * (pd.radius[0] + 0.3), 0.3, pd.center[1] + Math.sin(a) * (pd.radius[1] + 0.3));
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); r.castShadow = true;
    g.add(r);
  }
  // Arched bridge over the pond, leading to the walkway behind the falls.
  const bx = pd.center[0] + 6.5, z0 = pd.center[1] + pd.radius[1] * 0.78, z1 = pd.center[1] - pd.radius[1] * 0.78;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const z = THREE.MathUtils.lerp(z0, z1, t);
    const y = 0.35 + 1.7 * Math.sin(Math.PI * t);
    const slope = Math.atan2(1.7 * Math.PI * Math.cos(Math.PI * t), Math.abs(z1 - z0));
    const plank = box(2.2, 0.2, Math.abs(z1 - z0) / n + 0.25, M.timber, bx, y, z);
    plank.rotation.x = slope;
    g.add(plank);
    for (const s of [-1, 1]) { const rail = box(0.12, 1, 0.12, M.accent, bx + s * 1.05, y, z); g.add(rail); }
  }
  // Boat.
  const boat = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.timber);
  boat.scale.set(0.9, 0.55, 2.1); boat.position.set(pd.center[0] - 5, 0.75, pd.center[1] + 2); boat.rotation.y = 0.7; boat.castShadow = true;
  g.add(boat);
  // Koi.
  const koiColors = [0xff7a2a, 0xffffff, 0xf2b01e, 0xff5533];
  for (let i = 0; i < 10; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: koiColors[i % 4], roughness: 0.5 }));
    k.scale.set(0.55, 0.3, 1.9);
    k.userData = { r: 0.25 + rnd() * 0.55, a: rnd() * 6.28, speed: (0.25 + rnd() * 0.3) * (i % 2 ? 1 : -1) };
    koi.push(k); g.add(k);
  }
  // Stream running off into the valley.
  g.add(ribbon(plan.waterfall.stream, 3, M.pond, 0.2, 2));
  addLabel('Waterfall & koi pond', anchorAt(g, wx, hgt + 5, wz), 'zone');
  return g;
}
scene.add(buildWaterfall());

function buildGarden() {
  const g = new THREE.Group();
  const gh = plan.garden.greenhouse;
  const [w, d, h] = gh.size;
  const house = new THREE.Group(); house.position.set(gh.position[0], 0, gh.position[1]);
  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.glass); glassBox.position.y = h / 2;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0xffffff }));
  frame.position.y = h / 2;
  const roof = gableRoof(d + 0.4, w + 0.4, 2, M.glass); roof.rotation.y = Math.PI / 2; roof.position.y = h; roof.castShadow = false;
  house.add(glassBox, frame, roof);
  for (let i = 0; i < 4; i++) house.add(box(1.6, 0.8, d - 1.4, M.crop, -w / 2 + 1.6 + i * 2.6, 0, 0));
  addLabel('Greenhouse', anchorAt(house, 0, h + 4, 0), 'zone', 500);
  g.add(house);
  const b = plan.garden.beds;
  for (let i = 0; i < b.cols; i++) for (let j = 0; j < b.rows; j++) {
    const x = b.origin[0] + i * (b.size[0] + b.gap), z = b.origin[1] + j * (b.size[1] + b.gap);
    g.add(box(b.size[0], 0.5, b.size[1], M.timber, x, 0, z), box(b.size[0] - 0.3, 0.35, b.size[1] - 0.3, M.crop, x, 0.4, z));
  }
  addLabel('Garden', anchorAt(g, b.origin[0] + 10, 4, b.origin[1] + 4), 'detail', 130);
  return g;
}
scene.add(buildGarden());

// ---------- farm ----------
const treeList = []; // { x, z, type, s, color }
function buildFarm() {
  const g = new THREE.Group();
  const [fx, fz] = plan.farm.position;
  g.position.set(fx, 0, fz);
  const F = plan.farm;
  const barnMat = new THREE.MeshStandardMaterial({ color: 0x9a3b2e, roughness: 0.85 });
  // Barn.
  {
    const [w, d, h] = F.barn.size; const b = new THREE.Group(); b.position.set(F.barn.offset[0], 0, F.barn.offset[1]);
    const roof = gableRoof(w + 1, d + 1, 4, M.timber); roof.position.y = h;
    b.add(box(w, h, d, barnMat), roof, box(4, 4.2, 0.2, M.white, 0, 0, d / 2 + 0.05));
    g.add(b); addLabel('Barn', anchorAt(b, 0, h + 7, 0), 'detail', 200);
  }
  // Stable.
  {
    const [w, d, h] = F.stable.size; const b = new THREE.Group(); b.position.set(F.stable.offset[0], 0, F.stable.offset[1]);
    const roof = gableRoof(w + 0.8, d + 0.8, 1.8, M.timber); roof.position.y = h;
    b.add(box(w, h, d, M.timber), roof);
    g.add(b); addLabel('Stable', anchorAt(b, 0, h + 5, 0), 'detail', 200);
  }
  // Coop.
  {
    const [w, d, h] = F.coop.size; const b = new THREE.Group(); b.position.set(F.coop.offset[0], 0, F.coop.offset[1]);
    const roof = gableRoof(w + 0.6, d + 0.6, 1.4, barnMat); roof.position.y = h;
    b.add(box(w, h, d, M.stucco), roof);
    g.add(b); addLabel('Chicken coop', anchorAt(b, 0, h + 4, 0), 'detail', 200);
  }
  // Fences: only around the animals.
  function fence(x0, z0, w, d) {
    const add = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 3);
      for (let i = 0; i <= n; i++) g.add(box(0.18, 1.3, 0.18, M.timber, ax + (bx - ax) * i / n, 0, az + (bz - az) * i / n));
      for (const y of [0.5, 1.05]) {
        const r = box(len, 0.1, 0.08, M.timber, (ax + bx) / 2, y, (az + bz) / 2);
        r.rotation.y = -Math.atan2(bz - az, bx - ax);
        g.add(r);
      }
    };
    add(x0 - w / 2, z0 - d / 2, x0 + w / 2, z0 - d / 2); add(x0 + w / 2, z0 - d / 2, x0 + w / 2, z0 + d / 2);
    add(x0 + w / 2, z0 + d / 2, x0 - w / 2, z0 + d / 2); add(x0 - w / 2, z0 + d / 2, x0 - w / 2, z0 - d / 2);
  }
  fence(F.paddock.offset[0], F.paddock.offset[1], F.paddock.size[0], F.paddock.size[1]);
  fence(F.coop.offset[0] + 6, F.coop.offset[1] + 6, 12, 9);
  addLabel('Paddock', anchorAt(g, F.paddock.offset[0], 4, F.paddock.offset[1]), 'detail', 200);
  // Orchard: peach, guava, apple and cherry blossom.
  const kinds = [0xf7b7c9, 0x6fa24a, 0xf3e3e6, 0xf08fb8];
  for (let i = 0; i < F.orchard.cols; i++) for (let j = 0; j < F.orchard.rows; j++) {
    treeList.push({ x: fx + F.orchard.offset[0] + (i - (F.orchard.cols - 1) / 2) * F.orchard.spacing, z: fz + F.orchard.offset[1] + (j - (F.orchard.rows - 1) / 2) * F.orchard.spacing, type: 'round', s: 0.62, color: kinds[(i + j * 2) % 4] });
  }
  addLabel('Orchard', anchorAt(g, F.orchard.offset[0], 7, F.orchard.offset[1]), 'detail', 200);
  // Crop rows, herbs and vegetables.
  for (let i = 0; i < F.crops.rows; i++) {
    const x = F.crops.offset[0] + (i - (F.crops.rows - 1) / 2) * F.crops.spacing;
    g.add(box(1.2, 0.25, F.crops.length, M.soil, x, 0, F.crops.offset[1] + 12), box(0.7, 0.5, F.crops.length - 0.6, M.crop, x, 0.2, F.crops.offset[1] + 12));
  }
  addLabel('Crops & herbs', anchorAt(g, F.crops.offset[0], 3.5, F.crops.offset[1] + 12), 'detail', 200);
  // Farm gate across the road, with its own fence line.
  const [ox, oz] = F.gate.offset;
  g.add(box(0.5, 3.6, 0.5, M.timber, ox, 0, oz - 3.5), box(0.5, 3.6, 0.5, M.timber, ox, 0, oz + 3.5), box(0.5, 0.5, 8, M.timber, ox, 3.4, oz));
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) g.add(box(0.18, 1.3, 0.18, M.timber, ox, 0, oz + s * (5 + i * 3)));
  for (const s of [-1, 1]) for (const y of [0.5, 1.05]) g.add(box(0.08, 0.1, 34, M.timber, ox, y, oz + s * 21));
  // Landing pad for the roadster.
  const pad = new THREE.Mesh(new THREE.RingGeometry(3.4, 4, 40), M.white);
  pad.rotation.x = -Math.PI / 2; pad.position.set(ox + 16, 0.12, oz + 16);
  const padIn = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), M.road);
  padIn.rotation.x = -Math.PI / 2; padIn.position.set(ox + 16, 0.1, oz + 16);
  g.add(pad, padIn);
  addLabel('Landing pad', anchorAt(g, ox + 16, 3, oz + 16), 'detail', 200);
  addLabel('Farm', anchorAt(g, 0, 24, 0), 'zone', 1400);
  return g;
}
scene.add(buildFarm());

// ---------- paths, flowers, topiary ----------
const flowerSpots = [], topiarySpots = [];
function buildPaths() {
  const g = new THREE.Group();
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const pts of plan.paths.stone) {
    g.add(ribbon(pts, 2.4, M.stone, 0.13, 1.5));
    registerClear(pts, 3.5);
    const sp = samplePath(pts, 0.8);
    sp.forEach((p, i) => {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(sp.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.y - a.y, len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len, nz = dx / len;
      for (const s of [-1, 1]) {
        const off = 1.7 + rnd() * 0.9;
        flowerSpots.push([p.x + nx * s * off, p.y + nz * s * off, rnd()]);
        if (i % 9 === 4) topiarySpots.push([p.x + nx * s * 3.6, p.y + nz * s * 3.6, (i / 9 + (s > 0 ? 1 : 0)) % 2 < 1]);
      }
    });
  }
  g.add(ribbon(plan.paths.farmRoad, 4, M.road, 0.14, 2));
  return g;
}
scene.add(buildPaths());

function buildPlanting() {
  const g = new THREE.Group();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  // Flowers.
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.24, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), flowerSpots.length);
  flowerSpots.forEach(([x, z, r], i) => {
    dummy.position.set(x, H(x, z) + 0.28, z); dummy.scale.setScalar(0.7 + r * 0.8); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    fl.setMatrixAt(i, dummy.matrix);
    fl.setColorAt(i, col.set(r < 0.5 ? P.blossomPink : r < 0.9 ? P.blossomPurple : 0xffffff));
  });
  g.add(fl);
  // Topiary: clipped balls and cones.
  const green = new THREE.MeshStandardMaterial({ color: 0x3f7a3c, roughness: 0.95 });
  const balls = topiarySpots.filter((t) => t[2]), cones = topiarySpots.filter((t) => !t[2]);
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.85, 14, 10), green, balls.length);
  balls.forEach(([x, z], i) => { dummy.position.set(x, 0.95, z); dummy.scale.setScalar(1); dummy.updateMatrix(); bm.setMatrixAt(i, dummy.matrix); });
  const cm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 2.4, 14), green, cones.length);
  cones.forEach(([x, z], i) => { dummy.position.set(x, 1.3, z); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); });
  bm.castShadow = cm.castShadow = true;
  g.add(bm, cm);
  return g;
}

function scatterTrees() {
  let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const greens = [0x3f6f3a, 0x4d8143, 0x5c8f4a, 0x356338, 0x6b9a4f];
  // Forest and meadow.
  for (let i = 0; i < 9000; i++) {
    const x = (rnd() * 2 - 1) * 1150, z = (rnd() * 2 - 1) * 1150;
    const h = H(x, z);
    if (h < -15 || h > 95) continue;
    const nearDrive = Math.abs(x) < 85 && z > 78 && z < 300;
    const dHouse = Math.hypot((x - 15) / 135, (z - 10) / 100);
    if (dHouse < 0.92 && !nearDrive) continue;
    if (Math.hypot(x - plan.farm.position[0], z - plan.farm.position[1]) < 112) continue;
    if (!isClear(x, z)) continue;
    const density = nearDrive ? 1 : 0.12 + 0.88 * THREE.MathUtils.smoothstep(fbm(x / 230 + 3, z / 230 - 8), 0.46, 0.6);
    if (rnd() > density) continue;
    const conifer = rnd() < 0.42 + 0.3 * THREE.MathUtils.smoothstep(h, 20, 80);
    treeList.push({ x, z, type: conifer ? 'cone' : 'round', s: 0.75 + rnd() * 0.8, color: greens[Math.floor(rnd() * greens.length)] });
  }
  // Trees lining the drive.
  const dp = samplePath(plan.driveway.points, 9);
  dp.forEach((p, i) => {
    if (p.y < 62) return;
    const a = dp[Math.max(0, i - 1)], b = dp[Math.min(dp.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.y - a.y, len = Math.hypot(dx, dz) || 1;
    for (const s of [-1, 1]) treeList.push({ x: p.x - (dz / len) * s * 8.5, z: p.y + (dx / len) * s * 8.5, type: 'round', s: 1.05, color: 0x4d8143 });
  });
  // Cherry blossoms and ornamentals around the house.
  const blossoms = [[-20, 22], [20, 22], [-24, -12], [30, -14], [-34, -30], [40, -52], [-30, 58], [28, 58], [48, 8], [-52, 6], [82, -28], [44, -24], [-14, -62], [22, -62], [-58, 44], [60, 50]];
  blossoms.forEach(([x, z], i) => treeList.push({ x, z, type: 'round', s: 0.8 + (i % 3) * 0.12, color: i % 4 === 3 ? 0xf3dfe8 : P.blossomPink }));
  // Mango tree by the pond.
  treeList.push({ x: 113, z: -44, type: 'round', s: 1.35, color: 0x2f6b35 });

  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const cones = treeList.filter((t) => t.type === 'cone'), rounds = treeList.filter((t) => t.type === 'round');
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5b4332, roughness: 1 }), treeList.length);
  const coneGeo = new THREE.ConeGeometry(1, 1, 7); coneGeo.translate(0, 0.5, 0);
  const coneMesh = new THREE.InstancedMesh(coneGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), cones.length);
  const roundMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), rounds.length);
  let ti = 0;
  cones.forEach((t, i) => {
    const y = H(t.x, t.z), th = 2.2 * t.s;
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(t.x, y - 0.2, t.z); dummy.scale.set(t.s, th + 0.2, t.s); dummy.updateMatrix(); trunks.setMatrixAt(ti++, dummy.matrix);
    dummy.position.set(t.x, y + th * 0.6, t.z); dummy.scale.set(2.5 * t.s, 9 * t.s, 2.5 * t.s); dummy.updateMatrix(); coneMesh.setMatrixAt(i, dummy.matrix);
    coneMesh.setColorAt(i, col.set(t.color));
  });
  rounds.forEach((t, i) => {
    const y = H(t.x, t.z), th = 3.4 * t.s, r = 3.3 * t.s;
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(t.x, y - 0.2, t.z); dummy.scale.set(t.s * 1.2, th + 0.2, t.s * 1.2); dummy.updateMatrix(); trunks.setMatrixAt(ti++, dummy.matrix);
    dummy.position.set(t.x, y + th + r * 0.55, t.z); dummy.scale.set(r, r * 0.85, r); dummy.rotation.set(0, t.x * 1.3, 0); dummy.updateMatrix(); roundMesh.setMatrixAt(i, dummy.matrix);
    roundMesh.setColorAt(i, col.set(t.color));
  });
  for (const m of [trunks, coneMesh, roundMesh]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  return treeList.length;
}
scene.add(buildPlanting());
const treeCount = scatterTrees();

// ---------- sky and light ----------
const sky = new Sky();
sky.scale.setScalar(15000);
scene.add(sky);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 1, far: 1200 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
scene.add(hemi);
scene.fog = new THREE.FogExp2(0xe9b38a, 0.00055);

const starGeo = new THREE.BufferGeometry();
{
  const p = []; let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 1800; i++) {
    const a = rnd() * Math.PI * 2, e = Math.asin(rnd() * 0.98 + 0.02);
    p.push(Math.cos(a) * Math.cos(e) * 9000, Math.sin(e) * 9000, Math.sin(a) * Math.cos(e) * 9000);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
}
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
stars.visible = false;
scene.add(stars);

// Sky reflections for glass, metal and tile.
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new Sky(); envSky.scale.setScalar(15000); envScene.add(envSky);
let envTarget = null;
function updateEnvironment(t) {
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition']) {
    const v = sky.material.uniforms[k].value;
    if (v && v.isVector3) envSky.material.uniforms[k].value.copy(v); else envSky.material.uniforms[k].value = v;
  }
  envSky.visible = t.sky;
  envScene.background = t.sky ? null : new THREE.Color(0x0b1430);
  const next = pmrem.fromScene(envScene, 0, 1, 20000);
  scene.environment = next.texture;
  scene.environmentIntensity = t.env;
  if (envTarget) envTarget.dispose();
  envTarget = next;
}

const sunDir = new THREE.Vector3();
const TIMES = {
  day: { skyEl: 48, lightEl: 48, az: 235, sun: 0xfff6e6, sunI: 3.3, hemiSky: 0xbcd9ff, hemiGround: 0x556b3f, hemiI: 1.2, fog: 0xc4dbee, fogD: 0.00035, exposure: 0.55, glow: 0, env: 0.1, sky: true },
  sunset: { skyEl: 4.5, lightEl: 13, az: 262, sun: 0xffa868, sunI: 3.4, hemiSky: 0xf7c9b0, hemiGround: 0x4a4a3c, hemiI: 1.15, fog: 0xeab08c, fogD: 0.0005, exposure: 0.85, glow: 0.35, env: 0.6, sky: true },
  night: { skyEl: 30, lightEl: 38, az: 140, sun: 0x8ea6ff, sunI: 1.3, hemiSky: 0x3a4f8f, hemiGround: 0x121a22, hemiI: 1.15, fog: 0x0e1730, fogD: 0.0005, exposure: 1.15, glow: 1.6, env: 0.9, sky: false },
};
let timeName = 'sunset';
function setTime(name) {
  const t = TIMES[name]; if (!t) return;
  timeName = name;
  const az = THREE.MathUtils.degToRad(t.az); // compass bearing, 0 = north, 270 = west
  const dirAt = (el) => { const e = THREE.MathUtils.degToRad(el); return new THREE.Vector3(Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e)); };
  sunDir.copy(dirAt(t.lightEl));
  sky.material.uniforms.sunPosition.value.copy(dirAt(t.skyEl));
  sky.visible = t.sky; stars.visible = !t.sky;
  scene.background = t.sky ? null : new THREE.Color(0x070c1c);
  sun.color.set(t.sun); sun.intensity = t.sunI;
  hemi.color.set(t.hemiSky); hemi.groundColor.set(t.hemiGround); hemi.intensity = t.hemiI;
  scene.fog.color.set(t.fog); scene.fog.density = t.fogD;
  renderer.toneMappingExposure = t.exposure;
  for (const gm of glowMats) gm.mat.emissiveIntensity = gm.min + gm.base * t.glow;
  updateEnvironment(t);
  M.water.emissiveIntensity = 0.05 + t.glow * 0.9;
  document.querySelectorAll('[data-time]').forEach((b) => b.classList.toggle('on', b.dataset.time === name));
}
{
  const u = sky.material.uniforms;
  u.turbidity.value = 9; u.rayleigh.value = 2.6; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.82;
  if (u.cloudCoverage) u.cloudCoverage.value = 0.35;
}

// ---------- camera moves ----------
let tween = null;
function flyTo(pos, target, seconds = 1.6) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
  if (seconds <= 0) { tween = null; controls.enabled = true; camera.position.copy(p1); controls.target.copy(t1); controls.update(); return; }
  tween = { p0, t0, p1, t1, t: 0, dur: seconds };
  controls.enabled = false;
}
function go(id, instant = false) {
  const v = plan.viewpoints.find((v) => v.id === id); if (!v) return;
  flyTo(v.pos, v.target, instant ? 0 : 1.8);
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === id));
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('dblclick', (e) => {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.isMesh && h.object !== sky && h.object !== sea);
  if (!hit) return;
  const off = camera.position.clone().sub(controls.target);
  off.setLength(Math.max(26, off.length() * 0.45));
  const p = hit.point.clone().add(off);
  flyTo([p.x, Math.max(p.y, H(p.x, p.z) + 4), p.z], [hit.point.x, hit.point.y, hit.point.z], 1.2);
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('on'));
});
controls.addEventListener('start', () => document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('on')));

// ---------- open up the floors ----------
let explode = 0, explodeTarget = 0;
function setExplode(on) {
  explodeTarget = on ? 1 : 0;
  document.getElementById('explode').classList.toggle('on', on);
  if (on) flyTo([-70, 58, 86], [0, 29, 0], 1.6);
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', on && b.dataset.view === 'mansion'));
}

// ---------- UI ----------
const viewBar = document.getElementById('views');
for (const v of plan.viewpoints) {
  const b = document.createElement('button');
  b.textContent = v.label; b.dataset.view = v.id;
  b.addEventListener('click', () => { if (explodeTarget && v.id !== 'mansion') setExplode(false); go(v.id); });
  viewBar.appendChild(b);
}
const extBar = document.getElementById('exteriors');
for (const e of exteriors) {
  const b = document.createElement('button');
  b.textContent = `${e.id} · ${e.name}`; b.dataset.ext = e.id;
  b.addEventListener('click', () => { if (explodeTarget) setExplode(false); setExterior(e.id); });
  extBar.appendChild(b);
}
document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => setTime(b.dataset.time)));
let showLabels = true;
document.getElementById('toggleLabels').addEventListener('click', (e) => { showLabels = !showLabels; e.currentTarget.classList.toggle('on', showLabels); });
document.getElementById('explode').addEventListener('click', () => setExplode(!explodeTarget));
document.getElementById('stats').textContent = `${treeCount.toLocaleString()} trees · ${plan.mansion.levels.length} levels · ${plan.mansion.levels.reduce((n, l) => n + l.rooms.filter((r) => !r.name.startsWith('Climbing')).length, 0) + 1} rooms`;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- loop ----------
const clock = new THREE.Timer();
const v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
const labelRay = new THREE.Raycaster();
let frameCount = 0;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function frame() {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.1), time = clock.getElapsed();
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = ease(tween.t);
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) { tween = null; controls.enabled = true; }
  }
  controls.update();
  const floor = Math.max(H(camera.position.x, camera.position.z), SEA_LEVEL) + 2.5;
  if (camera.position.y < floor) camera.position.y = floor;

  // Floors open up and close.
  explode += (explodeTarget - explode) * Math.min(1, dt * 4);
  for (const lg of mansionLevels) lg.position.y = THREE.MathUtils.lerp(lg.userData.base, lg.userData.exploded, explode);
  const opened = explode > 0.03;
  for (const o of greyOnly) o.visible = opened;
  roofGroup.visible = opened && explode < 0.5;
  exteriorRoot.visible = !opened;

  // Shadows follow where you are looking.
  const tx = Math.round(controls.target.x / 20) * 20, tz = Math.round(controls.target.z / 20) * 20;
  sun.target.position.set(tx, 0, tz);
  sun.position.set(tx, 0, tz).addScaledVector(sunDir, 600);

  if (fallTexture) fallTexture.offset.y = (time * 0.9) % 1;
  if (sky.material.uniforms.time) sky.material.uniforms.time.value = time;
  const pd = plan.waterfall.pond;
  for (const k of koi) {
    const u = k.userData; u.a += u.speed * dt;
    const x = Math.cos(u.a) * pd.radius[0] * u.r, z = Math.sin(u.a) * pd.radius[1] * u.r;
    k.position.set(pd.center[0] + x, 0.2, pd.center[1] + z);
    k.rotation.y = Math.atan2(-Math.sin(u.a) * pd.radius[0] * Math.sign(u.speed), Math.cos(u.a) * pd.radius[1] * Math.sign(u.speed));
  }

  renderer.render(scene, camera);

  // Labels: hidden when the mansion stands between the camera and the label.
  const w = window.innerWidth, h = window.innerHeight;
  frameCount++;
  const checkHidden = frameCount % 6 === 0 && exteriorRoot.visible;
  for (const L of labels) {
    let show = showLabels;
    if (show && (L.kind === 'room' || L.kind === 'level')) show = explode > 0.6;
    if (show && L.kind === 'zone' && explode > 0.6 && L.el.textContent === 'Mansion') show = false;
    if (show) {
      L.anchor.getWorldPosition(v3);
      const dist = v3.distanceTo(camera.position);
      if (checkHidden && L.el.textContent !== 'Mansion') {
        labelRay.set(camera.position, v4.copy(v3).sub(camera.position).normalize());
        labelRay.far = dist - 1.5;
        L.hidden = labelRay.intersectObject(exteriors.find((e) => e.id === exteriorId).group, true).length > 0;
      }
      if (!exteriorRoot.visible) L.hidden = false;
      v3.project(camera);
      show = !L.hidden && v3.z < 1 && dist < L.maxDist && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      if (show) L.el.style.transform = `translate(-50%,-50%) translate(${((v3.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v3.y * 0.5 + 0.5) * h).toFixed(1)}px)`;
    }
    L.el.style.display = show ? '' : 'none';
  }
  requestAnimationFrame(frame);
}

setTime('sunset');
let savedExterior = 'A';
try { savedExterior = localStorage.getItem('dream-estate-exterior') || 'A'; } catch (err) { /* storage is optional */ }
setExterior(exteriors.some((e) => e.id === savedExterior) ? savedExterior : 'A');
go('mansion', true);
window.__estate = { go, setTime, setExplode, setExterior, flyTo, camera, controls, flatMask };
frame();
