/**
 * 3D transforms on the engine's UI as a browser draws them: each element is
 * still a flat plane, but turned in 3D and seen through its parent's
 * `perspective` (from `perspective-origin`), so a card turning over narrows
 * towards its far edge and a die is a cube of six faces.
 *
 * - An element's transform is a 4x4 matrix (rotateX/Y, rotate3d,
 *   translateZ/3d, scaleZ/3d, perspective(), matrix3d() and the 2D ones),
 *   about its transform-origin (x, y and z).
 * - Its parent's perspective is applied before it; a parent with
 *   `transform-style: preserve-3d` passes its own 3D transform on to its
 *   children (they share its 3D space: a die's faces round its middle);
 *   any other flattens them into its plane.
 * - What's drawn of each element is its plane seen on the screen: a
 *   projective 2D transform (IgeCssMatrix with a third row), which the
 *   renderer hands the GPU with w, so what's across it (gradients, text,
 *   corners) is interpolated perspective-correctly.
 * - `backface-visibility: hidden`: an element whose back is turned to the
 *   viewer isn't drawn (a card's face from behind, a die's far faces), as
 *   Chrome decides it (the sign of the transformed normal's z).
 * - Inside a preserve-3d context, its planes are drawn farthest first (by
 *   their middles), whatever their z-index or order, as a browser sorts
 *   them. Planes that cut through each other aren't split.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeCssMatrix, type IgeCssMatrix2d, IDENTITY, multiply, parseTransform, resolveAngle, resolveLength, resolveNumber } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiBox } from "@/engine/ui2/layout/IgeUiBox";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

/** A 4x4 matrix, column by column as matrix3d() lists it: m[col * 4 + row]. */
export type IgeUiMat4 = number[];

const I4 = (): IgeUiMat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function mul4 (a: IgeUiMat4, b: IgeUiMat4): IgeUiMat4 {
	const out = new Array<number>(16);
	for (let c = 0; c < 4; c++) {
		for (let r = 0; r < 4; r++) {
			out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
		}
	}
	return out;
}

const translate4 = (x: number, y: number, z: number): IgeUiMat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

/** A 2D transform as a 4x4. */
export function from2d (m: IgeCssMatrix2d): IgeUiMat4 {
	return [m[0], m[1], 0, 0, m[2], m[3], 0, 0, 0, 0, 1, 0, m[4], m[5], 0, 1];
}

/** Whether a 4x4 is only a 2D transform (nothing in or out of the screen, no perspective). */
export function is2d (m: IgeUiMat4): boolean {
	const z = (v: number) => Math.abs(v) < 1e-9;
	return z(m[2]) && z(m[3]) && z(m[6]) && z(m[7]) && z(m[8]) && z(m[9]) && z(m[11]) && z(m[14]) && Math.abs(m[10] - 1) < 1e-9 && Math.abs(m[15] - 1) < 1e-9;
}

/**
 * The plane z = 0 through a 4x4, seen on the screen: a projective 2D transform (rows x, y and w of its x, y and
 * translation columns); a plain 2D one when there's no perspective in it.
 */
export function flatten (m: IgeUiMat4): IgeCssMatrix {
	const [a, b, c, d, e, f, g, h, i] = [m[0], m[1], m[4], m[5], m[12], m[13], m[3], m[7], m[15]];
	if (Math.abs(g) < 1e-12 && Math.abs(h) < 1e-12) return [a / i, b / i, c / i, d / i, e / i, f / i];
	return [a, b, c, d, e, f, g, h, i];
}

