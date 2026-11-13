/**
 * url() background layers on the engine's UI, placed as CSS places them:
 *
 * - background-size: auto (the picture's own size), cover, contain, or a
 *   width and height (lengths, percentages of the positioning area, auto
 *   keeping the picture's shape);
 * - background-position: keywords, percentages (of the room left over) and
 *   lengths, two values or four (edge and offset: right 10px bottom 4px);
 * - background-repeat: repeat, repeat-x, repeat-y, no-repeat, or one for
 *   each way (space and round are drawn as repeat);
 * - positioned in the padding box (background-origin), painted over the
 *   border box (background-clip), cut to the box's corners.
 *
 * Each layer is one image item: its quad over the part of the painting area
 * the tiles cover, its texture coordinates running past 0 to 1 where they
 * repeat (the renderer's texture for it wraps). A picture is asked for as
 * it's first painted (the UI's images) and drawn once it's arrived.
 */
import { splitTop } from "@/engine/ui2/css/IgeCssParser";
import { type IgeCssLengthContext, resolveLength } from "@/engine/ui2/css/IgeCssValues";
import type { IgeUiBox } from "@/engine/ui2/layout/IgeUiBox";
import type { IgeUiPaintImage, IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";

/** A layer's url, unquoted (undefined: not a url() layer). */
export function backgroundUrl (layer: string): string | undefined {
	const m = /^url\(\s*(["']?)([\s\S]*?)\1\s*\)$/i.exec(layer.trim());
	return m ? m[2] : undefined;
}

/** The value of a background-* list for layer `i` (the list repeated when it's shorter, as CSS has it). */
function listAt (value: string, i: number): string {
	const parts = splitTop(value, ",").map((p) => p.trim()).filter(Boolean);
	return parts.length ? parts[i % parts.length] : "";
}

/** A tile's size from background-size, in an area aw x ah, for a picture iw x ih. */
function tileSize (v: string, aw: number, ah: number, iw: number, ih: number, ctx: IgeCssLengthContext): [number, number] {
	const t = splitTop(v.trim() || "auto", " ").filter(Boolean);
	if (t[0] === "cover" || t[0] === "contain") {
		const k = t[0] === "cover" ? Math.max(aw / iw, ah / ih) : Math.min(aw / iw, ah / ih);
		return [iw * k, ih * k];
	}
	const len = (s: string | undefined, of: number) => (!s || s === "auto" ? undefined : s.endsWith("%") ? (parseFloat(s) / 100) * of : resolveLength(s, { ...ctx, percent: of }));
	const w = len(t[0], aw), h = len(t[1], ah);
	if (w !== undefined && h !== undefined) return [w, h];
	if (w !== undefined) return [w, (w * ih) / iw];
	if (h !== undefined) return [(h * iw) / ih, h];
	return [iw, ih];
}

/** A tile's offset in its area from background-position (room: what's left over each way). */
function tilePosition (v: string, roomX: number, roomY: number, ctx: IgeCssLengthContext): [number, number] {
	const KW: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
	let t = splitTop(v.trim() || "0% 0%", " ").filter(Boolean);
	const len = (s: string, room: number) => (s.endsWith("%") ? (parseFloat(s) / 100) * room : resolveLength(s, { ...ctx, percent: room }) ?? 0);
	if (t.length >= 3) {
		// Edges and offsets: "right 10px bottom 4px" (an edge alone counts from it)
		let x = 0, y = 0;
		for (let i = 0; i < t.length; i++) {
			const k = t[i], next = t[i + 1];
			const off = next && !(next in KW) ? len(next, k === "left" || k === "right" ? roomX : roomY) : 0;
			if (next && !(next in KW)) i++;
			if (k === "left") x = off;
			else if (k === "right") x = roomX - off;
			else if (k === "top") y = off;
			else if (k === "bottom") y = roomY - off;
			else if (k === "center") {
				if (x === 0) x = roomX / 2;
				else y = roomY / 2;
			}
		}
		return [x, y];
	}
	if (t.length === 1) t = t[0] === "top" || t[0] === "bottom" ? ["center", t[0]] : [t[0], "center"];
	// (Keywords the other way round: "top left")
	if (t[0] === "top" || t[0] === "bottom" || t[1] === "left" || t[1] === "right") t = [t[1], t[0]];
	const one = (s: string, room: number) => (s in KW ? KW[s] * room : len(s, room));
	return [one(t[0], roomX), one(t[1], roomY)];
}

/** Whether a layer repeats across and down. */
function repeats (v: string): [boolean, boolean] {
	const t = splitTop(v.trim() || "repeat", " ").filter(Boolean);
	if (t[0] === "repeat-x") return [true, false];
	if (t[0] === "repeat-y") return [false, true];
	const r = (s: string | undefined) => s !== "no-repeat";
	return t.length > 1 ? [r(t[0]), r(t[1])] : [r(t[0]), r(t[0])];
}

/**
 * A url() background layer as an image item (pushed onto `items`): layer `index` of the box at (x, y) (its border
 * box, UI px), its picture `src` (iw x ih, if it's arrived), with `base`'s corners, opacity, clip and transform.
 */
export function paintBackgroundImage (items: IgeUiPaintItem[], b: IgeUiBox, x: number, y: number, src: string, index: number, size: { w: number; h: number } | undefined, base: Pick<IgeUiPaintImage, "radii" | "radiiY" | "chamfer" | "opacity" | "clip" | "matrix" | "el" | "additive">, ctx: IgeCssLengthContext): void {
	if (!size || size.w <= 0 || size.h <= 0 || !b.el) return;
	const s = b.style;
	const w = b.borderW, h = b.borderH;
	// Positioned in the padding box (or the border or content box), painted over the border box (or less)
	const box = (which: string): [number, number, number, number] => {
		if (which === "border-box") return [x, y, w, h];
		const inX = b.borderLeft + (which === "content-box" ? b.paddingLeft : 0), inY = b.borderTop + (which === "content-box" ? b.paddingTop : 0);
		const inR = b.borderRight + (which === "content-box" ? b.paddingRight : 0), inB = b.borderBottom + (which === "content-box" ? b.paddingBottom : 0);
		return [x + inX, y + inY, w - inX - inR, h - inY - inB];
	};
	const [ax, ay, aw, ah] = box(listAt(styleValue(s, "background-origin"), index) || "padding-box");
	const paint = box(listAt(styleValue(s, "background-clip"), index) || "border-box");
	if (aw <= 0 || ah <= 0) return;
	const [tw, th] = tileSize(listAt(styleValue(s, "background-size"), index), aw, ah, size.w, size.h, ctx);
	if (!(tw > 0) || !(th > 0)) return;
	const [px, py] = tilePosition(listAt(styleValue(s, "background-position"), index), aw - tw, ah - th, ctx);
	const [rx, ry] = repeats(listAt(styleValue(s, "background-repeat"), index));
	const tx = ax + px, ty = ay + py;
	// The quad: the painting area where the tiles reach it (all of it, the way they repeat)
	const qx0 = rx ? paint[0] : Math.max(paint[0], tx), qx1 = rx ? paint[0] + paint[2] : Math.min(paint[0] + paint[2], tx + tw);
	const qy0 = ry ? paint[1] : Math.max(paint[1], ty), qy1 = ry ? paint[1] + paint[3] : Math.min(paint[1] + paint[3], ty + th);
	if (qx1 <= qx0 || qy1 <= qy0) return;
	items.push({
		op: "image", x: qx0, y: qy0, w: qx1 - qx0, h: qy1 - qy0, source: b.el, src,
		uv: [(qx0 - tx) / tw, (qy0 - ty) / th, (qx1 - tx) / tw, (qy1 - ty) / th], repeat: [rx, ry], area: [x, y, w, h],
		radii: base.radii, radiiY: base.radiiY, chamfer: base.chamfer, opacity: base.opacity, clip: base.clip, matrix: base.matrix, el: base.el, additive: base.additive
	});
}
