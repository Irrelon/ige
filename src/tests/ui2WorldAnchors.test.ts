import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiWorldAnchors, type IgeUiWorldProjector, igeUiSpace, igeUiWorldOverlay } from "@/engine/ui2/IgeUiWorldAnchors";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** Two views side by side (split screen), each looking straight down: world x, z to the view's pixels, 1:1, centred on its own spot. */
interface View { name: string; x: number; w: number; cx: number; cz: number }
const left: View = { name: "left", x: 0, w: 400, cx: 0, cz: 0 };
const right: View = { name: "right", x: 400, w: 400, cx: 1000, cz: 0 };
const projector: IgeUiWorldProjector<View> = {
	views: () => [left, right],
	rect: (v) => ({ x: v.x, y: 0, w: v.w, h: 300 }),
	project: (v, x, _y, z) => {
		if (z > 500) return null;
		const px = v.x + v.w / 2 + (x - v.cx), py = 150 + (z - v.cz);
		return { x: px, y: py, visible: px >= v.x && px <= v.x + v.w && py >= 0 && py <= 300 };
	}
};

function ui (scale = 1, safeX = 0, safeY = 0): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 800, height: 300 });
	r.addStyleSheet("body { margin: 0; font-size: 10px; line-height: 1; } .tag { width: 40px; height: 10px; }");
	r.resize(800, 300, scale, safeX, safeY);
	return r;
}

const rect = (el: { getBoundingClientRect (): { left: number; top: number; width: number; height: number } }) => {
	const r = el.getBoundingClientRect();
	return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
};

function tag (r: IgeUiRoot) {
	const el = r.document.createElement("div");
	el.className = "tag";
	return el;
}

describe("ui2: nodes anchored to the world", () => {
	it("keeps a node over its world point each frame, with a screen offset and its own alignment", () => {
		const r = ui();
		const anchors = new IgeUiWorldAnchors(projector, r.root, { space: igeUiSpace(r) });
		const el = tag(r);
		const a = anchors.anchor(el, { view: left, position: { x: 10, y: 0, z: 20 }, screenOffset: { x: 0, y: 30 }, align: "translateX(-50%)" });
		anchors.update();
		r.update(0);
		// (200 + 10, 150 + 20 + 30), centred across
		expect(rect(el)).toEqual([190, 200, 40, 10]);
		a.at(-50, 0, 0);
		anchors.update();
		r.update(16);
		expect(rect(el)).toEqual([130, 180, 40, 10]);
		expect(a.shown).toBe(true);
	});

	it("hides a node whose point is out of its view or behind the camera, and shows it again", () => {
		const r = ui();
		const anchors = new IgeUiWorldAnchors(projector, r.root);
		const el = tag(r);
		const a = anchors.anchor(el, { view: left, position: { x: 500, y: 0, z: 0 } });
		anchors.update();
		expect(a.shown).toBe(false);
		expect(el.style.visibility).toBe("hidden");
		a.at(0, 0, 600);
		anchors.update();
		expect(a.shown).toBe(false);
		a.at(0, 0, 0);
		anchors.update();
		expect(a.shown).toBe(true);
		expect(el.style.visibility).toBe("");
		// (A margin lets it stay a little past the edge)
		const b = anchors.anchor(tag(r), { view: left, position: { x: 210, y: 0, z: 0 }, margin: 20 });
		anchors.update();
		expect(b.shown).toBe(true);
	});

	it("clips each view's nodes to that view (split screen): a layer over each", () => {
		const r = ui();
		const anchors = new IgeUiWorldAnchors(projector, r.root, { layerClass: "worldLayer" });
		const a = tag(r), b = tag(r);
		anchors.anchor(a, { view: left, position: { x: 0, y: 0, z: 0 } });
		anchors.anchor(b, { view: right, position: { x: 1000, y: 0, z: 0 } });
		anchors.update();
		r.update(0);
		const layers = r.root.querySelectorAll(".worldLayer");
		expect(layers.length).toBe(2);
		expect(rect(layers[0])).toEqual([0, 0, 400, 300]);
		expect(rect(layers[1])).toEqual([400, 0, 400, 300]);
		expect(a.parentNode).toBe(layers[0]);
		expect(b.parentNode).toBe(layers[1]);
		expect(rect(b)).toEqual([580, 145, 40, 10]);
		// A node half over the views' border is cut there: its layer clips it
		expect(r.computedStyle(layers[1] as never).overflow).toBe("hidden");
	});

	it("on a scaled UI inside a safe area, still lands on the screen point (and in screen pixels)", () => {
		const r = ui(2, 10, 20);
		let told = 0;
		const anchors = new IgeUiWorldAnchors(projector, r.root, { space: igeUiSpace(r), layerChanged: (layer, _v, s) => { told++; layer.style.setProperty("--ui-scale", String(s.scale)); } });
		const el = tag(r);
		anchors.anchor(el, { view: left, position: { x: 0, y: 0, z: 0 }, align: "" });
		anchors.update();
		r.update(0);
		// Its corner on the point (200, 150), its size in screen px: unscaled
		expect(rect(el)).toEqual([200, 150, 40, 10]);
		expect(told).toBe(1);
		// The scale changes: the layer's refitted (and told)
		r.resize(800, 300, 1, 0, 0);
		anchors.update();
		r.update(16);
		expect(rect(el)).toEqual([200, 150, 40, 10]);
		expect(told).toBe(2);
	});

	it("places a node at a screen point instead (an arrow at the view's edge), projects points for lines, follows a point read each frame", () => {
		const r = ui();
		const anchors = new IgeUiWorldAnchors(projector, r.root);
		const arrow = tag(r);
		const a = anchors.anchor(arrow, { view: right, align: "" }).place(12, 34);
		anchors.update();
		r.update(0);
		expect(rect(arrow)).toEqual([412, 34, 40, 10]);
		expect(anchors.project(1010, 0, 5, right)).toEqual({ x: 210, y: 155, visible: true });
		expect(anchors.project(0, 0, 900, right)).toBeNull();
		a.hide();
		anchors.update();
		expect(a.shown).toBe(false);
		let p = { x: 0, y: 0, z: 0 };
		const f = anchors.anchor(tag(r), { view: left, follow: () => p, align: "" });
		anchors.update();
		expect(f.screen).toEqual({ x: 200, y: 150 });
		p = { x: 5, y: 0, z: -5 };
		anchors.update();
		expect(f.screen).toEqual({ x: 205, y: 145 });
	});

	it("an overlay that places the anchors before the UI is drawn", () => {
		const r = ui();
		const anchors = new IgeUiWorldAnchors(projector, r.root);
		const el = tag(r);
		anchors.anchor(el, { view: left, position: { x: 0, y: 0, z: 0 }, align: "" });
		const overlay = igeUiWorldOverlay(r, anchors);
		let placed = 0;
		overlay.anchors.push({ update: () => placed++ });
		// (No GL here: the drawing itself fails after the anchors are placed)
		try {
			overlay.draw(undefined as never, 800, 300, 1);
		} catch {
			// expected without a context
		}
		expect(placed).toBe(1);
		// (An engine element is moved where it's drawn, not by its style: IgeUiRoot.placeAt)
		expect(el._place).toEqual([200, 150]);
		expect(el.style.transform).toBe("");
	});
});
