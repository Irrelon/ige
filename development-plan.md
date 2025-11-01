# IGE 3D Renderer Migration - Development Plan

## Executive Summary

This document outlines the strategic plan to migrate Isogenic Game Engine (IGE) from its current Canvas 2D rendering
system to a unified Three.js-based 3D renderer that seamlessly supports both 2D sprites and 3D models, maintaining IGE's
signature ease of use while enabling modern 3D game development.

## Current State Analysis

### What We Have ✅

1. **Solid 3D Foundation**:
    - All entities already support 3D positioning via `IgePoint3d` (`_translate`, `_bounds3d`)
    - 3D transformation matrices and world position calculations
    - Depth sorting algorithms for isometric rendering which will probably no longer be required since 3d rendering
      would allow us to use the z-buffer
      hopefully even when rendering 2d sprites that only "appear" 3d
    - Geometry, material, and mesh data properties in `IgeObject`

2. **Working Three.js Prototype**:
    - `IgeThreeJsRenderer` class with basic functionality - this can be thrown away if we want to do a different, more
      performant integration and this existing work is deemed insufficient or inadequate
    - 2D sprite rendering as textured 3D planes
    - Working example with 150 entities animating in 3D space
    - Pixel scaling normalization between IGE and Three.js coordinate systems

3. **Mature Entity System**:
    - Robust scene graph with parent/child relationships
    - Entity lifecycle management
    - Texture and asset loading systems
    - Tween animation support

4. **Client/Server Architecture**:
    - Robust multiplayer functionality and a server-led game system
    - Clients provide actions, server provides updates to clients
    - Synchronised simulation where the server is canonical

### What Needs Work 🔧

1. **Renderer Integration**:
    - Three.js renderer is experimental, needs to become primary and properly integrated,
      supporting all the existing 2d functionality and extending to support 3d functionality as well
    - Canvas 2D renderer needs to become an optional renderer rather than the primary one
    - Scene graph integration needs completion
    - Camera system needs 3D enhancement

2. **API Gaps**:
    - Methods for dealing with 3D content in a way that unifies the
      developer experience for 2D and 3D
    - Material system not unified between 2D/3D
    - Asset pipeline only handles 2D textures
    - Camera lacks perspective/orthographic modes and most functionality assumes a 2d view

3. **Developer Experience**:
    - Existing 2d projects should work with minimal changes
    - Documentation focused on 2D workflows
    - Examples primarily 2D-based but include 3d examples too

## Strategic Approach

### Philosophy: Unity/Unreal Pattern

Following the successful pattern of modern game engines:

- **Single unified 3D renderer** handles all content
- **2D sprites rendered as textured 3D planes** in 3D space
- **Same API works for both 2D and 3D content**
- **Progressive enhancement** - 2D workflows work unchanged or with minor changes

### Why Three.js?

**Benefits**:

- Mature 3D model loading (GLTF/GLB, OBJ, FBX)
- Comprehensive material and lighting systems
- Built-in shader support and customization
- Active community and extensive documentation
- Regular updates and performance improvements
- Allows IGE to focus on game development experience

**Alternative**: Custom WebGL renderer

## Development Phases

### Phase 1: Foundation Migration

**Objective**: Replace Canvas 2D renderer with Three.js as the primary renderer

#### Core Renderer Completion

- **Implement ThreeJS as the rendering engine**
    - Implement proper viewport and scene management
    - Add complete scene graph traversal
    - Implement 2D sprite rendering as textured planes
    - Add automatic billboarding support for sprite-like behavior

- **Camera System Enhancement**
    - Add perspective and orthographic camera modes
    - Implement 2D camera mode (orthographic, locked Z-axis)
    - Create isometric camera presets
    - Maintain API compatibility with existing `IgeCamera` usage

#### Entity System Unification

- **Unified Content Support**
    - Are the IgeObject geometryData, materialData and meshData a good way to go or should we use
        a model() getter setter?
    - Enhance `.texture()` method to work seamlessly with 3D content or maybe switch to something like materialData()?
    - Implement automatic geometry generation for 2D sprites (we already assign a quad)
    - Create unified material system for both content types

