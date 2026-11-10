import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import type { IgeSkeleton } from "@/types/IgeSkeletonData";
import { MAX_BONES } from "@/types/IgeSkeletonData";

/**
 * Resolved per-draw material values. Parsed once per item per frame so the
 * hot render loops never touch CSS colour strings or optional chains.
 */
export interface IgeWebGlResolvedMaterial {
	r: number;
	g: number;
	b: number;
	a: number;
	metallic: number;
	roughness: number;
	emissiveR: number;
	emissiveG: number;
	emissiveB: number;
	emissiveIntensity: number;
	opacity: number;
	/** Texture coordinate transform: uv * scale + offset (scroll a texture by changing the offset). */
	uvScaleU: number;
	uvScaleV: number;
	uvOffsetU: number;
	uvOffsetV: number;
}

/**
 * One drawable mesh for the current frame: an entity (or one primitive of an
 * entity's model) together with everything the renderer needs to cull,
 * batch and draw it. Items are pooled and rewritten every frame.
 */
export interface IgeWebGlRenderItem {
	entity: IgeEntity;
	/** Silhouette colour where something stands in front of this item (see IgeEntity.occludedColor()). */
	occluded?: { r: number; g: number; b: number; a: number } | null;
	geometry: IgeWebGlGeometry;
	/** Source material data (entity or model primitive). */
	materialData: IgeMaterialData | null;
	material: IgeWebGlResolvedMaterial;
	/** Texture from the GLTF texture cache (createTextureFromBlob id). */
	blobTextureId?: string;
	/** IgeTexture assigned to the entity, used when there is no blob texture. */
	texture?: IgeTexture;
	/** Batch key component describing the texture. */
	textureKey: string;
	skeleton?: IgeSkeleton;
	/** Row in the bone palette texture (instanced skinned draws), -1 if none. */
	boneRow: number;
	transparent: boolean;
	/** Never back-face culled (material doubleSided). */
	doubleSided: boolean;
	castShadow: boolean;
	/** Column-major world matrix (entity._worldMatrix4.matrix). */
	worldMatrix: Float32Array;
	/** World-space bounding sphere. */
	cx: number;
	cy: number;
	cz: number;
	radius: number;
	/** Squared distance to the current camera (transparent sorting). */
	sortKey: number;
	/** Main pass batch key: geometry + texture (+ skinned flag). */
	batchKey: string;
	/** Shadow pass batch key: geometry (+ skinned flag); textures don't matter. */
	depthKey: string;
	/**
	 * Level-of-detail thresholds (device pixels, descending) when the item
	 * has lower-detail geometry, else null. Level i + 1 is drawn below
	 * lodSizes[i]; each pass picks its own level.
	 */
	lodSizes: number[] | null;
	/** World-space radius of the full mesh as authored, for LOD selection. */
	lodRadius: number;
	/** Geometry per level (index 0 is `geometry`). */
	lodGeometries: IgeWebGlGeometry[];
	/** batchKey per level. */
	lodBatchKeys: string[];
	/** depthKey per level. */
	lodDepthKeys: string[];
	/** Geometry chosen for the current viewport (transparent items). */
	drawGeometry: IgeWebGlGeometry;
	/** Level of detail chosen for the current viewport (0 = full). */
	lodLevel: number;
}

/**
 * A group of render items that can share one geometry binding and,
 * when the hardware allows it, a single instanced draw call.
 */
export interface IgeWebGlItemBatch {
	key: string;
	geometry: IgeWebGlGeometry;
	/** First item's texture info; every item in the batch shares it. */
	blobTextureId?: string;
	texture?: IgeTexture;
	skinned: boolean;
	items: IgeWebGlRenderItem[];
}

/**
 * Groups render items into batches by a caller-supplied key. Batch objects
 * and their item arrays are reused across frames to keep the per-frame
 * allocation count near zero.
 */
export class IgeWebGlItemBatcher {
	protected _batchMap: Map<string, IgeWebGlItemBatch> = new Map();
	protected _active: IgeWebGlItemBatch[] = [];

	/** Batches that received at least one item since the last begin(). */
	get batches (): IgeWebGlItemBatch[] {
		return this._active;
	}

