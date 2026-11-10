/**
 * Synthesised sound effects (Web Audio), so the game has feedback without
 * any audio files: little interface blips, and for battles a voice per kind
 * of weapon, a trumpet call for a won fight, a falling horn for a lost one,
 * and a drum roll and fanfare for a captured city. Sounds start after the
 * first user gesture, as browsers require.
 */

import type { UnitTypeId } from "../sim/rules";
import { audioContext, getSfxVolume, setSfxVolume, sfxOut } from "./audio";

export type Sound =
	| "select" | "move" | "attack" | "hit" | "build" | "level" | "turn" | "error" | "capture" | "tech" | "victory"
	// Battle: the blows by weapon, then how the fight went
	| "clash" | "bonk" | "twang" | "gunshot" | "volley" | "siege" | "boom" | "zap"
	| "fanfare" | "defeat" | "cityLost";

let ctx: AudioContext | null = null;
/** When this play's sounds start (audio clock) and how loud, set by play(). */
let t0 = 0;
let level = 1;

export function soundEnabled (): boolean {
	return getSfxVolume() > 0;
}

export function setSoundEnabled (on: boolean): void {
	setSfxVolume(on ? Math.max(0.5, getSfxVolume()) : 0);
}

function out (): AudioNode {
	return sfxOut() ?? (ctx as AudioContext).destination;
}

/** An envelope: up to `volume` over `attack`, held, and away over `release` after `duration`. */
function envelope (at: number, duration: number, volume: number, attack = 0.01, release = 0.08): GainNode {
	const c = ctx as AudioContext;
	const g = c.createGain();
	const v = volume * level;
	g.gain.setValueAtTime(0.0001, at);
	g.gain.exponentialRampToValueAtTime(v, at + attack);
	g.gain.setValueAtTime(v, at + Math.max(attack, duration - release));
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	g.connect(out());
	return g;
}

function tone (freq: number, start: number, duration: number, type: OscillatorType, volume: number, slideTo?: number): void {
	if (!ctx) return;
	const at = t0 + start;
	const osc = ctx.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, at);
	if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, at);
	g.gain.exponentialRampToValueAtTime(volume * level, at + 0.01);
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	osc.connect(g).connect(out());
	osc.start(at);
	osc.stop(at + duration + 0.02);
}

let noiseData: AudioBuffer | null = null;

/** A burst of filtered noise (whooshes, cracks, cymbals, drum skins), the filter swept from f0 to f1. */
function noise (start: number, duration: number, type: BiquadFilterType, f0: number, volume: number, f1 = f0, q = 1, attack = 0.005): void {
	if (!ctx) return;
	if (!noiseData) {
		noiseData = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const d = noiseData.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	const at = t0 + start;
	const src = ctx.createBufferSource();
	src.buffer = noiseData;
	src.loop = true;
	const f = ctx.createBiquadFilter();
	f.type = type;
	f.Q.value = q;
	f.frequency.setValueAtTime(f0, at);
	if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + duration);
	const g = ctx.createGain();
	g.gain.setValueAtTime(0.0001, at);
	g.gain.exponentialRampToValueAtTime(volume * level, at + attack);
	g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
	src.connect(f).connect(g).connect(out());
	src.start(at, Math.random() * 0.5);
	src.stop(at + duration + 0.02);
}

/** A brass note: two detuned saws through a filter that opens on the attack, scooping up into the pitch. */
function brass (freq: number, start: number, duration: number, volume: number, vibrato = 0, muted = false): void {
	if (!ctx) return;
	const at = t0 + start;
	const g = envelope(at, duration, volume, 0.03, Math.min(0.15, duration * 0.4));
	const f = ctx.createBiquadFilter();
	f.type = "lowpass";
	f.Q.value = 1.4;
	const bright = muted ? 2.2 : 4.5;
	f.frequency.setValueAtTime(freq * 1.2, at);
	f.frequency.exponentialRampToValueAtTime(freq * bright, at + 0.05);
	f.frequency.exponentialRampToValueAtTime(freq * bright * 0.6, at + duration);
	f.connect(g);
	for (const detune of [-6, 6]) {
		const o = ctx.createOscillator();
		o.type = "sawtooth";
		o.detune.value = detune;
		o.frequency.setValueAtTime(freq * 0.96, at);
		o.frequency.linearRampToValueAtTime(freq, at + 0.05);
		if (vibrato) {
			const lfo = ctx.createOscillator();
			lfo.frequency.value = 5.5;
			const depth = ctx.createGain();
			depth.gain.setValueAtTime(0, at);
			depth.gain.linearRampToValueAtTime(freq * 0.012 * vibrato, at + Math.min(0.4, duration * 0.5));
			lfo.connect(depth).connect(o.frequency);
			lfo.start(at);
			lfo.stop(at + duration + 0.05);
		}
		o.connect(f);
		o.start(at);
		o.stop(at + duration + 0.05);
	}
}

