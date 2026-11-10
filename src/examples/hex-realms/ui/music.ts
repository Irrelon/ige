import { audioContext, musicOut } from "./audio";
import { type SynthEvent, synthWorkerMain } from "./musicSynth";
import { note, rng, Score, span } from "./score";
import { trackScore, TRACKS } from "./tracks";

/**
 * The game's music: composed here as lists of notes for a small synthesised
 * orchestra (strings, brass, horns, choir, timpani, taiko, cymbals, harp,
 * flute, celesta), rendered in a Web Worker (musicSynth.ts) and played
 * through the music volume bus.
 *
 * A piece is rendered in chunks of a few bars, each chunk holding the notes
 * that start inside it (with their full tails), and the chunks are summed
 * on playback. Mixing is linear, so the sum is exactly the whole piece, and
 * playback starts as soon as the first chunk is ready.
 *
 * - The title theme is a composed piece in D minor: a hushed opening (low
 *   strings, choir, harp), the horn theme over a driving string ostinato and
 *   drums, the full orchestra restating it, and a bright D major close.
 * - In-game music is eight composed pieces (tracks.ts), orchestral,
 *   exciting, wistful and pastoral, played one after another in order.
 */

const SR = 32000;
const MUSIC_DEBUG = typeof location !== "undefined" && location.search.includes("musicdebug");
/** Output level for the rendered mix (the limiter on the bus catches peaks). */
const MIX_GAIN = 0.85;

// ------------------------------------------------------------------
// The title theme
// ------------------------------------------------------------------

type Chord = { pad: string[]; cello: string; bass: string; choir: string[]; ost: string[] };

const CH: Record<string, Chord> = {
	Dm: { pad: ["A3", "D4", "F4"], cello: "D3", bass: "D2", choir: ["D4", "F4", "A4"], ost: ["D3", "D3", "A3", "D3", "D3", "A3", "D3", "F3"] },
	Bb: { pad: ["Bb3", "D4", "F4"], cello: "Bb2", bass: "Bb1", choir: ["D4", "F4", "Bb4"], ost: ["Bb2", "Bb2", "F3", "Bb2", "Bb2", "F3", "Bb2", "D3"] },
	F: { pad: ["A3", "C4", "F4"], cello: "F2", bass: "F1", choir: ["C4", "F4", "A4"], ost: ["F2", "F2", "C3", "F2", "F2", "C3", "F2", "A2"] },
	C: { pad: ["G3", "C4", "E4"], cello: "C3", bass: "C2", choir: ["C4", "E4", "G4"], ost: ["C3", "C3", "G3", "C3", "C3", "G3", "C3", "E3"] },
	Gm: { pad: ["G3", "Bb3", "D4"], cello: "G2", bass: "G1", choir: ["D4", "G4", "Bb4"], ost: ["G2", "G2", "D3", "G2", "G2", "D3", "G2", "Bb2"] },
	A: { pad: ["A3", "C#4", "E4"], cello: "A2", bass: "A1", choir: ["C#4", "E4", "A4"], ost: ["A2", "A2", "E3", "A2", "A2", "E3", "A2", "C#3"] },
	D: { pad: ["A3", "D4", "F#4"], cello: "D3", bass: "D2", choir: ["D4", "F#4", "A4"], ost: ["D3", "D3", "A3", "D3", "D3", "A3", "D3", "F#3"] }
};

/** Melody as [note, beats] pairs. */
type Phrase = [string, number][];

