import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";
import type { IgeUiPaintBox, IgeUiPaintFill } from "@/engine/ui2/render/IgeUiPaint";

describe("ui2: SVG gradients", () => {
	const paint = (shapes: string) => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 300, height: 200 });
		r.addStyleSheet("body { margin: 0; } svg { display: block; width: 100px; height: 100px; }");
		// (The gradients defined once, in another SVG, as a page might)
		r.document.body.innerHTML = `<svg style="position: absolute; width: 0; height: 0"><defs>
			<linearGradient id="down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ff0000"/></linearGradient>
			<radialGradient id="glow" cx="0.5" cy="0.5"><stop offset="0" stop-color="#00ff00"/><stop offset="1" stop-color="#00ff00" stop-opacity="0"/></radialGradient>
		</defs></svg><svg viewBox="0 0 100 100">${shapes}</svg>`;
		r.update(0);
		return r.items;
	};

	it("a circle in a radial gradient is a box with it, its radius matched to the box", () => {
		const box = paint(`<circle cx="50" cy="50" r="40" fill="url(#glow)"/>`).find((i) => i.op === "box" && (i as IgeUiPaintBox).gradient) as IgeUiPaintBox;
		expect(box.gradient!.type).toBe("radial");
		expect(box.gradient!.stops[1].at).toBeCloseTo(1, 5);
		expect(box.gradient!.stops[1].color.a).toBe(0);
		expect([box.x, box.y, box.w, box.h]).toEqual([10, 10, 80, 80]);
	});

	it("a path in a linear gradient is filled in bands of its colours, top to bottom", () => {
		const fills = paint(`<path d="M10 10 H90 V90 H10 Z" fill="url(#down)"/>`).filter((i) => i.op === "fill") as IgeUiPaintFill[];
		expect(fills.length).toBeGreaterThan(10);
		expect(fills[0].color.g).toBeGreaterThan(230);
		expect(fills[fills.length - 1].color.g).toBeLessThan(25);
		expect(fills[1].clip![1]).toBeGreaterThan(10);
	});
});
