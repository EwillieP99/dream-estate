// Three exterior designs for the mansion. All three wrap the same floor plan
// (24 x 16 m for levels 1-3, 20 x 12 m for the level 4 art studio).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const LV = [
  { y: 0, h: 4.5, w: 24, d: 16 },
  { y: 4.5, h: 4, w: 24, d: 16 },
  { y: 8.5, h: 4, w: 24, d: 16 },
  { y: 12.5, h: 5, w: 20, d: 12 },
];
const TOP = 17.5;

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

// ---------- procedural surfaces ----------
function canvasTex(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
// Broken-tile mosaic: an irregular grid of shards with grout between. Tiles seamlessly.
function drawShards(ctx, s, n, palette, grout, gap, seed) {
  const rnd = rng(seed);
  const jit = [];
  for (let j = 0; j < n; j++) { jit.push([]); for (let i = 0; i < n; i++) jit[j].push([(rnd() - 0.5) * 0.72, (rnd() - 0.5) * 0.72]); }
  const pt = (i, j) => { const q = jit[((j % n) + n) % n][((i % n) + n) % n]; return [((i + q[0]) / n) * s, ((j + q[1]) / n) * s]; };
  ctx.fillStyle = grout; ctx.fillRect(0, 0, s, s);
  const poly = (pts, col) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    ctx.beginPath();
    pts.forEach((p, k) => { const x = cx + (p[0] - cx) * gap, y = cy + (p[1] - cy) * gap; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  const pick = () => {
    const c = new THREE.Color(palette[Math.floor(rnd() * palette.length)]);
    c.offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.12);
    return '#' + c.getHexString();
  };
  for (let j = -1; j < n; j++) for (let i = -1; i < n; i++) {
    const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
    if (rnd() < 0.5) { poly([a, b, c], pick()); poly([a, c, d], pick()); }
    else if (rnd() < 0.5) { poly([a, b, d], pick()); poly([b, c, d], pick()); }
    else poly([a, b, c, d], pick());
  }
}
const COOL = [0x1d6fa3, 0x2aa7a0, 0x58c2b0, 0x1a4f8a, 0xf2efe6, 0xe0b548, 0x3f8f5a, 0x7fd1e0];
const WARM = [0xb5322c, 0xd9622b, 0xe8a23a, 0xf2e3c4, 0x8f1f24, 0xe7c15a, 0xc9483a];
const JEWEL = [0xc3272b, 0xe79a1f, 0x1f5fb0, 0x1f9a6b, 0x7a2fa0, 0xf2d24a, 0x2fb7c9, 0xe2557a];

function drawRose(ctx, s) {
  const c = s / 2; ctx.fillStyle = '#15100c'; ctx.fillRect(0, 0, s, s);
  const col = (h) => '#' + new THREE.Color(JEWEL[h % JEWEL.length]).getHexString();
  ctx.lineWidth = s * 0.012; ctx.strokeStyle = '#15100c';
  for (let ring = 2; ring >= 0; ring--) {
    const n = [8, 12, 20][ring], r0 = [0.1, 0.24, 0.38][ring] * s, r1 = [0.24, 0.38, 0.49][ring] * s;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * r0, c + Math.sin(a0) * r0);
      ctx.quadraticCurveTo(c + Math.cos(a0) * r1, c + Math.sin(a0) * r1, c + Math.cos(am) * r1, c + Math.sin(am) * r1);
      ctx.quadraticCurveTo(c + Math.cos(a1) * r1, c + Math.sin(a1) * r1, c + Math.cos(a1) * r0, c + Math.sin(a1) * r0);
      ctx.closePath(); ctx.fillStyle = col(i + ring * 3); ctx.fill(); ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.arc(c, c, 0.1 * s, 0, Math.PI * 2); ctx.fillStyle = col(5); ctx.fill(); ctx.stroke();
}
// Overlapping scallops: roof tiles and scales.
function drawScallops(ctx, s, cols, rows, colorAt, edge, seed) {
  const rnd = rng(seed), cw = s / cols, rh = s / rows;
  ctx.fillStyle = edge; ctx.fillRect(0, 0, s, s);
  for (let r = rows; r >= -1; r--) for (let c = -1; c <= cols; c++) {
    const x = (c + (((r % 2) + 2) % 2) * 0.5 + 0.5) * cw, y = r * rh;
    ctx.beginPath(); ctx.moveTo(x - cw / 2, y); ctx.lineTo(x - cw / 2, y + rh * 0.7);
    ctx.arc(x, y + rh * 0.7, cw / 2, Math.PI, 0, true); ctx.lineTo(x + cw / 2, y); ctx.closePath();
    ctx.fillStyle = colorAt(r / rows, rnd); ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.006); ctx.strokeStyle = edge; ctx.stroke();
  }
}
function drawMarble(ctx, s) {
  const rnd = rng(8);
  ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, s, s);
  for (let k = 0; k < 26; k++) {
    ctx.beginPath();
    let x = rnd() * s, y = rnd() * s; ctx.moveTo(x, y);
    for (let i = 0; i < 9; i++) { x += (rnd() - 0.3) * s * 0.16; y += (rnd() - 0.5) * s * 0.12; ctx.lineTo(x, y); }
    ctx.strokeStyle = `rgba(120,118,128,${0.05 + rnd() * 0.16})`; ctx.lineWidth = 0.6 + rnd() * 2.2; ctx.stroke();
  }
}

