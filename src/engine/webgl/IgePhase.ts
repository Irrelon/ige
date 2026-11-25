import type { IgeObject } from "@/engine/core/IgeObject";
import { igeEffectNow } from "@/engine/webgl/IgeEffectTime";

/**
 * Phase (IgeEntity.phase()): an entity, and everything under it, partly out of phase with the world. The body goes
 * glassy (the scene shows through it, faintly tinted and darkened), its edge becomes a shimmering rim with the red,
 * green and blue fringes pulled apart and rippling slowly, and every so often it flickers fully solid.
 *
 * Everything here is a pure function of a time value, so a paused or scrubbed recording shows the same picture: the
 * flicker is worked out on the CPU (`igePhaseSolid()`), the rim's ripple in the shader from the same time
 * (`igePhaseRipple()` is its twin, for tests and for games that follow it). The renderer draws a phased entity as a
 * transparent item with the lit shader's phase variant; nothing phased, nothing done. See guides/phase-effects.md.
 */
export interface IgePhaseSettings {
	/** 0 normal and solid, 1 fully out of phase (a faint ghost that is mostly its edge). */
	amount: number;
	/** How often it flickers solid: 0 never, 1 about a third of the time. */
	flicker: number;
	/** How fast the flicker runs (1 normal: a flicker cell is about a fifth of a second). */
	flickerSpeed: number;
	/** Changes the flicker pattern without changing the look: another seed is another, equally repeatable, take. */
	seed: number;
	/** The rim's colour (its fringes are this colour's channels pulled apart); 0 to 1 and over for HDR glow. */
	edgeR: number;
	edgeG: number;
	edgeB: number;
	/** How bright the rim is (1 is about the edge colour; more glows under HDR bloom). */
	edgeStrength: number;
	/** How tight the rim is: higher is thinner. */
	edgePower: number;
	/** The rim's fringes' separation, 0 (one rim) to 1 (wide). */
	split: number;
	/** How fast the fringes ripple (1 normal, 0 still). */
	shimmer: number;
	/** World units a ripple wave spans along the body; 0 sizes it to the entity. */
	rippleScale: number;
	/** The body's tint where out of phase (multiplied into its lit colour, then darkened), and how opaque it is at amount 1. */
	tintR: number;
	tintG: number;
	tintB: number;
	opacity: number;
}

export type IgePhaseSettingName = keyof IgePhaseSettings;

export const IGE_PHASE_DEFAULTS: Readonly<IgePhaseSettings> = {
	amount: 0, flicker: 0, flickerSpeed: 1, seed: 0,
	edgeR: 0.45, edgeG: 0.85, edgeB: 1, edgeStrength: 1.6, edgePower: 3, split: 0.35, shimmer: 1, rippleScale: 0,
	tintR: 0.55, tintG: 0.75, tintB: 1, opacity: 0.16
};

/** What entity.phase() takes: the numeric settings, plus `edgeColor` as a colour, `tint` likewise and `time`. */
export type IgePhaseInput = Partial<IgePhaseSettings> & {
	edgeColor?: { r: number; g: number; b: number };
	tint?: { r: number; g: number; b: number };
	/** The time its noise and flicker are a function of, in seconds; null (the default) follows the clock (igeEffectTime(), else the engine's). */
	time?: number | null;
};

/** 32-bit integer hash to 0..1 (deterministic across JavaScript engines: integer maths only). */
export function igePhaseHash (n: number, seed: number = 0): number {
	let h = (Math.imul(n | 0, 0x27d4eb2d) ^ Math.imul((seed | 0) + 0x165667b1, 0x85ebca6b)) >>> 0;
	h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
	h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
	h = (h ^ (h >>> 15)) >>> 0;
	return h / 4294967296;
}

const smooth = (a: number, b: number, x: number): number => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** How long a flicker cell lasts at flickerSpeed 1, seconds. */
export const IGE_PHASE_CELL = 0.2;

/**
 * How solid the effect is at `time`, 0 (out of phase as `amount` says) to 1 (a flicker of full solidity). Cells of
 * about 0.2 s each flicker solid with probability `flicker` / 3 (so flicker 1 is solid about a quarter of the time,
 * after the soft edges and stutter), fading in quickly, stuttering once or twice and fading out. Pure in
 * (time, flicker, flickerSpeed, seed).
 */
export function igePhaseSolid (time: number, flicker: number, flickerSpeed: number = 1, seed: number = 0): number {
	if (flicker <= 0) return 0;
	const cellsPerSecond = Math.max(0.05, flickerSpeed) / IGE_PHASE_CELL;
	const x = time * cellsPerSecond;
	const cell = Math.floor(x);
	const within = x - cell;
	if (igePhaseHash(cell, seed) >= Math.min(1, flicker) / 3) return 0;
	const envelope = smooth(0, 0.12, within) * (1 - smooth(0.62, 1, within));
	// A stutter: the picture drops back for a blink in a sixth of the cell's slices
	const slice = Math.floor(within * 6);
	const stutter = igePhaseHash(cell * 8 + slice, seed + 977) < 0.22 ? 0.3 : 1;
	return envelope * stutter;
}

