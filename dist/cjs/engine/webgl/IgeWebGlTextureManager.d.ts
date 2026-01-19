import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeTexture } from "../core/IgeTexture.js";
import type { IgeWebGlResourceManager } from "./IgeWebGlResourceManager.js"
import type { IgeSmartTexture } from "../../types/IgeSmartTexture.js";
/**
 * Manages WebGL texture creation, updates, and state for the renderer.
 */
export declare class IgeWebGlTextureManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _resourceManager: IgeWebGlResourceManager;
    protected _boundTextures: (WebGLTexture | null)[];
    protected _activeTextureUnit: number;
    protected _igeTextureMap: Map<string, WebGLTexture>;
    protected _smartTextureCanvases: Map<string, HTMLCanvasElement>;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, resourceManager: IgeWebGlResourceManager);
    /**
     * Create a WebGL texture from an image element.
     */
    createTextureFromImage(textureId: string, image: TexImageSource, options?: {
        wrapS?: number;
        wrapT?: number;
        minFilter?: number;
        magFilter?: number;
        generateMipmaps?: boolean;
        flipY?: boolean;
    }): WebGLTexture | null;
    /**
     * Create a WebGL texture from an IGE texture.
     */
    createTextureFromIgeTexture(igeTexture: IgeTexture): WebGLTexture | null;
    /**
     * Create a WebGL texture from a smart texture (Canvas2D → WebGL).
     * NOTE: Smart texture full support will be implemented in Phase 4.
     * For now, this is a placeholder implementation.
     */
    createTextureFromSmartTexture(textureId: string, smartTexture: IgeSmartTexture, entity: any, width?: number, height?: number): WebGLTexture | null;
    /**
     * Update a smart texture (re-render and upload to GPU).
     * NOTE: Smart texture full support will be implemented in Phase 4.
     */
    updateSmartTexture(textureId: string, smartTexture: IgeSmartTexture, entity: any): boolean;
    /**
     * Create an empty texture for render targets.
     */
    createEmptyTexture(textureId: string, width: number, height: number, internalFormat?: number, format?: number, type?: number): WebGLTexture | null;
    /**
     * Bind a texture to a specific texture unit.
     * Tracks state to avoid redundant binding.
     */
    bindTexture(texture: WebGLTexture | null, unit?: number): void;
    /**
     * Unbind texture from a specific unit.
     */
    unbindTexture(unit?: number): void;
    /**
     * Get WebGL texture for an IGE texture.
     */
    getTextureForIgeTexture(igeTexture: IgeTexture): WebGLTexture | null;
    /**
     * Delete a texture.
     */
    deleteTexture(textureId: string): void;
    /**
     * Clear all texture state.
     */
    clearState(): void;
    /**
     * Get statistics about managed textures.
     */
    getStats(): {
        totalTextures: number;
        smartTextures: number;
        activeTextureUnit: number;
    };
}