- **Asset Pipeline Enhancement**
    - Extend `IgeTexture` for 3D material support
      - One of the complexities is how to continue supporting 2d "smart textures" where 
            the developer can create 2d textures on a 2d canvas that the engine can use
            just like an image. Is this still possible with a 3d sprite and threejs?
    - Implement GLTF/GLB model loading system or add helpers to utilise threejs methods under the hood?
    - Create unified asset management for textures and models
    - Add material configuration and management

#### Integration & Testing

- **Scene Graph Integration**
    - Complete Three.js scene synchronization with IGE scene graph
    - Implement proper entity mounting/unmounting in 3D space
    - Add transformation synchronization between IGE and Three.js objects
    - Test depth sorting in 3D space

- **Backward Compatibility**
    - Ensure all existing 2D examples work unchanged or with minor changes
    - Test isometric rendering in 3D space
    - Verify texture and animation systems
    - Performance benchmarking vs Canvas 2D

### Phase 2: API Enhancement (3-4 weeks)

**Objective**: Provide unified, intuitive API for both 2D and 3D content

#### Week 1-2: Material System

- **PBR Material Support**

    - Implement Physically Based Rendering materials
    - Add texture mapping (diffuse, normal, specular, roughness)
    - Create material editor/configuration system
    - Support both simple color materials and complex PBR materials

- **Lighting System**
    - Basic ambient, directional, and point lights
    - Light entity types that integrate with IGE scene graph
    - Shadow mapping support
    - Optional lighting for maintaining 2D compatibility

#### Week 3-4: Advanced Features

- **3D Model Support**

    - Complete GLTF/GLB loader integration
    - Add support for animated models
    - Implement model material override system
    - Add model bounds calculation for collision

- **Performance Optimization**
    - Implement frustum culling for 3D scenes
    - Add object pooling for frequently created/destroyed entities
    - Optimize 2D sprite rendering in 3D space
    - Level-of-detail (LOD) system for models

### Phase 3: Developer Experience (2-3 weeks)

**Objective**: Excellent developer experience and smooth migration path

#### Week 1-2: Documentation & Examples

- **Updated Documentation**

    - 3D development guides and tutorials
    - Migration guides from 2D to 3D workflows
    - Best practices documentation
    - API reference updates

- **Example Projects**
    - Mixed 2D/3D game example
    - Pure 3D game example
    - 2D game running in 3D space example
    - Model loading and animation example

#### Week 2-3: Migration Tools

- **Migration Support**
    - Canvas 2D to Three.js migration guide
    - Automated migration scripts where possible
    - Compatibility testing tools
    - Performance comparison tools

### Phase 4: Advanced Features (4-5 weeks)

**Objective**: Advanced 3D features for modern game development

#### Weeks 1-2: Physics Integration

- **3D Physics Support**
    - Integrate Cannon.js or similar for 3D physics
    - Maintain existing 2D physics workflows
    - Unified physics API for both 2D and 3D
    - Physics debugging visualization

#### Weeks 3-4: Advanced Rendering

- **Post-Processing Effects**
    - Built-in post-processing pipeline
    - Common effects (bloom, SSAO, tone mapping)
    - Custom shader support
    - Effect entity types

#### Week 5: Tooling

- **Development Tools**
    - 3D scene inspector/debugger
    - Asset preview tools
    - Performance profiler for 3D
    - Live camera controls for development

## Technical Implementation Details

### API Design

```typescript
// 2D sprite in 3D space (current workflow continues to work)
const sprite = new IgeEntity()
	.texture(myTexture) // 2D texture on 3D plane
	.translateTo(100, 50, 25) // 3D positioning
	.rotateTo(0, 0, Math.PI / 4) // 3D rotation
	.mount(scene);

// 3D model (new capability)
const model = new IgeEntity()
	.model(my3dModel) // 3D model instead of texture
	.material(pbrMaterial) // Optional material override
	.translateTo(100, 50, 25) // Same positioning API
	.mount(scene); // Same mounting API

// Mixed content (sprites and models together)
const ui = new IgeEntity()
	.texture(buttonTexture) // 2D UI in 3D space
	.billboarding(true) // Always face camera
	.translateTo(0, 0, 10) // Float above 3D content
	.mount(hudScene);
```

### Camera System

