import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { igeComputeTangents } from "@/engine/webgl/IgeTangents";
import { multiplyMat4 } from "@/engine/webgl/IgeModelParts";
import { IgeWebGlMaterial, IgeWebGlPBRMaterial } from "@/engine/webgl/IgeWebGlMaterial";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeVertexEncodings } from "@/engine/webgl/IgeVertexPacking";
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
 * Counts ids handed out by this loader. Geometry is cached on the GPU by
 * its id, so every primitive needs its own: a timestamp alone repeats when
 * several files finish loading in the same millisecond, and the second
 * model would then be drawn with the first one's mesh.
 */
let _gltfIdCounter = 0;

/** A unique id for a loaded primitive, skeleton or clip. */
function gltfUniqueId (prefix: string): string {
	_gltfIdCounter++;
	return `${prefix}_${_gltfIdCounter}_${Date.now().toString(36)}`;
}

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
/** Largest value of each integer component type, for normalized accessors. */
const NORMALIZED_MAX = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 } as const;

/** Bytes in each component type. */
const COMPONENT_BYTES: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

/** The compact GPU encoding of each integer component type, and its largest value. */
const ENCODINGS = {
	5120: { encoding: "snorm8", max: 127 },
	5121: { encoding: "unorm8", max: 255 },
	5122: { encoding: "snorm16", max: 32767 },
	5123: { encoding: "unorm16", max: 65535 }
} as const;

/** Typed arrays over each component type (for reading tightly packed, aligned data in one go). */
const COMPONENT_ARRAYS: Record<number, { new (buffer: ArrayBufferLike, byteOffset: number, length: number): ArrayLike<number> }> = {
	5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array
};

/** `elements` elements of `components` values each, `stride` bytes apart in `view`, into `out` from `at`. */
function readComponents (view: DataView, type: number, elements: number, components: number, stride: number, at: number, out: Float32Array): void {
	const size = COMPONENT_BYTES[type];
	const offset = view.byteOffset;
	// Tightly packed and aligned (most float meshes): one typed-array copy
	if (stride === components * size && offset % size === 0) {
		const src = new COMPONENT_ARRAYS[type](view.buffer, offset, elements * components);
		if (src instanceof Float32Array) out.set(src, at);
		else for (let i = 0, n = elements * components; i < n; i++) out[at + i] = src[i];
		return;
	}
	// Strided (quantised meshes pad elements to 4 bytes) or unaligned: element by element, one loop per type
	const read: (o: number) => number =
		type === 5126 ? (o) => view.getFloat32(o, true)
			: type === 5125 ? (o) => view.getUint32(o, true)
				: type === 5123 ? (o) => view.getUint16(o, true)
					: type === 5122 ? (o) => view.getInt16(o, true)
						: type === 5121 ? (o) => view.getUint8(o)
							: (o) => view.getInt8(o);
	for (let e = 0; e < elements; e++) {
		const base = e * stride;
		for (let c = 0; c < components; c++) out[at + e * components + c] = read(base + c * size);
	}
}

const GLTF_TYPE_SIZES: Record<string, number> = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
	MAT2: 4,
	MAT3: 9,
	MAT4: 16
};

const IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

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
 * GLTF image data - either embedded or external.
 */
export interface IgeGltfImage {
	name?: string;
	mimeType?: string;
	/** Image data as Blob for creating textures */
	data?: Blob;
	/** URI for external images */
	uri?: string;
}

/**
 * GLTF texture data - references an image and sampler.
 */
export interface IgeGltfTexture {
	name?: string;
	/** Index into images array */
	imageIndex: number;
	/** Sampler settings */
	sampler?: {
		magFilter?: number;
		minFilter?: number;
		wrapS?: number;
		wrapT?: number;
	};
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
	images?: IgeGltfImage[];
	textures?: IgeGltfTexture[];
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

	/**
	 * Keep quantised meshes (KHR_mesh_quantization: integer positions, normals, texture coordinates) in their
	 * integer formats on the GPU (true by default): half the memory or less. Their arrays on the CPU are floats
	 * either way.
	 */
	keepQuantised: boolean = true;

	// Cache loaded models
	protected _modelCache: Map<string, IgeGltfModel> = new Map();
	// Loads in progress, so the same model requested twice is fetched once
	protected _pending: Map<string, Promise<IgeGltfModel>> = new Map();

