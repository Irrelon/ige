import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeDirectionalLight, IgePointLight } from "@/engine/webgl/IgeWebGlLight";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import type { IgeGpuRenderPass, IgeGpuSamplerDesc, IgeGpuTexture } from "@/engine/gpu/IgeGpuDevice";
import { type IgeWebGl2GpuDevice, webGl2Texture } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IGE_MAX_SHADOW_CASCADES, type IgeShadowFitBox, igeFitShadowBox, igeShadowBoxMatrix, igeShadowCascadeTile, igeShadowLightBasis } from "@/engine/webgl/IgeShadowFit";

/**
 * Shadow map configuration.
 */
export interface IgeShadowMapConfig {
	/** Size of the shadow map texture (width and height) */
	size: number;
	/** Bias to prevent shadow acne */
	bias: number;
	/** Normal bias for additional acne prevention */
	normalBias: number;
	/** Softness of shadow edges (0-1) */
	softness: number;
	/** PCF sample count (1, 4, 9, 16) */
	pcfSamples: number;
}

/**
 * One cascade of a directional light's shadow map (see IgeWebGlRenderer.shadowCascades()): its light space matrix,
 * the tile of the map it's drawn into, and the slice of the view's depth it shadows.
 */
export interface IgeShadowCascade {
	matrix: Float32Array;
	/** Its tile in texels: x, y, width, height from the map's bottom-left. */
	viewport: [number, number, number, number];
	/** Its tile as fractions of the map: x, y, width, height. */
	tile: [number, number, number, number];
	/** The view depth its slice starts at (its blend with the slice before aside). */
	start: number;
	/** And ends at (Infinity for the last). */
	split: number;
	/** Where its box's part of the view starts: `start` less the part of the slice before that fades into it. */
	from: number;
}

/**
 * Shadow map data for a single light: its depth, drawn on the GPU device, and its cascades (one: the whole map).
 */
interface ShadowMapData {
	depth: IgeGpuTexture;
	/** The first cascade's matrix (the whole map's, with one). */
	lightSpaceMatrix: Float32Array;
	size: number;
	bias: number;
	normalBias: number;
	/** IGE_MAX_SHADOW_CASCADES of them, the first `cascadeCount` in use. */
	cascades: IgeShadowCascade[];
	cascadeCount: number;
	/** The far part of each slice faded into the next (a fraction of its depth). */
	cascadeBlend: number;
	/** The view depth shadows have faded out by (the fitted map's distance; 0: they don't fade, the square's). */
	fadeEnd: number;
}

/** The cached static casters of one cascade's tile (or of the whole map, with one cascade). */
export interface IgeShadowCacheTile {
	/** Light space matrix the tile was rendered with. */
	matrix: Float32Array;
	/** Checksums of the static caster set the tile holds. */
	signatureA: number;
	signatureB: number;
	count: number;
	valid: boolean;
}

/**
 * Cached depth of a directional light's static shadow casters. The renderer redraws it only when the static casters or
 * the light's matrix change, and copies it into the light's shadow map each frame before drawing the moving casters on
 * top.
 */
export interface IgeShadowCacheData {
	depth: IgeGpuTexture;
	size: number;
	/** Each cascade's tile (the first is the whole map with one cascade), redrawn on its own. */
	tiles: IgeShadowCacheTile[];
	/** How many cascades the tiles were laid out for (a change redraws them all). */
	layout: number;
	/** The shadow map currently holds exactly the cached depth (no moving casters drawn). */
	mapHoldsCache: boolean;
}

/** Frames a caster's transform must stay unchanged before it joins the static shadow cache. */
export const SHADOW_STATIC_FRAMES = 30;

/** The per-entity fields the static/dynamic classification reads and keeps. */
export interface IgeShadowCasterState {
	_transformVersion: number;
	_shadowSeenVersion: number;
	_shadowStableSince: number;
	/** The skeleton pose version last seen (skinned casters). */
	_shadowSeenPose?: number;
	/** Caster flagged as always dynamic (never cached). */
	_shadowDynamic?: boolean;
}

/**
 * Whether a shadow caster belongs in the static cache this frame. Static casters have an unchanged transform for
 * SHADOW_STATIC_FRAMES frames; skinned meshes count while their pose version (a skeleton's `poseVersion`) stays put too; casters flagged dynamic never do. A caster seen for the first time
 * starts out static (one extra rebuild if it turns out to move); one that moves is dynamic until it has settled.
 */
export function igeShadowCasterIsStatic(
	entity: IgeShadowCasterState,
	frameId: number,
	skinned: boolean,
	poseVersion?: number
): boolean {
	if (entity._transformVersion !== entity._shadowSeenVersion) {
		entity._shadowStableSince = entity._shadowSeenVersion === -1 ? -SHADOW_STATIC_FRAMES : frameId;
		entity._shadowSeenVersion = entity._transformVersion;
	}
	if (skinned) {
		// Without a pose version a skinned mesh is always dynamic; with one, it settles like a still transform
		if (poseVersion === undefined) return false;
		if (poseVersion !== entity._shadowSeenPose) {
			entity._shadowStableSince = frameId;
			entity._shadowSeenPose = poseVersion;
		}
	}
	if (entity._shadowDynamic) return false;
	return frameId - entity._shadowStableSince >= SHADOW_STATIC_FRAMES;
}

