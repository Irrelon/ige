/**
 * Full-screen post-processing for IgeWebGlRenderer (WebGL 2): the frame is
 * drawn into an offscreen multisampled target (colour plus depth-stencil,
 * so antialiasing, stencil silhouettes, decals and transparency all work as
 * before), then resolved and composited to the canvas with:
 *
 * - bloom: bright areas glow (a soft-knee threshold, blurred at half and
 *   quarter resolution)
 * - exposure and tone mapping (ACES filmic or Reinhard), in half-float
 *   colour where the browser supports rendering to it
 * - colour grading: contrast, saturation and colour temperature
 * - a vignette, and a little dither so gradients don't band
 *
 * Off by default. Enable it with `renderer.postProcess({ enabled: true, ... })`.
 * It runs once over the whole canvas, after every viewport has drawn.
 */

export type IgePostToneMapping = "none" | "aces" | "reinhard";

export interface IgePostProcessSettings {
	enabled: boolean;
	/** Brightness multiplier before tone mapping. */
	exposure: number;
	toneMapping: IgePostToneMapping;
	/** 1 = unchanged; above 1 adds contrast around mid grey. */
	contrast: number;
	/** 1 = unchanged; 0 = greyscale. */
	saturation: number;
	/** Colour temperature, -1 (cool, blue) to 1 (warm, orange). */
	temperature: number;
	/** Vignette strength (0 = none, 1 = corners fully dark). */
	vignette: number;
	/** How gradually the vignette fades in (0-0.9). */
	vignetteSoftness: number;
	/** Bloom strength (0 = off). */
	bloom: number;
	/** Brightness where bloom starts (in scene colour, before exposure). */
	bloomThreshold: number;
	/** Soft knee around the threshold, so bloom fades in rather than switching on. */
	bloomKnee: number;
	/** Bloom spread multiplier. */
	bloomRadius: number;
	/** Multisample count for the offscreen target (clamped to what the GPU allows). */
	samples: number;
	/** Use half-float colour (values above 1 survive to the tone mapper) when supported. */
	hdr: boolean;
}

export const IGE_POST_PROCESS_DEFAULTS: IgePostProcessSettings = {
	enabled: false,
	exposure: 1,
	toneMapping: "none",
	contrast: 1,
	saturation: 1,
	temperature: 0,
	vignette: 0,
	vignetteSoftness: 0.5,
	bloom: 0,
	bloomThreshold: 0.85,
	bloomKnee: 0.25,
	bloomRadius: 1,
	samples: 4,
	hdr: true
};

const VERT = `#version 300 es
out vec2 v_uv;
void main() {
	// One triangle covering the screen
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	v_uv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const BRIGHT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_texel;
uniform float u_threshold;
uniform float u_knee;
uniform int u_applyThreshold;
void main() {
	// Downsample with a 4-tap box (each tap is a bilinear 2x2 average)
	vec3 c = texture(u_src, v_uv + u_texel * vec2(-0.5, -0.5)).rgb;
	c += texture(u_src, v_uv + u_texel * vec2(0.5, -0.5)).rgb;
	c += texture(u_src, v_uv + u_texel * vec2(-0.5, 0.5)).rgb;
	c += texture(u_src, v_uv + u_texel * vec2(0.5, 0.5)).rgb;
	c *= 0.25;
	if (u_applyThreshold == 1) {
		float br = max(c.r, max(c.g, c.b));
		float soft = clamp(br - u_threshold + u_knee, 0.0, 2.0 * u_knee);
		soft = soft * soft / (4.0 * u_knee + 1e-4);
		float contribution = max(soft, br - u_threshold) / max(br, 1e-4);
		c *= max(contribution, 0.0);
	}
	o = vec4(c, 1.0);
}`;

