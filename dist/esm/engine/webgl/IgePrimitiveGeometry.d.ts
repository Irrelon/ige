import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
/**
 * Utility class for generating primitive 3D geometries.
 */
export declare class IgePrimitiveGeometry {
    /**
     * Create a cube geometry with proper normals for lighting.
     * @param size The size of the cube (default 1)
     * @param id Optional ID for the geometry
     */
    static createCube(size?: number, id?: string): IgeGeometryData3d;
    /**
     * Create a sphere geometry with proper normals for lighting.
     * @param radius The radius of the sphere (default 1)
     * @param segments Number of horizontal segments (default 16)
     * @param rings Number of vertical rings (default 16)
     * @param id Optional ID for the geometry
     */
    static createSphere(radius?: number, segments?: number, rings?: number, id?: string): IgeGeometryData3d;
    /**
     * Create a plane geometry (quad) with proper normals.
     * @param width Width of the plane (default 1)
     * @param height Height of the plane (default 1)
     * @param id Optional ID for the geometry
     */
    static createPlane(width?: number, height?: number, id?: string): IgeGeometryData3d;
}
