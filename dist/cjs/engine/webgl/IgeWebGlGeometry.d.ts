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
    vertexData?: Float32Array;
    indexData?: Uint16Array | Uint32Array;
    isSkinned: boolean;
    skeletonId?: string;
    constructor(id: string, drawMode: number);
    /**
     * Add a vertex attribute descriptor.
     */
    addAttribute(name: string, size: number, type: number, normalized?: boolean, stride?: number, offset?: number): this;
    /**
     * Set vertex data.
     */
    setVertexData(data: Float32Array, count?: number): this;
    /**
     * Set index data.
     */
    setIndexData(data: Uint16Array | Uint32Array, count?: number): this;
}