	begin (): void {
		for (let i = 0; i < this._active.length; i++) {
			this._active[i].items.length = 0;
		}
		this._active.length = 0;
	}

	/**
	 * Add an item to the batch for `key`. `geometry` is the mesh to draw it
	 * with (a level-of-detail version of item.geometry, for example); it
	 * must be the same for every item sharing a key.
	 */
	add (item: IgeWebGlRenderItem, key: string, geometry: IgeWebGlGeometry = item.geometry): void {
		let batch = this._batchMap.get(key);
		if (!batch) {
			batch = {
				key,
				geometry,
				blobTextureId: item.blobTextureId,
				texture: item.texture,
				skinned: geometry.isSkinned && !!item.skeleton,
				items: []
			};
			this._batchMap.set(key, batch);
		}

		if (batch.items.length === 0) {
			// Refresh the shared state in case the batch object was reused for
			// a different geometry instance with the same key.
			batch.geometry = geometry;
			batch.blobTextureId = item.blobTextureId;
			batch.texture = item.texture;
			batch.skinned = geometry.isSkinned && !!item.skeleton;
			this._active.push(batch);
		}

		batch.items.push(item);
	}

	/** Drop all cached batch objects (e.g. after a context loss). */
	clear (): void {
		this._batchMap.clear();
		this._active.length = 0;
	}
}

/** Floats per instance: mat4 world + colour + emissive + material. */
export const INSTANCE_FLOATS = 28;
const INSTANCE_STRIDE = INSTANCE_FLOATS * 4;

const INSTANCE_ATTRIBUTES: { name: string; offset: number }[] = [
	{ name: "a_instanceMatrix0", offset: 0 },
	{ name: "a_instanceMatrix1", offset: 16 },
	{ name: "a_instanceMatrix2", offset: 32 },
	{ name: "a_instanceMatrix3", offset: 48 },
	{ name: "a_instanceColor", offset: 64 },
	{ name: "a_instanceEmissive", offset: 80 },
	{ name: "a_instanceMaterial", offset: 96 }
];

/**
 * Streams per-instance data (world matrix + material values) for instanced
 * draws. The buffer is re-specified for every batch, which lets the driver
 * orphan the previous storage instead of stalling on in-flight draws.
 */
export class IgeWebGlInstanceBuffer {
	protected _gl: WebGL2RenderingContext;
	protected _buffer: WebGLBuffer | null;
	protected _data: Float32Array = new Float32Array(INSTANCE_FLOATS * 256);
	protected _boundLocations: number[] = [];

	constructor (gl: WebGL2RenderingContext) {
		this._gl = gl;
		this._buffer = gl.createBuffer();
	}

	/**
	 * Write the instance data for a list of items into the GPU buffer.
	 */
	upload (items: IgeWebGlRenderItem[], start: number, count: number): void {
		const needed = count * INSTANCE_FLOATS;
		if (this._data.length < needed) {
			let size = this._data.length;
			while (size < needed) size *= 2;
			this._data = new Float32Array(size);
		}

		const data = this._data;
		let o = 0;
		for (let i = start; i < start + count; i++) {
			const item = items[i];
			const m = item.worldMatrix;
			const mat = item.material;
			for (let j = 0; j < 16; j++) data[o + j] = m[j];
			data[o + 16] = mat.r;
			data[o + 17] = mat.g;
			data[o + 18] = mat.b;
			data[o + 19] = mat.a;
			data[o + 20] = mat.emissiveR;
			data[o + 21] = mat.emissiveG;
			data[o + 22] = mat.emissiveB;
			data[o + 23] = mat.emissiveIntensity;
			data[o + 24] = mat.metallic;
			data[o + 25] = mat.roughness;
			data[o + 26] = mat.opacity;
			data[o + 27] = item.boneRow;
			o += INSTANCE_FLOATS;
		}

		const gl = this._gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, needed), gl.STREAM_DRAW);
	}

	/**
	 * Point the program's instance attributes at the buffer (divisor 1).
	 * Must be called after upload() and after the geometry's own attributes
	 * have been bound, since this rebinds ARRAY_BUFFER.
	 */
	bind (program: IgeWebGlProgram): void {
		const gl = this._gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		this._boundLocations.length = 0;

		for (let i = 0; i < INSTANCE_ATTRIBUTES.length; i++) {
			const attr = INSTANCE_ATTRIBUTES[i];
			const location = program.getAttributeLocation(attr.name);
			if (location === -1) continue;
			gl.enableVertexAttribArray(location);
			gl.vertexAttribPointer(location, 4, gl.FLOAT, false, INSTANCE_STRIDE, attr.offset);
			gl.vertexAttribDivisor(location, 1);
			this._boundLocations.push(location);
		}
	}

	/**
	 * Reset divisors and disable the instance attributes. Divisor state is
	 * global per attribute index (no VAOs are in use), so leaving it set
	 * would corrupt later non-instanced draws that reuse the index.
	 */
	unbind (): void {
		const gl = this._gl;
		for (let i = 0; i < this._boundLocations.length; i++) {
			const location = this._boundLocations[i];
			gl.vertexAttribDivisor(location, 0);
			gl.disableVertexAttribArray(location);
		}
		this._boundLocations.length = 0;
	}

	destroy (): void {
		if (this._buffer) this._gl.deleteBuffer(this._buffer);
		this._buffer = null;
	}
}

