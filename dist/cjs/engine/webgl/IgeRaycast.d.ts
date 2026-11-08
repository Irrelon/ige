import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
import type { IgeSkeleton } from "../../types/IgeSkeletonData.js"
type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/** A world-space ray; direction should be unit length so distances are in world units. */
export interface IgeRaycastRay {
    origin: Vec3;
    direction: Vec3;
}
/** One ray hit on an entity's mesh. */
export interface IgeRaycastHit {
    /** The entity whose mesh was hit. */
    entity: IgeEntity;
    /** Distance from the ray origin, in world units for a unit-length direction. */
    distance: number;
    /** World position of the hit. */
    point: Vec3;
    /** World normal of the hit triangle, facing the ray's origin. */
    normal: Vec3;
    /** Index of the hit triangle in the geometry. */
    triangle: number;
    /** The geometry that was hit (a model part's, or the entity's own). */
    geometry: IgeGeometryData3d;
}
export interface IgeRaycastOptions {
    /** Ignore hits further than this (default Infinity). */
    maxDistance?: number;
    /** Also test the targets' children (default true). */
    children?: boolean;
    /** Only test entities this returns true for (their children are still visited). */
    filter?: (entity: IgeEntity) => boolean;
}
/**
 * Nearest triangle a ray passes through (either side), in the vertices'
 * own space. Möller-Trumbore.
 * @returns The ray parameter t and the triangle index, or null.
 */
export declare function intersectTriangles(vertices: ArrayLike<number>, indices: ArrayLike<number> | undefined, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT?: number): {
    t: number;
    triangle: number;
} | null;
/** Inverse of a column-major 4x4 matrix, or null if it has none. */
export declare function invertMat4(m: ArrayLike<number>, out?: Float32Array): Float32Array | null;
/**
 * A skinned mesh's vertices in its current pose (model space), skinned on
 * the CPU the way the skinned shader does it.
 */
export declare function skinnedPositions(geometry: IgeGeometryData3d, skeleton: IgeSkeleton): Float32Array;
/**
 * Cast a world-space ray against the triangles of entities' meshes (their
 * own geometry and every model part) and, by default, their children's.
 * Skinned characters are tested in their current animated pose. Sprites
 * (textured quads without geometry) are not tested.
 * @returns Every hit, nearest first (at most one per mesh).
 */
export declare function raycastEntities(ray: IgeRaycastRay, targets: IgeEntity | IgeEntity[], options?: IgeRaycastOptions): IgeRaycastHit[];
export {};
