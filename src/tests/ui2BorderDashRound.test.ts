import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { parseGradient } from "@/engine/ui2/css/IgeCssValues";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";
import type { IgeUiPaintBox } from "@/engine/ui2/render/IgeUiPaint";

describe("ui2: a ring of dashes round a rounded box, and repeating conic gradients", () => {
	it("a circle's dashed border is one ring, its dashes spaced evenly round it; an ellipse's follow its curve", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 200, height: 200 });
		r.addStyleSheet("body { margin: 0; } .c { width: 60px; height: 60px; box-sizing: border-box; border-radius: 50%; border: 2px dashed red; }");
		r.document.body.innerHTML = `<div class="c"></div>`;
		r.update(0);
		const ring = (r.items.filter((i) => i.op === "box") as IgeUiPaintBox[]).filter((i) => i.color?.r === 255);
		// (One item, the ring, its dashes drawn round it in the shader. The middle of the line: 58px across, so about
		// 182px round; dashes 6px with 4px gaps, so 18 of them evened out)
		expect(ring.length).toBe(1);
		expect(ring[0]).toMatchObject({ x: 0, y: 0, w: 60, h: 60, border: 2 });
		expect(ring[0].dash!.len).toBe(6);
		expect(ring[0].dash!.period * 18).toBeCloseTo(Math.PI * 58, 3);
		// An ellipse (a 1px dashed rim, 50% round a wide box): one ring, its corners elliptical, the dashes along them
		r.addStyleSheet(".e { width: 100px; height: 40px; border-radius: 50%; border: 1px dashed red; }");
		r.document.body.innerHTML = `<div class="e"></div>`;
		r.update(0);
		const rim = (r.items.filter((i) => i.op === "box") as IgeUiPaintBox[]).filter((i) => i.color?.r === 255);
		expect(rim.length).toBe(1);
		expect(rim[0]).toMatchObject({ border: 1, radii: [51, 51, 51, 51], radiiY: [21, 21, 21, 21] });
		expect(rim[0].dash!.len).toBe(3);
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
