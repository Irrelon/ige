/**
 * IgeGpuDevice on WebGL2 (IgeGpuDevice.ts): the GL calls IGE's renderers made themselves, behind the device, with a
 * cache of what's set so each draw sends only what changed. One device per context (webGl2GpuDevice), shared by the
 * renderers drawing on it; each calls invalidate() when it starts (another may have set GL's state) and release()
 * when it's done (the context handed back as other GL code expects it).
 *
 * Pipelines are GL programs (one per shader module) with their fixed state applied as they're set; vertex layouts are
 * vertex arrays (one per layout, shared by the pipelines with it) whose attributes are pointed again only when a
 * buffer or its offset changes (a draw's firstInstance moves an instance buffer's: WebGL2 has no base instance).
 * Uniform blocks are set member by member, those that changed; texture slots are texture units. Render targets are
 * framebuffers (one per texture drawn into, made as it's first drawn into). A texture carries its own sampling
 * (texParameteri), as GL's do; a sampler set with it in a draw overrides it there (a sampler object).
 */
import type {
	IgeGpuBlendFactor, IgeGpuBuffer, IgeGpuBufferDesc, IgeGpuCompare, IgeGpuDevice, IgeGpuLimits, IgeGpuRenderPass, IgeGpuRenderPassDesc, IgeGpuRenderPipeline,
	IgeGpuRenderPipelineDesc, IgeGpuRenderTarget, IgeGpuSampler, IgeGpuSamplerDesc, IgeGpuShaderModule, IgeGpuShaderModuleDesc, IgeGpuStencilOperation,
	IgeGpuSurface, IgeGpuTexture, IgeGpuTextureDesc, IgeGpuTextureFormat, IgeGpuUniform, IgeGpuVertexBufferLayout, IgeGpuVertexFormat
} from "@/engine/gpu/IgeGpuDevice";

type GL = WebGL2RenderingContext;

interface GlTexture extends IgeGpuTexture {
	width: number;
	height: number;
	layers: number;
	_tex: WebGLTexture;
	/** TEXTURE_2D or TEXTURE_2D_ARRAY. */
	_target: number;
	_sampler: IgeGpuSamplerDesc;
	/** Its framebuffer (made as it's first drawn into), and the depth/stencil texture attached to it then. */
	_fbo?: WebGLFramebuffer;
	_fboDepth?: GlTexture | null;
}

interface GlSurface extends IgeGpuSurface {
	_fbo: WebGLFramebuffer | null;
}

interface GlBuffer extends IgeGpuBuffer {
	size: number;
	_buf: WebGLBuffer;
	_target: number;
	_stream: boolean;
}

interface GlUniform {
	name: string;
	type: IgeGpuUniform["type"];
	count: number;
	offset: number;
	size: number;
	loc: WebGLUniformLocation | null;
}

interface GlModule extends IgeGpuShaderModule {
	_program: WebGLProgram;
	_shaders: WebGLShader[];
	/** Its uniform block and texture slots (from the first pipeline made with it: the others must agree). */
	_uniforms?: GlUniform[];
	_textures?: number;
	/** The uniform values set in its program (what's been sent), and which members have been. */
	_values?: Float32Array;
	_known?: Uint8Array;
}

interface GlLayout {
	_vao: WebGLVertexArrayObject;
	_buffers: IgeGpuVertexBufferLayout[];
	/** Each slot's buffer and byte offset its attributes point at now. */
	_bound: ({ buf: GlBuffer; offset: number } | undefined)[];
	_index?: GlBuffer;
}

interface GlPipeline extends IgeGpuRenderPipeline {
	_module: GlModule;
	_layout: GlLayout;
	_desc: IgeGpuRenderPipelineDesc;
	_mode: number;
	_instanced: boolean;
	_textures: number;
}

/** What's set in GL now (undefined: not known, set it). */
interface GlState {
	program?: WebGLProgram | null;
	vao?: WebGLVertexArrayObject | null;
	fbo?: WebGLFramebuffer | null;
	arrayBuffer?: WebGLBuffer | null;
	unit?: number;
	units: ({ target: number; tex: WebGLTexture | null } | undefined)[];
	samplers: (WebGLSampler | null | undefined)[];
	viewport?: string;
	scissorOn?: boolean;
	scissor?: string;
	blendOn?: boolean;
	blend?: string;
	colorMask?: boolean;
	depthOn?: boolean;
	depthFunc?: number;
	depthMask?: boolean;
	stencilOn?: boolean;
	stencilFunc?: string;
	stencilOp?: string;
	stencilMask?: number;
	cullOn?: boolean;
	cullFace?: number;
	frontFace?: number;
	offsetOn?: boolean;
	offset?: string;
	clearColor?: string;
}

