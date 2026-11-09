/**
 * The music synthesiser, run in a Web Worker so rendering never blocks the
 * game (OfflineAudioContext isn't available in workers, and building its
 * node graph on the main thread froze the page).
 *
 * The main thread sends a list of note events; the worker renders each with
 * its instrument (pure JavaScript DSP: band-limited saws, biquad filters,
 * envelopes, Karplus-Strong strings, noise), pans it into a stereo mix plus
 * a reverb send, runs a Freeverb-style hall on the send, and posts the two
 * channels back, with progress messages along the way.
 *
 * `synthWorkerMain` must stay self-contained (no imports, no outside
 * variables): its source text becomes the worker.
 */

/** One note for the synthesiser. Times are seconds from the start of the chunk. */
export interface SynthEvent {
	/** Instrument. */
	i: "str" | "brass" | "horn" | "choirA" | "choirO" | "timp" | "taiko" | "crash" | "swell" | "harp" | "flute" | "cel" | "sub";
	t: number;
	d: number;
	/** MIDI note. */
	m: number;
	/** Velocity 0-1. */
	v: number;
	/** Pan -1..1. */
	p: number;
	/** Reverb send 0-1. */
	w: number;
	/** Strings: attack, release, voices, brightness, vibrato depth (cents), level. */
	a?: number;
	r?: number;
	n?: number;
	b?: number;
	vib?: number;
	l?: number;
}

export interface SynthRequest {
	id: number;
	sr: number;
	length: number;
	reverb: number;
	events: SynthEvent[];
}

