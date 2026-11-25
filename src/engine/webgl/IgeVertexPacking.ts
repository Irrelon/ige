/**
 * Vertex packing: a mesh's arrays interleaved into the one vertex buffer the renderer uploads, in float32 or in
 * compact (quantised) formats. Plain typed-array work with no engine or DOM, so it runs in a worker as well as on the
 * main thread: a worker can hand the renderer a mesh already packed (`IgeGeometryData3d.packed`), and the main thread
 * only copies it to the GPU.
 *
 * Quantised attributes are integers the GPU reads as floats (`snorm16`: -1 to 1, `unorm16`: 0 to 1, and 8-bit
 * versions). Positions and texture coordinates rarely fit those ranges, so they're stored fitted to the mesh's bounds
 * with a decode (scale and offset) that the renderer applies when it draws: positions through the world matrix,
 * texture coordinates through the material's texture transform. Normals and tangents are unit length (a tangent's
 * handedness is 1 or -1), so they fit as they are.
 *
 * @example #Halve a mesh's GPU memory (32 bytes a vertex to 16)
 *     const compact = quantiseGeometry(mesh);
 *     entity.geometry(compact);
 */
import type { IgeGpuVertexFormat } from "@/engine/gpu/IgeGpuDevice";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** How one attribute is stored: float32, or a normalised integer of 16 or 8 bits (signed or not). */
export type IgeVertexEncoding = "float32" | "snorm16" | "unorm16" | "snorm8" | "unorm8";

/** The attributes a packed mesh can have (the shaders' inputs are `a_` and the name: `a_position`...). */
export type IgeVertexAttributeName = "position" | "normal" | "uv" | "color" | "boneWeights" | "boneIndices" | "tangent";

/** Stored positions back to the mesh's own: decoded = stored × scale + offset (one scale for every axis). */
export interface IgePositionDecode {
	scale: number;
	offset: [number, number, number];
}

/** Stored texture coordinates back to the mesh's own: decoded = stored × scale + offset. */
export interface IgeUvDecode {
	scale: [number, number];
	offset: [number, number];
}

/** How to store each attribute. Missing ones are float32 (as unpacked meshes always were). */
export interface IgeVertexEncodings {
	position?: IgeVertexEncoding;
	normal?: "float32" | "snorm16" | "snorm8";
	uv?: IgeVertexEncoding;
	color?: "float32" | "unorm16" | "unorm8";
	boneWeights?: "float32" | "unorm16" | "unorm8";
	/** Tangents for normal maps (x, y, z and the handedness w). */
	tangent?: "float32" | "snorm16" | "snorm8";
	/**
	 * The decode quantised positions are stored with. Leave it out to fit the mesh's bounds (the best precision);
	 * give it when the arrays are already in the stored form, as a quantised glTF's are (scale 1 for normalised ones,
	 * 32767 for unnormalised shorts).
	 */
	positionDecode?: IgePositionDecode;
	/**
	 * The decode quantised texture coordinates are stored with. Leave it out to store them as they are when they fit
	 * the encoding's range (0 to 1 for unorm, -1 to 1 for snorm) and fit them otherwise (tiling textures).
	 */
	uvDecode?: IgeUvDecode;
}

/** One attribute of a packed vertex: its format on the GPU and where it is in the vertex (bytes). */
export interface IgePackedAttribute {
	name: IgeVertexAttributeName;
	format: IgeGpuVertexFormat;
	offset: number;
}

/**
 * A mesh's vertices interleaved and ready to upload (`IgeGeometryData3d.packed`). Plain data: it can be posted from
 * a worker, its buffer transferred rather than copied (`geometryTransferables()`).
 */
export interface IgePackedVertices {
	/** The interleaved vertices, `count` × `stride` bytes. */
	data: ArrayBuffer;
	/** Bytes from one vertex to the next (a multiple of 4). */
	stride: number;
	/** Vertices. */
	count: number;
	attributes: IgePackedAttribute[];
	/** Quantised positions' decode (none: stored as they are). */
	positionDecode?: IgePositionDecode;
	/** Quantised texture coordinates' decode (none: stored as they are). */
	uvDecode?: IgeUvDecode;
}

