# Phase effect and lensing (`entity.phase()`, `renderer.lens()`)

Two effects for things that aren't quite in this world: a planet locked out of phase with reality that flickers solid
for a few seconds at a time, survivors who are see-through figures, and a collapsing star that bends the stars behind
it. Both are pure functions of a time value (so a paused or scrubbed recording shows the same picture), both cost
nothing while nothing uses them, and both can be animated by an `IgeTimeline`.

Code: `src/engine/webgl/IgePhase.ts` (settings, flicker, ripple), `src/engine/shaders/webgl/phase.frag.ts` (the shader),
`src/engine/webgl/IgeLens.ts` (settings, maths, the pass), `src/engine/webgl/IgeEffectTime.ts` (the shared clock).
Example: `src/examples/phaseEffects` (V changes view, K collapses the star, the slider scrubs time, `?split=1`).
Tests: `src/tests/IgePhaseEffects.test.ts`.

## Phase

```typescript
const planet = new IgeEntity().geometry(sphere).translateTo(0, 0, -9000).mount(scene);
planet.phase({ amount: 0.9, flicker: 0.5, edgeColor: { r: 0.4, g: 0.85, b: 1 } });   // out of phase, flickering solid
planet.phase({ amount: 0 });                                                            // solid again (still costs a transparent draw)
planet.phase(null);                                                                     // cleared: a normal item again
const fx = planet.phase();                                                              // the effect (or null): fx.set({ amount: 0.3 })
```

The effect is on the entity and everything mounted under it (the nearest entity that has one wins). What it looks like:

- The body is see-through and glassy: the scene behind shows through, tinted (`tint`) and darkened. `opacity` is how
  opaque the body is at `amount` 1 (default 0.16).
- The edge is a fresnel rim, `edgeColor` bright, with the red, green and blue fringes pulled apart (`split`) and rippling
  along the body at their own speeds (`shimmer`). Under HDR bloom the rim glows (`edgeStrength` above 1).
- Now and then it flickers fully solid: `flicker` 0 never to 1 (a third of the 0.2 s cells, each solid for about half
  its length, with a soft edge and a stutter). `flickerSpeed` scales the cell length, `seed` is another take.
- `amount` 0 is normal and solid; 1 is a faint ghost that is mostly its edge. The flicker takes `amount` toward 0:
  the amount drawn is `amount * (1 - solid(time))`.

### Settings (all numbers, so a timeline can animate any of them)

| setting | meaning | default |
|---|---|---|
| `amount` | 0 solid, 1 fully out of phase | 0 |
| `flicker`, `flickerSpeed`, `seed` | how often it flickers solid (0 to 1), how fast (1 normal), which pattern | 0, 1, 0 |
| `edgeR`, `edgeG`, `edgeB` (`edgeColor`) | rim colour (over 1 for HDR glow) | 0.45, 0.85, 1 |
| `edgeStrength`, `edgePower` | rim brightness, and tightness (higher is a thinner rim) | 1.6, 3 |
| `split` | how far apart the red, green and blue fringes sit, 0 to 1 | 0.35 |
| `shimmer`, `rippleScale` | ripple speed (1 normal, 0 still); world units per ripple wave (0: sized to the entity) | 1, 0 |
| `tintR`, `tintG`, `tintB` (`tint`), `opacity` | body tint and body opacity at amount 1 | 0.55, 0.75, 1, 0.16 |

`entity.phase({ ... })` also takes `time` (seconds, or null to follow the clock).

### Time and scrubbing

Nothing reads the wall clock. The flicker is worked out on the CPU from the time, the ripple in the shader from the
same time (`igePhaseSolid()` and `igePhaseRipple()` are the pure functions; same input, same output). The time an
effect uses is, in order: its own (`entity.phase({ time })` or `fx.time(t)`), else the clock set with
`igeEffectTime(t)`, else engine time in seconds. A recording or scrubber calls `igeEffectTime(t)` once a frame;
`igeEffectTime(null)` goes back to engine time. Lenses read the same clock.

### Timeline

Bind the effect itself, then animate `effect.<setting>` tracks. The timeline also hands the effect its time, so a
paused or scrubbed timeline repeats the flicker:

```typescript
const playback = new IgeTimeline(timeline({ duration: 30 })
	.track("planet", (t) => t.at(0, { effect: { amount: 0 } }).at(8, { effect: { amount: 0 } }).at(9, { effect: { amount: 0.9 } }, "smooth"))
	.build()).bind({ planet: planet.phase()! });
```

### What it works on, and what it costs

- A phased item is drawn as a transparent item, back to front with the other transparent items, depth first (so only
  its near surface shows, as a glass thing does) with the lit shader's phase variant (`lit_phase`, `skinned_phase`;
  the lit shader's own `main` is renamed and wrapped, so nothing in lit.frag.ts changes). Nothing phased: no
  extra work (a counter gates the per-item lookup).