/**
 * Order-independent checksum of the static casters (entity, mesh, transform), compared with the cache's to decide
 * whether it must be redrawn. Only static casters are added, so a moving caster never changes it.
 */
export class IgeShadowSignature {
	a: number = 0;
	b: number = 0;
	count: number = 0;

	reset (): void {
		this.a = 0;
		this.b = 0;
		this.count = 0;
	}

	add (renderUid: number, geometryUid: number, transformVersion: number): void {
		let h = Math.imul(renderUid, 0x9e3779b1) ^ Math.imul(geometryUid, 0x85ebca6b) ^ Math.imul(transformVersion + 1, 0xc2b2ae35);
		h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
		this.a = (this.a + h) | 0;
		this.b ^= Math.imul(h ^ (h >>> 13), 0x297a2d39);
		this.count++;
	}

	matches (cache: Pick<IgeShadowCacheTile, "signatureA" | "signatureB" | "count">): boolean {
		return cache.count === this.count && cache.signatureA === this.a && cache.signatureB === this.b;
	}
}

/**
 * Point shadow atlas texture format options.
 * - "rgba8": RGBA UNSIGNED_BYTE - fastest on all GPUs, 8-bit depth precision (256 levels)
 * - "r32f": R32F float - best precision, 1/4 memory of RGBA32F, but slower on some GPUs
 */
export type PointShadowTextureFormat = "rgba8" | "r32f";

/**
 * Shadow map data for a point light using a 3x2 atlas texture.
 * All 6 cube faces are rendered into a single texture in a 3-column x 2-row grid.
 * Face layout: row0=[+X, -X, +Y], row1=[-Y, +Z, -Z]
 */
export interface PointShadowMapData {
	atlas: IgeGpuTexture;                 // The 3x2 atlas, storing linear depth
	depth: IgeGpuTexture;                 // Its depth buffer (the whole atlas)
	lightSpaceMatrices: IgeMatrix4[];     // 6 view-projection matrices
	faceSize: number;                     // Size of each face (atlas is faceSize*3 x faceSize*2)
	bias: number;
	nearPlane: number;
	farPlane: number;
}

/** How every shadow texture is sampled: its nearest texel, clamped at its edges. */
const NEAREST: IgeGpuSamplerDesc = { minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" };

/** Maximum number of point lights that can cast shadows. */
export const MAX_SHADOW_POINT_LIGHTS = 2;

/** Cube map face directions and up vectors for lookAt. */
const CUBE_FACE_DIRS = [
	{ dir: { x: 1, y: 0, z: 0 }, up: { x: 0, y: -1, z: 0 } },  // +X
	{ dir: { x: -1, y: 0, z: 0 }, up: { x: 0, y: -1, z: 0 } },  // -X
	{ dir: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: 1 } },    // +Y
	{ dir: { x: 0, y: -1, z: 0 }, up: { x: 0, y: 0, z: -1 } },  // -Y
	{ dir: { x: 0, y: 0, z: 1 }, up: { x: 0, y: -1, z: 0 } },   // +Z
	{ dir: { x: 0, y: 0, z: -1 }, up: { x: 0, y: -1, z: 0 } }   // -Z
];

/**
 * Default shadow map configuration.
 */
const DEFAULT_SHADOW_CONFIG: IgeShadowMapConfig = {
	size: 1024,
	bias: 0.005,
	normalBias: 0.02,
	softness: 1.0,
	pcfSamples: 4
};

/**
 * Manages shadow maps for the WebGL renderer.
 * Supports directional light shadows with PCF soft shadows.
 */
export class IgeWebGlShadowManager extends IgeBaseClass {
	classId = "IgeWebGlShadowManager";

	/** The GPU device the maps are made and drawn on; GL for the passes that sample them and aren't on it yet. */
	protected _device: IgeWebGl2GpuDevice;
	protected _gl: WebGL2RenderingContext;

	// Directional shadow maps
	protected _shadowMaps: Map<string, ShadowMapData> = new Map();

	// Point light shadow maps
	protected _pointShadowMaps: Map<string, PointShadowMapData> = new Map();

	// Static caster caches for directional lights
	protected _shadowCaches: Map<string, IgeShadowCacheData> = new Map();

	// Point shadow atlas texture format (configurable for performance vs precision)
	protected _pointShadowFormat: PointShadowTextureFormat = "rgba8";

	// Global shadow settings
	protected _enabled: boolean = true;
	protected _defaultConfig: IgeShadowMapConfig = { ...DEFAULT_SHADOW_CONFIG };

