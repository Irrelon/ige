import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/**
 * Manages geometry (VBO/IBO) creation and caching for WebGL renderer.
 */
export class IgeWebGlGeometryManager extends IgeBaseClass {
	classId = "IgeWebGlGeometryManager";

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
	protected _resourceManager: IgeWebGlResourceManager;

	// Cached geometries
	protected _geometries: Map<string, IgeWebGlGeometry> = new Map();

	// Shared quad geometry for all sprites (created once, reused)
	protected _sharedQuadGeometry?: IgeWebGlGeometry;

	constructor(
		gl: WebGLRenderingContext | WebGL2RenderingContext,
		resourceManager: IgeWebGlResourceManager
	) {
		super();
		this._gl = gl;
		this._resourceManager = resourceManager;

		// Create shared quad geometry for sprites
		this._createSharedQuadGeometry();
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

		// Create and populate vertex buffer
		const vbo = this._resourceManager.createBuffer("shared_quad_vbo");
		if (vbo) {
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			geometry.vertexBuffer = vbo;
		}

		// Create and populate index buffer
		const ibo = this._resourceManager.createBuffer("shared_quad_ibo");
		if (ibo) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			geometry.indexBuffer = ibo;
		}

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
	 * Create geometry from IgeGeometryData3d.
	 */
	createGeometryFromData(geometryId: string, data: IgeGeometryData3d): IgeWebGlGeometry | null | undefined {
		// Check if already cached
		if (this._geometries.has(geometryId)) {
			return this._geometries.get(geometryId) || null;
		}

		const gl = this._gl;

		// Create geometry object
		const geometry = new IgeWebGlGeometry(geometryId, gl.TRIANGLES);

		// Handle different geometry data formats
		if (!data.vertices) {
			this.log(`Geometry data "${geometryId}" has no vertex data`, "error");
			return null;
		}

		// Build interleaved vertex data
		const vertexCount = data.vertices.length / 3; // Assuming vec3 positions
		const hasNormals = !!data.normals;
		const hasUVs = !!data.uvs;
		const hasColors = !!data.colors;

		// Calculate stride
		let componentsPerVertex = 3; // Position (x, y, z)
		if (hasNormals) componentsPerVertex += 3; // Normal (nx, ny, nz)
		if (hasUVs) componentsPerVertex += 2; // UV (u, v)
		if (hasColors) componentsPerVertex += 4; // Color (r, g, b, a)

		const stride = componentsPerVertex * 4; // * 4 bytes per float

		// Build interleaved array
		const interleavedData = new Float32Array(vertexCount * componentsPerVertex);
		let offset = 0;

		for (let i = 0; i < vertexCount; i++) {
			// Position
			interleavedData[offset++] = data.vertices[i * 3];
			interleavedData[offset++] = data.vertices[i * 3 + 1];
			interleavedData[offset++] = data.vertices[i * 3 + 2];

			// Normal
			if (hasNormals && data.normals) {
				interleavedData[offset++] = data.normals[i * 3];
				interleavedData[offset++] = data.normals[i * 3 + 1];
				interleavedData[offset++] = data.normals[i * 3 + 2];
			}

			// UV
			if (hasUVs && data.uvs) {
				interleavedData[offset++] = data.uvs[i * 2];
				interleavedData[offset++] = data.uvs[i * 2 + 1];
			}

			// Color
			if (hasColors && data.colors) {
				interleavedData[offset++] = data.colors[i * 4];
				interleavedData[offset++] = data.colors[i * 4 + 1];
				interleavedData[offset++] = data.colors[i * 4 + 2];
				interleavedData[offset++] = data.colors[i * 4 + 3];
			}
		}

		// Create vertex buffer
		const vbo = this._resourceManager.createBuffer(`${geometryId}_vbo`);
		if (vbo) {
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, interleavedData, gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			geometry.vertexBuffer = vbo;
		} else {
			this.log(`Failed to create VBO for geometry "${geometryId}"`, "error");
			return null;
		}

		// Create index buffer if indices exist
		if (data.indices) {
			const ibo = this._resourceManager.createBuffer(`${geometryId}_ibo`);
			if (ibo) {
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
				geometry.indexBuffer = ibo;
				geometry.setIndexData(data.indices);
			}
		}

		// Define vertex attributes
		let attrOffset = 0;

		// Position attribute
		geometry.addAttribute("a_position", 3, gl.FLOAT, false, stride, attrOffset);
		attrOffset += 3 * 4;

		// Normal attribute
		if (hasNormals) {
			geometry.addAttribute("a_normal", 3, gl.FLOAT, false, stride, attrOffset);
			attrOffset += 3 * 4;
		}

		// UV attribute
		if (hasUVs) {
			geometry.addAttribute("a_uv", 2, gl.FLOAT, false, stride, attrOffset);
			attrOffset += 2 * 4;
		}

		// Color attribute
		if (hasColors) {
			geometry.addAttribute("a_color", 4, gl.FLOAT, false, stride, attrOffset);
			attrOffset += 4 * 4;
		}

		geometry.setVertexData(interleavedData, vertexCount);

		// Cache geometry
		this._geometries.set(geometryId, geometry);

		this.log(`Created geometry "${geometryId}" with ${vertexCount} vertices`);
		return geometry;
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
		this._resourceManager.deleteBuffer(`${geometryId}_vbo`);
		if (geometry.indexBuffer) {
			this._resourceManager.deleteBuffer(`${geometryId}_ibo`);
		}

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
			const indexType = geometry.indexData instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			gl.drawElements(geometry.drawMode, geometry.indexCount, indexType, 0);
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