function det3 (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): number {
	return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function det4 (m: IgeUiMat4): number {
	// (Along the first column)
	const M = (r: number, c: number) => m[c * 4 + r];
	let out = 0;
	for (let r = 0; r < 4; r++) {
		const rows = [0, 1, 2, 3].filter((k) => k !== r);
		const minor = det3(M(rows[0], 1), M(rows[0], 2), M(rows[0], 3), M(rows[1], 1), M(rows[1], 2), M(rows[1], 3), M(rows[2], 1), M(rows[2], 2), M(rows[2], 3));
		out += (r % 2 ? -1 : 1) * M(r, 0) * minor;
	}
	return out;
}

/** Whether a plane through this transform shows its back (Chrome's test: the transformed normal's z, by the inverse's (3, 3) cofactor). */
export function backFacing (m: IgeUiMat4): boolean {
	const det = det4(m);
	if (Math.abs(det) < 1e-12) return false;
	const cofactor = det3(m[0], m[4], m[12], m[1], m[5], m[13], m[3], m[7], m[15]);
	return cofactor * det < -1e-9;
}

/** A projective 2D transform's inverse (undefined when it has none). */
export function invert3 (m: IgeCssMatrix): IgeCssMatrix | undefined {
	const p = m as number[];
	const [a, b, c, d, e, f, g = 0, h = 0, i = 1] = p;
	// (Rows [a c e], [b d f], [g h i])
	const A = d * i - f * h, B = -(b * i - f * g), C = b * h - d * g;
	const det = a * A + c * B + e * C;
	if (Math.abs(det) < 1e-12) return undefined;
	const k = 1 / det;
	const r00 = A * k, r01 = -(c * i - e * h) * k, r02 = (c * f - e * d) * k;
	const r10 = B * k, r11 = (a * i - e * g) * k, r12 = -(a * f - e * b) * k;
	const r20 = C * k, r21 = -(a * h - c * g) * k, r22 = (a * d - c * b) * k;
	return [r00, r10, r01, r11, r02, r12, r20, r21, r22];
}

/** A point through a (projective) 2D transform; undefined if it's behind the eye. */
export function project (m: IgeCssMatrix, x: number, y: number): [number, number] | undefined {
	const p = m as number[];
	const w = p.length > 6 ? p[6] * x + p[7] * y + p[8] : 1;
	if (w <= 1e-9) return undefined;
	return [(m[0] * x + m[2] * y + m[4]) / w, (m[1] * x + m[3] * y + m[5]) / w];
}

const DEG = Math.PI / 180;

function rotation (x: number, y: number, z: number, rad: number): IgeUiMat4 {
	const len = Math.hypot(x, y, z);
	if (len < 1e-12) return I4();
	const [ux, uy, uz] = [x / len, y / len, z / len];
	const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c;
	// (Column by column)
	return [
		t * ux * ux + c, t * ux * uy + s * uz, t * ux * uz - s * uy, 0,
		t * ux * uy - s * uz, t * uy * uy + c, t * uy * uz + s * ux, 0,
		t * ux * uz + s * uy, t * uy * uz - s * ux, t * uz * uz + c, 0,
		0, 0, 0, 1
	];
}

const FUNCTIONS_3D = /(translatez|translate3d|scalez|scale3d|rotatex|rotatey|rotate3d|perspective|matrix3d)\s*\(/i;

type LenCtx = Parameters<typeof resolveLength>[1];

/**
 * A transform list as a 4x4 (percentages of the box's width and height), when it has 3D functions in it; undefined
 * when it has none (the 2D transform is all there is).
 */
export function parseTransform3d (value: string, width: number, height: number, ctx: LenCtx): IgeUiMat4 | undefined {
	const v = value.trim();
	if (!v || v === "none" || !FUNCTIONS_3D.test(v)) return undefined;
	let m = I4();
	const re = /([a-zA-Z0-9]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
	for (let f = re.exec(v); f; f = re.exec(v)) {
		const name = f[1].toLowerCase();
		const args = splitTop(f[2], ",").flatMap((a) => splitTop(a.trim(), " ")).map((a) => a.trim()).filter(Boolean);
		const len = (a: string | undefined, percent: number) => resolveLength(a ?? "0", { ...ctx, percent }) ?? 0;
		const num = (a: string | undefined, fallback: number) => (a === undefined ? fallback : resolveNumber(a) ?? fallback);
		const ang = (a: string | undefined) => (resolveAngle(a ?? "0") ?? 0) * DEG;
		let n: IgeUiMat4;
		switch (name) {
			case "translatez": n = translate4(0, 0, len(args[0], 0)); break;
			case "translate3d": n = translate4(len(args[0], width), len(args[1], height), len(args[2], 0)); break;
			case "scalez": n = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, num(args[0], 1), 0, 0, 0, 0, 1]; break;
			case "scale3d": n = [num(args[0], 1), 0, 0, 0, 0, num(args[1], 1), 0, 0, 0, 0, num(args[2], 1), 0, 0, 0, 0, 1]; break;
			case "rotatex": n = rotation(1, 0, 0, ang(args[0])); break;
			case "rotatey": n = rotation(0, 1, 0, ang(args[0])); break;
			case "rotate3d": n = rotation(num(args[0], 0), num(args[1], 0), num(args[2], 0), ang(args[3])); break;
			case "perspective": {
				const d = len(args[0], 0);
				n = I4();
				if (d > 0) n[11] = -1 / d;
				break;
			}
			case "matrix3d": {
				const k = args.map(Number);
				n = k.length === 16 && k.every(Number.isFinite) ? k : I4();
				break;
			}
			default: {
				// The 2D ones as they are
				const t = parseTransform(f[0], width, height, ctx);
				n = t ? from2d(t) : I4();
			}
		}
		m = mul4(m, n);
	}
	return is2d(m) ? undefined : m;
}

/** A box's own 3D transform, if it has one (not just a 2D one), with the move IgeUiRoot.placeAt gave its element. */
export function boxTransform3d (b: IgeUiBox, ctx: LenCtx): IgeUiMat4 | undefined {
	const tf = styleValue(b.style, "transform");
	if (!b.transform || !tf || tf === "none" || !FUNCTIONS_3D.test(tf)) return undefined;
	const m = parseTransform3d(tf, b.borderW, b.borderH, ctx);
	const place = !b.pseudo ? b.el?._place : undefined;
	if (m && place) {
		m[12] += place[0];
		m[13] += place[1];
	}
	return m;
}

/** transform-style: preserve-3d, unless something about it flattens it (a clip, opacity, a filter, a blend), as CSS has it. */
export function preserves3d (b: IgeUiBox): boolean {
	const s = b.style;
	if (styleValue(s, "transform-style") !== "preserve-3d") return false;
	if (styleValue(s, "overflow-x") !== "visible" || styleValue(s, "overflow-y") !== "visible") return false;
	if ((resolveNumber(styleValue(s, "opacity")) ?? 1) < 1) return false;
	if (styleValue(s, "filter") !== "none" || styleValue(s, "clip-path") !== "none") return false;
	if ((styleValue(s, "mix-blend-mode") || "normal") !== "normal" || styleValue(s, "isolation") === "isolate") return false;
	return true;
}

/** A position (perspective-origin, transform-origin): keywords, percentages or lengths along a size. */
function along (t: string | undefined, size: number, ctx: LenCtx): number {
	if (!t || t === "center") return size / 2;
	if (t === "left" || t === "top") return 0;
	if (t === "right" || t === "bottom") return size;
	return resolveLength(t, { ...ctx, percent: size }) ?? size / 2;
}

/** The perspective a box gives its children (its corner at x, y), about its perspective-origin; undefined for none. */
export function perspectiveOf (b: IgeUiBox, x: number, y: number, ctx: LenCtx): IgeUiMat4 | undefined {
	const p = styleValue(b.style, "perspective");
	if (!p || p === "none") return undefined;
	const d = resolveLength(p, ctx) ?? 0;
	if (!(d > 0)) return undefined;
	let o = splitTop((styleValue(b.style, "perspective-origin") || "50% 50%").trim(), " ").filter(Boolean);
	if (o.length === 1) o = [o[0], "center"];
	if (o[0] === "top" || o[0] === "bottom" || o[1] === "left" || o[1] === "right") o = [o[1], o[0]];
	const ox = x + along(o[0], b.borderW, ctx), oy = y + along(o[1], b.borderH, ctx);
	const persp = I4();
	persp[11] = -1 / d;
	return mul4(mul4(translate4(ox, oy, 0), persp), translate4(-ox, -oy, 0));
}

/** Where a box's children are in 3D: what their plane's drawn through, and what of it they carry on. */
export interface IgeUi3dState {
	/** Their plane (absolute UI px) on the screen, when they're flat in it. */
	matrix?: IgeCssMatrix;
	/** In a preserve-3d parent: its 3D transform (to its 3D context's plane, from absolute UI px), and that plane on the screen. */
	m4?: IgeUiMat4;
	root?: IgeCssMatrix;
	/** Their parent's perspective (absolute UI px), if it has one. */
	persp?: IgeUiMat4;
}

/** Whether a box needs the 3D path (it's in a preserve-3d parent, turns in 3D, or keeps 3D for its children). */
export function needs3d (b: IgeUiBox, st: IgeUi3dState, ctx: LenCtx): boolean {
	return !!st.m4 || preserves3d(b) || !!boxTransform3d(b, ctx);
}

/**
 * A box entered in 3D, its corner at (x, y) (absolute UI px) and its transform-origin `origin` from there: its plane
 * on the screen (`matrix`), that plane against the one round it (`rel`: what a clip round it is brought through),
 * whether its back is turned and hidden, and what its children get.
 */
export function enter3d (b: IgeUiBox, x: number, y: number, origin: [number, number], st: IgeUi3dState, ctx: LenCtx): { matrix: IgeCssMatrix; rel: IgeCssMatrix; hidden: boolean; children: IgeUi3dState; a: IgeUiMat4 } {
	const t3 = boxTransform3d(b, ctx);
	const oz = resolveLength(splitTop(styleValue(b.style, "transform-origin").trim(), " ").filter(Boolean)[2] ?? "0", ctx) ?? 0;
	const ox = x + origin[0], oy = y + origin[1];
	const own = t3 ?? (b.transform ? from2d(b.transform) : undefined);
	const local = own ? mul4(mul4(translate4(ox, oy, oz), own), translate4(-ox, -oy, -oz)) : I4();
	const a = mul4(mul4(st.m4 ?? I4(), st.persp ?? I4()), local);
	const plane = st.m4 ? st.root ?? IDENTITY : st.matrix ?? IDENTITY;
	const rel = flatten(a);
	const matrix = multiply(plane, rel);
	const hidden = styleValue(b.style, "backface-visibility") === "hidden" && backFacing(a);
	const persp = perspectiveOf(b, x, y, ctx);
	const children: IgeUi3dState = preserves3d(b) ? { m4: a, root: plane, persp } : { matrix, persp };
	return { matrix, rel, hidden, children, a };
}

/**
 * How near a box's plane is in its 3D context (its middle through its 3D transform: larger is nearer the viewer), for
 * drawing a preserve-3d context's planes farthest first; 0 for a box with no 3D on or round it.
 */
export function planeDepth (b: IgeUiBox, x: number, y: number, origin: [number, number], st: IgeUi3dState, ctx: LenCtx): number {
	if (!needs3d(b, st, ctx)) return 0;
	const a = enter3d(b, x, y, origin, st, ctx).a;
	const cx = x + b.borderW / 2, cy = y + b.borderH / 2;
	const z = a[2] * cx + a[6] * cy + a[14], w = a[3] * cx + a[7] * cy + a[15];
	return Math.abs(w) > 1e-9 ? z / w : z;
}

/**
 * A box's border box (x, y, w, h: absolute UI px) on the screen when there's 3D on it or round it: the box round
 * its corners as they're seen (getBoundingClientRect); undefined when it's all 2D (the caller's own path).
 * `origin`: a box's transform-origin from its corner.
 */
export function projectedBox (b: IgeUiBox, x: number, y: number, w: number, h: number, origin: (p: IgeUiBox) => [number, number], ctx: (p: IgeUiBox) => LenCtx): [number, number, number, number] | undefined {
	const chain: IgeUiBox[] = [];
	for (let p: IgeUiBox | null = b; p; p = p.parent) chain.unshift(p);
	if (!chain.some((p) => (p.transform && boxTransform3d(p, ctx(p))) || preserves3d(p))) return undefined;
	let st: IgeUi3dState = {};
	let m: IgeCssMatrix | undefined;
	for (const p of chain) {
		const r = enter3d(p, p.ax, p.ay, origin(p), st, ctx(p));
		m = r.matrix;
		st = r.children;
	}
	if (!m) return undefined;
	const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => project(m!, px, py));
	if (pts.some((p) => !p)) return undefined;
	const xs = pts.map((p) => p![0]), ys = pts.map((p) => p![1]);
	const x0 = Math.min(...xs), y0 = Math.min(...ys);
	return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
}
