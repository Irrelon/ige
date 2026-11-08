import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Vertex attribute descriptor.
 */
export interface IgeWebGlVertexAttribute {
    name: string;
    size: number;
    type: number;
    normalized: boolean;
    stride: number;
    offset: number;
}
/**
 * Geometry wrapper class for WebGL.
 * Encapsulates vertex and index buffers with their layouts.
 */
export declare class IgeWebGlGeometry extends IgeBaseClass {
    classId: string;
    id: string;
    vertexBuffer: WebGLBuffer | null;
    indexBuffer: WebGLBuffer | null;
    vertexCount: number;
    indexCount: number;
    attributes: IgeWebGlVertexAttribute[];
    drawMode: number;
    /** GL index type for drawElements (UNSIGNED_SHORT or UNSIGNED_INT). */
    indexType: number;
    /** Whether the vertex buffer has an a_color attribute. */
    hasVertexColors: boolean;
    isSkinned: boolean;
    skeletonId?: string;
    boundsCenterX: number;
    boundsCenterY: number;
    boundsCenterZ: number;
    boundsRadius: number;
    meshRadius: number;
    constructor(id: string, drawMode: number);
    /**
     * Add a vertex attribute descriptor.
     */
    addAttribute(name: string, size: number, type: number, normalized?: boolean, stride?: number, offset?: number): this;
    /**
     * Record the vertex count of the uploaded vertex buffer. The data
     * itself isn't kept: once on the GPU the CPU copy is only memory.
     */
    setVertexData(data: Float32Array, count?: number): this;
    /**
     * Record the index count and type of the uploaded index buffer (the
     * data itself isn't kept).
     */
    setIndexData(data: Uint16Array | Uint32Array, count?: number): this;
}
