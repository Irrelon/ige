import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint, type IgeUiPaintFill, type IgeUiPaintLine } from "@/engine/ui2/render/IgeUiPaint";
import { fillTriangles, parsePathData, svgTransform, triangulate } from "@/engine/ui2/render/IgeUiSvg";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

const round = (a: number[]) => a.map((v) => Math.round(v * 100) / 100 + 0);

describe("ui2: SVG path data", () => {
	it("moves, lines, horizontal and vertical lines, close; relative commands; pairs after a move are lines", () => {
		const s = parsePathData("M10 20L30 20 30 40H10Zm5 5h10v10");
		expect(s).toHaveLength(2);
		expect(s[0]).toEqual({ points: [10, 20, 30, 20, 30, 40, 10, 40], closed: true });
		// (After Z the pen is back at the subpath's start: m is from there)
		expect(s[1]).toEqual({ points: [15, 25, 25, 25, 25, 35], closed: false });
	});

	it("numbers run together as path data allows them (signs and dots as separators, exponents)", () => {
		const s = parsePathData("M1-2l.5.5L1e1,2E0");
		expect(s[0].points).toEqual([1, -2, 1.5, -1.5, 10, 2]);
	});

	it("curves and arcs flattened through their ends", () => {
		const c = parsePathData("M0 0C0 10 10 10 10 0S20-10 20 0", 0.01)[0].points;
		expect(round(c.slice(-2))).toEqual([20, 0]);
		expect(c.length).toBeGreaterThan(10);
		// A half circle of radius 10 from (0, 0) to (20, 0), sweeping through y = 10 (y down: the sweep flag 0)
		const a = parsePathData("M0 0A10 10 0 0 0 20 0", 0.01)[0].points;
		expect(round(a.slice(-2))).toEqual([20, 0]);
		const ys = a.filter((_, i) => i % 2 === 1);
		expect(Math.max(...ys)).toBeCloseTo(10, 1);
		// Flags written with no space between them
		const b = parsePathData("M0 0a10 10 0 0120 0", 0.01)[0].points;
		expect(Math.min(...b.filter((_, i) => i % 2 === 1))).toBeCloseTo(-10, 1);
	});

	it("transform attributes", () => {
		expect(svgTransform("translate(5 6) scale(2)")).toEqual([2, 0, 0, 2, 5, 6]);
		const r = svgTransform("rotate(90 10 10)")!;
		expect(round(r)).toEqual([0, 1, -1, 0, 20, 0]);
		expect(svgTransform(null)).toBeUndefined();
	});
});

describe("ui2: SVG fills as triangles", () => {
	it("ear clipping a concave polygon", () => {
		// An L shape: six corners, four triangles
		const pts = [0, 0, 20, 0, 20, 10, 10, 10, 10, 20, 0, 20];
		const t = triangulate(pts);
		expect(t.length).toBe(12);
		let area = 0;
		for (let i = 0; i < t.length; i += 3) {
			const [a, b, c] = [t[i], t[i + 1], t[i + 2]];
			area += Math.abs((pts[b * 2] - pts[a * 2]) * (pts[c * 2 + 1] - pts[a * 2 + 1]) - (pts[b * 2 + 1] - pts[a * 2 + 1]) * (pts[c * 2] - pts[a * 2])) / 2;
		}
		expect(area).toBe(300);
	});

	it("edges two triangles share are inside the shape (drawn sharp); the rest are its outline", () => {
		// Two triangles of a square, as separate subpaths (a mesh drawn as one path)
		const { tris, edges } = fillTriangles(parsePathData("M0 0L10 0L10 10ZM0 0L10 10L0 10Z"), [1, 0, 0, 1, 0, 0]);
		expect(tris.length).toBe(12);
		// Each has two outline edges and the diagonal shared
		expect(edges.map((m) => [m & 1, (m >> 1) & 1, (m >> 2) & 1].reduce((a, b) => a + b, 0))).toEqual([2, 2]);
	});
});

