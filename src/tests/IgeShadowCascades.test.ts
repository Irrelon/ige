/**
 * Cascaded shadow maps (renderer.shadowCascades(), IgeShadowFit's cascade maths): the view's depth split into slices
 * that meet, each slice's box holding everything the camera sees in it (and the blend from the slice before) inside
 * its tile, snapped to that tile's texels; the slices collapsing to one map for a view looking down.
 */
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import {
	IGE_SHADOW_CASCADE_DEFAULTS,
	IGE_SHADOW_FIT_DEFAULTS,
	type IgeShadowCascadeSlice,
	igeFitShadowBox,
	igeProjectionDepthRange,
	igeShadowBoxMatrix,
	igeShadowCascadeSlices,
	igeShadowCascadeSplits,
	igeShadowCascadeTile,
	igeShadowFitBox,
	igeShadowFitExtent,
	igeShadowFitVolume,
	igeShadowLightBasis
} from "@/engine/webgl/IgeShadowFit";

// The game's sun, metres; a 4096 map in 2048 tiles
const SUN = { x: -0.48, y: -0.78, z: -0.4 };
const TILE = 2048;
const SPAN = 799;

interface Camera { view: Float32Array; projection: Float32Array }

function camera (eye: number[], target: number[], up: number[], fovDegrees: number, aspect: number, near = 0.1, far = 1000): Camera {
	const view = new IgeMatrix4().lookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], up[0], up[1], up[2]);
	const projection = new IgeMatrix4().perspective((fovDegrees * Math.PI) / 180, aspect, near, far);
	return { view: view.matrix, projection: projection.matrix };
}

/** Street level: 3 m up, looking 25 m ahead along `yaw`. */
const street = (x: number, z: number, yaw = 0) => camera([x, 3, z], [x - Math.sin(yaw) * 25, 1.5, z - Math.cos(yaw) * 25], [0, 1, 0], 60, 16 / 9);
/** Top-down from `height`. */
const topDown = (x: number, z: number, height = 130) => camera([x, height, z], [x, 0, z], [0, 0, -1], 50, 16 / 9);

const depthOf = (v: ArrayLike<number>, p: number[]) => -(v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14]);

/** Ground and roof points the camera sees, on a grid across the screen (its corners exactly), out to `distance`. */
function seen (cam: Camera, distance: number): number[][] {
	const vp = new IgeMatrix4();
	vp.matrix.set(cam.projection);
	vp.multiply(Object.assign(new IgeMatrix4(), { matrix: cam.view }));
	const inv = vp.getInverse()!.matrix;
	const out: number[][] = [];
	for (const y of [0, 25]) {
		for (let i = 0; i <= 16; i++) {
			for (let j = 0; j <= 16; j++) {
				const nx = -1 + i / 8, ny = -1 + j / 8;
				const at = (nz: number) => {
					const w = inv[3] * nx + inv[7] * ny + inv[11] * nz + inv[15];
					return [0, 1, 2].map((k) => (inv[k] * nx + inv[4 + k] * ny + inv[8 + k] * nz + inv[12 + k]) / w);
				};
				const a = at(-1), b = at(1), t = (y - a[1]) / (b[1] - a[1]);
				if (!(t > 0 && t < 1)) continue;
				const p = [a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t];
				if (depthOf(cam.view, p) <= distance) out.push(p);
			}
		}
	}
	return out;
}

/** Each slice's box, fitted as the renderer fits it (in a 2048 tile). */
function fitCascades (cam: Camera, slices: IgeShadowCascadeSlice[], count: number, boxes = slices.map(() => igeShadowFitBox()), follow = true) {
	const basis = igeShadowLightBasis(SUN);
	return slices.slice(0, count).map((slice, k) => {
		const points: number[] = [];
		const n = igeShadowFitVolume(cam.view, cam.projection, slice.end, 0, 25, points, 0, slice.from);
		igeFitShadowBox(boxes[k], points, n, basis, { mapSize: TILE, depthSpan: SPAN, slack: 0.15, follow });
		return { box: boxes[k], matrix: igeShadowBoxMatrix(boxes[k], basis, new Float32Array(16)) };
	});
}

/** The shader's choice: the first slice that ends beyond the depth (the last takes the rest). */
const cascadeAt = (slices: IgeShadowCascadeSlice[], count: number, depth: number) => {
	for (let k = 0; k < count - 1; k++) if (depth < slices[k].end) return k;
	return count - 1;
};

const clip = (m: ArrayLike<number>, p: number[]) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);

describe("Shadow cascades: defaults", () => {
	it("fitting is on by default with auto distance and heights; one cascade unless asked", () => {
		expect(IGE_SHADOW_FIT_DEFAULTS).toMatchObject({ enabled: true, distance: "auto", minY: "auto", maxY: "auto" });
		expect(IGE_SHADOW_CASCADE_DEFAULTS.count).toBe(1);
	});
});

