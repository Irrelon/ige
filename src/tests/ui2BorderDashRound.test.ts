import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { parseGradient } from "@/engine/ui2/css/IgeCssValues";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";
import type { IgeUiPaintBox } from "@/engine/ui2/render/IgeUiPaint";

describe("ui2: a ring of dashes round a rounded box, and repeating conic gradients", () => {
	it("a circle's dashed border is dashes spaced round it, each turned along it", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 200, height: 200 });
		r.addStyleSheet("body { margin: 0; } .c { width: 60px; height: 60px; box-sizing: border-box; border-radius: 50%; border: 2px dashed red; }");
		r.document.body.innerHTML = `<div class="c"></div>`;
		r.update(0);
		const dashes = (r.items.filter((i) => i.op === "box") as IgeUiPaintBox[]).filter((i) => i.exact && i.color?.r === 255);
		// (The middle of the line: 58px across, so about 182px round; dashes 6px with 4px gaps)
		expect(dashes.length).toBe(18);
		for (const d of dashes) {
			const [, , , , px, py] = d.matrix!;
			expect(Math.hypot(px - 30, py - 30)).toBeCloseTo(29, 3);
			expect(d.h).toBe(2);
		}
	});

	it("repeating-conic-gradient is written out round the turn", () => {
		const g = parseGradient("repeating-conic-gradient(red 0 14deg, blue 14deg 45deg)")!;
		expect(g.repeating).toBe(false);
		expect(g.stops.length).toBe(4 * 8);
		expect(g.stops[4].at).toBeCloseTo(45 / 360, 6);
		expect(g.stops[5].at).toBeCloseTo(59 / 360, 6);
		expect(g.stops[g.stops.length - 1].at!).toBeGreaterThanOrEqual(1);
		expect(parseGradient("repeating-conic-gradient(red, blue)")!.repeating).toBe(false);
	});
});
