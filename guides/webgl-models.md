# 3D models and characters on the WebGL renderer

How to load, animate, equip and draw large numbers of 3D characters with `IgeWebGlRenderer`. The
`src/examples/zombie-game` example uses everything described here.

## Set up the renderer

```typescript
const renderer = new IgeWebGlRenderer();
renderer.maxPixelRatio(1.5);          // cap the resolution on high-DPI screens
renderer.backFaceCulling(true);       // closed, counter-clockwise meshes only (glTF is)
ige.engine.renderer(renderer);
await renderer.setup();
renderer.createFrontBuffer(true);
```

The renderer needs WebGL 2. It draws through the GPU device (`guides/gpu-device.md`), which is WebGL 2 only, so the
old WebGL 1 fallback is gone; `preferredWebGlVersion(1)` now only logs a warning.

## Load and place a model

```typescript
const { models } = await igeLoadAssets(
	{ models: { character: "../../assets/models/CesiumMan.glb" } },
	{ onProgress: (done, total) => showLoading(done / total) }
);
const model = models.character; // or: await igeGltfLoader.load(url, "character")

const zombie = new IgeEntity()
	.model(model, { animation: "Walk" })
	.translateTo(100, 0, 50)
	.scaleTo(100, 100, 100)
	.mount(scene);
```

`model()` sets up every mesh, material, texture, node transform, skeleton and animation clip in the file.
Models face +Z and stand upright as authored; don't add corrective rotations.

`igeLoadAssets({ textures, models, data })` loads a game's or level's images (`{ url, cells: [4, 4] }` for sprite
sheets), glTF models and animation files, and JSON in one call with one progress callback. It reuses anything already
loaded under the same id, and rejects listing every file that failed once all have settled.

`material()` overrides the model's material values for that entity only, e.g. a tint or a hit flash, and
`material(null)` restores them:

```typescript
zombie.material({ color: { r: 0.4, g: 0.6, b: 0.35, a: 1 } });
zombie.material({ color: "#ffffff", emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 0.9 });
```

Material objects can be shared between entities. With render on demand, call `material()` again after changing a
shared object in place.

Things that glow by themselves (lit windows, signs, lamp bulbs, screens) use an emissive map: a glTF material's
`emissiveTexture` is loaded with the model (with `emissiveFactor` and `KHR_materials_emissive_strength`; a map with no
factor glows as it is), or give any entity one with `material({ emissiveTexture })`. The map's colours are added after
lighting, so they show in the dark; `emissiveIntensity` on its own scales the glow, e.g. to put a town's windows out in
a power cut through one shared material object. Without a map, `emissiveColor` is tinted by the base colour texture.

```typescript
const night = new IgeTexture("night", "./assets/city_night.png"); // black, except the lit windows
const lit = { emissiveTexture: night, emissiveIntensity: 1 };
for (const building of buildings) building.material(lit);
lit.emissiveIntensity = 0; // the power's gone
```

## Animation

```typescript
zombie.playAnimation("Attack", { loop: false, crossFadeDuration: 0.1 });
zombie.skeletalAnimation()?.on("complete", (clip) => { /* back to walking */ });
```

- Entities playing the same clip share cached poses sampled at `IgeSkeletalAnimationComponent.poseCacheRate`
  (30 per second). Give hero characters full-rate animation with `entity.skeletalAnimation().poseCache(false)`.
- Characters that aren't drawn in any view skip pose sampling. Turn this off with `cullOffscreen(false)` when game
  logic reads bone positions while the character is off screen.
- A clip that isn't looping ends on its last frame, even when it finishes while the character is off screen (it's
  posed when next drawn): a death clip that ended in an unseen room still leaves the body on the floor.
- Root motion on a node above the skin's joints (3ds Max rigs keep it on "Bip001", over the skinned
  "Bip001 Pelvis") is played: such an animated node becomes a bone, after the skin's joints. Without it a fall never
  reaches the floor, a crouch floats and a character climbing out of the ground stays put.
- Walk and run cycles that travel forward (the hips move ahead and snap back when the clip loops) play on the spot
  with `model(model, { inPlace: ["walk", "run"] })` (or `true` for every clip): the root bone keeps its bob and sway
  and loses its drift, for games that move characters themselves. `clipInPlace(clip, skeleton)` does it by hand.