const THEME_A: Phrase[] = [
	[["D4", 2], ["A4", 1], ["G4", 0.5], ["F4", 0.5]],
	[["F4", 1.5], ["G4", 0.5], ["D4", 2]],
	[["C4", 1], ["F4", 1], ["A4", 1.5], ["G4", 0.5]],
	[["G4", 3], ["E4", 1]],
	[["D4", 2], ["A4", 1], ["C5", 0.5], ["Bb4", 0.5]],
	[["A4", 1.5], ["Bb4", 0.5], ["F4", 2]],
	[["G4", 1], ["Bb4", 1], ["D5", 1.5], ["C5", 0.5]],
	[["A4", 2], ["C#5", 1], ["E5", 1]]
];
const THEME_B: Phrase[] = [
	[["D5", 2], ["A5", 1], ["G5", 0.5], ["F5", 0.5]],
	[["F5", 1.5], ["G5", 0.5], ["D5", 2]],
	[["C5", 1], ["F5", 1], ["A5", 1.5], ["G5", 0.5]],
	[["G5", 3], ["E5", 1]],
	[["G5", 2], ["Bb5", 1], ["A5", 0.5], ["G5", 0.5]],
	[["F5", 1.5], ["G5", 0.5], ["D5", 2]],
	[["E5", 2], ["C#5", 1], ["E5", 1]],
	[["A5", 4]]
];
const CODA: Phrase[] = [
	[["F#5", 2], ["A5", 2]],
	[["F5", 2], ["D5", 2]],
	[["E5", 2], ["G5", 2]],
	[["F#5", 4]]
];

const TITLE_BPM = 76;
const TITLE_T0 = 0.4;

