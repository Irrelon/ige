# Moving a 2D project to the WebGL renderer

A Canvas 2D IGE game can run on `IgeWebGlRenderer` with two changes: create the WebGL renderer, and give each
viewport's camera the `screen2d` preset. `src/examples/webGl2d` is a working example.

## The changes

The simplest way: let the engine choose. `igeCreateRenderer({ mode: "2d" })` returns the WebGL renderer when the browser
supports WebGL (else Canvas 2D) and gives viewport cameras the `screen2d` preset, and `ige.engine.start()` does the same
when the game assigns no renderer at all:

```typescript
ige.engine.renderer(igeCreateRenderer({ mode: "2d" })); // or assign nothing
await ige.engine.start();
const viewport = new IgeViewport().autoSize(true).scene(scene).mount(ige.engine); // screen2d on WebGL
```

Or choose WebGL explicitly:

```typescript
// Before: const renderer = new IgeCanvas2dRenderer();
const renderer = new IgeWebGlRenderer();
ige.engine.renderer(renderer);
renderer.createFrontBuffer(true);
await renderer.setup();

const viewport = new IgeViewport().autoSize(true).scene(scene).mount(ige.engine);
viewport.camera.preset("screen2d");
```

Isometric games get `IgeCanvas2dRenderer` from `igeCreateRenderer({ mode: "iso" })` (see Differences).

`screen2d` reproduces the Canvas 2D view: x to the right, y down, one world unit per pixel, and the camera's
position is the centre of the view, so `camera.translateTo(x, y, 0)` and camera tracking pan as before, and
`camera.scaleTo(2, 2, 2)` zooms in. Split screen works as before: give every viewport the preset
(`src/examples/webGl2d/index.html?split=1`).

## What carries over

- Entity transforms: `translate`, `rotate` (z is the 2D rotation, clockwise on screen as in Canvas 2D), `scale`,
  `width`/`height`, origin and mounting (children move with their parents).
- Image textures and sprite sheet cells (`cell()`), `opacity()`, `hide()`/`show()`.
- Pointer events (`pointerOver`, `pointerOut`, `pointerDown`, `pointerUp`...), tested against the sprite's quad in the
  view under the pointer, including in split screen.
- Smart textures. Each entity gets its own canvas, drawn by the texture's `render(ctx, entity)` in the same space as
  Canvas 2D (origin at the entity's centre, entity pixels). As in Canvas 2D they redraw every frame; give entities
  whose drawing doesn't change `cache(true)`, and call `cacheDirty(true)` when it does change. Drawing a smart texture
  means uploading its canvas to the GPU, so caching matters more here than in Canvas 2D.
- `IgeFontEntity` text: native fonts, bitmap font sheets (`IgeFontSheet`) and `bindData()`.
- Texture filters: `applyFilter()` (also after the texture was first drawn), `preFilter()` (re-run every frame, as
  Canvas 2D does) and `resize()`.
- `compositeCache(true)` groups draw correctly; the WebGL renderer draws their children directly, so the cache brings
  no speed-up there.

## Differences

- **Draw order.** Entities at the same z are drawn in scene graph order (later mounted on top). Canvas 2D's
  `depth()` sorting is not applied; use z (smaller z is nearer this camera) or mount order.
- **Isometric render mode.** `IgeEntityRenderMode.iso` games place the ground on x/y with z up, and Canvas 2D projects
  them itself. The WebGL renderer treats every entity as 3D with y up and won't map iso scenes across: move them to a
  3D layout (ground on x/z) with the `isometric` camera preset, or keep `IgeCanvas2dRenderer` for them.
- **Tick behaviours.** The WebGL renderer draws entities without calling their `tick()`. Entity `preTick` behaviours
  still run, once per frame (Canvas 2D runs them once per viewport that draws the entity), with a 2D context whose
  drawing calls do nothing, so logic in them works but drawing in them doesn't show. Code overriding `tick()` itself
  doesn't run; put game logic in `update()` or update behaviours.
- `src/examples/webGl2d/index.html?canvas=1` runs the example on `IgeCanvas2dRenderer` for a side-by-side
  comparison, and `?auto=1` leaves the renderer and camera to the engine.
- Sprites in a `screen2d` view are drawn flat with their 2D transform. In 3D views they are billboards that face the
  camera (`entity.billboard("full" | "y" | "none")`).

## Why move

- 2D and 3D content can share one scene: sprites alongside models, lights and shadows.
- Large sprite counts draw faster.
- The split-screen helpers, overlay, particles and decals work with 2D content too.
