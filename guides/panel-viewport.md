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
- **Own target.** A shown panel draws into an offscreen target of its own (multisampled where the GPU allows, depth
  and stencil kept), sized to its rectangle in device pixels, cleared and drawn from its corner. The target is made
  the first frame the panel is shown, made again when its rectangle's size changes (canvas resize, pixel ratio,
  `layout()`), freed by `removePanel()` and made again after a lost and restored WebGL context. A hidden panel has
  its target kept but costs nothing per frame. The target is then composited onto the canvas at the rectangle:
  a plain copy, or the panel's effect.
- **Isolated.** The panel has its own light manager (`panel.lights`) and its own directional shadow map
  (`enableShadows()`); the main view's lights, shadows and culling don't touch it, and it doesn't touch theirs.
  The panel's shadows are never cached and don't count as a directional pass, so showing a panel doesn't switch the
  main view's `shadowCaching()` off. Point light shadows aren't supported in a panel.
- **No post-processing.** The panel is composited onto the canvas after the main view's post-processing has been
  composited, so bloom, tone mapping, depth of field, outlines and the UI layer stay exactly as they are with or
  without a panel. A panel has no outlines, UI layer or debug lines of its own. Settings that are the renderer's
  (`pbr()`, the clear colour, back face culling, LOD bias) apply to the panel as they do to the main view. Fog is the panel's own (below).
- **Fixed camera.** Nothing moves it and it can't be picked: it isn't a child of the engine, so input and pointer
  events never see it. A cut just swaps which camera it draws from, so it's free.
- **Costs only while shown.** A hidden panel's scene isn't updated, collected or drawn. A shown one is collected
  and drawn like one more small view of its scene (its entities are updated once per rendered frame).
- **Render on demand.** Showing, hiding, cutting and moving a panel ask for a frame. Changes inside its scene do
  too, as they do anywhere.

## Fog

`panel.fog({ mode: "linear", color: { r, g, b }, near, far })` takes the same settings as the renderer's `fog()`
(`"linear"`, `"exp2"` with `density`, `"none"`), merged over the defaults. It's swapped in for the panel's pass the
way its lights are and the renderer's fog is put back after. A panel with no fog of its own draws with none (the
main view's fog doesn't reach it). `panel.fog()` reads it (null when unset); `panel.fog(null)` clears it.

## Effect hook (a "recorder look")

The panel's pixels are in its target, so an effect can read them: blur, colour shifts, warps, grain, scanlines.
Set `panel.effect = { depth?, apply(device, frame, source) }`. Each frame the panel was drawn, after its pass and
before the overlays, the renderer calls `apply` with:

- the `IgeGpuDevice`;
- `frame`: the panel's rectangle on the canvas in device pixels, from the canvas's bottom-left;
- `source`: `{ color, depth, width, height }`, the panel's resolved colour texture (linear sampled, v = 0 at the
  bottom) and its size in device pixels. `depth` is the panel's depth (`depth24plus-stencil8`, nearest) only when
  the effect sets `depth: true` (it costs one resolve); null otherwise.

The effect **draws the composite itself**: begin a pass on `device.surface()`, set its viewport and scissor to
`frame`, and draw a full-screen triangle that samples `source.color` (`IGE_PANEL_FULLSCREEN_VERT` from
`src/engine/webgl/IgePanelTarget.ts` is a vertex shader for it: `v_uv` runs 0 to 1 over the panel). Write all of
the rectangle and nothing outside it; the canvas holds nothing of the panel until the effect draws it. The effect
makes its own pipelines (lazily, from the device it's given; they stay valid across a context loss).
With no effect set the renderer copies the panel as it is. (Effects written for the earlier hook, which drew over
a panel already on the canvas, must now draw the panel's pixels too.)

## No main viewport

Shown panels draw even when the engine has no viewport (a menu-only screen with a panel): the frame is cleared,
the panels drawn and composited, then the overlays. With no viewport and no shown panel the frame is just cleared,
as before.

## Example

`src/examples/webGlRenderer?panel=1`: a spinning cube with a shadow in a panel in the corner, cutting between two
cameras every three seconds, with a fog of its own; M shows and hides it, E switches a colour-shift and scanline
effect that reads the panel's pixels (`?panelEffect=1` starts with it on).