export function titleScore (): { score: Score; cuts: number[]; length: number } {
	const s = new Score();
	const r = rng(7);
	const B = 60 / TITLE_BPM;
	const at = (bar: number, beat = 0) => TITLE_T0 + ((bar - 1) * 4 + beat) * B;
	const barLen = 4 * B;

	const pads = (bar: number, chord: Chord, vel: number, o: { choir?: "a" | "o" | null; bright?: number; attack?: number; bars?: number } = {}) => {
		const t = at(bar), d = barLen * (o.bars ?? 1);
		chord.pad.forEach((n, i) => s.strings(t, d, note(n), vel, { attack: o.attack ?? 0.35, pan: -0.35 + i * 0.3, bright: o.bright ?? 1, voices: 3 }));
		s.strings(t, d, note(chord.cello), vel, { attack: o.attack ?? 0.3, pan: 0.35, voices: 3, bright: 0.8 });
		s.strings(t, d, note(chord.bass), vel * 0.9, { attack: o.attack ?? 0.3, pan: 0.5, voices: 2, bright: 0.6 });
		s.sub(t, d, note(chord.bass), vel);
		if (o.choir) chord.choir.forEach((n, i) => s.choir(t, d, note(n), vel * 0.85, o.choir as "a" | "o", -0.2 + i * 0.2));
	};
	const ostinato = (bar: number, chord: Chord, vel: number) => {
		chord.ost.forEach((n, i) => {
			const accent = i === 0 || i === 3 || i === 6 ? 1 : 0.62;
			const t = at(bar, i * 0.5);
			s.strings(t, B * 0.32, note(n), vel * accent, { attack: 0.012, release: 0.14, pan: 0.25, voices: 2, bright: 1.3, wet: 0.3, vibrato: 0, level: 0.075 });
			s.strings(t, B * 0.32, note(n) + 12, vel * accent * 0.7, { attack: 0.012, release: 0.14, pan: -0.15, voices: 2, bright: 1.2, wet: 0.3, vibrato: 0, level: 0.06 });
		});
	};
	const melody = (bar: number, phrase: Phrase, voice: (t: number, d: number, midi: number) => void) => {
		let beat = 0;
		for (const [n, beats] of phrase) {
			voice(at(bar, beat), beats * B * 0.96, note(n));
			beat += beats;
		}
	};
	const drums = (bar: number, vel: number, full: boolean) => {
		s.taiko(at(bar, 0), vel);
		s.taiko(at(bar, 1.5), vel * 0.55);
		s.taiko(at(bar, 2), vel * 0.75);
		if (full) {
			s.taiko(at(bar, 3), vel * 0.6);
			s.taiko(at(bar, 3.5), vel * 0.7);
		}
	};
	const arps = (bar: number, chord: Chord, vel: number) => {
		const up = (n: string) => n.replace(/\d/, (d) => String(Number(d) + 1));
		const notes = [chord.cello, ...chord.pad, up(chord.pad[1]), ...[...chord.pad].reverse()].map(note);
		for (let i = 0; i < 8; i++) s.harp(at(bar, i * 0.5), notes[i % notes.length], vel * (i === 0 ? 1 : 0.75));
	};

	// Bars 1-4: the hushed opening
	["Dm", "Dm", "Bb", "A"].forEach((k, i) => {
		pads(i + 1, CH[k], 0.45 + i * 0.12, { choir: i >= 1 ? "o" : null, attack: i === 0 ? 2.2 : 0.6, bright: 0.7 });
		arps(i + 1, CH[k], 0.5 + i * 0.1);
	});
	s.celesta(at(2, 2), note("A5"), 0.7);
	s.celesta(at(3, 2), note("F5"), 0.7);
	s.timpaniRoll(at(4, 0), barLen, note("A2"), 0.15, 0.85, r);
	s.swell(at(5), barLen, 1);

	// Bars 5-12: the horns take the theme over a driving ostinato
	["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "A"].forEach((k, i) => {
		const bar = 5 + i;
		pads(bar, CH[k], 0.62, { choir: i >= 4 ? "o" : null, bright: 0.9 });
		ostinato(bar, CH[k], 0.75);
		drums(bar, 0.75, i % 2 === 1);
		s.timpani(at(bar), note(CH[k].bass) + 12, 0.7);
		melody(bar, THEME_A[i], (t, d, m) => {
			s.brass(t, d, m, 0.9, { horn: true, pan: -0.15 });
			s.brass(t, d, m - 12, 0.6, { horn: true, pan: 0.1, level: 0.05 });
		});
	});
	s.crash(at(5), 0.8);
	s.timpaniRoll(at(12, 2), B * 2, note("A2"), 0.4, 1, r);
	s.swell(at(13), B * 2, 1);

	// Bars 13-20: the whole orchestra
	["Dm", "Bb", "F", "C", "Gm", "Bb", "A", "A"].forEach((k, i) => {
		const bar = 13 + i;
		pads(bar, CH[k], 0.85, { choir: "a", bright: 1.2, attack: 0.18 });
		ostinato(bar, CH[k], 0.95);
		drums(bar, 1, true);
		s.timpani(at(bar), note(CH[k].bass) + 12, 0.95);
		s.brass(at(bar), barLen * 0.9, note(CH[k].cello), 0.8, { pan: 0.3, level: 0.05 });
		s.brass(at(bar), barLen * 0.9, note(CH[k].pad[0]) - 12, 0.7, { pan: 0.4, level: 0.045 });
		melody(bar, THEME_B[i], (t, d, m) => {
			s.strings(t, d, m, 1, { attack: 0.08, release: 0.5, pan: -0.4, voices: 4, bright: 1.4, level: 0.06 });
			s.strings(t, d, m - 12, 0.9, { attack: 0.08, release: 0.5, pan: -0.2, voices: 3, bright: 1.2, level: 0.055 });
			s.brass(t, d, m - 12, 0.85, { pan: 0.1, level: 0.055 });
		});
		// Horn countermelody: the chord's third, held
		s.brass(at(bar, 0), barLen * 0.95, note(CH[k].choir[1]), 0.55, { horn: true, pan: 0.2, level: 0.05 });
	});
	s.crash(at(13), 1);
	s.crash(at(17), 0.85);
	s.timpaniRoll(at(20, 0), barLen, note("A2"), 0.5, 1, r);
	s.swell(at(21), barLen, 1.2);

	// Bars 21-24: the bright close (Bb - C - D major)
	["D", "Bb", "C", "D"].forEach((k, i) => {
		const bar = 21 + i;
		pads(bar, CH[k], 0.95, { choir: "a", bright: 1.3, attack: 0.12, bars: i === 3 ? 3 : 1 });
		if (i < 3) {
			ostinato(bar, CH[k], 0.9);
			drums(bar, 1, i === 2);
		}
		s.timpani(at(bar), note(CH[k].bass) + 12, 1);
		melody(bar, CODA[i], (t, d, m) => {
			const hold = i === 3 ? barLen * 2.6 : d;
			s.strings(t, hold, m, 1, { attack: 0.08, release: 1.2, pan: -0.4, voices: 4, bright: 1.4, level: 0.06 });
			s.brass(t, hold, m - 12, 0.95, { pan: 0.05, level: 0.06 });
			s.brass(t, hold, m - 24, 0.75, { pan: 0.25, level: 0.05, horn: true });
		});
	});
	s.crash(at(21), 1.1);
	s.crash(at(24), 1.2);
	s.timpaniRoll(at(24, 0), barLen * 1.5, note("D3"), 0.6, 1, r);
	s.taiko(at(25, 2), 1.1);
	s.timpani(at(25, 2), note("D3"), 1.1);
	["D3", "F#3", "A3", "D4", "F#4", "A4", "D5", "F#5", "A5", "D6"].forEach((n, i) => s.harp(at(24, i * 0.18), note(n), 0.8, -0.4, 0.6));

	// Render in four-bar pieces so the opening can play while the rest renders
	const cuts = [5, 9, 13, 17, 21].map((b) => at(b) - 0.05);
	return { score: s, cuts, length: at(27) + 4 };
}

