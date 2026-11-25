import { IgeEntity } from "@/engine/core/IgeEntity";
import { igeEffectNow, igeEffectTime } from "@/engine/webgl/IgeEffectTime";
import { IGE_LENS_EINSTEIN, IgeLens, igeLensRingRadius, igeLensScreen, igeLensSource } from "@/engine/webgl/IgeLens";
import {
	IGE_PHASE_DEFAULTS, IGE_PHASE_SHADOW_CUTOFF, IgePhaseEffect, igePhaseApply, igePhaseCount, igePhaseHash, igePhaseOf, igePhaseRipple, igePhaseSolid
} from "@/engine/webgl/IgePhase";
import { phaseFragmentShader } from "@/engine/shaders/webgl/phase.frag";

/** The share of `samples` moments across 600 s (at 100 per second) that `f(t)` calls solid (above 0.9). */
function solidShare (flicker: number, seed = 0, speed = 1): number {
	let solid = 0, n = 0;
	for (let t = 0; t < 600; t += 0.01) {
		if (igePhaseSolid(t, flicker, speed, seed) > 0.9) solid++;
		n++;
	}
	return solid / n;
}

describe("phase effect: flicker and ripple are pure functions of time", () => {
	it("the same input gives the same output, in any order", () => {
		const times = [0, 0.13, 1.7, 42.42, 1000.01, 7.77];
		const first = times.map((t) => igePhaseSolid(t, 0.6, 1, 3));
		const again = [...times].reverse().map((t) => igePhaseSolid(t, 0.6, 1, 3)).reverse();
		expect(again).toEqual(first);
		expect(igePhaseRipple(3.3, 1, 1, 0.4)).toBe(igePhaseRipple(3.3, 1, 1, 0.4));
		expect(igePhaseHash(5, 2)).toBe(igePhaseHash(5, 2));
	});

	it("no flicker never goes solid; the solid share grows with the setting; always within 0..1", () => {
		expect(solidShare(0)).toBe(0);
		const low = solidShare(0.2), mid = solidShare(0.5), high = solidShare(1);
		expect(low).toBeGreaterThan(0.005);
		expect(mid).toBeGreaterThan(low);
		expect(high).toBeGreaterThan(mid);
		// A third of the cells at most, and each is solid for about half its length
		expect(high).toBeLessThan(0.34);
		expect(high).toBeGreaterThan(0.08);
		for (let t = 0; t < 50; t += 0.037) {
			const v = igePhaseSolid(t, 1, 1, 9);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
	});

	it("another seed is another pattern; a faster speed has more, shorter flickers", () => {
		const a: number[] = [], b: number[] = [];
		for (let t = 0; t < 30; t += 0.05) { a.push(igePhaseSolid(t, 0.8, 1, 1)); b.push(igePhaseSolid(t, 0.8, 1, 2)); }
		expect(a).not.toEqual(b);
		const runs = (speed: number) => {
			let n = 0, was = false;
			for (let t = 0; t < 300; t += 0.01) { const on = igePhaseSolid(t, 1, speed, 0) > 0.5; if (on && !was) n++; was = on; }
			return n;
		};
		expect(runs(2)).toBeGreaterThan(runs(1) * 1.5);
	});

	it("the ripple stays in 0..1, moves with time, and differs by channel", () => {
		for (let c = 0; c < 3; c++) for (let t = 0; t < 20; t += 0.3) {
			const v = igePhaseRipple(t, 1, c, 0.37);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
		expect(igePhaseRipple(0, 1, 0, 0.2)).not.toBeCloseTo(igePhaseRipple(2, 1, 0, 0.2), 3);
		expect(igePhaseRipple(1, 1, 0, 0.2)).not.toBeCloseTo(igePhaseRipple(1, 1, 1, 0.2), 3);
		expect(igePhaseRipple(0, 0, 2, 0.2)).toBe(igePhaseRipple(50, 0, 2, 0.2));
	});
});

describe("phase effect on entities", () => {
	it("sets, reads and clears, and a held time wins over the clock", () => {
		const e = new IgeEntity();
		expect(e.phase()).toBeNull();
		const before = igePhaseCount();
		e.phase({ amount: 0.7, flicker: 0.4, edgeColor: { r: 1, g: 0, b: 0 } });
		expect(igePhaseCount()).toBe(before + 1);
		const fx = e.phase()!;
		expect(fx.settings.amount).toBe(0.7);
		expect(fx.settings.edgeR).toBe(1);
		expect(fx.settings.opacity).toBe(IGE_PHASE_DEFAULTS.opacity);
		igeEffectTime(12);
		expect(fx.now()).toBe(12);
		fx.time(3.5);
		expect(fx.now()).toBe(3.5);
		fx.time(null);
		expect(fx.now()).toBe(12);
		igeEffectTime(null);
		expect(igeEffectNow()).toBeGreaterThanOrEqual(0);
		e.phase(null);
		expect(e.phase()).toBeNull();
		expect(igePhaseCount()).toBe(before);
	});

	it("goes to the children and is the nearest ancestor's; ghostliness is the amount less the flicker's solidity", () => {
		const root = new IgeEntity(), parent = new IgeEntity(), child = new IgeEntity();
		parent._parent = root;
		child._parent = parent;
		parent.phase({ amount: 0.8, flicker: 0, time: 5 });
		expect(igePhaseOf(child)).toBe(parent.phase());
		expect(igePhaseOf(root)).toBeNull();
		expect(parent.phase()!.ghostliness()).toBeCloseTo(0.8);
		const fx = new IgePhaseEffect({ amount: 1, flicker: 1, seed: 4 });
		let t = 0;
		while (igePhaseSolid(t, 1, 1, 4) < 0.99) t += 0.01;
		expect(fx.ghostliness(t)).toBeLessThan(0.02);
		parent.phase(null);
	});

	it("the renderer's hook: a phased item turns transparent, drawn depth first, and casts no shadow while mostly out of phase", () => {
		const e = new IgeEntity();
		const item = { entity: e, transparent: false, depthPrepass: false, castShadow: true } as any;
		igePhaseApply(item);
		expect(item.phase).toBeNull();
		expect(item.transparent).toBe(false);
		e.phase({ amount: 0.9, flicker: 0, time: 1 });
		igePhaseApply(item);
		expect(item.phase).toBe(e.phase());
		expect(item.transparent).toBe(true);
		expect(item.depthPrepass).toBe(true);
		expect(item.castShadow).toBe(false);
		// Only a little out of phase: still casts
		e.phase({ amount: IGE_PHASE_SHADOW_CUTOFF - 0.1 });
		const item2 = { entity: e, transparent: false, castShadow: true } as any;
		igePhaseApply(item2);
		expect(item2.castShadow).toBe(true);
		// Cleared: the pooled item is clean again
		e.phase(null);
		igePhaseApply(item);
		expect(item.phase).toBeNull();
	});

	it("timeline hooks: set by name, has, and unknown names are refused", () => {
		const fx = new IgePhaseEffect();
		expect(fx.has("amount")).toBe(true);
		expect(fx.has("nope")).toBe(false);
		fx.set({ amount: 0.5, nope: 3 } as never);
		expect(fx.settings.amount).toBe(0.5);
		expect((fx.settings as unknown as Record<string, number>).nope).toBeUndefined();
	});

	it("the phase shader keeps lit's own main as litMain and adds its own", () => {
		expect(phaseFragmentShader).toContain("void litMain()");
		expect(phaseFragmentShader.match(/void main\(\)/g)).toHaveLength(1);
	});
});

describe("lensing maths", () => {
	it("leaves the picture alone at and beyond the radius, and pulls it in inside", () => {
		expect(igeLensSource(100, 100, 1)).toBeCloseTo(100);
		expect(igeLensSource(250, 100, 1)).toBeCloseTo(250);
		for (const d of [10, 30, 50, 70, 90]) expect(igeLensSource(d, 100, 0.6)).toBeLessThan(d);
		expect(igeLensSource(40, 100, 0)).toBeCloseTo(40);
	});

	it("is continuous across the edge and stronger lenses pull more", () => {
		let last = igeLensSource(20, 100, 0.8);
		for (let d = 20.5; d <= 130; d += 0.5) {
			const s = igeLensSource(d, 100, 0.8);
			expect(Math.abs(s - last)).toBeLessThan(25);
			last = s;
		}
		expect(igeLensSource(60, 100, 1)).toBeLessThan(igeLensSource(60, 100, 0.4));
	});

	it("the ring sits where the picture comes from the centre (strength 1: the Einstein radius)", () => {
		const r = igeLensRingRadius(100, 1);
		expect(r).toBeCloseTo(IGE_LENS_EINSTEIN * 100);
		expect(igeLensSource(r, 100, 1)).toBeCloseTo(0, 0);
		expect(igeLensRingRadius(100, 100)).toBeLessThanOrEqual(90);
		expect(igeLensRingRadius(100, 0)).toBe(0);
	});

	it("places a lens on screen: centre and radius in pixels, null when behind or off the view", () => {
		// An orthographic camera looking down -z, 1 world unit = 1 pixel on an 800 x 600 view
		const m = [2 / 800, 0, 0, 0, 0, 2 / 600, 0, 0, 0, 0, -0.001, 0, 0, 0, 0, 1];
		const view = { x0: 0, y0: 0, x1: 800, y1: 600 };
		const s = igeLensScreen({ x: 100, y: -50, z: 0, radius: 40 }, m, { x: 1, y: 0, z: 0 }, view)!;
		expect(s.x).toBeCloseTo(500);
		expect(s.y).toBeCloseTo(250);
		expect(s.radius).toBeCloseTo(40);
		expect(igeLensScreen({ x: 5000, y: 0, z: 0, radius: 40 }, m, { x: 1, y: 0, z: 0 }, view)).toBeNull();
		// Each view places it by its own camera: a split-screen half
		const half = { x0: 400, y0: 0, x1: 800, y1: 600 };
		const h = igeLensScreen({ x: 100, y: -50, z: 0, radius: 40 }, m, { x: 1, y: 0, z: 0 }, half)!;
		expect(h.x).toBeCloseTo(400 + (0.5 + 100 / 800) * 400);
		expect(h.radius).toBeCloseTo(20);
		// A perspective camera with the lens behind it
		const f = 1;
		const persp = [f, 0, 0, 0, 0, f, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0];
		expect(igeLensScreen({ x: 0, y: 0, z: 10, radius: 5 }, persp, { x: 1, y: 0, z: 0 }, view)).toBeNull();
		expect(igeLensScreen({ x: 0, y: 0, z: -10, radius: 5 }, persp, { x: 1, y: 0, z: 0 }, view)).not.toBeNull();
	});

	it("a lens: settings by name, colour, which viewports, time; active only when it bends or has a core", () => {
		const lens = new IgeLens({ x: 1, radius: 50, ringColor: { r: 1, g: 0, b: 0 }, viewports: ["a"] });
		expect(lens.settings.x).toBe(1);
		expect(lens.settings.ringR).toBe(1);
		expect(lens.viewports).toEqual(["a"]);
		expect(lens.active()).toBe(false);
		lens.set({ strength: 0.5 });
		expect(lens.active()).toBe(true);
		lens.set({ strength: 0, core: 0.2 });
		expect(lens.active()).toBe(true);
		expect(lens.has("strength")).toBe(true);
		expect(lens.has("ringColor")).toBe(false);
		lens.time(7);
		expect(lens.now()).toBe(7);
	});
});
