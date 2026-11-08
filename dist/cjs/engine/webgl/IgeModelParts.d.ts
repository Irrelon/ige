import type { IgeGltfModel } from "./IgeGltfLoader.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
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
 * One level of detail for a model, used while the model is small on screen.
 * Give either a ratio (the level is generated from the model with
 * simplifyGeometry) or a separately authored model.
 */
export interface IgeModelLodLevel {
    /**
     * Use this level (or a lower one) when the model's on-screen size, the
     * projected diameter of its bounding sphere in device pixels (about
     * the height of a standing character), is below this value.
     */
    screenSize: number;
    /** Fraction of the model's triangles to keep (0-1). */
    ratio?: number;
    /**
     * Error limit for a generated level, as a fraction of the mesh size
     * (see IgeSimplifyOptions.maxError).
     */
    maxError?: number;
    /**
     * An authored lower-detail model instead of a generated one. It must
     * have the same parts in the same order as the full model, and skinned
     * parts must use the same skeleton.
     */
    model?: IgeGltfModel;
    /**
     * For entities drawn from _geometryData (no model): an authored
     * lower-detail geometry, e.g. a simpler version of a terrain chunk.
     */
    geometry?: IgeGeometryData3d;
}
/**
 * Levels of detail prepared for rendering.
 */
export interface IgeModelLod {
    /** Thresholds in descending order: level i + 1 is used below screenSizes[i]. */
    screenSizes: number[];
    /** For each model part, its geometry at each lower level (parallel to screenSizes). */
    partGeometries: IgeGeometryData3d[][];
    /**
     * For plain-geometry LOD: the geometry the levels belong to. The
     * renderer ignores the levels once the entity's _geometryData changes.
     */
    source?: IgeGeometryData3d;
}
/**
 * Build the level-of-detail geometry for a model. Generated levels are
 * cached per mesh, so every entity using the same model and settings
 * shares the same simplified meshes (and GPU buffers).
 */
export declare function getModelLod(model: IgeGltfModel, levels: IgeModelLodLevel[]): IgeModelLod | undefined;
/**
 * Build level-of-detail geometry for a single plain geometry (an entity
 * drawn from _geometryData). Levels use `ratio` (generated, cached per
 * geometry) or `geometry` (authored).
 */
export declare function getGeometryLod(geometry: IgeGeometryData3d, levels: IgeModelLodLevel[]): IgeModelLod | undefined;
/**
 * Forget the generated LOD meshes of a geometry and return them, so their
 * GPU buffers can be released along with it.
 */
export declare function takeGeneratedLods(geometry: IgeGeometryData3d): IgeGeometryData3d[];
/**
 * Create a runtime skeleton (pose buffers) for skeleton data. Entities each
 * need their own instance; the static data is shared.
 */
export declare function createSkeletonInstance(data: IgeSkeletonData): IgeSkeleton;
/**
 * Multiply two column-major 4x4 matrices: returns a * b.
 */
export declare function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array;
