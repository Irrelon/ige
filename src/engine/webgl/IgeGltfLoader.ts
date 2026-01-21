import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlMaterial, IgeWebGlPBRMaterial } from "@/engine/webgl/IgeWebGlMaterial";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type {
	IgeBone,
	IgeSkeleton,
	IgeSkeletonData
} from "@/types/IgeSkeletonData";
import type {
	IgeAnimationClipData,
	IgeAnimationSampler,
	IgeAnimationChannel,
	IgeAnimationInterpolation,
	IgeAnimationTargetPath
} from "@/types/IgeAnimationClipData";

/**
 * GLTF Accessor component types.
 */
enum GltfComponentType {
	BYTE = 5120,
	UNSIGNED_BYTE = 5121,
	SHORT = 5122,
	UNSIGNED_SHORT = 5123,
	UNSIGNED_INT = 5125,
	FLOAT = 5126
}

/**
 * GLTF Accessor types and their component counts.
 */
const GLTF_TYPE_SIZES: Record<string, number> = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
	MAT2: 4,
	MAT3: 9,
	MAT4: 16
};

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
	rotation?: [number, number, number, number]; // quaternion
	scale?: [number, number, number];
	matrix?: number[]; // 4x4 matrix
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

// IgeGltfAnimation is now IgeAnimationClipData from types

/**
 * GLTF/GLB model loader for WebGL renderer.
 * Supports GLTF 2.0 specification.
 */
export class IgeGltfLoader extends IgeBaseClass {
	classId = "IgeGltfLoader";

	// Cache loaded models
	protected _modelCache: Map<string, IgeGltfModel> = new Map();

	/**
	 * Load a GLTF or GLB model from URL.
	 */
	async load(url: string, modelId?: string): Promise<IgeGltfModel> {
		const id = modelId || url;

		// Check cache
		if (this._modelCache.has(id)) {
			return this._modelCache.get(id)!;
		}

		this.log(`Loading GLTF model: ${url}`);

		// Determine if GLB or GLTF
		const isGlb = url.toLowerCase().endsWith(".glb");

		let gltfData: any;
		let binaryData: ArrayBuffer | null = null;

		if (isGlb) {
			// Load GLB binary format
			const response = await fetch(url);
			const buffer = await response.arrayBuffer();
			const result = this._parseGlb(buffer);
			gltfData = result.json;
			binaryData = result.binary;
		} else {
			// Load GLTF JSON format
			const response = await fetch(url);
			gltfData = await response.json();
		}

		// Get base URL for relative paths
		const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

		// Load binary buffers if not GLB
		const buffers = await this._loadBuffers(gltfData, baseUrl, binaryData);

		// Parse the GLTF data
		const model = await this._parseGltf(gltfData, buffers, baseUrl, id);

		// Cache and return
		this._modelCache.set(id, model);
		this.log(`GLTF model loaded: ${model.name} with ${model.meshes.length} meshes`);

		return model;
	}

	/**
	 * Parse GLB binary format.
	 */
	protected _parseGlb(buffer: ArrayBuffer): { json: any; binary: ArrayBuffer | null } {
		const dataView = new DataView(buffer);

		// Read header
		const magic = dataView.getUint32(0, true);
		if (magic !== 0x46546c67) {
			// "glTF"
			throw new Error("Invalid GLB file: incorrect magic number");
		}

		const version = dataView.getUint32(4, true);
		if (version !== 2) {
			throw new Error(`Unsupported GLB version: ${version}`);
		}

		// const totalLength = dataView.getUint32(8, true);

		// Read JSON chunk
		let offset = 12;
		const jsonChunkLength = dataView.getUint32(offset, true);
		const jsonChunkType = dataView.getUint32(offset + 4, true);

		if (jsonChunkType !== 0x4e4f534a) {
			// "JSON"
			throw new Error("Invalid GLB: first chunk must be JSON");
		}

		const jsonData = new Uint8Array(buffer, offset + 8, jsonChunkLength);
		const jsonText = new TextDecoder().decode(jsonData);
		const json = JSON.parse(jsonText);

		// Read binary chunk (if present)
		let binary: ArrayBuffer | null = null;
		offset += 8 + jsonChunkLength;

		if (offset < buffer.byteLength) {
			const binaryChunkLength = dataView.getUint32(offset, true);
			const binaryChunkType = dataView.getUint32(offset + 4, true);

			if (binaryChunkType === 0x004e4942) {
				// "BIN\0"
				binary = buffer.slice(offset + 8, offset + 8 + binaryChunkLength);
			}
		}

		return { json, binary };
	}