describe("Shadow cascades: where the slices end", () => {
	it("lambda 0 is even steps, 1 logarithmic; the last always ends at far; they rise", () => {
		expect(igeShadowCascadeSplits(10, 100, 3, 0)).toEqual([40, 70, 100]);
		const log = igeShadowCascadeSplits(1, 1000, 3, 1);
		expect(log[0]).toBeCloseTo(10, 6);
		expect(log[1]).toBeCloseTo(100, 6);
		expect(log[2]).toBe(1000);
		const mixed = igeShadowCascadeSplits(0.1, 180, 4, 0.8);
		for (let i = 1; i < mixed.length; i++) expect(mixed[i]).toBeGreaterThan(mixed[i - 1]);
		expect(mixed[3]).toBe(180);
		// Between the two
		const even = igeShadowCascadeSplits(0.1, 180, 4, 0), logs = igeShadowCascadeSplits(0.1, 180, 4, 1);
		for (let i = 0; i < 3; i++) {
			expect(mixed[i]).toBeGreaterThan(logs[i]);
			expect(mixed[i]).toBeLessThan(even[i]);
		}
	});

	it("reads a projection's near and far planes, perspective and orthographic", () => {
		expect(igeProjectionDepthRange(new IgeMatrix4().perspective(1, 1.5, 0.5, 900).matrix).near).toBeCloseTo(0.5, 4);
		expect(igeProjectionDepthRange(new IgeMatrix4().perspective(1, 1.5, 0.5, 900).matrix).far).toBeCloseTo(900, 1);
		const ortho = igeProjectionDepthRange(new IgeMatrix4().orthographic(-10, 10, -10, 10, 2, 300).matrix);
		expect(ortho.near).toBeCloseTo(2, 4);
		expect(ortho.far).toBeCloseTo(300, 2);
	});

	it("tiles: the whole map for one, a 2 x 2 grid of half-size tiles for more", () => {
		expect(igeShadowCascadeTile(0, 1)).toEqual([0, 0, 1, 1]);
		expect([0, 1, 2, 3].map((i) => igeShadowCascadeTile(i, 4))).toEqual([[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]);
	});

	it("a volume from a depth to a depth: every corner between the two", () => {
		const cam = street(0, 0);
		const points: number[] = [];
		const n = igeShadowFitVolume(cam.view, cam.projection, 60, 0, 25, points, 0, 20);
		expect(n).toBeGreaterThan(0);
		for (let i = 0; i < n; i++) {
			const d = depthOf(cam.view, [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]]);
			expect(d).toBeGreaterThanOrEqual(20 - 1e-6);
			expect(d).toBeLessThanOrEqual(60 + 1e-6);
		}
		// Beyond the far plane: nothing
		expect(igeShadowFitVolume(cam.view, cam.projection, 5000, 0, 25, points, 0, 2000)).toBe(0);
	});
});