// ---------- geometry helpers ----------
const unitBox = new THREE.BoxGeometry(1, 1, 1); unitBox.translate(0, 0.5, 0);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10); unitCyl.translate(0, 0.5, 0);
const unitBlob = new THREE.IcosahedronGeometry(1, 0);

class Inst {
  constructor(geo, mat) { this.geo = geo; this.mat = mat; this.m = []; }
  add(x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
    const o = Inst.o; o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(0, ry, 0); o.updateMatrix();
    this.m.push(o.matrix.clone());
  }
  build(shadow = true) {
    const im = new THREE.InstancedMesh(this.geo, this.mat, this.m.length);
    this.m.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.castShadow = shadow; im.receiveShadow = true;
    return im;
  }
}
Inst.o = new THREE.Object3D();

function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
function bx(w, h, d, mat, x, y, z, shadow = true) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, shadow); }

// Outline of an arched opening as points: 'round' is a rectangle with a semicircle top, 'para' is a parabola.
function archPts(cx, y0, w, h, kind = 'round') {
  const r = w / 2, pts = [];
  if (kind === 'para') {
    for (let i = 0; i <= 32; i++) { const u = 1 - (2 * i) / 32; pts.push(new THREE.Vector2(cx + r * u, y0 + h * (1 - u * u))); }
  } else {
    pts.push(new THREE.Vector2(cx + r, y0));
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI; pts.push(new THREE.Vector2(cx + Math.cos(a) * r, y0 + h - r + Math.sin(a) * r)); }
    pts.push(new THREE.Vector2(cx - r, y0));
  }
  return pts;
}
// A wall panel (in the XY plane, base at y = 0, centred on x) with arched holes cut out.
function holedWall(width, height, holes, depth, mat) {
  const s = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(width / 2, height), new THREE.Vector2(-width / 2, height)]);
  for (const hl of holes) s.holes.push(new THREE.Path(archPts(...hl)));
  return mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat);
}
// Put a panel built in the XY plane onto one face of a w x d footprint, facing outward.
function onFace(obj, face, w, d, y = 0, out = 0) {
  if (face === 'S') { obj.position.set(0, y, d / 2 + out); }
  if (face === 'N') { obj.position.set(0, y, -d / 2 - out); obj.rotation.y = Math.PI; }
  if (face === 'E') { obj.position.set(w / 2 + out, y, 0); obj.rotation.y = Math.PI / 2; }
  if (face === 'W') { obj.position.set(-w / 2 - out, y, 0); obj.rotation.y = -Math.PI / 2; }
  return obj;
}
// Points around a rectangle, for mullions and fins: [x, z, onSide]
function perimeter(w, d, spacing) {
  const out = [], nx = Math.round(w / spacing), nz = Math.round(d / spacing);
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + (w * i) / nx; out.push([x, d / 2, 0], [x, -d / 2, 0]); }
  for (let i = 1; i < nz; i++) { const z = -d / 2 + (d * i) / nz; out.push([w / 2, z, 1], [-w / 2, z, 1]); }
  return out;
}
// Hip roof or roof skirt: a w0 x d0 base rising h to a w1 x d1 top (d1 = 0 gives a ridge).
function hipRoof(w0, d0, w1, d1, h, mat) {
  const B = (sx, sz) => [(sx * w0) / 2, 0, (sz * d0) / 2], T = (sx, sz) => [(sx * w1) / 2, h, (sz * d1) / 2];
  const faces = [
    [B(-1, 1), B(1, 1), T(1, 1), T(-1, 1)], [B(1, -1), B(-1, -1), T(-1, -1), T(1, -1)],
    [B(1, 1), B(1, -1), T(1, -1), T(1, 1)], [B(-1, -1), B(-1, 1), T(-1, 1), T(-1, -1)],
  ];
  const pos = [], uv = [];
  for (const [a, b, c, d] of faces) {
    const e = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
    const U = (p) => ((p[0] - a[0]) * e.x + (p[2] - a[2]) * e.z) / 2;
    const run = Math.abs(e.x) > 0.5 ? (d0 - d1) / 2 : (w0 - w1) / 2;
    const V = Math.hypot(h, run) / 2;
    for (const [p, v] of [[a, 0], [b, 0], [c, V], [a, 0], [c, V], [d, V]]) { pos.push(...p); uv.push(U(p), v); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return mesh(g, mat);
}
function lathe(profile, mat, seg = 36) {
  return mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
}
// Squircle outline (a rounded rectangle), optionally with waves pushed in and out along it.
function squircle(a, b, n, amp = 0, k = 0, phase = 0, N = 240) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.abs(c) ** (2 / n), z = b * Math.sign(s) * Math.abs(s) ** (2 / n);
    const len = Math.hypot(x, z) || 1, o = amp * Math.sin(k * t + phase);
    pts.push([x + (x / len) * o, z + (z / len) * o]);
  }
  return pts;
}
// A horizontal slab with the given [x, z] outline, top face at y.
function outlineSlab(pts, thick, mat, y, bevel = 0.12) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3 });
  geo.rotateX(-Math.PI / 2);
  return mesh(geo, mat, 0, y - thick + bevel, 0);
}
function outlineWall(pts, height, mat, y) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = mesh(geo, mat, 0, y, 0, false);
  m.renderOrder = 2;
  return m;
}

