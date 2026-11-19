import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeSkeletalAnimationComponent } from "@/engine/components/IgeSkeletalAnimationComponent";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeTimeline, igeTimelineSample, type IgeTimelineAudio } from "@/engine/timeline/IgeTimeline";
import { timeline } from "@/engine/timeline/IgeTimelineBuilder";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import type { IgeAnimationClipData } from "@/types/IgeAnimationClipData";

const at = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const SKELETON = {
	id: "tl-body",
	name: "body",
	bones: [
		{ name: "Hips", index: 0, parentIndex: -1, childIndices: [1], localBindTransform: at(0, 1, 0), inverseBindMatrix: at(0, 0, 0) },
		{ name: "Leg", index: 1, parentIndex: 0, childIndices: [], localBindTransform: at(0, -0.5, 0), inverseBindMatrix: at(0, 0, 0) }
	],
	rootBoneIndices: [0],
	boneCount: 2
} as unknown as IgeSkeletonData;
/** The leg moves forward (z) from 0 to 1 over 2 seconds. */
const SWING: IgeAnimationClipData = {
	id: "swing",
	name: "swing",
	duration: 2,
	samplers: [{ input: new Float32Array([0, 2]), output: new Float32Array([0, -0.5, 0, 0, -0.5, 1]), interpolation: "LINEAR", componentCount: 3 }],
	channels: [{ samplerIndex: 0, targetBoneIndex: 1, targetPath: "translation" }]
};

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager: new IgeWebGlSkeletonManager() }), _bounds2d: new IgePoint2d(800, 600), _tickDelta: 16, _currentTime: 0, _tickStart: 0 },
		configurable: true,
		writable: true
	});
});

/** A sound recorder standing in for the engine's audio. */
function fakeAudio (lengths: Record<string, number> = {}) {
	const log: string[] = [];
	const audio: IgeTimelineAudio = {
		start: (source, o) => {
			log.push(`start ${source}@${o.offset.toFixed(2)}${o.loop ? " loop" : ""}`);
			return { stop: () => void log.push(`stop ${source}`) };
		},
		length: (source) => lengths[source]
	};
	return { audio, log };
}

const state = (e: IgeEntity) => ({ p: [e._translate.x, e._translate.y, e._translate.z], hidden: e._hidden, opacity: e._opacity });

function scene () {
	const ring = new IgeEntity();
	const data = timeline({ duration: 6 })
		.track("ring", (t) =>
			t
				.at(0, { position: { x: 0, y: 0, z: 0 }, visible: false, opacity: 0 }, "linear")
				.at(1, { visible: true })
				.at(2, { position: { x: 100, y: 20, z: 0 }, opacity: 1 }, "smooth")
				.at(4, { position: { x: 100, y: 20, z: 80 } }, "step")
				.at(5, { position: { x: 0, y: 0, z: 0 } })
		)
		.caption(0.5, 2, "Foreman", "Did you hear that?")
		.caption(1.5, 3, undefined, "Static.")
		.event(1, "sparks", { at: "hatch" })
		.event(3, "boom")
		.sound(1.2, "ping")
		.build();
	return { ring, data };
}

