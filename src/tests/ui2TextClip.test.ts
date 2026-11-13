import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";
import type { IgeUiPaintBox, IgeUiPaintText } from "@/engine/ui2/render/IgeUiPaint";

describe("ui2: background-clip: text", () => {
	const paint = (css: string) => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 200 });
		r.addStyleSheet(`body { margin: 0; } .t { font: 40px sans-serif; line-height: 60px; ${css} }`);
		r.document.body.innerHTML = `<div class="t">GOLD</div>`;
		r.update(0);
		return r.items;
	};

	it("a gradient down the text: no box, the text in bands of its colours, top to bottom", () => {
		const items = paint("background: linear-gradient(180deg, #ffffff, #ff0000); -webkit-background-clip: text; background-clip: text; color: transparent;");
		expect(items.filter((i) => i.op === "box" && ((i as IgeUiPaintBox).gradient || (i as IgeUiPaintBox).color)).length).toBe(0);
		const texts = items.filter((i) => i.op === "text") as IgeUiPaintText[];
		expect(texts.length).toBe(20);
		expect(texts[0].color.g).toBeGreaterThan(240);
		expect(texts[texts.length - 1].color.g).toBeLessThan(15);
		expect(texts[texts.length - 1].color.r).toBe(255);
		// (Each band clipped to its slice, the ends left open)
		expect(texts[1].clip![1]).toBeCloseTo(3, 5);
		expect(texts[1].clip![3]).toBeCloseTo(6, 5);
		expect(texts[0].clip![1]).toBeLessThan(-1000);
	});

	it("a plain colour background colours the text", () => {
		const texts = paint("background: #00ff00; background-clip: text; color: transparent;").filter((i) => i.op === "text") as IgeUiPaintText[];
		expect(texts.map((t) => [t.color.r, t.color.g, t.color.b])).toEqual([[0, 255, 0]]);
	});
});
