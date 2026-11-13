import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { parseTransform } from "@/engine/ui2/css/IgeCssValues";
import { flatTransformFunction } from "@/engine/ui2/css/IgeCssTransform3d";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

const round = (a: number[] | undefined) => (a ?? []).map((v) => Math.round(v * 1000) / 1000 + 0);
const ctx = { fontSize: 16, rootFontSize: 16, viewportWidth: 800, viewportHeight: 600 } as never;

describe("ui2: 3D and skew transforms, seen straight on", () => {
	it("rotateY narrows across, rotateX narrows down; a half turn mirrors", () => {
		expect(round(parseTransform("rotateY(60deg)", 100, 100, ctx))).toEqual([0.5, 0, 0, 1, 0, 0]);
		expect(round(parseTransform("rotateX(60deg)", 100, 100, ctx))).toEqual([1, 0, 0, 0.5, 0, 0]);
		expect(round(parseTransform("rotateY(180deg)", 100, 100, ctx))).toEqual([-1, 0, 0, 1, 0, 0]);
		expect(round(parseTransform("rotateY(0.5turn)", 100, 100, ctx))).toEqual([-1, 0, 0, 1, 0, 0]);
	});

	it("turns about one axis add up as in 3D: a card's back on a turned card faces the front again", () => {
		expect(round(parseTransform("rotateY(180deg) rotateY(180deg)", 100, 100, ctx))).toEqual([1, 0, 0, 1, 0, 0]);
	});

	it("rotate3d about z is a plain rotation; depth and perspective change nothing; matrix3d keeps x and y", () => {
		expect(round(flatTransformFunction("rotate3d", ["0", "0", "1", "90deg"]))).toEqual(round(parseTransform("rotate(90deg)", 10, 10, ctx)));
		expect(round(parseTransform("perspective(800px) translateZ(48px) translateX(10px)", 100, 100, ctx))).toEqual([1, 0, 0, 1, 10, 0]);
		expect(round(parseTransform("matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 5, 6, 7, 1)", 100, 100, ctx))).toEqual([-1, 0, 0, 1, 5, 6]);
	});

	it("skews are exact", () => {
		expect(round(parseTransform("skewX(45deg)", 100, 100, ctx))).toEqual([1, 0, 1, 1, 0, 0]);
		expect(round(parseTransform("skewY(45deg)", 100, 100, ctx))).toEqual([1, 1, 0, 1, 0, 0]);
		expect(round(parseTransform("skew(45deg, 0)", 100, 100, ctx))).toEqual([1, 0, 1, 1, 0, 0]);
	});

	it("a turned element's computed transform is its 4x4, as Chrome gives it (matrix3d); a 2D one stays matrix()", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.addStyleSheet("body { margin: 0; } .c { width: 100px; height: 140px; } .c.down { transform: rotateY(180deg); } .c.flat { transform: translateZ(0) rotate(90deg); }");
		r.document.body.innerHTML = `<div class="c down"></div><div class="c flat"></div>`;
		const [down, flat] = [...r.document.querySelectorAll(".c")];
		const cs = (e: typeof down) => r.document.defaultView!.getComputedStyle(e).transform;
		expect(cs(down)).toBe("matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)");
		expect(cs(flat).startsWith("matrix(")).toBe(true);
		expect(round(cs(flat).match(/-?[\d.]+/g)!.map(Number))).toEqual([0, 1, -1, 0, 0, 0]);
	});
});
