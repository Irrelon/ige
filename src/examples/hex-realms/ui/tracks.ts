import { note, rng, Score } from "./score";

/**
 * The in-game music: seventeen composed pieces, played one after another
 * (see music.ts). Each is written as sections of bars: a chord per bar, a
 * melody (note:beats, bars split by "|", "r" a rest), the instrument that
 * carries it, and the textures underneath (pads, harp, ostinato, drums,
 * strummed lute, piano...), with a dynamic that the arranger turns into
 * velocities and brightness.
 *
 * Eight are for the orchestra: two grand (Dawn over the Realm, Across the
 * Sea), two driving (Banners Rising, March of Iron), three wistful (The
 * Long Road, Old Kingdoms, Embers) and one pastoral (Harvest Fields). The
 * other nine each bring their own instruments: piano (Candlelight, Letters
 * Home, Court Dance), a folk band (The Wandering Reel), oud and duduk
 * (Caravan of Sands), koto and shakuhachi (Jade Terraces), organ and choir
 * (Cathedral of Stone), marimba (Market Day) and hammered dulcimer with
 * drones (Northern Hearth). They are interleaved so no two alike play
 * together.
 */

type Lead = "flute" | "strings" | "cello" | "horn" | "brass" | "celesta" | "choir"
	| "piano" | "whistle" | "shakuhachi" | "duduk" | "shawm" | "fiddle" | "koto" | "oud" | "lute" | "dulcimer" | "marimba" | "kalimba" | "organ";
type Texture = "pad" | "softpad" | "choir" | "arp" | "harp" | "ostinato" | "pizz" | "march" | "drums" | "timpani" | "horns" | "twinkle"
	// Lute strummed or finger-picked, the oud on the darbuka's rhythm, a reed drone (duduk) or a bowed one (hurdy-gurdy)
	| "strum" | "pick" | "oudriff" | "drone" | "hurdy"
	// Hand drums and the like
	| "bodhran" | "tamb" | "darbuka" | "frame" | "shaker" | "woodblock"
	// Koto, bells, organ, piano, marimba, kalimba, hammered dulcimer
	| "koto" | "templebell" | "bells" | "organ" | "pianoarp" | "pianochords" | "alberti" | "lowmarimba" | "kalimba" | "dulcimer";
/** How a piece ends: the last chord held by... */
type Close = "orchestra" | "piano" | "lute" | "oud" | "koto" | "organ" | "marimba" | "dulcimer";

interface Section {
	/** One chord per bar: "F", "Dm", "Bb", "C#m", "E7". */
	chords: string;
	/** The tune, a bar per "|" group of note:beats ("r" rests). */
	melody?: string;
	lead?: Lead;
	/** A second instrument on the tune, an octave below. */
	double?: Lead;
	/** Shift the written tune by octaves (for a second time round higher or lower). */
	octave?: number;
	texture: Texture[];
	/** 0-1: how loud and bright. */
	dyn: number;
	/** A cymbal crash on the first bar. */
	crash?: boolean;
	/** A timpani roll and cymbal swell into the next section. */
	roll?: boolean;
}

export interface Track {
	name: string;
	/** What it is played on, for the menu's track list. */
	about: string;
	mood: "orchestral" | "exciting" | "wistful" | "pastoral" | "folk" | "exotic" | "calm" | "sacred" | "playful" | "tender";
	bpm: number;
	reverb: number;
	/**
	 * Playback gain, from measuring each track offline (tracks.test.ts with
	 * MUSIC_LEVELS=1): 0.55 x the title theme's loudness, a little less (x0.9)
	 * for the wistful, tender and calm pieces and (x0.95) the pastoral and
	 * gentler folk ones.
	 */
	level: number;
	sections: Section[];
	/** The chord the piece ends on (held, with a harp roll). */
	end: string;
	/** Who plays the last chord (the orchestra unless said). */
	close?: Close;
}

// ------------------------------------------------------------------
// Chords and tunes
// ------------------------------------------------------------------

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

interface Chord { root: number; tones: number[] }