// ------------------------------------------------------------------
// Rendering (in the worker)
// ------------------------------------------------------------------

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (b: { left: Float32Array; right: Float32Array }) => void; reject: (e: unknown) => void; progress?: (p: number) => void }>();

function synth (): Worker {
	if (worker) return worker;
	const src = `(${synthWorkerMain.toString()})()`;
	worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
	worker.onmessage = (e: MessageEvent) => {
		const msg = e.data as { id: number; progress?: number; left?: Float32Array; right?: Float32Array };
		const job = pending.get(msg.id);
		if (!job) return;
		if (msg.left && msg.right) {
			pending.delete(msg.id);
			job.resolve({ left: msg.left, right: msg.right });
		} else if (msg.progress !== undefined) {
			job.progress?.(msg.progress);
		}
	};
	worker.onerror = (e) => {
		console.warn("Music synthesiser failed", e);
		for (const job of pending.values()) job.reject(e);
		pending.clear();
	};
	return worker;
}

function renderChunk (events: SynthEvent[], length: number, reverb: number, progress?: (p: number) => void): Promise<{ left: Float32Array; right: Float32Array }> {
	return new Promise((resolve, reject) => {
		const id = nextId++;
		pending.set(id, { resolve, reject, progress });
		synth().postMessage({ id, sr: SR, length, reverb, events });
	});
}

/** A rendered (or rendering) piece: chunks with their start times, filled in as the worker finishes them. */
interface Piece {
	length: number;
	chunks: { at: number; buffer: Promise<AudioBuffer> }[];
	/** 0-1 over the whole piece. */
	progress: number;
}

const progressListeners = new Set<(p: number, label: string) => void>();

/** Hear about the music rendering (for a progress indicator). */
export function onMusicProgress (fn: (p: number, label: string) => void): () => void {
	progressListeners.add(fn);
	return () => progressListeners.delete(fn);
}

function renderPiece (label: string, built: { score: Score; cuts: number[]; length: number }, reverb: number): Piece {
	const { score, cuts, length } = built;
	const bounds = [0, ...cuts, Infinity];
	const groups: { at: number; events: SynthEvent[]; end: number }[] = [];
	for (let k = 0; k < bounds.length - 1; k++) groups.push({ at: Math.max(0, bounds[k]), events: [], end: 0 });
	for (const e of score.events) {
		const [start, end] = span(e);
		const k = Math.max(0, bounds.findIndex((b, i) => start >= b && start < bounds[i + 1]));
		const g = groups[k];
		g.events.push(e);
		g.end = Math.max(g.end, end);
	}
	const total = score.events.length || 1;
	let done = 0;
	const piece: Piece = { length, chunks: [], progress: 0 };
	const report = () => {
		for (const fn of progressListeners) fn(piece.progress, label);
	};
	const started = performance.now();
	// Chunks render one after another (the worker is single-threaded), earliest first
	let chain: Promise<unknown> = Promise.resolve();
	for (const g of groups.filter((x) => x.events.length)) {
		const events = g.events.map((e) => ({ ...e, t: e.t - g.at }));
		const len = g.end - g.at + 3.5;
		const buffer = chain.then(() => renderChunk(events, len, reverb, (p) => {
			piece.progress = (done + p * g.events.length) / total;
			report();
		})).then(({ left, right }) => {
			done += g.events.length;
			piece.progress = done / total;
			report();
			if (done === total) console.info(`[music] ${label}: ${total} notes, ${length.toFixed(0)} s, rendered in ${((performance.now() - started) / 1000).toFixed(1)} s`);
			const ctx = audioContext();
			if (!ctx) throw new Error("No audio");
			if (MUSIC_DEBUG) {
				let peak = 0, sum = 0, bad = 0;
				for (let i = 0; i < left.length; i++) {
					const x = left[i];
					if (!Number.isFinite(x)) bad++;
					peak = Math.max(peak, Math.abs(x), Math.abs(right[i]));
					sum += x * x;
				}
				console.info(`[music] ${label} chunk at ${g.at.toFixed(1)} s: peak ${(peak * MIX_GAIN).toFixed(2)}, rms ${(Math.sqrt(sum / left.length) * MIX_GAIN).toFixed(3)}${bad ? `, ${bad} bad samples` : ""}`);
			}
			const buf = ctx.createBuffer(2, left.length, SR);
			buf.getChannelData(0).set(left);
			buf.getChannelData(1).set(right);
			return buf;
		});
		chain = buffer.catch(() => undefined);
		piece.chunks.push({ at: g.at, buffer });
	}
	return piece;
}

