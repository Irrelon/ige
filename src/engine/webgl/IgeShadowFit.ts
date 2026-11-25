/**
 * Fitting a directional light's shadow map to what a camera sees (IgeWebGlRenderer.shadowFit()).
 *
 * The map is an orthographic box in the light's view. Fitted, the box is the smallest (up to a size ladder) that holds
 * every point the camera can see that can take a shadow: its frustum out to a shadow distance, cut to the band of
 * heights the scene's surfaces lie in (the ground to the tallest roof). A caster outside the view whose shadow falls
 * into it shares its shadow's place across the light, so the box holds it too; the box runs back towards the light
 * far enough to take tall ones.
 *
 * The box keeps still while it can: its sizes step along a ladder (about 9% a step) rather than following the view
 * exactly, and its middle is snapped to whole shadow-map texels, so the same world point always lands on the same
 * part of a texel and shadow edges don't shimmer as the camera moves. With shadow caching, the box is also left
 * where it is while the view stays inside it (it's made `slack` bigger to give it room), so the static casters'
 * cache is redrawn only now and then, and never while part of the view is outside the box (no shadows blinking at
 * the view's edges).
 *
 * Cascades (IgeWebGlRenderer.shadowCascades()): the view's depth is split into slices, nearest first, a blend of
 * even and logarithmic steps (igeShadowCascadeSplits()), and each slice gets a box of its own, fitted the same way,
 * in a tile of the map (a 2 x 2 grid of half-size tiles). Near slices are small, so their shadows are fine; the far
 * slice reaches as far as the single map did. Each slice's box overlaps the slice before it by that slice's blend,
 * so the shader can fade from one to the next.
 *
 * Pure maths, no GPU: the renderer and the shadow manager use it, the tests check it.
 */

/** Settings for fitting the directional shadow map to each view. */
export interface IgeShadowFitSettings {
	/**
	 * Fit the map to each view (default true). False: a square frustumSize() each way round the camera's target,
	 * whatever the camera sees (the engine's map before fitting).
	 */
	enabled: boolean;
	/**
	 * How far from the camera shadows reach, in world units along its view. "auto" (the default): as far as the
	 * square reached, the camera's target's depth plus shadowManager.frustumSize() (twice frustumSize() for a
	 * camera with no target). Infinity: the camera's far plane.
	 */
	distance: number | "auto";
	/**
	 * The lowest surface that takes shadows (world y, e.g. the ground). "auto" (the default): the lowest point of
	 * the scene's opaque meshes' bounds, this frame. -Infinity: no limit.
	 */
	minY: number | "auto";
	/** The highest (world y, e.g. the tallest roof). "auto" (the default): the highest of the meshes' bounds. Infinity: no limit. */
	maxY: number | "auto";
	/**
	 * With shadow caching: room left round the view, a fraction of its size, so the map moves only once the view has
	 * moved that far (default 0.15). More room, fewer cache redraws and coarser shadows.
	 */
	slack: number;
}

export const IGE_SHADOW_FIT_DEFAULTS: IgeShadowFitSettings = { enabled: true, distance: "auto", minY: "auto", maxY: "auto", slack: 0.15 };

/** The most cascades a directional shadow map can have (its four tiles). */
export const IGE_MAX_SHADOW_CASCADES = 4;

/** Settings for cascaded shadow maps (IgeWebGlRenderer.shadowCascades()). */
export interface IgeShadowCascadeSettings {
	/**
	 * How many slices the view's depth is split into, each with its own part of the map: 1 (the default) is one map
	 * over the whole view; 2 to 4 split the map into a 2 x 2 grid of half-size tiles, a slice in each (the same
	 * memory: 3 leaves a tile unused, and costs one shadow pass fewer than 4). Needs shadowFit() on.
	 */
	count: number;
	/**
	 * Where the slices end: 0 even steps from the camera's near plane to the shadow distance, 1 logarithmic steps
	 * (each slice a fixed multiple of the one before: the most detail near the camera). Default 0.8.
	 */
	lambda: number;
	/** The far part of each slice, a fraction of its depth, faded into the next slice so the change doesn't show (default 0.1). */
	blend: number;
}

export const IGE_SHADOW_CASCADE_DEFAULTS: IgeShadowCascadeSettings = { count: 1, lambda: 0.8, blend: 0.1 };

/**
 * Where each of `count` slices of a view's depth ends, from `near` to `far` (view depths): a blend of logarithmic
 * steps (near × (far / near)^(i / count)) and even ones (near + (far - near) × i / count), `lambda` of the first.
 * Writes `count` values, the last `far`, into `out`.
 */