	/**
	 * Load a GLTF or GLB model from URL. Models are cached by id (the URL
	 * when no id is given); asking again for one that is loading waits for
	 * the same load. Rejects if the file is missing or can't be parsed.
	 */
	load(url: string, modelId?: string): Promise<IgeGltfModel> {
		const id = modelId || url;

		// Check cache
		const cached = this._modelCache.get(id);
		if (cached) return Promise.resolve(cached);

		let pending = this._pending.get(id);
		if (!pending) {
			pending = this._load(url, id).finally(() => this._pending.delete(id));
			this._pending.set(id, pending);
		}
		return pending;
	}

	/**
	 * Parse a model already in memory: a GLB's bytes, or a glTF's JSON with its buffers embedded (data: URIs) or
	 * beside `baseUrl`. Cached under `id` like a loaded one.
	 * @example #A model built in code or fetched by hand
	 *     const model = await igeGltfLoader.parse(glbBytes, "generatedTown");
	 */
	async parse(data: ArrayBuffer | object, id: string, baseUrl: string = ""): Promise<IgeGltfModel> {
		let json: any = data;
		let binary: ArrayBuffer | null = null;
		if (data instanceof ArrayBuffer) {
			const result = this._parseGlb(data);
			json = result.json;
			binary = result.binary;
		}
		const buffers = await this._loadBuffers(json, baseUrl, binary);
		const model = await this._parseGltf(json, buffers, baseUrl, id);
		this._modelCache.set(id, model);
		return model;
	}

