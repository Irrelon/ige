/**
 * The game's audio context and its two volume buses (music and sound
 * effects), with the volumes kept in localStorage. Browsers only let audio
 * start after a user gesture, so the context is created (or resumed) on the
 * first click or key press.
 */

let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

const KEYS = { music: "hexRealms.musicVolume", sfx: "hexRealms.sfxVolume" };

function read (key: string, fallback: number): number {
	try {
		const v = localStorage.getItem(key);
		if (v === null) return fallback;
		const n = Number(v);
		return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
	} catch {
		return fallback;
	}
}

function write (key: string, value: number): void {
	try {
		localStorage.setItem(key, String(value));
	} catch {
		// Storage unavailable: the setting lasts for this session
	}
}

let musicVolume = read(KEYS.music, 0.6);
// Older builds had an on/off sound setting: honour "off"
let sfxVolume = (() => {
	try {
		if (localStorage.getItem("hexRealms.sound") === "off" && localStorage.getItem(KEYS.sfx) === null) return 0;
	} catch {
		// ignore
	}
	return read(KEYS.sfx, 0.8);
})();

/** Perceived loudness from a 0-1 slider (a gentle curve, so the low end is usable). */
function curve (v: number): number {
	return v * v;
}

/** The shared context (created on first use; null if Web Audio is unavailable). */
export function audioContext (): AudioContext | null {
	if (ctx) return ctx;
	try {
		ctx = new AudioContext({ latencyHint: "interactive" });
	} catch {
		return null;
	}
	musicBus = ctx.createGain();
	sfxBus = ctx.createGain();
	musicBus.gain.value = curve(musicVolume);
	sfxBus.gain.value = curve(sfxVolume);
	musicBus.connect(ctx.destination);
	sfxBus.connect(ctx.destination);
	return ctx;
}

/** Resume the context (call from a user gesture). */
export function unlockAudio (): void {
	const c = audioContext();
	if (c && c.state === "suspended") void c.resume();
}

export function musicOut (): GainNode | null {
	audioContext();
	return musicBus;
}

export function sfxOut (): GainNode | null {
	audioContext();
	return sfxBus;
}

export function getMusicVolume (): number {
	return musicVolume;
}

export function getSfxVolume (): number {
	return sfxVolume;
}

export function setMusicVolume (v: number): void {
	musicVolume = Math.min(1, Math.max(0, v));
	write(KEYS.music, musicVolume);
	if (ctx && musicBus) musicBus.gain.setTargetAtTime(curve(musicVolume), ctx.currentTime, 0.05);
}

export function setSfxVolume (v: number): void {
	sfxVolume = Math.min(1, Math.max(0, v));
	write(KEYS.sfx, sfxVolume);
	if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(curve(sfxVolume), ctx.currentTime, 0.05);
}

// Any first gesture unlocks audio for the rest of the page's life
if (typeof window !== "undefined") {
	const unlock = () => {
		unlockAudio();
		window.removeEventListener("pointerdown", unlock, true);
		window.removeEventListener("keydown", unlock, true);
	};
	window.addEventListener("pointerdown", unlock, true);
	window.addEventListener("keydown", unlock, true);
}
