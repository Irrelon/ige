import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { type IgeWebGl2GpuDevice, webGl2Buffer } from "@/engine/gpu/IgeWebGl2GpuDevice";
import type { IgeGpuVertexFormat } from "@/engine/gpu/IgeGpuDevice";
import { type IgePackedVertices, packVertices, positionDecodeMatrix, unpackVertices, vertexBounds } from "@/engine/webgl/IgeVertexPacking";

/** Each vertex format as GL's size, type and normalized flag (for the passes still binding attributes themselves). */
const GL_FORMATS: Partial<Record<IgeGpuVertexFormat, [number, number, boolean]>> = {
	float32: [1, 0x1406, false], float32x2: [2, 0x1406, false], float32x3: [3, 0x1406, false], float32x4: [4, 0x1406, false],
	unorm8x2: [2, 0x1401, true], unorm8x4: [4, 0x1401, true], snorm8x2: [2, 0x1400, true], snorm8x4: [4, 0x1400, true],
	unorm16x2: [2, 0x1403, true], unorm16x4: [4, 0x1403, true], snorm16x2: [2, 0x1402, true], snorm16x4: [4, 0x1402, true]
};

/**
 * Manages geometry (vertex and index buffers, on the GPU device) creation and caching for WebGL renderer.
 */
export class IgeWebGlGeometryManager extends IgeBaseClass {
	classId = "IgeWebGlGeometryManager";

	protected _gl: WebGL2RenderingContext;
	protected _resourceManager: IgeWebGlResourceManager;
	protected _device: IgeWebGl2GpuDevice;

	// Cached geometries
	protected _geometries: Map<string, IgeWebGlGeometry> = new Map();

	// Shared quad geometry for all sprites (created once, reused)
	protected _sharedQuadGeometry?: IgeWebGlGeometry;

	// Bytes held by every geometry's buffers on the GPU
	protected _bytes = 0;

	constructor(
		gl: WebGL2RenderingContext,
		resourceManager: IgeWebGlResourceManager,
		device: IgeWebGl2GpuDevice
	) {
		super();
		this._gl = gl;
		this._resourceManager = resourceManager;
		this._device = device;

		// Create shared quad geometry for sprites
		this._createSharedQuadGeometry();
	}

