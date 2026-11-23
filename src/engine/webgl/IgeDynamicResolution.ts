/**
 * Dynamic resolution for IgeWebGlRenderer: picks the scale the 3D scene is drawn at (a fraction of the canvas's
 * size) so frames keep making the display's refresh. Pure logic, fed timings by the renderer, so it's tested with
 * made-up ones.
 *
 * - The display's refresh interval is the running median of requestAnimationFrame intervals. The frame budget is
 *   that, or the interval of `engine.maxRenderRate()` when that's capped and longer.
 * - A frame misses when the time since the last drawn one is over 1.5 budgets (a vsync skipped), or when the GPU's
 *   time for it (EXT_disjoint_timer_query_webgl2, when there is one) is over 95% of the budget.
 * - The scale moves on a ladder of steps of about 10% (each 0.9 of the one above, from maxScale down to minScale).
 *   Down one step when 3 frames in the last 0.5 s missed, at most every 0.5 s. Up one step after 2 s with no
 *   misses, at most every 2 s, and only when the GPU time (if known) says the next step up would still fit in 80%
 *   of the budget.
 * - To stop it hunting: a step that follows a step up which failed (misses came within 2 s of it) is refused for the
 *   level that failed for 30 s, doubling each time the same level fails again (up to 4 minutes).
 */

export interface IgeDynamicResolutionSettings {
	enabled: boolean;
	/** The lowest scale, as a fraction of the canvas's size. */
	minScale: number;
	/** The highest scale (1 = the canvas's own size). */
	maxScale: number;
}

export const IGE_DYNAMIC_RESOLUTION_DEFAULTS: IgeDynamicResolutionSettings = { enabled: false, minScale: 0.67, maxScale: 1 };

export const IGE_DR = {
	/** Each step down is this fraction of the one above (about 10% of linear scale). */
	step: 0.9,
	/** A frame whose interval is over this many budgets missed a vsync. */
	missFactor: 1.5,
	/** A frame whose GPU time is over this fraction of the budget missed. */
	gpuMissFraction: 0.95,
	/** Down when this many frames missed within the window. */
	missesToStepDown: 3,
	windowMs: 500,
	/** At most one step down per this long. */
	downIntervalMs: 500,
	/** At most one step up per this long, and only after this long without a miss. */
	upIntervalMs: 2000,
	clearMs: 2000,
	/** The GPU time at the next level up (predicted by area) must fit in this fraction of the budget. */
	upGpuFraction: 0.8,
	/** The level a step up failed at is refused for this long (doubling per repeat, to the cap). */
	lockoutMs: 30000,
	lockoutMaxMs: 240000,
	/** Intervals longer than this are idle or a stall (a hidden tab), not a missed frame. */
	ignoreOverMs: 500,
	/** Refresh samples kept, and needed before the controller acts. */
	refreshSamples: 60,
	refreshNeeded: 30,
	/** Smoothing of the GPU time. */
	gpuSmoothing: 0.1
} as const;

export interface IgeDynamicResolutionFrame {
	/** performance.now() as this frame started. */
	now: number;
	/** The GPU's time for a recent frame in ms, when the timer query gave one. */
	gpuMs?: number | null;
	/** False for on-demand or manual frames, whose intervals say nothing about speed (only the GPU time is used). */
	continuous?: boolean;
	/** The interval `maxRenderRate()` allows, in ms (0 = uncapped). */
	capMs?: number;
}

export class IgeDynamicResolution {
	settings: IgeDynamicResolutionSettings;

	protected _refresh: number[] = [];
	protected _lastRaf = -1;
	protected _lastFrame = -1;
	protected _misses: number[] = [];
	protected _lastMissAt = 0;
	protected _lastDownAt = -Infinity;
	protected _lastUpAt = -Infinity;
	protected _ladder: number[] = [1];
	protected _level = 0;
	protected _gpuAvg = 0;
	protected _lockout = new Map<number, { until: number; ms: number }>();
	/** The level a recent step up went to (so misses just after it count against it). */
	protected _upTo = -1;
	protected _upAt = -Infinity;

