/**
 * SVG's own animation (SMIL `<animate>`) for the engine's UI: a shape's
 * numeric attribute (r, opacity, cx, width, stroke-width…) moved through its
 * `values` (or from/to) over `dur`, linearly between the `keyTimes`,
 * repeating or held at its end (`fill="freeze"`), timed from when its
 * `<svg>` was first drawn, as a browser times an SVG's animations from when
 * it went into the page. A shape is read through `animated()`; the UI draws
 * again every frame while any is moving (`svgAnimating()`).
 */
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";

/** The UI's clock (ms), set before each paint and layout (IgeUiRoot). */
export const svgClock = { now: 0 };

const begun = new WeakMap<IgeUiElement, number>();
let moving = false;

/** Whether anything was animated since the last ask (the UI paints again next frame if so). */
export function svgAnimating (): boolean {
	const was = moving;
	moving = false;
	return was;
}

function seconds (v: string | null): number {
	if (!v) return 0;
	const t = v.trim();
	if (t.endsWith("ms")) return parseFloat(t) / 1000;
	if (t.endsWith("min")) return parseFloat(t) * 60;
	if (t.endsWith("h")) return parseFloat(t) * 3600;
	return parseFloat(t) || 0;
}

/** One `<animate>`'s value now (or undefined: not running, not numeric). */
function valueOf (a: IgeUiElement, t: number): number | undefined {
	const dur = seconds(a.getAttribute("dur"));
	if (!(dur > 0)) return undefined;
	const values = (a.getAttribute("values") ?? "").split(";").map((v) => v.trim()).filter(Boolean).map(Number);
	const list = values.length ? values : [Number(a.getAttribute("from")), Number(a.getAttribute("to"))];
	if (list.length < 2 || list.some((v) => !Number.isFinite(v))) return undefined;
	const begin = seconds(a.getAttribute("begin"));
	if (t < begin) return undefined;
	const repeat = a.getAttribute("repeatCount");
	const times = repeat === "indefinite" ? Infinity : repeat ? Number(repeat) || 1 : 1;
	let local = t - begin;
	if (local >= dur * times) {
		// Ended: held at its end, or back to the attribute's own value
		if (a.getAttribute("fill") !== "freeze") return undefined;
		local = dur;
	} else local %= dur;
	const p = local / dur;
	const keys = (a.getAttribute("keyTimes") ?? "").split(";").map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
	const at = keys.length === list.length ? keys : list.map((_, i) => i / (list.length - 1));
	let i = 0;
	while (i < at.length - 2 && at[i + 1] <= p) i++;
	const f = Math.max(0, Math.min(1, (p - at[i]) / Math.max(1e-9, at[i + 1] - at[i])));
	return list[i] + (list[i + 1] - list[i]) * f;
}

/** The element behind a shape read through animated() (or the element itself). */
export function unanimated (el: IgeUiElement): IgeUiElement {
	return (el as unknown as { _smilTarget?: IgeUiElement })._smilTarget ?? el;
}

/** A shape as it is now: its `<animate>`d attributes at their values (itself when nothing animates it). */
export function animated (el: IgeUiElement, svg: IgeUiElement): IgeUiElement {
	let anims: IgeUiElement[] | undefined;
	for (const c of el.children) if (c.localName === "animate") (anims ??= []).push(c);
	if (!anims) return el;
	if (!begun.has(svg)) begun.set(svg, svgClock.now);
	const t = (svgClock.now - begun.get(svg)!) / 1000;
	const over = new Map<string, string>();
	for (const a of anims) {
		const name = a.getAttribute("attributeName");
		const v = name ? valueOf(a, t) : undefined;
		if (name && v !== undefined) over.set(name, String(v));
	}
	moving = true;
	if (!over.size) return el;
	return new Proxy(el, {
		get (target, key) {
			if (key === "getAttribute") return (n: string) => over.get(n) ?? target.getAttribute(n);
			if (key === "hasAttribute") return (n: string) => over.has(n) || target.hasAttribute(n);
			// (The element itself, for what's drawn to say whose it is)
			if (key === "_smilTarget") return target;
			const v = Reflect.get(target, key, target);
			return typeof v === "function" ? v.bind(target) : v;
		}
	});
}