const BLUR = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_dir;
void main() {
	// 9-tap Gaussian using linear filtering (5 fetches)
	vec3 s = texture(u_src, v_uv).rgb * 0.2270270270;
	s += texture(u_src, v_uv + u_dir * 1.3846153846).rgb * 0.3162162162;
	s += texture(u_src, v_uv - u_dir * 1.3846153846).rgb * 0.3162162162;
	s += texture(u_src, v_uv + u_dir * 3.2307692308).rgb * 0.0702702703;
	s += texture(u_src, v_uv - u_dir * 3.2307692308).rgb * 0.0702702703;
	o = vec4(s, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_scene;
uniform sampler2D u_bloom0;
uniform sampler2D u_bloom1;
uniform float u_bloom;
uniform float u_exposure;
uniform int u_tone;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_vignette;
uniform float u_vignetteSoftness;
uniform vec2 u_resolution;

vec3 aces(vec3 x) {
	const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
	return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
	vec3 c = texture(u_scene, v_uv).rgb;
	if (u_bloom > 0.0) {
		c += (texture(u_bloom0, v_uv).rgb * 0.55 + texture(u_bloom1, v_uv).rgb * 0.45) * u_bloom;
	}
	c *= u_exposure;
	c *= vec3(1.0 + u_temperature * 0.08, 1.0 + u_temperature * 0.01, 1.0 - u_temperature * 0.08);
	if (u_tone == 1) c = aces(c);
	else if (u_tone == 2) c = c / (1.0 + c);
	c = (c - 0.5) * u_contrast + 0.5;
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	c = mix(vec3(l), c, u_saturation);
	if (u_vignette > 0.0) {
		vec2 d = v_uv - 0.5;
		d.x *= u_resolution.x / max(u_resolution.y, 1.0);
		float dist = length(d);
		float v = smoothstep(0.95, 0.95 - clamp(u_vignetteSoftness, 0.05, 0.9), dist);
		c *= mix(1.0, v, u_vignette);
	}
	// A little noise breaks up banding in smooth gradients
	float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
	c += (n - 0.5) / 255.0;
	o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

interface Target {
	fbo: WebGLFramebuffer;
	tex: WebGLTexture;
	w: number;
	h: number;
}

interface Program {
	program: WebGLProgram;
	uniforms: Map<string, WebGLUniformLocation | null>;
}

export class IgeWebGlPostProcess {
	settings: IgePostProcessSettings;

	protected _gl: WebGL2RenderingContext;
	protected _w = 0;
	protected _h = 0;
	protected _samples = 0;
	protected _half = false;
	protected _msaaFbo: WebGLFramebuffer | null = null;
	protected _msaaColor: WebGLRenderbuffer | null = null;
	protected _msaaDepth: WebGLRenderbuffer | null = null;
	protected _scene: Target | null = null;
	/** Bloom levels: [half A, half B, quarter A, quarter B]. */
	protected _bloom: Target[] = [];
	protected _programs: { bright: Program; blur: Program; composite: Program } | null = null;
	protected _vao: WebGLVertexArrayObject | null = null;
	protected _active = false;
	protected _failed = false;

	constructor (gl: WebGL2RenderingContext, settings: Partial<IgePostProcessSettings> = {}) {
		this._gl = gl;
		this.settings = { ...IGE_POST_PROCESS_DEFAULTS, ...settings };
	}

	/** Whether this frame is being drawn offscreen. */
	get active (): boolean {
		return this._active;
	}

	/**
	 * Start a frame: make sure the targets fit the canvas and bind the
	 * offscreen target. Returns false (and draws nothing differently) when
	 * post-processing is off or unavailable.
	 */
	begin (width: number, height: number): boolean {
		this._active = false;
		if (!this.settings.enabled || this._failed || width < 1 || height < 1) return false;
		try {
			this._ensure(width, height);
		} catch (error) {
			console.warn("IgeWebGlPostProcess: turned off,", error);
			this._failed = true;
			this.dispose();
			return false;
		}
		this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._msaaFbo);
		this._active = true;
		return true;
	}

	/** Re-bind the offscreen target (passes such as shadow maps bind their own and then the canvas). */
	bindTarget (): void {
		if (this._active) this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._msaaFbo);
	}

	/** Finish the frame: resolve, bloom and composite to the canvas. Leaves GL state for the caller to reset. */
	end (): void {
		if (!this._active) return;
		this._active = false;
		const gl = this._gl, s = this.settings;
		const scene = this._scene!;
		const programs = this._programs!;

		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.BLEND);
		gl.disable(gl.CULL_FACE);
		gl.depthMask(false);
		gl.colorMask(true, true, true, true);

		// Resolve the multisampled frame into a texture
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._msaaFbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.fbo);
		gl.blitFramebuffer(0, 0, this._w, this._h, 0, 0, this._w, this._h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

		gl.bindVertexArray(this._vao);
		const bloomOn = s.bloom > 0;
		if (bloomOn) {
			const [a0, b0, a1, b1] = this._bloom;
			// Bright pass at half resolution
			this._pass(programs.bright, a0, (u) => {
				this._texture(0, scene.tex);
				gl.uniform1i(u("u_src"), 0);
				gl.uniform2f(u("u_texel"), 1 / scene.w, 1 / scene.h);
				gl.uniform1f(u("u_threshold"), s.bloomThreshold);
				gl.uniform1f(u("u_knee"), Math.max(1e-3, s.bloomKnee));
				gl.uniform1i(u("u_applyThreshold"), 1);
			});
			this._blur(a0, b0, s.bloomRadius);
			// Quarter resolution for a wider halo
			this._pass(programs.bright, a1, (u) => {
				this._texture(0, a0.tex);
				gl.uniform1i(u("u_src"), 0);
				gl.uniform2f(u("u_texel"), 1 / a0.w, 1 / a0.h);
				gl.uniform1i(u("u_applyThreshold"), 0);
			});
			this._blur(a1, b1, s.bloomRadius * 1.5);
		}

		// Composite to the canvas
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this._w, this._h);
		const comp = programs.composite;
		gl.useProgram(comp.program);
		const u = (name: string) => this._uniform(comp, name);
		this._texture(0, scene.tex);
		gl.uniform1i(u("u_scene"), 0);
		this._texture(1, bloomOn ? this._bloom[0].tex : scene.tex);
		gl.uniform1i(u("u_bloom0"), 1);
		this._texture(2, bloomOn ? this._bloom[2].tex : scene.tex);
		gl.uniform1i(u("u_bloom1"), 2);
		gl.uniform1f(u("u_bloom"), bloomOn ? s.bloom : 0);
		gl.uniform1f(u("u_exposure"), s.exposure);
		gl.uniform1i(u("u_tone"), s.toneMapping === "aces" ? 1 : s.toneMapping === "reinhard" ? 2 : 0);
		gl.uniform1f(u("u_contrast"), s.contrast);
		gl.uniform1f(u("u_saturation"), s.saturation);
		gl.uniform1f(u("u_temperature"), s.temperature);
		gl.uniform1f(u("u_vignette"), s.vignette);
		gl.uniform1f(u("u_vignetteSoftness"), s.vignetteSoftness);
		gl.uniform2f(u("u_resolution"), this._w, this._h);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		gl.bindVertexArray(null);
		for (let unit = 0; unit < 3; unit++) {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
		gl.activeTexture(gl.TEXTURE0);
		gl.useProgram(null);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);
	}

	/** Free every GPU resource (the next begin() recreates what it needs). */
	dispose (): void {
		const gl = this._gl;
		this._freeTargets();
		if (this._programs) {
			for (const p of Object.values(this._programs)) gl.deleteProgram(p.program);
			this._programs = null;
		}
		if (this._vao) gl.deleteVertexArray(this._vao);
		this._vao = null;
	}

	/** Forget GPU resources without deleting them (after the context was lost). */
	contextLost (): void {
		this._msaaFbo = this._msaaColor = this._msaaDepth = null;
		this._scene = null;
		this._bloom = [];
		this._programs = null;
		this._vao = null;
		this._w = this._h = 0;
		this._active = false;
	}

	// ------------------------------------------------------------------

	protected _ensure (width: number, height: number): void {
		const gl = this._gl;
		if (!this._programs) {
			this._programs = {
				bright: this._compile(BRIGHT),
				blur: this._compile(BLUR),
				composite: this._compile(COMPOSITE)
			};
			this._vao = gl.createVertexArray();
		}
		const half = this.settings.hdr && !!gl.getExtension("EXT_color_buffer_float");
		const samples = Math.max(0, Math.min(this.settings.samples, gl.getParameter(gl.MAX_SAMPLES) as number));
		if (width === this._w && height === this._h && half === this._half && samples === this._samples && this._msaaFbo) return;
		this._freeTargets();
		this._w = width;
		this._h = height;
		this._half = half;
		this._samples = samples;
		const colorFormat = half ? gl.RGBA16F : gl.RGBA8;

		this._msaaFbo = gl.createFramebuffer();
		this._msaaColor = gl.createRenderbuffer();
		this._msaaDepth = gl.createRenderbuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._msaaFbo);
		gl.bindRenderbuffer(gl.RENDERBUFFER, this._msaaColor);
		gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, colorFormat, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._msaaColor);
		gl.bindRenderbuffer(gl.RENDERBUFFER, this._msaaDepth);
		gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH24_STENCIL8, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this._msaaDepth);
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`offscreen target incomplete (0x${status.toString(16)})`);

		this._scene = this._target(width, height, half);
		const hw = Math.max(1, width >> 1), hh = Math.max(1, height >> 1);
		const qw = Math.max(1, width >> 2), qh = Math.max(1, height >> 2);
		this._bloom = [this._target(hw, hh, half), this._target(hw, hh, half), this._target(qw, qh, half), this._target(qw, qh, half)];
	}

	protected _target (w: number, h: number, half: boolean): Target {
		const gl = this._gl;
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
		const fbo = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`post target incomplete (0x${status.toString(16)})`);
		return { fbo, tex, w, h };
	}

	protected _freeTargets (): void {
		const gl = this._gl;
		if (this._msaaFbo) gl.deleteFramebuffer(this._msaaFbo);
		if (this._msaaColor) gl.deleteRenderbuffer(this._msaaColor);
		if (this._msaaDepth) gl.deleteRenderbuffer(this._msaaDepth);
		this._msaaFbo = this._msaaColor = this._msaaDepth = null;
		for (const t of [this._scene, ...this._bloom]) {
			if (!t) continue;
			gl.deleteFramebuffer(t.fbo);
			gl.deleteTexture(t.tex);
		}
		this._scene = null;
		this._bloom = [];
		this._w = this._h = 0;
	}

	protected _compile (fragment: string): Program {
		const gl = this._gl;
		const shader = (type: number, src: string) => {
			const sh = gl.createShader(type)!;
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader failed to compile");
			return sh;
		};
		const vs = shader(gl.VERTEX_SHADER, VERT);
		const fs = shader(gl.FRAGMENT_SHADER, fragment);
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
		return { program, uniforms: new Map() };
	}

	protected _uniform (p: Program, name: string): WebGLUniformLocation | null {
		let loc = p.uniforms.get(name);
		if (loc === undefined) {
			loc = this._gl.getUniformLocation(p.program, name);
			p.uniforms.set(name, loc);
		}
		return loc;
	}

	protected _texture (unit: number, tex: WebGLTexture): void {
		const gl = this._gl;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
	}

	protected _pass (p: Program, target: Target, setup: (u: (name: string) => WebGLUniformLocation | null) => void): void {
		const gl = this._gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
		gl.viewport(0, 0, target.w, target.h);
		gl.useProgram(p.program);
		setup((name) => this._uniform(p, name));
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	/** Separable blur: a -> b horizontally, b -> a vertically. */
	protected _blur (a: Target, b: Target, radius: number): void {
		const gl = this._gl;
		const blur = this._programs!.blur;
		this._pass(blur, b, (u) => {
			this._texture(0, a.tex);
			gl.uniform1i(u("u_src"), 0);
			gl.uniform2f(u("u_dir"), radius / a.w, 0);
		});
		this._pass(blur, a, (u) => {
			this._texture(0, b.tex);
			gl.uniform1i(u("u_src"), 0);
			gl.uniform2f(u("u_dir"), 0, radius / b.h);
		});
	}
}
