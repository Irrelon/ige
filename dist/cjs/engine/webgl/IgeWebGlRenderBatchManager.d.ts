import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeEntity } from "../core/IgeEntity.js";
import type { IgeTexture } from "../core/IgeTexture.js"
import type { IgeWebGlProgram } from "./IgeWebGlProgram.js";
import type { IgeWebGlGeometry } from "./IgeWebGlGeometry.js"
/**
 * Render batch for sprites (2D entities).
 * Groups sprites by texture for instanced rendering.
 */
export interface IgeSpriteBatch {
    texture: IgeTexture;
    entities: IgeEntity[];
    instanceCount: number;
}
/**
 * Render batch for 3D models.
 * Groups models by geometry and material.
 */
export interface IgeModelBatch {
    geometryId: string;
    geometry: IgeWebGlGeometry;
    textureId?: string;
    entities: IgeEntity[];
}
/**
 * Sorting criteria for render batches.
 */
export declare enum IgeRenderSortMode {
    None = 0,
    FrontToBack = 1,// For opaque objects (early Z rejection)
    BackToFront = 2
}
/**
 * Manages render batching for sprites and 3D models.
 * Optimizes rendering by grouping entities with similar properties.
 */
export declare class IgeWebGlRenderBatchManager extends IgeBaseClass {
    classId: string;
    protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
    protected _spriteBatches: Map<string, IgeSpriteBatch>;
    protected _modelBatches: IgeModelBatch[];
    protected _opaqueSpriteBatches: Map<string, IgeSpriteBatch>;
    protected _transparentSpriteBatches: Map<string, IgeSpriteBatch>;
    protected _opaqueModelBatches: IgeModelBatch[];
    protected _transparentModelBatches: IgeModelBatch[];
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    /**
     * Start a new frame - clear all batches.
     */
    startFrame(): void;
    /**
     * Add a sprite entity to the appropriate batch.
     */
    addSprite(entity: IgeEntity, texture: IgeTexture, isTransparent?: boolean): void;
    /**
     * Add a 3D model entity to the appropriate batch.
     */
    addModel(entity: IgeEntity, geometry: IgeWebGlGeometry, textureId?: string, isTransparent?: boolean): void;
    /**
     * Sort sprite batches (for transparency).
     */
    protected _sortSpriteBatch(batch: IgeSpriteBatch, cameraPosition: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * Sort model batches (for transparency).
     */
    protected _sortModelBatch(batch: IgeModelBatch, cameraPosition: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * Calculate distance from entity to camera (for sorting).
     */
    protected _calculateDistanceToCamera(entity: IgeEntity, cameraPosition: {
        x: number;
        y: number;
        z: number;
    }): number;
    /**
     * Prepare batches for rendering - sort transparent batches.
     */
    prepareForRendering(cameraPosition: {
        x: number;
        y: number;
        z: number;
    }): void;
    /**
     * Render all opaque sprite batches.
     */
    renderOpaqueSprites(program: IgeWebGlProgram, geometry: IgeWebGlGeometry, renderCallback: (batch: IgeSpriteBatch) => void): void;
    /**
     * Render all transparent sprite batches.
     */
    renderTransparentSprites(program: IgeWebGlProgram, geometry: IgeWebGlGeometry, renderCallback: (batch: IgeSpriteBatch) => void): void;
    /**
     * Render all opaque model batches.
     */
    renderOpaqueModels(program: IgeWebGlProgram, renderCallback: (batch: IgeModelBatch) => void): void;
    /**
     * Render all transparent model batches.
     */
    renderTransparentModels(program: IgeWebGlProgram, renderCallback: (batch: IgeModelBatch) => void): void;
    /**
     * Get statistics about current batches.
     */
    getStats(): {
        opaqueSpriteBatches: number;
        transparentSpriteBatches: number;
        opaqueModelBatches: number;
        transparentModelBatches: number;
        totalSpriteEntities: number;
        totalModelEntities: number;
    };
}