### Upper body and lower body

Twin-stick characters aim one way and walk another. Two tools do it:

```typescript
const anim = player.skeletalAnimation();
// Layers: clips that move only part of the skeleton, over the base animation
anim.layer("upper", { root: "Bip001 Spine" });                 // the spine and everything above it
anim.play("walk");                                             // the base: the whole body
anim.play("shoot", { layer: "upper", loop: false, crossFadeDuration: 0.08, blendOut: 0.15 });

// Bone rotations on top of the pose: the hips toward the movement, the spine back toward the aim
const twist = moveAngle - aimAngle;
anim.rotateBone("Bip001 Pelvis", { x: 0, y: Math.sin(twist / 2), z: 0, w: Math.cos(twist / 2) });
anim.rotateBone("Bip001 Spine", { x: 0, y: Math.sin(-twist / 2), z: 0, w: Math.cos(-twist / 2) });
```

- A layer's clips cross-fade with each other, not with the base, and blend over it by their weight (and the layer's
  `weight`). Later layers go on top. `stopLayer(name, fade)` fades a layer out; `layerPlaying(name)` says whether
  it's busy.
- `blendOut` fades a clip that isn't looping to nothing over its last moments, so the base takes over smoothly
  instead of snapping back when it ends (useful for the base too).
- A character with a layer playing, or bone rotations, is posed on its own rather than from the shared pose cache.

### Animations in separate files

Many generators and animation libraries ship each animation in its own file, or one file of animations without a
mesh. Add them with the `animations` option:

```typescript
const walk = await igeGltfLoader.load("zombie_walk.glb", "zombieWalk");
const attack = await igeGltfLoader.load("zombie_attack.glb", "zombieAttack");

zombie.model(zombieModel, {
	animation: "Walk",
	animations: { Walk: walk, Attack: attack }     // first clip of each file, named by the key
});
// or: animations: [library]                     // every clip in the file, under its own name
```

Bones are matched by name, ignoring case and prefixes such as `mixamorig:`. For other naming schemes pass
`retarget: { boneMap: { "Bip01 Pelvis": "Hips" } }`. Rigs with different bone orientations, up axes or units are
converted automatically, as long as both rest in the same posture (e.g. both T-pose). Root motion is scaled to the
character's hip height; `retarget: { translation: "none" }` keeps a clip in place. `retargetClips()` does the same
for code that defines clips itself.

## Crowds: instancing and level of detail

Entities sharing a model are drawn with GPU instancing automatically, including skinned ones.

Dense models (generated assets often are) can switch to lighter meshes when small on screen:

```typescript
zombie.model(zombieModel, {
	animation: "Walk",
	lod: [
		{ screenSize: 220, ratio: 0.5 },   // below 220 device pixels: half the triangles
		{ screenSize: 120, ratio: 0.25 }
	]
});
```

- `screenSize` is the model's on-screen size (its bounding sphere's diameter, about a standing character's height) in
  device pixels. Each view and each shadow map picks its own level.
- Levels are generated once per model by `IgeMeshSimplifier` (UVs, normals and skin weights are kept) and shared by
  every entity. `{ screenSize, model: lowModel }` uses an authored model instead (same parts and skeleton).
- Entities drawn from `_geometryData` (no model) can use `entity.lod([...])` with `ratio` or `geometry` levels.
- `renderer.lodBias()` scales every threshold, e.g. as a quality setting.
- `renderer.debugDraw({ bounds: true })` colours each mesh's bounding sphere by the level chosen in that view;
  `renderer.stats()` reports `triangles` and `lodItems`.

## Items in hand

```typescript
const sword = new IgeEntity()
	.model(swordModel)
	.mount(hero)                    // mount to the character first
	.attachToBone("RightHand")      // then follow one of its bones
	.translateTo(0, 0, -0.06);      // offset in the character's model units

const hand = hero.bonePosition("RightHand"); // world position, e.g. to spawn an effect
```

