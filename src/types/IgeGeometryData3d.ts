import type { IgeAbstractData3d } from "@/types/IgeAbstractData3d";

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
	indices?: Uint16Array | Uint32Array; // Index data for indexed rendering

	// Skinning data for skeletal animation
	boneWeights?: Float32Array; // 4 weights per vertex (WEIGHTS_0)
	boneIndices?: Uint8Array; // 4 bone indices per vertex (JOINTS_0)
	skinIndex?: number; // Reference to GLTF skin index
	skeletonId?: string; // Reference to skeleton data ID

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
