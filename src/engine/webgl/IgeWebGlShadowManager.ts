import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import type { IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";

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
 * Shadow map data for a single light.
 */
interface ShadowMapData {
	framebuffer: WebGLFramebuffer;
	depthTexture: WebGLTexture;
	colorTexture?: WebGLTexture; // For WebGL 1 depth packing
	lightSpaceMatrix: Float32Array;
	size: number;
	bias: number;
	normalBias: number;
}

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

	protected _gl: WebGLRenderingContext | WebGL2RenderingContext;
	protected _resourceManager: IgeWebGlResourceManager;
	protected _webglVersion: 1 | 2;

	// Shadow maps for each shadow-casting light
	protected _shadowMaps: Map<string, ShadowMapData> = new Map();

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

	constructor(
		gl: WebGLRenderingContext | WebGL2RenderingContext,
		resourceManager: IgeWebGlResourceManager,
		webglVersion: 1 | 2
	) {
		super();
		this._gl = gl;
		this._resourceManager = resourceManager;
		this._webglVersion = webglVersion;

		this.log(`Shadow manager initialized (WebGL ${webglVersion})`);
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
	 * Create or update a shadow map for a directional light.
	 */
	createShadowMap(
		lightId: string,
		config?: Partial<IgeShadowMapConfig>
	): boolean {
		const gl = this._gl;
		const cfg = { ...this._defaultConfig, ...config };

		// Delete existing shadow map if present
		if (this._shadowMaps.has(lightId)) {
			this.deleteShadowMap(lightId);
		}

		// Create framebuffer
		const framebuffer = gl.createFramebuffer();
		if (!framebuffer) {
			this.log(`Failed to create shadow framebuffer for ${lightId}`, "error");
			return false;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

		let depthTexture: WebGLTexture | null = null;
		let colorTexture: WebGLTexture | null = null;

		if (this._webglVersion === 2) {
			// WebGL 2: Use depth texture directly
			depthTexture = gl.createTexture();
			if (!depthTexture) {
				this.log(`Failed to create depth texture for ${lightId}`, "error");
				gl.deleteFramebuffer(framebuffer);
				return false;
			}

			gl.bindTexture(gl.TEXTURE_2D, depthTexture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				(gl as WebGL2RenderingContext).DEPTH_COMPONENT24,
				cfg.size,
				cfg.size,
				0,
				gl.DEPTH_COMPONENT,
				gl.UNSIGNED_INT,
				null
			);

			// Set texture parameters for shadow sampling
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			// Attach depth texture to framebuffer
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.DEPTH_ATTACHMENT,
				gl.TEXTURE_2D,
				depthTexture,
				0
			);

			// No color attachment needed for depth-only rendering
			const gl2 = gl as WebGL2RenderingContext;
			gl2.drawBuffers([gl2.NONE]);
			gl2.readBuffer(gl2.NONE);
		} else {
			// WebGL 1: Use color texture with depth packing
			// Create color texture for packed depth
			colorTexture = gl.createTexture();
			if (!colorTexture) {
				this.log(`Failed to create color texture for ${lightId}`, "error");
				gl.deleteFramebuffer(framebuffer);
				return false;
			}

			gl.bindTexture(gl.TEXTURE_2D, colorTexture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				cfg.size,
				cfg.size,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null
			);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				colorTexture,
				0
			);

			// Create renderbuffer for depth
			const depthBuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, cfg.size, cfg.size);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

			// Use color texture as the "depth texture" for sampling
			depthTexture = colorTexture;
		}

		// Check framebuffer completeness
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			this.log(`Shadow framebuffer incomplete: ${status}`, "error");
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.deleteFramebuffer(framebuffer);
			if (depthTexture) gl.deleteTexture(depthTexture);
			if (colorTexture && colorTexture !== depthTexture) gl.deleteTexture(colorTexture);
			return false;
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);

		// Store shadow map data
		this._shadowMaps.set(lightId, {
			framebuffer,
			depthTexture: depthTexture!,
			colorTexture: colorTexture || undefined,
			lightSpaceMatrix: new Float32Array(16),
			size: cfg.size,
			bias: cfg.bias,
			normalBias: cfg.normalBias
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

		const gl = this._gl;
		gl.deleteFramebuffer(shadowMap.framebuffer);
		gl.deleteTexture(shadowMap.depthTexture);
		if (shadowMap.colorTexture && shadowMap.colorTexture !== shadowMap.depthTexture) {
			gl.deleteTexture(shadowMap.colorTexture);
		}

		this._shadowMaps.delete(lightId);
		this.log(`Deleted shadow map for ${lightId}`);
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

		// Copy to shadow map data
		shadowMap.lightSpaceMatrix.set(this._lightSpaceMatrix.matrix);

		return shadowMap.lightSpaceMatrix;
	}

	/**
	 * Begin shadow pass rendering.
	 * Binds the shadow framebuffer and sets up viewport.
	 */
	beginShadowPass(lightId: string): boolean {
		if (!this._enabled) return false;

		const shadowMap = this._shadowMaps.get(lightId);
		if (!shadowMap) return false;

		const gl = this._gl;

		// Bind shadow framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMap.framebuffer);

		// Set viewport to shadow map size
		gl.viewport(0, 0, shadowMap.size, shadowMap.size);

		// Enable depth testing and writing BEFORE clearing
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);
		gl.depthMask(true);

		// Set clear depth to 1.0 (far plane) - this is crucial for proper shadow mapping
		gl.clearDepth(1.0);

		// Clear depth buffer (and color for WebGL 1)
		if (this._webglVersion === 1) {
			gl.clearColor(1.0, 1.0, 1.0, 1.0); // White = far depth when packed
			gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
		} else {
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}

		// Cull front faces to reduce shadow acne (Peter Panning)
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT);

		return true;
	}

	/**
	 * End shadow pass rendering.
	 * Restores default framebuffer and GL state.
	 */
	endShadowPass(): void {
		const gl = this._gl;

		// Restore default framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// Restore culling state - disable it since normal rendering will enable as needed
		gl.disable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		// Restore depth state
		gl.depthFunc(gl.LEQUAL);
		gl.depthMask(true);

		// Restore color mask (in case it was modified)
		gl.colorMask(true, true, true, true);

		// Restore clear color (shadow pass may have changed it for WebGL 1)
		gl.clearColor(0.0, 0.0, 0.0, 0.0);

		// Unbind shadow map texture to avoid feedback loops
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
	}

	/**
	 * Apply shadow uniforms to a shader program.
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

		// Bind shadow map texture to specified unit
		gl.activeTexture(gl.TEXTURE0 + textureUnit);
		gl.bindTexture(gl.TEXTURE_2D, shadowMap.depthTexture);

		// Set shadow uniforms
		program.setUniform1i("u_hasShadowMap", 1);
		program.setUniform1i("u_shadowMap", textureUnit);
		program.setUniformMatrix4fv("u_lightSpaceMatrix", shadowMap.lightSpaceMatrix);
		program.setUniform1f("u_shadowBias", shadowMap.bias);
		program.setUniform1f("u_shadowNormalBias", shadowMap.normalBias);
		program.setUniform1f("u_shadowMapSize", shadowMap.size);
		program.setUniform1i("u_usePackedDepth", this._webglVersion === 1 ? 1 : 0);

		// Restore active texture to unit 0 so state manager stays in sync
		gl.activeTexture(gl.TEXTURE0);

		return true;
	}

	/**
	 * Get the light space matrix for a light.
	 */
	getLightSpaceMatrix(lightId: string): Float32Array | null {
		const shadowMap = this._shadowMaps.get(lightId);
		return shadowMap?.lightSpaceMatrix ?? null;
	}

	/**
	 * Get shadow map texture for a light.
	 */
	getShadowMapTexture(lightId: string): WebGLTexture | null {
		const shadowMap = this._shadowMaps.get(lightId);
		return shadowMap?.depthTexture ?? null;
	}

	/**
	 * Check if a light has a shadow map.
	 */
	hasShadowMap(lightId: string): boolean {
		return this._shadowMaps.has(lightId);
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
			// Depth texture: width * height * 4 bytes (RGBA for WebGL1, depth for WebGL2)
			totalSize += shadowMap.size * shadowMap.size * 4;
		}

		return {
			enabled: this._enabled,
			count: this._shadowMaps.size,
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
	}
}
