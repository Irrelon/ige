/**
 * The game's own scrollbars (IgeUiRoot.gameScrollbars) taking the mouse as a browser's do: the thumb brighter under
 * the pointer and while it's dragged, a drag of the thumb scrolling its box by as much as the thumb moves over its
 * track, a press on the track paging towards it.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiPaintBox } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

const THUMB = { r: 95, g: 227, b: 255, a: 0.35 }, HOVER = { r: 95, g: 227, b: 255, a: 0.7 };

/** A 200 x `h` scroller of 400px of content, the game's 6px bars on it. */
function scroller (h = 100): { r: IgeUiRoot; s: IgeUiElement } {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; } .s { width: 200px; height: ${h}px; overflow-y: auto; } .s > div { height: 400px; }`);
	r.root.innerHTML = `<div class="s"><div></div></div>`;
	r.gameScrollbars({ width: 6, thumb: "rgba(95, 227, 255, 0.35)", thumbHover: "rgba(95, 227, 255, 0.7)", track: "rgba(95, 227, 255, 0.05)" });
	r.update(0);
	return { r, s: r.root.querySelector(".s") as IgeUiElement };
}

/** The scroller's thumb as drawn. */
const thumbOf = (r: IgeUiRoot, s: IgeUiElement) => (r.items.filter((i) => i.op === "box" && i.el === s) as IgeUiPaintBox[]).find((i) => i.color?.a === THUMB.a || i.color?.a === HOVER.a)!;

const at = (x: number, y: number, buttons = 0) => ({ clientX: x, clientY: y, button: 0, buttons, pointerType: "mouse", pointerId: 1, isPrimary: true, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} }) as never;

describe("ui2: the game's scrollbars take the mouse", () => {
	it("the thumb is brighter under the pointer, as it was off it", () => {
		const { r, s } = scroller();
		// (A quarter of the track: 100 of 400; from 1px in)
		const t = thumbOf(r, s);
		expect(t.color).toEqual(THUMB);
		expect([t.x, t.w, t.y, t.h]).toEqual([195, 4, 1, 24.5]);
		r._pointer("pointermove", at(197, 10));
		r.update(16);
		expect(thumbOf(r, s).color).toEqual(HOVER);
		// (Over its content, it's as it was)
		r._pointer("pointermove", at(100, 10));
		r.update(32);
		expect(thumbOf(r, s).color).toEqual(THUMB);
	});

	it("a drag of the thumb scrolls as far as the thumb goes along its track, brighter all the while, wherever the pointer goes", () => {
		const { r, s } = scroller();
		r._pointer("pointerdown", at(197, 10, 1));
		// (The thumb's 24.5 of a 98px track: each px it moves is 300 / 73.5 of the content; kept on the device's pixels)
		r._pointer("pointermove", at(150, 30, 1));
		r.update(16);
		expect(s.scrollTop).toBe(Math.round((20 * 300) / 73.5));
		expect(thumbOf(r, s).color).toEqual(HOVER);
		// (Past the end: as far as it goes)
		r._pointer("pointermove", at(150, 290, 1));
		expect(s.scrollTop).toBe(300);
		r._pointer("pointerup", at(150, 290));
		r.update(32);
		expect(thumbOf(r, s).color).toEqual(THUMB);
		// (The press was the bar's: no click for the box)
		let clicked = 0;
		s.addEventListener("click", () => clicked++);
		r._pointer("pointerdown", at(197, 90, 1));
		r._pointer("pointerup", at(197, 90));
		expect(clicked).toBe(0);
	});

	it("a press on the track pages towards it", () => {
		// (80px shown: a page is seven eighths of it, 70)
		const { r, s } = scroller(80);
		r._pointer("pointerdown", at(197, 70, 1));
		r._pointer("pointerup", at(197, 70));
		expect(s.scrollTop).toBe(70);
		r.update(16);
		// (Above the thumb now: back up)
		r._pointer("pointerdown", at(197, 3, 1));
		r._pointer("pointerup", at(197, 3));
		expect(s.scrollTop).toBe(0);
	});
});
