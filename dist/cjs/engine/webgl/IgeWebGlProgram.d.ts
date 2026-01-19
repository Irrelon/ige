import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeMatrix4 } from "../core/IgeMatrix4.js";
/**
 * Wrapper class for WebGL shader programs.
 * Provides convenient methods for setting uniforms and caching uniform locations.
 */
export declare class IgeWebGlProgram extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _program: WebGLProgram;
    protected _uniformLocations: Map<string, WebGLUniformLocation | null>;
    protected _attributeLocations: Map<string, number>;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, program: WebGLProgram);
    /**
     * Get the underlying WebGL program.
     */
    get program(): WebGLProgram;
    /**
     * Use this program for rendering.
     */
    use(): this;
    /**
     * Get uniform location with caching.
     */
    getUniformLocation(name: string): WebGLUniformLocation | null;
    /**
     * Get attribute location with caching.
     */
    getAttributeLocation(name: string): number;
    /**
     * Set a float uniform.
     */
    setUniform1f(name: string, value: number): this;
    /**
     * Set a vec2 uniform.
     */
    setUniform2f(name: string, x: number, y: number): this;
    /**
     * Set a vec3 uniform.
     */
    setUniform3f(name: string, x: number, y: number, z: number): this;
    /**
     * Set a vec4 uniform.
     */
    setUniform4f(name: string, x: number, y: number, z: number, w: number): this;
    /**
     * Set an int uniform.
     */
    setUniform1i(name: string, value: number): this;
    /**
     * Set an ivec2 uniform.
     */
    setUniform2i(name: string, x: number, y: number): this;
    /**
     * Set an ivec3 uniform.
     */
    setUniform3i(name: string, x: number, y: number, z: number): this;
    /**
     * Set an ivec4 uniform.
     */
    setUniform4i(name: string, x: number, y: number, z: number, w: number): this;
    /**
     * Set a mat4 uniform from IgeMatrix4.
     */
    setUniformMatrix4fv(name: string, matrix: IgeMatrix4, transpose?: boolean): this;
    /**
     * Set a float array uniform.
     */
    setUniform1fv(name: string, values: Float32Array | number[]): this;
    /**
     * Set a vec2 array uniform.
     */
    setUniform2fv(name: string, values: Float32Array | number[]): this;
    /**
     * Set a vec3 array uniform.
     */
    setUniform3fv(name: string, values: Float32Array | number[]): this;
    /**
     * Set a vec4 array uniform.
     */
    setUniform4fv(name: string, values: Float32Array | number[]): this;
    /**
     * Set an int array uniform.
     */
    setUniform1iv(name: string, values: Int32Array | number[]): this;
    /**
     * Set a texture sampler uniform.
     */
    setTexture(name: string, texture: WebGLTexture, textureUnit: number): this;
    /**
     * Enable a vertex attribute array.
     */
    enableAttribute(name: string): this;
    /**
     * Disable a vertex attribute array.
     */
    disableAttribute(name: string): this;
    /**
     * Set vertex attribute pointer.
     */
    setAttributePointer(name: string, size: number, type: number, normalized?: boolean, stride?: number, offset?: number): this;
    /**
     * Clear cached uniform and attribute locations.
     * Useful when recompiling the program.
     */
    clearCache(): this;
}