	// Light space matrix calculation helpers
	protected _lightViewMatrix: IgeMatrix4 = new IgeMatrix4();
	protected _lightProjectionMatrix: IgeMatrix4 = new IgeMatrix4();
	protected _lightSpaceMatrix: IgeMatrix4 = new IgeMatrix4();

	// Shadow frustum bounds (for directional light orthographic projection)
	protected _shadowFrustumSize: number = 400; // World units to cover
	protected _shadowNear: number = 1;
	protected _shadowFar: number = 500;

	constructor(device: IgeWebGl2GpuDevice) {
		super();
		this._device = device;
		this._gl = device.gl;

		// Prefer R32F point shadow atlases: 8-bit depth bands visibly on curved
		// surfaces at zero bias. Rendering to float targets needs
		// EXT_color_buffer_float, so fall back to RGBA8 without it.
		if (device.limits.floatTargets) {
			this._pointShadowFormat = "r32f";
		}

		this.log("Shadow manager initialized");
	}

	/**
	 * Gets / sets the texture format for point shadow atlases.
	 * "rgba8" = fastest, compatible with all GPUs (default)
	 * "r32f" = best precision, less memory, but slower on some GPUs (WebGL 2 only)
	 * Must be set before creating point shadow maps.
	 */
	pointShadowFormat(): PointShadowTextureFormat;
	pointShadowFormat(val: PointShadowTextureFormat): this;
	pointShadowFormat(val?: PointShadowTextureFormat): PointShadowTextureFormat | this {
		if (val !== undefined) {
			this._pointShadowFormat = val;
			return this;
		}
		return this._pointShadowFormat;
	}

	/**
	 * Enable or disable shadow mapping.
	 */
	enabled(val?: boolean): boolean | this {
		if (val !== undefined) {
			this._enabled = val;
			return this;
		}
		return this._enabled;
	}

	/**
	 * Set the shadow frustum size (world units covered by shadow map).
	 */
	frustumSize(val?: number): number | this {
		if (val !== undefined) {
			this._shadowFrustumSize = val;
			return this;
		}
		return this._shadowFrustumSize;
	}

	/**
	 * Set the shadow near/far planes.
	 */
	shadowPlanes(near?: number, far?: number): { near: number; far: number } | this {
		if (near !== undefined) {
			this._shadowNear = near;
			this._shadowFar = far ?? this._shadowFar;
			return this;
		}
		return { near: this._shadowNear, far: this._shadowFar };
	}

	/**
	 * After the WebGL context was lost and restored: every shadow map made
	 * again at the size and bias it had (its old textures are let go), and
	 * the static caches dropped (they're rebuilt when next drawn).
	 */
	contextRestored(): void {
		const maps = [...this._shadowMaps].map(([id, m]) => [id, { size: m.size, bias: m.bias, normalBias: m.normalBias }] as const);
		const points = [...this._pointShadowMaps].map(([id, m]) => [id, { size: m.faceSize, bias: m.bias, nearPlane: m.nearPlane, farPlane: m.farPlane }] as const);
		this._shadowMaps.clear();
		this._pointShadowMaps.clear();
		this._shadowCaches.clear();
		for (const [id, cfg] of maps) this.createShadowMap(id, cfg);
		for (const [id, cfg] of points) this.createPointShadowMap(id, cfg);
	}

	/**
	 * Create or update a shadow map for a directional light: a depth texture
	 * (32-bit float), sampled nearest.
	 */
	createShadowMap(
		lightId: string,
		config?: Partial<IgeShadowMapConfig>
	): boolean {
		const cfg = { ...this._defaultConfig, ...config };

		// Delete existing shadow map (and its static cache) if present
		if (this._shadowMaps.has(lightId)) {
			this.deleteShadowMap(lightId);
		}
		this.deleteShadowCache(lightId);

		this._device.invalidate();
		const depth = this._device.createTexture({ width: cfg.size, height: cfg.size, format: "depth32float", sampler: NEAREST, memory: "shadowMaps", label: `${lightId} shadow map` });

		const cascades: IgeShadowCascade[] = [];
		for (let i = 0; i < IGE_MAX_SHADOW_CASCADES; i++) cascades.push({ matrix: new Float32Array(16), viewport: [0, 0, cfg.size, cfg.size], tile: [0, 0, 1, 1], start: 0, split: Infinity, from: 0 });
		this._shadowMaps.set(lightId, {
			depth,
			lightSpaceMatrix: cascades[0].matrix,
			size: cfg.size,
			bias: cfg.bias,
			normalBias: cfg.normalBias,
			cascades,
			cascadeCount: 1,
			cascadeBlend: 0,
			fadeEnd: 0
		});

		this.log(`Created shadow map for ${lightId} (${cfg.size}x${cfg.size})`);
		return true;
	}

	/**
	 * Delete a shadow map.
	 */
	deleteShadowMap(lightId: string): void {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return;

		this._device.invalidate();
		this._device.destroyTexture(shadowMap.depth);
		this._shadowMaps.delete(lightId);
		this.deleteShadowCache(lightId);
		this.log(`Deleted shadow map for ${lightId}`);
	}

