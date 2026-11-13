# IGE (Isogenic Game Engine) - Project Agents Guide

## Project Overview

The Isogenic Game Engine (IGE) is a custom 2D/isometric/3D game engine written in TypeScript for creating games using web technologies. The engine supports 2D, isometric, and full 3D rendering via a custom WebGL renderer, maintaining the simplicity and ease of use that makes IGE special.

## Current State

### Core Engine Architecture

The engine is built around several key classes that form the foundation of the rendering and scene management system:

#### **IgeEntity** (`src/engine/core/IgeEntity.ts`)

-   The fundamental building block of all game objects
-   Already supports 3D positioning (x, y, z) and 3D sizing via `_bounds3d`
-   Has transformation matrices and world position calculations
-   Supports both 2D (`IgeEntityRenderMode.flat`) and isometric (`IgeEntityRenderMode.iso`) rendering modes
-   Contains depth sorting for isometric rendering (`depthSortChildren()`)
-   Has built-in support for textures via `IgeTexture`

#### **IgeObject** (`src/engine/core/IgeObject.ts`)

-   Base class for all engine objects including entities
-   Provides fundamental transformation support (translate, rotate, scale)
-   Has 3D bounds (`_bounds3d: IgePoint3d`) and positioning (`_translate: IgePoint3d`)
-   Includes scene graph management (parent/child relationships)
-   Contains geometry and material data properties for 3D rendering

#### **IgeViewport** (`src/engine/core/IgeViewport.ts`)

-   Manages what portion of the scene is visible to the user
-   Contains an `IgeCamera` for controlling viewpoint
-   Handles clipping and viewport transformations
-   Supports both 2D and 3D rendering modes

#### **IgeCamera** (`src/engine/core/IgeCamera.ts`)

-   Controls the viewpoint within a viewport
-   Supports tracking entities for smooth camera movement
-   Has 3D transformation support (translate, rotate, scale)

#### **IgeTexture** (`src/engine/core/IgeTexture.ts`)

-   Handles loading and rendering of 2D images/textures
-   Supports cell-based sprite sheets
-   Used in both Canvas 2D and WebGL rendering pipelines

### 3D Support Infrastructure

The engine has extensive 3D infrastructure:

1. **3D Positioning**: All entities support 3D coordinates via `IgePoint3d`
2. **3D Bounds**: Entities have `_bounds3d` for 3D collision and depth sorting
3. **Isometric Rendering**: Built-in support for pseudo-3D isometric views
4. **Depth Sorting**: Multiple algorithms for proper 3D object ordering
5. **Geometry Data**: `_geometryData` property for storing 3D mesh information
6. **Material Data**: `_materialData` property for 3D material properties
7. **Mesh Data**: `_meshData` property for renderer-specific 3D objects

### Rendering System

#### **IgeCanvas2dRenderer** (`src/engine/core/IgeCanvas2dRenderer.ts`)

-   Extends `IgeBaseRenderer` for Canvas 2D rendering
-   Handles viewport management and scene graph traversal
-   Renders entities using their textures and transformation matrices
-   Optimized for 2D but supports isometric projection

#### **IgeWebGlRenderer** (`src/engine/core/IgeWebGlRenderer.ts`) - PRIMARY 3D RENDERER

-   Custom-built WebGL renderer replacing the earlier experimental Three.js integration
-   Supports both WebGL 1 and WebGL 2
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
    -   **Humanoid bones** (`IgeHumanoidBones`) - `humanoidBones(skeleton)` finds hips, spine, head, arms, hands and legs from a rig's shape (auto-rigged models with numbered bones), used by `humanoidRagdollParts()` (the ragdoll default) and for `attachToBone()`; `modelBounds(model)` sizes generated models; `entity.attachAt(matrix, { pose })` places an attached item in model space
    -   **Mesh Simplifier** (`IgeMeshSimplifier`) - quadric edge-collapse simplification that keeps UVs, normals and skin weights; generates level-of-detail meshes