	/**
	 * Load external buffers referenced in GLTF.
	 */
	protected async _loadBuffers(
		gltf: any,
		baseUrl: string,
		embeddedBinary: ArrayBuffer | null
	): Promise<ArrayBuffer[]> {
		const buffers: ArrayBuffer[] = [];

		if (!gltf.buffers) return buffers;

		for (let i = 0; i < gltf.buffers.length; i++) {
			const bufferDef = gltf.buffers[i];

			if (embeddedBinary && i === 0 && !bufferDef.uri) {
				// GLB embedded binary
				buffers.push(embeddedBinary);
			} else if (bufferDef.uri) {
				if (bufferDef.uri.startsWith("data:")) {
					// Base64 encoded data URI
					const base64 = bufferDef.uri.split(",")[1];
					const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
					buffers.push(binary.buffer);
				} else {
					// External file
					const response = await fetch(baseUrl + bufferDef.uri);
					buffers.push(await response.arrayBuffer());
				}
			}
		}

		return buffers;
	}

	/**
	 * Parse GLTF JSON data into model.
	 */
	protected async _parseGltf(
		gltf: any,
		buffers: ArrayBuffer[],
		baseUrl: string,
		modelId: string
	): Promise<IgeGltfModel> {
		// Parse nodes first (needed for skeleton hierarchy)
		const nodes = this._parseNodes(gltf);

		// Parse materials
		const materials = this._parseMaterials(gltf);

		// Parse skins (skeletons)
		const skins = this._parseSkins(gltf, buffers, nodes);

		// Parse meshes (pass skins for skinning data)
		const meshes = this._parseMeshes(gltf, buffers, skins);

		// Parse animations
		const animations = this._parseAnimations(gltf, buffers, skins);

		// Parse scenes
		const scenes: IgeGltfScene[] = [];
		if (gltf.scenes) {
			for (const sceneDef of gltf.scenes) {
				scenes.push({
					name: sceneDef.name,
					nodeIndices: sceneDef.nodes || []
				});
			}
		}

		const model: IgeGltfModel = {
			id: modelId,
			name: gltf.asset?.name || modelId,
			scenes,
			defaultSceneIndex: gltf.scene || 0,
			meshes,
			materials,
			nodes
		};

		// Add skins and animations if present
		if (skins.length > 0) {
			model.skins = skins;
		}
		if (animations.length > 0) {
			model.animations = animations;
		}

		return model;
	}