export function buildExteriors({ M, registerGlow }) {
  // ----- materials -----
  const glass = new THREE.MeshStandardMaterial({ color: 0x86bccb, roughness: 0.05, metalness: 0.65, transparent: true, opacity: 0.46, depthWrite: false, emissive: 0xffc67a, emissiveIntensity: 0, envMapIntensity: 1.6 });
  registerGlow(glass, 0.9);
  const railGlass = new THREE.MeshStandardMaterial({ color: 0xbfe3ea, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const marble = new THREE.MeshStandardMaterial({ map: canvasTex(512, drawMarble, [0.25, 0.25]), roughness: 0.22, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xdcb45a, roughness: 0.28, metalness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.5, metalness: 0.7 });
  const mosaic = (palette, repeat, seed = 4) => new THREE.MeshStandardMaterial({ map: canvasTex(512, (c, s) => drawShards(c, s, 14, palette, '#efe9dc', 0.86, seed), repeat), roughness: 0.32, metalness: 0.05 });
  const stained = (repeat, seed = 9) => {
    const t = canvasTex(512, (c, s) => drawShards(c, s, 9, JEWEL, '#15100c', 0.84, seed), repeat);
    const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0, roughness: 0.25, side: THREE.DoubleSide });
    registerGlow(m, 1.25, 0.12);
    return m;
  };
  const roseTex = canvasTex(512, drawRose);
  const rose = new THREE.MeshStandardMaterial({ map: roseTex, emissive: 0xffffff, emissiveMap: roseTex, emissiveIntensity: 0, roughness: 0.25 });
  registerGlow(rose, 1.3, 0.12);
  const terracotta = (repeat) => new THREE.MeshStandardMaterial({
    map: canvasTex(512, (c, s) => drawScallops(c, s, 8, 8, (v, rnd) => '#' + new THREE.Color(0xb9573a).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.12).getHexString(), '#6e2f1f', 2), repeat),
    roughness: 0.8, side: THREE.DoubleSide,
  });
  const scales = (repeat) => new THREE.MeshStandardMaterial({
    map: canvasTex(512, (c, s) => drawScallops(c, s, 8, 8, (v, rnd) => '#' + new THREE.Color().setHSL(0.47 + v * 0.3 + (rnd() - 0.5) * 0.05, 0.6, 0.42 + rnd() * 0.14).getHexString(), '#123a44', 5), repeat),
    roughness: 0.22, metalness: 0.35,
  });
  const mosaicCoolM = mosaic(COOL, [0.45, 0.45]), mosaicWarmM = mosaic(WARM, [0.45, 0.45], 12);
  const stainedM = stained([0.55, 0.55]);
  const stainedUV = stained([1, 1], 15);

  // ----- shared pieces -----
  function tower(g, x, z, R, H, bodyMat, capProfile, capMat, bulge = 0.18) {
    const body = [];
    for (let i = 0; i <= 28; i++) { const u = i / 28; body.push([R * (1 - 0.12 * u) + bulge * Math.sin(u * Math.PI * 4), u * H]); }
    const b = lathe(body, bodyMat); b.position.set(x, 0, z);
    const rt = body.at(-1)[0];
    const cap = lathe(capProfile(rt), capMat); cap.position.set(x, H, z);
    const capH = capProfile(rt).at(-1)[1];
    const fin = mesh(new THREE.SphereGeometry(0.42, 20, 14), gold, x, H + capH + 0.3, z);
    g.add(b, cap, fin, mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 8), gold, x, H + capH, z));
    // Stained-glass slits winding up the outward sides.
    const dirs = [[-1, 0], [-0.707, -0.707], [0, -1]];
    for (let i = 0; i < 7; i++) {
      const [dx, dz] = dirs[i % 3], y = 2.2 + i * (H - 5.5) / 6, u = y / H;
      const r = R * (1 - 0.12 * u) + bulge * Math.sin(u * Math.PI * 4) + 0.05;
      const w = mesh(new THREE.ShapeGeometry(new THREE.Shape(archPts(0, 0, 0.9, 2, 'round'))), stainedM, x + dx * r, y, z + dz * r, false);
      w.rotation.y = Math.atan2(dx, dz);
      g.add(w);
    }
  }
  function curvedBalcony(g, x, y, r, slabMat, railMat, z = -8) {
    const slab = mesh(new THREE.CylinderGeometry(r, r - 0.25, 0.4, 36, 1, false, Math.PI / 2, Math.PI), slabMat, x, y + 0.05, z);
    g.add(slab);
    if (railMat === 'iron') {
      const bal = new Inst(unitCyl, iron);
      for (let i = 0; i <= 26; i++) { const a = (i / 26) * Math.PI; bal.add(x + Math.cos(a) * (r - 0.12), y + 0.25, z - Math.sin(a) * (r - 0.12), 0.03, 1, 0.03); }
      g.add(bal.build());
    } else {
      const rail = mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 1.05, 36, 1, true, Math.PI / 2, Math.PI), railGlass, x, y + 0.77, z, false);
      rail.renderOrder = 3; g.add(rail);
    }
    const top = mesh(new THREE.TorusGeometry(r - 0.1, 0.05, 8, 48, Math.PI), railMat === 'iron' ? iron : M.trim, x, y + 1.3, z);
    top.rotation.x = -Math.PI / 2;
    g.add(top);
  }
  function portal(g, z, wOut, hOut, wIn, hIn, depth, mat, kind = 'para') {
    const s = new THREE.Shape(archPts(0, 0, wOut, hOut, kind));
    s.holes.push(new THREE.Path(archPts(0, 0, wIn, hIn, kind)));
    g.add(mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }), mat, 0, 0.3, z));
    g.add(mesh(new THREE.ShapeGeometry(new THREE.Shape(archPts(0, 0, wIn, hIn, kind))), stainedM, 0, 0.3, z + 0.35, false));
    const door = new THREE.Shape(archPts(0, 0, Math.min(2.4, wIn - 0.8), Math.min(3.3, hIn - 0.7), 'round'));
    g.add(mesh(new THREE.ExtrudeGeometry(door, { depth: 0.16, bevelEnabled: false }), M.timber, 0, 0.3, z + 0.38));
    g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), gold, 0.75, 1.7, z + 0.6));
  }
  function twistedChimney(g, x, y, z, h, mat) {
    const geo = new THREE.CylinderGeometry(0.34, 0.5, h, 6, 14);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = (p.getY(i) / h) * 2.2, px = p.getX(i), pz = p.getZ(i);
      p.setX(i, px * Math.cos(a) - pz * Math.sin(a)); p.setZ(i, px * Math.sin(a) + pz * Math.cos(a));
    }
    geo.computeVertexNormals();
    g.add(mesh(geo, mat, x, y + h / 2, z));
    g.add(lathe([[0.62, 0], [0.7, 0.2], [0.45, 0.6], [0.12, 1.0], [0, 1.05]], M.stucco, 16).translateX(x).translateY(y + h).translateZ(z));
  }

  // ================= A: Glass & mosaic =================
  function designA() {
    const g = new THREE.Group();
    const mull = new Inst(unitBox, M.trim), fins = new Inst(unitBox, M.timber);
    g.add(mesh(new RoundedBoxGeometry(27, 0.5, 19, 3, 0.2), marble, 0, 0.06, 0));
    const roofY = (x, z) => 18.15 + 0.8 * Math.sin(x * 0.42 + 0.6) * (0.6 + 0.4 * Math.cos(z * 0.35)) + 0.35 * Math.cos(z * 0.5);
    LV.forEach((L, i) => {
      if (i < 3) {
        const gh = L.h - 0.45;
        const gl = bx(L.w + 0.3, gh, L.d + 0.3, glass, 0, L.y + 0.3, 0, false); gl.renderOrder = 2;
        g.add(gl);
        g.add(mesh(new RoundedBoxGeometry(L.w + 1.5, 0.5, L.d + 1.5, 3, 0.22), M.stucco, 0, L.y + L.h + 0.02, 0));
        for (const [x, z, side] of perimeter(L.w + 0.34, L.d + 0.34, 2)) mull.add(x, L.y + 0.3, z, side ? 0.16 : 0.08, gh, side ? 0.08 : 0.16);
      } else {
        // Studio glass rises to meet the underside of the wave roof.
        const w = L.w + 0.3, d = L.d + 0.3, y0 = L.y + 0.3, pos = [], idx = [];
        const ring = [];
        for (let x = -w / 2; x < w / 2 - 1e-6; x += w / 40) ring.push([x, d / 2]);
        for (let z = d / 2; z > -d / 2 + 1e-6; z -= d / 24) ring.push([w / 2, z]);
        for (let x = w / 2; x > -w / 2 + 1e-6; x -= w / 40) ring.push([x, -d / 2]);
        for (let z = -d / 2; z < d / 2 - 1e-6; z += d / 24) ring.push([-w / 2, z]);
        ring.forEach(([x, z], k) => {
          pos.push(x, y0, z, x, roofY(x, z) - 0.12, z);
          const a = k * 2, b = ((k + 1) % ring.length) * 2;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
          if (k % 4 === 0) mull.add(x, y0, z, 0.1, roofY(x, z) - 0.12 - y0, 0.1);
        });
        const wg = new THREE.BufferGeometry();
        wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setIndex(idx); wg.computeVertexNormals();
        const gm = glass.clone(); gm.side = THREE.DoubleSide; registerGlow(gm, 0.9);
        const wm = mesh(wg, gm, 0, 0, 0, false); wm.renderOrder = 2; g.add(wm);
      }
    });
    // Marble fin wall on the east side and a marble panel with a rose window over the entry.
    g.add(bx(0.55, 12.5, 5, marble, 12.45, 0.25, 1.2));
    g.add(bx(7, 8.3, 0.5, marble, 0, 4.45, 8.35));
    g.add(mesh(new THREE.CircleGeometry(2.3, 48), rose, 0, 8.7, 8.62, false));
    g.add(mesh(new THREE.TorusGeometry(2.3, 0.14, 12, 64), gold, 0, 8.7, 8.62));
    portal(g, 8.2, 6.4, 5.5, 4.4, 4.5, 1.7, mosaicWarmM);
    // Timber fins shading the west (sunset) side.
    for (let z = -2.6; z <= 7.8; z += 0.65) fins.add(-12.75, 0.3, z, 0.55, 12.3, 0.09);
    // Mosaic stair tower at the north-west corner.
    tower(g, -11.7, -7.7, 2.6, 20, mosaic(COOL, [5, 7]), (rt) => [[rt, 0], [rt + 0.7, 0.35], [rt + 0.85, 0.9], [rt + 0.3, 1.7], [1.3, 2.9], [0.4, 3.8], [0, 4.1]], mosaic(WARM, [5, 2], 12));
    // Wave roof over the studio.
    const rg = new THREE.BoxGeometry(24, 0.35, 16, 56, 1, 36);
    const p = rg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, p.getY(i) + roofY(x, z));
    }
    rg.computeVertexNormals();
    g.add(mesh(rg, M.stucco, 0, 0, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const ch = roofY(sx * 11.3, sz * 7.3) - 12.78;
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, ch, 10), M.trim, sx * 11.3, 12.78 + ch / 2, sz * 7.3));
    }
    // Terrace rail around level 4.
    for (const s of [-1, 1]) {
      const a = bx(25.2, 1.05, 0.06, railGlass, 0, 12.78, s * 8.6, false), b = bx(0.06, 1.05, 17.2, railGlass, s * 12.6, 12.78, 0, false);
      a.renderOrder = b.renderOrder = 3;
      g.add(a, b, bx(25.3, 0.06, 0.1, M.trim, 0, 13.83, s * 8.6), bx(0.1, 0.06, 17.3, M.trim, s * 12.6, 13.83, 0));
    }
    curvedBalcony(g, -4, 4.5, 5, M.stucco, 'glass');
    curvedBalcony(g, 6, 8.5, 3.6, M.stucco, 'glass');
    twistedChimney(g, 11.2, 12.78, -7.2, 2.8, mosaicCoolM);
    twistedChimney(g, 11.3, 12.78, -5.7, 2.1, mosaicWarmM);
    twistedChimney(g, 9.9, 12.78, -7.3, 2.4, mosaicCoolM);
    g.add(mull.build(), fins.build());
    return g;
  }

  // ================= B: Wave house =================
  function designB() {
    const g = new THREE.Group();
    const mull = new Inst(unitBox, M.trim), bal = new Inst(unitCyl, gold);
    const bone = (h) => { const pr = []; for (let i = 0; i <= 18; i++) { const u = i / 18; pr.push([0.26 + 0.42 * Math.abs(2 * u - 1) ** 2.4, u * h]); } return pr; };
    g.add(outlineSlab(squircle(15.4, 10.6, 5, 0.45, 7, 1), 0.5, marble, 0.32));
    // Glass skin.
    g.add(outlineWall(squircle(13.9, 9.3, 6), 12.2, glass, 0.3));
    g.add(outlineWall(squircle(11.6, 7.0, 6), 4.9, glass, 12.7));
    const sk = squircle(13.95, 9.35, 6, 0, 0, 0, 52), sk4 = squircle(11.65, 7.05, 6, 0, 0, 0, 40);
    for (const [x, z] of sk) mull.add(x, 0.3, z, 0.1, 12.2, 0.1);
    for (const [x, z] of sk4) mull.add(x, 12.7, z, 0.1, 4.9, 0.1);
    // Undulating balconies at every floor, each with a bronze rail.
    [[4.5, 0], [8.5, 2.1], [12.5, 4.2]].forEach(([y, phase], i) => {
      const a = 15.3 - i * 0.25, b = 10.5 - i * 0.2;
      g.add(outlineSlab(squircle(a, b, 5, 0.8, 7, phase), 0.5, M.stucco, y + 0.3));
      const rp = squircle(a - 0.3, b - 0.3, 5, 0.8, 7, phase);
      const curve = (lift) => new THREE.CatmullRomCurve3(rp.map(([x, z]) => new THREE.Vector3(x, y + 0.3 + lift, z)), true);
      g.add(mesh(new THREE.TubeGeometry(curve(1.05), 480, 0.05, 6, true), gold), mesh(new THREE.TubeGeometry(curve(0.2), 480, 0.03, 6, true), gold));
      const pts = curve(0).getSpacedPoints(170);
      for (const q of pts) bal.add(q.x, y + 0.3, q.z, 0.022, 1.05, 0.022);
    });
    // Bone-like columns around the ground floor and under the roof.
    squircle(14.7, 9.9, 5, 0, 0, 0, 18).forEach(([x, z]) => { if (z > 8 && Math.abs(x) < 5) return; const c = lathe(bone(4.3), marble, 16); c.position.set(x, 0.3, z); g.add(c); });
    squircle(12.5, 7.9, 5, 0, 0, 0, 12).forEach(([x, z]) => { const c = lathe(bone(4.7).map(([r, y]) => [r * 0.7, y]), marble, 14); c.position.set(x, 12.8, z); g.add(c); });
    // Scaled dome roof with a golden spine.
    g.add(outlineSlab(squircle(13.3, 8.6, 5, 0.45, 6, 0.5), 0.5, M.stucco, TOP + 0.35));
    const dome = mesh(new THREE.SphereGeometry(1, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2), scales([14, 4]), 0, TOP + 0.3, 0);
    dome.scale.set(12.3, 3.9, 7.7);
    g.add(dome);
    for (let i = -7; i <= 7; i++) {
      const x = i * 1.4, y = TOP + 0.3 + 3.9 * Math.sqrt(1 - (x / 12.3) ** 2);
      g.add(mesh(new THREE.SphereGeometry(0.56 - Math.abs(i) * 0.04, 14, 10), gold, x, y + 0.12, 0));
    }
    // Tower with an onion cap.
    tower(g, -12.2, -8.1, 2.7, 21, M.stucco, (rt) => [[rt, 0], [rt + 0.9, 0.7], [rt + 0.95, 1.6], [rt + 0.2, 2.9], [1.0, 4.0], [0.3, 4.9], [0, 5.3]], mosaic(COOL, [6, 3]), 0.22);
    portal(g, 9.0, 6.2, 6.2, 4.2, 5.0, 2.2, mosaicWarmM);
    // Stained-glass bubbles drifting across the south front.
    const rnd = rng(31);
    const gz = (x) => 9.3 * (1 - Math.abs(x / 13.9) ** 6) ** (1 / 6) + 0.1;
    let placed = 0, guard = 0; const spots = [];
    while (placed < 17 && guard++ < 400) {
      const x = (rnd() * 2 - 1) * 11.2, y = 5.6 + rnd() * 6.2, r = 0.45 + rnd() * 0.85;
      if (Math.abs(x) < 4 && y < 7.6) continue;
      if (Math.abs(y - 8.65) < r + 0.35) continue; // keep clear of the balcony slab
      if (spots.some((s) => Math.hypot(s[0] - x, s[1] - y) < s[2] + r + 0.25)) continue;
      spots.push([x, y, r]); placed++;
      g.add(mesh(new THREE.CircleGeometry(r, 32), placed % 3 ? stainedUV : rose, x, y, gz(x), false));
      g.add(mesh(new THREE.TorusGeometry(r, 0.07, 8, 40), gold, x, y, gz(x)));
    }
    g.add(mull.build(), bal.build());
    return g;
  }

  // ================= C: Spanish courtyard =================
  function designC() {
    const g = new THREE.Group();
    const fins = new Inst(unitBox, M.timber), ironB = new Inst(unitCyl, iron), beams = new Inst(unitBox, M.timber);
    const pink = new Inst(unitBlob, new THREE.MeshStandardMaterial({ color: 0xe0559a, roughness: 0.9, flatShading: true }));
    const magenta = new Inst(unitBlob, new THREE.MeshStandardMaterial({ color: 0xb23aa6, roughness: 0.9, flatShading: true }));
    const leaf = new Inst(unitBlob, new THREE.MeshStandardMaterial({ color: 0x3f7a3c, roughness: 0.95, flatShading: true }));
    const tiles = terracotta([0.6, 0.6]);
    const rnd = rng(77);
    const fan = (wall, [cx, y0, w, h], doorMat) => {
      const f = mesh(new THREE.CircleGeometry(w / 2, 20, 0, Math.PI), stainedUV, cx, y0 + h - w / 2, 0.16, false);
      wall.add(f);
      if (doorMat) wall.add(bx(w - 0.1, h - w / 2, 0.12, doorMat, cx, y0, 0.2));
    };
    const gl = bx(24.1, 8.2, 16.1, glass, 0, 0.3, 0, false); gl.renderOrder = 2; g.add(gl);
    // Stucco walls with arched windows, levels 1 and 2.
    const row = (xs, y0, w, h) => xs.map((x) => [x, y0, w, h]);
    const south = [[0, 0.3, 2.7, 3.9], ...row([-9, -4.5, 4.5, 9], 1.0, 2.2, 3.0), ...row([-9, -4.5, 0, 4.5, 9], 5.3, 1.8, 2.6)];
    const north = [...row([-9, -4.5, 0, 4.5, 9], 0.3, 3.3, 3.7), ...row([-8, -4, 0], 4.8, 2.0, 3.2), ...row([5, 9], 5.3, 1.8, 2.6)];
    const sideH = [...row([-4.5, 0, 4.5], 1.0, 2.2, 3.0), ...row([-4.5, 0, 4.5], 5.3, 1.8, 2.6)];
    for (const [face, holes, width] of [['S', south, 25], ['N', north, 25], ['E', sideH, 16.2], ['W', sideH, 16.2]]) {
      const wall = onFace(holedWall(width, 8.5, holes, 0.5, M.stucco), face, 24, 16, 0, -0.05);
      holes.forEach((hl, i) => fan(wall, hl, face === 'S' && i === 0 ? M.timber : null));
      g.add(wall);
    }
    // Flower boxes under the upper south windows.
    for (const x of [-9, -4.5, 0, 4.5, 9]) {
      g.add(bx(2, 0.3, 0.45, M.timber, x, 4.95, 8.7));
      for (let k = 0; k < 5; k++) (k % 2 ? pink : magenta).add(x - 0.8 + k * 0.4, 5.3, 8.72, 0.26, 0.24, 0.26);
    }
    // Front loggia: five arches with a terrace above.
    g.add(bx(26.5, 0.3, 5.2, marble, 0, 0, 10.4), bx(8, 0.15, 1.4, marble, 0, 0, 13.4));
    const arcade = holedWall(25.6, 4.6, row([-9.9, -4.95, 0, 4.95, 9.9], 0.3, 3.8, 3.95), 0.6, M.stucco); arcade.position.set(0, 0, 11.9);
    g.add(arcade);
    for (const s of [-1, 1]) {
      const ret = holedWall(4.2, 4.6, [[0, 0.3, 2.6, 3.8]], 0.6, M.stucco);
      ret.rotation.y = (s * Math.PI) / 2; ret.position.set(s * 12.2, 0, 10.1);
      g.add(ret);
    }
    g.add(bx(26.2, 0.35, 4.9, M.timber, 0, 4.6, 10.3));
    for (let i = 0; i < 13; i++) beams.add(-12 + i * 2, 4.35, 10.2, 0.2, 0.28, 4.4);
    g.add(bx(26.2, 0.07, 0.07, iron, 0, 6.0, 12.6));
    for (let i = 0; i <= 64; i++) ironB.add(-13 + i * 0.40625, 4.95, 12.6, 0.025, 1.05, 0.025);
    for (const s of [-1, 1]) { g.add(bx(0.07, 0.07, 4.4, iron, s * 13, 6.0, 10.4)); for (let i = 0; i < 11; i++) ironB.add(s * 13, 4.95, 8.3 + i * 0.4, 0.025, 1.05, 0.025); }
    for (const x of [-11.5, -5.5, 5.5, 11.5]) { g.add(mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.7, 14), tiles, x, 5.3, 11.6)); leaf.add(x, 6.0, 11.6, 0.6, 0.6, 0.6); pink.add(x + 0.2, 6.35, 11.7, 0.3, 0.3, 0.3); }
    // Mosaic frieze under the maker-space level.
    const friezeA = mosaic(COOL, [12, 0.5], 21), friezeB = mosaic(COOL, [8, 0.5], 22);
    for (const s of [-1, 1]) g.add(bx(25.3, 0.7, 0.6, friezeA, 0, 8.2, s * 8.25), bx(0.6, 0.7, 16.6, friezeB, s * 12.35, 8.2, 0));
    // Level 3: glass behind timber fins, a modern band inside the classic shell.
    const g3 = bx(23.6, 3.6, 15.6, glass, 0, 8.9, 0, false); g3.renderOrder = 2; g.add(g3);
    for (const [x, z, side] of perimeter(24.2, 16.2, 0.95)) fins.add(x, 8.9, z, side ? 0.5 : 0.13, 3.6, side ? 0.13 : 0.5);
    g.add(mesh(new RoundedBoxGeometry(24.9, 0.3, 16.9, 2, 0.1), M.accent, 0, 12.42, 0));
    // Terracotta skirt roof, then the studio as an arched lantern.
    const skirt = hipRoof(26.6, 18.6, 20.2, 12.2, 1.5, tiles); skirt.position.y = 12.55; g.add(skirt);
    const g4 = bx(19.8, 5, 11.8, glass, 0, 12.5, 0, false); g4.renderOrder = 2; g.add(g4);
    const longA = row([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5], 1.3, 2.3, 3.4), shortA = row([-3.6, 0, 3.6], 1.3, 2.6, 3.4);
    for (const [face, holes, width] of [['S', longA, 20.4], ['N', longA, 20.4], ['E', shortA, 12.2], ['W', shortA, 12.2]]) {
      const wall = onFace(holedWall(width, 5, holes, 0.4, M.stucco), face, 20, 12, 12.5, -0.05);
      holes.forEach((hl) => fan(wall, hl));
      g.add(wall);
    }
    g.add(bx(22.4, 0.25, 14.4, M.timber, 0, 17.4, 0));
    const top = hipRoof(23, 15, 9, 0.02, 3.1, tiles); top.position.y = 17.6; g.add(top);
    g.add(bx(9.2, 0.25, 0.3, tiles, 0, 20.6, 0));
    // Round tower with a tiled cone and a mosaic band.
    g.add(mesh(new THREE.CylinderGeometry(2.6, 2.8, 19.6, 36), M.stucco, -12, 9.8, -8));
    g.add(mesh(new THREE.CylinderGeometry(2.72, 2.72, 1.0, 36, 1, true), mosaic(COOL, [9, 0.6], 23), -12, 17.2, -8));
    g.add(mesh(new THREE.ConeGeometry(3.5, 4.8, 36, 1, true), terracotta([12, 3]), -12, 22, -8));
    g.add(mesh(new THREE.SphereGeometry(0.4, 16, 12), gold, -12, 24.6, -8));
    [[-1, 0], [-0.707, -0.707], [0, -1]].forEach(([dx, dz], i) => {
      for (const y of [3 + i * 1.6, 10 + i * 1.6]) {
        const w = mesh(new THREE.ShapeGeometry(new THREE.Shape(archPts(0, 0, 0.9, 2.1))), stainedM, -12 + dx * 2.82, y, -8 + dz * 2.82, false);
        w.rotation.y = Math.atan2(dx, dz); g.add(w);
      }
    });
    // Back of the house: curved iron balcony and a timber pergola outside the kitchen.
    curvedBalcony(g, -4, 4.5, 5.2, M.stucco, 'iron');
    for (const x of [1, 6, 11]) for (const z of [-9.3, -13.2]) g.add(bx(0.28, 3.4, 0.28, M.timber, x, 0, z));
    for (let i = 0; i < 9; i++) beams.add(0.4 + i * 1.4, 3.4, -11.25, 0.16, 0.22, 5.2);
    for (const z of [-9.3, -13.2]) g.add(bx(11.6, 0.24, 0.2, M.timber, 6, 3.2, z));
    // Bougainvillea climbing the loggia, tower and pergola.
    const climb = (x, z, h, spread, n) => {
      for (let k = 0; k < n; k++) {
        const y = 0.6 + rnd() * h, s = 0.3 + rnd() * 0.4;
        const pick = rnd(); (pick < 0.45 ? pink : pick < 0.8 ? magenta : leaf).add(x + (rnd() - 0.5) * spread, y, z + (rnd() - 0.5) * spread * 0.7, s, s * 0.85, s);
      }
    };
    climb(-12.9, 12.3, 5.2, 1.6, 34); climb(12.9, 12.3, 5.2, 1.6, 34); climb(-14.6, -8.6, 7, 2.2, 40); climb(11, -13.2, 3.4, 1.4, 22); climb(6, -13.4, 3.6, 5, 26);
    g.add(fins.build(), ironB.build(), beams.build(), pink.build(), magenta.build(), leaf.build());
    return g;
  }

  return [
    { id: 'A', name: 'Glass & mosaic', group: designA() },
    { id: 'B', name: 'Wave house', group: designB() },
    { id: 'C', name: 'Spanish courtyard', group: designC() },
  ];
}
