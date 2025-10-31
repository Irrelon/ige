# IGE (Isogenic Game Engine) - Project Agents Guide

## Project Overview

The Isogenic Game Engine (IGE) is a custom 2D/isometric game engine written in TypeScript for creating games using web technologies. The engine currently supports 2D and isometric rendering via Canvas 2D, but the ultimate goal is to expand it to support full 3D rendering using WebGL/Three.js while maintaining the simplicity and ease of use that makes IGE special.

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
-   Currently designed for 2D but has 3D positioning support

#### **IgeCamera** (`src/engine/core/IgeCamera.ts`)

-   Controls the viewpoint within a viewport
-   Supports tracking entities for smooth camera movement
-   Has 3D transformation support (translate, rotate, scale)
-   Currently optimized for 2D but architecture supports 3D

#### **IgeTexture** (`src/engine/core/IgeTexture.ts`)

-   Handles loading and rendering of 2D images/textures
-   Supports cell-based sprite sheets
-   Uses Canvas 2D for rendering currently
-   Needs extension for 3D texture mapping

### 3D Support Infrastructure

The engine already has significant 3D infrastructure in place:

1. **3D Positioning**: All entities support 3D coordinates via `IgePoint3d`
2. **3D Bounds**: Entities have `_bounds3d` for 3D collision and depth sorting
3. **Isometric Rendering**: Built-in support for pseudo-3D isometric views
4. **Depth Sorting**: Multiple algorithms for proper 3D object ordering
5. **Geometry Data**: `_geometryData` property for storing 3D mesh information
6. **Material Data**: `_materialData` property for 3D material properties
7. **Mesh Data**: `_meshData` property for renderer-specific 3D objects

### Current Rendering System

#### **IgeCanvas2dRenderer** (`src/engine/core/IgeCanvas2dRenderer.ts`)

-   Extends `IgeBaseRenderer` for Canvas 2D rendering
-   Handles viewport management and scene graph traversal
-   Renders entities using their textures and transformation matrices
-   Optimized for 2D but supports isometric projection

#### **IgeThreeJsRenderer** (`src/engine/core/IgeThreeJsRenderer.ts`)

-   **EXPERIMENTAL** - Three.js WebGL renderer implementation
-   Demonstrates 3D rendering capability with actual 3D meshes
-   Converts IGE entity properties to Three.js objects
-   Handles geometry, material, and mesh creation
-   Shows how 2D textures can be mapped to 3D planes

### Three.js Example Implementation

The `src/examples/threeJsRenderer/` directory contains a working prototype that:

-   Creates 150 entities with 3D positioning and rotation
-   Uses Three.js for true 3D WebGL rendering
-   Maps 2D textures to 3D plane geometries
-   Demonstrates smooth animation in 3D space
-   Shows how existing IGE entities can work in 3D

## Ultimate Project Goals

### Primary Objective

**Transition to a unified 3D renderer that can handle both 2D and 3D content seamlessly, similar to modern game engines like Unity and Unreal Engine.**

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
2. **Unified Renderer**: Single 3D renderer handles all content types
3. **Performance**: WebGL/3D rendering performant enough for real games
4. **Simplicity**: Maintain IGE's ease of use philosophy
5. **Backward Compatibility**: Existing 2D workflows continue to work

### Technical Strategy

1. **Unified 3D Renderer**:

    - **Recommended**: Continue with Three.js as the foundation
    - **Alternative**: Custom WebGL renderer (significantly more work)
    - **Rationale**: Three.js provides mature 3D model loading, materials, lighting, and shader systems
    - 2D sprites rendered as textured planes in 3D space
    - 3D models rendered natively
    - Single rendering pipeline for all content

2. **Three.js Integration Benefits**:

    - Mature GLTF/GLB model loading
    - Comprehensive material and lighting systems
    - Built-in shader support and customization
    - Active community and extensive documentation
    - Regular updates and performance improvements
    - Focus development on game engine features, not low-level 3D rendering

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

### Phase 1: Unified Renderer Foundation