/**
 * The rim's ripple for a colour channel (0 red, 1 green, 2 blue) at a point `coord` (the fresnel term and the position
 * along the body, in waves) at `time`: 0 to 1, each channel at its own speed and offset. The shader computes the same.
 */
export function igePhaseRipple (time: number, shimmer: number, channel: number, coord: number): number {
	return 0.5 + 0.5 * Math.sin(coord * 6.2831853 + time * shimmer * (0.55 + 0.23 * channel) + channel * 2.0943951);
}

/**
 * An entity's phase (the object entity.phase() returns): its settings, its time, and `set()` / `has()` / `time()` so
 * an IgeTimeline can animate any numeric setting as a track `effect.<name>` (bind the effect: `timeline.bind("ghost",
 * entity.phase())`).
 */
export class IgePhaseEffect {
	settings: IgePhaseSettings = { ...IGE_PHASE_DEFAULTS };
	protected _time: number | null = null;
	/** Called when a setting changes (the owner asks for a redraw when rendering on demand). */
	onChange?: () => void;

	constructor (input?: IgePhaseInput) {
		if (input) this.set(input);
	}

	/** Changes settings (numbers by name; `edgeColor`, `tint` as colours; `time`). Returns this. */
	set (input: IgePhaseInput): this {
		const { edgeColor, tint, time, ...numbers } = input;
		const s = this.settings;
		for (const [name, value] of Object.entries(numbers)) {
			if (typeof value === "number" && name in s) (s as unknown as Record<string, number>)[name] = value;
		}
		if (edgeColor) { s.edgeR = edgeColor.r; s.edgeG = edgeColor.g; s.edgeB = edgeColor.b; }
		if (tint) { s.tintR = tint.r; s.tintG = tint.g; s.tintB = tint.b; }
		if (time !== undefined) this._time = time;
		this.onChange?.();
		return this;
	}

	/** Whether `name` is a numeric setting (the timeline asks). */
	has (name: string): boolean {
		return name in IGE_PHASE_DEFAULTS;
	}

	/** The time the effect holds (null: it follows the clock). With an argument, holds that time (null follows again). */
	time (): number | null;
	time (t: number | null): this;
	time (t?: number | null) {
		if (t === undefined) return this._time;
		this._time = t;
		this.onChange?.();
		return this;
	}

	/** The time it is drawn at now, seconds. */
	now (): number {
		return this._time ?? igeEffectNow();
	}

	/** How out of phase it is at `time` (default now): `amount` less a flicker's solidity, 0 to 1. */
	ghostliness (time: number = this.now()): number {
		const s = this.settings;
		const amount = Math.min(1, Math.max(0, s.amount));
		if (amount <= 0) return 0;
		return amount * (1 - igePhaseSolid(time, s.flicker, s.flickerSpeed, s.seed));
	}
}

const effects = new WeakMap<object, IgePhaseEffect>();
let live = 0;

/** Gives `owner` an effect (a new one, or the one it has, updated), or with null takes it away. */
export function igePhaseSet (owner: object, input: IgePhaseInput | null): IgePhaseEffect | null {
	let effect = effects.get(owner);
	if (input === null) {
		if (effect) { effects.delete(owner); live--; }
		return null;
	}
	if (!effect) {
		effect = new IgePhaseEffect();
		effects.set(owner, effect);
		live++;
	}
	return effect.set(input);
}

/** The effect set on `owner` itself, if any. */
export function igePhaseGet (owner: object): IgePhaseEffect | null {
	return effects.get(owner) ?? null;
}

/** How many effects are set (the renderer does no work for items while it's none). */
export function igePhaseCount (): number {
	return live;
}

/** The nearest effect on an object or the ones it's mounted under. */
export function igePhaseOf (object: IgeObject): IgePhaseEffect | null {
	if (live === 0) return null;
	for (let o: IgeObject | null = object; o; o = o._parent) {
		const e = effects.get(o);
		if (e) return e;
	}
	return null;
}

/** An item as the renderer holds it: the fields the phase effect writes (see IgeWebGlRenderItem). */
export interface IgePhaseItem {
	entity: IgeObject;
	transparent: boolean;
	depthPrepass?: boolean;
	castShadow: boolean;
	phase?: IgePhaseEffect | null;
	phaseK?: number;
	phaseTime?: number;
}

/** Past this ghostliness a thing casts no shadow. */
export const IGE_PHASE_SHADOW_CUTOFF = 0.5;

/**
 * The collect step's hook: finds an item's effect and, if it is out of phase at all, makes the item a transparent one
 * that fills its depth first (so only its near surface shows, as a glass thing does) and casts a shadow only while
 * it's more than half in phase. Clears the pooled item's fields otherwise. Cheap when no effect is set.
 */
export function igePhaseApply (item: IgePhaseItem): void {
	item.phase = null;
	if (live === 0) return;
	const effect = igePhaseOf(item.entity);
	if (!effect || effect.settings.amount <= 0) return;
	const time = effect.now();
	const k = effect.ghostliness(time);
	item.phase = effect;
	item.phaseK = k;
	item.phaseTime = time;
	item.transparent = true;
	item.depthPrepass = true;
	if (k >= IGE_PHASE_SHADOW_CUTOFF) item.castShadow = false;
}
