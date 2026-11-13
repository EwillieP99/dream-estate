// Site plan for the dream estate. Units are meters.
// +X is east, -Z is north, the front of the house faces south (+Z).
// Everything the 3D world builds is read from this file, so changing
// the plan here changes the world.

export const palette = {
  stucco: 0xf3ece0, // warm white walls
  timber: 0x8a5a3c, // brown
  trim: 0xb9bec4, // silver metal trim
  accent: 0xb5322c, // red accent
  glass: 0x9fd0e0,
  stone: 0xcfc4b2,
  road: 0x6f6a66,
  water: 0x2f9fb8,
  pond: 0x2c7f86,
  rock: 0x7d756c,
  soil: 0x6b4a34,
  crop: 0x6fa24a,
  blossomPink: 0xf4a6c8,
  blossomPurple: 0xb48ae0,
};

// Mansion: a compact, tall house. Footprint 24 x 16 m.
// Room rectangles are [x, z, width, depth] measured from the centre of the floor.
export const mansion = {
  position: [0, 0],
  footprint: [24, 16],
  levels: [
    {
      id: 'L-1', name: 'Level -1 · Wine cellar', base: -8, height: 4, footprint: [12, 8],
      rooms: [{ name: 'Wine cellar', rect: [0, 0, 10, 6], color: 0x7a5a48 }],
    },
    {
      id: 'L0', name: 'Level 0 · Basement', base: -4, height: 4, footprint: [24, 16],
      rooms: [
        { name: 'Gym', rect: [0, -4, 23, 7], color: 0x8fa3ad },
        { name: 'Home theatre', rect: [-6.75, 4, 9.5, 7], color: 0x5d4a66 },
        { name: 'Bar + café', rect: [5.25, 4, 12.5, 7], color: 0xa9774f },
      ],
    },
    {
      id: 'L1', name: 'Level 1 · Living', base: 0, height: 4.5, footprint: [24, 16],
      rooms: [
        { name: 'Foyer', rect: [0, 5, 6, 5], color: 0xe6d9c2 },
        { name: 'Dining room', rect: [7.5, 5, 8, 5], color: 0xc9a27a },
        { name: 'Climbing wall', rect: [-9.5, 5, 4, 5], color: 0xb5322c },
        { name: 'Living room', rect: [-5.5, -3.5, 12, 8], color: 0xd9c7a8 },
        { name: 'Kitchen', rect: [6.25, -3.5, 10.5, 8], color: 0xe8e2d6 },
      ],
    },
    {
      id: 'L2', name: 'Level 2 · Bedrooms', base: 4.5, height: 4, footprint: [24, 16],
      rooms: [
        { name: 'Primary bedroom', rect: [-5, -3.5, 13, 8], color: 0xdcc9b6 },
        { name: 'Closet', rect: [4.75, -4.5, 5.5, 6], color: 0xbfae9c },
        { name: 'Primary bathroom', rect: [9.75, -4.5, 3.5, 6], color: 0xcfe0e4 },
        { name: 'Office', rect: [7, 4.5, 9, 6], color: 0xb9c2a8 },
        { name: 'Guest bedroom', rect: [-2, 5, 7, 5], color: 0xd6c4c4 },
        { name: 'Climbing wall', rect: [-9.5, 5, 4, 5], color: 0xb5322c },
      ],
    },
    {
      id: 'L3', name: 'Level 3 · Maker space', base: 8.5, height: 4, footprint: [24, 16],
      rooms: [
        { name: 'Maker space', rect: [1.5, 0, 20, 15], color: 0x4b3f78 },
        { name: 'Climbing wall (top)', rect: [-9.5, 5, 4, 5], color: 0xb5322c },
      ],
    },
    {
      id: 'L4', name: 'Level 4 · Art studio', base: 12.5, height: 5, footprint: [20, 12],
      rooms: [{ name: 'Art studio', rect: [0, 0, 19, 11], color: 0xf0d9a8 }],
    },
  ],
  // Vertical connections called out in the spec.
  spiralStair: { x: -10, z: -6, fromLevel: 'L2', toLevel: 'L4' }, // behind the secret bookshelf
  core: { x: 10.5, z: 1, size: [2.4, 2.4] }, // main stair and lift
};

export const garage = { position: [-36, 38], size: [15, 8, 4], cars: 4 };

export const forecourt = { position: [0, 40], radius: 14 };

export const gate = { position: [0, 268], width: 9, wall: 46 };

export const driveway = {
  width: 5,
  points: [[0, 268], [-10, 222], [8, 165], [0, 105], [0, 54]],
};

export const pool = {
  center: [0, -42],
  // Freeform lagoon outline, relative to the centre.
  outline: [[-14, 1], [-11, -6], [-3, -8], [4, -5], [10, -8], [15, -3], [13, 4], [6, 7], [0, 4], [-7, 8], [-13, 6]],
  cabana: [-22, -44],
  outdoorKitchen: [19, -30],
};

export const waterfall = {
  position: [96, -66], // top of the falls
  height: 12,
  pond: { center: [96, -50], radius: [13, 9] },
  stream: [[84, -50], [72, -62], [62, -82], [56, -130], [48, -230]],
};

export const garden = {
  greenhouse: { position: [70, -4], size: [11, 6, 4] },
  beds: { origin: [53, -30], cols: 5, rows: 3, size: [4, 3], gap: 1.4 },
};

export const farm = {
  position: [420, 20],
  barn: { offset: [0, -30], size: [16, 10, 6] },
  stable: { offset: [-30, -20], size: [12, 6, 3.5] },
  coop: { offset: [26, -22], size: [5, 4, 2.5] },
  paddock: { offset: [-30, 12], size: [34, 24] },
  orchard: { offset: [34, 22], cols: 6, rows: 5, spacing: 7 },
  crops: { offset: [-2, 34], rows: 9, length: 30, spacing: 2.2 },
  gate: { offset: [-78, 0] },
};

export const paths = {
  // Stone paths lined with pink and purple flowers.
  stone: [
    [[0, 26], [0, 9]], // forecourt to front door
    [[0, -9], [0, -24]], // back door to pool deck
    [[-14, 40], [-28, 40]], // forecourt to garage
    [[18, -40], [44, -40], [76, -42], [86, -46]], // pool to garden and waterfall
    [[60, -40], [62, -16], [66, -8]], // spur to the greenhouse
  ],
  // Wider road to the farm (golf cart route).
  farmRoad: [[14, 40], [70, 34], [150, 24], [260, 20], [342, 20]],
};

// Named viewpoints for the drone camera: [camera position], [look-at target].
export const viewpoints = [
  { id: 'estate', label: 'Whole estate', pos: [-40, 190, 330], target: [70, 0, 10] },
  { id: 'mansion', label: 'Mansion', pos: [-48, 26, 62], target: [0, 8, 0] },
  { id: 'pool', label: 'Pool', pos: [34, 22, -2], target: [0, 0, -44] },
  { id: 'waterfall', label: 'Waterfall & garden', pos: [58, 16, -18], target: [94, 4, -56] },
  { id: 'gate', label: 'Front gate', pos: [6, 7, 300], target: [0, 4, 240] },
  { id: 'farm', label: 'Farm', pos: [350, 55, 110], target: [420, 0, 14] },
];
