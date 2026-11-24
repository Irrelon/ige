# IGE (Isogenic Game Engine) - Project Agents Guide

## Project Overview

The Isogenic Game Engine (IGE) is a TypeScript game engine for 2D, isometric and 3D games on web technologies. It has two renderers in daily use: `IgeCanvas2dRenderer` (2D and isometric) and `IgeWebGlRenderer`, a custom WebGL 2 renderer that draws both 3D scenes and 2D sprites (as textured planes). The scene graph and entity API are shared, so the same `translateTo()` / `mount()` calls work for both.

## Where 3D lives (start here)

-   Renderer: `src/engine/core/IgeWebGlRenderer.ts` (large; the batching, shadow, post-process and UI passes are in it). `igeCreateRenderer()` (`src/engine/core/igeCreateRenderer.ts`) picks it.
-   Support code: `src/engine/webgl/` (managers, glTF loader, model parts, instancing, particles, decals, raycasting), `src/engine/gpu/` (`IgeGpuDevice`), `src/engine/shaders/webgl/` (GLSL), `src/engine/physics/` (Jolt 3D physics), `src/engine/timeline/`.
-   Entity API for 3D: `IgeEntity.model()`, `.geometry()`, `.material()`, `.texture()`, `.billboard()`, `.outline()`, `.uiLayer()`; cameras via `IgeCamera.preset()`.
-   Guides: `guides/` (list under Guides below). Status and next steps: `development-plan.md`.
-   Examples: `src/examples/webGlRenderer`, `coordTest3d`, `lightingShadows`, `skeletalAnimation`, `webGl2d` (2D on WebGL), `zombie-game` (the main test bed).

## Current State

### Core Engine Architecture

The engine is built around several key classes that form the foundation of the rendering and scene management system:

#### **IgeEntity** (`src/engine/core/IgeEntity.ts`)

-   The fundamental building block of all game objects (extends `IgeObject`)
-   Supports 3D positioning (x, y, z) and 3D sizing via `_bounds3d`
-   Has transformation matrices and world position calculations
-   Supports both flat 2D (`IgeEntityRenderMode.flat`) and isometric (`IgeEntityRenderMode.iso`) modes for Canvas 2D; the WebGL renderer treats every entity as 3D and ignores the iso mode
-   Has built-in support for textures via `IgeTexture` (`texture()`), and for 3D content via `model()`, `geometry()` and `material()`; `billboard()` sets how a textured sprite faces the camera under WebGL

#### **IgeObject** (`src/engine/core/IgeObject.ts`)

-   Base class for all engine objects including entities
-   Provides fundamental transformation support (`translateTo`, `rotateTo`, `scaleTo`)
-   Has 3D bounds (`_bounds3d: IgePoint3d`) and positioning (`_translate: IgePoint3d`)
-   Includes scene graph management (`mount()`, parent/child relationships)
-   Contains geometry and material data properties for 3D rendering
-   Contains depth sorting for isometric rendering (`depthSortChildren()`)

#### **IgeViewport** (`src/engine/core/IgeViewport.ts`)

-   Manages what portion of the scene is visible to the user (extends `IgeUiEntity`)
-   Contains an `IgeCamera` for controlling viewpoint
-   Handles clipping and viewport transformations
-   Used by both renderers; under WebGL each viewport is culled, shadowed and drawn on its own (split-screen)

#### **IgeCamera** (`src/engine/core/IgeCamera.ts`)

-   Controls the viewpoint within a viewport (extends `IgeEntity`)
-   Supports tracking entities for smooth camera movement (`trackTranslate()`, `lookAt()`)
-   Has 3D transformation support (translate, rotate, scale), perspective and orthographic projection (`projectionType()`), and presets (`preset("isometric" | "isometric45" | "topDown" | "sideScroller" | "screen2d")`)

#### **IgeTexture** (`src/engine/core/IgeTexture.ts`)

-   Handles loading and rendering of 2D images/textures
-   Supports cell-based sprite sheets and smart (script-drawn) textures
-   Used in both Canvas 2D and WebGL rendering pipelines

### 3D Support Infrastructure

What exists in the code today:

1. **3D Positioning**: All entities support 3D coordinates via `IgePoint3d`
2. **3D Bounds**: Entities have `_bounds3d` for 3D sizing, depth sorting (Canvas 2D iso) and culling
3. **Isometric Rendering**: Pseudo-3D iso projection in Canvas 2D; on WebGL, the `isometric` / `isometric45` camera presets give an orthographic iso view of a real 3D scene
4. **Depth Sorting**: `depthSortChildren()` for Canvas 2D iso; WebGL uses a depth buffer
5. **Geometry Data**: `_geometryData` (default: a quad) for 3D mesh information
6. **Material Data**: `_materialData` (`IgeMaterialData`) for 3D material properties
7. **Mesh Data**: `_meshData` property for renderer-specific 3D objects

### Rendering System

#### **IgeCanvas2dRenderer** (`src/engine/core/IgeCanvas2dRenderer.ts`)

