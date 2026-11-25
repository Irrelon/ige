/**
 * Spreads geometry uploads across frames: each frame may upload up to a budget of bytes and milliseconds, and what
 * doesn't fit waits, in order, for the next. The renderer keeps one (`renderer.uploadBudget()`); entities whose mesh
 * is waiting don't draw until it's up (or draw the mesh they had before).
 *
 * The first upload of a frame always goes, however big, so a mesh larger than the budget still gets there. The time
 * budget is kept by predicting each upload's time from the bytes per millisecond measured so far.
 */

/** A frame's upload budget. Infinity (the default) for either means no limit on it. */
export interface IgeUploadBudget {
	/** Bytes of vertex and index buffers a frame may upload. */
	bytes: number;
	/** Milliseconds a frame may spend uploading (packing included). */
	ms: number;
}

/** What one frame uploaded. */
export interface IgeUploadFrame {
	uploads: number;
	bytes: number;
	ms: number;
}

interface IgeUploadEntry<T> {
	key: string;
	item: T;
	bytes: number;
	priority: number;
	order: number;
}

export class IgeGeometryUploadQueue<T> {
	budget: IgeUploadBudget = { bytes: Infinity, ms: Infinity };
	/** This frame's uploads so far. */
	frame: IgeUploadFrame = { uploads: 0, bytes: 0, ms: 0 };
	protected _queue: IgeUploadEntry<T>[] = [];
	protected _keys: Map<string, IgeUploadEntry<T>> = new Map();
	protected _order = 0;
	/** Measured milliseconds per byte (a moving average), to predict an upload's time; -1 until measured. */
	protected _msPerByte = -1;
	protected _upload: (item: T) => void;
	protected _now: () => number;

	/**
	 * @param upload Uploads one item (called when it's its turn).
	 * @param now The clock, in milliseconds (performance.now() by default).
	 */
	constructor (upload: (item: T) => void, now: () => number = () => performance.now()) {
		this._upload = upload;
		this._now = now;
	}

	/** True when a budget is set (uploads may wait). */
	get limited (): boolean {
		return this.budget.bytes !== Infinity || this.budget.ms !== Infinity;
	}

	/** Items waiting. */
	get length (): number {
		return this._queue.length;
	}

	/** Bytes waiting. */
	get queuedBytes (): number {
		let total = 0;
		for (const e of this._queue) total += e.bytes;
		return total;
	}

	/** Milliseconds an upload of `bytes` is expected to take (0 until one has been measured). */
	predictMs (bytes: number): number {
		return this._msPerByte < 0 ? 0 : this._msPerByte * bytes;
	}

	/** Whether an upload of `bytes` fits what's left of this frame's budget (the frame's first always does). */
	fits (bytes: number): boolean {
		const f = this.frame;
		if (f.uploads === 0) return true;
		return f.bytes + bytes <= this.budget.bytes && f.ms + this.predictMs(bytes) <= this.budget.ms;
	}

	/** A new frame: its counts reset, then waiting items uploaded in turn while they fit. */
	beginFrame (): void {
		this.frame = { uploads: 0, bytes: 0, ms: 0 };
		while (this._queue.length > 0 && this.fits(this._queue[0].bytes)) {
			const entry = this._queue.shift()!;
			this._keys.delete(entry.key);
			this._run(entry);
		}
	}

	/**
	 * Asks for an item to be uploaded: now, when nothing is waiting and it fits this frame's budget (returns true),
	 * or else in its turn (returns false). Lower priorities go first; equal ones in the order asked. Asking again for
	 * one that's waiting only lowers its priority (moves it up) if the new one is lower.
	 */
	request (key: string, item: T, bytes: number, priority: number = 0): boolean {
		const waiting = this._keys.get(key);
		if (waiting) {
			if (priority < waiting.priority) {
				this._queue.splice(this._queue.indexOf(waiting), 1);
				waiting.priority = priority;
				this._insert(waiting);
			}
			return false;
		}
		const entry: IgeUploadEntry<T> = { key, item, bytes, priority, order: this._order++ };
		if (this._queue.length === 0 && this.fits(bytes)) {
			this._run(entry);
			return true;
		}
		this._keys.set(key, entry);
		this._insert(entry);
		return false;
	}

	/** Whether an item is waiting. */
	has (key: string): boolean {
		return this._keys.has(key);
	}

	/** Takes a waiting item out (its mesh was released before its turn). Returns true if it was waiting. */
	remove (key: string): boolean {
		const entry = this._keys.get(key);
		if (!entry) return false;
		this._keys.delete(key);
		this._queue.splice(this._queue.indexOf(entry), 1);
		return true;
	}

	/** Everything waiting dropped. */
	clear (): void {
		this._queue.length = 0;
		this._keys.clear();
	}

	protected _insert (entry: IgeUploadEntry<T>): void {
		const q = this._queue;
		let i = q.length;
		while (i > 0 && (q[i - 1].priority > entry.priority || (q[i - 1].priority === entry.priority && q[i - 1].order > entry.order))) i--;
		q.splice(i, 0, entry);
	}

	protected _run (entry: IgeUploadEntry<T>): void {
		const t0 = this._now();
		this._upload(entry.item);
		const ms = Math.max(0, this._now() - t0);
		const f = this.frame;
		f.uploads++;
		f.bytes += entry.bytes;
		f.ms += ms;
		if (entry.bytes > 0) {
			const rate = ms / entry.bytes;
			this._msPerByte = this._msPerByte < 0 ? rate : this._msPerByte * 0.8 + rate * 0.2;
		}
	}
}
