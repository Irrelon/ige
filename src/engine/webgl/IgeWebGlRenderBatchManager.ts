import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";
import type { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";

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
export enum IgeRenderSortMode {
	None = 0,
	FrontToBack = 1,  // For opaque objects (early Z rejection)
	BackToFront = 2   // For transparent objects (correct blending)
}

/**
 * Manages render batching for sprites and 3D models.
 * Optimizes rendering by grouping entities with similar properties.
 */
export class IgeWebGlRenderBatchManager extends IgeBaseClass {
	classId = "IgeWebGlRenderBatchManager";

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;

	// Batches for current frame
	protected _spriteBatches: Map<string, IgeSpriteBatch> = new Map();
	protected _modelBatches: IgeModelBatch[] = [];

	// Separate batches for opaque and transparent entities
	protected _opaqueSpriteBatches: Map<string, IgeSpriteBatch> = new Map();
	protected _transparentSpriteBatches: Map<string, IgeSpriteBatch> = new Map();
	protected _opaqueModelBatches: IgeModelBatch[] = [];
	protected _transparentModelBatches: IgeModelBatch[] = [];

	constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
		super();
		this._gl = gl;
	}

	/**
	 * Start a new frame - clear all batches.
	 */
	startFrame(): void {
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
	addSprite(entity: IgeEntity, texture: IgeTexture, isTransparent: boolean = false): void {
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
	addModel(
		entity: IgeEntity,
		geometry: IgeWebGlGeometry,
		textureId?: string,
		isTransparent: boolean = false
	): void {
		const batches = isTransparent ? this._transparentModelBatches : this._opaqueModelBatches;

		// Try to find existing batch with same geometry and texture
		let batch = batches.find(
			b => b.geometryId === geometry.id && b.textureId === textureId
		);

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
	protected _sortSpriteBatch(batch: IgeSpriteBatch, cameraPosition: { x: number; y: number; z: number }): void {
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
	protected _sortModelBatch(batch: IgeModelBatch, cameraPosition: { x: number; y: number; z: number }): void {
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
	protected _calculateDistanceToCamera(
		entity: IgeEntity,
		cameraPosition: { x: number; y: number; z: number }
	): number {
		const dx = entity._translate.x - cameraPosition.x;
		const dy = entity._translate.y - cameraPosition.y;
		const dz = entity._translate.z - cameraPosition.z;
		return dx * dx + dy * dy + dz * dz; // Squared distance (no need for sqrt)
	}

	/**
	 * Prepare batches for rendering - sort transparent batches.
	 */
	prepareForRendering(cameraPosition: { x: number; y: number; z: number }): void {
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
	renderOpaqueSprites(
		program: IgeWebGlProgram,
		geometry: IgeWebGlGeometry,
		renderCallback: (batch: IgeSpriteBatch) => void
	): void {
		this._opaqueSpriteBatches.forEach(batch => {
			if (batch.instanceCount > 0) {
				renderCallback(batch);
			}
		});
	}

	/**
	 * Render all transparent sprite batches.
	 */
	renderTransparentSprites(
		program: IgeWebGlProgram,
		geometry: IgeWebGlGeometry,
		renderCallback: (batch: IgeSpriteBatch) => void
	): void {
		this._transparentSpriteBatches.forEach(batch => {
			if (batch.instanceCount > 0) {
				renderCallback(batch);
			}
		});
	}

	/**
	 * Render all opaque model batches.
	 */
	renderOpaqueModels(
		program: IgeWebGlProgram,
		renderCallback: (batch: IgeModelBatch) => void
	): void {
		this._opaqueModelBatches.forEach(batch => {
			if (batch.entities.length > 0) {
				renderCallback(batch);
			}
		});
	}

	/**
	 * Render all transparent model batches.
	 */
	renderTransparentModels(
		program: IgeWebGlProgram,
		renderCallback: (batch: IgeModelBatch) => void
	): void {
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
