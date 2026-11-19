import type { IgeGpuDevice, IgeGpuRenderPipeline } from "@/engine/gpu/IgeGpuDevice";
import type { IgePanelEffect, IgePanelFrame } from "@/engine/core/IgePanelViewport";
import { IGE_PANEL_FULLSCREEN_VERT, type IgePanelSource } from "@/engine/webgl/IgePanelTarget";
import { markSceneChanged } from "@/engine/utils/sceneChange";

/**
 * A "recorder look" for a panel (IgePanelViewport.effect): grain, scanlines, tint and desaturation, contrast and
 * crush, vignette, a chromatic fringe, blur or sharpening, barrel warp, dropouts (tearing, a rolling band, loss of
 * picture) and a shimmer mode (a warm, shifting gold look for something that isn't a recorder). Picture only: no
 * text. See guides/recorder-effect.md.
 *
 *     const look = new IgeRecorderEffect("warshipCamera");
 *     panel.effect = look;
 *     look.time(playback.time());      // noise, flicker and random dropouts are a function of this, not of the clock
 *     look.set({ dropout: 0.9 });      // a scripted glitch (a timeline can animate "effect.dropout")
 */

/** Every setting is a number, so a timeline can animate any of them (track property `effect.<name>`). */
export interface IgeRecorderSettings {
	/** Frames a second the noise changes at (it holds steady within a frame). Default 24. */
	fps: number;
	/** Changes every noise pattern without changing the look: a different seed is a different (but just as repeatable) take. */
	seed: number;
	/** Film or sensor grain, 0 none to 1 heavy. */
	grain: number;
	/** Brightness flicker from frame to frame, 0 to 1. */
	flicker: number;
	/** Scanline strength 0 to 1, and a line's period in device pixels. */
	scanlines: number;
	scanlineSize: number;
	/** Colour cast (multiplied in): r, g, b 0 to 1, and how much of it, 0 to 1. */
	tintR: number;
	tintG: number;
	tintB: number;
	tint: number;
	/** 0 colour to 1 grey. */
	desaturate: number;
	/** 1 unchanged; more is harder. */
	contrast: number;
	/** Blacks pushed to black, 0 to 0.5. */
	crush: number;
	/** 1 unchanged. */
	brightness: number;
	/** Dark corners, 0 to 1. */
	vignette: number;
	/** Colour channels pulled apart toward the edges, in device pixels. */
	fringe: number;
	/** Soft focus 0 to 1, and sharpening 0 to 2. */
	blur: number;
	sharpen: number;
	/** Barrel distortion, 0 flat to about 0.2. */
	warp: number;
	/** A scripted glitch, 0 none to 1 total loss. Set it from the scene at dramatic moments. */
	dropout: number;
	/** How often small random dropouts happen (0 never to 1 in about half of all half-seconds). Seeded from time. */
	dropoutRandom: number;
	/** 0 a recorder to 1 shimmer: warm gold, shifting slowly. */
	shimmer: number;
	/** How fast the shimmer moves (1 normal). */
	shimmerSpeed: number;
}

export type IgeRecorderSettingName = keyof IgeRecorderSettings;

/** Everything off: the panel's picture unchanged. */
export const IGE_RECORDER_DEFAULTS: Readonly<IgeRecorderSettings> = {
	fps: 24, seed: 0, grain: 0, flicker: 0, scanlines: 0, scanlineSize: 3,
	tintR: 1, tintG: 1, tintB: 1, tint: 0, desaturate: 0, contrast: 1, crush: 0, brightness: 1,
	vignette: 0, fringe: 0, blur: 0, sharpen: 0, warp: 0, dropout: 0, dropoutRandom: 0, shimmer: 0, shimmerSpeed: 1
};

/** The named looks. Add your own with `igeRecorderPreset(name, settings)` (settings are merged over the defaults). */
export const IGE_RECORDER_PRESETS: Record<string, Partial<IgeRecorderSettings>> = {
	/** A construction site's recorder: grainy, rough, greenish colour, soft and a little warped, now and then losing the picture. */
	siteRecorder: {
		grain: 0.4, flicker: 0.5, scanlines: 0.14, scanlineSize: 3, tintR: 0.82, tintG: 1, tintB: 0.74, tint: 0.55,
		desaturate: 0.4, contrast: 1.25, crush: 0.07, vignette: 0.55, fringe: 1.6, blur: 0.35, warp: 0.05, dropoutRandom: 0.3
	},
	/** A warship's pod bay camera: sharp, blue-grey, with clear scanlines and little noise. */
	warshipCamera: {
		grain: 0.07, flicker: 0.08, scanlines: 0.35, scanlineSize: 2, tintR: 0.68, tintG: 0.84, tintB: 1, tint: 0.65,
		desaturate: 0.5, contrast: 1.15, crush: 0.03, vignette: 0.3, fringe: 0.6, sharpen: 0.7, warp: 0.025, dropoutRandom: 0.06
	},
	/** A precursor machine's memory: shimmering gold, no scanlines and no grain. */
	precursorMemory: {
		shimmer: 1, flicker: 0.12, tintR: 1, tintG: 0.84, tintB: 0.45, tint: 0.5, contrast: 1.05, vignette: 0.5, blur: 0.3, brightness: 1.05
	}
};

