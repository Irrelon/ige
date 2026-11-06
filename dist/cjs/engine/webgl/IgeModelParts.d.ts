import type { IgeGltfModel } from "./IgeGltfLoader.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js";
import type { IgeMaterialData } from "../../types/IgeMaterialData.js"
import type { IgeSkeleton, IgeSkeletonData } from "../../types/IgeSkeletonData.js"
/**
 * One drawable piece of a model: a mesh primitive with its material and its
 * placement inside the model. Parts are shared by every entity that uses
 * the same model, so they must be treated as read-only.
 */
export interface IgeModelPart {
    geometryData: IgeGeometryData3d;
    materialData: IgeMaterialData;
    /**
     * Model-space transform of the primitive's node (column-major), or
     * undefined for identity. Skinned primitives are always identity: their
     * placement comes from the skeleton, as the glTF spec requires.
     */
    matrix?: Float32Array;
    /** True when the primitive is deformed by the model's skeleton. */
    skinned: boolean;
}
/**
 * Get the render parts for a loaded GLTF model (cached per model).
 * Walks the default scene's node hierarchy so every mesh instance is placed
 * with its node's global transform, and converts the loader's materials
 * into plain material data (including the base colour texture image).
 */
export declare function getModelParts(model: IgeGltfModel): IgeModelPart[];
/**
 * Create a runtime skeleton (pose buffers) for skeleton data. Entities each
 * need their own instance; the static data is shared.
 */
export declare function createSkeletonInstance(data: IgeSkeletonData): IgeSkeleton;
/**
 * Multiply two column-major 4x4 matrices: returns a * b.
 */
export declare function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array;