	/**
	 * Get (creating on first use) the static caster cache for a directional
	 * light's shadow map.
	 */
	getShadowCache(lightId: string): IgeShadowCacheData | null {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return null;

		const existing = this._shadowCaches.get(lightId);
		if (existing && existing.size === shadowMap.size) return existing;
		if (existing) this.deleteShadowCache(lightId);

		const tiles: IgeShadowCacheTile[] = [];
		for (let i = 0; i < IGE_MAX_SHADOW_CASCADES; i++) tiles.push({ matrix: new Float32Array(16), signatureA: 0, signatureB: 0, count: -1, valid: false });
		const cache: IgeShadowCacheData = {
			depth: this._device.createTexture({ width: shadowMap.size, height: shadowMap.size, format: "depth32float", sampler: NEAREST, memory: "shadowMaps", label: `${lightId} static shadow casters` }),
			size: shadowMap.size,
			tiles,
			layout: 1,
			mapHoldsCache: false
		};
		this._shadowCaches.set(lightId, cache);
		return cache;
	}

	/** Delete a directional light's static caster cache. */
	deleteShadowCache(lightId: string): void {
		const cache = this._shadowCaches.get(lightId);
		if (!cache) return;
		this._device.destroyTexture(cache.depth);
		this._shadowCaches.delete(lightId);
	}

	/**
	 * Begin rendering static casters into a light's cache (cleared first, unless `clear` is false: only the tiles
	 * being redrawn are cleared then, with clearShadowTile()). Finish with endShadowPass().
	 */
	beginShadowCachePass(lightId: string, clear: boolean = true): IgeGpuRenderPass | null {
		const cache = this._shadowCaches.get(lightId);
		if (!this._enabled || !cache) return null;
		return this._device.beginRenderPass({ depthStencil: { target: cache.depth, depthLoadOp: clear ? "clear" : "load", depthClearValue: 1 } });
	}

	/** Draw into one cascade's tile of a shadow pass: the viewport set to it, scissored to it; `clear` clears its depth first. */
	shadowTile(pass: IgeGpuRenderPass, lightId: string, index: number, clear: boolean = false): boolean {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return false;
		const [x, y, w, h] = shadowMap.cascades[index].viewport;
		pass.setViewport(x, y, w, h);
		pass.setScissorRect(shadowMap.cascadeCount > 1 ? [x, y, w, h] : null);
		if (clear) pass.clear([1, 1, 1, 1], [x, y, w, h], 1);
		return true;
	}

	/**
	 * Copy a light's cached static depth into its shadow map.
	 */
	copyShadowCache(lightId: string): boolean {
		const cache = this._shadowCaches.get(lightId);
		const shadowMap = this._shadowMaps.get(lightId);
		if (!cache || !shadowMap) return false;
		this._device.copyTextureToTexture(cache.depth, shadowMap.depth);
		return true;
	}

	/**
	 * Update the light space matrix for a directional light.
	 * @param lightId The light identifier
	 * @param light The directional light
	 * @param cameraPosition Camera position (used for following the camera, but we focus on scene center)
	 * @param sceneCenter Optional scene center to focus shadows on (defaults to origin)
	 */
	updateLightSpaceMatrix(
		lightId: string,
		light: IgeDirectionalLight,
		cameraPosition?: { x: number; y: number; z: number },
		sceneCenter?: { x: number; y: number; z: number }
	): Float32Array | null {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return null;

		const dir = light.direction() as { x: number; y: number; z: number };

		// Use scene center for shadow frustum focus (default to origin)
		// This ensures shadows cover the actual scene geometry, not where the camera is
		const targetX = sceneCenter?.x ?? 0;
		const targetY = sceneCenter?.y ?? 0;
		const targetZ = sceneCenter?.z ?? 0;

		// Position light far away in the opposite direction of light direction
		const lightDistance = this._shadowFar * 0.5;
		const lightX = targetX - dir.x * lightDistance;
		const lightY = targetY - dir.y * lightDistance;
		const lightZ = targetZ - dir.z * lightDistance;

		// Calculate up vector (ensure it's not parallel to direction)
		let upX = 0, upY = 1, upZ = 0;
		if (Math.abs(dir.y) > 0.99) {
			upX = 1;
			upY = 0;
			upZ = 0;
		}

		// Create view matrix (lookAt)
		this._lightViewMatrix.lookAt(
			lightX, lightY, lightZ,    // eye
			targetX, targetY, targetZ, // target
			upX, upY, upZ              // up
		);

		// Create orthographic projection for directional light
		const size = this._shadowFrustumSize;
		this._lightProjectionMatrix.orthographic(
			-size, size,      // left, right
			-size, size,      // bottom, top
			this._shadowNear, // near
			this._shadowFar   // far
		);

		// Combine into light space matrix
		this._lightSpaceMatrix.multiply(
			this._lightProjectionMatrix,
			this._lightViewMatrix
		);

		// Snap the projection to whole shadow-map texels. The shadow frustum
		// follows the camera target, and without snapping every sub-texel
		// move re-rasterises shadow edges differently, making them shimmer.
		const ls = this._lightSpaceMatrix.matrix;
		const halfSize = shadowMap.size / 2;
		const originX = ls[12] * halfSize;
		const originY = ls[13] * halfSize;
		const offsetX = (Math.round(originX) - originX) / halfSize;
		const offsetY = (Math.round(originY) - originY) / halfSize;
		if (offsetX !== 0 || offsetY !== 0) {
			this._lightProjectionMatrix.matrix[12] += offsetX;
			this._lightProjectionMatrix.matrix[13] += offsetY;
			this._lightSpaceMatrix.multiply(
				this._lightProjectionMatrix,
				this._lightViewMatrix
			);
		}

		// Copy to shadow map data (the whole map, one cascade, no fade)
		this.setCascadeCount(lightId, 1);
		shadowMap.fadeEnd = 0;
		shadowMap.lightSpaceMatrix.set(this._lightSpaceMatrix.matrix);

		return shadowMap.lightSpaceMatrix;
	}

