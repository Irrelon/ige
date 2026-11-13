import { IgeUiCanvas2d } from "@/engine/ui2/render/IgeUiCanvas2d";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiStencilClip, stencilTriangles } from "@/engine/ui2/render/IgeUiStencilClip";

const fonts = { measure: () => 0, metrics: () => ({ ascent: 8, descent: 2 }) };
type Group = Extract<IgeUiPaintItem, { op: "group" }>;

function canvas (w = 100, h = 100) {
	const size: [number, number] = [w, h];
	const c = new IgeUiCanvas2d(null, fonts, () => size);
	const paint = (pw = w, ph = h) => {
		const items: IgeUiPaintItem[] = [];
		c.paint(items, 0, 0, pw, ph, 1, null);
		return items;
	};
	return { c, paint };
}

/** A GL that records what's called (its constants their own names). */
function fakeGl () {
	const calls: string[] = [];
	const gl = new Proxy({} as Record<string, unknown>, {
		get: (_t, k: string) => {
			if (/^[A-Z_0-9]+$/.test(k)) return k;
			return (...args: unknown[]) => {
				if (/^(stencil\w*|enable|disable|clear|clearStencil|colorMask|drawArrays)$/.test(k)) calls.push(`${k}(${args.map((a) => (typeof a === "number" || typeof a === "string" || typeof a === "boolean" ? a : "…")).join(",")})`);
				return {};
			};
		}
	});
	return { gl: gl as unknown as WebGL2RenderingContext, calls };
}

/** A diamond round (x, y), `r` to each point: a shape that's no rectangle or ellipse, so a clip to it is a mask. */
function diamond (c: IgeUiCanvas2d, x: number, y: number, r: number): void {
	c.moveTo(x - r, y);
	c.lineTo(x, y - r);
	c.lineTo(x + r, y);
	c.lineTo(x, y + r);
	c.closePath();
}

