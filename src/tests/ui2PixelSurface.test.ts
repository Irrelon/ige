import { IgeUiPixelSurface } from "@/engine/ui2/render/IgeUiPixelSurface";
import { IgeUiCanvas2d } from "@/engine/ui2/render/IgeUiCanvas2d";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";

const fonts = { measure: () => 0, metrics: () => ({ ascent: 8, descent: 2 }) };

describe("ui2: pixels in memory", () => {
	it("puts and gets pixels as they are, clears and fills rectangles, moves its version on as it changes, and a new size clears it", () => {
		const s = new IgeUiPixelSurface(4, 3);
		const c = s.getContext("2d")!;
		const img = c.createImageData(2, 2);
		img.data.set([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255, 9, 9, 9, 0]);
		const v0 = s.version;
		c.putImageData(img, 1, 1);
		expect(s.version).toBeGreaterThan(v0);
		expect([...c.getImageData(1, 1, 2, 1).data]).toEqual([255, 0, 0, 255, 0, 255, 0, 128]);
		// (Off the surface: nothing there)
		expect([...c.getImageData(-1, 0, 1, 1).data]).toEqual([0, 0, 0, 0]);
		c.clearRect(1, 1, 1, 1);
		expect([...c.getImageData(1, 1, 1, 1).data]).toEqual([0, 0, 0, 0]);
		c.fillStyle = "rgba(0, 0, 255, 0.5)";
		c.fillRect(0, 0, 1, 1);
		expect([...c.getImageData(0, 0, 1, 1).data]).toEqual([0, 0, 255, 128]);
		const p = s.pixels();
		expect([p.width, p.height, p.data.length]).toEqual([4, 3, 48]);
		s.width = 2;
		expect([...c.getImageData(0, 0, 1, 1).data]).toEqual([0, 0, 0, 0]);
	});

	it("is the engine canvas's pixel layer: putImageData drawn as a picture where it was first put, read back by getImageData, gone with a clear", () => {
		const size: [number, number] = [8, 8];
		const c = new IgeUiCanvas2d(null, fonts, () => size);
		c.fillStyle = "#f00";
		c.fillRect(0, 0, 8, 8);
		const img = c.createImageData(2, 2);
		img.data.fill(200);
		c.translate(3, 3);
		c.putImageData(img, 1, 1);
		c.putImageData(img, 5, 5);
		const items: IgeUiPaintItem[] = [];
		c.paint(items, 0, 0, 16, 16, 1, null);
		expect(items.map((i) => i.op)).toEqual(["box", "image"]);
		// (Not moved by the transform; shown at the canvas's size)
		expect((items[1] as Extract<IgeUiPaintItem, { op: "image" }>).w).toBe(16);
		expect([...c.getImageData(1, 1, 1, 1).data]).toEqual([200, 200, 200, 200]);
		expect([...c.getImageData(5, 5, 1, 1).data]).toEqual([200, 200, 200, 200]);
		c.resetTransform();
		c.clearRect(0, 0, 8, 8);
		const after: IgeUiPaintItem[] = [];
		c.paint(after, 0, 0, 16, 16, 1, null);
		expect(after).toEqual([]);
		expect([...c.getImageData(1, 1, 1, 1).data]).toEqual([0, 0, 0, 0]);
	});
});
