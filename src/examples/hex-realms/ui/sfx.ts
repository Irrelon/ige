/**
 * Small synthesised sound effects (Web Audio), so the prototype has
 * feedback without any audio files. Sounds start after the first user
 * gesture, as browsers require.
 */

export type Sound = "select" | "move" | "attack" | "hit" | "build" | "level" | "turn" | "error" | "capture" | "tech" | "victory";

let ctx: AudioContext | null = null;
let enabled = readSetting();

function readSetting (): boolean {
	try {
		return localStorage.getItem("hexRealms.sound") !== "off";
	} catch {
		return true;
	}
}

export function soundEnabled (): boolean {
	return enabled;
}

export function setSoundEnabled (on: boolean): void {
	enabled = on;
	try {
		localStorage.setItem("hexRealms.sound", on ? "on" : "off");
	} catch {
		// Storage unavailable: the setting lasts for this session
	}
}

function tone (freq: number, start: number, duration: number, type: OscillatorType, volume: number, slideTo?: number): void {
	if (!ctx) return;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
	if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + start + duration);
	gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
	gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
	osc.connect(gain).connect(ctx.destination);
	osc.start(ctx.currentTime + start);
	osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function play (sound: Sound): void {
	if (!enabled) return;
	try {
		ctx ??= new AudioContext();
		if (ctx.state === "suspended") void ctx.resume();
	} catch {
		return;
	}
	switch (sound) {
		case "select": tone(660, 0, 0.06, "sine", 0.05); break;
		case "move": tone(330, 0, 0.08, "triangle", 0.05, 440); break;
		case "attack": tone(180, 0, 0.12, "sawtooth", 0.06, 90); break;
		case "hit": tone(110, 0, 0.15, "square", 0.04, 60); break;
		case "build": tone(520, 0, 0.05, "square", 0.03); tone(780, 0.06, 0.06, "square", 0.03); break;
		case "level": tone(523, 0, 0.1, "triangle", 0.06); tone(659, 0.1, 0.1, "triangle", 0.06); tone(784, 0.2, 0.16, "triangle", 0.06); break;
		case "turn": tone(392, 0, 0.12, "sine", 0.05); tone(523, 0.12, 0.16, "sine", 0.05); break;
		case "error": tone(200, 0, 0.12, "square", 0.04, 150); break;
		case "capture": tone(440, 0, 0.1, "triangle", 0.06); tone(554, 0.1, 0.1, "triangle", 0.06); tone(880, 0.2, 0.2, "triangle", 0.06); break;
		case "tech": tone(880, 0, 0.08, "sine", 0.05); tone(1175, 0.08, 0.14, "sine", 0.05); break;
		case "victory": [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.3, "triangle", 0.07)); break;
	}
}