export function igeShadowCascadeSplits (near: number, far: number, count: number, lambda: number, out: number[] = []): number[] {
	const n = Math.max(near, 1e-6), f = Math.max(far, n * 1.000001);
	const l = Math.min(1, Math.max(0, lambda));
	out.length = 0;
	for (let i = 1; i <= count; i++) {
		const t = i / count;
		out.push(i === count ? f : l * n * Math.pow(f / n, t) + (1 - l) * (n + (f - n) * t));
	}
	return out;
}

/**
 * The half-size across the light (the larger of its two axes) of the smallest box round `count` points (x, y, z
 * triples): how big a map has to be to hold them, before any edge, ladder or slack.
 */
export function igeShadowFitExtent (points: ArrayLike<number>, count: number, basis: IgeShadowLightBasis): number {
	const { rx, ry, rz, ux, uy, uz } = basis;
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (let i = 0; i < count; i++) {
		const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2];
		const x = rx * px + ry * py + rz * pz, y = ux * px + uy * py + uz * pz;
		if (x < x0) x0 = x;
		if (x > x1) x1 = x;
		if (y < y0) y0 = y;
		if (y > y1) y1 = y;
	}
	return count > 0 ? Math.max(x1 - x0, y1 - y0) / 2 : 0;
}

/**
 * The tile of the map each of `count` cascades draws into, as fractions of the map (x, y, width, height from its
 * bottom-left): the whole map for one; for 2 to 4, a 2 x 2 grid of half-size tiles, the first at the bottom left.
 */
export function igeShadowCascadeTile (index: number, count: number): [number, number, number, number] {
	if (count <= 1) return [0, 0, 1, 1];
	return [(index & 1) * 0.5, (index >> 1) * 0.5, 0.5, 0.5];
}

/** One cascade's slice of a view's depth: where it starts and ends, and where its box starts (`from`, with the blend). */
export interface IgeShadowCascadeSlice {
	start: number;
	end: number;
	from: number;
}

/**
 * Plan a view's cascades: its depth from the near plane out to `distance` (or its far plane) in `count` slices
 * (igeShadowCascadeSplits()), keeping those with something in the band `minY` to `maxY` in view (an empty one is
 * folded into the next, so the slices still meet). Each slice's box starts `blend` of the slice before back from
 * its start, so the fade from one to the next is in both. Writes the slices into `out` (reusing its objects) and
 * returns how many; `scratch` takes the corners while it looks.
 */
export function igeShadowCascadeSlices (
	view: ArrayLike<number>,
	projection: ArrayLike<number>,
	distance: number,
	minY: number,
	maxY: number,
	settings: Pick<IgeShadowCascadeSettings, "count" | "lambda" | "blend">,
	out: IgeShadowCascadeSlice[],
	scratch: number[] = [],
	splits: number[] = []
): number {
	const count = Math.min(Math.max(1, Math.floor(settings.count)), IGE_MAX_SHADOW_CASCADES);
	const { near, far } = igeProjectionDepthRange(projection);
	const end = Math.min(distance, far);
	if (!(end > near)) return 0;
	igeShadowCascadeSplits(near, end, count, settings.lambda, splits);
	let used = 0, start = near;
	for (let i = 0; i < count; i++) {
		if (igeShadowFitVolume(view, projection, splits[i], minY, maxY, scratch, 0, start) === 0) continue;
		const slice = (out[used] ??= { start: 0, end: 0, from: 0 });
		slice.start = start;
		slice.end = splits[i];
		used++;
		start = splits[i];
	}
	for (let k = 0; k < used; k++) {
		const before = k > 0 ? out[k - 1] : undefined;
		out[k].from = before ? Math.max(near, out[k].start - settings.blend * (before.end - before.start)) : out[k].start;
	}
	return used;
}

/** The near and far planes' depths (along the view) of a projection matrix (column-major; perspective or orthographic). */
export function igeProjectionDepthRange (projection: ArrayLike<number>): { near: number; far: number } {
	const m10 = projection[10], m14 = projection[14];
	if (projection[11] !== 0) return { near: m14 / (m10 - 1), far: m14 / (m10 + 1) };
	return { near: (m14 + 1) / m10, far: (m14 - 1) / m10 };
}

/** A light's axes: right (r), up (u) and along the light (f), as the engine's lookAt makes them. */
export interface IgeShadowLightBasis {
	rx: number; ry: number; rz: number;
	ux: number; uy: number; uz: number;
	fx: number; fy: number; fz: number;
}

/**
 * A fitted box, in the light's axes from the world's origin: `cx`, `cy` its middle across the light, `hx`, `hy` its
 * half sizes, `z0` to `z1` its depth along the light. Kept per view between frames.
 */
