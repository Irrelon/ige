import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeAudioControl } from "@/engine/components/audio/IgeAudioControl";
import { ige } from "@/engine/instance";
import { IgeTimeline, igeTimelineEngineAudio, igeTimelineSample, type IgeTimelineAudio } from "@/engine/timeline/IgeTimeline";
import { IgePanelTargets } from "@/engine/webgl/IgePanelTarget";
import { timeline } from "@/engine/timeline/IgeTimelineBuilder";
import {
	IGE_RECORDER_DEFAULTS, IGE_RECORDER_PRESETS, IgeRecorderEffect, igeRecorderFrame, igeRecorderHash, igeRecorderPreset,
	igeRecorderRandomDropout, igeRecorderState, igeRecorderOverscan, igeRecorderFreezeStart, igeRecorderGlitchAt, IGE_RECORDER_FREEZE_SCAN
} from "@/engine/webgl/IgeRecorderEffect";

const engine = new IgeEntity() as any;
engine.renderer = () => ({ classId: "IgeWebGlRenderer", frameId: () => 1 });
engine._bounds2d = new IgePoint2d(800, 600);
engine._tickDelta = 16;

beforeAll(() => {
	Object.defineProperty(ige, "engine", { value: engine, configurable: true, writable: true });
});

describe("recorder noise is a pure function of time", () => {
	it("hashes the same input to the same value, in [0, 1)", () => {
		for (let i = 0; i < 200; i++) {
			const v = igeRecorderHash(i);
			expect(v).toBe(igeRecorderHash(i));
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
		expect(igeRecorderHash(1)).not.toBe(igeRecorderHash(2));
	});

	it("holds still within a noise frame and changes between frames", () => {
		const s = { ...IGE_RECORDER_DEFAULTS, ...IGE_RECORDER_PRESETS.siteRecorder } as any;
		expect(igeRecorderFrame(1.0, 24)).toBe(24);
		expect(igeRecorderFrame(1.0 + 0.9 / 24, 24)).toBe(24);
		expect(igeRecorderFrame(1.0 + 1.01 / 24, 24)).toBe(25);
		const { shimmerTime: _a, ...x } = igeRecorderState(s, 1.01);
		const { shimmerTime: _b, ...y } = igeRecorderState(s, 1.03);
		expect(x).toEqual(y);
		expect(igeRecorderState(s, 2.0).flicker).not.toBe(igeRecorderState(s, 2.0 + 1 / 24).flicker);
	});

	it("gives the same state for the same time however it was reached (scrub back = same picture)", () => {
		const fx = new IgeRecorderEffect("siteRecorder");
		const seen: any[] = [];
		for (const t of [0.4, 3.2, 7.7, 3.2, 0.4, 7.7]) seen.push(fx.time(t).state());
		expect(seen[0]).toEqual(seen[4]);
		expect(seen[1]).toEqual(seen[3]);
		expect(seen[2]).toEqual(seen[5]);
	});

	it("random dropouts come from time alone, and a different seed is a different take", () => {
		const times = Array.from({ length: 400 }, (_, i) => i * 0.05);
		const a = times.map((t) => igeRecorderRandomDropout(t, 0.5, 0));
		expect(a).toEqual(times.map((t) => igeRecorderRandomDropout(t, 0.5, 0)));
		expect(a.some((v) => v > 0)).toBe(true);
		expect(a.some((v) => v === 0)).toBe(true);
		expect(a).not.toEqual(times.map((t) => igeRecorderRandomDropout(t, 0.5, 3)));
		expect(times.every((t) => igeRecorderRandomDropout(t, 0, 0) === 0)).toBe(true);
		expect(Math.max(...a)).toBeLessThan(0.6);
	});

	it("a scripted dropout wins over a smaller random one", () => {
		const s = { ...IGE_RECORDER_DEFAULTS, dropout: 0.95, dropoutRandom: 1 };
		for (let t = 0; t < 5; t += 0.07) expect(igeRecorderState(s, t).glitch).toBeGreaterThanOrEqual(0.95);
	});
});

describe("IgeRecorderEffect settings and presets", () => {
	it("ships the three presets and a game can define its own", () => {
		expect(Object.keys(IGE_RECORDER_PRESETS)).toEqual(expect.arrayContaining(["siteRecorder", "warshipCamera", "precursorMemory"]));
		const gold = new IgeRecorderEffect("precursorMemory");
		expect(gold.get("shimmer")).toBe(1);
		expect(gold.get("grain")).toBe(0);
		expect(gold.get("scanlines")).toBe(0);
		igeRecorderPreset("derelict", { grain: 0.9, tint: 0.3 });
		const own = new IgeRecorderEffect("derelict");
		expect(own.get("grain")).toBe(0.9);
		expect(own.get("contrast")).toBe(1);
		expect(() => new IgeRecorderEffect("nope")).toThrow();
	});

	it("preset() resets to the defaults first; set() ignores unknown names", () => {
		const fx = new IgeRecorderEffect("siteRecorder").set({ dropout: 1, bogus: 4 } as any);
		expect(fx.get("dropout")).toBe(1);
		expect(fx.has("bogus")).toBe(false);
		fx.preset("warshipCamera");
		expect(fx.get("dropout")).toBe(0);
		expect(fx.get("sharpen")).toBeGreaterThan(0);
	});
});

describe("timeline effect track", () => {
	it("steps, lerps and smooths a numeric setting", () => {
		const keys = (ease: any) => [{ t: 2, value: 0, ease }, { t: 4, value: 1 }];
		expect(igeTimelineSample(keys("step"), 3, "effect.dropout")).toBe(0);
		expect(igeTimelineSample(keys("linear"), 3, "effect.dropout")).toBeCloseTo(0.5);
		expect(igeTimelineSample(keys("smooth"), 2.5, "effect.dropout")).toBeCloseTo(0.15625);
		expect(igeTimelineSample(keys("linear"), 1, "effect.dropout")).toBe(0);
		expect(igeTimelineSample(keys("linear"), 9, "effect.dropout")).toBe(1);
	});

	function bound () {
		const panel = new IgePanelViewport();
		const fx = new IgeRecorderEffect("warshipCamera");
		panel.effect = fx;
		const data = timeline({ duration: 6 })
			.track("panel", (t) => t.at(0, { effect: { dropout: 0 } }).at(3.1, { effect: { dropout: 0 } }, "linear").at(3.2, { effect: { dropout: 1 } }).at(3.6, { effect: { dropout: 0 } }, "smooth").at(6, { effect: { grain: 0.5 } }))
			.build();
		const tl = new IgeTimeline(data).bind({ panel });
		return { tl, fx, panel, data };
	}

	it("sets the effect's setting and time on seek, the same every time", () => {
		const { tl, fx } = bound();
		tl.seek(3.2);
		expect(fx.get("dropout")).toBe(1);
		expect(fx.time()).toBeCloseTo(3.2);
		const at32 = fx.state();
		tl.seek(5);
		expect(fx.get("dropout")).toBe(0);
		tl.seek(3.2);
		expect(fx.state()).toEqual(at32);
		tl.seek(3.4);
		expect(fx.get("dropout")).toBeGreaterThan(0);
		expect(fx.get("dropout")).toBeLessThan(1);
	});

	it("drives the effect's time while playing, and holds it paused", () => {
		const { tl, fx } = bound();
		tl.play();
		tl.update(1000);
		expect(fx.time()).toBeCloseTo(1);
		tl.pause();
		tl.update(1000);
		expect(fx.time()).toBeCloseTo(1);
	});

	it("round-trips through toData and reports a target with no effect or an unknown setting", () => {
		const { tl, data } = bound();
		expect(new IgeTimeline(tl.toData()).toData()).toEqual(tl.toData());
		expect(data.tracks!.map((t) => t.property)).toEqual(expect.arrayContaining(["effect.dropout", "effect.grain"]));
		const none = new IgeTimeline(timeline().track("panel", (t) => t.at(0, { effect: { nonsense: 1 } })).build());
		none.bind({ panel: Object.assign(new IgePanelViewport(), {}) });
		none.apply();
		expect(() => new IgeTimeline({ tracks: [{ target: "p", property: "wibble" as any, keys: [{ t: 0, value: 1 }] }] })).toThrow();
	});
});

describe("attach whileHidden", () => {
	it("a hidden panel's scene doesn't update by default, but whileHidden keeps running", () => {
		const scene = new IgeEntity();
		const a = new IgeTimeline({ duration: 10 });
		const b = new IgeTimeline({ duration: 10 });
		a.attach(scene);
		b.attach(scene, { whileHidden: true });
		a.play();
		b.play();
		// The scene isn't updated (panel hidden): nothing runs a's behaviour
		engine._processBehaviours("preUpdate" as any, 500);
		expect(a.time()).toBe(0);
		expect(b.time()).toBeCloseTo(0.5);
		scene._processBehaviours("preUpdate" as any, 500);
		expect(a.time()).toBeCloseTo(0.5);
		b.detach();
		engine._processBehaviours("preUpdate" as any, 500);
		expect(b.time()).toBeCloseTo(0.5);
	});
});

describe("audio rate", () => {
	it("IgeAudioControl.playbackRate sets the playing node and later plays", () => {
		const control = Object.create(IgeAudioControl.prototype) as IgeAudioControl;
		(control as any)._playbackRate = 1;
		const node = { playbackRate: { value: 1 } };
		(control as any)._bufferNode = node;
		expect(control.playbackRate()).toBe(1);
		control.playbackRate(1.5);
		expect(node.playbackRate.value).toBe(1.5);
		expect(control.playbackRate()).toBe(1.5);
		control.playbackRate(1000);
		expect(control.playbackRate()).toBe(16);
	});

	it("the timeline starts sounds at its rate and changes the ones sounding when rate() changes", () => {
		const rates: number[] = [];
		const audio: IgeTimelineAudio = {
			start: (_s, o) => {
				rates.push(o.rate!);
				return { stop: () => {}, setRate: (r) => void rates.push(-r) };
			},
			length: () => 1
		};
		const tl = new IgeTimeline(timeline({ duration: 10 }).sound(0, "hum", { loop: true, end: 9 }).sound(1, "ping").build()).setAudio(audio);
		tl.rate(2).play();
		expect(rates).toEqual([2]);
		tl.rate(0.5);
		expect(rates).toEqual([2, -0.5]);
		tl.update(1000);
		// the one-shot at 1s starts at the rate
		tl.rate(1);
		expect(rates[rates.length - 1]).toBeLessThan(0);
		tl.rate(-1);
		expect(rates[rates.length - 1]).toBe(-1);
	});

	it("the engine audio passes the rate to the control and sets it on a running one", () => {
		const calls: any[] = [];
		const control = { play: () => {}, stop: () => {}, playbackRate: (r: number) => void calls.push(["rate", r]) };
		(ige as any).audio = { _ctx: {}, createAudioControl: (id: string, o: any) => (calls.push(["create", id, o.rate]), control) };
		const handle = igeTimelineEngineAudio.start("x", { offset: 0, loop: false, volume: 1, rate: 1.25 })!;
		handle.setRate!(2);
		expect(calls).toEqual([["create", "x", 1.25], ["rate", 2]]);
		delete (ige as any).audio;
	});
});

describe("overscan", () => {
	it("is no change without warp or with overscan off", () => {
		expect(igeRecorderOverscan(0, 1)).toBe(1);
		expect(igeRecorderOverscan(0.1, 0)).toBe(1);
	});

	it("scales the picture so the warped corner lands exactly on the rectangle's corner", () => {
		for (const warp of [0.025, 0.05, 0.1, 0.2]) {
			const s = igeRecorderOverscan(warp, 1);
			expect(s).toBeLessThan(1);
			// The shader: c *= s; c *= 1 + warp * dot(c, c); sampled at the corner (1, 1)
			const cx = s;
			const bulge = 1 + warp * (cx * cx * 2);
			expect(cx * bulge).toBeCloseTo(1, 6);
			// Nothing else in the rectangle samples outside the picture: check the edge and a diagonal
			for (let i = 0; i <= 20; i++) {
				const x = i / 10 - 1;
				for (const y of [-1, -0.5, 0, 0.5, 1]) {
					const px = x * s * (1 + warp * s * s * (x * x + y * y));
					expect(Math.abs(px)).toBeLessThanOrEqual(1 + 1e-9);
				}
			}
		}
	});

	it("goes part of the way for an amount between 0 and 1, and the warping presets have it on", () => {
		const full = igeRecorderOverscan(0.1, 1);
		expect(igeRecorderOverscan(0.1, 0.5)).toBeCloseTo((1 + full) / 2, 9);
		for (const name of Object.keys(IGE_RECORDER_PRESETS)) {
			const p = IGE_RECORDER_PRESETS[name];
			if ((p.warp ?? 0) > 0) expect(p.overscan).toBe(1);
		}
	});
});

describe("freeze rule", () => {
	const settings = (extra: Record<string, number> = {}) => ({ ...IGE_RECORDER_DEFAULTS, freeze: 0.5, ...extra });
	// A dropout that ramps from 0 at 3.1 s to 1 at 3.2 s, falls to 0.55 at 3.55 and to 0 at 3.9
	const dropoutAt = (t: number) => (t < 3.1 ? 0 : t < 3.2 ? (t - 3.1) / 0.1 : t < 3.55 ? 1 - ((t - 3.2) / 0.35) * 0.45 : t < 3.9 ? 0.55 : 0);

	it("is off with freeze 0 and not frozen below the threshold", () => {
		expect(igeRecorderFreezeStart(settings({ freeze: 0 }), 3.3, dropoutAt)).toBeNull();
		expect(igeRecorderFreezeStart(settings(), 3.0, dropoutAt)).toBeNull();
		expect(igeRecorderFreezeStart(settings(), 4.0, dropoutAt)).toBeNull();
	});

	it("holds the last good noise frame before the dropout crossed the threshold, the same all through the freeze", () => {
		const s = settings();
		const start = igeRecorderFreezeStart(s, 3.3, dropoutAt)!;
		expect(start).not.toBeNull();
		// The frame at `start` was good, the next was frozen
		expect(dropoutAt(start)).toBeLessThan(0.5);
		expect(dropoutAt(start + 1 / 24)).toBeGreaterThanOrEqual(0.5);
		for (let t = 3.2; t < 3.9; t += 0.013) expect(igeRecorderFreezeStart(s, t, dropoutAt)).toBe(start);
		// Quantised to noise frames
		expect(igeRecorderFrame(start, 24) / 24).toBeCloseTo(start, 9);
	});

	it("looks back no further than the scan limit and holds frame 0 when frozen from the start", () => {
		expect(igeRecorderFreezeStart(settings(), 2, () => 1)).toBe(0);
		const far = igeRecorderFreezeStart(settings(), 100, () => 1)!;
		expect(far).toBeCloseTo((100 * 24 - IGE_RECORDER_FREEZE_SCAN) / 24, 6);
	});

	it("counts the random dropouts too, at their level", () => {
		const s = settings({ freeze: 0.3, dropoutRandom: 1, seed: 3 });
		let found = 0;
		for (let t = 0; t < 30; t += 1 / 24) {
			const frozen = igeRecorderFreezeStart(s, t) !== null;
			expect(frozen).toBe(igeRecorderGlitchAt(s, igeRecorderFrame(t, 24) / 24) >= 0.3);
			if (frozen) found++;
		}
		expect(found).toBeGreaterThan(0);
	});
});

describe("freeze through a timeline: playing into it and seeking into it hold the same frame", () => {
	function scene () {
		const ring = new IgeEntity();
		const panel = new IgePanelViewport({ left: 0, top: 0, width: 100, height: 100 });
		const effect = new IgeRecorderEffect({ freeze: 0.5 });
		panel.effect = effect;
		const data = timeline({ duration: 8 })
			.track("ring", (t) => t.at(0, { position: { x: 0, y: 0, z: 0 } }).at(8, { position: { x: 800, y: 0, z: 0 } }))
			.track("panel", (t) =>
				t.at(0, { effect: { dropout: 0 } }).at(3.1, { effect: { dropout: 0 } }).at(3.2, { effect: { dropout: 1 } }).at(4.2, { effect: { dropout: 0 } }))
			.build();
		const tl = new IgeTimeline(data).setAudio({ start: () => null }).bind({ ring, panel });
		return { ring, panel, effect, tl };
	}
	const source = (effect: IgeRecorderEffect) => ({ history: {}, historyKey: null as number | null, color: {}, width: 1, height: 1, depth: null, captureHistory: () => undefined }) as any;

	it("asks to draw the scene at the same moment, and draws it with the scene at that moment, either way", () => {
		// Played into the freeze, a frame at a time
		const a = scene();
		a.tl.play();
		let t = 0;
		while (t < 3.4) {
			a.tl.update(1000 / 60);
			t += 1 / 60;
		}
		const srcA = source(a.effect);
		const reqA = a.effect.historyRequest(srcA)!;
		expect(reqA).not.toBeNull();
		let seenA = -1;
		const timeBefore = a.tl.time();
		reqA.renderAt(() => (seenA = a.ring._translate.x));
		expect(a.ring._translate.x).toBeCloseTo((timeBefore / 8) * 800, 6); // set back afterwards
		expect(a.tl.time()).toBe(timeBefore);

		// Seeked straight in, at another time inside the freeze
		const b = scene();
		b.tl.seek(3.6);
		const srcB = source(b.effect);
		const reqB = b.effect.historyRequest(srcB)!;
		let seenB = -1;
		reqB.renderAt(() => (seenB = b.ring._translate.x));

		expect(reqB.time).toBe(reqA.time);
		expect(reqB.key).toBe(reqA.key);
		expect(seenB).toBe(seenA);
		expect(seenA).toBeCloseTo((reqA.time / 8) * 800, 6);
		// The hold is the moment the dropout crossed the threshold (about 3.15 s), not the moment of the seek
		expect(reqA.time).toBeGreaterThan(3.0);
		expect(reqA.time).toBeLessThan(3.2);
	});

	it("asks once: when the history holds that frame there is nothing more to do, and not at all before or after the freeze", () => {
		const { effect, tl } = scene();
		tl.seek(3.6);
		const src = source(effect);
		const req = effect.historyRequest(src)!;
		src.historyKey = req.key;
		expect(effect.historyRequest(src)).toBeNull();
		tl.seek(3.8);
		expect(effect.historyRequest(src)).toBeNull();
		tl.seek(5);
		expect(effect.freezeState().frozen).toBe(false);
		expect(effect.historyRequest(src)).toBeNull();
		// A second freeze somewhere else would need its own frame
		src.historyKey = 0.5;
		tl.seek(3.6);
		expect(effect.historyRequest(src)).not.toBeNull();
	});

	it("does not set the scene's captions or events off when it draws another moment", () => {
		const { tl, effect } = scene();
		const seen: unknown[] = [];
		tl.on("captions", (c: unknown) => void seen.push(c));
		tl.seek(3.6);
		const n = seen.length;
		effect.historyRequest(source(effect))!.renderAt(() => undefined);
		expect(seen.length).toBe(n);
	});

	it("needs no history and no request when freeze is off", () => {
		const { effect, tl } = scene();
		effect.set({ freeze: 0 });
		tl.seek(3.6);
		expect(effect.history()).toBe(false);
		expect(effect.historyRequest(source(effect))).toBeNull();
	});
});

describe("history frame lifecycle", () => {
	function device () {
		let made = 0;
		let freed = 0;
		const d: any = {
			limits: { maxSamples: 4 }, copies: 0,
			live: () => made - freed,
			createTexture: (desc: any) => (made++, { kind: "texture", ...desc }),
			destroyTexture: () => void freed++,
			copyTextureToTexture: () => void d.copies++,
			resolveTexture: () => undefined
		};
		return d;
	}

	it("makes no extra texture unless an effect wants history, frees it when it stops and with the target", () => {
		const d = device();
		const targets = new IgePanelTargets(d);
		const panel = {};
		const plain = targets.ensure(panel, 64, 36, false, 4, false);
		const base = d.live();
		expect(plain.history).toBeNull();
		const withHistory = targets.ensure(panel, 64, 36, false, 4, true);
		expect(withHistory).toBe(plain);
		expect(withHistory.history).not.toBeNull();
		expect(d.live()).toBe(base + 1);
		withHistory.historyKey = 3;
		targets.ensure(panel, 64, 36, false, 4, false);
		expect(plain.history).toBeNull();
		expect(d.live()).toBe(base);
		targets.ensure(panel, 64, 36, false, 4, true);
		targets.free(panel);
		expect(d.live()).toBe(0);
	});

	it("rebuilds it, empty, when the panel resizes, and after context loss", () => {
		const d = device();
		const targets = new IgePanelTargets(d);
		const panel = {};
		const a = targets.ensure(panel, 64, 36, false, 4, true);
		a.historyKey = 1.5;
		const b = targets.ensure(panel, 128, 72, false, 4, true);
		expect(b).not.toBe(a);
		expect(b.history!.width).toBe(128);
		expect(b.historyKey).toBeNull();
		expect(d.live()).toBe(b.multisampled ? 4 : 3);
		targets.contextLost();
		const c = targets.ensure(panel, 128, 72, false, 4, true);
		expect(c.historyKey).toBeNull();
		expect(c.history).not.toBe(b.history);
	});

	it("copies the resolved colour into the history on capture, only when there is one", () => {
		const d = device();
		const targets = new IgePanelTargets(d);
		const t = targets.ensure({}, 32, 32, false, 4, false);
		t.captureHistory();
		expect(d.copies).toBe(0);
		const u = targets.ensure({}, 32, 32, false, 4, true);
		u.captureHistory();
		expect(d.copies).toBe(1);
	});

	it("with no timeline, keeps the picture while it's good (the live fallback) and holds it when it isn't", () => {
		const effect = new IgeRecorderEffect({ freeze: 0.5 });
		expect(effect.source).toBeUndefined();
		const src: any = { history: {}, historyKey: null, color: {}, captureHistory: () => undefined, width: 2, height: 2, depth: null };
		expect(effect.historyRequest(src)).toBeNull();
		expect(effect.freezeState()).toEqual({ frozen: false, start: null });
		effect.set({ dropout: 0.9 });
		expect(effect.freezeState()).toEqual({ frozen: true, start: null });
	});
});
