import { IGE_DR, IgeDynamicResolution } from "@/engine/webgl/IgeDynamicResolution";
import { IgeWebGlPostProcess } from "@/engine/webgl/IgeWebGlPostProcess";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";

/** A controller on a 120 Hz display (8.33 ms) that has seen enough rAF frames. */
function controller (settings = {}, refresh = 1000 / 120) {
	const c = new IgeDynamicResolution({ enabled: true, ...settings });
	for (let i = 0; i < 40; i++) c.rafSample(i * refresh);
	return c;
}

/**
 * Runs frames of a scene that costs `cost(scale)` ms and returns the scale after each second. A frame takes as long
 * as its cost, rounded up to whole vsyncs.
 */
const clocks = new WeakMap<IgeDynamicResolution, number>();
function run (c: IgeDynamicResolution, seconds: number, cost: (scale: number) => number, opts: { refresh?: number; capMs?: number; gpu?: boolean } = {}) {
	const refresh = opts.refresh ?? 1000 / 120;
	let now = clocks.get(c) ?? 10000;
	const scales: number[] = [];
	let next = now + 1000;
	const end = now + seconds * 1000;
	while (now < end) {
		const ms = cost(c.scale);
		c.frame({ now, gpuMs: opts.gpu ? ms : null, capMs: opts.capMs });
		now += Math.max(opts.capMs ?? 0, Math.ceil(ms / refresh - 1e-9) * refresh);
		if (now >= next) {
			scales.push(c.scale);
			next += 1000;
		}
	}
	clocks.set(c, now);
	return scales;
}

describe("dynamic resolution controller", () => {
	it("estimates the refresh interval from rAF timestamps (median, ignoring stalls)", () => {
		const c = new IgeDynamicResolution({ enabled: true });
		expect(c.refreshMs).toBe(0);
		let t = 0;
		for (let i = 0; i < 40; i++) c.rafSample((t += i % 10 === 3 ? 33 : 16.7));
		expect(c.refreshMs).toBeCloseTo(16.7, 1);
		c.rafSample(t + 5000);
		expect(c.refreshMs).toBeCloseTo(16.7, 1);
	});

	it("does nothing until it knows the refresh interval, or when off", () => {
		const c = new IgeDynamicResolution({ enabled: true });
		expect(run(c, 3, () => 30).every((s) => s === 1)).toBe(true);
		const off = controller({ enabled: false });
		expect(run(off, 3, () => 30).every((s) => s === 1)).toBe(true);
	});

	it("steps down under misses, about 10% a step, at most every 0.5 s", () => {
		const c = controller();
		// Costs 16.7 ms at full scale (two vsyncs): always missing; cost falls with the area
		const scales = run(c, 4, (s) => 16.7 * s * s);
		expect(scales[0]).toBeLessThan(1);
		expect(scales[0]).toBeGreaterThanOrEqual(0.8);
		// (Over four seconds at most eight steps)
		expect(1 - scales[3]).toBeGreaterThan(0.1);
		const ladder = [1, 0.9, 0.81, 0.729, 0.67];
		for (const s of scales) expect(ladder.some((l) => Math.abs(l - s) < 0.002)).toBe(true);
	});

	it("steps up when there's headroom, after 2 s without a miss", () => {
		const c = controller({ minScale: 0.5 });
		// Heavy for a while, then light
		run(c, 5, () => 16.7);
		const low = c.scale;
		expect(low).toBeLessThan(1);
		const scales = run(c, 20, () => 4);
		expect(scales[0]).toBe(low);
		expect(scales[scales.length - 1]).toBe(1);
		// One step per 2 s at most
		for (let i = 1; i < scales.length; i++) expect(scales[i - 1] - scales[i]).toBeLessThanOrEqual(0);
	});

	it("doesn't oscillate on a steady scene that only fits below some scale", () => {
		const c = controller();
		// Fits (8 ms) at 0.81 and under, misses (two vsyncs) above
		const scales = run(c, 120, (s) => (s > 0.82 ? 12 : 7));
		let changes = 0;
		for (let i = 1; i < scales.length; i++) if (scales[i] !== scales[i - 1]) changes++;
		expect(scales[scales.length - 1]).toBeLessThanOrEqual(0.82);
		// Early steps down, then retries only after the lockouts (30 s, 60 s)
		expect(changes).toBeLessThanOrEqual(10);
		const settled = scales.slice(-30);
		expect(new Set(settled).size).toBeLessThanOrEqual(2);
	});

	it("holds still on a steady scene that fits", () => {
		const c = controller();
		expect(new Set(run(c, 30, () => 5)).size).toBe(1);
	});

	it("respects min and max", () => {
		const c = controller({ minScale: 0.7, maxScale: 0.9 });
		expect(c.scale).toBe(0.9);
		const down = run(c, 30, () => 30);
		expect(Math.min(...down)).toBeCloseTo(0.7, 5);
		const up = run(c, 30, () => 2);
		expect(Math.max(...up)).toBeCloseTo(0.9, 5);
	});

	it("uses the frame cap's interval as the budget when it's longer", () => {
		const c = controller();
		expect(c.budgetMs(0)).toBeCloseTo(8.33, 1);
		expect(c.budgetMs(50)).toBe(50);
		// 20 fps cap: frames 50 ms apart are on budget, so no steps down
		expect(run(c, 6, () => 20, { capMs: 50 }).every((s) => s === 1)).toBe(true);
		// 8.33 ms uncapped: frames 50 ms apart miss
		const d = controller();
		expect(run(d, 3, () => 50)[2]).toBeLessThan(1);
	});

	it("takes the GPU's time into account: a frame over the budget steps down even when the interval hides it; no step up when the next wouldn't fit", () => {
		const c = controller({ minScale: 0.5 });
		// Frames land on vsync (8.33 ms) but the GPU needs 8.2 ms (over 95%)
		const down = run(c, 4, (s) => 8.2 * s * s, { gpu: true });
		expect(down[3]).toBeLessThan(1);
		// GPU at 6.9 ms now: the next step up would cost 6.9 / 0.81 = 8.5 ms: stays
		const d = controller({ minScale: 0.5 });
		run(d, 3, (s) => 8.2 * s * s, { gpu: true });
		const at = d.scale;
		const hold = run(d, 20, (s) => (s === at ? 6.5 : 8.5), { gpu: true });
		expect(new Set(hold).size).toBe(1);
	});

	it("ignores intervals of on-demand frames and idle stalls", () => {
		const c = controller();
		let now = 1000;
		for (let i = 0; i < 50; i++) {
			c.frame({ now, continuous: false });
			now += 200;
		}
		expect(c.scale).toBe(1);
		const d = controller();
		for (let i = 0; i < 50; i++) {
			d.frame({ now, continuous: true });
			now += 2000;
		}
		expect(d.scale).toBe(1);
	});

	it("keeps its scale as near as it can when the range changes, and starts at full when turned on", () => {
		const c = controller({ minScale: 0.5 });
		run(c, 4, () => 20);
		const s = c.scale;
		c.configure({ minScale: 0.4 });
		expect(Math.abs(c.scale - s)).toBeLessThan(0.06);
		c.configure({ enabled: false });
		c.configure({ enabled: true });
		expect(c.scale).toBe(1);
		expect(IGE_DR.step).toBe(0.9);
	});
});