	/**
	 * A geometry's buffers made on the device and filled. (Called amid GL code of the renderer's own: what the device
	 * knows of GL's state is forgotten first, and the buffer bindings are left as GL code made them, none.)
	 */
	protected _upload(geometry: IgeWebGlGeometry, vertices: ArrayBufferView | ArrayBuffer, indices?: Uint16Array | Uint32Array): void {
		const gl = this._gl, d = this._device;
		d.invalidate();
		const bytes = ArrayBuffer.isView(vertices) ? vertices : new Uint8Array(vertices);
		// (Made with their contents: one copy each)
		geometry.gpuVertex = d.createBuffer({ size: bytes.byteLength, usage: "vertex", memory: "geometry", data: bytes, label: `${geometry.id} vertices` });
		geometry.vertexBuffer = webGl2Buffer(d, geometry.gpuVertex);
		if (indices) {
			geometry.gpuIndex = d.createBuffer({ size: indices.byteLength, usage: "index", memory: "geometry", data: indices, label: `${geometry.id} indices` });
			geometry.indexBuffer = webGl2Buffer(d, geometry.gpuIndex);
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	/**
	 * Create a shared quad geometry used by all 2D sprites.
	 * Quad is 1x1 centered at origin, to be scaled by entity bounds.
	 */
	protected _createSharedQuadGeometry(): void {
		const gl = this._gl;

		// Create geometry
		const geometry = new IgeWebGlGeometry("shared_quad", gl.TRIANGLES);

		// Vertex data: position (x, y) and UV (u, v)
		// Interleaved format: [x, y, u, v, x, y, u, v, ...]
		// UV V coordinates are flipped (1-v) to match image coordinate system
		// where (0,0) is top-left and Y increases downward
		const vertices = new Float32Array([
			// Position (x, y), UV (u, v)
			-0.5, -0.5,  0.0, 1.0, // Bottom-left (V=1 for image bottom)
			 0.5, -0.5,  1.0, 1.0, // Bottom-right
			 0.5,  0.5,  1.0, 0.0, // Top-right (V=0 for image top)
			-0.5,  0.5,  0.0, 0.0  // Top-left
		]);

		// Index data (two triangles forming a quad)
		const indices = new Uint16Array([
			0, 1, 2, // First triangle
			0, 2, 3  // Second triangle
		]);

		// Its vertex and index buffers
		this._upload(geometry, vertices, indices);

		// Define vertex attributes
		const stride = 4 * 4; // 4 floats per vertex * 4 bytes per float
		geometry
			.addAttribute("a_position", 2, gl.FLOAT, false, stride, 0)
			.addAttribute("a_uv", 2, gl.FLOAT, false, stride, 2 * 4);

		geometry.setVertexData(vertices, 4);
		geometry.setIndexData(indices, 6);

		this._sharedQuadGeometry = geometry;
		this._geometries.set("shared_quad", geometry);

		this.log("Created shared quad geometry for sprites");
	}

	/**
	 * Get the shared quad geometry.
	 */
	getSharedQuadGeometry(): IgeWebGlGeometry | undefined {
		return this._sharedQuadGeometry;
	}

	/**
	 * Create geometry from IgeGeometryData3d: its vertices packed (data.packed as it is, already interleaved, or its
	 * arrays packed now in data.vertexEncodings, float32 by default) and uploaded with its indices.
	 */
	createGeometryFromData(geometryId: string, data: IgeGeometryData3d): IgeWebGlGeometry | null | undefined {
		// Check if already cached
		if (this._geometries.has(geometryId)) {
			return this._geometries.get(geometryId) || null;
		}

		const gl = this._gl;

		if (!data.vertices && !data.packed) {
			this.log(`Geometry data "${geometryId}" has no vertex data`, "error");
			return null;
		}

		// Interleaved: as the worker (or whoever) packed it, or packed here
		const packed = data.packed ?? packVertices(data, data.vertexEncodings);
		const geometry = new IgeWebGlGeometry(geometryId, gl.TRIANGLES);

		// Its vertex buffer, and its index buffer if it has indices
		this._upload(geometry, packed.data, data.indices ?? undefined);
		if (data.indices) geometry.setIndexData(data.indices);
		geometry.gpuBytes = packed.data.byteLength + (data.indices?.byteLength ?? 0);
		this._bytes += geometry.gpuBytes;

		// Its vertex attributes, by the layout it was packed in
		for (const a of packed.attributes) {
			const [size, type, normalized] = GL_FORMATS[a.format] ?? [4, gl.FLOAT, false];
			geometry.addAttribute(`a_${a.name}`, size, type, normalized, packed.stride, a.offset, a.format);
			if (a.name === "color") geometry.hasVertexColors = true;
			if (a.name === "tangent") geometry.hasTangents = true;
		}
		geometry.setVertexData(packed.data, packed.count);
		if (packed.positionDecode) geometry.positionDecode = positionDecodeMatrix(packed.positionDecode);
		if (packed.uvDecode) geometry.uvDecode = [packed.uvDecode.scale[0], packed.uvDecode.scale[1], packed.uvDecode.offset[0], packed.uvDecode.offset[1]];

		// Set skinning information
		if (packed.attributes.some((a) => a.name === "boneWeights") && packed.attributes.some((a) => a.name === "boneIndices")) {
			geometry.isSkinned = true;
			geometry.skeletonId = data.skeletonId;
		}

		this._computeBounds(geometry, data, packed.count, packed);

		// Cache geometry. Not logged: dynamic content (e.g. terrain chunks)
		// creates many geometries.
		this._geometries.set(geometryId, geometry);
		return geometry;
	}

	/** Bytes held on the GPU by every geometry's vertex and index buffers. */
	gpuBytes(): number {
		return this._bytes;
	}

	/**
	 * Compute the local-space bounding sphere for a geometry. Uses the data's
	 * own bounding sphere/box when provided, otherwise derives one from the
	 * vertex positions (box centre + furthest vertex). Skinned meshes are
	 * measured in bind pose, so their radius is padded to cover animation.
	 */
	protected _computeBounds(geometry: IgeWebGlGeometry, data: IgeGeometryData3d, vertexCount: number, packed?: IgePackedVertices): void {
		let cx = 0, cy = 0, cz = 0, radius = -1;

		if (!data.boundingSphere && !data.vertices && packed && vertexCount > 0) {
			// Packed only (built in a worker without bounds): measured from what was packed, in the mesh's own units
			const b = vertexBounds(unpackVertices(packed).vertices, vertexCount);
			cx = b.center[0];
			cy = b.center[1];
			cz = b.center[2];
			radius = b.radius;
		} else if (data.boundingSphere) {
			cx = data.boundingSphere.center[0];
			cy = data.boundingSphere.center[1];
			cz = data.boundingSphere.center[2];
			radius = data.boundingSphere.radius;
		} else if (data.vertices && vertexCount > 0) {
			const v = data.vertices;
			let minX = Infinity, minY = Infinity, minZ = Infinity;
			let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

			if (data.boundingBox) {
				[minX, minY, minZ] = data.boundingBox.min;
				[maxX, maxY, maxZ] = data.boundingBox.max;
			} else {
				for (let i = 0; i < vertexCount; i++) {
					const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
					if (x < minX) minX = x;
					if (y < minY) minY = y;
					if (z < minZ) minZ = z;
					if (x > maxX) maxX = x;
					if (y > maxY) maxY = y;
					if (z > maxZ) maxZ = z;
				}
			}

			cx = (minX + maxX) / 2;
			cy = (minY + maxY) / 2;
			cz = (minZ + maxZ) / 2;

			let maxDistSq = 0;
			for (let i = 0; i < vertexCount; i++) {
				const dx = v[i * 3] - cx, dy = v[i * 3 + 1] - cy, dz = v[i * 3 + 2] - cz;
				const d = dx * dx + dy * dy + dz * dz;
				if (d > maxDistSq) maxDistSq = d;
			}
			radius = Math.sqrt(maxDistSq);
		}

		geometry.meshRadius = radius;
		if (radius >= 0 && geometry.isSkinned) {
			radius *= 1.5;
		}

		geometry.boundsCenterX = cx;
		geometry.boundsCenterY = cy;
		geometry.boundsCenterZ = cz;
		geometry.boundsRadius = radius;
	}

	/**
	 * Get a cached geometry by id.
	 */
	getGeometry(geometryId: string): IgeWebGlGeometry | undefined {
		return this._geometries.get(geometryId);
	}

	/**
	 * Check if a geometry exists.
	 */
	hasGeometry(geometryId: string): boolean {
		return this._geometries.has(geometryId);
	}

	/**
	 * Delete a geometry and its buffers.
	 */
	deleteGeometry(geometryId: string): void {
		const geometry = this._geometries.get(geometryId);
		if (!geometry) {
			return;
		}

		// Delete buffers
		this._bytes -= geometry.gpuBytes;
		if (geometry.gpuVertex) this._device.destroyBuffer(geometry.gpuVertex);
		if (geometry.gpuIndex) this._device.destroyBuffer(geometry.gpuIndex);
		geometry.vertexBuffer = geometry.indexBuffer = null;

		// Remove from cache
		this._geometries.delete(geometryId);
	}

	/**
	 * Bind a geometry's buffers and set up vertex attributes.
	 */
	bindGeometry(geometry: IgeWebGlGeometry, program: { getAttributeLocation: (name: string) => number }): void {
		const gl = this._gl;

		// Bind vertex buffer
		if (geometry.vertexBuffer) {
			gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertexBuffer);
		}

		// Bind index buffer
		if (geometry.indexBuffer) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer);
		}

