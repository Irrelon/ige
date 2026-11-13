/**
 * CSS transitions and @keyframes animations for the engine's UI: a
 * property's change eases from the old value to the new (transition), and
 * animations run their keyframes (duration, timing function, delay, iteration
 * count, direction, fill mode). Colours, lengths, numbers, transforms and
 * shadows interpolate; anything else steps. Values are worked out on the UI's
 * own clock each frame for the elements that are moving.
 */
import { splitTop, type IgeCssKeyframes } from "@/engine/ui2/css/IgeCssParser";
import { parseColor, resolveTime } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { expandShorthand } from "@/engine/ui2/style/IgeUiProperties";
import { type IgeUiComputedStyle, styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

type Ease = (t: number) => number;

function bezier (x1: number, y1: number, x2: number, y2: number): Ease {
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sy = (t: number) => ((ay * t + by) * t + cy) * t;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) {
			const d = sx(t) - x;
			if (Math.abs(d) < 1e-5) break;
			const ds = (3 * ax * t + 2 * bx) * t + cx;
			if (Math.abs(ds) < 1e-6) break;
			t -= d / ds;
		}
		return sy(Math.max(0, Math.min(1, t)));
	};
}

export function easing (v: string): Ease {
	const t = v.trim();
	switch (t) {
		case "linear": return (x) => x;
		case "ease": return bezier(0.25, 0.1, 0.25, 1);
		case "ease-in": return bezier(0.42, 0, 1, 1);
		case "ease-out": return bezier(0, 0, 0.58, 1);
		case "ease-in-out": return bezier(0.42, 0, 0.58, 1);
		case "step-start": return (x) => (x > 0 ? 1 : 0);
		case "step-end": return (x) => (x >= 1 ? 1 : 0);
	}
	const cb = /^cubic-bezier\(([^)]*)\)$/.exec(t);
	if (cb) {
		const [a, b, c, d] = cb[1].split(",").map(Number);
		return bezier(a, b, c, d);
	}
	const st = /^steps\(\s*(\d+)\s*(?:,\s*([\w-]+))?\s*\)$/.exec(t);
	if (st) {
		const n = Number(st[1]);
		const start = st[2] === "start" || st[2] === "jump-start";
		return (x) => Math.min(1, Math.max(0, (start ? Math.ceil(x * n) : Math.floor(x * n)) / n));
	}
	return bezier(0.25, 0.1, 0.25, 1);
}

// ---------------------------------------------------------------- interpolation

function lerpNumbersIn (a: string, b: string, t: number): string | undefined {
	// Same text but the numbers: interpolate each number (lengths, transforms, shadows of the same shape)
	const re = /-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi;
	const na = a.match(re), nb = b.match(re);
	if (!na || !nb || na.length !== nb.length) return undefined;
	if (a.replace(re, "#") !== b.replace(re, "#")) return undefined;
	let i = 0;
	return a.replace(re, () => {
		const x = parseFloat(na[i]), y = parseFloat(nb[i]);
		i++;
		return String(Math.round((x + (y - x) * t) * 1000) / 1000);
	});
}

function colorText (c: { r: number; g: number; b: number; a: number }): string {
	return `rgba(${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)}, ${c.a.toFixed(4)})`;
}

/** Normalises colours inside a value to rgba() so values of the same shape line up. */
function withRgba (v: string): string {
	return v.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(transparent|white|black)\b/gi, (m) => {
		const c = parseColor(m);
		return c ? colorText(c) : m;
	});
}

/** A value part way from a to b (t 0 to 1); a step when they can't interpolate. */
/** A transform list's functions at their identity: scale() 1, matrix() the identity, everything else 0. */
export function identityTransform (tf: string): string {
	return tf.replace(/([a-zA-Z0-9]+)\(([^()]*)\)/g, (_m, fn: string, args: string) => {
		const parts = args.split(/\s*,\s*|\s+/).filter((p) => p);
		if (/^scale/i.test(fn)) return `${fn}(${parts.map(() => "1").join(", ")})`;
		if (fn === "matrix") return "matrix(1, 0, 0, 1, 0, 0)";
		return `${fn}(${parts.map((p) => p.replace(/-?[\d.]+(?:e-?\d+)?/i, "0")).join(", ")})`;
	});
}