/* eslint-disable complexity, max-lines-per-function */
export function synthWorkerMain (): void {
	const scope = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown, t?: Transferable[]) => void };

	let seed = 22222;
	const rand = () => {
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		return (seed >>> 0) / 4294967296;
	};
	const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

	const SINE_N = 4096;
	const SINE = new Float32Array(SINE_N + 1);
	for (let i = 0; i <= SINE_N; i++) SINE[i] = Math.sin((i / SINE_N) * Math.PI * 2);
	const sin01 = (ph: number) => {
		const x = (ph - Math.floor(ph)) * SINE_N;
		const i = x | 0;
		return SINE[i] + (SINE[i + 1] - SINE[i]) * (x - i);
	};

	// Biquad (RBJ cookbook), direct form 1, state kept by the caller
	class Biquad {
		b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0;
		x1 = 0; x2 = 0; y1 = 0; y2 = 0;
		set (type: string, f: number, q: number, sr: number): void {
			const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr;
			const cs = Math.cos(w), sn = Math.sin(w), alpha = sn / (2 * q);
			let b0, b1, b2;
			const a0 = 1 + alpha;
			if (type === "lp") {
				b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2;
			} else if (type === "hp") {
				b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2;
			} else {
				b0 = alpha; b1 = 0; b2 = -alpha;
			}
			this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
			this.a1 = (-2 * cs) / a0; this.a2 = (1 - alpha) / a0;
		}
		run (x: number): number {
			const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
			this.x2 = this.x1; this.x1 = x;
			this.y2 = this.y1; this.y1 = y;
			return y;
		}
	}

	const polyblep = (t: number, dt: number) => {
		if (t < dt) {
			t /= dt;
			return t + t - t * t - 1;
		}
		if (t > 1 - dt) {
			t = (t - 1) / dt;
			return t * t + t + t + 1;
		}
		return 0;
	};

	let scratch = new Float32Array(1);
	const buffer = (n: number) => {
		if (scratch.length < n) scratch = new Float32Array(n);
		scratch.fill(0, 0, n);
		return scratch;
	};

	function render (req: SynthRequest): { left: Float32Array; right: Float32Array } {
		const sr = req.sr;
		const len = Math.ceil(req.length * sr);
		const L = new Float32Array(len), R = new Float32Array(len);
		const SL = new Float32Array(len), SR2 = new Float32Array(len);
		const harpCache: Record<number, Float32Array> = {};
		const total = req.events.length;
		let lastReport = 0;

		const mixNote = (buf: Float32Array, n: number, start: number, pan: number, wet: number) => {
			const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
			const gl = Math.cos(angle), gr = Math.sin(angle);
			const end = Math.min(len, start + n);
			for (let i = Math.max(0, start), j = Math.max(0, -start); i < end; i++, j++) {
				const x = buf[j];
				L[i] += x * gl;
				R[i] += x * gr;
				SL[i] += x * gl * wet;
				SR2[i] += x * gr * wet;
			}
		};

		const saws = (out: Float32Array, n: number, f: number, voices: number, spread: number, vibCents: number, vibRate: number, vibDelay: number, scoop: number, scoopLen: number) => {
			const phases: number[] = [], incs: number[] = [];
			for (let v = 0; v < voices; v++) {
				const cents = (v - (voices - 1) / 2) * spread + (rand() - 0.5) * 6;
				phases.push(rand());
				incs.push((f * Math.pow(2, cents / 1200)) / sr);
			}
			const lfoInc = vibRate / sr;
			let lfo = rand();
			const block = 16;
			for (let i0 = 0; i0 < n; i0 += block) {
				// Vibrato (fading in) and the attack's pitch scoop, per block
				const vibAmt = vibCents * Math.min(1, i0 / Math.max(1, vibDelay));
				let cents = vibAmt * sin01(lfo);
				if (scoop && i0 < scoopLen) cents += scoop * (1 - i0 / scoopLen);
				lfo += lfoInc * block;
				const k = Math.pow(2, cents / 1200);
				const i1 = Math.min(n, i0 + block);
				for (let v = 0; v < voices; v++) {
					const inc = incs[v] * k;
					let ph = phases[v];
					for (let i = i0; i < i1; i++) {
						out[i] += 2 * ph - 1 - polyblep(ph, inc);
						ph += inc;
						if (ph >= 1) ph -= 1;
					}
					phases[v] = ph;
				}
			}
		};

		const filterBuf = (buf: Float32Array, n: number, type: string, f: number | ((i: number) => number), q: number, stages = 1) => {
			for (let s = 0; s < stages; s++) {
				const bq = new Biquad();
				if (typeof f === "number") {
					bq.set(type, f, q, sr);
					for (let i = 0; i < n; i++) buf[i] = bq.run(buf[i]);
				} else {
					for (let i0 = 0; i0 < n; i0 += 32) {
						bq.set(type, f(i0), q, sr);
						const i1 = Math.min(n, i0 + 32);
						for (let i = i0; i < i1; i++) buf[i] = bq.run(buf[i]);
					}
				}
			}
		};

		const applyEnv = (buf: Float32Array, n: number, attS: number, durS: number, relS: number, peak: number) => {
			const att = Math.max(1, Math.floor(attS * sr));
			const hold = Math.min(n, Math.max(att, Math.floor(durS * sr)));
			// Exponential release reaching ~1/1000 at relS
			const relCoef = Math.pow(0.001, 1 / Math.max(1, relS * sr));
			let i = 0;
			for (; i < Math.min(att, n); i++) buf[i] *= (peak * i) / att;
			for (; i < hold; i++) buf[i] *= peak;
			let g = peak;
			for (; i < n; i++) {
				buf[i] *= g;
				g *= relCoef;
			}
		};

		const noiseInto = (buf: Float32Array, n: number, amp: number) => {
			for (let i = 0; i < n; i++) buf[i] += (rand() * 2 - 1) * amp;
		};

		/** A decaying (or swelling) filtered noise burst mixed straight in. */
		const noiseBurst = (t: number, dur: number, type: string, f: number, q: number, peak: number, pan: number, wet: number, attack = 0.002, rise = false) => {
			const n = Math.floor((dur * 1.3 + attack) * sr);
			const buf = buffer(n);
			noiseInto(buf, n, 1);
			filterBuf(buf, n, type, f, q, type === "bp" ? 1 : 2);
			const att = Math.max(1, Math.floor(attack * sr));
			const k = Math.pow(0.001, 1 / Math.max(1, dur * sr));
			for (let i = 0; i < n; i++) {
				if (rise) buf[i] *= peak * Math.pow(i / n, 3);
				else buf[i] *= i < att ? (peak * i) / att : peak * Math.pow(k, i - att);
			}
			mixNote(buf, n, Math.floor(t * sr), pan, wet);
		};

		const harpString = (m: number) => {
			const cached = harpCache[m];
			if (cached) return cached;
			const f = hz(m);
			const n = Math.floor(sr * 2.6);
			const d = new Float32Array(n);
			const period = Math.max(2, Math.round(sr / f - 0.5));
			let prev = 0;
			for (let i = 0; i < period; i++) {
				prev = prev * 0.55 + (rand() * 2 - 1) * 0.45;
				d[i] = prev;
			}
			const decay = 0.9975 - Math.max(0, m - 60) * 0.00012;
			for (let i = period; i < n; i++) d[i] = decay * 0.5 * (d[i - period] + (i - period - 1 >= 0 ? d[i - period - 1] : 0));
			const fade = Math.floor(sr * 0.3);
			for (let i = 0; i < fade; i++) d[n - 1 - i] *= i / fade;
			harpCache[m] = d;
			return d;
		};

		const sines = (buf: Float32Array, n: number, partials: [number, number, number][], f: number, drop = 0, dropLen = 0.09) => {
			for (const [mult, amp, decay] of partials) {
				let ph = 0;
				const k = Math.pow(0.001, 1 / Math.max(1, decay * sr));
				let g = amp;
				const dl = dropLen * sr;
				for (let i = 0; i < n; i++) {
					const bend = drop && i < dl ? 1 + drop * (1 - i / dl) : 1;
					ph += (f * mult * bend) / sr;
					const atk = i < 40 ? i / 40 : 1;
					buf[i] += sin01(ph) * g * atk;
					g *= k;
				}
			}
		};

		req.events.forEach((e, index) => {
			const f = hz(e.m);
			const start = Math.floor(e.t * sr);
			switch (e.i) {
				case "str": {
					const att = e.a ?? 0.35, rel = e.r ?? 0.8, bright = e.b ?? 1;
					const n = Math.floor((Math.max(att, e.d) + rel * 1.1) * sr);
					const buf = buffer(n);
					saws(buf, n, f, e.n ?? 3, 8, e.vib ?? 6, 4.8 + rand() * 0.8, Math.min(0.7, e.d * 0.6 + 0.1) * sr, 0, 0);
					filterBuf(buf, n, "lp", Math.min(9000, f * 3 * bright + 700 + 1600 * e.v * bright), 0.6, 2);
					applyEnv(buf, n, att, Math.max(att, e.d), rel, (e.l ?? 0.05) * e.v);
					mixNote(buf, n, start, e.p, e.w);
					break;
				}
				case "brass":
				case "horn": {
					const horn = e.i === "horn";
					const rel = horn ? 0.45 : 0.3;
					const n = Math.floor((e.d + rel * 1.1) * sr);
					const buf = buffer(n);
					saws(buf, n, f, 3, 5, 3, 5, 0.3 * sr, -35, 0.07 * sr);
					if (horn) {
						// A little body an octave down
						let ph = 0;
						for (let i = 0; i < n; i++) {
							ph += f / 2 / sr;
							const x = ph - Math.floor(ph);
							buf[i] += (x < 0.5 ? 4 * x - 1 : 3 - 4 * x) * 0.35;
						}
					}
					const peak = Math.min(9000, f * (horn ? 2.6 : 4.5) + (horn ? 600 : 1400) * e.v);
					const rise = (horn ? 0.14 : 0.07) * sr;
					filterBuf(buf, n, "lp", (i) => (i < rise ? f * 1.2 + (peak - f * 1.2) * (i / rise) : peak * (0.7 + 0.3 * Math.exp(-(i - rise) / (0.3 * sr)))), horn ? 0.7 : 1.3, 2);
					applyEnv(buf, n, horn ? 0.09 : 0.04, e.d, rel, (e.l ?? (horn ? 0.07 : 0.06)) * e.v);
					mixNote(buf, n, start, e.p, e.w);
					break;
				}
				case "choirA":
				case "choirO": {
					const formants: [number, number, number][] = e.i === "choirA" ? [[780, 7, 1], [1180, 9, 0.5], [2800, 11, 0.18]] : [[430, 6, 1], [820, 8, 0.45], [2700, 11, 0.08]];
					const n = Math.floor((e.d + 1.2) * sr);
					const src = new Float32Array(n);
					saws(src, n, f, 4, 9, 14, 5.1 + rand() * 0.5, 0.8 * sr, 0, 0);
					const buf = buffer(n);
					for (const [ff, q, g] of formants) {
						const bq = new Biquad();
						bq.set("bp", ff, q, sr);
						for (let i = 0; i < n; i++) buf[i] += bq.run(src[i]) * g;
					}
					applyEnv(buf, n, 0.55, e.d, 1.1, 0.11 * e.v);
					mixNote(buf, n, start, e.p, e.w);
					break;
				}
				case "timp": {
					const n = Math.floor(2.3 * sr);
					const buf = buffer(n);
					sines(buf, n, [[1, 0.55, 1.6], [1.5, 0.2, 0.8], [1.99, 0.08, 0.5]], f, 0.06);
					for (let i = 0; i < n; i++) buf[i] *= e.v;
					mixNote(buf, n, start, 0.15, e.w);
					noiseBurst(e.t, 0.12, "bp", 220, 0.9, 0.25 * e.v, 0.15, e.w);
					break;
				}
				case "taiko": {
					const n = Math.floor(1.2 * sr);
					const buf = buffer(n);
					let ph = 0;
					const k = Math.pow(0.001, 1 / (0.7 * sr));
					let g = 0.9 * e.v;
					for (let i = 0; i < n; i++) {
						const fr = 42 + 53 * Math.exp(-i / (0.06 * sr));
						ph += fr / sr;
						buf[i] = sin01(ph) * g * (i < 20 ? i / 20 : 1);
						g *= k;
					}
					mixNote(buf, n, start, -0.05, e.w);
					noiseBurst(e.t, 0.09, "lp", 600, 0.5, 0.35 * e.v, -0.05, e.w);
					break;
				}
				case "crash":
					noiseBurst(e.t, 2.6, "hp", 5200, 0.5, 0.13 * e.v, -0.35, 0.5);
					noiseBurst(e.t, 1.9, "bp", 8800, 0.8, 0.3 * e.v, 0.35, 0.5);
					break;
				case "swell":
					noiseBurst(e.t - e.d, e.d, "hp", 3500, 0.5, 0.11 * e.v, 0, 0.6, 0.01, true);
					break;
				case "harp": {
					const s = harpString(e.m);
					const n = s.length;
					const buf = buffer(n);
					for (let i = 0; i < n; i++) buf[i] = s[i] * 0.42 * e.v;
					filterBuf(buf, n, "lp", 2400 + e.v * 2500, 0.7);
					mixNote(buf, n, start, e.p, e.w);
					break;
				}
				case "flute": {
					const n = Math.floor((e.d + 0.35) * sr);
					const buf = buffer(n);
					let ph = rand();
					let lfo = 0;
					const vib = e.d > 0.5 ? 11 : 4;
					for (let i = 0; i < n; i++) {
						lfo += 5.4 / sr;
						const cents = vib * Math.min(1, i / (0.5 * sr)) * sin01(lfo);
						ph += (f * Math.pow(2, cents / 1200)) / sr;
						const x = ph - Math.floor(ph);
						buf[i] = sin01(ph) + (x < 0.5 ? 4 * x - 1 : 3 - 4 * x) * 0.25 + sin01(ph * 2) * 0.12 + sin01(ph * 3) * 0.04;
					}
					applyEnv(buf, n, 0.07, e.d, 0.3, 0.13 * e.v);
					mixNote(buf, n, start, e.p, e.w);
					noiseBurst(e.t, Math.min(0.25, e.d), "bp", f * 2, 2, 0.04 * e.v, e.p, e.w, 0.04);
					break;
				}
				case "cel": {
					const n = Math.floor(2 * sr);
					const buf = buffer(n);
					sines(buf, n, [[1, 0.12, 1.4], [4.01, 0.03, 0.35], [2, 0.025, 0.7]], f);
					for (let i = 0; i < n; i++) buf[i] *= e.v;
					mixNote(buf, n, start, e.p, 0.6);
					break;
				}
				case "sub": {
					const n = Math.floor((e.d + 0.9) * sr);
					const buf = buffer(n);
					let ph = 0;
					for (let i = 0; i < n; i++) {
						ph += f / sr;
						buf[i] = sin01(ph);
					}
					applyEnv(buf, n, 0.25, e.d, 0.8, 0.16 * e.v);
					mixNote(buf, n, start, 0, 0.15);
					break;
				}
			}
			if (index - lastReport >= 40) {
				lastReport = index;
				scope.postMessage({ id: req.id, progress: index / total * 0.9 });
			}
		});

		// The hall: a Freeverb-style network (parallel damped combs, then all-passes) after a short pre-delay
		const scale = sr / 44100;
		const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
		const alls = [556, 441, 341, 225];
		const room = 0.86, damp = 0.28;
		const hall = (input: Float32Array, spread: number) => {
			const out = new Float32Array(len);
			const pre = Math.floor(0.026 * sr);
			// Keep the low end out of the reverb (it muddies)
			const hp = new Biquad();
			hp.set("hp", 180, 0.7, sr);
			const src = new Float32Array(len);
			for (let i = 0; i < len; i++) src[i] = hp.run(i >= pre ? input[i - pre] : 0) * 0.02;
			for (const c of combs) {
				const size = Math.floor((c + spread) * scale);
				const buf = new Float32Array(size);
				let idx = 0, store = 0;
				for (let i = 0; i < len; i++) {
					const y = buf[idx];
					store = y * (1 - damp) + store * damp;
					buf[idx] = src[i] + store * room;
					if (++idx >= size) idx = 0;
					out[i] += y;
				}
			}
			for (const a of alls) {
				const size = Math.floor((a + spread) * scale);
				const buf = new Float32Array(size);
				let idx = 0;
				for (let i = 0; i < len; i++) {
					const b = buf[idx];
					const x = out[i];
					out[i] = -x + b;
					buf[idx] = x + b * 0.5;
					if (++idx >= size) idx = 0;
				}
			}
			return out;
		};
		const wl = hall(SL, 0);
		scope.postMessage({ id: req.id, progress: 0.95 });
		const wr = hall(SR2, 23);
		const wet = req.reverb * 3.2;
		for (let i = 0; i < len; i++) {
			L[i] += wl[i] * wet;
			R[i] += wr[i] * wet;
		}
		return { left: L, right: R };
	}

	scope.onmessage = (e: MessageEvent) => {
		const req = e.data as SynthRequest;
		seed = 22222 + req.id * 7919;
		const { left, right } = render(req);
		scope.postMessage({ id: req.id, left, right }, [left.buffer, right.buffer]);
	};
}