An offset relative to the bone depends on the rig's bone axes. To place an item by where it should be in the
character's own model space instead (the fist, and the way the blade points), pass a model-space matrix to
`attachAt()`; the bone-relative translate, rotation and scale are worked out. `{ pose: "current" }` uses the pose
the character is animated to now (an idle, say) rather than its rest pose, which suits rigs that rest in a T- or
A-pose:

```typescript
sword.mount(hero).attachToBone(bones.right.hand).attachAt(gripMatrix, { pose: "current" });
```

## Customizable characters and worn gear

A customizable character file holds every head, outfit and accessory on one skeleton; each entity shows one
combination by node name, and changes it as gear changes:

```typescript
soldier.model(soldiers, { parts: ["TTS_Body_plain_A_04", "TTS_Head_basic_01"] });
soldier.modelParts(["TTS_Body_plain_A_04", "TTS_Head_plain_A_06", "TTS_Backpack_plain_A"]);
```

Gear the file doesn't have can be made from the character itself. `addShellPart()` copies the triangles weighted
(at least half) to some bones, pushes every face out a little and adds the result to the model as a new part,
skinned to the same bones, so it bends with every animation: gloves over the hands, boots over the feet and shins,
gauntlets to the elbow. Low-poly toon characters suit it best. Make shells once, after loading and before creating
entities with the model:

```typescript
addShellPart(soldiers, "TTS_Body_plain_A_04", {
	name: "Boots_black",
	bones: ["Bip001 L Foot", "Bip001 R Foot", "Bip001 L Toe0", "Bip001 R Toe0", "Bip001 L Calf", "Bip001 R Calf"],
	inflate: 0.01, // model units
	material: { color: { r: 0.1, g: 0.09, b: 0.08, a: 1 }, roughness: 0.85 }
});
player.modelParts([...outfit, "Boots_black"]);
```

`keep: (x, y, z) => y < 0.1` limits a shell to the triangles whose corners pass the test (rest pose, model space).
Any other part made in code (a resized copy of a backpack, say) joins a model with `addModelPart(model, part)`.

## Characters made of boxes (procedural skeletons)

A character built from rigid parts (a box for the head, one for each limb segment) doesn't need an entity per part.
Build one mesh with every vertex weighted 1.0 to its part's bone, give it a skeleton made in code, and write the
bone matrices yourself each frame:

```typescript
const skeleton = igeProceduralSkeleton("person", [
	{ name: "body" },
	{ name: "armL", rest: translation(-9, 35, 0) },   // where the bone sits with the figure at rest
	{ name: "armR", rest: translation(9, 35, 0) }
]);
// mesh: vertices at rest, boneIndices (4 a vertex) and boneWeights (1, 0, 0, 0), vertex colours for the look
const person = new IgeEntity().skin(mesh, skeleton).mount(scene);

// every frame: each bone's model-space matrix, 16 floats a bone, column-major
person.setBonePose(matrices);
```

The skin matrices are worked out when the frame is collected, so setting the pose costs a copy and nothing is posed
that isn't drawn. Characters sharing a mesh instance together (the palette holds a row for each character), and
shadows, outlines, `occludedColor()`, `attachToBone("armR")` and `bonePosition()` work as on a glTF model. Bone
names come from the skeleton. A mesh needs one material, so a look with parts of different roughness or a glow
makes one mesh for each and the entities share the skeleton: `skin(secondMesh, firstEntity._skeleton!)` shares its
pose and its palette row. The character is culled by its mesh's bounds, not its joints, so keep poses within about
half again the mesh's size. At most 64 bones.

## Generated and auto-rigged characters

Text- or image-to-3D generators (AssetFurnace, Meshy, Tripo) give each character its own rig, often with numbered
bones (`bone_0`, `bone_1`, ...) and a varying bone count. The engine works with them by shape rather than by name:

- `humanoidBones(skeleton)` finds the hips, spine, chest, neck, head, shoulders, upper and lower arms, hands, thighs,
  shins and feet from the rest pose (the head is the highest end bone, the feet the two lowest, the arms the chains
  that reach furthest from the spine), with left and right as the character's own and its facing from its toes.
  Use it for `attachToBone()`, `bonePosition()` and ragdolls (see the physics guide).
