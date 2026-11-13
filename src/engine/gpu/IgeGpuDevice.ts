/**
 * IgeGpuDevice: the GPU behind IGE's renderers, shaped like WebGPU (and SDL3's GPU API, which the native host uses), so
 * one renderer runs on WebGL2 in a browser today and on D3D12, Vulkan or Metal natively later
 * (guides/gpu-device.md).
 *
 * Resources are made up front and kept: buffers, textures and samplers, shader modules and pipelines (every fixed
 * function state a draw needs: its vertex layout, blend, stencil, depth, culling and colour writes, its uniform block
 * and texture slots). A frame records render passes: each pass draws into one target (a texture, or a surface: the
 * screen, or a framebuffer a host owns), loaded or cleared, with a pipeline, vertex buffers, textures and uniforms set
 * before each draw. Bulk data goes up in one call (writeBuffer: a frame's instances in one go).
 *
 * Conventions are GL's, whatever the backend: viewports, scissors and copies are measured from a target's bottom-left
 * corner; a render target's rows are bottom up (so a texture drawn into is read with v = 0 at its bottom); clip space
 * is GL's (z from -1 to 1). A backend on another API flips what it must (y in its cross-compiled shaders, its
 * viewport) to keep them. Shaders are GLSL ES 3.00 (the source of truth: cross-compiled to SPIR-V, DXIL and MSL for
 * native hosts); a uniform block is a list of named members set as one array of numbers (std140-packed by a backend
 * that needs it); a texture slot is a named sampler.
 */

// ---------------------------------------------------------------- formats and states

/** Texture formats in use. */
export type IgeGpuTextureFormat = "rgba8unorm" | "r8unorm" | "rgba16float" | "rgba32float" | "r32float" | "depth16unorm" | "depth24plus" | "depth24plus-stencil8" | "depth32float";

export type IgeGpuFilter = "nearest" | "linear";

export type IgeGpuAddressMode = "clamp-to-edge" | "repeat" | "mirror-repeat";

export type IgeGpuCompare = "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";

/** How a texture's sampled: its filters (mipmapFilter "none": its first level only), its edges, a depth comparison. */
export interface IgeGpuSamplerDesc {
	magFilter?: IgeGpuFilter;
	minFilter?: IgeGpuFilter;
	mipmapFilter?: IgeGpuFilter | "none";
	addressModeU?: IgeGpuAddressMode;
	addressModeV?: IgeGpuAddressMode;
	/** A depth texture read as a comparison (shadow maps). */
	compare?: IgeGpuCompare;
}

/** A sampler: made once (createSampler), set with a texture (IgeGpuRenderPass.setTexture). */
export interface IgeGpuSampler {
	readonly desc: Readonly<IgeGpuSamplerDesc>;
}

export interface IgeGpuTextureDesc {
	width: number;
	height: number;
	/** An array texture's layers (a 2D array: the UI's glyph pages); none, a plain 2D texture. */
	layers?: number;
	format: IgeGpuTextureFormat;
	/** Room for its smaller levels (made by generateMipmaps). */
	mipmaps?: boolean;
	/**
	 * How it's sampled when a draw sets it with no sampler of its own (setSampler changes it). A convenience kept from
	 * GL, where a texture carries its sampling: backends without it keep a sampler for each texture.
	 */
	sampler?: IgeGpuSamplerDesc;
	label?: string;
}

/** A texture: a handle that stays the same when it's resized (resizeTexture), as a renderer keeps growing ones. */
export interface IgeGpuTexture {
	readonly kind: "texture";
	readonly width: number;
	readonly height: number;
	readonly layers: number;
	readonly format: IgeGpuTextureFormat;
	readonly mipmaps: boolean;
	label?: string;
}

/**
 * A surface: a render target the device doesn't own as a texture: the screen (IgeGpuDevice.surface), or a framebuffer
 * a host owns (a backend's own way of wrapping one: webGl2Surface). Drawn into, copied from; never sampled.
 */
export interface IgeGpuSurface {
	readonly kind: "surface";
	readonly width: number;
	readonly height: number;
	/** It has a stencil buffer (a clip of any shape can be marked in it). */
	readonly stencil: boolean;
}

export type IgeGpuRenderTarget = IgeGpuTexture | IgeGpuSurface;

export interface IgeGpuBufferDesc {
	/** Its size in bytes (a streamed one's grows to what's written). */
	size: number;
	usage: "vertex" | "index";
	/** Written whole most frames (a frame's instances): a backend may give it new storage each time rather than wait. */
	stream?: boolean;
	label?: string;
}

export interface IgeGpuBuffer {
	readonly kind: "buffer";
	readonly size: number;
	readonly usage: "vertex" | "index";
	label?: string;
}

// ---------------------------------------------------------------- shaders and pipelines

