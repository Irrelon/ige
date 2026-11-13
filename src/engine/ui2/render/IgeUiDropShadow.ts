/**
 * `filter: drop-shadow()` for the engine's UI, drawn as a browser draws it:
 * the element and everything in it rendered alone into a texture (its
 * silhouette: boxes, text, images and SVG shapes alike), that blurred by a
 * Gaussian of half the blur radius, tinted with the shadow's colour, and
 * drawn under it, moved by the shadow's offset. Several drop-shadows are
 * each drawn from the element's silhouette (the last listed lowest).
 *
 * The painter marks an element's run of items with a group (open, then
 * closed: IgeUiPaintGroup); IgeUiGlRenderer gives each shadow a composite
 * instance before the run and asks this to make its texture as it's drawn.
 */
import { type IgeCssColor, type IgeCssLengthContext, parseShadows } from "@/engine/ui2/css/IgeCssValues";
import type { IgeGpuDevice, IgeGpuRenderPipeline, IgeGpuRenderTarget } from "@/engine/gpu/IgeGpuDevice";
import { blurDraw, type IgeUiFilterHost, type IgeUiTex, QUAD_LAYOUT } from "@/engine/ui2/render/IgeUiFilters";

export interface IgeUiDropShadow {
	x: number;
	y: number;
	blur: number;
	color: IgeCssColor;
}

/** A filter's drop-shadow()s (none: an empty list; other filter functions are left out). */
export function parseDropShadows (filter: string, ctx: IgeCssLengthContext, current: IgeCssColor): IgeUiDropShadow[] {
	const out: IgeUiDropShadow[] = [];
	if (!filter || filter === "none" || !filter.includes("drop-shadow(")) return out;
	for (let at = filter.indexOf("drop-shadow("); at >= 0; at = filter.indexOf("drop-shadow(", at + 1)) {
		let depth = 0, end = -1;
		for (let i = at + 11; i < filter.length; i++) {
			if (filter[i] === "(") depth++;
			else if (filter[i] === ")" && --depth === 0) {
				end = i;
				break;
			}
		}
		if (end < 0) break;
		const inner = filter.slice(at + 12, end).trim();
		// (Its colour, or the text's when it gives none)
		const sh = parseShadows(inner, ctx, current)[0];
		if (sh && sh.color.a > 0) out.push({ x: sh.x, y: sh.y, blur: Math.max(0, sh.blur), color: sh.color });
	}
	return out;
}

/** A drop-shadow filter's part of one frame (IgeUiGlRenderer.draw). */
export interface IgeUiShadowGroup {
	shadows: IgeUiDropShadow[];
	/** The frame's batches and instances it's of: [from, to), [start, end). */
	from: number;
	to: number;
	start: number;
	end: number;
	/** The clip it's drawn in (screen px). */
	clip: number[];
	/** Its silhouette's rectangle on the target (device px, top-down), with room for the widest blur; none: nothing in it. */
	region?: { x: number; y: number; w: number; h: number };
	/** One shadow, nothing in it needing a target of its own: where its silhouette and shadow are in the frame's shadow atlas (texels). */
	atlas?: [number, number];
	/** Its silhouette's been rendered this frame. */
	drawn?: boolean;
	/** Each shadow's composite instance (its offset in the frame's instance data) and which shadow it is. */
	composites: { o: number; index: number }[];
}

/** How much smaller a shadow's blurred at (the wider the blur, the coarser it can be: 1, 2, 4 or 8). */
export function shadowStep (sigma: number): number {
	return sigma >= 16 ? 8 : sigma >= 8 ? 4 : sigma >= 3 ? 2 : 1;
}

type Tex = IgeUiTex;

/** A frame the renderer draws into (its target, size, the UI's corner on it, where its viewport starts). */
export interface IgeUiShadowFrame {
	target: IgeGpuRenderTarget;
	width: number;
	height: number;
	offset: [number, number];
	view?: [number, number];
}