describe("igeTimelineSample", () => {
	const keys = [
		{ t: 1, value: 10, ease: "linear" as const },
		{ t: 3, value: 30, ease: "smooth" as const },
		{ t: 5, value: 50, ease: "step" as const },
		{ t: 6, value: 0 }
	];

	it("holds the first value before and the last after", () => {
		expect(igeTimelineSample(keys, 0)).toBe(10);
		expect(igeTimelineSample(keys, 9)).toBe(0);
	});

	it("moves linearly, smoothly and by step between keys", () => {
		expect(igeTimelineSample(keys, 2)).toBe(20);
		// halfway through a smooth segment is the middle; a quarter in is under a quarter of the way
		expect(igeTimelineSample(keys, 4)).toBe(40);
		const quarter = igeTimelineSample([{ t: 0, value: 0, ease: "smooth" }, { t: 4, value: 100 }], 1) as number;
		expect(quarter).toBeCloseTo(15.625, 5);
		expect(igeTimelineSample(keys, 5.9)).toBe(50);
	});

	it("moves vectors and slerps quaternions the short way", () => {
		expect(igeTimelineSample([{ t: 0, value: { x: 0, y: 10, z: 0 } }, { t: 2, value: { x: 10, y: 20, z: 0 } }], 1)).toEqual({ x: 5, y: 15, z: 0 });
		const h = Math.SQRT1_2;
		const q = igeTimelineSample([{ t: 0, value: { x: 0, y: 0, z: 0, w: 1 } }, { t: 1, value: { x: 0, y: h, z: 0, w: h } }], 0.5, "quaternion") as any;
		expect(q.y).toBeCloseTo(Math.sin(Math.PI / 8), 5);
		expect(q.w).toBeCloseTo(Math.cos(Math.PI / 8), 5);
		// the other sign of the same rotation goes the short way round
		const r = igeTimelineSample([{ t: 0, value: { x: 0, y: 0, z: 0, w: 1 } }, { t: 1, value: { x: 0, y: -h, z: 0, w: -h } }], 0.5, "quaternion") as any;
		expect(r.w).toBeGreaterThan(0.9);
	});

	it("steps values that aren't numbers", () => {
		expect(igeTimelineSample([{ t: 0, value: true }, { t: 1, value: false }], 0.5)).toBe(true);
		expect(igeTimelineSample([{ t: 0, value: "main" }, { t: 1, value: "wide" }], 1)).toBe("wide");
	});
});