const FORMATS: Record<IgeGpuTextureFormat, { internal: number; format: number; type: number; bytes: number }> = {
	rgba8unorm: { internal: 0x8058, format: 0x1908, type: 0x1401, bytes: 4 }, // RGBA8, RGBA, UNSIGNED_BYTE
	r8unorm: { internal: 0x8229, format: 0x1903, type: 0x1401, bytes: 1 }, // R8, RED, UNSIGNED_BYTE
	rgba16float: { internal: 0x881a, format: 0x1908, type: 0x140b, bytes: 8 }, // RGBA16F, RGBA, HALF_FLOAT
	rgba32float: { internal: 0x8814, format: 0x1908, type: 0x1406, bytes: 16 }, // RGBA32F, RGBA, FLOAT
	r32float: { internal: 0x822e, format: 0x1903, type: 0x1406, bytes: 4 }, // R32F, RED, FLOAT
	depth16unorm: { internal: 0x81a5, format: 0x1902, type: 0x1403, bytes: 2 }, // DEPTH_COMPONENT16, DEPTH_COMPONENT, UNSIGNED_SHORT
	depth24plus: { internal: 0x81a6, format: 0x1902, type: 0x1405, bytes: 4 }, // DEPTH_COMPONENT24, DEPTH_COMPONENT, UNSIGNED_INT
	"depth24plus-stencil8": { internal: 0x88f0, format: 0x84f9, type: 0x84fa, bytes: 4 }, // DEPTH24_STENCIL8, DEPTH_STENCIL, UNSIGNED_INT_24_8
	depth32float: { internal: 0x8cac, format: 0x1902, type: 0x1406, bytes: 4 } // DEPTH_COMPONENT32F, DEPTH_COMPONENT, FLOAT
};

const COMPARE: Record<IgeGpuCompare, number> = { never: 0x0200, less: 0x0201, equal: 0x0202, "less-equal": 0x0203, greater: 0x0204, "not-equal": 0x0205, "greater-equal": 0x0206, always: 0x0207 };

const STENCIL_OPS: Record<IgeGpuStencilOperation, number> = {
	keep: 0x1e00, zero: 0, replace: 0x1e01, "increment-clamp": 0x1e02, "decrement-clamp": 0x1e03, invert: 0x150a, "increment-wrap": 0x8507, "decrement-wrap": 0x8508
};

const BLEND_FACTORS: Record<IgeGpuBlendFactor, number> = {
	zero: 0, one: 1, src: 0x0300, "one-minus-src": 0x0301, "src-alpha": 0x0302, "one-minus-src-alpha": 0x0303,
	dst: 0x0306, "one-minus-dst": 0x0307, "dst-alpha": 0x0304, "one-minus-dst-alpha": 0x0305
};

const BLEND_OPS: Record<string, number> = { add: 0x8006, subtract: 0x800a, "reverse-subtract": 0x800b, min: 0x8007, max: 0x8008 };

const TOPOLOGY: Record<string, number> = { "triangle-list": 0x0004, "triangle-strip": 0x0005, "line-list": 0x0001, "line-strip": 0x0003, "point-list": 0x0000 };

/** Each vertex format: its component count, GL type, normalized, read as integers (vertexAttribIPointer). */
const VERTEX_FORMATS: Record<IgeGpuVertexFormat, [number, number, boolean, boolean]> = {
	float32: [1, 0x1406, false, false],
	float32x2: [2, 0x1406, false, false],
	float32x3: [3, 0x1406, false, false],
	float32x4: [4, 0x1406, false, false],
	uint8x4: [4, 0x1401, false, true],
	unorm8x4: [4, 0x1401, true, false],
	uint16x4: [4, 0x1403, false, true],
	uint32: [1, 0x1405, false, true],
	sint32: [1, 0x1404, false, true]
};

const UNIFORM_SIZES: Record<IgeGpuUniform["type"], number> = { f32: 1, i32: 1, vec2: 2, vec3: 3, vec4: 4, mat4: 16 };

const devices = new WeakMap<GL, IgeWebGl2GpuDevice>();

/** The device on a WebGL2 context (one per context, made as it's first asked for). */
export function webGl2GpuDevice (gl: GL): IgeWebGl2GpuDevice {
	let d = devices.get(gl);
	if (!d) {
		d = new IgeWebGl2GpuDevice(gl);
		devices.set(gl, d);
	}
	return d;
}

/**
 * A framebuffer a host owns (another renderer's target, a post-process chain's) as a surface: drawn into and copied
 * from, never sampled. `fbo` null is the canvas's own (IgeGpuDevice.surface).
 */
export function webGl2Surface (device: IgeWebGl2GpuDevice, fbo: WebGLFramebuffer | null, width: number, height: number, stencil?: boolean): IgeGpuSurface {
	if (fbo === null) return device.surface();
	return { kind: "surface", width, height, stencil: stencil ?? false, _fbo: fbo } as GlSurface;
}

