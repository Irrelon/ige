import { igeUiHeadlessHost } from "@/engine/ui2/IgeUiHost";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { cssAlpha } from "@/engine/ui2/style/IgeUiComputed";
import { styleValue } from "@/engine/ui2/style/IgeUiStyleEngine";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** A headless UI of w x h, its body unpadded, with the given stylesheet. */
function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

const rect = (r: IgeUiRoot, sel: string) => {
	const b = r.document.querySelector(sel)!.getBoundingClientRect();
	return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10);
};

describe("ui2: what the menus need (the journal, the controls overlay, the title)", () => {
	it("a nowrap button holds its width in a flex row: its narrowest is its widest, its key chip included", () => {
		// (10px fixed fonts: a letter is 5px wide)
		const r = ui(".row { display: flex; width: 200px; } .hint { flex: 1 1 auto; } .bs { display: flex; gap: 10px; } button { white-space: nowrap; padding: 0; border: 0; font: inherit; } .key { display: inline-block; width: 20px; height: 10px; }");
		r.document.body.innerHTML = `<div class="row"><span class="hint">${"word ".repeat(40)}</span><div class="bs"><button class="a">MARK ALL <span class="key"></span></button><button class="b">CLOSE <span class="key"></span></button></div></div>`;
		r.update();
		// "MARK ALL " 45 + 20, "CLOSE " 30 + 20, the gap 10
		expect(rect(r, ".a")[2]).toBe(65);
		expect(rect(r, ".b")[2]).toBe(50);
		expect(rect(r, ".bs")[2]).toBe(125);
	});

	it("a line's width counts an inline element's right padding and border: centred content isn't pushed past its box", () => {
		const r = ui("button { width: 100px; padding: 0; border: 0; font: inherit; text-align: center; } .n { margin-left: 6px; padding: 0 6px; border: 1px solid red; }");
		r.document.body.innerHTML = `<button>STORY<span class="n">1</span></button>`;
		r.update();
		// STORY 25, then 6 margin, 1 border, 6 padding, "1" 5, 6 padding, 1 border: 50 in all, centred in 100
		expect(rect(r, ".n")[0]).toBe(25 + 25 + 6);
		expect(rect(r, ".n")[2]).toBe(19);
	});

	it("an inline block's percentage padding takes its room once laid out (a ticker's padding-left: 100%)", () => {
		const r = ui(".t { width: 300px; white-space: nowrap; overflow: hidden; } .t span { display: inline-block; padding-left: 100%; }");
		r.document.body.innerHTML = `<div class="t"><span>TICKER</span></div>`;
		r.update();
		expect(rect(r, ".t span")[2]).toBe(300 + 30);
	});

	it("alpha is written as a browser writes it: kept in eight bits, two decimals where they hold it, else three", () => {
		expect(cssAlpha(0.015)).toBe(0.016);
		expect(cssAlpha(0.35)).toBe(0.35);
		expect(cssAlpha(0.06)).toBe(0.06);
		const r = ui(".g { width: 10px; height: 10px; background: linear-gradient(90deg, rgba(95, 227, 255, 0.06), rgba(95, 227, 255, 0.015)); }");
		r.document.body.innerHTML = `<div class="g"></div>`;
		r.update();
		const g = r.document.querySelector(".g")!;
		expect(r.document.defaultView!.getComputedStyle(g).backgroundImage).toBe("linear-gradient(90deg, rgba(95, 227, 255, 0.06), rgba(95, 227, 255, 0.016))");
	});

	it("an entrance from translateX(-8px) held at its end (fill both) is the identity, not none", () => {
		const r = ui("@keyframes cardIn { from { opacity: 0; transform: translateX(-8px); } } .c { width: 10px; height: 10px; animation: cardIn 0.3s ease-out both; }");
		r.document.body.innerHTML = `<div class="c"></div>`;
		r.update(0);
		r.update(1000);
		const c = r.document.querySelector(".c")!;
		expect(r.document.defaultView!.getComputedStyle(c).transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
	});

	it("a focused field shows its caret where its selection is, or its selection's highlight", () => {
		const r = ui("input { width: 200px; padding: 2px; border: 1px solid #000; font: inherit; caret-color: #0f0; }");
		r.document.body.innerHTML = `<input class="f" value="Rob">`;
		r.update();
		const f = r.document.querySelector(".f")!;
		r.focus(f);
		r.update();
		const caretX = () => r.items.filter((i) => i.op === "box" && i.el === f && (i as { w: number }).w === 1).map((i) => (i as { x: number }).x);
		// Focused by code, a field from the page's markup has its caret at the start (as a browser's), inside the border and padding
		expect(caretX()).toEqual([3]);
		f.setSelectionRange(3, 3);
		r.update();
		// After "Rob" (15px)
		expect(caretX()).toEqual([3 + 15]);
		f.setSelectionRange(0, 2);
		r.update();
		const sel = r.items.filter((i) => i.op === "box" && i.el === f && (i as { w: number }).w === 10);
		expect(sel.length).toBe(1);
	});

	it("the caret blinks as Chrome's does, shown again from the start as the text changes", () => {
		const r = ui("input { width: 200px; padding: 2px; border: 1px solid #000; font: inherit; caret-color: #0f0; }");
		r.document.body.innerHTML = `<input class="f" value="Rob">`;
		r.update(0);
		const f = r.document.querySelector(".f")!;
		r.focus(f);
		const caretAt = (t: number) => {
			r.update(t);
			return r.items.filter((i) => i.op === "box" && i.el === f && (i as { w: number }).w === 1).length;
		};
		// 500 ms shown, 500 ms hidden (its run of items painted again as it changes, not the whole list)
		const partial = r.stats.partialPaint;
		expect(caretAt(10)).toBe(1);
		expect(caretAt(400)).toBe(1);
		expect(caretAt(600)).toBe(0);
		expect(caretAt(1100)).toBe(1);
		expect(r.stats.partialPaint).toBe(partial + 2);
		expect(caretAt(1600)).toBe(0);
		// Typing: shown at once, the blink started again from then
		(f as unknown as { value: string }).value = "Robe";
		(r as unknown as { _paintDirty: boolean })._paintDirty = true;
		expect(caretAt(1650)).toBe(1);
		expect(caretAt(2100)).toBe(1);
		expect(caretAt(2200)).toBe(0);
		// Settled (a screenshot): shown
		r.settleAnimations(2300);
		expect(caretAt(2300)).toBe(1);
		// (period 0: never hidden)
		r.caretBlink.period = 0;
		(r as unknown as { _paintDirty: boolean })._paintDirty = true;
		expect(caretAt(3700)).toBe(1);
	});

	it("no caret while the window hasn't the focus, shown again from the start when it's back", () => {
		let focused = true;
		const host = igeUiHeadlessHost();
		host.display.focused = () => focused;
		const r = new IgeUiRoot({ host, width: 800, height: 600 });
		r.addStyleSheet("body { margin: 0; font-size: 10px; line-height: 1; } input { width: 200px; padding: 2px; border: 1px solid #000; font: inherit; }");
		r.document.body.innerHTML = `<input class="f" value="Rob">`;
		r.update(0);
		const f = r.document.querySelector(".f")!;
		r.focus(f);
		const caretAt = (t: number) => {
			r.update(t);
			return r.items.filter((i) => i.op === "box" && i.el === f && (i as { w: number }).w === 1).length;
		};
		expect(caretAt(10)).toBe(1);
		focused = false;
		expect(caretAt(100)).toBe(0);
		// (Still the UI's focused element: only :focus has gone)
		expect(r.document.activeElement).toBe(f);
		// Nothing blinks meanwhile
		expect(caretAt(700)).toBe(0);
		expect(caretAt(1200)).toBe(0);
		focused = true;
		expect(caretAt(1300)).toBe(1);
		expect(caretAt(1700)).toBe(1);
		expect(caretAt(1850)).toBe(0);
	});

	it("what an IME is composing is underlined in the text's colour, a pixel in at each end", () => {
		const r = ui("input { width: 200px; padding: 2px; border: 1px solid #000; font: inherit; color: #f00; }");
		r.document.body.innerHTML = `<input class="f" value="Rob">`;
		r.update(0);
		const f = r.document.querySelector(".f")!;
		r.focus(f);
		f._composition = { start: 1, end: 3 };
		(r as unknown as { _paintDirty: boolean })._paintDirty = true;
		r.update(10);
		const lines = r.items.filter((i) => i.op === "box" && i.el === f && (i as { h: number }).h === 1) as unknown as { x: number; y: number; w: number; color: { r: number; g: number; b: number } }[];
		expect(lines.length).toBe(1);
		// "ob" from 5px to 15px after the content's left (3), less a pixel each end; at the foot of the 10px line
		expect([lines[0].x, lines[0].w]).toEqual([3 + 5 + 1, 8]);
		expect(lines[0].color).toMatchObject({ r: 255, g: 0, b: 0 });
		f._composition = undefined;
		(r as unknown as { _paintDirty: boolean })._paintDirty = true;
		r.update(20);
		expect(r.items.filter((i) => i.op === "box" && i.el === f && (i as { h: number }).h === 1).length).toBe(0);
	});

	it("setting outerHTML replaces the element with what the markup makes (the news's article redrawn in place)", () => {
		const r = ui();
		r.document.body.innerHTML = `<div class="list"></div><div class="article">old</div><p>after</p>`;
		r.update();
		const old = r.document.querySelector(".article")!;
		old.outerHTML = `<div class="article new">one</div><div class="two">two</div>`;
		expect(r.document.body.innerHTML).toBe(`<div class="list"></div><div class="article new">one</div><div class="two">two</div><p>after</p>`);
		expect(old.parentNode).toBe(null);
		// (No parent: nothing)
		old.outerHTML = `<b>x</b>`;
		expect(r.document.querySelectorAll("b").length).toBe(0);
	});

	it("caret-color's initial value is auto, computed as the text's colour", () => {
		const r = ui("input { color: #f00; }");
		r.document.body.innerHTML = `<input class="f">`;
		r.update();
		const f = r.document.querySelector(".f")!;
		expect(styleValue(f._computed!, "caret-color")).toBe("auto");
		expect(r.document.defaultView!.getComputedStyle(f).caretColor).toBe("rgb(255, 0, 0)");
	});
});