/** The arrays packing reads (an `IgeGeometryData3d` has them). */
export interface IgeVertexArrays {
	vertices?: ArrayLike<number>;
	normals?: ArrayLike<number>;
	uvs?: ArrayLike<number>;
	colors?: ArrayLike<number>;
	boneWeights?: ArrayLike<number>;
	boneIndices?: ArrayLike<number>;
	/** Four a vertex (x, y, z, handedness); packed only when there are exactly four for every vertex. */
	tangents?: ArrayLike<number>;
}

/** The arrays unpacking gives back, as floats in the mesh's own units. */
export interface IgeUnpackedVertices {
	vertices: Float32Array;
	normals?: Float32Array;
	uvs?: Float32Array;
	colors?: Float32Array;
	boneWeights?: Float32Array;
	boneIndices?: Uint8Array;
	tangents?: Float32Array;
}

/** Compact encodings: 16 bytes a vertex for a position, normal and texture coordinate (32 as floats); a tangent adds 4 (16 as floats). */
export const IGE_QUANTISED_ENCODINGS: Readonly<IgeVertexEncodings> = Object.freeze({
	position: "snorm16",
	normal: "snorm8",
	uv: "unorm16",
	color: "unorm8",
	boneWeights: "unorm16",
	tangent: "snorm8"
});

const BITS: Record<Exclude<IgeVertexEncoding, "float32">, { bytes: 1 | 2; max: number; signed: boolean }> = {
	snorm16: { bytes: 2, max: 32767, signed: true },
	unorm16: { bytes: 2, max: 65535, signed: false },
	snorm8: { bytes: 1, max: 127, signed: true },
	unorm8: { bytes: 1, max: 255, signed: false }
};

/** Each attribute's components and the shader input it feeds, in the order they're laid out. */
const ATTRIBUTES: { name: IgeVertexAttributeName; components: number }[] = [
	{ name: "position", components: 3 },
	{ name: "normal", components: 3 },
	{ name: "uv", components: 2 },
	{ name: "color", components: 4 },
	{ name: "boneWeights", components: 4 },
	{ name: "boneIndices", components: 4 },
	{ name: "tangent", components: 4 }
];

const SOURCE: Record<IgeVertexAttributeName, keyof IgeVertexArrays> = {
	position: "vertices", normal: "normals", uv: "uvs", color: "colors", boneWeights: "boneWeights", boneIndices: "boneIndices", tangent: "tangents"
};

/** A float32 format of n components. */
function floatFormat (n: number): IgeGpuVertexFormat {
	return n === 1 ? "float32" : `float32x${n}` as IgeGpuVertexFormat;
}

/** The GPU format of an encoding with n components (8 and 16 bit ones come in twos and fours). */
export function vertexFormatOf (encoding: IgeVertexEncoding, components: number): IgeGpuVertexFormat {
	if (encoding === "float32") return floatFormat(components);
	return `${encoding}x${components <= 2 ? 2 : 4}` as IgeGpuVertexFormat;
}

/** Bytes a format takes in a vertex, rounded up to 4 (every attribute starts on a 4-byte boundary). */
export function vertexFormatBytes (format: IgeGpuVertexFormat): number {
	const m = /^(float32|unorm8|snorm8|unorm16|snorm16|uint8|uint16|uint32|sint32)(?:x(\d))?$/.exec(format);
	if (!m) throw new Error(`IgeVertexPacking: unknown vertex format "${format}"`);
	const n = m[2] ? +m[2] : 1;
	const size = m[1].endsWith("8") ? 1 : m[1].endsWith("16") ? 2 : 4;
	return Math.ceil((size * n) / 4) * 4;
}

/** How the GPU reads one stored integer of an encoding back as a float. */
function decodeComponent (value: number, encoding: Exclude<IgeVertexEncoding, "float32">): number {
	const b = BITS[encoding];
	return b.signed ? Math.max(value / b.max, -1) : value / b.max;
}

/** The encoding a GPU format stores in (float32 for the float formats). */
function encodingOf (format: IgeGpuVertexFormat): IgeVertexEncoding {
	const m = /^(float32|unorm8|snorm8|unorm16|snorm16)/.exec(format);
	return (m ? m[1] : "float32") as IgeVertexEncoding;
}

