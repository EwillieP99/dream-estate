import * as THREE from 'three';
import { farm, driveway, paths } from './sitePlan.js';

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const s01 = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smooth = (a, b, x) => s01((x - a) / (b - a));

function hash(ix, iz) {
  let n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z) {
  return (vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 9.2, z * 2.1 - 4.7) * 0.3 + vnoise(x * 4.3 - 2.3, z * 4.3 + 7.9) * 0.15);
}

// How flat the ground is forced to be: 1 on built areas, 0 in open country.
export function flatMask(x, z) {
  const dHouse = Math.hypot((x - 15) / 135, (z - 10) / 100);
  const m1 = 1 - smooth(0.85, 1.25, dHouse);
  const m2 = (1 - smooth(40, 95, Math.abs(x))) * smooth(60, 100, z) * (1 - smooth(290, 340, z));
  const m3 = 1 - smooth(100, 165, Math.hypot(x - farm.position[0], z - farm.position[1]));
  const m4 = (1 - smooth(14, 50, Math.abs(z - 24))) * smooth(100, 140, x) * (1 - smooth(330, 380, x));
  return Math.max(m1, m2, m3, m4);
}

export const SEA_LEVEL = -22;

// Ground height at any point.
export function H(x, z) {
  const F = flatMask(x, z);
  const rolling = (fbm(x / 180, z / 180) - 0.5) * 16 + (fbm(x / 55, z / 55) - 0.5) * 3;
  const valley = 19 * s01((-70 - z) / 200) * (1 - 0.6 * smooth(260, 620, Math.abs(x - 20)));
  const north = 130 * s01((-430 - z) / 520);
  const west = 62 * s01((-330 - x) / 340);
  const edge = 90 * s01((Math.max(Math.abs(x), Math.abs(z)) - 1250) / 330);
  const h = Math.max((rolling - valley + north - west) * (1 - F), -18 - west * 1.2);
  return h - edge;
}

export function buildTerrain() {
  const size = 3200, seg = 320;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const meadowA = new THREE.Color(0x6f9a4e), meadowB = new THREE.Color(0x93b45c);
  const lawn = new THREE.Color(0x7fae58), deep = new THREE.Color(0x4f7d45);
  const rock = new THREE.Color(0x8a8f7c), sand = new THREE.Color(0xdccba2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = H(x, z);
    pos.setY(i, h);
    const n = fbm(x / 40, z / 40);
    c.copy(meadowA).lerp(meadowB, n);
    c.lerp(lawn, flatMask(x, z) * 0.7);
    c.lerp(deep, smooth(-4, -34, h) * 0.6);
    c.lerp(rock, smooth(55, 110, h));
    c.lerp(sand, smooth(-13, -19, h) * smooth(-300, -380, x));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Sample a polyline of [x, z] points into a smooth list of Vector2, roughly every `step` meters.
export function samplePath(points, step = 2) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
  const n = Math.max(2, Math.ceil(curve.getLength() / step));
  return curve.getSpacedPoints(n).map((p) => new THREE.Vector2(p.x, p.z));
}

// A flat ribbon draped over the terrain.
export function ribbon(points, width, material, lift = 0.14, step = 2) {
  const pts = samplePath(points, step);
  const verts = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dir = new THREE.Vector2().subVectors(b, a).normalize();
    const nx = -dir.y, nz = dir.x;
    const lx = p.x + nx * width / 2, lz = p.y + nz * width / 2;
    const rx = p.x - nx * width / 2, rz = p.y - nz * width / 2;
    const y = Math.max(H(lx, lz), H(rx, rz), H(p.x, p.y)) + lift;
    verts.push(lx, y, lz, rx, y, rz);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

// Distance helpers used to keep trees off roads and paths.
const keepClear = [];
export function registerClear(points, radius) {
  for (const p of samplePath(points, 3)) keepClear.push([p.x, p.y, radius * radius]);
}
export function isClear(x, z) {
  for (const [px, pz, r2] of keepClear) {
    const dx = x - px, dz = z - pz;
    if (dx * dx + dz * dz < r2) return false;
  }
  return true;
}
registerClear(driveway.points, 6.5);
registerClear(paths.farmRoad, 6);