describe("ui2: SVG in the document", () => {
	it("a viewBox fitted by preserveAspectRatio (xMidYMid meet by default), none stretching it; shapes' client rects", () => {
		const r = ui(".s { width: 200px; height: 100px; display: block; }");
		r.document.body.innerHTML = `<svg class="s" id="a" viewBox="0 0 10 10"><rect id="ra" x="0" y="0" width="10" height="10"/></svg>`
			+ `<svg class="s" id="b" viewBox="0 0 10 10" preserveAspectRatio="none"><rect id="rb" x="0" y="0" width="10" height="10"/></svg>`
			+ `<svg class="s" id="c" viewBox="0 0 10 10" preserveAspectRatio="xMinYMin slice"><path id="pc" d="M0 0H10V5"/></svg>`;
		r.update();
		const rect = (id: string) => {
			const b = r.document.getElementById(id)!.getBoundingClientRect();
			return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10);
		};
		// Meet: 100 x 100 in the middle of 200 x 100
		expect(rect("ra")).toEqual([50, 0, 100, 100]);
		expect(rect("rb")).toEqual([0, 100, 200, 100]);
		// Slice from the top left: scaled 20, the path's bounds 200 x 100
		expect(rect("pc")).toEqual([0, 200, 200, 100]);
	});

	it("fills and strokes: CSS over presentation attributes over the parent's (they inherit); opacities; caps and joins; non-scaling strokes", () => {
		const r = ui(".s { width: 100px; height: 100px; display: block; } .s .k { stroke: #ff0000; stroke-linecap: round; vector-effect: non-scaling-stroke; stroke-width: 1px; }");
		r.document.body.innerHTML = `<svg class="s" viewBox="0 0 10 10"><g fill="#00ff00" stroke="#0000ff" stroke-width="0.5">`
			+ `<path d="M0 0L10 0L10 10Z" style="fill-opacity:0.5"/>`
			+ `<path class="k" d="M0 5H10" fill="none" stroke-opacity="0.25"/>`
			+ `</g></svg>`;
		r.update();
		const items = r.items.filter((i) => i.op === "fill" || i.op === "line") as (IgeUiPaintFill | IgeUiPaintLine)[];
		expect(describePaint(items)).toEqual(["fill 1tris rgba(0,255,0,1) a0.5", "line 3pts rgba(0,0,255,1)", "line 2pts rgba(255,0,0,1)"]);
		const [fill, outline, k] = items as [IgeUiPaintFill, IgeUiPaintLine, IgeUiPaintLine];
		expect(round(fill.tris)).toEqual([0, 0, 100, 0, 100, 100]);
		// The inherited stroke: scaled with the drawing (0.5 x 10), mitred, butt ends, closed
		expect(outline).toMatchObject({ width: 5, cap: "butt", join: "miter", closed: true });
		// CSS's: 1px whatever the scale, round ends, a quarter opaque
		expect(k).toMatchObject({ width: 1, cap: "round", opacity: 0.25 });
		expect(round(k.points)).toEqual([0, 50, 100, 50]);
	});

	it("circles and rectangles as boxes: fill, then the stroke as a ring centred on the edge", () => {
		const r = ui(".s { width: 100px; height: 100px; display: block; }");
		r.document.body.innerHTML = `<svg class="s" viewBox="0 0 100 100"><circle cx="50" cy="50" r="10" fill="#ffffff" stroke="#000000" stroke-width="2"/></svg>`;
		r.update();
		expect(describePaint(r.items.filter((i) => i.op === "box"))).toEqual(["box 40,40 20x20 rgba(255,255,255,1) r10/10/10/10 clip[0,0,100,100]", "box 39,39 22x22 border 2 rgba(0,0,0,1) r11/11/11/11 clip[0,0,100,100]"]);
	});

	it("a pattern fill: its tile repeated over the shape, each copy clipped to its tile", () => {
		const r = ui(".s { width: 100px; height: 100px; display: block; }");
		r.document.body.innerHTML = `<svg class="s" viewBox="0 0 100 100"><defs><pattern id="g" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0L0 0 0 25" fill="none" stroke="#ffffff"/></pattern></defs>`
			+ `<rect x="0" y="0" width="100" height="100" fill="url(#g)"/></svg>`;
		r.update();
		const lines = r.items.filter((i) => i.op === "line") as IgeUiPaintLine[];
		expect(lines).toHaveLength(16);
		expect(round(lines[5].points)).toEqual([50, 25, 25, 25, 25, 50]);
		expect(lines[5].clip).toEqual([25, 25, 50, 50]);
	});
});

describe("ui2: dashed and dotted borders", () => {
	it("dashes fitted to each side, starting and ending on a dash; solid sides as strips", () => {
		const r = ui(".b { width: 188px; height: 46px; border: 1px dashed #ffffff; border-left: 3px solid #ff0000; }");
		r.document.body.innerHTML = `<div class="b"></div>`;
		r.update();
		const boxes = r.items.filter((i) => i.op === "box");
		const top = boxes.filter((i) => i.op === "box" && i.y === 0 && i.h === 1);
		// 192px wide (3 + 188 + 1): dashes of 3 with gaps of about 2
		expect(top[0]).toMatchObject({ x: 0, w: 3 });
		expect(top[top.length - 1].op === "box" && Math.round((top[top.length - 1] as { x: number; w: number }).x + (top[top.length - 1] as { w: number }).w)).toBe(192);
		expect(top.length).toBe(Math.round((192 + 2) / 5));
		// The left side solid, between the top and bottom
		expect(describePaint(boxes.filter((i) => i.op === "box" && i.color?.g === 0))).toEqual(["box 0,1 3x46 rgba(255,0,0,1)"]);
	});
});
