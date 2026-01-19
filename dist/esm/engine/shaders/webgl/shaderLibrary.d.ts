/**
 * Shader source definition.
 */
export interface IgeShaderSource {
    vertex: string;
    fragment: string;
    description?: string;
}
/**
 * Built-in shader library for WebGL renderer.
 * Provides centralized registration and lookup of shader programs.
 */
export declare class IgeShaderLibrary {
    protected static _shaders: Map<string, IgeShaderSource>;
    /**
     * Register a shader program.
     */
    static register(id: string, vertexSource: string, fragmentSource: string, description?: string): void;
    /**
     * Get a shader program by id.
     */
    static get(id: string): IgeShaderSource | undefined;
    /**
     * Check if a shader exists.
     */
    static has(id: string): boolean;
    /**
     * Get all registered shader IDs.
     */
    static getAll(): string[];
    /**
     * Clear all registered shaders.
     */
    static clear(): void;
}
