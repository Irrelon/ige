import { markSceneChanged } from "@/engine/utils/sceneChange";
import { igeEffectNow } from "@/engine/webgl/IgeEffectTime";

/**
 * Lensing (IgeWebGlRenderer.lens()): a distortion that bends the picture round a point in the world, as a collapsing
 * star or the mouth of a rift would, with an optional thin bright ring at the Einstein radius and an optional dark core.
 *
 * It's a pass over a finished view (see IgeLensPass): the view's picture is copied, then redrawn with each lens
 * pulling its pixels toward or past its centre (a light ray's source seen at d - e^2 / d, e the Einstein radius). Per
 * view, so split screen and panel viewports each place their own lenses; up to IGE_LENS_MAX at once; with post-processing
 * on it runs before it, in the same (HDR) format, so the ring blooms. The maths here is pure and shared with the shader.
 */
export const IGE_LENS_MAX = 8;

/** Every setting is a number, so a timeline can animate any of them (`effect.<name>`). */
export interface IgeLensSettings {
	/** Where it is, world units. */
	x: number;
	y: number;
	z: number;
	/** How far its pull reaches, world units. Beyond it the picture is untouched. */
	radius: number;
	/** 0 none; 1 the picture right at the Einstein radius (0.45 of `radius` at strength 1) pulled to the centre; more also folds the middle over. */
	strength: number;
	/** The ring's brightness (0 no ring; 1 about the picture's own brightness again; HDR bloom takes more) and its width as a fraction of `radius`. */
	ring: number;
	ringWidth: number;
	/** The ring's colour. */
	ringR: number;
	ringG: number;
	ringB: number;
	/** A dark core (the rift's mouth) as a fraction of `radius`, 0 none. */
	core: number;
	/** How much the ring ripples (0 steady to 1), and how fast. */
	ripple: number;
	rippleSpeed: number;
}

export type IgeLensSettingName = keyof IgeLensSettings;

export const IGE_LENS_DEFAULTS: Readonly<IgeLensSettings> = {
	x: 0, y: 0, z: 0, radius: 100, strength: 0, ring: 0, ringWidth: 0.025, ringR: 1, ringG: 0.86, ringB: 0.62, core: 0, ripple: 0, rippleSpeed: 1
};

export type IgeLensInput = Partial<IgeLensSettings> & {
	ringColor?: { r: number; g: number; b: number };
	/** Names of the viewports it acts in (default: all, panels included). */
	viewports?: string[] | null;
	/** The time its ripple is a function of, seconds (null: igeEffectTime(), else the engine's). */
	time?: number | null;
};

/** The Einstein radius as a fraction of the lens's radius. */
export const IGE_LENS_EINSTEIN = 0.45;

/** Where the ring is, in the same unit as `radius`: the distance whose picture is pulled right to the centre (at most 0.9 of the radius). */
export function igeLensRingRadius (radius: number, strength: number): number {
	return Math.min(0.9 * radius, IGE_LENS_EINSTEIN * radius * Math.sqrt(Math.max(0, strength)));
}

const smoothstep = (a: number, b: number, x: number): number => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/**
 * Where, at distance `d` from the lens's centre, the picture is taken from: `d` itself outside `radius` (untouched),
 * pulled in toward the centre by strength * e^2 / d inside (eased out toward the edge so there's no seam); negative
 * past the centre once the pull outruns the distance (the middle is folded over). The shader does the same.
 */
export function igeLensSource (d: number, radius: number, strength: number): number {
	const e = IGE_LENS_EINSTEIN * radius;
	const dd = Math.max(d, 1e-3);
	const fade = 1 - smoothstep(0.55 * radius, radius, dd);
	return dd - (strength * e * e / dd) * fade;
}

/** A lens placed on screen: centre and radius in pixels of a view, or null if it's behind the camera or off the view. */
export interface IgeLensScreen {
	x: number;
	y: number;
	radius: number;
}

/**
 * Where a lens lands in a view: the view's rectangle `view` (device pixels, GL's way up, x0 y0 inclusive, x1 y1
 * exclusive) as `viewProj` (column-major) puts the lens's centre, and its radius as that many world units look across
 * the camera's `right` vector there. Null when behind the camera or wholly outside the view.
 */
export function igeLensScreen (
	lens: { x: number; y: number; z: number; radius: number },
	viewProj: ArrayLike<number>,
	right: { x: number; y: number; z: number },
	view: { x0: number; y0: number; x1: number; y1: number }
): IgeLensScreen | null {
	const m = viewProj;
	const w = view.x1 - view.x0, h = view.y1 - view.y0;
	const project = (x: number, y: number, z: number): { x: number; y: number } | null => {
		const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
		if (cw <= 1e-6) return null;
		const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw;
		const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
		return { x: view.x0 + (nx * 0.5 + 0.5) * w, y: view.y0 + (ny * 0.5 + 0.5) * h };
	};
	const c = project(lens.x, lens.y, lens.z);
	if (!c) return null;
	const e = project(lens.x + right.x * lens.radius, lens.y + right.y * lens.radius, lens.z + right.z * lens.radius);
	if (!e) return null;
	const radius = Math.hypot(e.x - c.x, e.y - c.y);
	if (!(radius > 0.5)) return null;
	if (c.x + radius < view.x0 || c.x - radius > view.x1 || c.y + radius < view.y0 || c.y - radius > view.y1) return null;
	return { x: c.x, y: c.y, radius };
}

