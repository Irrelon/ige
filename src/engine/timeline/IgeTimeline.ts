import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import type { IgeParticleSystem3d, IgeParticleVec3 } from "@/engine/webgl/IgeParticleSystem3d";

/**
 * A timeline plays a scripted scene that can be paused and scrubbed to any moment, and looks the same every time:
 * the scene's state at time t is worked out from the tracks, not by playing forward to it. The scene is plain data
 * (JSON-able; targets are names), written by hand or by the builder in IgeTimelineBuilder.ts. See guides/timeline.md.
 */

/** How a value moves from one keyframe to the next: "step" holds it, "linear", or "smooth" (ease in and out). */
export type IgeTimelineEase = "step" | "linear" | "smooth";

/** What a track sets on its target. */
export type IgeTimelineProperty = "position" | "rotation" | "quaternion" | "scale" | "visible" | "color" | "opacity" | "animation" | "camera" | `effect.${string}`;

export const IGE_TIMELINE_PROPERTIES: readonly IgeTimelineProperty[] = ["position", "rotation", "quaternion", "scale", "visible", "color", "opacity", "animation", "camera"];

/** A panel effect's numeric setting is animated by a property `effect.<name>` (e.g. `effect.dropout`). */
export const igeTimelineIsEffectProperty = (property: string): property is `effect.${string}` => property.startsWith("effect.") && property.length > 7;

export interface IgeTimelineVec3 { x: number; y: number; z: number }
export interface IgeTimelineQuat { x: number; y: number; z: number; w: number }
export interface IgeTimelineColor { r: number; g: number; b: number; a?: number }

/** A skeletal animation key: which clip, and the clip's time at this key (0 by default); it then runs at `speed` (1) until the next key. */
export interface IgeTimelineAnimation {
	clip: string;
	time?: number;
	speed?: number;
	/** Wrap past the clip's end (default true) or hold its last pose. */
	loop?: boolean;
}

/**
 * One keyframe. `ease` is how the value moves from this key to the next one (the last key's is unused).
 * Default: "linear" for numbers, vectors and colours, "step" for everything else.
 */
export interface IgeTimelineKey<V = unknown> {
	/** Seconds from the start of the timeline. */
	t: number;
	value: V;
	ease?: IgeTimelineEase;
}

/**
 * Keys for one property of one target. Targets are names the game binds to entities (or, for `camera`, a panel)
 * with IgeTimeline.bind(). Before its first key a track holds its first value, after its last it holds its last.
 * Values: position, rotation (Euler radians) and scale are {x, y, z}; quaternion {x, y, z, w}; visible a boolean;
 * color {r, g, b, a?}; opacity a number; animation an IgeTimelineAnimation; camera a camera name of the panel;
 * `effect.<name>` a number: a setting of the target panel's effect (IgeRecorderEffect), e.g. `effect.dropout`.
 */
export interface IgeTimelineTrackData {
	target: string;
	property: IgeTimelineProperty;
	keys: IgeTimelineKey[];
}

/** A caption: who's speaking and what, shown from `start` up to (not including) `end`. */
export interface IgeTimelineCaptionCue {
	start: number;
	end: number;
	speaker?: string;
	text: string;
}

/**
 * A sound. A one-shot fires when play passes `start` (scrubbing over it makes no sound) and plays out. A sound
 * with a `loop` or an `end`, or with `track: true` (a long one: ambience, a log's voice), plays from `start`
 * until `end` (or its own length, or the timeline's end when it loops) and starts at the right offset when
 * playback begins or resumes inside it, after a seek too. `source` is an audio source id (`new IgeAudioSource(id, url)`).
 */
export interface IgeTimelineSoundCue {
	start: number;
	source: string;
	volume?: number;
	loop?: boolean;
	end?: number;
	track?: boolean;
}

/** A named cue with data for the game to react to ("start sparks here"). It fires when play crosses `at`. */
export interface IgeTimelineEventCue {
	at: number;
	name: string;
	data?: unknown;
}

/**
 * A particle burst, or a stream of them from `rate` particles a second until `until`, on a particle system
 * (IgeParticleSystem3d). The timeline steps the system itself on a fixed grid from a seed, so a seek reproduces
 * the same particles. Give the system `rate: 0` (cues emit) and let the timeline drive it.
 */
