interface IgeNetHistoryTrack {
	/** `ticks * width` numbers, ring-ordered by tick. */
	data: Float64Array;
	/** The tick each ring slot holds, or -1. */
	ticks: Float64Array;
	/** The newest tick recorded. */
	last: number;
}

/**
 * Recent positions of the things a game lets players hit, kept so the authority can ask where
 * something was a little while ago (lag compensation, stage 4). A fixed ring of ticks holds a few
 * numbers per id per tick (2 for x and z, 3 for x, y and z).
 *
 * Record what can be hit once per step after things have moved, then ask for the tick the shooter
 * was looking at: `history.at(id, host.viewTick(player))`.
 *
 * Memory is bounded by what was recorded recently: an id not recorded for longer than the window is
 * dropped (its arrays are reused by the next new id), and recording does not allocate in steady state.
 * @example #Record after each step, rewind for a shot
 *     const history = new IgeNetHistory(IgeNetHistory.ticksFor(250, 30), 2);
 *     // in step(): history.record(tick, ship.id, ship.x, ship.z);
 *     const at = history.at(ship.id, host.viewTick(player)); // [x, z] or undefined
 */
export class IgeNetHistory {
	readonly ticks: number;
	readonly width: number;
	_tracks: Map<string, IgeNetHistoryTrack> = new Map();
	_spare: IgeNetHistoryTrack[] = [];
	_newest = -1;
	_swept = 0;

	/** @param ticks How many ticks the ring holds. @param width Numbers per entry. */
	constructor (ticks: number, width: number = 2) {
		this.ticks = Math.max(2, Math.floor(ticks));
		this.width = Math.max(1, Math.floor(width));
	}

	/** Ring size for a rewind cap (ms) at a tick rate, with a margin of a few ticks for the blend and the step being recorded. */
	static ticksFor (maxRewindMs: number, tickRate: number): number {
		return Math.ceil((maxRewindMs * tickRate) / 1000) + 3;
	}

	/** The newest tick recorded (-1 before any). */
	newestTick (): number {
		return this._newest;
	}

	/** How many ids are held. */
	size (): number {
		return this._tracks.size;
	}

	/** Stores an entry (`width` numbers) for the id at the whole tick. */
	record (tick: number, id: string, ...values: number[]): void {
		let track = this._tracks.get(id);
		if (!track) {
			track = this._spare.pop();
			if (track) track.ticks.fill(-1);
			else track = { data: new Float64Array(this.ticks * this.width), ticks: new Float64Array(this.ticks).fill(-1), last: -1 };
			this._tracks.set(id, track);
		}
		const slot = ((tick % this.ticks) + this.ticks) % this.ticks;
		const base = slot * this.width;
		for (let i = 0; i < this.width; i++) track.data[base + i] = values[i] ?? 0;
		track.ticks[slot] = tick;
		if (tick > track.last) track.last = tick;
		if (tick > this._newest) {
			this._newest = tick;
			if (tick - this._swept >= this.ticks) this._sweep(tick);
		}
	}

	_sweep (tick: number): void {
		this._swept = tick;
		for (const [id, track] of this._tracks) {
			if (track.last <= tick - this.ticks) {
				this._tracks.delete(id);
				this._spare.push(track);
			}
		}
	}

	_slot (track: IgeNetHistoryTrack, tick: number): number {
		const slot = ((tick % this.ticks) + this.ticks) % this.ticks;
		return track.ticks[slot] === tick ? slot * this.width : -1;
	}

	/**
	 * The entry at a (fractional) tick, blended between the recorded ticks either side; when only one
	 * side was recorded, that side. `undefined` when neither was (the id wasn't there, or the tick is
	 * outside the window). Fills `out` when given.
	 */
	at (id: string, tick: number, out?: number[]): number[] | undefined {
		const track = this._tracks.get(id);
		if (!track || tick <= this._newest - this.ticks) return undefined;
		const t0 = Math.floor(tick);
		const a = this._slot(track, t0);
		const frac = tick - t0;
		const b = frac > 0 ? this._slot(track, t0 + 1) : -1;
		if (a < 0 && b < 0) return undefined;
		const result = out ?? new Array<number>(this.width);
		const d = track.data;
		for (let i = 0; i < this.width; i++) {
			result[i] = a < 0 ? d[b + i] : b < 0 ? d[a + i] : d[a + i] + (d[b + i] - d[a + i]) * frac;
		}
		return result;
	}

	/** Drops one id. */
	forget (id: string): void {
		const track = this._tracks.get(id);
		if (!track) return;
		this._tracks.delete(id);
		this._spare.push(track);
	}

	/** Drops everything. */
	clear (): void {
		for (const track of this._tracks.values()) this._spare.push(track);
		this._tracks.clear();
		this._newest = -1;
		this._swept = 0;
	}
}