/** Bounds of a list of xyz positions: the box, its centre and the sphere round the centre through the furthest point. */
export function vertexBounds (positions: ArrayLike<number>, count: number = Math.floor(positions.length / 3)): {
	min: [number, number, number]; max: [number, number, number]; center: [number, number, number]; radius: number;
} {
	if (count <= 0) return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 0 };
	let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
	for (let i = 0; i < count; i++) {
		const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (z < minZ) minZ = z;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		if (z > maxZ) maxZ = z;
	}
	const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
	let r2 = 0;
	for (let i = 0; i < count; i++) {
		const dx = positions[i * 3] - cx, dy = positions[i * 3 + 1] - cy, dz = positions[i * 3 + 2] - cz;
		const d = dx * dx + dy * dy + dz * dz;
		if (d > r2) r2 = d;
	}
	return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center: [cx, cy, cz], radius: Math.sqrt(r2) };
}

/** A decode that fits positions' bounds into a signed (centred) or unsigned (from the corner) range. */
function fitPositions (positions: ArrayLike<number>, count: number, signed: boolean): IgePositionDecode {
	const b = vertexBounds(positions, count);
	const extent = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
	if (signed) return { scale: extent > 0 ? extent / 2 : 1, offset: b.center };
	return { scale: extent > 0 ? extent : 1, offset: b.min };
}

/** A decode for texture coordinates that don't fit the range as they are (none when they do). */
function fitUvs (uvs: ArrayLike<number>, count: number, signed: boolean): IgeUvDecode | undefined {
	let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
	for (let i = 0; i < count; i++) {
		const u = uvs[i * 2], v = uvs[i * 2 + 1];
		if (u < minU) minU = u;
		if (v < minV) minV = v;
		if (u > maxU) maxU = u;
		if (v > maxV) maxV = v;
	}
	const lo = signed ? -1 : 0;
	if (count === 0 || (minU >= lo && minV >= lo && maxU <= 1 && maxV <= 1)) return undefined;
	if (signed) {
		return { scale: [(maxU - minU) / 2 || 1, (maxV - minV) / 2 || 1], offset: [(minU + maxU) / 2, (minV + maxV) / 2] };
	}
	return { scale: [maxU - minU || 1, maxV - minV || 1], offset: [minU, minV] };
}

function isIdentityPositionDecode (d: IgePositionDecode | undefined): boolean {
	return !d || (d.scale === 1 && d.offset[0] === 0 && d.offset[1] === 0 && d.offset[2] === 0);
}

/** The vertex count of a set of arrays (from its positions). */
function vertexCountOf (data: IgeVertexArrays): number {
	return data.vertices ? Math.floor(data.vertices.length / 3) : 0;
}

/** Whether a mesh's tangents are packed: four for every vertex (loaders make them only for meshes with a normal map). */
function hasTangents (data: IgeVertexArrays, count: number): boolean {
	return !!data.tangents && count > 0 && data.tangents.length === count * 4;
}

/**
 * A mesh's arrays interleaved into one vertex buffer, each attribute in its encoding (float32 unless given). The
 * layout is position, normal, uv, colour, bone weights, bone indices, tangent (those present), each on a 4-byte
 * boundary.
 * All float32 gives the same bytes the renderer has always uploaded.
 *
 * Skinned meshes (bone weights and indices) keep float32 positions unless the positions need no decode (a
 * quantised glTF's normalised ones): a skin is applied before the world matrix, where the decode goes.
 * @example #Pack a mesh in a worker, ready to upload
 *     const packed = packVertices(mesh, IGE_QUANTISED_ENCODINGS);
 *     postMessage({ packed, indices: mesh.indices }, [packed.data, mesh.indices.buffer]);
 */