	constructor (settings: Partial<IgeDynamicResolutionSettings> = {}) {
		this.settings = { ...IGE_DYNAMIC_RESOLUTION_DEFAULTS, ...settings };
		this._buildLadder();
	}

	/** The current scale. */
	get scale (): number {
		return this._ladder[this._level];
	}

	/** The display's refresh interval in ms (the median of the rAF intervals seen; 0 until there are enough). */
	get refreshMs (): number {
		if (this._refresh.length < IGE_DR.refreshNeeded) return 0;
		const sorted = [...this._refresh].sort((a, b) => a - b);
		return sorted[sorted.length >> 1];
	}

	/** The frame budget in ms for a cap (0 = uncapped): the refresh interval, or the cap's when longer. */
	budgetMs (capMs: number = 0): number {
		const refresh = this.refreshMs;
		return refresh > 0 ? Math.max(refresh, capMs) : 0;
	}

	/** Change the settings; the ladder is rebuilt and the scale kept as near as it can. */
	configure (settings: Partial<IgeDynamicResolutionSettings>): void {
		const before = this.scale;
		const wasEnabled = this.settings.enabled;
		this.settings = { ...this.settings, ...settings };
		this._buildLadder();
		if (this.settings.enabled && !wasEnabled) {
			// Start at full and step down only if frames run late
			this._level = 0;
			this._reset();
		} else {
			this._level = this._nearest(before);
		}
	}

	/** One requestAnimationFrame timestamp (ms). */
	rafSample (ts: number): void {
		if (this._lastRaf >= 0) {
			const dt = ts - this._lastRaf;
			// (Dropped or throttled frames aren't the display's interval)
			if (dt > 2 && dt < 100) {
				this._refresh.push(dt);
				if (this._refresh.length > IGE_DR.refreshSamples) this._refresh.shift();
			}
		}
		this._lastRaf = ts;
	}

	/** Forget the frame history (a pause, the tab coming back). */
	resetTiming (): void {
		this._lastFrame = -1;
		this._reset();
	}

	/**
	 * One frame about to be drawn. Returns the scale to draw it at.
	 */
	frame (f: IgeDynamicResolutionFrame): number {
		if (!this.settings.enabled) return this.scale;
		const now = f.now;
		const interval = this._lastFrame >= 0 ? now - this._lastFrame : 0;
		this._lastFrame = now;
		const budget = this.budgetMs(f.capMs ?? 0);
		if (budget <= 0) return this.scale;

		const gpu = f.gpuMs;
		if (gpu != null && gpu >= 0) this._gpuAvg = this._gpuAvg === 0 ? gpu : this._gpuAvg + (gpu - this._gpuAvg) * IGE_DR.gpuSmoothing;

		let missed = false;
		if (f.continuous !== false && interval > 0 && interval < IGE_DR.ignoreOverMs && interval > budget * IGE_DR.missFactor) missed = true;
		if (gpu != null && gpu > budget * IGE_DR.gpuMissFraction) missed = true;
		if (missed) {
			this._misses.push(now);
			this._lastMissAt = now;
			// A miss soon after a step up counts against that level
			if (now - this._upAt < IGE_DR.clearMs && this._upTo === this._level) this._failUp(now);
		}
		while (this._misses.length && now - this._misses[0] > IGE_DR.windowMs) this._misses.shift();

		if (this._misses.length >= IGE_DR.missesToStepDown && now - this._lastDownAt >= IGE_DR.downIntervalMs && this._level < this._ladder.length - 1) {
			this._level++;
			this._lastDownAt = now;
			this._misses.length = 0;
			this._upTo = -1;
		} else if (
			this._level > 0 &&
			now - this._lastMissAt >= IGE_DR.clearMs &&
			now - this._lastUpAt >= IGE_DR.upIntervalMs &&
			now - this._lastDownAt >= IGE_DR.upIntervalMs &&
			this._canGoUp(now, budget)
		) {
			this._level--;
			this._lastUpAt = now;
			this._upTo = this._level;
			this._upAt = now;
		}
		return this.scale;
	}

