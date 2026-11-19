import {
	IgeTimeline,
	type IgeTimelineAnimation,
	type IgeTimelineColor,
	type IgeTimelineData,
	type IgeTimelineEase,
	type IgeTimelineKey,
	type IgeTimelineParticleCue,
	type IgeTimelineProperty,
	type IgeTimelineQuat,
	type IgeTimelineSoundCue,
	type IgeTimelineTrackData,
	type IgeTimelineVec3
} from "@/engine/timeline/IgeTimeline";

/** What a keyframe sets, any of it at once. */
export interface IgeTimelineKeyValues {
	position?: IgeTimelineVec3;
	/** Euler angles in radians. */
	rotation?: IgeTimelineVec3;
	quaternion?: IgeTimelineQuat;
	scale?: IgeTimelineVec3;
	visible?: boolean;
	color?: IgeTimelineColor;
	opacity?: number;
	/** A clip name, or a clip with its time and speed. */
	animation?: string | IgeTimelineAnimation;
}

const KEY_PROPERTIES: IgeTimelineProperty[] = ["position", "rotation", "quaternion", "scale", "visible", "color", "opacity", "animation"];

/** The keyframes of one target, built with at(). */
export class IgeTimelineTrackBuilder {
	/** @internal */
	readonly _tracks = new Map<IgeTimelineProperty, IgeTimelineKey[]>();

	/**
	 * Keyframe(s) at `time` seconds. Everything in `values` gets a key at this time. `ease` is how those values
	 * move on to their next key: "linear" (default for numbers), "smooth" or "step".
	 */
	at (time: number, values: IgeTimelineKeyValues, ease?: IgeTimelineEase): this {
		for (const property of KEY_PROPERTIES) {
			let value: unknown = values[property];
			if (value === undefined) continue;
			if (property === "animation" && typeof value === "string") value = { clip: value };
			const keys = this._tracks.get(property) ?? [];
			keys.push({ t: time, value, ...(ease ? { ease } : {}) });
			this._tracks.set(property, keys);
		}
		return this;
	}
}

/**
 * Writes timeline data in TypeScript:
 *
 *     const data = timeline({ loop: false })
 *         .track("ring", t => t.at(0, { position: { x: 0, y: 0, z: 0 } }).at(2.5, { position: { x: 100, y: 0, z: 0 } }, "smooth"))
 *         .cut("panel", 0, "main").cut("panel", 4, "wide")
 *         .caption(0.5, 3, "Foreman", "Did you hear that?")
 *         .sound(0.5, "alarm")
 *         .event(2, "sparks", { at: "hatch" })
 *         .build();
 *
 * build() gives the plain, JSON-able data an IgeTimeline reads.
 */
export class IgeTimelineBuilder {
	protected _data: IgeTimelineData = {};
	protected _tracks = new Map<string, IgeTimelineTrackData>();

	constructor (options: { duration?: number; loop?: boolean } = {}) {
		if (options.duration !== undefined) this._data.duration = options.duration;
		if (options.loop !== undefined) this._data.loop = options.loop;
	}

	duration (seconds: number): this {
		this._data.duration = seconds;
		return this;
	}

	loop (val: boolean = true): this {
		this._data.loop = val;
		return this;
	}

	/** Keyframes for a target (a name the game binds to an entity). Calling it again for the same target adds keys. */
	track (target: string, build: (track: IgeTimelineTrackBuilder) => unknown): this {
		const track = new IgeTimelineTrackBuilder();
		build(track);
		for (const [property, keys] of track._tracks) this._addKeys(target, property, keys);
		return this;
	}

	/** Cut a panel's camera to `camera` (a name from `panel.newCamera()`; "main" is its first) at a time. `panel` is the name the panel is bound under. */
	cut (panel: string, at: number, camera: string): this {
		this._addKeys(panel, "camera", [{ t: at, value: camera, ease: "step" }]);
		return this;
	}

	/** A caption from `start` up to `end`. */
	caption (start: number, end: number, speaker: string | undefined, text: string): this {
		(this._data.captions ??= []).push({ start, end, ...(speaker ? { speaker } : {}), text });
		return this;
	}

	/** A sound by audio source id; give `loop`, `end` or `track` for a long one (see IgeTimelineSoundCue). */
	sound (start: number, source: string, options: Omit<IgeTimelineSoundCue, "start" | "source"> = {}): this {
		(this._data.sounds ??= []).push({ start, source, ...options });
		return this;
	}

	/** A named cue with data, fired when play crosses it. */
	event (at: number, name: string, data?: unknown): this {
		(this._data.events ??= []).push({ at, name, ...(data !== undefined ? { data } : {}) });
		return this;
	}

	/** A particle burst or stream on a bound particle system (see IgeTimelineParticleCue). */
	particles (target: string, at: number, options: Omit<IgeTimelineParticleCue, "target" | "at"> = {}): this {
		(this._data.particles ??= []).push({ target, at, ...options });
		return this;
	}

	/** The plain data (a copy). */
	build (): IgeTimelineData {
		const data: IgeTimelineData = JSON.parse(JSON.stringify(this._data));
		data.tracks = [...this._tracks.values()].map((t) => JSON.parse(JSON.stringify(t)));
		return data;
	}

	/** build(), loaded into a timeline. */
	create (): IgeTimeline {
		return new IgeTimeline(this.build());
	}

	protected _addKeys (target: string, property: IgeTimelineProperty, keys: IgeTimelineKey[]): void {
		const id = `${target}\u0000${property}`;
		let track = this._tracks.get(id);
		if (!track) {
			track = { target, property, keys: [] };
			this._tracks.set(id, track);
		}
		track.keys.push(...keys);
	}
}

/** Start writing a timeline: `timeline().track(...).caption(...).build()`. */
export function timeline (options?: { duration?: number; loop?: boolean }): IgeTimelineBuilder {
	return new IgeTimelineBuilder(options);
}