- `modelBounds(model)` gives the model-space bounds of a model's rest pose, to scale it to a height and stand it
  on the ground (generated models are often centred on their middle):

```typescript
const { min, max } = modelBounds(model);
const scale = 180 / (max.y - min.y);
const body = new IgeEntity().model(model, { inPlace: ["walk", "run"] })
	.scaleTo(scale, scale, scale)
	.translateTo(0, -min.y * scale, 0) // feet on the floor
	.mount(character);                 // the game moves, turns and collides the parent
const bones = humanoidBones(model.skins![0].skeleton)!;
```

- Textures stored as WebP (`EXT_texture_webp`, as Blender's exporter writes them) load like any other image.
- Merge per-move files into one model before shipping it, so the mesh and textures aren't downloaded once per
  move; the zombie demo's `tools/import_model.py` does this for AssetFurnace output (and shrinks the textures, and
  measures the walk and run speeds from their root motion).

## Effects

- `IgeParticleSystem3d`: sparks, blood, smoke and magic, one instanced draw per system. Call `burst()` for one-off
  effects.
- `IgeDecalSystem3d`: marks on surfaces (blood, scorch marks, footprints). By default they darken what they lie on,
  so they pick up its lighting.
  - `decals.add(x, z, { y, size, color, opacity })` lays one flat on a floor: the cheapest kind, thousands per system.
  - `decals.project(position, normal, targets, { size, depth, maxAngle })` wraps one over the surfaces of `targets`
    and their children (walls, pillars, steps, uneven terrain), e.g. blood behind a hit:
    `blood.project(wallPoint, wallNormal, levelRoot, { size: 70 })`. `normal` points out of the surface; `maxAngle`
    (default 75 degrees) keeps a floor splat off the sides of steps, or wraps corners at about 100. Animated
    characters don't receive projected decals. Mount level geometry under one root entity to target it all at once.
- Add decals and particles whenever suits the game, before or after the systems update in a frame (after the physics
  step, say): what's added is packed for drawing when the frame is drawn.

## HUD, picking and split screen

- `IgeViewportOverlay` keeps DOM elements (name tags, health bars, damage numbers) over entities or world positions
  in every viewport, clipped to each view:
  `overlay.add({ entity, offset: { x: 0, y: 150, z: 0 }, create: () => element })`.
- `renderer.worldToScreen(viewport, x, y, z)` projects a point; `screenToGround()`, `screenToHeightfield()` and
  `screenToWorldRay()` turn a screen point into the world (flat ground, uneven terrain, or a ray);
  `viewportAt(x, y)` finds the view under a point.
- `renderer.raycast(viewport, x, y)` returns the nearest mesh hit under a screen point (entity, point, normal,
  distance), tested against triangles, with skinned characters in their current pose: click to attack, click to move
  on terrain. `raycastEntities(ray, targets)` does the same for any world ray (line of sight, projectiles), about
  0.2 ms against the whole zombie demo scene.
- Entity pointer events (`pointerOver`, `pointerDown`, `pointerUp`...) work in every view: meshes are hit by their
  bounding box, skinned characters by a box around their animated joints, or by their triangles with
  `renderer.pointerPicking("triangles")`. `renderer.pointerHitTest(entity, x, y)` is the same test for your own code.
- `entity.outline({ r, g, b, a }, widthPx)` draws a crisp line round the entity's silhouette (its children's
  included, as one shape), `widthPx` CSS pixels wide at any zoom; `outline(null)` clears it. Use it for what the
  player is about to act on: `door.outline({ r: 0.37, g: 0.89, b: 1 }, 3)`. It goes round the whole silhouette,
  through anything in front (no z-fighting), works for instanced, skinned and level-of-detail meshes, is drawn over
  the post-processed frame (exact colours) and costs nothing while nothing is outlined. Several outlined things with
  the same outline share one pass. Model meshes only (not 2D sprites).

## Dynamic resolution

