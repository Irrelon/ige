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
 * - depth of field (off unless `dof` > 0): what's nearer or further than
 *   the focus blurs, by depth. The focus is a distance from the camera, or
 *   (dofFocus 0) whatever is nearest the camera around a point on the
 *   screen, the middle by default, so it follows the subject. Blurred at
 *   half resolution, each sample weighted by how out of focus it is so
 *   sharp edges don't smear into the blur behind them.
 *
 * - the picture itself moved, turned and zoomed on the screen, softened and
 *   doubled (a drunk sway, a stunned blur): `offsetX`, `offsetY`, `rotation`,
 *   `zoom`, `blur`, `ghost`. Only the world's picture moves: what's drawn after
 *   it (outlines, the UI layer, the document UI) stays put.
 *
 * Off by default. Enable it with `renderer.postProcess({ enabled: true, ... })`.
 * The picture effects work with it off too: while any is set, the frame goes
 * offscreen for them alone (no bloom, tone mapping or grading), at the cost of
 * that offscreen target, a resolve and one full-screen pass.
 * It runs once over the whole canvas, after every viewport has drawn, on the
 * GPU device (IgeGpuDevice): its targets are device textures, its passes the
 * device's (the multisampled frame resolved with resolveTexture).
 */

import type { IgeGpuRenderPipeline, IgeGpuTexture, IgeGpuTextureFormat, IgeGpuUniform } from "@/engine/gpu/IgeGpuDevice";
import { type IgeWebGl2GpuDevice, webGl2Framebuffer } from "@/engine/gpu/IgeWebGl2GpuDevice";

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
	/** Depth of field strength (0 = off; 1 = blur up to about 2% of the screen's height). */
	dof: number;
	/** Distance from the camera that's sharp (world units); 0 focuses on what's at dofFocusX/Y. */
	dofFocus: number;
	/** Where to focus when dofFocus is 0, as a point on the screen (0-1 from the bottom left). */
	dofFocusX: number;
	dofFocusY: number;
	/**
	 * How deep the sharp zone is, as a fraction of the focus distance (0.15:
	 * 15% nearer or further stays sharp). With an orthographic camera the
	 * distance is measured from its near plane, so a camera with a near plane
	 * far behind it wants a smaller range.
	 */
	dofRange: number;
	/**
	 * The picture moved on the screen, as a fraction of the screen's height (x to the right, y down): a sway or a
	 * shake. 0 = unmoved.
	 */
	offsetX: number;
	offsetY: number;
	/** The picture turned about the screen's middle, radians (clockwise on screen). */
	rotation: number;
	/** The picture zoomed about the screen's middle (1 = unchanged; a little over 1 hides the edges a sway shows). */
	zoom: number;
	/** A soft blur over the whole picture, its radius as a fraction of the screen's height (0 = sharp). */
	blur: number;
	/** Double vision: a second, shifted copy of the picture's bright parts, lightening it (0 = none, 1 = full). */
	ghost: number;
	/** The ghost's shift, as a fraction of the screen's height (x to the right, y down). */
	ghostX: number;
	ghostY: number;
	/** The ghost's tint (0-1 each). */
	ghostColor: { r: number; g: number; b: number };
}

/** Whether any of the picture effects (offset, rotation, zoom, blur, ghost) is set: the frame goes offscreen for them. */
export function igePictureEffectsOn (s: Pick<IgePostProcessSettings, "offsetX" | "offsetY" | "rotation" | "zoom" | "blur" | "ghost">): boolean {
	return s.offsetX !== 0 || s.offsetY !== 0 || s.rotation !== 0 || s.zoom !== 1 || s.blur > 0 || s.ghost > 0;
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
	hdr: true,
	dof: 0,
	dofFocus: 0,
	dofFocusX: 0.5,
	dofFocusY: 0.5,
	dofRange: 0.15,
	offsetX: 0,
	offsetY: 0,
	rotation: 0,
	zoom: 1,
	blur: 0,
	ghost: 0,
	ghostX: 0,
	ghostY: 0,
	ghostColor: { r: 1, g: 1, b: 1 }
};

