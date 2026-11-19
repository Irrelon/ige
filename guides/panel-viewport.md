# Panel viewport (WebGL)

A panel is a picture-in-picture view: a rectangle drawn over the canvas that shows a scene of its own, from a camera
of its own, with lights and shadows of its own. It's for things like a scripted playback shown in a panel over the
game: not video, a small scene the engine renders live.

```typescript
const panel = new IgePanelViewport({ right: 16, bottom: 16, width: "30%", aspect: 16 / 9 });
panel.scene(playbackScene);                    // its own scene graph: mount the panel's entities here
panel.lights.addLight(ambient);                // its own lights (the main view's don't reach it)
panel.lights.addLight(sun);

panel.camera.translateTo(150, 120, 220);       // the panel's first camera ("main"), set up like any camera
panel.camera.lookAtPoint(new IgePoint3d(0, 30, 0));
const wide = panel.newCamera("wide");          // more cameras, for cuts
wide.translateTo(-220, 60, 60);

renderer.addPanel(panel);                      // panels draw in the order added (later on top)
panel.enableShadows(sun, 1024);                // optional: a shadow map of its own
panel.show();

panel.cut("wide");                             // the next frame draws from that camera; nothing else happens
panel.hide();                                  // costs nothing while hidden
```

## Placement

`layout` takes `left` / `right`, `top` / `bottom`, `width` / `height` as CSS pixels (a number) or a fraction of the
canvas (`"25%"`: of its width for left, right and width, of its height for top, bottom and height). Give a width
and an `aspect` (width over height) and the height follows. A panel keeps its place on canvas resizes and device
pixel ratio changes because the rectangle is worked out from the canvas each frame (`igePanelRect()` is the maths).
`panel.layout({ ... })` moves it; `panel.rect()` is where it was drawn, in CSS pixels from the top-left.

## What it's drawn with

- **Order.** After the main views (every split-screen view), their post-processing, outlines and UI layer, and
  before the overlays (ui2, `IgeRenderer` overlays), so the game's UI can frame it.
- **Own rectangle.** The pass clears colour and depth in its rectangle only and is scissored to it.
- **Isolated.** The panel has its own light manager (`panel.lights`) and its own directional shadow map
  (`enableShadows()`); the main view's lights, shadows and culling don't touch it, and it doesn't touch theirs.
  The panel's shadows are never cached and don't count as a directional pass, so showing a panel doesn't switch the
  main view's `shadowCaching()` off. Point light shadows aren't supported in a panel.
- **No post-processing.** The panel draws straight onto the canvas after the main view's post-processing has been
  composited, so bloom, tone mapping, depth of field, outlines and the UI layer stay exactly as they are with or
  without a panel. A panel has no outlines, UI layer or debug lines of its own. Settings that are the renderer's
  (fog, `pbr()`, the clear colour, back face culling, LOD bias) apply to the panel as they do to the main view.
- **Fixed camera.** Nothing moves it and it can't be picked: it isn't a child of the engine, so input and pointer
  events never see it. A cut just swaps which camera it draws from, so it's free.
- **Costs only while shown.** A hidden panel's scene isn't updated, collected or drawn. A shown one is collected
  and drawn like one more small view of its scene (its entities are updated once per rendered frame).
- **Render on demand.** Showing, hiding, cutting and moving a panel ask for a frame. Changes inside its scene do
  too, as they do anywhere.

## Effect hook (a "recorder look")

Set `panel.effect = { apply(device, frame) { ... } }`. Each frame the panel was drawn, after its pass, the renderer
calls `apply` with the `IgeGpuDevice` and the panel's rectangle in device pixels (from the canvas's bottom-left).
Begin a pass on `device.surface()` with its viewport and scissor set to the frame and blend grain, scanlines or a
tint over it; touch nothing outside the rectangle. An effect that needs to read the panel's pixels (blur, colour
shifts) would want the panel drawn into a target of its own instead; that's the one addition the hook leaves for it.

## Example

`src/examples/webGlRenderer?panel=1`: a spinning cube with a shadow in a panel in the corner, cutting between two
cameras every three seconds; M shows and hides it.