	/**
	 * Parse materials from GLTF.
	 */
	protected _parseMaterials(gltf: any): IgeWebGlMaterial[] {
		const materials: IgeWebGlMaterial[] = [];

		if (!gltf.materials) {
			// Create default material
			const defaultMat = new IgeWebGlMaterial("default");
			defaultMat.color(0.8, 0.8, 0.8, 1);
			materials.push(defaultMat);
			return materials;
		}

		for (const matDef of gltf.materials) {
			const material = new IgeWebGlPBRMaterial(matDef.name);
			material.name(matDef.name || "Untitled");

			// Parse PBR metallic-roughness
			if (matDef.pbrMetallicRoughness) {
				const pbr = matDef.pbrMetallicRoughness;

				// Base color
				if (pbr.baseColorFactor) {
					material.color(
						pbr.baseColorFactor[0],
						pbr.baseColorFactor[1],
						pbr.baseColorFactor[2],
						pbr.baseColorFactor[3] ?? 1
					);
				}

				// Metallic and roughness
				if (pbr.metallicFactor !== undefined) {
					material.metallic(pbr.metallicFactor);
				}
				if (pbr.roughnessFactor !== undefined) {
					material.roughness(pbr.roughnessFactor);
				}
			}

			// Parse emissive
			if (matDef.emissiveFactor) {
				material.emissiveColor(
					matDef.emissiveFactor[0],
					matDef.emissiveFactor[1],
					matDef.emissiveFactor[2]
				);
			}

			// Parse alpha mode
			if (matDef.alphaMode === "BLEND") {
				material.blendMode("transparent" as any);
			}

			// Parse double-sided
			if (matDef.doubleSided) {
				material.cullMode("none" as any);
			}

			materials.push(material);
		}

		return materials;
	}

	/**
	 * Parse meshes from GLTF.
	 */
	protected _parseMeshes(gltf: any, buffers: ArrayBuffer[], skins: IgeGltfSkin[]): IgeGltfMesh[] {
		const meshes: IgeGltfMesh[] = [];

		if (!gltf.meshes) return meshes;

		// Build a map of mesh index to skin index from nodes
		const meshSkinMap = new Map<number, number>();
		if (gltf.nodes) {
			for (const node of gltf.nodes) {
				if (node.mesh !== undefined && node.skin !== undefined) {
					meshSkinMap.set(node.mesh, node.skin);
				}
			}
		}

		let primitiveIndex = 0;
		for (let meshIndex = 0; meshIndex < gltf.meshes.length; meshIndex++) {
			const meshDef = gltf.meshes[meshIndex];
			const primitives: IgeGltfPrimitive[] = [];
			const skinIndex = meshSkinMap.get(meshIndex);

			for (const primDef of meshDef.primitives) {
				const geometry = this._parsePrimitive(gltf, primDef, buffers, primitiveIndex++, skinIndex, skins);
				primitives.push({
					geometry,
					materialIndex: primDef.material
				});
			}

			meshes.push({
				name: meshDef.name,
				primitives
			});
		}

		return meshes;
	}

	/**
	 * Parse a single mesh primitive.
	 */
	protected _parsePrimitive(
		gltf: any,
		primitive: any,
		buffers: ArrayBuffer[],
		primitiveIndex: number = 0,
		skinIndex?: number,
		skins?: IgeGltfSkin[]
	): IgeGeometryData3d {
		const geometry: IgeGeometryData3d = {
			id: `gltf_primitive_${Date.now()}_${primitiveIndex}`,
			type: "gltf"
		};

		// Parse vertex positions (required)
		if (primitive.attributes.POSITION !== undefined) {
			geometry.vertices = this._getAccessorData(gltf, primitive.attributes.POSITION, buffers);
		}

		// Parse normals
		if (primitive.attributes.NORMAL !== undefined) {
			geometry.normals = this._getAccessorData(gltf, primitive.attributes.NORMAL, buffers);
		}

		// Parse texture coordinates
		if (primitive.attributes.TEXCOORD_0 !== undefined) {
			geometry.uvs = this._getAccessorData(gltf, primitive.attributes.TEXCOORD_0, buffers);
		}

		// Parse vertex colors
		if (primitive.attributes.COLOR_0 !== undefined) {
			geometry.colors = this._getAccessorData(gltf, primitive.attributes.COLOR_0, buffers);
		}

		// Parse tangents
		if (primitive.attributes.TANGENT !== undefined) {
			geometry.tangents = this._getAccessorData(gltf, primitive.attributes.TANGENT, buffers);
		}

		// Parse skinning data (bone indices and weights)
		if (primitive.attributes.JOINTS_0 !== undefined) {
			// JOINTS_0 should be UNSIGNED_BYTE or UNSIGNED_SHORT
			geometry.boneIndices = this._getAccessorDataAsUint8(gltf, primitive.attributes.JOINTS_0, buffers);
		}

		if (primitive.attributes.WEIGHTS_0 !== undefined) {
			geometry.boneWeights = this._getAccessorData(gltf, primitive.attributes.WEIGHTS_0, buffers);
		}

		// Link to skin/skeleton if this mesh has skinning
		if (skinIndex !== undefined && skins && skins[skinIndex]) {
			geometry.skinIndex = skinIndex;
			geometry.skeletonId = skins[skinIndex].skeleton.id;
		}

		// Parse indices - use specialized method for integer data
		if (primitive.indices !== undefined) {
			geometry.indices = this._getAccessorDataAsIndices(gltf, primitive.indices, buffers);
		}

		return geometry;
	}

