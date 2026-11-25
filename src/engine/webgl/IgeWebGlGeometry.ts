import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeGpuBuffer, IgeGpuRenderPipeline, IgeGpuVertexBufferLayout, IgeGpuVertexFormat } from "@/engine/gpu/IgeGpuDevice";

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
	/** Its format on the GPU device (float32 of `size` components when not given). */
	format?: IgeGpuVertexFormat;
}

/**
 * Geometry wrapper class for WebGL.
 * Encapsulates vertex and index buffers with their layouts.
 */
export class IgeWebGlGeometry extends IgeBaseClass {
	classId = "IgeWebGlGeometry";

	static _nextUid: number = 1;

	id: string;
	/** Unique number per GPU geometry (cheap identity for checksums). */
	uid: number = IgeWebGlGeometry._nextUid++;
	/** Its vertex and index buffers on the GPU device. */
	gpuVertex?: IgeGpuBuffer;
	gpuIndex?: IgeGpuBuffer;
	/** Its vertex layout on the device, and a key naming it (meshLayout() makes it). */
	gpuLayout?: { layout: IgeGpuVertexBufferLayout; key: string };
	/** Its depth passes' pipelines, by kind (point light or not, skinned or not, instanced or not). */
	gpuDepthPipelines?: (IgeGpuRenderPipeline | undefined)[];
	/** Its main pass pipelines, by kind and how they're drawn. */
	gpuLitPipelines?: (IgeGpuRenderPipeline | undefined)[];
	/** The GL buffers behind gpuVertex and gpuIndex, for the passes not yet drawing through the device. */
	vertexBuffer: WebGLBuffer | null = null;
	indexBuffer: WebGLBuffer | null = null;
	vertexCount: number = 0;
	indexCount: number = 0;
	attributes: IgeWebGlVertexAttribute[] = [];
	drawMode: number; // GL draw mode (TRIANGLES, TRIANGLE_STRIP, etc.)
	/** GL index type for drawElements (UNSIGNED_SHORT or UNSIGNED_INT). */
	indexType: number = 0x1403;
	/** Whether the vertex buffer has an a_color attribute. */
	hasVertexColors: boolean = false;
	/** Has a tangent attribute (a_tangent), so a normal map can be applied. */
	hasTangents: boolean = false;
	/**
	 * Quantised positions' decode as a matrix (column-major): drawn with world × this. Bounds are in the mesh's own
	 * units, so culling uses the world matrix alone.
	 */
	positionDecode?: Float32Array;
	/** Quantised texture coordinates' decode (scale u, v, offset u, v), folded into the material's texture transform. */
	uvDecode?: [number, number, number, number];
	/** Bytes its vertex and index buffers take on the GPU. */
	gpuBytes: number = 0;

	// Skinning information
	isSkinned: boolean = false; // Whether this geometry has bone weights/indices
	skeletonId?: string; // Reference to skeleton data ID

	// Local-space bounding sphere used for frustum and shadow culling.
	// A radius of -1 means unknown (the item is never culled).
	boundsCenterX: number = 0;
	boundsCenterY: number = 0;
	boundsCenterZ: number = 0;
	boundsRadius: number = -1;
	// Local-space half sizes of its bounding box (round the bounds centre); the radius each way when only a sphere is known
	boundsHalfX: number = -1;
	boundsHalfY: number = -1;
	boundsHalfZ: number = -1;
	// Radius of the mesh as authored. boundsRadius is padded for skinned
	// meshes so animated poses stay inside it; level-of-detail selection
	// uses this one, which roughly matches the model's visible size.
	meshRadius: number = -1;

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
		offset: number = 0,
		format?: IgeGpuVertexFormat
	): this {
		this.attributes.push({
			name,
			size,
			type,
			normalized,
			stride,
			offset,
			format
		});
		return this;
	}

	/**
	 * Record the vertex count of the uploaded vertex buffer. The data
	 * itself isn't kept: once on the GPU the CPU copy is only memory.
	 */
	setVertexData(data: ArrayBufferView | ArrayBuffer, count?: number): this {
		this.vertexCount = count ?? (data as Float32Array).length ?? 0;
		return this;
	}

	/**
	 * Record the index count and type of the uploaded index buffer (the
	 * data itself isn't kept).
	 */
	setIndexData(data: Uint16Array | Uint32Array, count?: number): this {
		this.indexType = data instanceof Uint32Array ? 0x1405 : 0x1403;
		this.indexCount = count ?? data.length;
		return this;
	}
}