/** The framebuffer bound now, as a surface (what a host was drawing into: asked of GL, which keeps it on its side). */
export function webGl2CurrentSurface (device: IgeWebGl2GpuDevice): IgeGpuSurface {
	const gl = device.gl;
	const fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
	return webGl2Surface(device, fbo, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

export class IgeWebGl2GpuDevice implements IgeGpuDevice {
	readonly backend = "webgl2" as const;
	readonly gl: GL;
	readonly limits: IgeGpuLimits;
	_state: GlState = { units: [], samplers: [] };
	_layouts = new Map<string, GlLayout>();
	_samplers = new Map<string, WebGLSampler>();
	_surface: GlSurface;
	/** The unit textures are bound to for uploads and copies (the last: draws use the first ones). */
	_scratch: number;

	constructor (gl: GL) {
		this.gl = gl;
		const units = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number;
		this.limits = {
			maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
			maxTextureLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number,
			maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
			maxTextureSlots: Math.min(16, units)
		};
		this._scratch = Math.min(31, units - 1);
		const stencil = !!gl.getContextAttributes()?.stencil;
		this._surface = {
			kind: "surface", _fbo: null, stencil,
			get width () { return gl.drawingBufferWidth; },
			get height () { return gl.drawingBufferHeight; }
		};
	}

	surface (): IgeGpuSurface {
		return this._surface;
	}

	invalidate (): void {
		this._state = { units: [], samplers: [] };
		for (const l of this._layouts.values()) l._bound = [];
	}

	release (): void {
		const gl = this.gl, s = this._state;
		gl.bindVertexArray(null);
		gl.depthMask(true);
		if (s.stencilOn !== false) gl.disable(gl.STENCIL_TEST);
		if (s.colorMask !== true) gl.colorMask(true, true, true, true);
		this.invalidate();
	}

	// ---------------------------------------------------------------- buffers

	createBuffer (desc: IgeGpuBufferDesc): IgeGpuBuffer {
		const gl = this.gl;
		const target = desc.usage === "index" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
		const b: GlBuffer = { kind: "buffer", size: desc.size, usage: desc.usage, label: desc.label, _buf: gl.createBuffer()!, _target: target, _stream: !!desc.stream };
		if (desc.size > 0) {
			this._bindBuffer(b);
			gl.bufferData(target, desc.size, desc.stream ? gl.STREAM_DRAW : gl.STATIC_DRAW);
		}
		return b;
	}

	writeBuffer (buffer: IgeGpuBuffer, offset: number, data: ArrayBufferView): void {
		const gl = this.gl, b = buffer as GlBuffer;
		this._bindBuffer(b);
		if (b._stream && offset === 0) {
			// (A frame's worth: new storage the data's size, nothing waited on)
			gl.bufferData(b._target, data, gl.STREAM_DRAW);
			b.size = data.byteLength;
			return;
		}
		if (offset + data.byteLength > b.size) {
			throw new Error(`IgeGpuDevice: writeBuffer past the end of ${b.label ?? "a buffer"} (${offset + data.byteLength} > ${b.size})`);
		}
		gl.bufferSubData(b._target, offset, data);
	}

	destroyBuffer (buffer: IgeGpuBuffer): void {
		const b = buffer as GlBuffer;
		this.gl.deleteBuffer(b._buf);
		if (this._state.arrayBuffer === b._buf) this._state.arrayBuffer = undefined;
	}

	_bindBuffer (b: GlBuffer): void {
		const gl = this.gl;
		if (b._target === gl.ARRAY_BUFFER) {
			if (this._state.arrayBuffer === b._buf) return;
			this._state.arrayBuffer = b._buf;
		} else {
			// (An index buffer belongs to the vertex array bound: none, so it's set on none)
			if (this._state.vao !== null) {
				gl.bindVertexArray(null);
				this._state.vao = null;
			}
		}
		gl.bindBuffer(b._target, b._buf);
	}

	// ---------------------------------------------------------------- textures and samplers

	createTexture (desc: IgeGpuTextureDesc): IgeGpuTexture {
		const gl = this.gl;
		const layered = desc.layers !== undefined;
		const t: GlTexture = {
			kind: "texture", width: 0, height: 0, layers: 0, format: desc.format, mipmaps: !!desc.mipmaps, label: desc.label,
			_tex: gl.createTexture()!, _target: layered ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D,
			_sampler: { magFilter: "linear", minFilter: "linear", mipmapFilter: "none", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" }
		};
		this.resizeTexture(t, desc.width, desc.height, desc.layers);
		this._applySampler(t, { ...t._sampler, ...(desc.sampler ?? {}) }, true);
		return t;
	}

	resizeTexture (texture: IgeGpuTexture, width: number, height: number, layers?: number): void {
		const gl = this.gl, t = texture as GlTexture;
		const f = FORMATS[t.format];
		t.width = width;
		t.height = height;
		this._bindScratch(t);
		if (t._target === gl.TEXTURE_2D_ARRAY) {
			t.layers = layers ?? t.layers;
			if (width > 0 && height > 0 && t.layers > 0) gl.texImage3D(t._target, 0, f.internal, width, height, t.layers, 0, f.format, f.type, null);
		} else {
			t.layers = 1;
			if (width > 0 && height > 0) gl.texImage2D(t._target, 0, f.internal, width, height, 0, f.format, f.type, null);
		}
	}

	writeTexture (texture: IgeGpuTexture, data: ArrayBufferView, region: { x?: number; y?: number; layer?: number; width: number; height: number; mipLevel?: number }, opts?: { premultiply?: boolean }): void {
		const gl = this.gl, t = texture as GlTexture;
		const f = FORMATS[t.format];
		this._bindScratch(t);
		// (Rows packed as they come: a single-channel page's rows needn't be four bytes apart)
		const align = f.bytes % 4 === 0 ? 4 : 1;
		if (align !== 4) gl.pixelStorei(gl.UNPACK_ALIGNMENT, align);
		if (opts?.premultiply) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		if (t._target === gl.TEXTURE_2D_ARRAY) gl.texSubImage3D(t._target, region.mipLevel ?? 0, region.x ?? 0, region.y ?? 0, region.layer ?? 0, region.width, region.height, 1, f.format, f.type, data);
		else gl.texSubImage2D(t._target, region.mipLevel ?? 0, region.x ?? 0, region.y ?? 0, region.width, region.height, f.format, f.type, data);
		if (opts?.premultiply) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		if (align !== 4) gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
	}

	copyImageToTexture (source: unknown, texture: IgeGpuTexture, opts?: { premultiply?: boolean; flipY?: boolean }): void {
		const gl = this.gl, t = texture as GlTexture;
		const f = FORMATS[t.format];
		this._bindScratch(t);
		if (opts?.premultiply) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		if (opts?.flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, f.format, f.type, source as TexImageSource);
		if (opts?.flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		if (opts?.premultiply) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		const s = source as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number };
		t.width = s.naturalWidth || s.videoWidth || s.width || t.width;
		t.height = s.naturalHeight || s.videoHeight || s.height || t.height;
	}

	copyTargetToTexture (source: IgeGpuRenderTarget, rect: [number, number, number, number], texture: IgeGpuTexture, at: [number, number] = [0, 0]): void {
		const gl = this.gl, t = texture as GlTexture;
		this._bindFramebuffer(this._framebuffer(source, undefined));
		this._bindScratch(t);
		gl.copyTexSubImage2D(t._target, 0, at[0], at[1], rect[0], rect[1], rect[2], rect[3]);
	}

	generateMipmaps (texture: IgeGpuTexture): void {
		const t = texture as GlTexture;
		this._bindScratch(t);
		this.gl.generateMipmap(t._target);
	}

	setSampler (texture: IgeGpuTexture, desc: IgeGpuSamplerDesc): void {
		const t = texture as GlTexture;
		this._applySampler(t, { ...t._sampler, ...desc }, false);
	}

	destroyTexture (texture: IgeGpuTexture): void {
		const gl = this.gl, t = texture as GlTexture;
		gl.deleteTexture(t._tex);
		if (t._fbo) gl.deleteFramebuffer(t._fbo);
		if (this._state.fbo === t._fbo) this._state.fbo = undefined;
		for (const u of this._state.units) if (u?.tex === t._tex) u.tex = null;
		t._fbo = undefined;
	}

	createSampler (desc: IgeGpuSamplerDesc): IgeGpuSampler {
		return { desc: { ...desc } };
	}

	/** A texture's own sampling set (texParameteri), only what's changed (`all`: every one, a new texture). */
	_applySampler (t: GlTexture, next: IgeGpuSamplerDesc, all: boolean): void {
		const gl = this.gl, was = t._sampler;
		const min = (s: IgeGpuSamplerDesc) => minFilter(gl, s);
		const wrap = (m: string | undefined) => (m === "repeat" ? gl.REPEAT : m === "mirror-repeat" ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
		const changes: [number, number][] = [];
		if (all || min(next) !== min(was)) changes.push([gl.TEXTURE_MIN_FILTER, min(next)]);
		if (all || next.magFilter !== was.magFilter) changes.push([gl.TEXTURE_MAG_FILTER, next.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR]);
		if (all || next.addressModeU !== was.addressModeU) changes.push([gl.TEXTURE_WRAP_S, wrap(next.addressModeU)]);
		if (all || next.addressModeV !== was.addressModeV) changes.push([gl.TEXTURE_WRAP_T, wrap(next.addressModeV)]);
		if (all ? !!next.compare : next.compare !== was.compare) {
			changes.push([gl.TEXTURE_COMPARE_MODE, next.compare ? gl.COMPARE_REF_TO_TEXTURE : gl.NONE]);
			if (next.compare) changes.push([gl.TEXTURE_COMPARE_FUNC, COMPARE[next.compare]]);
		}
		t._sampler = next;
		if (!changes.length) return;
		this._bindScratch(t);
		for (const [k, v] of changes) gl.texParameteri(t._target, k, v);
	}

	/** A sampler object for a draw's sampler (one per kind, made as first wanted). */
	_samplerObject (desc: IgeGpuSamplerDesc): WebGLSampler {
		const key = JSON.stringify(desc);
		let s = this._samplers.get(key);
		if (s) return s;
		const gl = this.gl;
		s = gl.createSampler()!;
		const wrap = (m: string | undefined) => (m === "repeat" ? gl.REPEAT : m === "mirror-repeat" ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
		gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, minFilter(gl, desc));
		gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, desc.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR);
		gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, wrap(desc.addressModeU));
		gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, wrap(desc.addressModeV));
		if (desc.compare) {
			gl.samplerParameteri(s, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
			gl.samplerParameteri(s, gl.TEXTURE_COMPARE_FUNC, COMPARE[desc.compare]);
		}
		this._samplers.set(key, s);
		return s;
	}

	/** A texture bound on the scratch unit (uploads, copies, sampling set). */
	_bindScratch (t: GlTexture): void {
		this._bindTexture(this._scratch, t._target, t._tex);
	}

	_bindTexture (unit: number, target: number, tex: WebGLTexture | null): void {
		const gl = this.gl, s = this._state;
		const have = s.units[unit];
		if (have && have.target === target && have.tex === tex) return;
		if (s.unit !== unit) {
			gl.activeTexture(gl.TEXTURE0 + unit);
			s.unit = unit;
		}
		gl.bindTexture(target, tex);
		s.units[unit] = { target, tex };
	}

	// ---------------------------------------------------------------- shaders and pipelines

	createShaderModule (desc: IgeGpuShaderModuleDesc): IgeGpuShaderModule {
		const gl = this.gl;
		const compile = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`IgeGpuDevice shader (${desc.label ?? "unnamed"}): ${gl.getShaderInfoLog(s)}`);
			return s;
		};
		const vs = compile(gl.VERTEX_SHADER, desc.vertex), fs = compile(gl.FRAGMENT_SHADER, desc.fragment);
		const p = gl.createProgram()!;
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`IgeGpuDevice program (${desc.label ?? "unnamed"}): ${gl.getProgramInfoLog(p)}`);
		const m: GlModule = { kind: "shader", label: desc.label, _program: p, _shaders: [vs, fs] };
		return m;
	}

	destroyShaderModule (module: IgeGpuShaderModule): void {
		const gl = this.gl, m = module as GlModule;
		gl.deleteProgram(m._program);
		for (const s of m._shaders) gl.deleteShader(s);
		if (this._state.program === m._program) this._state.program = undefined;
	}

	createRenderPipeline (desc: IgeGpuRenderPipelineDesc): IgeGpuRenderPipeline {
		const gl = this.gl, m = desc.module as GlModule;
		// The module's uniform block and texture slots: worked out once, its samplers given their units
		if (!m._uniforms) {
			let offset = 0;
			m._uniforms = (desc.uniforms ?? []).map((u) => {
				const count = u.count ?? 1, size = UNIFORM_SIZES[u.type] * count;
				const out: GlUniform = { name: u.name, type: u.type, count, offset, size, loc: gl.getUniformLocation(m._program, u.name) };
				offset += size;
				return out;
			});
			m._values = new Float32Array(offset);
			m._known = new Uint8Array(m._uniforms.length);
			m._textures = desc.textures?.length ?? 0;
			this._useProgram(m._program);
			(desc.textures ?? []).forEach((t, i) => {
				const loc = gl.getUniformLocation(m._program, t.name);
				if (loc) gl.uniform1i(loc, i);
			});
		}
		const uniformOffsets: Record<string, number> = {};
		for (const u of m._uniforms) uniformOffsets[u.name] = u.offset;
		const instanced = desc.vertex.buffers.some((b) => b.stepMode === "instance");
		return {
			kind: "pipeline", label: desc.label, uniformOffsets, uniformSize: m._values!.length,
			_module: m, _layout: this._layoutFor(desc.vertex.buffers), _desc: desc, _mode: TOPOLOGY[desc.primitive?.topology ?? "triangle-list"], _instanced: instanced, _textures: m._textures!
		} as GlPipeline;
	}

	/** A vertex array for a layout (shared by the pipelines with it), its attributes enabled with their divisors. */
	_layoutFor (buffers: IgeGpuVertexBufferLayout[]): GlLayout {
		const key = JSON.stringify(buffers);
		let l = this._layouts.get(key);
		if (l) return l;
		const gl = this.gl;
		const vao = gl.createVertexArray()!;
		gl.bindVertexArray(vao);
		this._state.vao = vao;
		for (const b of buffers) {
			for (const a of b.attributes) {
				gl.enableVertexAttribArray(a.shaderLocation);
				if (b.stepMode === "instance") gl.vertexAttribDivisor(a.shaderLocation, 1);
			}
		}
		l = { _vao: vao, _buffers: buffers, _bound: [] };
		this._layouts.set(key, l);
		return l;
	}

	_useProgram (p: WebGLProgram): void {
		if (this._state.program === p) return;
		this.gl.useProgram(p);
		this._state.program = p;
	}

	// ---------------------------------------------------------------- passes

	beginRenderPass (desc: IgeGpuRenderPassDesc): IgeGpuRenderPass {
		const gl = this.gl;
		const target = desc.color.target;
		const depth = desc.depthStencil?.target as GlTexture | undefined;
		this._bindFramebuffer(this._framebuffer(target, depth));
		const pass = new IgeWebGl2RenderPass(this, target.width, target.height);
		let bits = 0;
		if (desc.color.loadOp === "clear") {
			const c = desc.color.clearValue ?? [0, 0, 0, 0];
			this._clearColor(c);
			this._colorMask(true);
			bits |= gl.COLOR_BUFFER_BIT;
		}
		const ds = desc.depthStencil;
		if (ds?.depthLoadOp === "clear") {
			gl.clearDepth(ds.depthClearValue ?? 1);
			this._depthMask(true);
			bits |= gl.DEPTH_BUFFER_BIT;
		}
		if (ds?.stencilLoadOp === "clear") {
			gl.clearStencil(ds.stencilClearValue ?? 0);
			this._stencilMask(0xff);
			bits |= gl.STENCIL_BUFFER_BIT;
		}
		if (bits) {
			this._scissorOn(false);
			gl.clear(bits);
		}
		return pass;
	}

	/** A target's framebuffer: a surface's own, or a texture's (made as it's first drawn into, with `depth` attached). */
	_framebuffer (target: IgeGpuRenderTarget, depth: GlTexture | undefined): WebGLFramebuffer | null {
		if (target.kind === "surface") return (target as GlSurface)._fbo;
		const gl = this.gl, t = target as GlTexture;
		if (t._fbo && (depth === undefined || t._fboDepth === depth)) return t._fbo;
		if (!t._fbo) t._fbo = gl.createFramebuffer()!;
		this._bindFramebuffer(t._fbo);
		if (!t._fboDepth && t._fboDepth !== null) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t._tex, 0);
		if (depth !== undefined) {
			const attach = depth.format === "depth24plus-stencil8" ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
			gl.framebufferTexture2D(gl.FRAMEBUFFER, attach, gl.TEXTURE_2D, depth._tex, 0);
		}
		t._fboDepth = depth ?? null;
		return t._fbo;
	}

	_bindFramebuffer (fbo: WebGLFramebuffer | null): void {
		if (this._state.fbo === fbo) return;
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
		this._state.fbo = fbo;
	}

	_clearColor (c: [number, number, number, number]): void {
		const key = c.join(",");
		if (this._state.clearColor === key) return;
		this.gl.clearColor(c[0], c[1], c[2], c[3]);
		this._state.clearColor = key;
	}

	_colorMask (on: boolean): void {
		if (this._state.colorMask === on) return;
		this.gl.colorMask(on, on, on, on);
		this._state.colorMask = on;
	}

	_depthMask (on: boolean): void {
		if (this._state.depthMask === on) return;
		this.gl.depthMask(on);
		this._state.depthMask = on;
	}

	_stencilMask (m: number): void {
		if (this._state.stencilMask === m) return;
		this.gl.stencilMask(m);
		this._state.stencilMask = m;
	}

	_scissorOn (on: boolean): void {
		if (this._state.scissorOn === on) return;
		if (on) this.gl.enable(this.gl.SCISSOR_TEST);
		else this.gl.disable(this.gl.SCISSOR_TEST);
		this._state.scissorOn = on;
	}

	_scissor (r: [number, number, number, number]): void {
		const key = r.join(",");
		if (this._state.scissor === key) return;
		this.gl.scissor(r[0], r[1], r[2], r[3]);
		this._state.scissor = key;
	}

	_viewport (v: [number, number, number, number]): void {
		const key = v.join(",");
		if (this._state.viewport === key) return;
		this.gl.viewport(v[0], v[1], v[2], v[3]);
		this._state.viewport = key;
	}

	_toggle (cap: number, key: "blendOn" | "depthOn" | "stencilOn" | "cullOn" | "offsetOn", on: boolean): void {
		if (this._state[key] === on) return;
		if (on) this.gl.enable(cap);
		else this.gl.disable(cap);
		this._state[key] = on;
	}

	/** A pipeline's fixed state and program set (only what's changed). */
	_applyPipeline (p: GlPipeline, stencilRef: number): void {
		const gl = this.gl, d = p._desc, s = this._state;
		this._useProgram(p._module._program);
		if (s.vao !== p._layout._vao) {
			gl.bindVertexArray(p._layout._vao);
			s.vao = p._layout._vao;
		}
		const b = d.blend;
		this._toggle(gl.BLEND, "blendOn", !!b);
		if (b) {
			const key = `${b.color.srcFactor} ${b.color.dstFactor} ${b.alpha.srcFactor} ${b.alpha.dstFactor} ${b.color.operation ?? "add"} ${b.alpha.operation ?? "add"}`;
			if (s.blend !== key) {
				const same = b.color.srcFactor === b.alpha.srcFactor && b.color.dstFactor === b.alpha.dstFactor;
				if (same) gl.blendFunc(BLEND_FACTORS[b.color.srcFactor], BLEND_FACTORS[b.color.dstFactor]);
				else gl.blendFuncSeparate(BLEND_FACTORS[b.color.srcFactor], BLEND_FACTORS[b.color.dstFactor], BLEND_FACTORS[b.alpha.srcFactor], BLEND_FACTORS[b.alpha.dstFactor]);
				const ops = (b.color.operation ?? "add") + (b.alpha.operation ?? "add");
				const was = s.blend?.split(" ").slice(4).join("") ?? "";
				if (ops !== was) {
					if ((b.color.operation ?? "add") === (b.alpha.operation ?? "add")) gl.blendEquation(BLEND_OPS[b.color.operation ?? "add"]);
					else gl.blendEquationSeparate(BLEND_OPS[b.color.operation ?? "add"], BLEND_OPS[b.alpha.operation ?? "add"]);
				}
				s.blend = key;
			}
		}
		this._colorMask(d.writeColor !== false);
		const z = d.depth;
		this._toggle(gl.DEPTH_TEST, "depthOn", !!z);
		this._depthMask(!!z?.write);
		if (z && s.depthFunc !== COMPARE[z.compare]) {
			gl.depthFunc(COMPARE[z.compare]);
			s.depthFunc = COMPARE[z.compare];
		}
		this._toggle(gl.POLYGON_OFFSET_FILL, "offsetOn", !!z?.bias);
		if (z?.bias) {
			const key = `${z.bias.slopeScale},${z.bias.constant}`;
			if (s.offset !== key) {
				gl.polygonOffset(z.bias.slopeScale, z.bias.constant);
				s.offset = key;
			}
		}
		const st = d.stencil;
		this._toggle(gl.STENCIL_TEST, "stencilOn", !!st);
		if (st) {
			const func = `${st.compare},${stencilRef},${st.readMask ?? 0xff}`;
			if (s.stencilFunc !== func) {
				gl.stencilFunc(COMPARE[st.compare], stencilRef, st.readMask ?? 0xff);
				s.stencilFunc = func;
			}
			const op = `${st.failOp ?? "keep"},${st.depthFailOp ?? "keep"},${st.passOp ?? "keep"}`;
			if (s.stencilOp !== op) {
				gl.stencilOp(STENCIL_OPS[st.failOp ?? "keep"], STENCIL_OPS[st.depthFailOp ?? "keep"], STENCIL_OPS[st.passOp ?? "keep"]);
				s.stencilOp = op;
			}
			this._stencilMask(st.writeMask ?? 0xff);
		}
		const cull = d.primitive?.cullMode ?? "none";
		this._toggle(gl.CULL_FACE, "cullOn", cull !== "none");
		if (cull !== "none") {
			const face = cull === "front" ? gl.FRONT : gl.BACK;
			if (s.cullFace !== face) {
				gl.cullFace(face);
				s.cullFace = face;
			}
			const front = d.primitive?.frontFace === "cw" ? gl.CW : gl.CCW;
			if (s.frontFace !== front) {
				gl.frontFace(front);
				s.frontFace = front;
			}
		}
	}

	/** A module's uniform block set from `data`: the members that changed. */
	_applyUniforms (m: GlModule, data: ArrayLike<number> | undefined): void {
		if (!data || !m._uniforms!.length) return;
		const gl = this.gl, vals = m._values!, known = m._known!;
		this._useProgram(m._program);
		for (let k = 0; k < m._uniforms!.length; k++) {
			const u = m._uniforms![k];
			let same = known[k] === 1;
			for (let i = 0; same && i < u.size; i++) if (Math.fround(data[u.offset + i]) !== vals[u.offset + i]) same = false;
			if (same) continue;
			for (let i = 0; i < u.size; i++) vals[u.offset + i] = data[u.offset + i];
			known[k] = 1;
			if (!u.loc) continue;
			const v = vals.subarray(u.offset, u.offset + u.size);
			switch (u.type) {
				case "f32": if (u.count === 1) gl.uniform1f(u.loc, v[0]); else gl.uniform1fv(u.loc, v); break;
				case "i32": if (u.count === 1) gl.uniform1i(u.loc, v[0]); else gl.uniform1iv(u.loc, Int32Array.from(v)); break;
				case "vec2": if (u.count === 1) gl.uniform2f(u.loc, v[0], v[1]); else gl.uniform2fv(u.loc, v); break;
				case "vec3": if (u.count === 1) gl.uniform3f(u.loc, v[0], v[1], v[2]); else gl.uniform3fv(u.loc, v); break;
				case "vec4": if (u.count === 1) gl.uniform4f(u.loc, v[0], v[1], v[2], v[3]); else gl.uniform4fv(u.loc, v); break;
				case "mat4": gl.uniformMatrix4fv(u.loc, false, v); break;
			}
		}
	}

	/** A layout's vertex buffers pointed at (each slot only when its buffer or offset changed). */
	_applyVertexBuffers (p: GlPipeline, slots: ({ buf: GlBuffer; offset: number } | undefined)[], firstInstance: number): void {
		const gl = this.gl, l = p._layout;
		for (let i = 0; i < l._buffers.length; i++) {
			const want = slots[i];
			if (!want) continue;
			const b = l._buffers[i];
			const offset = want.offset + (b.stepMode === "instance" ? firstInstance * b.arrayStride : 0);
			const have = l._bound[i];
			if (have && have.buf === want.buf && have.offset === offset) continue;
			this._bindBuffer(want.buf);
			for (const a of b.attributes) {
				const [n, type, norm, int] = VERTEX_FORMATS[a.format];
				if (int) gl.vertexAttribIPointer(a.shaderLocation, n, type, b.arrayStride, offset + a.offset);
				else gl.vertexAttribPointer(a.shaderLocation, n, type, norm, b.arrayStride, offset + a.offset);
			}
			l._bound[i] = { buf: want.buf, offset };
		}
	}
}

