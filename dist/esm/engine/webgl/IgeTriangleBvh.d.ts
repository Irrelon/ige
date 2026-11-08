import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
/**
 * A bounding volume hierarchy over a mesh's triangles: boxes nested down
 * to a few triangles each, so a ray or a box query only tests triangles
 * near it instead of every triangle in the mesh. Built once per geometry
 * (getTriangleBvh() caches it) for raycasts and decal projection against
 * large meshes such as terrain.
 */
export interface IgeTriangleBvh {
    /** Per node: minX, minY, minZ, maxX, maxY, maxZ. */
    bounds: Float32Array;
    /** Per node: first child index (inner node) or first entry in `order` (leaf), then the leaf's triangle count (0 for inner nodes). */
    nodes: Uint32Array;
    /** Triangle indices, grouped by leaf. */
    order: Uint32Array;
    nodeCount: number;
}
/** Triangle count of a geometry (indexed or not). */
export declare function triangleCountOf(geometry: IgeGeometryData3d): number;
/**
 * The BVH for a geometry's own vertices, built on first use and cached.
 * Geometry whose vertices are replaced gets a new one.
 */
export declare function getTriangleBvh(geometry: IgeGeometryData3d): IgeTriangleBvh;
/** Build a BVH (median split on the longest axis of the triangle centres). */
export declare function buildTriangleBvh(vertices: ArrayLike<number>, indices?: ArrayLike<number>): IgeTriangleBvh;
/**
 * Nearest triangle a ray passes through (either side), using the BVH.
 * Same result as testing every triangle.
 */
export declare function bvhRaycast(bvh: IgeTriangleBvh, vertices: ArrayLike<number>, indices: ArrayLike<number> | undefined, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT?: number): {
    t: number;
    triangle: number;
} | null;
/** Call fn for every triangle whose bounds may overlap an axis-aligned box. */
export declare function bvhQueryBox(bvh: IgeTriangleBvh, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, fn: (triangle: number) => void): void;