export interface IgeTimelineParticleCue {
	target: string;
	at: number;
	/** Particles in the burst at `at` (0 for a stream only). */
	count?: number;
	/** World position of the emission (default: the system's own position). */
	position?: IgeTimelineVec3;
	direction?: IgeTimelineVec3;
	/** A stream: particles a second, from `at` until `until`. */
	rate?: number;
	until?: number;
	/** Seed for the system's random numbers (default 1; the first cue for a target sets it). */
	seed?: number;
}

export interface IgeTimelineData {
	/** Seconds. Default: the end of the last key or cue. */
	duration?: number;
	loop?: boolean;
	tracks?: IgeTimelineTrackData[];
	captions?: IgeTimelineCaptionCue[];
	sounds?: IgeTimelineSoundCue[];
	events?: IgeTimelineEventCue[];
	particles?: IgeTimelineParticleCue[];
}

/** A sound that was started and can be stopped. */
export interface IgeTimelineSoundHandle {
	stop (): void;
	/** Change the playback rate of a sound already sounding (the timeline calls it when its rate changes). */
	setRate? (rate: number): void;
}

/** How the timeline makes sound. The default uses the engine's audio (`ige.audio`); a game or a test can swap its own. */
export interface IgeTimelineAudio {
	/** Start `source` `offset` seconds in. Null if it can't play (no audio, unknown source). */
	start (source: string, options: { offset: number; loop: boolean; volume: number; rate?: number }): IgeTimelineSoundHandle | null;
	/** The source's length in seconds, if known. */
	length? (source: string): number | undefined;
}

/** The engine's audio: ige.audio (needs `ige.uses("audio")` and an IgeAudioSource for the id). */
export const igeTimelineEngineAudio: IgeTimelineAudio = {
	start (source, options) {
		const audio = (ige as any).audio;
		if (!audio?._ctx) return null;
		let control: any = null;
		try {
			control = audio.createAudioControl(source, { loop: options.loop, volume: options.volume, rate: options.rate });
		} catch {
			return null;
		}
		if (!control) return null;
		if (options.offset > 0) control.play(options.offset);
		else control.play();
		return { stop: () => control.stop(), setRate: (rate) => control.playbackRate(rate) };
	},
	length (source) {
		return (ige as any).audio?.get?.(source)?.buffer?.duration;
	}
};

/** Smooth ease in and out. */
export function igeTimelineSmooth (u: number): number {
	return u * u * (3 - 2 * u);
}

const isNumberRecord = (v: unknown): v is Record<string, number> =>
	!!v && typeof v === "object" && Object.values(v as object).every((n) => typeof n === "number");

function lerpRecord (a: Record<string, number>, b: Record<string, number>, u: number): Record<string, number> {
	const out: Record<string, number> = {};
	for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
		const av = a[k] ?? b[k];
		const bv = b[k] ?? a[k];
		out[k] = av + (bv - av) * u;
	}
	return out;
}

function slerp (a: IgeTimelineQuat, b: IgeTimelineQuat, u: number): IgeTimelineQuat {
	let bx = b.x, by = b.y, bz = b.z, bw = b.w;
	let dot = a.x * bx + a.y * by + a.z * bz + a.w * bw;
	if (dot < 0) {
		bx = -bx; by = -by; bz = -bz; bw = -bw;
		dot = -dot;
	}
	let s0: number, s1: number;
	if (dot > 0.9995) {
		s0 = 1 - u;
		s1 = u;
	} else {
		const theta = Math.acos(Math.min(1, dot));
		const sin = Math.sin(theta);
		s0 = Math.sin((1 - u) * theta) / sin;
		s1 = Math.sin(u * theta) / sin;
	}
	const x = a.x * s0 + bx * s1, y = a.y * s0 + by * s1, z = a.z * s0 + bz * s1, w = a.w * s0 + bw * s1;
	const len = Math.hypot(x, y, z, w) || 1;
	return { x: x / len, y: y / len, z: z / len, w: w / len };
}