/** A bell-like chime: a sine and an inharmonic partial, ringing away. */
function chime (freq: number, start: number, volume: number, duration = 0.9): void {
	tone(freq, start, duration, "sine", volume);
	tone(freq * 2.76, start, duration * 0.5, "sine", volume * 0.35);
}

/** A drum: a falling thump and a slap of skin. */
function drum (start: number, volume: number, pitch = 110): void {
	tone(pitch, start, 0.18, "sine", volume, pitch * 0.45);
	noise(start, 0.06, "lowpass", 900, volume * 0.6);
}

/** A metal clang: inharmonic partials ringing away. */
function clang (start: number, volume: number, base = 1650): void {
	tone(base, start, 0.32, "sine", volume);
	tone(base * 1.51, start, 0.24, "sine", volume * 0.7);
	tone(base * 2.37, start, 0.14, "sine", volume * 0.5);
	noise(start, 0.04, "highpass", 3200, volume * 1.2);
}

/** Which blow a unit strikes with. */
export function attackSound (type: UnitTypeId): Sound {
	switch (type) {
		case "warrior": return "bonk";
		case "archer": case "crossbowman": return "twang";
		case "musketeer": case "rifleman": case "infantry": case "mechInfantry": return "gunshot";
		case "machineGunner": return "volley";
		case "catapult": case "trebuchet": return "siege";
		case "cannon": case "artillery": case "rocketArtillery": case "tank": return "boom";
		case "laserTrooper": case "exoTrooper": case "hoverTank": case "railgun": return "zap";
		default: return "clash";
	}
}

/**
 * Play a sound, `delay` seconds from now, at `gain` of its usual loudness. Blows are timed so the
 * impact lands as the attacker's lunge does (about 0.17 s in), or as a shot arrives.
 */
