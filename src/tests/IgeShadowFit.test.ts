/**
 * Fitting the directional shadow map to a view (IgeShadowFit, renderer.shadowFit()): every point the camera sees
 * that can take a shadow lands in the map (the corners of a top-down view, the far end of a street-level one), the
 * map is snapped to its texels, and with shadow caching it stays put while it holds the view.
 */
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import {
	type IgeShadowFitBox,
	igeFitShadowBox,
	igeShadowBoxMatrix,
	igeShadowFitBox,
	igeShadowFitStep,
	igeShadowFitVolume,
	igeShadowLightBasis
} from "@/engine/webgl/IgeShadowFit";

// The game's sun (south-west, about 51 degrees up), metres
const SUN = { x: -0.48, y: -0.78, z: -0.4 };
const MAP = 4096;
const SPAN = 799;

interface Camera { view: Float32Array; projection: Float32Array; eye: number[] }

function camera (eye: number[], target: number[], up: number[], fovDegrees: number, aspect: number, near = 0.1, far = 1000): Camera {
	const view = new IgeMatrix4().lookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], up[0], up[1], up[2]);
	const projection = new IgeMatrix4().perspective((fovDegrees * Math.PI) / 180, aspect, near, far);
	return { view: view.matrix, projection: projection.matrix, eye };
}

/** Top-down: `height` up over (x, z), north (-z) up the screen, the city spike's 50 degree lens at 16:9. */
const topDown = (x: number, z: number, height = 130) => camera([x, height, z], [x, 0, z], [0, 0, -1], 50, 16 / 9);
/** Street level: 3 m up at (x, z), looking 25 m ahead along `yaw` (0: north). */
const street = (x: number, z: number, yaw = 0) => camera([x, 3, z], [x - Math.sin(yaw) * 25, 1.5, z - Math.cos(yaw) * 25], [0, 1, 0], 60, 16 / 9);

function fit (cam: Camera, box: IgeShadowFitBox, options: { follow: boolean; slack?: number; distance?: number; minY?: number; maxY?: number }) {
	const points: number[] = [];
	const count = igeShadowFitVolume(cam.view, cam.projection, options.distance ?? Infinity, options.minY ?? 0, options.maxY ?? 25, points);
	const basis = igeShadowLightBasis(SUN);
	const changed = igeFitShadowBox(box, points, count, basis, { mapSize: MAP, depthSpan: SPAN, slack: options.slack ?? 0.15, follow: options.follow });
	const matrix = igeShadowBoxMatrix(box, basis, new Float32Array(16));
	return { changed, matrix, points, count };
}

/** Where a world point lands in the shadow map: clip space x, y, z. */
function project (m: ArrayLike<number>, x: number, y: number, z: number): number[] {
	return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

/**
 * The points the camera sees at height `y` (the ground, a roof), on a grid across the screen with its four corners
 * exactly, out to `distance` along the view.
 */
function seen (cam: Camera, y: number, distance = Infinity): number[][] {
	const inverse = new IgeMatrix4();
	inverse.matrix.set(cam.projection);
	const vp = new IgeMatrix4();
	vp.matrix.set(cam.projection);
	vp.multiply(Object.assign(new IgeMatrix4(), { matrix: cam.view }));
	const inv = vp.getInverse()!.matrix;
	const out: number[][] = [];
	for (let i = 0; i <= 8; i++) {
		for (let j = 0; j <= 8; j++) {
			const nx = -1 + i / 4, ny = -1 + j / 4;
			const unproject = (nz: number) => {
				const w = inv[3] * nx + inv[7] * ny + inv[11] * nz + inv[15];
				return [0, 1, 2].map((k) => (inv[k] * nx + inv[4 + k] * ny + inv[8 + k] * nz + inv[12 + k]) / w);
			};
			const a = unproject(-1), b = unproject(1);
			const t = (y - a[1]) / (b[1] - a[1]);
			if (!(t > 0 && t < 1)) continue;
			const p = [a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t];
			// Its depth along the view
			const v = cam.view;
			const depth = -(v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14]);
			if (depth <= distance) out.push(p);
		}
	}
	return out;
}

/** Every point inside the map, clear of its edge by `texels` (the shadow filter reads one texel round each sample). */
function expectInside (m: ArrayLike<number>, points: number[][], texels = 1) {
	let across = 0, depth = 0;
	for (const p of points) {
		const [x, y, z] = project(m, p[0], p[1], p[2]);
		across = Math.max(across, Math.abs(x), Math.abs(y));
		depth = Math.max(depth, Math.abs(z));
	}
	expect(across).toBeLessThanOrEqual(1 - (2 * texels) / MAP);
	expect(depth).toBeLessThanOrEqual(1);
}

