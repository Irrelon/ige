import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Manages WebGL state to minimize redundant API calls.
 * Tracks currently bound resources and only updates when necessary.
 */
export declare class IgeWebGlStateManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _boundProgram: WebGLProgram | null;
    protected _boundVBO: WebGLBuffer | null;
    protected _boundIBO: WebGLBuffer | null;
    protected _boundVAO: WebGLVertexArrayObject | null;
    protected _boundFramebuffer: WebGLFramebuffer | null;
    protected _boundTextures: (WebGLTexture | null)[];
    protected _activeTextureUnit: number;
    protected _depthTestEnabled: boolean;
    protected _depthWriteEnabled: boolean;
    protected _depthFunc: number;
    protected _blendEnabled: boolean;
    protected _blendSrc: number;
    protected _blendDst: number;
    protected _cullFaceEnabled: boolean;
    protected _cullFace: number;
    protected _frontFace: number;
    protected _viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    protected _scissorTestEnabled: boolean;
    protected _scissorBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    /**
     * Use a shader program (with state tracking).
     */
    useProgram(program: WebGLProgram | null): void;
    /**
     * Bind a vertex buffer (with state tracking).
     */
    bindBuffer(buffer: WebGLBuffer | null): void;
    /**
     * Bind an index buffer (with state tracking).
     */
    bindIndexBuffer(buffer: WebGLBuffer | null): void;
    /**
     * Bind a vertex array object (with state tracking).
     */
    bindVAO(vao: WebGLVertexArrayObject | null): void;
    /**
     * Bind a framebuffer (with state tracking).
     */
    bindFramebuffer(framebuffer: WebGLFramebuffer | null): void;
    /**
     * Bind a texture to a specific unit (with state tracking).
     */
    bindTexture(texture: WebGLTexture | null, unit?: number, forceRebind?: boolean): void;
    /**
     * Enable/disable depth testing (with state tracking).
     */
    setDepthTest(enabled: boolean): void;
    /**
     * Set depth write mask (with state tracking).
     */
    setDepthWrite(enabled: boolean): void;
    /**
     * Set depth function (with state tracking).
     */
    setDepthFunc(func: number): void;
    /**
     * Enable/disable blending (with state tracking).
     */
    setBlend(enabled: boolean): void;
    /**
     * Set blend function (with state tracking).
     */
    setBlendFunc(src: number, dst: number): void;
    /**
     * Enable/disable face culling (with state tracking).
     */
    setCullFace(enabled: boolean): void;
    /**
     * Set which face to cull (with state tracking).
     */
    setCullFaceMode(mode: number): void;
    /**
     * Set front face winding order (with state tracking).
     */
    setFrontFace(mode: number): void;
    /**
     * Set viewport (with state tracking).
     */
    setViewport(x: number, y: number, width: number, height: number): void;
    /**
     * Enable/disable scissor test (with state tracking).
     */
    setScissorTest(enabled: boolean): void;
    /**
     * Set scissor box (with state tracking).
     */
    setScissorBox(x: number, y: number, width: number, height: number): void;
    /**
     * Reset all state tracking (force re-bind everything).
     * This invalidates ALL cached state so subsequent state manager calls
     * will actually make GL calls instead of being skipped.
     */
    reset(): void;
    /**
     * Get current state statistics.
     */
    getStats(): {
        boundProgram: boolean;
        boundVBO: boolean;
        boundIBO: boolean;
        boundVAO: boolean;
        boundTextures: number;
        depthTestEnabled: boolean;
        blendEnabled: boolean;
        cullFaceEnabled: boolean;
    };
}