`renderer.dynamicResolution({ enabled: true, minScale: 0.67, maxScale: 1 })` draws the 3D scene (and its
post-processing) offscreen at a fraction of the canvas's size and upscales it, linear, to the canvas. The UI layer,
panels, outlines and overlays are still drawn at the canvas's own resolution, so text and HUD stay sharp. Scales are
fractions of the canvas, which `maxPixelRatio()` already caps: with the cap at 1.5, 0.67 is a pixel ratio of 1.
`renderer.renderScale()` reads the scale in use; `renderer.renderScale(0.7)` sets a fixed one while dynamic
resolution is off. Below 1 the scene goes offscreen even with `postProcess` off (a plain target and one blit).

With it on, the renderer steps the scale down about 10% when frames miss the budget and back up when there is room.
The budget is the display's refresh interval (the median of `requestAnimationFrame` intervals), or the interval of
`ige.engine.maxRenderRate()` when that is capped and longer. A frame misses when it comes more than 1.5 budgets after
the last, or when the GPU's time for it (`EXT_disjoint_timer_query_webgl2`, where the browser has it) is over 95% of the
budget. Three misses in half a second step down (at most every 0.5 s); two seconds with no misses step up (at most
every 2 s, and only when the GPU time says the next step would fit in 80% of the budget). A step up that misses is
refused for that level for 30 s, then 60 s and so on, so a steady scene settles instead of hunting. The offscreen
targets are made again only when the scale changes. See `IgeDynamicResolution`.

## Shadows fitted to the view

The sun's shadow map is fitted to each view (on by default). The old map, a square `shadowManager.frustumSize()`
each way round the camera's target whatever the camera sees, lost a top-down view's corners (the square lands on the
ground turned and stretched by the sun's angle) and ended well before a street-level view did.
`renderer.shadowFit({ enabled: false })` brings it back.

```typescript
// 100 units a metre: shadows to 180 m from the camera, over a town whose tallest roof is 25 m
renderer.shadowFit({ distance: 18000, minY: 0, maxY: 2500 });
```

- The map covers what the camera can see that can take a shadow: its frustum out to `distance` (along the view),
  cut to the heights `minY` to `maxY` (the ground to the tallest roof). A top-down view gets every corner; a street
  view gets shadows out to `distance`. Something just out of view still casts into it (its shadow falls along the
  light, where the map is).
- Left at their defaults (`"auto"`), `distance` is as far as the square reached (the depth of the camera's target
  plus `frustumSize()`; twice `frustumSize()` for a camera with no target), and `minY` / `maxY` are the lowest and
  highest points of the scene's opaque meshes' bounds that frame. A game that knows its world does better to set
  them: the tighter the band and the distance, the finer the shadows. `Infinity` / `-Infinity` mean no limit (the
  camera's far plane, no height band).
- Shadows fade out over the last tenth of `distance`, so they don't stop in a line.
- Each view (split screen, panels) has its own fit. Views close enough to share a map (`shadowSharing()`) share a fit
  round all of them.
- The map's size steps about 9% at a time and its middle is snapped to its texels, so shadows don't shimmer as the
  camera moves.
- With `shadowCaching(true)` the map stays put while the view is inside it, with room round the view (`slack`, 0.15
  of its size by default) and pushed ahead the way the view is going. It moves only when the view would otherwise
  reach its edge, so shadows never blink in at the edges, and the static casters are redrawn only then.
- The map's depth along the light is at least `shadowPlanes()`'s far minus near, so the bias means what it did, with a
  quarter of that or more back towards the light for tall casters.
- Casters drawn each frame are left out when their shadow can't reach the view (`shadowCasterCulling()`, on by
  default): a caster's shadow is followed down the light to `minY`, so a caster behind the camera, or one far to the
  side, is skipped.

A single map covers a top-down view well (from 130 m up at 16:9 it's about 235 by 200 m, 5 to 6 cm a texel on a 4096
map; from 34 m up, under 2 cm). At street level it trades near detail for reach: 6 to 10 cm a texel out to 180 m, 4 to
5 cm out to 100 m. Cascades (below) give the near shadows more.

## Cascaded shadow maps

`renderer.shadowCascades({ count: 3 })` splits the view's depth, out to the fit's `distance`, into slices, each with
its own box fitted to it the same way, in its own tile of the map. Near the camera the slice is small, so its texels
are fine; the far slice reaches as far as one map did.

```typescript
renderer.enableShadows(sun, 4096);                                // four 2048 tiles
renderer.shadowFit({ distance: 18000, minY: 0, maxY: 2500 });    // 180 m, the ground to the roofs
renderer.shadowCascades({ count: 3 });                           // 0 to 13 m, 13 to 36 m, 36 to 180 m
```

- `count`: 1 (the default) is one map over the whole view; 2 to 4 split the map made by `enableShadows()` into a 2 x 2
  grid of half-size tiles. The memory is the same whatever the count (a 4096 map is four 2048 tiles, 64 MB with its
  depth at 32 bits); 3 leaves a tile unused and draws one shadow pass fewer than 4.
- `lambda` (0.8): where the slices end, between even steps from the camera's near plane to `distance` (0) and
  logarithmic ones (1, each slice a fixed multiple of the last: the most detail near the camera). With a 0.1 m near
  plane and 180 m: 13 m and 36 m for three slices, 10, 21 and 49 m for four.
- `blend` (0.1): the far part of each slice, a fraction of its depth, faded into the next, so the change in detail
  doesn't show as a line. The next slice's box reaches back to cover it.
- Each tile's middle is snapped to its own texels and its size steps on the same ladder, so shadows don't shimmer;
  with `shadowCaching()` each tile stays put while its slice is inside it, and only the tiles whose box or static
  casters changed are redrawn.
- A view looking down on its ground (a top-down camera) has slices as wide as the view: the split gains nothing, so
  it keeps the whole map as one (it splits while the nearest slice is under 0.4 of the whole view across the light,
  and goes back above 0.5). Slices with nothing in the height band (the air between a high camera and the roofs)
  are folded into the next. Split-screen views sharing a map use the whole map.
- Casters are culled per cascade: drawn only into the tiles whose box they're in, and (moving casters, or all of
  them without caching) whose slice their shadow can reach; at that tile's level of detail; and not into a tile
  where they'd be under a texel across. `stats().shadowCascades` counts the cascades drawn, `shadowCastersCulled` the
  casters left out of one.