/** The engine's old map: a square `half` each way round the camera's target, as updateLightSpaceMatrix() made it. */
function oldSquare (target: number[], half: number): Float32Array {
	const view = new IgeMatrix4().lookAt(target[0] - SUN.x * 400, target[1] - SUN.y * 400, target[2] - SUN.z * 400, target[0], target[1], target[2], 0, 1, 0);
	const projection = new IgeMatrix4().orthographic(-half, half, -half, half, 1, 800);
	return projection.multiply(view).matrix;
}

describe("Shadow fit: the light's axes", () => {
	it("match the engine's lookAt (so the fitted map is oriented as the old one)", () => {
		const b = igeShadowLightBasis(SUN);
		const m = new IgeMatrix4().lookAt(0, 0, 0, SUN.x, SUN.y, SUN.z, 0, 1, 0).matrix;
		// lookAt's rows: right, up, back along the light
		expect([m[0], m[4], m[8]].map((v, i) => v - [b.rx, b.ry, b.rz][i]).every((d) => Math.abs(d) < 1e-6)).toBe(true);
		expect([m[1], m[5], m[9]].map((v, i) => v - [b.ux, b.uy, b.uz][i]).every((d) => Math.abs(d) < 1e-6)).toBe(true);
		expect([m[2], m[6], m[10]].map((v, i) => v + [b.fx, b.fy, b.fz][i]).every((d) => Math.abs(d) < 1e-6)).toBe(true);
	});

	it("a light straight down takes x as up, as lookAt does", () => {
		const b = igeShadowLightBasis({ x: 0, y: -1, z: 0 });
		expect(Math.hypot(b.rx, b.ry, b.rz)).toBeCloseTo(1, 6);
		expect(Math.abs(b.rx * b.fx + b.ry * b.fy + b.rz * b.fz)).toBeLessThan(1e-9);
	});
});

describe("Shadow fit: what the camera sees", () => {
	it("top-down: the ground footprint and the roofs, cut to the band", () => {
		const cam = topDown(20, -45);
		const points: number[] = [];
		const count = igeShadowFitVolume(cam.view, cam.projection, Infinity, 0, 25, points);
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
		for (let i = 0; i < count; i++) {
			x0 = Math.min(x0, points[i * 3]);
			x1 = Math.max(x1, points[i * 3]);
			y0 = Math.min(y0, points[i * 3 + 1]);
			y1 = Math.max(y1, points[i * 3 + 1]);
			z0 = Math.min(z0, points[i * 3 + 2]);
			z1 = Math.max(z1, points[i * 3 + 2]);
		}
		// From 130 m up with a 50 degree lens at 16:9 the ground is 215 by 121 m
		const h = 130 * Math.tan((25 * Math.PI) / 180), w = h * (16 / 9);
		expect(x0).toBeCloseTo(20 - w, 3);
		expect(x1).toBeCloseTo(20 + w, 3);
		expect(z0).toBeCloseTo(-45 - h, 3);
		expect(z1).toBeCloseTo(-45 + h, 3);
		expect(y0).toBeCloseTo(0, 6);
		expect(y1).toBeCloseTo(25, 6);
	});

	it("street level: out to the shadow distance, not the far plane", () => {
		const cam = street(0, 0);
		const points: number[] = [];
		const count = igeShadowFitVolume(cam.view, cam.projection, 180, 0, 25, points);
		// The furthest corner's depth along the view
		const v = cam.view;
		let far = 0;
		for (let i = 0; i < count; i++) far = Math.max(far, -(v[2] * points[i * 3] + v[6] * points[i * 3 + 1] + v[10] * points[i * 3 + 2] + v[14]));
		expect(far).toBeCloseTo(180, 6);
	});

	it("nothing when the band isn't in view", () => {
		const up = camera([0, 3, 0], [0, 50, -1], [0, 0, -1], 30, 1, 0.1, 100);
		expect(igeShadowFitVolume(up.view, up.projection, Infinity, 0, 2, [])).toBe(0);
	});
});

