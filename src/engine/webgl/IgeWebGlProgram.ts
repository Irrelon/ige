import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeMatrix4 } from "@/engine/core/IgeMatrix4";

/**
 * Cached state for a single uniform: its location plus the last value
 * uploaded through this wrapper. Uniform values belong to the program
 * object in WebGL, so the cache stays valid across useProgram() calls and
 * only needs clearing when the program is relinked.
 */
interface IgeUniformRecord {
	location: WebGLUniformLocation | null;
	hasValue: boolean;
	a: number;
	b: number;
	c: number;
	d: number;
	matrix?: Float32Array;
}

/**
 * Wrapper class for WebGL shader programs.
 * Provides convenient methods for setting uniforms and caching uniform locations.
 *
 * Scalar, vector and mat4 setters also cache the last value written and
 * skip the GL call when it is unchanged. Each GL call costs a round trip
 * through the browser's GPU command buffer, so with many entities across
 * several viewports this removes thousands of redundant calls per frame.
 * Array setters (e.g. bone palettes) are never cached.
 */
export class IgeWebGlProgram extends IgeBaseClass {
	classId = "IgeWebGlProgram";

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
	protected _program: WebGLProgram;
	protected _uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
	protected _uniforms: Map<string, IgeUniformRecord> = new Map();
	protected _attributeLocations: Map<string, number> = new Map();

	constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, program: WebGLProgram) {
		super();
		this._gl = gl;
		this._program = program;
	}

	/**
	 * Get the underlying WebGL program.
	 */
	get program(): WebGLProgram {
		return this._program;
	}

	/**
	 * Use this program for rendering.
	 */
	use(): this {
		this._gl.useProgram(this._program);
		return this;
	}

	/**
	 * Get uniform location with caching.
	 */
	getUniformLocation(name: string): WebGLUniformLocation | null {
		if (this._uniformLocations.has(name)) {
			return this._uniformLocations.get(name) || null;
		}

		const location = this._gl.getUniformLocation(this._program, name);
		this._uniformLocations.set(name, location);
		return location;
	}

	/**
	 * Get attribute location with caching.
	 */
	getAttributeLocation(name: string): number {
		if (this._attributeLocations.has(name)) {
			return this._attributeLocations.get(name) ?? -1;
		}

		const location = this._gl.getAttribLocation(this._program, name);
		this._attributeLocations.set(name, location);
		return location;
	}

	/**
	 * Get (creating on first use) the cached record for a uniform.
	 */
	protected _uniform(name: string): IgeUniformRecord {
		let record = this._uniforms.get(name);
		if (!record) {
			record = {
				location: this.getUniformLocation(name),
				hasValue: false,
				a: 0,
				b: 0,
				c: 0,
				d: 0
			};
			this._uniforms.set(name, record);
		}
		return record;
	}

	/**
	 * Set a float uniform.
	 */
	setUniform1f(name: string, value: number): this {
		const u = this._uniform(name);
		if (u.location === null || (u.hasValue && u.a === value)) return this;
		u.hasValue = true;
		u.a = value;
		this._gl.uniform1f(u.location, value);
		return this;
	}

	/**
	 * Set a vec2 uniform.
	 */
	setUniform2f(name: string, x: number, y: number): this {
		const u = this._uniform(name);
		if (u.location === null || (u.hasValue && u.a === x && u.b === y)) return this;
		u.hasValue = true;
		u.a = x;
		u.b = y;
		this._gl.uniform2f(u.location, x, y);
		return this;
	}

	/**
	 * Set a vec3 uniform.
	 */
	setUniform3f(name: string, x: number, y: number, z: number): this {
		const u = this._uniform(name);
		if (u.location === null || (u.hasValue && u.a === x && u.b === y && u.c === z)) return this;
		u.hasValue = true;
		u.a = x;
		u.b = y;
		u.c = z;
		this._gl.uniform3f(u.location, x, y, z);
		return this;
	}

	/**
	 * Set a vec4 uniform.
	 */
	setUniform4f(name: string, x: number, y: number, z: number, w: number): this {
		const u = this._uniform(name);
		if (u.location === null || (u.hasValue && u.a === x && u.b === y && u.c === z && u.d === w)) return this;
		u.hasValue = true;
		u.a = x;
		u.b = y;
		u.c = z;
		u.d = w;
		this._gl.uniform4f(u.location, x, y, z, w);
		return this;
	}

	/**
	 * Set an int uniform.
	 */
	setUniform1i(name: string, value: number): this {
		const u = this._uniform(name);
		if (u.location === null || (u.hasValue && u.a === value)) return this;
		u.hasValue = true;
		u.a = value;
		this._gl.uniform1i(u.location, value);
		return this;
	}

	/**
	 * Set an ivec2 uniform.
	 */
	setUniform2i(name: string, x: number, y: number): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform2i(location, x, y);
		}
		return this;
	}

	/**
	 * Set an ivec3 uniform.
	 */
	setUniform3i(name: string, x: number, y: number, z: number): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform3i(location, x, y, z);
		}
		return this;
	}

	/**
	 * Set an ivec4 uniform.
	 */
	setUniform4i(name: string, x: number, y: number, z: number, w: number): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform4i(location, x, y, z, w);
		}
		return this;
	}

	/**
	 * Set a mat4 uniform from IgeMatrix4 or Float32Array.
	 */
	setUniformMatrix4fv(name: string, matrix: IgeMatrix4 | Float32Array, transpose: boolean = false): this {
		const u = this._uniform(name);
		if (u.location === null) return this;

		const data = matrix instanceof Float32Array ? matrix : matrix.matrix;

		// Only single mat4 values are cached; arrays of matrices always upload.
		if (data.length === 16 && !transpose) {
			let cached = u.matrix;
			if (cached && u.hasValue) {
				let same = true;
				for (let i = 0; i < 16; i++) {
					if (cached[i] !== data[i]) {
						same = false;
						break;
					}
				}
				if (same) return this;
			}
			if (!cached) {
				cached = u.matrix = new Float32Array(16);
			}
			cached.set(data);
			u.hasValue = true;
		} else {
			u.hasValue = false;
		}

		this._gl.uniformMatrix4fv(u.location, transpose, data);
		return this;
	}

	/**
	 * Set a float array uniform.
	 */
	setUniform1fv(name: string, values: Float32Array | number[]): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform1fv(location, values);
		}
		return this;
	}

	/**
	 * Set a vec2 array uniform.
	 */
	setUniform2fv(name: string, values: Float32Array | number[]): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform2fv(location, values);
		}
		return this;
	}

	/**
	 * Set a vec3 array uniform.
	 */
	setUniform3fv(name: string, values: Float32Array | number[]): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform3fv(location, values);
		}
		return this;
	}

	/**
	 * Set a vec4 array uniform.
	 */
	setUniform4fv(name: string, values: Float32Array | number[]): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform4fv(location, values);
		}
		return this;
	}

	/**
	 * Set an int array uniform.
	 */
	setUniform1iv(name: string, values: Int32Array | number[]): this {
		const location = this.getUniformLocation(name);
		if (location !== null) {
			this._gl.uniform1iv(location, values);
		}
		return this;
	}

	/**
	 * Set a texture sampler uniform.
	 */
	setTexture(name: string, texture: WebGLTexture, textureUnit: number): this {
		const gl = this._gl;

		// Activate texture unit
		gl.activeTexture(gl.TEXTURE0 + textureUnit);

		// Bind texture
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Set uniform to texture unit
		this.setUniform1i(name, textureUnit);

		return this;
	}

	/**
	 * Enable a vertex attribute array.
	 */
	enableAttribute(name: string): this {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this._gl.enableVertexAttribArray(location);
		}
		return this;
	}

	/**
	 * Disable a vertex attribute array.
	 */
	disableAttribute(name: string): this {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this._gl.disableVertexAttribArray(location);
		}
		return this;
	}

	/**
	 * Set vertex attribute pointer.
	 */
	setAttributePointer(
		name: string,
		size: number,
		type: number,
		normalized: boolean = false,
		stride: number = 0,
		offset: number = 0
	): this {
		const location = this.getAttributeLocation(name);
		if (location !== -1) {
			this._gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
		}
		return this;
	}

	/**
	 * Clear cached uniform and attribute locations.
	 * Useful when recompiling the program.
	 */
	clearCache(): this {
		this._uniformLocations.clear();
		this._uniforms.clear();
		this._attributeLocations.clear();
		return this;
	}
}
