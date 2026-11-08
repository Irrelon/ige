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
const model = await igeGltfLoader.load("../../assets/models/CesiumMan.glb", "character");

const zombie = new IgeEntity()
	.model(model, { animation: "Walk" })
	.translateTo(100, 0, 50)
	.scaleTo(100, 100, 100)
	.mount(scene);
```

`model()` sets up every mesh, material, texture, node transform, skeleton and animation clip in the file.
Models face +Z and stand upright as authored; don't add corrective rotations.

`material()` overrides the model's material values for that entity only, e.g. a tint or a hit flash, and
`material(null)` restores them:

```typescript
zombie.material({ color: { r: 0.4, g: 0.6, b: 0.35, a: 1 } });
zombie.material({ color: "#ffffff", emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 0.9 });
```

Material objects can be shared between entities. With render on demand, call `material()` again after changing a
shared object in place.

## Animation

```typescript
zombie.playAnimation("Attack", { loop: false, crossFadeDuration: 0.1 });
zombie.skeletalAnimation()?.on("complete", (clip) => { /* back to walking */ });
```

- Entities playing the same clip share cached poses sampled at `IgeSkeletalAnimationComponent.poseCacheRate`
  (30 per second). Give hero characters full-rate animation with `entity.skeletalAnimation().poseCache(false)`.
- Characters that aren't drawn in any view skip pose sampling. Turn this off with `cullOffscreen(false)` when game
  logic reads bone positions while the character is off screen.

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