- Big static meshes: yes (the example's planet is a 3000 unit sphere seen from 9000). Skinned characters: yes, glTF
  and procedural-skeleton (`skin()` and `setBonePose()`; the example's figure). Level-of-detail meshes: yes.
- Instancing: a phased item is never part of an instanced batch (each has its own flicker and amount), so many phased
  copies of one mesh cost a draw call each. Unphased copies of the same mesh still instance.
- Shadows: an item casts no shadow while its amount drawn is 0.5 or more (`IGE_PHASE_SHADOW_CUTOFF`); more solid
  than that it casts as normal. The flicker therefore flips a ghost's shadow on and off with it.
- Normal, metallic-roughness and occlusion maps are not read by the phase variant of the shader (it adds the look to
  lit's colour; the lighting itself includes whatever lit does). `occludedColor()` and `outline()` still work.
- Render on demand: a phased entity changes with time; call `manualRender()` or keep the engine rendering.

## Lensing

```typescript
renderer.lens("star", { x: 7500, y: 2200, z: -17000, radius: 3000, strength: 0.8, ring: 1.1 });   // makes it (or changes it)
renderer.lens("star")!.set({ strength: 1.2, core: 0.1 });                                          // the lens object
renderer.lens("star", null);                                                                       // removes it
```

A lens bends the picture of a view round a point in the world: a pixel at distance d from its centre shows what is at
`d - strength * e^2 / d` (e = 0.45 of `radius`, the Einstein radius), eased out to nothing at `radius`. A strength
of 1 pulls the picture at e right in to the centre, and a bright thin ring sits there (the Einstein ring, at
`0.45 * radius * sqrt(strength)`); more folds the middle over. A core (`core`, a fraction of `radius`) is a dark
mouth, for the rift at the end.

| setting | meaning | default |
|---|---|---|
| `x`, `y`, `z`, `radius` | where, and how far the pull reaches (world units) | 0, 0, 0, 100 |
| `strength` | 0 none; 1 pulls the picture at the Einstein radius to the centre | 0 |
| `ring`, `ringWidth` | ring brightness (0 none; over 1 blooms under HDR) and width as a fraction of `radius` | 0, 0.025 |
| `ringR`, `ringG`, `ringB` (`ringColor`) | ring colour | 1, 0.86, 0.62 |
| `core` | dark core as a fraction of `radius` | 0 |
| `ripple`, `rippleSpeed` | ring ripple (0 steady to 1) and speed | 0, 1 |

Also `viewports: ["id", ...]` (only those viewports; default all, panels included) and `time`.

- Up to 8 lenses a view (`IGE_LENS_MAX`), applied in the order made. Each view places each lens with its own camera,
  so split-screen halves and panel viewports each show it at the right place and size (`igeLensScreen()` is the maths:
  centre and radius in pixels, null when behind the camera or off the view).
- It runs over a finished view (the view is resolved into a texture of the target's own format, then redrawn through
  the lens) before post-processing, so with `postProcess({ enabled: true, hdr: true, bloom })` the ring is HDR and
  blooms. With post-processing off it works on the canvas as it is (8 bit): the same effect, the ring clips at white.
  Dynamic resolution: it runs at the scene's render scale with the scene.
- Limits: the lens has no depth, so it bends everything in its view, including anything nearer than the lens (a ship
  in front of the star gets bent too); keep lensed things well behind what the player flies. It costs a copy of
  the view and a full-view quad per view with lenses (measured below).
- Timeline: bind the lens (`bind({ rift: renderer.lens("rift")! })`) and animate `effect.strength`, `effect.radius`,
  `effect.ring`, `effect.core`; it takes the timeline's time for its ripple.

## Cost

Measured in the example at 1280 x 720 on an Apple GPU (`renderer.stats().gpuMs`, median of 150 frames; the machine
was busy, so read the differences as about 0.3 ms):

| | post-processing on (HDR, bloom) | off |
|---|---|---|
| neither effect | 1.18 ms | 0.42 ms |
| phase (planet and a skinned figure) | 1.14 ms | 0.30 ms |
| lens (one, with ring and core) | 1.68 ms | 1.37 ms |
| both | 1.63 ms | 2.25 ms |

The phase effect is lost in the noise: its extra is a transparent draw each and a few more shader instructions. A lens
adds about 0.5 to 1 ms at this size (one blit and one full-view pass), growing with the view's pixels, not with the number of
lenses.

## Recipes

- A landing window: set `amount` and `flicker` from the clock (the example's `planetPhase()`: solid for 8 s of every
  25, flicker rising as the window closes), or a timeline track.
- A survivor: `figure.phase({ amount: 0.7, flicker: 0.5, rippleScale: 40 })` on the root entity of the skinned figure
  (give a small figure its own `rippleScale`, since the default is 0.35 of the item's size).
- A collapsing star: shrink and brighten the star's entity, grow the lens's `radius` and `strength` and then its
  `ring`, flash at the end, then keep the lens with a `core` (see `collapseAt()` in the example).