/** Depth to distance and circle of confusion, shared by the depth-of-field passes. */
const DOF_COMMON = `
uniform sampler2D u_depth;
uniform vec2 u_depthRange;
uniform int u_perspective;
uniform float u_focus;
uniform vec2 u_focusUv;
uniform float u_range;
float distanceAt(float d) {
	if (u_perspective == 1) {
		float z = d * 2.0 - 1.0;
		return 2.0 * u_depthRange.x * u_depthRange.y / (u_depthRange.y + u_depthRange.x - z * (u_depthRange.y - u_depthRange.x));
	}
	// Orthographic: depth is linear; measured from the near plane (so it's never negative)
	return d * (u_depthRange.y - u_depthRange.x);
}
float focusDistance() {
	if (u_focus > 0.0) return u_focus;
	// The nearest thing around the focus point (so a subject in the middle wins over the sky behind it)
	float d = texture(u_depth, u_focusUv).r;
	d = min(d, texture(u_depth, u_focusUv + vec2(0.03, 0.0)).r);
	d = min(d, texture(u_depth, u_focusUv - vec2(0.03, 0.0)).r);
	d = min(d, texture(u_depth, u_focusUv + vec2(0.0, 0.03)).r);
	d = min(d, texture(u_depth, u_focusUv - vec2(0.0, 0.03)).r);
	return distanceAt(d);
}
float cocAt(float d, float focus) {
	float z = distanceAt(d);
	return clamp((abs(z - focus) / max(focus, 1e-3) - u_range) / max(u_range, 0.05), 0.0, 1.0);
}
`;

const DOF_BLUR = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_radius;
${DOF_COMMON}
void main() {
	float focus = focusDistance();
	// A disc of samples (golden angle spiral), each weighted by how blurred it is itself
	vec3 sum = texture(u_src, v_uv).rgb * 0.05;
	float weight = 0.05;
	for (int i = 0; i < 28; i++) {
		float f = float(i) + 0.5;
		float r = sqrt(f / 28.0);
		float a = f * 2.39996323;
		vec2 uv = v_uv + vec2(cos(a), sin(a)) * r * u_radius;
		float w = cocAt(texture(u_depth, uv).r, focus) + 0.02;
		sum += texture(u_src, uv).rgb * w;
		weight += w;
	}
	o = vec4(sum / weight, 1.0);
}`;

const DOF_COMBINE = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform sampler2D u_blurred;
${DOF_COMMON}
void main() {
	float k = smoothstep(0.0, 1.0, cocAt(texture(u_depth, v_uv).r, focusDistance()));
	o = vec4(mix(texture(u_src, v_uv).rgb, texture(u_blurred, v_uv).rgb, k), 1.0);
}`;

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
// The picture's place: its offset (in heights, y up), turn and zoom; its blur (in heights); the ghost
uniform vec2 u_offset;
uniform float u_rotation;
uniform float u_zoom;
uniform float u_blur;
uniform float u_ghost;
uniform vec2 u_ghostShift;
uniform vec3 u_ghostColor;

