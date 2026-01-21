import { IgeBaseClass } from "@/engine/core/IgeBaseClass";

/**
 * Vertex attribute descriptor.
 */
export interface IgeWebGlVertexAttribute {
	name: string;
	size: number; // Number of components (1, 2, 3, or 4)
	type: number; // GL type (FLOAT, INT, etc.)
	normalized: boolean;
	stride: number; // Bytes between consecutive attributes
	offset: number; // Byte offset of first component
}

/**
 * Geometry wrapper class for WebGL.
 * Encapsulates vertex and index buffers with their layouts.
 */
export class IgeWebGlGeometry extends IgeBaseClass {
	classId = "IgeWebGlGeometry";

	id: string;
	vertexBuffer: WebGLBuffer | null = null;
	indexBuffer: WebGLBuffer | null = null;
	vertexCount: number = 0;
	indexCount: number = 0;
	attributes: IgeWebGlVertexAttribute[] = [];
	drawMode: number; // GL draw mode (TRIANGLES, TRIANGLE_STRIP, etc.)
	vertexData?: Float32Array;
	indexData?: Uint16Array | Uint32Array;

	// Skinning information
	isSkinned: boolean = false; // Whether this geometry has bone weights/indices
	skeletonId?: string; // Reference to skeleton data ID

	constructor(id: string, drawMode: number) {
		super();
		this.id = id;
		this.drawMode = drawMode;
	}

	/**
	 * Add a vertex attribute descriptor.
	 */
	addAttribute(
		name: string,
		size: number,
		type: number,
		normalized: boolean = false,
		stride: number = 0,
		offset: number = 0
	): this {
		this.attributes.push({
			name,
			size,
			type,
			normalized,
			stride,
			offset
		});
		return this;
	}

	/**
	 * Set vertex data.
	 */
	setVertexData(data: Float32Array, count?: number): this {
		this.vertexData = data;
		this.vertexCount = count ?? data.length;
		return this;
	}

	/**
	 * Set index data.
	 */
	setIndexData(data: Uint16Array | Uint32Array, count?: number): this {
		this.indexData = data;
		this.indexCount = count ?? data.length;
		return this;
	}
}
