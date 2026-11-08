import type { IgeGltfModel, IgeGltfNode } from "@/engine/webgl/IgeGltfLoader";
import { simplifyGeometry } from "@/engine/webgl/IgeMeshSimplifier";
import type { IgeWebGlMaterial } from "@/engine/webgl/IgeWebGlMaterial";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import type { IgeSkeleton, IgeSkeletonData } from "@/types/IgeSkeletonData";

/**
 * One drawable piece of a model: a mesh primitive with its material and its
 * placement inside the model. Parts are shared by every entity that uses
 * the same model, so they must be treated as read-only.
 */
export interface IgeModelPart {
	geometryData: IgeGeometryData3d;
	materialData: IgeMaterialData;
	/**
	 * Model-space transform of the primitive's node (column-major), or
	 * undefined for identity. Skinned primitives are always identity: their
	 * placement comes from the skeleton, as the glTF spec requires.
	 */
	matrix?: Float32Array;
	/** True when the primitive is deformed by the model's skeleton. */
	skinned: boolean;
}

const partsCache: WeakMap<IgeGltfModel, IgeModelPart[]> = new WeakMap();

/**
 * Get the render parts for a loaded GLTF model (cached per model).
 * Walks the default scene's node hierarchy so every mesh instance is placed
 * with its node's global transform, and converts the loader's materials
 * into plain material data (including the base colour texture image).
 */
export function getModelParts (model: IgeGltfModel): IgeModelPart[] {
	let parts = partsCache.get(model);
	if (parts) return parts;

	parts = [];
	const materials = model.materials.map((mat, index) => toMaterialData(model, mat, index));

	const addMesh = (meshIndex: number, matrix: Float32Array | undefined, skinned: boolean) => {
		const mesh = model.meshes[meshIndex];
		if (!mesh) return;
		for (const primitive of mesh.primitives) {
			const isSkinned = skinned && !!(primitive.geometry.boneWeights && primitive.geometry.boneIndices);
			parts!.push({
				geometryData: primitive.geometry,
				materialData: materials[primitive.materialIndex ?? 0] || { color: { r: 1, g: 1, b: 1, a: 1 } },
				matrix: isSkinned ? undefined : matrix,
				skinned: isSkinned
			});
		}
	};

	const nodes = model.nodes;
	const scene = model.scenes?.[model.defaultSceneIndex] || model.scenes?.[0];

	if (nodes && nodes.length && scene) {
		const visit = (nodeIndex: number, parentMatrix: Float32Array | undefined) => {
			const node = nodes[nodeIndex];
			if (!node) return;
			const local = nodeLocalMatrix(node);
			const world = parentMatrix ? (local ? multiplyMat4(parentMatrix, local) : parentMatrix) : local;

			if (node.mesh !== undefined) {
				addMesh(node.mesh, world && !isIdentity(world) ? world : undefined, node.skin !== undefined);
			}

			if (node.children) {
				for (const child of node.children) visit(child, world);
			}
		};

		for (const root of scene.nodeIndices) visit(root, undefined);
	} else {
		// No scene graph: place every mesh at the model origin
		for (let i = 0; i < model.meshes.length; i++) addMesh(i, undefined, !!model.skins?.length);
	}

	partsCache.set(model, parts);
	return parts;
}

/**
 * One level of detail for a model, used while the model is small on screen.
 * Give either a ratio (the level is generated from the model with
 * simplifyGeometry) or a separately authored model.
 */
export interface IgeModelLodLevel {
	/**
	 * Use this level (or a lower one) when the model's on-screen size, the
	 * projected diameter of its bounding sphere in device pixels (about
	 * the height of a standing character), is below this value.
	 */
	screenSize: number;
	/** Fraction of the model's triangles to keep (0-1). */
	ratio?: number;
	/**
	 * Error limit for a generated level, as a fraction of the mesh size
	 * (see IgeSimplifyOptions.maxError).
	 */
	maxError?: number;
	/**
	 * An authored lower-detail model instead of a generated one. It must
	 * have the same parts in the same order as the full model, and skinned
	 * parts must use the same skeleton.
	 */
	model?: IgeGltfModel;
}

/**
 * Levels of detail prepared for rendering.
 */
export interface IgeModelLod {
	/** Thresholds in descending order: level i + 1 is used below screenSizes[i]. */
	screenSizes: number[];
	/** For each model part, its geometry at each lower level (parallel to screenSizes). */
	partGeometries: IgeGeometryData3d[][];
}

const lodGeometryCache: WeakMap<IgeGeometryData3d, Map<string, IgeGeometryData3d>> = new WeakMap();

/**
 * Build the level-of-detail geometry for a model. Generated levels are
 * cached per mesh, so every entity using the same model and settings
 * shares the same simplified meshes (and GPU buffers).
 */