/** GL's minification filter for a sampler (its mipmap filter folded in). */
function minFilter (gl: GL, s: IgeGpuSamplerDesc): number {
	const lin = s.minFilter !== "nearest";
	if (!s.mipmapFilter || s.mipmapFilter === "none") return lin ? gl.LINEAR : gl.NEAREST;
	if (s.mipmapFilter === "linear") return lin ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_LINEAR;
	return lin ? gl.LINEAR_MIPMAP_NEAREST : gl.NEAREST_MIPMAP_NEAREST;
}

class IgeWebGl2RenderPass implements IgeGpuRenderPass {
	_d: IgeWebGl2GpuDevice;
	_pipeline?: GlPipeline;
	_slots: ({ buf: GlBuffer; offset: number } | undefined)[] = [];
	_index?: { buf: GlBuffer; type: number; size: number; offset: number };
	_textures: ({ t: GlTexture | null; s?: IgeGpuSampler } | undefined)[] = [];
	_uniforms?: ArrayLike<number>;
	_viewport: [number, number, number, number];
	_scissor: [number, number, number, number] | null = null;
	_ref = 0;

	constructor (d: IgeWebGl2GpuDevice, width: number, height: number) {
		this._d = d;
		this._viewport = [0, 0, width, height];
	}

	setPipeline (pipeline: IgeGpuRenderPipeline): void {
		this._pipeline = pipeline as GlPipeline;
	}