/** A shader module: a vertex and a fragment shader, GLSL ES 3.00 (layout(location = n) on its vertex inputs). */
export interface IgeGpuShaderModuleDesc {
	vertex: string;
	fragment: string;
	label?: string;
}

export interface IgeGpuShaderModule {
	readonly kind: "shader";
	label?: string;
}

export type IgeGpuVertexFormat = "float32" | "float32x2" | "float32x3" | "float32x4" | "uint8x4" | "unorm8x4" | "uint16x4" | "uint32" | "sint32";

export interface IgeGpuVertexAttribute {
	shaderLocation: number;
	format: IgeGpuVertexFormat;
	/** Bytes from the start of its element. */
	offset: number;
}

export interface IgeGpuVertexBufferLayout {
	/** Bytes from one element to the next. */
	arrayStride: number;
	/** "instance": one element per instance (a draw's firstInstance counts from the buffer's offset). */
	stepMode?: "vertex" | "instance";
	attributes: IgeGpuVertexAttribute[];
}

export type IgeGpuBlendFactor =
	| "zero" | "one" | "src" | "one-minus-src" | "src-alpha" | "one-minus-src-alpha"
	| "dst" | "one-minus-dst" | "dst-alpha" | "one-minus-dst-alpha";

export interface IgeGpuBlendComponent {
	srcFactor: IgeGpuBlendFactor;
	dstFactor: IgeGpuBlendFactor;
	operation?: "add" | "subtract" | "reverse-subtract" | "min" | "max";
}

export interface IgeGpuBlendState {
	color: IgeGpuBlendComponent;
	alpha: IgeGpuBlendComponent;
}

export type IgeGpuStencilOperation = "keep" | "zero" | "replace" | "increment-clamp" | "decrement-clamp" | "invert" | "increment-wrap" | "decrement-wrap";

/** The stencil test and what it does, both faces alike (the reference: IgeGpuRenderPass.setStencilReference). */
export interface IgeGpuStencilState {
	compare: IgeGpuCompare;
	failOp?: IgeGpuStencilOperation;
	depthFailOp?: IgeGpuStencilOperation;
	passOp?: IgeGpuStencilOperation;
	readMask?: number;
	writeMask?: number;
}

/** A uniform block's member: set in order, packed into one array of numbers (IgeGpuRenderPass.setUniforms). */
export interface IgeGpuUniform {
	name: string;
	type: "f32" | "i32" | "vec2" | "vec3" | "vec4" | "mat4";
	/** An array of them (`uniform vec4 u_o[8]`). */
	count?: number;
}

/** A texture slot: a sampler in the shader, by name; its slot is its place in the pipeline's list. */
export interface IgeGpuTextureSlot {
	name: string;
	dimension?: "2d" | "2d-array" | "cube";
}

export interface IgeGpuRenderPipelineDesc {
	module: IgeGpuShaderModule;
	vertex: { buffers: IgeGpuVertexBufferLayout[] };
	primitive?: {
		topology?: "triangle-list" | "triangle-strip" | "line-list" | "line-strip" | "point-list";
		cullMode?: "none" | "front" | "back";
		frontFace?: "ccw" | "cw";
	};
	/** Blended as this says; none: written as it is. */
	blend?: IgeGpuBlendState;
	/** Colour written (false: none, as a pass that marks only the stencil). */
	writeColor?: boolean;
	depth?: { compare: IgeGpuCompare; write: boolean; bias?: { constant: number; slopeScale: number } };
	stencil?: IgeGpuStencilState;
	/** Its uniform block, in order. */
	uniforms?: IgeGpuUniform[];
	/** Its texture slots, in order. */
	textures?: IgeGpuTextureSlot[];
	label?: string;
}

export interface IgeGpuRenderPipeline {
	readonly kind: "pipeline";
	/** Where each uniform starts in the numbers setUniforms takes. */
	readonly uniformOffsets: Readonly<Record<string, number>>;
	/** How many numbers its uniform block takes. */
	readonly uniformSize: number;
	label?: string;
}

// ---------------------------------------------------------------- passes

export interface IgeGpuRenderPassDesc {
	color: {
		target: IgeGpuRenderTarget;
		/** "load" (the default): what's there kept; "clear": cleared to `clearValue` first. */
		loadOp?: "load" | "clear";
		clearValue?: [number, number, number, number];
	};
	/** A depth/stencil texture with it (none: a surface's own stencil, if it has one). */
	depthStencil?: {
		target?: IgeGpuTexture;
		depthLoadOp?: "load" | "clear";
		depthClearValue?: number;
		stencilLoadOp?: "load" | "clear";
		stencilClearValue?: number;
	};
	label?: string;
}