/** Define (or replace) a named preset: `igeRecorderPreset("derelict", { grain: 0.6, tintB: 0.5, tint: 0.7 })`, then `new IgeRecorderEffect("derelict")`. */
export function igeRecorderPreset (name: string, settings: Partial<IgeRecorderSettings>): void {
	IGE_RECORDER_PRESETS[name] = { ...settings };
}

// ----- noise: pure functions of time

/** An integer hash to [0, 1): the same input always gives the same value. */
export function igeRecorderHash (n: number): number {
	let h = (Math.floor(n) | 0) ^ 0x9e3779b9;
	h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
}

/** The noise frame time falls in: time quantised to `fps` (so noise holds still within a frame). */
export function igeRecorderFrame (time: number, fps: number): number {
	return Math.floor(Math.max(time, 0) * Math.max(fps, 1) + 1e-6);
}

/** The slot length (seconds) random dropouts are scheduled in. */
const DROPOUT_SLOT = 0.5;

/** What the shader is told for a moment: all of it a pure function of the settings and the time. */
export interface IgeRecorderFrameState {
	/** The noise frame (time * fps, rounded down); the shader hashes pixels with it. */
	frame: number;
	/** Per-frame brightness multiplier (flicker). */
	flicker: number;
	/** 0 to 1: how badly the picture is glitching (the larger of the scripted dropout and the random one). */
	glitch: number;
	/** Vertical roll in picture heights (a rolling picture, in a bad glitch). */
	roll: number;
	/** Where the rolling band is, 0 to 1 up the picture. */
	band: number;
	/** The shimmer's clock in seconds (continuous: it's a smooth function of time, not quantised). */
	shimmerTime: number;
}

/** The small random dropout at a moment (0 none): in each half-second slot, with some probability, one short glitch. */
export function igeRecorderRandomDropout (time: number, chance: number, seed: number): number {
	if (chance <= 0) return 0;
	const t = Math.max(time, 0);
	const slot = Math.floor(t / DROPOUT_SLOT);
	const base = slot * 7 + seed * 1013;
	if (igeRecorderHash(base) >= chance * 0.5) return 0;
	const start = igeRecorderHash(base + 1) * 0.33;
	const length = 0.04 + igeRecorderHash(base + 2) * 0.12;
	const at = t - slot * DROPOUT_SLOT;
	if (at < start || at >= start + length) return 0;
	return 0.2 + igeRecorderHash(base + 3) * 0.35;
}

/** The effect's per-frame values at `time` (seconds): same settings and time, same result, however the time was reached. */
export function igeRecorderState (settings: IgeRecorderSettings, time: number): IgeRecorderFrameState {
	const frame = igeRecorderFrame(time, settings.fps);
	const s = settings.seed * 131;
	const glitch = Math.min(1, Math.max(Math.max(settings.dropout, 0), igeRecorderRandomDropout(time, settings.dropoutRandom, settings.seed)));
	return {
		frame,
		flicker: 1 + (igeRecorderHash(frame * 5 + s) - 0.5) * 0.2 * settings.flicker,
		glitch,
		roll: glitch > 0.6 ? (glitch - 0.6) * (0.4 + igeRecorderHash(frame * 3 + 1 + s)) * 0.5 : 0,
		band: igeRecorderHash(frame * 11 + 2 + s),
		shimmerTime: time * settings.shimmerSpeed
	};
}

// ----- the shader

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_src;
uniform vec4 u_a;   // width, height, frame, shimmer time
uniform vec4 u_b;   // grain, flicker multiplier, scanlines, scanline size
uniform vec4 u_c;   // tint rgb, tint amount
uniform vec4 u_d;   // desaturate, contrast, crush, brightness
uniform vec4 u_e;   // vignette, fringe, blur, sharpen
uniform vec4 u_f;   // warp, glitch, roll, shimmer
uniform vec4 u_g;   // seed, band, 0, 0