	protected _canGoUp (now: number, budget: number): boolean {
		const target = this._level - 1;
		const lock = this._lockout.get(target);
		if (lock && now < lock.until) return false;
		if (this._gpuAvg > 0) {
			const ratio = this._ladder[target] / this.scale;
			if (this._gpuAvg * ratio * ratio > budget * IGE_DR.upGpuFraction) return false;
		}
		return true;
	}

	/** The level just stepped up to missed: refuse it for a while, longer each time. */
	protected _failUp (now: number): void {
		const level = this._upTo;
		const before = this._lockout.get(level);
		const ms = before ? Math.min(IGE_DR.lockoutMaxMs, before.ms * 2) : IGE_DR.lockoutMs;
		this._lockout.set(level, { until: now + ms, ms });
		this._upTo = -1;
	}

	protected _reset (): void {
		this._misses.length = 0;
		this._lastMissAt = this._lastFrame >= 0 ? this._lastFrame : 0;
		this._lastDownAt = -Infinity;
		this._lastUpAt = -Infinity;
		this._upTo = -1;
		this._gpuAvg = 0;
	}

	protected _buildLadder (): void {
		const max = Math.min(1, Math.max(0.1, this.settings.maxScale));
		const min = Math.min(max, Math.max(0.1, this.settings.minScale));
		const ladder = [max];
		let s = max;
		while (true) {
			const next = Math.round(s * IGE_DR.step * 1000) / 1000;
			if (next <= min + 0.015) break;
			ladder.push(next);
			s = next;
		}
		if (min < max) ladder.push(min);
		this._ladder = ladder;
		this._lockout.clear();
		this._level = Math.min(this._level, ladder.length - 1);
	}

	protected _nearest (scale: number): number {
		let best = 0;
		for (let i = 1; i < this._ladder.length; i++) {
			if (Math.abs(this._ladder[i] - scale) < Math.abs(this._ladder[best] - scale)) best = i;
		}
		return best;
	}
}

/** GPU time of the frame from EXT_disjoint_timer_query_webgl2 (WebGL 2), when the browser has it. */
export class IgeGpuFrameTimer {
	protected _gl: WebGL2RenderingContext;
	protected _ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
	protected _pending: WebGLQuery[] = [];
	protected _free: WebGLQuery[] = [];
	protected _open: WebGLQuery | null = null;
	/** The latest finished measurement, ms. */
	last: number | null = null;

	constructor (gl: WebGL2RenderingContext) {
		this._gl = gl;
		this._ext = (gl.getExtension("EXT_disjoint_timer_query_webgl2") as IgeGpuFrameTimer["_ext"]) ?? null;
	}

	get available (): boolean {
		return !!this._ext;
	}

	begin (): void {
		const ext = this._ext, gl = this._gl;
		if (!ext || this._open || this._pending.length > 6) return;
		const q = this._free.pop() ?? gl.createQuery();
		if (!q) return;
		gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
		this._open = q;
	}

	end (): void {
		const ext = this._ext, gl = this._gl;
		if (!ext || !this._open) return;
		gl.endQuery(ext.TIME_ELAPSED_EXT);
		this._pending.push(this._open);
		this._open = null;
	}

	/** Collect the results that are ready (call once a frame, before begin()). */
	poll (): number | null {
		const ext = this._ext, gl = this._gl;
		if (!ext) return null;
		const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
		while (this._pending.length) {
			const q = this._pending[0];
			if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
			this._pending.shift();
			if (!disjoint) this.last = (gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6;
			this._free.push(q);
		}
		return this.last;
	}

	/** After the context is lost: the queries are gone. */
	contextLost (): void {
		this._pending.length = 0;
		this._free.length = 0;
		this._open = null;
		this.last = null;
		this._ext = null;
	}
}