	setVertexBuffer (slot: number, buffer: IgeGpuBuffer, offset: number = 0): void {
		this._slots[slot] = { buf: buffer as GlBuffer, offset };
	}

	setIndexBuffer (buffer: IgeGpuBuffer, format: "uint16" | "uint32", offset: number = 0): void {
		const gl = this._d.gl;
		this._index = { buf: buffer as GlBuffer, type: format === "uint16" ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, size: format === "uint16" ? 2 : 4, offset };
	}

	setTexture (slot: number, texture: IgeGpuTexture | null, sampler?: IgeGpuSampler): void {
		this._textures[slot] = { t: texture as GlTexture | null, s: sampler };
	}

	setUniforms (data: ArrayLike<number>): void {
		this._uniforms = data;
	}

	setViewport (x: number, y: number, width: number, height: number): void {
		this._viewport = [x, y, width, height];
	}

	setScissorRect (rect: [number, number, number, number] | null): void {
		this._scissor = rect;
	}

	setStencilReference (reference: number): void {
		this._ref = reference;
	}

	clear (color: [number, number, number, number], rect?: [number, number, number, number]): void {
		const d = this._d, gl = d.gl;
		d._clearColor(color);
		d._colorMask(true);
		if (rect) {
			d._scissorOn(true);
			d._scissor(rect);
		} else d._scissorOn(false);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	clearStencil (value: number): void {
		const d = this._d, gl = d.gl;
		d._stencilMask(0xff);
		d._scissorOn(false);
		gl.clearStencil(value);
		gl.clear(gl.STENCIL_BUFFER_BIT);
	}

	/** Everything a draw needs set: the pipeline's state, the viewport and scissor, textures, uniforms, buffers. */
	_prepare (firstInstance: number): GlPipeline {
		const d = this._d, p = this._pipeline;
		if (!p) throw new Error("IgeGpuDevice: a draw with no pipeline set");
		d._applyPipeline(p, this._ref);
		d._viewport(this._viewport);
		if (this._scissor) {
			d._scissorOn(true);
			d._scissor(this._scissor);
		} else d._scissorOn(false);
		for (let i = 0; i < p._textures; i++) {
			const t = this._textures[i];
			if (!t) continue;
			// (None: unbound, so a texture drawn into isn't left where the program samples: a feedback loop)
			d._bindTexture(i, t.t?._target ?? d.gl.TEXTURE_2D, t.t?._tex ?? null);
			const so = t.s ? d._samplerObject(t.s.desc) : null;
			if (d._state.samplers[i] !== so) {
				d.gl.bindSampler(i, so);
				d._state.samplers[i] = so;
			}
		}
		d._applyUniforms(p._module, this._uniforms);
		d._applyVertexBuffers(p, this._slots, firstInstance);
		return p;
	}

	draw (vertexCount: number, instanceCount: number = 1, firstVertex: number = 0, firstInstance: number = 0): void {
		const p = this._prepare(firstInstance), gl = this._d.gl;
		if (p._instanced || instanceCount !== 1) gl.drawArraysInstanced(p._mode, firstVertex, vertexCount, instanceCount);
		else gl.drawArrays(p._mode, firstVertex, vertexCount);
	}

	drawIndexed (indexCount: number, instanceCount: number = 1, firstIndex: number = 0, baseVertex: number = 0, firstInstance: number = 0): void {
		if (baseVertex) throw new Error("IgeGpuDevice (WebGL2): drawIndexed has no base vertex");
		const ix = this._index;
		if (!ix) throw new Error("IgeGpuDevice: drawIndexed with no index buffer set");
		const p = this._prepare(firstInstance), d = this._d, gl = d.gl;
		const l = p._layout;
		if (l._index !== ix.buf) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ix.buf._buf);
			l._index = ix.buf;
		}
		const at = ix.offset + firstIndex * ix.size;
		if (p._instanced || instanceCount !== 1) gl.drawElementsInstanced(p._mode, indexCount, ix.type, at, instanceCount);
		else gl.drawElements(p._mode, indexCount, ix.type, at);
	}

	end (): void {
		this._pipeline = undefined;
	}
}
