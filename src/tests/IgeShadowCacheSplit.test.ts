import {
	IgeShadowSignature,
	SHADOW_STATIC_FRAMES,
	igeShadowCasterIsStatic,
	type IgeShadowCasterState
} from "@/engine/webgl/IgeWebGlShadowManager";

const caster = (): IgeShadowCasterState & { uid: number } => ({
	_transformVersion: 0,
	_shadowSeenVersion: -1,
	_shadowStableSince: 0,
	_shadowDynamic: false,
	uid: 0
});

/** The renderer's per-frame bookkeeping for the directional pass, without a GPU. */
class CacheSim {
	cache = { valid: false, count: -1, signatureA: 0, signatureB: 0 };
	rebuilds = 0;
	dynamicDraws = 0;
	copies = 0;
	step (casters: (IgeShadowCasterState & { uid: number })[], frameId: number, skinned: Set<unknown> = new Set()) {
		const sig = new IgeShadowSignature();
		this.dynamicDraws = 0;
		this.rebuilds = 0;
		this.copies = 0;
		for (const c of casters) {
			if (igeShadowCasterIsStatic(c, frameId, skinned.has(c))) sig.add(c.uid, 1, c._transformVersion);
			else this.dynamicDraws++;
		}
		if (!this.cache.valid || !sig.matches(this.cache)) {
			this.cache = { valid: true, count: sig.count, signatureA: sig.a, signatureB: sig.b };
			this.rebuilds++;
		}
		this.copies = 1;
	}
}

describe("Shadow caster classification", () => {
	it("starts a new caster static, makes a mover dynamic, and settles it after 30 frames", () => {
		const c = caster();
		expect(igeShadowCasterIsStatic(c, 100, false)).toBe(true);
		c._transformVersion++;
		expect(igeShadowCasterIsStatic(c, 101, false)).toBe(false);
		for (let f = 102; f < 101 + SHADOW_STATIC_FRAMES; f++) expect(igeShadowCasterIsStatic(c, f, false)).toBe(false);
		expect(igeShadowCasterIsStatic(c, 101 + SHADOW_STATIC_FRAMES, false)).toBe(true);
	});

	it("never treats skinned or flagged casters as static", () => {
		const c = caster();
		expect(igeShadowCasterIsStatic(c, 500, true)).toBe(false);
		c._shadowDynamic = true;
		expect(igeShadowCasterIsStatic(c, 500, false)).toBe(false);
		c._shadowDynamic = false;
		expect(igeShadowCasterIsStatic(c, 501, false)).toBe(true);
	});
});

describe("Static shadow cache bookkeeping", () => {
	it("rebuilds only when the static set changes", () => {
		const sim = new CacheSim();
		const casters = Array.from({ length: 5 }, (_, i) => ({ ...caster(), uid: i + 1 }));
		let frame = 100;
		sim.step(casters, frame++);
		expect(sim.rebuilds).toBe(1);
		for (let i = 0; i < 10; i++) {
			sim.step(casters, frame++);
			expect(sim.rebuilds).toBe(0);
		}
		// One starts moving: leaves the static set, one rebuild
		casters[0]._transformVersion++;
		sim.step(casters, frame++);
		expect(sim.rebuilds).toBe(1);
		// Keeps moving: static set unchanged, no more rebuilds
		for (let i = 0; i < 10; i++) {
			casters[0]._transformVersion++;
			sim.step(casters, frame++);
			expect(sim.rebuilds).toBe(0);
		}
		// Settles: rejoins after 30 frames with exactly one rebuild
		let total = 0;
		for (let i = 0; i < SHADOW_STATIC_FRAMES + 5; i++) {
			sim.step(casters, frame++);
			total += sim.rebuilds;
		}
		expect(total).toBe(1);
	});

	it("draws only the dynamic casters with one moving among 1,000 static", () => {
		const sim = new CacheSim();
		const casters = Array.from({ length: 1001 }, (_, i) => ({ ...caster(), uid: i + 1 }));
		let frame = 100;
		sim.step(casters, frame++);
		const rebuildsAfter: number[] = [];
		for (let i = 0; i < 20; i++) {
			casters[1000]._transformVersion++;
			sim.step(casters, frame++);
			rebuildsAfter.push(sim.rebuilds);
			if (i > 0) {
				expect(sim.dynamicDraws).toBe(1);
				expect(sim.copies).toBe(1);
			}
		}
		// The first moving frame rebuilds once without it, then none
		expect(rebuildsAfter.reduce((a, b) => a + b, 0)).toBe(1);
	});
});
