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
import { type IgeCssColor, type IgeCssGradient, type IgeCssMatrix, multiply } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { IgeUiDropShadowPass, type IgeUiShadowGroup } from "@/engine/ui2/render/IgeUiDropShadow";
import { IgeUiFilterPass, type IgeUiFilterLayer, layerRegion } from "@/engine/ui2/render/IgeUiFilters";
import { glowKey, glowRegion, type IgeUiTextGlow, IgeUiTextGlowCache } from "@/engine/ui2/render/IgeUiTextGlow";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiStencilClip, type IgeUiStencilStep, stencilTriangles } from "@/engine/ui2/render/IgeUiStencilClip";
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
layout(location=12) in vec4 a_persp;
layout(location=13) in vec4 a_radiiY;
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
flat out vec4 v_persp;
flat out vec4 v_radiiY;
void main() {
	vec2 p = a_rect.xy + a_corner * a_rect.zw;
	v_local = p;
	vec2 t = vec2(a_m0.x * p.x + a_m0.z * p.y + a_m1.x, a_m0.y * p.x + a_m0.w * p.y + a_m1.y);
	// (A plane seen in perspective: its point divided by w, and w handed to the GPU so what's across it is
	// interpolated perspective-correctly; 1 for everything flat)
	float w = a_persp.x * p.x + a_persp.y * p.y + a_persp.z;
	t /= w;
	v_screen = t;
	v_tex = mix(a_uv.xy, a_uv.zw, a_corner);
	v_shape = a_shape; v_radii = a_radii; v_color = a_color; v_params = a_params; v_uv = a_uv; v_chamfer = a_chamfer; v_clip = a_clip; v_m1 = a_m1; v_grad = a_grad; v_persp = a_persp; v_radiiY = a_radiiY;
	vec2 d = t * u_scale + u_offset;
	gl_Position = vec4((d.x / u_resolution.x * 2.0 - 1.0) * w, (1.0 - d.y / u_resolution.y * 2.0) * w, 0.0, w);
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
flat in vec4 v_persp;
flat in vec4 v_radiiY;
uniform float u_scale;
uniform vec2 u_resolution;
uniform vec2 u_offset;
/** Where the viewport starts on its target (a fade's place in the fades' atlas): 0 elsewhere. */
uniform vec2 u_view;
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

// A box with elliptical corners (horizontal radii rx, vertical ry: tl, tr, br, bl), y down: the distance to the corner's
// ellipse to first order (exact on it, and for a circle)
float sdEllipseBox(vec2 q, vec2 b, vec4 rx, vec4 ry) {
	vec2 r = q.x > 0.0 ? (q.y > 0.0 ? vec2(rx.z, ry.z) : vec2(rx.y, ry.y)) : (q.y > 0.0 ? vec2(rx.w, ry.w) : vec2(rx.x, ry.x));
	vec2 e = abs(q) - b;
	vec2 k = e + r;
	if (r.x > 0.0 && r.y > 0.0 && k.x > 0.0 && k.y > 0.0) {
		float l = length(k / r);
		return (l - 1.0) * l / max(length(k / (r * r)), 1e-9);
	}
	return min(max(e.x, e.y), 0.0) + length(max(e, 0.0));
}

// A box (x, y, w, h) at point p: rounded corners (tl, tr, br, bl; vertical radii ry, elliptical where they differ)
// and cut corners (the same order)
float shape(vec2 p, vec4 box, vec4 radii, vec4 ry, vec4 cut) {
	vec2 c = box.xy + box.zw * 0.5;
	vec2 b = box.zw * 0.5;
	vec2 q = p - c;
	float d = radii == ry ? sdRoundBox(q, b, vec4(radii.z, radii.y, radii.w, radii.x)) : sdEllipseBox(q, b, radii, ry);
	const float k = 0.70710678;
	if (cut.x > 0.0) d = max(d, (cut.x - ((q.x + b.x) + (q.y + b.y))) * k);
	if (cut.y > 0.0) d = max(d, (cut.y - ((b.x - q.x) + (q.y + b.y))) * k);
	if (cut.z > 0.0) d = max(d, (cut.z - ((b.x - q.x) + (b.y - q.y))) * k);
	if (cut.w > 0.0) d = max(d, (cut.w - ((q.x + b.x) + (b.y - q.y))) * k);
	return d;
}

// How much of a triangle's edge (a to b, the inside on its s side) covers p: smoothed over a pixel for an outline
// edge; for a shared one, all or nothing (neighbours meet with no seam)
float edgeCover(vec2 p, vec2 a, vec2 b, float s, bool outline, float px) {
	vec2 e = (b - a) * s;
	float d = (e.x * (p.y - a.y) - e.y * (p.x - a.x)) / max(length(e), 1e-6);
	if (outline) return clamp(d / px + 0.5, 0.0, 1.0);
	// (Reaching a hair past the shared line: rounding, and corners where several meet, can leave a pixel outside them all)
	return d > -0.02 * px ? 1.0 : 0.0;
}

// A rounded box blurred by a Gaussian (Evan Wallace's fast rounded-rectangle shadows): exact for square corners,
// the corners' curve integrated in four steps
vec2 erf2(vec2 x) {
	vec2 s = sign(x), a = abs(x);
	x = 1.0 + (0.278393 + (0.230389 + 0.078108 * (a * a)) * a) * a;
	x *= x;
	return s - s / (x * x);
}
float blurredBoxX(float x, float y, float sigma, float corner, vec2 hs) {
	float delta = min(hs.y - corner - abs(y), 0.0);
	float curved = hs.x - corner + sqrt(max(0.0, corner * corner - delta * delta));
	vec2 integral = 0.5 + 0.5 * erf2((x + vec2(-curved, curved)) * (0.70710678 / sigma));
	return integral.y - integral.x;
}
float blurredBox(vec2 lower, vec2 upper, vec2 p, float sigma, float corner) {
	vec2 c = (lower + upper) * 0.5, hs = (upper - lower) * 0.5;
	p -= c;
	if (corner <= 0.0) {
		vec4 q = vec4(p + hs, hs - p) * (0.70710678 / sigma);
		vec2 ex = erf2(q.xz), ey = erf2(q.yw);
		return 0.25 * (ex.x + ex.y) * (ey.x + ey.y);
	}
	float lo = p.y - hs.y, hi = p.y + hs.y;
	float start = clamp(-3.0 * sigma, lo, hi), end = clamp(3.0 * sigma, lo, hi);
	float stp = (end - start) / 4.0;
	float y = start + stp * 0.5, v = 0.0;
	for (int i = 0; i < 4; i++) {
		v += blurredBoxX(p.x, p.y - y, sigma, corner, hs) * exp(-(y * y) / (2.0 * sigma * sigma)) / (2.5066283 * sigma) * stp;
		y += stp;
	}
	return v;
}

// A mask-image's linear gradient at p (its alpha), over the item's box
float maskAlpha(vec2 p) {
	vec2 c = v_shape.xy + v_shape.zw * 0.5;
	vec2 dir = vec2(sin(v_grad.z), -cos(v_grad.z));
	float len = abs(v_shape.z * sin(v_grad.z)) + abs(v_shape.w * cos(v_grad.z));
	float t = dot(p - c, dir) / max(len, 0.0001) + 0.5;
	return texture(u_ramp, vec2(clamp(t, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, (v_grad.x + 0.5) / 512.0)).a;
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
	// (In perspective: where it is on the screen from the fragment itself, as what's across the plane is interpolated
	// perspective-correctly; and a pixel's size on the plane from how fast its own coordinates change)
	bool proj = v_persp.w > 0.5;
	// (Worked out before any discard: derivatives need the pixels round it)
	float px = proj ? max(length(fwidth(v_local)) * 0.70710678, 1e-4) : 1.0 / u_scale;
	vec2 scr = proj ? vec2((gl_FragCoord.x - u_view.x - u_offset.x) / u_scale, (u_resolution.y - (gl_FragCoord.y - u_view.y) - u_offset.y) / u_scale) : v_screen;
	if (scr.x < v_clip.x || scr.y < v_clip.y || scr.x > v_clip.z || scr.y > v_clip.w) discard;
	float kind = v_params.x;
	float a = 0.0;
	vec4 col = vec4(v_color.rgb * v_color.a, v_color.a);
	if (kind < 0.5) {
		float d = shape(v_local, v_shape, v_radii, v_radiiY, v_chamfer);
		a = clamp(0.5 - d / px, 0.0, 1.0);
		col = fill(v_local);
	} else if (kind < 1.5) {
		// A border ring; cut corners clip it (clip-path: no border along the cut, as the page draws it)
		float bw = v_params.y;
		vec4 none = vec4(0.0);
		float outer = shape(v_local, v_shape, v_radii, v_radiiY, none);
		vec4 inner = vec4(v_shape.xy + bw, v_shape.zw - 2.0 * bw);
		float d = max(outer, -shape(v_local, inner, max(v_radii - bw, vec4(0.0)), max(v_radiiY - bw, vec4(0.0)), none));
		d = max(d, shape(v_local, v_shape, v_radii, v_radiiY, v_chamfer));
		a = clamp(0.5 - d / px, 0.0, 1.0);
	} else if (kind < 2.5) {
		// A glow: the shadow's box blurred as a browser blurs it (a Gaussian of half the blur radius), so a small box's glow
		// is as faint as it is there; cut corners keep the shape's own falloff
		float blur = max(v_params.z, px);
		if (v_chamfer == vec4(0.0)) {
			float r = max(max(v_radii.x, v_radii.y), max(v_radii.z, v_radii.w));
			a = blurredBox(v_shape.xy, v_shape.xy + v_shape.zw, v_local, blur * 0.5, min(r, 0.5 * min(v_shape.z, v_shape.w)));
		} else {
			float d = shape(v_local, v_shape, v_radii, v_radiiY, v_chamfer);
			a = 1.0 - smoothstep(-blur, blur, d);
		}
		// (Not under the box itself)
		float own = shape(v_local, v_uv, max(v_radii - v_params.w, vec4(0.0)), max(v_radiiY - v_params.w, vec4(0.0)), v_chamfer);
		a *= clamp(own / px + 0.5, 0.0, 1.0);
	} else if (kind < 3.5) {
		float blur = max(v_params.z, px);
		float outer = shape(v_local, v_shape, v_radii, v_radiiY, v_chamfer);
		vec4 inner = vec4(v_shape.xy + v_uv.xy + v_params.w, v_shape.zw - 2.0 * v_params.w);
		float d = shape(v_local, inner, max(v_radii - v_params.w, vec4(0.0)), max(v_radiiY - v_params.w, vec4(0.0)), v_chamfer);
		// (No blur: a crisp edge, smoothed over one pixel as any edge is)
		a = (v_params.z > 0.0 ? smoothstep(-blur, blur, d) : clamp(d / px + 0.5, 0.0, 1.0)) * clamp(0.5 - outer / px, 0.0, 1.0);
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
	} else if (kind > 8.5) {
		// A filter's layer, its filters run (IgeUiFilters): as it is
		col = texture(u_image, v_tex);
		a = 1.0;
	} else if (kind > 7.5) {
		// A drop shadow: its blurred silhouette's alpha in its colour (IgeUiDropShadow)
		col = vec4(v_color.rgb * v_color.a, v_color.a) * texture(u_image, v_tex).a;
		a = 1.0;
	} else if (kind > 6.5) {
		// A filled triangle (an SVG fill cut into triangles): corners v_shape.xy, v_shape.zw, v_radii.xy; v_radii.z's
		// bits say which edges are the shape's outline (smoothed) rather than shared with a neighbour (cut sharp, so
		// neighbours meet without a seam)
		vec2 p0 = v_shape.xy, p1 = v_shape.zw, p2 = v_radii.xy;
		float s = sign((p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x));
		int mask = int(v_radii.z + 0.5);
		a = min(edgeCover(v_local, p0, p1, s, (mask & 1) != 0, px), min(edgeCover(v_local, p1, p2, s, (mask & 2) != 0, px), edgeCover(v_local, p2, p0, s, (mask & 4) != 0, px)));
	} else {
		// An image (or a blurred backdrop: v_params.y set, the first pass, clears its shape for it), cut to its box's shape
		col = v_params.y > 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : texture(u_image, v_tex);
		a = clamp(0.5 - shape(v_local, v_shape, v_radii, v_radiiY, v_chamfer) / px, 0.0, 1.0);
		// (A backdrop's mask-image: its gradient's alpha)
		if (v_grad.x >= 0.0) a *= maskAlpha(v_local);
	}
	a *= v_m1.z;
	if (a <= 0.002) discard;
	outColor = col * a;
}`;

/** A clip rectangle through a transform: the box round its corners (none when one's behind the eye, in perspective). */
function clipThrough (c: readonly number[], m: IgeCssMatrix): number[] {
	const xs: number[] = [], ys: number[] = [];
	const p = m as number[];
	for (const [x, y] of [[c[0], c[1]], [c[2], c[1]], [c[0], c[3]], [c[2], c[3]]]) {
		const w = p.length > 6 ? p[6] * x + p[7] * y + p[8] : 1;
		if (w <= 1e-6) return [-1e7, -1e7, 1e7, 1e7];
		xs.push((m[0] * x + m[2] * y + m[4]) / w);
		ys.push((m[1] * x + m[3] * y + m[5]) / w);
	}
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Floats per instance: 13 vec4s. */
const STRIDE = 52;
/** Instanced attributes (a vec4 each). */
const ATTRIBS = STRIDE / 4;

interface Batch {
	start: number;
	count: number;
	image: WebGLTexture | null;
	additive: boolean;
	/** A clip of any shape opening or closing (IgeUiStencilClip): no instances, its shape marked in the stencil as it's reached. */
	stencil?: IgeUiStencilStep;
	/** Before it's drawn: what's on the target so far, this rectangle of it (device px, top-down), blurred into its image. */
	backdrop?: { x: number; y: number; w: number; h: number; sigma: number; ops?: number[][] };
	/**
	 * A backdrop's two passes: "erase" takes its shape out of what's there (so the blurred copy replaces it rather than
	 * going over it), "add" puts the blurred copy in.
	 */
	blend?: "erase" | "add";
	/** A drop shadow's composite (IgeUiDropShadow): its group's silhouette blurred, made into its image as it's drawn. */
	shadow?: { group: IgeUiShadowGroup; index: number };
	/** Drawn into this filter's layer, not the target (IgeUiFilters). */
	owner?: IgeUiFilterLayer;
	/** A filter layer's composite: the layer made, its filters run, as it's drawn. */
	layer?: IgeUiFilterLayer;
	/** Never drawn on the target: a text glow's silhouette (its glyphs), drawn only into it. */
	hidden?: boolean;
	/** A text glow's composite (IgeUiTextGlow): its blurred silhouette, from the cache or made as it's drawn. */
	glow?: IgeUiTextGlow;
}

/** Where batches are drawn: the target, or a filter's layer. */
interface Frame {
	target: WebGLFramebuffer | null;
	width: number;
	height: number;
	offset: [number, number];
	/** Where its viewport starts on the target (a fade's place in the fades' atlas); 0, 0 when not given. */
	view?: [number, number];
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
	/** url() backgrounds' textures, by the ways they repeat and their url. */
	_urlImages = new Map<string, { tex: WebGLTexture }>();
	_uniforms: Record<string, WebGLUniformLocation | null> = {};
	/** The backdrop blur's program, its copy of the target, two half-size targets and their framebuffer. */
	_blurProgram: WebGLProgram | null = null;
	_blurUniforms: Record<string, WebGLUniformLocation | null> = {};
	_grab: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurA: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurB: { tex: WebGLTexture; w: number; h: number } | null = null;
	_blurFbo: WebGLFramebuffer | null = null;
	/** Clips of any shape, by the stencil (IgeUiStencilClip). */
	_stencil = new IgeUiStencilClip();
	/** Drop shadows' textures (filter: drop-shadow(): IgeUiDropShadow). */
	_shadows = new IgeUiDropShadowPass();
	/** Filters' layers (filter: grayscale(), blur(), hue-rotate()...: IgeUiFilters). */
	_filters = new IgeUiFilterPass();
	/** Fades' atlas: every layer that's only an opacity, drawn before the screen's own pass, each in its own place. */
	_fade: { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number } | null = null;
	/** Text glows' blurred silhouettes, kept between frames (text-shadow with a blur: IgeUiTextGlow). */
	_glows = new IgeUiTextGlowCache();
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
		for (const u of ["u_resolution", "u_scale", "u_offset", "u_view", "u_atlas", "u_ramp", "u_image"]) this._uniforms[u] = gl.getUniformLocation(p, u);
		this._vao = gl.createVertexArray();
		gl.bindVertexArray(this._vao);
		this._quad = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		this._inst = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._inst);
		for (let i = 0; i < ATTRIBS; i++) {
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
		this._shadows.reset();
		this._filters.reset();
		this._glows.reset();
		this._fade = null;
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
		this._stencil.destroy();
	}

	// ---------------------------------------------------------------- gradients

	_rampRow (g: IgeCssGradient, length: number): number {
		const key = JSON.stringify([g.stops, g.repeating, g.unpremultiplied, Math.round(length)]);
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
			// Premultiplied, as browsers interpolate CSS gradients (an SVG gradient's colours mixed as they are, then premultiplied)
			const a = c0.a + (c1.a - c0.a) * f;
			const mix = (x0: number, x1: number) => (g.unpremultiplied ? (x0 + (x1 - x0) * f) * a : x0 * c0.a + (x1 * c1.a - x0 * c0.a) * f);
			const pr = mix(c0.r, c1.r), pg = mix(c0.g, c1.g), pb = mix(c0.b, c1.b);
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
		let pixels: { width: number; height: number; data: Uint8Array; version: number } | undefined;
		if (el.localName === "canvas") {
			source = (el._canvas as TexImageSource | undefined) ?? null;
			// (Pixels in memory, IgeUiPixelSurface: uploaded when they've changed; a page canvas each frame it's shown)
			pixels = (el._canvas as { pixels?: () => typeof pixels } | undefined)?.pixels?.();
			version = pixels ? pixels.version + 1 : -1;
		} else {
			const src = el.getAttribute("src") ?? "";
			// (The picture its UI's already loaded, if it has: dom/IgeUiImages)
			const images = (el.ownerDocument as unknown as { _uiRoot?: { images?: { get (src: string): unknown; request (src: string): void } } })._uiRoot?.images;
			const img = this._imageEls.get(src) ?? (images?.get(src) as HTMLImageElement | undefined);
			if (img) {
				this._imageEls.set(src, img);
				source = img as unknown as TexImageSource;
				version = 1;
			} else if (src) images?.request(src);
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
			if (pixels) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixels.width, pixels.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels.data);
			else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			entry.version = version;
		}
		return entry.tex;
	}

	/** Lets go of image textures for elements no longer shown. */
	/**
	 * A url() background's texture (IgeUiBackgroundImage): its picture from the UI's images once it's arrived (asked
	 * for until then), its edges wrapping the ways it repeats, its smaller levels for drawing it smaller.
	 */
	_urlTexture (el: IgeUiElement, src: string, repeat: [boolean, boolean], shown: Set<string>): WebGLTexture | null {
		const gl = this.gl;
		const key = `${repeat[0] ? 1 : 0}${repeat[1] ? 1 : 0}${src}`;
		const have = this._urlImages.get(key);
		if (have) {
			shown.add(key);
			return have.tex;
		}
		const images = (el.ownerDocument as unknown as { _uiRoot?: { images?: { get (src: string): unknown; request (src: string): void } } })._uiRoot?.images;
		const img = images?.get(src) as TexImageSource | undefined;
		if (!img) {
			images?.request(src);
			return null;
		}
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat[0] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat[1] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
		this._urlImages.set(key, { tex });
		shown.add(key);
		return tex;
	}

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
		const shown = new Set<IgeUiElement>(), shownUrls = new Set<string>();
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
		const write = (o: number, rect: number[], shape: number[], radii: number[], color: IgeCssColor | number[], params: number[], uv: number[], cut: number[], clip: number[], matrix: IgeCssMatrix | undefined, opacity: number, layer: number, grad: number[], radiiY?: number[]) => {
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
			// (A projective transform's third row, and that it is one: the shader divides by it)
			const pm = m as number[];
			if (pm.length > 6) d.set([pm[6], pm[7], pm[8], 1], o + 44);
			else d.set(FLAT, o + 44);
			d.set(radiiY ?? radii, o + 48);
		};
		const FLAT = [0, 0, 1, 0];
		const Z4 = [0, 0, 0, 0];
		const NOGRAD = [-1, 0, 0, 0];
		const backdrops: { o: number; bd: { w: number; h: number; sigma: number } }[] = [];
		const shadowGroups: IgeUiShadowGroup[] = [];
		const openGroups: (IgeUiShadowGroup | null)[] = [];
		const layers: IgeUiFilterLayer[] = [], openLayers: IgeUiFilterLayer[] = [], openKinds: ("layer" | "shadow")[] = [];
		for (const it of items) {
			// (The painter's clips are in the item's own pixels: through its transform to the screen's, as a box)
			const clip = it.clip ? (it.matrix ? clipThrough(it.clip, it.matrix) : it.clip) : NONE;
			const additive = !!it.additive;
			if (it.op === "group") {
				// A clip of any shape (IgeUiStencilClip): a step of its own between the batches, its shape marked in the stencil
				if (it.mask) {
					batches.push({ start: n, count: 0, image: null, additive: false, stencil: { open: it.open, tris: stencilTriangles(it.mask, it.matrix) } });
					batch = undefined;
					continue;
				}
				// A filter's layer (IgeUiFilters): what's in it drawn into it alone, its filters run, the result composited here
				// (No filters at all: only its opacity, applied to it whole)
				if (it.open) openKinds.push(it.filters && this._blurProgram ? "layer" : "shadow");
				if ((it.open ? openKinds[openKinds.length - 1] : openKinds.pop()) === "layer") {
					batch = undefined;
					if (it.open) {
						const L: IgeUiFilterLayer = { ops: it.filters!, from: batches.length, to: 0, start: n, end: 0, depth: openLayers.length, clip, o: -1, opacity: it.opacity };
						openLayers.push(L);
						layers.push(L);
					} else {
						const L = openLayers.pop()!;
						L.to = batches.length;
						L.end = n;
						for (let j = L.from; j < L.to; j++) batches[j].owner ??= L;
						const r = (L.region = layerRegion(this._data, STRIDE, L, width, height, scale, offset));
						batch = { start: n, count: 0, image: null, additive: false, layer: L };
						batches.push(batch);
						L.o = push(null, false);
						const rect = r ? [(r.x - offset[0]) / scale, (r.y - offset[1]) / scale, r.w / scale, r.h / scale] : Z4;
						write(L.o, rect, rect, Z4, [1, 1, 1, 1], [9, 0, 0, 0], [0, 1, 1, 0], Z4, L.clip, undefined, r ? L.opacity : 0, 0, NOGRAD);
						batch = undefined;
					}
					continue;
				}
				// An element with drop-shadow()s: a composite for each (drawn first, the last listed lowest), then what it's of
				if (it.open) {
					let g: IgeUiShadowGroup | null = null;
					if (it.shadows?.length && this._blurProgram) {
						g = { shadows: it.shadows, from: 0, to: 0, start: 0, end: 0, clip, composites: [] };
						for (let k = it.shadows.length - 1; k >= 0; k--) {
							batch = { start: n, count: 0, image: null, additive: false, shadow: { group: g, index: k } };
							batches.push(batch);
							g.composites.push({ o: push(null, false), index: k });
						}
						batch = undefined;
						g.from = batches.length;
						g.start = n;
						shadowGroups.push(g);
					}
					openGroups.push(g);
				} else {
					const g = openGroups.pop();
					if (g) {
						batch = undefined;
						g.to = batches.length;
						g.end = n;
						this._shadowRegion(g, width, height, scale, offset);
						for (const c of g.composites) {
							const sh = g.shadows[c.index], r = g.region;
							const rect = r ? [(r.x + sh.x * scale - offset[0]) / scale, (r.y + sh.y * scale - offset[1]) / scale, r.w / scale, r.h / scale] : Z4;
							write(c.o, rect, rect, Z4, sh.color, [8, 0, 0, 0], [0, 1, 1, 0], Z4, g.clip, undefined, r ? 1 : 0, 0, NOGRAD);
						}
					}
				}
				continue;
			}
			if (it.op === "box" && it.backdrop) {
				// What's behind, blurred: its device rectangle (through its transform; with room for the blur to reach)
				const m = it.matrix ?? [1, 0, 0, 1, 0, 0];
				const xs = [it.x, it.x + it.w].map((x) => m[0] * x + m[4]), ys = [it.y, it.y + it.h].map((y) => m[3] * y + m[5]);
				const sigma = (it.blur ?? 0) * scale * Math.abs(m[0]);
				const pad = Math.ceil(sigma * 3);
				const x0 = Math.max(0, Math.floor(Math.min(...xs) * scale + offset[0]) - pad), y0 = Math.max(0, Math.floor(Math.min(...ys) * scale + offset[1]) - pad);
				const x1 = Math.min(width, Math.ceil(Math.max(...xs) * scale + offset[0]) + pad), y1 = Math.min(height, Math.ceil(Math.max(...ys) * scale + offset[1]) + pad);
				if (x1 <= x0 || y1 <= y0 || !this._blurProgram) continue;
				const bd = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, sigma, ops: it.colorOps };
				// (A mask-image's linear gradient fades it: its ramp's alpha over the box)
				let mask = NOGRAD;
				if (it.mask?.type === "linear") {
					let ang = ((it.mask.angle ?? 180) * Math.PI) / 180;
					if (it.mask.toCorner) ang = Math.atan2(it.mask.toCorner[0] * it.h, -it.mask.toCorner[1] * it.w);
					mask = [this._rampRow(it.mask, Math.abs(it.w * Math.sin(ang)) + Math.abs(it.h * Math.cos(ang))), 0, ang, 0];
				}
				batch = { start: n, count: 0, image: null, additive: false, backdrop: bd, blend: "erase" };
				batches.push(batch);
				const oe = push(null, false);
				// (Its texture is the blurred copy, set as it's drawn; uv from the box to the copy, 0..1 of it, the copy upside
				// down: scaled to the part of the texture it fills once the frame's textures are sized)
				const tl = [(Math.min(...xs) * scale + offset[0] - x0) / bd.w, (bd.h - (Math.min(...ys) * scale + offset[1] - y0)) / bd.h];
				const br = [(Math.max(...xs) * scale + offset[0] - x0) / bd.w, (bd.h - (Math.max(...ys) * scale + offset[1] - y0)) / bd.h];
				write(oe, [it.x, it.y, it.w, it.h], [it.x, it.y, it.w, it.h], it.radii, [1, 1, 1, 1], [6, 1, 0, 0], [tl[0], tl[1], br[0], br[1]], it.chamfer ?? Z4, clip, it.matrix, it.opacity, 0, mask);
				batch = { start: n, count: 0, image: null, additive: false, blend: "add" };
				batches.push(batch);
				const o = push(null, false);
				write(o, [it.x, it.y, it.w, it.h], [it.x, it.y, it.w, it.h], it.radii, [1, 1, 1, 1], [6, 0, 0, 0], [tl[0], tl[1], br[0], br[1]], it.chamfer ?? Z4, clip, it.matrix, it.opacity, 0, mask);
				backdrops.push({ o, bd });
				batch = undefined;
				continue;
			}
			if (it.op === "box") {
				// (Its box on device pixels, as a browser snaps a laid out box: its edges crisp, not smoothed across a pixel. A
				// translation after it isn't snapped, as a browser's transform isn't (a label moved every frame glides); not an
				// SVG shape, a glow, or anything turned or scaled)
				let rect = [it.x, it.y, it.w, it.h];
				const m = it.matrix;
				if (!it.exact && it.shadow !== "outer" && !it.backdrop && (!m || (m.length === 6 && m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1))) {
					const sx = (v: number) => (Math.round(v * scale + offset[0]) - offset[0]) / scale;
					const sy = (v: number) => (Math.round(v * scale + offset[1]) - offset[1]) / scale;
					const x0 = sx(it.x), y0 = sy(it.y);
					rect = [x0, y0, sx(it.x + it.w) - x0, sy(it.y + it.h) - y0];
				}
				const cut = it.chamfer ?? Z4;
				if (it.shadow === "outer") {
					const blur = it.blur ?? 0;
					const own = [it.x + (it.spread ?? 0), it.y + (it.spread ?? 0), it.w - 2 * (it.spread ?? 0), it.h - 2 * (it.spread ?? 0)];
					// (The shadow's offset is in its rect; "own" is the element's own box: it isn't shaded under it)
					// (The blur's Gaussian reaches three of its deviations, half the radius each, past the box)
					const reach = blur * 1.5;
					write(push(null, additive), [it.x - reach, it.y - reach, it.w + 2 * reach, it.h + 2 * reach], rect, it.radii, it.color!, [2, 0, blur, it.spread ?? 0], own, cut, clip, it.matrix, it.opacity, 0, NOGRAD, it.radiiY);
					continue;
				}
				if (it.shadow === "inset") {
					const off = it as unknown as { insetX?: number; insetY?: number };
					write(push(null, additive), rect, rect, it.radii, it.color!, [3, 0, it.blur ?? 0, it.spread ?? 0], [off.insetX ?? 0, off.insetY ?? 0, 0, 0], cut, clip, it.matrix, it.opacity, 0, NOGRAD, it.radiiY);
					continue;
				}
				if (it.border) {
					write(push(null, additive), rect, rect, it.radii, it.color!, [1, it.border, 0, 0], Z4, cut, clip, it.matrix, it.opacity, 0, NOGRAD, it.radiiY);
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
						// (Radii given outright: an SVG radialGradient's)
						if (g.radii) [rx, ry] = [g.radii[0] * it.w, g.radii[1] * it.h];
						grad = [this._rampRow(g, Math.max(rx, ry)), 1, cx, cy];
						params = [0, repeatPeriod(g, Math.max(rx, ry)), rx, ry];
					}
					write(push(null, additive), rect, rect, it.radii, [0, 0, 0, 1], params, Z4, cut, clip, it.matrix, it.opacity, 0, grad, it.radiiY);
					continue;
				}
				if (it.color) write(push(null, additive), rect, rect, it.radii, it.color, [0, 0, 0, 0], Z4, cut, clip, it.matrix, it.opacity, 0, NOGRAD, it.radiiY);
				continue;
			}
			if (it.op === "text" && it.shadow && (!(it.shadow.blur > 0) || this._blurProgram)) {
				// A text-shadow: with no blur, the glyphs again in its colour, moved; with one, the text's silhouette blurred
				// as a browser blurs it, tinted and moved, under it (IgeUiTextGlow)
				const sh = it.shadow, f = it.font, k = f.size / SDF_SIZE, chars = [...it.text];
				const glyphs = (color: IgeCssColor | number[], ox: number, oy: number, gclip: number[], opacity: number, add: boolean) => {
					let gx = it.x;
					for (let i = 0; i < chars.length; i++) {
						const g = this.atlas.glyph(chars[i], f);
						if (g) write(push(null, add), [gx + g.left * k + ox, it.y + g.top * k + oy, g.w * k, g.h * k], Z4, Z4, color, [4, 0, k, 0], [g.x / PAGE, g.y / PAGE, (g.x + g.w) / PAGE, (g.y + g.h) / PAGE], Z4, gclip, it.matrix, opacity, g.page, NOGRAD);
						gx += this.atlas.advance(chars[i], f) * k + it.letterSpacing + (i + 1 < chars.length ? this.atlas.kerning(chars[i], chars[i + 1], f) * k : 0);
					}
				};
				if (!(sh.blur > 0)) {
					glyphs(sh.color, sh.x, sh.y, clip, it.opacity, additive);
					continue;
				}
				const m = it.matrix ?? [1, 0, 0, 1, 0, 0];
				const sigma = (sh.blur / 2) * scale * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
				// Its silhouette: its glyphs, white, in a batch drawn only into it
				batch = { start: n, count: 0, image: null, additive: false, hidden: true };
				batches.push(batch);
				const silhouette = batches.length - 1, from = n;
				glyphs([1, 1, 1, 1], 0, 0, NONE, 1, false);
				const { region, frac } = glowRegion(this._data, STRIDE, from, n, sigma, scale, offset);
				const G: IgeUiTextGlow = { key: glowKey(it, sigma, scale, frac, region ? [region.w, region.h] : [0, 0]), sigma, region, silhouette };
				// Its composite: the blurred silhouette over its region, moved by the offset (turned with the text), tinted
				batch = { start: n, count: 0, image: null, additive: false, glow: G };
				batches.push(batch);
				const o = push(null, false);
				const dx = (m[0] * sh.x + m[2] * sh.y) * scale, dy = (m[1] * sh.x + m[3] * sh.y) * scale;
				const rect = region ? [(region.x + dx - offset[0]) / scale, (region.y + dy - offset[1]) / scale, region.w / scale, region.h / scale] : Z4;
				write(o, rect, rect, Z4, sh.color, [8, 0, 0, 0], [0, 1, 1, 0], Z4, clip, undefined, region ? it.opacity : 0, 0, NOGRAD);
				batch = undefined;
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
				// (A url() background's picture: its own texture, wrapping where it repeats)
				const tex = it.src ? this._urlTexture(it.source, it.src, it.repeat ?? [false, false], shownUrls) : this._imageTexture(it.source);
				if (!tex) continue;
				if (!it.src) shown.add(it.source);
				const area = it.area ?? [it.x, it.y, it.w, it.h];
				write(push(tex, additive), [it.x, it.y, it.w, it.h], area, it.radii ?? Z4, [1, 1, 1, 1], [6, 0, 0, 0], it.uv ?? [0, 0, 1, 1], it.chamfer ?? Z4, clip, it.matrix, it.opacity, 0, NOGRAD, it.radiiY);
				continue;
			}
			if (it.op === "fill") {
				const t = it.tris;
				for (let i = 0, k = 0; i + 5 < t.length; i += 6, k++) {
					const x0 = Math.min(t[i], t[i + 2], t[i + 4]) - 1, y0 = Math.min(t[i + 1], t[i + 3], t[i + 5]) - 1;
					const x1 = Math.max(t[i], t[i + 2], t[i + 4]) + 1, y1 = Math.max(t[i + 1], t[i + 3], t[i + 5]) + 1;
					write(push(null, additive), [x0, y0, x1 - x0, y1 - y0], [t[i], t[i + 1], t[i + 2], t[i + 3]], [t[i + 4], t[i + 5], it.edges[k] ?? 7, 0], it.color, [7, 0, 0, 0], Z4, Z4, clip, it.matrix, it.opacity, 0, NOGRAD);
				}
				continue;
			}
			if (it.op === "line") {
				const p = it.points;
				const n2 = p.length / 2;
				const count = it.closed ? n2 : n2 - 1;
				const w = Math.max(it.width, 0.5);
				const cap = it.cap ?? "round", join = it.join ?? "round", limit = it.miterLimit ?? 4;
				// How far a segment's end reaches past its point, and whether it's round there: a cap at an open end;
				// at a corner, round, or square ends out to where the two outer edges meet (a miter), or none (bevel)
				const end = (corner: number, a: number, b: number): [number, boolean] => {
					if (corner < 0) {
						// (-1 its start, -2 its end: each with its own cap when it has two)
						const c = it.caps ? it.caps[corner === -1 ? 0 : 1] : cap;
						return c === "butt" ? [0, false] : [w / 2, c === "round"];
					}
					if (join === "round") return [w / 2, true];
					if (join === "bevel") return [0, false];
					// The turn's angle from the two segments' directions
					const ax = p[corner * 2] - p[a * 2], ay = p[corner * 2 + 1] - p[a * 2 + 1], bx = p[b * 2] - p[corner * 2], by = p[b * 2 + 1] - p[corner * 2 + 1];
					const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
					if (la < 1e-6 || lb < 1e-6) return [0, false];
					const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
					const turn = Math.acos(cos);
					// (Past the miter limit, a bevel)
					if (1 / Math.max(1e-6, Math.cos(turn / 2)) > limit) return [0, false];
					return [(w / 2) * Math.tan(turn / 2), false];
				};
				for (let i = 0; i < count; i++) {
					const x0 = p[i * 2], y0 = p[i * 2 + 1];
					const j = (i + 1) % n2;
					const x1 = p[j * 2], y1 = p[j * 2 + 1];
					const len = Math.hypot(x1 - x0, y1 - y0);
					if (len < 0.01) continue;
					const c = (x1 - x0) / len, s = (y1 - y0) / len;
					const open0 = !it.closed && i === 0, open1 = !it.closed && j === n2 - 1;
					const [e0, r0] = open0 ? end(-1, 0, 0) : end(i, (i + n2 - 1) % n2, j);
					const [e1, r1] = open1 ? end(-2, 0, 0) : end(j, i, (j + 1) % n2);
					// A segment: a box along it, turned about its start (and then the item's own transform)
					const rot: IgeCssMatrix = [c, s, -s, c, x0 - c * x0 + s * y0, y0 - s * x0 - c * y0];
					const m = it.matrix ? multiply(it.matrix, rot) : rot;
					const rect = [x0 - e0, y0 - w / 2, len + e0 + e1, w];
					const ra = r0 ? w / 2 : 0, rb = r1 ? w / 2 : 0;
					write(push(null, additive), rect, rect, [ra, rb, rb, ra], it.color, [0, 0, 0, 0], Z4, Z4, clip, m, it.opacity, 0, NOGRAD);
				}
			}
		}
		this.sweep(shown);
		this._glows.endFrame(gl);
		for (const [key, e] of this._urlImages) {
			if (shownUrls.has(key)) continue;
			this.gl.deleteTexture(e.tex);
			this._urlImages.delete(key);
		}
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
		if (shadowGroups.length) {
			// The drop shadows' textures sized for the frame's biggest, and each composite's uv scaled to its part of them
			const parts: { o: number; k: number; hw: number; hh: number }[] = [];
			for (const g of shadowGroups) {
				if (!g.region) continue;
				const sizes = this._shadows.size(this, g, scale);
				for (const c of g.composites) parts.push({ o: c.o, k: c.index, hw: sizes[c.index][0], hh: sizes[c.index][1] });
			}
			for (const { o, k, hw, hh } of parts) {
				const t = this._shadows.outs[k]!;
				// (The blurred copy's rows are bottom up: its top-left corner is at v = its height)
				this._data.set([0, hh / t.h, hw / t.w, 0], o + 20);
			}
		}
		if (layers.length) {
			// Filters' layers: each depth's textures sized for its biggest, and each composite's uv to its part of them
			for (const L of layers) if (L.region) this._filters.size(this, L.depth, L.region.w, L.region.h);
			for (const L of layers) {
				if (!L.region) continue;
				const t = this._filters.layers[L.depth][0];
				// (Rows bottom up: its top-left corner is at v = its height)
				this._data.set([0, L.region.h / t.h, L.region.w / t.w, 0], L.o + 20);
			}
			// Fades (a layer that's only an opacity, with nothing in it that needs a layer or the target of its own): each a
			// place in one atlas, all drawn before the screen's own pass, so the screen's target is never left and come back
			// to for them (a tiled GPU stores and loads all of it each time)
			const fades = layers.filter((L) => L.region && !L.ops.length && batches.slice(L.from, L.to).every((b) => b.owner === L && !b.layer && !b.shadow && !b.backdrop && !b.blend && !b.stencil));
			if (fades.length) {
				const W = Math.max(1024, ...fades.map((L) => L.region!.w));
				let x = 0, y = 0, row = 0;
				for (const L of fades) {
					const r = L.region!;
					if (x + r.w > W) {
						x = 0;
						y += row;
						row = 0;
					}
					// (Past what one texture should hold: drawn as a layer of its own instead)
					if (y + r.h > 4096) break;
					L.atlas = [x, y];
					x += r.w;
					row = Math.max(row, r.h);
				}
				const H = y + row;
				const t = this._tex(this._fade, W, H);
				if (!this._fade) {
					this._fade = { ...t, fbo: gl.createFramebuffer()! };
					const was = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
					gl.bindFramebuffer(gl.FRAMEBUFFER, this._fade.fbo);
					gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
					gl.bindFramebuffer(gl.FRAMEBUFFER, was);
				}
				this._fade.w = t.w;
				this._fade.h = t.h;
				for (const L of fades) {
					if (!L.atlas) continue;
					const r = L.region!, [ax, ay] = L.atlas, A = this._fade;
					// (Its top-left corner at the top of its place: rows bottom up)
					this._data.set([ax / A.w, (ay + r.h) / A.h, (ax + r.w) / A.w, ay / A.h], L.o + 20);
				}
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
		const target = batches.some((b) => b.backdrop || b.shadow || b.layer || b.glow) ? (gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null) : null;
		let calls = 0;
		let blurred: WebGLTexture | null = null;
		this._stencil.begin();
		/** One batch drawn (a drop shadow's silhouette draws what it's of with this too). */
		const drawBatch = (b: Batch) => {
			// (A clip's step has no instances: nothing to draw)
			if (!b.count) return;
			if (b.blend === "erase") gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
			else gl.blendFunc(gl.ONE, b.additive || b.blend === "add" ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, b.image);
			// (WebGL 2 has no base instance: the instanced attributes start at the batch)
			for (let i = 0; i < ATTRIBS; i++) gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, b.start * STRIDE * 4 + i * 16);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.count);
			calls++;
		};
		// The fades, into their places in the atlas, before the screen's own pass
		const fades = layers.filter((L) => L.atlas);
		if (fades.length && this._fade) {
			for (const L of fades) {
				const r = L.region!, [ax, ay] = L.atlas!;
				const f: Frame = { target: this._fade.fbo, width: r.w, height: r.h, offset: [offset[0] - r.x, offset[1] - r.y], view: [ax, ay] };
				this._bind(f);
				gl.enable(gl.SCISSOR_TEST);
				gl.scissor(ax, ay, r.w, r.h);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.disable(gl.SCISSOR_TEST);
				for (let i = L.from; i < L.to; i++) {
					const b = batches[i];
					if (b.owner !== L || b.hidden) continue;
					if (b.glow) {
						b.image = this._glowTexture(b.glow, batches, drawBatch, f, offset);
						if (!b.image) continue;
					}
					drawBatch(b);
				}
			}
			this._bind({ target, width, height, offset });
		}
		for (const b of batches) {
			if (b.stencil) {
				// A clip of any shape opening or closing: its shape marked in the stencil (or taken back), then on as before
				this._stencil.apply(gl, b.stencil, width, height, scale, offset);
				gl.useProgram(this._program);
				gl.bindVertexArray(this._vao);
				gl.bindBuffer(gl.ARRAY_BUFFER, this._inst);
				continue;
			}
			// (Drawn into its filter's layer instead; a layer made as its composite's drawn; a glow's silhouette only into it)
			if (b.owner || b.hidden) continue;
			if (b.glow) {
				b.image = this._glowTexture(b.glow, batches, drawBatch, { target, width, height, offset }, offset);
				if (!b.image) continue;
			}
			if (b.layer) {
				if (!b.layer.region) continue;
				b.image = b.layer.atlas ? this._fade!.tex : this._layer(b.layer, batches, drawBatch, { target, width, height, offset }, scale, offset);
			}
			if (b.shadow) {
				// A drop shadow: what it's of rendered alone and its shadows made from that, in the filter's order (once for
				// them all), then each drawn from its own
				const g = b.shadow.group;
				if (!g.region) continue;
				const frame = { width, height, offset, target };
				if (!g.drawn) {
					this._shadows.renderSilhouette(this, g, (i) => {
						const s = batches[i];
						// (Not a backdrop's passes or another shadow: what's drawn of the element itself)
						if (!s.backdrop && !s.blend && !s.shadow && !s.layer && !s.hidden && (!s.glow || s.image)) drawBatch(s);
					}, frame);
					this._shadows.chain(this, g, scale, frame);
					calls += 3 * g.shadows.length;
				}
				b.image = this._shadows.outs[b.shadow.index]!.tex;
			}
			if (b.backdrop) {
				blurred = this._blurBackdrop(b.backdrop, height, target);
				gl.useProgram(this._program);
				gl.bindVertexArray(this._vao);
				gl.viewport(0, 0, width, height);
				gl.enable(gl.BLEND);
				calls += 2;
			}
			if (b.blend === "add") b.image = blurred;
			drawBatch(b);
		}
		this._stencil.end(gl);
		gl.bindVertexArray(null);
		gl.depthMask(true);
		this.drawCalls = calls;
		return calls;
	}

	/**
	 * A text glow's blurred silhouette (IgeUiTextGlow): from the cache, or its glyphs drawn alone and blurred now, and
	 * what `frame` was drawing put back. `offset`: the UI's corner on the target (device px), as the regions are.
	 */
	_glowTexture (G: IgeUiTextGlow, batches: Batch[], drawBatch: (b: Batch) => void, frame: Frame, offset: [number, number]): WebGLTexture | null {
		const gl = this.gl;
		const begin = (target: WebGLFramebuffer | null, w: number, h: number, corner: [number, number]) => this._bind({ target, width: w, height: h, offset: [offset[0] - corner[0], offset[1] - corner[1]] });
		return this._glows.texture(this, this._filters, G, begin, () => drawBatch(batches[G.silhouette]), () => this._bind(frame));
	}

	/** The program set up to draw into `f`: its target, viewport, and the uniforms that place what's drawn on it. */
	_bind (f: Frame): void {
		const gl = this.gl, v = f.view ?? [0, 0];
		gl.bindFramebuffer(gl.FRAMEBUFFER, f.target);
		gl.viewport(v[0], v[1], f.width, f.height);
		gl.useProgram(this._program);
		gl.bindVertexArray(this._vao);
		gl.enable(gl.BLEND);
		gl.uniform2f(this._uniforms.u_resolution, f.width, f.height);
		gl.uniform2f(this._uniforms.u_offset, f.offset[0], f.offset[1]);
		gl.uniform2f(this._uniforms.u_view, v[0], v[1]);
		gl.activeTexture(gl.TEXTURE2);
	}

	/**
	 * A filter's layer (IgeUiFilters): its batches drawn into it alone (filters and drop shadows inside it as they are
	 * on the target; backdrops left out), its filter list run on that, and what `frame` was drawing put back. Returns
	 * the texture holding the result. `offset`: the UI's corner on the target (device px), as the regions are.
	 */
	_layer (L: IgeUiFilterLayer, batches: Batch[], drawBatch: (b: Batch) => void, frame: Frame, scale: number, offset: [number, number]): WebGLTexture | null {
		const gl = this.gl, r = L.region!;
		const into: Frame = { target: this._filters.layers[L.depth][0].fbo, width: r.w, height: r.h, offset: [offset[0] - r.x, offset[1] - r.y] };
		const begin = (f: Frame) => this._bind(f);
		begin(into);
		// Cleared: only its region when nothing reads past it (a fade, colour filters); all of it for a blur, whose coarse
		// reads would take in what an earlier layer left past it
		const whole = L.ops.some((o) => o.type !== "matrix");
		if (!whole) {
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(0, 0, r.w, r.h);
		}
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.disable(gl.SCISSOR_TEST);
		for (let i = L.from; i < L.to; i++) {
			const b = batches[i];
			if (b.owner !== L || b.backdrop || b.blend || b.hidden) continue;
			if (b.glow) {
				b.image = this._glowTexture(b.glow, batches, drawBatch, into, offset);
				if (!b.image) continue;
			}
			if (b.layer) {
				if (!b.layer.region) continue;
				b.image = b.layer.atlas ? this._fade!.tex : this._layer(b.layer, batches, drawBatch, into, scale, offset);
			}
			if (b.shadow) {
				const g = b.shadow.group;
				if (!g.region) continue;
				if (!g.drawn) {
					const sf = { ...into, base: offset };
					this._shadows.renderSilhouette(this, g, (k) => {
						const s = batches[k];
						if (!s.backdrop && !s.blend && !s.shadow && !s.layer && !s.hidden && (!s.glow || s.image)) drawBatch(s);
					}, sf);
					this._shadows.chain(this, g, scale, sf);
				}
				b.image = this._shadows.outs[b.shadow.index]!.tex;
			}
			drawBatch(b);
		}
		const out = this._filters.apply(this, L.depth, r.w, r.h, L.ops, scale);
		begin(frame);
		return out.tex;
	}

	/**
	 * A drop shadow group's silhouette rectangle (device px, top-down): round what's in it, with room for its widest
	 * blur, kept to the target (and as far past it as a shadow's offset brings anything in); none when nothing's in it.
	 */
	_shadowRegion (g: IgeUiShadowGroup, width: number, height: number, scale: number, offset: [number, number]): void {
		const d = this._data;
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (let o = g.start * STRIDE; o < g.end * STRIDE; o += STRIDE) {
			const rx = d[o], ry = d[o + 1], rw = d[o + 2], rh = d[o + 3];
			if (rw <= 0 || rh <= 0 || d[o + 38] <= 0) continue;
			for (const [px, py] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) {
				const w = d[o + 44] * px + d[o + 45] * py + d[o + 46];
				if (w <= 1e-6) continue;
				const sx = ((d[o + 32] * px + d[o + 34] * py + d[o + 36]) / w) * scale + offset[0];
				const sy = ((d[o + 33] * px + d[o + 35] * py + d[o + 37]) / w) * scale + offset[1];
				x0 = Math.min(x0, sx);
				y0 = Math.min(y0, sy);
				x1 = Math.max(x1, sx);
				y1 = Math.max(y1, sy);
			}
		}
		if (!Number.isFinite(x0)) {
			g.region = undefined;
			return;
		}
		const sigma = Math.max(...g.shadows.map((s) => (s.blur / 2) * scale));
		const pad = Math.ceil(sigma * 3) + 2;
		// (A chain's shadows are each cast from the last: their offsets add up)
		const reach = g.shadows.reduce((a, s) => a + Math.max(Math.abs(s.x), Math.abs(s.y)) * scale, 0) + pad;
		// (Room round it for the blur, and in a chain for the shadows the next ones are cast from too)
		const grow = g.shadows.length > 1 ? reach : pad;
		const rx0 = Math.max(-reach, Math.floor(x0) - grow), ry0 = Math.max(-reach, Math.floor(y0) - grow);
		const rx1 = Math.min(width + reach, Math.ceil(x1) + grow), ry1 = Math.min(height + reach, Math.ceil(y1) + grow);
		g.region = rx1 > rx0 && ry1 > ry0 ? { x: rx0, y: ry0, w: rx1 - rx0, h: ry1 - ry0 } : undefined;
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
	_blurBackdrop (r: { x: number; y: number; w: number; h: number; sigma: number; ops?: number[][] }, height: number, target: WebGLFramebuffer | null): WebGLTexture | null {
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
		// backdrop-filter's colour functions (grayscale(), contrast()...: IgeUiFilters), after its blur
		if (r.ops?.length) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this._blurFbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._blurA.tex, 0);
			this._filters.colorPass(this, this._blurB, { fbo: this._blurFbo, ...this._blurA }, hw, hh, r.ops.slice(0, 8));
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.activeTexture(gl.TEXTURE2);
		return r.ops?.length ? this._blurA.tex : this._blurB.tex;
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

