import { IgeUiCanvas2d, igeUiCanvas2dOn, parseCanvasFont } from "@/engine/ui2/render/IgeUiCanvas2d";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { igeUiHeadlessHost } from "@/engine/ui2/IgeUiHost";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";

/** Text as 6 px a character at 10 px, ascent 8 and descent 2 a 10 px font. */
const fonts = {
	measure: (text: string, f: { size: number }) => text.length * f.size * 0.6,
	metrics: (f: { size: number }) => ({ ascent: f.size * 0.8, descent: f.size * 0.2 })
};

function canvas (w = 100, h = 50) {
	const size: [number, number] = [w, h];
	let changes = 0;
	const c = new IgeUiCanvas2d(null, fonts, () => size, () => void changes++);
	const paint = (x = 0, y = 0, pw = w, ph = h) => {
		const items: IgeUiPaintItem[] = [];
		c.paint(items, x, y, pw, ph, 1, null);
		return items;
	};
	return { c, size, paint, changes: () => changes };
}

describe("ui2: the engine's 2D canvas", () => {
	it("draws rectangles and whole circles as the painter's boxes (a ring for a stroke), shown at the size the canvas is shown", () => {
		const { c, paint, changes } = canvas();
		c.fillStyle = "#f00";
		c.fillRect(10, 5, 20, 10);
		c.beginPath();
		c.arc(50, 25, 10, 0, Math.PI * 2);
		c.fill();
		c.strokeStyle = "rgb(0, 255, 0)";
		c.lineWidth = 2;
		c.stroke();
		expect(changes()).toBe(3);
		const items = paint(100, 100, 200, 100) as Extract<IgeUiPaintItem, { op: "box" }>[];
		expect(items.map((i) => i.op)).toEqual(["box", "box", "box"]);
		// (Twice the canvas's size: everything twice as big, from where it's shown)
		expect([items[0].x, items[0].y, items[0].w, items[0].h]).toEqual([120, 110, 40, 20]);
		expect(items[1].radii[0]).toBeCloseTo(20);
		expect(items[2].border).toBeCloseTo(4);
		expect(items[2].w).toBeCloseTo(44);
		expect(items[0].clip).toEqual([100, 100, 300, 200]);
	});

	it("fills other paths as triangles and strokes them as lines, dashes each their own line; transforms apply as the path's made", () => {
		const { c, paint } = canvas();
		c.translate(10, 0);
		c.beginPath();
		c.moveTo(0, 0);
		c.lineTo(20, 0);
		c.lineTo(20, 20);
		c.closePath();
		c.fill();
		c.setLineDash([4, 2]);
		c.beginPath();
		c.moveTo(0, 30);
		c.lineTo(20, 30);
		c.stroke();
		const items = paint();
		const fill = items.find((i) => i.op === "fill") as Extract<IgeUiPaintItem, { op: "fill" }>;
		expect(Math.min(...fill.tris.filter((_, i) => i % 2 === 0))).toBe(10);
		const dashes = items.filter((i) => i.op === "line") as Extract<IgeUiPaintItem, { op: "line" }>[];
		expect(dashes.map((d) => [d.points[0], d.points[2]])).toEqual([[10, 14], [16, 20], [22, 26], [28, 30]]);
	});

	it("places text by its alignment and baseline, sized and moved by the transform; turned text keeps its own matrix", () => {
		const { c, paint } = canvas();
		c.font = "bold 10px 'Share Tech Mono', monospace";
		expect(parseCanvasFont(c.font)).toEqual({ family: "Share Tech Mono", size: 10, weight: 700, style: "normal" });
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.fillStyle = "#fff";
		c.fillText("ABCD", 50, 25);
		expect(c.measureText("ABCD").width).toBe(24);
		c.save();
		c.scale(2, 2);
		c.textAlign = "left";
		c.textBaseline = "alphabetic";
		c.fillText("A", 5, 10);
		c.restore();
		c.rotate(Math.PI / 2);
		c.fillText("B", 0, 0);
		const items = paint() as Extract<IgeUiPaintItem, { op: "text" }>[];
		// (Centred: 24 wide; middle: the baseline (8 - 2) / 2 below)
		expect([items[0].x, items[0].y, items[0].w]).toEqual([38, 28, 24]);
		expect([items[1].x, items[1].y, items[1].font.size]).toEqual([10, 20, 20]);
		expect(items[2].matrix?.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 1, -1, 0, 0, 0]);
	});

	it("draws text's shadow as an item of its own under the glyphs (an item with a shadow is only the shadow); strokeText's halo likewise", () => {
		const { c, paint } = canvas();
		c.fillStyle = "#fff";
		c.shadowColor = "#0ff";
		c.shadowBlur = 10;
		c.fillText("HI", 10, 20);
		c.shadowBlur = 0;
		c.strokeStyle = "#f00";
		c.lineWidth = 2;
		c.strokeText("LO", 10, 40);
		const texts = paint().filter((i): i is Extract<IgeUiPaintItem, { op: "text" }> => i.op === "text");
		expect(texts.map((t) => `${t.text}${t.shadow ? ` glow ${t.shadow.blur}` : ""}`)).toEqual(["HI glow 10", "HI", "LO glow 2", "LO"]);
		expect(texts[1].color).toEqual({ r: 255, g: 255, b: 255, a: 1 });
	});

	it("gives a box its gradient as the CSS one over it: a concentric radial's stops out from its inner circle", () => {
		const { c, paint } = canvas();
		const g = c.createRadialGradient(50, 25, 5, 50, 25, 20);
		g.addColorStop(0, "#fff");
		g.addColorStop(1, "rgba(255, 255, 255, 0)");
		c.fillStyle = g;
		c.beginPath();
		c.arc(50, 25, 20, 0, Math.PI * 2);
		c.fill();
		const box = paint()[0] as Extract<IgeUiPaintItem, { op: "box" }>;
		expect(box.gradient).toMatchObject({ type: "radial", cx: 0.5, cy: 0.5, radii: [0.5, 0.5] });
		expect(box.gradient!.stops.map((s) => s.at)).toEqual([0.25, 1]);
	});

	it("clears all of it, or what's drawn inside a rectangle; a new size clears it and its state", () => {
		const { c, size, paint } = canvas();
		c.fillStyle = "#f00";
		c.fillRect(0, 0, 10, 10);
		c.fillRect(50, 0, 10, 10);
		c.clearRect(40, 0, 30, 20);
		expect(paint().length).toBe(1);
		c.clearRect(0, 0, 100, 50);
		expect(paint().length).toBe(0);
		c.translate(5, 5);
		c.fillRect(0, 0, 10, 10);
		size[0] = 200;
		expect(paint().length).toBe(0);
		c.fillRect(0, 0, 10, 10);
		expect((paint()[0] as Extract<IgeUiPaintItem, { op: "box" }>).x).toBe(0);
	});

	it("is a canvas element's surface when its host gives it (data-canvas=\"engine\"): its items painted in the canvas's box; other canvases keep the host's", () => {
		const host = igeUiHeadlessHost({ width: 400, height: 300 });
		igeUiCanvas2dOn(host);
		const r = new IgeUiRoot({ host, width: 400, height: 300 });
		r.addStyleSheet("body { margin: 0; } canvas { display: block; width: 200px; height: 100px; }");
		r.document.body.innerHTML = `<canvas width="100" height="50" data-canvas="engine"></canvas><canvas width="10" height="10"></canvas>`;
		const [mine, other] = r.document.querySelectorAll("canvas");
		const c = mine.getContext("2d") as unknown as IgeUiCanvas2d;
		expect(c).toBeInstanceOf(IgeUiCanvas2d);
		expect(other.getContext("2d")).toBeNull();
		c.fillStyle = "#00f";
		c.fillRect(10, 5, 20, 10);
		r.update();
		const box = r.items.find((i) => i.op === "box" && i.color?.b === 255) as Extract<IgeUiPaintItem, { op: "box" }>;
		expect([box.x, box.y, box.w, box.h]).toEqual([20, 10, 40, 20]);
		// (No picture of it: its items are the drawing)
		expect(r.items.some((i) => i.op === "image" && i.source === mine)).toBe(false);
	});
});