export function interpolate (prop: string, a: string, b: string, t: number): string {
	if (a === b) return a;
	if (t <= 0) return a;
	if (t >= 1) return b;
	const ca = parseColor(a), cb = parseColor(b);
	if (ca && cb) return colorText({ r: ca.r + (cb.r - ca.r) * t, g: ca.g + (cb.g - ca.g) * t, b: ca.b + (cb.b - ca.b) * t, a: ca.a + (cb.a - ca.a) * t });
	if (prop === "transform") {
		// From or to none: from or to the other's functions at their identity (scale 1, the rest 0)
		const fa = a === "none" ? identityTransform(b) : a;
		const fb = b === "none" ? identityTransform(a) : b;
		const n = lerpNumbersIn(fa, fb, t);
		if (n !== undefined) return n;
		return t < 0.5 ? a : b;
	}
	const ra = withRgba(a), rb = withRgba(b);
	const n = lerpNumbersIn(ra, rb, t);
	if (n !== undefined) return n;
	// A shadow from none: from the same shadow transparent
	if (prop.endsWith("shadow") && (a === "none" || b === "none")) {
		const other = withRgba(a === "none" ? b : a);
		const zero = other.replace(/rgba\(([^)]*)\)/g, (m, inner: string) => `rgba(${inner.split(",").slice(0, 3).join(",")}, 0)`);
		const nn = a === "none" ? lerpNumbersIn(zero, other, t) : lerpNumbersIn(other, zero, t);
		if (nn !== undefined) return nn;
	}
	return t < 0.5 ? a : b;
}

// ---------------------------------------------------------------- running state

interface Transition {
	from: string;
	to: string;
	start: number;
	duration: number;
	delay: number;
	ease: Ease;
}

interface RunningAnimation {
	key: string;
	name: string;
	start: number;
	duration: number;
	delay: number;
	ease: Ease;
	iterations: number;
	direction: string;
	fill: string;
	/** Held at this point (ms into it), as a paused animation is. */
	pausedAt?: number;
	/** Run its course (it stays, so a restyle doesn't start it again while the element still names it). */
	done?: boolean;
}

/** Whether an animation still changes how its element looks: running, or holding its last frame (fill forwards). */
function applies (a: RunningAnimation): boolean {
	return !a.done || a.fill === "forwards" || a.fill === "both";
}

/** Properties whose change moves layout (the rest only repaint). */
export const LAYOUT_PROPS = new Set(["width", "height", "left", "top", "right", "bottom", "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left", "letter-spacing", "font-size", "min-width", "max-width", "min-height", "max-height", "flex-basis", "gap", "row-gap", "column-gap"]);

export class IgeUiAnimator {
	keyframes = new Map<string, IgeCssKeyframes>();
	/** Elements with transitions or animations running. */
	active = new Set<IgeUiElement>();
	_transitions = new WeakMap<IgeUiElement, Map<string, Transition>>();
	_animations = new WeakMap<IgeUiElement, RunningAnimation[]>();
	/** The base (cascaded) style of each moving element. */
	_base = new WeakMap<IgeUiElement, IgeUiComputedStyle>();
	/** Animations off (prefers-reduced-motion). */
	reduced = false;

	/** A new base style for an element: starts transitions from what it showed, and animations it now names. Returns its style as shown now. */
	restyled (el: IgeUiElement, prev: IgeUiComputedStyle | undefined, next: IgeUiComputedStyle, now: number): IgeUiComputedStyle {
		this._base.set(el, next);
		if (!this.reduced && prev) this._startTransitions(el, prev, next, now);
		this._syncAnimations(el, next, now);
		const live = this._transitions.get(el)?.size || this._animations.get(el)?.some(applies);
		if (live) {
			this.active.add(el);
			return this.current(el, now) ?? next;
		}
		this.active.delete(el);
		return next;
	}

