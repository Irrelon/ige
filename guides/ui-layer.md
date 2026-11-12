# The UI layer (WebGL)

Before 3D, IGE games drew their UI on a layer above the scene (the 2D UI entities, `IgeUiEntity` and
`IgeUiManagerController`). In 3D a label, a name tag or a health bar is a quad in the world, and the depth test
lets anything in front of it (a wall, a light fitting, another ship) cover it. The UI layer is that old layer for
the WebGL renderer: entities marked as UI draw in a final pass of their own, after the scene, its transparent
things, the particles and the post-processing, with no depth test, so nothing in the scene can cover them.

- **Per viewport.** Each view draws its own UI, clipped to its area, so split screen works.
- **Unlit and shadowless.** UI elements don't cast or receive shadows and aren't lit: they look exactly like
  their texture (tinted by `material({ color })` if set).
- **Opacity** fades them (`entity.opacity()`); `hide()` hides them, children included.
- **Culled** when they're behind the camera or off the screen.
- **Cheap.** Every element of a view goes into one vertex buffer, and elements that share a texture next to each
  other in the drawing order are one draw call, so hundreds of labels cost a handful of draws (sharing text
  textures helps: see below).

Only textured entities (sprites, text labels, sheet cells, smart textures) draw in the UI layer; a model marked as
UI isn't drawn. UI elements aren't picked by raycasts or pointer events: for clickable HUD, use DOM
(`IgeViewportOverlay`, or the page) or your own hit testing.

## Marking an entity as UI

```typescript
entity.uiLayer(0);        // in the UI layer, layer 0 (higher layers draw over lower)
entity.uiLayer();         // its layer (undefined: not UI)
entity.uiLayer(false);    // back in the scene
```

Everything mounted under a UI entity is drawn in the UI layer too, with its settings, unless it has its own. An
`IgeUiLayer` is a container for that: an entity that's UI and draws nothing itself.

```typescript
const tags = new IgeUiLayer(1).uiScreenSize(20).mount(scene);   // everything under it: layer 1, 20 px tall
```

### Anchored in the world (the default)

An element follows its own world position, always faces the camera, and is centred on that point.

- By default it's its world size (`width()`, `height()`, times its world scale) as the camera sees it there:
  smaller further away.
- `uiScreenSize(px)` keeps it that many CSS pixels tall at any distance and zoom, with its width following its
  aspect. `uiScreenSize(undefined)` goes back to its world size.
- `uiOffset(x, y)` moves it on screen by CSS pixels (x right, y down), e.g. above a character's head.
- `uiMinScreenSize(px)` keeps one shown at its world size from shrinking below that many pixels (a far target's
  bracket).

```typescript
// A name tag over a character, the same size at any distance, a little above the point
new IgeUiTextLabel({ text: "Ann" })
	.uiScreenSize(22)
	.uiOffset(0, -8)
	.translateTo(0, 190, 0)
	.mount(character);
```

### Pinned to the screen

`uiScreen({ ... })` places an element in each viewport in CSS pixels, as the old 2D UI did: `left` / `right` /
`center` across and `top` / `bottom` / `middle` down, from those edges or from the middle (`+` is right / down).
An axis left unset is centred. Its size is its `width()` × `height()` in pixels, times its scale.
`uiScreen(false)` anchors it to the world again.

```typescript
panel.texture(panelTexture).width(240).height(80).uiScreen({ right: 16, top: 16 }).mount(scene);
```

### Drawing order

By layer, lowest first. Within a layer, the world-anchored elements far to near, then the screen elements in
scene graph order, so a panel sits over the labels in its own layer. Use a higher layer for anything that must sit
over everything else.

## Text labels

`igeTextTexture(text, style)` draws words into a texture: a font, letter spacing, colour, and optionally a plate
behind them with an edge and an accent bar down its left side, with padding and a nudge for the words. It's cached
by text and style, so every label showing the same words in the same style shares one texture (and draws in one
run); `releaseTextTexture(t)` lets go, and the last to let go destroys it (freeing the GPU copy). `aspect` sizes a
quad without stretching the words. `resolution: 2` draws it at twice the pixels for crisp words on high-density
screens.

`IgeUiTextLabel` does all that for you: an entity in the UI layer (layer 0, unless you pass `layer`) whose
texture is its words, sized to its `height` with the words' width, letting its texture go when its words change or
it's destroyed.

```typescript
const label = new IgeUiTextLabel({
	text: "MARKET",
	height: 10, // world units here (it's anchored in the world); pixels for one pinned to the screen
	style: {
		font: "400 28px 'Share Tech Mono', monospace",
		letterSpacing: "4px",
		color: "rgba(95, 227, 255, 0.92)",
		background: "rgba(4, 14, 24, 0.55)",
		borderColor: "rgba(95, 227, 255, 0.35)",
		borderWidth: 2,
		height: 44,
		padding: 16,
		bar: { color: "#ffb347", width: 6 }
	}
}).translateTo(x, 96, z).mount(scene);

label.text("MARKET · CLOSED");   // a new texture (shared if another label shows the same)
label.opacity(0.5);              // faded
label.destroy();                 // its texture let go
```

Pass `layer: false` to take the settings of an `IgeUiLayer` it's mounted under.

## Which UI to use

- **The UI layer** for things that belong to the scene's picture and must never be hidden: labels, name tags,
  markers, bars over units, a simple HUD panel. Drawn by the renderer after the post-processing, in every
  viewport.
- **`IgeViewportOverlay`** (DOM over each viewport) for HUD that needs CSS, text input, clicks or rich layout.
- **The Canvas 2D renderer's UI entities** (`IgeUiEntity` and friends) are for 2D games on the Canvas 2D renderer.

The example `src/examples/uiLayer` has labels over moving cubes that a wall sweeps in front of without hiding
them, one at its world size and the rest a fixed size on screen, and a panel pinned to the top left (press 1 to
fade the labels, 2 to put them back in the scene and see the wall cover them).
