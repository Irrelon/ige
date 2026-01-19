import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Manages GPU resource lifecycle for WebGL renderer.
 * Tracks all WebGL resources (buffers, textures, programs, VAOs) and provides
 * centralized creation, update, and deletion methods.
 */
export declare class IgeWebGlResourceManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _webglVersion: 1 | 2;
    protected _buffers: Map<string, WebGLBuffer>;
    protected _textures: Map<string, WebGLTexture>;
    protected _programs: Map<string, WebGLProgram>;
    protected _shaders: Map<string, WebGLShader>;
    protected _framebuffers: Map<string, WebGLFramebuffer>;
    protected _renderbuffers: Map<string, WebGLRenderbuffer>;
    protected _vaos: Map<string, WebGLVertexArrayObject>;
    protected _bufferRefCount: Map<string, number>;
    protected _textureRefCount: Map<string, number>;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, webglVersion: 1 | 2);
    /**
     * Create a WebGL buffer and track it.
     */
    createBuffer(id: string): WebGLBuffer | null;
    /**
     * Get a tracked buffer by id.
     */
    getBuffer(id: string): WebGLBuffer | undefined;
    /**
     * Delete a buffer and remove from tracking.
     */
    deleteBuffer(id: string): void;
    /**
     * Increment reference count for a buffer.
     */
    incrementBufferRef(id: string): void;
    /**
     * Decrement reference count for a buffer and delete if zero.
     */
    decrementBufferRef(id: string): void;
    /**
     * Create a WebGL texture and track it.
     */
    createTexture(id: string): WebGLTexture | null;
    /**
     * Get a tracked texture by id.
     */
    getTexture(id: string): WebGLTexture | undefined;
    /**
     * Delete a texture and remove from tracking.
     */
    deleteTexture(id: string): void;
    /**
     * Increment reference count for a texture.
     */
    incrementTextureRef(id: string): void;
    /**
     * Decrement reference count for a texture and delete if zero.
     */
    decrementTextureRef(id: string): void;
    /**
     * Create a WebGL shader and track it.
     */
    createShader(id: string, type: number): WebGLShader | null;
    /**
     * Get a tracked shader by id.
     */
    getShader(id: string): WebGLShader | undefined;
    /**
     * Delete a shader and remove from tracking.
     */
    deleteShader(id: string): void;
    /**
     * Create a WebGL program and track it.
     */
    createProgram(id: string): WebGLProgram | null;
    /**
     * Get a tracked program by id.
     */
    getProgram(id: string): WebGLProgram | undefined;
    /**
     * Delete a program and remove from tracking.
     */
    deleteProgram(id: string): void;
    /**
     * Create a WebGL framebuffer and track it.
     */
    createFramebuffer(id: string): WebGLFramebuffer | null;
    /**
     * Get a tracked framebuffer by id.
     */
    getFramebuffer(id: string): WebGLFramebuffer | undefined;
    /**
     * Delete a framebuffer and remove from tracking.
     */
    deleteFramebuffer(id: string): void;
    /**
     * Create a WebGL renderbuffer and track it.
     */
    createRenderbuffer(id: string): WebGLRenderbuffer | null;
    /**
     * Get a tracked renderbuffer by id.
     */
    getRenderbuffer(id: string): WebGLRenderbuffer | undefined;
    /**
     * Delete a renderbuffer and remove from tracking.
     */
    deleteRenderbuffer(id: string): void;
    /**
     * Create a VAO and track it (WebGL2 or extension).
     */
    createVAO(id: string): WebGLVertexArrayObject | null;
    /**
     * Get a tracked VAO by id.
     */
    getVAO(id: string): WebGLVertexArrayObject | undefined;
    /**
     * Delete a VAO and remove from tracking.
     */
    deleteVAO(id: string): void;
    /**
     * Get statistics about tracked resources.
     */
    getStats(): {
        buffers: number;
        textures: number;
        programs: number;
        shaders: number;
        framebuffers: number;
        renderbuffers: number;
        vaos: number;
    };
    /**
     * Clean up all tracked resources.
     * Should be called when the renderer is destroyed.
     */
    cleanup(): void;
}
