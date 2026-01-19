import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlMaterial, IgeWebGlPBRMaterial } from "@/engine/webgl/IgeWebGlMaterial";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

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
		// Parse materials
		const materials = this._parseMaterials(gltf);

		// Parse meshes
		const meshes = this._parseMeshes(gltf, buffers);

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

		return {
			id: modelId,
			name: gltf.asset?.name || modelId,
			scenes,
			defaultSceneIndex: gltf.scene || 0,
			meshes,
			materials
		};
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
	protected _parseMeshes(gltf: any, buffers: ArrayBuffer[]): IgeGltfMesh[] {
		const meshes: IgeGltfMesh[] = [];

		if (!gltf.meshes) return meshes;

		let primitiveIndex = 0;
		for (const meshDef of gltf.meshes) {
			const primitives: IgeGltfPrimitive[] = [];

			for (const primDef of meshDef.primitives) {
				const geometry = this._parsePrimitive(gltf, primDef, buffers, primitiveIndex++);
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
	protected _parsePrimitive(gltf: any, primitive: any, buffers: ArrayBuffer[], primitiveIndex: number = 0): IgeGeometryData3d {
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

		// Parse indices
		if (primitive.indices !== undefined) {
			const indexData = this._getAccessorData(gltf, primitive.indices, buffers);
			// Convert to Uint16Array or Uint32Array based on size
			const accessor = gltf.accessors[primitive.indices];
			if (accessor.componentType === GltfComponentType.UNSIGNED_INT) {
				geometry.indices = new Uint32Array(indexData);
			} else {
				geometry.indices = new Uint16Array(indexData);
			}
		}

		return geometry;
	}

	/**
	 * Get typed array data from accessor.
	 */
	protected _getAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array {
		const accessor = gltf.accessors[accessorIndex];
		const bufferView = gltf.bufferViews[accessor.bufferView];
		const buffer = buffers[bufferView.buffer];

		const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
		const componentCount = GLTF_TYPE_SIZES[accessor.type];
		const elementCount = accessor.count * componentCount;

		// Create appropriate typed array based on component type
		switch (accessor.componentType) {
			case GltfComponentType.FLOAT:
				return new Float32Array(buffer, byteOffset, elementCount);
			case GltfComponentType.UNSIGNED_SHORT:
				const ushortData = new Uint16Array(buffer, byteOffset, elementCount);
				return new Float32Array(ushortData); // Convert to float
			case GltfComponentType.UNSIGNED_INT:
				const uintData = new Uint32Array(buffer, byteOffset, elementCount);
				return new Float32Array(uintData);
			case GltfComponentType.UNSIGNED_BYTE:
				const ubyteData = new Uint8Array(buffer, byteOffset, elementCount);
				return new Float32Array(ubyteData);
			case GltfComponentType.SHORT:
				const shortData = new Int16Array(buffer, byteOffset, elementCount);
				return new Float32Array(shortData);
			case GltfComponentType.BYTE:
				const byteData = new Int8Array(buffer, byteOffset, elementCount);
				return new Float32Array(byteData);
			default:
				throw new Error(`Unsupported accessor component type: ${accessor.componentType}`);
		}
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
