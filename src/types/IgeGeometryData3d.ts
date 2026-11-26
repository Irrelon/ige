import type { IgeAbstractData3d } from "@/types/IgeAbstractData3d";
import type { IgePackedVertices, IgeVertexEncodings } from "@/engine/webgl/IgeVertexPacking";

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

	// Vertex arrays for WebGL rendering
	vertices?: Float32Array; // Position data (x, y, z)
	normals?: Float32Array; // Normal data (nx, ny, nz)
	uvs?: Float32Array; // Texture coordinates (u, v)
	tangents?: Float32Array; // Tangent data for normal mapping
	colors?: Float32Array; // Vertex colors (r, g, b, a)
	/**
	 * What the vertex colours are, for linear lighting (IgeWebGlRenderer.linearLighting(); without it this changes
	 * nothing): "srgb" (the default: picked as colours are picked, by eye, in hex or CSS) is decoded to linear light as
	 * each vertex is drawn; "linear" is used as it is (glTF's COLOR_0, linear by the glTF spec, so the loader sets it).
	 */
	colorSpace?: "srgb" | "linear";
	indices?: Uint16Array | Uint32Array; // Index data for indexed rendering

	// Skinning data for skeletal animation
	boneWeights?: Float32Array; // 4 weights per vertex (WEIGHTS_0)
	boneIndices?: Uint8Array; // 4 bone indices per vertex (JOINTS_0)
	skinIndex?: number; // Reference to GLTF skin index
	skeletonId?: string; // Reference to skeleton data ID

	/**
	 * The vertices already interleaved in the layout the renderer uploads
	 * (packVertices(), quantiseGeometry(), mergeGeometry()), e.g. built in a
	 * worker: uploaded as they are, without repacking on the main thread.
	 * Used in place of the arrays above when both are present.
	 */
	packed?: IgePackedVertices;

	/**
	 * How the renderer packs the arrays when it uploads them (float32 for
	 * any not given). A quantised glTF sets this so its vertices stay
	 * compact on the GPU; see IgeVertexPacking.
	 */
	vertexEncodings?: IgeVertexEncodings;

	/**
	 * Set by IgeWebGlRenderer.discardGeometryArrays(): the vertex arrays
	 * were freed after upload and the renderer draws its GPU copy.
	 */
	gpuOnly?: boolean;

	/**
	 * Set by IgeWebGlRenderer.discardGeometryArrays() on a mesh waiting in
	 * the upload queue: its arrays are freed once it's uploaded.
	 */
	discardAfterUpload?: boolean;

	// Bounding information
	boundingBox?: {
		min: [number, number, number];
		max: [number, number, number];
	};
	boundingSphere?: {
		center: [number, number, number];
		radius: number;
	};
}