-   Frame pipeline: renderables are collected once per frame (transforms, skin matrices, world-space bounds); each viewport then culls, renders its directional shadow map (centred on its camera target, or shared when split-screen views are close) and draws opaque batches front to back, then transparent items and particles. Point light shadows render once per frame.
-   Level of detail: each pass (viewport, directional shadow, point shadow) picks an entity's LOD level from its projected size, so split-screen views choose independently.
-   Split-screen and picking helpers: `worldToScreen()`, `screenToWorldRay()`, `screenToGround()`, `screenToHeightfield()`, `raycast()`, `viewportAt()`, `maxPixelRatio()`, `lodBias()`, `fog()`, `stats()`
-   Resources and quality: `releaseGeometry()`, `releaseTexture()` (dynamic content must free what it replaces), `backFaceCulling()` (opt-in; meshes must be wound CCW, `doubleSided` materials are exempt), `shadowCaching()` (static shadow casters cached), `ige.engine.renderOnDemand()` (frames only when something visible changed; `manualRender()` after material/texture changes). Geometry `colors` are used as vertex colours.
-   Lost WebGL context: the renderer stops drawing and emits `"contextLost"`, then on restore makes every GPU resource again from its CPU-side source (geometry, textures, text labels, shaders, shadow maps, instancing, post-process) and emits `"contextRestored"` with the ids of `discardGeometryArrays` meshes it couldn't bring back; `renderer.contextLost()`. See `guides/webgl-models.md`.
-   UI layer: `entity.uiLayer(n)` draws a textured entity (and everything under it) in a final pass after the scene, particles and post-processing, with no depth test, per viewport, unlit and shadowless: world-anchored (follows its point, faces the camera, `uiScreenSize(px)` for a constant size, `uiOffset(x, y)` in pixels) or `uiScreen({ left, top, right, bottom, center, middle })` pinned to the screen; layer order, then far to near, then screen elements. `IgeUiLayer` is a container, `IgeUiTextLabel` / `igeTextTexture()` draw cached, shared text textures (plate, edge, accent bar). See `guides/ui-layer.md`, example `uiLayer`.
-   HUD and debugging: `IgeViewportOverlay` (DOM elements over entities, clipped per viewport), `debugDraw({ bounds, shadowFrustum })`, `debugLine()`, `preferredWebGlVersion(1)` to test the WebGL 1 path.
-   Renderer choice: `igeCreateRenderer({ mode: "2d" | "iso" | "3d" })` picks WebGL where available (else Canvas 2D; iso always Canvas 2D); `ige.engine.start()` uses it when no renderer is assigned.
-   Loading: `igeLoadAssets({ textures, models, data }, { onProgress })` loads images, glTF models/animation files and JSON in one call.
-   Online play: `IgeRoomServer` / `IgeRoomClient` (`src/engine/network/rooms/`) add rooms, seats and an ordered command stream to IGE networking; see `guides/online-rooms.md`.
-   Real-time multiplayer: `IgeNetSyncHost` / `IgeNetSyncClient` (`src/engine/network/sync/`): an authority (browser host, offline in the same page, or a Node server) steps the game at a fixed rate from every machine's local players' inputs and sends delta snapshots; machines predict their own players and interpolate the rest. Transport-agnostic (`igeNetLoopback()` for one page and tests); see `guides/realtime-sync.md`.
-   Zone servers (`src/engine/network/zones/`, Node): one sync authority per zone (a star system, a map region), each its own process. `IgeZoneDirectory` (HTTP control plane: `/enter`, zones register and heartbeat, idle zones stop, silent ones are forgotten and restart on demand) starts zones through an `IgeZoneLauncher` (`IgeChildProcessLauncher`, `IgeDockerLauncher`); `IgeZoneHost` is a zone's side (register, heartbeats, `handoff(player, toZone, data)`, `acceptTicket`). Players move with signed single-use tickets (`signTicket` / `verifyTicket`, data opaque to the engine): `IgeNetSyncClient.transfer({ url, ticket })` and `join(players, ticket)`, accepted by `IgeNetSyncHost`'s `acceptTicket` (also for reconnecting to the same zone). The game supplies `resolveEntry(player, body)` (and must authenticate there) and the zone script. Example: `src/examples/zones` (two child-process zones); see `guides/zone-servers.md`.
-   2D: camera preset `screen2d` (y down, one unit per pixel, zoom by camera scale) draws sprites flat with their 2D transforms; smart textures and bitmap font sheets render per entity; texture filters re-upload when they change. Isometric games move to a 3D layout to use WebGL. Entity `tick()` isn't called by the WebGL renderer (use update behaviours). See `guides/2d-on-webgl.md`.
-   Guides: `guides/webgl-models.md`, `guides/physics-3d.md`, `guides/2d-on-webgl.md`, `guides/online-rooms.md`, `guides/realtime-sync.md`, `guides/zone-servers.md`, `guides/ui-layer.md`.
-   Post-processing (WebGL 2, off by default): `renderer.postProcess({ enabled: true, bloom, toneMapping: "aces" | "reinhard" | "none", exposure, contrast, saturation, temperature, vignette })` draws the frame into a multisampled offscreen target (depth and stencil kept) and composites it once over the canvas (`IgeWebGlPostProcess`).
-   Scrolling textures: a material's `uvScale` / `uvOffset` ({ u, v }) transform its texture coordinates (lit and skinned shaders); change `uvOffset` each frame for flowing water or drifting clouds (items with different transforms don't share an instanced draw).
-   Hemisphere ambient light: `ambientLight.groundColor(r, g, b)` lights downward-facing surfaces with a second colour (`lightManager.refresh()` after changing ambient lights).
-   Entities can carry a quaternion rotation (`entity.quaternion()`) that replaces the Euler `rotate()` in 3D transforms.
-   `entity.occludedColor({ r, g, b, a })`: a flat silhouette wherever the entity (and its children) is hidden behind something, e.g. players behind walls.
-   `entity.outline({ r, g, b, a }, widthPx)`: a crisp line of constant screen width round the entity's silhouette (children included), drawn over the finished frame with no z-fighting; `null` clears it. Instanced, skinned and LOD meshes; nothing outlined costs nothing (`IgeWebGlOutlinePass`). See `guides/webgl-models.md`.
-   Any number of point and spot lights: each view draws with the nearest that reach it (8 point, 4 spot), chosen per view.
-   `entity.geometry(mesh)` swaps an entity's mesh (render on demand notices); `renderer.discardGeometryArrays(mesh)` keeps only the GPU copy of a big mesh.
-   Entity `preTick` behaviours run under WebGL once per frame with a dummy 2D context; entity `tick()` itself isn't called.
-   Used in multiple working examples: coordTest2d, coordTest3d, coordTestIso, lightingShadows, skeletalAnimation, webGlRenderer, zombie-game (4-player split-screen zombie ARPG prototype), webGl2d (Canvas 2D style scene on WebGL, `?split=1` for two views), hex-realms (large hex-map strategy prototype, in progress), zones (two zone servers as child processes; fly across the border and you're handed on), uiLayer (labels over moving cubes that a wall never hides, and a screen panel)

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

-   Incomplete Three.js-based renderer
-   Has basic setup (WebGLRenderer, Scene, PerspectiveCamera) but many TODOs remain
-   Three.js is a peer dependency (optional), not a core dependency
-   Only one example uses it (`threeJsRenderer/client.ts`)
-   Not recommended for active development; the custom WebGL renderer is the primary path

#### **IgeWebGpuRenderer** (`src/engine/core/IgeWebGpuRenderer.ts`) - PROTOTYPE

-   Early WebGPU API prototype
-   Has basic initialization pipeline but lacks real entity/scene rendering
-   Future-focused but not production-ready

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
| `IgeTriangleBvh.ts` | Cached triangle BVH for raycasts and decal projection on large meshes |
| `IgeHeightfieldRay.ts` | Ray/heightfield intersection behind `screenToHeightfield()` |
| `IgeViewportOverlay.ts` | DOM HUD elements over the 3D views, clipped per viewport |

## Ultimate Project Goals

### Primary Objective

**A unified 3D renderer (custom WebGL) that handles both 2D and 3D content seamlessly, similar to modern game engines like Unity and Unreal Engine.**

Users should be able to:

```typescript
// This should work for both 2D sprites and 3D models
const entity = new IgeEntity()
	.texture(myTexture) // 2D sprite as texture on 3D plane
	.translateTo(100, 50, 25) // 3D positioning
	.mount(scene); // Simple mounting

// Or with 3D models
const entity3d = new IgeEntity()
	.model(my3dModel) // 3D model instead of texture
	.translateTo(100, 50, 25) // Same positioning API
	.mount(scene); // Same mounting API
```

### Key Requirements

1. **API Consistency**: Same methods work for both 2D sprites and 3D models
2. **Unified Renderer**: Single WebGL renderer handles all content types
3. **Performance**: Custom WebGL rendering for maximum control and performance
4. **Simplicity**: Maintain IGE's ease of use philosophy
5. **Backward Compatibility**: Existing 2D workflows continue to work

### Technical Strategy

1. **Custom WebGL Renderer**:

    - Purpose-built for IGE's specific needs
    - Maximum control over rendering pipeline and performance
    - Modular manager architecture for maintainability
    - 2D sprites rendered as textured planes in 3D space
    - 3D models rendered natively via GLTF/GLB loader
    - Single rendering pipeline for all content

2. **Custom Renderer Benefits**:

    - No external 3D library dependency for core rendering
    - Full control over shader pipeline and optimizations
    - Custom GLTF/GLB model loading tailored to IGE
    - Built-in lighting, shadows, and skeletal animation
    - Render batching optimized for IGE's scene graph
    - Smaller bundle size compared to full Three.js dependency

3. **2D Content in 3D Space**:

    - 2D textures mapped to 3D planes
    - Automatic billboarding for sprite-like behavior
    - Orthographic camera mode for pure 2D feel
    - Isometric camera presets for isometric games

4. **Enhanced Entity System**:

    - Support both `.texture()` and `.model()` methods
    - Unified material system for both 2D and 3D content
    - Automatic geometry generation for 2D sprites
    - Native 3D model support

5. **Camera Evolution**:

    - True 3D perspective and orthographic cameras
    - 2D camera mode (orthographic with locked Z)
    - Isometric camera presets
    - Smooth transitions between camera modes

## Development Priorities

See `development-plan.md` for the current status, measurements and the prioritised next steps (driven by the split-screen zombie ARPG).

### Phase 1: Unified Renderer Foundation (Largely Complete)

1. **IgeWebGlRenderer as Primary Renderer** (Done):

    - Custom WebGL renderer with modular manager architecture
    - 2D sprite rendering as textured 3D planes
    - Material and lighting support
    - GLTF/GLB 3D model loading
    - Shadow mapping
    - Skeletal animation support

2. **Unified Entity System**:

    - Support both `.texture()` for 2D sprites and `.model()` for 3D content
    - Unified material system for both content types
    - Automatic geometry generation for 2D sprites
    - Enhanced transformation handling in 3D space

3. **Camera System**:
    - Perspective and orthographic cameras via `IgeWebGlCameraController`
    - Camera presets for common configurations
    - Maintain API compatibility for existing camera usage

### Phase 2: Asset Pipeline

1. **3D Asset Loading**:

    - GLTF/GLB loader for 3D models (implemented)
    - Texture loading for 3D materials
    - Asset management for 3D resources

2. **Material System**:
    - PBR (Physically Based Rendering) materials
    - Texture mapping (diffuse, normal, specular)
    - Material editor/configuration

### Phase 3: Advanced Features

1. **Lighting System**:

    - Dynamic lighting for 3D scenes (implemented - directional and point lights)
    - Shadow mapping (implemented)
    - Light entity types

2. **Performance Optimization**:
    - Frustum culling for 3D scenes (implemented, world-space bounding spheres)
    - Level-of-detail (LOD) system (implemented: generated or authored levels, chosen per viewport and shadow pass)
    - Instanced rendering for repeated objects (implemented, static and skinned)
    - Render batching (implemented)
    - Shared animation pose cache and off-screen animation culling (implemented)

### Phase 4: Developer Experience

1. **Documentation**:

    - 3D development guides
    - Migration guides from 2D to 3D
    - Best practices documentation

2. **Tooling**:
    - 3D scene editor
    - Asset preview tools
    - Debug visualization for 3D

## Implementation Guidelines

### For AI Coding Agents

When working on IGE, follow these principles:

1. **Preserve Existing APIs**: Don't break current 2D functionality
2. **Follow Patterns**: Use existing code patterns and class structures
3. **TypeScript First**: Maintain strict typing throughout
4. **Test Backward Compatibility**: Ensure 2D examples still work
5. **Document Changes**: Update inline documentation for new features
6. **Use Custom WebGL**: Build on `IgeWebGlRenderer`, not Three.js

### Key Files to Understand

-   `src/engine/core/IgeEntity.ts` - Core entity class
-   `src/engine/core/IgeObject.ts` - Base object class
-   `src/engine/core/IgeWebGlRenderer.ts` - Primary 3D renderer
-   `src/engine/core/IgeCanvas2dRenderer.ts` - 2D renderer
-   `src/engine/core/IgeBaseRenderer.ts` - Base renderer class
-   `src/engine/webgl/` - WebGL support modules (managers, loaders, etc.)
-   `src/examples/webGlRenderer/` - WebGL renderer example
-   `src/examples/coordTest3d/` - 3D coordinate test example
-   `src/examples/skeletalAnimation/` - Skeletal animation example

### Common Tasks

1. **Renderer Enhancement**: Extend the custom WebGL renderer with new features
2. **Entity Enhancement**: Add unified 2D/3D content support to `IgeEntity`
3. **Asset Pipeline**: Improve GLTF/GLB loading and material support
4. **Camera Modernization**: Enhance camera controller for more use cases
5. **API Unification**: Ensure same methods work for both 2D and 3D content

### Architecture Constraints

-   Custom WebGL renderer is the primary 3D rendering path
-   Three.js renderer exists as an experimental alternative but is not the focus
-   Entity system must remain simple and intuitive
-   Scene graph structure should remain unchanged
-   Same transformation APIs for 2D sprites and 3D models
-   Unified asset loading for textures and 3D models

## Current Challenges

1. **Feature Completeness**: Continuing to build out the WebGL renderer's feature set
2. **Asset Pipeline**: Unified loading for both 2D textures and 3D models
3. **Performance**: Optimizing the custom WebGL renderer for large scenes
4. **Complexity vs Simplicity**: Maintaining IGE simplicity with growing 3D capabilities
5. **Migration Path**: Smooth transition for existing IGE users from Canvas 2D

## Renderer Comparison

| Renderer | Status | Use Case | Maturity |
|----------|--------|----------|----------|
| **IgeWebGlRenderer** | Production-ready | Primary 3D rendering | Mature |
| **IgeCanvas2dRenderer** | Production-ready | 2D rendering | Mature |
| **IgeThreeJsRenderer** | Experimental | Alternative (not recommended) | Incomplete |
| **IgeWebGpuRenderer** | Prototype | Future graphics API | Very early |

## Success Metrics

The unified 3D renderer will be considered successful when:

1. **2D sprites work seamlessly in 3D space**
2. **3D models can be used as easily as 2D textures**
3. **Performance is suitable for both 2D and 3D games**
4. **Developer experience remains intuitive and simple**
5. **Single API works for all content types**
6. **Existing workflows require minimal changes**

## Conclusion

IGE has a solid and maturing 3D rendering system built on a custom WebGL renderer (`IgeWebGlRenderer`) with a comprehensive modular architecture including lighting, shadows, skeletal animation, GLTF/GLB loading, frustum culling, and render batching. This custom approach replaces the earlier experimental Three.js integration, providing maximum control over the rendering pipeline and performance.

This approach allows IGE to:

-   **Maintain full control** over the rendering pipeline without external 3D library dependencies
-   **Optimize specifically for IGE's needs** with custom shader management and render batching
-   **Keep bundle sizes small** by not requiring Three.js as a core dependency
-   **Maintain API simplicity** while gaining powerful 3D capabilities
-   **Provide a clear migration path** for existing 2D projects
-   **Future-proof the engine** with WebGPU exploration alongside the mature WebGL renderer