/** What the drop shadows need of the renderer: its device, quad and blur, its texture maker and its own frames. */
export interface IgeUiShadowHost extends IgeUiFilterHost {
	/** Its own pass begun into `f` (cleared first if asked), the UI's program set up to draw there. */
	_bind (f: IgeUiShadowFrame, clear?: boolean): void;
}

/** The union pass: a texture's alpha (moved, faded) as black of that alpha (what the next shadow in a chain is cast from). */
const UNION_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
out vec2 v_uv;
void main() {
	v_uv = a_corner;
	gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const UNION_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
/** The part of the texture the region fills, how far the copy's moved (0 to 1 of the region), and its alpha. */
uniform vec2 u_part;
uniform vec2 u_off;
uniform float u_alpha;
out vec4 outColor;
void main() {
	vec2 uv = v_uv - u_off;
	float a = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 0.0 : texture(u_src, uv * u_part).a;
	outColor = vec4(0.0, 0.0, 0.0, a * u_alpha);
}`;

type AtlasTex = Tex;

/**
 * The textures and framebuffer the drop shadows are made in (one set, used one group at a time): the silhouette, each
 * shadow's blurred copy, and for a chain (drop-shadow() drop-shadow()) what each next one's cast from: the element
 * over the shadows before it, as CSS applies a filter list.
 */
export class IgeUiDropShadowPass {
	silhouette: Tex | null = null;
	tmp: Tex | null = null;
	outs: (Tex | null)[] = [];
	unions: [Tex | null, Tex | null] = [null, null];
	_device: IgeGpuDevice | null = null;
	union: IgeGpuRenderPipeline | null = null;

	/**
	 * The frame's shadow atlas (one-shadow groups, the commonest: a symbol's soft shadow, a glow round a card): every
	 * silhouette drawn into it, then blurred where it is, so all of them take three changes of target a frame instead
	 * of three each (a tiled GPU stores and loads the whole target at each).
	 */
	atlasSil: AtlasTex | null = null;
	atlasTmp: AtlasTex | null = null;
	atlasOut: AtlasTex | null = null;
	/**
	 * The atlas's bands (rows bottom up, its used width): each holds the groups whose blurs are alike (σ, device px), so
	 * each band is blurred in one draw a pass, not one a group.
	 */
	bands: { sigma: number; y0: number; y1: number; w: number }[] = [];

	/** Forgotten (a lost context): made again as they're next needed. */
	reset (): void {
		this.silhouette = this.tmp = null;
		this.outs = [];
		this.unions = [null, null];
		this.union = null;
		this._device = null;
		this.atlasSil = this.atlasTmp = this.atlasOut = null;
		this.bands = [];
	}

	/**
	 * Places the given groups in the atlas (past what one texture should hold, left out: drawn the long way) and sizes
	 * its textures. Returns the atlas's size. Groups whose blurs are alike share a band of rows,
	 * blurred whole in one draw a pass: each region far enough from the next (its blur's room round what's in it, and
	 * a gap of two texels and two of the blur's coarse reads) that none takes in its neighbour's silhouette.
	 */
	packAtlas (host: IgeUiShadowHost, groups: IgeUiShadowGroup[], scale: number): [number, number] {
		const sigmaOf = (g: IgeUiShadowGroup) => (g.shadows[0].blur / 2) * scale;
		const gapOf = (sigma: number) => 2 + 2 * shadowStep(sigma);
		const sorted = [...groups].sort((a, b) => sigmaOf(a) - sigmaOf(b));
		const W = Math.max(1024, ...groups.map((g) => g.region!.w + gapOf(sigmaOf(g))));
		this.bands = [];
		let x = 0, y = 0, row = 0;
		let band: { sigma: number; y0: number; y1: number; w: number } | undefined;
		for (const g of sorted) {
			const r = g.region!, sigma = sigmaOf(g), gap = gapOf(sigma);
			// (A new band for another blur, from a new row; a new row when this one's full)
			if (!band || band.sigma !== sigma) {
				if (band) {
					y += row;
					band.y1 = y;
				}
				x = 0;
				row = 0;
				band = { sigma, y0: y, y1: y, w: 0 };
				this.bands.push(band);
			} else if (x + r.w + gap > W) {
				x = 0;
				y += row;
				row = 0;
			}
			if (y + r.h + gap > 4096) break;
			g.atlas = [x, y];
			x += r.w + gap;
			row = Math.max(row, r.h + gap);
			band.w = Math.max(band.w, x);
		}
		if (band) band.y1 = y + row;
		this.bands = this.bands.filter((b) => b.y1 > b.y0 && b.w > 0);
		const H = Math.max(1, y + row);
		const make = (have: AtlasTex | null, mips: boolean): AtlasTex => host._tex(have, W, H, mips);
		// (The silhouettes and the middle step read coarsely by wide blurs; the shadows only 1:1)
		this.atlasSil = make(this.atlasSil, true);
		this.atlasTmp = make(this.atlasTmp, true);
		this.atlasOut = make(this.atlasOut, false);
		return [this.atlasOut.w, this.atlasOut.h];
	}

	/**
	 * Blurs the placed groups' silhouettes in the atlas into their shadows (σ half the blur radius, device px): across
	 * into the middle texture, then down into the shadows', a band of alike blurs at a time (packAtlas). The caller
	 * binds its own target and program after.
	 */
	blurAtlas (host: IgeUiShadowHost): void {
		const sil = this.atlasSil!, tmp = this.atlasTmp!, out = this.atlasOut!;
		const pass = (from: AtlasTex, to: AtlasTex, dir: [number, number]) => {
			// (Its smaller levels, for wide blurs' coarse reads; made every time, as a texture made for them and missing any reads black)
			host.device.generateMipmaps(from.tex);
			// (Cleared whole: the next pass's coarse reads would take in what's left between the places)
			const p = host._beginPass(to.tex, true);
			for (const band of this.bands) {
				const { sigma, y0, y1, w } = band;
				const k = shadowStep(sigma);
				p.setViewport(0, y0, w, y1 - y0);
				blurDraw(host, p, from, [0, y0 / from.h, w / from.w, (y1 - y0) / from.h], [(dir[0] * k) / from.w, (dir[1] * k) / from.h], Math.max(sigma, 0.001) / k, Math.log2(k));
			}
		};
		pass(sil, tmp, [1, 0]);
		pass(tmp, out, [0, 1]);
	}

	/** The textures grown for a group's region and its shadows' blurs; each shadow's blurred size (before the frame's instances go up: their uv depend on it). */
	size (host: IgeUiShadowHost, g: IgeUiShadowGroup, scale: number): [number, number][] {
		const r = g.region!;
		this.silhouette = host._tex(this.silhouette, r.w, r.h, true);
		if (g.shadows.length > 1) for (const k of [0, 1] as const) this.unions[k] = host._tex(this.unions[k], r.w, r.h, true);
		return g.shadows.map((sh, k) => {
			const step = shadowStep((sh.blur / 2) * scale);
			const hw = Math.max(1, Math.ceil(r.w / step)), hh = Math.max(1, Math.ceil(r.h / step));
			this.tmp = host._tex(this.tmp, hw, hh);
			this.outs[k] = host._tex(this.outs[k] ?? null, hw, hh);
			return [hw, hh];
		});
	}

	/**
	 * Renders a group's silhouette: its batches drawn alone into the silhouette texture, its region's corner at 0,0.
	 * `drawBatch` draws one of the frame's batches with the program as it's set up. Leaves `frame` drawn into again
	 * (`base`: the UI's corner on the screen's target, when the frame is a filter's layer and its own offset differs).
	 */
	renderSilhouette (host: IgeUiShadowHost, g: IgeUiShadowGroup, drawBatch: (i: number) => void, frame: IgeUiShadowFrame & { base?: [number, number] }): void {
		const r = g.region!;
		// (The region's on the UI's target: from the UI's corner there, `base`, when what's drawing is a filter's layer)
		const base = frame.base ?? frame.offset;
		host._bind({ target: this.silhouette!.tex, width: r.w, height: r.h, offset: [base[0] - r.x, base[1] - r.y] }, true);
		for (let i = g.from; i < g.to; i++) drawBatch(i);
		host._bind(frame);
		g.drawn = true;
	}

	/**
	 * A group's shadows made, in the order the filter lists them: each blurred from what's there so far (the
	 * silhouette, then the silhouette over the shadows before it), into `outs`. Leaves `frame` drawn into again.
	 */
	chain (host: IgeUiShadowHost, g: IgeUiShadowGroup, scale: number, frame: IgeUiShadowFrame): void {
		const r = g.region!;
		let base = this.silhouette!;
		g.shadows.forEach((sh, k) => {
			this._blur(host, base, r, (sh.blur / 2) * scale, this.outs[k]!);
			if (k === g.shadows.length - 1) return;
			// What the next one's cast from: this shadow (moved, faded to its colour's alpha) under what was there
			const dst = this.unions[k % 2]!;
			const step = shadowStep((sh.blur / 2) * scale);
			const hw = Math.max(1, Math.ceil(r.w / step)), hh = Math.max(1, Math.ceil(r.h / step));
			this._unionInto(host, dst, r, [
				{ src: this.outs[k]!, part: [hw / this.outs[k]!.w, hh / this.outs[k]!.h], off: [(sh.x * scale) / r.w, -(sh.y * scale) / r.h], alpha: sh.color.a },
				{ src: base, part: [r.w / base.w, r.h / base.h], off: [0, 0], alpha: 1 }
			]);
			base = dst;
		});
		host._bind(frame);
	}

	/** One shadow's blur (σ device px) of `src`'s region into `out` (k times smaller for a wide blur). */
	_blur (host: IgeUiShadowHost, src: Tex, r: { w: number; h: number }, sigma: number, out: Tex): void {
		const k = shadowStep(sigma);
		const hw = Math.max(1, Math.ceil(r.w / k)), hh = Math.max(1, Math.ceil(r.h / k));
		const tmp = this.tmp!;
		// (Its smaller levels made every time, even unread: a texture made for them and missing any reads as opaque black)
		host.device.generateMipmaps(src.tex);
		const pass = (from: Tex, to: Tex, area: [number, number], dir: [number, number], step: number, s: number, lod: number) => {
			const p = host._beginPass(to.tex);
			p.setViewport(0, 0, hw, hh);
			blurDraw(host, p, from, [0, 0, area[0] / from.w, area[1] / from.h], [(dir[0] * step) / from.w, (dir[1] * step) / from.h], s, lod);
		};
		// (No blur: a copy, the passes' kernel a single tap)
		const s = Math.max(sigma, 0.001) / k;
		pass(src, tmp, [r.w, r.h], [1, 0], k, s, Math.log2(k));
		pass(tmp, out, [hw, hh], [0, 1], 1, s, 0);
	}

	/** Copies (each moved and faded, alpha only) drawn over each other into `dst`'s region, the first lowest. */
	_unionInto (host: IgeUiShadowHost, dst: Tex, r: { w: number; h: number }, layers: { src: Tex; part: [number, number]; off: [number, number]; alpha: number }[]): void {
		const device = host.device;
		if (!this.union || this._device !== device) {
			this._device = device;
			this.union = device.createRenderPipeline({
				module: device.createShaderModule({ vertex: UNION_VS, fragment: UNION_FS, label: "ui2 drop shadow union" }),
				vertex: { buffers: [QUAD_LAYOUT] },
				primitive: { topology: "triangle-strip" },
				blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } },
				uniforms: [{ name: "u_part", type: "vec2" }, { name: "u_off", type: "vec2" }, { name: "u_alpha", type: "f32" }],
				textures: [{ name: "u_src" }],
				label: "ui2 drop shadow union"
			});
		}
		const p = host._beginPass(dst.tex, true);
		p.setViewport(0, 0, r.w, r.h);
		p.setPipeline(this.union);
		p.setVertexBuffer(0, host._quad);
		for (const l of layers) {
			p.setTexture(0, l.src.tex);
			p.setUniforms([l.part[0], l.part[1], l.off[0], l.off[1], l.alpha]);
			p.draw(4);
		}
	}
}