export function packVertices (data: IgeVertexArrays, encodings: IgeVertexEncodings = {}): IgePackedVertices {
	const count = vertexCountOf(data);
	const colorSize = data.colors && count > 0 ? Math.round(data.colors.length / count) : 0;
	const skinned = !!(data.boneWeights && data.boneIndices);
	const present = ATTRIBUTES.filter((a) => {
		if (a.name === "color") return colorSize === 3 || colorSize === 4;
		if (a.name === "tangent") return hasTangents(data, count);
		return !!data[SOURCE[a.name]];
	});

	// Each attribute's encoding (bone indices are float32: the shaders read them as floats)
	const enc: Partial<Record<IgeVertexAttributeName, IgeVertexEncoding>> = {};
	let positionDecode: IgePositionDecode | undefined;
	let uvDecode: IgeUvDecode | undefined;
	for (const a of present) {
		let e: IgeVertexEncoding = a.name === "boneIndices" ? "float32" : (encodings[a.name as keyof IgeVertexEncodings] as IgeVertexEncoding | undefined) ?? "float32";
		if (a.name === "position" && e !== "float32") {
			positionDecode = encodings.positionDecode ?? fitPositions(data.vertices!, count, BITS[e].signed);
			// A skin's bones move positions before the world matrix, so a decode there would be applied in the wrong place
			if (skinned && !isIdentityPositionDecode(positionDecode)) {
				e = "float32";
				positionDecode = undefined;
			}
			if (isIdentityPositionDecode(positionDecode)) positionDecode = undefined;
		}
		if (a.name === "uv" && e !== "float32") {
			uvDecode = encodings.uvDecode ?? fitUvs(data.uvs!, count, BITS[e].signed);
		}
		enc[a.name] = e;
	}

	// Layout
	const attributes: IgePackedAttribute[] = [];
	let stride = 0;
	for (const a of present) {
		const format = vertexFormatOf(enc[a.name]!, a.components);
		attributes.push({ name: a.name, format, offset: stride });
		stride += vertexFormatBytes(format);
	}

	const buffer = new ArrayBuffer(count * stride);
	const allFloat = present.every((a) => enc[a.name] === "float32");
	if (allFloat) {
		packFloats(new Float32Array(buffer), data, present, attributes, stride / 4, count, colorSize);
	} else {
		const views = { f32: new Float32Array(buffer), i16: new Int16Array(buffer), u16: new Uint16Array(buffer), i8: new Int8Array(buffer), u8: new Uint8Array(buffer) };
		for (let k = 0; k < present.length; k++) {
			const a = present[k], at = attributes[k];
			const src = data[SOURCE[a.name]]!;
			const srcSize = a.name === "color" ? colorSize : a.components;
			const stored = a.components <= 2 ? 2 : 4;
			let scale: ArrayLike<number> | undefined, offset: ArrayLike<number> | undefined;
			if (a.name === "position" && positionDecode) {
				scale = [positionDecode.scale, positionDecode.scale, positionDecode.scale];
				offset = positionDecode.offset;
			} else if (a.name === "uv" && uvDecode) {
				scale = uvDecode.scale;
				offset = uvDecode.offset;
			}
			writeAttribute(views, src, srcSize, a.components, stored, enc[a.name]!, at.offset, stride, count, scale, offset, a.name === "color" ? 1 : 0);
		}
	}

	const packed: IgePackedVertices = { data: buffer, stride, count, attributes };
	if (positionDecode) packed.positionDecode = positionDecode;
	if (uvDecode) packed.uvDecode = uvDecode;
	return packed;
}

/** The all-float32 layout, written as the renderer always wrote it (alpha 1 for three-component colours). */
function packFloats (
	out: Float32Array, data: IgeVertexArrays, present: { name: IgeVertexAttributeName; components: number }[],
	attributes: IgePackedAttribute[], floatsPerVertex: number, count: number, colorSize: number
): void {
	for (let k = 0; k < present.length; k++) {
		const a = present[k];
		const src = data[SOURCE[a.name]]!;
		const start = attributes[k].offset / 4;
		const n = a.components;
		const srcSize = a.name === "color" ? colorSize : n;
		for (let i = 0, o = start; i < count; i++, o += floatsPerVertex) {
			const s = i * srcSize;
			out[o] = src[s];
			if (n > 1) out[o + 1] = src[s + 1];
			if (n > 2) out[o + 2] = src[s + 2];
			if (n > 3) out[o + 3] = srcSize > 3 ? src[s + 3] : 1;
		}
	}
}