export function getModelLod (model: IgeGltfModel, levels: IgeModelLodLevel[]): IgeModelLod | undefined {
	const parts = getModelParts(model);
	if (!parts.length || !levels.length) return undefined;

	const sorted = [...levels].sort((a, b) => b.screenSize - a.screenSize);
	const lod: IgeModelLod = { screenSizes: [], partGeometries: parts.map(() => []) };

	for (const level of sorted) {
		let geometries: IgeGeometryData3d[] | undefined;

		if (level.model) {
			const lodParts = getModelParts(level.model);
			if (lodParts.length !== parts.length) {
				console.warn(
					`IgeModelLod: LOD model "${level.model.id}" has ${lodParts.length} parts, ` +
					`expected ${parts.length}; level ignored`
				);
				continue;
			}
			geometries = lodParts.map((part) => part.geometryData);
		} else if (level.ratio !== undefined && level.ratio < 1) {
			const ratio = Math.max(0, level.ratio);
			geometries = parts.map((part) => getSimplifiedGeometry(part.geometryData, ratio, level.maxError));
		}

		if (!geometries) continue;
		lod.screenSizes.push(level.screenSize);
		for (let i = 0; i < parts.length; i++) lod.partGeometries[i].push(geometries[i]);
	}

	return lod.screenSizes.length ? lod : undefined;
}

function getSimplifiedGeometry (geometry: IgeGeometryData3d, ratio: number, maxError: number | undefined): IgeGeometryData3d {
	let byKey = lodGeometryCache.get(geometry);
	if (!byKey) {
		byKey = new Map();
		lodGeometryCache.set(geometry, byKey);
	}

	const key = `${ratio}|${maxError ?? ""}`;
	let simplified = byKey.get(key);
	if (!simplified) {
		simplified = simplifyGeometry(geometry, {
			ratio,
			maxError,
			id: `${geometry.id}_lod${ratio}${maxError !== undefined ? `_e${maxError}` : ""}`
		});
		byKey.set(key, simplified);
	}
	return simplified;
}

/**
 * Create a runtime skeleton (pose buffers) for skeleton data. Entities each
 * need their own instance; the static data is shared.
 */
export function createSkeletonInstance (data: IgeSkeletonData): IgeSkeleton {
	const boneCount = data.boneCount;
	const skeleton: IgeSkeleton = {
		data,
		localMatrices: new Float32Array(boneCount * 16),
		worldMatrices: new Float32Array(boneCount * 16),
		skinMatrices: new Float32Array(boneCount * 16),
		dirty: true
	};

	for (let i = 0; i < boneCount; i++) {
		skeleton.localMatrices.set(data.bones[i].localBindTransform, i * 16);
	}

	return skeleton;
}

/**
 * Convert a loader material into plain material data the renderer reads.
 */
function toMaterialData (model: IgeGltfModel, mat: IgeWebGlMaterial, index: number): IgeMaterialData {
	const m = mat as any;
	const color = m.color?.() as { r: number; g: number; b: number; a: number } | undefined;
	const emissive = m.emissiveColor?.() as { r: number; g: number; b: number } | undefined;
	const blob = m.baseColorTextureData?.() as Blob | undefined;

	const data: IgeMaterialData = {
		color: color ? { r: color.r, g: color.g, b: color.b, a: color.a } : { r: 1, g: 1, b: 1, a: 1 },
		metallic: typeof m.metallic === "function" ? m.metallic() : 0,
		roughness: typeof m.roughness === "function" ? m.roughness() : 0.5,
		transparent: m.blendMode?.() === "transparent"
	};

	if (emissive && (emissive.r > 0 || emissive.g > 0 || emissive.b > 0)) {
		data.emissiveColor = { r: emissive.r, g: emissive.g, b: emissive.b };
		data.emissiveIntensity = m.emissiveIntensity?.() ?? 1;
	}

	if (blob) {
		data.textureId = `${model.id}_material${index}_baseColor`;
		data.textureBlob = blob;
	}

	return data;
}

function nodeLocalMatrix (node: IgeGltfNode): Float32Array | undefined {
	if (node.matrix) {
		return new Float32Array(node.matrix);
	}

	if (!node.translation && !node.rotation && !node.scale) {
		return undefined;
	}

	const [tx, ty, tz] = node.translation || [0, 0, 0];
	const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
	const [sx, sy, sz] = node.scale || [1, 1, 1];
	const x2 = x + x, y2 = y + y, z2 = z + z;
	const xx = x * x2, xy = x * y2, xz = x * z2;
	const yy = y * y2, yz = y * z2, zz = z * z2;
	const wx = w * x2, wy = w * y2, wz = w * z2;

	return new Float32Array([
		(1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
		(xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
		(xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
		tx, ty, tz, 1
	]);
}

/**
 * Multiply two column-major 4x4 matrices: returns a * b.
 */
export function multiplyMat4 (a: Float32Array, b: Float32Array): Float32Array {
	const out = new Float32Array(16);
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			out[col * 4 + row] =
				a[row] * b[col * 4] +
				a[4 + row] * b[col * 4 + 1] +
				a[8 + row] * b[col * 4 + 2] +
				a[12 + row] * b[col * 4 + 3];
		}
	}
	return out;
}

function isIdentity (m: Float32Array): boolean {
	for (let i = 0; i < 16; i++) {
		const expected = i % 5 === 0 ? 1 : 0;
		if (Math.abs(m[i] - expected) > 1e-7) return false;
	}
	return true;
}