	_startTransitions (el: IgeUiElement, prev: IgeUiComputedStyle, next: IgeUiComputedStyle, now: number): void {
		const tv = styleValue(next, "transition");
		if (tv === "none" || tv === "all 0s ease 0s") {
			this._transitions.delete(el);
			return;
		}
		const specs = splitTop(tv, ",").map((p) => p.trim()).filter(Boolean).map((p) => {
			const toks = splitTop(p, " ").map((x) => x.trim()).filter(Boolean);
			let prop = "all", duration = 0, delay = 0, seenTime = 0, ease = "ease";
			for (const tok of toks) {
				const time = resolveTime(tok);
				if (time !== undefined) {
					if (seenTime++ === 0) duration = time;
					else delay = time;
				} else if (/^(ease|linear|step|cubic-bezier|steps)/.test(tok)) ease = tok;
				else prop = tok;
			}
			return { prop, duration, delay, ease };
		});
		let map = this._transitions.get(el);
		for (const spec of specs) {
			if (spec.duration <= 0) continue;
			const props = spec.prop === "all" ? Object.keys({ ...prev, ...next }).filter((k) => !k.startsWith("--")) : expandShorthand(spec.prop, "0")?.map(([k]) => k) ?? [spec.prop];
			for (const prop of props) {
				const before = this._shown(el, prev, prop, now);
				const after = styleValue(next, prop);
				if (before === after) continue;
				map ??= new Map();
				map.set(prop, { from: before, to: after, start: now, duration: spec.duration, delay: spec.delay, ease: easing(spec.ease) });
			}
		}
		if (map) this._transitions.set(el, map);
	}

	/** What a property shows now (mid-transition, it's where it's got to). */
	_shown (el: IgeUiElement, prev: IgeUiComputedStyle, prop: string, now: number): string {
		const tr = this._transitions.get(el)?.get(prop);
		if (tr) return this._at(prop, tr, now);
		return styleValue(prev, prop);
	}

	_at (prop: string, tr: Transition, now: number): string {
		const t = (now - tr.start - tr.delay) / tr.duration;
		if (t <= 0) return tr.from;
		if (t >= 1) return tr.to;
		return interpolate(prop, tr.from, tr.to, tr.ease(t));
	}

	_syncAnimations (el: IgeUiElement, next: IgeUiComputedStyle, now: number): void {
		const av = styleValue(next, "animation");
		const list = this._animations.get(el) ?? [];
		if (av === "none" || this.reduced) {
			this._animations.delete(el);
			return;
		}
		const parts = splitTop(av, ",").map((p) => p.trim()).filter(Boolean);
		const out: RunningAnimation[] = [];
		const delayOverride = next["animation-delay"], durationOverride = next["animation-duration"];
		for (const part of parts) {
			const toks = splitTop(part, " ").map((x) => x.trim()).filter(Boolean);
			let name = "", duration = 0, delay = 0, times = 0, ease = "ease", iterations = 1, direction = "normal", fill = "none";
			for (const tok of toks) {
				const time = resolveTime(tok);
				if (time !== undefined) {
					if (times++ === 0) duration = time;
					else delay = time;
				} else if (/^(ease|linear|step|cubic-bezier|steps)/.test(tok)) ease = tok;
				else if (tok === "infinite") iterations = Infinity;
				else if (/^\d+(\.\d+)?$/.test(tok)) iterations = Number(tok);
				else if (/^(normal|reverse|alternate|alternate-reverse)$/.test(tok)) direction = tok;
				else if (/^(none|forwards|backwards|both)$/.test(tok)) fill = tok;
				else if (/^(running|paused)$/.test(tok)) continue;
				else name = tok;
			}
			if (durationOverride) duration = resolveTime(durationOverride) ?? duration;
			if (delayOverride) delay = resolveTime(delayOverride) ?? delay;
			if (!name || !this.keyframes.has(name) || duration <= 0) continue;
			const key = `${name}|${duration}|${iterations}|${direction}`;
			// The same animation keeps its start; a new one starts now
			const same = list.find((a) => a.key === key);
			out.push(same ?? { key, name, start: now, duration, delay, ease: easing(ease), iterations, direction, fill });
		}
		if (out.length) this._animations.set(el, out);
		else this._animations.delete(el);
	}