describe("IgeTimeline: seek and play land on the same picture", () => {
	it("shows the same state at t whether reached by play, seek forward or seek back", () => {
		const { ring, data } = scene();
		const played = new IgeTimeline(data).bind("ring", ring).setAudio(fakeAudio().audio);
		const states: Record<string, ReturnType<typeof state>> = {};
		const reached: Record<string, number> = {};
		const times = [0.5, 1, 1.7, 2, 3.2, 4, 4.5, 5.5];
		played.play();
		let t = 0;
		for (const target of times) {
			while (t < target - 1e-9) {
				const step = Math.min(0.1, target - t);
				played.update(step * 1000);
				t += step;
			}
			states[target] = state(ring);
			expect(played.time()).toBeCloseTo(target, 6);
			reached[target] = played.time();
		}

		const sought = new IgeTimeline(data).bind("ring", ring);
		for (const target of times) {
			sought.seek(reached[target]);
			expect(state(ring)).toEqual(states[target]);
		}
		for (const target of [...times].reverse()) {
			sought.seek(reached[target]);
			expect(state(ring)).toEqual(states[target]);
		}
	});

	it("applies every track kind at t", () => {
		const { ring, data } = scene();
		const tl = new IgeTimeline(data).bind({ ring });
		tl.seek(0);
		expect(state(ring)).toEqual({ p: [0, 0, 0], hidden: true, opacity: 0 });
		tl.seek(2);
		expect(state(ring)).toEqual({ p: [100, 20, 0], hidden: false, opacity: 1 });
		tl.seek(3);
		expect(state(ring).p).toEqual([100, 20, 40]);
		tl.seek(4.5);
		expect(state(ring).p).toEqual([100, 20, 80]);
	});

	it("clamps, wraps when looping, and ends or loops during play", () => {
		const { ring, data } = scene();
		const tl = new IgeTimeline(data).bind("ring", ring);
		tl.seek(99);
		expect(tl.time()).toBe(6);
		tl.seek(-3);
		expect(tl.time()).toBe(0);
		const ended = jest.fn();
		tl.on("ended", ended);
		tl.play();
		tl.update(7000);
		expect(ended).toHaveBeenCalledTimes(1);
		expect(tl.playing()).toBe(false);
		expect(tl.time()).toBe(6);

		const loops = jest.fn();
		tl.loop(true).on("loop", loops);
		tl.seek(5.9);
		tl.play();
		tl.update(300);
		expect(loops).toHaveBeenCalledTimes(1);
		expect(tl.time()).toBeCloseTo(0.2, 6);
		expect(tl.playing()).toBe(true);
	});

	it("plays at a rate", () => {
		const { data } = scene();
		const tl = new IgeTimeline(data).rate(2);
		tl.play().update(500);
		expect(tl.time()).toBeCloseTo(1, 6);
	});

	it("poses a skeleton at the clip's time, whichever way it gets there", () => {
		const entity = new IgeEntity();
		const anim = new IgeSkeletalAnimationComponent(entity);
		const skeleton = createSkeletonInstance(SKELETON);
		anim.setSkeleton(skeleton);
		anim.define("swing", SWING);
		entity._skeleton = skeleton;
		entity.components.skeletalAnimation = anim;
		const leg = () => Math.round(skeleton.localMatrices[1 * 16 + 14] * 1000) / 1000;
		const tick = () => (anim as any)._update(entity, 16);

		const data = timeline().track("man", (t) => t.at(1, { animation: { clip: "swing", time: 0.5 } }).at(3, { animation: { clip: "swing", time: 0, speed: 0.5 } })).duration(8).build();
		const tl = new IgeTimeline(data).bind("man", entity);
		tl.seek(2);
		tick();
		// clip time 0.5 + 1s => 1.5 of 2 => 0.75
		expect(leg()).toBe(0.75);
		tl.seek(3);
		tick();
		expect(leg()).toBe(0);
		tl.seek(4);
		tick();
		// half speed: 0.5s into the clip => 0.25
		expect(leg()).toBe(0.25);
		tl.seek(2);
		tick();
		expect(leg()).toBe(0.75);
		// before the first key it holds the first pose; the clip wraps
		tl.seek(0);
		tick();
		expect(leg()).toBe(0.25);
		tl.seek(8);
		tick();
		// 5s at half speed = 2.5s => wraps to 0.5 => 0.25
		expect(leg()).toBe(0.25);
		expect(anim.poseCache()).toBe(false);
	});

	it("tints a material over its own and cuts a panel's camera", () => {
		const e = new IgeEntity();
		e.material({ metallic: 0.3, color: { r: 1, g: 1, b: 1, a: 1 } });
		const panel = new IgePanelViewport();
		panel.newCamera("wide");
		const data = timeline({ duration: 4 })
			.track("e", (t) => t.at(0, { color: { r: 1, g: 0, b: 0 } }).at(2, { color: { r: 0, g: 0, b: 1 } }))
			.cut("panel", 0, "main")
			.cut("panel", 2, "wide")
			.build();
		const tl = new IgeTimeline(data).bind({ e, panel });
		tl.seek(1);
		expect(e.material()).toEqual({ metallic: 0.3, color: { r: 0.5, g: 0, b: 0.5 } });
		expect(panel.camera).toBe(panel.getCamera("main"));
		tl.seek(3);
		expect(panel.camera).toBe(panel.getCamera("wide"));
		tl.seek(1.9);
		expect(panel.camera).toBe(panel.getCamera("main"));
	});

	it("reports what nothing is bound to", () => {
		const { data } = scene();
		expect(new IgeTimeline(data).missingTargets()).toEqual(["ring"]);
	});
});