```typescript
// 2D camera mode (for existing workflows)
const camera2d = new IgeCamera()
	.mode("orthographic")
	.lockAxis("z") // Prevent Z movement
	.translateTo(0, 0, 100);

// 3D camera mode
const camera3d = new IgeCamera().mode("perspective").fov(75).translateTo(0, 0, 100).lookAt(playerEntity);

// Isometric camera (enhanced for 3D)
const cameraIso = new IgeCamera()
	.preset("isometric") // Predefined isometric angle
	.mode("orthographic")
	.followEntity(playerEntity);
```

### Asset Loading

```typescript
// Unified asset loading
await ige.assets.load([
	{ id: "playerSprite", url: "player.png", type: "texture" },
	{ id: "enemyModel", url: "enemy.gltf", type: "model" },
	{ id: "skybox", url: "sky.hdr", type: "hdri" }
]);

// Usage
const player = new IgeEntity().texture(ige.assets.get("playerSprite")).mount(scene);

const enemy = new IgeEntity().model(ige.assets.get("enemyModel")).mount(scene);
```

## Migration Strategy

### For Existing IGE Projects

1. **Phase 1: Automatic Migration**
    - Existing 2D projects work unchanged or with minor changes
    - Canvas 2D renderer becomes optional but 3D renderer is default

2. **Phase 2: Enhanced Features**
    - Gradual adoption of 3D features
    - Optional lighting and materials - good defaults should exist for existing 2d projects
    - Enhanced camera controls

3. **Phase 3: Full 3D**
    - Add 3D models to existing scenes
    - Leverage 3D physics and effects
    - Modern 3D game development capabilities

### Breaking Changes (Minimal)

- **Minor in Phase 1** - Existing APIs continue to work with maybe slight changes
- **Optional in Phase 2** - New features are easy to adopt into existing games
- **Configuration in Phase 3** - Advanced features may require setup

## Risk Mitigation

### Performance Concerns

- **Mitigation**: Extensive benchmarking, optimization passes
- **Fallback**: Canvas 2D renderer remains available but doesn't support 3d functionality

### Three.js Dependency

- **Mitigation**: Three.js is peer dependency, well-maintained, large community
- **Alternative**: Custom WebGL renderer (significantly more work)
- **Action**: Ensure that renderer integration is abstracted so that different renderers can be added in the future

### API Complexity

- **Mitigation**: Maintain simple defaults, progressive enhancement
- **Testing**: Extensive testing with existing codebase

### Learning Curve

- **Mitigation**: Comprehensive documentation, migration guides, examples
- **Support**: Active community support during transition

## Success Metrics

### Technical Metrics

-   [ ] All existing 2D examples work unchanged or with minor changes
-   [ ] Performance parity or better vs Canvas 2D for 2D content
-   [ ] 3D models render correctly with proper materials and lighting
-   [ ] Memory usage remains reasonable for both 2D and 3D content
-   [ ] Frame rate targets: 60fps for typical 2D games, 30fps+ for 3D games

### Developer Experience Metrics

-   [ ] Migration from Canvas 2D takes < 1 hour for simple projects
-   [ ] New 3D features accessible within first hour of learning
-   [ ] API consistency - same patterns work for 2D and 3D
-   [ ] Documentation completeness and clarity
-   [ ] Community adoption and feedback

### Feature Completeness

-   [ ] 2D sprites work seamlessly in 3D space
-   [ ] 3D models load and render correctly
-   [ ] Mixed 2D/3D scenes render properly
-   [ ] Camera system supports all required modes
-   [ ] Asset pipeline handles both 2D and 3D content
-   [ ] Performance is suitable for real games

## Next Steps

1. **Immediate (Week 1)**:

    - Complete `IgeThreeJsRenderer` viewport management
    - Implement proper scene graph synchronization
    - Add 2D sprite rendering as textured planes

2. **Short Term (Weeks 2-4)**:

    - Camera system enhancement for 3D support
    - Unified entity API with `.model()` method
    - Basic material system for both 2D and 3D

3. **Medium Term (Weeks 5-8)**:
    - Asset pipeline enhancement for 3D models
    - Backward compatibility testing
    - Performance optimization

The development plan prioritizes maintaining IGE's core philosophy of simplicity while leveraging Three.js to provide
modern 3D capabilities. By following this phased approach, we can deliver a unified renderer that makes 3D game
development as intuitive as IGE's current 2D workflow.
