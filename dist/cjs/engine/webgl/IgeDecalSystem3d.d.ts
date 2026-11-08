import { IgeEntity } from "../core/IgeEntity.js"
import type { IgeTexture } from "../core/IgeTexture.js";
import type { IgeDecalTargetMesh } from "./IgeDecalProjector.js"
/** Floats per decal in renderData(): x, y, z, size, r, g, b, a, rotation, cell, 0, 0. */
export declare const DECAL_INSTANCE_FLOATS = 12;
/** Floats per vertex in meshRenderData(): x, y, z, u, v, r, g, b, a. */
export declare const DECAL_MESH_VERTEX_FLOATS = 9;
export interface IgeDecalSystem3dOptions {
    /** Most decals alive at once; adding more replaces the oldest (default 256). */
    maxDecals: number;
    /** Seconds a decal stays fully visible (default 30; Infinity keeps decals until replaced). */
    lifetime: number;
    /** Seconds a decal takes to fade out after its lifetime (default 4). */
    fadeTime: number;
    /**
     * "multiply" (default) darkens and tints the ground, so stains such as
     * blood or scorch marks take on the floor's lighting and shadows;
     * "normal" is ordinary alpha blending (for markings that should stay
     * visible in the dark, e.g. a target circle).
     */
    blending: "multiply" | "normal";
    /**
     * Decal texture: an atlas of atlasGrid x atlasGrid cells. Its alpha is
     * the decal's shape and its colour multiplies the decal colour. Without
     * one, a built-in 2x2 atlas of splats is used.
     */
    texture?: IgeTexture;
    /** Cells per side of the texture atlas (default 2 for the built-in splats, else 1). */
    atlasGrid?: number;
    /** Height above the position given to add() (default 0.5), against z-fighting with the ground. */
    lift: number;
    /**
     * Most projected decals (project()) alive at once; adding more
     * replaces the oldest (default 64). Each is its own small mesh, so they
     * cost more than flat decals.
     */
    maxProjected: number;
}
export interface IgeDecalOptions {
    /** Height of the ground at this point (default 0). */
    y?: number;
    /** Width and depth in world units (default 40). */
    size?: number;
    /** Rotation around the up axis in radians (default random). */
    rotation?: number;
    /** Colour (default dark red). */
    color?: {
        r: number;
        g: number;
        b: number;
    };
    /** Opacity 0-1 (default 0.9). */
    opacity?: number;
    /** Atlas cell to use (default random). */
    cell?: number;
}
export interface IgeProjectedDecalOptions {
    /** Width and height in world units (default 40). */
    size?: number;
    /** How far in front of and behind the position surfaces are covered (default half the size). */
    depth?: number;
    /** Rotation around the normal in radians (default random). */
    rotation?: number;
    /** Colour (default dark red). */
    color?: {
        r: number;
        g: number;
        b: number;
    };
    /** Opacity 0-1 (default 0.9). */
    opacity?: number;
    /** Atlas cell to use (default random). */
    cell?: number;
    /**
     * Surfaces turned more than this many degrees from the normal are left
     * out (default 75), e.g. the sides of a step under a floor splat. Use
     * about 100 to wrap over edges.
     */
    maxAngle?: number;
}
interface IgeProjectedDecal {
    vertices: Float32Array;
    r: number;
    g: number;
    b: number;
    opacity: number;
    age: number;
}
/**
 * The meshes of some entities and their descendants that a projected decal
 * can land on: plain geometry and the static parts of models. Hidden
 * entities and animated (skinned) parts are left out.
 */
