/**
 * Draws the engine UI's display list with WebGL 2: one instanced quad per
 * item through one shader. Boxes are signed-distance shapes (per-corner
 * radii, cut corners, borders), filled with a colour or a gradient (ramps on
 * one texture), with glows and inset shadows; text is signed-distance glyphs
 * from the atlas pages (a texture array), with glows from the same field;
 * canvases and images are textured quads. Clipping is per item in the shader
 * (nested scroll boxes don't split batches); a batch ends only where an
 * image's texture or the blend mode changes.
 */
import { type IgeCssColor, type IgeCssGradient, type IgeCssMatrix } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { type IgeUiSdfAtlas, PAGE, SDF_EDGE, SDF_RADIUS, SDF_SIZE } from "@/engine/ui2/text/IgeUiSdfAtlas";

const VS = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec4 a_rect;
layout(location=2) in vec4 a_shape;
layout(location=3) in vec4 a_radii;
layout(location=4) in vec4 a_color;
layout(location=5) in vec4 a_params;
layout(location=6) in vec4 a_uv;
layout(location=7) in vec4 a_chamfer;
layout(location=8) in vec4 a_clip;
layout(location=9) in vec4 a_m0;
layout(location=10) in vec4 a_m1;
layout(location=11) in vec4 a_grad;
uniform vec2 u_resolution;
uniform float u_scale;
uniform vec2 u_offset;
out vec2 v_local;
out vec2 v_screen;
out vec2 v_tex;
flat out vec4 v_shape;
flat out vec4 v_radii;
flat out vec4 v_color;
flat out vec4 v_params;
flat out vec4 v_uv;
flat out vec4 v_chamfer;
flat out vec4 v_clip;
flat out vec4 v_m1;
flat out vec4 v_grad;
void main() {
	vec2 p = a_rect.xy + a_corner * a_rect.zw;
	v_local = p;
	vec2 t = vec2(a_m0.x * p.x + a_m0.z * p.y + a_m1.x, a_m0.y * p.x + a_m0.w * p.y + a_m1.y);
	v_screen = t;
	v_tex = mix(a_uv.xy, a_uv.zw, a_corner);
	v_shape = a_shape; v_radii = a_radii; v_color = a_color; v_params = a_params; v_uv = a_uv; v_chamfer = a_chamfer; v_clip = a_clip; v_m1 = a_m1; v_grad = a_grad;
	vec2 d = t * u_scale + u_offset;
	gl_Position = vec4(d.x / u_resolution.x * 2.0 - 1.0, 1.0 - d.y / u_resolution.y * 2.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 v_local;
in vec2 v_screen;
in vec2 v_tex;
flat in vec4 v_shape;
flat in vec4 v_radii;
flat in vec4 v_color;
flat in vec4 v_params;
flat in vec4 v_uv;
flat in vec4 v_chamfer;
flat in vec4 v_clip;
flat in vec4 v_m1;
flat in vec4 v_grad;
uniform float u_scale;
uniform sampler2DArray u_atlas;
uniform sampler2D u_ramp;
uniform sampler2D u_image;
out vec4 outColor;

// Inigo Quilez's rounded box, radii (bottom-right, top-right, bottom-left, top-left) in y-down space
float sdRoundBox(vec2 p, vec2 b, vec4 r) {
	r.xy = (p.x > 0.0) ? r.xy : r.zw;
	r.x = (p.y > 0.0) ? r.x : r.y;
	vec2 q = abs(p) - b + r.x;
	return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

// A box (x, y, w, h) at point p: rounded corners (tl, tr, br, bl) and cut corners (the same order)
float shape(vec2 p, vec4 box, vec4 radii, vec4 cut) {
	vec2 c = box.xy + box.zw * 0.5;
	vec2 b = box.zw * 0.5;
	vec2 q = p - c;
	float d = sdRoundBox(q, b, vec4(radii.z, radii.y, radii.w, radii.x));
	const float k = 0.70710678;
	if (cut.x > 0.0) d = max(d, (cut.x - ((q.x + b.x) + (q.y + b.y))) * k);
	if (cut.y > 0.0) d = max(d, (cut.y - ((b.x - q.x) + (q.y + b.y))) * k);
	if (cut.z > 0.0) d = max(d, (cut.z - ((b.x - q.x) + (b.y - q.y))) * k);
	if (cut.w > 0.0) d = max(d, (cut.w - ((q.x + b.x) + (b.y - q.y))) * k);
	return d;
}

vec4 fill(vec2 p) {
	if (v_grad.x < 0.0) return vec4(v_color.rgb * v_color.a, v_color.a);
	float t;
	if (v_grad.y < 0.5) {
		vec2 c = v_shape.xy + v_shape.zw * 0.5;
		vec2 dir = vec2(sin(v_grad.z), -cos(v_grad.z));
		float len = abs(v_shape.z * sin(v_grad.z)) + abs(v_shape.w * cos(v_grad.z));
		t = dot(p - c, dir) / max(len, 0.0001) + 0.5;
	} else if (v_grad.y < 1.5) {
		vec2 c = v_shape.xy + v_grad.zw;
		vec2 r = max(v_params.zw, vec2(0.0001));
		t = length((p - c) / r);
	} else {
		// Conic: the angle round its centre, clockwise from up, from its start (v_params.y, radians)
		vec2 d = p - (v_shape.xy + v_grad.zw);
		t = fract((atan(d.x, -d.y) - v_params.y) / 6.2831853 + 1.0);
	}
	// A repeating gradient (linear or radial): its ramp holds one period (v_params.y, in t), repeated
	if (v_grad.y < 1.5 && v_params.y > 0.0) t = fract(t / v_params.y);
	return texture(u_ramp, vec2(clamp(t, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, (v_grad.x + 0.5) / 512.0));
}

void main() {
	if (v_screen.x < v_clip.x || v_screen.y < v_clip.y || v_screen.x > v_clip.z || v_screen.y > v_clip.w) discard;
	float kind = v_params.x;
	float a = 0.0;
	vec4 col = vec4(v_color.rgb * v_color.a, v_color.a);
	float px = 1.0 / u_scale;
	if (kind < 0.5) {
		float d = shape(v_local, v_shape, v_radii, v_chamfer);
		a = clamp(0.5 - d / px, 0.0, 1.0);
		col = fill(v_local);
	} else if (kind < 1.5) {
		// A border ring; cut corners clip it (clip-path: no border along the cut, as the page draws it)
		float bw = v_params.y;
		vec4 none = vec4(0.0);
		float outer = shape(v_local, v_shape, v_radii, none);
		vec4 inner = vec4(v_shape.xy + bw, v_shape.zw - 2.0 * bw);
		float d = max(outer, -shape(v_local, inner, max(v_radii - bw, vec4(0.0)), none));
		d = max(d, shape(v_local, v_shape, v_radii, v_chamfer));
		a = clamp(0.5 - d / px, 0.0, 1.0);
	} else if (kind < 2.5) {
		float blur = max(v_params.z, px);
		float d = shape(v_local, v_shape, v_radii, v_chamfer);
		a = 1.0 - smoothstep(-blur, blur, d);
		// (Not under the box itself)
		float own = shape(v_local, v_uv, max(v_radii - v_params.w, vec4(0.0)), v_chamfer);
		a *= clamp(own / px + 0.5, 0.0, 1.0);
	} else if (kind < 3.5) {
		float blur = max(v_params.z, px);
		float outer = shape(v_local, v_shape, v_radii, v_chamfer);
		vec4 inner = vec4(v_shape.xy + v_uv.xy + v_params.w, v_shape.zw - 2.0 * v_params.w);
		float d = shape(v_local, inner, max(v_radii - v_params.w, vec4(0.0)), v_chamfer);
		a = smoothstep(-blur, blur, d) * clamp(0.5 - outer / px, 0.0, 1.0);
	} else if (kind < 5.5) {
		float s = texture(u_atlas, vec3(v_tex, v_m1.w)).r;
		// Distance from the glyph's edge, in UI px (outside positive)
		float d = (${SDF_EDGE.toFixed(3)} - s) * ${SDF_RADIUS.toFixed(1)} * v_params.z;
		if (kind < 4.5) a = clamp(0.5 - d / px, 0.0, 1.0);
		else {
			// A glow (text-shadow): a soft falloff, faded out before the field runs out (no square edges)
			float blur = max(v_params.w, px);
			float reach = ${SDF_EDGE.toFixed(3)} * ${SDF_RADIUS.toFixed(1)} * v_params.z;
			a = (1.0 - smoothstep(-blur * 0.25, blur, d)) * 0.6 * (1.0 - smoothstep(reach * 0.55, reach * 0.95, d));
		}
	} else {
		// An image (or a blurred backdrop: v_params.y set, the first pass, clears its shape for it), cut to its box's shape
		col = v_params.y > 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : texture(u_image, v_tex);
		a = clamp(0.5 - shape(v_local, v_shape, v_radii, v_chamfer) / px, 0.0, 1.0);
	}
	a *= v_m1.z;
	if (a <= 0.002) discard;
	outColor = col * a;
}`;

/** A clip rectangle through a transform: the box round its corners. */
function clipThrough (c: readonly number[], m: IgeCssMatrix): number[] {
	const xs: number[] = [], ys: number[] = [];
	for (const [x, y] of [[c[0], c[1]], [c[2], c[1]], [c[0], c[3]], [c[2], c[3]]]) {
		xs.push(m[0] * x + m[2] * y + m[4]);
		ys.push(m[1] * x + m[3] * y + m[5]);
	}
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Floats per instance: 11 vec4s. */
const STRIDE = 44;

interface Batch {
	start: number;
	count: number;
	image: WebGLTexture | null;
	additive: boolean;
	/** Before it's drawn: what's on the target so far, this rectangle of it (device px, top-down), blurred into its image. */
	backdrop?: { x: number; y: number; w: number; h: number; sigma: number };
	/**
	 * A backdrop's two passes: "erase" takes its shape out of what's there (so the blurred copy replaces it rather than
	 * going over it), "add" puts the blurred copy in.
	 */
	blend?: "erase" | "add";
}

/** The blur passes: one direction of a Gaussian, sampling a texture into a target (backdrop-filter). */
const BLUR_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
out vec2 v_uv;
void main() {
	v_uv = a_corner;
	gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
/** The part of the source sampled (uv origin and size), one texel of the source along the blur, the deviation in those texels. */
uniform vec4 u_area;
uniform vec2 u_step;
uniform float u_sigma;
/** The source's mip level read (the copy's smaller levels: a cheap blur of a wide area). */
uniform float u_lod;
out vec4 outColor;
void main() {
	vec2 uv = u_area.xy + v_uv * u_area.zw;
	float s = max(u_sigma, 0.001);
	int r = int(min(ceil(s * 3.0), 64.0));
	vec4 sum = vec4(0.0);
	float total = 0.0;
	for (int i = -64; i <= 64; i++) {
		if (i < -r || i > r) continue;
		float w = exp(-float(i * i) / (2.0 * s * s));
		vec2 at = clamp(uv + u_step * float(i), u_area.xy, u_area.xy + u_area.zw);
		sum += textureLod(u_src, at, u_lod) * w;
		total += w;
	}
	outColor = sum / total;
}`;

/**
 * A repeating gradient's period, in the gradient line's own 0-1 (its last stop less its first: px against the line's
 * length); 0 when it doesn't repeat (or can't: a conic one, stops that don't move on).
 */
function repeatPeriod (g: IgeCssGradient, length: number): number {
	if (!g.repeating || g.type === "conic" || g.stops.length < 2) return 0;
	const at = (k: number) => {
		const st = g.stops[k];
		return st.at !== undefined ? st.at : st.atPx !== undefined ? st.atPx / Math.max(1, length) : k === 0 ? 0 : 1;
	};
	const period = at(g.stops.length - 1) - at(0);
	return period > 1e-6 && period < 1 ? period : 0;
}

export class IgeUiGlRenderer {
	gl: WebGL2RenderingContext;
	atlas: IgeUiSdfAtlas;
	_program: WebGLProgram | null = null;
	_vao: WebGLVertexArrayObject | null = null;
	_quad: WebGLBuffer | null = null;
	_inst: WebGLBuffer | null = null;
	_data = new Float32Array(STRIDE * 1024);
	_atlasTex: WebGLTexture | null = null;
	_atlasLayers = 0;
	_atlasVersions: number[] = [];
	_ramp: WebGLTexture | null = null;
	_rampData = new Uint8Array(256 * 512 * 4);
	_rampRows = new Map<string, number>();
	_rampNext = 0;
	_rampDirty = true;
	_images = new Map<IgeUiElement, { tex: WebGLTexture; version: number; w: number; h: number }>();
	_imageEls = new Map<string, HTMLImageElement>();
	_uniforms: Record<string, WebGLUniformLocation | null> = {};
	/** The backdrop blur's program, its copy of the target, two half-size targets and their framebuffer. */
	_blurProgram: WebGLProgram | null = null;
	_blurUniforms: Record<string, WebGLUniformLocation | null> = {};
	_grab: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurA: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurB: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurFbo: WebGLFramebuffer | null = null;
	/** Draw calls made last frame. */
	drawCalls = 0;
	instances = 0;

	constructor (gl: WebGL2RenderingContext, atlas: IgeUiSdfAtlas) {
		this.gl = gl;
		this.atlas = atlas;
		this._init();
	}

	_init (): void {
		const gl = this.gl;
		const compile = (type: number, src: string) => {
			const s = gl.createShader(type)!;
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`IgeUiGlRenderer shader: ${gl.getShaderInfoLog(s)}`);
			return s;
		};
		const p = gl.createProgram()!;
		gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
		gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS));
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`IgeUiGlRenderer program: ${gl.getProgramInfoLog(p)}`);
		this._program = p;
		for (const u of ["u_resolution", "u_scale", "u_offset", "u_atlas", "u_ramp", "u_image"]) this._uniforms[u] = gl.getUniformLocation(p, u);
		this._vao = gl.createVertexArray();
		gl.bindVertexArray(this._vao);
		this._quad = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		this._inst = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._inst);
		for (let i = 0; i < 11; i++) {
			gl.enableVertexAttribArray(1 + i);
			gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
			gl.vertexAttribDivisor(1 + i, 1);
		}
		gl.bindVertexArray(null);
		const bp = gl.createProgram()!;
		gl.attachShader(bp, compile(gl.VERTEX_SHADER, BLUR_VS));
		gl.attachShader(bp, compile(gl.FRAGMENT_SHADER, BLUR_FS));
		gl.linkProgram(bp);
		if (!gl.getProgramParameter(bp, gl.LINK_STATUS)) throw new Error(`IgeUiGlRenderer blur program: ${gl.getProgramInfoLog(bp)}`);
		this._blurProgram = bp;
		for (const u of ["u_src", "u_area", "u_step", "u_sigma", "u_lod"]) this._blurUniforms[u] = gl.getUniformLocation(bp, u);
		this._grab = this._blurA = this._blurB = null;
		this._blurFbo = gl.createFramebuffer();
		this._ramp = gl.createTexture();
		this._atlasTex = gl.createTexture();
		this._atlasLayers = 0;
		this._atlasVersions = [];
		this._rampDirty = true;
	}

	/** Made again after a lost context (every texture and buffer). */
	restore (gl: WebGL2RenderingContext): void {
		this.gl = gl;
		this._images.clear();
		this._init();
	}

	destroy (): void {
		const gl = this.gl;
		if (this._program) gl.deleteProgram(this._program);
		if (this._quad) gl.deleteBuffer(this._quad);
		if (this._inst) gl.deleteBuffer(this._inst);
		if (this._vao) gl.deleteVertexArray(this._vao);
		if (this._ramp) gl.deleteTexture(this._ramp);
		if (this._atlasTex) gl.deleteTexture(this._atlasTex);
		for (const i of this._images.values()) gl.deleteTexture(i.tex);
		this._images.clear();
	}

	// ---------------------------------------------------------------- gradients

	_rampRow (g: IgeCssGradient, length: number): number {
		const key = JSON.stringify([g.stops, g.repeating, Math.round(length)]);
		const have = this._rampRows.get(key);
		if (have !== undefined) return have;
		if (this._rampNext >= 512) {
			this._rampRows.clear();
			this._rampNext = 0;
		}
		const row = this._rampNext++;
		// Stop positions: given ones (px against the line), the rest shared out between them
		const pos: (number | undefined)[] = g.stops.map((s) => (s.at !== undefined ? s.at : s.atPx !== undefined ? s.atPx / Math.max(1, length) : undefined));
		if (pos[0] === undefined) pos[0] = 0;
		if (pos[pos.length - 1] === undefined) pos[pos.length - 1] = 1;
		for (let i = 1; i < pos.length; i++) if (pos[i] !== undefined && pos[i]! < pos[i - 1]!) pos[i] = pos[i - 1];
		for (let i = 0; i < pos.length; i++) {
			if (pos[i] !== undefined) continue;
			let j = i;
			while (pos[j] === undefined) j++;
			const a = pos[i - 1]!, b = pos[j]!;
			for (let k = i; k < j; k++) pos[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
		}
		const off = row * 256 * 4;
		const period = repeatPeriod(g, length);
		for (let x = 0; x < 256; x++) {
			// (Repeating: one period from t 0, each sample where it falls in the stops' run)
			const t = period ? pos[0]! + ((((x / 255) * period - pos[0]!) % period) + period) % period : x / 255;
			let k = 0;
			while (k < pos.length - 1 && pos[k + 1]! < t) k++;
			const c0 = g.stops[k].color, c1 = g.stops[Math.min(k + 1, g.stops.length - 1)].color;
			const p0 = pos[k]!, p1 = pos[Math.min(k + 1, pos.length - 1)]!;
			const f = t <= p0 ? 0 : t >= p1 ? 1 : (t - p0) / Math.max(1e-6, p1 - p0);
			// Premultiplied, as browsers interpolate
			const a = c0.a + (c1.a - c0.a) * f;
			const pr = c0.r * c0.a + (c1.r * c1.a - c0.r * c0.a) * f;
			const pg = c0.g * c0.a + (c1.g * c1.a - c0.g * c0.a) * f;
			const pb = c0.b * c0.a + (c1.b * c1.a - c0.b * c0.a) * f;
			this._rampData[off + x * 4] = Math.round(pr);
			this._rampData[off + x * 4 + 1] = Math.round(pg);
			this._rampData[off + x * 4 + 2] = Math.round(pb);
			this._rampData[off + x * 4 + 3] = Math.round(a * 255);
		}
		this._rampRows.set(key, row);
		this._rampDirty = true;
		return row;
	}

	// ---------------------------------------------------------------- images and canvases

	_imageTexture (el: IgeUiElement): WebGLTexture | null {
		const gl = this.gl;
		let source: TexImageSource | null = null;
		let version = 0;
		if (el.localName === "canvas") {
			source = (el._canvas as TexImageSource | undefined) ?? null;
			version = -1;
		} else {
			const src = el.getAttribute("src") ?? "";
			let img = this._imageEls.get(src);
			if (!img && src && typeof Image !== "undefined") {
				img = new Image();
				img.src = src;
				this._imageEls.set(src, img);
			}
			if (img?.complete && img.naturalWidth) {
				source = img as unknown as TexImageSource;
				version = 1;
			}
		}
		if (!source) return null;
		let entry = this._images.get(el);
		if (!entry) {
			entry = { tex: gl.createTexture()!, version: 0, w: 0, h: 0 };
			this._images.set(el, entry);
			gl.bindTexture(gl.TEXTURE_2D, entry.tex);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		// Canvases go up each frame they're shown (drawn on any time); images once
		if (version === -1 || entry.version !== version) {
			gl.bindTexture(gl.TEXTURE_2D, entry.tex);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			entry.version = version;
		}
		return entry.tex;
	}

	/** Lets go of image textures for elements no longer shown. */
	sweep (shown: Set<IgeUiElement>): void {
		for (const [el, e] of this._images) {
			if (shown.has(el)) continue;
			this.gl.deleteTexture(e.tex);
			this._images.delete(el);
		}
	}

	// ---------------------------------------------------------------- the frame

	_ensure (n: number): void {
		if (this._data.length >= n * STRIDE) return;
		const next = new Float32Array(Math.max(n, this._data.length / STRIDE * 2) * STRIDE);
		next.set(this._data);
		this._data = next;
	}

	_uploadAtlas (): void {
		const gl = this.gl;
		const pages = this.atlas.pages;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._atlasTex);
		if (this._atlasLayers < pages.length) {
			// (Room for a few more pages each time it grows)
			const layers = Math.max(4, pages.length + 2);
			gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R8, PAGE, PAGE, layers, 0, gl.RED, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			this._atlasLayers = layers;
			this._atlasVersions = [];
		}
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		for (let i = 0; i < pages.length; i++) {
			if (this._atlasVersions[i] === this.atlas.pageVersion[i]) continue;
			gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, PAGE, PAGE, 1, gl.RED, gl.UNSIGNED_BYTE, pages[i]);
			this._atlasVersions[i] = this.atlas.pageVersion[i];
		}
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
	}

	/**
	 * Draws a display list: `scale` device px per UI px, `offset` the UI's corner in device px (the safe area),
	 * `width` x `height` the canvas in device px.
	 */
	draw (items: IgeUiPaintItem[], width: number, height: number, scale: number, offset: [number, number]): number {
		const gl = this.gl;
		// Fill instance data
		const batches: Batch[] = [];
		let n = 0;
		let batch: Batch | undefined;
		const shown = new Set<IgeUiElement>();
		const push = (image: WebGLTexture | null, additive: boolean) => {
			if (!batch || batch.image !== image || batch.additive !== additive) {
				batch = { start: n, count: 0, image, additive };
				batches.push(batch);
			}
			batch.count++;
			this._ensure(n + 1);
			return n++ * STRIDE;
		};
		const NONE: [number, number, number, number] = [-1e7, -1e7, 1e7, 1e7];
		const write = (o: number, rect: number[], shape: number[], radii: number[], color: IgeCssColor | number[], params: number[], uv: number[], cut: number[], clip: number[], matrix: IgeCssMatrix | undefined, opacity: number, layer: number, grad: number[]) => {
			const d = this._data;
			d.set(rect, o);
			d.set(shape, o + 4);
			d.set(radii, o + 8);
			if (Array.isArray(color)) d.set(color, o + 12);
			else {
				d[o + 12] = color.r / 255;
				d[o + 13] = color.g / 255;
				d[o + 14] = color.b / 255;
				d[o + 15] = color.a;
			}
			d.set(params, o + 16);
			d.set(uv, o + 20);
			d.set(cut, o + 24);
			d.set(clip, o + 28);
			const m = matrix ?? [1, 0, 0, 1, 0, 0];
			d[o + 32] = m[0];
			d[o + 33] = m[1];
			d[o + 34] = m[2];
			d[o + 35] = m[3];
			d[o + 36] = m[4];
			d[o + 37] = m[5];
			d[o + 38] = opacity;
			d[o + 39] = layer;
			d.set(grad, o + 40);
		};
		const Z4 = [0, 0, 0, 0];
		const NOGRAD = [-1, 0, 0, 0];
		const backdrops: { o: number; bd: { w: number; h: number; sigma: number } }[] = [];
		for (const it of items) {
			// (The painter's clips are in the item's own pixels: through its transform to the screen's, as a box)
			const clip = it.clip ? (it.matrix ? clipThrough(it.clip, it.matrix) : it.clip) : NONE;
			const additive = !!it.additive;
			if (it.op === "box" && it.backdrop) {
				// What's behind, blurred: its device rectangle (through its transform; with room for the blur to reach)
				const m = it.matrix ?? [1, 0, 0, 1, 0, 0];
				const xs = [it.x, it.x + it.w].map((x) => m[0] * x + m[4]), ys = [it.y, it.y + it.h].map((y) => m[3] * y + m[5]);
				const sigma = (it.blur ?? 0) * scale * Math.abs(m[0]);
				const pad = Math.ceil(sigma * 3);
				const x0 = Math.max(0, Math.floor(Math.min(...xs) * scale + offset[0]) - pad), y0 = Math.max(0, Math.floor(Math.min(...ys) * scale + offset[1]) - pad);
				const x1 = Math.min(width, Math.ceil(Math.max(...xs) * scale + offset[0]) + pad), y1 = Math.min(height, Math.ceil(Math.max(...ys) * scale + offset[1]) + pad);
				if (x1 <= x0 || y1 <= y0 || !this._blurProgram) continue;
				const bd = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, sigma };
				batch = { start: n, count: 0, image: null, additive: false, backdrop: bd, blend: "erase" };
				batches.push(batch);
				const oe = push(null, false);
				// (Its texture is the blurred copy, set as it's drawn; uv from the box to the copy, 0..1 of it, the copy upside
				// down: scaled to the part of the texture it fills once the frame's textures are sized)
				const tl = [(Math.min(...xs) * scale + offset[0] - x0) / bd.w, (bd.h - (Math.min(...ys) * scale + offset[1] - y0)) / bd.h];
				const br = [(Math.max(...xs) * scale + offset[0] - x0) / bd.w, (bd.h - (Math.max(...ys) * scale + offset[1] - y0)) / bd.h];
				write(oe, [it.x, it.y, it.w, it.h], [it.x, it.y, it.w, it.h], it.radii, [1, 1, 1, 1], [6, 1, 0, 0], [tl[0], tl[1], br[0], br[1]], it.chamfer ?? Z4, clip, it.matrix, it.opacity, 0, NOGRAD);
				batch = { start: n, count: 0, image: null, additive: false, blend: "add" };
				batches.push(batch);
				const o = push(null, false);
				write(o, [it.x, it.y, it.w, it.h], [it.x, it.y, it.w, it.h], it.radii, [1, 1, 1, 1], [6, 0, 0, 0], [tl[0], tl[1], br[0], br[1]], it.chamfer ?? Z4, clip, it.matrix, it.opacity, 0, NOGRAD);
				backdrops.push({ o, bd });
				batch = undefined;
				continue;
			}
			if (it.op === "box") {
				const rect = [it.x, it.y, it.w, it.h];
				const cut = it.chamfer ?? Z4;
				if (it.shadow === "outer") {
					const blur = it.blur ?? 0;
					const own = [it.x + (it.spread ?? 0), it.y + (it.spread ?? 0), it.w - 2 * (it.spread ?? 0), it.h - 2 * (it.spread ?? 0)];
					// (The shadow's offset is in its rect; "own" is the element's own box: it isn't shaded under it)
					write(push(null, additive), [it.x - blur, it.y - blur, it.w + 2 * blur, it.h + 2 * blur], rect, it.radii, it.color!, [2, 0, blur, it.spread ?? 0], own, cut, clip, it.matrix, it.opacity, 0, NOGRAD);
					continue;
				}
				if (it.shadow === "inset") {
					const off = it as unknown as { insetX?: number; insetY?: number };
					write(push(null, additive), rect, rect, it.radii, it.color!, [3, 0, it.blur ?? 0, it.spread ?? 0], [off.insetX ?? 0, off.insetY ?? 0, 0, 0], cut, clip, it.matrix, it.opacity, 0, NOGRAD);
					continue;
				}
				if (it.border) {
					write(push(null, additive), rect, rect, it.radii, it.color!, [1, it.border, 0, 0], Z4, cut, clip, it.matrix, it.opacity, 0, NOGRAD);
					continue;
				}
				if (it.gradient) {
					const g = it.gradient;
					let grad: number[], params = [0, 0, 0, 0];
					if (g.type === "linear") {
						let ang = ((g.angle ?? 180) * Math.PI) / 180;
						if (g.toCorner) ang = Math.atan2(g.toCorner[0] * it.h, -g.toCorner[1] * it.w);
						const len = Math.abs(it.w * Math.sin(ang)) + Math.abs(it.h * Math.cos(ang));
						grad = [this._rampRow(g, len), 0, ang, 0];
						params = [0, repeatPeriod(g, len), 0, 0];
					} else if (g.type === "conic") {
						grad = [this._rampRow(g, 360), 2, (g.cx ?? 0.5) * it.w, (g.cy ?? 0.5) * it.h];
						params = [0, ((g.from ?? 0) * Math.PI) / 180, 0, 0];
					} else {
						const cx = (g.cx ?? 0.5) * it.w, cy = (g.cy ?? 0.5) * it.h;
						const dx = Math.max(cx, it.w - cx), dy = Math.max(cy, it.h - cy);
						const nx = Math.min(cx, it.w - cx), ny = Math.min(cy, it.h - cy);
						let rx: number, ry: number;
						if (g.size === "closest-side") [rx, ry] = [nx, ny];
						else if (g.size === "farthest-side") [rx, ry] = [dx, dy];
						else if (g.size === "closest-corner") [rx, ry] = [nx * Math.SQRT2, ny * Math.SQRT2];
						else [rx, ry] = [dx * Math.SQRT2, dy * Math.SQRT2];
						if (g.shape === "circle") {
							const r = g.size === "closest-side" ? Math.min(nx, ny) : g.size === "farthest-side" ? Math.max(dx, dy) : Math.hypot(dx, dy);
							rx = ry = r;
						}
						grad = [this._rampRow(g, Math.max(rx, ry)), 1, cx, cy];
						params = [0, repeatPeriod(g, Math.max(rx, ry)), rx, ry];
					}
					write(push(null, additive), rect, rect, it.radii, [0, 0, 0, 1], params, Z4, cut, clip, it.matrix, it.opacity, 0, grad);
					continue;
				}
				if (it.color) write(push(null, additive), rect, rect, it.radii, it.color, [0, 0, 0, 0], Z4, cut, clip, it.matrix, it.opacity, 0, NOGRAD);
				continue;
			}
			if (it.op === "text") {
				const f = it.font;
				const k = f.size / SDF_SIZE;
				let x = it.x;
				const chars = [...it.text];
				const shadow = it.shadow;
				const color = shadow ? shadow.color : it.color;
				const ox = shadow ? shadow.x : 0, oy = shadow ? shadow.y : 0;
				for (let i = 0; i < chars.length; i++) {
					const ch = chars[i];
					const g = this.atlas.glyph(ch, f);
					const adv = this.atlas.advance(ch, f) * k;
					if (g) {
						const gx = x + g.left * k + ox, gy = it.y + g.top * k + oy;
						const u0 = g.x / PAGE, v0 = g.y / PAGE, u1 = (g.x + g.w) / PAGE, v1 = (g.y + g.h) / PAGE;
						write(push(null, additive), [gx, gy, g.w * k, g.h * k], Z4, Z4, color, [shadow ? 5 : 4, 0, k, shadow ? shadow.blur / 2 : 0], [u0, v0, u1, v1], Z4, clip, it.matrix, it.opacity, g.page, NOGRAD);
					}
					x += adv + it.letterSpacing + (i + 1 < chars.length ? this.atlas.kerning(ch, chars[i + 1], f) * k : 0);
				}
				continue;
			}
			if (it.op === "image") {
				const tex = this._imageTexture(it.source);
				if (!tex) continue;
				shown.add(it.source);
				write(push(tex, additive), [it.x, it.y, it.w, it.h], [it.x, it.y, it.w, it.h], Z4, [1, 1, 1, 1], [6, 0, 0, 0], [0, 0, 1, 1], Z4, clip, it.matrix, it.opacity, 0, NOGRAD);
				continue;
			}
			if (it.op === "line") {
				const p = it.points;
				const count = it.closed ? p.length / 2 : p.length / 2 - 1;
				for (let i = 0; i < count; i++) {
					const x0 = p[i * 2], y0 = p[i * 2 + 1];
					const j = (i + 1) % (p.length / 2);
					const x1 = p[j * 2], y1 = p[j * 2 + 1];
					const len = Math.hypot(x1 - x0, y1 - y0);
					if (len < 0.01) continue;
					const c = (x1 - x0) / len, s = (y1 - y0) / len;
					// A segment: a box along it, turned about its start (and then the item's own transform)
					const rot: IgeCssMatrix = [c, s, -s, c, x0 - c * x0 + s * y0, y0 - s * x0 - c * y0];
					const m = it.matrix ? multiply2(it.matrix, rot) : rot;
					const w = Math.max(it.width, 0.5);
					const rect = [x0 - w / 2, y0 - w / 2, len + w, w];
					write(push(null, additive), rect, rect, [w / 2, w / 2, w / 2, w / 2], it.color, [0, 0, 0, 0], Z4, Z4, clip, m, it.opacity, 0, NOGRAD);
				}
			}
		}
		this.sweep(shown);
		this.instances = n;
		if (!n) return 0;
		// Draw
		gl.useProgram(this._program);
		gl.bindVertexArray(this._vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._inst);
		if (backdrops.length) {
			// The blur textures sized for the frame's biggest backdrop, and each backdrop's uv scaled to its part of them
			for (const { bd } of backdrops) {
				const [hw, hh] = this._backdropSize(bd);
				this._grab = this._tex(this._grab, bd.w, bd.h, true);
				this._blurA = this._tex(this._blurA, hw, hh);
				this._blurB = this._tex(this._blurB, hw, hh);
			}
			for (const { o, bd } of backdrops) {
				const [hw, hh] = this._backdropSize(bd);
				const ku = hw / this._blurB!.w, kv = hh / this._blurB!.h;
				this._data[o + 20] *= ku;
				this._data[o + 21] *= kv;
				this._data[o + 22] *= ku;
				this._data[o + 23] *= kv;
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, this._data.subarray(0, n * STRIDE), gl.STREAM_DRAW);
		this._uploadAtlas();
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._ramp);
		if (this._rampDirty) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, this._rampData);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			this._rampDirty = false;
		}
		gl.uniform2f(this._uniforms.u_resolution, width, height);
		gl.uniform1f(this._uniforms.u_scale, scale);
		gl.uniform2f(this._uniforms.u_offset, offset[0], offset[1]);
		gl.uniform1i(this._uniforms.u_atlas, 0);
		gl.uniform1i(this._uniforms.u_ramp, 1);
		gl.uniform1i(this._uniforms.u_image, 2);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.SCISSOR_TEST);
		gl.depthMask(false);
		gl.enable(gl.BLEND);
		gl.viewport(0, 0, width, height);
		const target = batches.some((b) => b.backdrop) ? (gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null) : null;
		let calls = 0;
		let blurred: WebGLTexture | null = null;
		for (const b of batches) {
			if (b.backdrop) {
				blurred = this._blurBackdrop(b.backdrop, height, target);
				gl.useProgram(this._program);
				gl.bindVertexArray(this._vao);
				gl.viewport(0, 0, width, height);
				gl.enable(gl.BLEND);
				calls += 2;
			}
			if (b.blend === "add") b.image = blurred;
			if (b.blend === "erase") gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
			else gl.blendFunc(gl.ONE, b.additive || b.blend === "add" ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, b.image);
			// (WebGL 2 has no base instance: the instanced attributes start at the batch)
			for (let i = 0; i < 11; i++) gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, b.start * STRIDE * 4 + i * 16);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.count);
			calls++;
		}
		gl.bindVertexArray(null);
		gl.depthMask(true);
		this.drawCalls = calls;
		return calls;
	}

	/** A texture at least `w` x `h`, made or grown as needed. */
	_tex (have: { tex: WebGLTexture; w: number; h: number } | null, w: number, h: number, mips: boolean = false): { tex: WebGLTexture; w: number; h: number } {
		const gl = this.gl;
		if (have && have.w >= w && have.h >= h) return have;
		const t = have ?? { tex: gl.createTexture()!, w: 0, h: 0 };
		t.w = Math.max(w, have?.w ?? 0);
		t.h = Math.max(h, have?.h ?? 0);
		gl.bindTexture(gl.TEXTURE_2D, t.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return t;
	}

	/**
	 * backdrop-filter: blur(): copies a rectangle of what's been drawn on the target so far (the game, the UI under
	 * it), blurs it at half size (a Gaussian, across then down) and returns the texture to draw it from (its corner
	 * at 0,0; the batch's uv were worked out for that). Leaves the target bound again.
	 */
	_blurBackdrop (r: { x: number; y: number; w: number; h: number; sigma: number }, height: number, target: WebGLFramebuffer | null): WebGLTexture | null {
		const gl = this.gl;
		const k = this._backdropStep(r.sigma);
		const [hw, hh] = this._backdropSize(r);
		// (The textures were grown for the frame's biggest backdrop before its uv were set)
		this._grab = this._tex(this._grab, r.w, r.h, true);
		this._blurA = this._tex(this._blurA, hw, hh);
		this._blurB = this._tex(this._blurB, hw, hh);
		// The copy (the target's rows bottom up), and its smaller levels: the blur reads the one k times smaller
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this._grab.tex);
		gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, r.x, height - (r.y + r.h), r.w, r.h);
		if (k > 1) gl.generateMipmap(gl.TEXTURE_2D);
		gl.useProgram(this._blurProgram);
		gl.bindVertexArray(this._vao);
		gl.disable(gl.BLEND);
		gl.uniform1i(this._blurUniforms.u_src, 3);
		/** One pass: `src`'s first `area` texels blurred along `dir` (steps of `step` texels, `sigma` of those) into `dst`'s first hw x hh. */
		const pass = (src: { tex: WebGLTexture; w: number; h: number }, dst: { tex: WebGLTexture; w: number; h: number }, area: [number, number], dir: [number, number], step: number, sigma: number, lod: number) => {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this._blurFbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dst.tex, 0);
			gl.viewport(0, 0, hw, hh);
			gl.bindTexture(gl.TEXTURE_2D, src.tex);
			gl.uniform4f(this._blurUniforms.u_area, 0, 0, area[0] / src.w, area[1] / src.h);
			gl.uniform2f(this._blurUniforms.u_step, (dir[0] * step) / src.w, (dir[1] * step) / src.h);
			gl.uniform1f(this._blurUniforms.u_sigma, sigma);
			gl.uniform1f(this._blurUniforms.u_lod, lod);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		};
		// Across (from the k-times-smaller level, into a k-times-smaller target), then down
		pass(this._grab, this._blurA, [r.w, r.h], [1, 0], k, r.sigma / k, Math.log2(k));
		pass(this._blurA, this._blurB, [hw, hh], [0, 1], 1, r.sigma / k, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.activeTexture(gl.TEXTURE2);
		return this._blurB.tex;
	}

	/** How much smaller a backdrop's blurred at (the wider the blur, the coarser it can be: 1, 2, 4 or 8). */
	_backdropStep (sigma: number): number {
		return sigma >= 16 ? 8 : sigma >= 8 ? 4 : sigma >= 3 ? 2 : 1;
	}

	/** The blurred backdrop's size (the part of the blur textures it fills, for its uv). */
	_backdropSize (r: { w: number; h: number; sigma: number }): [number, number] {
		const k = this._backdropStep(r.sigma);
		return [Math.max(1, Math.ceil(r.w / k)), Math.max(1, Math.ceil(r.h / k))];
	}
}

function multiply2 (m: IgeCssMatrix, n: IgeCssMatrix): IgeCssMatrix {
	return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