float hash(vec2 p, float f) {
	vec3 q = fract(vec3(p, f) * vec3(0.1031, 0.1030, 0.0973));
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

vec3 tex(vec2 uv) { return texture(u_src, uv).rgb; }

void main() {
	vec2 res = u_a.xy;
	float frame = u_a.z + u_g.x * 977.0;
	float st = u_a.w;
	float glitch = u_f.y;
	float shim = u_f.w;
	vec2 uv = v_uv;
	vec2 c = uv * 2.0 - 1.0;

	// Barrel warp: the picture is bulged inside its rectangle, the corners fall away to black
	float bulge = 1.0 + u_f.x * dot(c, c);
	c *= bulge;
	uv = c * 0.5 + 0.5;

	// Shimmer: a slow ripple
	uv += shim * 0.004 * vec2(sin(uv.y * 18.0 + st * 1.7), sin(uv.x * 14.0 + st * 1.3));

	// Dropout: torn rows, a rolling picture, a band
	if (glitch > 0.0) {
		float row = floor(uv.y * 36.0);
		float rh = hash(vec2(row, 1.0), frame);
		if (rh < glitch * 0.85) uv.x += (hash(vec2(row, 2.0), frame) - 0.5) * glitch * 0.35;
		float fine = floor(uv.y * res.y * 0.5);
		if (hash(vec2(fine, 3.0), frame) < glitch * 0.12) uv.x += (hash(vec2(fine, 4.0), frame) - 0.5) * 0.12;
		uv.y = fract(uv.y + u_f.z);
		// Blocky freeze: the picture holds in coarse blocks
		if (glitch > 0.5) {
			vec2 b = vec2(48.0, 27.0) * (1.4 - glitch);
			uv = (floor(uv * b) + 0.5) / b;
		}
	}

	bool outside = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
	vec2 px = 1.0 / res;
	vec2 d = normalize(c + 1e-5) * px * u_e.y * (0.4 + length(c));
	vec3 col = vec3(tex(uv + d).r, tex(uv).g, tex(uv - d).b);

	// Soft focus and sharpening
	if (u_e.z > 0.0 || u_e.w > 0.0 || shim > 0.0) {
		float rad = 1.0 + u_e.z * 2.5 + shim * 2.0;
		vec3 n = 0.25 * (tex(uv + vec2(px.x, 0.0) * rad) + tex(uv - vec2(px.x, 0.0) * rad) + tex(uv + vec2(0.0, px.y) * rad) + tex(uv - vec2(0.0, px.y) * rad));
		col = mix(col, n, clamp(u_e.z, 0.0, 1.0));
		col += (col - n) * u_e.w;
		col += n * 0.25 * shim;
	}

	float l = dot(col, vec3(0.299, 0.587, 0.114));
	col = mix(col, vec3(l), clamp(u_d.x, 0.0, 1.0));

	// Shimmer: the picture's light remapped onto a drifting gold
	if (shim > 0.0) {
		float wave = 0.5 + 0.5 * sin(st * 0.9 + uv.x * 5.0 + uv.y * 3.0);
		vec3 deep = vec3(0.30, 0.16, 0.04);
		vec3 gold = mix(vec3(1.0, 0.78, 0.30), vec3(1.0, 0.92, 0.62), wave);
		vec3 g = mix(deep, gold, smoothstep(0.0, 0.9, l)) * (0.9 + 0.2 * sin(st * 2.1 + l * 6.0));
		col = mix(col, g, shim * 0.9);
	}

	col = mix(col, col * u_c.rgb, u_c.a);
	col = (col - 0.5) * u_d.y + 0.5;
	col = max((col - u_d.z) / (1.0 - u_d.z), 0.0);
	col *= u_d.w * u_b.y;
	col *= 1.0 - u_e.x * smoothstep(0.35, 1.25, length(v_uv * 2.0 - 1.0));

	// Scanlines
	if (u_b.z > 0.0) col *= 1.0 - u_b.z * (0.5 - 0.5 * cos(6.2831853 * v_uv.y * res.y / max(u_b.w, 1.0)));

	// Grain: per pixel, new every noise frame
	if (u_b.x > 0.0) col += (hash(floor(v_uv * res), frame) - 0.5) * u_b.x * 0.45;

	// Glitch: a bright rolling band, and a loss of picture into static
	if (glitch > 0.2) {
		float by = fract(v_uv.y - u_g.y);
		col += smoothstep(0.06, 0.0, by) * 0.35 * glitch;
	}
	if (glitch > 0.8) {
		float k = smoothstep(0.8, 1.0, glitch);
		col = mix(col, vec3(hash(floor(v_uv * res * 0.5), frame + 5.0)) * 0.7, k);
	}

	if (outside) col = vec3(0.0);
	o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/** A panel effect for a recorder look. Set the settings, and `time()` to the playback's time. */
export class IgeRecorderEffect implements IgePanelEffect {
	classId = "IgeRecorderEffect";
	depth = false;
	readonly settings: IgeRecorderSettings = { ...IGE_RECORDER_DEFAULTS };
	protected _time = 0;
	protected _pipeline?: IgeGpuRenderPipeline;
	protected _block?: Float32Array;

	/** A preset by name (see IGE_RECORDER_PRESETS), or settings merged over the defaults; none for a plain copy. */
	constructor (preset?: string | Partial<IgeRecorderSettings>) {
		if (preset !== undefined) this.preset(preset);
	}

	/** Reset to the defaults and apply a preset by name, or the given settings. */
	preset (preset: string | Partial<IgeRecorderSettings>): this {
		const settings = typeof preset === "string" ? IGE_RECORDER_PRESETS[preset] : preset;
		if (!settings) throw new Error(`No recorder preset called "${String(preset)}"`);
		Object.assign(this.settings, IGE_RECORDER_DEFAULTS, settings);
		markSceneChanged();
		return this;
	}

	/** Change some settings. Unknown names are ignored (and reported as false by `has()`). */
	set (settings: Partial<IgeRecorderSettings>): this {
		for (const [name, value] of Object.entries(settings)) {
			if (this.has(name) && typeof value === "number" && Number.isFinite(value)) (this.settings as any)[name] = value;
		}
		markSceneChanged();
		return this;
	}

	/** One setting. */
	get (name: IgeRecorderSettingName): number {
		return this.settings[name];
	}

	has (name: string): name is IgeRecorderSettingName {
		return Object.prototype.hasOwnProperty.call(IGE_RECORDER_DEFAULTS, name);
	}

	/** The time (seconds) noise, flicker, random dropouts and the shimmer are worked out from. Set it to the timeline's time. */
	time (): number;
	time (seconds: number): this;
	time (seconds?: number): number | this {
		if (seconds === undefined) return this._time;
		if (seconds !== this._time) {
			this._time = seconds;
			markSceneChanged();
		}
		return this;
	}

	/** What the shader is given now. */
	state (): IgeRecorderFrameState {
		return igeRecorderState(this.settings, this._time);
	}

	apply (device: IgeGpuDevice, frame: IgePanelFrame, source: IgePanelSource): void {
		if (!this._pipeline) {
			this._pipeline = device.createRenderPipeline({
				module: device.createShaderModule({ vertex: IGE_PANEL_FULLSCREEN_VERT, fragment: FRAG, label: "recorder effect" }),
				vertex: { buffers: [] },
				primitive: { topology: "triangle-list" },
				uniforms: ["u_a", "u_b", "u_c", "u_d", "u_e", "u_f", "u_g"].map((name) => ({ name, type: "vec4" as const })),
				textures: [{ name: "u_src" }],
				label: "recorder effect"
			});
			this._block = new Float32Array(this._pipeline.uniformSize);
		}
		const s = this.settings;
		const st = this.state();
		const at = this._pipeline.uniformOffsets;
		const b = this._block!;
		const put = (name: string, x: number, y: number, z: number, w: number) => {
			const i = at[name];
			b[i] = x; b[i + 1] = y; b[i + 2] = z; b[i + 3] = w;
		};
		put("u_a", source.width, source.height, st.frame % 100000, st.shimmerTime);
		put("u_b", s.grain, st.flicker, s.scanlines, s.scanlineSize);
		put("u_c", s.tintR, s.tintG, s.tintB, s.tint);
		put("u_d", s.desaturate, s.contrast, Math.min(s.crush, 0.9), s.brightness);
		put("u_e", s.vignette, s.fringe, s.blur, s.sharpen);
		put("u_f", s.warp, st.glitch, st.roll, s.shimmer);
		put("u_g", s.seed % 64, st.band, 0, 0);

		const pass = device.beginRenderPass({ color: { target: device.surface() } });
		pass.setViewport(frame.x, frame.y, frame.width, frame.height);
		pass.setScissorRect([frame.x, frame.y, frame.width, frame.height]);
		pass.setPipeline(this._pipeline);
		pass.setUniforms(b);
		pass.setTexture(0, source.color);
		pass.draw(3);
		pass.end();
	}
}