1. **Complete IgeThreeJsRenderer as Primary Renderer**:

    - Replace Canvas 2D renderer with Three.js renderer
    - Implement 2D sprite rendering as textured 3D planes
    - Add proper material and lighting support
    - Implement 3D model loading (GLTF/GLB)

2. **Unified Entity System**:

    - Support both `.texture()` for 2D sprites and `.model()` for 3D content
    - Unified material system for both content types
    - Automatic geometry generation for 2D sprites
    - Enhanced transformation handling in 3D space

3. **Camera System Evolution**:
    - Implement perspective and orthographic cameras
    - Add 2D camera mode (orthographic, locked Z-axis)
    - Create isometric camera presets
    - Maintain API compatibility for existing camera usage

### Phase 2: Asset Pipeline

1. **3D Asset Loading**:

    - GLTF loader for 3D models
    - Texture loading for 3D materials
    - Asset management for 3D resources

2. **Material System**:
    - PBR (Physically Based Rendering) materials
    - Texture mapping (diffuse, normal, specular)
    - Material editor/configuration

### Phase 3: Advanced Features

1. **Lighting System**:

    - Dynamic lighting for 3D scenes
    - Shadow mapping
    - Light entity types

2. **Performance Optimization**:
    - Frustum culling for 3D scenes
    - Level-of-detail (LOD) systems
    - Instanced rendering for repeated objects

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

### Key Files to Understand

-   `src/engine/core/IgeEntity.ts` - Core entity class
-   `src/engine/core/IgeObject.ts` - Base object class
-   `src/engine/core/IgeThreeJsRenderer.ts` - 3D renderer implementation
-   `src/engine/core/IgeCanvas2dRenderer.ts` - 2D renderer implementation
-   `src/examples/threeJsRenderer/` - Working 3D example

### Common Tasks

1. **Renderer Migration**: Transition from Canvas 2D to unified Three.js renderer
2. **Entity Enhancement**: Add unified 2D/3D content support to `IgeEntity`
3. **Asset Pipeline**: Implement unified loading for textures and 3D models
4. **Camera Modernization**: Enhance `IgeCamera` for true 3D with 2D compatibility modes
5. **API Unification**: Ensure same methods work for both 2D and 3D content

### Architecture Constraints

-   Single unified 3D renderer (likely Three.js based)
-   Entity system must remain simple and intuitive
-   Scene graph structure should remain unchanged
-   Same transformation APIs for 2D sprites and 3D models
-   Unified asset loading for textures and 3D models

## Current Challenges

1. **Renderer Migration**: Transitioning from Canvas 2D to unified 3D renderer
2. **Asset Pipeline**: Unified loading for both 2D textures and 3D models
3. **Performance**: Ensuring 3D renderer performs well for 2D content
4. **Complexity vs Simplicity**: Leveraging Three.js power while maintaining IGE simplicity
5. **Migration Path**: Smooth transition for existing IGE users

## Success Metrics

The unified 3D renderer will be considered successful when:

1. **2D sprites work seamlessly in 3D space**
2. **3D models can be used as easily as 2D textures**
3. **Performance is suitable for both 2D and 3D games**
4. **Developer experience remains intuitive and simple**
5. **Single API works for all content types**
6. **Existing workflows require minimal changes**

## Conclusion

IGE has a solid foundation for 3D rendering with existing 3D positioning, transformation systems, and an experimental Three.js renderer. The strategic decision is to transition to a unified 3D renderer (built on Three.js) that can handle both 2D sprites and 3D models seamlessly, following the successful pattern of modern game engines like Unity and Unreal Engine.

This approach allows IGE to:

-   **Focus on game development experience** rather than low-level 3D rendering complexities
-   **Leverage Three.js's mature ecosystem** for model loading, materials, and lighting
-   **Maintain API simplicity** while gaining powerful 3D capabilities
-   **Provide a clear migration path** for existing 2D projects
-   **Future-proof the engine** for modern game development needs

The goal is to create a game engine where developers can seamlessly mix 2D sprites and 3D models using the same simple, intuitive API that makes IGE special.
