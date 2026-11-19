import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeAudioControl } from "@/engine/components/audio/IgeAudioControl";
import { ige } from "@/engine/instance";
import { IgeTimeline, igeTimelineEngineAudio, igeTimelineSample, type IgeTimelineAudio } from "@/engine/timeline/IgeTimeline";
import { timeline } from "@/engine/timeline/IgeTimelineBuilder";
import {
	IGE_RECORDER_DEFAULTS, IGE_RECORDER_PRESETS, IgeRecorderEffect, igeRecorderFrame, igeRecorderHash, igeRecorderPreset,
	igeRecorderRandomDropout, igeRecorderState
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