describe("IgeTimeline: cues", () => {
	it("reports the captions at a time, and tells when they change", () => {
		const { data } = scene();
		const tl = new IgeTimeline(data);
		expect(tl.captionsAt(0)).toEqual([]);
		expect(tl.captionsAt(0.5).map((c) => c.text)).toEqual(["Did you hear that?"]);
		expect(tl.captionsAt(0.5)[0].speaker).toBe("Foreman");
		expect(tl.captionsAt(1.7).map((c) => c.text)).toEqual(["Did you hear that?", "Static."]);
		// end is exclusive
		expect(tl.captionsAt(2).map((c) => c.text)).toEqual(["Static."]);
		expect(tl.captionsAt(3)).toEqual([]);

		const seen: string[][] = [];
		tl.on("captions", (list: any[]) => void seen.push(list.map((c) => c.text)));
		tl.seek(1.7);
		tl.seek(1.8);
		tl.seek(2.5);
		expect(tl.captionsAt().map((c) => c.text)).toEqual(["Static."]);
		expect(seen).toEqual([["Did you hear that?", "Static."], ["Static."]]);
	});

	it("fires one-shot sounds when play passes them, not when a seek lands past them", () => {
		const { data } = scene();
		const { audio, log } = fakeAudio();
		const tl = new IgeTimeline(data).setAudio(audio);
		tl.seek(2);
		tl.play();
		tl.update(100);
		expect(log).toEqual([]);
		tl.seek(1.0);
		tl.update(100);
		expect(log).toEqual([]);
		tl.update(200);
		expect(log).toEqual(["start ping@0.00"]);
		// scrubbing back over it doesn't play it either; playing through again does
		log.length = 0;
		tl.seek(0.5);
		expect(log).toEqual(["stop ping"]);
		log.length = 0;
		tl.update(1000);
		expect(log).toEqual(["start ping@0.00"]);
	});

	it("fires a cue at time 0 when played from the start, and not again after a seek to it from elsewhere in play", () => {
		const events: string[] = [];
		const tl = new IgeTimeline({ duration: 3, events: [{ at: 0, name: "go" }, { at: 1, name: "one" }] });
		tl.on("event", (e: any) => void events.push(e.name));
		tl.play().update(1000);
		expect(events).toEqual(["go", "one"]);
	});

	it("fires events once as play crosses them, with their data, across steps and loop wraps", () => {
		const { data } = scene();
		const tl = new IgeTimeline(data).setAudio(fakeAudio().audio);
		const seen: Array<[string, unknown]> = [];
		tl.on("event", (e: any) => void seen.push([e.name, e.data]));
		tl.play();
		for (let i = 0; i < 70; i++) tl.update(100);
		expect(seen).toEqual([["sparks", { at: "hatch" }], ["boom", undefined]]);

		seen.length = 0;
		tl.loop(true).seek(2.9);
		tl.play();
		tl.update(300);
		expect(seen).toEqual([["boom", undefined]]);
		tl.seek(5.9);
		tl.update(1200);
		expect(seen.map((s) => s[0])).toEqual(["boom", "sparks"]);
	});

	it("answers which events lie between two times", () => {
		const { data } = scene();
		const tl = new IgeTimeline(data);
		expect(tl.eventsBetween(0, 6).map((e) => e.name)).toEqual(["sparks", "boom"]);
		expect(tl.eventsBetween(1, 3).map((e) => e.name)).toEqual(["boom"]);
		expect(tl.eventsBetween(0, 0.9)).toEqual([]);
		expect(tl.eventsBetween(0.5, 1)[0].data).toEqual({ at: "hatch" });
	});

	it("starts long and looping sounds at the right offset when playback starts, resumes or follows a seek, and pauses them", () => {
		const { audio, log } = fakeAudio({ ambience: 4, voice: 10 });
		const tl = new IgeTimeline({
			duration: 20,
			sounds: [
				{ start: 2, source: "ambience", loop: true },
				{ start: 5, source: "voice", track: true },
				{ start: 12, source: "ping" }
			]
		}).setAudio(audio);

		tl.seek(3);
		expect(log).toEqual([]);
		tl.play();
		expect(log).toEqual(["start ambience@1.00 loop"]);
		log.length = 0;
		tl.pause();
		expect(log).toEqual(["stop ambience"]);
		log.length = 0;

		// Resume inside the loop: offset wraps over the sound's length
		tl.seek(7.5);
		tl.play();
		expect(log).toEqual(["start ambience@1.50 loop", "start voice@2.50"]);
		log.length = 0;

		// A seek while playing restarts them where they now belong
		tl.seek(16);
		expect(log).toEqual(["stop ambience", "stop voice", "start ambience@2.00 loop"]);
		log.length = 0;

		// A long sound past its end isn't started; one reaching its end stops
		tl.seek(15.5);
		log.length = 0;
		tl.update(100);
		expect(log).toEqual([]);
		tl.pause();
		expect(log).toEqual(["stop ambience"]);
	});

	it("is silent running backwards: live sounds stop, none start, and they come back at the right offset going forwards", () => {
		const { audio, log } = fakeAudio({ ambience: 4 });
		const tl = new IgeTimeline({
			duration: 20,
			sounds: [
				{ start: 2, source: "ambience", loop: true },
				{ start: 5, source: "voice", track: true, end: 9 },
				{ start: 6, source: "ping" }
			]
		}).setAudio(audio);
		tl.seek(7);
		tl.play();
		expect(log).toEqual(["start ambience@1.00 loop", "start voice@2.00"]);
		log.length = 0;

		// Backwards: what's live stops, and nothing starts as it runs over sounds, a one-shot included
		tl.rate(-1);
		expect(log.sort()).toEqual(["stop ambience", "stop voice"]);
		log.length = 0;
		tl.update(500);
		tl.update(500);
		expect(tl.time()).toBeCloseTo(6, 6);
		tl.update(1500);
		expect(tl.time()).toBeCloseTo(4.5, 6);
		tl.seek(3);
		tl.update(200);
		expect(log).toEqual([]);

		// Forwards again: the long sounds resume at the offset for where it is now
		tl.rate(1);
		// (time is 2.8: the loop has run 0.8 s; the voice, 5 to 9, hasn't begun)
		expect(log).toEqual(["start ambience@0.80 loop"]);
		tl.pause();
	});

	it("is silent when it starts playing already running backwards, and a seek while backwards starts nothing", () => {
		const { audio, log } = fakeAudio({});
		const tl = new IgeTimeline({ duration: 10, sounds: [{ start: 1, source: "a", loop: true }] }).setAudio(audio);
		tl.rate(-1);
		tl.seek(5);
		tl.play();
		tl.seek(4);
		tl.update(100);
		expect(log).toEqual([]);
		tl.rate(2);
		expect(log).toEqual([`start a@${(tl.time() - 1).toFixed(2)} loop`]);
	});

	it("stops a long sound when playback passes its end", () => {
		const { audio, log } = fakeAudio({ v: 10 });
		const tl = new IgeTimeline({ duration: 20, sounds: [{ start: 1, source: "v", end: 3 }] }).setAudio(audio);
		tl.play();
		tl.update(1500);
		expect(log).toEqual(["start v@0.50"]);
		tl.update(2000);
		expect(log).toEqual(["start v@0.50", "stop v"]);
	});
});