-   Extends `IgeBaseRenderer` for Canvas 2D rendering
-   Handles viewport management and scene graph traversal
-   Renders entities using their textures and transformation matrices
-   The only renderer for isometric (`IgeEntityRenderMode.iso`) scenes: it does the iso projection and depth sorting itself, and `igeCreateRenderer({ mode: "iso" })` always returns it. Also the fallback when WebGL isn't available.

#### **IgeWebGlRenderer** (`src/engine/core/IgeWebGlRenderer.ts`) - PRIMARY 3D RENDERER

-   Custom-built WebGL renderer replacing the earlier experimental Three.js integration
-   WebGL 2 only (WebGL 1 was dropped 2026-11-13). The renderer is moving onto `IgeGpuDevice` (`src/engine/gpu/`, shaped like WebGPU and SDL3's GPU API, `webGl2GpuDevice(gl)` on the web; see `guides/gpu-device.md`) a pass at a time: the shadow passes draw through it, the rest with GL of its own until they move (ui2 draws through it too)
-   Full 3D rendering pipeline with a modular manager architecture:
    -   **Resource Management** (`IgeWebGlResourceManager`) - buffer, texture, and shader allocation
    -   **Shader Management** (`IgeWebGlShaderManager`) - shader compilation and caching with a shader library
    -   **Texture Management** (`IgeWebGlTextureManager`) - texture creation and management
    -   **Geometry Management** (`IgeWebGlGeometryManager`) - geometry creation and caching
    -   **Batching & GPU Instancing** (`IgeWebGlInstancing`) - per-frame render items, batching by geometry/texture, instanced draws (WebGL 2) including skinned meshes via a bone palette texture
    -   **Camera Controller** (`IgeWebGlCameraController`) - camera controls with preset support
    -   **Lighting** (`IgeWebGlLightManager`, `IgeWebGlLight`) - directional and point lights
    -   **Shadow Mapping** (`IgeWebGlShadowManager`) - shadow support
    -   **Skeletal Animation** (`IgeWebGlSkeletonManager`) - bone-based animations
    -   **GLTF/GLB Loading** (`IgeGltfLoader`) - 3D model loading
    -   **Material System** (`IgeWebGlMaterial`) - advanced materials
    -   **Frustum Culling** (`IgeFrustum`) - performance optimization
    -   **Primitive Geometry** (`IgePrimitiveGeometry`) - built-in shapes
    -   **State Management** (`IgeWebGlStateManager`) - WebGL state tracking
    -   **Model Parts** (`IgeModelParts`) - turns a loaded GLTF model into render parts (all primitives, node transforms, materials, textures) for `IgeEntity.model()`
    -   **3D Particles** (`IgeParticleSystem3d`) - typed-array particle effects drawn as one instanced billboard batch
    -   **Decals** (`IgeDecalSystem3d`, `IgeDecalProjector`) - blood/scorch marks: instanced flat quads on floors (`add()`), or projected onto walls, steps and uneven terrain by clipping the target meshes' triangles (`project()`); multiply-blended so they take the surface's lighting
    -   **3D Physics** (`src/engine/physics/IgePhysics3d`, `IgeRagdoll3d`, `IgePhysicsCharacter3d`) - Jolt Physics (WASM, optional peer dependency `jolt-physics`, loaded on demand, threaded when cross-origin isolated): rigid bodies on entities in IGE units (simulated in metres) with box, sphere, capsule, mesh, heightfield, convex and compound shapes, named collision layers, impact events, player characters (CharacterVirtual, optionally unpushable), trigger sensors, raycasts, ragdolls driving a skeleton, interpolation between fixed steps. See `guides/physics-3d.md`
    -   **Raycasting** (`IgeRaycast`) - exact ray/triangle tests against entities' meshes, skinned characters in their current pose (`renderer.raycast()`, `raycastEntities()`, `pointerPicking("triangles")`)
    -   **Animation Retargeting** (`IgeAnimationRetarget`) - plays clips from separate animation files on a model's skeleton, matched by bone name
    -   **In-place clips** (`IgeAnimationInPlace`) - `model(m, { inPlace: ["walk", "run"] })` takes the forward drift out of travelling cycles
    -   **Procedural skeletons** (`IgeProceduralSkeleton`) - characters built from rigid parts (boxes for head and limbs) as one mesh: `igeProceduralSkeleton(name, bones)` makes a skeleton in code, `entity.skin(mesh, skeleton)` draws a mesh whose vertices are weighted 1.0 to their part's bone, `entity.setBonePose(matrices)` writes each bone's model-space matrix (16 floats a bone) each frame; skin matrices are worked out at collect time (nothing posed that isn't drawn), characters sharing a mesh instance together, shadows, outlines, `occludedColor()`, `attachToBone()` and `bonePosition()` work as on a glTF model; a second mesh (another material) shares the pose with `skin(mesh2, first._skeleton!)`; culled by the mesh's bounds; at most 64 bones. See `guides/webgl-models.md`
    -   **Humanoid bones** (`IgeHumanoidBones`) - `humanoidBones(skeleton)` finds hips, spine, head, arms, hands and legs from a rig's shape (auto-rigged models with numbered bones), used by `humanoidRagdollParts()` (the ragdoll default) and for `attachToBone()`; `modelBounds(model)` sizes generated models; `entity.attachAt(matrix, { pose })` places an attached item in model space
    -   **Mesh Simplifier** (`IgeMeshSimplifier`) - quadric edge-collapse simplification that keeps UVs, normals and skin weights; generates level-of-detail meshes
-   Transforms: an entity whose transform inputs weren't written since its last rebuild (tracked points on `_translate`, `_rotate`, `_scale`, `_origin`, `_bounds2d`, `_bounds3d` set `_tfDirty`, direct `_translate.x = ...` writes included) and whose parent didn't change costs a few compares in `updateTransform()`, so unchanged scenery costs next to nothing per frame; set `_tfDirty = true` after altering a matrix by hand.
-   Frame pipeline: renderables are collected once per frame (transforms, skin matrices, world-space bounds); each viewport then culls, renders its directional shadow map (centred on its camera target, or shared when split-screen views are close) and draws opaque batches front to back, then transparent items and particles. Point light shadows render once per frame.
-   Level of detail: each pass (viewport, directional shadow, point shadow) picks an entity's LOD level from its projected size, so split-screen views choose independently.
-   Split-screen and picking helpers: `worldToScreen()`, `screenToWorldRay()`, `screenToGround()`, `screenToHeightfield()`, `raycast()`, `viewportAt()`, `maxPixelRatio()`, `lodBias()`, `fog()`, `stats()`
-   Resources and quality: `releaseGeometry()`, `releaseTexture()` (dynamic content must free what it replaces), `backFaceCulling()` (opt-in; meshes must be wound CCW, `doubleSided` materials are exempt), `shadowCaching()` (static shadow casters cached in their own map, copied into the live map each frame with only moving or `_shadowDynamic` casters drawn over it; a skinned caster whose pose hasn't changed (pose version) settles into the cache like a still one; `stats()` has `shadowCacheRebuilds`, `dynamicShadowDraws`, `shadowCacheCopies`), `shadowCasterCulling()` (on by default: moving casters whose shadow can't land in the view are left out of the directional shadow pass, tested against the light's depth span with a margin of 2% of the shadow frustum; `stats().shadowCastersCulled`), `ige.engine.renderOnDemand()` (frames only when something visible changed; `manualRender()` after material/texture changes). Geometry `colors` are used as vertex colours.
-   Lost WebGL context: the renderer stops drawing and emits `"contextLost"`, then on restore makes every GPU resource again from its CPU-side source (geometry, textures, text labels, shaders, shadow maps, instancing, post-process) and emits `"contextRestored"` with the ids of `discardGeometryArrays` meshes it couldn't bring back; `renderer.contextLost()`. See `guides/webgl-models.md`.
-   UI layer: `entity.uiLayer(n)` draws a textured entity (and everything under it) in a final pass after the scene, particles and post-processing, with no depth test, per viewport, unlit and shadowless: world-anchored (follows its point, faces the camera, `uiScreenSize(px)` for a constant size, `uiOffset(x, y)` in pixels) or `uiScreen({ left, top, right, bottom, center, middle })` pinned to the screen; layer order, then far to near, then screen elements. `IgeUiLayer` is a container, `IgeUiTextLabel` / `igeTextTexture()` draw cached, shared text textures (plate, edge, accent bar). See `guides/ui-layer.md`, example `uiLayer`.
-   Panel viewport: `renderer.addPanel(new IgePanelViewport(layout))` draws a picture-in-picture view (a scene, camera cuts, lights and shadows of its own) over the main views and their post-processing, under the overlays; `show()` / `hide()` (hidden costs nothing), placed in CSS pixels or fractions of the canvas, `effect` hook for a look over just its rectangle; `capture(callback, silent?)` hands over the panel's finished picture once (RGBA bytes, top row first, device pixels, read back from its own offscreen target; `silent` keeps it off the canvas that frame, for stills made out of sight, e.g. Starflight's casino seat avatars). See `guides/panel-viewport.md`, `guides/recorder-effect.md`.
-   Recorder look for panels: `panel.effect = new IgeRecorderEffect("siteRecorder" | "warshipCamera" | "precursorMemory" | own settings)` (`IgeRecorderEffect`): grain, scanlines, tint, crush, vignette, fringe, blur/sharpen, warp, dropouts, a gold shimmer mode; noise is a pure function of `time()` (quantised to 24 fps) so pauses hold and scrubs repeat; `effect.<setting>` timeline tracks animate it; `attach(entity, { whileHidden: true })`; timeline `rate()` sets audio `playbackRate`. See `guides/recorder-effect.md`.
-   HUD and debugging: `IgeViewportOverlay` (DOM elements over entities, clipped per viewport), `debugDraw({ bounds, shadowFrustum })`, `debugLine()`.
-   Renderer choice: `igeCreateRenderer({ mode: "2d" | "iso" | "3d" })` picks WebGL where available (else Canvas 2D; iso always Canvas 2D); `ige.engine.start()` uses it when no renderer is assigned.
-   Loading: `igeLoadAssets({ textures, models, data }, { onProgress })` loads images, glTF models/animation files and JSON in one call.
-   Online play: `IgeRoomServer` / `IgeRoomClient` (`src/engine/network/rooms/`) add rooms, seats and an ordered command stream to IGE networking; see `guides/online-rooms.md`.
-   Replication (`src/engine/network/replication/`, the engine's real-time multiplayer; stages 1, 2 and 4 of the one replication system, which replaced the old sync snapshot API and the old `IgeObject` streaming (`streamMode`, `streamSections`, the net.io stream commands); both are removed, and entity streaming will be rebuilt on replication): an authority (browser host, offline in the same page, or a Node server) steps the game at a fixed rate from every machine's local players' inputs; `IgeNetReplicationHost` / `IgeNetReplicationClient` over a schema set (`IgeNetSchemaSet`: quantised numbers, ints, bools, angles, enums, strings, json, optional fields, groups). The game keeps objects on `host.replicator` (`IgeNetReplicator`) and writes them (`write()` compares each field once and stamps changes; unwritten objects cost nothing); connections' viewers subscribe to scopes, own private objects or have objects revealed (visibility kept incrementally); each send is one binary packet per viewer (creates, destroys, changed fields only, small per-connection handles, updates encoded once and shared); baselines are acked per object so the same code runs on a lossy datagram transport (`lossy: true`); binary frames added to the transports. Client: `interpolated()`, `predict()`, `transfer()`. Transport-agnostic (`igeNetLoopback()` for one page and tests, WebSocket and relay transports in `src/engine/network/transport/`). Stage 2 (relevance): kinds declare `relevance: "spatial" | "scope"`, a `position`, a blip group, priorities and rates (`IgeNetSchemaSet(defs, kinds)`); per-scope uniform grid (`IgeNetGrid`); viewers have interest points (`addInterest`), `focus()`, a bandwidth budget (default 32 KB/s once a kind declares relevance) filled in accumulated-priority order, `maxPacketBytes` splitting; the client sees `detailOf()` full/blip with blips holding only blip fields; `viewer.report()`. Json fields go as versioned patches of what changed inside them (`igeNetJsonDelta.ts`, last 16 versions kept each end, lossy-safe); with a budget, entries over `sliceBytes` (512) go in slices over rounds using spare budget (`sliceShare`, owned objects first), holding up only their own field groups (`separateGroups`). Stage 4 (lag compensation): `interpolated()` remembers its render tick and `sendInput()` frames carry it (1/16 ticks, about 5 bytes per packet, flag in the input packet type's spare bits); the host clamps it to `maxRewind` (ms, default 250) and gives `host.viewTick(player)` / `viewLag(player)` for the input applied this step; `IgeNetHistory` (`record(tick, id, ...xz)`, `at(id, tick)` blended, `ticksFor(ms, rate)`) keeps recent positions so a shot is tested against `history.at(id, host.viewTick(p))`. Events travel in the replication packets: `host.event(data, { to, on, at, scope, reliable })` goes only to viewers holding `on` objects in full detail, who would see `at` a place, or in `scope` (none: everyone), declared binary shapes (schema set's third argument; undeclared events go as JSON in the packet), counted in the budget, reliable ones resent until acked on lossy transports (`host.eventNow()` for one that must go before a drop); removal reasons (`removeReasons` on a kind, `destroy(obj, reason)`, `obj.moveTo(scope, reason)`) reach the client's `destroyed` event so games play explosions and jump flashes themselves (no reason: just out of sight). Stage 3 (WebTransport): `IgeNetWebTransportServer` (Node, UDP, optional peer dependency `@fails-components/webtransport`, self-signed short-lived certificate with `certHash` for dev or real certificate files) and `igeNetWebTransport()` carry packets and inputs as datagrams and everything else on one reliable stream; `igeNetConnect({ webTransport, webSocket })` falls back to the WebSocket (no WebTransport, not a secure context, error or timeout); lossy mode is per connection (`connection.lossy`), a lossy viewer's packets fit a datagram; zones register their WebTransport address and the directory hands it out (`/enter`, hand-offs). Loss bench (`NET_BENCH=1`, src/tests/IgeNetLossBench.test.ts): longest freeze at 60 ms RTT, 1% loss 293 ms on the WebSocket vs 66 ms on datagrams. See `guides/replication.md`, benchmark `src/tests/IgeNetBench.test.ts` (`NET_BENCH=1`).
-   Entity streaming (`src/engine/network/entities/`, on the replication layer; replaces the removed `IgeObject` streaming): a class declares `static net = igeNetEntity(kind, fields, { transform, plane, relevance, blip, ... })` (declared fields default to `blend: false`; x, y, z, rotation angles, optional scale and the parent id `p` come with every kind); `igeNetEntitySchemas(classes)` gives the defs and kinds both ends merge into their schemas; `IgeNetEntityHost` (`entities.add(entity, { owner, relevant, scope })` / `entity.replicate()`) reads every entity into its object at the start of each flush (`IgeNetReplicator.beforeFlush()`), scope = the entity's scene id, `entities.objectOf(entity)` for `viewer.control()` / `addInterest()`; `IgeNetEntityClient` (`update()` each frame or `attach()`) makes entities by kind (`netCreate(values)` or `new Class()`), mounts them under their parent, follows the interpolated transform and fields (`onNetChange(changed)`), predicts the player's own with `entities.control(id, slot, apply)` (position, and rotation too for `rotation: "quaternion"` kinds: `apply` sees `q` as `{ x, y, z, w }`, blended with a slerp). `rotation: "quaternion"` sends a packed quaternion (smallest-three, 38 bits, worst error about 0.06°) in place of the Euler angles; the client sets `quaternion()` and blends along the shortest path. Examples: `entityStream` (host and two clients in one page, lag/jitter/loss sliders), `entityStreamNet` (Node server, one pilot per tab). See `guides/entity-streaming.md`.
-   Zone servers (`src/engine/network/zones/`, Node): one replication authority per zone (a star system, a map region), each its own process. `IgeZoneDirectory` (HTTP control plane: `/enter`, zones register and heartbeat, idle zones stop, silent ones are forgotten and restart on demand) starts zones through an `IgeZoneLauncher` (`IgeChildProcessLauncher`, `IgeDockerLauncher`); `IgeZoneHost` is a zone's side (register, heartbeats, `handoff(player, toZone, data)`, `acceptTicket`). Players move with signed single-use tickets (`signTicket` / `verifyTicket`, data opaque to the engine): `IgeNetReplicationClient.transfer({ url, ticket })` and `join(players, ticket)`, accepted by `IgeNetReplicationHost`'s `acceptTicket` (also for reconnecting to the same zone). The game supplies `resolveEntry(player, body)` (and must authenticate there) and the zone script. Example: `src/examples/zones` (two child-process zones); see `guides/zone-servers.md`.
-   2D: camera preset `screen2d` (y down, one unit per pixel, zoom by camera scale) draws sprites flat with their 2D transforms; smart textures and bitmap font sheets render per entity; texture filters re-upload when they change. Isometric games move to a 3D layout to use WebGL. Entity `tick()` isn't called by the WebGL renderer (use update behaviours). See `guides/2d-on-webgl.md`.
-   Timeline player (`src/engine/timeline/`): `IgeTimeline` plays scripted scenes from plain data (`timeline().track("ring", t => t.at(0, {...}).at(2.5, {...}, "smooth")).caption(...).build()`) that pause and scrub to any time and show the same picture every time: entity position / rotation / quaternion / scale / visibility / colour / opacity, skeletal clip and clip time (`skeletalAnimation().pose()`), panel camera cuts, captions at t, sound cues, event cues (`eventsBetween()`), seekable seeded particle cues; example `timeline`; see `guides/timeline.md`.
-   Guides: `guides/gpu-device.md`, `guides/webgl-models.md`, `guides/physics-3d.md`, `guides/2d-on-webgl.md`, `guides/online-rooms.md`, `guides/replication.md`, `guides/zone-servers.md`, `guides/entity-streaming.md`, `guides/ui-layer.md`, `guides/panel-viewport.md`.
-   Post-processing (WebGL 2, off by default): `renderer.postProcess({ enabled: true, bloom, toneMapping: "aces" | "reinhard" | "none", exposure, contrast, saturation, temperature, vignette })` draws the frame into a multisampled offscreen target (depth and stencil kept) and composites it once over the canvas (`IgeWebGlPostProcess`).
-   Dynamic resolution: `renderer.dynamicResolution({ enabled, minScale, maxScale })` / `renderScale(s)` draw the 3D scene offscreen at a fraction of the canvas and upscale it, steering the scale by missed frames (rAF refresh interval, `maxRenderRate()` budget, GPU timer query where available); the UI layer, panels, outlines and overlays stay at full resolution. See `guides/webgl-models.md`.
-   Scrolling textures: a material's `uvScale` / `uvOffset` ({ u, v }) transform its texture coordinates (lit and skinned shaders); change `uvOffset` each frame for flowing water or drifting clouds (items with different transforms don't share an instanced draw).
-   Hemisphere ambient light: `ambientLight.groundColor(r, g, b)` lights downward-facing surfaces with a second colour (`lightManager.refresh()` after changing ambient lights).
-   Entities can carry a quaternion rotation (`entity.quaternion()`) that replaces the Euler `rotate()` in 3D transforms.
-   `entity.occludedColor({ r, g, b, a })`: a flat silhouette wherever the entity (and its children) is hidden behind something, e.g. players behind walls.
-   `entity.outline({ r, g, b, a }, widthPx)`: a crisp line of constant screen width round the entity's silhouette (children included), drawn over the finished frame with no z-fighting; `null` clears it. Instanced, skinned and LOD meshes; nothing outlined costs nothing (`IgeWebGlOutlinePass`). See `guides/webgl-models.md`.
-   Any number of point and spot lights: each view draws with the nearest that reach it (8 point, 4 spot), chosen per view.
-   `entity.geometry(mesh)` swaps an entity's mesh (render on demand notices); `renderer.discardGeometryArrays(mesh)` keeps only the GPU copy of a big mesh.
-   Entity `preTick` behaviours run under WebGL once per frame with a dummy 2D context; entity `tick()` itself isn't called.
-   Used in multiple working examples: coordTest2d, coordTest3d, coordTestIso, lightingShadows, skeletalAnimation, webGlRenderer, zombie-game (4-player split-screen zombie ARPG prototype), webGl2d (Canvas 2D style scene on WebGL, `?split=1` for two views), hex-realms (large hex-map strategy prototype, in progress), zones (two zone servers as child processes; fly across the border and you're handed on), uiLayer (labels over moving cubes that a wall never hides, and a screen panel), entityStream (entity streaming: a host and two clients in one page over a simulated link), entityStreamNet (entity streaming from a Node server, one pilot per browser tab)

#### Working with models

```typescript
const model = await igeGltfLoader.load("../../assets/models/CesiumMan.glb", "character");

const zombie = new IgeEntity()
	.model(model, {
		animation: "Walk", // meshes, textures, skeleton, clips
		lod: [
			{ screenSize: 220, ratio: 0.5 }, // under 220 device px: half the triangles
			{ screenSize: 120, ratio: 0.25 }
		]
	})
	.translateTo(100, 0, 50)
	.scaleTo(100, 100, 100)
	.mount(scene);

zombie.material({ color: { r: 0.4, g: 0.6, b: 0.35, a: 1 } }); // per-entity override (null restores)
zombie.playAnimation("Attack", { loop: false, crossFadeDuration: 0.1 });
```

-   Entities sharing a model are GPU-instanced automatically and share cached animation poses (`IgeSkeletalAnimationComponent.poseCacheRate`); use `skeletalAnimation().poseCache(false)` for hero characters that should animate at full frame rate.
-   glTF node transforms are applied (models face +Z and stand upright without manual rotation).
-   Items in hand: mount the item to the character and call `attachToBone("RightHand")`; `bonePosition(name)` gives a bone's world position for effects.
-   Animations in separate files: `model(model, { animations: { Attack: attackFile } })` (record: first clip of each file under the key) or `animations: [libraryFile]` (every clip under its own name). Clips are retargeted by bone name (`IgeAnimationRetarget`); identical rigs share keyframes, other rigs are converted rest-relative.
-   LOD levels are generated once per model and shared; `{ screenSize, model }` uses an authored lower-detail model instead (same parts and skeleton). `renderer.stats().lodItems` and `.triangles` help tune thresholds.


#### **IgeThreeJsRenderer** (`src/engine/core/IgeThreeJsRenderer.ts`) - EXPERIMENTAL

-   Incomplete Three.js-based renderer (about 220 lines; `TODO`s in the render path)
-   Has basic setup (WebGLRenderer, Scene, PerspectiveCamera) but does not draw IGE scenes
-   `three` is listed as a peer dependency in `package.json` (not marked optional, unlike the others) and as a dev type dependency; the custom renderer doesn't use it
-   Only one example uses it (`src/examples/threeJsRenderer/client.ts`)
-   Not recommended for active development; the custom WebGL renderer is the primary path

#### **IgeWebGpuRenderer** (`src/engine/core/IgeWebGpuRenderer.ts`) - PROTOTYPE

-   Early WebGPU API prototype (about 490 lines): adapter/device setup, one pipeline, draws textured rectangles
-   No scene graph, lighting, models or shadows; example `src/examples/webGpuRenderer`
-   Not production-ready. WebGPU work for the main renderer is going through `IgeGpuDevice` (`src/engine/gpu/`, `guides/gpu-device.md`), which has only a WebGL 2 backend so far


### WebGL Support Files (`src/engine/webgl/`)

| File | Purpose |
|------|---------|
| `IgeWebGlResourceManager.ts` | Core WebGL resource allocation and management |
| `IgeWebGlShaderManager.ts` | Shader compilation and caching |
| `IgeWebGlTextureManager.ts` | Texture creation and management |
| `IgeWebGlGeometryManager.ts` | Geometry creation and caching |
| `IgeWebGlGeometry.ts` | Individual geometry class |
| `IgeWebGlCameraController.ts` | Camera controls and projection |
| `IgeWebGlStateManager.ts` | WebGL state tracking |
| `IgeWebGlLightManager.ts` | Light management |
| `IgeWebGlLight.ts` | Individual light class |
| `IgeWebGlShadowManager.ts` | Shadow mapping system |
| `IgeWebGlSkeletonManager.ts` | Skeletal animation support |
| `IgeWebGlMaterial.ts` | Material system |
| `IgeWebGlProgram.ts` | GLSL program wrapper |
| `IgeGltfLoader.ts` | GLTF/GLB model loading |
| `IgeFrustum.ts` | Frustum culling |
| `IgePrimitiveGeometry.ts` | Built-in primitive shapes |
| `IgeWebGlInstancing.ts` | Render items, batcher, instance buffer, bone palette texture |
| `IgeModelParts.ts` | GLTF model to render parts; skeleton instances |
| `IgeParticleSystem3d.ts` | 3D particle effects entity |
| `IgeMeshSimplifier.ts` | Mesh simplification for level-of-detail geometry |
| `IgeAnimationRetarget.ts` | Retarget animation clips from other files onto a skeleton by bone name |
| `IgeDecalSystem3d.ts` | Decals entity (flat floor decals and projected decals) |
| `IgeDecalProjector.ts` | Clips mesh triangles to a decal box for projected decals |
| `IgeRaycast.ts` | Ray/triangle tests against entities' meshes (including skinned, posed on the CPU) |
| `IgeHumanoidBones.ts` | Finds a humanoid rig's main bones from its shape (generated, auto-rigged characters) |
| `IgeAnimationInPlace.ts` | Takes the horizontal root motion out of a clip (walk and run cycles on the spot) |
| `IgeProceduralSkeleton.ts` | Skeletons made in code for rigid-part characters posed each frame with `setBonePose()` |
| `IgeTriangleBvh.ts` | Cached triangle BVH for raycasts and decal projection on large meshes |
| `IgeHeightfieldRay.ts` | Ray/heightfield intersection behind `screenToHeightfield()` |
| `IgeViewportOverlay.ts` | DOM HUD elements over the 3D views, clipped per viewport |


## Ultimate Project Goals

### Primary Objective

**A unified 3D renderer (custom WebGL) that handles both 2D and 3D content seamlessly, similar to modern game engines like Unity and Unreal Engine.**

This works today under `IgeWebGlRenderer`:

```typescript
// 2D sprite: a textured plane in 3D space, facing the camera (billboard "full" by default)
const entity = new IgeEntity()
	.texture(myTexture)
	.translateTo(100, 50, 25) // 3D positioning
	.mount(scene);

// 3D model (load it first with igeGltfLoader.load())
const entity3d = new IgeEntity()
	.model(my3dModel) // 3D model instead of texture
	.translateTo(100, 50, 25) // Same positioning API
	.mount(scene); // Same mounting API
```

Axes differ by camera: 3D presets are y up; the `screen2d` preset is y down, one unit per pixel (see `guides/2d-on-webgl.md`). Isometric (`IgeEntityRenderMode.iso`) scenes are not drawn by the WebGL renderer.

### Key Requirements

1. **API Consistency**: Same methods work for both 2D sprites and 3D models (done for positioning, mounting, scaling, materials; iso mode is Canvas 2D only)
2. **Unified Renderer**: Single WebGL renderer handles all content types (2D and 3D yes; iso no)
3. **Performance**: Custom WebGL rendering for maximum control and performance
4. **Simplicity**: Maintain IGE's ease of use philosophy
5. **Backward Compatibility**: Existing 2D workflows continue to work (Canvas 2D is unchanged; `igeCreateRenderer({ mode: "2d" })` runs them on WebGL)

### Technical Strategy

1. **Custom WebGL Renderer** (done): purpose-built, modular manager architecture, 2D sprites as textured planes, 3D models via the glTF loader, one pipeline for all content.
2. **Why custom**: no external 3D library for core rendering, full control of shaders, lighting, shadows, skeletal animation and batching, smaller bundle than Three.js.
3. **2D content in 3D space** (done): textures on planes, `billboard("full" | "y" | "none")`, orthographic cameras, the `screen2d` and iso camera presets (`IgeCamera.preset()`).
4. **Entity system** (done): `.texture()` and `.model()` both work; materials are `IgeMaterialData` / `IgeWebGlMaterial`; plane geometry for sprites is automatic.
5. **Cameras** (mostly done): perspective and orthographic, presets, `IgeWebGlCameraController`, tracking. No animated transition between camera modes.

## Development Priorities

See `development-plan.md` for the current status, measurements and the prioritised next steps (driven by the split-screen zombie ARPG). Status of the original phases:

### Phase 1: Unified Renderer Foundation (Done)

-   `IgeWebGlRenderer` as primary renderer, modular managers: done
-   `.texture()` and `.model()` on one entity API, sprites as textured planes: done (`IgeEntity`, `billboard()`)
-   Cameras: perspective and orthographic, presets, `IgeCamera.preset()` and `IgeWebGlCameraController`: done

### Phase 2: Asset Pipeline

-   GLTF/GLB loading (`IgeGltfLoader`), `igeLoadAssets()`, animation files and retargeting: done
-   Texture loading for 3D materials: done for base colour and emissive maps
-   PBR materials: partly done. `IgeWebGlPBRMaterial` and `IgeMaterialData` carry metallic, roughness and emissive values, and `renderer.pbr(true)` turns on the lighting model (off by default). Normal, metallic-roughness and occlusion maps exist in the shader and material classes but the renderer never turns them on (`u_hasNormalMap` etc. are set to 0 in `IgeWebGlRenderer`), so they have no effect. No specular maps
-   Material editor/configuration tool: not started

### Phase 3: Advanced Features (mostly done)

-   Lighting: directional, point and spot lights (`IgeWebGlLightManager`); shadow mapping (`IgeWebGlShadowManager`, cached static shadows)
-   Light entity types: not started (lights are `IgeWebGlLight` objects on the renderer, not scene entities)
-   Performance: frustum culling, LOD (`IgeMeshSimplifier`), GPU instancing, render batching, shared animation pose cache, dynamic resolution

### Phase 4: Developer Experience

-   Documentation: partly done. `guides/` covers the WebGL, 2D-on-WebGL, physics, networking, UI and timeline systems; there are no migration or best-practice guides beyond `guides/2d-on-webgl.md`
-   3D scene editor and asset preview tools: not started (only the old Canvas 2D editor under `other/editor`, not ported)
-   Debug visualization: partly done (`debugDraw()`, `debugLine()`, `stats()`)

## Implementation Guidelines

### For AI Coding Agents

When working on IGE, follow these principles:

1. **Preserve Existing APIs**: Don't break current 2D functionality
2. **Follow Patterns**: Use existing code patterns and class structures
3. **TypeScript First**: Maintain strict typing throughout
4. **Test Backward Compatibility**: Ensure 2D examples still work
5. **Document Changes**: Update inline documentation, and this file and `guides/` for new features
6. **Use Custom WebGL**: Build on `IgeWebGlRenderer`, not Three.js

### Key Files to Understand

-   `src/engine/core/IgeEntity.ts` - Core entity class
-   `src/engine/core/IgeObject.ts` - Base object class
-   `src/engine/core/IgeWebGlRenderer.ts` - Primary 3D renderer
-   `src/engine/core/IgeCanvas2dRenderer.ts` - 2D and isometric renderer
-   `src/engine/core/IgeBaseRenderer.ts` - Base renderer class
-   `src/engine/core/igeCreateRenderer.ts` - Chooses the renderer
-   `src/engine/webgl/` - WebGL support modules (managers, loaders, etc.)
-   `src/examples/webGlRenderer/` - WebGL renderer example
-   `src/examples/coordTest3d/` - 3D coordinate test example
-   `src/examples/skeletalAnimation/` - Skeletal animation example

### Common Tasks

1. **Renderer Enhancement**: Extend the custom WebGL renderer with new features
2. **Material work**: Switch on normal, metallic-roughness and occlusion maps in the renderer
3. **Asset Pipeline**: Improve GLTF/GLB loading and material support
4. **Tooling**: Scene editor, asset preview, material editor
5. **Docs**: Migration guide from Canvas 2D to WebGL beyond `guides/2d-on-webgl.md`

### Architecture Constraints

-   Custom WebGL renderer is the primary 3D rendering path
-   Three.js renderer exists as an experimental alternative but is not the focus
-   Entity system must remain simple and intuitive
-   Scene graph structure should remain unchanged
-   Same transformation APIs for 2D sprites and 3D models
-   Unified asset loading for textures and 3D models

## Current Challenges

1. **Feature Completeness**: PBR texture maps, a tooling story, and the items in `development-plan.md`
2. **Isometric on WebGL**: iso scenes stay on Canvas 2D; they must be moved to a 3D layout to use WebGL
3. **Performance**: Large scenes and split-screen (see `development-plan.md` for measurements)
4. **Complexity vs Simplicity**: Maintaining IGE simplicity with growing 3D capabilities
5. **Migration Path**: `guides/2d-on-webgl.md` is the only guide for moving Canvas 2D games to WebGL

## Renderer Comparison

| Renderer | Status | Use Case | Maturity |
|----------|--------|----------|----------|
| **IgeWebGlRenderer** | In use (zombie-game, other examples) | 3D, and 2D on WebGL (WebGL 2 only) | Mature |
| **IgeCanvas2dRenderer** | In use | 2D, isometric, fallback without WebGL | Mature |
| **IgeThreeJsRenderer** | Experimental, not developed | Alternative (not recommended) | Incomplete |
| **IgeWebGpuRenderer** | Prototype | Future graphics API | Very early |

## Success Metrics

The unified 3D renderer is judged by:

1. **2D sprites work seamlessly in 3D space**: done (`texture()`, `billboard()`, `screen2d` preset; example `webGl2d`)
2. **3D models can be used as easily as 2D textures**: done (`model()` after `igeGltfLoader.load()`)
3. **Performance suitable for both 2D and 3D games**: measured in `development-plan.md` for the 3D case; 2D on WebGL is newer and less measured
4. **Developer experience stays intuitive and simple**: ongoing, a judgement
5. **Single API works for all content types**: partly done; iso scenes still need Canvas 2D
6. **Existing workflows require minimal changes**: done for 2D (`igeCreateRenderer({ mode: "2d" })`); iso games must restructure to use WebGL

## Conclusion

IGE has a mature custom WebGL renderer (`IgeWebGlRenderer`) with lighting, shadows, skeletal animation, GLTF/GLB loading, culling, batching, physics, networking and UI layers. It replaced the earlier experimental Three.js integration.

Remaining gaps: PBR texture maps in the renderer, authoring tools, isometric scenes on WebGL, and a real WebGPU backend behind `IgeGpuDevice`.