export function play (sound: Sound, delay = 0, gain = 1): void {
	if (!soundEnabled()) return;
	ctx = audioContext();
	if (!ctx) return;
	if (ctx.state === "suspended") void ctx.resume();
	t0 = ctx.currentTime + delay;
	level = gain;
	switch (sound) {
		case "select": tone(660, 0, 0.06, "sine", 0.05); break;
		case "move": tone(330, 0, 0.08, "triangle", 0.05, 440); break;
		case "attack": tone(180, 0, 0.12, "sawtooth", 0.06, 90); break;
		case "hit": tone(110, 0, 0.15, "square", 0.04, 60); break;
		case "build": tone(520, 0, 0.05, "square", 0.03); tone(780, 0.06, 0.06, "square", 0.03); break;
		case "level": tone(523, 0, 0.1, "triangle", 0.06); tone(659, 0.1, 0.1, "triangle", 0.06); tone(784, 0.2, 0.16, "triangle", 0.06); break;
		case "turn": tone(392, 0, 0.12, "sine", 0.05); tone(523, 0.12, 0.16, "sine", 0.05); break;
		case "error": tone(200, 0, 0.12, "square", 0.04, 150); break;
		case "tech": tone(880, 0, 0.08, "sine", 0.05); tone(1175, 0.08, 0.14, "sine", 0.05); break;
		case "victory": [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.07)); break;

		// A blade: the swish of the swing, the ring of steel, a thud
		case "clash":
			noise(0, 0.17, "bandpass", 700, 0.07, 2600, 1.8, 0.06);
			clang(0.16, 0.035);
			tone(130, 0.16, 0.14, "sine", 0.07, 60);
			break;
		// A club: the swing and a hollow wooden knock
		case "bonk":
			noise(0, 0.16, "bandpass", 500, 0.06, 1500, 1.5, 0.05);
			tone(420, 0.16, 0.09, "triangle", 0.07, 300);
			tone(640, 0.16, 0.06, "sine", 0.05);
			tone(110, 0.16, 0.14, "sine", 0.08, 55);
			break;
		// A bow: the string's twang, the arrow's hiss, its thunk as it lands
		case "twang":
			tone(196, 0, 0.18, "triangle", 0.07, 160);
			tone(392, 0, 0.08, "sine", 0.03);
			noise(0.03, 0.3, "bandpass", 3000, 0.025, 1800, 2, 0.05);
			tone(180, 0.36, 0.08, "square", 0.04, 90);
			noise(0.36, 0.05, "lowpass", 1200, 0.05);
			break;
		// A gun: a sharp crack over a low thump, a whiff of echo
		case "gunshot":
			noise(0, 0.12, "highpass", 1400, 0.11, 1400, 0.7, 0.002);
			tone(90, 0, 0.16, "sine", 0.09, 45);
			noise(0.09, 0.35, "bandpass", 700, 0.025, 400, 1.2, 0.03);
			break;
		case "volley":
			for (let i = 0; i < 4; i++) {
				noise(i * 0.09, 0.07, "highpass", 1500, 0.08, 1500, 0.7, 0.002);
				tone(95, i * 0.09, 0.08, "sine", 0.06, 50);
			}
			break;
		// A catapult: a creak, the release, the stone's crash
		case "siege":
			tone(150, 0, 0.18, "sawtooth", 0.025, 110);
			noise(0.12, 0.3, "bandpass", 400, 0.06, 1200, 1.4, 0.05);
			noise(0.48, 0.4, "lowpass", 700, 0.11, 300);
			tone(70, 0.48, 0.3, "sine", 0.09, 35);
			break;
		// A cannon: a deep boom rolling away
		case "boom":
			tone(80, 0, 0.5, "sine", 0.13, 32);
			noise(0, 0.5, "lowpass", 1100, 0.12, 180, 0.8, 0.003);
			noise(0.08, 0.6, "bandpass", 300, 0.03, 120, 1, 0.08);
			break;
		// A laser: a falling zap and a sizzle
		case "zap":
			tone(1500, 0, 0.18, "square", 0.04, 180);
			tone(2200, 0, 0.12, "sawtooth", 0.025, 400);
			noise(0.12, 0.2, "highpass", 4000, 0.03);
			break;

		// A won fight: a bright trumpet call
		case "fanfare":
			brass(392, 0, 0.11, 0.05);
			brass(523, 0.12, 0.11, 0.05);
			brass(659, 0.24, 0.11, 0.05);
			brass(784, 0.36, 0.55, 0.055, 0.6);
			brass(659, 0.36, 0.55, 0.035, 0.6);
			break;
		// A lost fight: a muted horn falling through a minor triad, a soft drum
		case "defeat":
			brass(392, 0, 0.2, 0.045, 0, true);
			brass(311, 0.22, 0.2, 0.045, 0, true);
			brass(262, 0.44, 0.75, 0.05, 0.8, true);
			drum(0.44, 0.07, 80);
			break;
		// A city taken: a drum roll, the brass fanfare, a cymbal, chimes sparkling upward
		case "capture":
			for (let i = 0; i < 12; i++) drum(i * 0.045 * (1 - i * 0.025), 0.03 + i * 0.004, 150);
			[[523, 0.5], [523, 0.62], [523, 0.74]].forEach(([f, at]) => {
				brass(f, at, 0.1, 0.045);
				brass(f * 0.75, at, 0.1, 0.03);
			});
			brass(1047, 0.86, 1, 0.05, 0.7);
			brass(784, 0.86, 1, 0.04, 0.7);
			brass(659, 0.86, 1, 0.035, 0.7);
			brass(523, 0.86, 1, 0.035, 0.7);
			drum(0.86, 0.1, 70);
			noise(0.86, 1.4, "highpass", 5000, 0.05, 5000, 0.6, 0.004);
			[1047, 1319, 1568, 2093, 2637].forEach((f, i) => chime(f, 0.95 + i * 0.09, 0.025));
			break;
		// A city lost: a low horn falling, a gong
		case "cityLost":
			brass(262, 0, 0.3, 0.05, 0, true);
			brass(208, 0.32, 0.3, 0.05, 0, true);
			brass(175, 0.64, 1, 0.055, 0.8, true);
			for (const [f, v, d] of [[90, 0.09, 2], [151, 0.05, 1.6], [217, 0.035, 1.2], [304, 0.02, 0.8]] as const) tone(f, 0.64, d, "sine", v);
			break;
	}
}