/** One attribute written into the interleaved buffer in its encoding (scale and offset undone first, if given). */
function writeAttribute (
	views: { f32: Float32Array; i16: Int16Array; u16: Uint16Array; i8: Int8Array; u8: Uint8Array },
	src: ArrayLike<number>, srcSize: number, components: number, stored: number, encoding: IgeVertexEncoding,
	offset: number, stride: number, count: number, scale?: ArrayLike<number>, shift?: ArrayLike<number>, pad: number = 0
): void {
	if (encoding === "float32") {
		const f = views.f32, step = stride / 4;
		for (let i = 0, o = offset / 4; i < count; i++, o += step) {
			for (let c = 0; c < components; c++) f[o + c] = c < srcSize ? src[i * srcSize + c] : pad;
		}
		return;
	}
	const b = BITS[encoding];
	const lo = b.signed ? -1 : 0, max = b.max;
	const out = b.bytes === 2 ? (b.signed ? views.i16 : views.u16) : (b.signed ? views.i8 : views.u8);
	const step = stride / b.bytes;
	const padStored = Math.round(pad * max);
	for (let i = 0, o = offset / b.bytes; i < count; i++, o += step) {
		for (let c = 0; c < stored; c++) {
			if (c >= components) {
				out[o + c] = 0;
				continue;
			}
			if (c >= srcSize) {
				out[o + c] = padStored;
				continue;
			}
			let v = src[i * srcSize + c];
			if (scale) v = (v - shift![c]) / scale[c];
			v = v < lo ? lo : v > 1 ? 1 : v;
			out[o + c] = Math.round(v * max);
		}
	}
}

/**
 * A packed mesh's arrays back as floats in the mesh's own units (decodes applied): for code that reads vertices on
 * the CPU (bounds, raycasts, tests). Precision is what was stored.
 */
export function unpackVertices (packed: IgePackedVertices): IgeUnpackedVertices {
	const { data, stride, count } = packed;
	const views = { f32: new Float32Array(data), i16: new Int16Array(data), u16: new Uint16Array(data), i8: new Int8Array(data), u8: new Uint8Array(data) };
	const out: Partial<IgeUnpackedVertices> = {};
	for (const at of packed.attributes) {
		const def = ATTRIBUTES.find((a) => a.name === at.name)!;
		const n = def.components;
		const arr = new Float32Array(count * n);
		const encoding = encodingOf(at.format);
		if (encoding === "float32") {
			const step = stride / 4;
			for (let i = 0, o = at.offset / 4; i < count; i++, o += step) for (let c = 0; c < n; c++) arr[i * n + c] = views.f32[o + c];
		} else {
			const b = BITS[encoding];
			const src = b.bytes === 2 ? (b.signed ? views.i16 : views.u16) : (b.signed ? views.i8 : views.u8);
			const step = stride / b.bytes;
			for (let i = 0, o = at.offset / b.bytes; i < count; i++, o += step) {
				for (let c = 0; c < n; c++) arr[i * n + c] = decodeComponent(src[o + c], encoding);
			}
		}
		if (at.name === "position" && packed.positionDecode) {
			const { scale, offset } = packed.positionDecode;
			for (let i = 0; i < arr.length; i++) arr[i] = arr[i] * scale + offset[i % 3];
		}
		if (at.name === "uv" && packed.uvDecode) {
			const { scale, offset } = packed.uvDecode;
			for (let i = 0; i < arr.length; i++) arr[i] = arr[i] * scale[i % 2] + offset[i % 2];
		}
		switch (at.name) {
			case "position": out.vertices = arr; break;
			case "normal": out.normals = arr; break;
			case "uv": out.uvs = arr; break;
			case "color": out.colors = arr; break;
			case "boneWeights": out.boneWeights = arr; break;
			case "boneIndices": out.boneIndices = Uint8Array.from(arr); break;
			case "tangent": out.tangents = arr; break;
		}
	}
	out.vertices ??= new Float32Array(0);
	return out as IgeUnpackedVertices;
}