	/**
	 * Get typed array data from accessor.
	 * Note: We copy data to new arrays to avoid byte alignment issues.
	 */
	protected _getAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array {
		const accessor = gltf.accessors[accessorIndex];
		const bufferView = gltf.bufferViews[accessor.bufferView];
		const buffer = buffers[bufferView.buffer];

		const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
		const componentCount = GLTF_TYPE_SIZES[accessor.type];
		const elementCount = accessor.count * componentCount;

		// Get raw bytes first to avoid alignment issues
		const rawBytes = new Uint8Array(buffer, byteOffset);

		// Create appropriate typed array based on component type
		// We copy data to new arrays to avoid byte alignment issues
		switch (accessor.componentType) {
			case GltfComponentType.FLOAT: {
				const result = new Float32Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 4);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getFloat32(i * 4, true); // little-endian
				}
				return result;
			}
			case GltfComponentType.UNSIGNED_SHORT: {
				const result = new Float32Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 2);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getUint16(i * 2, true);
				}
				return result;
			}
			case GltfComponentType.UNSIGNED_INT: {
				const result = new Float32Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 4);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getUint32(i * 4, true);
				}
				return result;
			}
			case GltfComponentType.UNSIGNED_BYTE: {
				const result = new Float32Array(elementCount);
				for (let i = 0; i < elementCount; i++) {
					result[i] = rawBytes[i];
				}
				return result;
			}
			case GltfComponentType.SHORT: {
				const result = new Float32Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 2);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getInt16(i * 2, true);
				}
				return result;
			}
			case GltfComponentType.BYTE: {
				const result = new Float32Array(elementCount);
				const signedBytes = new Int8Array(buffer, byteOffset, elementCount);
				for (let i = 0; i < elementCount; i++) {
					result[i] = signedBytes[i];
				}
				return result;
			}
			default:
				throw new Error(`Unsupported accessor component type: ${accessor.componentType}`);
		}
	}

	/**
	 * Get accessor data as index array (Uint16Array or Uint32Array).
	 * Note: We copy data to new arrays to avoid byte alignment issues.
	 */
	protected _getAccessorDataAsIndices(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Uint16Array | Uint32Array {
		const accessor = gltf.accessors[accessorIndex];
		const bufferView = gltf.bufferViews[accessor.bufferView];
		const buffer = buffers[bufferView.buffer];

		const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
		const elementCount = accessor.count;

		switch (accessor.componentType) {
			case GltfComponentType.UNSIGNED_INT: {
				const result = new Uint32Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 4);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getUint32(i * 4, true);
				}
				return result;
			}
			case GltfComponentType.UNSIGNED_SHORT: {
				const result = new Uint16Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 2);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getUint16(i * 2, true);
				}
				return result;
			}
			case GltfComponentType.UNSIGNED_BYTE: {
				// Convert to Uint16Array for WebGL compatibility
				const result = new Uint16Array(elementCount);
				const rawBytes = new Uint8Array(buffer, byteOffset, elementCount);
				for (let i = 0; i < elementCount; i++) {
					result[i] = rawBytes[i];
				}
				return result;
			}
			default:
				throw new Error(`Unsupported index accessor type: ${accessor.componentType}`);
		}
	}

	/**
	 * Get accessor data as Uint8Array (for bone indices).
	 * Note: We copy data to new arrays to avoid byte alignment issues.
	 */
	protected _getAccessorDataAsUint8(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Uint8Array {
		const accessor = gltf.accessors[accessorIndex];
		const bufferView = gltf.bufferViews[accessor.bufferView];
		const buffer = buffers[bufferView.buffer];

		const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
		const componentCount = GLTF_TYPE_SIZES[accessor.type];
		const elementCount = accessor.count * componentCount;

		// JOINTS_0 can be UNSIGNED_BYTE or UNSIGNED_SHORT
		switch (accessor.componentType) {
			case GltfComponentType.UNSIGNED_BYTE: {
				// Copy to new array to avoid alignment issues
				const rawBytes = new Uint8Array(buffer, byteOffset, elementCount);
				const result = new Uint8Array(elementCount);
				result.set(rawBytes);
				return result;
			}
			case GltfComponentType.UNSIGNED_SHORT: {
				// Convert UNSIGNED_SHORT to UNSIGNED_BYTE using DataView for safety
				const result = new Uint8Array(elementCount);
				const dataView = new DataView(buffer, byteOffset, elementCount * 2);
				for (let i = 0; i < elementCount; i++) {
					result[i] = dataView.getUint16(i * 2, true); // Should fit since bone count < 256
				}
				return result;
			}
			default:
				throw new Error(`Unsupported JOINTS accessor type: ${accessor.componentType}`);
		}
	}

	/**
	 * Parse GLTF nodes.
	 */
	protected _parseNodes(gltf: any): IgeGltfNode[] {
		const nodes: IgeGltfNode[] = [];

		if (!gltf.nodes) return nodes;

		for (const nodeDef of gltf.nodes) {
			nodes.push({
				name: nodeDef.name,
				children: nodeDef.children,
				translation: nodeDef.translation,
				rotation: nodeDef.rotation,
				scale: nodeDef.scale,
				matrix: nodeDef.matrix,
				mesh: nodeDef.mesh,
				skin: nodeDef.skin
			});
		}

		return nodes;
	}

	/**
	 * Parse GLTF skins (skeletons).
	 */
	protected _parseSkins(gltf: any, buffers: ArrayBuffer[], nodes: IgeGltfNode[]): IgeGltfSkin[] {
		const skins: IgeGltfSkin[] = [];

		if (!gltf.skins) return skins;

		for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
			const skinDef = gltf.skins[skinIndex];
			const jointNodeIndices: number[] = skinDef.joints || [];
			const boneCount = jointNodeIndices.length;

			// Get inverse bind matrices
			let inverseBindMatrices: Float32Array;
			if (skinDef.inverseBindMatrices !== undefined) {
				inverseBindMatrices = this._getAccessorData(gltf, skinDef.inverseBindMatrices, buffers);
			} else {
				// Default to identity matrices
				inverseBindMatrices = new Float32Array(boneCount * 16);
				for (let i = 0; i < boneCount; i++) {
					const offset = i * 16;
					inverseBindMatrices[offset] = 1;
					inverseBindMatrices[offset + 5] = 1;
					inverseBindMatrices[offset + 10] = 1;
					inverseBindMatrices[offset + 15] = 1;
				}
			}

			// Build bone hierarchy
			const bones: IgeBone[] = [];

			// Create a map from node index to bone index
			const nodeIndexToBoneIndex = new Map<number, number>();
			for (let i = 0; i < jointNodeIndices.length; i++) {
				nodeIndexToBoneIndex.set(jointNodeIndices[i], i);
			}

			// Build bones array
			for (let boneIndex = 0; boneIndex < boneCount; boneIndex++) {
				const nodeIndex = jointNodeIndices[boneIndex];
				const nodeDef = gltf.nodes[nodeIndex];

				// Find parent bone index
				let parentIndex = -1;
				for (let i = 0; i < gltf.nodes.length; i++) {
					const potentialParent = gltf.nodes[i];
					if (potentialParent.children && potentialParent.children.includes(nodeIndex)) {
						if (nodeIndexToBoneIndex.has(i)) {
							parentIndex = nodeIndexToBoneIndex.get(i)!;
						}
						break;
					}
				}

				// Find child bone indices
				const childIndices: number[] = [];
				if (nodeDef.children) {
					for (const childNodeIndex of nodeDef.children) {
						if (nodeIndexToBoneIndex.has(childNodeIndex)) {
							childIndices.push(nodeIndexToBoneIndex.get(childNodeIndex)!);
						}
					}
				}

				// Get local bind transform
				const localBindTransform = this._getNodeLocalTransform(nodeDef);

				// Get inverse bind matrix for this bone
				const inverseBindMatrix = new Float32Array(16);
				inverseBindMatrix.set(inverseBindMatrices.subarray(boneIndex * 16, boneIndex * 16 + 16));

				bones.push({
					name: nodeDef.name || `bone_${boneIndex}`,
					index: boneIndex,
					parentIndex,
					childIndices,
					localBindTransform,
					inverseBindMatrix
				});
			}

			// Find root bone indices
			const rootBoneIndices = bones
				.filter(bone => bone.parentIndex === -1)
				.map(bone => bone.index);

			const skeleton: IgeSkeletonData = {
				id: `skeleton_${skinIndex}_${Date.now()}`,
				name: skinDef.name || `skeleton_${skinIndex}`,
				bones,
				rootBoneIndices,
				boneCount
			};

			skins.push({
				name: skinDef.name,
				skeleton,
				jointNodeIndices
			});
		}

		return skins;
	}

	/**
	 * Get local transform matrix from a GLTF node.
	 */
	protected _getNodeLocalTransform(nodeDef: any): Float32Array {
		const matrix = new Float32Array(16);

		if (nodeDef.matrix) {
			// Use provided matrix directly
			matrix.set(nodeDef.matrix);
		} else {
			// Compose from TRS
			const t = nodeDef.translation || [0, 0, 0];
			const r = nodeDef.rotation || [0, 0, 0, 1]; // quaternion (x, y, z, w)
			const s = nodeDef.scale || [1, 1, 1];

			// Convert quaternion to rotation matrix and compose with scale and translation
			this._composeMatrix(matrix, t, r, s);
		}

		return matrix;
	}

	/**
	 * Compose a 4x4 matrix from translation, rotation (quaternion), and scale.
	 */
	protected _composeMatrix(
		out: Float32Array,
		translation: number[],
		rotation: number[],
		scale: number[]
	): void {
		const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale[0], sy = scale[1], sz = scale[2];

		out[0] = (1 - (yy + zz)) * sx;
		out[1] = (xy + wz) * sx;
		out[2] = (xz - wy) * sx;
		out[3] = 0;

		out[4] = (xy - wz) * sy;
		out[5] = (1 - (xx + zz)) * sy;
		out[6] = (yz + wx) * sy;
		out[7] = 0;

		out[8] = (xz + wy) * sz;
		out[9] = (yz - wx) * sz;
		out[10] = (1 - (xx + yy)) * sz;
		out[11] = 0;

		out[12] = translation[0];
		out[13] = translation[1];
		out[14] = translation[2];
		out[15] = 1;
	}

	/**
	 * Parse GLTF animations.
	 */
	protected _parseAnimations(gltf: any, buffers: ArrayBuffer[], skins: IgeGltfSkin[]): IgeAnimationClipData[] {
		const animations: IgeAnimationClipData[] = [];

		if (!gltf.animations) return animations;

		// Build a map from node index to bone index for each skin
		const skinNodeMaps: Map<number, number>[] = [];
		for (const skin of skins) {
			const map = new Map<number, number>();
			for (let i = 0; i < skin.jointNodeIndices.length; i++) {
				map.set(skin.jointNodeIndices[i], i);
			}
			skinNodeMaps.push(map);
		}

		for (let animIndex = 0; animIndex < gltf.animations.length; animIndex++) {
			const animDef = gltf.animations[animIndex];

			// Parse samplers
			const samplers: IgeAnimationSampler[] = [];
			for (const samplerDef of animDef.samplers) {
				const inputData = this._getAccessorData(gltf, samplerDef.input, buffers);
				const outputData = this._getAccessorData(gltf, samplerDef.output, buffers);

				// Determine component count from output accessor
				const outputAccessor = gltf.accessors[samplerDef.output];
				const componentCount = GLTF_TYPE_SIZES[outputAccessor.type];

				samplers.push({
					input: inputData,
					output: outputData,
					interpolation: (samplerDef.interpolation || "LINEAR") as IgeAnimationInterpolation,
					componentCount
				});
			}

			// Parse channels
			const channels: IgeAnimationChannel[] = [];
			for (const channelDef of animDef.channels) {
				const targetNodeIndex = channelDef.target.node;
				const targetPath = channelDef.target.path as IgeAnimationTargetPath;

				// Find which bone this node corresponds to
				let targetBoneIndex = -1;
				for (const nodeMap of skinNodeMaps) {
					if (nodeMap.has(targetNodeIndex)) {
						targetBoneIndex = nodeMap.get(targetNodeIndex)!;
						break;
					}
				}

				// Skip channels that don't target skeleton bones
				if (targetBoneIndex === -1) {
					continue;
				}

				channels.push({
					samplerIndex: channelDef.sampler,
					targetBoneIndex,
					targetPath
				});
			}

			// Calculate duration from sampler inputs
			let duration = 0;
			for (const sampler of samplers) {
				const maxTime = sampler.input[sampler.input.length - 1];
				if (maxTime > duration) {
					duration = maxTime;
				}
			}

			animations.push({
				id: `animation_${animIndex}_${Date.now()}`,
				name: animDef.name || `animation_${animIndex}`,
				duration,
				samplers,
				channels
			});
		}

		return animations;
	}

	/**
	 * Create an IgeEntity hierarchy from a loaded model.
	 */
	createEntity(model: IgeGltfModel, sceneIndex?: number): IgeEntity {
		const root = new IgeEntity();
		root.id(model.id);

		// Get the scene to instantiate
		const scene = model.scenes[sceneIndex ?? model.defaultSceneIndex];
		if (!scene) {
			this.log("No scene found in model", "warning");
			return root;
		}

		// For now, create a simple entity for each mesh
		// Full node hierarchy would require more complex implementation
		for (const mesh of model.meshes) {
			for (const primitive of mesh.primitives) {
				const entity = new IgeEntity();
				entity.id(`${model.id}_${mesh.name || "mesh"}`);

				// Store geometry data on entity
				(entity as any)._geometryData = primitive.geometry;

				// Store material reference
				if (primitive.materialIndex !== undefined && model.materials[primitive.materialIndex]) {
					(entity as any)._material = model.materials[primitive.materialIndex];
				}

				entity.mount(root);
			}
		}

		return root;
	}

	/**
	 * Check if a model is cached.
	 */
	isCached(modelId: string): boolean {
		return this._modelCache.has(modelId);
	}

	/**
	 * Get a cached model.
	 */
	getCached(modelId: string): IgeGltfModel | undefined {
		return this._modelCache.get(modelId);
	}

	/**
	 * Clear model cache.
	 */
	clearCache(): void {
		this._modelCache.clear();
	}
}

// Export singleton instance
export const igeGltfLoader = new IgeGltfLoader();