describe("Shadow cascades: street level", () => {
	const settings = { count: 3, lambda: 0.8, blend: 0.1 };

	it("three slices that meet, the near one far smaller across than the whole view", () => {
		const cam = street(0, 0);
		const slices: IgeShadowCascadeSlice[] = [];
		const used = igeShadowCascadeSlices(cam.view, cam.projection, 180, 0, 25, settings, slices);
		expect(used).toBe(3);
		expect(slices[0].start).toBeCloseTo(0.1, 6);
		expect(slices[1].start).toBe(slices[0].end);
		expect(slices[2].start).toBe(slices[1].end);
		expect(slices[2].end).toBe(180);
		// The blend reaches back into the slice before
		expect(slices[1].from).toBeCloseTo(slices[1].start - 0.1 * (slices[0].end - slices[0].start), 6);
		// The near slice: about 13 m deep, under a tenth of the whole view's width across the light
		expect(slices[0].end).toBeGreaterThan(8);
		expect(slices[0].end).toBeLessThan(20);
		const basis = igeShadowLightBasis(SUN);
		const near: number[] = [], all: number[] = [];
		const nNear = igeShadowFitVolume(cam.view, cam.projection, slices[0].end, 0, 25, near, 0, slices[0].start);
		const nAll = igeShadowFitVolume(cam.view, cam.projection, 180, 0, 25, all);
		expect(igeShadowFitExtent(near, nNear, basis) / igeShadowFitExtent(all, nAll, basis)).toBeLessThan(0.15);
	});

	it("every point the camera sees lands inside its cascade's box (and the next one's, in the blend), clear of the tile's edge, every way the car faces", () => {
		for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 6) {
			const cam = street(13, -40, yaw);
			const slices: IgeShadowCascadeSlice[] = [];
			const used = igeShadowCascadeSlices(cam.view, cam.projection, 180, 0, 25, settings, slices);
			const cascades = fitCascades(cam, slices, used);
			for (const p of seen(cam, 180)) {
				const d = depthOf(cam.view, p), k = cascadeAt(slices, used, d);
				const [x, y, z] = clip(cascades[k].matrix, p);
				// (Two texels clear: the 3 x 3 filter reads one round each sample)
				expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(1 - 2 / TILE);
				expect(Math.abs(z)).toBeLessThanOrEqual(1);
				// In the far part of its slice it fades into the next: that box holds it too
				if (k < used - 1 && d > slices[k].end - settings.blend * (slices[k].end - slices[k].start)) {
					const [nx, ny] = clip(cascades[k + 1].matrix, p);
					expect(Math.max(Math.abs(nx), Math.abs(ny))).toBeLessThanOrEqual(1);
				}
			}
		}
	});

	it("near shadows are much finer than one map's: texels across the nearest tile against the whole 4096 map", () => {
		const cam = street(0, 0);
		const slices: IgeShadowCascadeSlice[] = [];
		const used = igeShadowCascadeSlices(cam.view, cam.projection, 180, 0, 25, settings, slices);
		const [near] = fitCascades(cam, slices, used);
		const basis = igeShadowLightBasis(SUN);
		const all: number[] = [], whole = igeShadowFitBox();
		igeFitShadowBox(whole, all, igeShadowFitVolume(cam.view, cam.projection, 180, 0, 25, all), basis, { mapSize: TILE * 2, depthSpan: SPAN, slack: 0.15, follow: true });
		const texelNear = (2 * Math.max(near.box.hx, near.box.hy)) / TILE, texelWhole = (2 * Math.max(whole.hx, whole.hy)) / (TILE * 2);
		expect(texelNear * 5).toBeLessThan(texelWhole);
	});

	it("each tile's middle is on its own texel grid as the camera moves (no shimmer)", () => {
		const boxes = [0, 1, 2].map(() => igeShadowFitBox());
		for (let i = 0; i < 40; i++) {
			const cam = street(0.37 * i, -0.53 * i);
			const slices: IgeShadowCascadeSlice[] = [];
			const used = igeShadowCascadeSlices(cam.view, cam.projection, 180, 0, 25, settings, slices);
			for (const { box } of fitCascades(cam, slices, used, boxes)) {
				const tx = (2 * box.hx) / TILE, ty = (2 * box.hy) / TILE;
				expect(Math.abs(box.cx / tx - Math.round(box.cx / tx))).toBeLessThan(1e-6);
				expect(Math.abs(box.cy / ty - Math.round(box.cy / ty))).toBeLessThan(1e-6);
			}
		}
	});

	it("with shadow caching, each tile stays put while its slice is inside it, and still holds everything", () => {
		const boxes = [0, 1, 2].map(() => igeShadowFitBox());
		const moves = [0, 0, 0];
		const last: number[][] = [[], [], []];
		for (let i = 0; i < 200; i++) {
			const cam = street(0, -0.25 * i);
			const slices: IgeShadowCascadeSlice[] = [];
			const used = igeShadowCascadeSlices(cam.view, cam.projection, 180, 0, 25, settings, slices);
			const cascades = fitCascades(cam, slices, used, boxes, false);
			cascades.forEach(({ box }, k) => {
				const now = [box.cx, box.cy, box.hx, box.hy];
				if (last[k].length && now.some((v, j) => v !== last[k][j])) moves[k]++;
				last[k] = now;
			});
			for (const p of seen(cam, 180)) {
				const k = cascadeAt(slices, used, depthOf(cam.view, p));
				const [x, y] = clip(cascades[k].matrix, p);
				expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(1);
			}
		}
		// 50 m driven: the near tile (about 30 m) moves now and then, the far one hardly ever
		expect(moves[0]).toBeGreaterThan(0);
		expect(moves[0]).toBeLessThan(40);
		expect(moves[2]).toBeLessThanOrEqual(moves[0]);
	});
});

describe("Shadow cascades: looking down", () => {
	it("top-down, the slices before the ground have nothing in them and are folded into the one that has: no split", () => {
		const cam = topDown(0, 0);
		const slices: IgeShadowCascadeSlice[] = [];
		expect(igeShadowCascadeSlices(cam.view, cam.projection, 259, 0, 25, { count: 4, lambda: 0.8, blend: 0.1 }, slices)).toBe(1);
		expect(slices[0].start).toBeCloseTo(0.1, 6);
	});

	it("a low top-down camera: the nearest slice with anything is nearly as wide as the view (the renderer keeps the whole map)", () => {
		const cam = topDown(0, 0, 34);
		const slices: IgeShadowCascadeSlice[] = [];
		const used = igeShadowCascadeSlices(cam.view, cam.projection, 120, 0, 25, { count: 4, lambda: 0.8, blend: 0.1 }, slices);
		const basis = igeShadowLightBasis(SUN);
		if (used > 1) {
			const near: number[] = [], all: number[] = [];
			const a = igeShadowFitExtent(near, igeShadowFitVolume(cam.view, cam.projection, slices[0].end, 0, 25, near, 0, slices[0].start), basis);
			const b = igeShadowFitExtent(all, igeShadowFitVolume(cam.view, cam.projection, 120, 0, 25, all), basis);
			// (The renderer splits only below 0.4)
			expect(a / b).toBeGreaterThan(0.4);
		}
	});
});