describe("ui2: clips of any shape", () => {
	it("a 2D canvas's clip to a shape: a mask round what's drawn until it's restored, the bounding box the rectangle clip", () => {
		const { c, paint } = canvas();
		c.save();
		c.beginPath();
		diamond(c, 50, 50, 40);
		c.clip();
		c.fillStyle = "#f00";
		c.fillRect(0, 0, 100, 100);
		c.restore();
		c.fillRect(0, 0, 10, 10);
		const items = paint(200, 200);
		expect(items.map((i) => (i.op === "group" ? `${i.open ? "open" : "close"} ${i.mask ? "mask" : ""}` : i.op))).toEqual(["open mask", "box", "close mask", "box"]);
		const open = items[0] as Group;
		// (Shown at twice the size: its triangles inside the diamond there, all of it)
		const tris = open.mask!;
		expect(tris.length % 6).toBe(0);
		for (let i = 0; i < tris.length; i += 2) expect(Math.abs(tris[i] - 100) + Math.abs(tris[i + 1] - 100)).toBeLessThan(80.01);
		let area = 0;
		for (let i = 0; i < tris.length; i += 6) area += Math.abs((tris[i + 2] - tris[i]) * (tris[i + 5] - tris[i + 1]) - (tris[i + 4] - tris[i]) * (tris[i + 3] - tris[i + 1])) / 2;
		expect(area).toBeCloseTo(2 * 80 * 80);
		expect((items[2] as Group).mask).toEqual(tris);
		expect(items[1].clip).toEqual([20, 20, 180, 180]);
		expect(items[3].clip).toEqual([0, 0, 200, 200]);
	});

	it("a rectangle on the axes stays the painter's clip alone; a turned one's a mask", () => {
		const { c, paint } = canvas();
		c.beginPath();
		c.rect(10, 10, 20, 20);
		c.clip();
		c.fillRect(0, 0, 50, 50);
		expect(paint().map((i) => i.op)).toEqual(["box"]);
		const t = canvas();
		t.c.rotate(0.3);
		t.c.beginPath();
		t.c.rect(10, 10, 20, 20);
		t.c.clip();
		t.c.resetTransform();
		t.c.fillRect(0, 0, 50, 50);
		expect(t.paint().map((i) => i.op)).toEqual(["group", "box", "group"]);
	});

	it("clips in clips close innermost first as their state's restored; one left open is closed at the end, and kept open over a clear", () => {
		const { c, paint } = canvas();
		c.save();
		diamond(c, 50, 50, 40);
		c.clip();
		c.beginPath();
		diamond(c, 60, 50, 30);
		c.clip();
		c.fillRect(0, 0, 100, 100);
		c.restore();
		const items = paint();
		const masks = items.filter((i): i is Group => i.op === "group").map((g) => `${g.open ? "+" : "-"}${Math.round(Math.max(...g.mask!.filter((_v, k) => k % 2 === 0)))}`);
		expect(masks).toEqual(["+90", "+90", "-90", "-90"]);
		const inner = items.filter((i): i is Group => i.op === "group");
		expect(inner[2].mask).toEqual(inner[1].mask);
		expect(inner[3].mask).toEqual(inner[0].mask);
		// (Not restored: closed at the end of what's painted, and still open after the canvas is cleared)
		const k = canvas();
		diamond(k.c, 50, 50, 40);
		k.c.clip();
		k.c.fillRect(0, 0, 100, 100);
		expect(k.paint().map((i) => (i.op === "group" ? (i.open ? "+" : "-") : i.op))).toEqual(["+", "box", "-"]);
		k.c.clearRect(0, 0, 100, 100);
		k.c.fillRect(0, 0, 100, 100);
		expect(k.paint().map((i) => (i.op === "group" ? (i.open ? "+" : "-") : i.op))).toEqual(["+", "box", "-"]);
	});

	it("a circle in a circle that can't be one rounded clip with it is a mask (the first stays rounded)", () => {
		const { c, paint } = canvas();
		c.arc(50, 50, 40, 0, Math.PI * 2);
		c.clip();
		c.beginPath();
		c.arc(70, 50, 30, 0, Math.PI * 2);
		c.clip();
		c.fillRect(0, 0, 100, 100);
		const items = paint();
		expect(items.map((i) => (i.op === "group" ? (i.open ? "+" : "-") : i.op))).toEqual(["+", "box", "-"]);
		expect(items[1].clip!.round!.box).toEqual([10, 10, 90, 90]);
	});

	it("fills by the evenodd rule: a ring of two circles is empty in the middle", () => {
		const { c, paint } = canvas();
		c.beginPath();
		c.arc(50, 50, 40, 0, Math.PI * 2);
		c.moveTo(70, 50);
		c.arc(50, 50, 20, 0, Math.PI * 2);
		c.fill("evenodd");
		const fill = paint().find((i) => i.op === "fill") as Extract<IgeUiPaintItem, { op: "fill" }>;
		const inside = (x: number, y: number) => {
			const t = fill.tris;
			for (let i = 0; i < t.length; i += 6) {
				const d = (ax: number, ay: number, bx: number, by: number) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
				const a = d(t[i], t[i + 1], t[i + 2], t[i + 3]), b = d(t[i + 2], t[i + 3], t[i + 4], t[i + 5]), e = d(t[i + 4], t[i + 5], t[i], t[i + 1]);
				if ((a >= 0 && b >= 0 && e >= 0) || (a <= 0 && b <= 0 && e <= 0)) return true;
			}
			return false;
		};
		expect(inside(50, 50)).toBe(false);
		expect(inside(50, 15)).toBe(true);
	});

	it("marks a clip's shape in the stencil as it opens, draws inside it after, and takes it back as it closes; a clip in a clip keeps to both", () => {
		const { gl, calls } = fakeGl();
		const s = new IgeUiStencilClip();
		const tri = [0, 0, 10, 0, 0, 10];
		s.begin();
		s.apply(gl, { open: true, tris: tri }, 100, 100, 1, [0, 0]);
		expect(calls).toEqual([
			"stencilMask(255)", "clearStencil(0)", "clear(STENCIL_BUFFER_BIT)", "enable(STENCIL_TEST)", "colorMask(false,false,false,false)",
			"stencilFunc(EQUAL,0,255)", "stencilOp(KEEP,KEEP,INCR)", "drawArrays(TRIANGLES,0,3)", "colorMask(true,true,true,true)",
			"stencilOp(KEEP,KEEP,KEEP)", "stencilFunc(EQUAL,1,255)"
		]);
		calls.length = 0;
		s.apply(gl, { open: true, tris: tri }, 100, 100, 1, [0, 0]);
		// (Not cleared again; marked where it's inside the first)
		expect(calls).not.toContain("clear(STENCIL_BUFFER_BIT)");
		expect(calls).toContain("stencilFunc(EQUAL,1,255)");
		expect(calls[calls.length - 1]).toBe("stencilFunc(EQUAL,2,255)");
		calls.length = 0;
		s.apply(gl, { open: false, tris: tri }, 100, 100, 1, [0, 0]);
		expect(calls).toContain("stencilOp(KEEP,KEEP,DECR)");
		expect(calls[calls.length - 1]).toBe("stencilFunc(EQUAL,1,255)");
		calls.length = 0;
		s.apply(gl, { open: false, tris: tri }, 100, 100, 1, [0, 0]);
		expect(calls[calls.length - 1]).toBe("disable(STENCIL_TEST)");
		expect(s.depth).toBe(0);
	});

	it("takes a clip's triangles through its transform, a projective one divided through", () => {
		expect(stencilTriangles([1, 2], [2, 0, 0, 3, 10, 20])).toEqual([12, 26]);
		expect(stencilTriangles([1, 1], [1, 0, 0, 1, 0, 0, 0, 0, 2] as unknown as [number, number, number, number, number, number])).toEqual([0.5, 0.5]);
		const t = [1, 2, 3, 4, 5, 6];
		expect(stencilTriangles(t)).toBe(t);
	});
});
