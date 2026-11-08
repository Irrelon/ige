import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
export interface IgeSimplifyOptions {
    /** Fraction of the triangles to keep (0-1). */
    ratio: number;
    /**
     * Largest surface deviation a collapse may introduce, as a fraction of
     * the mesh's bounding box diagonal (default 0.05). Simplification stops
     * early rather than exceed it, so a mesh can keep more triangles than
     * the ratio asks for.
     */
    maxError?: number;
    /** Id for the new geometry (default `${geometry.id}_lod${ratio}`). */
    id?: string;
}
/**
 * Reduce a mesh's triangle count with quadric-error edge collapses, for
 * level-of-detail models.
 *
 * Collapses are half-edge collapses: a vertex is merged into a neighbour
 * and no vertex is ever moved or created, so every attribute (normals,
 * UVs, colours, skin joints and weights) of the remaining vertices is kept
 * exactly and the result can be skinned by the same skeleton. Vertices that
 * share a position but differ in other attributes (UV seams, hard edges)
 * are collapsed together so seams stay closed, open borders only collapse
 * along themselves, and collapses that would fold a triangle over are
 * rejected.
 */
export declare function simplifyGeometry(geometry: IgeGeometryData3d, options: IgeSimplifyOptions): IgeGeometryData3d;
/**
 * Number of triangles in a geometry.
 */
export declare function triangleCount(geometry: IgeGeometryData3d): number;
