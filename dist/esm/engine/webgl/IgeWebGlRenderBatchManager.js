import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Sorting criteria for render batches.
 */
export var IgeRenderSortMode;
(function (IgeRenderSortMode) {
    IgeRenderSortMode[IgeRenderSortMode["None"] = 0] = "None";
    IgeRenderSortMode[IgeRenderSortMode["FrontToBack"] = 1] = "FrontToBack";
    IgeRenderSortMode[IgeRenderSortMode["BackToFront"] = 2] = "BackToFront"; // For transparent objects (correct blending)
})(IgeRenderSortMode || (IgeRenderSortMode = {}));
/**
 * Manages render batching for sprites and 3D models.
 * Optimizes rendering by grouping entities with similar properties.
 */
export class IgeWebGlRenderBatchManager extends IgeBaseClass {
    classId = "IgeWebGlRenderBatchManager";
    _gl;
    // Batches for current frame
    _spriteBatches = new Map();
    _modelBatches = [];
    // Separate batches for opaque and transparent entities
    _opaqueSpriteBatches = new Map();
    _transparentSpriteBatches = new Map();
    _opaqueModelBatches = [];
    _transparentModelBatches = [];
    constructor(gl) {
        super();
        this._gl = gl;
    }
    /**
     * Start a new frame - clear all batches.
     */
    startFrame() {
        this._spriteBatches.clear();
        this._modelBatches = [];
        this._opaqueSpriteBatches.clear();
        this._transparentSpriteBatches.clear();
        this._opaqueModelBatches = [];
        this._transparentModelBatches = [];
    }
    /**
     * Add a sprite entity to the appropriate batch.
     */
    addSprite(entity, texture, isTransparent = false) {
        const textureId = texture.id() || "unknown";
        const batchMap = isTransparent ? this._transparentSpriteBatches : this._opaqueSpriteBatches;
        // Get or create batch for this texture
        let batch = batchMap.get(textureId);
        if (!batch) {
            batch = {
                texture,
                entities: [],
                instanceCount: 0
            };
            batchMap.set(textureId, batch);
        }
        // Add entity to batch
        batch.entities.push(entity);
        batch.instanceCount++;
    }
    /**
     * Add a 3D model entity to the appropriate batch.
     */
    addModel(entity, geometry, textureId, isTransparent = false) {
        const batches = isTransparent ? this._transparentModelBatches : this._opaqueModelBatches;
        // Try to find existing batch with same geometry and texture
        let batch = batches.find(b => b.geometryId === geometry.id && b.textureId === textureId);
        if (!batch) {
            batch = {
                geometryId: geometry.id,
                geometry,
                textureId,
                entities: []
            };
            batches.push(batch);
        }
        batch.entities.push(entity);
    }
    /**
     * Sort sprite batches (for transparency).
     */
    _sortSpriteBatch(batch, cameraPosition) {
        // Sort back to front for transparent sprites
        batch.entities.sort((a, b) => {
            const distA = this._calculateDistanceToCamera(a, cameraPosition);
            const distB = this._calculateDistanceToCamera(b, cameraPosition);
            return distB - distA; // Back to front
        });
    }
    /**
     * Sort model batches (for transparency).
     */
    _sortModelBatch(batch, cameraPosition) {
        // Sort back to front for transparent models
        batch.entities.sort((a, b) => {
            const distA = this._calculateDistanceToCamera(a, cameraPosition);
            const distB = this._calculateDistanceToCamera(b, cameraPosition);
            return distB - distA; // Back to front
        });
    }
    /**
     * Calculate distance from entity to camera (for sorting).
     */
    _calculateDistanceToCamera(entity, cameraPosition) {
        const dx = entity._translate.x - cameraPosition.x;
        const dy = entity._translate.y - cameraPosition.y;
        const dz = entity._translate.z - cameraPosition.z;
        return dx * dx + dy * dy + dz * dz; // Squared distance (no need for sqrt)
    }
    /**
     * Prepare batches for rendering - sort transparent batches.
     */
    prepareForRendering(cameraPosition) {
        // Sort transparent sprite batches
        this._transparentSpriteBatches.forEach(batch => {
            this._sortSpriteBatch(batch, cameraPosition);
        });
        // Sort transparent model batches
        this._transparentModelBatches.forEach(batch => {
            this._sortModelBatch(batch, cameraPosition);
        });
    }
    /**
     * Render all opaque sprite batches.
     */
    renderOpaqueSprites(program, geometry, renderCallback) {
        this._opaqueSpriteBatches.forEach(batch => {
            if (batch.instanceCount > 0) {
                renderCallback(batch);
            }
        });
    }
    /**
     * Render all transparent sprite batches.
     */
    renderTransparentSprites(program, geometry, renderCallback) {
        this._transparentSpriteBatches.forEach(batch => {
            if (batch.instanceCount > 0) {
                renderCallback(batch);
            }
        });
    }
    /**
     * Render all opaque model batches.
     */
    renderOpaqueModels(program, renderCallback) {
        this._opaqueModelBatches.forEach(batch => {
            if (batch.entities.length > 0) {
                renderCallback(batch);
            }
        });
    }
    /**
     * Render all transparent model batches.
     */
    renderTransparentModels(program, renderCallback) {
        this._transparentModelBatches.forEach(batch => {
            if (batch.entities.length > 0) {
                renderCallback(batch);
            }
        });
    }
    /**
     * Get statistics about current batches.
     */
    getStats() {
        return {
            opaqueSpriteBatches: this._opaqueSpriteBatches.size,
            transparentSpriteBatches: this._transparentSpriteBatches.size,
            opaqueModelBatches: this._opaqueModelBatches.length,
            transparentModelBatches: this._transparentModelBatches.length,
            totalSpriteEntities: Array.from(this._opaqueSpriteBatches.values()).reduce((sum, b) => sum + b.instanceCount, 0) +
                Array.from(this._transparentSpriteBatches.values()).reduce((sum, b) => sum + b.instanceCount, 0),
            totalModelEntities: this._opaqueModelBatches.reduce((sum, b) => sum + b.entities.length, 0) +
                this._transparentModelBatches.reduce((sum, b) => sum + b.entities.length, 0)
        };
    }
}