/** A render pass: recorded draws into one target. Its viewport starts as the whole target, no scissor. */
export interface IgeGpuRenderPass {
	setPipeline (pipeline: IgeGpuRenderPipeline): void;
	/** A vertex buffer for the pipeline's layout `slot`, from `offset` bytes. */
	setVertexBuffer (slot: number, buffer: IgeGpuBuffer, offset?: number): void;
	setIndexBuffer (buffer: IgeGpuBuffer, format: "uint16" | "uint32", offset?: number): void;
	/** A texture for the pipeline's texture `slot`, sampled as `sampler` says (none: as the texture's own); null, none. */
	setTexture (slot: number, texture: IgeGpuTexture | null, sampler?: IgeGpuSampler): void;
	/** The pipeline's uniform block, whole: its members in order (IgeGpuRenderPipeline.uniformOffsets). */
	setUniforms (data: ArrayLike<number>): void;
	/** Device px from the target's bottom-left corner. */
	setViewport (x: number, y: number, width: number, height: number): void;
	/** Draws kept to a rectangle (device px from the bottom-left); null: none. */
	setScissorRect (rect: [number, number, number, number] | null): void;
	setStencilReference (reference: number): void;
	/**
	 * A rectangle of the target cleared to `color` (the whole of it, with none), whatever's set: GL clears through a
	 * scissor; an API without it draws a quad.
	 */
	clear (color: [number, number, number, number], rect?: [number, number, number, number]): void;
	/** The stencil cleared to `value`. */
	clearStencil (value: number): void;
	draw (vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
	drawIndexed (indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void;
	end (): void;
}

// ---------------------------------------------------------------- the device

export interface IgeGpuLimits {
	maxTextureSize: number;
	maxTextureLayers: number;
	maxVertexAttributes: number;
	maxTextureSlots: number;
}

export interface IgeGpuDevice {
	readonly backend: "webgl2" | "webgpu" | "native";
	readonly limits: IgeGpuLimits;

	/** The screen (the canvas's own target), its size the drawing buffer's now. */
	surface (): IgeGpuSurface;

	createBuffer (desc: IgeGpuBufferDesc): IgeGpuBuffer;
	/** `data` written at `offset` bytes (a streamed buffer written from 0: given new storage the data's size). */
	writeBuffer (buffer: IgeGpuBuffer, offset: number, data: ArrayBufferView): void;
	destroyBuffer (buffer: IgeGpuBuffer): void;

	createTexture (desc: IgeGpuTextureDesc): IgeGpuTexture;
	/** Its storage made again at a new size (what it held let go); the handle stays the one in use. */
	resizeTexture (texture: IgeGpuTexture, width: number, height: number, layers?: number): void;
	/**
	 * Pixels written into a region of a level (and a layer) of it, rows bottom up as uploaded (`premultiply`: their
	 * colours multiplied by their alpha on the way).
	 */
	writeTexture (texture: IgeGpuTexture, data: ArrayBufferView, region: { x?: number; y?: number; layer?: number; width: number; height: number; mipLevel?: number }, opts?: { premultiply?: boolean }): void;
	/**
	 * A picture the host has (a browser's image, canvas or bitmap; a native host's decoded image) copied in whole, its
	 * size the picture's (premultiplied: its colours multiplied by its alpha, as the UI draws them).
	 */
	copyImageToTexture (source: unknown, texture: IgeGpuTexture, opts?: { premultiply?: boolean; flipY?: boolean }): void;
	/** A rectangle of a target (what's been drawn there: device px from its bottom-left) copied into a texture. */
	copyTargetToTexture (source: IgeGpuRenderTarget, rect: [number, number, number, number], texture: IgeGpuTexture, at?: [number, number]): void;
	/** Its smaller levels made from its first. */
	generateMipmaps (texture: IgeGpuTexture): void;
	/** How it's sampled when a draw sets no sampler of its own. */
	setSampler (texture: IgeGpuTexture, desc: IgeGpuSamplerDesc): void;
	destroyTexture (texture: IgeGpuTexture): void;

	createSampler (desc: IgeGpuSamplerDesc): IgeGpuSampler;

	createShaderModule (desc: IgeGpuShaderModuleDesc): IgeGpuShaderModule;
	createRenderPipeline (desc: IgeGpuRenderPipelineDesc): IgeGpuRenderPipeline;
	destroyShaderModule (module: IgeGpuShaderModule): void;

	beginRenderPass (desc: IgeGpuRenderPassDesc): IgeGpuRenderPass;

	/**
	 * Something else has used the GPU (WebGL2: another renderer on the same context): what the device knows of its state
	 * forgotten, so it's all set again as it's next needed.
	 */
	invalidate (): void;
	/** A frame's GPU work handed back: anything left set that others don't expect is put back (WebGL2: a context shared). */
	release (): void;
}
