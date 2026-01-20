import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeEntity } from "../core/IgeEntity.js"
import { IgeWebGlMaterial } from "./IgeWebGlMaterial.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js"
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
    animations?: IgeGltfAnimation[];
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
export interface IgeGltfAnimation {
    name?: string;
    channels: any[];
    samplers: any[];
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
    protected _parseMeshes(gltf: any, buffers: ArrayBuffer[]): IgeGltfMesh[];
    /**
     * Parse a single mesh primitive.
     */
    protected _parsePrimitive(gltf: any, primitive: any, buffers: ArrayBuffer[], primitiveIndex?: number): IgeGeometryData3d;
    /**
     * Get typed array data from accessor.
     */
    protected _getAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array;
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