	/**
	 * Everything still (tests, fixtures, screenshots): transitions finished, animations that end at their end,
	 * endless ones held at their start.
	 */
	settle (now: number): void {
		for (const el of this.active) {
			this._transitions.delete(el);
			for (const a of this._animations.get(el) ?? []) {
				if (Number.isFinite(a.iterations)) {
					a.start = now - a.delay - a.duration * a.iterations - 1;
					a.pausedAt = undefined;
				} else if (!a.done) a.pausedAt = 0;
			}
		}
	}

	/** An element's style as it shows at `now` (undefined when nothing's moving on it). */
	current (el: IgeUiElement, now: number): IgeUiComputedStyle | undefined {
		const base = this._base.get(el);
		if (!base) return undefined;
		const out: IgeUiComputedStyle = { ...base };
		const trs = this._transitions.get(el);
		if (trs) {
			for (const [prop, tr] of trs) {
				out[prop] = this._at(prop, tr, now);
				if (now - tr.start - tr.delay >= tr.duration) trs.delete(prop);
			}
			if (!trs.size) this._transitions.delete(el);
		}
		const anims = this._animations.get(el);
		if (anims) {
			for (let i = anims.length - 1; i >= 0; i--) {
				const a = anims[i];
				const kf = this.keyframes.get(a.name);
				if (!kf) continue;
				const elapsed = a.pausedAt !== undefined ? a.pausedAt - a.delay : now - a.start - a.delay;
				if (elapsed < 0 && a.fill !== "backwards" && a.fill !== "both") continue;
				let iter = Math.max(0, elapsed) / a.duration;
				const done = iter >= a.iterations;
				if (done) {
					a.done = true;
					if (a.fill !== "forwards" && a.fill !== "both") continue;
					iter = a.iterations;
				}
				let cycle = Math.floor(iter), p = iter - cycle;
				if (done && p === 0 && cycle > 0) {
					cycle -= 1;
					p = 1;
				}
				const reverse = a.direction === "reverse" || (a.direction === "alternate" && cycle % 2 === 1) || (a.direction === "alternate-reverse" && cycle % 2 === 0);
				if (reverse) p = 1 - p;
				this._applyFrames(out, base, kf, p, a.ease);
			}
		}
		if (!this._transitions.get(el) && !this._animations.get(el)?.some(applies)) this.active.delete(el);
		return out;
	}

	_applyFrames (out: IgeUiComputedStyle, base: IgeUiComputedStyle, kf: IgeCssKeyframes, p: number, ease: Ease): void {
		// Each property: the keyframes either side of p that set it (the element's own value at 0% / 100% if they don't)
		const props = new Set<string>();
		const expanded = kf.frames.map((f) => {
			const m = new Map<string, string>();
			for (const d of f.declarations) {
				const longs = expandShorthand(d.name, d.value);
				for (const [k, v] of longs ?? [[d.name, d.value]]) {
					m.set(k, v.includes("var(") ? v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, n: string, fb?: string) => base[n] ?? fb ?? "") : v);
					props.add(k);
				}
			}
			return { offset: f.offset, values: m, ease: f.declarations.find((d) => d.name === "animation-timing-function")?.value };
		});
		for (const prop of props) {
			const frames = expanded.filter((f) => f.values.has(prop));
			let prev = { offset: 0, value: styleValue(base, prop), ease: undefined as string | undefined };
			let next = { offset: 1, value: styleValue(base, prop) };
			for (const f of frames) {
				if (f.offset <= p) prev = { offset: f.offset, value: f.values.get(prop)!, ease: f.ease };
			}
			for (const f of [...frames].reverse()) {
				if (f.offset >= p) next = { offset: f.offset, value: f.values.get(prop)! };
			}
			const span = next.offset - prev.offset;
			const local = span > 0 ? (p - prev.offset) / span : 1;
			let v = interpolate(prop, prev.value, next.value, (prev.ease ? easing(prev.ease) : ease)(local));
			// (A transform animated to or from none lands on the other end's functions at their identity, as a
			// browser's does: an entrance from translateX(-8px), held at its end, is translateX(0px), not none)
			if (prop === "transform" && v === "none" && (prev.value !== "none" || next.value !== "none")) v = identityTransform(prev.value !== "none" ? prev.value : next.value);
			out[prop] = v;
		}
	}
}