/** The index of the last key at or before t (-1 if t is before them all). `keys` must be sorted by t. */
function keyAtOrBefore (keys: IgeTimelineKey[], t: number): number {
	let lo = 0, hi = keys.length - 1, found = -1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (keys[mid].t <= t) {
			found = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return found;
}

/**
 * The value of a track at time t (keys sorted by t): the first value before the first key, the last after the
 * last, and between two keys the first key's value moved toward the second's by its ease. Quaternions are
 * slerped. A pure function of the keys and t.
 */
export function igeTimelineSample (keys: IgeTimelineKey[], t: number, property?: IgeTimelineProperty): unknown {
	if (!keys.length) return undefined;
	const i = keyAtOrBefore(keys, t);
	if (i < 0) return keys[0].value;
	const a = keys[i];
	if (i === keys.length - 1) return a.value;
	const b = keys[i + 1];
	const ease = a.ease ?? "linear";
	if (ease === "step") return a.value;
	const span = b.t - a.t;
	let u = span > 0 ? (t - a.t) / span : 1;
	if (ease === "smooth") u = igeTimelineSmooth(u);
	if (typeof a.value === "number" && typeof b.value === "number") return a.value + (b.value - a.value) * u;
	if (property === "quaternion") return slerp(a.value as IgeTimelineQuat, b.value as IgeTimelineQuat, u);
	if (isNumberRecord(a.value) && isNumberRecord(b.value)) return lerpRecord(a.value, b.value, u);
	return a.value;
}

/** What a property's keys do between them when no ease is given: only numbers, vectors and colours move. */
const NUMERIC: ReadonlySet<IgeTimelineProperty> = new Set(["position", "rotation", "quaternion", "scale", "color", "opacity"]);

/** A sound's playback rate for a timeline rate: the speed (sound has no backwards), kept to what audio allows. */
export const igeTimelineSoundRate = (rate: number): number => Math.min(Math.max(Math.abs(rate), 0.1), 8);

/** The effect a bound target carries (a panel's `effect`), or the target itself if it is one (has `set`). */
function effectOf (target: any): { set?: (s: Record<string, number>) => unknown; has?: (n: string) => boolean; time?: (t: number) => unknown } | undefined {
	if (!target) return undefined;
	if (target.effect && typeof target.effect === "object") return target.effect;
	if (typeof target.set === "function" && typeof target.time === "function") return target;
	return undefined;
}

const PARTICLE_STEP = 1 / 60;

interface ParticleRun {
	system: IgeParticleSystem3d;
	cues: IgeTimelineParticleCue[];
	seed: number;
	first: number;
	/** Fixed steps done since time 0. */
	steps: number;
	/** Fractional particles carried by each stream cue. */
	carry: number[];
}

let timelineCount = 0;

/**
 * Plays an IgeTimelineData. Bind targets by name, then play, pause, seek, set the rate, loop. Drive it with
 * `update(deltaMs)` or `attach(entity)` (runs from that entity's update, e.g. a panel's scene).
 *
 *     const tl = timeline().track("ring", t => t.at(0, { position: { x: 0, y: 0, z: 0 } }).at(2.5, { position: { x: 100, y: 0, z: 0 } }, "smooth")).build();
 *     const playback = new IgeTimeline(tl).bind({ ring, panel }).attach(scene);
 *     playback.play();
 *     playback.seek(1.2);
 *
 * Events: "event" (cue), "captions" (list, when the set shown changes), "loop", "ended", "play", "pause", "seek" (time).
 */
export class IgeTimeline extends IgeEventingClass {
	classId = "IgeTimeline";
	/** How sound is made (see IgeTimelineAudio). */
	audio: IgeTimelineAudio = igeTimelineEngineAudio;

	protected _tl!: Required<Omit<IgeTimelineData, "duration" | "loop">> & { duration: number; loop: boolean };
	protected _time = 0;
	protected _rate = 1;
	protected _loop: boolean;
	protected _playing = false;
	/** Cues at or before this time have fired. */
	protected _cursor = 0;
	/** A cue exactly at the cursor still fires (play from 0). */
	protected _cursorInclusive = true;
	protected _targets = new Map<string, unknown>();
	protected _baseMaterial = new WeakMap<object, unknown>();
	protected _sounds: Array<{ cue: IgeTimelineSoundCue; handle: IgeTimelineSoundHandle }> = [];
	protected _runs = new Map<string, ParticleRun>();
	protected _captionKey = "";
	protected _behaviour?: { entity: IgeEntity; id: string };
	protected _missing = new Set<string>();
	protected _whileHidden = false;

	constructor (data: IgeTimelineData) {
		super();
		const tracks = (data.tracks ?? []).map((track) => {
			if (!IGE_TIMELINE_PROPERTIES.includes(track.property) && !igeTimelineIsEffectProperty(track.property)) throw new Error(`Timeline track for "${track.target}" has an unknown property "${track.property}"`);
			const keys = track.keys.map((k) => {
				if (!Number.isFinite(k.t)) throw new Error(`Timeline key for "${track.target}.${track.property}" has no time`);
				return { t: k.t, value: structuredCloneJson(k.value), ...(k.ease ? { ease: k.ease } : {}) };
			});
			// A stable sort: keys at the same time keep their order
			keys.sort((a, b) => a.t - b.t);
			const ease = NUMERIC.has(track.property) || igeTimelineIsEffectProperty(track.property) ? "linear" : "step";
			return { target: track.target, property: track.property, keys: keys.map((k) => (k.ease ? k : { ...k, ease: k.ease ?? ease })) as IgeTimelineKey[] };
		});
		const captions = (data.captions ?? []).map((c) => ({ ...c })).sort((a, b) => a.start - b.start);
		const sounds = (data.sounds ?? []).map((s) => ({ ...s })).sort((a, b) => a.start - b.start);
		const events = (data.events ?? []).map((e) => ({ ...e, ...(e.data !== undefined ? { data: structuredCloneJson(e.data) } : {}) })).sort((a, b) => a.at - b.at);
		const particles = (data.particles ?? []).map((p) => structuredCloneJson(p) as IgeTimelineParticleCue).sort((a, b) => a.at - b.at);

		let end = 0;
		for (const t of tracks) for (const k of t.keys) end = Math.max(end, k.t);
		for (const c of captions) end = Math.max(end, c.end);
		for (const s of sounds) end = Math.max(end, s.end ?? s.start);
		for (const e of events) end = Math.max(end, e.at);
		for (const p of particles) end = Math.max(end, p.until ?? p.at);

		this._data = { tracks, captions, sounds, events, particles, duration: data.duration ?? end, loop: !!data.loop };
		this._loop = this._data.loop;
	}

	/** The timeline as plain data (a copy: JSON-able, and the same as what was loaded apart from keys being sorted and eases filled in). */
	toData (): IgeTimelineData {
		const d = structuredCloneJson(this._data) as IgeTimelineData;
		return d;
	}

	/** Swap how sound is made (see IgeTimelineAudio). */
	setAudio (audio: IgeTimelineAudio): this {
		this.audio = audio;
		return this;
	}

	/** Seconds long. */
	duration (): number;
	duration (val: number): this;
	duration (val?: number): number | this {
		if (val === undefined) return this._data.duration;
		this._data.duration = Math.max(0, val);
		return this;
	}

	loop (): boolean;
	loop (val: boolean): this;
	loop (val?: boolean): boolean | this {
		if (val === undefined) return this._loop;
		this._loop = val;
		return this;
	}

	/** Playback speed (1 normal, 2 twice as fast, negative runs backwards: cues don't fire going backwards). */
	rate (): number;
	rate (val: number): this;
	rate (val?: number): number | this {
		if (val === undefined) return this._rate;
		this._rate = val;
		// Sound follows: what's sounding speeds up and slows down with the timeline
		for (const s of this._sounds) s.handle.setRate?.(igeTimelineSoundRate(val));
		return this;
	}

	/** The current time in seconds. */
	time (): number {
		return this._time;
	}

	playing (): boolean {
		return this._playing;
	}

	/**
	 * Name the things the tracks refer to: entities (position, visibility, ... and particle systems), and panels for
	 * `camera` tracks. Binding applies the state at the current time.
	 */
	bind (name: string, target: IgeEntity | IgePanelViewport | IgeParticleSystem3d): this;
	bind (targets: Record<string, IgeEntity | IgePanelViewport | IgeParticleSystem3d>): this;
	bind (nameOrTargets: string | Record<string, unknown>, target?: unknown): this {
		if (typeof nameOrTargets === "string") this._targets.set(nameOrTargets, target);
		else for (const [name, t] of Object.entries(nameOrTargets)) this._targets.set(name, t);
		this._runs.clear();
		this.apply();
		return this;
	}

	/** Names the tracks and cues use that nothing is bound to. */
	missingTargets (): string[] {
		const names = new Set<string>();
		for (const t of this._data.tracks) names.add(t.target);
		for (const p of this._data.particles) names.add(p.target);
		return [...names].filter((n) => !this._targets.has(n));
	}

	/** Start (or resume) playing. From the end of a timeline that isn't looping it starts again from 0. */
	play (): this {
		if (this._playing) return this;
		if (!this._loop && this._rate > 0 && this._time >= this._data.duration && this._data.duration > 0) this.seek(0);
		this._playing = true;
		this._syncSounds();
		this.emit("play");
		return this;
	}

	/** Stop where it is. Sounds stop; play() starts them again at the right offset. */
	pause (): this {
		if (!this._playing) return this;
		this._playing = false;
		this._stopSounds();
		this.emit("pause");
		return this;
	}

	/** Pause and go back to 0 (cues at 0 fire again when played). */
	stop (): this {
		this.pause();
		return this.seek(0);
	}

	/**
	 * Go to a time (clamped to 0 and the duration; wrapped when looping). The scene shows exactly what it shows at
	 * that time however it got there. Nothing fires: one-shot sounds and events are for play to cross. Long sounds
	 * restart at the right offset if it's playing.
	 */
	seek (t: number): this {
		const d = this._data.duration;
		let time = Number.isFinite(t) ? t : 0;
		if (this._loop && d > 0 && (time >= d || time < 0)) time = ((time % d) + d) % d;
		this._time = Math.min(Math.max(time, 0), d);
		this._cursor = this._time;
		this._cursorInclusive = this._time <= 0;
		this._stopSounds();
		this.apply();
		this._syncSounds();
		this.emit("seek", this._time);
		return this;
	}

	/** Advance by `deltaMs` of real time (times the rate) while playing. Call it each frame, or use attach(). */
	update (deltaMs: number): this {
		if (!this._playing || !(deltaMs > 0)) return this;
		const d = this._data.duration;
		const dt = (deltaMs / 1000) * this._rate;
		let next = this._time + dt;
		let wrapped = false;

		if (dt > 0) {
			while (this._loop && d > 0 && next >= d) {
				this._fire(this._cursor, d, this._cursorInclusive);
				next -= d;
				this._cursor = 0;
				this._cursorInclusive = true;
				wrapped = true;
				this.emit("loop");
			}
			if (!this._loop && next >= d) {
				this._time = d;
				this._fire(this._cursor, d, this._cursorInclusive);
				this._cursor = d;
				this._cursorInclusive = false;
				this._playing = false;
				this._stopSounds();
				this.apply();
				this.emit("ended");
				return this;
			}
			this._time = next;
			this._fire(this._cursor, next, this._cursorInclusive);
			this._cursor = next;
			this._cursorInclusive = false;
		} else {
			if (next < 0) {
				if (this._loop && d > 0) {
					next = ((next % d) + d) % d;
					wrapped = true;
				} else {
					next = 0;
					this._playing = false;
					this._stopSounds();
				}
			}
			this._time = next;
			this._cursor = next;
			this._cursorInclusive = false;
		}

		if (wrapped) this._stopSounds();
		this.apply();
		if (this._playing) this._syncSounds();
		return this;
	}

	/**
	 * Run from an entity's update (its pre-update behaviours), so the timeline plays as the entity's scene does: a
	 * panel's scene updates only while the panel is shown, so a hidden panel's timeline waits. One entity at a time.
	 */
	attach (entity: IgeEntity, options: { whileHidden?: boolean } = {}): this {
		this.detach();
		const id = `igeTimeline${++timelineCount}`;
		this._whileHidden = !!options.whileHidden;
		if (this._whileHidden) {
			// Driven by the engine's own update (every tick, whether or not the entity's scene updates)
			const engine = ige.engine as unknown as IgeEntity;
			engine.addBehaviour(IgeBehaviourType.preUpdate, id, ((_entity: IgeEntity, tickDelta: number) => {
				this.update(tickDelta);
			}) as never);
			this._behaviour = { entity: engine, id };
			return this;
		}
		entity.addBehaviour(IgeBehaviourType.preUpdate, id, ((_entity: IgeEntity, tickDelta: number) => {
			this.update(tickDelta);
		}) as never);
		this._behaviour = { entity, id };
		return this;
	}

	detach (): this {
		if (this._behaviour) {
			this._behaviour.entity.removeBehaviour(IgeBehaviourType.preUpdate, this._behaviour.id);
			this._behaviour = undefined;
		}
		return this;
	}

	/** Captions showing at a time (the current time by default), earliest first. */
	captionsAt (t: number = this._time): IgeTimelineCaptionCue[] {
		return this._data.captions.filter((c) => c.start <= t && t < c.end).map((c) => ({ ...c }));
	}

	/** Event cues with `from` < at <= `to`, in order. (What play crosses in that stretch.) */
	eventsBetween (from: number, to: number): IgeTimelineEventCue[] {
		return this._eventsIn(from, to, false);
	}

	/** Set the scene to its state at the current time (done by seek() and update(); call it after changing the scene by hand). */
	apply (): this {
		const t = this._time;
		// A panel's effect works its noise out from the timeline's time, so scrubbing back gives the same picture
		for (const target of this._targets.values()) effectOf(target)?.time?.(t);
		for (const track of this._data.tracks) this._applyTrack(track, t);
		this._applyParticles(t);
		const captions = this.captionsAt(t);
		const key = captions.map((c) => `${c.start}|${c.end}|${c.speaker ?? ""}|${c.text}`).join("\n");
		if (key !== this._captionKey) {
			this._captionKey = key;
			this.emit("captions", captions);
		}
		return this;
	}

	/** Stop sounds and the behaviour. */
	destroy (): this {
		this.detach();
		this._stopSounds();
		this._playing = false;
		return this;
	}

	// ----- tracks

	protected _applyTrack (track: IgeTimelineTrackData, t: number): void {
		const target = this._targets.get(track.target) as any;
		if (!target) {
			this._missing.add(track.target);
			return;
		}
		const value = igeTimelineSample(track.keys, t, track.property) as any;
		if (value === undefined) return;

		if (igeTimelineIsEffectProperty(track.property)) {
			const effect = effectOf(target);
			const name = track.property.slice(7);
			if (!effect?.set || (effect.has && !effect.has(name)) || typeof value !== "number") {
				this._missing.add(`${track.target}.${track.property}`);
				return;
			}
			effect.set({ [name]: value });
			return;
		}

		switch (track.property) {
			case "position":
				target.translateTo(value.x ?? target._translate.x, value.y ?? target._translate.y, value.z ?? target._translate.z);
				break;
			case "rotation":
				target.rotateTo(value.x ?? target._rotate.x, value.y ?? target._rotate.y, value.z ?? target._rotate.z);
				break;
			case "scale":
				target.scaleTo(value.x ?? target._scale.x, value.y ?? target._scale.y, value.z ?? target._scale.z);
				break;
			case "quaternion":
				target.quaternion(value);
				break;
			case "visible":
				if (value) target.show();
				else target.hide();
				break;
			case "opacity":
				target.opacity(value);
				break;
			case "color": {
				// Over the material the entity had when the timeline first touched it
				let base = this._baseMaterial.get(target);
				if (base === undefined) {
					base = target.material() ?? null;
					this._baseMaterial.set(target, base);
				}
				target.material({ ...((base as object) ?? {}), color: { ...value } });
				break;
			}
			case "animation":
				this._applyAnimation(target, value as IgeTimelineAnimation, track.keys, t);
				break;
			case "camera":
				try {
					target.cut(value);
				} catch (err) {
					this._missing.add(`${track.target}.${String(value)}`);
				}
				break;
		}
	}

	protected _applyAnimation (entity: IgeEntity, key: IgeTimelineAnimation, keys: IgeTimelineKey[], t: number): void {
		const anim = entity.skeletalAnimation?.();
		if (!anim) return;
		const i = Math.max(0, keyAtOrBefore(keys, t));
		const from = keys[i];
		const a = from.value as IgeTimelineAnimation;
		const clipTime = (a.time ?? 0) + Math.max(0, t - from.t) * (a.speed ?? 1);
		// Exact poses: the shared pose cache quantises time
		anim.poseCache(false);
		anim.pose(a.clip, clipTime, { loop: a.loop ?? true });
	}

	// ----- particles

	protected _applyParticles (t: number): void {
		const cues = this._data.particles;
		if (!cues.length) return;
		if (!this._runs.size) {
			for (const cue of cues) {
				const system = this._targets.get(cue.target) as IgeParticleSystem3d | undefined;
				if (!system || typeof system.simulate !== "function") {
					this._missing.add(cue.target);
					continue;
				}
				let run = this._runs.get(cue.target);
				if (!run) {
					run = { system, cues: [], seed: cue.seed ?? 1, first: Infinity, steps: -1, carry: [] };
					this._runs.set(cue.target, run);
				}
				run.cues.push(cue);
				run.first = Math.min(run.first, cue.at);
			}
			for (const run of this._runs.values()) {
				run.system.driven(true);
				run.carry = run.cues.map(() => 0);
			}
		}

		const h = PARTICLE_STEP;
		const want = Math.floor(t / h + 1e-9);
		for (const run of this._runs.values()) {
			const first = Math.floor(run.first / h + 1e-9);
			if (run.steps < 0 || want < run.steps) {
				// Start over from the seed: the particles at a time are the ones those steps made
				run.system.seed(run.seed).clear().stop();
				run.carry.fill(0);
				run.steps = Math.min(first, want);
			}
			while (run.steps < want) {
				this._stepParticles(run, run.steps * h);
				run.steps++;
			}
		}
	}

	/** One fixed step of a particle system from step-time `from`: the cues whose moment falls in it emit, then it moves on. */
	protected _stepParticles (run: ParticleRun, from: number): void {
		const h = PARTICLE_STEP;
		const eps = 1e-9;
		let active = run.system.particleCount() > 0;
		for (let c = 0; c < run.cues.length; c++) {
			const cue = run.cues[c];
			if (cue.at >= from - eps && cue.at < from + h - eps && cue.count) {
				run.system.burst(cue.count, cue.position, cue.direction);
				active = true;
			}
			if (cue.rate && cue.until !== undefined && from >= cue.at - eps && from < cue.until - eps) {
				run.carry[c] += cue.rate * h;
				const n = Math.floor(run.carry[c]);
				if (n > 0) {
					run.carry[c] -= n;
					run.system.burst(n, cue.position, cue.direction);
					active = true;
				}
			}
		}
		if (active) run.system.simulate(h);
	}

	// ----- cues

	protected _eventsIn (from: number, to: number, inclusiveFrom: boolean): IgeTimelineEventCue[] {
		return this._data.events
			.filter((e) => (inclusiveFrom ? e.at >= from : e.at > from) && e.at <= to)
			.map((e) => ({ ...e }));
	}

	/** Fire what lies in (from, to] (or [from, to]): events, and one-shot sounds. */
	protected _fire (from: number, to: number, inclusiveFrom: boolean): void {
		for (const cue of this._eventsIn(from, to, inclusiveFrom)) this.emit("event", cue);
		for (const cue of this._data.sounds) {
			if (this._isTrack(cue)) continue;
			if ((inclusiveFrom ? cue.start >= from : cue.start > from) && cue.start <= to) this._startSound(cue, 0);
		}
	}

	protected _isTrack (cue: IgeTimelineSoundCue): boolean {
		return !!(cue.track || cue.loop || cue.end !== undefined);
	}

	protected _startSound (cue: IgeTimelineSoundCue, offset: number): void {
		const handle = this.audio.start(cue.source, { offset, loop: !!cue.loop, volume: cue.volume ?? 1, rate: igeTimelineSoundRate(this._rate) });
		if (!handle) return;
		this._sounds.push({ cue, handle });
		if (this._sounds.length > 64) this._sounds.shift()?.handle.stop();
	}

	protected _stopSounds (): void {
		for (const s of this._sounds) s.handle.stop();
		this._sounds.length = 0;
	}

	/** While playing: long sounds that should be sounding now and aren't are started at the right offset; ones whose time has gone are stopped. */
	protected _syncSounds (): void {
		if (!this._playing) return;
		const t = this._time;
		for (const cue of this._data.sounds) {
			if (!this._isTrack(cue)) continue;
			const length = this.audio.length?.(cue.source);
			const end = cue.end ?? (cue.loop ? this._data.duration : length !== undefined ? cue.start + length : Infinity);
			const live = this._sounds.findIndex((s) => s.cue === cue);
			const inside = t >= cue.start && t < end;
			if (inside && live < 0) {
				let offset = t - cue.start;
				if (length && length > 0) {
					if (cue.loop) offset %= length;
					else if (offset >= length) continue;
				}
				this._startSound(cue, offset);
			} else if (!inside && live >= 0) {
				this._sounds[live].handle.stop();
				this._sounds.splice(live, 1);
			}
		}
	}
}

/** A deep copy of JSON-able data. */
function structuredCloneJson<T> (v: T): T {
	return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

export type { IgeParticleVec3 };
