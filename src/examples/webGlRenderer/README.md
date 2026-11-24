# WebGL renderer example

A tour of `IgeWebGlRenderer`: 2D sprites, primitive 3D shapes, a glTF model, lights and a switchable camera in one scene.

## What it shows

- A grid of animated `fairy.png` sprites drawn as textured planes in 3D space.
- A row of coloured cubes (`IgePrimitiveGeometry.createCube()` with `material()`) lit by the scene's lights, spinning.
- Ducks loaded from `assets/models/Duck.glb` with `igeGltfLoader`, built into entities and spun.
- Lights: an ambient light, a directional "sun" and an orbiting point light.
- The camera slowly orbits the scene in perspective mode.
- `?panel=1` adds a panel viewport (picture-in-picture, bottom right) with a scene, lights, shadow and two cameras of its own, cutting between them every three seconds.

## Controls

| Key | Action |
|-----|--------|
| P | Perspective camera (orbit resumes) |
| O | Orthographic camera |
| Up / Down | Zoom the orthographic view in and out |
| 1 - 4 | Camera presets: isometric, isometric 45 degrees, top-down, side-scroller |
| L | Toggle lighting |
| S | Toggle shadows |
| D | Cycle the shadow debug mode |
| M (with `?panel=1`) | Show or hide the panel |
| E (with `?panel=1`) | Toggle the panel's colour-shift effect |

The page also shows a status line, frame rate and entity count.

## Running it

Build the examples with `npm run build-examples` (or `npm run build-examples-watch` while editing), serve the repository folder with any static server and open this example's `index.html` in a browser that supports WebGL 2. Textures and models load relative to `src/assets`, so serve from the repo root.

## Files

- `index.ts`: starts the engine and creates the client.
- `client.ts`: builds the scene, lights, entities, keyboard controls and the optional panel.
- `index.html`: the page with the loading screen and stats display.

See `guides/webgl-models.md` and `guides/panel-viewport.md` for the features used.