/** A position decode as a column-major 4x4 matrix (scale, then offset), for drawing: world × decode. */
export function positionDecodeMatrix (decode: IgePositionDecode): Float32Array {
	const s = decode.scale, o = decode.offset;
	return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, o[0], o[1], o[2], 1]);
}

/**
 * A copy of a mesh with its vertices quantised (`packed`, ready to upload): 16 bytes a vertex for a position,
 * normal and texture coordinate instead of 32. Its bounds are worked out (in its own units, for culling), and its
 * float arrays left out unless `keepArrays` (raycasts, decals and physics read those; a mesh with only `packed`
 * is drawn and culled like any other). Indices are shared, not copied.
 * @example #Quantise a generated mesh, keeping its arrays for raycasts
 *     const compact = quantiseGeometry(mesh, IGE_QUANTISED_ENCODINGS, { keepArrays: true });
 */
export function quantiseGeometry (
	data: IgeGeometryData3d,
	encodings: IgeVertexEncodings = IGE_QUANTISED_ENCODINGS,
	options: { keepArrays?: boolean; id?: string } = {}
): IgeGeometryData3d {
	if (!data.vertices) throw new Error(`quantiseGeometry: "${data.id}" has no vertices`);
	const packed = packVertices(data, encodings);
	const out: IgeGeometryData3d = { id: options.id ?? data.id, type: data.type ?? "vertexArr", packed };
	if (data.indices) out.indices = data.indices;
	if (data.skeletonId !== undefined) out.skeletonId = data.skeletonId;
	if (data.skinIndex !== undefined) out.skinIndex = data.skinIndex;
	const b = vertexBounds(data.vertices);
	out.boundingBox = data.boundingBox ?? { min: b.min, max: b.max };
	out.boundingSphere = data.boundingSphere ?? { center: b.center, radius: b.radius };
	if (options.keepArrays) {
		for (const key of ["vertices", "normals", "uvs", "colors", "tangents", "boneWeights", "boneIndices"] as const) {
			if (data[key]) (out as any)[key] = data[key];
		}
	}
	return out;
}

/** Bytes a mesh's vertex and index buffers take on the GPU (packed as it is, or as the renderer will pack it). */
export function geometryGpuBytes (data: IgeGeometryData3d): number {
	const indexBytes = data.indices ? data.indices.byteLength : 0;
	if (data.packed) return data.packed.data.byteLength + indexBytes;
	const count = vertexCountOf(data);
	if (count === 0) return indexBytes;
	const colorSize = data.colors ? Math.round(data.colors.length / count) : 0;
	const e = data.vertexEncodings ?? {};
	let stride = vertexFormatBytes(vertexFormatOf(e.position ?? "float32", 3));
	if (data.normals) stride += vertexFormatBytes(vertexFormatOf(e.normal ?? "float32", 3));
	if (data.uvs) stride += vertexFormatBytes(vertexFormatOf(e.uv ?? "float32", 2));
	if (colorSize === 3 || colorSize === 4) stride += vertexFormatBytes(vertexFormatOf(e.color ?? "float32", 4));
	if (data.boneWeights) stride += vertexFormatBytes(vertexFormatOf(e.boneWeights ?? "float32", 4));
	if (data.boneIndices) stride += 16;
	if (hasTangents(data, count)) stride += vertexFormatBytes(vertexFormatOf(e.tangent ?? "float32", 4));
	return count * stride + indexBytes;
}

/**
 * The buffers of a mesh a worker can hand over without copying (`postMessage(msg, geometryTransferables(mesh))`):
 * its packed vertices, indices and any arrays. The worker's copies are gone afterwards.
 */
export function geometryTransferables (data: IgeGeometryData3d): Transferable[] {
	const out = new Set<ArrayBuffer>();
	const add = (b: ArrayBufferLike | undefined) => {
		if (b && typeof SharedArrayBuffer !== "undefined" && b instanceof SharedArrayBuffer) return;
		if (b && b.byteLength > 0) out.add(b as ArrayBuffer);
	};
	if (data.packed) add(data.packed.data);
	for (const key of ["vertices", "normals", "uvs", "colors", "tangents", "indices", "boneWeights", "boneIndices"] as const) {
		add(data[key]?.buffer);
	}
	return [...out];
}