	protected async _load(url: string, id: string): Promise<IgeGltfModel> {

		this.log(`Loading GLTF model: ${url}`);

		// Determine if GLB or GLTF
		const isGlb = url.toLowerCase().endsWith(".glb");

		let gltfData: any;
		let binaryData: ArrayBuffer | null = null;

		if (isGlb) {
			// Load GLB binary format
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
			const buffer = await response.arrayBuffer();
			const result = this._parseGlb(buffer);
			gltfData = result.json;
			binaryData = result.binary;
		} else {
			// Load GLTF JSON format
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
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

		// Parse images and textures
		const images = this._parseImages(gltf, buffers, baseUrl);
		const textures = this._parseTextures(gltf);

		// Parse materials (pass textures for texture references)
		const materials = this._parseMaterials(gltf, textures, images);

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

		// Add images and textures if present
		if (images.length > 0) {
			model.images = images;
		}
		if (textures.length > 0) {
			model.textures = textures;
		}

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
	 * Parse images from GLTF (embedded in bufferViews or external URIs).
	 */
	protected _parseImages(gltf: any, buffers: ArrayBuffer[], baseUrl: string): IgeGltfImage[] {
		const images: IgeGltfImage[] = [];

		if (!gltf.images) {
			return images;
		}

		for (const imageDef of gltf.images) {
			const image: IgeGltfImage = {
				name: imageDef.name,
				mimeType: imageDef.mimeType
			};

			if (imageDef.bufferView !== undefined) {
				// Image data is embedded in a buffer view
				const bufferViewDef = gltf.bufferViews[imageDef.bufferView];
				const bufferIndex = bufferViewDef.buffer || 0;
				const buffer = buffers[bufferIndex];
				const byteOffset = bufferViewDef.byteOffset || 0;
				const byteLength = bufferViewDef.byteLength;

				// Extract image data as a Blob
				const imageData = new Uint8Array(buffer, byteOffset, byteLength);
				image.data = new Blob([imageData], { type: imageDef.mimeType || "image/png" });
			} else if (imageDef.uri) {
				// External image URI
				if (imageDef.uri.startsWith("data:")) {
					// Data URI - decode it
					const matches = imageDef.uri.match(/^data:([^;]+);base64,(.+)$/);
					if (matches) {
						const mimeType = matches[1];
						const base64Data = matches[2];
						const binaryStr = atob(base64Data);
						const bytes = new Uint8Array(binaryStr.length);
						for (let i = 0; i < binaryStr.length; i++) {
							bytes[i] = binaryStr.charCodeAt(i);
						}
						image.data = new Blob([bytes], { type: mimeType });
						image.mimeType = mimeType;
					}
				} else {
					// External file reference
					image.uri = baseUrl + imageDef.uri;
				}
			}

			images.push(image);
		}

		return images;
	}

	/**
	 * Parse textures from GLTF.
	 */
	protected _parseTextures(gltf: any): IgeGltfTexture[] {
		const textures: IgeGltfTexture[] = [];

		if (!gltf.textures) {
			return textures;
		}

		for (const texDef of gltf.textures) {
			const texture: IgeGltfTexture = {
				name: texDef.name,
				// EXT_texture_webp: browsers decode WebP, so its image is used (exporters such as
				// Blender's may give no plain `source` at all for a WebP texture)
				imageIndex: texDef.extensions?.EXT_texture_webp?.source ?? texDef.source
			};

			// Parse sampler if present
			if (texDef.sampler !== undefined && gltf.samplers && gltf.samplers[texDef.sampler]) {
				const samplerDef = gltf.samplers[texDef.sampler];
				texture.sampler = {
					magFilter: samplerDef.magFilter,
					minFilter: samplerDef.minFilter,
					wrapS: samplerDef.wrapS,
					wrapT: samplerDef.wrapT
				};
			}

			textures.push(texture);
		}

		return textures;
	}

	/**
	 * Parse materials from GLTF.
	 */
	protected _parseMaterials(gltf: any, textures: IgeGltfTexture[], images: IgeGltfImage[]): IgeWebGlMaterial[] {
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

				// Base color texture
				if (pbr.baseColorTexture !== undefined) {
					const textureIndex = pbr.baseColorTexture.index;
					const texCoord = pbr.baseColorTexture.texCoord ?? 0;

					if (textureIndex !== undefined && textures[textureIndex]) {
						const texture = textures[textureIndex];
						const imageIndex = texture.imageIndex;

						if (imageIndex !== undefined && images[imageIndex] && images[imageIndex].data) {
							material.baseColorTextureData(images[imageIndex].data, texCoord);
							if (texture.sampler) material.baseColorSampler(texture.sampler);
							this.log(`Material "${matDef.name}" has base color texture from image ${imageIndex}`);
						}
					}

					// KHR_texture_transform: offset and scale (a quantised mesh's texture coordinates use it)
					const transform = pbr.baseColorTexture.extensions?.KHR_texture_transform;
					if (transform) {
						const scale = transform.scale ?? [1, 1], offset = transform.offset ?? [0, 0];
						material.textureTransform({ scale: [scale[0], scale[1]], offset: [offset[0], offset[1]] });
						if (transform.rotation) this.log(`Material "${matDef.name}": KHR_texture_transform rotation isn't supported`, "warning");
					}
				}

				// Metallic and roughness
				if (pbr.metallicFactor !== undefined) {
					material.metallic(pbr.metallicFactor);
				}
				if (pbr.roughnessFactor !== undefined) {
					material.roughness(pbr.roughnessFactor);
				}

				// Metallic-roughness map (G = roughness, B = metallic, multiplied by the factors). The spec's
				// factors default to 1 when the file leaves them out; without a map the engine's own defaults stand.
				const mrImage = this._mapImage(matDef.name, "metallicRoughnessTexture", pbr.metallicRoughnessTexture, textures, images);
				if (mrImage) {
					material.metallicRoughnessTextureData(mrImage);
					if (pbr.metallicFactor === undefined) material.metallic(1);
					if (pbr.roughnessFactor === undefined) material.roughness(1);
				}
			}

			// Normal map (its scale bends the surface more or less) and occlusion map (red channel, with a strength)
			const normalImage = this._mapImage(matDef.name, "normalTexture", matDef.normalTexture, textures, images);
			if (normalImage) {
				material.normalTextureData(normalImage);
				material.normalScale(matDef.normalTexture.scale ?? 1);
			}
			const occlusionImage = this._mapImage(matDef.name, "occlusionTexture", matDef.occlusionTexture, textures, images);
			if (occlusionImage) {
				material.aoTextureData(occlusionImage);
				material.aoStrength(matDef.occlusionTexture.strength ?? 1);
			}

			// Parse emissive
			if (matDef.emissiveFactor) {
				material.emissiveColor(
					matDef.emissiveFactor[0],
					matDef.emissiveFactor[1],
					matDef.emissiveFactor[2]
				);
			}
			if (matDef.emissiveTexture !== undefined) {
				const texture = textures[matDef.emissiveTexture.index];
				const image = texture?.imageIndex !== undefined ? images[texture.imageIndex] : undefined;
				if (image?.data) {
					material.emissiveTextureData(image.data);
					// (a map with no factor glows as it is, rather than not at all)
					if (!matDef.emissiveFactor) material.emissiveColor(1, 1, 1);
				}
			}
			const strength = matDef.extensions?.KHR_materials_emissive_strength?.emissiveStrength;
			if (typeof strength === "number") material.emissiveIntensity(strength);

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
	 * A material map's encoded image, or undefined when the material has no such map. Only TEXCOORD_0 is read:
	 * a map on another set is warned about and ignored.
	 */
	protected _mapImage (materialName: string | undefined, what: string, info: any, textures: IgeGltfTexture[], images: IgeGltfImage[]): Blob | undefined {
		if (!info || info.index === undefined) return undefined;
		if ((info.texCoord ?? 0) !== 0) {
			this.log(`Material "${materialName}" has its ${what} on TEXCOORD_${info.texCoord}; only TEXCOORD_0 is read, so the map is ignored`, "warning");
			return undefined;
		}
		const imageIndex = textures[info.index]?.imageIndex;
		return imageIndex !== undefined ? images[imageIndex]?.data : undefined;
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
			id: gltfUniqueId(`gltf_primitive_${primitiveIndex}`),
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

		// Tangents, only for a mesh whose material has a normal map (others would carry them for nothing): the
		// file's own when it has them, else made from the positions, normals and UVs (see igeComputeTangents)
		const normalTexture = primitive.material !== undefined ? gltf.materials?.[primitive.material]?.normalTexture : undefined;
		if (normalTexture && (normalTexture.texCoord ?? 0) === 0) {
			if (primitive.attributes.TANGENT !== undefined) {
				geometry.tangents = this._getAccessorData(gltf, primitive.attributes.TANGENT, buffers);
			}
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

		if (normalTexture && (normalTexture.texCoord ?? 0) === 0 && !geometry.tangents) {
			geometry.tangents = igeComputeTangents(geometry);
		}

		// Quantised (KHR_mesh_quantization): kept compact on the GPU, while the arrays above stay floats for the CPU
		if (this.keepQuantised) {
			const encodings = this._vertexEncodings(gltf, primitive.attributes);
			if (encodings) geometry.vertexEncodings = encodings;
		}

		return geometry;
	}

	/**
	 * Get typed array data from accessor.
	 * Note: We copy data to new arrays to avoid byte alignment issues.
	 */
	protected _getAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array {
		const data = this._readAccessorData(gltf, accessorIndex, buffers);
		const accessor = gltf.accessors[accessorIndex];
		// Normalized integers (e.g. vertex colours as bytes, 255 = 1.0) are read as 0-1 (or -1-1 when signed)
		if (accessor.normalized && accessor.componentType !== GltfComponentType.FLOAT) {
			const max = NORMALIZED_MAX[accessor.componentType as keyof typeof NORMALIZED_MAX];
			if (max) for (let i = 0; i < data.length; i++) data[i] = Math.max(data[i] / max, -1);
		}
		return data;
	}

	/**
	 * An accessor's values as floats, as stored (integers not yet normalized): read element by element at the buffer
	 * view's byteStride (quantised meshes pad their elements to 4 bytes), zeros when it has no buffer view, and its
	 * sparse values put in.
	 */
	protected _readAccessorData(gltf: any, accessorIndex: number, buffers: ArrayBuffer[]): Float32Array {
		const accessor = gltf.accessors[accessorIndex];
		const componentCount = GLTF_TYPE_SIZES[accessor.type];
		const componentType = accessor.componentType as GltfComponentType;
		const size = COMPONENT_BYTES[componentType];
		if (!size) throw new Error(`Unsupported accessor component type: ${accessor.componentType}`);
		const result = new Float32Array(accessor.count * componentCount);

		if (accessor.bufferView !== undefined) {
			const bufferView = gltf.bufferViews[accessor.bufferView];
			const buffer = buffers[bufferView.buffer];
			const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
			const stride = bufferView.byteStride || componentCount * size;
			const view = new DataView(buffer, byteOffset, Math.max(0, (accessor.count - 1) * stride + componentCount * size));
			readComponents(view, componentType, accessor.count, componentCount, stride, 0, result);
		}

		// Sparse: some elements replaced (morph targets, edited meshes)
		const sparse = accessor.sparse;
		if (sparse && sparse.count > 0) {
			const iv = gltf.bufferViews[sparse.indices.bufferView];
			const indexBuffer = buffers[iv.buffer];
			const indexType = sparse.indices.componentType as GltfComponentType;
			const indexView = new DataView(indexBuffer, (iv.byteOffset || 0) + (sparse.indices.byteOffset || 0), sparse.count * COMPONENT_BYTES[indexType]);
			const indices = new Float32Array(sparse.count);
			readComponents(indexView, indexType, sparse.count, 1, COMPONENT_BYTES[indexType], 0, indices);
			const vv = gltf.bufferViews[sparse.values.bufferView];
			const valueView = new DataView(buffers[vv.buffer], (vv.byteOffset || 0) + (sparse.values.byteOffset || 0), sparse.count * componentCount * size);
			const values = new Float32Array(sparse.count * componentCount);
			readComponents(valueView, componentType, sparse.count, componentCount, componentCount * size, 0, values);
			for (let i = 0; i < sparse.count; i++) {
				for (let c = 0; c < componentCount; c++) result[indices[i] * componentCount + c] = values[i * componentCount + c];
			}
		}
		return result;
	}

	/**
	 * How a primitive's attributes stay compact on the GPU when its file stores them as integers
	 * (KHR_mesh_quantization): each in the encoding its accessor has, with the decode that turns unnormalized
	 * integers back into what the file means (their node transform or texture transform does the rest). Undefined
	 * when every attribute is float (nothing to keep).
	 */
	protected _vertexEncodings(gltf: any, attributes: Record<string, number>): IgeVertexEncodings | undefined {
		const out: IgeVertexEncodings = {};
		let quantised = false;
		const take = (semantic: string, key: "position" | "normal" | "uv" | "color" | "boneWeights" | "tangent") => {
			const index = attributes[semantic];
			if (index === undefined) return;
			const a = gltf.accessors[index];
			const enc = ENCODINGS[a.componentType as keyof typeof ENCODINGS];
			if (!enc) return;
			// Normals, colours, weights and tangents must be normalized integers to be anything but floats
			if (!a.normalized && key !== "position" && key !== "uv") return;
			quantised = true;
			(out as any)[key] = enc.encoding;
			const scale = a.normalized ? 1 : enc.max;
			if (key === "position") out.positionDecode = { scale, offset: [0, 0, 0] };
			if (key === "uv" && !a.normalized) out.uvDecode = { scale: [scale, scale], offset: [0, 0] };
		};
		take("POSITION", "position");
		take("NORMAL", "normal");
		take("TEXCOORD_0", "uv");
		take("COLOR_0", "color");
		take("WEIGHTS_0", "boneWeights");
		// (Used only when the mesh keeps the file's tangents: those with a normal map)
		take("TANGENT", "tangent");
		return quantised ? out : undefined;
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
		// JOINTS_0 is UNSIGNED_BYTE or UNSIGNED_SHORT (bone counts fit a byte); read at the view's stride
		if (accessor.componentType !== GltfComponentType.UNSIGNED_BYTE && accessor.componentType !== GltfComponentType.UNSIGNED_SHORT) {
			throw new Error(`Unsupported JOINTS accessor type: ${accessor.componentType}`);
		}
		return Uint8Array.from(this._readAccessorData(gltf, accessorIndex, buffers));
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

		// Map each node to its parent node
		const parentNodeOf = new Map<number, number>();
		for (let i = 0; i < gltf.nodes.length; i++) {
			const children: number[] | undefined = gltf.nodes[i].children;
			if (children) {
				for (const child of children) parentNodeOf.set(child, i);
			}
		}
		// Nodes the file's animations move
		const animatedNodes = new Set<number>();
		for (const animDef of gltf.animations || []) {
			for (const channelDef of animDef.channels || []) {
				if (channelDef.target?.node !== undefined && channelDef.target.path !== "weights") animatedNodes.add(channelDef.target.node);
			}
		}

		for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
			const skinDef = gltf.skins[skinIndex];
			const skinJoints: number[] = skinDef.joints || [];
			// Animated nodes above the root joints that aren't joints themselves (3ds Max rigs keep the root motion on
			// "Bip001" over the skinned "Bip001 Pelvis": a fall, a crouch, climbing up out of the floor) become bones
			// too, after the skin's joints so the vertices' joint indices are unchanged. Unanimated ancestors above
			// them stay a fixed parentTransform.
			const skinJointSet = new Set(skinJoints);
			const animatedAncestors: number[] = [];
			for (const jointNode of skinJoints) {
				const chain: number[] = [];
				let top = 0;
				for (let n = parentNodeOf.get(jointNode); n !== undefined && !skinJointSet.has(n); n = parentNodeOf.get(n)) {
					chain.push(n);
					if (animatedNodes.has(n)) top = chain.length;
				}
				for (let k = 0; k < top; k++) {
					if (!animatedAncestors.includes(chain[k])) animatedAncestors.push(chain[k]);
				}
			}
			const jointNodeIndices: number[] = [...skinJoints, ...animatedAncestors];
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
				const parentNode = parentNodeOf.get(nodeIndex);
				if (parentNode !== undefined && nodeIndexToBoneIndex.has(parentNode)) {
					parentIndex = nodeIndexToBoneIndex.get(parentNode)!;
				}

				// Root bones inherit the transforms of their non-joint ancestors
				// (glTF joint matrices use each joint's full global transform)
				const parentTransform = parentIndex === -1
					? this._getAncestorTransform(gltf, parentNodeOf, nodeIndex, nodeIndexToBoneIndex)
					: undefined;

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

				// Get inverse bind matrix for this bone (an animated ancestor skins no vertices: identity)
				const inverseBindMatrix = new Float32Array(16);
				if (boneIndex < skinJoints.length) {
					inverseBindMatrix.set(inverseBindMatrices.subarray(boneIndex * 16, boneIndex * 16 + 16));
				} else {
					inverseBindMatrix[0] = inverseBindMatrix[5] = inverseBindMatrix[10] = inverseBindMatrix[15] = 1;
				}

				const bone: IgeBone = {
					name: nodeDef.name || `bone_${boneIndex}`,
					index: boneIndex,
					parentIndex,
					childIndices,
					localBindTransform,
					inverseBindMatrix
				};
				if (parentTransform) {
					bone.parentTransform = parentTransform;
				}
				bones.push(bone);
			}

			// Find root bone indices
			const rootBoneIndices = bones
				.filter(bone => bone.parentIndex === -1)
				.map(bone => bone.index);

			const skeleton: IgeSkeletonData = {
				id: gltfUniqueId(`skeleton_${skinIndex}`),
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
	 * Combined global transform of a node's ancestors (excluding the node),
	 * stopping at the first ancestor that is itself a joint. Returns
	 * undefined when there are no ancestors or the result is identity.
	 */
	protected _getAncestorTransform(
		gltf: any,
		parentNodeOf: Map<number, number>,
		nodeIndex: number,
		jointNodes: Map<number, number>
	): Float32Array | undefined {
		const chain: number[] = [];
		let current = parentNodeOf.get(nodeIndex);
		while (current !== undefined && !jointNodes.has(current)) {
			chain.push(current);
			current = parentNodeOf.get(current);
		}

		if (chain.length === 0) return undefined;

		// Multiply from the outermost ancestor inwards: root * ... * parent
		let result: Float32Array | undefined;
		for (let i = chain.length - 1; i >= 0; i--) {
			const local = this._getNodeLocalTransform(gltf.nodes[chain[i]]);
			result = result ? multiplyMat4(result, local) : local;
		}

		if (!result) return undefined;
		for (let i = 0; i < 16; i++) {
			if (Math.abs(result[i] - IDENTITY_MAT4[i]) > 1e-7) return result;
		}
		return undefined;
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

				// Morph target weights aren't supported
				if (targetPath === "weights") {
					continue;
				}

				// Channels on nodes that aren't joints of a skin in this file
				// (animation-only files have no skin) keep targetBoneIndex -1:
				// playback skips them, but retargetClips() can map them onto
				// another model's skeleton by node name.
				channels.push({
					samplerIndex: channelDef.sampler,
					targetBoneIndex,
					targetPath,
					targetNode: targetNodeIndex,
					targetName: gltf.nodes?.[targetNodeIndex]?.name
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
				id: gltfUniqueId(`animation_${animIndex}`),
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