- Everything that takes shadows takes them in cascades: static, instanced and skinned meshes, the PCF filter
  (kept inside each tile), decals (which take the lighting of what they're on), LOD levels.
- Cascades need the fit: with `shadowFit({ enabled: false })` the square is one map.
- `renderer.shadowDebugMode(5)` colours each surface by its cascade (red, green, blue, yellow; darker outside its
  box), and `debugDraw({ shadowFrustum: true })` draws each cascade's box in the same colours.

What it costs, measured in the GTA game's city spike (Old Town, its 41 s street-level flight at 30 m/s, a 4096 map,
shadows to 180 m, 2400 x 1350 with post-processing, no shadow caching, Apple silicon), the count switched between 1,
3 and 4 every 1.5 s in one run so each gets the same streets and the same load on the machine (two runs):

| Cascades | Texels (near, then each slice) | GPU a frame, mean / p95 | Shadow draws | Triangles, all passes |
|---|---|---|---|---|
| 1 | 6 to 10 cm everywhere | 4.5 to 4.7 / 5.7 to 6.2 ms | 48 | 0.76M |
| 3 | 1.1 cm to 13 m, 3 cm to 36 m, 15 cm beyond | 4.7 to 4.9 / 6.1 to 6.3 ms | 67 | 1.04M |
| 4 | 0.9 cm to 10 m, 2 cm to 21 m, 5 cm to 49 m, 17 cm beyond | 4.7 to 5.0 / 5.9 to 6.4 ms | 78 | 1.15M |

