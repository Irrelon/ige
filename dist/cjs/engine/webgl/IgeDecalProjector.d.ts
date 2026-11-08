import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
/** Where and how a decal is projected (see projectDecal()). */
export interface IgeDecalProjection {
    /** World position at the centre of the decal (on or near the surface). */
    position: {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Direction the decal faces: out of the surface, towards where it was
     * "sprayed" from (e.g. a wall's normal, or the reverse of a bullet's
     * direction). The decal covers surfaces facing this way.
     */
    normal: {
        x: number;
        y: number;
        z: number;
    };
    /** Width and height of the decal in world units. */
    size: number;
    /** How far in front of and behind the position surfaces are covered. */
    depth: number;
    /** Rotation around the normal in radians. */
    rotation: number;
    /**
     * Surfaces turned further than this from the normal (radians) are left
     * out, so a splat on a floor doesn't smear down the side of a step.
     */
    maxAngle: number;
    /** Distance the decal is lifted off each surface, against z-fighting. */
    lift: number;
}
/** A mesh the decal can land on: geometry and its world matrix. */
export interface IgeDecalTargetMesh {
    geometry: IgeGeometryData3d;
    /** Column-major 4x4 world matrix. */
    matrix: Float32Array | number[];
}
/** Floats per vertex in projectDecal()'s output: x, y, z, u, v. */
export declare const PROJECTED_DECAL_VERTEX_FLOATS = 5;
/**
 * Build the decal's axes: n (out of the surface), t and b across it. On a
 * floor t starts along world X; on a wall b points up.
 */
export declare function decalAxes(normal: {
    x: number;
    y: number;
    z: number;
}, rotation: number): {
    n: {
        x: number;
        y: number;
        z: number;
    };
    t: {
        x: number;
        y: number;
        z: number;
    };
    b: {
        x: number;
        y: number;
        z: number;
    };
};
/**
 * Project a decal onto meshes: every triangle that faces the decal and
 * reaches into its box (size x size across, depth along the normal) is
 * clipped to the box and returned as world-space triangles with decal
 * UVs (0-1 across the decal). This is how marks follow walls, steps and
 * uneven terrain; animated (skinned) meshes should not be passed.
 * @returns x, y, z, u, v per vertex (PROJECTED_DECAL_VERTEX_FLOATS), three
 * vertices per triangle.
 */
export declare function projectDecal(meshes: IgeDecalTargetMesh[], projection: IgeDecalProjection): Float32Array;
