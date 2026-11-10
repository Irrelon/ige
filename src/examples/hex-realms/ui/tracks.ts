import { note, rng, Score } from "./score";

/**
 * The in-game music: eight composed pieces, played one after another (see
 * music.ts). Each is written as sections of bars: a chord per bar, a melody
 * (note:beats, bars split by "|", "r" a rest), the instrument that carries
 * it, and the textures underneath (pads, harp, ostinato, drums...), with a
 * dynamic that the arranger turns into velocities and brightness.
 *
 * Moods: two orchestral (Dawn over the Realm, Across the Sea), two
 * exciting (Banners Rising, March of Iron), three wistful (The Long Road,
 * Old Kingdoms, Embers) and one pastoral (Harvest Fields).
 */

type Lead = "flute" | "strings" | "cello" | "horn" | "brass" | "celesta" | "choir";
type Texture = "pad" | "softpad" | "choir" | "arp" | "harp" | "ostinato" | "pizz" | "march" | "drums" | "timpani" | "horns" | "twinkle";

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
	mood: "orchestral" | "exciting" | "wistful" | "pastoral";
	bpm: number;
	reverb: number;
	/**
	 * Playback gain, from measuring each track offline (tracks.test.ts with
	 * MUSIC_LEVELS=1): 0.55 x the title theme's loudness, a little less for the
	 * wistful and pastoral pieces.
	 */
	level: number;
	sections: Section[];
	/** The chord the piece ends on (held, with a harp roll). */
	end: string;
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

/** The tune, bar by bar: [midi or null for a rest, beats]. */
function tune (src: string): [number | null, number][][] {
	return src.split("|").map((bar) => bar.trim().split(/\s+/).filter(Boolean).map((tok) => {
		const [n, beats] = tok.split(":");
		return [n === "r" ? null : note(n), Number(beats)];
	}));
}

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

	const lead = (who: Lead, t: number, d: number, m: number, v: number) => {
		switch (who) {
			case "flute": s.flute(t, d, m, 0.72 * v + 0.12, 0.22, 0.55); break;
			case "strings": s.strings(t, d, m, 0.85 * v + 0.1, { attack: 0.1, release: 0.7, pan: -0.35, voices: 4, bright: 0.9 + 0.5 * v, level: 0.06 }); break;
			case "cello": s.strings(t, d, m, 0.85 * v + 0.12, { attack: 0.12, release: 0.8, pan: 0.3, voices: 3, bright: 0.75 + 0.3 * v, level: 0.065 }); break;
			case "horn": s.brass(t, d, m, 0.8 * v + 0.12, { horn: true, pan: -0.15 }); break;
			case "brass": s.brass(t, d, m, 0.8 * v + 0.1, { pan: 0.1, level: 0.055 }); break;
			case "celesta": s.celesta(t, m, 0.6 * v + 0.2); break;
			case "choir": s.choir(t, d, m, 0.65 * v + 0.15, "a", 0, 0.7); break;
		}
	};

	const textures = (sec: Section, c: Chord, b: number) => {
		const v = sec.dyn;
		const t = at(b), barLen = 4 * B;
		const pad = c.tones.slice(0, 3).map((pc) => inRange(pc, 55));
		const bass = inRange(c.root, 36), cello = inRange(c.root, 48);
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
					const third = inRange(c.tones[1], cello), fifth = inRange(c.tones[2], cello);
					[cello, cello, fifth, cello, cello, fifth, cello, third].forEach((m, i) => {
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
			}
		}
	};

	for (const sec of track.sections) {
		const chords = sec.chords.trim().split(/\s+/).map(chord);
		const bars = sec.melody ? tune(sec.melody) : [];
		const first = bar;
		if (sec.crash) s.crash(at(first), 0.55 + 0.35 * sec.dyn);
		chords.forEach((c, i) => {
			textures(sec, c, bar);
			const notes = bars[i];
			if (notes && sec.lead) {
				let beat = 0;
				for (const [m, beats] of notes) {
					if (m !== null) {
						const pitch = m + 12 * (sec.octave ?? 0);
						const d = beats * B * 0.95;
						lead(sec.lead, at(bar, beat), d, pitch, sec.dyn);
						if (sec.double) lead(sec.double, at(bar, beat), d, pitch - 12, sec.dyn * 0.75);
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

	// The close: the last chord held, and a harp roll up through it
	const last = chord(track.end);
	const hold = 3 * 4 * B;
	last.tones.slice(0, 3).map((pc) => inRange(pc, 55)).forEach((m, i) => s.strings(at(bar), hold, m, 0.4, { attack: 0.5, release: 2.8, pan: -0.3 + i * 0.3, voices: 3, bright: 0.6, wet: 0.65, level: 0.05 }));
	s.strings(at(bar), hold, inRange(last.root, 36), 0.4, { attack: 0.5, release: 2.8, pan: 0.4, voices: 2, bright: 0.5 });
	s.sub(at(bar), hold, inRange(last.root, 36), 0.45);
	const roll = [0, 1, 2].flatMap((o) => last.tones.slice(0, 3).map((pc) => inRange(pc, 48 + o * 12)));
	roll.forEach((m, i) => s.harp(at(bar, i * 0.22), m, 0.55, -0.35, 0.65));

	const cuts: number[] = [];
	for (let b = 4; b < bar; b += 4) cuts.push(at(b) - 0.05);
	return { score: s, cuts, length: at(bar) + hold + 4 };
}

// ------------------------------------------------------------------
// The pieces
// ------------------------------------------------------------------

export const TRACKS: Track[] = [
	{
		// Orchestral: a warm F major theme for strings and horns, building to the full orchestra
		name: "Dawn over the Realm", mood: "orchestral", bpm: 72, reverb: 0.34, level: 0.88,
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
		name: "The Long Road", mood: "wistful", bpm: 62, reverb: 0.4, level: 2.03,
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
		name: "Banners Rising", mood: "exciting", bpm: 104, reverb: 0.28, level: 0.7,
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
		name: "Harvest Fields", mood: "pastoral", bpm: 96, reverb: 0.3, level: 1.95,
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
		name: "Old Kingdoms", mood: "wistful", bpm: 60, reverb: 0.42, level: 1.21,
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
		name: "Across the Sea", mood: "orchestral", bpm: 80, reverb: 0.36, level: 0.84,
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
		name: "March of Iron", mood: "exciting", bpm: 96, reverb: 0.28, level: 0.7,
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
		name: "Embers", mood: "wistful", bpm: 64, reverb: 0.42, level: 2.03,
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