// ------------------------------------------------------------------
// Playback
// ------------------------------------------------------------------

let limiter: DynamicsCompressorNode | null = null;

/** The music bus's input: a gentle limiter in front of the volume control. */
function musicIn (): AudioNode | null {
	const ctx = audioContext();
	const out = musicOut();
	if (!ctx || !out) return null;
	if (!limiter) {
		limiter = ctx.createDynamicsCompressor();
		limiter.threshold.value = -4;
		limiter.knee.value = 4;
		limiter.ratio.value = 8;
		limiter.attack.value = 0.005;
		limiter.release.value = 0.25;
		limiter.connect(out);
	}
	return limiter;
}

interface Playing { gain: GainNode; sources: AudioBufferSourceNode[]; endsAt: number; stopped: boolean }

/** Play a piece from now: each chunk is scheduled at its place on the audio clock as it arrives. */
function play (piece: Piece, fadeIn = 0, level = 1): Playing | null {
	const ctx = audioContext();
	const input = musicIn();
	const first = piece.chunks[0];
	if (!ctx || !input || !first) return null;
	const gain = ctx.createGain();
	gain.gain.value = 0;
	gain.connect(input);
	const playing: Playing = { gain, sources: [], endsAt: Infinity, stopped: false };
	void first.buffer.then(() => {
		if (playing.stopped) return;
		const t0 = ctx.currentTime + 0.08;
		gain.gain.setValueAtTime(fadeIn ? 0 : MIX_GAIN * level, t0);
		if (fadeIn) gain.gain.linearRampToValueAtTime(MIX_GAIN * level, t0 + fadeIn);
		playing.endsAt = t0 + piece.length;
		for (const chunk of piece.chunks) {
			void chunk.buffer.then((buf) => {
				if (playing.stopped) return;
				const src = ctx.createBufferSource();
				src.buffer = buf;
				src.connect(gain);
				const when = t0 + chunk.at;
				// A chunk that arrives late joins in step rather than starting from its beginning
				const late = ctx.currentTime + 0.02 - when;
				if (late > 0) src.start(ctx.currentTime + 0.02, late);
				else src.start(when);
				playing.sources.push(src);
			}).catch(() => undefined);
		}
	}).catch(() => undefined);
	return playing;
}

function stop (p: Playing | null, seconds: number): void {
	if (!p || p.stopped) return;
	p.stopped = true;
	const ctx = p.gain.context;
	p.gain.gain.cancelScheduledValues(ctx.currentTime);
	p.gain.gain.setValueAtTime(p.gain.gain.value, ctx.currentTime);
	p.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);
	for (const s of p.sources) {
		try {
			s.stop(ctx.currentTime + seconds + 0.05);
		} catch {
			// already stopped
		}
	}
}

/** Seconds until a playing piece ends (Infinity while it hasn't started). */
function remaining (p: Playing): number {
	return p.endsAt - p.gain.context.currentTime;
}

// ---- Title theme ----

let titlePiece: Piece | null = null;
let titlePlaying: Playing | null = null;
let titleWanted = false;
let titleTimer: ReturnType<typeof setTimeout> | null = null;

/** Start rendering the title theme early (it needs no audio permission). */
export function prepareTitleMusic (): void {
	if (!titlePiece && typeof Worker !== "undefined") titlePiece = renderPiece("title", titleScore(), 0.3);
}