/** "Dm" -> root pitch class and the chord's pitch classes. */
function chord (sym: string): Chord {
	const m = /^([A-G])(#|b)?(m)?(7)?$/.exec(sym);
	if (!m) throw new Error(`Bad chord ${sym}`);
	const root = (PITCH[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
	const tones = [0, m[3] ? 3 : 4, 7, ...(m[4] ? [10] : [])].map((i) => (root + i) % 12);
	return { root, tones };
}

/** A pitch class placed in [lo, lo + 12). */
function inRange (pc: number, lo: number): number {
	return lo + ((pc - lo) % 12 + 12) % 12;
}

/** The tune, bar by bar: [midi or null for a rest, beats, bend]. "D5+2:2" is a koto's D pressed up two semitones as it rings. */
function tune (src: string): [number | null, number, number][][] {
	return src.split("|").map((bar) => bar.trim().split(/\s+/).filter(Boolean).map((tok) => {
		const [n, beats] = tok.split(":");
		const [name, bend] = n.split("+");
		return [name === "r" ? null : note(name), Number(beats), Number(bend ?? 0)];
	}));
}

/** A pitch class's interval above a root. */
const above = (pc: number, root: number) => (pc - root + 12) % 12;

// ------------------------------------------------------------------
// The arranger
// ------------------------------------------------------------------

export function trackScore (track: Track): { score: Score; cuts: number[]; length: number } {
	const s = new Score();
	const r = rng(track.name.length * 7919 + track.bpm);
	const B = 60 / track.bpm;
	const T0 = 0.4;
	const at = (bar: number, beat = 0) => T0 + (bar * 4 + beat) * B;
	let bar = 0;

	const lead = (who: Lead, t: number, d: number, m: number, v: number, bend = 0) => {
		switch (who) {
			case "flute": s.flute(t, d, m, 0.72 * v + 0.12, 0.22, 0.55); break;
			case "strings": s.strings(t, d, m, 0.85 * v + 0.1, { attack: 0.1, release: 0.7, pan: -0.35, voices: 4, bright: 0.9 + 0.5 * v, level: 0.06 }); break;
			case "cello": s.strings(t, d, m, 0.85 * v + 0.12, { attack: 0.12, release: 0.8, pan: 0.3, voices: 3, bright: 0.75 + 0.3 * v, level: 0.065 }); break;
			case "horn": s.brass(t, d, m, 0.8 * v + 0.12, { horn: true, pan: -0.15 }); break;
			case "brass": s.brass(t, d, m, 0.8 * v + 0.1, { pan: 0.1, level: 0.055 }); break;
			case "celesta": s.celesta(t, m, 0.6 * v + 0.2); break;
			case "choir": s.choir(t, d, m, 0.65 * v + 0.15, "a", 0, 0.7); break;
			case "piano": s.piano(t, d, m, 0.5 + 0.45 * v, 0.1, 0.4); break;
			case "whistle":
				// Now and then a cut: a flick up to the note above before the note itself
				if (d > B * 0.9 && r() < 0.3) {
					s.whistle(t, 0.05, m + 2, 0.6 * v + 0.2, 0.2);
					s.whistle(t + 0.05, d - 0.05, m, 0.75 * v + 0.2, 0.2);
				} else {
					s.whistle(t, d, m, 0.75 * v + 0.2, 0.2);
				}
				break;
			case "shakuhachi": s.whistle(t, d, m, 0.7 * v + 0.25, 0.9, 0.1, 0.55); break;
			case "duduk": s.reed(t, d, m, 0.7 * v + 0.25, { bright: 0.15 }); break;
			case "shawm": s.reed(t, d, m, 0.7 * v + 0.2, { bright: 0.85, pan: 0.1 }); break;
			case "fiddle": s.fiddle(t, d, m, 0.75 * v + 0.2); break;
			case "koto": s.koto(t, d, m, 0.55 * v + 0.35, bend); break;
			case "organ": s.organ(t, d, m, 0.6 * v + 0.35, 0.1, 0.65, 0.07); break;
			case "kalimba": s.kalimba(t, m, 0.55 * v + 0.35, 0.05); break;
			case "oud":
			case "lute":
			case "dulcimer":
			case "marimba": {
				// Plucked and struck: a long note is a tremolo (oud, dulcimer) or a roll (marimba)
				const hit = (x: number, vel: number) => {
					if (who === "oud") s.oud(x, m, vel, 0.05);
					else if (who === "lute") s.lute(x, m, vel, 0.05);
					else if (who === "dulcimer") s.dulcimer(x, m, vel, 0.05);
					else s.marimba(x, m, vel, 0.05);
				};
				const vel = 0.55 * v + 0.35;
				if (who !== "lute" && d >= B * 1.4) {
					const step = who === "marimba" ? Math.min(B / 4, 0.1) : B / 4;
					for (let x = 0, k = 0; x < d - step * 0.5; x += step, k++) hit(t + x, vel * (k === 0 ? 1 : 0.62 + 0.08 * r()));
				} else {
					hit(t, vel);
				}
				break;
			}
		}
	};

	/** One bar of the section's accompaniment; `first` and `count` place the bar in its section, `drone` the section's key note. */
	const textures = (sec: Section, c: Chord, b: number, first: number, count: number, drone: number) => {
		const v = sec.dyn;
		const t = at(b), barLen = 4 * B;
		const pad = c.tones.slice(0, 3).map((pc) => inRange(pc, 55));
		const bass = inRange(c.root, 36), cello = inRange(c.root, 48);
		const third = above(c.tones[1], c.root);
		for (const tex of sec.texture) {
			switch (tex) {
				case "pad":
					pad.forEach((m, i) => s.strings(t, barLen, m, 0.38 + 0.4 * v, { attack: 0.45, release: 1.2, pan: -0.35 + i * 0.3, voices: 3, bright: 0.6 + 0.6 * v, wet: 0.5, level: 0.05 }));
					s.strings(t, barLen, cello, 0.4 + 0.35 * v, { attack: 0.4, release: 1.2, pan: 0.35, voices: 3, bright: 0.7 });
					s.strings(t, barLen, bass, 0.35 + 0.35 * v, { attack: 0.4, release: 1.2, pan: 0.5, voices: 2, bright: 0.55 });
					s.sub(t, barLen, bass, 0.4 + 0.4 * v);
					break;
				case "softpad":
					pad.forEach((m, i) => s.strings(t, barLen, m + 12, 0.3 + 0.12 * v, { attack: 1.1, release: 1.4, pan: -0.3 + i * 0.3, voices: 2, bright: 0.55, wet: 0.6, level: 0.05 }));
					s.strings(t, barLen, cello, 0.36, { attack: 0.8, release: 1.4, pan: 0.35, voices: 2, bright: 0.5, wet: 0.5 });
					break;
				case "choir":
					c.tones.slice(0, 3).map((pc) => inRange(pc, 60)).forEach((m, i) => s.choir(t, barLen, m, 0.3 + 0.35 * v, "o", -0.2 + i * 0.2));
					break;
				case "arp": {
					const notes = [cello, ...pad, pad[1] + 12, pad[2], pad[1], pad[0] + 12];
					for (let i = 0; i < 8; i++) s.harp(at(b, i * 0.5), notes[i % notes.length], (0.4 + 0.25 * v) * (i === 0 ? 1.2 : 0.8), -0.35, 0.6);
					break;
				}
				case "harp":
					[cello, pad[0] + 12, pad[1] + 12, pad[2] + 12].forEach((m, i) => s.harp(at(b, i), m, (0.4 + 0.2 * v) * (i === 0 ? 1.15 : 0.85), -0.3, 0.6));
					break;
				case "ostinato": {
					const up3 = inRange(c.tones[1], cello), fifth = inRange(c.tones[2], cello);
					[cello, cello, fifth, cello, cello, fifth, cello, up3].forEach((m, i) => {
						const accent = i === 0 || i === 3 || i === 6 ? 1 : 0.62;
						s.strings(at(b, i * 0.5), B * 0.32, m, (0.45 + 0.4 * v) * accent, { attack: 0.012, release: 0.14, pan: 0.25, voices: 2, bright: 1.2, wet: 0.3, vibrato: 0, level: 0.07 });
						s.strings(at(b, i * 0.5), B * 0.32, m + 12, (0.3 + 0.3 * v) * accent, { attack: 0.012, release: 0.14, pan: -0.15, voices: 2, bright: 1.1, wet: 0.3, vibrato: 0, level: 0.055 });
					});
					break;
				}
				case "pizz":
					// Oom-pah: the bass on the beat, the chord on the off-beats
					[0, 1, 2, 3].forEach((beat) => {
						const ms = beat % 2 === 0 ? [beat === 0 ? cello - 12 : inRange(c.tones[2], 43)] : pad;
						ms.forEach((m) => s.strings(at(b, beat), B * 0.22, m, (0.35 + 0.35 * v) * (beat === 0 ? 1.1 : 0.8), { attack: 0.005, release: 0.12, pan: beat % 2 ? -0.2 : 0.3, voices: 2, bright: 1.1, wet: 0.35, vibrato: 0, level: 0.06 }));
					});
					break;
				case "march":
					// Staccato stabs on every beat, heavier on one and three
					[0, 1, 2, 3].forEach((beat) => {
						const accent = beat % 2 === 0 ? 1 : 0.6;
						[...pad, cello].forEach((m, i) => s.strings(at(b, beat), B * 0.28, m, (0.4 + 0.45 * v) * accent, { attack: 0.01, release: 0.12, pan: -0.3 + i * 0.2, voices: 2, bright: 1.2, wet: 0.3, vibrato: 0, level: 0.05 }));
					});
					s.timpani(at(b, 0), bass + 12, 0.45 + 0.4 * v);
					s.timpani(at(b, 2), inRange(c.tones[2], 43), 0.35 + 0.3 * v);
					break;
				case "drums":
					s.taiko(at(b, 0), 0.45 + 0.45 * v);
					s.taiko(at(b, 1.5), (0.45 + 0.45 * v) * 0.55);
					s.taiko(at(b, 2), (0.45 + 0.45 * v) * 0.75);
					if (v > 0.75) {
						s.taiko(at(b, 3), (0.45 + 0.45 * v) * 0.6);
						s.taiko(at(b, 3.5), (0.45 + 0.45 * v) * 0.7);
					}
					break;
				case "timpani":
					s.timpani(t, bass + 12, 0.4 + 0.5 * v);
					break;
				case "horns":
					pad.forEach((m, i) => s.brass(t, barLen * 0.95, m - (i === 0 ? 12 : 0), 0.35 + 0.35 * v, { horn: true, pan: 0.2 + i * 0.1, level: 0.04 }));
					break;
				case "twinkle":
					s.celesta(at(b, 2), inRange(c.tones[r() > 0.5 ? 2 : 1], 84), 0.35 + 0.2 * v);
					break;
				case "strum": {
					// Lute: down-strokes on the beats, lighter up-strokes off them
					const low = inRange(c.root, 45);
					const voicing = [low, low + 7, low + 12, low + 12 + third, low + 19];
					([[0, 1, 1], [1, 0.75, 1], [1.5, 0.5, -1], [2, 0.9, 1], [3, 0.75, 1], [3.5, 0.5, -1]] as const).forEach(([beat, acc, dir]) => {
						const notes = dir > 0 ? voicing : voicing.slice(2).reverse();
						notes.forEach((m, i) => s.lute(at(b, beat) + i * 0.013, m, (0.3 + 0.35 * v) * acc, -0.3 + i * 0.08, 0.35));
					});
					break;
				}
				case "pick": {
					// Lute, finger-picked: the bass, then the chord rising and falling
					const low = inRange(c.root, 45);
					[low, low + 7, low + 12, low + 12 + third, low + 19, low + 12 + third, low + 12, low + 7].forEach((m, i) => s.lute(at(b, i * 0.5), m, (0.32 + 0.3 * v) * (i === 0 ? 1.2 : i % 2 ? 0.75 : 0.9), -0.3 + (i % 3) * 0.1, 0.35, 0.5));
					break;
				}
				case "oudriff": {
					// The oud on the maqsum: the root on the doums, its octave and fifth between
					const low = inRange(c.root, 38);
					([[0, low, 1], [0.5, low + 12, 0.6], [1.5, low + 7, 0.75], [2, low, 0.9], [3, low + 12, 0.7], [3.5, low + 7, 0.6]] as const).forEach(([beat, m, acc]) => s.oud(at(b, beat), m, (0.35 + 0.35 * v) * acc));
					break;
				}
				case "drone":
				case "hurdy":
					// The key note and its fifth held under the section, sounded afresh every four bars
					if ((b - first) % 4 === 0) {
						const len = Math.min(4, first + count - b) * barLen + 0.4;
						const root = inRange(drone, 38);
						const hold = (m: number, pan: number) => (tex === "drone"
							? s.reed(t, len, m, 0.3 + 0.25 * v, { bright: 0.1, vibrato: 0, attack: 0.8, release: 1.2, level: 0.16, pan })
							: s.fiddle(t, len, m, 0.3 + 0.25 * v, { vibrato: 0, attack: 0.6, release: 1, level: 0.07, pan }));
						hold(root, -0.25);
						hold(root + 7, 0.25);
					}
					break;
				case "bodhran":
					// A reel's bodhrán: every quaver, open and deep on the beats, muted between
					for (let i = 0; i < 8; i++) {
						const acc = [1, 0.45, 0.65, 0.5, 0.9, 0.45, 0.65, 0.55][i];
						s.frame(at(b, i * 0.5), i % 4 === 0 ? 43 : i % 2 ? 50 : 47, (0.35 + 0.4 * v) * acc, i % 4 === 0 ? 0.7 : 0.15);
					}
					break;
				case "tamb":
					s.tambourine(at(b, 1), 0.4 + 0.35 * v);
					s.tambourine(at(b, 3), 0.4 + 0.35 * v);
					s.tambourine(at(b, 3.5), 0.25 + 0.2 * v);
					break;
				case "darbuka": {
					// The maqsum: doum tek . tek doum . tek ., with ka strokes filling in when it is loud
					const hits: [number, "doum" | "tek" | "ka", number][] = [[0, "doum", 1], [0.5, "tek", 0.8], [1.5, "tek", 0.8], [2, "doum", 0.9], [3, "tek", 0.85]];
					if (v > 0.55) hits.push([1, "ka", 0.45], [2.5, "ka", 0.45], [3.5, "ka", 0.5], [3.75, "ka", 0.4]);
					for (const [beat, stroke, acc] of hits) s.darbuka(at(b, beat), stroke, (0.4 + 0.4 * v) * acc);
					break;
				}
				case "frame":
					// A great frame drum, like a heartbeat
					s.frame(at(b, 0), 38, 0.5 + 0.4 * v, 0.9);
					s.frame(at(b, 0.5), 38, (0.5 + 0.4 * v) * 0.55, 0.7);
					s.frame(at(b, 2), 41, (0.5 + 0.4 * v) * 0.7, 0.6);
					if (v > 0.6) s.frame(at(b, 3.5), 45, (0.5 + 0.4 * v) * 0.45, 0.2);
					break;
				case "shaker":
					for (let i = 0; i < 8; i++) s.shaker(at(b, i * 0.5), (0.3 + 0.4 * v) * (i % 2 ? 0.9 : 0.5));
					break;
				case "woodblock":
					s.woodblock(at(b, 1), 84, 0.4 + 0.3 * v);
					s.woodblock(at(b, 3), 84, 0.4 + 0.3 * v);
					s.woodblock(at(b, 3.5), 79, 0.3 + 0.2 * v);
					break;
				case "koto": {
					// Koto: a few notes of the chord, rising and falling
					const low = inRange(c.root, 52);
					([[0, low, 1], [0.5, low + 7, 0.7], [1, low + 12, 0.8], [2, low + 12 + third, 0.75], [2.5, low + 12, 0.6], [3, low + 7, 0.7]] as const).forEach(([beat, m, acc]) => s.koto(at(b, beat), 0.5, m, (0.3 + 0.25 * v) * acc, 0, 0.25, 0.5));
					break;
				}
				case "templebell":
					if ((b - first) % 2 === 0) s.bell(t, inRange(c.root, 50), 0.3 + 0.3 * v, -0.2, 0.7);
					break;
				case "bells":
					if ((b - first) % 2 === 0) s.bell(t, inRange(c.root, 72), 0.3 + 0.3 * v, 0.3, 0.65);
					break;
				case "organ": {
					const pedal = inRange(c.root, 36);
					[pedal, pedal + 12, ...pad].forEach((m, i) => s.organ(t, barLen * 0.97, m, 0.4 + 0.35 * v, -0.3 + i * 0.15, 0.7));
					break;
				}
				case "pianoarp": {
					// Broken chords, held by the pedal to the end of the bar
					const low = inRange(c.root, 36);
					[low, low + 7, low + 12, low + 12 + third, low + 19, low + 12 + third, low + 12, low + 7].forEach((m, i) => s.piano(at(b, i * 0.5), barLen - i * 0.5 * B, m, (0.3 + 0.3 * v) * (i === 0 ? 1.15 : 0.8), -0.25 + (m - low) * 0.012, 0.4));
					break;
				}
				case "pianochords": {
					const low = inRange(c.root, 36);
					[0, 2].forEach((beat) => [low, low + 12, ...pad].forEach((m, i) => s.piano(at(b, beat) + i * 0.008, B * 2, m, (0.3 + 0.3 * v) * (beat === 0 ? 1 : 0.8), -0.2 + i * 0.08, 0.4)));
					break;
				}
				case "alberti": {
					// The classical left hand: root, fifth, third, fifth, over a held bass
					const lo = inRange(c.root, 48);
					[lo, lo + 7, lo + third, lo + 7, lo, lo + 7, lo + third, lo + 7].forEach((m, i) => s.piano(at(b, i * 0.5), B * 0.48, m, (0.3 + 0.2 * v) * (i % 4 === 0 ? 1 : 0.8), -0.2, 0.35));
					s.piano(t, barLen * 0.95, inRange(c.root, 36), 0.3 + 0.2 * v, -0.3, 0.35);
					break;
				}
				case "lowmarimba": {
					const low = inRange(c.root, 43);
					([[0, low, 1], [1, low + 7, 0.7], [2, low, 0.85], [2.5, low + 12, 0.6], [3, low + 7, 0.7]] as const).forEach(([beat, m, acc]) => s.marimba(at(b, beat), m, (0.4 + 0.3 * v) * acc, -0.2, 0.3));
					break;
				}
				case "kalimba": {
					const notes = [inRange(c.root, 67), inRange(c.tones[1], 67), inRange(c.tones[2], 67)];
					[notes[0], notes[2], notes[1], notes[0] + 12, notes[0], notes[2], notes[1], notes[2]].forEach((m, i) => s.kalimba(at(b, i * 0.5), m, (0.28 + 0.2 * v) * (i % 2 ? 0.75 : 1)));
					break;
				}
				case "dulcimer": {
					// Hammered dulcimer: quavers rolling between the hands
					const low = inRange(c.root, 62);
					[low, low + 7, low + 12, low + 7, low + 12 + third, low + 7, low + 12, low + third].forEach((m, i) => s.dulcimer(at(b, i * 0.5), m, (0.3 + 0.25 * v) * (i % 4 === 0 ? 1.1 : 0.8), i % 2 ? 0.3 : 0.1));
					break;
				}
			}
		}
	};

	for (const sec of track.sections) {
		const chords = sec.chords.trim().split(/\s+/).map(chord);
		const bars = sec.melody ? tune(sec.melody) : [];
		const first = bar;
		if (sec.crash) s.crash(at(first), 0.55 + 0.35 * sec.dyn);
		chords.forEach((c, i) => {
			textures(sec, c, bar, first, chords.length, chords[0].root);
			const notes = bars[i];
			if (notes && sec.lead) {
				let beat = 0;
				for (const [m, beats, bend] of notes) {
					if (m !== null) {
						const pitch = m + 12 * (sec.octave ?? 0);
						const d = beats * B * 0.95;
						lead(sec.lead, at(bar, beat), d, pitch, sec.dyn, bend);
						if (sec.double) lead(sec.double, at(bar, beat), d, pitch - 12, sec.dyn * 0.75, bend);
					}
					beat += beats;
				}
			}
			bar++;
		});
		if (sec.roll) {
			const c = chords[chords.length - 1];
			s.timpaniRoll(at(bar - 1, 2), B * 2, inRange(c.root, 43), 0.3, 0.8, r);
			s.swell(at(bar), B * 2, 0.5 + 0.4 * sec.dyn);
		}
	}

	// The close: the last chord held
	const last = chord(track.end);
	const hold = 3 * 4 * B;
	const low = inRange(last.root, 36), lastThird = above(last.tones[1], last.root);
	const roll = [0, 1, 2].flatMap((o) => last.tones.slice(0, 3).map((pc) => inRange(pc, 48 + o * 12)));
	switch (track.close ?? "orchestra") {
		case "orchestra":
			// Strings, with a harp roll up through the chord
			last.tones.slice(0, 3).map((pc) => inRange(pc, 55)).forEach((m, i) => s.strings(at(bar), hold, m, 0.4, { attack: 0.5, release: 2.8, pan: -0.3 + i * 0.3, voices: 3, bright: 0.6, wet: 0.65, level: 0.05 }));
			s.strings(at(bar), hold, low, 0.4, { attack: 0.5, release: 2.8, pan: 0.4, voices: 2, bright: 0.5 });
			s.sub(at(bar), hold, low, 0.45);
			roll.forEach((m, i) => s.harp(at(bar, i * 0.22), m, 0.55, -0.35, 0.65));
			break;
		case "piano":
			// A rolled chord, left to ring
			s.piano(at(bar), hold, low, 0.55, -0.3);
			s.piano(at(bar), hold, low + 12, 0.45, -0.25);
			roll.forEach((m, i) => s.piano(at(bar, 0.25 + i * 0.16), hold - i * 0.16 * B, m, 0.42 - i * 0.015, -0.2 + i * 0.05));
			break;
		case "lute": {
			// One slow strum, and a last deep stroke on the drum
			const l = inRange(last.root, 45);
			[l, l + 7, l + 12, l + 12 + lastThird, l + 19].forEach((m, i) => s.lute(at(bar) + i * 0.06, m, 0.6, -0.3 + i * 0.12, 0.45));
			s.frame(at(bar), 43, 0.7, 0.9);
			break;
		}
		case "oud": {
			const l = inRange(last.root, 38);
			for (let x = 0; x < 2 * B; x += B / 4) s.oud(at(bar) + x, l + 12, 0.55 * (1 - x / (3 * B)));
			s.oud(at(bar, 2), l, 0.7);
			s.reed(at(bar), hold, l, 0.4, { bright: 0.1, vibrato: 0, attack: 0.5, release: 2, level: 0.16 });
			s.reed(at(bar), hold, l + 7, 0.35, { bright: 0.1, vibrato: 0, attack: 0.5, release: 2, level: 0.16 });
			s.darbuka(at(bar, 2), "doum", 0.7);
			break;
		}
		case "koto":
			roll.forEach((m, i) => s.koto(at(bar, i * 0.4), 0.5, m + 12, 0.5 - i * 0.02));
			s.bell(at(bar), inRange(last.root, 50), 0.5, -0.2, 0.7);
			break;
		case "organ":
			[low, low + 12, ...last.tones.slice(0, 3).map((pc) => inRange(pc, 55))].forEach((m, i) => s.organ(at(bar), hold, m, 0.75, -0.3 + i * 0.15, 0.75));
			s.bell(at(bar), inRange(last.root, 72), 0.6, 0.3, 0.65);
			s.bell(at(bar, 2), inRange(last.root, 60), 0.5, -0.3, 0.65);
			break;
		case "marimba":
			last.tones.slice(0, 3).map((pc) => inRange(pc, 60)).forEach((m) => {
				for (let x = 0; x < 4 * B; x += 0.09) s.marimba(at(bar) + x, m, 0.45 * (1 - x / (6 * B)));
			});
			s.marimba(at(bar), inRange(last.root, 43), 0.7, -0.2);
			s.kalimba(at(bar, 1), inRange(last.root, 79), 0.5);
			break;
		case "dulcimer":
			roll.forEach((m, i) => s.dulcimer(at(bar, i * 0.25), m + 12, 0.55 - i * 0.02));
			s.fiddle(at(bar), hold, inRange(last.root, 38), 0.45, { vibrato: 0, attack: 0.6, release: 2, level: 0.07 });
			s.fiddle(at(bar), hold, inRange(last.root, 38) + 7, 0.4, { vibrato: 0, attack: 0.6, release: 2, level: 0.07 });
			break;
	}

	const cuts: number[] = [];
	for (let b = 4; b < bar; b += 4) cuts.push(at(b) - 0.05);
	return { score: s, cuts, length: at(bar) + hold + 4 };
}

// ------------------------------------------------------------------
// The pieces
// ------------------------------------------------------------------

const ORCHESTRAL: Track[] = [
	{
		// Orchestral: a warm F major theme for strings and horns, building to the full orchestra
		name: "Dawn over the Realm", about: "Strings, horns and harp", mood: "orchestral", bpm: 72, reverb: 0.34, level: 0.88,
		sections: [
			{ chords: "F Bb", texture: ["softpad", "arp"], dyn: 0.3 },
			{
				chords: "F C Dm Bb F Gm C C", lead: "flute", texture: ["softpad", "arp"], dyn: 0.4,
				melody: "C5:2 A4:1 C5:1 | D5:1.5 C5:.5 G4:2 | A4:1 D5:1 F5:1.5 E5:.5 | D5:3 C5:1 | C5:2 F5:1 E5:.5 D5:.5 | D5:1.5 C5:.5 Bb4:2 | A4:1 G4:1 C5:1 E5:1 | E5:3 r:1"
			},
			{
				chords: "F C Dm Bb F Gm C C", lead: "strings", double: "horn", texture: ["pad", "arp", "timpani"], dyn: 0.6, roll: true,
				melody: "C5:2 A4:1 C5:1 | D5:1.5 C5:.5 G4:2 | A4:1 D5:1 F5:1.5 E5:.5 | D5:3 C5:1 | C5:2 F5:1 E5:.5 D5:.5 | D5:1.5 C5:.5 Bb4:2 | A4:1 G4:1 C5:1 E5:1 | E5:3 r:1"
			},
			{
				chords: "Dm Bb F C Dm Gm Bb C", lead: "horn", texture: ["pad", "ostinato", "timpani", "choir"], dyn: 0.7, crash: true,
				melody: "F4:2 E4:1 D4:1 | D4:2 F4:2 | C4:1.5 D4:.5 C4:1 A3:1 | G3:3 r:1 | A3:1 D4:1 E4:1 F4:1 | G4:2 F4:1 D4:1 | F4:1 D4:1 Bb3:1 D4:1 | E4:2 C4:2"
			},
			{
				chords: "F C Dm Bb F Gm C F", lead: "strings", double: "brass", texture: ["pad", "arp", "horns", "timpani", "choir"], dyn: 0.9, crash: true,
				melody: "C5:2 A4:1 C5:1 | D5:1.5 C5:.5 G4:2 | A4:1 D5:1 F5:1.5 E5:.5 | D5:3 C5:1 | C5:2 F5:1 E5:.5 D5:.5 | D5:1.5 C5:.5 Bb4:2 | A4:1 G4:1 C5:1 E5:1 | F5:4"
			}
		],
		end: "F"
	},
	{
		// Wistful: a lone flute over harp in D minor, the strings joining as it goes
		name: "The Long Road", about: "Flute, harp and cello", mood: "wistful", bpm: 62, reverb: 0.4, level: 2.03,
		sections: [
			{ chords: "Dm Dm", texture: ["harp"], dyn: 0.25 },
			{
				chords: "Dm Bb F A Dm Gm Gm A", lead: "flute", texture: ["harp", "softpad"], dyn: 0.35,
				melody: "A4:3 F4:.5 G4:.5 | A4:2 D4:2 | C5:1.5 Bb4:.5 A4:1 G4:1 | E4:3 r:1 | D5:2 C5:1 A4:1 | Bb4:1.5 A4:.5 G4:2 | F4:1 G4:1 A4:1 Bb4:1 | A4:4"
			},
			{
				chords: "Bb F Gm Dm Bb F Gm A", lead: "flute", texture: ["arp", "softpad"], dyn: 0.45,
				melody: "F5:2 D5:2 | C5:2 A4:1 C5:1 | D5:1.5 C5:.5 Bb4:2 | A4:3 r:1 | D5:1 F5:1 E5:1 D5:1 | C5:2 A4:2 | Bb4:1 A4:1 G4:1 E4:1 | C#5:2 E5:2"
			},
			{
				chords: "Dm Bb F A Dm Gm Gm A", lead: "cello", octave: -1, texture: ["harp", "softpad"], dyn: 0.4,
				melody: "A4:3 F4:.5 G4:.5 | A4:2 D4:2 | C5:1.5 Bb4:.5 A4:1 G4:1 | E4:3 r:1 | D5:2 C5:1 A4:1 | Bb4:1.5 A4:.5 G4:2 | F4:1 G4:1 A4:1 Bb4:1 | A4:4"
			},
			{
				chords: "Dm Bb Gm A Dm", lead: "flute", texture: ["harp", "softpad"], dyn: 0.3,
				melody: "A4:3 F4:.5 G4:.5 | A4:2 D4:2 | Bb4:1.5 A4:.5 G4:2 | E4:2 C#4:2 | D4:4"
			}
		],
		end: "Dm"
	},
	{
		// Exciting: C minor, a driving string ostinato and war drums under the horns
		name: "Banners Rising", about: "Horns, brass and war drums", mood: "exciting", bpm: 104, reverb: 0.28, level: 0.7,
		sections: [
			{ chords: "Cm Cm", texture: ["ostinato", "drums"], dyn: 0.5 },
			{
				chords: "Cm Ab Eb Bb Cm Ab Fm G", lead: "horn", texture: ["ostinato", "drums", "pad"], dyn: 0.6,
				melody: "G4:1.5 C5:.5 C5:1 Eb5:1 | Eb5:1 C5:1 Ab4:2 | Bb4:1.5 Eb5:.5 G5:1 F5:1 | D5:3 r:1 | G4:1.5 C5:.5 Eb5:1 G5:1 | F5:1 Eb5:1 C5:2 | Ab4:1 C5:1 F5:1 Eb5:1 | D5:2 B4:2"
			},
			{
				chords: "Cm Ab Eb Bb Cm Ab Fm G", lead: "brass", double: "strings", texture: ["ostinato", "drums", "pad", "timpani"], dyn: 0.75, crash: true, roll: true,
				melody: "G4:1.5 C5:.5 C5:1 Eb5:1 | Eb5:1 C5:1 Ab4:2 | Bb4:1.5 Eb5:.5 G5:1 F5:1 | D5:3 r:1 | G4:1.5 C5:.5 Eb5:1 G5:1 | F5:1 Eb5:1 C5:2 | Ab4:1 C5:1 F5:1 Eb5:1 | D5:2 B4:2"
			},
			{
				chords: "Ab Bb Gm Cm Ab Bb G G", lead: "strings", double: "horn", texture: ["ostinato", "choir", "timpani"], dyn: 0.7,
				melody: "C5:2 Eb5:2 | D5:2 F5:2 | D5:1 Bb4:1 G4:2 | C5:3 r:1 | Eb5:1 Ab5:1 G5:1 Eb5:1 | F5:1 D5:1 Bb4:1 D5:1 | B4:2 D5:2 | G5:4"
			},
			{
				chords: "Cm Ab Eb Bb Cm Ab G Cm", lead: "brass", double: "strings", texture: ["ostinato", "drums", "pad", "horns", "timpani", "choir"], dyn: 0.9, crash: true,
				melody: "G4:1.5 C5:.5 C5:1 Eb5:1 | Eb5:1 C5:1 Ab4:2 | Bb4:1.5 Eb5:.5 G5:1 F5:1 | D5:3 r:1 | G4:1.5 C5:.5 Eb5:1 G5:1 | F5:1 Eb5:1 C5:2 | D5:2 B4:2 | C5:4"
			}
		],
		end: "Cm"
	},
	{
		// Pastoral: a G major dance for flute over plucked strings and harp
		name: "Harvest Fields", about: "Flute and plucked strings", mood: "pastoral", bpm: 96, reverb: 0.3, level: 1.95,
		sections: [
			{ chords: "G D", texture: ["pizz"], dyn: 0.35 },
			{
				chords: "G C G D Em C D G", lead: "flute", texture: ["pizz", "harp"], dyn: 0.45,
				melody: "D5:1 B4:.5 G4:.5 D5:1 B4:1 | C5:1 E5:1 G5:1 E5:1 | D5:1.5 B4:.5 G4:2 | A4:1 F#4:1 A4:1 D5:1 | E5:1 B4:.5 G4:.5 E5:1 G5:1 | G5:1 E5:1 C5:2 | D5:1 C5:.5 B4:.5 A4:1 F#4:1 | G4:3 r:1"
			},
			{
				chords: "C G Am D C G D G", lead: "strings", texture: ["pizz", "softpad"], dyn: 0.5,
				melody: "E5:2 G5:2 | D5:2 B4:2 | C5:1 E5:1 A5:2 | F#5:2 D5:2 | E5:1 D5:1 C5:1 E5:1 | D5:1 B4:1 G4:2 | A4:1 B4:1 C5:1 F#4:1 | G4:4"
			},
			{
				chords: "G C G D Em C D G", lead: "flute", double: "celesta", octave: 0, texture: ["pizz", "arp"], dyn: 0.55,
				melody: "D5:1 B4:.5 G4:.5 D5:1 B4:1 | C5:1 E5:1 G5:1 E5:1 | D5:1.5 B4:.5 G4:2 | A4:1 F#4:1 A4:1 D5:1 | E5:1 B4:.5 G4:.5 E5:1 G5:1 | G5:1 E5:1 C5:2 | D5:1 C5:.5 B4:.5 A4:1 F#4:1 | G4:4"
			}
		],
		end: "G"
	},
	{
		// Wistful and noble: an A minor melody for the cellos, a choir behind
		name: "Old Kingdoms", about: "Cello, choir and harp", mood: "wistful", bpm: 60, reverb: 0.42, level: 1.21,
		sections: [
			{ chords: "Am F", texture: ["choir", "softpad"], dyn: 0.3 },
			{
				chords: "Am F C G Am Dm E E", lead: "cello", texture: ["choir", "softpad"], dyn: 0.4,
				melody: "E3:2 A3:2 | C4:1.5 B3:.5 A3:2 | G3:1 C4:1 E4:2 | D4:3 r:1 | E4:2 D4:1 C4:1 | D4:1.5 C4:.5 A3:2 | B3:1 G#3:1 B3:1 D4:1 | E4:4"
			},
			{
				chords: "F C Dm Am F G E Am", lead: "strings", double: "horn", texture: ["pad", "harp"], dyn: 0.55, roll: true,
				melody: "A4:2 F4:2 | G4:2 E4:2 | F4:1 E4:1 D4:2 | C4:3 r:1 | A3:1 C4:1 F4:2 | G4:2 D4:2 | E4:1 D4:1 B3:1 G#3:1 | A3:4"
			},
			{
				chords: "Am F C G Am Dm E Am", lead: "cello", texture: ["choir", "arp", "softpad"], dyn: 0.45,
				melody: "E3:2 A3:2 | C4:1.5 B3:.5 A3:2 | G3:1 C4:1 E4:2 | D4:3 r:1 | E4:2 D4:1 C4:1 | D4:1.5 C4:.5 A3:2 | B3:2 G#3:2 | A3:4"
			}
		],
		end: "Am"
	},
	{
		// Orchestral: a broad, sweeping E-flat theme for strings, then the whole orchestra
		name: "Across the Sea", about: "Strings, horns and choir", mood: "orchestral", bpm: 80, reverb: 0.36, level: 0.84,
		sections: [
			{ chords: "Eb Ab", texture: ["pad", "arp"], dyn: 0.35, roll: true },
			{
				chords: "Eb Bb Cm Ab Eb Bb Ab Bb", lead: "strings", texture: ["pad", "arp"], dyn: 0.5,
				melody: "G4:2 Bb4:1 Eb5:1 | D5:2 F5:1 D5:1 | Eb5:1.5 D5:.5 C5:1 G4:1 | Ab4:3 C5:1 | Bb4:1 Eb5:1 G5:1.5 F5:.5 | F5:2 D5:2 | C5:1 Ab4:1 C5:1 Eb5:1 | D5:2 F5:2"
			},
			{
				chords: "Cm Ab Eb Bb Cm Fm Bb Bb", lead: "horn", texture: ["pad", "ostinato", "timpani"], dyn: 0.65, crash: true, roll: true,
				melody: "G4:2 Eb4:2 | C4:2 Ab3:2 | Bb3:1 Eb4:1 G4:2 | F4:3 r:1 | Eb4:1 G4:1 C4:2 | Ab4:2 F4:2 | D4:1 F4:1 Bb4:2 | F4:2 D4:2"
			},
			{
				chords: "Eb Bb Cm Ab Eb Bb Ab Eb", lead: "strings", double: "brass", texture: ["pad", "arp", "horns", "timpani", "choir"], dyn: 0.9, crash: true,
				melody: "G4:2 Bb4:1 Eb5:1 | D5:2 F5:1 D5:1 | Eb5:1.5 D5:.5 C5:1 G4:1 | Ab4:3 C5:1 | Bb4:1 Eb5:1 G5:1.5 F5:.5 | F5:2 D5:2 | C5:1 Ab4:1 C5:1 D5:1 | Eb5:4"
			}
		],
		end: "Eb"
	},
	{
		// Exciting: an E minor march, staccato strings and timpani under the horns
		name: "March of Iron", about: "Brass and marching strings", mood: "exciting", bpm: 96, reverb: 0.28, level: 0.7,
		sections: [
			{ chords: "Em Em", texture: ["march"], dyn: 0.45 },
			{
				chords: "Em C G D Em Am B B", lead: "horn", texture: ["march", "pad"], dyn: 0.6,
				melody: "E4:1.5 E4:.5 G4:1 B4:1 | C5:2 G4:2 | B4:1 A4:.5 G4:.5 D5:2 | A4:3 r:1 | E5:1.5 D5:.5 B4:1 G4:1 | A4:1 C5:1 E5:2 | D#5:2 F#5:1 D#5:1 | B4:4"
			},
			{
				chords: "Em C G D Em Am B B", lead: "brass", double: "strings", texture: ["march", "pad", "drums"], dyn: 0.75, crash: true, roll: true,
				melody: "E4:1.5 E4:.5 G4:1 B4:1 | C5:2 G4:2 | B4:1 A4:.5 G4:.5 D5:2 | A4:3 r:1 | E5:1.5 D5:.5 B4:1 G4:1 | A4:1 C5:1 E5:2 | D#5:2 F#5:1 D#5:1 | B4:4"
			},
			{
				chords: "C D G Em C D B B", lead: "strings", double: "horn", texture: ["ostinato", "pad", "timpani"], dyn: 0.7,
				melody: "E5:2 G5:2 | F#5:2 D5:2 | D5:1 B4:1 G4:2 | E5:3 r:1 | G5:1 E5:1 C5:1 E5:1 | F#5:1 D5:1 A4:1 D5:1 | D#5:1 F#5:1 B5:2 | F#5:4"
			},
			{
				chords: "Em C G D Em Am B Em", lead: "brass", double: "strings", texture: ["march", "pad", "drums", "horns"], dyn: 0.9, crash: true,
				melody: "E4:1.5 E4:.5 G4:1 B4:1 | C5:2 G4:2 | B4:1 A4:.5 G4:.5 D5:2 | A4:3 r:1 | E5:1.5 D5:.5 B4:1 G4:1 | A4:1 C5:1 E5:2 | D#5:2 F#5:1 D#5:1 | E5:4"
			}
		],
		end: "Em"
	},
	{
		// Wistful: a B-flat lullaby for celesta and harp, the flute taking it up
		name: "Embers", about: "Celesta, flute and harp", mood: "wistful", bpm: 64, reverb: 0.42, level: 2.03,
		sections: [
			{ chords: "Bb Gm", texture: ["harp", "softpad"], dyn: 0.25 },
			{
				chords: "Bb Gm Eb F Bb Gm Cm F", lead: "celesta", texture: ["harp", "softpad"], dyn: 0.35,
				melody: "D5:2 F5:1 D5:1 | Bb4:2 G4:2 | G4:1 Bb4:1 Eb5:2 | C5:3 r:1 | D5:1 C5:1 Bb4:1 D5:1 | G5:2 D5:2 | Eb5:1 D5:1 C5:1 G4:1 | A4:4"
			},
			{
				chords: "Eb Bb Cm F Eb Bb F Bb", lead: "flute", texture: ["arp", "softpad", "twinkle"], dyn: 0.4,
				melody: "G5:2 Eb5:2 | F5:2 D5:2 | Eb5:1.5 D5:.5 C5:2 | A4:3 r:1 | Bb4:1 Eb5:1 G5:2 | F5:1 D5:1 Bb4:2 | C5:1 A4:1 C5:1 F5:1 | Bb4:4"
			},
			{
				chords: "Bb Gm Eb F Bb Gm Cm F Bb", lead: "flute", double: "celesta", texture: ["harp", "softpad"], dyn: 0.35,
				melody: "D5:2 F5:1 D5:1 | Bb4:2 G4:2 | G4:1 Bb4:1 Eb5:2 | C5:3 r:1 | D5:1 C5:1 Bb4:1 D5:1 | G5:2 D5:2 | Eb5:1 D5:1 C5:1 G4:1 | A4:2 C5:2 | Bb4:4"
			}
		],
		end: "Bb"
	}
];

// The tunes the new pieces come back to

const REEL_A = "F#5:.5 A5:.5 A5:.5 F#5:.5 E5:.5 D5:.5 E5:.5 F#5:.5 | G5:.5 B5:.5 B5:.5 G5:.5 F#5:.5 G5:.5 A5:.5 G5:.5 | F#5:.5 A5:.5 A5:.5 F#5:.5 E5:.5 D5:.5 E5:.5 F#5:.5 | E5:.5 D5:.5 C#5:.5 E5:.5 A4:1 A4:.5 B4:.5 | F#5:.5 A5:.5 A5:.5 F#5:.5 E5:.5 D5:.5 E5:.5 F#5:.5 | G5:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 D5:.5 B4:.5 | A4:.5 D5:.5 F#5:.5 E5:.5 D5:.5 C#5:.5 B4:.5 C#5:.5 | D5:1.5 A4:.5 D5:2";
const REEL_B = "D6:.5 A5:.5 F#5:.5 A5:.5 D6:.5 A5:.5 F#5:.5 A5:.5 | E6:.5 C6:.5 G5:.5 C6:.5 E6:.5 C6:.5 G5:.5 E5:.5 | D6:.5 A5:.5 F#5:.5 A5:.5 B5:.5 A5:.5 F#5:.5 E5:.5 | C#5:.5 E5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 C#5:.5 E5:.5 | D6:.5 A5:.5 F#5:.5 A5:.5 D6:.5 A5:.5 F#5:.5 A5:.5 | E6:.5 C6:.5 G5:.5 C6:.5 E6:.5 D6:.5 C6:1 | B5:.5 A5:.5 G5:.5 E5:.5 F#5:.5 E5:.5 C#5:.5 E5:.5 | D5:1 F#5:.5 A5:.5 D6:2";
const SAND_A = "A4:1.5 Bb4:.5 A4:1 G4:1 | G4:1 F#4:.5 G4:.5 Eb4:2 | D4:.5 Eb4:.5 F#4:.5 G4:.5 A4:2 | C5:1 Bb4:.5 A4:.5 G4:2 | Bb4:1.5 A4:.5 G4:1 Bb4:1 | C5:1 Bb4:.5 C5:.5 Eb5:2 | D5:1 C5:.5 Bb4:.5 A4:1 G4:.5 F#4:.5 | Eb4:1 D4:3";
const JADE_A = "B4:3 A4:.5 G4:.5 | E4:2 G4:1 A4:1 | B4:1.5 D5:.5 A4:2 | G4:1 E4:3 | E5:2 D5:1 B4:1 | D5:1.5 B4:.5 A4:1 G4:1 | A4:2 G4:1 E4:1 | E4:4";
const CATH_A = "E5:2 G5:2 | A5:2 F5:2 | G5:1 F5:1 E5:1 D5:1 | E5:4 | E5:2 C5:1 E5:1 | F5:2 A5:2 | G5:1.5 F5:.5 D5:2 | C5:4";
const MARKET_A = "C5:.5 F5:.5 A5:.5 F5:.5 C5:1 A4:1 | D5:.5 F5:.5 Bb5:.5 F5:.5 D5:1 Bb4:1 | E5:.5 G5:.5 C6:.5 Bb5:.5 A5:.5 G5:.5 E5:1 | F5:1.5 E5:.5 F5:2 | A5:.5 F5:.5 D5:.5 F5:.5 A5:1 D6:1 | Bb5:.5 A5:.5 G5:.5 F5:.5 D5:1 F5:1 | G5:.5 E5:.5 C5:.5 E5:.5 G5:.5 Bb5:.5 A5:.5 G5:.5 | F5:2 r:2";
const NORTH_A = "E5:1 A5:1 G5:.5 E5:.5 D5:1 | D5:1.5 B4:.5 G4:2 | A4:.5 B4:.5 C5:1 E5:1 A5:1 | F#5:2 D5:2 | E5:1 A5:1 B5:.5 A5:.5 G5:1 | D5:1 G5:1 B4:2 | B4:1 C5:.5 B4:.5 G4:1 E4:1 | A4:4";
const CANDLE_A = "B4:1.5 G4:.5 E5:2 | E5:1 D5:.5 C5:.5 G4:2 | D5:1.5 B4:.5 G4:1 B4:1 | A4:3 r:1 | B4:1.5 G4:.5 E5:1 G5:1 | G5:1 F#5:.5 E5:.5 C5:2";
const LETTERS_A = "F#5:2 E5:1 D5:1 | C#5:2 A4:2 | D5:1 C#5:1 B4:1 D5:1 | C#5:3 r:1 | B4:1.5 C#5:.5 D5:1 G5:1 | F#5:1.5 E5:.5 D5:2";
const COURT_A = "D5:1 G5:.5 B5:.5 D6:1 B5:1 | A5:.5 F#5:.5 A5:.5 C6:.5 A5:1 F#5:1 | G5:.5 A5:.5 B5:.5 G5:.5 D5:1 B4:1 | C5:.5 E5:.5 G5:.5 E5:.5 C6:2 | B5:.5 C6:.5 D6:.5 B5:.5 G5:1 D5:1 | C6:.5 B5:.5 A5:.5 F#5:.5 D5:.5 F#5:.5 A5:1 | G5:.5 B5:.5 D5:.5 G5:.5 B4:1 D5:1";

const NEW_PIECES: Track[] = [
	{
		// Piano alone in E minor, broken chords under a quiet tune; the strings come in for the last verse
		name: "Candlelight", about: "Piano, strings at the last", mood: "wistful", bpm: 66, reverb: 0.38, level: 1.87, close: "piano",
		sections: [
			{ chords: "Em C", texture: ["pianoarp"], dyn: 0.3 },
			{ chords: "Em C G D Em C Am B7", lead: "piano", texture: ["pianoarp"], dyn: 0.4, melody: `${CANDLE_A} | C5:1 E5:1 A4:1 C5:1 | B4:2 D#5:2` },
			{
				chords: "C D G Em C D B7 Em", lead: "piano", texture: ["pianoarp"], dyn: 0.5,
				melody: "E5:2 G5:1 E5:1 | F#5:2 A5:1 F#5:1 | G5:1.5 F#5:.5 D5:1 B4:1 | E5:3 r:1 | C6:1.5 B5:.5 A5:1 G5:1 | F#5:1.5 E5:.5 D5:1 A5:1 | A5:1 F#5:1 D#5:1 B4:1 | E5:4"
			},
			{ chords: "Em C G D Em C B7 Em", lead: "piano", texture: ["pianoarp", "softpad"], dyn: 0.45, melody: `${CANDLE_A} | D#5:1 F#5:1 A5:1 F#5:1 | E5:4` }
		],
		end: "Em"
	},
	{
		// A D major reel: tin whistle and fiddle over strummed lute, bodhrán and tambourine
		name: "The Wandering Reel", about: "Whistle, fiddle, lute and bodhrán", mood: "folk", bpm: 112, reverb: 0.25, level: 1.25, close: "lute",
		sections: [
			{ chords: "D D", texture: ["strum", "bodhran"], dyn: 0.4 },
			{ chords: "D G D A D G A D", lead: "whistle", texture: ["strum", "bodhran"], dyn: 0.55, melody: REEL_A },
			{ chords: "D G D A D G A D", lead: "whistle", double: "lute", texture: ["strum", "bodhran", "tamb"], dyn: 0.65, melody: REEL_A },
			{ chords: "D C D A D C A7 D", lead: "whistle", texture: ["pick", "bodhran", "tamb"], dyn: 0.7, melody: REEL_B },
			{ chords: "D G D A D G A D", lead: "whistle", double: "fiddle", texture: ["strum", "bodhran", "tamb"], dyn: 0.8, melody: REEL_A },
			{ chords: "D C D A D C A7 D", lead: "whistle", double: "fiddle", texture: ["strum", "bodhran", "tamb"], dyn: 0.85, melody: REEL_B }
		],
		end: "D"
	},
	{
		// The Hijaz mode on D: an oud prelude, then the duduk's tune and a shawm's answer over darbuka, riq and a drone
		name: "Caravan of Sands", about: "Oud, duduk, shawm and darbuka", mood: "exotic", bpm: 92, reverb: 0.35, level: 1.42, close: "oud",
		sections: [
			{ chords: "D D D D", lead: "oud", texture: ["drone", "darbuka"], dyn: 0.35, melody: "D4:1 Eb4:.5 F#4:.5 G4:1 F#4:1 | Eb4:1 D4:3 | A4:1 Bb4:.5 A4:.5 G4:.5 F#4:.5 Eb4:1 | D4:4" },
			{ chords: "D Eb D Cm Gm Eb D D", lead: "duduk", texture: ["oudriff", "darbuka", "drone"], dyn: 0.5, melody: SAND_A },
			{
				chords: "Gm Gm Cm D Eb D Cm D", lead: "shawm", texture: ["oudriff", "darbuka", "tamb", "drone"], dyn: 0.7,
				melody: "G5:1 A5:.5 Bb5:.5 A5:1 G5:1 | F#5:.5 G5:.5 A5:1 D5:2 | Eb5:1 D5:.5 C5:.5 Bb4:1 C5:1 | D5:1.5 Eb5:.5 D5:2 | G5:1 F#5:.5 G5:.5 Bb5:1 G5:1 | A5:1.5 G5:.5 F#5:1 Eb5:1 | G5:.5 F#5:.5 Eb5:.5 D5:.5 C5:1 Eb5:1 | D5:4"
			},
			{ chords: "D Eb D Cm Gm Eb D D", lead: "duduk", double: "oud", texture: ["oudriff", "darbuka", "tamb", "drone"], dyn: 0.6, melody: SAND_A },
			{ chords: "D D", texture: ["drone", "darbuka"], dyn: 0.3 }
		],
		end: "D"
	},
	{
		// Piano and cello in D major: the cello sings first, then the piano, then together
		name: "Letters Home", about: "Piano and cello", mood: "tender", bpm: 72, reverb: 0.38, level: 1.74, close: "piano",
		sections: [
			{ chords: "D G", texture: ["pianoarp"], dyn: 0.3 },
			{ chords: "D A Bm F#m G D Em A", lead: "cello", octave: -1, texture: ["pianoarp"], dyn: 0.45, melody: `${LETTERS_A} | E5:1 G5:1 B4:1 C#5:1 | A4:4` },
			{ chords: "D A Bm F#m G D Em A", lead: "piano", texture: ["pianoarp"], dyn: 0.45, melody: `${LETTERS_A} | E5:1 G5:1 B4:1 C#5:1 | A4:4` },
			{
				chords: "G A F#m Bm G A D D", lead: "cello", octave: -1, texture: ["pianochords"], dyn: 0.55,
				melody: "D5:2 B4:1 D5:1 | E5:2 C#5:1 E5:1 | F#5:1.5 E5:.5 C#5:1 A4:1 | B4:3 r:1 | G5:2 F#5:1 E5:1 | E5:1.5 D5:.5 C#5:1 A4:1 | D5:2 F#5:2 | A5:4"
			},
			{ chords: "D A Bm F#m G D A D", lead: "piano", double: "cello", texture: ["pianoarp"], dyn: 0.5, melody: `${LETTERS_A} | E5:1 C#5:1 A4:1 C#5:1 | D5:4` }
		],
		end: "D"
	},
	{
		// A bright F major market tune for marimba, over kalimba, shakers and woodblock
		name: "Market Day", about: "Marimba, kalimba and shakers", mood: "playful", bpm: 112, reverb: 0.25, level: 1.47, close: "marimba",
		sections: [
			{ chords: "F C", texture: ["kalimba", "shaker"], dyn: 0.4 },
			{ chords: "F Bb C F Dm Bb C F", lead: "marimba", texture: ["kalimba", "shaker", "lowmarimba"], dyn: 0.55, melody: MARKET_A },
			{
				chords: "Bb C Am Dm Gm C F C", lead: "marimba", texture: ["lowmarimba", "shaker", "woodblock"], dyn: 0.6,
				melody: "F5:1 D5:.5 F5:.5 Bb5:2 | G5:1 E5:.5 G5:.5 C6:2 | A5:.5 G5:.5 E5:.5 C5:.5 E5:1 A5:1 | F5:1.5 E5:.5 D5:2 | D5:.5 G5:.5 Bb5:.5 G5:.5 D5:.5 G5:.5 Bb5:1 | C6:.5 Bb5:.5 G5:.5 E5:.5 G5:1 E5:1 | F5:.5 A5:.5 C6:.5 A5:.5 F5:.5 G5:.5 A5:.5 Bb5:.5 | G5:1 E5:1 C5:2"
			},
			{ chords: "F Bb C F Dm Bb C F", lead: "marimba", double: "kalimba", texture: ["kalimba", "shaker", "lowmarimba", "woodblock"], dyn: 0.7, melody: MARKET_A }
		],
		end: "F"
	},
	{
		// E minor pentatonic: shakuhachi over a koto, temple bells, and the koto's own song with pressed notes
		name: "Jade Terraces", about: "Koto, shakuhachi and bells", mood: "calm", bpm: 64, reverb: 0.45, level: 2.23, close: "koto",
		sections: [
			{ chords: "Em Em", texture: ["koto", "templebell"], dyn: 0.3 },
			{ chords: "Em C D Em Em C Am Em", lead: "shakuhachi", texture: ["koto", "templebell"], dyn: 0.4, melody: JADE_A },
			{
				chords: "Am C D Em Am C D D", lead: "koto", texture: ["templebell", "frame"], dyn: 0.45,
				melody: "A5:1 G5:.5 E5:.5 D5:1 E5:1 | G5:1.5 E5:.5 D5+2:2 | A5:1 B5:1 A5:.5 G5:.5 E5:1 | D5:1 B4:1 E5:2 | A5:1 G5:.5 E5:.5 D5:1 E5:1 | G5:1 A5:.5 G5:.5 E5:2 | D5:1 E5:.5 D5:.5 A4+2:2 | A4:4"
			},
			{ chords: "Em C D Em Em C Am Em", lead: "shakuhachi", texture: ["koto", "templebell"], dyn: 0.45, melody: JADE_A },
			{ chords: "Em Em", texture: ["koto"], dyn: 0.25 }
		],
		end: "Em"
	},
	{
		// A G major dance for piano in the classical style, over an Alberti bass
		name: "Court Dance", about: "Piano, in the classical style", mood: "playful", bpm: 104, reverb: 0.3, level: 1.69, close: "piano",
		sections: [
			{ chords: "G D G C G D7 G D", lead: "piano", texture: ["alberti"], dyn: 0.5, melody: `${COURT_A} | A5:1 F#5:1 D5:2` },
			{ chords: "G D G C G D7 G G", lead: "piano", double: "celesta", texture: ["alberti"], dyn: 0.55, melody: `${COURT_A} | G5:2 r:2` },
			{
				chords: "Em B7 Em Am D G C D", lead: "piano", texture: ["alberti"], dyn: 0.6,
				melody: "B5:1 G5:.5 E5:.5 B4:1 E5:1 | D#5:.5 F#5:.5 A5:.5 F#5:.5 D#5:1 B4:1 | E5:.5 G5:.5 B5:.5 G5:.5 E6:2 | C6:.5 B5:.5 A5:.5 G5:.5 E5:1 C5:1 | D5:.5 F#5:.5 A5:.5 F#5:.5 D6:1 C6:1 | B5:.5 A5:.5 G5:.5 F#5:.5 G5:1 D5:1 | E5:.5 G5:.5 C6:.5 B5:.5 A5:.5 G5:.5 F#5:.5 E5:.5 | D5:2 A5:.5 F#5:.5 D5:1"
			},
			{ chords: "G D G C G D7 G G", lead: "piano", texture: ["alberti"], dyn: 0.65, melody: `${COURT_A} | G5:2 r:2` }
		],
		end: "G"
	},
	{
		// A dorian on A: fiddle over hammered dulcimer and a hurdy-gurdy drone, then the dulcimer's tune with frame drum and voices
		name: "Northern Hearth", about: "Fiddle, dulcimer and drones", mood: "folk", bpm: 80, reverb: 0.4, level: 1.88, close: "dulcimer",
		sections: [
			{ chords: "Am Am", texture: ["hurdy", "dulcimer"], dyn: 0.35 },
			{ chords: "Am G Am D Am G Em Am", lead: "fiddle", texture: ["hurdy", "dulcimer"], dyn: 0.5, melody: NORTH_A },
			{
				chords: "C G D Am C G Em Am", lead: "dulcimer", texture: ["hurdy", "frame", "choir"], dyn: 0.6,
				melody: "G5:1 E5:.5 G5:.5 C6:1 B5:1 | A5:.5 G5:.5 D5:1 G5:2 | F#5:1 A5:1 D6:1 A5:1 | C6:1.5 B5:.5 A5:2 | G5:1 E5:.5 G5:.5 C6:1 E6:1 | D6:1 B5:.5 A5:.5 G5:2 | E5:1 G5:1 B5:1 G5:1 | A5:4"
			},
			{ chords: "Am G Am D Am G Em Am", lead: "fiddle", double: "horn", texture: ["hurdy", "dulcimer", "frame"], dyn: 0.7, melody: NORTH_A },
			{ chords: "Am Am", texture: ["hurdy", "dulcimer"], dyn: 0.3 }
		],
		end: "Am"
	},
	{
		// A C major chorale for pipe organ, the choir taking the second verse, bells ringing
		name: "Cathedral of Stone", about: "Pipe organ, choir and bells", mood: "sacred", bpm: 56, reverb: 0.5, level: 1.47, close: "organ",
		sections: [
			{ chords: "C G", texture: ["organ", "bells"], dyn: 0.35 },
			{ chords: "C F G C Am F G C", lead: "organ", texture: ["organ"], dyn: 0.45, melody: CATH_A },
			{
				chords: "Am Em F C Dm Am G G", lead: "choir", texture: ["organ", "bells"], dyn: 0.55,
				melody: "A4:2 C5:2 | B4:2 G4:2 | A4:1 C5:1 F5:2 | E5:3 r:1 | F5:2 D5:1 F5:1 | E5:2 C5:2 | D5:1 B4:1 G4:2 | D5:4"
			},
			{ chords: "C F G C Am F G C", lead: "organ", double: "choir", texture: ["organ", "choir", "bells", "timpani"], dyn: 0.8, melody: CATH_A }
		],
		end: "C"
	}
];

/** Play order: the orchestral pieces with the others between them. */
const ORDER = [
	"Dawn over the Realm", "Candlelight", "The Wandering Reel", "The Long Road", "Caravan of Sands", "Banners Rising",
	"Letters Home", "Market Day", "Harvest Fields", "Jade Terraces", "Old Kingdoms", "Court Dance",
	"Northern Hearth", "Across the Sea", "Cathedral of Stone", "March of Iron", "Embers"
];

export const TRACKS: Track[] = ORDER.map((name) => {
	const track = [...ORCHESTRAL, ...NEW_PIECES].find((t) => t.name === name);
	if (!track) throw new Error(`No track ${name}`);
	return track;
});