/**
 * A lens (the object renderer.lens() returns): its settings, and `set()` / `has()` / `time()` so an IgeTimeline can
 * animate any numeric setting as a track `effect.<name>` (`timeline.bind("rift", renderer.lens("rift"))`).
 */
export class IgeLens {
	settings: IgeLensSettings = { ...IGE_LENS_DEFAULTS };
	/** Viewports it acts in by id; null: all. */
	viewports: string[] | null = null;
	protected _time: number | null = null;

	constructor (input?: IgeLensInput) {
		if (input) this.set(input);
	}

	set (input: IgeLensInput): this {
		const { ringColor, viewports, time, ...numbers } = input;
		const s = this.settings;
		for (const [name, value] of Object.entries(numbers)) {
			if (typeof value === "number" && name in s) (s as unknown as Record<string, number>)[name] = value;
		}
		if (ringColor) { s.ringR = ringColor.r; s.ringG = ringColor.g; s.ringB = ringColor.b; }
		if (viewports !== undefined) this.viewports = viewports;
		if (time !== undefined) this._time = time;
		markSceneChanged();
		return this;
	}

	has (name: string): boolean {
		return name in IGE_LENS_DEFAULTS;
	}

	time (): number | null;
	time (t: number | null): this;
	time (t?: number | null) {
		if (t === undefined) return this._time;
		this._time = t;
		markSceneChanged();
		return this;
	}

	/** The time its ripple is drawn at, seconds. */
	now (): number {
		return this._time ?? igeEffectNow();
	}