	/**
	 * Fit a directional light's shadow map round what a view sees (see IgeShadowFit): `points` are the corners of the
	 * volume that can take shadows (x, y, z triples, igeShadowFitVolume()), `box` the view's fitted box, kept between
	 * frames. The box is snapped to the map's texels, steps through a ladder of sizes, and with `follow` false is left
	 * where it is while it still holds the view (shadow caching). Its depth spans at least the shadow planes' far -
	 * near, so the bias means what it did. Returns the light space matrix (null: the light has no map).
	 */
	fitLightSpaceMatrix(
		lightId: string,
		light: IgeDirectionalLight,
		points: ArrayLike<number>,
		count: number,
		box: IgeShadowFitBox,
		options: { slack: number; follow: boolean }
	): Float32Array | null {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap || count === 0) return null;
		this.setCascadeCount(lightId, 1);
		return this.fitCascade(lightId, light, 0, points, count, box, options);
	}

	/**
	 * How many cascades a light's map is drawn in (1 to IGE_MAX_SHADOW_CASCADES; see IgeWebGlRenderer.shadowCascades()):
	 * one is the whole map, more are a 2 x 2 grid of half-size tiles. `blend` is the far part of each slice faded into
	 * the next. Each cascade's matrix is fitted after with fitCascade(), its slice set with setCascadeSlice().
	 */
	setCascadeCount(lightId: string, count: number, blend: number = 0): void {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return;
		const n = Math.min(Math.max(1, Math.floor(count)), IGE_MAX_SHADOW_CASCADES);
		shadowMap.cascadeCount = n;
		shadowMap.cascadeBlend = n > 1 ? blend : 0;
		const size = shadowMap.size;
		for (let i = 0; i < IGE_MAX_SHADOW_CASCADES; i++) {
			const c = shadowMap.cascades[i];
			const tile = igeShadowCascadeTile(i, n);
			c.tile = tile;
			c.viewport = [Math.round(tile[0] * size), Math.round(tile[1] * size), Math.round(tile[2] * size), Math.round(tile[3] * size)];
			c.start = 0;
			c.split = Infinity;
			c.from = 0;
		}
	}

	/**
	 * The view depth a light's shadows have faded out by: over the last tenth of it they fade, so they don't end in a
	 * line (the fitted map's distance; 0, the default, for none).
	 */
	setShadowFade(lightId: string, end: number): void {
		const shadowMap = this._shadowMaps.get(lightId);
		if (shadowMap) shadowMap.fadeEnd = end > 0 && end < Infinity ? end : 0;
	}

	/**
	 * Where cascade `index`'s slice of the view's depth starts and ends (view depths; the last ends at Infinity), and
	 * where its box's part of the view starts (`from`: the start less the slice before's blend).
	 */
	setCascadeSlice(lightId: string, index: number, start: number, split: number, from: number = start): void {
		const c = this._shadowMaps.get(lightId)?.cascades[index];
		if (!c) return;
		c.start = start;
		c.split = split;
		c.from = from;
	}

	/**
	 * Fit one cascade's matrix round `count` points (its slice of the view, igeShadowFitVolume()) in its tile, as
	 * fitLightSpaceMatrix() fits the whole map. Returns its matrix.
	 */
	fitCascade(
		lightId: string,
		light: IgeDirectionalLight,
		index: number,
		points: ArrayLike<number>,
		count: number,
		box: IgeShadowFitBox,
		options: { slack: number; follow: boolean }
	): Float32Array | null {
		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap || count === 0) return null;
		const cascade = shadowMap.cascades[index];
		const basis = igeShadowLightBasis(light.direction() as { x: number; y: number; z: number });
		igeFitShadowBox(box, points, count, basis, {
			mapSize: cascade.viewport[2],
			depthSpan: Math.max(this._shadowFar - this._shadowNear, 1e-3),
			slack: options.slack,
			follow: options.follow
		});
		igeShadowBoxMatrix(box, basis, cascade.matrix);
		return cascade.matrix;
	}

	/** A light's cascades in use (one: the whole map), or an empty list when it has no map. */
	getCascades(lightId: string): readonly IgeShadowCascade[] {
		const shadowMap = this._shadowMaps.get(lightId);
		return shadowMap ? shadowMap.cascades.slice(0, shadowMap.cascadeCount) : [];
	}

	/**
	 * Begin a light's shadow pass: depth only, into its map (cleared to the
	 * far plane unless `clear` is false: the static casters copied in kept).
	 * Draws are culled front faces (pipelines with cullMode "front"). Finish
	 * with endShadowPass().
	 */
	beginShadowPass(lightId: string, clear: boolean = true): IgeGpuRenderPass | null {
		if (!this._enabled) return null;

		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return null;

		return this._device.beginRenderPass({ depthStencil: { target: shadowMap.depth, depthLoadOp: clear ? "clear" : "load", depthClearValue: 1 } });
	}

	/** End a shadow pass. */
	endShadowPass(pass: IgeGpuRenderPass): void {
		pass.end();
	}

	/**
	 * Apply shadow uniforms to a shader program (one not yet drawing through
	 * the device: its map's GL texture bound to `textureUnit`).
	 */
	applyShadowUniforms(program: IgeWebGlProgram, lightId: string, textureUnit: number = 1): boolean {
		if (!this._enabled) {
			program.setUniform1i("u_hasShadowMap", 0);
			return false;
		}

		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) {
			program.setUniform1i("u_hasShadowMap", 0);
			return false;
		}

		const gl = this._gl;
		const tex = webGl2Texture(this._device, shadowMap.depth);

		// Bind shadow map texture to specified unit
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, tex);

		// Set shadow uniforms
		program.setUniform1i("u_hasShadowMap", 1);
		program.setUniform1i("u_shadowMap", textureUnit);
		program.setUniform1i("u_shadowCascadeCount", 1);
		program.setUniformMatrix4fv("u_shadowCascadeMatrices[0]", shadowMap.lightSpaceMatrix);
		program.setUniform4f("u_shadowCascadeTiles[0]", 0, 0, 1, 1);
		program.setUniform1f("u_shadowBias", shadowMap.bias);
		program.setUniform1f("u_shadowNormalBias", shadowMap.normalBias);
		program.setUniform2f("u_shadowTexel", 1 / shadowMap.size, 1 / shadowMap.size);

		// Restore active texture to unit 0 so state manager stays in sync
		gl.activeTexture(gl.TEXTURE0);

		return true;
	}

	/**
	 * A light's shadow uniforms written into a uniform block (for a pipeline on the GPU device), as applyShadowUniforms
	 * sets them on a program. Returns its shadow map, to set in the shadow map's texture slot (null: none).
	 */
	writeShadowUniforms(block: Float32Array, at: Readonly<Record<string, number>>, lightId: string): IgeGpuTexture | null {
		const shadowMap = this._enabled ? this._shadowMaps.get(lightId) : undefined;
		if (!shadowMap) {
			block[at.u_hasShadowMap] = 0;
			return null;
		}
		block[at.u_hasShadowMap] = 1;
		const n = shadowMap.cascadeCount;
		block[at.u_shadowCascadeCount] = n;
		for (let i = 0; i < IGE_MAX_SHADOW_CASCADES; i++) {
			const c = shadowMap.cascades[Math.min(i, n - 1)];
			block.set(c.matrix, at.u_shadowCascadeMatrices + i * 16);
			block.set(c.tile, at.u_shadowCascadeTiles + i * 4);
			// (The last in use, and any after it, take every depth beyond: no slice ends there)
			block[at.u_shadowCascadeSplits + i] = i < n - 1 ? c.split : 3.4e38;
			block[at.u_shadowCascadeStarts + i] = c.start;
		}
		block[at.u_shadowCascadeBlend] = shadowMap.cascadeBlend;
		block[at.u_shadowFadeEnd] = shadowMap.fadeEnd;
		block[at.u_shadowBias] = shadowMap.bias;
		block[at.u_shadowNormalBias] = shadowMap.normalBias;
		block[at.u_shadowTexel] = 1 / shadowMap.size;
		block[at.u_shadowTexel + 1] = 1 / shadowMap.size;
		return shadowMap.depth;
	}

	/**
	 * A point light's shadow uniforms (slot `shadowIndex`) written into a uniform block, as applyPointShadowUniforms sets
	 * them. Returns its atlas, for that slot's texture (null: none).
	 */
	writePointShadowUniforms(block: Float32Array, at: Readonly<Record<string, number>>, shadowIndex: number, lightId: string): IgeGpuTexture | null {
		const data = this._pointShadowMaps.get(lightId);
		if (!data) return null;
		block[at.u_pointShadowFarPlane + shadowIndex] = data.farPlane;
		block[at.u_pointShadowBias + shadowIndex] = data.bias;
		block[at.u_pointShadowFaceSize + shadowIndex] = data.faceSize;
		for (let face = 0; face < 6; face++) block.set(data.lightSpaceMatrices[face].matrix, at.u_pointShadowMatrices + (shadowIndex * 6 + face) * 16);
		return data.atlas;
	}

	/**
	 * Get the light space matrix for a light.
	 */
	getLightSpaceMatrix(lightId: string): Float32Array | null {
		const shadowMap = this._shadowMaps.get(lightId);
		return shadowMap?.lightSpaceMatrix ?? null;
	}

	/**
	 * Get the resolution (width and height in texels) of a light's shadow
	 * map, or 0 if it has none.
	 */
	getShadowMapSize(lightId: string): number {
		return this._shadowMaps.get(lightId)?.size ?? 0;
	}

	/**
	 * Get a light's shadow map (its depth texture on the device).
	 */
	getShadowMapTexture(lightId: string): IgeGpuTexture | null {
		return this._shadowMaps.get(lightId)?.depth ?? null;
	}

	/**
	 * Check if a light has a shadow map.
	 */
	hasShadowMap(lightId: string): boolean {
		return this._shadowMaps.has(lightId);
	}

	// ========================================================================
	// Point Light Shadow Maps (6-face cube rendering)
	// ========================================================================

	/**
	 * Create a point light shadow map using a 3x2 atlas texture.
	 * All 6 cube faces are rendered into a single texture (R32F, or RGBA8
	 * packed), with one depth buffer for the whole atlas.
	 * Layout: row0=[+X, -X, +Y], row1=[-Y, +Z, -Z]
	 */
	createPointShadowMap(
		lightId: string,
		config?: { size?: number; bias?: number; nearPlane?: number; farPlane?: number }
	): boolean {
		const faceSize = config?.size ?? 512;
		const bias = config?.bias ?? 0.002;
		const nearPlane = config?.nearPlane ?? 0.5;
		const farPlane = config?.farPlane ?? 500;

		const atlasWidth = faceSize * 3;
		const atlasHeight = faceSize * 2;

		if (this._pointShadowMaps.has(lightId)) {
			this.deletePointShadowMap(lightId);
		}

		const d = this._device;
		d.invalidate();
		const float = this._pointShadowFormat === "r32f" && d.limits.floatTargets;
		const atlas = d.createTexture({ width: atlasWidth, height: atlasHeight, format: float ? "r32float" : "rgba8unorm", sampler: NEAREST, memory: "shadowMaps", label: `${lightId} point shadow atlas` });
		const depth = d.createTexture({ width: atlasWidth, height: atlasHeight, format: "depth16unorm", sampler: NEAREST, memory: "shadowMaps", label: `${lightId} point shadow depth` });

		const lightSpaceMatrices: IgeMatrix4[] = [];
		for (let i = 0; i < 6; i++) {
			lightSpaceMatrices.push(new IgeMatrix4());
		}

		this._pointShadowMaps.set(lightId, {
			atlas,
			depth,
			lightSpaceMatrices,
			faceSize,
			bias,
			nearPlane,
			farPlane
		});

		this.log(`Created point shadow atlas for ${lightId} (${atlasWidth}x${atlasHeight}, face=${faceSize})`);
		return true;
	}

	/**
	 * Delete a point light shadow map.
	 */
	deletePointShadowMap(lightId: string): void {
		const data = this._pointShadowMaps.get(lightId);
		if (!data) return;

		this._device.invalidate();
		this._device.destroyTexture(data.atlas);
		this._device.destroyTexture(data.depth);

		this._pointShadowMaps.delete(lightId);
		this.log(`Deleted point shadow map for ${lightId}`);
	}

	/**
	 * Update the 6 light-space matrices for a point light.
	 */
	updatePointLightSpaceMatrices(lightId: string, light: IgePointLight): boolean {
		const data = this._pointShadowMaps.get(lightId);
		if (!data) return false;

		const pos = light._translate;
		const near = data.nearPlane;
		const far = data.farPlane;

		const projMatrix = new IgeMatrix4();
		projMatrix.perspective(Math.PI / 2, 1.0, near, far);

		for (let face = 0; face < 6; face++) {
			const faceDir = CUBE_FACE_DIRS[face];

			const viewMatrix = new IgeMatrix4();
			viewMatrix.lookAt(
				pos.x, pos.y, pos.z,
				pos.x + faceDir.dir.x, pos.y + faceDir.dir.y, pos.z + faceDir.dir.z,
				faceDir.up.x, faceDir.up.y, faceDir.up.z
			);

			data.lightSpaceMatrices[face].multiply(projMatrix, viewMatrix);
		}

		return true;
	}

	/**
	 * Get the atlas viewport offset for a given face index.
	 * Layout: row0=[+X(0), -X(1), +Y(2)], row1=[-Y(3), +Z(4), -Z(5)]
	 */
	getAtlasFaceOffset(faceIndex: number, faceSize: number): { x: number; y: number } {
		const col = faceIndex % 3;
		const row = Math.floor(faceIndex / 3);
		return { x: col * faceSize, y: row * faceSize };
	}

	/**
	 * Begin rendering a point light's shadow atlas: the whole of it cleared
	 * (to the far plane: white). Draw each face after pointShadowFace(), then
	 * finish with endShadowPass().
	 */
	beginPointShadowPass(lightId: string): IgeGpuRenderPass | null {
		if (!this._enabled) return null;

		const data = this._pointShadowMaps.get(lightId);
		if (!data) return null;

		return this._device.beginRenderPass({
			color: { target: data.atlas, loadOp: "clear", clearValue: [1, 1, 1, 1] },
			depthStencil: { target: data.depth, depthLoadOp: "clear", depthClearValue: 1 }
		});
	}

	/** Draw into one face of a point light's atlas: the viewport set to its region, scissored to it (no bleeding between faces). */
	pointShadowFace(pass: IgeGpuRenderPass, lightId: string, faceIndex: number): boolean {
		const data = this._pointShadowMaps.get(lightId);
		if (!data || faceIndex < 0 || faceIndex > 5) return false;
		const offset = this.getAtlasFaceOffset(faceIndex, data.faceSize);
		pass.setViewport(offset.x, offset.y, data.faceSize, data.faceSize);
		pass.setScissorRect([offset.x, offset.y, data.faceSize, data.faceSize]);
		return true;
	}

	/**
	 * Get a point light shadow map's light-space matrix for a specific face.
	 */
	getPointLightSpaceMatrix(lightId: string, faceIndex: number): IgeMatrix4 | null {
		const data = this._pointShadowMaps.get(lightId);
		if (!data || faceIndex < 0 || faceIndex > 5) return null;
		return data.lightSpaceMatrices[faceIndex];
	}

	/**
	 * Get point shadow map data for a light.
	 */
	getPointShadowMapData(lightId: string): PointShadowMapData | null {
		return this._pointShadowMaps.get(lightId) ?? null;
	}

	/**
	 * Check if a point light has a shadow map.
	 */
	hasPointShadowMap(lightId: string): boolean {
		return this._pointShadowMaps.has(lightId);
	}

	/**
	 * Apply point shadow uniforms to a shader program (one not yet drawing
	 * through the device: the atlas's GL texture bound to `textureUnit`).
	 * @param program Shader program
	 * @param shadowIndex Which point shadow slot (0 or 1)
	 * @param lightId Light ID
	 * @param textureUnit Texture unit to bind the atlas to
	 */
	applyPointShadowUniforms(
		program: IgeWebGlProgram,
		shadowIndex: number,
		lightId: string,
		textureUnit: number
	): boolean {
		const data = this._pointShadowMaps.get(lightId);
		if (!data) return false;

		const gl = this._gl;
		const tex = webGl2Texture(this._device, data.atlas);

		// Bind atlas texture
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		program.setUniform1i(`u_pointShadowAtlas[${shadowIndex}]`, textureUnit);

		// Set per-shadow uniforms
		program.setUniform1f(`u_pointShadowFarPlane[${shadowIndex}]`, data.farPlane);
		program.setUniform1f(`u_pointShadowBias[${shadowIndex}]`, data.bias);
		program.setUniform1f(`u_pointShadowFaceSize[${shadowIndex}]`, data.faceSize);

		// Set 6 light-space matrices
		for (let face = 0; face < 6; face++) {
			program.setUniformMatrix4fv(
				`u_pointShadowMatrices[${shadowIndex * 6 + face}]`,
				data.lightSpaceMatrices[face]
			);
		}

		gl.activeTexture(gl.TEXTURE0);
		return true;
	}

	/**
	 * Get statistics about shadow maps.
	 */
	getStats(): {
		enabled: boolean;
		count: number;
		totalSize: number;
	} {
		let totalSize = 0;
		for (const shadowMap of this._shadowMaps.values()) {
			totalSize += shadowMap.size * shadowMap.size * 4;
		}
		for (const pointMap of this._pointShadowMaps.values()) {
			totalSize += pointMap.faceSize * 3 * pointMap.faceSize * 2 * 4; // atlas 3x2
		}

		return {
			enabled: this._enabled,
			count: this._shadowMaps.size + this._pointShadowMaps.size,
			totalSize
		};
	}

	/**
	 * Clear all shadow maps.
	 */
	clearAll(): void {
		for (const lightId of this._shadowMaps.keys()) {
			this.deleteShadowMap(lightId);
		}
		for (const lightId of this._pointShadowMaps.keys()) {
			this.deletePointShadowMap(lightId);
		}
	}
}
