import { IgeBaseRenderer } from "@/engine/core/IgeBaseRenderer";
import { IgeBehaviourType, IgeTextureRenderMode } from "@/enums";
import { IgeDummyContext } from "@/engine/core/IgeDummyContext";
import { markSceneChanged } from "@/engine/utils/sceneChange";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import type { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/utils/clientServer";
import { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { IgeWebGlShaderManager } from "@/engine/webgl/IgeWebGlShaderManager";
import { IgeWebGlTextureManager, igeTextureKey, type IgeTextureRole } from "@/engine/webgl/IgeWebGlTextureManager";
import { igeColorDefines } from "@/engine/shaders/webgl/chunks";
import { igeSrgbToLinear } from "@/engine/utils/igeColorSpace";
import { igeAnisotropyLevel } from "@/engine/gpu/IgeGpuTextureFormats";
import { IgeWebGlGeometryManager } from "@/engine/webgl/IgeWebGlGeometryManager";
import { IgeWebGlCameraController } from "@/engine/webgl/IgeWebGlCameraController";
import { IgeWebGlStateManager } from "@/engine/webgl/IgeWebGlStateManager";
import { IgeWebGlLightManager } from "@/engine/webgl/IgeWebGlLightManager";
import { type IgeShadowCascade, IgeShadowSignature, IgeWebGlShadowManager, igeShadowCasterIsStatic } from "@/engine/webgl/IgeWebGlShadowManager";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { IgeShaderLibrary } from "@/engine/shaders/webgl/shaderLibrary";
import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeDirectionalLight, IgePointLight } from "@/engine/webgl/IgeWebGlLight";
import type { IgeCameraMatrices } from "@/engine/webgl/IgeWebGlCameraController";
import type { IgeWebGlProgram } from "@/engine/webgl/IgeWebGlProgram";
import type { IgeWebGlGeometry } from "@/engine/webgl/IgeWebGlGeometry";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgeFrustum } from "@/engine/webgl/IgeFrustum";
import { type IgeSubtreeCull, igeAffineInvert, igeAffineMultiply, igeSubtreeHeights, igeSubtreeOutside, igeSubtreeSphere, SUBTREE_RETAKE_WALKS } from "@/engine/core/IgeSubtreeCull";
import {
	IgeWebGlBonePalette,
	IgeWebGlInstanceBuffer,
	IgeWebGlItemBatcher,
	INSTANCE_FLOATS,
	packInstances,
	type IgeWebGlItemBatch,
	type IgeWebGlRenderItem
} from "@/engine/webgl/IgeWebGlInstancing";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { igeGpuUniformLayout, type IgeGpuBlendState, type IgeGpuBuffer, type IgeGpuMemory, type IgeGpuRenderPass, type IgeGpuRenderPipeline, type IgeGpuRenderPipelineDesc, type IgeGpuTexture, type IgeGpuUniform, type IgeGpuVertexBufferLayout } from "@/engine/gpu/IgeGpuDevice";
import { type IgeWebGl2GpuDevice, webGl2ExternalTexture, webGl2Framebuffer, webGl2GpuDevice, webGl2Texture } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { EFFECT_ATTRIBUTES, IgeGpuMeshPrograms, INSTANCE_LAYOUT, meshLayout, meshTopology } from "@/engine/webgl/IgeGpuMeshPrograms";
import type { IgeModelPart } from "@/engine/webgl/IgeModelParts";
import { IgeGeometryUploadQueue, type IgeUploadBudget } from "@/engine/webgl/IgeGeometryUploadQueue";
import { geometryGpuBytes, unpackVertices } from "@/engine/webgl/IgeVertexPacking";
import type { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import type { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { DECAL_INSTANCE_FLOATS, DECAL_MESH_VERTEX_FLOATS } from "@/engine/webgl/IgeDecalSystem3d";
import type { IgeRaycastHit, IgeRaycastOptions } from "@/engine/webgl/IgeRaycast";
import { raycastEntities } from "@/engine/webgl/IgeRaycast";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { getModelParts, takeGeneratedLods } from "@/engine/webgl/IgeModelParts";
import type { IgeHeightfieldRayOptions } from "@/engine/webgl/IgeHeightfieldRay";
import { IgeDynamicResolution, IgeGpuFrameTimer, type IgeDynamicResolutionSettings } from "@/engine/webgl/IgeDynamicResolution";
import {
	IGE_MAX_SHADOW_CASCADES, IGE_SHADOW_CASCADE_DEFAULTS, IGE_SHADOW_FIT_DEFAULTS, type IgeShadowCascadeSettings, type IgeShadowFitBox,
	type IgeShadowCascadeSlice, type IgeShadowFitSettings, igeProjectionDepthRange, igeShadowCascadeSlices, igeShadowFitBox, igeShadowFitExtent, igeShadowFitVolume,
	igeShadowLightBasis
} from "@/engine/webgl/IgeShadowFit";
import { IGE_POST_PROCESS_DEFAULTS, igePictureEffectsOn, IgeWebGlPostProcess, type IgePostProcessSettings } from "@/engine/webgl/IgeWebGlPostProcess";
import { intersectHeightfield } from "@/engine/webgl/IgeHeightfieldRay";
import { type IgeUiSettings, type IgeUiView, placeUi } from "@/engine/webgl/IgeUiLayout";
import { type IgeUiQuad, IgeWebGlUiPass } from "@/engine/webgl/IgeWebGlUiPass";
import { IgePanelTargets } from "@/engine/webgl/IgePanelTarget";
import { IGE_LENS_MAX, IgeLens, type IgeLensDraw, type IgeLensInput, IgeLensPass, igeLensScreen } from "@/engine/webgl/IgeLens";
import { igePhaseApply, type IgePhaseEffect } from "@/engine/webgl/IgePhase";
import { type IgeOutlineRect, IgeWebGlOutlinePass, OUTLINE_MAX_RADIUS, outlineGroups, outlineOf, outlineRect } from "@/engine/webgl/IgeWebGlOutlinePass";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import type { IgeSkeleton } from "@/types/IgeSkeletonData";
import { MAX_BONES } from "@/types/IgeSkeletonData";

/** Texture unit layout used by the lit shaders. */
const SHADOW_TEXTURE_UNIT = 1;
const POINT_SHADOW_TEXTURE_UNIT = 2; // 2 and 3
const BONE_TEXTURE_UNIT = 4;
/** Emissive maps (see IgeMaterialData.emissiveTexture); without one the shader's emissive samples unit 0. */
const EMISSIVE_TEXTURE_UNIT = 5;
/** The material maps (normal, metallic-roughness, occlusion): units 6 to 8, bound only by draws that have them. */
const MAP_NORMAL = 0, MAP_METALLIC_ROUGHNESS = 1, MAP_AO = 2;

/**
 * A depth pass's uniform block: the light's matrix, the item's world matrix (not instanced), a point light's position
 * and far plane, and the skinning a skinned mesh needs (its bone matrices; instanced, the bone palette's size).
 */
function depthUniforms (skinned: boolean, instanced: boolean): IgeGpuUniform[] {
	const u: IgeGpuUniform[] = [
		{ name: "u_lightSpaceMatrix", type: "mat4" },
		{ name: "u_worldMatrix", type: "mat4" },
		{ name: "u_pointLightPosition", type: "vec3" },
		{ name: "u_pointShadowFarPlane", type: "f32" }
	];
	if (skinned) {
		u.push({ name: "u_useSkinning", type: "i32" });
		if (instanced) u.push({ name: "u_boneTextureSize", type: "vec2" });
		else u.push({ name: "u_boneMatrices[0]", type: "mat4", count: MAX_BONES });
	}
	return u;
}

/** The effect passes' (particles', decals') uniform block: the camera, fog, how a decal's blended and its atlas. */
const EFFECT_UNIFORMS: IgeGpuUniform[] = [
	{ name: "u_viewMatrix", type: "mat4" },
	{ name: "u_projectionMatrix", type: "mat4" },
	{ name: "u_cameraPosition", type: "vec3" },
	{ name: "u_fogMode", type: "i32" },
	{ name: "u_fogNear", type: "f32" },
	{ name: "u_fogFar", type: "f32" },
	{ name: "u_fogDensity", type: "f32" },
	{ name: "u_multiply", type: "i32" },
	{ name: "u_atlasGrid", type: "f32" }
];

/** A particle's instance (position and size, colour), a decal's (position and size, colour, shape), a projected decal's vertex. */
const PARTICLE_LAYOUT: IgeGpuVertexBufferLayout = { arrayStride: 32, stepMode: "instance", attributes: [{ shaderLocation: 7, format: "float32x4", offset: 0 }, { shaderLocation: 8, format: "float32x4", offset: 16 }] };
const DECAL_LAYOUT: IgeGpuVertexBufferLayout = { arrayStride: 48, stepMode: "instance", attributes: [{ shaderLocation: 7, format: "float32x4", offset: 0 }, { shaderLocation: 8, format: "float32x4", offset: 16 }, { shaderLocation: 9, format: "float32x4", offset: 32 }] };
const DECAL_MESH_LAYOUT: IgeGpuVertexBufferLayout = { arrayStride: 36, attributes: [{ shaderLocation: 0, format: "float32x3", offset: 0 }, { shaderLocation: 2, format: "float32x2", offset: 12 }, { shaderLocation: 3, format: "float32x4", offset: 20 }] };

/** The effects' blends: over (alpha), added (glows, sparks), multiplied (decals darkening what's under them). */
const EFFECT_BLENDS: Record<"normal" | "additive" | "multiply", IgeGpuBlendState> = {
	normal: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" } },
	additive: { color: { srcFactor: "src-alpha", dstFactor: "one" }, alpha: { srcFactor: "src-alpha", dstFactor: "one" } },
	multiply: { color: { srcFactor: "dst", dstFactor: "zero" }, alpha: { srcFactor: "dst", dstFactor: "zero" } }
};

/**
 * The lit (and skinned) programs' uniform block: the view's members first (camera, lights, shadows, fog, shading
 * options), an item's last, so a draw sends only its own (setUniforms with a range).
 */
const LIT_VIEW_UNIFORMS: IgeGpuUniform[] = [
	{ name: "u_viewMatrix", type: "mat4" }, { name: "u_projectionMatrix", type: "mat4" }, { name: "u_cameraPosition", type: "vec3" },
	{ name: "u_ambientLightColor", type: "vec3" }, { name: "u_ambientLightIntensity", type: "f32" }, { name: "u_ambientGroundColor", type: "vec3" },
	{ name: "u_hasDirectionalLight", type: "i32" }, { name: "u_directionalLightDir", type: "vec3" }, { name: "u_directionalLightColor", type: "vec3" }, { name: "u_directionalLightIntensity", type: "f32" },
	{ name: "u_numPointLights", type: "i32" }, { name: "u_pointLightPositions", type: "vec3", count: 8 }, { name: "u_pointLightColors", type: "vec3", count: 8 },
	{ name: "u_pointLightIntensities", type: "f32", count: 8 }, { name: "u_pointLightRanges", type: "f32", count: 8 }, { name: "u_pointLightDecays", type: "f32", count: 8 },
	{ name: "u_numSpotLights", type: "i32" }, { name: "u_spotLightPositions", type: "vec3", count: 4 }, { name: "u_spotLightDirections", type: "vec3", count: 4 },
	{ name: "u_spotLightColors", type: "vec3", count: 4 }, { name: "u_spotLightIntensities", type: "f32", count: 4 }, { name: "u_spotLightRanges", type: "f32", count: 4 },
	{ name: "u_spotLightAngles", type: "f32", count: 4 }, { name: "u_spotLightPenumbras", type: "f32", count: 4 },
	{ name: "u_hasShadowMap", type: "i32" }, { name: "u_shadowDebug", type: "i32" }, { name: "u_shadowBias", type: "f32" },
	{ name: "u_shadowNormalBias", type: "f32" }, { name: "u_shadowTexel", type: "vec2" }, { name: "u_shadowNormalOffset", type: "f32" },
	// The directional map's cascades (one: the whole map): each one's matrix and tile, where its slice starts and ends, the blend
	{ name: "u_shadowCascadeCount", type: "i32" }, { name: "u_shadowCascadeMatrices", type: "mat4", count: IGE_MAX_SHADOW_CASCADES },
	{ name: "u_shadowCascadeTiles", type: "vec4", count: IGE_MAX_SHADOW_CASCADES }, { name: "u_shadowCascadeSplits", type: "vec4" },
	{ name: "u_shadowCascadeStarts", type: "vec4" }, { name: "u_shadowCascadeBlend", type: "f32" }, { name: "u_shadowFadeEnd", type: "f32" },
	{ name: "u_numShadowPointLights", type: "i32" }, { name: "u_pointShadowFarPlane", type: "f32", count: 2 }, { name: "u_pointShadowBias", type: "f32", count: 2 },
	{ name: "u_pointShadowFaceSize", type: "f32", count: 2 }, { name: "u_pointShadowMatrices", type: "mat4", count: 12 }, { name: "u_pointShadowLightIndex", type: "i32", count: 2 },
	{ name: "u_usePBR", type: "i32" }, { name: "u_ambientOcclusion", type: "f32" },
	{ name: "u_fogMode", type: "i32" }, { name: "u_fogColor", type: "vec3" }, { name: "u_fogNear", type: "f32" }, { name: "u_fogFar", type: "f32" }, { name: "u_fogDensity", type: "f32" }
];
const LIT_ITEM_UNIFORMS: IgeGpuUniform[] = [
	{ name: "u_hasVertexColors", type: "i32" }, { name: "u_uvTransform", type: "vec4" }, { name: "u_worldMatrix", type: "mat4" }, { name: "u_baseColor", type: "vec4" },
	{ name: "u_opacity", type: "f32" }, { name: "u_metallic", type: "f32" }, { name: "u_roughness", type: "f32" }, { name: "u_emissiveColor", type: "vec3" },
	{ name: "u_emissiveIntensity", type: "f32" }, { name: "u_useSkinning", type: "i32" },
	// The item's maps: which it has (see _setLitMaps), how strongly they act
	{ name: "u_hasNormalMap", type: "i32" }, { name: "u_hasMetallicRoughnessTexture", type: "i32" }, { name: "u_hasAoTexture", type: "i32" },
	{ name: "u_normalScale", type: "f32" }, { name: "u_aoStrength", type: "f32" },
	// Cross-fading between levels of detail (the lit_fade program only; see IgeObject._lodFade)
	{ name: "u_lodFade", type: "f32" },
	// The phase effect (the lit_phase and skinned_phase programs only; see IgePhase.ts)
	{ name: "u_phase", type: "vec4" }, { name: "u_phaseEdge", type: "vec4" }, { name: "u_phaseBody", type: "vec4" }, { name: "u_phaseRipple", type: "vec4" }
];

/** A lit program's whole block: the view's, the bone palette's size (skinned, instanced), an item's, its bones (skinned, not instanced). */
function litUniforms (skinned: boolean, instanced: boolean): IgeGpuUniform[] {
	return [
		...LIT_VIEW_UNIFORMS,
		...(skinned && instanced ? [{ name: "u_boneTextureSize", type: "vec2" as const }] : []),
		...LIT_ITEM_UNIFORMS,
		...(skinned && !instanced ? [{ name: "u_boneMatrices[0]", type: "mat4" as const, count: MAX_BONES }] : [])
	];
}

/** The lit programs' texture slots: base colour, the directional shadow map, two point light atlases, the bone palette, emissive, normal, metallic-roughness, occlusion. */
const LIT_TEXTURES = ["u_baseColorTexture", "u_shadowMap", "u_pointShadowAtlas[0]", "u_pointShadowAtlas[1]", "u_boneTexture", "u_emissiveTexture", "u_normalTexture", "u_metallicRoughnessTexture", "u_aoTexture"].map((name) => ({ name }));

/** The sprite program's block: the view's, then a sprite's. */
const SPRITE_UNIFORMS: IgeGpuUniform[] = [
	{ name: "u_viewMatrix", type: "mat4" }, { name: "u_projectionMatrix", type: "mat4" }, { name: "u_flipY", type: "f32" },
	{ name: "u_uvBounds", type: "vec4" }, { name: "u_tint", type: "vec4" }, { name: "u_worldMatrix", type: "mat4" }, { name: "u_scale", type: "vec2" },
	{ name: "u_opacity", type: "f32" }, { name: "u_billboardMode", type: "i32" }
];

const LINE_LAYOUT: IgeGpuVertexBufferLayout = { arrayStride: 28, attributes: [{ shaderLocation: 0, format: "float32x3", offset: 0 }, { shaderLocation: 3, format: "float32x4", offset: 12 }] };

/**
 * How the main pass draws a lit mesh: opaque (depth tested less-or-equal and written, blended over; its back faces
 * culled, or not), transparent (not written), flat (an outline's mask: no depth test, no blending), or a silhouette's
 * two halves (its own pixels marked in the stencil, invisibly; then drawn where something's in front, off the mark).
 */
const enum LitState { Opaque, OpaqueCulled, Transparent, Flat, MarkOccluded, Occluded, DepthOnly }

const NORMAL_BLEND: IgeGpuBlendState = { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" } };

function litState (state: LitState): Pick<IgeGpuRenderPipelineDesc, "blend" | "depth" | "stencil" | "writeColor" | "primitive"> {
	switch (state) {
		case LitState.Opaque: return { blend: NORMAL_BLEND, depth: { compare: "less-equal", write: true } };
		case LitState.OpaqueCulled: return { blend: NORMAL_BLEND, depth: { compare: "less-equal", write: true }, primitive: { cullMode: "back" } };
		case LitState.Transparent: return { blend: NORMAL_BLEND, depth: { compare: "less-equal", write: false } };
		case LitState.Flat: return {};
		case LitState.DepthOnly: return { writeColor: false, depth: { compare: "less-equal", write: true } };
		case LitState.MarkOccluded: return {
			blend: NORMAL_BLEND, writeColor: false, depth: { compare: "less-equal", write: false, bias: { constant: -4, slopeScale: -1 } },
			stencil: { compare: "always", passOp: "replace" }
		};
		case LitState.Occluded: return { blend: NORMAL_BLEND, depth: { compare: "greater", write: false }, stencil: { compare: "not-equal" } };
	}
}

const IDENTITY_MATRIX = new Float32Array([
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
]);

/**
 * Distance fog settings for IgeWebGlRenderer.fog().
 */
export interface IgeWebGlFogSettings {
	mode: "none" | "linear" | "exp2";
	color: { r: number; g: number; b: number };
	/** Linear fog: distance where fog starts. */
	near: number;
	/** Linear fog: distance where fog is fully opaque. */
	far: number;
	/** Exponential fog density (exp2 mode). */
	density: number;
}

/**
 * Per-frame rendering statistics (see IgeWebGlRenderer.stats()).
 */
export interface IgeWebGlRenderStats {
	/** Non-instanced draw calls in the main passes. */
	drawCalls: number;
	/** Instanced draw calls (main and shadow passes). */
	instancedDrawCalls: number;
	/** Meshes drawn through instanced calls. */
	instances: number;
	/** Draw calls issued by shadow passes (instanced calls count once). */
	shadowDrawCalls: number;
	/** Renderable meshes and sprites collected this frame. */
	items: number;
	/** Items that survived camera culling, summed over viewports. */
	visibleItems: number;
	/** Visible items drawn at a lower level of detail, summed over viewports. */
	lodItems: number;
	/** Model triangles submitted by every pass (main, transparent and shadow). */
	triangles: number;
	/** Times the cached static shadow casters were redrawn (see shadowCaching()). */
	shadowCacheRebuilds: number;
	/** Shadow draw calls for the casters drawn over the cached static map (moving, skinned or flagged dynamic). */
	dynamicShadowDraws: number;
	/** Times the cached static map was copied into the live shadow map. */
	shadowCacheCopies: number;
	/**
	 * Shadow casters left out of the directional shadow pass because their shadow can't land in the view, or in a
	 * cascade's slice of it (see shadowCasterCulling(); counted once for each cascade that leaves one out).
	 */
	shadowCastersCulled: number;
	/** Directional shadow cascades drawn this frame, summed over views (one each when the map isn't split; see shadowCascades()). */
	shadowCascades: number;
	/**
	 * Entities culled with everything under them this frame (IgeEntity.cullSubtree()): outside every view, as was the
	 * shadow they could cast into one, so nothing under them was walked or drawn.
	 */
	subtreesCulled: number;
	viewports: number;
	/**
	 * The GPU's time for a recent frame, ms: a timer query round all of a frame's drawing (shadow maps, views,
	 * post-processing, outlines, the UI layer, panels and overlays), a frame or two behind. Null where the browser has
	 * no timer query (EXT_disjoint_timer_query_webgl2), before the first result, or with gpuTiming(false).
	 */
	gpuMs: number | null;
	/** The GPU memory the renderer holds now, bytes by kind (see gpuMemory()). */
	gpuMemory: IgeWebGlGpuMemory;
	/** Meshes uploaded to the GPU this frame (see uploadBudget()). */
	uploads: number;
	/** Bytes of vertex and index buffers uploaded this frame. */
	uploadBytes: number;
	/** Milliseconds spent packing and uploading meshes this frame. */
	uploadMs: number;
	/** Meshes waiting for their turn to upload (uploadBudget()); their entities aren't drawn meanwhile. */
	uploadsQueued: number;
}

/**
 * The GPU memory a renderer holds, in bytes: counted from what it made (each buffer's and texture's size and format),
 * not asked of the driver, which adds its own padding and copies.
 */
export interface IgeWebGlGpuMemory extends IgeGpuMemory {
	/** The canvas's drawing buffer: colour, depth and stencil, its antialiasing samples and the picture shown. An estimate. */
	canvas: number;
	/** All of the above (geometry, textures, renderTargets, shadowMaps, buffers and canvas). */
	total: number;
	/**
	 * `textures` split by what they hold: colour maps (base colour and emissive maps, sprites, particles, decals,
	 * smart textures, UI pictures; both copies of one kept sRGB-encoded under linear lighting), normal maps, and the rest
	 * (metallic-roughness and occlusion maps, the UI's glyph pages, the renderer's own small textures). Parts of
	 * `textures`, so not added to `total` again.
	 */
	colorMaps: number;
	normalMaps: number;
	otherMaps: number;
}

/**
 * Render items collected for one scene in the current frame.
 */
interface IgeWebGlSceneFrameData {
	frameId: number;
	models: IgeWebGlRenderItem[];
	sprites: IgeEntity[];
	particles: IgeParticleSystem3d[];
	decals: IgeDecalSystem3d[];
	/** UI layer elements (IgeEntity.uiLayer()) and the settings each is drawn with (its own, or its UI ancestor's). */
	ui: IgeEntity[];
	uiSettings: IgeUiSettings[];
	/** The lowest and highest points of the opaque meshes' bounds (world y): what can take a shadow (shadowFit()'s "auto" band). */
	minY: number;
	maxY: number;
	/**
	 * Entities culled with everything under them (IgeEntity.cullSubtree()) whose box is known, reached by the walk and
	 * left until every view's camera is known (after the walk, so the preTick behaviours have moved things): then
	 * each is drawn (walked) or left out (_finishScenes()).
	 */
	deferred: IgeEntity[];
}

/** One view of a scene, for culling subtrees (IgeEntity.cullSubtree()): its frustum, and where its shadows come from. */
interface IgeSubtreeView {
	frustum: IgeFrustum;
	/** It draws directional shadows. */
	shadow: boolean;
	/** The shadow can be followed down the light to the lowest surface that takes one (the light comes from above). */
	sweep: boolean;
	/** The way the light travels (unit). */
	lx: number;
	ly: number;
	lz: number;
	/** Room left round a caster's shadow for the map's texels and filtering (world units). */
	margin: number;
}

/** Anything that supplies packed per-instance data (particles, decals). */
interface IgeWebGlInstanceSource {
	renderData (): { data: Float32Array; count: number };
	_renderVersion: number;
}

/** Floats per particle in IgeParticleSystem3d.renderData(). */
const PARTICLE_FLOATS = 8;


/** Fraction of the shadow frustum's half-size the cached frustum re-centres by. */
const SHADOW_RECENTER_STEP = 0.125;

/** Fraction of the shadow frustum's size added to a caster's radius when testing whether its shadow can land in view (covers the shadow filter's blur and the camera moving between collect and draw). */
const SHADOW_CULL_MARGIN = 0.02;

/**
 * With cascades, a caster smaller than this many of a cascade's texels across is left out of it (its shadow would be
 * under a texel: the filter loses it anyway).
 */
const SHADOW_MIN_TEXELS = 1;

/**
 * Cascades are used while the nearest slice's box is under this share of the whole view's (across the light): it
 * then gets finer texels in its half-size tile than the whole map would. A view looking down on the ground (a
 * top-down camera) has slices as wide as the view, and keeps the whole map. Used with hysteresis (on below the
 * first, off above the second) so it doesn't flip each frame.
 */
const SHADOW_CASCADE_ON = 0.4;
const SHADOW_CASCADE_OFF = 0.5;

/** A view's fitted shadow boxes (shadowFit()): one per cascade, then the whole map's; and whether it's split. */
interface IgeShadowViewFit {
	boxes: IgeShadowFitBox[];
	cascaded: boolean;
}

let nextRenderUid = 1;

type IgeLocalBox = { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };

/** Local-space bounding boxes for pointer picking (cached per geometry and model). */
const geometryBoxCache: WeakMap<IgeGeometryData3d, IgeLocalBox> = new WeakMap();
const partsBoxCache: WeakMap<object, IgeLocalBox> = new WeakMap();
/** Models' boxes for culling subtrees (every part, none skinned; see IgeEntity.cullSubtree()). */
const subtreePartsBoxCache: WeakMap<object, IgeLocalBox> = new WeakMap();

function geometryBox (data: IgeGeometryData3d): IgeLocalBox | null {
	let box = geometryBoxCache.get(data);
	if (box) return box;
	if (data.boundingBox) {
		const [minX, minY, minZ] = data.boundingBox.min;
		const [maxX, maxY, maxZ] = data.boundingBox.max;
		box = { minX, minY, minZ, maxX, maxY, maxZ };
	} else {
		const v = data.vertices;
		if (!v || v.length < 3) return null;
		box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
		for (let i = 0; i < v.length; i += 3) {
			if (v[i] < box.minX) box.minX = v[i];
			if (v[i + 1] < box.minY) box.minY = v[i + 1];
			if (v[i + 2] < box.minZ) box.minZ = v[i + 2];
			if (v[i] > box.maxX) box.maxX = v[i];
			if (v[i + 1] > box.maxY) box.maxY = v[i + 1];
			if (v[i + 2] > box.maxZ) box.maxZ = v[i + 2];
		}
	}
	geometryBoxCache.set(data, box);
	return box;
}

/**
 * Union of a model's non-skinned part boxes in model space (part node
 * transforms applied). Skinned parts are left out: their vertices are in
 * bind space, not model space (see skeletonBox()).
 */
function partsBox (parts: IgeModelPart[]): IgeLocalBox | null {
	let box = partsBoxCache.get(parts);
	if (box) return box;
	box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
	for (const part of parts) {
		if (part.skinned) continue;
		const b = geometryBox(part.geometryData);
		if (!b) continue;
		const m = part.matrix;
		for (let c = 0; c < 8; c++) {
			const x = c & 1 ? b.maxX : b.minX, y = c & 2 ? b.maxY : b.minY, z = c & 4 ? b.maxZ : b.minZ;
			const wx = m ? m[0] * x + m[4] * y + m[8] * z + m[12] : x;
			const wy = m ? m[1] * x + m[5] * y + m[9] * z + m[13] : y;
			const wz = m ? m[2] * x + m[6] * y + m[10] * z + m[14] : z;
			if (wx < box.minX) box.minX = wx;
			if (wy < box.minY) box.minY = wy;
			if (wz < box.minZ) box.minZ = wz;
			if (wx > box.maxX) box.maxX = wx;
			if (wy > box.maxY) box.maxY = wy;
			if (wz > box.maxZ) box.maxZ = wz;
		}
	}
	if (box.minX > box.maxX) box = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
	partsBoxCache.set(parts, box);
	return box;
}

/**
 * Model-space box around a skeleton's joints in their current pose,
 * padded by a tenth of its size to cover the body around the bones.
 */
function skeletonBox (worldMatrices: Float32Array, boneCount: number): IgeLocalBox | null {
	if (!boneCount) return null;
	const box = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
	for (let b = 0; b < boneCount; b++) {
		const x = worldMatrices[b * 16 + 12], y = worldMatrices[b * 16 + 13], z = worldMatrices[b * 16 + 14];
		if (x < box.minX) box.minX = x;
		if (y < box.minY) box.minY = y;
		if (z < box.minZ) box.minZ = z;
		if (x > box.maxX) box.maxX = x;
		if (y > box.maxY) box.maxY = y;
		if (z > box.maxZ) box.maxZ = z;
	}
	const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ) * 0.1;
	box.minX -= pad; box.minY -= pad; box.minZ -= pad;
	box.maxX += pad; box.maxY += pad; box.maxZ += pad;
	return box;
}

/** Floats per debug line vertex: x, y, z, r, g, b, a. */
const DEBUG_LINE_FLOATS = 7;

/** Bounding sphere colours by level of detail (debugDraw({ bounds: true })). */
const DEBUG_LOD_COLORS: [number, number, number][] = [
	[0.25, 1, 0.3], // full detail
	[1, 0.85, 0.1],
	[1, 0.5, 0.1],
	[1, 0.15, 0.15]
];
const DEBUG_NO_LOD_COLOR: [number, number, number] = [0.4, 0.65, 1];
/** Shadow cascades' boxes (debugDraw({ shadowFrustum: true })), nearest first; the shader's debug mode 5 uses the same. */
const DEBUG_CASCADE_COLORS: [number, number, number][] = [[1, 0.25, 0.25], [0.25, 1, 0.25], [0.3, 0.45, 1], [1, 0.9, 0.2]];

const hexColorCache: Map<string, [number, number, number]> = new Map();

/**
 * Parse a "#rrggbb" colour into 0..1 components (cached).
 */
function parseHexColor (color: string): [number, number, number] {
	let rgb = hexColorCache.get(color);
	if (!rgb) {
		const hex = color.replace("#", "");
		rgb = [
			parseInt(hex.substring(0, 2), 16) / 255,
			parseInt(hex.substring(2, 4), 16) / 255,
			parseInt(hex.substring(4, 6), 16) / 255
		];
		hexColorCache.set(color, rgb);
	}
	return rgb;
}

const linearHexColorCache: Map<string, [number, number, number]> = new Map();

/** A "#rrggbb" colour as linear light (cached): an sRGB hex colour under linear lighting. */
function parseHexColorLinear (color: string): [number, number, number] {
	let rgb = linearHexColorCache.get(color);
	if (!rgb) {
		const [r, g, b] = parseHexColor(color);
		rgb = [igeSrgbToLinear(r), igeSrgbToLinear(g), igeSrgbToLinear(b)];
		linearHexColorCache.set(color, rgb);
	}
	return rgb;
}

/**
 * out = a * b for column-major 4x4 matrices (out must not alias a or b).
 */
function multiplyMat4Into (out: Float32Array, a: Float32Array, b: Float32Array): void {
	for (let col = 0; col < 4; col++) {
		const b0 = b[col * 4], b1 = b[col * 4 + 1], b2 = b[col * 4 + 2], b3 = b[col * 4 + 3];
		out[col * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
		out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
		out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
		out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
	}
}

function sortItemsFrontToBack (a: IgeWebGlRenderItem, b: IgeWebGlRenderItem): number {
	return a.sortKey - b.sortKey;
}

function sortBatchesFrontToBack (a: IgeWebGlItemBatch, b: IgeWebGlItemBatch): number {
	return a.items[0].sortKey - b.items[0].sortKey;
}

function sortItemsBackToFront (a: IgeWebGlRenderItem, b: IgeWebGlRenderItem): number {
	return b.sortKey - a.sortKey;
}

function sortSpritesBackToFront (a: IgeEntity, b: IgeEntity): number {
	return (b as any)._webglSortKey - (a as any)._webglSortKey;
}

/** Drawn over the whole canvas after the UI layer (IgeWebGlRenderer.addOverlay). */
export interface IgeWebGlOverlay {
	/** Draws (canvas width x height in device px, dpr device px per CSS px); returns its draw calls. */
	draw(gl: WebGL2RenderingContext, width: number, height: number, dpr: number): number;
	/** A lost context came back: make GPU resources again. */
	contextRestored?(gl: WebGL2RenderingContext): void;
}

/**
 * Custom WebGL renderer for IGE supporting full 3D rendering.
 * This renderer replaces the experimental three.js integration with
 * a purpose-built WebGL system for maximum control and performance.
 */
export class IgeWebGlRenderer extends IgeBaseRenderer {
	classId = "IgeWebGlRenderer";

	protected _canvasContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
	protected _webglVersion: 1 | 2 = 2;
	protected _contextLost: boolean = false;
	/**
	 * The GPU device everything moves onto, a pass at a time (guides/gpu-device.md): the shadow passes draw through it,
	 * the rest still with GL of its own. Its meshes' programs and pipelines, and the instance data its passes stream.
	 */
	protected _device?: IgeWebGl2GpuDevice;
	protected _gpuPrograms?: IgeGpuMeshPrograms;
	protected _gpuInstances?: IgeGpuBuffer;
	protected _gpuInstanceData: Float32Array = new Float32Array(INSTANCE_FLOATS * 256);
	/** The depth passes' uniform blocks (each pipeline's members, set as one array), by how they're laid out. */
	protected _depthBlocks: Float32Array[] = [];

	// Background clear colour (defaults to opaque black to preserve prior behaviour).
	protected _clearColor = { r: 0, g: 0, b: 0, a: 1 };

	// WebGL capabilities and extensions
	protected _capabilities = {
		maxTextureSize: 0,
		maxVertexAttribs: 0,
		maxVaryingVectors: 0,
		maxVertexTextureImageUnits: 0,
		maxTextureImageUnits: 0,
		maxCombinedTextureImageUnits: 0,
		maxVertexUniformVectors: 0,
		maxFragmentUniformVectors: 0,
		supportsInstancedArrays: false,
		supportsVertexArrayObjects: false,
		supportsDepthTexture: false,
		supportsFloatTextures: false
	};

	// Manager instances
	protected _resourceManager?: IgeWebGlResourceManager;
	protected _shaderManager?: IgeWebGlShaderManager;
	protected _textureManager?: IgeWebGlTextureManager;
	protected _geometryManager?: IgeWebGlGeometryManager;
	protected _cameraController?: IgeWebGlCameraController;
	protected _stateManager?: IgeWebGlStateManager;
	protected _lightManager?: IgeWebGlLightManager;
	protected _shadowManager?: IgeWebGlShadowManager;
	protected _skeletonManager?: IgeWebGlSkeletonManager;

	// Shadow-casting directional light reference
	protected _shadowCastingLight?: IgeDirectionalLight;
	protected _shadowLightId: string = "mainDirectionalLight";

	// Shadow debug mode (0 = off, 1-4 = different visualizations)
	protected _shadowDebugMode: number = 0;

	// Point lights that cast shadows
	protected _shadowCastingPointLights: IgePointLight[] = [];

	// Frame-level render state (reused every frame to avoid allocations)
	protected _frameId: number = 0;
	protected _itemPool: IgeWebGlRenderItem[] = [];
	protected _itemCount: number = 0;
	protected _sceneData: WeakMap<IgeObject, IgeWebGlSceneFrameData> = new WeakMap();
	/** The UI layer: each viewport's camera as of its last view drawn, the quads being drawn, and the pass that draws them. */
	protected _uiViews: WeakMap<IgeViewport, IgeUiView & { frameId: number }> = new WeakMap();
	protected _uiQuads: IgeUiQuad[] = [];
	protected _uiPass?: IgeWebGlUiPass;
	protected _skeletonRows: Map<IgeSkeleton, number> = new Map();
	protected _mainBatcher: IgeWebGlItemBatcher = new IgeWebGlItemBatcher();
	protected _depthBatcher: IgeWebGlItemBatcher = new IgeWebGlItemBatcher();
	protected _transparentItems: IgeWebGlRenderItem[] = [];
	/** This view's items with a silhouette colour (see IgeEntity.occludedColor()). */
	protected _occludedItems: IgeWebGlRenderItem[] = [];
	/** Each view's outlined items this frame (see IgeEntity.outline()), drawn after the post-processing. */
	protected _outlineJobs: { items: IgeWebGlRenderItem[]; matrices: IgeCameraMatrices; view: IgeOutlineRect }[] = [];
	protected _outlinePass?: IgeWebGlOutlinePass;
	/** Lenses by id (see lens()), and the pass that draws them over a finished view. */
	protected _lenses = new Map<string, IgeLens>();
	protected _lensPass?: IgeLensPass;
	protected _lensDraws: IgeLensDraw[] = [];
	protected _outlineSpheres = new Float32Array(64);
	protected _occludedSaved?: Float32Array;
	/** Drawing occluded silhouettes (flat colour): emissive maps aren't used. */
	protected _drawingSilhouettes = false;
	protected _opaqueSprites: IgeEntity[] = [];
	protected _opaqueSpriteTextures: (WebGLTexture | null)[] = [];
	protected _transparentSpriteTextures: (WebGLTexture | null)[] = [];
	protected _transparentSprites: IgeEntity[] = [];
	protected _maxPixelRatio: number = Infinity;
	protected _shadowShareThreshold: number = 0.35;
	protected _sharedShadowFrame: number = -1;
	protected _pendingBlobTextures: Set<string> = new Set();
	/**
	 * Each particle and decal system's instances (the render version and instance count uploaded: what's drawn), and
	 * each decal system's projected triangles, on the device.
	 */
	protected _particleBuffers: Map<IgeWebGlInstanceSource, { buffer: IgeGpuBuffer; version: number; count: number; lastFrame: number }> = new Map();
	protected _decalMeshBuffers: Map<IgeDecalSystem3d, { buffer: IgeGpuBuffer; version: number; lastFrame: number }> = new Map();
	/** The view being drawn, in device px from the canvas's bottom-left, and whether it's scissored to it (the effect passes draw into it). */
	protected _view = { x: 0, y: 0, w: 0, h: 0, clip: false };
	protected _effectBlock?: Float32Array;
	/** The lit programs' uniform blocks, by kind (skinned, instanced): the view's part filled as each view starts. */
	protected _litBlocks: { data: Float32Array; at: Record<string, number>; itemFrom: number }[] = [];
	/** The view's textures for the lit programs: the shadow map, the point light atlases, the bone palette. */
	protected _litViewTextures: (IgeGpuTexture | null)[] = [null, null, null, null];
	protected _spriteBlock = igeGpuUniformLayout(SPRITE_UNIFORMS);
	protected _spriteData = new Float32Array(this._spriteBlock.size);
	protected _lineBuffer?: IgeGpuBuffer;
	protected _lineData = new Float32Array(33);
	/** Passed to entity preTick behaviours, which expect a Canvas 2D context. */
	protected _tickContext = new IgeDummyContext();
	/** The frame's main viewports (for culling subtrees: which views show a scene). */
	protected _frameViews: IgeViewport[] = [];
	/** Scenes walked since their deferred subtrees were last decided (see _finishScenes()). */
	protected _collectedScenes: IgeObject[] = [];
	/** The views of the scene whose deferred subtrees are being decided; null while scenes are walked. */
	protected _subtreeViews: IgeSubtreeView[] | null = null;
	protected _subtreeViewPool: IgeSubtreeView[] = [];
	/** The lowest surface that takes a shadow in the scene being decided (the fit's band), for following shadows down. */
	protected _subtreeFloor = -Infinity;
	/** Shadow-casting point lights that can reach the scene being decided: x, y, z and reach, four numbers each. */
	protected _subtreePoints: number[] = [];
	protected _subtreePath: IgeObject[] = [];
	protected _subtreeCentre = { x: 0, y: 0, z: 0 };
	protected _subtreeHeights = { min: 0, max: 0 };
	protected _defaultParticleTexture: IgeGpuTexture | null = null;
	protected _defaultDecalTexture: IgeGpuTexture | null = null;
	protected _lightFrustum: IgeFrustum = new IgeFrustum();
	protected _shadowCasterCulling: boolean = true;
	// Point light shadow casters in range of the current light, with the
	// LOD key and geometry chosen for it (reused across lights and frames)
	protected _pointCasterItems: IgeWebGlRenderItem[] = [];
	protected _pointCasterKeys: string[] = [];
	protected _pointCasterGeometries: IgeWebGlGeometry[] = [];
	protected _lightFrustumMatrix: IgeMatrix4 = new IgeMatrix4();

	// GPU instancing (WebGL 2 only)
	protected _instancingEnabled: boolean = true;
	protected _minInstanceCount: number = 2;
	protected _instanceBuffer?: IgeWebGlInstanceBuffer;
	protected _bonePalette?: IgeWebGlBonePalette;

	/** Full-screen post-processing (WebGL 2), created when first enabled. */
	protected _postProcess: IgeWebGlPostProcess | null = null;
	protected _postSettings: IgePostProcessSettings = { ...IGE_POST_PROCESS_DEFAULTS };
	/** The fixed render scale (used while dynamic resolution is off), and the controller that picks it while it's on. */
	protected _fixedScale = 1;
	protected _dynamicRes = new IgeDynamicResolution();
	protected _gpuTimer: IgeGpuFrameTimer | null = null;
	/** Times what's drawn after the scene (outlines, UI layer, panels, overlays), so stats().gpuMs is the whole frame. */
	protected _gpuTimerTail: IgeGpuFrameTimer | null = null;
	/** Timer queries round each frame for stats().gpuMs (see gpuTiming()). */
	protected _gpuTiming = true;
	protected _rafHandle = 0;
	/** The scale this frame's scene is drawn at (1 when it isn't drawn offscreen). */
	protected _frameScale = 1;
	protected _fog: IgeWebGlFogSettings = {
		mode: "none",
		color: { r: 0, g: 0, b: 0 },
		near: 500,
		far: 2000,
		density: 0.001
	};

	protected _stats: Omit<IgeWebGlRenderStats, "gpuMemory"> = {
		gpuMs: null,
		drawCalls: 0,
		instancedDrawCalls: 0,
		instances: 0,
		shadowDrawCalls: 0,
		items: 0,
		visibleItems: 0,
		lodItems: 0,
		triangles: 0,
		shadowCacheRebuilds: 0,
		dynamicShadowDraws: 0,
		shadowCacheCopies: 0,
		shadowCastersCulled: 0,
		shadowCascades: 0,
		subtreesCulled: 0,
		viewports: 0,
		uploads: 0,
		uploadBytes: 0,
		uploadMs: 0,
		uploadsQueued: 0
	};

	/** Meshes uploaded within a per-frame budget (see uploadBudget()); unlimited by default. Made as first needed. */
	protected _uploads?: IgeGeometryUploadQueue<IgeGeometryData3d>;
	/** Who's waiting for a mesh to reach the GPU (uploadGeometry()), by its id. */
	protected _uploadWaiters?: Map<string, ((uploaded: boolean) => void)[]>;
	/** The mesh each plain-geometry entity last drew: drawn meanwhile when its new one is waiting to upload. */
	protected _drawnGeometry?: WeakMap<IgeEntity, IgeGeometryData3d>;
	/** Generate mipmaps for model (glTF) textures whose sampler doesn't ask for them (see modelTextureMipmaps()). */
	protected _modelTextureMipmaps = false;
	/** Scratch for a draw's world matrix with its mesh's position decode applied. */
	protected _decodedWorld?: Float32Array;

	// Multiplies every on-screen size used to pick a level of detail
	protected _lodBias: number = 1;

	// Cull back faces of opaque meshes (off by default, see backFaceCulling())
	protected _backFaceCulling: boolean = false;

	// The directional shadow map fitted to each view (on by default, see shadowFit()) and split into cascades (see
	// shadowCascades()): the settings, each view's boxes (and the shared map's), the corners of what the views see
	// (all of it, and a slice), the slices' ends
	protected _shadowFit: IgeShadowFitSettings = { ...IGE_SHADOW_FIT_DEFAULTS };
	protected _shadowCascades: IgeShadowCascadeSettings = { ...IGE_SHADOW_CASCADE_DEFAULTS };
	protected _shadowViewFits: WeakMap<object, IgeShadowViewFit> = new WeakMap();
	protected _shadowFitShared: object = {};
	protected _shadowFitPoints: number[] = [];
	protected _shadowSlicePoints: number[] = [];
	protected _shadowSplits: number[] = [];
	protected _shadowSlices: IgeShadowCascadeSlice[] = [];
	protected _shadowBandMin = -Infinity;
	protected _shadowBandMax = Infinity;
	protected _shadowFitOptions = { slack: 0.15, follow: true };
	// The directional pass's per-cascade culling and batching: the light's box, the view's slice, the batchers,
	// the static casters' checksums
	protected _cascadeLightFrusta: IgeFrustum[] = [];
	protected _cascadeViewFrusta: IgeFrustum[] = [];
	protected _cascadeBatchers: IgeWebGlItemBatcher[] = [];
	protected _cascadeStaticBatchers: IgeWebGlItemBatcher[] = [];
	protected _cascadeSignatures: IgeShadowSignature[] = [];
	/** The light matrix the depth batches being drawn use (a cascade's). */
	protected _depthMatrix: Float32Array = new Float32Array(16);
	/** Per cascade: shadow texels per world unit; and the light's direction, depth span and margin for culling (5 each). */
	protected _cascadeTexels = new Float32Array(IGE_MAX_SHADOW_CASCADES);
	protected _cascadeSweep = new Float32Array(IGE_MAX_SHADOW_CASCADES * 5);
	protected _depthShared = (block: Float32Array, at: Readonly<Record<string, number>>) => {
		block.set(this._depthMatrix, at.u_lightSpaceMatrix);
	};

	// Cached static shadow casters (off by default, see shadowCaching())
	protected _shadowCaching: boolean = false;
	protected _shadowMapHoldsCache: boolean = false;
	protected _directionalPassesThisFrame: number = 0;
	protected _directionalPassesLastFrame: number = 0;

	// When true, the WebGL drawing buffer is preserved after compositing,
	// allowing gl.readPixels() to work after a frame is rendered.
	// Must be set before createFrontBuffer() is called.
	protected _preserveDrawingBuffer: boolean = false;

	// Debug drawing (see debugDraw() and debugLine())
	protected _debugOptions = { bounds: false, shadowFrustum: false };
	protected _debugLineData: Float32Array = new Float32Array(DEBUG_LINE_FLOATS * 2048);
	protected _debugLineVertices: number = 0;
	/** The lines queued with debugLine() (a view's bounds and frustum are added after them, and dropped after it). */
	protected _debugLinesQueued: number = 0;
	protected _debugLineBuffer: WebGLBuffer | null = null;

	/**
	 * Initialize the WebGL renderer.
	 */
	async _setup(): Promise<void> {
		await super._setup();

		if (isServer) {
			this.log("WebGL renderer cannot run on server-side", "warning");
			return;
		}

		this.createFrontBuffer();

		if (!this._canvasElement || !this._canvasContext) {
			throw new Error("Failed to create WebGL context");
		}

		// Query and store WebGL capabilities
		this._queryCapabilities();

		// Initialize manager classes
		const gl2 = this._canvasContext as WebGL2RenderingContext;
		const device = this._device = webGl2GpuDevice(gl2);
		this._gpuPrograms = new IgeGpuMeshPrograms(device);
		this._gpuInstances = device.createBuffer({ size: 0, usage: "vertex", stream: true, label: "shadow pass instances" });
		this._resourceManager = new IgeWebGlResourceManager(this._canvasContext, this._webglVersion);
		this._shaderManager = new IgeWebGlShaderManager(this._canvasContext, this._resourceManager);
		this._textureManager = new IgeWebGlTextureManager(this._canvasContext, this._resourceManager);
		this._textureManager.srgbColors(this._linear);
		this._applyAnisotropy();
		this._geometryManager = new IgeWebGlGeometryManager(gl2, this._resourceManager, device);
		this._cameraController = new IgeWebGlCameraController();
		this._stateManager = new IgeWebGlStateManager(this._canvasContext);
		this._lightManager = new IgeWebGlLightManager();
		this._shadowManager = new IgeWebGlShadowManager(device);
		this._skeletonManager = new IgeWebGlSkeletonManager();

		// Instanced rendering (instanced arrays + float textures)
		this._instanceBuffer = new IgeWebGlInstanceBuffer(gl2);
		this._bonePalette = new IgeWebGlBonePalette(device);

		// Compile built-in shaders
		this._compileBuiltInShaders();

		this.isReady(true);
		this.log("WebGL renderer initialized successfully");
	}

	/**
	 * Creates a WebGL canvas front buffer.
	 */
	createFrontBuffer(autoSize: boolean = true, dontScale: boolean = false): void {
		if (!isClient) {
			return;
		}

		if (this._canvasElement) {
			return;
		}

		this._createdFrontBuffer = true;
		this._pixelRatioScaling = !dontScale;

		// Create a new canvas element
		const tempCanvas = document.createElement("canvas");
		tempCanvas.id = "igeFrontBuffer";
		// (One of the engine's own on the page: a game watching the page tells it from its own by data-ige)
		tempCanvas.setAttribute("data-ige", "front-buffer");

		this.canvasElement(tempCanvas, autoSize);
		document.body.appendChild(tempCanvas);
	}

	/**
	 * Gets / sets the canvas element and creates WebGL context.
	 */
	canvasElement(elem?: HTMLCanvasElement, autoSize: boolean = true): HTMLCanvasElement | undefined {
		if (isServer) return;

		if (elem === undefined) {
			return this._canvasElement;
		}

		this._canvasElement = elem;

		// Try to get WebGL2 context first, fallback to WebGL1
		let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;

		// WebGL2 attributes
		const contextAttributes: WebGLContextAttributes = {
			alpha: true,
			antialias: true,
			depth: true,
			// Silhouettes through walls mask out the entity's own pixels in the stencil
			stencil: true,
			preserveDrawingBuffer: this._preserveDrawingBuffer,
			premultipliedAlpha: true,
			powerPreference: "high-performance"
		};

		// WebGL 2 (WebGL 1 isn't supported: the renderer draws through the GPU device, which needs WebGL 2)
		gl = this._canvasElement.getContext("webgl2", contextAttributes) as WebGL2RenderingContext | null;
		if (!gl) throw new Error("IgeWebGlRenderer needs WebGL 2, which this browser doesn't have (WebGL 1 isn't supported)");
		this._webglVersion = 2;
		this.log("Using WebGL 2.0");

		this._canvasContext = gl;

		// Set up device pixel ratio
		if (this._pixelRatioScaling) {
			this._devicePixelRatio = Math.min(window.devicePixelRatio || 1, this._maxPixelRatio);
		} else {
			this._devicePixelRatio = 1;
		}

		this.log(`Device pixel ratio is ${this._devicePixelRatio}`);
		this._autoSize = autoSize;

		// Set up context loss/restore handling
		this._canvasElement.addEventListener("webglcontextlost", this._handleContextLost, false);
		this._canvasElement.addEventListener("webglcontextrestored", this._handleContextRestored, false);

		// Initial resize
		this._resizeEvent();

		// Set up input listeners
		ige.input.setupListeners(this._canvasElement);

		ige.engine.headless(false);

		return this._canvasElement;
	}

	/**
	 * Compile built-in shaders from the shader library.
	 */
	protected _compileBuiltInShaders(): void {
		if (!this._shaderManager) {
			throw new Error("Shader manager not initialized");
		}

		// Get all built-in shaders
		const shaderIds = IgeShaderLibrary.getAll();

		for (const shaderId of shaderIds) {
			const shaderSource = IgeShaderLibrary.get(shaderId);
			if (shaderSource) {
				const program = this._shaderManager.createProgram(
					shaderId,
					shaderSource.vertex,
					shaderSource.fragment
				);

				if (program) {
					this.log(`Compiled shader program: ${shaderId}`);
				} else {
					this.log(`Failed to compile shader program: ${shaderId}`, "error");
				}
			}
		}
	}

	/**
	 * Query WebGL capabilities and store them.
	 */
	protected _queryCapabilities(): void {
		const gl = this._canvasContext;
		if (!gl) return;

		this._capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		this._capabilities.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
		this._capabilities.maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);
		this._capabilities.maxVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
		this._capabilities.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
		this._capabilities.maxCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
		this._capabilities.maxVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
		this._capabilities.maxFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);

		// WebGL 2: instanced arrays, vertex arrays, depth textures and 32-bit indices are core; float textures are too
		this._capabilities.supportsInstancedArrays = true;
		this._capabilities.supportsVertexArrayObjects = true;
		this._capabilities.supportsDepthTexture = true;
		this._capabilities.supportsFloatTextures = true;

		this.log(`WebGL Capabilities:`);
		this.log(`  Max Texture Size: ${this._capabilities.maxTextureSize}`);
		this.log(`  Max Vertex Attribs: ${this._capabilities.maxVertexAttribs}`);
		this.log(`  Supports Instanced Arrays: ${this._capabilities.supportsInstancedArrays}`);
		this.log(`  Supports VAO: ${this._capabilities.supportsVertexArrayObjects}`);
		this.log(`  Supports Depth Texture: ${this._capabilities.supportsDepthTexture}`);
	}

	/**
	 * Handle canvas resize events.
	 */
	_resizeEvent = (event?: Event): void => {
		if (!this._canvasElement || !this._autoSize) return;
		markSceneChanged();

		// Get the window dimensions
		let newWidth = window.innerWidth;
		let newHeight = window.innerHeight;

		// Update bounds
		this._bounds2d = new IgePoint2d(newWidth, newHeight);

		// Set canvas display size (CSS pixels)
		this._canvasElement.style.width = newWidth + "px";
		this._canvasElement.style.height = newHeight + "px";

		// Set actual canvas size (device pixels)
		this._canvasElement.width = Math.floor(newWidth * this._devicePixelRatio);
		this._canvasElement.height = Math.floor(newHeight * this._devicePixelRatio);

		this._resized = true;

		this.log(`Canvas resized to ${this._canvasElement.width}x${this._canvasElement.height} (device pixels)`);
	};

	/**
	 * Handle WebGL context loss.
	 */
	protected _handleContextLost = (event: Event): void => {
		// (Without preventDefault the browser never gives the context back)
		event.preventDefault();
		this._contextLost = true;
		this._gpuTimer?.contextLost();
		this._gpuTimer = null;
		this._gpuTimerTail?.contextLost();
		this._gpuTimerTail = null;
		this._postProcess?.contextLost();
		this._outlinePass?.contextLost();
		this._outlinePass = undefined;
		this._lensPass?.contextLost();
		this._lensPass = undefined;
		this.log("WebGL context lost!", "warning");
		this.emit("contextLost");
	};

	/**
	 * Handle WebGL context restoration: every GPU resource is made again from
	 * what the CPU still holds, then drawing resumes (the game goes on
	 * without a reload). Emits "contextRestored" with the ids of any meshes
	 * that can't come back (discardGeometryArrays kept only their GPU copy:
	 * the game must rebuild those).
	 */
	protected _handleContextRestored = (): void => {
		this.log("WebGL context restored, reinitializing resources...");
		const lost = this._recreateResources();
		this._contextLost = false;
		if (this._canvasContext && this._webglVersion === 2) for (const o of this._overlays) o.contextRestored?.(this._canvasContext as WebGL2RenderingContext);
		this.emit("contextRestored", { lost });
	};

	/** Whether the WebGL context is lost right now (nothing draws until it's back). */
	contextLost(): boolean {
		return this._contextLost;
	}

	/**
	 * Every GPU resource made again on the restored context: new managers (their
	 * caches held the old context's handles, now dead), the built-in shaders
	 * compiled, the instancing and bone buffers, the renderer's own buffers and
	 * textures forgotten so they're made on first use. Geometry re-uploads from
	 * its arrays, textures from their images and canvases (text labels, smart
	 * textures), shadow maps and post-process targets as they're next needed.
	 * Returns the ids of meshes that kept only their GPU copy (lost for good).
	 */
	protected _recreateResources(): string[] {
		const gl = this._canvasContext;
		if (!gl) return [];
		// The device first (if it hasn't noticed already): what it made is made again as it's next used
		const device = this._device!;
		device.restore();
		// Forget (don't delete) the old handles: deleting them on the new context would be an error
		this._particleBuffers.clear();
		this._decalMeshBuffers.clear();
		this._defaultParticleTexture = null;
		this._defaultDecalTexture = null;
		this._debugLineBuffer = null;
		this._postProcess?.contextLost();
		this._panelTargets?.contextLost();
		this._uiPass = undefined;
		this._outlinePass = undefined;
		this._shadowMapHoldsCache = false;
		// Extensions are per context: asked for again (32-bit indices, instancing, float textures)
		this._queryCapabilities();
		this._resourceManager = new IgeWebGlResourceManager(gl, this._webglVersion);
		this._shaderManager = new IgeWebGlShaderManager(gl, this._resourceManager);
		this._textureManager = new IgeWebGlTextureManager(gl, this._resourceManager);
		this._textureManager.srgbColors(this._linear);
		this._applyAnisotropy();
		// (Model textures asked for on the old context are asked for again as they're next drawn)
		this._pendingBlobTextures.clear();
		this._geometryManager = new IgeWebGlGeometryManager(gl as WebGL2RenderingContext, this._resourceManager, device);
		this._stateManager = new IgeWebGlStateManager(gl);
		// (The shadow manager keeps its lights' settings: its maps are made again at the same sizes)
		this._shadowManager?.contextRestored();
		this._skeletonManager?.cleanup();
		this._skeletonManager = new IgeWebGlSkeletonManager();
		this._instanceBuffer = new IgeWebGlInstanceBuffer(gl as WebGL2RenderingContext);
		this._bonePalette = new IgeWebGlBonePalette(device);
		this._compileBuiltInShaders();
		const lost = [...this._gpuOnlyGeometry];
		return lost;
	}

	/** Meshes whose arrays were discarded (discardGeometryArrays): a lost context can't bring them back. */
	protected _gpuOnlyGeometry: Set<string> = new Set();

	/**
	 * Set the background clear colour used for the canvas and each viewport.
	 * Components are 0..1. Defaults to opaque black.
	 *
	 * Each viewport's area is cleared to this colour (including alpha) before
	 * it is drawn, so split-screen viewports all share the same background.
	 */
	setClearColor(r: number, g: number, b: number, a: number = 1): this {
		this._clearColor = { r, g, b, a };
		return this;
	}

	/**
	 * Gets / sets physically based lighting for lit materials: metallic and
	 * roughness then shape the light (metal sheen, glossy highlights, rough
	 * matte surfaces). Off by default (the simple diffuse model every game
	 * has used so far); a game opts in. Lights keep the same intensities: a
	 * rough non-metal looks as bright either way.
	 * @example #Turn on physically based lighting
	 *     renderer.pbr(true);
	 */
	pbr(): boolean;
	pbr(enabled: boolean): this;
	pbr(enabled?: boolean): boolean | this {
		if (enabled === undefined) return this._pbr;
		this._pbr = enabled;
		return this;
	}

	protected _pbr = false;

	/**
	 * Gets / sets linear lighting (off by default; a game opts in). With it on, colours are lit as light really adds
	 * up: colour textures (base colour and emissive maps, particles, decals) are stored sRGB and decoded to linear
	 * light by the GPU as they're sampled (filtered and mipmapped in linear light), the colours a game gives (material
	 * colours, light colours, the hemisphere ambient, fog, the clear colour, vertex colours, particle and decal
	 * colours, silhouettes) are converted to linear light once where they come in, the lighting is done in linear
	 * light, and the result is encoded to sRGB once at the end: in the post-processing's composite after tone mapping,
	 * or at the end of each shader drawing straight to the screen. Normal, metallic-roughness and occlusion maps stay
	 * as they are, and so do glTF's colour factors and vertex colours (linear already, by the glTF spec). Sprites
	 * (2D), the UI layer, outlines and overlays aren't lit and look the same either way.
	 *
	 * Hand-picked colours look different lit this way (mid tones lighter, falloffs and shadows harsher, lights mixing
	 * more naturally), so a game that turns it on retunes its look: see guides/textures-and-colour.md. Switching at run
	 * time works: colour textures are uploaded again in the other form as they're next drawn (a glTF model's image is
	 * decoded again, its old copy standing in meanwhile), and the programs compiled again (once each).
	 * @example #Turn on linear lighting (with PBR and tone mapping, the usual set for realistic art)
	 *     renderer.linearLighting(true).pbr(true).postProcess({ enabled: true, toneMapping: "aces" });
	 */
	linearLighting(): boolean;
	linearLighting(enabled: boolean): this;
	linearLighting(enabled?: boolean): boolean | this {
		if (enabled === undefined) return this._linear;
		if (enabled === this._linear) return this;
		this._linear = enabled;
		this._textureManager?.srgbColors(enabled);
		markSceneChanged();
		return this;
	}

	protected _linear = false;

	/**
	 * Gets / sets anisotropic filtering for mipmapped textures: up to this many samples along a surface seen at a
	 * slant, so roads, pavements and floors stay sharp into the distance where trilinear filtering blurs them. 1 is off
	 * (the default); 4 to 16 are usual. Capped at what the GPU allows (maxAnisotropy(); 1 without
	 * EXT_texture_filter_anisotropic, when this does nothing), and applied to the textures made already as well as
	 * those made after. The getter gives the level in use. It costs texture reads only where surfaces are at a slant.
	 * @example #Sharp roads at a grazing angle
	 *     renderer.anisotropy(8);
	 */
	anisotropy(): number;
	anisotropy(level: number): this;
	anisotropy(level?: number): number | this {
		// (Before it's set up the GPU's most isn't known: what was asked)
		if (level === undefined) return this._textureManager ? igeAnisotropyLevel(this._anisotropy, this.maxAnisotropy()) : this._anisotropy;
		this._anisotropy = Number.isFinite(level) ? Math.max(1, level) : 1;
		this._applyAnisotropy();
		markSceneChanged();
		return this;
	}

	/** The most anisotropic filtering the GPU allows (1 without EXT_texture_filter_anisotropic, or before the renderer is set up). */
	maxAnisotropy(): number {
		return this._textureManager?.maxAnisotropy() ?? 1;
	}

	protected _anisotropy = 1;

	/** The anisotropic filtering asked for, on the texture manager's textures and the renderer's own mipmapped one (the default decals). */
	protected _applyAnisotropy(): void {
		const tm = this._textureManager;
		if (!tm) return;
		tm.anisotropy(this._anisotropy);
		// (The texture manager bound textures with its own GL: the device forgets what it knew was bound first)
		this._device?.invalidate();
		if (this._defaultDecalTexture && this._device) this._device.setSampler(this._defaultDecalTexture, { maxAnisotropy: tm.anisotropy() });
	}

	/**
	 * Which compile of the scene's programs the pass being drawn uses (igeColorDefines()): 0 as they always were
	 * (linear lighting off), 1 linear light out (into post-processing's target), 2 sRGB out (straight to the screen or
	 * a panel).
	 */
	protected _colorVariant: 0 | 1 | 2 = 0;

	/** A colour texture is drawn from its sRGB-encoded copy: linear lighting, and the texture not marked as data. */
	protected _srgbColor(texture: IgeTexture): boolean {
		return this._linear && texture._colorSpace !== "linear";
	}

	/** A data map (normal, metallic-roughness, occlusion) is decoded only when its texture says it's sRGB. */
	protected _srgbData(texture: IgeTexture): boolean {
		return this._linear && texture._colorSpace === "srgb";
	}

	/** u_hasVertexColors for a mesh: 0 none, 1 used as they are, 2 sRGB ones decoded to linear light (linear lighting's programs only). */
	protected _vertexColorFlag(geometry: IgeWebGlGeometry): number {
		if (!geometry.hasVertexColors) return 0;
		return this._colorVariant && !geometry.linearColors ? 2 : 1;
	}

	/** A colour (0 to 1) as the pass being drawn takes it: as it is, or as linear light under linear lighting. */
	protected _inLight(c: number): number {
		return this._linear ? igeSrgbToLinear(c) : c;
	}

	/**
	 * Gets / sets distance fog applied by the lit shaders. Distance is
	 * measured from each viewport's camera, so every split-screen view fades
	 * relative to its own camera.
	 * @example #Linear fog that starts 600 units from the camera
	 *     renderer.fog({ mode: "linear", color: { r: 0.05, g: 0.06, b: 0.08 }, near: 600, far: 1400 });
	 * @example #Disable fog
	 *     renderer.fog({ mode: "none" });
	 */
	fog(): IgeWebGlFogSettings;
	fog(settings: Partial<IgeWebGlFogSettings>): this;
	fog(settings?: Partial<IgeWebGlFogSettings>): IgeWebGlFogSettings | this {
		if (settings === undefined) {
			return { ...this._fog, color: { ...this._fog.color } };
		}

		this._fog = {
			...this._fog,
			...settings,
			color: { ...this._fog.color, ...(settings.color || {}) }
		};
		return this;
	}

	/**
	 * Gets / sets full-screen post-processing: bloom, exposure and tone
	 * mapping, contrast, saturation, colour temperature and a vignette. The
	 * frame is drawn offscreen (multisampled, with depth and stencil) and
	 * composited to the canvas once all viewports have drawn. WebGL 2 only;
	 * off by default. See IgeWebGlPostProcess for every setting.
	 * @example #A warm, slightly filmic look with a soft glow
	 *     renderer.postProcess({ enabled: true, toneMapping: "aces", exposure: 1.3, bloom: 0.4, vignette: 0.3, temperature: 0.2 });
	 * @example #Turn it off
	 *     renderer.postProcess({ enabled: false });
	 * @example #A drunk sway: the world's picture moved, turned, zoomed and softened (the UI stays put; works with it off too)
	 *     renderer.postProcess({ offsetX: 0.006, offsetY: -0.004, rotation: 0.015, zoom: 1.05, blur: 0.0012 });
	 */
	postProcess(): IgePostProcessSettings;
	postProcess(settings: Partial<IgePostProcessSettings>): this;
	postProcess(settings?: Partial<IgePostProcessSettings>): IgePostProcessSettings | this {
		if (settings === undefined) return { ...this._postSettings };
		this._postSettings = { ...this._postSettings, ...settings };
		if (this._postProcess) this._postProcess.settings = this._postSettings;
		return this;
	}

	/**
	 * Gets / sets dynamic resolution: the 3D scene (and its post-processing) is drawn offscreen at a fraction of the
	 * canvas's size and upscaled to it, linear, while the UI layer, panels, outlines and overlays stay at the canvas's
	 * own resolution. With it on, the scale steps down (about 10% at a time) when frames miss the display's refresh
	 * interval (or the interval `ige.engine.maxRenderRate()` allows, when longer) and back up when there's room.
	 * Scales are fractions of the canvas's size, which is already capped by `maxPixelRatio()`. Off by default.
	 * @example #Let the renderer hold the frame rate; never below two thirds of the canvas's size
	 *     renderer.dynamicResolution({ enabled: true, minScale: 0.67, maxScale: 1 });
	 */
	dynamicResolution(): IgeDynamicResolutionSettings;
	dynamicResolution(settings: Partial<IgeDynamicResolutionSettings>): this;
	dynamicResolution(settings?: Partial<IgeDynamicResolutionSettings>): IgeDynamicResolutionSettings | this {
		if (settings === undefined) return { ...this._dynamicRes.settings };
		const wasEnabled = this._dynamicRes.settings.enabled;
		this._dynamicRes.configure(settings);
		if (this._dynamicRes.settings.enabled && !wasEnabled) this._startRefreshSampling();
		else if (!this._dynamicRes.settings.enabled && wasEnabled) this._stopRefreshSampling();
		this._renderOnDemandWake();
		return this;
	}

	/**
	 * Gets the scale the 3D scene is drawn at (1 = the canvas's own size); sets a fixed scale (0.25 to 1) while dynamic
	 * resolution is off. Below 1 the scene goes offscreen even with post-processing off.
	 * @example #Draw the scene at 70% and upscale it
	 *     renderer.renderScale(0.7);
	 */
	renderScale(): number;
	renderScale(scale: number): this;
	renderScale(scale?: number): number | this {
		if (scale === undefined) return this._renderScale();
		this._fixedScale = Math.min(1, Math.max(0.25, scale));
		this._renderOnDemandWake();
		return this;
	}

	protected _renderScale(): number {
		return this._dynamicRes?.settings.enabled ? this._dynamicRes.scale : this._fixedScale ?? 1;
	}

	/** With render-on-demand a changed scale needs a frame to show. */
	protected _renderOnDemandWake(): void {
		const eng = ige.engine;
		if (eng && (eng._renderOnDemand || eng._useManualRender)) eng.manualRender();
	}

	protected _startRefreshSampling(): void {
		if (this._rafHandle || typeof requestAnimationFrame !== "function") return;
		this._dynamicRes.rafSample(performance.now());
		const loop = (ts: number) => {
			this._dynamicRes.rafSample(ts);
			this._rafHandle = this._dynamicRes.settings.enabled ? requestAnimationFrame(loop) : 0;
		};
		this._rafHandle = requestAnimationFrame(loop);
	}

	protected _stopRefreshSampling(): void {
		if (this._rafHandle && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this._rafHandle);
		this._rafHandle = 0;
		this._dynamicRes.resetTiming();
	}

	/** The post-processor for this frame, created on first use (null on WebGL 1, or when off and no picture effect's set). */
	protected _postProcessor(): IgeWebGlPostProcess | null {
		if ((!this._postSettings.enabled && !igePictureEffectsOn(this._postSettings) && this._renderScale() >= 1) || this._webglVersion !== 2 || !this._canvasContext) return null;
		if (!this._postProcess) {
			this._postProcess = new IgeWebGlPostProcess(this._device!, this._postSettings);
		}
		this._postProcess.settings = this._postSettings;
		this._postProcess.renderScale = this._renderScale();
		return this._postProcess;
	}

	/**
	 * Gets / sets whether batches of identical meshes are drawn with GPU
	 * instancing (one draw call per batch). Requires WebGL 2; ignored on
	 * WebGL 1 where every mesh is drawn individually.
	 */
	instancing(): boolean;
	instancing(val: boolean): this;
	instancing(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._instancingEnabled && !!this._instanceBuffer;
		}
		this._instancingEnabled = val;
		return this;
	}

	/**
	 * Free the GPU buffers of a geometry, e.g. a terrain chunk that was
	 * rebuilt or a level that was unloaded, along with any LOD meshes
	 * generated from it. Pass the geometry data or its id. If an entity
	 * still draws the geometry it is simply uploaded again on its next
	 * frame, so releasing too early costs time but doesn't break anything.
	 */
	releaseGeometry(geometry: IgeGeometryData3d | string): this {
		if (!this._geometryManager) return this;

		const id = typeof geometry === "string" ? geometry : geometry.id;
		// Still waiting to upload: it never will
		if (this._uploadQueue().remove(id)) this._resolveUpload(id, false);
		this._geometryManager.deleteGeometry(id);
		if (typeof geometry === "string") return this;

		for (const lod of takeGeneratedLods(geometry)) {
			this._uploadQueue().remove(lod.id);
			this._geometryManager.deleteGeometry(lod.id);
		}
		return this;
	}

	/**
	 * Gets / sets the per-frame upload budget: how many bytes of vertex and index buffers, and how many milliseconds
	 * (packing included), a frame may spend putting meshes on the GPU. Meshes over the budget wait their turn, in
	 * order, for the next frames; their entities aren't drawn until theirs is up (an entity whose mesh was swapped
	 * draws the one it had meanwhile, if that's still on the GPU). The first upload of a frame always goes. Unlimited
	 * by default (meshes upload when first drawn). `stats()` reports `uploads`, `uploadBytes`, `uploadMs` and
	 * `uploadsQueued`.
	 * @example #Stream a city without hitches: at most 1 MB or 2 ms of uploads a frame
	 *     renderer.uploadBudget({ bytes: 1024 * 1024, ms: 2 });
	 * @example #Back to uploading everything at once
	 *     renderer.uploadBudget({ bytes: Infinity, ms: Infinity });
	 */
	uploadBudget(): IgeUploadBudget;
	uploadBudget(budget: Partial<IgeUploadBudget>): this;
	uploadBudget(budget?: Partial<IgeUploadBudget>): IgeUploadBudget | this {
		if (budget === undefined) return { ...this._uploadQueue().budget };
		const b = this._uploadQueue().budget;
		if (budget.bytes !== undefined) b.bytes = budget.bytes > 0 ? budget.bytes : Infinity;
		if (budget.ms !== undefined) b.ms = budget.ms > 0 ? budget.ms : Infinity;
		return this;
	}

	/**
	 * Puts a mesh on the GPU ahead of drawing it: now, if the frame's upload budget allows, or in its turn. Resolves
	 * true once it's there (false if it was released first). Lower priorities go first, e.g. the distance to the
	 * camera. `discardArrays` frees its arrays once it's up (as discardGeometryArrays()).
	 * @example #A chunk from a worker, nearest first, keeping only the GPU copy
	 *     await renderer.uploadGeometry(chunkMesh, { priority: distance, discardArrays: true });
	 *     chunk.geometry(chunkMesh);
	 */
	uploadGeometry(geometryData: IgeGeometryData3d, options: { priority?: number; discardArrays?: boolean } = {}): Promise<boolean> {
		const manager = this._geometryManager;
		if (!manager) return Promise.resolve(false);
		if (manager.hasGeometry(geometryData.id)) {
			if (options.discardArrays) this._discardArrays(geometryData);
			return Promise.resolve(true);
		}
		if (geometryData.gpuOnly || (!geometryData.vertices && !geometryData.packed)) return Promise.resolve(false);
		if (options.discardArrays) geometryData.discardAfterUpload = true;
		return new Promise((resolve) => {
			const waiters = (this._uploadWaiters ??= new Map());
			const list = waiters.get(geometryData.id);
			if (list) list.push(resolve);
			else waiters.set(geometryData.id, [resolve]);
			this._uploadQueue().request(geometryData.id, geometryData, geometryGpuBytes(geometryData), options.priority ?? 0);
		});
	}

	/** Whether a mesh is on the GPU (uploaded and not released). */
	geometryUploaded(geometryData: IgeGeometryData3d | string): boolean {
		return !!this._geometryManager?.hasGeometry(typeof geometryData === "string" ? geometryData : geometryData.id);
	}

	/**
	 * Gets / sets whether model (glTF) base colour and emissive textures get mipmaps when their sampler doesn't say
	 * (off by default): far surfaces then sample a smaller copy instead of shimmering. A sampler whose minFilter asks
	 * for mipmaps gets them either way, and one that asks for none (LINEAR or NEAREST) is kept as it is. Normal,
	 * metallic-roughness and occlusion maps always have them. Applies to textures made from then on.
	 * @example #Mipmaps for every model texture, so distant facades don't shimmer
	 *     renderer.modelTextureMipmaps(true);
	 */
	modelTextureMipmaps(): boolean;
	modelTextureMipmaps(enabled: boolean): this;
	modelTextureMipmaps(enabled?: boolean): boolean | this {
		if (enabled === undefined) return this._modelTextureMipmaps;
		this._modelTextureMipmaps = enabled;
		return this;
	}

	/** The upload queue (see uploadBudget()). */
	protected _uploadQueue(): IgeGeometryUploadQueue<IgeGeometryData3d> {
		return this._uploads ??= new IgeGeometryUploadQueue((data) => this._uploadNow(data));
	}

	/** A mesh uploaded now (the upload queue's turn for it): its arrays freed if asked, its waiters told. */
	protected _uploadNow(geometryData: IgeGeometryData3d): void {
		const manager = this._geometryManager;
		if (!manager) return;
		const geometry = manager.createGeometryFromData(geometryData.id || "unknown", geometryData);
		// Geometry creation binds buffers with raw GL calls
		this._stateManager?.reset();
		if (geometry && geometryData.discardAfterUpload) this._discardArrays(geometryData);
		this._resolveUpload(geometryData.id, !!geometry);
	}

	protected _resolveUpload(id: string, uploaded: boolean): void {
		const waiters = this._uploadWaiters?.get(id);
		if (!waiters) return;
		this._uploadWaiters!.delete(id);
		for (const resolve of waiters) resolve(uploaded);
	}

	/**
	 * Free a geometry's arrays (vertices, normals, uvs, colours, indices,
	 * skin data) once it is on the GPU, so the GPU copy is the only one:
	 * for large meshes the game never reads again, such as terrain chunks.
	 * Uploads it first if it hasn't been drawn yet, and keeps its bounding
	 * box for culling and pointer events.
	 *
	 * Nothing can rebuild the mesh afterwards: generate LOD levels first
	 * (call lod() before this), releaseGeometry() frees it for good, and
	 * triangle picking, raycasts, projected decals and physics mesh shapes
	 * skip it. Returns false if the geometry couldn't be uploaded.
	 * @example #Keep only the GPU copy of a terrain chunk
	 *     chunk.geometry(chunkMesh);
	 *     renderer.discardGeometryArrays(chunkMesh);
	 */
	discardGeometryArrays(geometryData: IgeGeometryData3d): boolean {
		if (geometryData.gpuOnly) return true;
		if (!this._getGeometry(geometryData)) {
			// Waiting for its turn to upload (uploadBudget()): freed once it's up
			if (this._uploadQueue().has(geometryData.id)) {
				geometryData.discardAfterUpload = true;
				return true;
			}
			return false;
		}
		this._discardArrays(geometryData);
		return true;
	}

	/** A mesh's arrays freed (it's on the GPU), its bounding box kept. */
	protected _discardArrays(geometryData: IgeGeometryData3d): void {
		if (geometryData.gpuOnly) return;
		// (A packed mesh with no box is unpacked to measure one: worker-built meshes should bring theirs)
		const vertices = geometryData.boundingBox ? undefined : geometryData.vertices ?? (geometryData.packed ? unpackVertices(geometryData.packed).vertices : undefined);
		if (!geometryData.boundingBox && vertices && vertices.length >= 3) {
			const min: [number, number, number] = [Infinity, Infinity, Infinity];
			const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
			for (let i = 0; i + 2 < vertices.length; i += 3) {
				for (let k = 0; k < 3; k++) {
					if (vertices[i + k] < min[k]) min[k] = vertices[i + k];
					if (vertices[i + k] > max[k]) max[k] = vertices[i + k];
				}
			}
			geometryData.boundingBox = { min, max };
		}

		delete geometryData.vertices;
		delete geometryData.normals;
		delete geometryData.uvs;
		delete geometryData.tangents;
		delete geometryData.colors;
		delete geometryData.indices;
		delete geometryData.boneWeights;
		delete geometryData.boneIndices;
		delete geometryData.packed;
		delete geometryData.discardAfterUpload;
		geometryData.gpuOnly = true;
		// (If the context is ever lost, this one can't be re-uploaded: contextRestored names it)
		if (geometryData.id) this._gpuOnlyGeometry.add(geometryData.id);
	}

	/**
	 * Free everything a loaded glTF model put on the GPU: its meshes (and generated LOD levels) and its textures
	 * (base colour, emissive, normal, metallic-roughness and occlusion maps). An entity still showing the model
	 * uploads what it needs again on its next frame, so releasing early costs time but breaks nothing.
	 */
	releaseModel(model: IgeGltfModel): this {
		for (const part of getModelParts(model)) {
			this.releaseGeometry(part.geometryData);
			const m = part.materialData;
			for (const id of [m.textureId, m.emissiveTextureId, m.normalTextureId, m.metallicRoughnessTextureId, m.aoTextureId]) {
				if (id) this.releaseTexture(id);
			}
		}
		return this;
	}

	/**
	 * Free the GPU copy of a texture (an IgeTexture, or the id of a model
	 * texture). IgeTexture.destroy() does this automatically. A texture
	 * that is still used is uploaded again when next drawn.
	 */
	releaseTexture(texture: IgeTexture | string): this {
		const id = typeof texture === "string" ? texture : texture.id();
		if (!id || !this._textureManager) return this;
		this._textureManager.deleteTexture(id);
		this._pendingBlobTextures.delete(id);
		this._pendingBlobTextures.delete(igeTextureKey(id, true));
		return this;
	}

	/**
	 * Gets / sets whether static shadow casters are cached (default false,
	 * WebGL 2 only). Meshes that aren't skinned and haven't moved for 30
	 * rendered frames (new meshes count as unmoved) are drawn into a cached
	 * depth map, which is redrawn only when
	 * one of them moves, appears or disappears, or the shadow frustum
	 * moves. Each frame copies the cache into the shadow map and draws only
	 * the moving casters (characters, projectiles) on top, so large static
	 * scenes such as terrain stop costing shadow draw calls.
	 *
	 * To keep the frustum still while the camera pans, it re-centres in
	 * steps of 1/8 of shadowManager.frustumSize() instead of following the
	 * camera exactly, so the area covered may lag the view by that much;
	 * allow for it in the frustum size. With shadowFit() on, the fitted map
	 * stays put instead while the view is inside it (with room to move, its
	 * `slack`) and is moved once it isn't, never leaving part of the view
	 * uncovered. Caching pauses on frames where
	 * split-screen views each render their own shadow map (it helps when
	 * there is one view or the views share a map).
	 */
	shadowCaching(): boolean;
	shadowCaching(val: boolean): this;
	shadowCaching(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._shadowCaching;
		}
		this._shadowCaching = val;
		this._shadowMapHoldsCache = false;
		// (Its static casters' map isn't kept while caching is off)
		if (!val && this._shadowLightId) this._shadowManager?.deleteShadowCache(this._shadowLightId);
		return this;
	}

	/**
	 * Gets / sets fitting the directional shadow map to each view (on by default; `enabled: false` gives the square
	 * shadowManager.frustumSize() each way round the camera's target, whatever the camera sees). Fitted, the map
	 * covers what the camera can see that can take a shadow: its frustum out to `distance`, cut to the heights
	 * `minY` to `maxY` (the ground and the tallest roof), so a top-down view's corners and a street-level view's
	 * far end get shadows, and no more than that is covered (finer shadows where the view is small). Per view, split
	 * screen and panels included. Its sizes step about 9% at a time and its middle is snapped to the map's texels, so
	 * shadows don't shimmer as the camera moves; with shadowCaching() it stays put while the view is inside it (see
	 * `slack`). The depth along the light is at least shadowManager.shadowPlanes()'s far - near (so the bias means what
	 * it did), with at least a quarter of that back towards the light for tall casters out of view.
	 *
	 * Left "auto" (the defaults), `distance` is as far as the square reached (the depth of the camera's target plus
	 * frustumSize()), and `minY` / `maxY` are the lowest and highest points of the scene's opaque meshes' bounds.
	 * Games that know their world do better setting them (a town: the ground and its tallest roof). With
	 * shadowCascades() the view's depth out to `distance` is split into slices, each fitted the same way.
	 * @example #Shadows to 180 m ahead at street level, over a town whose tallest roof is 25 m (100 units a metre)
	 *     renderer.shadowFit({ distance: 18000, minY: 0, maxY: 2500 });
	 * @example #The old square round the camera's target
	 *     renderer.shadowFit({ enabled: false });
	 */
	shadowFit(): IgeShadowFitSettings;
	shadowFit(settings: Partial<IgeShadowFitSettings>): this;
	shadowFit(settings?: Partial<IgeShadowFitSettings>): IgeShadowFitSettings | this {
		if (settings === undefined) return { ...this._shadowFit };
		this._shadowFit = { ...this._shadowFit, ...settings };
		this._renderOnDemandWake();
		return this;
	}

	/**
	 * Gets / sets cascaded shadow maps for the directional light: the view's depth, out to shadowFit()'s `distance`,
	 * split into `count` slices (1 to 4; 1, the default, is one map over the whole view), each with a box of its own
	 * fitted to it in a tile of the map, so shadows near the camera are fine and still reach as far. The tiles are a
	 * 2 x 2 grid of half-size tiles of the map made by enableShadows() (the same memory: a 4096 map is four 2048
	 * tiles; 3 leaves one unused and costs a shadow pass fewer than 4). Slices end at a blend (`lambda`) of
	 * logarithmic and even steps from the camera's near plane; the far part of each (`blend`, a fraction of its depth)
	 * fades into the next. Each tile is snapped to its texels, as the fitted map is, so shadows don't shimmer.
	 *
	 * A view that sees its ground at much the same depth all over (a camera looking down, top-down) gains nothing
	 * from slices and keeps the whole map as one; so do slices with nothing in shadowFit()'s height band (they're
	 * folded into the next). Split-screen views sharing a map (shadowSharing()) use the whole map. Needs shadowFit()
	 * on (the square has no cascades). Casters are culled per cascade: each is drawn only into the tiles whose box it's
	 * in and (moving ones, or all without shadowCaching()) whose slice its shadow can reach, at that tile's level of
	 * detail, and not into a tile where it would be under a texel. With shadowCaching() each tile's static casters
	 * are redrawn on their own. stats().shadowCascades counts the cascades drawn.
	 * @example #Three cascades for a street-level city (the near one about 13 m deep at 180 m)
	 *     renderer.enableShadows(sun, 4096);
	 *     renderer.shadowFit({ distance: 18000, minY: 0, maxY: 2500 });
	 *     renderer.shadowCascades({ count: 3 });
	 */
	shadowCascades(): IgeShadowCascadeSettings;
	shadowCascades(settings: Partial<IgeShadowCascadeSettings>): this;
	shadowCascades(settings?: Partial<IgeShadowCascadeSettings>): IgeShadowCascadeSettings | this {
		if (settings === undefined) return { ...this._shadowCascades };
		const next = { ...this._shadowCascades, ...settings };
		next.count = Math.min(Math.max(1, Math.floor(next.count) || 1), IGE_MAX_SHADOW_CASCADES);
		next.lambda = Math.min(Math.max(next.lambda, 0), 1);
		next.blend = Math.min(Math.max(next.blend, 0), 0.5);
		this._shadowCascades = next;
		this._renderOnDemandWake();
		return this;
	}

	/**
	 * How far a view's shadows reach (shadowFit()'s `distance`): as set, or "auto": as far as the square reached, the
	 * depth of the camera's target plus shadowManager.frustumSize() (twice frustumSize() with no target).
	 */
	protected _shadowFitDistance(camera: unknown, matrices: IgeCameraMatrices): number {
		const distance = this._shadowFit.distance;
		if (distance !== "auto") return distance;
		const size = (this._shadowManager?.frustumSize() as number | undefined) ?? 400;
		const target = (camera as { _lookAt?: { x: number; y: number; z: number } } | undefined)?._lookAt;
		if (!target) return size * 2;
		const v = matrices.view.matrix;
		return Math.max(0, -(v[2] * target.x + v[6] * target.y + v[10] * target.z + v[14])) + size;
	}

	/** The heights that can take a shadow (shadowFit()'s `minY` / `maxY`, "auto": the scene's opaque meshes'), into _shadowBandMin / Max. */
	protected _shadowFitBand(data: IgeWebGlSceneFrameData | undefined): void {
		const fit = this._shadowFit;
		const known = !!data && data.minY <= data.maxY;
		this._shadowBandMin = fit.minY === "auto" ? (known ? data!.minY : -Infinity) : fit.minY;
		this._shadowBandMax = fit.maxY === "auto" ? (known ? data!.maxY : Infinity) : fit.maxY;
	}

	/**
	 * Add the corners of what a view sees that can take a shadow (see shadowFit()), out to `distance` (from `from`),
	 * to `points`, after `count` points already there. Returns the new count.
	 */
	protected _shadowFitAdd(matrices: IgeCameraMatrices, count: number, distance: number, from: number, points: number[]): number {
		const view = matrices.view.matrix, projection = matrices.projection.matrix;
		let n = igeShadowFitVolume(view, projection, distance, this._shadowBandMin, this._shadowBandMax, points, count * 3, from);
		// Nothing in the band in view (looking at the sky): the frustum as it is
		if (n === 0) n = igeShadowFitVolume(view, projection, distance, -Infinity, Infinity, points, count * 3, from);
		return count + n;
	}

	/** A view's (or the shared map's) fitted boxes, kept between frames. */
	protected _shadowViewFit(key: object): IgeShadowViewFit {
		let fit = this._shadowViewFits.get(key);
		if (!fit) {
			const boxes: IgeShadowFitBox[] = [];
			for (let i = 0; i <= IGE_MAX_SHADOW_CASCADES; i++) boxes.push(igeShadowFitBox());
			fit = { boxes, cascaded: false };
			this._shadowViewFits.set(key, fit);
		}
		return fit;
	}

	/**
	 * Fit the directional shadow map to what one view sees (shadowFit()): its cascades' slices, each in its tile
	 * (shadowCascades()), when they'd give the near slice finer texels than the whole map would; else the whole map
	 * round all of it. Returns false when there's nothing to fit (the caller falls back to the square).
	 */
	protected _fitShadowView(key: object, matrices: IgeCameraMatrices, camera: unknown, follow: boolean, data: IgeWebGlSceneFrameData | undefined): boolean {
		const shadows = this._shadowManager, light = this._shadowCastingLight;
		const lightId = this._shadowLightId;
		if (!shadows || !light || !shadows.hasShadowMap(lightId)) return false;
		this._shadowFitBand(data);
		const state = this._shadowViewFit(key);
		const distance = this._shadowFitDistance(camera, matrices);
		const points = this._shadowFitPoints, slicePoints = this._shadowSlicePoints;
		const count = this._shadowFitAdd(matrices, 0, distance, 0, points);
		if (count === 0) return false;
		const options = this._shadowFitOptions;
		options.slack = this._shadowFit.slack;
		options.follow = follow;

		// The view's depth from its near plane to the shadow distance in slices; those with nothing in the band are
		// folded into the next
		const settings = this._shadowCascades;
		const slices = this._shadowSlices;
		const view = matrices.view.matrix, projection = matrices.projection.matrix;
		const used = settings.count > 1
			? igeShadowCascadeSlices(view, projection, distance, this._shadowBandMin, this._shadowBandMax, settings, slices, slicePoints, this._shadowSplits)
			: 0;
		// Worth splitting while the nearest slice is a good deal smaller across the light than the whole view
		let cascaded = false;
		if (used > 1) {
			const basis = igeShadowLightBasis(light.direction() as { x: number; y: number; z: number });
			const n = igeShadowFitVolume(view, projection, slices[0].end, this._shadowBandMin, this._shadowBandMax, slicePoints, 0, slices[0].start);
			const ratio = igeShadowFitExtent(slicePoints, n, basis) / Math.max(igeShadowFitExtent(points, count, basis), 1e-9);
			cascaded = ratio < (state.cascaded ? SHADOW_CASCADE_OFF : SHADOW_CASCADE_ON);
		}
		state.cascaded = cascaded;
		// Shadows fade out over the last tenth of the distance (or the far plane, if that's nearer)
		const fadeEnd = Math.min(distance, igeProjectionDepthRange(projection).far);

		if (!cascaded) {
			shadows.setCascadeCount(lightId, 1);
			shadows.fitCascade(lightId, light, 0, points, count, state.boxes[IGE_MAX_SHADOW_CASCADES], options);
			shadows.setShadowFade(lightId, fadeEnd);
			return true;
		}

		// Each slice's box overlaps the slice before by the part of it that fades into this one
		shadows.setCascadeCount(lightId, used, settings.blend);
		shadows.setShadowFade(lightId, fadeEnd);
		for (let k = 0; k < used; k++) {
			const slice = slices[k];
			const n = igeShadowFitVolume(view, projection, slice.end, this._shadowBandMin, this._shadowBandMax, slicePoints, 0, slice.from);
			shadows.fitCascade(lightId, light, k, slicePoints, n, state.boxes[k], options);
			shadows.setCascadeSlice(lightId, k, slice.start, k === used - 1 ? Infinity : slice.end, slice.from);
		}
		return true;
	}

	/** Fit the whole directional shadow map round what several views see (a shared map: no cascades). */
	protected _fitShadowShared(viewports: IgeViewport[], follow: boolean, data: IgeWebGlSceneFrameData | undefined): boolean {
		const shadows = this._shadowManager, light = this._shadowCastingLight, cameras = this._cameraController;
		const lightId = this._shadowLightId;
		if (!shadows || !light || !cameras || !shadows.hasShadowMap(lightId)) return false;
		this._shadowFitBand(data);
		let count = 0;
		for (const viewport of viewports) {
			const matrices = cameras.updateCamera(viewport.camera, viewport);
			count = this._shadowFitAdd(matrices, count, this._shadowFitDistance(viewport.camera, matrices), 0, this._shadowFitPoints);
		}
		if (count === 0) return false;
		const options = this._shadowFitOptions;
		options.slack = this._shadowFit.slack;
		options.follow = follow;
		shadows.setCascadeCount(lightId, 1);
		shadows.fitCascade(lightId, light, 0, this._shadowFitPoints, count, this._shadowViewFit(this._shadowFitShared).boxes[IGE_MAX_SHADOW_CASCADES], options);
		// (Each view's distance differs: no fade)
		shadows.setShadowFade(lightId, 0);
		return true;
	}

	/**
	 * Gets / sets whether the directional shadow pass leaves out the casters drawn each frame (moving, skinned) whose
	 * shadow can't land in the view (on by default; `stats().shadowCastersCulled` counts them). Casters in the
	 * static shadow cache are never left out, so the cache doesn't change as the camera moves.
	 */
	shadowCasterCulling(val?: boolean): boolean | this {
		if (val === undefined) return this._shadowCasterCulling;
		this._shadowCasterCulling = val;
		return this;
	}

	/**
	 * Where the directional shadow frustum should be centred for a view
	 * target: the target itself, or with shadow caching on, the target
	 * snapped to a coarse grid so small camera moves don't move the frustum.
	 */
	protected _shadowCenter(x: number, y: number, z: number): { x: number; y: number; z: number } {
		if (!this._shadowCaching || !this._shadowManager) return { x, y, z };
		const step = Math.max((this._shadowManager.frustumSize() as number) * SHADOW_RECENTER_STEP, 1e-6);
		return {
			x: Math.round(x / step) * step,
			y: Math.round(y / step) * step,
			z: Math.round(z / step) * step
		};
	}

	/**
	 * Gets / sets debug drawing, drawn on top of each viewport:
	 * - bounds: every visible mesh's bounding sphere (the one used for
	 *   culling), coloured by the level of detail picked in that view:
	 *   green full detail, then yellow, orange and red for lower levels;
	 *   blue for meshes without LOD levels;
	 * - shadowFrustum: the box the directional shadow map covers.
	 * @example #Check LOD switching and shadow coverage
	 *     renderer.debugDraw({ bounds: true, shadowFrustum: true });
	 */
	debugDraw(): { bounds: boolean; shadowFrustum: boolean };
	debugDraw(options: Partial<{ bounds: boolean; shadowFrustum: boolean }>): this;
	debugDraw(options?: Partial<{ bounds: boolean; shadowFrustum: boolean }>) {
		if (options === undefined) {
			return { ...this._debugOptions };
		}
		this._debugOptions = { ...this._debugOptions, ...options };
		return this;
	}

	/**
	 * Something drawn over the whole canvas after everything else, the UI
	 * layer included: the engine's document UI (ui2's IgeUiRoot) and the like.
	 * Each draws itself with WebGL 2 (the renderer's state is reset after) and
	 * returns its draw calls; it's told when a lost context comes back.
	 */
	addOverlay(overlay: IgeWebGlOverlay): void {
		if (!this._overlays.includes(overlay)) this._overlays.push(overlay);
	}

	removeOverlay(overlay: IgeWebGlOverlay): void {
		const i = this._overlays.indexOf(overlay);
		if (i >= 0) this._overlays.splice(i, 1);
	}

	protected _overlays: IgeWebGlOverlay[] = [];

	/** Panel viewports (picture-in-picture views), drawn in order after the main views and their post-processing. */
	protected _panels: IgePanelViewport[] = [];
	/** True while a panel is drawn: its pass skips what belongs to the main views (outlines, UI layer, debug lines, shadow caching). */
	protected _inPanel: boolean = false;
	/** The panels drawn this frame. */
	protected _visiblePanels: IgePanelViewport[] = [];
	/** Each shown panel's offscreen target (made on first use, with the device). */
	protected _panelTargets?: IgePanelTargets;
	/** The target the panel being drawn draws into (none: the canvas). */
	protected _panelTarget: ReturnType<IgePanelTargets["ensure"]> | null = null;

	protected _renderOverlays(): void {
		const gl = this._canvasContext;
		const canvas = this._canvasElement;
		if (!this._overlays?.length || !gl || !canvas || this._webglVersion !== 2 || !this._stateManager) return;
		for (const o of this._overlays) this._stats.drawCalls += o.draw(gl as WebGL2RenderingContext, canvas.width, canvas.height, this._devicePixelRatio) || 0;
		this._stateManager.reset();
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * Add a panel viewport (a picture-in-picture view with its own scene, camera, lights and shadows, see
	 * IgePanelViewport and guides/panel-viewport.md). Panels draw in the order added (later on top), over the main
	 * views and the UI layer, under the overlays; a panel that isn't shown costs nothing.
	 */
	addPanel(panel: IgePanelViewport): this {
		if (!this._panels.includes(panel)) {
			this._panels.push(panel);
			panel._renderer = this;
		}
		return this;
	}

	removePanel(panel: IgePanelViewport): this {
		const i = this._panels.indexOf(panel);
		if (i >= 0) {
			panel.disableShadows();
			this._panelTargets?.free(panel);
			this._panels.splice(i, 1);
			panel._renderer = undefined;
		}
		return this;
	}

	/** The panels added to the renderer, in drawing order. */
	panels(): readonly IgePanelViewport[] {
		return this._panels;
	}

	/** The panel's rectangle on the canvas in device pixels (from the bottom-left). */
	protected _panelFrame(panel: IgePanelViewport, dpr: number): { x: number; y: number; width: number; height: number } {
		const vp = panel.viewport;
		return {
			x: Math.floor((vp._translate?.x || 0) * dpr),
			y: Math.floor((vp._translate?.y || 0) * dpr),
			width: Math.floor(vp._bounds2d.x * dpr),
			height: Math.floor(vp._bounds2d.y * dpr)
		};
	}

	/**
	 * For each shown panel whose effect asks for its history to hold another moment (a recorder freeze, started when
	 * the picture was last good): the effect's scene is set to that moment, drawn into the panel's target and copied into
	 * the history, and set back; then the shown panels' scenes are collected again at the time the frame is for. This
	 * happens when a freeze starts (play or seek), not each frame.
	 */
	protected _renderPanelHistories(targets: IgePanelTargets, dpr: number): void {
		let redo = false;
		for (const panel of this._visiblePanels) {
			const effect = panel.effect;
			if (!effect?.history?.() || !effect.historyRequest) continue;
			const frame = this._panelFrame(panel, dpr);
			if (frame.width < 1 || frame.height < 1) continue;
			const target = targets.ensure(panel, frame.width, frame.height, !!effect.depth, panel.samples, true);
			const request = effect.historyRequest(target);
			if (!request) continue;
			redo = true;
			request.renderAt(() => {
				this._itemCount = 0;
				this._skeletonRows.clear();
				this._bonePalette?.begin();
				this._forgetCollected(panel.viewport._scene);
				this._collectScene(panel.viewport._scene);
				this._finishScenes();
				this._uploadBonePalette();
				this._lightManager = panel.lights;
				this._shadowCastingLight = panel._shadowLight;
				this._shadowLightId = panel.shadowId;
				this._shadowCastingPointLights = [];
				this._fog = panel.fog() ?? { ...this._fog, mode: "none" };
				this._panelTarget = target;
				try {
					this._renderViewport(panel.viewport);
				} finally {
					this._panelTarget = null;
				}
				targets.resolve(target);
				target.captureHistory();
				// A picture drawn while model textures are still being made isn't kept: it is drawn again next frame
				if (!this._blobTexturesLoading()) target.historyKey = request.key;
			});
		}
		if (!redo) return;
		// The scenes are back at this frame's time: collect them again for the panels' own draws
		this._itemCount = 0;
		this._skeletonRows.clear();
		this._bonePalette?.begin();
		for (const panel of this._visiblePanels) {
			this._forgetCollected(panel.viewport._scene);
			this._collectScene(panel.viewport._scene);
		}
		this._finishScenes();
		this._uploadBonePalette();
	}

	/**
	 * Draw the shown panels (prepared and collected by renderSceneGraph), each into an offscreen target of its own
	 * sized to its rectangle, then composite it onto the canvas (through the panel's effect, or a plain copy), after
	 * the main views' post-processing. Each swaps in its own lights, shadow light and fog for the draw (a panel with
	 * no fog of its own has none), so nothing of the main view's reaches into it and nothing of it into the main
	 * view; the main view's shadow caching and shared shadow map are left as they were.
	 */
	protected _renderPanels(): void {
		const saved = {
			lights: this._lightManager,
			light: this._shadowCastingLight,
			id: this._shadowLightId,
			points: this._shadowCastingPointLights,
			shared: this._sharedShadowFrame,
			holds: this._shadowMapHoldsCache,
			fog: this._fog
		};
		const device = this._device;
		const targets = device ? (this._panelTargets ??= new IgePanelTargets(device)) : null;
		const dpr = this._devicePixelRatio;
		this._inPanel = true;
		this._sharedShadowFrame = -1;
		try {
			// Panels whose effect holds a history frame from another moment (a freeze): that moment is drawn first
			if (targets) this._renderPanelHistories(targets, dpr);
			for (const panel of this._visiblePanels) {
				this._lightManager = panel.lights;
				this._shadowCastingLight = panel._shadowLight;
				this._shadowLightId = panel.shadowId;
				this._shadowCastingPointLights = [];
				this._fog = panel.fog() ?? { ...saved.fog, mode: "none" };
				const vp = panel.viewport;
				const frame = {
					x: Math.floor((vp._translate?.x || 0) * dpr),
					y: Math.floor((vp._translate?.y || 0) * dpr),
					width: Math.floor(vp._bounds2d.x * dpr),
					height: Math.floor(vp._bounds2d.y * dpr)
				};
				const target = targets && frame.width >= 1 && frame.height >= 1 ? targets.ensure(panel, frame.width, frame.height, !!panel.effect?.depth, panel.samples, !!panel.effect?.history?.()) : null;
				this._panelTarget = target;
				try {
					this._renderViewport(vp);
				} finally {
					this._panelTarget = null;
				}
				if (target && targets && device) {
					targets.resolve(target);
					this._gpuBegin();
					// Pictures asked for with panel.capture(): the resolved colour read back, flipped to top row first
					if (panel._captures.length) this._handOverPanelPictures(panel, device, target);
					if (panel._silent) panel._silent = false;
					else if (panel.effect) panel.effect.apply(device, frame, target);
					else targets.copy(target, frame);
					device.release();
					this._stateManager?.reset();
				}
			}
		} finally {
			this._inPanel = false;
			this._lightManager = saved.lights;
			this._shadowCastingLight = saved.light;
			this._shadowLightId = saved.id;
			this._shadowCastingPointLights = saved.points;
			this._sharedShadowFrame = saved.shared;
			this._shadowMapHoldsCache = saved.holds;
			this._fog = saved.fog;
		}
	}

	/** Reads the panel's finished picture back and gives it to everyone waiting for it (IgePanelViewport.capture()). */
	protected _handOverPanelPictures(panel: IgePanelViewport, device: { readTarget(target: IgeGpuTexture, rect: [number, number, number, number]): Uint8Array }, target: { color: IgeGpuTexture; width: number; height: number }): void {
		const waiting = panel._captures.splice(0);
		const { width, height } = target;
		const raw = device.readTarget(target.color, [0, 0, width, height]);
		// (GL's rows run bottom to top: the picture's top row first)
		const pixels = new Uint8ClampedArray(raw.length);
		const row = width * 4;
		for (let y = 0; y < height; y++) pixels.set(raw.subarray((height - 1 - y) * row, (height - y) * row), y * row);
		for (const done of waiting) done({ width, height, pixels });
	}

	/**
	 * Draw a world-space line in every viewport on the next rendered frame,
	 * e.g. an AI path, an attack range or a ray. Call it each frame the line
	 * should stay visible.
	 * @param color RGBA, 0-1 (default yellow).
	 */
	debugLine(
		x1: number, y1: number, z1: number,
		x2: number, y2: number, z2: number,
		color: { r: number; g: number; b: number; a?: number } = { r: 1, g: 0.9, b: 0.2, a: 1 }
	): this {
		this._pushDebugLine(x1, y1, z1, x2, y2, z2, color.r, color.g, color.b, color.a ?? 1);
		return this;
	}

	protected _pushDebugLine(
		x1: number, y1: number, z1: number,
		x2: number, y2: number, z2: number,
		r: number, g: number, b: number, a: number
	): void {
		const needed = (this._debugLineVertices + 2) * DEBUG_LINE_FLOATS;
		if (needed > this._debugLineData.length) {
			const grown = new Float32Array(Math.max(needed, this._debugLineData.length * 2));
			grown.set(this._debugLineData);
			this._debugLineData = grown;
		}
		const d = this._debugLineData;
		let o = this._debugLineVertices * DEBUG_LINE_FLOATS;
		d[o++] = x1; d[o++] = y1; d[o++] = z1; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = a;
		d[o++] = x2; d[o++] = y2; d[o++] = z2; d[o++] = r; d[o++] = g; d[o++] = b; d[o++] = a;
		this._debugLineVertices += 2;
	}

	/** Three great circles approximating a sphere. */
	protected _pushDebugSphere(cx: number, cy: number, cz: number, radius: number, color: [number, number, number]): void {
		const segments = 16;
		const [r, g, b] = color;
		for (let k = 0; k < segments; k++) {
			const a0 = (k / segments) * Math.PI * 2, a1 = ((k + 1) / segments) * Math.PI * 2;
			const c0 = Math.cos(a0) * radius, s0 = Math.sin(a0) * radius;
			const c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;
			this._pushDebugLine(cx + c0, cy + s0, cz, cx + c1, cy + s1, cz, r, g, b, 1);
			this._pushDebugLine(cx + c0, cy, cz + s0, cx + c1, cy, cz + s1, r, g, b, 1);
			this._pushDebugLine(cx, cy + c0, cz + s0, cx, cy + c1, cz + s1, r, g, b, 1);
		}
	}

	/** This viewport's debug shapes queued (bounds, the shadow frustum) after the lines queued with debugLine(). */
	protected _pushDebugShapes(): void {
		const debug = this._debugOptions;
		this._debugLinesQueued = this._debugLineVertices;
		if (!debug.bounds && !debug.shadowFrustum) return;

		if (debug.bounds) {
			const pushItem = (item: IgeWebGlRenderItem) => {
				if (item.radius < 0) return;
				const color = item.lodSizes ? DEBUG_LOD_COLORS[Math.min(item.lodLevel, DEBUG_LOD_COLORS.length - 1)] : DEBUG_NO_LOD_COLOR;
				this._pushDebugSphere(item.cx, item.cy, item.cz, item.radius, color);
			};
			for (const batch of this._mainBatcher.batches) {
				for (let i = 0; i < batch.items.length; i++) pushItem(batch.items[i]);
			}
			for (let i = 0; i < this._transparentItems.length; i++) pushItem(this._transparentItems[i]);
		}

		if (debug.shadowFrustum && this._shadowManager && this.shadowsEnabled()) {
			// Each cascade's box (the whole map's, with one): magenta, then green, blue and yellow
			const cascades = this._shadowManager.getCascades(this._shadowLightId);
			for (let k = 0; k < cascades.length; k++) {
				const [cr, cg, cb] = cascades.length > 1 ? DEBUG_CASCADE_COLORS[k] : [1, 0.4, 1];
				this._lightFrustumMatrix.matrix.set(cascades[k].matrix);
				const inverse = this._lightFrustumMatrix.getInverse();
				if (inverse) {
					const m = inverse.matrix;
					const corners: number[][] = [];
					for (let i = 0; i < 8; i++) {
						const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
						const w = m[3] * x + m[7] * y + m[11] * z + m[15];
						corners.push([
							(m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
							(m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
							(m[2] * x + m[6] * y + m[10] * z + m[14]) / w
						]);
					}
					const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
					for (const [a, b] of edges) {
						const p = corners[a], q = corners[b];
						this._pushDebugLine(p[0], p[1], p[2], q[0], q[1], q[2], cr, cg, cb, 1);
					}
				}
			}
		}
	}

	/** The queued debug lines, in the view's pass: depth tested, not written, blended over. */
	protected _drawDebugLines(pass: IgeGpuRenderPass, matrices: IgeCameraMatrices): void {
		const vertices = this._debugLineVertices;
		if (vertices === 0) return;
		const device = this._device!, programs = this._gpuPrograms!;
		this._lineBuffer ??= device.createBuffer({ size: 0, usage: "vertex", stream: true, label: "debug lines" });
		device.writeBuffer(this._lineBuffer, 0, this._debugLineData.subarray(0, vertices * DEBUG_LINE_FLOATS));
		const variant = this._colorVariant || 0;
		const pipeline = programs.pipeline(variant ? `debug_line|c${variant}` : "debug_line", () => ({
			module: programs.module("debug_line", EFFECT_ATTRIBUTES, igeColorDefines(variant)),
			vertex: { buffers: [LINE_LAYOUT] },
			primitive: { topology: "line-list" },
			blend: NORMAL_BLEND,
			depth: { compare: "less-equal", write: false },
			uniforms: [{ name: "u_viewMatrix", type: "mat4" }, { name: "u_projectionMatrix", type: "mat4" }],
			label: "debug lines"
		}));
		const block = this._lineData;
		block.set(matrices.view.matrix, pipeline.uniformOffsets.u_viewMatrix);
		block.set(matrices.projection.matrix, pipeline.uniformOffsets.u_projectionMatrix);
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, this._lineBuffer);
		pass.setUniforms(block);
		pass.draw(vertices);
	}

	/**
	 * Gets / sets whether back faces of opaque meshes are culled in the
	 * main pass (default false). Culling skips triangles facing away from
	 * the camera, roughly halving the fragments shaded for closed meshes
	 * such as terrain and characters. Meshes must be wound counter-
	 * clockwise (glTF and IgePrimitiveGeometry are); materials with
	 * doubleSided: true are never culled. Entities with a negative scale
	 * (mirrored) turn inside out when culling is on.
	 */
	backFaceCulling(): boolean;
	backFaceCulling(val: boolean): this;
	backFaceCulling(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._backFaceCulling;
		}
		this._backFaceCulling = val;
		return this;
	}

	/**
	 * Find where a screen point's ray first meets a heightfield, for
	 * picking on uneven terrain (screenToGround() only meets a flat plane).
	 * The ray is sampled every `step` world units (horizontally) through
	 * the height band [minHeight, maxHeight], then the hit is refined by
	 * bisection, so `step` only needs to be small enough not to jump over
	 * narrow peaks. Returns null if the ray misses the band or the ground.
	 * @param heightAt Ground height at a world X/Z position.
	 * @example #Pick a hex tile on hilly terrain
	 *     const hit = renderer.screenToHeightfield(viewport, x, y, (wx, wz) => terrain.heightAt(wx, wz), {
	 *         minHeight: 0, maxHeight: 120, step: 4
	 *     });
	 */
	screenToHeightfield(
		viewport: IgeViewport,
		screenX: number,
		screenY: number,
		heightAt: (x: number, z: number) => number,
		options: IgeHeightfieldRayOptions
	): { x: number; y: number; z: number } | null {
		const ray = this.screenToWorldRay(viewport, screenX, screenY);
		return ray ? intersectHeightfield(ray, heightAt, options) : null;
	}

	/**
	 * Gets / sets the level-of-detail bias. On-screen sizes are multiplied
	 * by it before an entity's LOD level is picked (see IgeEntity.lod()):
	 * above 1 keeps full detail longer, below 1 switches to lower detail
	 * sooner. Useful as a graphics quality setting. Defaults to 1.
	 */
	lodBias(): number;
	lodBias(val: number): this;
	lodBias(val?: number): number | this {
		if (val === undefined) {
			return this._lodBias;
		}
		this._lodBias = Math.max(0, val);
		return this;
	}

	/**
	 * Gets / sets the highest device pixel ratio the canvas renders at.
	 * High-DPI screens can make split-screen fill-rate bound (four
	 * viewports at 2x is 6.5 million pixels per frame on a 1728x935
	 * window); capping at e.g. 1.5 trades a little sharpness for speed.
	 * Defaults to no cap.
	 */
	maxPixelRatio(): number;
	maxPixelRatio(val: number): this;
	maxPixelRatio(val?: number): number | this {
		if (val === undefined) {
			return this._maxPixelRatio;
		}

		this._maxPixelRatio = Math.max(0.25, val);
		if (this._pixelRatioScaling && typeof window !== "undefined") {
			this._devicePixelRatio = Math.min(window.devicePixelRatio || 1, this._maxPixelRatio);
			this._resizeEvent();
		}
		return this;
	}

	/**
	 * Project a world-space point into a viewport. Returns CSS pixel
	 * coordinates relative to the canvas's top-left corner, e.g. to place
	 * a DOM health bar or damage number over an entity.
	 * `visible` is false when the point is behind the camera or outside
	 * the viewport. Returns null if the viewport has no camera.
	 * @example #Position a health bar above a zombie in player 2's view
	 *     const p = renderer.worldToScreen(viewport2, zombie._translate.x, 200, zombie._translate.z);
	 *     if (p && p.visible) { bar.style.transform = `translate(${p.x}px, ${p.y}px)`; }
	 */
	worldToScreen(
		viewport: IgeViewport,
		x: number,
		y: number,
		z: number
	): { x: number; y: number; depth: number; visible: boolean } | null {
		if (!this._cameraController || !viewport.camera) return null;

		const m = this._cameraController.updateCamera(viewport.camera, viewport).viewProjection.matrix;
		const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
		const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
		const cz = m[2] * x + m[6] * y + m[10] * z + m[14];
		const cw = m[3] * x + m[7] * y + m[11] * z + m[15];

		if (cw <= 0) {
			return { x: 0, y: 0, depth: 0, visible: false };
		}

		const nx = cx / cw, ny = cy / cw, nz = cz / cw;
		const vx = viewport._translate?.x || 0;
		const vyBottom = viewport._translate?.y || 0;
		const vw = viewport._bounds2d.x;
		const vh = viewport._bounds2d.y;

		// Viewport y is measured from the canvas bottom (WebGL convention)
		const screenX = vx + (nx * 0.5 + 0.5) * vw;
		const screenY = this._bounds2d.y - (vyBottom + (ny * 0.5 + 0.5) * vh);

		return {
			x: screenX,
			y: screenY,
			depth: nz,
			visible: nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1 && nz >= -1 && nz <= 1
		};
	}

	/**
	 * The view, projection and combined matrices (and frustum) a viewport's
	 * camera renders with, for projecting many points without repeating
	 * the camera setup (see IgeViewportOverlay). Null without a camera.
	 */
	cameraMatrices(viewport: IgeViewport): IgeCameraMatrices | null {
		if (!this._cameraController || !viewport.camera) return null;
		this._applyDefaultCameraPreset(viewport);
		return this._cameraController.updateCamera(viewport.camera, viewport);
	}

	/**
	 * Build a world-space ray through a screen point (CSS pixels from the
	 * canvas's top-left) in a viewport, for mouse picking and aiming.
	 * Returns null if the viewport has no camera.
	 */
	screenToWorldRay(
		viewport: IgeViewport,
		screenX: number,
		screenY: number
	): { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } } | null {
		if (!this._cameraController || !viewport.camera) return null;
		this._applyDefaultCameraPreset(viewport);

		const inverse = this._cameraController.updateCamera(viewport.camera, viewport).viewProjection.getInverse();
		if (!inverse) return null;

		const vx = viewport._translate?.x || 0;
		const vyBottom = viewport._translate?.y || 0;
		const vw = viewport._bounds2d.x;
		const vh = viewport._bounds2d.y;
		const nx = ((screenX - vx) / vw) * 2 - 1;
		const ny = ((this._bounds2d.y - screenY - vyBottom) / vh) * 2 - 1;

		const unproject = (nz: number) => {
			const m = inverse.matrix;
			const x = m[0] * nx + m[4] * ny + m[8] * nz + m[12];
			const y = m[1] * nx + m[5] * ny + m[9] * nz + m[13];
			const z = m[2] * nx + m[6] * ny + m[10] * nz + m[14];
			const w = m[3] * nx + m[7] * ny + m[11] * nz + m[15];
			return { x: x / w, y: y / w, z: z / w };
		};

		const near = unproject(-1);
		const far = unproject(1);
		let dx = far.x - near.x, dy = far.y - near.y, dz = far.z - near.z;
		const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
		dx /= len;
		dy /= len;
		dz /= len;

		return { origin: near, direction: { x: dx, y: dy, z: dz } };
	}

	/**
	 * Where a screen point (CSS pixels from the canvas's top-left) hits the
	 * horizontal plane y = groundY in a viewport, e.g. for click-to-move or
	 * mouse aiming. Returns null if the ray doesn't hit the plane.
	 */
	screenToGround(
		viewport: IgeViewport,
		screenX: number,
		screenY: number,
		groundY: number = 0
	): { x: number; y: number; z: number } | null {
		const ray = this.screenToWorldRay(viewport, screenX, screenY);
		if (!ray || Math.abs(ray.direction.y) < 1e-6) return null;

		const t = (groundY - ray.origin.y) / ray.direction.y;
		if (t < 0) return null;

		return {
			x: ray.origin.x + ray.direction.x * t,
			y: groundY,
			z: ray.origin.z + ray.direction.z * t
		};
	}

	/**
	 * The viewport under a screen point (CSS pixels from the canvas's
	 * top-left), e.g. to route mouse input in split screen. The topmost
	 * (last mounted) viewport wins when viewports overlap.
	 */
	viewportAt(screenX: number, screenY: number): IgeViewport | undefined {
		const viewports = ige.engine._children as IgeViewport[];
		for (let i = viewports.length - 1; i >= 0; i--) {
			const viewport = viewports[i];
			if (!viewport || !viewport._bounds2d || !(viewport as any).camera) continue;
			const vx = viewport._translate?.x || 0;
			const vyBottom = viewport._translate?.y || 0;
			const top = this._bounds2d.y - vyBottom - viewport._bounds2d.y;
			if (
				screenX >= vx && screenX < vx + viewport._bounds2d.x &&
				screenY >= top && screenY < top + viewport._bounds2d.y
			) {
				return viewport;
			}
		}
		return undefined;
	}

	/**
	 * The nearest mesh triangle under a screen point (CSS pixels from the
	 * canvas's top-left) in a viewport: which entity was clicked, and
	 * exactly where (point, surface normal, distance). Tests the given
	 * entities and their children, or the viewport's whole scene; skinned
	 * characters are tested in their current pose. Sprites aren't tested.
	 * @example #Click to attack a zombie or move to a point on the terrain
	 *     const hit = renderer.raycast(viewport, event.clientX, event.clientY);
	 *     if (hit?.entity.data("zombie")) attack(hit.entity);
	 *     else if (hit) moveTo(hit.point);
	 */
	raycast(
		viewport: IgeViewport,
		screenX: number,
		screenY: number,
		targets?: IgeEntity | IgeEntity[],
		options?: IgeRaycastOptions
	): IgeRaycastHit | null {
		const ray = this.screenToWorldRay(viewport, screenX, screenY);
		const scene = targets ?? ((viewport as any)._scene as IgeEntity | undefined);
		if (!ray || !scene) return null;
		return raycastEntities(ray, scene, options)[0] ?? null;
	}

	/**
	 * Gets / sets how entity pointer events (pointerOver, pointerDown...)
	 * test meshes: "box" (default) against their bounding box, which is
	 * cheap but also catches the empty space around a shape; "triangles"
	 * against the actual triangles (skinned characters in their current
	 * pose), after the box test passes. Sprites are always tested by their
	 * quad.
	 */
	pointerPicking(): "box" | "triangles";
	pointerPicking(mode: "box" | "triangles"): this;
	pointerPicking(mode?: "box" | "triangles"): "box" | "triangles" | this {
		if (mode === undefined) {
			return this._pointerPicking;
		}
		this._pointerPicking = mode;
		return this;
	}

	protected _pointerPicking: "box" | "triangles" = "box";

	/**
	 * Whether a screen point (CSS pixels from the canvas's top-left) is over
	 * an entity in the viewport under it. IGE's pointer events (pointerOver,
	 * pointerDown, pointerUp...) use this when the WebGL renderer is active.
	 * Meshes are hit by their bounding box, or by their triangles with
	 * pointerPicking("triangles"); sprites exactly by their quad in flat
	 * views (screen2d, or billboard("none")), or by their on-screen
	 * rectangle when billboarded.
	 */
	pointerHitTest(entity: IgeEntity, screenX: number, screenY: number): boolean {
		const viewport = this.viewportAt(screenX, screenY);
		const world = entity._worldMatrix4;
		if (!viewport || !world || entity._hidden) return false;
		const ray = this.screenToWorldRay(viewport, screenX, screenY);
		if (!ray) return false;

		const camera = viewport.camera;
		const isSprite = !entity._modelParts && !entity._geometryData?.vertices && !entity._geometryData?.packed && !entity._geometryData?.gpuOnly && !!entity._texture;
		const flat2d = !!(camera._up && camera._up.y < 0);

		if (isSprite && !flat2d && entity._billboardMode !== 0) {
			// Billboard: compare against its rectangle on screen
			const matrices = this.cameraMatrices(viewport);
			if (!matrices) return false;
			const m = world.matrix;
			const centre = this.worldToScreen(viewport, m[12], m[13], m[14]);
			if (!centre || !centre.visible) return false;
			// Screen pixels per world unit at the entity's distance
			const p = matrices.projection.matrix;
			let pixelsPerUnit = p[5] * viewport._bounds2d.y * 0.5;
			if (p[11] !== 0) {
				const v = matrices.view.matrix;
				const depth = -(v[2] * m[12] + v[6] * m[13] + v[10] * m[14] + v[14]);
				pixelsPerUnit /= Math.max(depth, 1e-3);
			}
			const halfW = entity._bounds2d.x * Math.hypot(m[0], m[1], m[2]) * pixelsPerUnit * 0.5;
			const halfH = entity._bounds2d.y * Math.hypot(m[4], m[5], m[6]) * pixelsPerUnit * 0.5;
			return Math.abs(screenX - centre.x) <= halfW && Math.abs(screenY - centre.y) <= halfH;
		}

		// Bring the ray into the entity's local space
		const inverse = world.getInverse();
		if (!inverse) return false;
		const n = inverse.matrix;
		const o = ray.origin, d = ray.direction;
		const ox = n[0] * o.x + n[4] * o.y + n[8] * o.z + n[12];
		const oy = n[1] * o.x + n[5] * o.y + n[9] * o.z + n[13];
		const oz = n[2] * o.x + n[6] * o.y + n[10] * o.z + n[14];
		const dx = n[0] * d.x + n[4] * d.y + n[8] * d.z;
		const dy = n[1] * d.x + n[5] * d.y + n[9] * d.z;
		const dz = n[2] * d.x + n[6] * d.y + n[10] * d.z;

		if (isSprite) {
			// Flat sprite: the quad lies on the local z = 0 plane
			if (Math.abs(dz) < 1e-9) return false;
			const t = -oz / dz;
			if (t < 0) return false;
			const x = ox + dx * t, y = oy + dy * t;
			return Math.abs(x) <= entity._bounds2d.x / 2 && Math.abs(y) <= entity._bounds2d.y / 2;
		}

		let box: IgeLocalBox | null = null;
		if (entity._modelParts) {
			box = partsBox(entity._modelParts);
			// Skinned meshes: the box around the animated joints
			const skeleton = entity._skeleton;
			if (skeleton && entity._modelParts.some((part) => part.skinned)) {
				entity._updateSkeletonMatrices();
				const bones = skeletonBox(skeleton.worldMatrices, skeleton.data.boneCount);
				if (bones) {
					const staticBox = box;
					box = { ...bones };
					if (staticBox && staticBox.maxX > staticBox.minX) {
						box.minX = Math.min(box.minX, staticBox.minX); box.minY = Math.min(box.minY, staticBox.minY);
						box.minZ = Math.min(box.minZ, staticBox.minZ); box.maxX = Math.max(box.maxX, staticBox.maxX);
						box.maxY = Math.max(box.maxY, staticBox.maxY); box.maxZ = Math.max(box.maxZ, staticBox.maxZ);
					}
				}
			}
		} else if (entity._geometryData) {
			box = geometryBox(entity._geometryData);
		}
		if (!box) return false;

		// Ray against the box (slab method)
		let tMin = 0, tMax = Infinity;
		const slabs: [number, number, number, number][] = [
			[ox, dx, box.minX, box.maxX],
			[oy, dy, box.minY, box.maxY],
			[oz, dz, box.minZ, box.maxZ]
		];
		for (const [origin, direction, min, max] of slabs) {
			if (Math.abs(direction) < 1e-12) {
				if (origin < min || origin > max) return false;
				continue;
			}
			let t1 = (min - origin) / direction, t2 = (max - origin) / direction;
			if (t1 > t2) [t1, t2] = [t2, t1];
			tMin = Math.max(tMin, t1);
			tMax = Math.min(tMax, t2);
			if (tMin > tMax) return false;
		}

		if (this._pointerPicking === "triangles") {
			return raycastEntities(ray, entity, { children: false }).length > 0;
		}
		return true;
	}

	/**
	 * Gets / sets when split-screen viewports share one directional shadow
	 * map instead of rendering one each. If every viewport's camera target
	 * fits within this fraction of the shadow frustum size (see
	 * shadowManager.frustumSize()), a single map, enlarged to cover them
	 * all, is rendered once per frame. Co-op players usually stay close, so
	 * this often turns four shadow passes into one. 0 disables sharing.
	 * Defaults to 0.35.
	 */
	shadowSharing(): number;
	shadowSharing(threshold: number): this;
	shadowSharing(threshold?: number): number | this {
		if (threshold === undefined) {
			return this._shadowShareThreshold;
		}
		this._shadowShareThreshold = Math.max(0, threshold);
		return this;
	}

	/**
	 * If all viewports share a scene and their camera targets are close
	 * together, render one directional shadow map covering them all.
	 * Returns true when the shared map was rendered for this frame.
	 */
	protected _renderSharedShadowMap(viewports: IgeViewport[]): boolean {
		if (
			this._shadowShareThreshold <= 0 ||
			viewports.length < 2 ||
			!this.shadowsEnabled() ||
			!this._shadowManager ||
			!this._shadowCastingLight
		) {
			return false;
		}

		const scene = viewports[0]._scene;
		let minX = Infinity, minY = Infinity, minZ = Infinity;
		let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

		for (let i = 0; i < viewports.length; i++) {
			const viewport = viewports[i];
			if (viewport._scene !== scene || !viewport.camera) return false;
			const target = (viewport.camera as any)._lookAt as { x: number; y: number; z: number } | undefined;
			const x = target ? target.x : 0, y = target ? target.y : 0, z = target ? target.z : 0;
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (z < minZ) minZ = z;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
			if (z > maxZ) maxZ = z;
		}

		const data = scene && this._sceneData.get(scene);
		if (!data) return false;

		const size = this._shadowManager.frustumSize() as number;
		const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
		const extent = Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
		if (extent > size * this._shadowShareThreshold) {
			return false;
		}

		// Fitted round everything the views see, or the square enlarged just enough to cover every viewport's area
		let fitted = this._shadowFit.enabled && this._fitShadowShared(viewports, !this._shadowCaching, data);
		if (!fitted) {
			this._shadowManager.frustumSize(size + extent);
			fitted = !!this._shadowManager.updateLightSpaceMatrix(
				this._shadowLightId,
				this._shadowCastingLight,
				undefined,
				this._shadowCenter((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
			);
			this._shadowManager.frustumSize(size);
		}

		if (!fitted) return false;

		this._renderDirectionalShadowPass(data);
		this._stateManager?.reset();
		this._canvasContext?.depthFunc(this._canvasContext.LEQUAL);
		this._sharedShadowFrame = this._frameId;
		return true;
	}

	/**
	 * Id of the most recently rendered frame. Compare with an object's
	 * _lastRenderedFrame to tell whether it was drawn last frame.
	 */
	frameId(): number {
		return this._frameId;
	}

	/**
	 * Per-frame rendering statistics for the most recent frame, the GPU's time for a recent frame (`gpuMs`) and the
	 * GPU memory held now (`gpuMemory`).
	 * @example #A frame's GPU time and memory
	 *     const { gpuMs, gpuMemory } = renderer.stats();
	 *     console.log(`${gpuMs?.toFixed(1)} ms, ${(gpuMemory.total / 1048576).toFixed(0)} MB`);
	 */
	stats(): IgeWebGlRenderStats {
		return { ...this._stats, gpuMemory: this.gpuMemory() };
	}

	/**
	 * The GPU memory the renderer holds now, in bytes by kind: mesh vertices and indices (`geometry`), images and
	 * canvases drawn with (`textures`), offscreen frames (`renderTargets`: post-processing, dynamic resolution,
	 * panels, outlines), shadow maps and their static caches (`shadowMaps`), data written each frame (`buffers`:
	 * instances, bones, particles, decals) and an estimate of the canvas's own buffers (`canvas`). Textures are also
	 * split by what they hold (`colorMaps`, `normalMaps`, `otherMaps`, parts of `textures`). Counted from what the
	 * renderer made (each texture by its format and every level of its mip chain), so the driver's own overhead isn't
	 * in it.
	 */
	gpuMemory(): IgeWebGlGpuMemory {
		const m = this._device?.memory() ?? { geometry: 0, textures: 0, renderTargets: 0, shadowMaps: 0, buffers: 0 };
		const roles = this._textureManager?.memoryByRole() ?? { color: 0, normal: 0, data: 0 };
		const textures = m.textures + roles.color + roles.normal + roles.data;
		const canvas = this._canvasBytes();
		return {
			...m, textures, canvas, total: m.geometry + textures + m.renderTargets + m.shadowMaps + m.buffers + canvas,
			// (The device's own textures, glyph pages and the default dots, count as other)
			colorMaps: roles.color, normalMaps: roles.normal, otherMaps: m.textures + roles.data
		};
	}

	/** An estimate of the canvas's own buffers: colour and depth-stencil (each sample, when antialiased, and the resolved colour), and the picture shown. */
	protected _canvasBytes(): number {
		const gl = this._canvasContext;
		if (!gl || this._contextLost) return 0;
		const pixels = gl.drawingBufferWidth * gl.drawingBufferHeight;
		const a = gl.getContextAttributes();
		const depthStencil = a?.depth || a?.stencil ? 4 : 0;
		const perPixel = a?.antialias ? (4 + depthStencil) * 4 + 4 : 4 + depthStencil;
		return pixels * (perPixel + 4);
	}

	/**
	 * Lensing: a distortion that bends each view's picture round a point in the world, with an optional bright ring
	 * and dark core (see IgeLens.ts and guides/phase-effects.md). `lens(id, settings)` makes or changes the lens `id`
	 * and returns it (`set()` / `time()` on it; bind it to an IgeTimeline to animate `effect.strength` and the rest),
	 * `lens(id, null)` removes it, `lens(id)` gives it or undefined. Up to IGE_LENS_MAX act in a view; each view places
	 * them with its own camera (split screen, panels), after the scene and before post-processing.
	 * @example #A collapsing star
	 *     renderer.lens("star", { x: 0, y: 0, z: 0, radius: 400, strength: 0.8, ring: 1 });
	 */
	lens (id: string, input: IgeLensInput | null): IgeLens | undefined;
	lens (id: string): IgeLens | undefined;
	lens (id: string, input?: IgeLensInput | null): IgeLens | undefined {
		if (input === undefined) return this._lenses.get(id);
		if (input === null) {
			this._lenses.delete(id);
			markSceneChanged();
			return undefined;
		}
		let lens = this._lenses.get(id);
		if (!lens) this._lenses.set(id, lens = new IgeLens());
		return lens.set(input);
	}

	/** The ids of the lenses set. */
	lensIds (): string[] {
		return [...this._lenses.keys()];
	}

	/** Lenses over a view just drawn (the framebuffer bound), placed with its camera. */
	protected _applyLenses (viewport: IgeViewport, matrices: IgeCameraMatrices, x: number, y: number, w: number, h: number): void {
		const draws = this._lensDraws;
		draws.length = 0;
		const view = matrices.view.matrix;
		const right = { x: view[0], y: view[4], z: view[8] };
		const rect = { x0: x, y0: y, x1: x + w, y1: y + h };
		const id = viewport.id();
		for (const lens of this._lenses.values()) {
			if (!lens.active() || (lens.viewports && !lens.viewports.includes(id))) continue;
			const screen = igeLensScreen(lens.settings, matrices.viewProjection.matrix, right, rect);
			if (screen) draws.push({ screen, lens });
			if (draws.length >= IGE_LENS_MAX) break;
		}
		if (draws.length === 0) return;
		this._lensPass ??= new IgeLensPass(this._canvasContext as WebGL2RenderingContext);
		// Under linear lighting into post-processing's target (linear light, encoded by its composite) the ring colour
		// goes in as linear light too; straight to the screen or a panel the view's already encoded, so it stays as given
		this._lensPass.apply(draws, x, y, w, h, this._colorVariant === 1 ? igeSrgbToLinear : undefined);
		this._stateManager?.reset();
	}

	/**
	 * Gets / sets whether each frame is timed on the GPU (a timer query round its drawing) for `stats().gpuMs` (on by
	 * default; nothing happens where the browser has no timer query). Dynamic resolution times frames either way.
	 */
	gpuTiming(): boolean;
	gpuTiming(val: boolean): this;
	gpuTiming(val?: boolean): boolean | this {
		if (val === undefined) return this._gpuTiming;
		this._gpuTiming = val;
		if (!val) this._stats.gpuMs = null;
		return this;
	}

	/**
	 * Main scene graph rendering method.
	 * Called once per frame by the engine.
	 *
	 * Work that does not depend on the camera (transforms, skeleton
	 * matrices, the bone palette and point light shadow maps) is done once
	 * per frame here; each viewport then only culls, renders its directional
	 * shadow map and draws its view.
	 */
	renderSceneGraph(engine: IgeEngine, viewports: IgeViewport[]): boolean {
		const gl = this._canvasContext;
		if (!gl || this._contextLost || !this._stateManager) return false;

		this._frameId++;
		if (this._textureManager) this._textureManager.frameId = this._frameId;
		const stats = this._stats;
		stats.drawCalls = 0;
		stats.instancedDrawCalls = 0;
		stats.instances = 0;
		stats.shadowDrawCalls = 0;
		stats.items = 0;
		stats.visibleItems = 0;
		stats.lodItems = 0;
		stats.triangles = 0;
		stats.shadowCacheRebuilds = 0;
		stats.dynamicShadowDraws = 0;
		stats.shadowCacheCopies = 0;
		stats.shadowCastersCulled = 0;
		stats.shadowCascades = 0;
		stats.subtreesCulled = 0;
		this._directionalPassesLastFrame = this._directionalPassesThisFrame;
		this._directionalPassesThisFrame = 0;
		stats.viewports = viewports ? viewports.length : 0;

		// Clear the entire canvas (or the offscreen target, when post-processing)
		const cc = this._clearColor;
		this._stateManager.reset();
		this._stateManager.setScissorTest(false);
		// GPU timing: the scene's time (what dynamic resolution steers by) and what's drawn after it, from a frame or two ago
		const dynamicRes = !!this._dynamicRes?.settings.enabled;
		const timing = dynamicRes || this._gpuTiming;
		let sceneGpuMs: number | null = null;
		if (timing) {
			this._gpuTimer ??= new IgeGpuFrameTimer(gl as WebGL2RenderingContext);
			sceneGpuMs = this._gpuTimer.poll();
			if (this._gpuTiming) {
				this._gpuTimerTail ??= new IgeGpuFrameTimer(gl as WebGL2RenderingContext);
				const tail = this._gpuTimerTail.poll();
				stats.gpuMs = sceneGpuMs === null ? null : sceneGpuMs + (tail ?? 0);
			}
		}
		// Dynamic resolution: the scale for this frame, from how recent frames went
		if (dynamicRes) {
			const eng = ige.engine;
			const cap = eng?._maxRenderRate > 0 ? 1000 / eng._maxRenderRate : 0;
			const continuous = !(eng?._useManualRender || eng?._renderOnDemand);
			this._dynamicRes.frame({ now: performance.now(), gpuMs: sceneGpuMs, continuous, capMs: cap });
		}
		const post = this._postProcessor();
		// (Under linear lighting the offscreen frame holds linear light, encoded by the composite)
		if (post) post.linear = this._linear;
		const postActive = !!post && post.begin(this._canvasElement!.width, this._canvasElement!.height);
		this._frameScale = postActive ? post!.renderScale ?? 1 : 1;
		if (timing) this._gpuTimer?.begin();
		const size = this._frameScale < 1
			? { width: Math.max(1, Math.round(this._canvasElement!.width * this._frameScale)), height: Math.max(1, Math.round(this._canvasElement!.height * this._frameScale)) }
			: { width: this._canvasElement!.width, height: this._canvasElement!.height };
		gl.viewport(0, 0, size.width, size.height);
		// (The clear colour is sRGB: as linear light into a linear offscreen frame, which the composite encodes back)
		if (postActive && this._linear) gl.clearColor(igeSrgbToLinear(cc.r), igeSrgbToLinear(cc.g), igeSrgbToLinear(cc.b), cc.a);
		else gl.clearColor(cc.r, cc.g, cc.b, cc.a);
		gl.depthMask(true);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Enable depth testing for 3D rendering
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		// Enable blending for transparency
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// No main viewport: nothing to draw but the shown panels (a menu-only screen with a panel)
		const hasViews = !!viewports && viewports.length > 0;
		if (!hasViews && !this._panels?.some((p) => p.visible())) {
			if (postActive) {
				post!.end();
				this._stateManager.reset();
			}
			this._gpuTimer?.end();
			return true;
		}

		// Collect renderables once per scene (viewports usually share one)
		this._itemCount = 0;
		this._skeletonRows.clear();
		this._bonePalette?.begin();

		const views: IgeViewport[] = hasViews ? viewports : [];
		this._frameViews = views;
		for (let i = 0; i < views.length; i++) {
			this._collectScene(views[i]._scene);
		}

		// Panels that are shown: placed and advanced, then their scenes collected like the views' (hidden ones cost nothing)
		const panels = (this._visiblePanels ??= []);
		panels.length = 0;
		if (this._panels?.length) {
			const tickDelta = ige.engine._tickDelta;
			for (const panel of this._panels) {
				if (panel.visible() && panel._prepare(this._bounds2d.x, this._bounds2d.y, tickDelta)) {
					panels.push(panel);
					this._collectScene(panel.viewport._scene);
				}
			}
		}
		// Every view's camera is placed now: subtrees culled as one are drawn or left out, and the scenes finished
		this._finishScenes();

		// Upload the bone palette once; every viewport and shadow pass reads it (the passes not yet on the device on
		// BONE_TEXTURE_UNIT, left bound there for the frame)
		this._uploadBonePalette();

		// Point light shadow maps don't depend on the camera: render them once
		if (this._shadowCastingPointLights.length > 0 && this._shadowManager) {
			this._renderPointLightShadowPasses();
			this._stateManager.reset();
			gl.depthFunc(gl.LEQUAL);
		}

		// Close-together split-screen views can share one shadow map
		this._renderSharedShadowMap(views);

		for (let i = 0; i < views.length; i++) {
			this._renderViewport(views[i]);
		}

		// Post-processing: bloom, tone mapping and grading onto the canvas
		if (postActive) {
			// Depth of field turns depth into distance with the main view's camera
			const cam = views[0]?.camera as unknown as { _near?: number; _far?: number; _projectionType?: string } | undefined;
			post!.depthRange(cam?._near || 0.1, cam?._far || 1000, (cam?._projectionType || "perspective") === "perspective");
			post!.end();
			this._stateManager.reset();
		}
		this._gpuTimer?.end();
		this._frameScale = 1;
		if (this._gpuTiming) this._gpuTimerTail?.begin();

		// Outlines round what's marked (IgeEntity.outline()), crisp over the finished frame
		this._renderOutlines();

		// The UI layer: on top of everything, post-processing included, in each view
		this._renderUiLayer(views);

		// Panels over the finished frame, under the overlays
		if (this._visiblePanels?.length) this._renderPanels();

		// Overlays (the document UI) over the whole canvas, last of all
		this._renderOverlays();
		this._gpuTimerTail?.end();

		// Lines queued with debugLine() last one rendered frame
		this._debugLineVertices = 0;

		this._endUploadFrame();
		return true;
	}

	/**
	 * The frame's uploads (the game's since the last frame, and the renderer's) into its stats; then the next frame's
	 * budget starts, and meshes waiting to upload go first while it lasts (the game's and the scene's new ones take
	 * what's left). With meshes still waiting, another frame is due (render on demand).
	 */
	protected _endUploadFrame(): void {
		const stats = this._stats, queue = this._uploadQueue(), frame = queue.frame;
		stats.uploads = frame.uploads;
		stats.uploadBytes = frame.bytes;
		stats.uploadMs = frame.ms;
		queue.beginFrame();
		stats.uploadsQueued = queue.length;
		if (queue.length > 0) markSceneChanged();
	}

	/** True while a model texture that was asked for is still being made (the picture drawn meanwhile isn't final). */
	protected _blobTexturesLoading(): boolean {
		const tm = this._textureManager;
		if (!tm) return false;
		for (const id of this._pendingBlobTextures) if (!tm.hasBlobTexture(id)) return true;
		return false;
	}

	/** Make the next _collectScene of a scene walk it again this frame (its entities changed since it was collected). */
	protected _forgetCollected(scene: IgeObject | undefined): void {
		const data = scene ? this._sceneData.get(scene) : undefined;
		if (data) data.frameId = -1;
	}

	/** Upload the frame's bone palette (skinned items collected so far) and leave it bound on its unit. */
	protected _uploadBonePalette(): void {
		if (!this._bonePalette || this._skeletonRows.size === 0) return;
		const gl = this._canvasContext as WebGL2RenderingContext;
		const device = this._gpuBegin();
		this._bonePalette.upload();
		gl.activeTexture(gl.TEXTURE0 + BONE_TEXTURE_UNIT);
		gl.bindTexture(gl.TEXTURE_2D, webGl2Texture(device, this._bonePalette.texture));
		this._stateManager!.invalidateTextureBindings();
	}

	/**
	 * Collect a scene's renderables for this frame (once per scene, however many views draw it). Subtrees culled as
	 * one (IgeEntity.cullSubtree()) are left for _finishScenes(), which must follow before the scene is drawn.
	 */
	protected _collectScene(scene: IgeObject | undefined): void {
		if (!scene) return;
		let data = this._sceneData.get(scene);
		if (!data) {
			data = { frameId: -1, models: [], sprites: [], particles: [], decals: [], ui: [], uiSettings: [], minY: Infinity, maxY: -Infinity, deferred: [] };
			this._sceneData.set(scene, data);
		}

		if (data.frameId !== this._frameId) {
			data.frameId = this._frameId;
			data.models.length = 0;
			data.sprites.length = 0;
			data.particles.length = 0;
			data.decals.length = 0;
			data.ui.length = 0;
			data.uiSettings.length = 0;
			data.deferred.length = 0;
			this._collectRenderables(scene, data);
			(this._collectedScenes ??= []).push(scene);
		}
	}

	/**
	 * Finish the scenes collected since last time, now every view's camera is placed: the heights that can take a
	 * shadow measured, each subtree culled as one that was left for now drawn (walked) or left out, and the particles
	 * and decals uploaded.
	 */
	protected _finishScenes(): void {
		const scenes = (this._collectedScenes ??= []);
		for (let i = 0; i < scenes.length; i++) {
			const scene = scenes[i];
			const data = this._sceneData.get(scene);
			if (!data) continue;
			this._measureHeights(data);
			if (data.deferred.length) this._decideSubtrees(scene, data);
			if (data.particles.length || data.decals.length) this._gpuBegin();
			for (let p = 0; p < data.particles.length; p++) {
				this._uploadInstanceData(data.particles[p], PARTICLE_FLOATS);
			}
			for (let d = 0; d < data.decals.length; d++) {
				this._uploadInstanceData(data.decals[d], DECAL_INSTANCE_FLOATS);
			}
			this._stats.items += data.models.length + data.sprites.length;
		}
		scenes.length = 0;
	}

	/**
	 * The lowest and highest points of a scene's opaque meshes (world y, from each mesh's bounding box turned into
	 * the world; skinned ones from their sphere): what can take a shadow, for shadowFit()'s "auto" heights.
	 */
	protected _measureHeights(data: IgeWebGlSceneFrameData): void {
		let minY = Infinity, maxY = -Infinity;
		const models = data.models;
		for (let i = 0; i < models.length; i++) {
			const item = models[i];
			if (item.transparent || item.shadowOnly || item.radius < 0) continue;
			const g = item.geometry, m = item.worldMatrix;
			const half = item.skeleton || g.boundsHalfY < 0
				? item.radius
				: Math.abs(m[1]) * g.boundsHalfX + Math.abs(m[5]) * g.boundsHalfY + Math.abs(m[9]) * g.boundsHalfZ;
			if (item.cy - half < minY) minY = item.cy - half;
			if (item.cy + half > maxY) maxY = item.cy + half;
		}
		// Subtrees culled as one, not walked yet: their boxes (whether they're drawn or not, so the band stays put)
		const deferred = data.deferred, heights = (this._subtreeHeights ??= { min: 0, max: 0 });
		for (let i = 0; i < deferred.length; i++) {
			const root = deferred[i], cull = root._subtreeCull;
			if (!cull || cull.empty() || !root._worldMatrix4) continue;
			igeSubtreeHeights(root._worldMatrix4.matrix, cull, heights);
			if (heights.min < minY) minY = heights.min;
			if (heights.max > maxY) maxY = heights.max;
		}
		data.minY = minY;
		data.maxY = maxY;
	}

	/**
	 * Walk a scene graph once, refreshing transforms and turning every
	 * renderable entity into pooled render items with world-space bounds.
	 * `group`: the nearest entity above culled with everything under it
	 * (IgeEntity.cullSubtree()), whose box this entity's meshes go into.
	 */
	protected _collectRenderables(obj: IgeObject, data: IgeWebGlSceneFrameData, isSceneRoot: boolean = true, ui?: IgeUiSettings, group?: IgeSubtreeCull): void {
		if (obj._hidden) {
			return;
		}

		// Ensure matrices are current. The scene root itself is skipped: the
		// engine's update pass has already positioned it, and viewports each
		// re-parent a shared scene to themselves, so updating it here would
		// flip its parent mid-frame and invalidate every child's cached
		// transform. updateTransform() is a cheap no-op for unchanged entities.
		if (!isSceneRoot && typeof (obj as IgeEntity).updateTransform === "function") {
			(obj as IgeEntity).updateTransform();
		}

		// Entity preTick behaviours: the Canvas 2D renderer runs them as it
		// draws each entity; here they run once per frame, with a 2D context
		// whose drawing calls do nothing, so logic in them still works
		const behaviours = (obj as any)._behaviours;
		if (behaviours && behaviours[IgeBehaviourType.preTick]?.length) {
			obj._processBehaviours(IgeBehaviourType.preTick, this._tickContext);
			// (Culled as one, the subtree above would skip them: it's walked every frame instead)
			if (group) group.volatile = true;
		}

		// Culled with everything under it (unless it's in the UI layer, which is drawn wherever it is)
		const cull = obj._subtreeCull;
		if (cull && !isSceneRoot && !ui && !(obj as IgeEntity)._ui) {
			this._collectSubtree(obj as IgeEntity, cull, data, group);
			return;
		}

		this._collectContent(obj, data, ui, group);
	}

	/** An entity's own renderables (its transform current, its behaviours run), then its children's. */
	protected _collectContent(obj: IgeObject, data: IgeWebGlSceneFrameData, ui: IgeUiSettings | undefined, group: IgeSubtreeCull | undefined): void {
		const entity = obj as IgeEntity;
		const geometryData = entity._geometryData;
		const parts = entity._modelParts;
		// The UI layer (IgeEntity.uiLayer()): its own settings, or its UI ancestor's
		const uiHere = entity._ui ?? ui;
		if (uiHere) {
			if (entity._texture) {
				data.ui.push(entity);
				data.uiSettings.push(uiHere);
			}
		} else if ((obj as unknown as IgeParticleSystem3d)._isParticleSystem3d) {
			data.particles.push(obj as unknown as IgeParticleSystem3d);
		} else if ((obj as unknown as IgeDecalSystem3d)._isDecalSystem3d) {
			data.decals.push(obj as unknown as IgeDecalSystem3d);
		} else if (parts && parts.length > 0) {
			this._addModelParts(entity, parts, data);
		} else if (geometryData && (geometryData.vertices || geometryData.packed || geometryData.gpuOnly)) {
			// Plain geometry LOD applies only to the geometry it was made for
			const lod = entity._modelLod;
			const useLod = !!lod && lod.source === geometryData;
			let item = this._addModelItem(
				entity,
				geometryData,
				entity._materialData,
				null,
				entity._worldMatrix4?.matrix,
				useLod ? lod!.partGeometries[0] : null,
				useLod ? lod!.screenSizes : null
			);
			if (item) {
				(this._drawnGeometry ??= new WeakMap()).set(entity, geometryData);
			} else if (!geometryData.gpuOnly) {
				// Its mesh is waiting to upload (uploadBudget()): the one it drew before meanwhile, if that's still up
				const before = this._drawnGeometry?.get(entity);
				if (before && before !== geometryData && this._geometryManager?.hasGeometry(before.id)) {
					item = this._addModelItem(entity, before, entity._materialData, null, entity._worldMatrix4?.matrix);
				}
			}
			if (item) data.models.push(item);
		} else if (entity._texture) {
			data.sprites.push(entity);
		}

		// What it draws goes into the box of the subtree it's culled with
		if (group) this._subtreeContentBox(entity, group, uiHere);

		const children = obj._children;
		if (children) {
			for (let i = 0; i < children.length; i++) {
				this._collectRenderables(children[i], data, false, uiHere, group);
			}
		}
	}

	/**
	 * An entity culled with everything under it (IgeEntity.cullSubtree()), reached by the walk. With its box known (and
	 * grown round what changed under it), it's left for _finishScenes() to draw or leave out once every view's camera
	 * is placed (or then and there, while that's happening); otherwise it's walked, taking its box as it goes. Either
	 * way its box goes into the box of the subtree above it, if any.
	 */
	protected _collectSubtree(root: IgeEntity, cull: IgeSubtreeCull, data: IgeWebGlSceneFrameData, group: IgeSubtreeCull | undefined): void {
		if (cull.valid && !cull.volatile && this._subtreeRefresh(root, cull)) {
			if (!this._subtreeViews) {
				data.deferred.push(root);
				this._subtreeInto(group, root, cull);
				return;
			}
			if (!this._subtreeVisible(root, cull)) {
				this._subtreeCulled(cull);
				this._subtreeInto(group, root, cull);
				return;
			}
		}
		this._walkSubtree(root, cull, data, group);
	}

	/**
	 * Walk a subtree culled as one (drawing what's in it). Its box is taken afresh as it goes, unless it's known and up
	 * to date (then it's kept, but taken afresh every SUBTREE_RETAKE_WALKS walks, to shrink round what's there now).
	 */
	protected _walkSubtree(root: IgeEntity, cull: IgeSubtreeCull, data: IgeWebGlSceneFrameData, group: IgeSubtreeCull | undefined): void {
		if (cull.valid && !cull.volatile && cull.changedCount === 0 && cull.keptWalks < SUBTREE_RETAKE_WALKS) {
			// (Anything changed meanwhile is noted for next time; anything that can't be bounded is still noticed)
			cull.keptWalks++;
			cull.boxing = false;
			try {
				this._collectContent(root, data, undefined, cull);
			} finally {
				cull.boxing = true;
			}
			this._subtreeInto(group, root, cull);
			return;
		}
		cull.keptWalks = 0;
		cull.clear();
		const m = root._worldMatrix4?.matrix;
		if (!m || !igeAffineInvert(m, cull.inv)) {
			// No world matrix to take a box in (not built yet, or a zero scale): walked with what's above it, its box left
			cull.invalidate();
			this._collectContent(root, data, undefined, group);
			return;
		}
		// (Changes noted while it's walked are taken in by the walk itself)
		cull.valid = false;
		this._collectContent(root, data, undefined, cull);
		cull.valid = true;
		this._subtreeInto(group, root, cull);
	}

	/** A subtree culled as one was left out of this frame. */
	protected _subtreeCulled(cull: IgeSubtreeCull): void {
		cull.culledFrame = this._frameId;
		this._stats.subtreesCulled++;
	}

	/** A subtree's box into the box of the subtree above it (or its volatility). */
	protected _subtreeInto(group: IgeSubtreeCull | undefined, root: IgeEntity, cull: IgeSubtreeCull): void {
		if (!group) return;
		if (cull.volatile) {
			group.volatile = true;
			return;
		}
		// (One whose box is kept holds this one's already)
		if (!group.boxing || !root._worldMatrix4) return;
		group.addSubtree(igeAffineMultiply(group.toRoot, group.inv, root._worldMatrix4.matrix), cull);
	}

	/**
	 * Grow a subtree's box round the entities noted as changed under it since it was taken. Returns false when the box
	 * can't be used (it's to be taken again by a walk): something changed can't be bounded without walking it every
	 * frame, the entity itself changed what it draws, or too much keeps changing.
	 */
	protected _subtreeRefresh(root: IgeEntity, cull: IgeSubtreeCull): boolean {
		if (cull.changedCount === 0) return true;
		const m = root._worldMatrix4?.matrix;
		if (!m || !igeAffineInvert(m, cull.inv)) {
			cull.invalidate();
			return false;
		}
		const path = (this._subtreePath ??= []);
		// (Bringing transforms up to date can note more: they're taken in a second go, which notes no more)
		for (let pass = 0; cull.changedCount > 0; pass++) {
			if (pass === 3) {
				cull.invalidate();
				return false;
			}
			const count = cull.take(), list = cull.taken;
			for (let i = 0; i < count; i++) {
				const obj = list[i];
				if (obj === root) {
					cull.done();
					cull.invalidate();
					return false;
				}
				if (!obj._alive) continue;
				// Still under the root and shown: anything else draws nothing here now (its old box stays, only too big)
				path.length = 0;
				let o: IgeObject | null = obj, shown = true;
				for (; o && o !== root; o = o._parent) {
					if (o._hidden) shown = false;
					path.push(o);
				}
				if (o !== root || !shown) continue;
				// Its transform and those above it, from the root down (they may have moved since the engine's update)
				for (let k = path.length - 1; k >= 0; k--) {
					const e = path[k] as IgeEntity;
					if (typeof e.updateTransform === "function") e.updateTransform();
				}
				this._subtreeBox(obj as IgeEntity, cull);
				if (cull.volatile) {
					cull.done();
					return false;
				}
			}
			cull.done();
		}
		return true;
	}

	/** Grow a subtree's box round an entity under it and everything under that (its transform current), as drawn. */
	protected _subtreeBox(entity: IgeEntity, cull: IgeSubtreeCull): void {
		const behaviours = (entity as any)._behaviours;
		if (behaviours && behaviours[IgeBehaviourType.preTick]?.length) {
			cull.volatile = true;
			return;
		}
		this._subtreeContentBox(entity, cull, undefined);
		const children = entity._children;
		for (let i = 0; i < children.length && !cull.volatile; i++) {
			const child = children[i] as IgeEntity;
			if (child._hidden) continue;
			if (typeof child.updateTransform === "function") child.updateTransform();
			this._subtreeBox(child, cull);
		}
	}

	/**
	 * Grow a subtree's box round what one entity under it draws itself, as _collectContent() would draw it; or mark
	 * the subtree volatile when that can't be bounded without walking it every frame.
	 */
	protected _subtreeContentBox(entity: IgeEntity, cull: IgeSubtreeCull, ui: IgeUiSettings | undefined): void {
		if (ui || entity._ui || entity._skeleton || entity._attachBone !== undefined ||
			(entity as unknown as IgeParticleSystem3d)._isParticleSystem3d || (entity as unknown as IgeDecalSystem3d)._isDecalSystem3d) {
			// UI elements go where they're pinned, skinned meshes where their bones are, the rest where they are emitted
			cull.volatile = true;
			return;
		}
		const world = entity._worldMatrix4?.matrix;
		if (!world || !cull.boxing) return;
		const parts = entity._modelParts;
		const geometryData = entity._geometryData;
		if (parts && parts.length > 0) {
			// (Every part, shown or not: one shown later needs no note)
			const box = this._subtreePartsBox(parts);
			if (!box) {
				// A skinned part goes where its bones are; a part with no bounds is drawn wherever it is
				cull.volatile = true;
				return;
			}
			cull.addBox(igeAffineMultiply(cull.toRoot, cull.inv, world), box.minX, box.minY, box.minZ, box.maxX, box.maxY, box.maxZ);
		} else if (geometryData && (geometryData.vertices || geometryData.packed || geometryData.gpuOnly)) {
			const toRoot = igeAffineMultiply(cull.toRoot, cull.inv, world);
			let box = this._subtreeMeshBox(geometryData);
			// (And the mesh it draws while a new one waits to upload)
			const before = this._uploads?.limited ? this._drawnGeometry?.get(entity) : undefined;
			if (box && before && before !== geometryData) {
				const was = this._subtreeMeshBox(before);
				if (was) cull.addBox(toRoot, was.minX, was.minY, was.minZ, was.maxX, was.maxY, was.maxZ);
				else box = null;
			}
			if (!box) {
				// No bounds: drawn wherever it is, never culled
				cull.volatile = true;
				return;
			}
			cull.addBox(toRoot, box.minX, box.minY, box.minZ, box.maxX, box.maxY, box.maxZ);
		} else if (entity._texture) {
			// A sprite: the sphere its quad turns in (as the views cull it), from its middle
			const inv = cull.inv;
			const x = world[12], y = world[13], z = world[14];
			const worldScale = Math.sqrt(Math.max(
				world[0] * world[0] + world[1] * world[1] + world[2] * world[2],
				world[4] * world[4] + world[5] * world[5] + world[6] * world[6]
			));
			const radius = Math.max(entity._bounds2d.x, entity._bounds2d.y) * 0.75 *
				Math.max(Math.abs(entity._scale.x), Math.abs(entity._scale.y), worldScale, 1e-6);
			const invScale = Math.sqrt(Math.max(
				inv[0] * inv[0] + inv[1] * inv[1] + inv[2] * inv[2],
				inv[4] * inv[4] + inv[5] * inv[5] + inv[6] * inv[6],
				inv[8] * inv[8] + inv[9] * inv[9] + inv[10] * inv[10]
			));
			cull.addSphere(
				inv[0] * x + inv[4] * y + inv[8] * z + inv[12],
				inv[1] * x + inv[5] * y + inv[9] * z + inv[13],
				inv[2] * x + inv[6] * y + inv[10] * z + inv[14],
				radius * invScale
			);
		}
	}

	/**
	 * A model's box in its own space, every part's mesh with its node transform (cached); null when a part is skinned
	 * (it goes where its bones are) or has no bounds.
	 */
	protected _subtreePartsBox(parts: IgeModelPart[]): IgeLocalBox | null {
		const cached = subtreePartsBoxCache.get(parts);
		if (cached) return cached;
		const box: IgeLocalBox = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
		for (const part of parts) {
			if (part.skinned) return null;
			const b = this._subtreeMeshBox(part.geometryData);
			if (!b) return null;
			const m = part.matrix;
			for (let c = 0; c < 8; c++) {
				const x = c & 1 ? b.maxX : b.minX, y = c & 2 ? b.maxY : b.minY, z = c & 4 ? b.maxZ : b.minZ;
				const wx = m ? m[0] * x + m[4] * y + m[8] * z + m[12] : x;
				const wy = m ? m[1] * x + m[5] * y + m[9] * z + m[13] : y;
				const wz = m ? m[2] * x + m[6] * y + m[10] * z + m[14] : z;
				if (wx < box.minX) box.minX = wx;
				if (wy < box.minY) box.minY = wy;
				if (wz < box.minZ) box.minZ = wz;
				if (wx > box.maxX) box.maxX = wx;
				if (wy > box.maxY) box.maxY = wy;
				if (wz > box.maxZ) box.maxZ = wz;
			}
		}
		subtreePartsBoxCache.set(parts, box);
		return box;
	}

	/** A mesh's box in its own space: its data's, else its uploaded copy's; null when it has none. */
	protected _subtreeMeshBox(data: IgeGeometryData3d): IgeLocalBox | null {
		const box = geometryBox(data);
		if (box) return box;
		const sphere = data.boundingSphere;
		if (sphere) {
			const [x, y, z] = sphere.center, r = sphere.radius;
			return { minX: x - r, minY: y - r, minZ: z - r, maxX: x + r, maxY: y + r, maxZ: z + r };
		}
		const g = this._geometryManager?.getGeometry(data.id);
		if (!g || g.boundsRadius < 0) return null;
		return {
			minX: g.boundsCenterX - g.boundsHalfX, minY: g.boundsCenterY - g.boundsHalfY, minZ: g.boundsCenterZ - g.boundsHalfZ,
			maxX: g.boundsCenterX + g.boundsHalfX, maxY: g.boundsCenterY + g.boundsHalfY, maxZ: g.boundsCenterZ + g.boundsHalfZ
		};
	}

	/**
	 * Draw or leave out each subtree culled as one that the walk of a scene left for now: its box (grown round what
	 * changed since) tested against every view of the scene, and the shadow it could cast into one.
	 */
	protected _decideSubtrees(scene: IgeObject, data: IgeWebGlSceneFrameData): void {
		const deferred = data.deferred;
		this._shadowFitBand(data);
		this._subtreeFloor = this._shadowBandMin;
		const views = this._subtreeViewsOf(scene);
		this._subtreeViews = views;
		try {
			for (let i = 0; i < deferred.length; i++) {
				const root = deferred[i], cull = root._subtreeCull;
				// (Destroyed or hidden by a later preTick behaviour: nothing to draw)
				if (!root._alive || root._hidden) continue;
				if (!cull) {
					// (cullSubtree(false) since: walked as usual)
					this._collectContent(root, data, undefined, undefined);
					continue;
				}
				// (A later preTick behaviour may have moved it)
				root.updateTransform();
				// No view to test against (nothing would show it): walked, as if this were off
				if (views.length === 0 || !this._subtreeRefresh(root, cull) || this._subtreeVisible(root, cull)) {
					this._walkSubtree(root, cull, data, undefined);
				} else {
					this._subtreeCulled(cull);
				}
			}
		} finally {
			this._subtreeViews = null;
		}
	}

	/**
	 * The views of a scene (the frame's viewports showing it, and its shown panels), each with its frustum as it will
	 * be drawn and how its shadows fall; and the shadow-casting point lights that reach it (_subtreePoints).
	 */
	protected _subtreeViewsOf(scene: IgeObject): IgeSubtreeView[] {
		const pool = (this._subtreeViewPool ??= []);
		const views: IgeSubtreeView[] = [];
		const points = (this._subtreePoints ??= []);
		points.length = 0;
		const add = (viewport: IgeViewport, light: IgeDirectionalLight | null | undefined) => {
			const camera = viewport.camera;
			if (!camera || !this._cameraController) return;
			const matrices = this._cameraController.updateCamera(camera, viewport);
			const view = (pool[views.length] ??= {
				frustum: new IgeFrustum(), shadow: false, sweep: false, lx: 0, ly: -1, lz: 0, margin: 0
			});
			for (let p = 0; p < 6; p++) {
				const from = matrices.frustum.planes[p];
				view.frustum.planes[p].set(from.a, from.b, from.c, from.d);
			}
			view.shadow = !!light && !!this._shadowManager && this.shadowsEnabled();
			if (view.shadow) {
				const d = light!.direction() as { x: number; y: number; z: number };
				const len = Math.hypot(d.x, d.y, d.z) || 1;
				view.lx = d.x / len;
				view.ly = d.y / len;
				view.lz = d.z / len;
				// (A light from below or the side, or no floor known: where its shadows land can't be bounded)
				view.sweep = view.ly < -0.05 && Number.isFinite(this._subtreeFloor);
				// As the pass's caster culling allows, measured on the whole map: a fiftieth of its half-size
				const reach = this._shadowFit.enabled ? this._shadowFitDistance(camera, matrices) : (this._shadowManager!.frustumSize() as number);
				view.margin = SHADOW_CULL_MARGIN * reach;
			}
			views.push(view);
		};
		let main = false;
		for (const viewport of this._frameViews ?? []) {
			if (viewport._scene !== scene) continue;
			this._applyDefaultCameraPreset(viewport);
			add(viewport, this._shadowCastingLight);
			main = true;
		}
		for (const panel of this._visiblePanels ?? []) {
			if (panel.viewport._scene === scene) add(panel.viewport, panel._shadowLight);
		}
		// Point light shadows are drawn for the main views (from every scene's casters)
		if (main && this._shadowManager) {
			for (const light of this._shadowCastingPointLights) {
				const data = this._shadowManager.getPointShadowMapData(light.id());
				const far = data?.farPlane ?? ((light as any)._range as number || 500);
				points.push(light._translate.x, light._translate.y, light._translate.z, far);
			}
		}
		return views;
	}

	/** Whether a subtree culled as one (its box current) or the shadow it can cast reaches any view of its scene. */
	protected _subtreeVisible(root: IgeEntity, cull: IgeSubtreeCull): boolean {
		// Nothing drawn under it
		if (cull.empty()) return false;
		const m = root._worldMatrix4?.matrix;
		if (!m) return true;
		const views = this._subtreeViews!;
		let heights = false;
		for (let i = 0; i < views.length; i++) {
			const view = views[i];
			if (!igeSubtreeOutside(view.frustum, m, cull)) return true;
			if (!view.shadow) continue;
			if (!view.sweep) return true;
			// Its shadow runs down the light from it to the lowest surface that takes one
			if (!heights) {
				igeSubtreeHeights(m, cull, (this._subtreeHeights ??= { min: 0, max: 0 }));
				heights = true;
			}
			const reach = Math.max(0, this._subtreeHeights.max - this._subtreeFloor) / -view.ly;
			if (!igeSubtreeOutside(view.frustum, m, cull, view.margin, view.lx, view.ly, view.lz, 0, reach)) return true;
		}
		const points = this._subtreePoints;
		if (points.length) {
			const c = (this._subtreeCentre ??= { x: 0, y: 0, z: 0 });
			const radius = igeSubtreeSphere(m, cull, c);
			for (let i = 0; i < points.length; i += 4) {
				const reach = points[i + 3] + radius;
				const dx = c.x - points[i], dy = c.y - points[i + 1], dz = c.z - points[i + 2];
				if (dx * dx + dy * dy + dz * dz <= reach * reach) return true;
			}
		}
		return false;
	}

	/**
	 * The UI layer (IgeEntity.uiLayer()): every viewport's UI elements over
	 * all it has drawn (and the post-processing), with no depth test, in
	 * layer order (see IgeUiLayout's compareUi). Each view draws its own,
	 * clipped to its area, so split screen works.
	 */
	protected _renderUiLayer(viewports: IgeViewport[]): void {
		const gl = this._canvasContext;
		if (!gl || !viewports || !this._textureManager || !this._stateManager) return;
		const dpr = this._devicePixelRatio;
		let drew = false;
		for (const viewport of viewports) {
			const scene = viewport._scene;
			const data = scene ? this._sceneData.get(scene) : undefined;
			const view = this._uiViews.get(viewport);
			if (!data || data.ui.length === 0 || !view || view.frameId !== this._frameId) continue;
			const quads = this._uiQuads;
			quads.length = 0;
			for (let i = 0; i < data.ui.length; i++) {
				const quad = this._uiQuad(data.ui[i], data.uiSettings[i], view, i);
				if (quad) quads.push(quad);
			}
			if (quads.length === 0) continue;
			this._uiPass ??= new IgeWebGlUiPass(gl);
			const vpX = Math.floor((viewport._translate?.x || 0) * dpr);
			const vpY = Math.floor((viewport._translate?.y || 0) * dpr);
			this._stats.drawCalls += this._uiPass.draw(quads, vpX, vpY, view.width, view.height, dpr, this._textureManager.getDefaultWhiteTexture());
			drew = true;
		}
		if (drew) {
			// The pass set GL state behind the state cache's back
			this._stateManager.reset();
			gl.depthFunc(gl.LEQUAL);
		}
	}

	/** One UI element placed in a view, with its texture and colour (or nothing, when it isn't on screen). */
	protected _uiQuad(entity: IgeEntity, settings: IgeUiSettings, view: IgeUiView & { frameId: number }, order: number): IgeUiQuad | undefined {
		const world = entity._worldMatrix4?.matrix;
		const texture = entity._texture;
		if (!world || !texture || entity._opacity <= 0) return;
		const rect = placeUi(settings, world, entity._bounds2d.x, entity._bounds2d.y, entity._scale.x, entity._scale.y, view);
		if (!rect) return;

		// Smart textures and font sheets draw per entity; anything else is its image (or a sheet's cell)
		let glTexture: WebGLTexture | null;
		let u0 = 0, v0 = 0, u1 = 1, v1 = 1;
		if (texture._renderMode === IgeTextureRenderMode.smartTexture || texture._rendersPerEntity) {
			glTexture = this._textureManager!.getSmartTexture(texture, entity, this._devicePixelRatio, this._frameId);
		} else {
			glTexture = this._textureManager!.getTextureForIgeTexture(texture);
			const cells = (texture as any)._cells as number[][] | undefined;
			const cell = cells && entity._cell ? cells[entity._cell] : undefined;
			const texW = (texture as any)._sizeX as number, texH = (texture as any)._sizeY as number;
			if (cell && texW > 0 && texH > 0) {
				u0 = cell[0] / texW;
				v0 = cell[1] / texH;
				u1 = (cell[0] + cell[2]) / texW;
				v1 = (cell[1] + cell[3]) / texH;
			}
		}
		// Still loading: skip it rather than flash a white quad
		if (!glTexture) return;

		let r = 1, g = 1, b = 1, a = 1;
		const color = entity._materialData?.color;
		if (color && typeof color === "object") {
			r = color.r;
			g = color.g;
			b = color.b;
			a = color.a ?? 1;
		} else if (typeof color === "string") {
			[r, g, b] = parseHexColor(color);
		}
		return { ...rect, layer: settings.layer, space: settings.space, order, texture: glTexture, u0, v0, u1, v1, r, g, b, a: a * entity._opacity, rotation: entity._rotate.z };
	}

	/**
	 * Add one render item per part of an entity's model. Parts with their
	 * own node transform get a world matrix of entity world * part matrix,
	 * kept in a per-entity buffer; the rest share the entity's matrix. The
	 * entity's own _materialData (if any) overrides the parts' materials.
	 */
	protected _addModelParts(entity: IgeEntity, parts: IgeModelPart[], data: IgeWebGlSceneFrameData): void {
		const world = entity._worldMatrix4?.matrix;
		if (!world) return;

		const modelLod = entity._modelLod;
		const lod = modelLod && !modelLod.source && modelLod.partGeometries.length === parts.length ? modelLod : undefined;

		let matrices = entity._modelPartMatrices;
		if (!matrices || matrices.length !== parts.length) {
			matrices = entity._modelPartMatrices = parts.map((part) => (part.matrix ? new Float32Array(16) : world));
		}

		const shown = entity._modelPartsShown;
		// With an upload budget, a model is drawn once all its meshes are up, not a part at a time
		if (this._uploadQueue().limited) {
			let ready = true;
			for (let i = 0; i < parts.length; i++) {
				if ((!shown || shown[i]) && !this._getGeometry(parts[i].geometryData)) ready = false;
			}
			if (!ready) return;
		}
		for (let i = 0; i < parts.length; i++) {
			if (shown && !shown[i]) continue;
			const part = parts[i];
			let partWorld = world;
			if (part.matrix) {
				partWorld = matrices[i];
				multiplyMat4Into(partWorld, world, part.matrix);
			}

			const item = this._addModelItem(
				entity,
				part.geometryData,
				part.materialData,
				entity._materialData,
				partWorld,
				lod ? lod.partGeometries[i] : null,
				lod ? lod.screenSizes : null
			);
			if (item) data.models.push(item);
		}
	}

	/**
	 * Start uploading a model texture image (once); it is used as soon as
	 * the upload completes.
	 */
	protected _requestBlobTexture(textureId: string, blob: Blob, sampler?: IgeMaterialData["textureSampler"], mipmaps: boolean = !!this._modelTextureMipmaps, srgb: boolean = false, role: IgeTextureRole = "color"): void {
		const key = igeTextureKey(textureId, srgb);
		if (!this._textureManager || this._pendingBlobTextures.has(key)) return;

		this._pendingBlobTextures.add(key);
		this._textureManager.createTextureFromBlob(textureId, blob, sampler, mipmaps, srgb, role).then((texture) => {
			if (!texture) {
				this.log(`Failed to create model texture "${textureId}"`, "warning");
			} else {
				// (Made: no longer waited for. Its copy in the other colour space may since have gone, see linearLighting())
				this._pendingBlobTextures.delete(key);
			}
			markSceneChanged();
		});
	}

	/**
	 * Create (or reuse) a pooled render item for one mesh of an entity.
	 * @param materialData The mesh's material.
	 * @param overrideData Optional per-entity material values that replace
	 * the mesh material's (used for model parts).
	 * @param worldMatrix World matrix to draw with (defaults to the entity's).
	 * @param lodGeometryData Lower-detail versions of the mesh, if any.
	 * @param lodSizes Screen sizes below which each lower level is used.
	 */
	protected _addModelItem(
		entity: IgeEntity,
		geometryData: IgeGeometryData3d,
		materialData: IgeMaterialData | null,
		overrideData: IgeMaterialData | null = null,
		worldMatrix: Float32Array | undefined = entity._worldMatrix4?.matrix,
		lodGeometryData: IgeGeometryData3d[] | null = null,
		lodSizes: number[] | null = null
	): IgeWebGlRenderItem | undefined {
		if (!worldMatrix) {
			return;
		}

		const geometry = this._getGeometry(geometryData);
		if (!geometry) return;

		let item = this._itemPool[this._itemCount];
		if (!item) {
			item = {
				entity,
				geometry,
				materialData: null,
				material: {
					r: 1, g: 1, b: 1, a: 1,
					metallic: 0, roughness: 0.5,
					emissiveR: 0, emissiveG: 0, emissiveB: 0, emissiveIntensity: 0,
					opacity: 1,
					uvScaleU: 1, uvScaleV: 1, uvOffsetU: 0, uvOffsetV: 0
				},
				textureKey: "",
				boneRow: -1,
				transparent: false,
				doubleSided: false,
				castShadow: true,
				shadowOnly: false,
				worldMatrix,
				cx: 0, cy: 0, cz: 0, radius: -1,
				sortKey: 0,
				batchKey: "",
				depthKey: "",
				lodSizes: null,
				lodRadius: 0,
				lodLevel: 0,
				lodGeometries: [],
				lodBatchKeys: [],
				lodDepthKeys: [],
				drawGeometry: geometry,
				mapBlobIds: [undefined, undefined, undefined],
				mapTextures: [undefined, undefined, undefined],
				mapKey: "",
				normalScale: 1,
				aoStrength: 1
			} as IgeWebGlRenderItem;
			this._itemPool[this._itemCount] = item;
		}
		this._itemCount++;

		item.entity = entity;
		item.geometry = geometry;
		item.drawGeometry = geometry;
		item.materialData = materialData;
		item.worldMatrix = worldMatrix;

		// Resolve material values
		const mat = item.material;
		mat.r = 1; mat.g = 1; mat.b = 1; mat.a = 1;
		mat.metallic = 0;
		mat.roughness = 0.5;
		mat.emissiveR = 0; mat.emissiveG = 0; mat.emissiveB = 0;
		mat.emissiveIntensity = 0;
		mat.opacity = entity._opacity;
		mat.uvScaleU = 1; mat.uvScaleV = 1; mat.uvOffsetU = 0; mat.uvOffsetV = 0;

		item.blobTextureId = undefined;
		item.texture = entity._texture;
		item.emissiveBlobTextureId = undefined;
		item.emissiveTexture = undefined;
		item.emissivePending = false;
		item.mapBlobIds[0] = item.mapBlobIds[1] = item.mapBlobIds[2] = undefined;
		item.mapTextures[0] = item.mapTextures[1] = item.mapTextures[2] = undefined;
		item.normalScale = 1;
		item.aoStrength = 1;

		if (materialData) {
			this._applyMaterialData(item, materialData);
		}
		if (overrideData) {
			this._applyMaterialData(item, overrideData);
		}
		// An emissive map still loading: no glow until it's there (else the base texture would glow in its place)
		if (item.emissivePending && !item.emissiveBlobTextureId && !item.emissiveTexture) mat.emissiveIntensity = 0;
		// (set by _applyMaterialData, so read back through the item's type)
		// Material maps: the normal map needs a mesh with tangents, the others PBR lighting; what can't act is left
		// out, so it costs no batch split, texture upload or bind
		if (!geometry.hasTangents) item.mapBlobIds[MAP_NORMAL] = item.mapTextures[MAP_NORMAL] = undefined;
		if (!this._pbr) {
			item.mapBlobIds[MAP_METALLIC_ROUGHNESS] = item.mapTextures[MAP_METALLIC_ROUGHNESS] = undefined;
			item.mapBlobIds[MAP_AO] = item.mapTextures[MAP_AO] = undefined;
		}
		let mapKey = "";
		for (let k = 0; k < 3; k++) {
			const id = item.mapBlobIds[k], texture = item.mapTextures[k];
			if (id || texture) mapKey += `|m${k}` + (id ?? ((texture as any)._id || texture!.id()));
		}
		if (mapKey) {
			if (item.mapBlobIds[MAP_NORMAL] || item.mapTextures[MAP_NORMAL]) mapKey += `|ns${item.normalScale}`;
			if (item.mapBlobIds[MAP_AO] || item.mapTextures[MAP_AO]) mapKey += `|as${item.aoStrength}`;
		}
		item.mapKey = mapKey;
		const emissiveMap = item.emissiveTexture as IgeTexture | undefined;
		const emissiveKey = item.emissiveBlobTextureId
			? "|e" + item.emissiveBlobTextureId
			: emissiveMap ? "|e" + ((emissiveMap as any)._id || emissiveMap.id()) : "";

		if (item.blobTextureId) {
			item.textureKey = item.blobTextureId;
		} else if (item.texture) {
			item.textureKey = (item.texture as any)._id || item.texture.id();
		} else {
			item.textureKey = "";
		}

		// Its silhouette colour and level-of-detail fade: its own, or the nearest ancestor's
		let occluded: { r: number; g: number; b: number; a: number } | null | undefined;
		let fade = 0;
		for (let o: IgeObject | null = entity; o; o = o._parent) {
			if (occluded === undefined && o._occludedColor !== undefined) occluded = o._occludedColor;
			if (fade === 0 && o._lodFade) fade = o._lodFade;
		}
		item.occluded = occluded ?? null;
		item.lodFade = fade;
		// Outlined: this entity, or one it's mounted under (its outline goes round them all)
		item.outline = outlineOf(entity);
		item.transparent = mat.opacity < 1 || mat.a < 1 || !!materialData?.transparent || !!overrideData?.transparent ||
			!!(item.texture && (item.texture as any)._hasAlpha);
		item.doubleSided = !!(overrideData?.doubleSided ?? materialData?.doubleSided);
		item.depthPrepass = item.transparent && !!(overrideData?.depthPrepass ?? materialData?.depthPrepass);
		item.castShadow = !entity._noShadowCast && !item.transparent;
		item.shadowOnly = entity._shadowOnly;
		// Out of phase (IgeEntity.phase()): a transparent, glassy item that casts a shadow only while mostly in phase
		igePhaseApply(item);

		// Skeleton: compute skin matrices once per frame (dirty-guarded) and
		// give each skeleton a bone palette row for instanced draws.
		item.skeleton = geometry.isSkinned ? entity._skeleton : undefined;
		item.boneRow = -1;
		if (item.skeleton) {
			this._skeletonManager?.updateSkeletonMatrices(item.skeleton);
			if (this._bonePalette) {
				let row = this._skeletonRows.get(item.skeleton);
				if (row === undefined) {
					row = this._bonePalette.addSkeleton(item.skeleton);
					this._skeletonRows.set(item.skeleton, row);
				}
				item.boneRow = row;
			}
		}

		// World-space bounding sphere
		const m = item.worldMatrix;
		if (geometry.boundsRadius >= 0) {
			const lx = geometry.boundsCenterX, ly = geometry.boundsCenterY, lz = geometry.boundsCenterZ;
			item.cx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
			item.cy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
			item.cz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
			const sx = m[0] * m[0] + m[1] * m[1] + m[2] * m[2];
			const sy = m[4] * m[4] + m[5] * m[5] + m[6] * m[6];
			const sz = m[8] * m[8] + m[9] * m[9] + m[10] * m[10];
			const scale = Math.sqrt(Math.max(sx, sy, sz));
			item.radius = geometry.boundsRadius * scale;
			item.lodRadius = geometry.meshRadius * scale;

			// Skinned vertices are in bind space (often Z-up), not model
			// space, so their raw bounds can sit well away from the posed
			// character. Centre the sphere on the animated joints instead,
			// padded to cover the body around them.
			const skeleton = item.skeleton;
			if (skeleton && skeleton.data.boneCount > 0 && !skeleton.data.boundsFromMesh) {
				const w = skeleton.worldMatrices;
				let minX = Infinity, minY = Infinity, minZ = Infinity;
				let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
				for (let b = 0, n = skeleton.data.boneCount; b < n; b++) {
					const x = w[b * 16 + 12], y = w[b * 16 + 13], z = w[b * 16 + 14];
					if (x < minX) minX = x;
					if (y < minY) minY = y;
					if (z < minZ) minZ = z;
					if (x > maxX) maxX = x;
					if (y > maxY) maxY = y;
					if (z > maxZ) maxZ = z;
				}
				const lx = (minX + maxX) / 2, ly = (minY + maxY) / 2, lz = (minZ + maxZ) / 2;
				const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
				const halfDiagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2;
				item.cx = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
				item.cy = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
				item.cz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
				item.radius = (halfDiagonal + extent * 0.25) * scale;
			}
		} else {
			item.cx = m[12];
			item.cy = m[13];
			item.cz = m[14];
			item.radius = -1;
			item.lodRadius = -1;
		}

		const skinned = item.skeleton ? "|s" : "";
		// Double-sided items batch separately so culling can be set per batch
		const sided = item.doubleSided ? "|d" : "";
		// A texture transform is a uniform, so items that differ only by it can't share an instanced draw
		const um = item.material;
		const uv = um.uvScaleU !== 1 || um.uvScaleV !== 1 || um.uvOffsetU !== 0 || um.uvOffsetV !== 0
			? `|uv${um.uvScaleU},${um.uvScaleV},${um.uvOffsetU},${um.uvOffsetV}` : "";
		// Fading items draw with the dithered program, one at a time
		const fading = fade ? "|f" : "";
		item.batchKey = geometry.id + "|" + item.textureKey + emissiveKey + item.mapKey + skinned + sided + uv + fading;
		item.depthKey = geometry.id + skinned;

		// Level-of-detail geometry (index 0 is the full mesh)
		item.lodSizes = null;
		if (lodGeometryData && lodSizes && lodGeometryData.length > 0) {
			const geometries = item.lodGeometries;
			const batchKeys = item.lodBatchKeys;
			const depthKeys = item.lodDepthKeys;
			geometries.length = 0;
			batchKeys.length = 0;
			depthKeys.length = 0;
			geometries.push(geometry);
			batchKeys.push(item.batchKey);
			depthKeys.push(item.depthKey);

			for (let i = 0; i < lodGeometryData.length; i++) {
				const lodGeometry = this._getGeometry(lodGeometryData[i]);
				if (!lodGeometry) break;
				geometries.push(lodGeometry);
				batchKeys.push(lodGeometry.id + "|" + item.textureKey + emissiveKey + item.mapKey + skinned + sided + uv + fading);
				depthKeys.push(lodGeometry.id + skinned);
			}

			// LOD needs a size to measure
			if (geometries.length > 1 && item.lodRadius > 0) {
				item.lodSizes = lodSizes;
			}
		}

		return item;
	}

	/**
	 * Get the GPU geometry for geometry data, uploading it on first use.
	 */
	protected _getGeometry(geometryData: IgeGeometryData3d): IgeWebGlGeometry | undefined {
		const manager = this._geometryManager;
		if (!manager) return;

		const geometryId = geometryData.id || "unknown";
		const geometry = manager.getGeometry(geometryId);
		if (geometry) return geometry;
		// Arrays discarded and the GPU copy released: nothing left to draw
		if (geometryData.gpuOnly) return;
		if (!geometryData.vertices && !geometryData.packed) return;
		// Uploaded now if the frame's budget allows (always, unless uploadBudget() is set), else in its turn
		if (!this._uploadQueue().request(geometryId, geometryData, geometryGpuBytes(geometryData))) return;
		return manager.getGeometry(geometryId);
	}

	/**
	 * Pick an item's level of detail for a pass that draws it at
	 * `pixelsPerUnit` (device pixels or shadow map texels per world unit).
	 */
	protected _lodLevel(item: IgeWebGlRenderItem, pixelsPerUnit: number): number {
		const sizes = item.lodSizes!;
		const size = item.lodRadius * 2 * pixelsPerUnit * this._lodBias;
		const max = item.lodGeometries.length - 1;
		let level = 0;
		while (level < max && size < sizes[level]) level++;
		return level;
	}

	/**
	 * Add a draw's triangle count to the frame stats.
	 */
	protected _countTriangles(geometry: IgeWebGlGeometry, instances: number): void {
		const vertices = geometry.indexCount > 0 ? geometry.indexCount : geometry.vertexCount;
		this._stats.triangles += Math.floor(vertices / 3) * instances;
	}

	/** One of an item's material maps from material data: its loaded texture, or the upload requested (the map shows once it's there). */
	protected _applyMap(item: IgeWebGlRenderItem, k: number, texture: IgeTexture | undefined, id: string | undefined, blob: Blob | undefined): void {
		if (texture) {
			item.mapBlobIds[k] = undefined;
			item.mapTextures[k] = texture._loaded ? texture : undefined;
		} else if (id && this._textureManager) {
			item.mapTextures[k] = undefined;
			if (this._textureManager.getBlobTexture(id)) item.mapBlobIds[k] = id;
			else {
				item.mapBlobIds[k] = undefined;
				// Material maps always get mipmaps; they hold data, never sRGB-encoded
				if (blob) this._requestBlobTexture(id, blob, undefined, true, false, k === MAP_NORMAL ? "normal" : "data");
			}
		}
	}

	/**
	 * Copy the values present in a material onto a render item's resolved
	 * material (fields that are absent are left unchanged).
	 */
	protected _applyMaterialData(item: IgeWebGlRenderItem, materialData: IgeMaterialData): void {
		const mat = item.material;
		const color = materialData.color;
		// Under linear lighting a colour given in sRGB (a game's, by default) is converted to linear light here, once
		// for the item; a glTF material's (colorSpace "linear") is linear light already
		const toLinear = this._linear && materialData.colorSpace !== "linear";
		if (color) {
			if (typeof color === "object") {
				mat.r = toLinear ? igeSrgbToLinear(color.r) : color.r;
				mat.g = toLinear ? igeSrgbToLinear(color.g) : color.g;
				mat.b = toLinear ? igeSrgbToLinear(color.b) : color.b;
				mat.a = color.a ?? 1;
			} else {
				const rgb = toLinear ? parseHexColorLinear(color) : parseHexColor(color);
				mat.r = rgb[0];
				mat.g = rgb[1];
				mat.b = rgb[2];
			}
		}
		if (materialData.metallic !== undefined) mat.metallic = materialData.metallic;
		if (materialData.roughness !== undefined) mat.roughness = materialData.roughness;
		if (materialData.emissiveColor) {
			mat.emissiveR = toLinear ? igeSrgbToLinear(materialData.emissiveColor.r) : materialData.emissiveColor.r;
			mat.emissiveG = toLinear ? igeSrgbToLinear(materialData.emissiveColor.g) : materialData.emissiveColor.g;
			mat.emissiveB = toLinear ? igeSrgbToLinear(materialData.emissiveColor.b) : materialData.emissiveColor.b;
			// A negative intensity tells the shader to multiply the emissive by the vertex colours
			// (emissiveVertexColor): it rides in the existing uniform and per-instance slot
			mat.emissiveIntensity = (materialData.emissiveIntensity ?? 1) * (materialData.emissiveVertexColor ? -1 : 1);
		} else if (materialData.emissiveIntensity !== undefined) {
			// Intensity alone: how strongly the emission already given glows (keeping its vertex colour flag)
			mat.emissiveIntensity = materialData.emissiveIntensity * (mat.emissiveIntensity < 0 ? -1 : 1);
		}

		// An emissive map: glowing in its own colours (white unless a colour was given)
		const emissiveTexture = materialData.emissiveTexture;
		const emissiveId = materialData.emissiveTextureId;
		if (emissiveTexture || emissiveId) {
			if (!materialData.emissiveColor && mat.emissiveR === 0 && mat.emissiveG === 0 && mat.emissiveB === 0) {
				mat.emissiveR = mat.emissiveG = mat.emissiveB = 1;
				mat.emissiveIntensity = materialData.emissiveIntensity ?? 1;
			}
			item.emissiveTexture = undefined;
			item.emissiveBlobTextureId = undefined;
			item.emissivePending = true;
			if (emissiveTexture) {
				if (emissiveTexture._loaded) item.emissiveTexture = emissiveTexture;
			} else if (emissiveId && this._textureManager) {
				// (Under linear lighting its sRGB copy; its other copy, if there, stands in while that's made)
				if (this._textureManager.getBlobTexture(emissiveId, this._linear)) item.emissiveBlobTextureId = emissiveId;
				if (!this._textureManager.hasBlobTexture(emissiveId, this._linear) && materialData.emissiveTextureBlob) {
					this._requestBlobTexture(emissiveId, materialData.emissiveTextureBlob, undefined, undefined, this._linear);
				}
			}
		}

		// Material maps (each with its own pending upload, drawn without until it's there)
		this._applyMap(item, MAP_NORMAL, materialData.normalTexture, materialData.normalTextureId, materialData.normalTextureBlob);
		if (materialData.normalScale !== undefined) item.normalScale = materialData.normalScale;
		// (Metallic-roughness and occlusion maps only act under PBR lighting, so aren't loaded without it)
		if (this._pbr) {
			this._applyMap(item, MAP_METALLIC_ROUGHNESS, materialData.metallicRoughnessTexture, materialData.metallicRoughnessTextureId, materialData.metallicRoughnessTextureBlob);
			this._applyMap(item, MAP_AO, materialData.aoTexture, materialData.aoTextureId, materialData.aoTextureBlob);
			if (materialData.aoStrength !== undefined) item.aoStrength = materialData.aoStrength;
		}

		if (materialData.uvScale) {
			mat.uvScaleU = materialData.uvScale.u;
			mat.uvScaleV = materialData.uvScale.v;
		}
		if (materialData.uvOffset) {
			mat.uvOffsetU = materialData.uvOffset.u;
			mat.uvOffsetV = materialData.uvOffset.v;
		}

		const textureId = materialData.textureId;
		if (textureId && this._textureManager) {
			// (Under linear lighting its sRGB copy; its other copy, if there, stands in while that's made)
			if (this._textureManager.getBlobTexture(textureId, this._linear)) item.blobTextureId = textureId;
			if (!this._textureManager.hasBlobTexture(textureId, this._linear) && materialData.textureBlob) {
				this._requestBlobTexture(textureId, materialData.textureBlob, materialData.textureSampler, undefined, this._linear);
			}
		}
	}

	/**
	 * Render a single viewport.
	 */
	/**
	 * Give a viewport's camera the default preset (see defaultCameraPreset())
	 * if the game hasn't set one up.
	 */
	protected _applyDefaultCameraPreset(viewport: IgeViewport): void {
		const preset = this._defaultCameraPreset;
		const camera = viewport.camera;
		if (preset && camera && camera._preset === undefined && !camera._lookAt) {
			camera.preset(preset);
		}
	}

	protected _renderViewport(viewport: IgeViewport): void {
		const inPanel = this._inPanel;
		if (!inPanel) this._applyDefaultCameraPreset(viewport);
		const gl = this._canvasContext;
		if (!gl || !this._cameraController || !this._stateManager) {
			return;
		}

		// Get viewport dimensions in CSS pixels and convert to device pixels.
		// (The scene's offscreen target may be smaller than the canvas: its viewports shrink with it. Panels draw into
		// their own targets, and outlines onto the canvas, at its full resolution)
		const dpr = this._devicePixelRatio;
		const sdpr = inPanel ? dpr : dpr * this._frameScale;
		let vpX = Math.floor((viewport._translate?.x || 0) * sdpr);
		let vpY = Math.floor((viewport._translate?.y || 0) * sdpr);
		const vpWidth = Math.floor(viewport._bounds2d.x * sdpr);
		const vpHeight = Math.floor(viewport._bounds2d.y * sdpr);

		const camera = viewport.camera;
		const scene = viewport._scene;
		if (!camera || !scene) {
			return;
		}

		const data = this._sceneData.get(scene);
		if (!data) return;

		const matrices = this._cameraController.updateCamera(camera, viewport);
		const frustum = matrices.frustum;
		const camX = camera._translate.x;
		const camY = camera._translate.y;
		const camZ = camera._translate.z;

		// Lights for this view: those that reach what it shows, nearest first
		if (this._lightManager) {
			const target = (camera as any)._lookAt as { x: number; y: number; z: number } | undefined;
			const focus = target ?? camera._translate;
			const aspect = vpHeight > 0 ? vpWidth / vpHeight : 1;
			const half = camera.projectionType?.() === "orthographic" ? (camera.orthoSize() as number) : 800;
			this._lightManager.focus(focus.x, focus.y, focus.z, half * Math.hypot(1, aspect));
		}

		// Device pixels per world unit, for picking levels of detail. An
		// orthographic view has one scale everywhere; a perspective view
		// divides it by each item's view depth.
		const proj = matrices.projection.matrix;
		const view = matrices.view.matrix;
		const viewScale = Math.sqrt(view[1] * view[1] + view[5] * view[5] + view[9] * view[9]);
		const pixelsPerUnit = proj[5] * viewScale * vpHeight * 0.5;
		const perspective = proj[11] !== 0;

		// The UI layer draws after every view (and the post-processing): keep this one's camera for it
		if (data.ui.length > 0 && !inPanel) {
			let uiView = this._uiViews.get(viewport);
			if (!uiView) {
				uiView = { viewProj: new Float32Array(16), yScale: 1, width: 0, height: 0, frameId: -1 };
				this._uiViews.set(viewport, uiView);
			}
			multiplyMat4Into(uiView.viewProj, proj, view);
			uiView.yScale = proj[5] * viewScale;
			uiView.width = viewport._bounds2d.x;
			uiView.height = viewport._bounds2d.y;
			uiView.frameId = this._frameId;
		}

		// ------------------------------------------------------------
		// Cull against the camera frustum and batch what remains
		// ------------------------------------------------------------
		const batcher = this._mainBatcher;
		const transparent = this._transparentItems;
		const occludedItems = this._occludedItems;
		occludedItems.length = 0;
		let outlined: IgeWebGlRenderItem[] | undefined;
		batcher.begin();
		transparent.length = 0;

		const frameId = this._frameId;
		const models = data.models;
		for (let i = 0; i < models.length; i++) {
			const item = models[i];
			// Shadow casters only: not drawn in the view
			if (item.shadowOnly) continue;
			if (item.radius >= 0 && !frustum.containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) {
				continue;
			}

			item.entity._lastRenderedFrame = frameId;

			const dx = item.cx - camX, dy = item.cy - camY, dz = item.cz - camZ;
			const distSq = dx * dx + dy * dy + dz * dz;

			let geometry = item.geometry;
			let batchKey = item.batchKey;
			item.lodLevel = 0;
			if (item.lodSizes) {
				let scale = pixelsPerUnit;
				if (perspective) {
					const depth = -(view[2] * item.cx + view[6] * item.cy + view[10] * item.cz + view[14]);
					scale /= Math.max(depth, 1e-3);
				}
				const level = this._lodLevel(item, scale);
				item.lodLevel = level;
				if (level > 0) {
					geometry = item.lodGeometries[level];
					batchKey = item.lodBatchKeys[level];
					this._stats.lodItems++;
				}
			}
			item.drawGeometry = geometry;
			if (item.occluded) occludedItems.push(item);
			if (item.outline) (outlined ??= []).push(item);

			if (item.transparent) {
				item.sortKey = distSq;
				transparent.push(item);
			} else {
				// Front-to-back key: distance to the far side of the bounds, so
				// big surfaces like floors sort behind the things standing on them
				item.sortKey = Math.sqrt(distSq) + Math.max(item.radius, 0);
				batcher.add(item, batchKey, geometry);
			}
		}

		// Draw opaque geometry front to back (batches, and instances within
		// each batch) so the depth test rejects hidden pixels before the
		// expensive lighting runs. Dense crowds overlap heavily, so this
		// removes a lot of overdraw.
		const opaqueBatches = batcher.batches;
		for (let b = 0; b < opaqueBatches.length; b++) {
			const items = opaqueBatches[b].items;
			if (items.length > 1) items.sort(sortItemsFrontToBack);
		}
		if (opaqueBatches.length > 1) opaqueBatches.sort(sortBatchesFrontToBack);

		this._stats.visibleItems += transparent.length;
		for (const batch of opaqueBatches) this._stats.visibleItems += batch.items.length;

		const opaqueSprites = this._opaqueSprites;
		const transparentSprites = this._transparentSprites;
		opaqueSprites.length = 0;
		transparentSprites.length = 0;
		const sprites = data.sprites;
		for (let i = 0; i < sprites.length; i++) {
			const sprite = sprites[i];
			const m = sprite._worldMatrix4?.matrix;
			if (!m) continue;
			const radius = Math.max(sprite._bounds2d.x, sprite._bounds2d.y) * 0.75 *
				Math.max(Math.abs(sprite._scale.x), Math.abs(sprite._scale.y), 1e-6);
			if (!frustum.containsSphereXYZ(m[12], m[13], m[14], radius)) continue;

			const spriteMaterial = sprite._materialData;
			const spriteColor = spriteMaterial?.color;
			if (
				sprite._opacity < 1 ||
				(sprite._texture as any)?._hasAlpha ||
				spriteMaterial?.blending === "additive" ||
				spriteMaterial?.transparent ||
				(typeof spriteColor === "object" && (spriteColor.a ?? 1) < 1)
			) {
				const dx = m[12] - camX, dy = m[13] - camY, dz = m[14] - camZ;
				(sprite as any)._webglSortKey = dx * dx + dy * dy + dz * dz;
				transparentSprites.push(sprite);
			} else {
				opaqueSprites.push(sprite);
			}
		}

		// ------------------------------------------------------------
		// Directional shadow map, centred on this viewport's view target
		// ------------------------------------------------------------
		if (this.shadowsEnabled() && this._shadowManager && this._shadowCastingLight && this._sharedShadowFrame !== this._frameId) {
			// Fitted to what this view sees (shadowFit()), in cascades (shadowCascades()), or the square round its target
			let fitted = this._shadowFit.enabled && this._fitShadowView(viewport, matrices, camera, !(this._shadowCaching && !inPanel), data);
			if (!fitted) {
				const target = (camera as any)._lookAt as { x: number; y: number; z: number } | undefined;
				const center = target ? this._shadowCenter(target.x, target.y, target.z) : { x: 0, y: 0, z: 0 };
				fitted = !!this._shadowManager.updateLightSpaceMatrix(
					this._shadowLightId,
					this._shadowCastingLight,
					{ x: camX, y: camY, z: camZ },
					center
				);
			}

			if (fitted) {
				this._renderDirectionalShadowPass(data, frustum, matrices);
				this._stateManager.reset();
				gl.depthFunc(gl.LEQUAL);
			}
		}

		// ------------------------------------------------------------
		// Main pass, through the device: into the post-processing's
		// target, or the canvas
		// ------------------------------------------------------------
		this._view.x = vpX;
		this._view.y = vpY;
		this._view.w = vpWidth;
		this._view.h = vpHeight;
		this._view.clip = !!viewport._clipping;

		// A y-down 2D camera (preset "screen2d") draws sprites flat with
		// their full 2D transform, as the Canvas 2D renderer does
		const flat2d = !!(camera._up && camera._up.y < 0);
		if (transparentSprites.length > 1) {
			transparentSprites.sort(sortSpritesBackToFront);
		}
		if (transparent.length > 0) {
			transparent.sort(sortItemsBackToFront);
		}

		// What's drawn is drawn with: its textures made first (the texture manager's own GL), the decals and particles in view
		const spriteTextures = this._spriteTextures(opaqueSprites, this._opaqueSpriteTextures);
		const transparentSpriteTextures = this._spriteTextures(transparentSprites, this._transparentSpriteTextures);
		for (const batch of batcher.batches) this._prepareTextures(batch, batch.items[0]);
		for (const item of transparent) this._prepareTextures(item, item);
		for (const item of occludedItems) this._prepareTextures(item, item);
		const decals = this._visibleDecals(data.decals, matrices);
		const particles = this._visibleParticles(data.particles, matrices);
		if (!inPanel) this._pushDebugShapes();

		const device = this._gpuBegin();
		const post = inPanel ? null : this._postProcess?.target();
		// Under linear lighting: linear light into post-processing's target (its composite encodes it), sRGB-encoded at
		// the end of each program straight to the screen or a panel
		this._colorVariant = !this._linear ? 0 : post ? 1 : 2;
		// A panel draws into its own target, from its corner
		const panelTarget = inPanel ? this._panelTarget : null;
		if (panelTarget) {
			vpX = 0;
			vpY = 0;
		}
		const pass = device.beginRenderPass(post ? { color: { target: post.color }, depthStencil: { target: post.depth } } : panelTarget ? { color: { target: panelTarget.renderColor }, depthStencil: { target: panelTarget.renderDepth } } : { color: { target: device.surface() } });
		try {
			pass.setViewport(vpX, vpY, vpWidth, vpHeight);
			// Always scissor the clear so split-screen viewports don't wipe each other; drawing itself is already confined
			// by the viewport
			const cc = this._clearColor;
			if (this._colorVariant === 1) pass.clear([igeSrgbToLinear(cc.r), igeSrgbToLinear(cc.g), igeSrgbToLinear(cc.b), cc.a], [vpX, vpY, vpWidth, vpHeight], 1);
			else pass.clear([cc.r, cc.g, cc.b, cc.a], [vpX, vpY, vpWidth, vpHeight], 1);
			pass.setScissorRect(viewport._clipping ? [vpX, vpY, vpWidth, vpHeight] : null);
			this._writeLitView(matrices);

			// Opaque: sprites, then meshes front to back
			this._drawSprites(pass, opaqueSprites, spriteTextures, matrices, flat2d, false);
			this._drawLitBatches(pass, batcher.batches);

			// Ground decals go on top of the opaque ground, under everything transparent
			this._drawDecals(pass, decals, matrices);

			// Transparent (back to front, no depth writes)
			this._drawSprites(pass, transparentSprites, transparentSpriteTextures, matrices, flat2d, true);
			this._drawLitItems(pass, transparent, LitState.Transparent);
			this._drawParticles(pass, particles, matrices);

			// Silhouettes of marked entities where something stands in front of them
			if (occludedItems.length > 0) this._drawOccluded(pass, occludedItems);

			if (!inPanel) this._drawDebugLines(pass, matrices);
		} finally {
			pass.end();
			this._gpuHandBack(panelTarget ? webGl2Framebuffer(device, panelTarget.renderColor, panelTarget.renderDepth) : inPanel ? null : this._postProcess?.targetFramebuffer() ?? null, vpX, vpY, vpWidth, vpHeight);
		}

		// Lenses (renderer.lens()) bend the finished view
		if (this._lenses.size > 0) this._applyLenses(viewport, matrices, vpX, vpY, vpWidth, vpHeight);

		// Outlined items: drawn round once the frame's finished (and post-processed)
		if (outlined && !inPanel) (this._outlineJobs ??= []).push({ items: outlined, matrices, view: this._frameScale === 1 ? { x0: vpX, y0: vpY, x1: vpX + vpWidth, y1: vpY + vpHeight } : { x0: Math.floor((viewport._translate?.x || 0) * dpr), y0: Math.floor((viewport._translate?.y || 0) * dpr), x1: Math.floor((viewport._translate?.x || 0) * dpr) + Math.floor(viewport._bounds2d.x * dpr), y1: Math.floor((viewport._translate?.y || 0) * dpr) + Math.floor(viewport._bounds2d.y * dpr) } });

		// Keep only the queued lines for the next viewport
		if (!inPanel) this._debugLineVertices = this._debugLinesQueued;
	}

	/**
	 * Whether a batch should be drawn with a single instanced call.
	 */
	protected _shouldInstance(batch: IgeWebGlItemBatch): boolean {
		if (!this._instancingEnabled || !this._instanceBuffer) return false;
		if (batch.items.length < this._minInstanceCount) return false;
		if (batch.skinned && !this._bonePalette) return false;
		if (batch.items[0].lodFade) return false;
		return true;
	}

	/**
	 * GL handed back to the renderer's own GL code after the main pass, as its own main pass left it: the view's target
	 * bound with its viewport, no scissor, depth tested less-or-equal and written, blended over, no culling or stencil,
	 * unit 0 active; the state manager's cache forgotten.
	 */
	protected _gpuHandBack(target: WebGLFramebuffer | null, x: number, y: number, w: number, h: number): void {
		const gl = this._canvasContext as WebGL2RenderingContext;
		const device = this._device!;
		device.release();
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.viewport(x, y, w, h);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.activeTexture(gl.TEXTURE0);
		this._stateManager?.reset();
	}

	/** A lit program's uniform block, by kind (laid out as its pipelines' are). */
	protected _litBlock(skinned: boolean, instanced: boolean): { data: Float32Array; at: Record<string, number>; itemFrom: number } {
		const kind = (skinned ? 2 : 0) + (instanced ? 1 : 0);
		let block = this._litBlocks[kind];
		if (!block) {
			const { offsets, size } = igeGpuUniformLayout(litUniforms(skinned, instanced));
			block = this._litBlocks[kind] = { data: new Float32Array(size), at: offsets, itemFrom: offsets.u_hasVertexColors };
		}
		return block;
	}

	/**
	 * The view's part of every lit block (the camera, lights, shadows, fog, shading options) and the view's textures for
	 * the lit programs, as the old per-program setup set them.
	 */
	protected _writeLitView(matrices: IgeCameraMatrices): void {
		const textures = this._litViewTextures;
		textures[0] = textures[1] = textures[2] = null;
		textures[3] = this._bonePalette?.texture ?? null;
		for (let kind = 0; kind < 4; kind++) {
			const skinned = kind >= 2, instanced = (kind & 1) === 1;
			const { data, at } = this._litBlock(skinned, instanced);
			data.set(matrices.view.matrix, at.u_viewMatrix);
			data.set(matrices.projection.matrix, at.u_projectionMatrix);
			const cam = matrices.cameraPosition;
			data[at.u_cameraPosition] = cam.x;
			data[at.u_cameraPosition + 1] = cam.y;
			data[at.u_cameraPosition + 2] = cam.z;

			this._lightManager?.writeLightUniforms(data, at, this._linear);

			if (this.shadowsEnabled() && this._shadowManager) {
				textures[0] = this._shadowManager.writeShadowUniforms(data, at, this._shadowLightId);
				data[at.u_shadowDebug] = this._shadowDebugMode;
			} else {
				data[at.u_hasShadowMap] = 0;
				data[at.u_shadowDebug] = 0;
			}
			data[at.u_shadowNormalOffset] = 0;

			if (this._shadowCastingPointLights.length > 0 && this._shadowManager && this._lightManager) {
				const count = Math.min(this._shadowCastingPointLights.length, 2);
				data[at.u_numShadowPointLights] = count;
				for (let i = 0; i < count; i++) {
					const light = this._shadowCastingPointLights[i];
					textures[1 + i] = this._shadowManager.writePointShadowUniforms(data, at, i, light.id());
					data[at.u_pointShadowLightIndex + i] = this._lightManager.activePointLights().indexOf(light);
				}
			} else {
				data[at.u_numShadowPointLights] = 0;
			}

			// Simple lighting unless the game opted in to physically based lighting (see pbr())
			data[at.u_usePBR] = this._pbr ? 1 : 0;
			data[at.u_ambientOcclusion] = 1;

			const fog = this._fog;
			const fogMode = fog.mode === "linear" ? 1 : fog.mode === "exp2" ? 2 : 0;
			data[at.u_fogMode] = fogMode;
			if (fogMode) {
				data[at.u_fogColor] = this._inLight(fog.color.r);
				data[at.u_fogColor + 1] = this._inLight(fog.color.g);
				data[at.u_fogColor + 2] = this._inLight(fog.color.b);
				data[at.u_fogNear] = fog.near;
				data[at.u_fogFar] = fog.far;
				data[at.u_fogDensity] = fog.density;
			}

			if (skinned && instanced && this._bonePalette) {
				data[at.u_boneTextureSize] = this._bonePalette.width;
				data[at.u_boneTextureSize + 1] = Math.max(1, this._bonePalette.height);
			}
		}
	}

	/** A lit mesh's pipeline for how it's drawn (kept on the mesh, by kind and state). */
	protected _litPipeline(skinned: boolean, instanced: boolean, geometry: IgeWebGlGeometry, state: LitState, fade: boolean = false, phase: boolean = false): IgeGpuRenderPipeline {
		// (A fading mesh, never skinned or instanced: the lit_fade program, kept after the rest; a phased one, never instanced:
		// lit_phase or skinned_phase, kept after those; linear lighting's compiles (_colorVariant) kept after all those, 256 slots each)
		const fading = fade && !skinned && !instanced;
		phase = phase && !instanced;
		const variant = this._colorVariant || 0;
		const slot = (phase ? 128 + state * 2 + (skinned ? 1 : 0) : fading ? 64 + state : (state * 2 + (skinned ? 1 : 0)) * 2 + (instanced ? 1 : 0)) + variant * 256;
		const kept = (geometry.gpuLitPipelines ??= [])[slot];
		if (kept) return kept;
		const base = skinned ? "skinned" : "lit";
		const id = phase ? `${base}_phase` : fading ? "lit_fade" : instanced ? `${base}_instanced` : base;
		const { layout, key } = meshLayout(geometry);
		const st = litState(state);
		return geometry.gpuLitPipelines[slot] = this._gpuPrograms!.pipeline(`lit|${id}|${state}|${key}${variant ? `|c${variant}` : ""}`, () => ({
			module: this._gpuPrograms!.module(id, undefined, igeColorDefines(variant)),
			vertex: { buffers: instanced ? [layout, INSTANCE_LAYOUT] : [layout] },
			...st,
			primitive: { topology: meshTopology(geometry), cullMode: st.primitive?.cullMode ?? "none" },
			uniforms: litUniforms(skinned, instanced),
			textures: LIT_TEXTURES,
			label: `${id} ${state}`
		}));
	}

	/**
	 * A batch's or item's textures made ready (base colour, emissive) before the pass: blob textures, IgeTextures (the
	 * texture manager's own GL, which makes them as first asked for), the white texture when there's none.
	 */
	protected _prepareTextures(into: { gpuBase?: WebGLTexture | null; gpuEmissive?: WebGLTexture | null; gpuMaps?: (WebGLTexture | null)[]; blobTextureId?: string; texture?: IgeTexture }, item: IgeWebGlRenderItem): void {
		const tm = this._textureManager!;
		// (Base colour and emissive maps are colours: their sRGB copies under linear lighting)
		let base: WebGLTexture | null | undefined;
		if (into.blobTextureId) base = tm.getBlobTexture(into.blobTextureId, this._linear);
		else if (into.texture) base = tm.getTextureForIgeTexture(into.texture, this._srgbColor(into.texture));
		into.gpuBase = base || tm.getDefaultWhiteTexture();
		let emissive: WebGLTexture | null | undefined;
		if (item.emissiveBlobTextureId) emissive = tm.getBlobTexture(item.emissiveBlobTextureId, this._linear);
		else if (item.emissiveTexture) emissive = tm.getTextureForIgeTexture(item.emissiveTexture, this._srgbColor(item.emissiveTexture));
		into.gpuEmissive = emissive || null;

		// The material maps, for an item that has any (none: nothing made, nothing bound)
		if (!item.mapKey) {
			into.gpuMaps = undefined;
			return;
		}
		const maps = into.gpuMaps ??= [null, null, null];
		for (let k = 0; k < 3; k++) {
			const id = item.mapBlobIds[k], texture = item.mapTextures[k];
			maps[k] = (id ? tm.getBlobTexture(id) : texture ? tm.getTextureForIgeTexture(texture, this._srgbData(texture), k === MAP_NORMAL ? "normal" : "data") : null) || null;
		}
	}

	/**
	 * A lit draw's material maps: which of the item's maps are there (and loaded), and bound for them. Maps act only
	 * in the passes that draw the item as itself (not a silhouette, mask or depth-only draw), and only the normal map
	 * unless PBR lighting is on. An item with no maps writes zeros and binds nothing.
	 */
	protected _setLitMaps(pass: IgeGpuRenderPass, block: { data: Float32Array; at: Record<string, number> }, item: IgeWebGlRenderItem, gpuMaps: (WebGLTexture | null)[] | undefined, state: LitState): void {
		const { data, at } = block;
		const maps = state === LitState.Opaque || state === LitState.OpaqueCulled || state === LitState.Transparent ? gpuMaps : undefined;
		data[at.u_hasNormalMap] = 0;
		data[at.u_hasMetallicRoughnessTexture] = 0;
		data[at.u_hasAoTexture] = 0;
		if (!maps) return;
		const device = this._device!;
		if (maps[MAP_NORMAL] && item.geometry.hasTangents) {
			data[at.u_hasNormalMap] = 1;
			data[at.u_normalScale] = item.normalScale;
			pass.setTexture(6, webGl2ExternalTexture(device, maps[MAP_NORMAL]!));
		}
		if (this._pbr && maps[MAP_METALLIC_ROUGHNESS]) {
			data[at.u_hasMetallicRoughnessTexture] = 1;
			pass.setTexture(7, webGl2ExternalTexture(device, maps[MAP_METALLIC_ROUGHNESS]!));
		}
		if (this._pbr && maps[MAP_AO]) {
			data[at.u_hasAoTexture] = 1;
			data[at.u_aoStrength] = item.aoStrength;
			pass.setTexture(8, webGl2ExternalTexture(device, maps[MAP_AO]!));
		}
	}

	/** A lit draw's textures: the view's (shadows, bones) and its own (base colour; emissive, or the base colour again). */
	protected _setLitTextures(pass: IgeGpuRenderPass, base: WebGLTexture | null | undefined, emissive: WebGLTexture | null | undefined): void {
		const device = this._device!;
		const baseTex = base ? webGl2ExternalTexture(device, base) : null;
		const t = this._litViewTextures;
		pass.setTexture(0, baseTex);
		pass.setTexture(1, t[0]);
		pass.setTexture(2, t[1]);
		pass.setTexture(3, t[2]);
		pass.setTexture(4, t[3]);
		pass.setTexture(5, emissive && !this._drawingSilhouettes ? webGl2ExternalTexture(device, emissive) : baseTex);
	}

	/** An item's own uniforms (a non-instanced draw's). */
	protected _writeItemUniforms(block: { data: Float32Array; at: Record<string, number> }, item: IgeWebGlRenderItem, geometry: IgeWebGlGeometry): void {
		const { data, at } = block, mat = item.material;
		data.set(this._drawWorld(item, geometry), at.u_worldMatrix);
		data[at.u_baseColor] = mat.r;
		data[at.u_baseColor + 1] = mat.g;
		data[at.u_baseColor + 2] = mat.b;
		data[at.u_baseColor + 3] = mat.a;
		data[at.u_opacity] = mat.opacity;
		data[at.u_metallic] = mat.metallic;
		data[at.u_roughness] = mat.roughness;
		data[at.u_emissiveColor] = mat.emissiveR;
		data[at.u_emissiveColor + 1] = mat.emissiveG;
		data[at.u_emissiveColor + 2] = mat.emissiveB;
		data[at.u_emissiveIntensity] = mat.emissiveIntensity;
		this._writeUvTransform(data, at.u_uvTransform, mat, geometry);
	}

	/**
	 * The world matrix an item's mesh is drawn with: its own, or with the mesh's quantised positions' decode applied
	 * (world × decode, into a scratch matrix used before the next call).
	 */
	protected _drawWorld(item: IgeWebGlRenderItem, geometry: IgeWebGlGeometry): Float32Array {
		if (!geometry.positionDecode) return item.worldMatrix;
		const out = (this._decodedWorld ??= new Float32Array(16));
		multiplyMat4Into(out, item.worldMatrix, geometry.positionDecode);
		return out;
	}

	/** A material's texture transform, after the mesh's quantised texture coordinates' decode, into a block. */
	protected _writeUvTransform(data: Float32Array, at: number, mat: IgeWebGlRenderItem["material"], geometry: IgeWebGlGeometry): void {
		const d = geometry.uvDecode;
		if (!d) {
			data[at] = mat.uvScaleU;
			data[at + 1] = mat.uvScaleV;
			data[at + 2] = mat.uvOffsetU;
			data[at + 3] = mat.uvOffsetV;
			return;
		}
		// (uv × decode scale + decode offset) × scale + offset
		data[at] = d[0] * mat.uvScaleU;
		data[at + 1] = d[1] * mat.uvScaleV;
		data[at + 2] = d[2] * mat.uvScaleU + mat.uvOffsetU;
		data[at + 3] = d[3] * mat.uvScaleV + mat.uvOffsetV;
	}

	/** One lit mesh's draw (its geometry set), indexed or not, `count` instances. */
	protected _drawMesh(pass: IgeGpuRenderPass, geometry: IgeWebGlGeometry, count: number): void {
		if (geometry.gpuIndex && geometry.indexCount > 0) pass.drawIndexed(geometry.indexCount, count);
		else if (geometry.vertexCount > 0) pass.draw(geometry.vertexCount, count);
	}

	/** A mesh's buffers set on the pass. */
	protected _setMesh(pass: IgeGpuRenderPass, geometry: IgeWebGlGeometry): void {
		pass.setVertexBuffer(0, geometry.gpuVertex!);
		if (geometry.gpuIndex && geometry.indexCount > 0) pass.setIndexBuffer(geometry.gpuIndex, geometry.indexType === 0x1405 ? "uint32" : "uint16");
	}

	/**
	 * Opaque model batches with the lit programs, instanced where possible (skinned ones too, from the bone palette):
	 * front to back, back faces culled when backFaceCulling() is on (double-sided materials aside).
	 */
	protected _drawLitBatches(pass: IgeGpuRenderPass, batches: IgeWebGlItemBatch[]): void {
		const device = this._device!;
		for (let b = 0; b < batches.length; b++) {
			const batch = batches[b];
			const geometry = batch.geometry;
			if (!geometry.gpuVertex) continue;
			const instanced = this._shouldInstance(batch);
			const skinned = batch.skinned;
			const state = this._backFaceCulling && !batch.items[0].doubleSided ? LitState.OpaqueCulled : LitState.Opaque;
			const fade = !instanced && !skinned && !!batch.items[0].lodFade;
			const pipeline = this._litPipeline(skinned, instanced, geometry, state, fade);
			const block = this._litBlock(skinned, instanced);
			const { data, at } = block;
			pass.setPipeline(pipeline);
			this._setMesh(pass, geometry);
			this._setLitTextures(pass, batch.gpuBase, batch.gpuEmissive);
			this._setLitMaps(pass, block, batch.items[0], batch.gpuMaps, state);
			data[at.u_hasVertexColors] = this._vertexColorFlag(geometry);

			if (instanced) {
				const count = batch.items.length;
				this._gpuInstanceData = packInstances(batch.items, 0, count, this._gpuInstanceData, geometry.positionDecode);
				device.writeBuffer(this._gpuInstances!, 0, this._gpuInstanceData.subarray(0, count * INSTANCE_FLOATS));
				pass.setVertexBuffer(1, this._gpuInstances!);
				// Items in an instanced batch share their texture transform (it's part of the batch key)
				this._writeUvTransform(data, at.u_uvTransform, batch.items[0].material, geometry);
				if (skinned) data[at.u_useSkinning] = 1;
				pass.setUniforms(data, [block.itemFrom, data.length]);
				this._drawMesh(pass, geometry, count);
				this._stats.instancedDrawCalls++;
				this._stats.instances += count;
				this._countTriangles(geometry, count);
			} else {
				for (let i = 0; i < batch.items.length; i++) {
					const item = batch.items[i];
					this._writeItemUniforms(block, item, geometry);
					if (fade) data[at.u_lodFade] = item.lodFade ?? 0;
					if (skinned) this._writeBones(block, item);
					pass.setUniforms(data, [block.itemFrom, data.length]);
					this._drawMesh(pass, geometry, 1);
					this._stats.drawCalls++;
					this._countTriangles(geometry, 1);
				}
			}
		}
	}

	/** A skinned item's bones (a non-instanced draw's). */
	protected _writeBones(block: { data: Float32Array; at: Record<string, number> }, item: IgeWebGlRenderItem): void {
		const skeleton = item.skeleton;
		block.data[block.at.u_useSkinning] = skeleton ? 1 : 0;
		if (!skeleton) return;
		const boneCount = Math.min(skeleton.data.boneCount, MAX_BONES);
		block.data.set(skeleton.skinMatrices.subarray(0, boneCount * 16), block.at["u_boneMatrices[0]"]);
	}

	/** Lit items drawn one at a time, in their order (transparent ones back to front; a mask's; silhouettes'). */
	protected _drawLitItems(pass: IgeGpuRenderPass, items: IgeWebGlRenderItem[], state: LitState): void {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (state === LitState.Transparent && item.depthPrepass) this._drawLitItem(pass, item, LitState.DepthOnly);
			this._drawLitItem(pass, item, state);
		}
	}

	/** A phased item's uniforms (the phase programs'; see IgePhase.ts and phase.frag.ts). */
	protected _writePhase (data: Float32Array, at: Record<string, number>, item: IgeWebGlRenderItem, phase: IgePhaseEffect): void {
		const s = phase.settings;
		data.set([item.phaseK ?? 0, item.phaseTime ?? 0, s.shimmer, Math.max(0.1, s.edgePower)], at.u_phase);
		// (Rim and tint as the pass takes colours: linear light under linear lighting)
		data.set([this._inLight(s.edgeR), this._inLight(s.edgeG), this._inLight(s.edgeB), s.edgeStrength], at.u_phaseEdge);
		data.set([this._inLight(s.tintR), this._inLight(s.tintG), this._inLight(s.tintB), s.opacity], at.u_phaseBody);
		const wave = s.rippleScale > 0 ? s.rippleScale : Math.max(item.radius, 1e-3) * 0.35;
		data.set([1 / wave, s.split, 0, 0], at.u_phaseRipple);
	}

	/** One lit item drawn in a state. */
	protected _drawLitItem(pass: IgeGpuRenderPass, item: IgeWebGlRenderItem, state: LitState): void {
		{
			const skinned = !!item.skeleton;
			const geometry = item.drawGeometry;
			if (!geometry.gpuVertex) return;
			const phase = state === LitState.Transparent && item.phase ? item.phase : null;
			const pipeline = this._litPipeline(skinned, false, geometry, state, false, !!phase);
			const block = this._litBlock(skinned, false);
			const { data, at } = block;
			pass.setPipeline(pipeline);
			this._setMesh(pass, geometry);
			this._setLitTextures(pass, item.gpuBase, item.gpuEmissive);
			this._setLitMaps(pass, block, item, item.gpuMaps, state);
			data[at.u_hasVertexColors] = this._vertexColorFlag(geometry);
			this._writeItemUniforms(block, item, geometry);
			if (phase) this._writePhase(data, at, item, phase);
			if (skinned) this._writeBones(block, item);
			pass.setUniforms(data, [block.itemFrom, data.length]);
			this._drawMesh(pass, geometry, 1);
			this._stats.drawCalls++;
			this._countTriangles(geometry, 1);
		}
	}

	/**
	 * Draw items again as flat coloured silhouettes where they are hidden:
	 * the depth test passes only behind what's already drawn (GREATER), and
	 * a stencil mask of the items' own visible pixels keeps a character's
	 * far side from showing through its near side, so only the parts behind
	 * walls (and other things) show. Lighting is cancelled by drawing with a
	 * black base colour and the silhouette colour as emission.
	 */
	protected _drawOccluded(pass: IgeGpuRenderPass, items: IgeWebGlRenderItem[]): void {
		// Each item's own material values, kept to put back afterwards (9 numbers per item)
		const n = items.length * 9;
		if (!this._occludedSaved || this._occludedSaved.length < n) this._occludedSaved = new Float32Array(n * 2);
		const saved = this._occludedSaved;

		// 1. Mark in the stencil where these items are the front-most surface (drawn invisibly, depth "less or equal"
		//    with a little bias), so their own far side isn't outlined through their near side
		pass.clearStencil(0);
		pass.setStencilReference(1);
		this._drawLitItems(pass, items, LitState.MarkOccluded);

		// 2. The silhouettes: only behind something else (depth GREATER) and not over the items themselves
		for (let i = 0; i < items.length; i++) {
			const mat = items[i].material, c = items[i].occluded!, o = i * 9;
			saved[o] = mat.r; saved[o + 1] = mat.g; saved[o + 2] = mat.b; saved[o + 3] = mat.a; saved[o + 4] = mat.opacity;
			saved[o + 5] = mat.emissiveR; saved[o + 6] = mat.emissiveG; saved[o + 7] = mat.emissiveB; saved[o + 8] = mat.emissiveIntensity;
			mat.r = mat.g = mat.b = 0;
			mat.a = c.a;
			mat.opacity = 1;
			// (The silhouette colour is sRGB: as linear light under linear lighting, encoded back as it's drawn)
			mat.emissiveR = this._inLight(c.r);
			mat.emissiveG = this._inLight(c.g);
			mat.emissiveB = this._inLight(c.b);
			mat.emissiveIntensity = 1;
		}
		this._drawingSilhouettes = true;
		this._drawLitItems(pass, items, LitState.Occluded);
		this._drawingSilhouettes = false;
		// Put them back for the next view (the same items draw in every split-screen view)
		for (let i = 0; i < items.length; i++) {
			const mat = items[i].material, o = i * 9;
			mat.r = saved[o]; mat.g = saved[o + 1]; mat.b = saved[o + 2]; mat.a = saved[o + 3]; mat.opacity = saved[o + 4];
			mat.emissiveR = saved[o + 5]; mat.emissiveG = saved[o + 6]; mat.emissiveB = saved[o + 7]; mat.emissiveIntensity = saved[o + 8];
		}
	}

	/** Items drawn as flat, opaque white into an outline's mask (lighting cancelled: a black base, white emission), their own materials put back after. */
	protected _drawFlat(pass: IgeGpuRenderPass, items: IgeWebGlRenderItem[]): void {
		const n = items.length * 9;
		if (!this._occludedSaved || this._occludedSaved.length < n) this._occludedSaved = new Float32Array(n * 2);
		const saved = this._occludedSaved;
		for (let i = 0; i < items.length; i++) {
			const mat = items[i].material, o = i * 9;
			saved[o] = mat.r; saved[o + 1] = mat.g; saved[o + 2] = mat.b; saved[o + 3] = mat.a; saved[o + 4] = mat.opacity;
			saved[o + 5] = mat.emissiveR; saved[o + 6] = mat.emissiveG; saved[o + 7] = mat.emissiveB; saved[o + 8] = mat.emissiveIntensity;
			mat.r = mat.g = mat.b = 0;
			mat.a = mat.opacity = 1;
			mat.emissiveR = mat.emissiveG = mat.emissiveB = 1;
			mat.emissiveIntensity = 1;
		}
		this._drawingSilhouettes = true;
		this._drawLitItems(pass, items, LitState.Flat);
		this._drawingSilhouettes = false;
		for (let i = 0; i < items.length; i++) {
			const mat = items[i].material, o = i * 9;
			mat.r = saved[o]; mat.g = saved[o + 1]; mat.b = saved[o + 2]; mat.a = saved[o + 3]; mat.opacity = saved[o + 4];
			mat.emissiveR = saved[o + 5]; mat.emissiveG = saved[o + 6]; mat.emissiveB = saved[o + 7]; mat.emissiveIntensity = saved[o + 8];
		}
	}

	/**
	 * Each sprite's texture made ready before the pass, in draw order: a smart texture or bitmap font sheet drawn for its
	 * entity, or its IgeTexture's (one that isn't ready keeps the one before it, as a texture left bound did).
	 */
	protected _spriteTextures(sprites: IgeEntity[], into: (WebGLTexture | null)[]): (WebGLTexture | null)[] {
		into.length = sprites.length;
		const tm = this._textureManager;
		if (!tm) return into;
		let bound: IgeTexture | undefined;
		let current: WebGLTexture | null = tm.getDefaultWhiteTexture();
		for (let i = 0; i < sprites.length; i++) {
			const entity = sprites[i];
			const texture = entity._texture!;
			const perEntity = texture._renderMode === IgeTextureRenderMode.smartTexture || texture._rendersPerEntity;
			// (Pictures as they are, whatever the lighting: a sprite's colours are decoded after filtering, if at all, see _drawSprites)
			if (perEntity) {
				current = tm.getSmartTexture(texture, entity, this._devicePixelRatio, this._frameId) || tm.getDefaultWhiteTexture();
				bound = undefined;
			} else if (texture !== bound) {
				const t = tm.getTextureForIgeTexture(texture);
				if (t) current = t;
				bound = texture;
			}
			into[i] = current;
		}
		return into;
	}

	/** 2D sprites (textured quads, billboarded to face the camera, or flat in a y-down 2D view). */
	protected _drawSprites(pass: IgeGpuRenderPass, sprites: IgeEntity[], textures: (WebGLTexture | null)[], matrices: IgeCameraMatrices, flat2d: boolean, transparent: boolean): void {
		if (sprites.length === 0 || !this._geometryManager) return;
		const quad = this._geometryManager.getSharedQuadGeometry();
		if (!quad?.gpuVertex) return;
		const device = this._device!, programs = this._gpuPrograms!;
		// Sprites aren't lit: under linear lighting they keep the program they had (straight to the screen), or into
		// post-processing's linear frame have their finished colour decoded to linear light (2D looks the same either way)
		const variant = this._colorVariant === 1 ? 1 : 0;
		const pipeline = (additive: boolean) => programs.pipeline(`sprite|${transparent ? 1 : 0}|${additive ? 1 : 0}${variant ? `|c${variant}` : ""}`, () => ({
			module: programs.module("sprite", EFFECT_ATTRIBUTES, igeColorDefines(variant)),
			vertex: { buffers: [meshLayout(quad).layout] },
			primitive: { topology: "triangle-list" },
			blend: additive ? EFFECT_BLENDS.additive : NORMAL_BLEND,
			depth: { compare: "less-equal", write: !transparent },
			uniforms: SPRITE_UNIFORMS,
			textures: [{ name: "u_texture" }],
			label: `sprites${transparent ? " transparent" : ""}${additive ? " additive" : ""}`
		}));
		const data = this._spriteData, at = this._spriteBlock.offsets;
		const itemFrom = at.u_uvBounds;
		data.set(matrices.view.matrix, at.u_viewMatrix);
		data.set(matrices.projection.matrix, at.u_projectionMatrix);
		data[at.u_flipY] = flat2d ? -1 : 1;
		let first = true;
		for (let i = 0; i < sprites.length; i++) {
			const entity = sprites[i];
			const texture = entity._texture!;
			const material = entity._materialData;
			const perEntity = texture._renderMode === IgeTextureRenderMode.smartTexture || texture._rendersPerEntity;

			// Additive sprites brighten what's behind them (fire, sparks, magic)
			pass.setPipeline(pipeline(material?.blending === "additive"));
			pass.setVertexBuffer(0, quad.gpuVertex);
			pass.setIndexBuffer(quad.gpuIndex!, "uint16");
			const tex = textures[i];
			pass.setTexture(0, tex ? webGl2ExternalTexture(device, tex) : null);

			// Sprite sheet cell (cells are 1-based [x, y, width, height] in pixels)
			const cells = (texture as any)._cells as number[][] | undefined;
			const cell = cells && entity._cell ? cells[entity._cell] : undefined;
			const texW = (texture as any)._sizeX as number;
			const texH = (texture as any)._sizeY as number;
			if (!perEntity && cell && texW > 0 && texH > 0) {
				data[at.u_uvBounds] = cell[0] / texW;
				data[at.u_uvBounds + 1] = cell[1] / texH;
				data[at.u_uvBounds + 2] = (cell[0] + cell[2]) / texW;
				data[at.u_uvBounds + 3] = (cell[1] + cell[3]) / texH;
			} else {
				data[at.u_uvBounds] = 0;
				data[at.u_uvBounds + 1] = 0;
				data[at.u_uvBounds + 2] = 1;
				data[at.u_uvBounds + 3] = 1;
			}

			// Tint from the entity's material colour
			const color = material?.color;
			let r = 1, g = 1, b = 1, a = 1;
			if (color && typeof color === "object") {
				r = color.r; g = color.g; b = color.b; a = color.a ?? 1;
			} else if (typeof color === "string") {
				const rgb = parseHexColor(color);
				r = rgb[0]; g = rgb[1]; b = rgb[2];
			}
			data[at.u_tint] = r;
			data[at.u_tint + 1] = g;
			data[at.u_tint + 2] = b;
			data[at.u_tint + 3] = a;

			data.set(entity._worldMatrix4!.matrix, at.u_worldMatrix);
			data[at.u_scale] = entity._bounds2d.x;
			data[at.u_scale + 1] = entity._bounds2d.y;
			data[at.u_opacity] = entity._opacity;
			data[at.u_billboardMode] = flat2d ? 0 : entity._billboardMode;
			pass.setUniforms(data, first ? undefined : [itemFrom, data.length]);
			first = false;
			pass.drawIndexed(quad.indexCount);
			this._stats.drawCalls++;
		}
	}

	/**
	 * The device's GL handed to the renderer's own GL code for a stretch: what the device knew of GL's state forgotten
	 * first (GL code since may have changed anything). Pair with _gpuEnd() (passes) or not (resources made amid GL code).
	 */
	protected _gpuBegin(): IgeWebGl2GpuDevice {
		const device = this._device!;
		device.invalidate();
		return device;
	}

	/**
	 * GL handed back from the device to the renderer's own GL code, as its shadow passes left it: the canvas bound, no
	 * culling (back faces when it's on), depth tested less-or-equal and written, no blending, colour written, no
	 * scissor, unit 0 active; the state manager's cache forgotten.
	 */
	protected _gpuEnd(): void {
		const gl = this._canvasContext as WebGL2RenderingContext;
		const device = this._device!;
		// Only what the device left otherwise (what it set, it knows; release() puts back depth and colour writes,
		// the scissor and the stencil test)
		const s = device._state;
		if (s.fbo !== null) gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (s.cullOn !== false) gl.disable(gl.CULL_FACE);
		if (s.cullFace !== undefined && s.cullFace !== gl.BACK) gl.cullFace(gl.BACK);
		if (s.frontFace !== undefined && s.frontFace !== gl.CCW) gl.frontFace(gl.CCW);
		if (s.depthOn !== true) gl.enable(gl.DEPTH_TEST);
		if (s.depthFunc !== gl.LEQUAL) gl.depthFunc(gl.LEQUAL);
		if (s.blendOn !== false) gl.disable(gl.BLEND);
		if (s.offsetOn !== false) gl.disable(gl.POLYGON_OFFSET_FILL);
		const c = s.clearColor;
		if (!c || c[0] || c[1] || c[2] || c[3]) gl.clearColor(0, 0, 0, 0);
		if (s.unit !== 0) gl.activeTexture(gl.TEXTURE0);
		device.release();
		this._stateManager?.reset();
	}

	/**
	 * A depth pass's pipeline for a program (shadow or point_shadow, skinned or not, instanced or not) and a mesh's
	 * layout: depth tested less and written, front faces culled, nothing blended.
	 */
	protected _depthPipeline(programId: string, skinned: boolean, instanced: boolean, geometry: IgeWebGlGeometry): IgeGpuRenderPipeline {
		// (Kept on the mesh too, by kind: a pass's batches look theirs up without making a key)
		const slot = (programId.startsWith("point") ? 4 : 0) + (skinned ? 2 : 0) + (instanced ? 1 : 0);
		const kept = (geometry.gpuDepthPipelines ??= [])[slot];
		if (kept) return kept;
		const id = instanced ? `${programId}_instanced` : programId;
		const { layout, key } = meshLayout(geometry);
		return geometry.gpuDepthPipelines[slot] = this._gpuPrograms!.pipeline(`depth|${id}|${key}`, () => ({
			module: this._gpuPrograms!.module(id),
			vertex: { buffers: instanced ? [layout, INSTANCE_LAYOUT] : [layout] },
			primitive: { topology: meshTopology(geometry), cullMode: "front", frontFace: "ccw" },
			depth: { compare: "less", write: true },
			uniforms: depthUniforms(skinned, instanced),
			textures: skinned && instanced ? [{ name: "u_boneTexture" }] : [],
			label: `${id} depth`
		}));
	}

	/** A pipeline's uniform block, kept for its layout (the members its kind of depth pass has). */
	protected _depthBlock(pipeline: IgeGpuRenderPipeline, skinned: boolean, instanced: boolean): Float32Array {
		const slot = (skinned ? 2 : 0) + (instanced ? 1 : 0);
		let block = this._depthBlocks[slot];
		if (!block || block.length !== pipeline.uniformSize) {
			block = new Float32Array(pipeline.uniformSize);
			this._depthBlocks[slot] = block;
		}
		return block;
	}

	/**
	 * Draw depth-only batches (shadow passes) into a pass on the device. `shared` sets each block's members common to
	 * the pass (the light's matrix; a point light's position and far plane).
	 */
	protected _drawDepthBatches(
		pass: IgeGpuRenderPass,
		batches: IgeWebGlItemBatch[],
		baseId: string,
		skinnedId: string,
		shared: (block: Float32Array, offsets: Readonly<Record<string, number>>) => void
	): void {
		const device = this._device!;
		const palette = this._bonePalette;

		for (let b = 0; b < batches.length; b++) {
			const batch = batches[b];
			const geometry = batch.geometry;
			if (!geometry.gpuVertex) continue;
			const instanced = this._shouldInstance(batch);
			const skinned = batch.skinned;
			const pipeline = this._depthPipeline(skinned ? skinnedId : baseId, skinned, instanced, geometry);
			const block = this._depthBlock(pipeline, skinned, instanced);
			const at = pipeline.uniformOffsets;
			shared(block, at);

			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, geometry.gpuVertex);
			const indexed = !!geometry.gpuIndex && geometry.indexCount > 0;
			if (indexed) pass.setIndexBuffer(geometry.gpuIndex!, geometry.indexType === 0x1405 ? "uint32" : "uint16");
			if (!indexed && geometry.vertexCount <= 0) continue;

			if (instanced) {
				const count = batch.items.length;
				this._gpuInstanceData = packInstances(batch.items, 0, count, this._gpuInstanceData, geometry.positionDecode);
				device.writeBuffer(this._gpuInstances!, 0, this._gpuInstanceData.subarray(0, count * INSTANCE_FLOATS));
				pass.setVertexBuffer(1, this._gpuInstances!);
				if (skinned && palette) {
					pass.setTexture(0, palette.texture);
					block[at.u_useSkinning] = 1;
					block[at.u_boneTextureSize] = palette.width;
					block[at.u_boneTextureSize + 1] = Math.max(1, palette.height);
				}
				pass.setUniforms(block);
				if (indexed) pass.drawIndexed(geometry.indexCount, count);
				else pass.draw(geometry.vertexCount, count);
				this._stats.instancedDrawCalls++;
				this._stats.instances += count;
				this._countTriangles(geometry, count);
				this._stats.shadowDrawCalls++;
			} else {
				for (let i = 0; i < batch.items.length; i++) {
					const item = batch.items[i];
					block.set(this._drawWorld(item, geometry), at.u_worldMatrix);
					if (skinned) {
						const skeleton = item.skeleton;
						block[at.u_useSkinning] = skeleton ? 1 : 0;
						if (skeleton) {
							const boneCount = Math.min(skeleton.data.boneCount, MAX_BONES);
							block.set(skeleton.skinMatrices.subarray(0, boneCount * 16), at["u_boneMatrices[0]"]);
						}
					}
					pass.setUniforms(block);
					if (indexed) pass.drawIndexed(geometry.indexCount);
					else pass.draw(geometry.vertexCount);
					this._stats.shadowDrawCalls++;
					this._countTriangles(geometry, 1);
				}
			}
		}
	}

	/**
	 * Render the directional light's shadow map for one viewport (or the shared map), in each of its cascades' tiles
	 * (one: the whole map). Casters are culled against each cascade's light box (not the camera's frustum), so objects
	 * just off-screen still cast shadows into view. Casters drawn over the cache (or every caster, when there is no
	 * cache) are also dropped from a cascade when `viewFrustum` (the viewport's camera) is given and the shadow they
	 * could cast, anywhere along the light's depth, can't land in the cascade's slice of the view. Static casters are
	 * never dropped this way, so the cache doesn't depend on where the camera looks. With more than one cascade, a
	 * caster under a texel of a cascade is left out of it.
	 */
	protected _renderDirectionalShadowPass(data: IgeWebGlSceneFrameData, viewFrustum?: IgeFrustum, view?: IgeCameraMatrices): void {
		if (!this._shadowManager) return;
		const shadowManager = this._shadowManager;
		const lightId = this._shadowLightId;
		const cascades = shadowManager.getCascades(lightId);
		const count = cascades.length;
		if (count === 0) return;
		this._stats.shadowCascades += count;

		// Cache static casters when this is the frame's only directional pass
		// (A panel's pass isn't counted and never caches, so it can't switch the main view's caching off)
		if (!this._inPanel) this._directionalPassesThisFrame++;
		const cache = this._shadowCaching && !this._inPanel && this._directionalPassesLastFrame <= 1
			? shadowManager.getShadowCache(lightId)
			: null;

		// Each cascade's light box, shadow texels per world unit, and for culling against the view: its slice of the
		// view, the light's direction (towards deeper depth), its depth span and a margin
		const cull = !!viewFrustum && this._shadowCasterCulling;
		const v = view?.view.matrix;
		// A caster's shadow runs from it along the light down to the lowest surface that takes one (the fit's band):
		// swept that far, one way, when it's known and the light comes from above; else its box's whole depth both ways
		if (cull) this._shadowFitBand(data);
		const floor = this._shadowBandMin;
		const texels = this._cascadeTexels, sweep = this._cascadeSweep;
		for (let k = 0; k < count; k++) {
			const c = cascades[k], m = c.matrix;
			this._lightFrustumMatrix.matrix.set(m);
			(this._cascadeLightFrusta[k] ??= new IgeFrustum()).extractFromMatrix(this._lightFrustumMatrix);
			(this._cascadeBatchers[k] ??= new IgeWebGlItemBatcher()).begin();
			(this._cascadeStaticBatchers[k] ??= new IgeWebGlItemBatcher()).begin();
			(this._cascadeSignatures[k] ??= new IgeShadowSignature()).reset();
			const across = Math.hypot(m[0], m[4], m[8]);
			texels[k] = across * c.viewport[2] * 0.5;
			sweep[k * 5 + 3] = 0;
			if (!cull) continue;
			const g = Math.hypot(m[2], m[6], m[10]);
			if (g <= 1e-9) continue;
			sweep[k * 5] = m[2] / g;
			sweep[k * 5 + 1] = m[6] / g;
			sweep[k * 5 + 2] = m[10] / g;
			sweep[k * 5 + 3] = 2 / g;
			// (The box's size is its matrix's: the larger half-size across the light)
			sweep[k * 5 + 4] = Math.max(1 / across, 1 / Math.hypot(m[1], m[5], m[9])) * SHADOW_CULL_MARGIN;
			// The view's frustum, its near and far planes moved to the slice's (with its blend from the slice before)
			const slice = (this._cascadeViewFrusta[k] ??= new IgeFrustum());
			for (let p = 0; p < 6; p++) {
				const from = viewFrustum!.planes[p];
				slice.planes[p].set(from.a, from.b, from.c, from.d);
			}
			if (count > 1 && v) {
				if (c.from > 0) {
					slice.planes[4].set(-v[2], -v[6], -v[10], -v[14] - c.from);
					slice.planes[4].normalize();
				}
				if (c.split < Infinity) {
					slice.planes[5].set(v[2], v[6], v[10], v[14] + c.split);
					slice.planes[5].normalize();
				}
			}
		}

		const frameId = this._frameId;
		let movingCount = 0;
		const models = data.models;
		for (let i = 0; i < models.length; i++) {
			const item = models[i];
			if (!item.castShadow) continue;
			const entity = item.entity;
			let seen = false;
			let isStatic: boolean | undefined;
			// Its shadow's reach down the light (to the floor), or -1: both ways the box's depth
			let reach = -1;
			for (let k = 0; k < count; k++) {
				if (item.radius >= 0 && !this._cascadeLightFrusta[k].containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) continue;
				if (!seen) {
					seen = true;
					entity._lastRenderedFrame = frameId;
				}
				// Split: under a texel of this cascade, its shadow would be lost in the filter
				if (count > 1 && item.radius >= 0 && item.lodRadius * 2 * texels[k] < SHADOW_MIN_TEXELS) {
					this._stats.shadowCastersCulled++;
					continue;
				}

				let key = item.depthKey;
				let geometry = item.geometry;
				if (item.lodSizes) {
					const level = this._lodLevel(item, texels[k]);
					key = item.lodDepthKeys[level];
					geometry = item.lodGeometries[level];
				}

				if (cache) {
					isStatic ??= igeShadowCasterIsStatic(entity, frameId, !!item.skeleton, item.skeleton?.poseVersion);
					if (isStatic) {
						if (!entity._renderUid) entity._renderUid = nextRenderUid++;
						this._cascadeSignatures[k].add(entity._renderUid, geometry.uid, entity._transformVersion);
						this._cascadeStaticBatchers[k].add(item, key, geometry);
						continue;
					}
				}
				const s = k * 5;
				if (sweep[s + 3] > 0 && item.radius >= 0) {
					const lx = sweep[s], ly = sweep[s + 1], lz = sweep[s + 2];
					if (reach === -1 && floor > -Infinity && ly < -0.05) reach = Math.max(0, item.cy + item.radius - floor) / -ly;
					// (Swept from its middle half its reach each way: from it to where its shadow meets the floor)
					const half = reach >= 0 ? reach / 2 : sweep[s + 3];
					const off = reach >= 0 ? half : 0;
					if (!this._cascadeViewFrusta[k].sweptSphereVisibleXYZ(
						item.cx + lx * off, item.cy + ly * off, item.cz + lz * off, item.radius + sweep[s + 4], lx, ly, lz, half
					)) {
						this._stats.shadowCastersCulled++;
						continue;
					}
				}
				if (cache) movingCount++;
				this._cascadeBatchers[k].add(item, key, geometry);
			}
		}

		this._gpuBegin();
		try {
			this._directionalPasses(cache, cascades, movingCount);
		} finally {
			this._gpuEnd();
		}
	}

	/**
	 * The directional shadow map's passes on the device, each cascade into its tile: the map drawn whole, or the static
	 * cache's tiles (redrawn if they must be) copied in and what moves drawn over them.
	 */
	protected _directionalPasses(
		cache: ReturnType<IgeWebGlShadowManager["getShadowCache"]>,
		cascades: readonly IgeShadowCascade[],
		movingCount: number
	): void {
		const shadowManager = this._shadowManager!;
		const lightId = this._shadowLightId;
		const count = cascades.length;
		const drawCascades = (pass: IgeGpuRenderPass, batchers: IgeWebGlItemBatcher[]) => {
			for (let k = 0; k < count; k++) {
				shadowManager.shadowTile(pass, lightId, k);
				this._depthMatrix.set(cascades[k].matrix);
				this._drawDepthBatches(pass, batchers[k].batches, "shadow", "skinned_shadow", this._depthShared);
			}
		};

		if (!cache) {
			const pass = shadowManager.beginShadowPass(lightId);
			if (!pass) return;
			drawCascades(pass, this._cascadeBatchers);
			shadowManager.endShadowPass(pass);
			this._shadowMapHoldsCache = false;
			return;
		}

		// Laid out for another number of cascades (or the whole map): every tile redrawn
		if (cache.layout !== count) {
			for (const tile of cache.tiles) tile.valid = false;
			cache.layout = count;
		}
		// Redraw a tile only when its static casters or its box changed
		let stale = 0;
		for (let k = 0; k < count; k++) {
			const tile = cache.tiles[k], m = cascades[k].matrix;
			let same = tile.valid;
			for (let j = 0; same && j < 16; j++) same = tile.matrix[j] === m[j];
			if (!same || !this._cascadeSignatures[k].matches(tile)) stale |= 1 << k;
		}
		if (stale) {
			const whole = stale === (1 << count) - 1;
			const pass = shadowManager.beginShadowCachePass(lightId, whole);
			if (pass) {
				for (let k = 0; k < count; k++) {
					if (!(stale & (1 << k))) continue;
					shadowManager.shadowTile(pass, lightId, k, !whole);
					this._depthMatrix.set(cascades[k].matrix);
					this._drawDepthBatches(pass, this._cascadeStaticBatchers[k].batches, "shadow", "skinned_shadow", this._depthShared);
				}
				shadowManager.endShadowPass(pass);
			}
			for (let k = 0; k < count; k++) {
				if (!(stale & (1 << k))) continue;
				const tile = cache.tiles[k], signature = this._cascadeSignatures[k];
				tile.matrix.set(cascades[k].matrix);
				tile.count = signature.count;
				tile.signatureA = signature.a;
				tile.signatureB = signature.b;
				tile.valid = true;
				this._stats.shadowCacheRebuilds++;
			}
			this._shadowMapHoldsCache = false;
		}

		// Nothing moving and the map already holds the cache: reuse it as is
		if (movingCount === 0 && this._shadowMapHoldsCache) return;

		if (shadowManager.copyShadowCache(lightId)) this._stats.shadowCacheCopies++;
		const pass = movingCount > 0 ? shadowManager.beginShadowPass(lightId, false) : null;
		if (pass) {
			const before = this._stats.shadowDrawCalls;
			drawCascades(pass, this._cascadeBatchers);
			this._stats.dynamicShadowDraws += this._stats.shadowDrawCalls - before;
			shadowManager.endShadowPass(pass);
		}
		this._shadowMapHoldsCache = movingCount === 0;
	}

	/**
	 * Render point light shadow atlases (6 faces per shadow-casting light).
	 * Runs once per frame; casters are every shadow-casting item in range of
	 * the light across all scenes being rendered.
	 */
	protected _renderPointLightShadowPasses(): void {
		if (!this._shadowManager) {
			return;
		}

		const batcher = this._depthBatcher;

		for (const pointLight of this._shadowCastingPointLights) {
			const lightId = pointLight.id();

			// Update the 6 light-space matrices for this light's current position
			if (!this._shadowManager.updatePointLightSpaceMatrices(lightId, pointLight)) {
				continue;
			}

			const pos = pointLight._translate;

			// Get the far plane from the shadow map data so depth pass and lookup match
			const shadowData = this._shadowManager.getPointShadowMapData(lightId);
			const farPlane = shadowData?.farPlane ?? ((pointLight as any)._range as number || 500);

			// Gather casters within the light's shadow range. Each cube face
			// has a 90 degree field of view, so an item at distance d covers
			// (faceSize / 2) / d texels per world unit.
			const halfFace = (shadowData?.faceSize ?? 512) * 0.5;
			const casters = this._pointCasterItems;
			const casterKeys = this._pointCasterKeys;
			const casterGeometries = this._pointCasterGeometries;
			casters.length = 0;
			casterKeys.length = 0;
			casterGeometries.length = 0;

			for (let i = 0; i < this._itemCount; i++) {
				const item = this._itemPool[i];
				if (!item.castShadow) continue;
				let distance = 0;
				if (item.radius >= 0) {
					const dx = item.cx - pos.x, dy = item.cy - pos.y, dz = item.cz - pos.z;
					const reach = farPlane + item.radius;
					const distSq = dx * dx + dy * dy + dz * dz;
					if (distSq > reach * reach) continue;
					distance = Math.sqrt(distSq);
				}
				item.entity._lastRenderedFrame = this._frameId;
				casters.push(item);
				if (item.lodSizes && distance > 0) {
					const level = this._lodLevel(item, halfFace / distance);
					casterKeys.push(item.lodDepthKeys[level]);
					casterGeometries.push(item.lodGeometries[level]);
				} else {
					casterKeys.push(item.depthKey);
					casterGeometries.push(item.geometry);
				}
			}

			// The whole atlas cleared, then each face drawn in its own region
			this._gpuBegin();
			try {
				const pass = this._shadowManager.beginPointShadowPass(lightId);
				if (!pass) continue;
				for (let face = 0; face < 6; face++) {
					const lightSpaceMatrix = this._shadowManager.getPointLightSpaceMatrix(lightId, face);
					if (!lightSpaceMatrix || !this._shadowManager.pointShadowFace(pass, lightId, face)) continue;

					// Only the casters inside this face's 90 degree frustum
					this._lightFrustum.extractFromMatrix(lightSpaceMatrix);
					batcher.begin();
					for (let c = 0; c < casters.length; c++) {
						const item = casters[c];
						if (item.radius >= 0 && !this._lightFrustum.containsSphereXYZ(item.cx, item.cy, item.cz, item.radius)) {
							continue;
						}
						batcher.add(item, casterKeys[c], casterGeometries[c]);
					}

					this._drawDepthBatches(pass, batcher.batches, "point_shadow", "skinned_point_shadow", (block, at) => {
						block.set(lightSpaceMatrix.matrix, at.u_lightSpaceMatrix);
						block[at.u_pointLightPosition] = pos.x;
						block[at.u_pointLightPosition + 1] = pos.y;
						block[at.u_pointLightPosition + 2] = pos.z;
						block[at.u_pointShadowFarPlane] = farPlane;
					});
				}
				this._shadowManager.endShadowPass(pass);
			} finally {
				this._gpuEnd();
			}
		}
	}

	/**
	 * Outlines (IgeEntity.outline()), over the finished frame: for each view's
	 * outlined items, grouped by outline, the items are drawn flat into a
	 * mask (only inside their rectangle on screen), then IgeWebGlOutlinePass
	 * draws the line round it onto the frame. Nothing outlined: nothing done.
	 */
	protected _renderOutlines(): void {
		const jobs = this._outlineJobs;
		if (!jobs || jobs.length === 0) return;
		const gl = this._canvasContext;
		if (!gl || !this._stateManager || this._contextLost) {
			jobs.length = 0;
			return;
		}
		this._outlinePass ??= new IgeWebGlOutlinePass(this._device!);
		const pass = this._outlinePass;
		// (The mask is read by its alpha: the program variant only has to be one that's made)
		this._colorVariant = this._linear ? 2 : 0;
		const target = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
		const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
		const dpr = this._devicePixelRatio;
		for (const job of jobs) {
			for (const group of outlineGroups(job.items)) {
				const o = group.outline;
				const radius = Math.max(1, Math.min(OUTLINE_MAX_RADIUS, Math.round(o.width * dpr)));
				// Where they are on screen, with room for the line
				const n = group.items.length * 4;
				if (this._outlineSpheres.length < n) this._outlineSpheres = new Float32Array(n * 2);
				const spheres = this._outlineSpheres;
				for (let i = 0; i < group.items.length; i++) {
					const it = group.items[i];
					spheres[i * 4] = it.cx; spheres[i * 4 + 1] = it.cy; spheres[i * 4 + 2] = it.cz; spheres[i * 4 + 3] = it.radius >= 0 ? it.radius : 1e6;
				}
				const rect = outlineRect(spheres.subarray(0, n), job.matrices.viewProjection.matrix, job.view, radius + 2);
				if (!rect) continue;
				for (const item of group.items) this._prepareTextures(item, item);
				// The items, flat and opaque, in the view they were drawn in: no depth test, no blending
				const mask = pass.beginMask(width, height, rect);
				if (!mask) break;
				mask.setViewport(job.view.x0, job.view.y0, job.view.x1 - job.view.x0, job.view.y1 - job.view.y0);
				this._writeLitView(job.matrices);
				this._drawFlat(mask, group.items);
				pass.endMask(mask);
				pass.composite(target, rect, o, radius);
				this._stats.drawCalls++;
			}
		}
		jobs.length = 0;
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		this._stateManager.reset();
		gl.depthFunc(gl.LEQUAL);
	}

	/**
	 * Upload a particle or decal system's packed render data to its own
	 * GPU buffer (once per frame, only when it changed). The count uploaded
	 * is kept with it and is what's drawn this frame, so a draw never asks
	 * for more instances than the buffer holds. Buffers of systems that
	 * haven't been seen for a while are deleted.
	 */
	protected _uploadInstanceData(system: IgeWebGlInstanceSource, floatsPerInstance: number): void {
		const device = this._device;
		if (!device) return;

		let entry = this._particleBuffers.get(system);
		if (!entry) {
			entry = { buffer: device.createBuffer({ size: 0, usage: "vertex", stream: true, label: "effect instances" }), version: -1, count: 0, lastFrame: 0 };
			this._particleBuffers.set(system, entry);
		}
		entry.lastFrame = this._frameId;

		// (renderData() packs anything added since the system's update first, so count and data agree)
		const { data, count } = system.renderData();
		if (entry.version !== system._renderVersion || entry.count !== count) {
			if (count > 0) device.writeBuffer(entry.buffer, 0, data.subarray(0, count * floatsPerInstance));
			entry.version = system._renderVersion;
			entry.count = count;
		}

		// Periodically free buffers belonging to systems no longer rendered
		if ((this._frameId & 127) === 0) {
			this._particleBuffers.forEach((value, key) => {
				if (this._frameId - value.lastFrame > 120) {
					device.destroyBuffer(value.buffer);
					this._particleBuffers.delete(key);
				}
			});
		}
	}

	/**
	 * A soft round white dot, used by particle systems without a texture.
	 */
	protected _getDefaultParticleTexture(): IgeGpuTexture | null {
		if (this._defaultParticleTexture || !this._device) {
			return this._defaultParticleTexture;
		}

		const size = 64;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		gradient.addColorStop(0, "rgba(255,255,255,1)");
		gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
		gradient.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);

		const device = this._device;
		const texture = device.createTexture({
			width: size, height: size, format: "rgba8unorm", label: "default particle",
			sampler: { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" }
		});
		device.copyImageToTexture(canvas, texture, { premultiply: false, flipY: false });

		this._defaultParticleTexture = texture;
		return texture;
	}

	/**
	 * The built-in decal texture: a 2x2 atlas of white splats (alpha is the
	 * shape) for IgeDecalSystem3d without a texture of its own. Generated
	 * from a fixed seed so every run looks the same.
	 */
	protected _getDefaultDecalTexture(): IgeGpuTexture | null {
		if (this._defaultDecalTexture || !this._device) {
			return this._defaultDecalTexture;
		}

		const cell = 128;
		const canvas = document.createElement("canvas");
		canvas.width = cell * 2;
		canvas.height = cell * 2;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		let seed = 1337;
		const random = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};

		const blob = (x: number, y: number, radius: number, alpha: number) => {
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
			gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
			gradient.addColorStop(0.85, `rgba(255,255,255,${alpha * 0.8})`);
			gradient.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
		};

		for (let c = 0; c < 4; c++) {
			const cx = (c % 2) * cell + cell / 2;
			const cy = Math.floor(c / 2) * cell + cell / 2;
			const maxReach = cell / 2 - 6; // keep clear of neighbouring cells

			// Main pool: overlapping lobes around the centre
			const lobes = 5 + Math.floor(random() * 4);
			for (let i = 0; i < lobes; i++) {
				const angle = random() * Math.PI * 2;
				const distance = random() * 14;
				blob(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, 16 + random() * 14, 0.95);
			}

			// Splashes thrown outwards, getting smaller with distance
			const drops = 8 + Math.floor(random() * 10);
			for (let i = 0; i < drops; i++) {
				const angle = random() * Math.PI * 2;
				const distance = 26 + random() * (maxReach - 34);
				const radius = Math.max(1.5, 7 - distance / 9) * (0.6 + random() * 0.6);
				blob(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, radius, 0.9);
			}
		}

		const device = this._device;
		const texture = device.createTexture({
			width: cell * 2, height: cell * 2, format: "rgba8unorm", mipmaps: true, label: "default decals",
			sampler: { minFilter: "linear", mipmapFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", maxAnisotropy: this._textureManager?.anisotropy() ?? 1 }
		});
		device.copyImageToTexture(canvas, texture, { premultiply: false, flipY: false });
		device.generateMipmaps(texture);

		this._defaultDecalTexture = texture;
		return texture;
	}

	/**
	 * An effect's pipeline (particles, decal quads, projected decals) as it's blended: depth tested less-or-equal,
	 * not written; decals pulled towards the camera (a polygon offset) so they never fight the surface they lie on.
	 */
	protected _effectPipeline(kind: "particle" | "decal" | "decal_mesh", blend: "normal" | "additive" | "multiply"): IgeGpuRenderPipeline {
		const programs = this._gpuPrograms!;
		const id = kind === "decal_mesh" ? kind : `${kind}_instanced`;
		const variant = this._colorVariant || 0;
		return programs.pipeline(`effect|${id}|${blend}${variant ? `|c${variant}` : ""}`, () => {
			const quad = meshLayout(this._geometryManager!.getSharedQuadGeometry()!).layout;
			return {
				module: programs.module(id, EFFECT_ATTRIBUTES, igeColorDefines(variant)),
				vertex: { buffers: kind === "particle" ? [quad, PARTICLE_LAYOUT] : kind === "decal" ? [quad, DECAL_LAYOUT] : [DECAL_MESH_LAYOUT] },
				primitive: { topology: "triangle-list", cullMode: "none" },
				blend: EFFECT_BLENDS[blend],
				depth: { compare: "less-equal", write: false, bias: kind === "particle" ? undefined : { constant: -4, slopeScale: -1 } },
				uniforms: EFFECT_UNIFORMS,
				textures: [{ name: "u_texture" }],
				label: `${id} ${blend}`
			};
		});
	}

	/** The effect passes' uniform block, the camera's and the fog's set (the per-system members are set as each draws). */
	protected _effectUniforms(pipeline: IgeGpuRenderPipeline, matrices: IgeCameraMatrices): Float32Array {
		if (!this._effectBlock || this._effectBlock.length !== pipeline.uniformSize) this._effectBlock = new Float32Array(pipeline.uniformSize);
		const block = this._effectBlock, at = pipeline.uniformOffsets;
		block.set(matrices.view.matrix, at.u_viewMatrix);
		block.set(matrices.projection.matrix, at.u_projectionMatrix);
		const cam = matrices.cameraPosition;
		block[at.u_cameraPosition] = cam.x;
		block[at.u_cameraPosition + 1] = cam.y;
		block[at.u_cameraPosition + 2] = cam.z;
		const fog = this._fog;
		block[at.u_fogMode] = fog.mode === "linear" ? 1 : fog.mode === "exp2" ? 2 : 0;
		block[at.u_fogNear] = fog.near;
		block[at.u_fogFar] = fog.far;
		block[at.u_fogDensity] = fog.density;
		return block;
	}

	/** The decal systems in view (their quads, and their projected decals), with their textures made ready before the pass. */
	protected _visibleDecals(systems: IgeDecalSystem3d[], matrices: IgeCameraMatrices): { quads: { system: IgeDecalSystem3d; count: number; texture: WebGLTexture | null }[]; meshes: { system: IgeDecalSystem3d; texture: WebGLTexture | null }[] } {
		const quads: { system: IgeDecalSystem3d; count: number; texture: WebGLTexture | null }[] = [];
		const meshes: { system: IgeDecalSystem3d; texture: WebGLTexture | null }[] = [];
		for (let s = 0; s < systems.length; s++) {
			const system = systems[s];
			// The instances uploaded this frame (_uploadInstanceData), not the system's count now
			const count = this._particleBuffers.get(system)?.count ?? 0;
			if (count === 0) continue;
			const c = system._boundsCenter;
			if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._boundsRadius)) continue;
			system._lastRenderedFrame = this._frameId;
			quads.push({ system, count, texture: this._systemTexture(system._options.texture) });
		}
		for (let s = 0; s < systems.length; s++) {
			const system = systems[s];
			if (system.meshRenderData().vertexCount === 0) continue;
			const c = system._meshBoundsCenter;
			if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._meshBoundsRadius)) continue;
			meshes.push({ system, texture: this._systemTexture(system._options.texture) });
		}
		return { quads, meshes };
	}

	/** A particle or decal system's own texture (the texture manager's, made as first asked for), or the white one. */
	protected _systemTexture(texture: IgeTexture | undefined): WebGLTexture | null {
		if (!texture || !this._textureManager) return null;
		return this._textureManager.getTextureForIgeTexture(texture, this._srgbColor(texture)) || this._textureManager.getDefaultWhiteTexture();
	}

	/**
	 * Decal systems as quads lying on the ground, one instanced call per system, then their projected decals: depth
	 * tested, not written, pulled forward so they never fight the ground they lie on.
	 */
	protected _drawDecals(pass: IgeGpuRenderPass, decals: ReturnType<IgeWebGlRenderer["_visibleDecals"]>, matrices: IgeCameraMatrices): void {
		const { quads, meshes } = decals;
		if (quads.length || meshes.length) {
			const device = this._device!;
			const quad = this._geometryManager!.getSharedQuadGeometry()!;
			for (const { system, count, texture } of quads) {
				const entry = this._particleBuffers.get(system);
				if (!entry) continue;
				const multiply = system._options.blending !== "normal";
				const pipeline = this._effectPipeline("decal", multiply ? "multiply" : "normal");
				const block = this._effectUniforms(pipeline, matrices);
				const at = pipeline.uniformOffsets;
				block[at.u_multiply] = multiply ? 1 : 0;
				block[at.u_atlasGrid] = system.atlasGrid();
				pass.setPipeline(pipeline);
				pass.setVertexBuffer(0, quad.gpuVertex!);
				pass.setVertexBuffer(1, entry.buffer);
				pass.setIndexBuffer(quad.gpuIndex!, "uint16");
				pass.setTexture(0, texture ? webGl2ExternalTexture(device, texture) : this._getDefaultDecalTexture());
				pass.setUniforms(block);
				pass.drawIndexed(quad.indexCount, count);
				this._stats.instancedDrawCalls++;
				this._stats.instances += count;
			}
			this._renderProjectedDecals(pass, meshes, matrices);
		}
		this._freeDecalMeshBuffers();
	}

	/**
	 * Draw projected decals (IgeDecalSystem3d.project()): each system's
	 * decal triangles are one world-space vertex buffer and one draw call.
	 */
	protected _renderProjectedDecals(pass: IgeGpuRenderPass, meshes: { system: IgeDecalSystem3d; texture: WebGLTexture | null }[], matrices: IgeCameraMatrices): void {
		const device = this._device!;
		for (const { system, texture } of meshes) {
			const { data, vertexCount } = system.meshRenderData();
			let entry = this._decalMeshBuffers.get(system);
			if (!entry) {
				entry = { buffer: device.createBuffer({ size: 0, usage: "vertex", stream: true, label: "projected decals" }), version: -1, lastFrame: 0 };
				this._decalMeshBuffers.set(system, entry);
			}
			entry.lastFrame = this._frameId;
			if (entry.version !== system._meshRenderVersion) {
				device.writeBuffer(entry.buffer, 0, data.subarray(0, vertexCount * DECAL_MESH_VERTEX_FLOATS));
				entry.version = system._meshRenderVersion;
			}

			const multiply = system._options.blending !== "normal";
			const pipeline = this._effectPipeline("decal_mesh", multiply ? "multiply" : "normal");
			const block = this._effectUniforms(pipeline, matrices);
			block[pipeline.uniformOffsets.u_multiply] = multiply ? 1 : 0;
			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, entry.buffer);
			pass.setTexture(0, texture ? webGl2ExternalTexture(device, texture) : this._getDefaultDecalTexture());
			pass.setUniforms(block);
			pass.draw(vertexCount);
			this._stats.drawCalls++;
		}
	}

	/** The projected decals' buffers of systems no longer drawn, freed now and then. */
	protected _freeDecalMeshBuffers(): void {
		if ((this._frameId & 127) !== 0 || !this._device) return;
		this._decalMeshBuffers.forEach((value, key) => {
			if (this._frameId - value.lastFrame > 120) {
				this._device!.destroyBuffer(value.buffer);
				this._decalMeshBuffers.delete(key);
			}
		});
	}

	/** The particle systems in view, with their textures made ready before the pass. */
	protected _visibleParticles(systems: IgeParticleSystem3d[], matrices: IgeCameraMatrices): { system: IgeParticleSystem3d; count: number; texture: WebGLTexture | null }[] {
		const drawn: { system: IgeParticleSystem3d; count: number; texture: WebGLTexture | null }[] = [];
		for (let s = 0; s < systems.length; s++) {
			const system = systems[s];
			// The instances uploaded this frame (_uploadInstanceData), not the system's count now
			const count = this._particleBuffers.get(system)?.count ?? 0;
			if (count === 0) continue;
			const c = system._boundsCenter;
			if (!matrices.frustum.containsSphereXYZ(c.x, c.y, c.z, system._boundsRadius)) continue;
			system._lastRenderedFrame = this._frameId;
			drawn.push({ system, count, texture: this._systemTexture(system._options.texture) });
		}
		return drawn;
	}

	/** Particle systems as camera-facing quads, one instanced call per system: depth tested, not written. */
	protected _drawParticles(pass: IgeGpuRenderPass, drawn: ReturnType<IgeWebGlRenderer["_visibleParticles"]>, matrices: IgeCameraMatrices): void {
		if (!drawn.length) return;
		const device = this._device!;
		const quad = this._geometryManager!.getSharedQuadGeometry()!;
		for (const { system, count, texture } of drawn) {
			const entry = this._particleBuffers.get(system);
			if (!entry) continue;
			const pipeline = this._effectPipeline("particle", system._options.blending !== "normal" ? "additive" : "normal");
			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, quad.gpuVertex!);
			pass.setVertexBuffer(1, entry.buffer);
			pass.setIndexBuffer(quad.gpuIndex!, "uint16");
			pass.setTexture(0, texture ? webGl2ExternalTexture(device, texture) : this._getDefaultParticleTexture());
			pass.setUniforms(this._effectUniforms(pipeline, matrices));
			pass.drawIndexed(quad.indexCount, count);
			this._stats.instancedDrawCalls++;
			this._stats.instances += count;
		}
	}

	/**
	 * Get the light manager for adding/removing scene lights.
	 */
	get lightManager(): IgeWebGlLightManager | undefined {
		return this._lightManager;
	}

	/**
	 * Get the shadow manager for shadow configuration.
	 */
	get shadowManager(): IgeWebGlShadowManager | undefined {
		return this._shadowManager;
	}

	/**
	 * Get the skeleton manager for skeletal animation.
	 */
	get skeletonManager(): IgeWebGlSkeletonManager | undefined {
		return this._skeletonManager;
	}

	/**
	 * Enable shadow casting for a directional light.
	 * @param light The directional light to cast shadows
	 * @param shadowMapSize Size of the shadow map texture (default: 1024)
	 */
	enableShadows(light: IgeDirectionalLight, shadowMapSize: number = 1024): boolean {
		if (!this._shadowManager) {
			this.log("Shadow manager not initialized", "error");
			return false;
		}

		// Create shadow map for this light
		const success = this._shadowManager.createShadowMap(this._shadowLightId, {
			size: shadowMapSize,
			bias: light.shadowBias() as number,
			normalBias: 0.0
		});

		if (success) {
			this._shadowCastingLight = light;
			light.castShadow(true);
			this.log(`Shadows enabled for directional light (${shadowMapSize}x${shadowMapSize})`);
		}

		return success;
	}

	/**
	 * Disable shadow casting.
	 */
	disableShadows(): void {
		if (!this._shadowManager) return;

		this._shadowManager.deleteShadowMap(this._shadowLightId);
		if (this._shadowCastingLight) {
			this._shadowCastingLight.castShadow(false);
		}
		this._shadowCastingLight = undefined;
		this.log("Shadows disabled");
	}

	/**
	 * Enable shadow casting for a point light.
	 * Maximum of 2 shadow-casting point lights supported.
	 * @param light The point light to cast shadows
	 * @param shadowMapSize Size of each shadow map face (default: 512)
	 */
	enablePointLightShadows(light: IgePointLight, shadowMapSize: number = 512): boolean {
		if (!this._shadowManager) {
			this.log("Shadow manager not initialized", "error");
			return false;
		}

		if (this._shadowCastingPointLights.length >= 2) {
			this.log("Maximum of 2 shadow-casting point lights reached", "warning");
			return false;
		}

		if (this._shadowCastingPointLights.includes(light)) {
			return true; // Already enabled
		}

		const range = (light as any)._range as number || 500;
		const success = this._shadowManager.createPointShadowMap(light.id(), {
			size: shadowMapSize,
			bias: 0.0,
			nearPlane: 0.5,
			farPlane: 1000
		});

		if (success) {
			this._shadowCastingPointLights.push(light);
			light.castShadow(true);
			this.log(`Point light shadows enabled for ${light.id()} (6x ${shadowMapSize}x${shadowMapSize})`);
		}

		return success;
	}

	/**
	 * Disable shadow casting for a specific point light.
	 */
	disablePointLightShadows(light: IgePointLight): void {
		if (!this._shadowManager) return;

		const index = this._shadowCastingPointLights.indexOf(light);
		if (index === -1) return;

		this._shadowManager.deletePointShadowMap(light.id());
		light.castShadow(false);
		this._shadowCastingPointLights.splice(index, 1);
		this.log(`Point light shadows disabled for ${light.id()}`);
	}

	/**
	 * Check if shadows are enabled.
	 */
	shadowsEnabled(): boolean {
		return !!(this._shadowManager?.enabled() && this._shadowCastingLight);
	}

	/**
	 * Get or set shadow debug mode.
	 * 0 = normal rendering
	 * 1 = visualize projected UV coordinates
	 * 2 = visualize fragment depth in light space
	 * 3 = visualize sampled shadow map depth
	 * 4 = visualize depth comparison (red=shadow, green=lit)
	 */
	shadowDebugMode(mode?: number): number | this {
		if (mode !== undefined) {
			this._shadowDebugMode = mode;
			return this;
		}
		return this._shadowDebugMode;
	}

	/**
	 * Toggle fullscreen mode.
	 */
	toggleFullScreen = (): void => {
		if (!this._canvasElement) return;

		if (!document.fullscreenElement) {
			this._canvasElement.requestFullscreen().catch((err) => {
				this.log(`Error attempting to enable fullscreen: ${err.message}`, "error");
			});
		} else {
			document.exitFullscreen();
		}
	};

	/**
	 * The WebGL version the renderer uses: always 2. WebGL 1 was dropped (the
	 * renderer draws through the GPU device, which needs WebGL 2): asking for
	 * it logs a warning and changes nothing.
	 * @deprecated WebGL 1 isn't supported; there's nothing to choose.
	 */
	preferredWebGlVersion(): 2;
	preferredWebGlVersion(val: 1 | 2): this;
	preferredWebGlVersion(val?: 1 | 2): 2 | this {
		if (val === undefined) {
			return 2;
		}
		if (val === 1) this.log("preferredWebGlVersion(1): WebGL 1 isn't supported any more; the renderer uses WebGL 2", "warning");
		return this;
	}

	/**
	 * Gets / sets whether the WebGL drawing buffer should be preserved after
	 * compositing. When true, gl.readPixels() works after a frame is rendered.
	 * Must be called before createFrontBuffer().
	 */
	preserveDrawingBuffer(): boolean;
	preserveDrawingBuffer(val: boolean): this;
	preserveDrawingBuffer(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._preserveDrawingBuffer;
		}
		this._preserveDrawingBuffer = val;
		return this;
	}

	/**
	 * Read the RGBA color of a single pixel at the given screen coordinates.
	 * Requires preserveDrawingBuffer to be true (set before context creation).
	 * @param x Screen X coordinate (0 = left edge)
	 * @param y Screen Y coordinate (0 = top edge, DOM convention)
	 * @returns Uint8Array [R, G, B, A] or null if context unavailable
	 */
	readPixel (x: number, y: number): Uint8Array | null {
		const gl = this._canvasContext;
		if (!gl || !this._canvasElement) return null;

		const pixel = new Uint8Array(4);
		// Convert from DOM top-left origin to WebGL bottom-left origin
		const glY = this._canvasElement.height - Math.round(y) - 1;
		gl.readPixels(Math.round(x), glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		return pixel;
	}

	/**
	 * Read all pixels from the current framebuffer.
	 * Requires preserveDrawingBuffer to be true.
	 * Returns pixel data in WebGL native format (bottom-left origin, RGBA).
	 */
	readAllPixels (): Uint8Array | null {
		const gl = this._canvasContext;
		if (!gl || !this._canvasElement) return null;

		const w = this._canvasElement.width;
		const h = this._canvasElement.height;
		const pixels = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		return pixels;
	}

	/**
	 * Returns the underlying WebGL rendering context, if available.
	 */
	glContext (): WebGLRenderingContext | WebGL2RenderingContext | null | undefined {
		return this._canvasContext;
	}

	/**
	 * Clean up and destroy the renderer.
	 */
	destroy(): void {
		if (this._canvasElement) {
			// Remove event listeners
			this._canvasElement.removeEventListener("webglcontextlost", this._handleContextLost);
			this._canvasElement.removeEventListener("webglcontextrestored", this._handleContextRestored);
		}

		// Clean up managers
		this._particleBuffers.forEach((entry) => this._device?.destroyBuffer(entry.buffer));
		this._particleBuffers.clear();
		this._decalMeshBuffers.forEach((entry) => this._device?.destroyBuffer(entry.buffer));
		this._decalMeshBuffers.clear();
		if (this._defaultParticleTexture) this._device?.destroyTexture(this._defaultParticleTexture);
		if (this._defaultDecalTexture) this._device?.destroyTexture(this._defaultDecalTexture);
		this._instanceBuffer?.destroy();
		this._bonePalette?.destroy();
		if (this._gpuInstances) this._device?.destroyBuffer(this._gpuInstances);
		this._stopRefreshSampling();
		this._postProcess?.dispose();
		this._postProcess = null;
		this._panelTargets?.dispose();
		this._panelTargets = undefined;
		this._uiPass?.destroy();
		this._uiPass = undefined;
		this._outlinePass?.destroy();
		this._outlinePass = undefined;
		this._lensPass?.destroy();
		this._lensPass = undefined;
		this._geometryManager?.cleanup();
		this._shaderManager?.deleteAllPrograms();
		this._textureManager?.clearState();
		this._cameraController?.clearCache();
		this._skeletonManager?.cleanup();
		this._resourceManager?.cleanup();

		// Lose WebGL context
		const loseContext = this._canvasContext?.getExtension("WEBGL_lose_context");
		if (loseContext) {
			loseContext.loseContext();
		}

		// Remove canvas
		if (this._createdFrontBuffer && this._canvasElement) {
			ige.input.destroyListeners(this._canvasElement);
			document.body.removeChild(this._canvasElement);
		}

		this._canvasContext = null;
		delete this._canvasElement;

		ige.engine.headless(true);

		super.destroy();
	}
}