export interface IgeShadowFitBox {
	valid: boolean;
	cx: number;
	cy: number;
	hx: number;
	hy: number;
	z0: number;
	z1: number;
	/** What it was fitted for: the light's direction, the map's size and the depth span (any change refits it). */
	dx: number;
	dy: number;
	dz: number;
	mapSize: number;
	span: number;
	/** The middle of what the view saw when it was last fitted (the way the view is moving, for leading it). */
	px: number;
	py: number;
	/** Times it was moved or resized. */
	changes: number;
}

export function igeShadowFitBox (): IgeShadowFitBox {
	return { valid: false, cx: 0, cy: 0, hx: 0, hy: 0, z0: 0, z1: 0, dx: 0, dy: 0, dz: 0, mapSize: 0, span: 0, px: 0, py: 0, changes: 0 };
}

/** With shadow caching, how far into its room a moved box is pushed ahead of the view, the way the view is going. */
export const IGE_SHADOW_FIT_LEAD = 0.8;

export interface IgeShadowFitOptions {
	/** The shadow map's width and height in texels. */
	mapSize: number;
	/** The depth the box spans along the light at least (the shadow manager's far - near: its bias is a share of it). */
	depthSpan: number;
	/** Room left round the view when the box stays put (see IgeShadowFitSettings.slack). */
	slack: number;
	/** Follow the view every frame (no shadow caching: moving costs nothing), only snapped; else stay put while it can. */
	follow: boolean;
}

/** The light's axes for a direction (normalised here): up is world y, or x when the light is near vertical. */
export function igeShadowLightBasis (dir: { x: number; y: number; z: number }): IgeShadowLightBasis {
	const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
	const fx = dir.x / len, fy = dir.y / len, fz = dir.z / len;
	// (As updateLightSpaceMatrix() makes it: up is y unless the light is nearly straight up or down)
	const upX = Math.abs(dir.y) > 0.99 ? 1 : 0, upY = upX ? 0 : 1;
	// right = normalise(f × up), up' = right × f
	let rx = fy * 0 - fz * upY, ry = fz * upX - fx * 0, rz = fx * upY - fy * upX;
	const rl = Math.hypot(rx, ry, rz) || 1;
	rx /= rl;
	ry /= rl;
	rz /= rl;
	return { rx, ry, rz, ux: ry * fz - rz * fy, uy: rz * fx - rx * fz, uz: rx * fy - ry * fx, fx, fy, fz };
}

/** Inverse of a column-major 4×4 matrix (in doubles), or null when it has none. */
export function igeInvertMatrix4 (m: ArrayLike<number>, out: number[] = new Array(16)): number[] | null {
	const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
	const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
	const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
	const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
	const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
	const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
	const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
	const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
	let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	if (!det) return null;
	det = 1 / det;
	out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
	out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
	out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
	out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
	out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
	out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
	out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
	return out;
}

// The frustum's faces, by corner (bit 0: x, bit 1: y, bit 2: far)
const FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6]];

const corners: number[] = new Array(24);
const invProjection: number[] = new Array(16);
const invView: number[] = new Array(16);
let polygon: number[] = [];
let clipped: number[] = [];

/** A convex polygon (x, y, z triples) cut to y >= limit (`above`) or y <= limit. */
function clipY (input: number[], output: number[], limit: number, above: boolean): number[] {
	output.length = 0;
	const n = input.length / 3;
	for (let i = 0; i < n; i++) {
		const ax = input[i * 3], ay = input[i * 3 + 1], az = input[i * 3 + 2];
		const j = (i + 1) % n;
		const bx = input[j * 3], by = input[j * 3 + 1], bz = input[j * 3 + 2];
		const aIn = above ? ay >= limit : ay <= limit;
		const bIn = above ? by >= limit : by <= limit;
		if (aIn) output.push(ax, ay, az);
		if (aIn !== bIn) {
			const t = (limit - ay) / (by - ay);
			output.push(ax + (bx - ax) * t, limit, az + (bz - az) * t);
		}
	}
	return output;
}

/**
 * What a camera sees that can take a shadow: its frustum (from its view and projection matrices, column-major) out
 * to `distance` along its view (from `from`, for a cascade's slice), cut to the heights `minY` to `maxY`. Writes the
 * volume's corners into `out` as x, y, z triples (from `offset`) and returns how many it wrote; 0 when the band
 * isn't in view.
 */
