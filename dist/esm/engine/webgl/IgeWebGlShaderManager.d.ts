import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeWebGlResourceManager } from "./IgeWebGlResourceManager.js"
import { IgeWebGlProgram } from "./IgeWebGlProgram.js"
/**
 * Manages shader compilation, linking, and caching for WebGL renderer.
 */
export declare class IgeWebGlShaderManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _resourceManager: IgeWebGlResourceManager;
    protected _programs: Map<string, IgeWebGlProgram>;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, resourceManager: IgeWebGlResourceManager);
    /**
     * Compile a shader from source code.
     */
    protected _compileShader(source: string, type: number, shaderId: string): WebGLShader | null;
    /**
     * Link vertex and fragment shaders into a program.
     */
    protected _linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader, programId: string): WebGLProgram | null;
    /**
     * Create a shader program from vertex and fragment shader source.
     * Returns cached program if already compiled.
     */
    createProgram(programId: string, vertexSource: string, fragmentSource: string, forceRecompile?: boolean): IgeWebGlProgram | null;
    /**
     * Get a cached program by id.
     */
    getProgram(programId: string): IgeWebGlProgram | undefined;
    /**
     * Check if a program exists in cache.
     */
    hasProgram(programId: string): boolean;
    /**
     * Delete a program and remove from cache.
     */
    deleteProgram(programId: string): void;
    /**
     * Delete all cached programs.
     */
    deleteAllPrograms(): void;
    /**
     * Get list of all cached program IDs.
     */
    getProgramIds(): string[];
    /**
     * Get statistics about cached programs.
     */
    getStats(): {
        programCount: number;
        programs: string[];
    };
}
