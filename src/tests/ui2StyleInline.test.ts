import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import type { IgeUiPaintBox } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string = ""): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 800, height: 600 });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

describe("ui2: an inline style changed by a script (a reel strip moved every frame)", () => {
	it("a moved transform restyles the element alone and paints its run again, what's under it drawn through it", () => {
		const r = ui(".s { width: 100px; } .c { height: 10px; background: red; }");
		r.document.body.innerHTML = `<div class="s">${'<div class="c"><span>x</span></div>'.repeat(50)}</div>`;
		const s = r.document.querySelector(".s") as IgeUiElement;
		s.style.transform = "translateY(10px)";
		r.update(0);
		const painted = r.stats.partialPaint;
		s.style.transform = "translateY(20px)";
		r.update(0);
		expect(r.stats.elements).toBe(1);
		expect(r.stats.partialPaint).toBe(painted + 1);
		const cell = r.items.find((i) => i.op === "box" && i.el === r.document.querySelector(".c")) as IgeUiPaintBox;
		expect(cell.matrix?.[5]).toBe(20);
		expect(r.document.querySelector(".c")!.getBoundingClientRect().top).toBe(20);
	});

	it("an inherited property changed inline restyles what's under it; a child taking a property with inherit follows", () => {
		const r = ui(".k { border: 1px solid; border-top-color: inherit; }");
		r.document.body.innerHTML = `<div class="p"><div class="c"><div class="k"></div></div></div>`;
		r.update(0);
		const p = r.document.querySelector(".p") as IgeUiElement;
		p.style.color = "rgb(0, 0, 255)";
		r.update(0);
		expect(r.document.querySelector(".c")!._computed!.color).toBe("rgb(0, 0, 255)");
		// (border-top-color isn't inherited: only the child that asks for it with inherit takes its parent's)
		const c = r.document.querySelector(".c") as IgeUiElement;
		c.style.borderTopColor = "rgb(0, 128, 0)";
		r.update(0);
		expect(r.stats.elements).toBe(2);
		expect(r.document.querySelector(".k")!._computed!["border-top-color"]).toBe("rgb(0, 128, 0)");
	});

	it("a positioned box moved by its margin (a marker bobbing) is laid out again and only its run painted again", () => {
		const r = ui(".m { position: absolute; left: 10px; top: 10px; width: 20px; height: 10px; background: red; } .o { position: absolute; left: 100px; top: 0; width: 10px; height: 10px; background: blue; } .b { animation: bob 1s linear infinite; } @keyframes bob { 50% { margin-top: 8px; } }");
		r.document.body.innerHTML = `<div class="m"></div><div class="o"></div><div class="m b" style="left: 50px"></div>`;
		r.update(0);
		const m = r.document.querySelector(".m") as IgeUiElement, o = r.document.querySelector(".o") as IgeUiElement;
		const painted = r.stats.partialPaint;
		m.style.marginTop = "5px";
		r.update(0);
		expect(r.stats.partialPaint).toBe(painted + 1);
		const boxes = (el: IgeUiElement) => r.items.filter((i) => i.op === "box" && i.el === el) as IgeUiPaintBox[];
		expect(boxes(m).map((i) => i.y)).toEqual([15]);
		// (The other drawn as it was, still over it)
		expect(boxes(o).length).toBe(1);
		expect(r.items.indexOf(boxes(o)[0])).toBeGreaterThan(r.items.indexOf(boxes(m)[0]));
		// An animated margin: the same
		const b = r.document.querySelector(".b") as IgeUiElement;
		r.update(500);
		expect(r.stats.partialPaint).toBe(painted + 2);
		expect(boxes(b)[0].y).toBeCloseTo(18, 3);
	});

	it("a positioned box moved out from under a pointer that hasn't moved: no longer hovered (its run alone painted again)", () => {
		// (A colour animating beside it: its run painted again in the same frame)
		const r = ui(".m { position: absolute; left: 0; top: 0; width: 40px; height: 20px; } .m:hover { background: red; } .g { position: absolute; left: 100px; animation: glow 1s linear infinite; } @keyframes glow { 50% { color: red; } }");
		r.document.body.innerHTML = `<div class="m"></div><div class="g">g</div>`;
		r.update(0);
		const m = r.document.querySelector(".m") as IgeUiElement;
		const pt = { clientX: 10, clientY: 10, button: 0, buttons: 0, pointerType: "mouse", pointerId: 1, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} };
		r._pointer("pointermove", pt as never);
		r.update(0);
		expect(m.matches(":hover")).toBe(true);
		const painted = r.stats.partialPaint;
		m.style.marginTop = "50px";
		r.update(100);
		expect(r.stats.partialPaint).toBeGreaterThan(painted);
		expect(m.matches(":hover")).toBe(false);
	});

	it("an inline change to a layout property lays out again; a transform come or gone too", () => {
		const r = ui(".a { height: 10px; } .b { height: 10px; }");
		r.document.body.innerHTML = `<div class="a"></div><div class="b"></div>`;
		r.update(0);
		const a = r.document.querySelector(".a") as IgeUiElement;
		a.style.height = "30px";
		r.update(0);
		expect(r.document.querySelector(".b")!.getBoundingClientRect().top).toBe(30);
		a.style.transform = "translateX(5px)";
		r.update(0);
		expect(a.getBoundingClientRect().left).toBe(5);
		a.style.transform = "";
		r.update(0);
		expect(a.getBoundingClientRect().left).toBe(0);
	});
});
