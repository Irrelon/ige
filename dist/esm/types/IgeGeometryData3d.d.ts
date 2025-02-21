import type { IgeAbstractData3d } from "./IgeAbstractData3d.js"
/**
 * This type defines the structure of the geometry data object.
 * The geometry data object holds information about 3d vertex
 * data in an abstract way that should remain compatible with
 * different rendering systems like webgl and webgpu.
 */
export interface IgeGeometryData3d extends IgeAbstractData3d {
    id: string;
    type?: string;
    url?: string;
    data?: any;
}
