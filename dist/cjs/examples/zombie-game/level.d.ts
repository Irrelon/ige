import { IgeEntity } from "../../engine/core/IgeEntity.js"
import type { IgeScene2d } from "../../engine/core/IgeScene2d.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
/** Axis-aligned footprint of a solid level object on the XZ plane. */
export interface IgeLevelObstacle {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}
/** Playable area inside the lobby walls. */
export declare const ARENA: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};
/**
 * Creates box geometry with arbitrary width, height, and depth.
 * Similar to IgePrimitiveGeometry.createCube but allows non-uniform dimensions.
 */
export declare function createBoxGeometry(w: number, h: number, d: number, id: string): IgeGeometryData3d;
/**
 * Builds the hospital lobby from box geometry and returns the footprints of
 * the solid furniture so characters can be kept out of it.
 *
 * Layout (top-down, Y is up): floor on the XZ plane, walls around the edge
 * with an entrance gap at the front, a reception desk at the back, pillars,
 * benches along the side walls and a few tables.
 */
export declare function createHospitalLobby(scene: IgeScene2d): {
    obstacles: IgeLevelObstacle[];
    root: IgeEntity;
};
/** Inner faces of the lobby walls. */
export declare const WALL_FACES: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
};
/**
 * Push a circle (radius r at x, z) out of any obstacle footprints and keep
 * it inside the arena. Returns the corrected position.
 */
export declare function resolveLevelCollision(x: number, z: number, r: number, obstacles: IgeLevelObstacle[]): {
    x: number;
    z: number;
};