function recordingDevice () {
	let n = 0;
	const gl = new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "checkFramebufferStatus") return () => 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4;
			if (prop === "getShaderParameter" || prop === "getProgramParameter") return () => true;
			if (prop === "getUniformLocation") return (_p: unknown, name: string) => name;
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
	const device = new IgeWebGl2GpuDevice(gl);
	const sizes: string[] = [];
	const create = device.createTexture.bind(device);
	device.createTexture = (d) => {
		sizes.push(`${d.width}x${d.height}`);
		return create(d);
	};
	return { device, sizes };
}

describe("render scale", () => {
	it("sizes the offscreen target by the scale and reuses it until the scale changes", () => {
		const { device, sizes } = recordingDevice();
		const post = new IgeWebGlPostProcess(device, { enabled: true, bloom: 0 });
		post.renderScale = 0.5;
		expect(post.begin(1600, 1000)).toBe(true);
		expect(post.targetSize).toEqual({ width: 800, height: 500 });
		post.end();
		const made = sizes.length;
		post.begin(1600, 1000);
		post.end();
		expect(sizes.length).toBe(made);
		post.renderScale = 0.9;
		post.begin(1600, 1000);
		expect(post.targetSize).toEqual({ width: 1440, height: 900 });
		expect(sizes.length).toBeGreaterThan(made);
	});

	it("goes offscreen below 1 even with post-processing off, and not at 1", () => {
		const { device } = recordingDevice();
		const post = new IgeWebGlPostProcess(device, { enabled: false });
		expect(post.begin(1000, 600)).toBe(false);
		post.renderScale = 0.67;
		expect(post.begin(1000, 600)).toBe(true);
		expect(post.targetSize).toEqual({ width: 670, height: 402 });
		post.end();
		post.renderScale = 1;
		expect(post.begin(1000, 600)).toBe(false);
	});

	it("the renderer draws views into the scaled target, and the UI layer and outlines at the canvas's resolution", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._devicePixelRatio = 2;
		r._frameScale = 0.5;
		r._inPanel = false;
		const calls: number[][] = [];
		r._uiPass = { draw: (_q: unknown, x: number, y: number, w: number, h: number, dpr: number) => (calls.push([x, y, w, h, dpr]), 1) };
		r._textureManager = { getDefaultWhiteTexture: () => ({}) };
		r._stateManager = { reset: () => undefined };
		r._stats = { drawCalls: 0 };
		r._frameId = 3;
		r._uiQuad = () => ({});
		const viewport = { _scene: {}, _translate: { x: 10, y: 20 } };
		r._sceneData = new WeakMap([[viewport._scene, { ui: [{}], uiSettings: [{}] }]]);
		r._uiViews = new WeakMap([[viewport, { width: 400, height: 300, frameId: 3 }]]);
		r._uiQuads = [];
		r._canvasContext = new Proxy({}, { get: () => () => undefined });
		r._renderUiLayer([viewport]);
		// CSS-pixel view size and the canvas's own ratio: the scene's scale doesn't touch it
		expect(calls).toEqual([[20, 40, 400, 300, 2]]);
	});

	it("reads and sets the fixed scale, and the dynamic range", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		r._fixedScale = 1;
		r._dynamicRes = new IgeDynamicResolution();
		expect(r.renderScale()).toBe(1);
		r.renderScale(0.7);
		expect(r.renderScale()).toBe(0.7);
		r.renderScale(5);
		expect(r.renderScale()).toBe(1);
		r._startRefreshSampling = () => undefined;
		r.dynamicResolution({ enabled: true, minScale: 0.6 });
		expect(r.dynamicResolution()).toEqual({ enabled: true, minScale: 0.6, maxScale: 1 });
		// Fixed scale is ignored while dynamic is on
		r.renderScale(0.5);
		expect(r.renderScale()).toBe(1);
	});
});
