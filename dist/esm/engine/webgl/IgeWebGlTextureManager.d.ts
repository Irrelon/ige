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
    protected _defaultWhiteTexture: WebGLTexture | null;
    protected _webGl2: boolean;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, resourceManager: IgeWebGlResourceManager);
    /**
     * Create a 1x1 white texture to use as default when no texture is bound.
     * This allows the base color to show through properly in shaders.
     */
    protected _createDefaultWhiteTexture(): void;
    /**
     * Get the default 1x1 white texture.
     */
    getDefaultWhiteTexture(): WebGLTexture | null;
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
    protected _entitySmartTextures: Map<object, {
        igeTexture: IgeTexture;
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        texture: WebGLTexture;
        width: number;
        height: number;
        lastUsedFrame: number;
        drawnFrame: number;
    }>;
    /**
     * Get the GPU texture of a smart texture (an IgeTexture drawn by a
     * script with the Canvas 2D API) as drawn for one entity. Smart textures
     * usually draw from the entity's own data and size, so every entity
     * gets its own canvas, drawn the way the Canvas 2D renderer draws it:
     * centred, in entity units, scaled by pixelRatio for sharpness.
     *
     * Like the Canvas 2D renderer it redraws every frame (once, however many
     * viewports show the entity), unless the entity has cache(true): then it
     * redraws only when the entity's cache is marked dirty
     * (entity.cacheDirty(true)) or its size changes.
     */
    getSmartTexture(igeTexture: IgeTexture, entity: any, pixelRatio: number, frameId: number): WebGLTexture | null;
    protected _blobTextureCache: Map<string, WebGLTexture>;
    protected _blobTexturePromises: Map<string, Promise<WebGLTexture | null>>;
    /**
     * Create a WebGL texture from a Blob (e.g., from GLTF embedded image).
     * Returns a promise since image loading is asynchronous.
     */
    createTextureFromBlob(textureId: string, blob: Blob): Promise<WebGLTexture | null>;
    /**
     * Get a cached blob texture synchronously (returns null if not yet loaded).
     */
    getBlobTexture(textureId: string): WebGLTexture | null;
    /**
     * Check if a blob texture is cached.
     */
    hasBlobTexture(textureId: string): boolean;
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
    /** The renderer's frame number (pre-filters run once per frame). */
    frameId: number;
    protected _igeTextureVersions: Map<string, number>;
    protected _preFilteredFrame: Map<string, number>;
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
