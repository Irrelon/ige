import type { IgeAbstractData3d } from "./IgeAbstractData3d.js"
/**
 * This type defines the structure of the geometry data object.
 * The geometry data object holds information about 3d vertex
 * data in an abstract way that should remain compatible with
 * different rendering systems like webgl and webgpu.
 */
export interface IgeGeometryData3d extends IgeAbstractData3d {
    id: string;
    type?: "vertexArr" | "gltf" | "primitive";
    url?: string;
    data?: any;
    vertices?: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    tangents?: Float32Array;
    colors?: Float32Array;
    indices?: Uint16Array | Uint32Array;
    boneWeights?: Float32Array;
    boneIndices?: Uint8Array;
    boundingBox?: {
        min: [number, number, number];
        max: [number, number, number];
    };
    boundingSphere?: {
        center: [number, number, number];
        radius: number;
    };
}
