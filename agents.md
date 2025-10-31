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

**Enable full 3D rendering while maintaining the simplicity of the current 2D workflow.**

Users should be able to:

```typescript
// This should work in both 2D and 3D modes
const entity = new IgeEntity()
	.texture(myTexture) // 2D texture
	.translateTo(100, 50, 25) // 3D positioning
	.mount(scene); // Simple mounting
```

### Key Requirements

1. **Backward Compatibility**: All existing 2D functionality must continue to work
2. **Unified API**: Same methods for both 2D and 3D rendering
3. **Progressive Enhancement**: 3D features should be additive, not replacements
4. **Performance**: 3D rendering should be performant enough for real games
5. **Simplicity**: Maintain IGE's ease of use philosophy

### Technical Goals

1. **Dual Rendering Support**:

    - Canvas 2D for 2D/isometric games
    - WebGL/Three.js for 3D games
    - Seamless switching between renderers

2. **3D Model Support**:

    - Load and render 3D models (GLTF, OBJ, etc.)
    - Assign 3D models to entities like textures
    - Support for materials, lighting, and shaders

3. **Enhanced Camera System**:

    - True 3D camera with perspective projection
    - Camera controls for 3D navigation
    - Maintain 2D camera compatibility

4. **Lighting System**:

    - Basic ambient, directional, and point lights
    - Integration with existing entity system
    - Optional for maintaining 2D compatibility

5. **Physics Integration**:
    - 3D physics support (potentially Cannon.js or similar)
    - Maintain existing 2D physics workflows

## Development Priorities

### Phase 1: Core 3D Infrastructure

1. **Enhance IgeThreeJsRenderer**:

    - Complete the experimental Three.js renderer
    - Add proper material and lighting support
    - Implement 3D model loading

2. **Extend Entity System**:

    - Add 3D model support alongside textures
    - Enhance material system for 3D rendering
    - Improve 3D transformation handling

3. **Camera Improvements**:
    - Add perspective projection for 3D cameras
    - Enhance camera controls for 3D navigation
    - Maintain backward compatibility

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

1. **Adding 3D Features**: Extend existing classes rather than replacing them
2. **Renderer Work**: Focus on `IgeThreeJsRenderer` for 3D improvements
3. **Entity Extensions**: Add 3D capabilities to `IgeEntity` class
4. **Asset Loading**: Enhance texture/asset systems for 3D content
5. **Camera Work**: Improve `IgeCamera` for 3D functionality

### Architecture Constraints

-   Must support both Canvas 2D and WebGL renderers
-   Entity system must remain simple and intuitive
-   Scene graph structure should remain unchanged
-   Transformation matrices must work for both 2D and 3D
-   Asset loading should be unified between 2D and 3D

## Current Challenges

1. **Renderer Abstraction**: Need better abstraction between 2D and 3D renderers
2. **Asset Pipeline**: 3D assets require different loading and management
3. **Performance**: 3D rendering is more demanding than 2D
4. **Complexity**: Maintaining simplicity while adding 3D features
5. **Compatibility**: Ensuring 2D workflows aren't disrupted

## Success Metrics

The 3D implementation will be considered successful when:

1. **Existing 2D games continue to work unchanged**
2. **Simple 3D games can be created with minimal code**
3. **Performance is suitable for real-time gameplay**
4. **Developer experience remains intuitive and simple**
5. **3D models can be used as easily as 2D textures**

## Conclusion

IGE has a solid foundation for 3D rendering with existing 3D positioning, transformation systems, and an experimental Three.js renderer. The goal is to build upon this foundation to create a unified 2D/3D game engine that maintains the simplicity and ease of use that makes IGE special, while providing the power and flexibility needed for modern 3D game development.