/**
 * Bone palette texture for instanced skinned meshes. Each skinned item that
 * is rendered this frame gets one row; each bone uses four RGBA32F texels
 * (the four columns of its skin matrix). The texture is uploaded once per
 * frame and shared by every viewport and shadow pass.
 */
export class IgeWebGlBonePalette {
	/** Texels per row (4 per bone). */
	static readonly WIDTH = MAX_BONES * 4;

	protected _gl: WebGL2RenderingContext;
	protected _texture: WebGLTexture | null;
	protected _height = 0;
	protected _data: Float32Array = new Float32Array(0);
	protected _rows = 0;
	protected _uploadedRows = 0;

	constructor (gl: WebGL2RenderingContext) {
		this._gl = gl;
		this._texture = gl.createTexture();
	}

	get texture (): WebGLTexture | null {
		return this._texture;
	}

	get width (): number {
		return IgeWebGlBonePalette.WIDTH;
	}

	get height (): number {
		return this._height;
	}

	/** Start a new frame; rows are reassigned from zero. */
	begin (): void {
		this._rows = 0;
		this._uploadedRows = 0;
	}

	/**
	 * Copy a skeleton's skin matrices into the next free row and return the
	 * row index for the instance attribute.
	 */
	addSkeleton (skeleton: IgeSkeleton): number {
		const row = this._rows++;
		const rowFloats = IgeWebGlBonePalette.WIDTH * 4;
		const needed = (row + 1) * rowFloats;

		if (this._data.length < needed) {
			let rows = Math.max(16, this._data.length / rowFloats);
			while (rows * rowFloats < needed) rows *= 2;
			const next = new Float32Array(rows * rowFloats);
			next.set(this._data);
			this._data = next;
		}

		const boneFloats = Math.min(skeleton.data.boneCount, MAX_BONES) * 16;
		this._data.set(skeleton.skinMatrices.subarray(0, boneFloats), row * rowFloats);
		return row;
	}

	/**
	 * Upload any rows written since the last upload, growing the texture
	 * when needed. Binds the texture to `unit` as a side effect.
	 */
	upload (unit: number): void {
		const gl = this._gl;
		const rowFloats = IgeWebGlBonePalette.WIDTH * 4;
		const rowsNeeded = Math.max(1, this._rows);

		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		if (rowsNeeded > this._height) {
			let height = Math.max(16, this._height);
			while (height < rowsNeeded) height *= 2;
			this._height = height;
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, IgeWebGlBonePalette.WIDTH, height, 0, gl.RGBA, gl.FLOAT, null);
			this._uploadedRows = 0;
		}

		if (this._rows > this._uploadedRows) {
			const first = this._uploadedRows;
			const count = this._rows - first;
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				first,
				IgeWebGlBonePalette.WIDTH,
				count,
				gl.RGBA,
				gl.FLOAT,
				this._data.subarray(first * rowFloats, (first + count) * rowFloats)
			);
			this._uploadedRows = this._rows;
		}
	}

	destroy (): void {
		if (this._texture) this._gl.deleteTexture(this._texture);
		this._texture = null;
	}
}