export function igeShadowFitVolume (
	view: ArrayLike<number>,
	projection: ArrayLike<number>,
	distance: number,
	minY: number,
	maxY: number,
	out: number[],
	offset: number = 0,
	from: number = 0
): number {
	if (!igeInvertMatrix4(projection, invProjection) || !igeInvertMatrix4(view, invView)) return 0;
	const p = invProjection, v = invView;
	// The eight corners in view space (near face first), the far ones brought in to `distance`
	for (let i = 0; i < 8; i++) {
		const x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
		const w = p[3] * x + p[7] * y + p[11] * z + p[15];
		corners[i * 3] = (p[0] * x + p[4] * y + p[8] * z + p[12]) / w;
		corners[i * 3 + 1] = (p[1] * x + p[5] * y + p[9] * z + p[13]) / w;
		corners[i * 3 + 2] = (p[2] * x + p[6] * y + p[10] * z + p[14]) / w;
	}
	for (let i = 0; i < 4; i++) {
		const n = i * 3, f = (i + 4) * 3;
		const dn = -corners[n + 2], df = -corners[f + 2];
		if (!(df > dn)) continue;
		// The slice's near and far ends, along each edge from its near corner to its far one
		const t0 = from > dn ? Math.min(1, (from - dn) / (df - dn)) : 0;
		const t1 = df > distance ? Math.max(0, (distance - dn) / (df - dn)) : 1;
		if (t1 <= t0) return 0;
		const nx = corners[n], ny = corners[n + 1], nz = corners[n + 2];
		const ex = corners[f] - nx, ey = corners[f + 1] - ny, ez = corners[f + 2] - nz;
		corners[n] = nx + ex * t0;
		corners[n + 1] = ny + ey * t0;
		corners[n + 2] = nz + ez * t0;
		corners[f] = nx + ex * t1;
		corners[f + 1] = ny + ey * t1;
		corners[f + 2] = nz + ez * t1;
	}
	// Into the world
	for (let i = 0; i < 8; i++) {
		const x = corners[i * 3], y = corners[i * 3 + 1], z = corners[i * 3 + 2];
		corners[i * 3] = v[0] * x + v[4] * y + v[8] * z + v[12];
		corners[i * 3 + 1] = v[1] * x + v[5] * y + v[9] * z + v[13];
		corners[i * 3 + 2] = v[2] * x + v[6] * y + v[10] * z + v[14];
	}
	// Each face cut to the band: the cut volume's corners are on them
	let count = 0;
	for (const face of FACES) {
		polygon.length = 0;
		for (const c of face) polygon.push(corners[c * 3], corners[c * 3 + 1], corners[c * 3 + 2]);
		if (minY > -Infinity) {
			const swap = clipY(polygon, clipped, minY, true);
			clipped = polygon;
			polygon = swap;
		}
		if (maxY < Infinity) {
			const swap = clipY(polygon, clipped, maxY, false);
			clipped = polygon;
			polygon = swap;
		}
		for (let k = 0; k < polygon.length; k++) out[offset + count * 3 + k] = polygon[k];
		count += polygon.length / 3;
	}
	return count;
}

/** The size ladder: the next of 2^(k/8) up from `value`. */
export function igeShadowFitStep (value: number): number {
	return Math.pow(2, Math.ceil(Math.log2(Math.max(value, 1e-6)) * 8 - 1e-9) / 8);
}

/** Two steps up the ladder: how much bigger than it needs a box may stay before it's made smaller. */
const SHRINK_AT = Math.pow(2, 2 / 8);

/**
 * Fit `box` round `count` points (x, y, z triples), or leave it where it is if it still fits them well (see
 * IgeShadowFitOptions.follow). Returns true when the box moved or changed size.
 */