describe("Shadow fit: every corner of the view gets shadows", () => {
	it("the old 180 m square misses a top-down view's corners; the fitted map holds them, roofs too", () => {
		const cam = topDown(20, -45);
		const ground = seen(cam, 0), roofs = seen(cam, 25);
		expect(ground.length).toBe(81);
		// The bug: a 90 m square round the target leaves the corners out, on diagonals
		const old = oldSquare([20, 0, -45], 90);
		const missed = ground.filter((p) => project(old, p[0], p[1], p[2]).slice(0, 2).some((v) => Math.abs(v) > 1));
		expect(missed.length).toBeGreaterThan(0);
		for (const follow of [true, false]) {
			const { matrix } = fit(cam, igeShadowFitBox(), { follow });
			expectInside(matrix, ground);
			expectInside(matrix, roofs);
		}
	});

	it("street level, every way the car faces: the ground and roofs out to the shadow distance", () => {
		for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 6) {
			const cam = street(100, -40, yaw);
			const { matrix } = fit(cam, igeShadowFitBox(), { follow: true, distance: 180 });
			expectInside(matrix, seen(cam, 0, 180));
			expectInside(matrix, seen(cam, 25, 180));
		}
	});

	it("a 25 m building just out of view still casts into it: its top is in the map's depth", () => {
		const cam = topDown(0, 0);
		const { matrix } = fit(cam, igeShadowFitBox(), { follow: true });
		// A ground point at the view's corner, and the roof 25 m up that shades it (back along the light)
		const ground = seen(cam, 0)[0];
		const k = -25 / SUN.y;
		const top = [ground[0] - SUN.x * k, 25, ground[2] - SUN.z * k];
		const [gx, gy] = project(matrix, ground[0], ground[1], ground[2]);
		const [tx, ty, tz] = project(matrix, top[0], top[1], top[2]);
		// Same place in the map (along the light), and inside its depth
		expect(tx).toBeCloseTo(gx, 4);
		expect(ty).toBeCloseTo(gy, 4);
		expect(tz).toBeGreaterThanOrEqual(-1);
		expect(tz).toBeLessThan(project(matrix, ground[0], ground[1], ground[2])[2]);
	});

	it("covers a box no bigger than it needs: a smaller map than the game's hand-sized 259 m square", () => {
		const { matrix } = fit(topDown(0, 0), igeShadowFitBox(), { follow: true });
		const half = 1 / Math.hypot(matrix[0], matrix[4], matrix[8]), halfY = 1 / Math.hypot(matrix[1], matrix[5], matrix[9]);
		expect(half * halfY).toBeLessThan(129.5 * 129.5);
	});
});

describe("Shadow fit: snapped to texels", () => {
	it("sizes come from a ladder of about 9% steps", () => {
		expect(igeShadowFitStep(100)).toBeGreaterThanOrEqual(100);
		expect(igeShadowFitStep(100)).toBeLessThan(100 * Math.pow(2, 1 / 8));
		const step = igeShadowFitStep(100);
		expect(igeShadowFitStep(step)).toBeCloseTo(step, 9);
	});

	it("as the camera pans, a world point keeps its place within a texel (no shimmer), the middle on the texel grid", () => {
		const box = igeShadowFitBox();
		const point = [12.345, 0, -6.789];
		let fraction: number[] | null = null;
		let hx = 0;
		for (let i = 0; i < 60; i++) {
			const { matrix } = fit(topDown(0.37 * i, -0.21 * i), box, { follow: true });
			if (i === 0) hx = box.hx;
			// (The size holds while panning over flat ground)
			expect(box.hx).toBe(hx);
			const texel = (2 * box.hx) / MAP, texelY = (2 * box.hy) / MAP;
			expect(Math.abs(box.cx / texel - Math.round(box.cx / texel))).toBeLessThan(1e-6);
			expect(Math.abs(box.cy / texelY - Math.round(box.cy / texelY))).toBeLessThan(1e-6);
			const [x, y] = project(matrix, point[0], point[1], point[2]);
			const at = [((x + 1) / 2) * MAP, ((y + 1) / 2) * MAP].map((v) => v - Math.floor(v));
			if (fraction) {
				expect(Math.abs(at[0] - fraction[0])).toBeLessThan(1e-3);
				expect(Math.abs(at[1] - fraction[1])).toBeLessThan(1e-3);
			}
			fraction = at;
		}
	});
});