export declare function collectDecalTargets(targets: IgeEntity | IgeEntity[]): IgeDecalTargetMesh[];
/**
 * Flat marks on the ground (blood, scorch marks, footprints, spell
 * circles) drawn as textured quads lying on the XZ plane. Every decal in a
 * system is drawn with one instanced draw call per viewport, after opaque
 * geometry, so characters standing on a decal hide it correctly.
 *
 * add() lays a decal flat at a given height: the cheapest kind, for flat
 * floors. project() wraps one over the surfaces of chosen entities (walls,
 * slopes, steps, uneven terrain) by clipping their triangles to the
 * decal; each projected decal is a small mesh, drawn with its system's
 * other projected decals in one call. Old decals fade out after their
 * lifetime, and when the system is full the oldest is replaced.
 * @example #Leave blood where a zombie dies
 *     const blood = new IgeDecalSystem3d({ maxDecals: 300 }).mount(scene);
 *     blood.add(zombie._translate.x, zombie._translate.z, { size: 90 });
 * @example #Splash a wall (normal points out of the wall) or uneven ground
 *     blood.project({ x: 400, y: 60, z: -200 }, { x: 0, y: 0, z: 1 }, wall, { size: 70 });
 *     blood.project(hitPoint, { x: 0, y: 1, z: 0 }, terrain, { size: 90 });
 */
export declare class IgeDecalSystem3d extends IgeEntity {
    classId: string;
    /** Marker the renderer uses to recognise decal systems. */
    readonly _isDecalSystem3d = true;
    _options: IgeDecalSystem3dOptions;
    _head: number;
    _count: number;
    _decalData: Float32Array;
    _decalAge: Float32Array;
    /** Packed per-decal render data (oldest first), rebuilt when it changes. */
    _renderData: Float32Array;
    /** Incremented whenever _renderData changes (renderer upload check). */
    _renderVersion: number;
    _dirty: boolean;
    /** World-space bounding sphere of the decals (for culling). */
    _boundsCenter: {
        x: number;
        y: number;
        z: number;
    };
    _boundsRadius: number;
    _projected: IgeProjectedDecal[];
    _meshRenderData: Float32Array;
    _meshVertexCount: number;
    /** Incremented whenever _meshRenderData changes (renderer upload check). */
    _meshRenderVersion: number;
    _meshDirty: boolean;
    _meshBoundsCenter: {
        x: number;
        y: number;
        z: number;
    };
    _meshBoundsRadius: number;
    constructor(options?: Partial<IgeDecalSystem3dOptions>);
    /** Cells per side of the atlas in use. */
    atlasGrid(): number;
    /**
     * Add a decal at a world position on the ground.
     * @param x World X.
     * @param z World Z.
     */
    add(x: number, z: number, options?: IgeDecalOptions): this;
    /**
     * Project a decal onto the surfaces of some entities and their
     * children: walls, slopes, steps, uneven terrain, props. Surfaces
     * facing the normal within the decal's box (size across, depth along
     * the normal) receive it; animated characters don't.
     * @param position World position of the decal's centre, on or near the surface.
     * @param normal Direction the decal faces: out of the surface (e.g. a
     * wall's normal, or the reverse of a shot's direction).
     * @param targets Entities whose meshes receive the decal.
     */
    project(position: {
        x: number;
        y: number;
        z: number;
    }, normal: {
        x: number;
        y: number;
        z: number;
    }, targets: IgeEntity | IgeEntity[], options?: IgeProjectedDecalOptions): this;
    /** Remove every decal. */
    clear(): this;
    /** Number of flat decals alive. */
    decalCount(): number;
    /** Number of projected decals alive. */
    projectedCount(): number;
    /**
     * Returns the packed projected decal triangles: DECAL_MESH_VERTEX_FLOATS
     * floats per vertex (x, y, z, u, v, r, g, b, a), three per triangle.
     */
    meshRenderData(): {
        data: Float32Array;
        vertexCount: number;
    };
    /**
     * Gets / sets options at runtime. Changing maxDecals after
     * construction has no effect.
     */
    options(): IgeDecalSystem3dOptions;
    options(options: Partial<IgeDecalSystem3dOptions>): this;
    update(tickDelta: number): void;
    /**
     * Returns the packed render data and decal count. Each decal uses
     * DECAL_INSTANCE_FLOATS floats: x, y, z, size, r, g, b, a, rotation,
     * atlas cell, 0, 0.
     */
    renderData(): {
        data: Float32Array;
        count: number;
    };
    /**
     * Age decals, drop the expired ones and rebuild the render data when
     * anything visible changed (adds, removals or fading).
     */
    _age(dt: number): void;
    _rebuildMeshRenderData(): void;
    _rebuildRenderData(): void;
}
export {};
