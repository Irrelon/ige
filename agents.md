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
    -   **Render Batch Management** (`IgeWebGlRenderBatchManager`) - batching optimization
    -   **Camera Controller** (`IgeWebGlCameraController`) - camera controls with preset support
    -   **Lighting** (`IgeWebGlLightManager`, `IgeWebGlLight`) - directional and point lights
    -   **Shadow Mapping** (`IgeWebGlShadowManager`) - shadow support
    -   **Skeletal Animation** (`IgeWebGlSkeletonManager`) - bone-based animations
    -   **GLTF/GLB Loading** (`IgeGltfLoader`) - 3D model loading
    -   **Material System** (`IgeWebGlMaterial`) - advanced materials
    -   **Frustum Culling** (`IgeFrustum`) - performance optimization
    -   **Primitive Geometry** (`IgePrimitiveGeometry`) - built-in shapes
    -   **State Management** (`IgeWebGlStateManager`) - WebGL state tracking
-   Used in multiple working examples: coordTest2d, coordTest3d, coordTestIso, skeletalAnimation, webGlRenderer, zombie-game

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
| `IgeWebGlRenderBatchManager.ts` | Batching optimization |
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
    - Frustum culling for 3D scenes (implemented)
    - Level-of-detail (LOD) systems
    - Instanced rendering for repeated objects
    - Render batching (implemented)

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