export function igeFitShadowBox (box: IgeShadowFitBox, points: ArrayLike<number>, count: number, basis: IgeShadowLightBasis, options: IgeShadowFitOptions): boolean {
	const { rx, ry, rz, ux, uy, uz, fx, fy, fz } = basis;
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, d0 = Infinity, d1 = -Infinity;
	for (let i = 0; i < count; i++) {
		const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2];
		const x = rx * px + ry * py + rz * pz, y = ux * px + uy * py + uz * pz, d = fx * px + fy * py + fz * pz;
		if (x < x0) x0 = x;
		if (x > x1) x1 = x;
		if (y < y0) y0 = y;
		if (y > y1) y1 = y;
		if (d < d0) d0 = d;
		if (d > d1) d1 = d;
	}
	if (count === 0) return false;

	const n = Math.max(options.mapSize, 16);
	// Two texels kept clear at each edge (the shadow filter reads one round each sample)
	const edge = 1 / (1 - 4 / n);
	const wantX = Math.max((x1 - x0) / 2, 1e-3) * edge, wantY = Math.max((y1 - y0) / 2, 1e-3) * edge;
	// Casters this far back towards the light from the nearest surface still fit
	const reach = options.depthSpan / 4;
	const same = box.valid && box.dx === fx && box.dy === fy && box.dz === fz && box.mapSize === n && box.span === options.depthSpan;

	let hx: number, hy: number, cx: number, cy: number, z0: number, z1: number;
	if (options.follow) {
		// Sizes stay on their step while they fit and aren't much too big; the middle follows, snapped to texels
		hx = same && box.hx >= wantX && box.hx <= igeShadowFitStep(wantX) * SHRINK_AT ? box.hx : igeShadowFitStep(wantX);
		hy = same && box.hy >= wantY && box.hy <= igeShadowFitStep(wantY) * SHRINK_AT ? box.hy : igeShadowFitStep(wantY);
		cx = snap((x0 + x1) / 2, (2 * hx) / n);
		cy = snap((y0 + y1) / 2, (2 * hy) / n);
		const span = Math.max(options.depthSpan, d1 - d0 + reach);
		z1 = d1 + span * 0.01;
		z0 = z1 - span;
	} else {
		// Left where it is while it holds the view (inside its edges), isn't much too big, and its depth still fits
		const room = 1 + Math.max(0, options.slack);
		if (
			same &&
			x0 >= box.cx - box.hx / edge && x1 <= box.cx + box.hx / edge &&
			y0 >= box.cy - box.hy / edge && y1 <= box.cy + box.hy / edge &&
			box.hx <= igeShadowFitStep(wantX * room) * SHRINK_AT && box.hy <= igeShadowFitStep(wantY * room) * SHRINK_AT &&
			d1 <= box.z1 && d0 - reach >= box.z0
		) {
			return false;
		}
		hx = igeShadowFitStep(wantX * room);
		hy = igeShadowFitStep(wantY * room);
		// Pushed ahead the way the view has gone since the box was last fitted, so it has more room to go on into
		const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
		let ax = 0, ay = 0;
		if (same) {
			const gx = mx - box.px, gy = my - box.py, len = Math.hypot(gx, gy);
			if (len > 0) {
				ax = (gx / len) * Math.max(0, hx / edge - (x1 - x0) / 2) * IGE_SHADOW_FIT_LEAD;
				ay = (gy / len) * Math.max(0, hy / edge - (y1 - y0) / 2) * IGE_SHADOW_FIT_LEAD;
			}
		}
		box.px = mx;
		box.py = my;
		cx = snap(mx + ax, (2 * hx) / n);
		cy = snap(my + ay, (2 * hy) / n);
		// Depth: room past the furthest surface for the view to move into, the rest back towards the light
		const ahead = (room - 1) * Math.max(wantX, wantY) + options.depthSpan * 0.01;
		const span = Math.max(options.depthSpan, d1 - d0 + reach + ahead);
		z1 = d1 + ahead;
		z0 = z1 - span;
	}

	const changed = !box.valid || hx !== box.hx || hy !== box.hy || cx !== box.cx || cy !== box.cy || z0 !== box.z0 || z1 !== box.z1;
	box.valid = true;
	box.hx = hx;
	box.hy = hy;
	box.cx = cx;
	box.cy = cy;
	box.z0 = z0;
	box.z1 = z1;
	box.dx = fx;
	box.dy = fy;
	box.dz = fz;
	box.mapSize = n;
	box.span = options.depthSpan;
	if (changed) box.changes++;
	return changed;
}

function snap (value: number, step: number): number {
	return Math.round(value / step) * step;
}

/**
 * The light-space matrix for a box (column-major: projection × view): world points in the box land in clip space's
 * -1 to 1 on every axis, nearest the light at -1.
 */
export function igeShadowBoxMatrix (box: IgeShadowFitBox, basis: IgeShadowLightBasis, out: Float32Array | number[]): Float32Array | number[] {
	const sx = 1 / box.hx, sy = 1 / box.hy, sz = 2 / (box.z1 - box.z0);
	out[0] = basis.rx * sx;
	out[4] = basis.ry * sx;
	out[8] = basis.rz * sx;
	out[12] = -box.cx * sx;
	out[1] = basis.ux * sy;
	out[5] = basis.uy * sy;
	out[9] = basis.uz * sy;
	out[13] = -box.cy * sy;
	out[2] = basis.fx * sz;
	out[6] = basis.fy * sz;
	out[10] = basis.fz * sz;
	out[14] = -box.z0 * sz - 1;
	out[3] = 0;
	out[7] = 0;
	out[11] = 0;
	out[15] = 1;
	return out;
}
