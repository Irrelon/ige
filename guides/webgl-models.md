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

`renderer.preferredWebGlVersion(1)` (before `createFrontBuffer()`) runs the WebGL 1 fallback, for testing
it on a WebGL 2 machine. WebGL 1 has no instancing, so every mesh is a separate draw call.

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

## Performance switches

| Setting | Use |
|---------|-----|
| `renderer.maxPixelRatio(1.5)` | Fewer pixels on high-DPI screens; usually the biggest GPU saving in split screen |
| `renderer.backFaceCulling(true)` | Skip triangles facing away (about a fifth less GPU time in the zombie demo) |
| `renderer.shadowCaching(true)` | Redraw static shadow casters only when they or the shadow frustum change |
| `renderer.shadowSharing(threshold)` | Split-screen views close together share one shadow map |
| `ige.engine.renderOnDemand(true)` | Draw only when something visible changed (strategy games, menus); setters such as `material()`, `texture()` and `opacity()` count as changes, edits to objects in place need `ige.engine.manualRender()` |
| `renderer.debugDraw({ bounds, shadowFrustum })`, `debugLine()` | See culling, LOD levels and shadow coverage |
| `renderer.stats()` | Draw calls, instances, triangles, LOD use and shadow cache rebuilds per frame |

## Physics

Characters, debris and ragdolls with Jolt physics: see [`physics-3d.md`](physics-3d.md).

## Freeing resources

Geometry and textures stay on the GPU until released. Content that is replaced at run time (rebuilt terrain chunks,
unloaded levels) should call `renderer.releaseGeometry(geometryData)` (also frees LOD meshes generated from it)
and `renderer.releaseTexture(texture)` or `texture.destroy()`.

- `entity.geometry(mesh)` swaps the mesh an entity draws and tells render on demand (assigning `_geometryData`
  doesn't). Give a rebuilt mesh a new `id`; the renderer uploads once per id.
- `renderer.discardGeometryArrays(mesh)` frees a mesh's CPU arrays once it is uploaded, so only the GPU copy remains:
  for big meshes the game never reads again. Its bounding box is kept for culling and pointer events; generate LODs
  first, and expect triangle picking, raycasts, decals and physics mesh shapes to skip it.
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
