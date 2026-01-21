import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeEntity } from "../core/IgeEntity.js"
import { IgeWebGlMaterial } from "./IgeWebGlMaterial.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
import type { IgeSkeletonData } from "../../types/IgeSkeletonData.js"
import type { IgeAnimationClipData } from "../../types/IgeAnimationClipData.js"
/**
 * GLTF skin data - links a skeleton to mesh vertices.
 */
export interface IgeGltfSkin {
    name?: string;
    /** Skeleton data with bone hierarchy */
    skeleton: IgeSkeletonData;
    /** Joint node indices from GLTF (for reference) */
    jointNodeIndices: number[];
}
/**
 * GLTF node data for skeleton hierarchy.
 */
export interface IgeGltfNode {
    name?: string;
    children?: number[];
    translation?: [number, number, number];
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    matrix?: number[];
    mesh?: number;
    skin?: number;
}
/**
 * Loaded GLTF model data.
 */
export interface IgeGltfModel {
    id: string;
    name: string;
    scenes: IgeGltfScene[];
    defaultSceneIndex: number;
    meshes: IgeGltfMesh[];
    materials: IgeWebGlMaterial[];
    skins?: IgeGltfSkin[];
    animations?: IgeAnimationClipData[];
    nodes?: IgeGltfNode[];
}
export interface IgeGltfScene {
    name?: string;
    nodeIndices: number[];
}
export interface IgeGltfMesh {
    name?: string;
    primitives: IgeGltfPrimitive[];
}
export interface IgeGltfPrimitive {
    geometry: IgeGeometryData3d;
    materialIndex?: number;
}
/**
 * GLTF/GLB model loader for WebGL renderer.
 * Supports GLTF 2.0 specification.
 */
export declare class IgeGltfLoader extends IgeBaseClass {
    classId: string;
    protected _modelCache: Map<string, IgeGltfModel>;
    /**
     * Load a GLTF or GLB model from URL.
     */
    load(url: string, modelId?: string): Promise<IgeGltfModel>;
    /**
     * Parse GLB binary format.
     */
    protected _parseGlb(buffer: ArrayBuffer): {
        json: any;
        binary: ArrayBuffer | null;
    };
    /**
     * Load external buffers referenced in GLTF.
     */
    protected _loadBuffers(gltf: any, baseUrl: string, embeddedBinary: ArrayBuffer | null): Promise<ArrayBuffer[]>;
    /**
     * Parse GLTF JSON data into model.
     */
    protected _parseGltf(gltf: any, buffers: ArrayBuffer[], baseUrl: string, modelId: string): Promise<IgeGltfModel>;
    /**
     * Parse materials from GLTF.
     */
    protected _parseMaterials(gltf: any): IgeWebGlMaterial[];
    /**
     * Parse meshes from GLTF.
     */
    protected _parseMeshes(gltf: any, buffers: ArrayBuffer[], skins: IgeGltfSkin[]): IgeGltfMesh[];
    /**
     * Parse a single mesh primitive.
     */
    protected _parsePrimitive(gltf: any, primitive: any, buffers: ArrayBuffer[], primitiveIndex?: number, skinIndex?: number, skins?: IgeGltfSkin[]): IgeGeometryData3d;
    /**
     * Get typed array data from accessor.
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    protected _getAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array;
    /**
     * Get accessor data as index array (Uint16Array or Uint32Array).
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    protected _getAccessorDataAsIndices(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Uint16Array | Uint32Array;
    /**
     * Get accessor data as Uint8Array (for bone indices).
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    protected _getAccessorDataAsUint8(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Uint8Array;
    /**
     * Parse GLTF nodes.
     */
    protected _parseNodes(gltf: any): IgeGltfNode[];
    /**
     * Parse GLTF skins (skeletons).
     */
    protected _parseSkins(gltf: any, buffers: ArrayBuffer[], nodes: IgeGltfNode[]): IgeGltfSkin[];
    /**
     * Get local transform matrix from a GLTF node.
     */
    protected _getNodeLocalTransform(nodeDef: any): Float32Array;
    /**
     * Compose a 4x4 matrix from translation, rotation (quaternion), and scale.
     */
    protected _composeMatrix(out: Float32Array, translation: number[], rotation: number[], scale: number[]): void;
    /**
     * Parse GLTF animations.
     */
    protected _parseAnimations(gltf: any, buffers: ArrayBuffer[], skins: IgeGltfSkin[]): IgeAnimationClipData[];
    /**
     * Create an IgeEntity hierarchy from a loaded model.
     */
    createEntity(model: IgeGltfModel, sceneIndex?: number): IgeEntity;
    /**
     * Check if a model is cached.
     */
    isCached(modelId: string): boolean;
    /**
     * Get a cached model.
     */
    getCached(modelId: string): IgeGltfModel | undefined;
    /**
     * Clear model cache.
     */
    clearCache(): void;
}
export declare const igeGltfLoader: IgeGltfLoader;