describe("IgeTimeline: particles", () => {
	function run (system: IgeParticleSystem3d) {
		const tl = new IgeTimeline({
			duration: 6,
			particles: [
				{ target: "sparks", at: 1, count: 20, position: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 }, seed: 7 },
				{ target: "sparks", at: 2, rate: 30, until: 3, position: { x: 5, y: 0, z: 0 } }
			]
		}).bind("sparks", system);
		return tl;
	}
	const make = () => new IgeParticleSystem3d({ rate: 0, maxParticles: 128, spread: 0.6, speed: [10, 40], lifetime: [0.5, 1.5], gravity: { x: 0, y: -30, z: 0 }, emitterRadius: 2 });
	const snapshot = (s: IgeParticleSystem3d) => ({ n: s.particleCount(), data: Array.from(s.renderData().data.slice(0, s.particleCount() * 8)) });

	it("reproduces the same particles at t after a seek forward, a seek back and play", () => {
		const played = make();
		const a = run(played);
		a.play();
		for (let i = 0; i < 25; i++) a.update(100);
		expect(a.time()).toBeCloseTo(2.5, 5);
		const byPlay = snapshot(played);
		expect(byPlay.n).toBeGreaterThan(0);

		const sought = make();
		const b = run(sought);
		b.seek(2.5);
		expect(snapshot(sought)).toEqual(byPlay);
		b.seek(5);
		b.seek(2.5);
		expect(snapshot(sought)).toEqual(byPlay);
		b.seek(0.5);
		expect(sought.particleCount()).toBe(0);
		b.seek(1.2);
		expect(sought.particleCount()).toBe(20);
	});

	it("makes the particles of a seeded system the same every time, and unseeded systems still use Math.random", () => {
		const a = make().seed(3);
		const b = make().seed(3);
		a.burst(10);
		b.burst(10);
		expect(Array.from(a._particleVelocity.slice(0, 30))).toEqual(Array.from(b._particleVelocity.slice(0, 30)));
		const spy = jest.spyOn(Math, "random");
		make().burst(2);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	it("doesn't simulate a driven system on update()", () => {
		const s = make().driven(true);
		s.burst(5);
		s.update(50);
		expect(s._particleAge[0]).toBe(0);
		s.driven(false).update(50);
		expect(s._particleAge[0]).toBeGreaterThan(0);
	});
});

describe("IgeTimeline: data", () => {
	it("round-trips builder -> data -> JSON -> timeline -> data", () => {
		const { data } = scene();
		const json = JSON.parse(JSON.stringify(data));
		expect(json).toEqual(data);
		const tl = new IgeTimeline(json);
		const out = tl.toData();
		// eases are filled in and keys sorted, but loading what comes out gives the same thing
		expect(new IgeTimeline(out).toData()).toEqual(out);
		expect(tl.duration()).toBe(6);
		expect(out.captions).toEqual(data.captions);
		expect(out.events).toEqual(data.events);
		expect(out.tracks!.map((t) => `${t.target}.${t.property}`)).toEqual(["ring.position", "ring.visible", "ring.opacity"]);
		expect(out.tracks![0].keys.map((k) => [k.t, k.ease])).toEqual([[0, "linear"], [2, "smooth"], [4, "step"], [5, "linear"]]);
	});

	it("takes the duration from the last key or cue, sorts keys, and rejects an unknown property", () => {
		const tl = new IgeTimeline({ tracks: [{ target: "a", property: "opacity", keys: [{ t: 3, value: 1 }, { t: 1, value: 0 }] }], captions: [{ start: 0, end: 4.5, text: "x" }] });
		expect(tl.duration()).toBe(4.5);
		expect(tl.toData().tracks![0].keys.map((k) => k.t)).toEqual([1, 3]);
		expect(() => new IgeTimeline({ tracks: [{ target: "a", property: "nope" as any, keys: [] }] })).toThrow();
	});

	it("builds merged tracks, animation shorthand and cuts", () => {
		const data = timeline({ loop: true })
			.track("a", (t) => t.at(0, { animation: "walk", scale: { x: 1, y: 1, z: 1 } }))
			.track("a", (t) => t.at(2, { animation: { clip: "run", time: 1 }, scale: { x: 2, y: 2, z: 2 } }, "smooth"))
			.cut("panel", 1, "wide")
			.particles("p", 1, { count: 5 })
			.build();
		expect(data.loop).toBe(true);
		expect(data.tracks!.find((t) => t.property === "animation")!.keys).toEqual([
			{ t: 0, value: { clip: "walk" } },
			{ t: 2, value: { clip: "run", time: 1 }, ease: "smooth" }
		]);
		expect(data.tracks!.find((t) => t.property === "camera")).toEqual({ target: "panel", property: "camera", keys: [{ t: 1, value: "wide", ease: "step" }] });
		expect(data.particles).toEqual([{ target: "p", at: 1, count: 5 }]);
	});
});