About 0.2 ms of GPU for 3 or 4 (the city's GPU time goes on pixels, not shadow triangles), 0.05 ms of main thread
(0.70 to 0.76 ms rendering), and the same memory. The near shadows are five to seven times finer; the far ones about
twice as coarse as one map's (the far slice is about as wide as the whole view, in a tile half the size).

## GPU time and memory

`renderer.stats()` has the GPU's time for a recent frame and the GPU memory the renderer holds:

```typescript
const { gpuMs, gpuMemory } = renderer.stats();
console.log(`${gpuMs?.toFixed(1)} ms on the GPU, ${(gpuMemory.total / 1048576).toFixed(0)} MB`);
```

- `gpuMs` comes from a timer query round all of a frame's drawing (`EXT_disjoint_timer_query_webgl2`). Results arrive
  a frame or two late. It's `null` where the browser has no timer query, before the first result, and with
  `renderer.gpuTiming(false)` (on by default).
- `gpuMemory` is in bytes, by kind: `geometry` (mesh vertices and indices), `textures` (images and canvases drawn
  with), `renderTargets` (post-processing, dynamic resolution, panels, outlines), `shadowMaps` (and their static
  caches), `buffers` (instances, bones, particles, decals), `canvas` (an estimate of the canvas's own buffers) and
  `total`. It's counted from what the renderer made (sizes and formats), so the driver's own overhead isn't in it.
  `renderer.gpuMemory()` gives the same on its own.

## Performance switches

| Setting | Use |
|---------|-----|
| `renderer.maxPixelRatio(1.5)` | Fewer pixels on high-DPI screens; usually the biggest GPU saving in split screen |
| `renderer.backFaceCulling(true)` | Skip triangles facing away (about a fifth less GPU time in the zombie demo) |
| `renderer.shadowCaching(true)` | Redraw static shadow casters only when they or the shadow frustum change; moving, skinned and `_shadowDynamic` casters are drawn each frame over a copy of the cached map (`stats().shadowCacheRebuilds`, `dynamicShadowDraws`, `shadowCacheCopies`) |
| `renderer.shadowFit({ enabled, distance, minY, maxY })` | The sun's shadow map fitted to each view (on by default, see above): no lost corners top-down, shadows to `distance` at street level |
| `renderer.shadowCascades({ count, lambda, blend })` | Split the fitted map into 2 to 4 cascades: fine shadows near the camera, the same reach, the same memory |
| `renderer.shadowSharing(threshold)` | Split-screen views close together share one shadow map |
| `ige.engine.renderOnDemand(true)` | Draw only when something visible changed (strategy games, menus); setters such as `material()`, `texture()` and `opacity()` count as changes, edits to objects in place need `ige.engine.manualRender()` |
| `renderer.debugDraw({ bounds, shadowFrustum })`, `debugLine()` | See culling, LOD levels and shadow coverage |
| `renderer.stats()` | Draw calls, instances, triangles, LOD use and shadow cache rebuilds per frame; GPU time and memory (see above); uploads and GPU bytes held by meshes (`geometryBytes`) |
| `renderer.uploadBudget({ bytes, ms })` | Spread mesh uploads across frames, so streaming in chunks doesn't stutter (see [`streaming-geometry.md`](streaming-geometry.md)) |
| `quantiseGeometry(mesh)` | Half the GPU memory for a mesh: 16-bit positions, 8-bit normals, 16-bit texture coordinates |

## Texture maps (normal, metallic-roughness, occlusion)

The loader reads a glTF material's `normalTexture` (with its `scale`), `pbrMetallicRoughness.metallicRoughnessTexture`
(green = roughness, blue = metallic, each multiplied by the factors) and `occlusionTexture` (red channel, with its
`strength`, often packed into the metallic-roughness image). Only `TEXCOORD_0` is read: a map on another set is
logged as a warning and ignored. See the `pbrMaps` example (Khronos SciFi Helmet; M turns maps on and off, P turns
PBR lighting on and off).

- **Normal maps** work under the default lighting and under PBR lighting. They need tangents: the file's `TANGENT`
  attribute when it has one, else tangents made at load from positions, normals and UVs (`igeComputeTangents()`,
  Lengyel's per-vertex method with handedness in w; glTF's +Y-up-the-image convention). Only meshes whose material has
  a normal map get them. Generated LOD levels and shells keep them.
- **Metallic-roughness and occlusion maps** act only with `renderer.pbr(true)`. With PBR off the default lighting looks
  as it always did (plus normal-map detail); those two maps aren't even loaded then.
- Everything lit takes them: static, instanced and skinned meshes (skinned instancing included), LOD levels, model parts
  and shells. `entity.material({ ... })` overrides take the same fields as the material data
  (`normalTexture`, `normalScale`, `metallicRoughnessTexture`, `aoTexture`, `aoStrength`: an `IgeTexture` each, or an
  `...TextureId` with `...TextureBlob` for a glTF image). A normal map on a mesh made in code needs `tangents` on its
  geometry data (`igeComputeTangents(geometry)` makes them). Shadow, outline, silhouette and decal passes ignore maps.
- **Mipmaps**: the three maps always get mipmaps and trilinear filtering; base colour and emissive textures get them as their glTF sampler says, or by `renderer.modelTextureMipmaps()` (on by default). Mipmaps cost a third more texture memory for each texture.
- **Cost**: a mesh with no maps pays nothing: no extra vertex data, texture binds or batch splits. A mesh with maps adds
  4 floats a vertex (tangent; 4 bytes in `IGE_QUANTISED_ENCODINGS`), up to three textures bound for its draw, and items with different maps don't share an
  instanced draw. Map textures go through the texture manager, so a lost WebGL context brings them back, and
  `renderer.releaseModel(model)` frees a model's meshes and every texture it made (base colour and emissive too).

## Physics

Characters, debris and ragdolls with Jolt physics: see [`physics-3d.md`](physics-3d.md).

## Big static worlds

Cities and terrain streamed in chunks: merge each chunk's pieces into one mesh per material in a worker
(`mergeGeometry()`), keep the vertices compact (16 bytes, not 32), hand the meshes to the main thread ready to upload,
and let the renderer upload them a few a frame (`renderer.uploadBudget()`). Quantised glTF files
(`KHR_mesh_quantization`, as `gltfpack` writes them) load and stay compact on the GPU. See
[`streaming-geometry.md`](streaming-geometry.md).

Far away and from high up, groups of chunks are drawn as low-detail proxies, one draw a group: `IgeHlod`, see
"Far away: HLOD" in the same guide.

Textures in glTF files get mipmaps (as their sampler asks; on when it doesn't say). A flat-colour atlas whose swatches
bleed together far away can turn them off with `renderer.modelTextureMipmaps(false)`.

## Freeing resources

Geometry and textures stay on the GPU until released. Content that is replaced at run time (rebuilt terrain chunks,
unloaded levels) should call `renderer.releaseGeometry(geometryData)` (also frees LOD meshes generated from it)
and `renderer.releaseTexture(texture)` or `texture.destroy()`.

- `entity.geometry(mesh)` swaps the mesh an entity draws and tells render on demand (assigning `_geometryData`
  doesn't). Give a rebuilt mesh a new `id`; the renderer uploads once per id.
- `renderer.discardGeometryArrays(mesh)` frees a mesh's CPU arrays once it is uploaded, so only the GPU copy remains:
  for big meshes the game never reads again. Its bounding box is kept for culling and pointer events; generate LODs
  first, and expect triangle picking, raycasts, decals and physics mesh shapes to skip it. With an upload budget, a
  mesh still waiting for its turn is freed once it's up.
- Raycasts and projected decals use a triangle BVH for meshes over 512 triangles, built on first use (about half a
  second for 320,000 triangles). `getTriangleBvh(mesh)` from `IgeTriangleBvh` builds it ahead, e.g. while loading.

## Losing the WebGL context

The browser can take the GPU away (several 3D tabs, a driver reset): the canvas stops drawing. The renderer handles it: on `webglcontextlost` it stops drawing and emits `"contextLost"`; on `webglcontextrestored` it makes every GPU resource again from what the CPU still holds (geometry from its arrays, textures from their images and canvases, UI-layer text labels, the built-in shaders, shadow maps at the sizes they had, instancing and bone buffers, post-process targets) and emits `"contextRestored"` before drawing again. The game carries on without a reload.

```typescript
renderer.on("contextLost", () => showNotice("Graphics paused: restoring…"));
renderer.on("contextRestored", ({ lost }) => {
	hideNotice();
	// Meshes kept only on the GPU (discardGeometryArrays) can't come back: rebuild these
	for (const id of lost) rebuildMesh(id);
});
renderer.contextLost(); // true while it's gone
```

Test it with the `WEBGL_lose_context` extension: `gl.getExtension("WEBGL_lose_context").loseContext()`, then `.restoreContext()`.
