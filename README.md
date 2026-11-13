# Dream Estate

A walkable 3D model of our dream home, built with Three.js: mansion, lagoon pool, waterfall and koi pond, garden, and farm.

## Status

Phase 1 (grey-box layout, drone view, day/sunset/night lighting) and phase 2 (three switchable mansion exteriors) are done. Next: pick an exterior, then first-person walking and interiors.

## How it works

- `src/sitePlan.js` is the site plan: zones, levels, rooms, paths and viewpoints, in meters. Change the plan and the world changes.
- `src/terrain.js` shapes the ground and drapes paths over it.
- `src/exteriors.js` builds the three exterior designs: A glass and mosaic, B wave house, C Spanish courtyard.
- `src/main.js` builds the scene, lighting, camera and controls.
- `src/template.html` is the page shell and interface.

## Build

```
npm install
node build.mjs
```

This bundles everything into one self-contained page at `dist/index.html`. Open it in a browser.

`shoot.py` and `shoot2.py` render the built page in headless Chrome and save screenshots to `shots/` for review.
