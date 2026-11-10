import type { SynthEvent } from "./musicSynth";

/**
 * Writing music for the synthesised orchestra: note names, seeded random
 * numbers, and the Score that collects a piece's notes (see music.ts for
 * rendering and playback, tracks.ts for the in-game pieces).
 */

// ------------------------------------------------------------------
// Notes
// ------------------------------------------------------------------

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "D4", "Bb3", "F#5" -> MIDI note number. */
export function note (name: string): number {
	const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
	if (!m) throw new Error(`Bad note ${name}`);
	return 12 * (Number(m[3]) + 1) + STEP[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

/** Small seeded random numbers, so a piece is the same every time. */
export function rng (seed: number): () => number {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return (s >>> 0) / 4294967296;
	};
}

// ------------------------------------------------------------------
// Writing notes
// ------------------------------------------------------------------

export interface StringOpts { attack?: number; release?: number; pan?: number; bright?: number; voices?: number; wet?: number; vibrato?: number; level?: number }

/** Collects a piece's notes. */
export class Score {
	events: SynthEvent[] = [];

	strings (t: number, d: number, m: number, v: number, o: StringOpts = {}): void {
		this.events.push({ i: "str", t, d, m, v, p: o.pan ?? 0, w: o.wet ?? 0.45, a: o.attack, r: o.release, n: o.voices, b: o.bright, vib: o.vibrato, l: o.level });
	}

	brass (t: number, d: number, m: number, v: number, o: { pan?: number; wet?: number; horn?: boolean; level?: number } = {}): void {
		this.events.push({ i: o.horn ? "horn" : "brass", t, d, m, v, p: o.pan ?? 0, w: o.wet ?? 0.4, l: o.level });
	}

	choir (t: number, d: number, m: number, v: number, vowel: "a" | "o" = "a", pan = 0, wet = 0.7): void {
		this.events.push({ i: vowel === "a" ? "choirA" : "choirO", t, d, m, v, p: pan, w: wet });
	}

	timpani (t: number, m: number, v: number, wet = 0.5): void {
		this.events.push({ i: "timp", t, d: 0, m, v, p: 0.15, w: wet });
	}

	timpaniRoll (t: number, dur: number, m: number, v0: number, v1: number, r: () => number): void {
		const hits = Math.floor(dur / 0.075);
		for (let i = 0; i < hits; i++) {
			const k = i / Math.max(1, hits - 1);
			// One drum, struck fast: the hits overlap and sustain each other rather than stacking up
			this.timpani(t + i * 0.075 + (r() - 0.5) * 0.01, m, (v0 + (v1 - v0) * k) * (0.85 + r() * 0.15) * 0.16, 0.55);
		}
	}

	taiko (t: number, v: number, wet = 0.35): void {
		this.events.push({ i: "taiko", t, d: 0, m: 0, v, p: -0.05, w: wet });
	}

	crash (t: number, v: number): void {
		this.events.push({ i: "crash", t, d: 0, m: 0, v, p: 0, w: 0.5 });
	}

	/** A cymbal swell arriving at `t`, `d` seconds long. */
	swell (t: number, d: number, v: number): void {
		this.events.push({ i: "swell", t, d, m: 0, v, p: 0, w: 0.6 });
	}

	harp (t: number, m: number, v: number, pan = -0.3, wet = 0.55): void {
		this.events.push({ i: "harp", t, d: 0, m, v, p: pan, w: wet });
	}

	flute (t: number, d: number, m: number, v: number, pan = 0.25, wet = 0.5): void {
		this.events.push({ i: "flute", t, d, m, v, p: pan, w: wet });
	}

	celesta (t: number, m: number, v: number, pan = 0.4): void {
		this.events.push({ i: "cel", t, d: 0, m, v, p: pan, w: 0.6 });
	}

	sub (t: number, d: number, m: number, v: number): void {
		this.events.push({ i: "sub", t, d, m, v, p: 0, w: 0.15 });
	}
}

/** When a note starts sounding, and roughly when it has died away. */
export function span (e: SynthEvent): [number, number] {
	if (e.i === "swell") return [e.t - e.d, e.t + 0.1];
	const tails: Partial<Record<SynthEvent["i"], number>> = { timp: 2.3, taiko: 1.2, crash: 3.4, harp: 2.6, cel: 2, choirA: 1.2, choirO: 1.2 };
	return [e.t, e.t + e.d + (tails[e.i] ?? (e.r ?? 0.8) * 1.1 + 0.5)];
}
