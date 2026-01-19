import { IgeBaseClass } from "@/engine/core/IgeBaseClass";

/**
 * Manages GPU resource lifecycle for WebGL renderer.
 * Tracks all WebGL resources (buffers, textures, programs, VAOs) and provides
 * centralized creation, update, and deletion methods.
 */
export class IgeWebGlResourceManager extends IgeBaseClass {
	classId = "IgeWebGlResourceManager";

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
	protected _webglVersion: 1 | 2;

	// Resource tracking maps
	protected _buffers: Map<string, WebGLBuffer> = new Map();
	protected _textures: Map<string, WebGLTexture> = new Map();
	protected _programs: Map<string, WebGLProgram> = new Map();
	protected _shaders: Map<string, WebGLShader> = new Map();
	protected _framebuffers: Map<string, WebGLFramebuffer> = new Map();
	protected _renderbuffers: Map<string, WebGLRenderbuffer> = new Map();
	protected _vaos: Map<string, WebGLVertexArrayObject> = new Map();

	// Reference counting for shared resources
	protected _bufferRefCount: Map<string, number> = new Map();
	protected _textureRefCount: Map<string, number> = new Map();

	constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, webglVersion: 1 | 2) {
		super();
		this._gl = gl;
		this._webglVersion = webglVersion;
	}

	/**
	 * Create a WebGL buffer and track it.
	 */
	createBuffer(id: string): WebGLBuffer | null {
		if (this._buffers.has(id)) {
			this.log(`Buffer with id "${id}" already exists`, "warning");
			return this._buffers.get(id) || null;
		}

		const buffer = this._gl.createBuffer();
		if (!buffer) {
			this.log(`Failed to create buffer "${id}"`, "error");
			return null;
		}

		this._buffers.set(id, buffer);
		this._bufferRefCount.set(id, 1);
		return buffer;
	}

	/**
	 * Get a tracked buffer by id.
	 */
	getBuffer(id: string): WebGLBuffer | undefined {
		return this._buffers.get(id);
	}

	/**
	 * Delete a buffer and remove from tracking.
	 */
	deleteBuffer(id: string): void {
		const buffer = this._buffers.get(id);
		if (buffer) {
			this._gl.deleteBuffer(buffer);
			this._buffers.delete(id);
			this._bufferRefCount.delete(id);
		}
	}

	/**
	 * Increment reference count for a buffer.
	 */
	incrementBufferRef(id: string): void {
		const count = this._bufferRefCount.get(id) || 0;
		this._bufferRefCount.set(id, count + 1);
	}

	/**
	 * Decrement reference count for a buffer and delete if zero.
	 */
	decrementBufferRef(id: string): void {
		const count = this._bufferRefCount.get(id) || 0;
		if (count <= 1) {
			this.deleteBuffer(id);
		} else {
			this._bufferRefCount.set(id, count - 1);
		}
	}

	/**
	 * Create a WebGL texture and track it.
	 */
	createTexture(id: string): WebGLTexture | null {
		if (this._textures.has(id)) {
			this.log(`Texture with id "${id}" already exists`, "warning");
			return this._textures.get(id) || null;
		}

		const texture = this._gl.createTexture();
		if (!texture) {
			this.log(`Failed to create texture "${id}"`, "error");
			return null;
		}

		this._textures.set(id, texture);
		this._textureRefCount.set(id, 1);
		return texture;
	}

	/**
	 * Get a tracked texture by id.
	 */
	getTexture(id: string): WebGLTexture | undefined {
		return this._textures.get(id);
	}

	/**
	 * Delete a texture and remove from tracking.
	 */
	deleteTexture(id: string): void {
		const texture = this._textures.get(id);
		if (texture) {
			this._gl.deleteTexture(texture);
			this._textures.delete(id);
			this._textureRefCount.delete(id);
		}
	}

	/**
	 * Increment reference count for a texture.
	 */
	incrementTextureRef(id: string): void {
		const count = this._textureRefCount.get(id) || 0;
		this._textureRefCount.set(id, count + 1);
	}

	/**
	 * Decrement reference count for a texture and delete if zero.
	 */
	decrementTextureRef(id: string): void {
		const count = this._textureRefCount.get(id) || 0;
		if (count <= 1) {
			this.deleteTexture(id);
		} else {
			this._textureRefCount.set(id, count - 1);
		}
	}

	/**
	 * Create a WebGL shader and track it.
	 */
	createShader(id: string, type: number): WebGLShader | null {
		if (this._shaders.has(id)) {
			this.log(`Shader with id "${id}" already exists`, "warning");
			return this._shaders.get(id) || null;
		}

		const shader = this._gl.createShader(type);
		if (!shader) {
			this.log(`Failed to create shader "${id}"`, "error");
			return null;
		}

		this._shaders.set(id, shader);
		return shader;
	}

	/**
	 * Get a tracked shader by id.
	 */
	getShader(id: string): WebGLShader | undefined {
		return this._shaders.get(id);
	}

	/**
	 * Delete a shader and remove from tracking.
	 */
	deleteShader(id: string): void {
		const shader = this._shaders.get(id);
		if (shader) {
			this._gl.deleteShader(shader);
			this._shaders.delete(id);
		}
	}

	/**
	 * Create a WebGL program and track it.
	 */
	createProgram(id: string): WebGLProgram | null {
		if (this._programs.has(id)) {
			this.log(`Program with id "${id}" already exists`, "warning");
			return this._programs.get(id) || null;
		}

		const program = this._gl.createProgram();
		if (!program) {
			this.log(`Failed to create program "${id}"`, "error");
			return null;
		}

		this._programs.set(id, program);
		return program;
	}

	/**
	 * Get a tracked program by id.
	 */
	getProgram(id: string): WebGLProgram | undefined {
		return this._programs.get(id);
	}

	/**
	 * Delete a program and remove from tracking.
	 */
	deleteProgram(id: string): void {
		const program = this._programs.get(id);
		if (program) {
			this._gl.deleteProgram(program);
			this._programs.delete(id);
		}
	}

	/**
	 * Create a WebGL framebuffer and track it.
	 */
	createFramebuffer(id: string): WebGLFramebuffer | null {
		if (this._framebuffers.has(id)) {
			this.log(`Framebuffer with id "${id}" already exists`, "warning");
			return this._framebuffers.get(id) || null;
		}

		const framebuffer = this._gl.createFramebuffer();
		if (!framebuffer) {
			this.log(`Failed to create framebuffer "${id}"`, "error");
			return null;
		}

		this._framebuffers.set(id, framebuffer);
		return framebuffer;
	}

	/**
	 * Get a tracked framebuffer by id.
	 */
	getFramebuffer(id: string): WebGLFramebuffer | undefined {
		return this._framebuffers.get(id);
	}

	/**
	 * Delete a framebuffer and remove from tracking.
	 */
	deleteFramebuffer(id: string): void {
		const framebuffer = this._framebuffers.get(id);
		if (framebuffer) {
			this._gl.deleteFramebuffer(framebuffer);
			this._framebuffers.delete(id);
		}
	}

	/**
	 * Create a WebGL renderbuffer and track it.
	 */
	createRenderbuffer(id: string): WebGLRenderbuffer | null {
		if (this._renderbuffers.has(id)) {
			this.log(`Renderbuffer with id "${id}" already exists`, "warning");
			return this._renderbuffers.get(id) || null;
		}

		const renderbuffer = this._gl.createRenderbuffer();
		if (!renderbuffer) {
			this.log(`Failed to create renderbuffer "${id}"`, "error");
			return null;
		}

		this._renderbuffers.set(id, renderbuffer);
		return renderbuffer;
	}

	/**
	 * Get a tracked renderbuffer by id.
	 */
	getRenderbuffer(id: string): WebGLRenderbuffer | undefined {
		return this._renderbuffers.get(id);
	}

	/**
	 * Delete a renderbuffer and remove from tracking.
	 */
	deleteRenderbuffer(id: string): void {
		const renderbuffer = this._renderbuffers.get(id);
		if (renderbuffer) {
			this._gl.deleteRenderbuffer(renderbuffer);
			this._renderbuffers.delete(id);
		}
	}

	/**
	 * Create a VAO and track it (WebGL2 or extension).
	 */
	createVAO(id: string): WebGLVertexArrayObject | null {
		if (this._vaos.has(id)) {
			this.log(`VAO with id "${id}" already exists`, "warning");
			return this._vaos.get(id) || null;
		}

		let vao: WebGLVertexArrayObject | null = null;

		if (this._webglVersion === 2) {
			const gl2 = this._gl as WebGL2RenderingContext;
			vao = gl2.createVertexArray();
		} else {
			const ext = this._gl.getExtension("OES_vertex_array_object");
			if (ext) {
				vao = ext.createVertexArrayOES();
			}
		}

		if (!vao) {
			this.log(`Failed to create VAO "${id}"`, "error");
			return null;
		}

		this._vaos.set(id, vao);
		return vao;
	}

	/**
	 * Get a tracked VAO by id.
	 */
	getVAO(id: string): WebGLVertexArrayObject | undefined {
		return this._vaos.get(id);
	}

	/**
	 * Delete a VAO and remove from tracking.
	 */
	deleteVAO(id: string): void {
		const vao = this._vaos.get(id);
		if (vao) {
			if (this._webglVersion === 2) {
				const gl2 = this._gl as WebGL2RenderingContext;
				gl2.deleteVertexArray(vao);
			} else {
				const ext = this._gl.getExtension("OES_vertex_array_object");
				if (ext) {
					ext.deleteVertexArrayOES(vao);
				}
			}
			this._vaos.delete(id);
		}
	}

	/**
	 * Get statistics about tracked resources.
	 */
	getStats() {
		return {
			buffers: this._buffers.size,
			textures: this._textures.size,
			programs: this._programs.size,
			shaders: this._shaders.size,
			framebuffers: this._framebuffers.size,
			renderbuffers: this._renderbuffers.size,
			vaos: this._vaos.size
		};
	}

	/**
	 * Clean up all tracked resources.
	 * Should be called when the renderer is destroyed.
	 */
	cleanup(): void {
		// Delete all buffers
		this._buffers.forEach((buffer, id) => {
			this._gl.deleteBuffer(buffer);
		});
		this._buffers.clear();
		this._bufferRefCount.clear();

		// Delete all textures
		this._textures.forEach((texture, id) => {
			this._gl.deleteTexture(texture);
		});
		this._textures.clear();
		this._textureRefCount.clear();

		// Delete all programs
		this._programs.forEach((program, id) => {
			this._gl.deleteProgram(program);
		});
		this._programs.clear();

		// Delete all shaders
		this._shaders.forEach((shader, id) => {
			this._gl.deleteShader(shader);
		});
		this._shaders.clear();

		// Delete all framebuffers
		this._framebuffers.forEach((framebuffer, id) => {
			this._gl.deleteFramebuffer(framebuffer);
		});
		this._framebuffers.clear();

		// Delete all renderbuffers
		this._renderbuffers.forEach((renderbuffer, id) => {
			this._gl.deleteRenderbuffer(renderbuffer);
		});
		this._renderbuffers.clear();

		// Delete all VAOs
		if (this._webglVersion === 2) {
			const gl2 = this._gl as WebGL2RenderingContext;
			this._vaos.forEach((vao, id) => {
				gl2.deleteVertexArray(vao);
			});
		} else {
			const ext = this._gl.getExtension("OES_vertex_array_object");
			if (ext) {
				this._vaos.forEach((vao, id) => {
					ext.deleteVertexArrayOES(vao);
				});
			}
		}
		this._vaos.clear();

		this.log("All WebGL resources cleaned up");
	}
}