vec3 aces(vec3 x) {
	const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
	return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Where on the drawn frame a point of the screen shows: the picture's move, turn and zoom undone (about the middle,
// in units of the screen's height so a turn keeps its shape)
vec2 placed(vec2 uv) {
	float aspect = u_resolution.x / max(u_resolution.y, 1.0);
	vec2 p = (uv - 0.5) * vec2(aspect, 1.0) - u_offset;
	float cs = cos(u_rotation), sn = sin(u_rotation);
	p = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / u_zoom;
	return p / vec2(aspect, 1.0) + 0.5;
}

// The frame there, softened by the blur (eight taps round a ring and the middle)
vec3 sceneAt(vec2 uv) {
	vec3 c = texture(u_scene, uv).rgb;
	if (u_blur <= 0.0) return c;
	vec2 r = vec2(u_blur / max(u_resolution.x / max(u_resolution.y, 1.0), 1e-4), u_blur);
	vec3 s = c * 2.0;
	for (int i = 0; i < 8; i++) {
		float a = float(i) * 0.785398;
		s += texture(u_scene, uv + vec2(cos(a), sin(a)) * r).rgb;
	}
	return s / 10.0;
}


void main() {
	vec2 uv = placed(v_uv);
	vec3 c = sceneAt(uv);
	if (u_ghost > 0.0) {
		// Double vision: the shifted copy's bright parts lighten the picture
		vec3 g = sceneAt(uv - u_ghostShift / vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0)) * u_ghostColor;
		c = mix(c, max(c, g), u_ghost);
	}
	if (u_bloom > 0.0) {
		c += (texture(u_bloom0, uv).rgb * 0.55 + texture(u_bloom1, uv).rgb * 0.45) * u_bloom;
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


/** The picture effects of some settings (what's kept when post-processing is off and only they're on). */
function pictureOf (s: IgePostProcessSettings): Partial<IgePostProcessSettings> {
	const { offsetX, offsetY, rotation, zoom, blur, ghost, ghostX, ghostY, ghostColor, samples } = s;
	return { offsetX, offsetY, rotation, zoom, blur, ghost, ghostX, ghostY, ghostColor, samples };
}

/** The depth-of-field passes' focus uniforms. */
const FOCUS: IgeGpuUniform[] = [
	{ name: "u_depthRange", type: "vec2" }, { name: "u_perspective", type: "i32" }, { name: "u_focus", type: "f32" },
	{ name: "u_focusUv", type: "vec2" }, { name: "u_range", type: "f32" }
];

/** Each pass's fragment shader, uniform block and textures (in their slots' order). */
const PASSES = {
	bright: { fragment: BRIGHT, uniforms: [{ name: "u_texel", type: "vec2" }, { name: "u_threshold", type: "f32" }, { name: "u_knee", type: "f32" }, { name: "u_applyThreshold", type: "i32" }], textures: ["u_src"] },
	blur: { fragment: BLUR, uniforms: [{ name: "u_dir", type: "vec2" }], textures: ["u_src"] },
	dofBlur: { fragment: DOF_BLUR, uniforms: [{ name: "u_radius", type: "vec2" }, ...FOCUS], textures: ["u_src", "u_depth"] },
	dofCombine: { fragment: DOF_COMBINE, uniforms: FOCUS, textures: ["u_src", "u_blurred", "u_depth"] },
	composite: {
		fragment: COMPOSITE,
		uniforms: [
			{ name: "u_bloom", type: "f32" }, { name: "u_exposure", type: "f32" }, { name: "u_tone", type: "i32" }, { name: "u_contrast", type: "f32" },
			{ name: "u_saturation", type: "f32" }, { name: "u_temperature", type: "f32" }, { name: "u_vignette", type: "f32" }, { name: "u_vignetteSoftness", type: "f32" },
			{ name: "u_resolution", type: "vec2" }, { name: "u_offset", type: "vec2" }, { name: "u_rotation", type: "f32" }, { name: "u_zoom", type: "f32" },
			{ name: "u_blur", type: "f32" }, { name: "u_ghost", type: "f32" }, { name: "u_ghostShift", type: "vec2" }, { name: "u_ghostColor", type: "vec3" }
		],
		textures: ["u_scene", "u_bloom0", "u_bloom1"]
	}
} satisfies Record<string, { fragment: string; uniforms: IgeGpuUniform[]; textures: string[] }>;

type PassName = keyof typeof PASSES;

interface Pass {
	pipeline: IgeGpuRenderPipeline;
	block: Float32Array;
}

/** Sampled linear, clamped (the targets); nearest (the depth). */
const LINEAR = { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" } as const;
const NEAREST = { minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" } as const;

export class IgeWebGlPostProcess {
	settings: IgePostProcessSettings;

	protected _device: IgeWebGl2GpuDevice;
	protected _w = 0;
	protected _h = 0;
	protected _samples = 0;
	protected _half = false;
	/** The frame drawn offscreen: its colour (multisampled, unless samples are off) and depth-stencil. */
	protected _msaaColor: IgeGpuTexture | null = null;
	protected _msaaDepth: IgeGpuTexture | null = null;
	protected _scene: IgeGpuTexture | null = null;
	/** Bloom levels: [half A, half B, quarter A, quarter B]. */
	protected _bloom: IgeGpuTexture[] = [];
	/** Depth of field (made when first used): the resolved depth, the half-size blur and the full-size result. */
	protected _dofDepth: IgeGpuTexture | null = null;
	protected _dofHalf: IgeGpuTexture | null = null;
	protected _dofOut: IgeGpuTexture | null = null;
	/** The main camera's near and far planes and projection, for turning depth into distance. */
	protected _near = 0.1;
	protected _far = 1000;
	protected _perspective = true;
	protected _passes: Record<PassName, Pass> | null = null;
	protected _active = false;
	protected _failed = false;

	constructor (device: IgeWebGl2GpuDevice, settings: Partial<IgePostProcessSettings> = {}) {
		this._device = device;
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
		if ((!this.settings.enabled && !igePictureEffectsOn(this.settings)) || this._failed || width < 1 || height < 1) return false;
		try {
			this._ensure(width, height);
		} catch (error) {
			console.warn("IgeWebGlPostProcess: turned off,", error);
			this._failed = true;
			this.dispose();
			return false;
		}
		this._active = true;
		this.bindTarget();
		return true;
	}

	/** The camera the frame was drawn with (for depth of field): its near and far planes and whether it's a perspective one. */
	depthRange (near: number, far: number, perspective: boolean = true): void {
		this._near = near;
		this._far = far;
		this._perspective = perspective;
	}

	/** The offscreen target while a frame's drawn into it, for passes on the device (null: none, the canvas). */
	target (): { color: IgeGpuTexture; depth: IgeGpuTexture } | null {
		return this._active ? { color: this._msaaColor!, depth: this._msaaDepth! } : null;
	}

	/** The offscreen target's GL framebuffer while a frame's drawn into it (null: none, the canvas), for GL code not on the device yet. */
	targetFramebuffer (): WebGLFramebuffer | null {
		return this._active ? webGl2Framebuffer(this._device, this._msaaColor!, this._msaaDepth!) : null;
	}

	/** Re-bind the offscreen target (passes such as shadow maps bind their own and then the canvas). */
	bindTarget (): void {
		if (!this._active) return;
		const gl = this._device.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFramebuffer());
	}

	/**
	 * Finish the frame: resolve, bloom and composite to the canvas, on the
	 * device. Leaves GL as the old passes did (the canvas bound, depth tested
	 * and written, units 0 to 3 empty, no program) for the caller to reset.
	 */
	end (): void {
		if (!this._active) return;
		this._active = false;
		const d = this._device;
		// (On only for the picture effects: none of the rest)
		const s = this.settings.enabled ? this.settings : { ...IGE_POST_PROCESS_DEFAULTS, ...pictureOf(this.settings), enabled: false };
		const scene = this._scene!;
		d.invalidate();

		// Resolve the frame into a texture
		d.resolveTexture(this._msaaColor!, scene);

		// Depth of field first, from the sharp frame and its depth; the composite then reads the result
		const sceneTex = s.dof > 0 ? this._depthOfField(scene) : scene;
		const bloomOn = s.bloom > 0;
		if (bloomOn) {
			const [a0, b0, a1, b1] = this._bloom;
			// Bright pass at half resolution
			this._pass("bright", a0, [scene], (b, at) => {
				b[at.u_texel] = 1 / scene.width;
				b[at.u_texel + 1] = 1 / scene.height;
				b[at.u_threshold] = s.bloomThreshold;
				b[at.u_knee] = Math.max(1e-3, s.bloomKnee);
				b[at.u_applyThreshold] = 1;
			});
			this._blur(a0, b0, s.bloomRadius);
			// Quarter resolution for a wider halo
			this._pass("bright", a1, [a0], (b, at) => {
				b[at.u_texel] = 1 / a0.width;
				b[at.u_texel + 1] = 1 / a0.height;
				b[at.u_applyThreshold] = 0;
			});
			this._blur(a1, b1, s.bloomRadius * 1.5);
		}

		// Composite to the canvas
		this._pass("composite", d.surface(), [sceneTex, bloomOn ? this._bloom[0] : scene, bloomOn ? this._bloom[2] : scene], (b, at) => {
			b[at.u_bloom] = bloomOn ? s.bloom : 0;
			b[at.u_exposure] = s.exposure;
			b[at.u_tone] = s.toneMapping === "aces" ? 1 : s.toneMapping === "reinhard" ? 2 : 0;
			b[at.u_contrast] = s.contrast;
			b[at.u_saturation] = s.saturation;
			b[at.u_temperature] = s.temperature;
			b[at.u_vignette] = s.vignette;
			b[at.u_vignetteSoftness] = s.vignetteSoftness;
			b[at.u_resolution] = this._w;
			b[at.u_resolution + 1] = this._h;
			// (Screen terms to the shader's: y up, so a clockwise turn is negative)
			b[at.u_offset] = s.offsetX;
			b[at.u_offset + 1] = -s.offsetY;
			b[at.u_rotation] = -s.rotation;
			b[at.u_zoom] = Math.max(0.01, s.zoom);
			b[at.u_blur] = Math.max(0, s.blur);
			b[at.u_ghost] = Math.max(0, Math.min(1, s.ghost));
			b[at.u_ghostShift] = s.ghostX;
			b[at.u_ghostShift + 1] = -s.ghostY;
			b[at.u_ghostColor] = s.ghostColor.r;
			b[at.u_ghostColor + 1] = s.ghostColor.g;
			b[at.u_ghostColor + 2] = s.ghostColor.b;
		});

		// GL as the old passes left it
		const gl = d.gl;
		d.release();
		for (let unit = 0; unit < 4; unit++) {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
		gl.activeTexture(gl.TEXTURE0);
		gl.useProgram(null);
		gl.enable(gl.DEPTH_TEST);
	}

	/** Free every GPU resource (the next begin() recreates what it needs). */
	dispose (): void {
		this._freeTargets();
		if (this._passes) {
			for (const p of new Set(Object.values(this._passes).map((x) => (x.pipeline as unknown as { _module: never })._module))) this._device.destroyShaderModule(p);
			this._passes = null;
		}
	}

	/** Forget GPU resources without deleting them (after the context was lost). */
	contextLost (): void {
		this._msaaColor = this._msaaDepth = null;
		this._scene = null;
		this._bloom = [];
		this._dofDepth = this._dofHalf = this._dofOut = null;
		this._passes = null;
		this._w = this._h = 0;
		this._active = false;
	}

	// ------------------------------------------------------------------

	protected _ensure (width: number, height: number): void {
		const d = this._device;
		if (!this._passes) {
			const passes = {} as Record<PassName, Pass>;
			for (const name of Object.keys(PASSES) as PassName[]) {
				const def = PASSES[name];
				const module = d.createShaderModule({ vertex: VERT, fragment: def.fragment, label: `post ${name}` });
				const pipeline = d.createRenderPipeline({
					module, vertex: { buffers: [] }, primitive: { topology: "triangle-list" },
					uniforms: def.uniforms, textures: def.textures.map((t) => ({ name: t })), label: `post ${name}`
				});
				passes[name] = { pipeline, block: new Float32Array(pipeline.uniformSize) };
			}
			this._passes = passes;
		}
		// (On for the picture effects alone, nothing's tone mapped: plain 8-bit colour, half the memory to move)
		const half = this.settings.hdr && this.settings.enabled && d.limits.floatTargets;
		const samples = Math.max(0, Math.min(this.settings.samples, d.limits.maxSamples));
		if (width === this._w && height === this._h && half === this._half && samples === this._samples && this._msaaColor) return;
		this._freeTargets();
		this._w = width;
		this._h = height;
		this._half = half;
		this._samples = samples;
		const format: IgeGpuTextureFormat = half ? "rgba16float" : "rgba8unorm";

		this._msaaColor = d.createTexture({ width, height, format, sampleCount: samples, sampler: LINEAR, label: "post frame" });
		this._msaaDepth = d.createTexture({ width, height, format: "depth24plus-stencil8", sampleCount: samples, sampler: NEAREST, label: "post frame depth" });

		this._scene = this._target(width, height);
		const hw = Math.max(1, width >> 1), hh = Math.max(1, height >> 1);
		const qw = Math.max(1, width >> 2), qh = Math.max(1, height >> 2);
		this._bloom = [this._target(hw, hh), this._target(hw, hh), this._target(qw, qh), this._target(qw, qh)];
	}

	protected _target (w: number, h: number): IgeGpuTexture {
		return this._device.createTexture({ width: w, height: h, format: this._half ? "rgba16float" : "rgba8unorm", sampler: LINEAR, label: "post target" });
	}

	/** Depth of field: resolve the depth, blur at half size by how out of focus each sample is, then blend by depth. Returns the texture to composite. */
	protected _depthOfField (scene: IgeGpuTexture): IgeGpuTexture {
		const d = this._device, s = this.settings;
		if (!this._dofDepth) {
			this._dofDepth = d.createTexture({ width: this._w, height: this._h, format: "depth24plus-stencil8", sampler: NEAREST, label: "post depth" });
			this._dofHalf = this._target(Math.max(1, this._w >> 1), Math.max(1, this._h >> 1));
			this._dofOut = this._target(this._w, this._h);
		}
		d.resolveTexture(this._msaaDepth!, this._dofDepth);
		const focus = (b: Float32Array, at: Readonly<Record<string, number>>) => {
			b[at.u_depthRange] = this._near;
			b[at.u_depthRange + 1] = this._far;
			b[at.u_perspective] = this._perspective ? 1 : 0;
			b[at.u_focus] = s.dofFocus;
			b[at.u_focusUv] = s.dofFocusX;
			b[at.u_focusUv + 1] = s.dofFocusY;
			b[at.u_range] = Math.max(0.01, s.dofRange);
		};
		const radius = 0.02 * Math.min(2, s.dof);
		this._pass("dofBlur", this._dofHalf!, [scene, this._dofDepth], (b, at) => {
			b[at.u_radius] = radius * (this._h / Math.max(1, this._w));
			b[at.u_radius + 1] = radius;
			focus(b, at);
		});
		this._pass("dofCombine", this._dofOut!, [scene, this._dofHalf!, this._dofDepth], focus);
		return this._dofOut!;
	}

	protected _freeTargets (): void {
		const d = this._device;
		for (const t of [this._dofDepth, this._dofHalf, this._dofOut, this._msaaColor, this._msaaDepth, this._scene, ...this._bloom]) {
			if (t) d.destroyTexture(t);
		}
		this._dofDepth = this._dofHalf = this._dofOut = null;
		this._msaaColor = this._msaaDepth = null;
		this._scene = null;
		this._bloom = [];
		this._w = this._h = 0;
	}

	/** One full-screen triangle into `target` (a texture, or the canvas: its whole), reading `textures` in their slots. */
	protected _pass (name: PassName, target: IgeGpuTexture | ReturnType<IgeWebGl2GpuDevice["surface"]>, textures: IgeGpuTexture[], set: (block: Float32Array, at: Readonly<Record<string, number>>) => void): void {
		const { pipeline, block } = this._passes![name];
		set(block, pipeline.uniformOffsets);
		const pass = this._device.beginRenderPass({ color: { target } });
		pass.setPipeline(pipeline);
		for (let i = 0; i < textures.length; i++) pass.setTexture(i, textures[i]);
		pass.setUniforms(block);
		pass.draw(3);
		pass.end();
	}

	/** Separable blur: a -> b horizontally, b -> a vertically. */
	protected _blur (a: IgeGpuTexture, b: IgeGpuTexture, radius: number): void {
		this._pass("blur", b, [a], (block, at) => {
			block[at.u_dir] = radius / a.width;
			block[at.u_dir + 1] = 0;
		});
		this._pass("blur", a, [b], (block, at) => {
			block[at.u_dir] = 0;
			block[at.u_dir + 1] = radius / b.height;
		});
	}
}
