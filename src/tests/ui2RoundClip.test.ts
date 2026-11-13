import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { igeUiHeadlessHost } from "@/engine/ui2/IgeUiHost";
import { IgeUiCanvas2d, igeUiCanvas2dOn } from "@/engine/ui2/render/IgeUiCanvas2d";
import type { IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { combineRounds, type IgeUiRound, packRound, roundClipStats, roundThrough } from "@/engine/ui2/render/IgeUiRoundClip";

const round = (box: [number, number, number, number], r: number, ry = r): IgeUiRound => ({ box, rx: [r, r, r, r], ry: [ry, ry, ry, ry] });

/** The shader's unpacking of a rounded clip (IgeUiGlRenderer's fragment shader), to check the packing against. */
function unpack (d: number[]): { rx: number[]; ry: number[] } {
	const w = d[2] - d[0], h = d[3] - d[1];
	const ry = d.slice(4).map((p) => Math.floor(p / 4096));
	const rx = d.slice(4).map((p, i) => ((p - ry[i] * 4096) / 4095) * w);
	return { rx, ry: ry.map((v) => (v / 4095) * h) };
}

function page (css: string, html: string) {
	const host = igeUiHeadlessHost({ width: 400, height: 300 });
	igeUiCanvas2dOn(host);
	const r = new IgeUiRoot({ host, width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; } ${css}`);
	r.document.body.innerHTML = html;
	return r;
}

describe("ui2: rounded clips", () => {
	it("an element with a border-radius whose overflow's clipped cuts what's in it to its padding box's rounded corners (its radii less its borders), its rectangle short of the scrollbars still", () => {
		const r = page(".disc { width: 200px; height: 100px; border: 4px solid #fff; border-radius: 50%; overflow: hidden; } .in { width: 400px; height: 400px; background: #f00; } .sq { width: 50px; height: 50px; overflow: hidden; } .sq div { width: 90px; height: 90px; background: #0f0; }", `<div class="disc"><div class="in"></div></div><div class="sq"><div></div></div>`);
		r.update();
		const red = r.items.find((i) => i.op === "box" && i.color?.r === 255 && !i.color.g) as Extract<IgeUiPaintItem, { op: "box" }>;
		expect([...red.clip!]).toEqual([4, 4, 204, 104]);
		// (Half the border box each way, less the 4px border: an ellipse)
		expect(red.clip!.round).toEqual({ box: [4, 4, 204, 104], rx: [100, 100, 100, 100], ry: [50, 50, 50, 50] });
		// (No radius: no rounded corners)
		const green = r.items.find((i) => i.op === "box" && i.color?.g === 255 && !i.color.r) as Extract<IgeUiPaintItem, { op: "box" }>;
		expect(green.clip!.round).toBeUndefined();
	});

	it("a picture (an image, a canvas) with a border-radius is cut to its content box's curve, the radii less its borders and padding", () => {
		const r = page(".c { display: block; width: 100px; height: 50px; border: 3px solid #fff; padding: 2px; border-radius: 50%; }", `<canvas class="c" width="10" height="10"></canvas><canvas width="10" height="10"></canvas>`);
		r.update();
		const [round, square] = r.items.filter((i) => i.op === "image");
		expect([...round.clip!]).toEqual([5, 5, 105, 55]);
		expect(round.clip!.round).toEqual({ box: [5, 5, 105, 55], rx: [50, 50, 50, 50], ry: [25, 25, 25, 25] });
		expect(square.clip?.round).toBeUndefined();
	});

	it("keeps a rounded clip through a move or a scale and drops it (the rectangle kept) through a turn", () => {
		const r = page(".a { width: 100px; height: 100px; border-radius: 20px; overflow: hidden; } .s { transform: scale(2); transform-origin: 0 0; } .t { transform: rotate(10deg); } .k { width: 10px; height: 10px; background: #00f; }", `<div class="a"><div class="s"><div class="k"></div></div><div class="t"><div class="k"></div></div></div>`);
		r.update();
		const [scaled, turned] = r.items.filter((i) => i.op === "box" && i.color?.b === 255);
		// (In the scaled box's own pixels: half the size)
		expect(scaled.clip!.round).toEqual({ box: [0, 0, 50, 50], rx: [10, 10, 10, 10], ry: [10, 10, 10, 10] });
		expect(roundThrough(scaled.clip!.round, scaled.matrix)).toEqual({ box: [0, 0, 100, 100], rx: [20, 20, 20, 20], ry: [20, 20, 20, 20] });
		expect(turned.clip!.round).toBeUndefined();
	});

	it("combines two: the inner one when it's inside the other's straight part, the larger radius where corners meet, else approximated and counted", () => {
		const outer = round([0, 0, 100, 100], 10);
		const avatar = round([30, 30, 60, 60], 15);
		expect(combineRounds(outer, avatar)).toEqual({ round: avatar, exact: true });
		expect(combineRounds(avatar, outer)).toEqual({ round: avatar, exact: true });
		// (A child filling its parent: their corners the same, the larger kept)
		expect(combineRounds(outer, round([0, 0, 100, 100], 4))).toEqual({ round: outer, exact: true });
		const before = roundClipStats.inexact;
		// (A box reaching into the parent's curve across its corner)
		const r = combineRounds(outer, round([2, 40, 50, 98], 6));
		expect(r.exact).toBe(false);
		expect(roundClipStats.inexact).toBe(before + 1);
		expect(r.round!.box).toEqual([2, 40, 50, 98]);
	});

	it("maps through a flip (its corners swapped) and packs into the renderer's 8 floats, unpacked to within a tenth of a pixel", () => {
		const r: IgeUiRound = { box: [0, 0, 300, 100], rx: [8, 0, 30, 2], ry: [8, 0, 20, 2] };
		expect(roundThrough(r, [-1, 0, 0, 1, 300, 0])).toEqual({ box: [0, 0, 300, 100], rx: [0, 8, 2, 30], ry: [0, 8, 2, 20] });
		expect(roundThrough(r, [Math.cos(1), Math.sin(1), -Math.sin(1), Math.cos(1), 0, 0])).toBeUndefined();
		const d = packRound(r);
		expect(d.slice(0, 4)).toEqual([0, 0, 300, 100]);
		const { rx, ry } = unpack(d);
		rx.forEach((v, i) => expect(Math.abs(v - r.rx[i])).toBeLessThan(0.1));
		ry.forEach((v, i) => expect(Math.abs(v - r.ry[i])).toBeLessThan(0.1));
		expect(packRound(undefined)[2]).toBeLessThan(packRound(undefined)[0]);
	});

	it("a 2D canvas's roundRect: corners shared out as border-radius shares them, scaled down where they'd overlap, flipped with a negative size; on the axes a clip to it is a rounded one, turned a mask", () => {
		const size: [number, number] = [100, 100];
		const c = new IgeUiCanvas2d(null, { measure: () => 0, metrics: () => ({ ascent: 8, descent: 2 }) }, () => size);
		const clipOf = (draw: () => void) => {
			c.resetTransform();
			c.save();
			c.beginPath();
			draw();
			c.clip();
			const round = c._state.clip?.round;
			const masked = c._state.masks.length > 0;
			c.restore();
			return { round, masked };
		};
		expect(clipOf(() => c.roundRect(10, 10, 60, 40, 8)).round).toEqual({ box: [10, 10, 70, 50], rx: [8, 8, 8, 8], ry: [8, 8, 8, 8] });
		// (Two: top-left and bottom-right, then the others; an elliptical one)
		expect(clipOf(() => c.roundRect(0, 0, 60, 40, [4, { x: 10, y: 6 }])).round).toEqual({ box: [0, 0, 60, 40], rx: [4, 10, 4, 10], ry: [4, 6, 4, 6] });
		// (Too big for its height: all scaled down together, 40 high taking 2 x 30)
		expect(clipOf(() => c.roundRect(0, 0, 100, 40, 30)).round!.ry).toEqual([20, 20, 20, 20]);
		// (A negative width: the box from its other side, left and right corners swapped)
		expect(clipOf(() => c.roundRect(60, 0, -60, 40, [1, 2, 3, 4])).round).toEqual({ box: [0, 0, 60, 40], rx: [2, 1, 4, 3], ry: [2, 1, 4, 3] });
		expect(clipOf(() => {
			c.rotate(0.4);
			c.roundRect(10, 10, 40, 40, 8);
		}).masked).toBe(true);
		// Filled: the rectangle less what the corners cut away
		c.beginPath();
		c.roundRect(0, 0, 60, 40, 10);
		c.fill();
		const items: IgeUiPaintItem[] = [];
		c.paint(items, 0, 0, 100, 100, 1, null);
		const fill = items.find((i) => i.op === "fill") as Extract<IgeUiPaintItem, { op: "fill" }>;
		let area = 0;
		for (let i = 0; i < fill.tris.length; i += 6) {
			const t = fill.tris;
			area += Math.abs((t[i + 2] - t[i]) * (t[i + 5] - t[i + 1]) - (t[i + 4] - t[i]) * (t[i + 3] - t[i + 1])) / 2;
		}
		// (Its curves cut into chords within a fifth of a pixel: a little under the true area)
		const exact = 60 * 40 - (4 - Math.PI) * 100;
		expect(area).toBeLessThan(exact);
		expect(area).toBeGreaterThan(exact - 10);
	});

	it("a 2D canvas's clip to a circle or an ellipse is a rounded clip (no stencil), shown where the canvas is", () => {
		const r = page("canvas { display: block; width: 200px; height: 100px; }", `<canvas width="100" height="50" data-canvas="engine"></canvas>`);
		const c = r.document.querySelector("canvas")!.getContext("2d") as unknown as IgeUiCanvas2d;
		c.save();
		c.beginPath();
		c.arc(25, 25, 20, 0, Math.PI * 2);
		c.clip();
		c.fillStyle = "#f00";
		c.fillRect(0, 0, 100, 50);
		c.restore();
		c.save();
		c.beginPath();
		c.ellipse(70, 25, 20, 10, Math.PI / 2, 0, Math.PI * 2);
		c.clip();
		c.fillStyle = "#0f0";
		c.fillRect(0, 0, 100, 50);
		c.restore();
		r.update();
		expect(r.items.some((i) => i.op === "group" && i.mask)).toBe(false);
		const red = r.items.find((i) => i.op === "box" && i.color?.r === 255) as Extract<IgeUiPaintItem, { op: "box" }>;
		// (Twice the size it's drawn at)
		expect(red.clip!.round).toEqual({ box: [10, 10, 90, 90], rx: [40, 40, 40, 40], ry: [40, 40, 40, 40] });
		const green = r.items.find((i) => i.op === "box" && i.color?.g === 255) as Extract<IgeUiPaintItem, { op: "box" }>;
		// (Turned a quarter: 10 across, 20 down)
		expect(green.clip!.round).toEqual({ box: [120, 10, 160, 90], rx: [20, 20, 20, 20], ry: [40, 40, 40, 40] });
	});
});