	/** Whether it does anything at all (some strength, ring or core, and a radius). */
	active (): boolean {
		const s = this.settings;
		return s.radius > 0 && (s.strength > 0 || s.core > 0);
	}
}

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec4 u_rect;
uniform int u_count;
uniform vec4 u_a[${IGE_LENS_MAX}];
uniform vec4 u_b[${IGE_LENS_MAX}];
uniform vec4 u_c[${IGE_LENS_MAX}];
out vec4 o_color;
float lensSmooth (float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main() {
	vec2 frag = gl_FragCoord.xy;
	vec2 p = frag;
	vec3 add = vec3(0.0);
	float dark = 0.0;
	for (int i = 0; i < ${IGE_LENS_MAX}; i++) {
		if (i >= u_count) break;
		vec2 c = u_a[i].xy;
		float R = u_a[i].z, s = u_a[i].w;
		vec2 dv = p - c;
		float d = max(length(dv), 0.001);
		float e = ${IGE_LENS_EINSTEIN} * R;
		float fade = 1.0 - lensSmooth(0.55 * R, R, d);
		float src = d - (s * e * e / d) * fade;
		// The ring: where the picture comes from the centre (a ripple moves it with the angle and time)
		float ringIntensity = u_b[i].x, ringWidth = max(u_b[i].y, 0.75), core = u_b[i].z, ripple = u_b[i].w;
		if (ringIntensity > 0.0) {
			float ang = atan(dv.y, dv.x);
			float ringR = min(0.9 * R, e * sqrt(max(s, 0.0)));
			float wob = ripple * (sin(ang * 5.0 + u_c[i].w * 1.7) + 0.6 * sin(ang * 9.0 - u_c[i].w * 2.3)) * 0.05 * R;
			float x = (d - ringR - wob) / ringWidth;
			add += u_c[i].rgb * ringIntensity * exp(-x * x) * (0.75 + 0.25 * sin(ang * 3.0 + u_c[i].w));
		}
		if (core > 0.0) dark = max(dark, 1.0 - lensSmooth(core * 0.82, core, d));
		p = c + dv / d * src;
	}
	vec2 q = clamp(p, u_rect.xy + 0.5, u_rect.xy + u_rect.zw - 0.5);
	vec4 col = texture(u_src, (q - u_rect.xy) / u_rect.zw);
	col.rgb = mix(col.rgb, vec3(0.0), dark) + add * (1.0 - dark);
	o_color = vec4(col.rgb, 1.0);
}`;

/** A lens to draw in a view: placed on screen (pixels), its settings, its time. */
export interface IgeLensDraw {
	screen: IgeLensScreen;
	lens: IgeLens;
}

/**
 * Draws lenses over the frame bound as the GL framebuffer: the view's rectangle is resolved (blitted) into a texture of
 * the target's own format (half float when it's an HDR target), then drawn back through the lenses' warp as one
 * full-view quad. Plain WebGL 2 calls (it runs between the renderer's own, with its state saved and put back), made on
 * first use and freed with destroy() / contextLost().
 */
export class IgeLensPass {
	protected _program: WebGLProgram | null = null;
	protected _uniforms: Record<string, WebGLUniformLocation | null> = {};
	protected _vao: WebGLVertexArrayObject | null = null;
	protected _buffer: WebGLBuffer | null = null;
	protected _texture: WebGLTexture | null = null;
	protected _framebuffer: WebGLFramebuffer | null = null;
	protected _w = 0;
	protected _h = 0;
	protected _float = false;
	protected _a = new Float32Array(IGE_LENS_MAX * 4);
	protected _b = new Float32Array(IGE_LENS_MAX * 4);
	protected _c = new Float32Array(IGE_LENS_MAX * 4);

	constructor (protected _gl: WebGL2RenderingContext) {}

	/** Draws `lenses` over the rectangle (x, y, w, h: device pixels, GL's way up) of the framebuffer bound now. */
	apply (lenses: IgeLensDraw[], x: number, y: number, w: number, h: number): void {
		const gl = this._gl;
		if (lenses.length === 0 || w < 1 || h < 1) return;
		if (!this._program && !this._make()) return;
		const bound = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
		const isFloat = this._targetIsFloat(bound);
		if (!this._texture || this._w !== w || this._h !== h || this._float !== isFloat) this._size(w, h, isFloat);

		// Resolve the view into the texture
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, bound);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._framebuffer);
		gl.disable(gl.SCISSOR_TEST);
		gl.blitFramebuffer(x, y, x + w, y + h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
		gl.bindFramebuffer(gl.FRAMEBUFFER, bound);

		const n = Math.min(lenses.length, IGE_LENS_MAX);
		for (let i = 0; i < n; i++) {
			const { screen, lens } = lenses[i], s = lens.settings;
			this._a.set([screen.x, screen.y, screen.radius, s.strength], i * 4);
			this._b.set([s.ring, Math.max(0.75, s.ringWidth * screen.radius), s.core * screen.radius, s.ripple], i * 4);
			this._c.set([s.ringR, s.ringG, s.ringB, lens.now() * s.rippleSpeed], i * 4);
		}

		const u = this._uniforms;
		const hadDepth = gl.isEnabled(gl.DEPTH_TEST), hadBlend = gl.isEnabled(gl.BLEND), hadCull = gl.isEnabled(gl.CULL_FACE);
		const hadStencil = gl.isEnabled(gl.STENCIL_TEST);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.STENCIL_TEST);
		gl.useProgram(this._program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.uniform1i(u.u_src, 0);
		gl.uniform4f(u.u_rect, x, y, w, h);
		gl.uniform1i(u.u_count, n);
		gl.uniform4fv(u.u_a, this._a);
		gl.uniform4fv(u.u_b, this._b);
		gl.uniform4fv(u.u_c, this._c);
		gl.bindVertexArray(this._vao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindVertexArray(null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.useProgram(null);
		if (hadDepth) gl.enable(gl.DEPTH_TEST);
		if (hadBlend) gl.enable(gl.BLEND);
		if (hadCull) gl.enable(gl.CULL_FACE);
		if (hadStencil) gl.enable(gl.STENCIL_TEST);
	}

	/** Whether the colour attachment bound is floating point (an HDR target); the canvas is not. */
	protected _targetIsFloat (bound: WebGLFramebuffer | null): boolean {
		if (!bound) return false;
		const gl = this._gl;
		const type = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE) as number;
		return type === gl.FLOAT;
	}

	protected _size (w: number, h: number, isFloat: boolean): void {
		const gl = this._gl;
		this._free();
		this._texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, isFloat ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, isFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
		this._framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this._w = w;
		this._h = h;
		this._float = isFloat;
	}

	protected _make (): boolean {
		const gl = this._gl;
		const compile = (type: number, src: string): WebGLShader | null => {
			const sh = gl.createShader(type)!;
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
				console.error("IgeLensPass shader:", gl.getShaderInfoLog(sh));
				return null;
			}
			return sh;
		};
		const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
		if (!vs || !fs) return false;
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.bindAttribLocation(program, 0, "a_position");
		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("IgeLensPass link:", gl.getProgramInfoLog(program));
			return false;
		}
		this._program = program;
		for (const name of ["u_src", "u_rect", "u_count", "u_a", "u_b", "u_c"]) this._uniforms[name] = gl.getUniformLocation(program, name);
		// One oversized triangle covers the view
		this._vao = gl.createVertexArray();
		this._buffer = gl.createBuffer();
		gl.bindVertexArray(this._vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		return true;
	}

	protected _free (): void {
		const gl = this._gl;
		if (this._texture) gl.deleteTexture(this._texture);
		if (this._framebuffer) gl.deleteFramebuffer(this._framebuffer);
		this._texture = null;
		this._framebuffer = null;
		this._w = this._h = 0;
	}

	/** The context was lost: forget everything (it's made again when next used). */
	contextLost (): void {
		this._program = this._vao = this._buffer = this._texture = this._framebuffer = null;
		this._w = this._h = 0;
	}

	destroy (): void {
		const gl = this._gl;
		this._free();
		if (this._program) gl.deleteProgram(this._program);
		if (this._vao) gl.deleteVertexArray(this._vao);
		if (this._buffer) gl.deleteBuffer(this._buffer);
		this._program = this._vao = this._buffer = null;
	}
}