describe("Shadow fit with shadow caching: stays put while it holds the view", () => {
	it("panning 100 m in 0.25 m steps: the view is always inside the map, and the map moves only now and then", () => {
		const box = igeShadowFitBox();
		let moves = 0;
		for (let i = 0; i <= 400; i++) {
			const cam = topDown(0.25 * i, 0.1 * i);
			const { changed, matrix } = fit(cam, box, { follow: false });
			if (changed) moves++;
			// Never a frame with part of the view outside the map (the old map's blink)
			expectInside(matrix, seen(cam, 0));
			expectInside(matrix, seen(cam, 25));
		}
		// With 15% room round a 120 to 215 m view, a move every 10 m or so at most
		expect(moves).toBeGreaterThan(1);
		expect(moves).toBeLessThanOrEqual(12);
	});

	it("driving round at street level: covered every frame, moves now and then", () => {
		const box = igeShadowFitBox();
		let moves = 0;
		for (let i = 0; i <= 300; i++) {
			const yaw = i * 0.01;
			const cam = street(Math.sin(yaw) * -i * 0.5, -Math.cos(yaw) * i * 0.5, yaw);
			const { changed, matrix } = fit(cam, box, { follow: false, distance: 180 });
			if (changed) moves++;
			expectInside(matrix, seen(cam, 0, 180));
		}
		expect(moves).toBeLessThan(60);
	});

	it("zooming out grows it, zooming back in shrinks it again", () => {
		const box = igeShadowFitBox();
		fit(topDown(0, 0, 60), box, { follow: false });
		const small = box.hx;
		fit(topDown(0, 0, 200), box, { follow: false });
		expect(box.hx).toBeGreaterThan(small * 2);
		fit(topDown(0, 0, 60), box, { follow: false });
		expect(box.hx).toBe(small);
	});

	it("refits when the light turns or the map changes size", () => {
		const box = igeShadowFitBox();
		const cam = topDown(0, 0);
		const points: number[] = [];
		const count = igeShadowFitVolume(cam.view, cam.projection, Infinity, 0, 25, points);
		const options = { mapSize: MAP, depthSpan: SPAN, slack: 0.15, follow: false };
		expect(igeFitShadowBox(box, points, count, igeShadowLightBasis(SUN), options)).toBe(true);
		expect(igeFitShadowBox(box, points, count, igeShadowLightBasis(SUN), options)).toBe(false);
		expect(igeFitShadowBox(box, points, count, igeShadowLightBasis({ x: -0.4, y: -0.8, z: -0.45 }), options)).toBe(true);
		expect(igeFitShadowBox(box, points, count, igeShadowLightBasis({ x: -0.4, y: -0.8, z: -0.45 }), { ...options, mapSize: 2048 })).toBe(true);
	});
});

describe("Shadow fit: depth", () => {
	it("spans at least the shadow planes' depth (the bias keeps its size) with room towards the light", () => {
		for (const follow of [true, false]) {
			const box = igeShadowFitBox();
			const { points, count } = fit(street(0, 0), box, { follow, distance: 180 });
			expect(box.z1 - box.z0).toBeGreaterThanOrEqual(SPAN);
			const b = igeShadowLightBasis(SUN);
			let d0 = Infinity, d1 = -Infinity;
			for (let i = 0; i < count; i++) {
				const d = b.fx * points[i * 3] + b.fy * points[i * 3 + 1] + b.fz * points[i * 3 + 2];
				d0 = Math.min(d0, d);
				d1 = Math.max(d1, d);
			}
			expect(d1).toBeLessThanOrEqual(box.z1);
			expect(d0 - box.z0).toBeGreaterThanOrEqual(SPAN / 4);
		}
	});

	it("the matrix maps the box's corners to clip space's corners", () => {
		const box: IgeShadowFitBox = { ...igeShadowFitBox(), valid: true, cx: 10, cy: -4, hx: 50, hy: 20, z0: -100, z1: 300 };
		const b = igeShadowLightBasis(SUN);
		const m = igeShadowBoxMatrix(box, b, new Float32Array(16));
		// The world point at the box's (+x, -y, near) corner
		const p = [0, 1, 2].map((k) => [b.rx, b.ry, b.rz][k] * 60 + [b.ux, b.uy, b.uz][k] * -24 + [b.fx, b.fy, b.fz][k] * -100);
		const [x, y, z] = project(m, p[0], p[1], p[2]);
		expect(x).toBeCloseTo(1, 5);
		expect(y).toBeCloseTo(-1, 5);
		expect(z).toBeCloseTo(-1, 5);
	});
});