/** Play the title theme (call from a click); it repeats after a pause until stopped. */
export function playTitleMusic (): void {
	titleWanted = true;
	prepareTitleMusic();
	if (titlePlaying || !titlePiece) return;
	const loop = () => {
		if (!titleWanted || !titlePiece) return;
		titlePlaying = play(titlePiece);
		const check = () => {
			if (!titleWanted || !titlePlaying) return;
			const left = remaining(titlePlaying);
			if (left > 0) {
				titleTimer = setTimeout(check, Math.min(5000, Math.max(250, left * 1000)));
				return;
			}
			titlePlaying = null;
			titleTimer = setTimeout(loop, 9000);
		};
		titleTimer = setTimeout(check, 1000);
	};
	loop();
}

export function stopTitleMusic (seconds = 1.5): void {
	titleWanted = false;
	if (titleTimer) clearTimeout(titleTimer);
	stop(titlePlaying, seconds);
	titlePlaying = null;
}

// ---- In-game music ----

let gameStarted = false;
let gamePlaying: Playing | null = null;
let gameTimer: ReturnType<typeof setTimeout> | null = null;
const trackPieces = new Map<number, Piece>();
/** The track playing (or next to play): they go round in order. */
let trackIndex = 0;

function trackPiece (i: number): Piece {
	let piece = trackPieces.get(i);
	if (!piece) {
		piece = renderPiece(TRACKS[i].name, trackScore(TRACKS[i]), TRACKS[i].reverb);
		trackPieces.set(i, piece);
	}
	return piece;
}

/** The track now playing (or last played, in the gap between tracks); null before the music starts. */
export function currentTrack (): string | null {
	if (!gameStarted || !trackPieces.size) return null;
	return TRACKS[(trackIndex + TRACKS.length - 1) % TRACKS.length].name;
}

/** Play the track `trackIndex` points at, then move it on; the next starts a few seconds after this one ends. */
function playNext (): void {
	const ctx = audioContext();
	if (!ctx || !gameStarted) return;
	if (ctx.state !== "running") {
		gameTimer = setTimeout(playNext, 1000);
		return;
	}
	const track = TRACKS[trackIndex];
	gamePlaying = play(trackPiece(trackIndex), 3, track.level);
	trackIndex = (trackIndex + 1) % TRACKS.length;
	// Render the next one in the background while this one plays
	trackPiece(trackIndex);
	for (const fn of trackListeners) fn(track.name);
	const check = () => {
		if (!gameStarted || !gamePlaying) return;
		const left = remaining(gamePlaying);
		if (left > 0) {
			gameTimer = setTimeout(check, Math.min(5000, Math.max(250, left * 1000)));
			return;
		}
		gamePlaying = null;
		gameTimer = setTimeout(playNext, 4000);
	};
	gameTimer = setTimeout(check, 1000);
}

const trackListeners = new Set<(name: string) => void>();

/** Hear when a track starts (for showing its name). */
export function onTrackChange (fn: (name: string) => void): () => void {
	trackListeners.add(fn);
	return () => trackListeners.delete(fn);
}

/**
 * In-game music: the eight pieces in tracks.ts, one after another in order
 * and round again, a few seconds apart. Waits for audio to be unlocked by a
 * click or key press.
 */
export function startGameMusic (): void {
	if (gameStarted || typeof Worker === "undefined") return;
	gameStarted = true;
	stopTitleMusic(2);
	gameTimer = setTimeout(playNext, 2500);
}

/** Skip to the next track (1) or back to the one before (-1), fading out the one playing. */
export function skipTrack (dir: 1 | -1): void {
	if (!gameStarted) return;
	const n = TRACKS.length;
	const current = (trackIndex - 1 + n) % n;
	trackIndex = dir > 0 ? (current + 1) % n : (current - 1 + n) % n;
	if (gameTimer) clearTimeout(gameTimer);
	stop(gamePlaying, 0.8);
	gamePlaying = null;
	playNext();
}

export function stopGameMusic (): void {
	gameStarted = false;
	if (gameTimer) clearTimeout(gameTimer);
	stop(gamePlaying, 1.5);
	gamePlaying = null;
}
