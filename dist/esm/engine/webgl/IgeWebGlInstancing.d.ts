import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeTexture } from "../core/IgeTexture.js";
import type { IgeWebGlGeometry } from "./IgeWebGlGeometry.js"
import type { IgeWebGlProgram } from "./IgeWebGlProgram.js";
import type { IgeMaterialData } from "../../types/IgeMaterialData.js"
import type { IgeSkeleton } from "../../types/IgeSkeletonData.js"
/**
 * Resolved per-draw material values. Parsed once per item per frame so the
 * hot render loops never touch CSS colour strings or optional chains.
 */
export interface IgeWebGlResolvedMaterial {
    r: number;
    g: number;
    b: number;
    a: number;
    metallic: number;
    roughness: number;
    emissiveR: number;
    emissiveG: number;
    emissiveB: number;
    emissiveIntensity: number;
    opacity: number;
}
/**
 * One drawable mesh for the current frame: an entity (or one primitive of an
 * entity's model) together with everything the renderer needs to cull,
 * batch and draw it. Items are pooled and rewritten every frame.
 */
export interface IgeWebGlRenderItem {
    entity: IgeEntity;
    geometry: IgeWebGlGeometry;
    /** Source material data (entity or model primitive). */
    materialData: IgeMaterialData | null;
    material: IgeWebGlResolvedMaterial;
    /** Texture from the GLTF texture cache (createTextureFromBlob id). */
    blobTextureId?: string;
    /** IgeTexture assigned to the entity, used when there is no blob texture. */
    texture?: IgeTexture;
    /** Batch key component describing the texture. */
    textureKey: string;
    skeleton?: IgeSkeleton;
    /** Row in the bone palette texture (instanced skinned draws), -1 if none. */
    boneRow: number;
    transparent: boolean;
    /** Never back-face culled (material doubleSided). */
    doubleSided: boolean;
    castShadow: boolean;
    /** Column-major world matrix (entity._worldMatrix4.matrix). */
    worldMatrix: Float32Array;
    /** World-space bounding sphere. */
    cx: number;
    cy: number;
    cz: number;
    radius: number;
    /** Squared distance to the current camera (transparent sorting). */
    sortKey: number;
    /** Main pass batch key: geometry + texture (+ skinned flag). */
    batchKey: string;
    /** Shadow pass batch key: geometry (+ skinned flag); textures don't matter. */
    depthKey: string;
    /**
     * Level-of-detail thresholds (device pixels, descending) when the item
     * has lower-detail geometry, else null. Level i + 1 is drawn below
     * lodSizes[i]; each pass picks its own level.
     */
    lodSizes: number[] | null;
    /** World-space radius of the full mesh as authored, for LOD selection. */
    lodRadius: number;
    /** Geometry per level (index 0 is `geometry`). */
    lodGeometries: IgeWebGlGeometry[];
    /** batchKey per level. */
    lodBatchKeys: string[];
    /** depthKey per level. */
    lodDepthKeys: string[];
    /** Geometry chosen for the current viewport (transparent items). */
    drawGeometry: IgeWebGlGeometry;
    /** Level of detail chosen for the current viewport (0 = full). */
    lodLevel: number;
}
/**
 * A group of render items that can share one geometry binding and,
 * when the hardware allows it, a single instanced draw call.
 */
export interface IgeWebGlItemBatch {
    key: string;
    geometry: IgeWebGlGeometry;
    /** First item's texture info; every item in the batch shares it. */
    blobTextureId?: string;
    texture?: IgeTexture;
    skinned: boolean;
    items: IgeWebGlRenderItem[];
}
/**
 * Groups render items into batches by a caller-supplied key. Batch objects
 * and their item arrays are reused across frames to keep the per-frame
 * allocation count near zero.
 */
export declare class IgeWebGlItemBatcher {
    protected _batchMap: Map<string, IgeWebGlItemBatch>;
    protected _active: IgeWebGlItemBatch[];
    /** Batches that received at least one item since the last begin(). */
    get batches(): IgeWebGlItemBatch[];
    begin(): void;
    /**
     * Add an item to the batch for `key`. `geometry` is the mesh to draw it
     * with (a level-of-detail version of item.geometry, for example); it
     * must be the same for every item sharing a key.
     */
    add(item: IgeWebGlRenderItem, key: string, geometry?: IgeWebGlGeometry): void;
    /** Drop all cached batch objects (e.g. after a context loss). */
    clear(): void;
}
/** Floats per instance: mat4 world + colour + emissive + material. */
export declare const INSTANCE_FLOATS = 28;
/**
 * Streams per-instance data (world matrix + material values) for instanced
 * draws. The buffer is re-specified for every batch, which lets the driver
 * orphan the previous storage instead of stalling on in-flight draws.
 */
export declare class IgeWebGlInstanceBuffer {
    protected _gl: WebGL2RenderingContext;
    protected _buffer: WebGLBuffer | null;
    protected _data: Float32Array;
    protected _boundLocations: number[];
    constructor(gl: WebGL2RenderingContext);
    /**
     * Write the instance data for a list of items into the GPU buffer.
     */
    upload(items: IgeWebGlRenderItem[], start: number, count: number): void;
    /**
     * Point the program's instance attributes at the buffer (divisor 1).
     * Must be called after upload() and after the geometry's own attributes
     * have been bound, since this rebinds ARRAY_BUFFER.
     */
    bind(program: IgeWebGlProgram): void;
    /**
     * Reset divisors and disable the instance attributes. Divisor state is
     * global per attribute index (no VAOs are in use), so leaving it set
     * would corrupt later non-instanced draws that reuse the index.
     */
    unbind(): void;
    destroy(): void;
}
/**
 * Bone palette texture for instanced skinned meshes. Each skinned item that
 * is rendered this frame gets one row; each bone uses four RGBA32F texels
 * (the four columns of its skin matrix). The texture is uploaded once per
 * frame and shared by every viewport and shadow pass.
 */
export declare class IgeWebGlBonePalette {
    /** Texels per row (4 per bone). */
    static readonly WIDTH: number;
    protected _gl: WebGL2RenderingContext;
    protected _texture: WebGLTexture | null;
    protected _height: number;
    protected _data: Float32Array;
    protected _rows: number;
    protected _uploadedRows: number;
    constructor(gl: WebGL2RenderingContext);
    get texture(): WebGLTexture | null;
    get width(): number;
    get height(): number;
    /** Start a new frame; rows are reassigned from zero. */
    begin(): void;
    /**
     * Copy a skeleton's skin matrices into the next free row and return the
     * row index for the instance attribute.
     */
    addSkeleton(skeleton: IgeSkeleton): number;
    /**
     * Upload any rows written since the last upload, growing the texture
     * when needed. Binds the texture to `unit` as a side effect.
     */
    upload(unit: number): void;
    destroy(): void;
}