		// Set up vertex attributes
		for (const attr of geometry.attributes) {
			const location = program.getAttributeLocation(attr.name);
			if (location !== -1) {
				gl.enableVertexAttribArray(location);
				gl.vertexAttribPointer(
					location,
					attr.size,
					attr.type,
					attr.normalized,
					attr.stride,
					attr.offset
				);
			}
		}
	}

	/**
	 * Unbind geometry buffers and disable vertex attributes.
	 */
	unbindGeometry(geometry: IgeWebGlGeometry, program: { getAttributeLocation: (name: string) => number }): void {
		const gl = this._gl;

		// Disable vertex attributes
		for (const attr of geometry.attributes) {
			const location = program.getAttributeLocation(attr.name);
			if (location !== -1) {
				gl.disableVertexAttribArray(location);
			}
		}

		// Unbind buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	/**
	 * Draw a geometry.
	 */
	drawGeometry(geometry: IgeWebGlGeometry): void {
		const gl = this._gl;

		if (geometry.indexBuffer && geometry.indexCount > 0) {
			// Draw indexed
			gl.drawElements(geometry.drawMode, geometry.indexCount, geometry.indexType, 0);
		} else if (geometry.vertexCount > 0) {
			// Draw non-indexed
			gl.drawArrays(geometry.drawMode, 0, geometry.vertexCount);
		}
	}

	/**
	 * Get statistics about managed geometries.
	 */
	getStats() {
		return {
			geometryCount: this._geometries.size,
			geometries: Array.from(this._geometries.keys())
		};
	}

	/**
	 * Clean up all geometries.
	 */
	cleanup(): void {
		this._geometries.forEach((geometry, id) => {
			this.deleteGeometry(id);
		});
		this._geometries.clear();
		this._sharedQuadGeometry = undefined;
	}
}
