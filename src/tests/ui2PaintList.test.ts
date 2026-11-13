import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint, type IgeUiPaintBox, type IgeUiPaintItem } from "@/engine/ui2/render/IgeUiPaint";
import { colorMatrix, identityFilter, parseFilterList } from "@/engine/ui2/render/IgeUiFilters";
import { backFacing, flatten, parseTransform3d, project } from "@/engine/ui2/render/IgeUiPerspective";
import { fitDashes } from "@/engine/ui2/render/IgeUiTextDecoration";
import { interpolate } from "@/engine/ui2/style/IgeUiAnimator";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

const ctx = { em: 16, rem: 16, vw: 0, vh: 0, cqw: 0, cqh: 0 };
const round = (a: number[]) => a.map((v) => Math.round(v * 1000) / 1000 + 0);
const boxesOf = (r: IgeUiRoot, el: unknown) => (r.painter.items as IgeUiPaintItem[]).filter((i): i is IgeUiPaintBox => i.op === "box" && i.el === el);

describe("ui2: 3D transforms in perspective", () => {
	it("a transform list as a 4x4 (as Chrome's matrix3d lists it); 2D lists aren't 3D", () => {
		const m = parseTransform3d("rotateY(30deg)", 100, 100, ctx)!;
		expect(round(m)).toEqual([0.866, 0, -0.5, 0, 0, 1, 0, 0, 0.5, 0, 0.866, 0, 0, 0, 0, 1]);
		expect(parseTransform3d("rotate(30deg) translate(10px, 5px)", 100, 100, ctx)).toBeUndefined();
		expect(parseTransform3d("translateZ(0)", 100, 100, ctx)).toBeUndefined();
		expect(round(parseTransform3d("translate3d(50%, 0, 48px)", 100, 100, ctx)!.slice(12))).toEqual([50, 0, 48, 1]);
	});

	it("a back turned to the viewer: a half turn about y or x is, a mirror in 2D isn't", () => {
		expect(backFacing(parseTransform3d("rotateY(180deg)", 10, 10, ctx)!)).toBe(true);
		expect(backFacing(parseTransform3d("rotateX(120deg)", 10, 10, ctx)!)).toBe(true);
		expect(backFacing(parseTransform3d("rotateY(60deg)", 10, 10, ctx)!)).toBe(false);
		expect(backFacing(parseTransform3d("scaleZ(1) scaleX(-1) rotateY(10deg)", 10, 10, ctx)!)).toBe(false);
	});

	it("a plane in perspective: its near edge drawn bigger, its far edge smaller", () => {
		// (perspective(500px) rotateY(60deg) about x = 0: the edge at x = 100 turns away)
		const m = flatten(parseTransform3d("perspective(500px) rotateY(60deg)", 100, 100, ctx)!);
		expect(m.length).toBe(9);
		const top = project(m, 100, -50)!, bottom = project(m, 100, 50)!;
		// (Half of it across, seen at a slant, and the far edge shorter than 100)
		expect(bottom[1] - top[1]).toBeLessThan(100);
		expect(top[0]).toBeLessThan(50);
	});

	it("a card turned over: its face hidden from behind (backface-visibility), its back shown; perspective from its parent", () => {
		const r = ui(`.card { position: absolute; left: 100px; top: 100px; width: 70px; height: 98px; perspective: 700px; }
			.inner { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateY(150deg); }
			.front, .back { position: absolute; inset: 0; backface-visibility: hidden; }
			.front { background: #fff; } .back { background: #800; transform: rotateY(180deg); }`);
		r.document.body.innerHTML = `<div class="card"><div class="inner"><div class="front"></div><div class="back"></div></div></div>`;
		r.update();
		const [front, back] = [r.document.querySelector(".front"), r.document.querySelector(".back")];
		expect(boxesOf(r, front)).toHaveLength(0);
		const b = boxesOf(r, back);
		expect(b).toHaveLength(1);
		// (Drawn through a projective transform: in perspective)
		expect((b[0].matrix as number[]).length).toBe(9);
		// Its client rect: round the turned card as it's seen (narrower than it is, taller at its near edge)
		const rect = back!.getBoundingClientRect();
		expect(rect.width).toBeLessThan(70 * Math.cos(Math.PI / 6) + 1);
		expect(rect.height).toBeGreaterThan(98);
		expect(r.document.defaultView!.getComputedStyle(r.document.querySelector(".inner")!).transform.startsWith("matrix3d(")).toBe(true);
	});

	it("a die's faces round its middle (preserve-3d): the ones turned away hidden", () => {
		const r = ui(`.dice { position: absolute; left: 100px; top: 100px; width: 96px; height: 96px; perspective: 800px; }
			.die { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateX(-24deg) rotateY(-30deg); }
			.face { position: absolute; inset: 0; background: #335; backface-visibility: hidden; }
			.f1 { transform: translateZ(48px); } .f6 { transform: rotateY(180deg) translateZ(48px); }
			.f3 { transform: rotateY(90deg) translateZ(48px); } .f4 { transform: rotateY(-90deg) translateZ(48px); }
			.f5 { transform: rotateX(90deg) translateZ(48px); } .f2 { transform: rotateX(-90deg) translateZ(48px); }`);
		r.document.body.innerHTML = `<div class="dice"><div class="die">${[1, 2, 3, 4, 5, 6].map((n) => `<div class="face f${n}"></div>`).join("")}</div></div>`;
		r.update();
		const shown = [1, 2, 3, 4, 5, 6].filter((n) => boxesOf(r, r.document.querySelector(`.f${n}`)).length);
		// (Its top tipped towards the viewer and turned to show its right side: its front, its right side and its top)
		expect(shown).toEqual([1, 3, 5]);
	});
});

describe("ui2: elliptical corners", () => {
	it("50% on an oblong box is an ellipse (its own vertical radii); on a square, a circle", () => {
		const r = ui(".o { width: 44px; height: 16px; border-radius: 50%; background: red; } .s { width: 20px; height: 20px; border-radius: 50%; background: red; } .e { width: 100px; height: 50px; border-radius: 10px / 20px; background: red; }");
		r.document.body.innerHTML = `<div class="o"></div><div class="s"></div><div class="e"></div>`;
		r.update();
		const [o, s, e] = [".o", ".s", ".e"].map((q) => boxesOf(r, r.document.querySelector(q))[0]);
		expect(o.radii).toEqual([22, 22, 22, 22]);
		expect(o.radiiY).toEqual([8, 8, 8, 8]);
		expect(s.radii).toEqual([10, 10, 10, 10]);
		expect(s.radiiY).toBeUndefined();
		expect(e.radii).toEqual([10, 10, 10, 10]);
		expect(e.radiiY).toEqual([20, 20, 20, 20]);
	});
});

describe("ui2: inset shadows", () => {
	it("are drawn inside the padding box (within the border), their corners its curves", () => {
		const r = ui(".c { position: absolute; left: 10px; top: 10px; width: 60px; height: 80px; border: 2px solid #fff; border-radius: 6px; box-shadow: inset 0 0 0 4px #f2e4c4; }");
		r.document.body.innerHTML = `<div class="c"></div>`;
		r.update();
		const inset = boxesOf(r, r.document.querySelector(".c")).find((i) => i.shadow === "inset")!;
		expect([inset.x, inset.y, inset.w, inset.h]).toEqual([12, 12, 60, 80]);
		expect(inset.radii).toEqual([4, 4, 4, 4]);
	});
});

describe("ui2: text decorations", () => {
	it("underlines under the text, line-throughs over it; carried into inline children; a thickness and colour of their own", () => {
		const r = ui(".u { text-decoration: underline; } .s { text-decoration: line-through 2px rgb(255, 0, 0); } .ib { display: inline-block; }");
		r.document.body.innerHTML = `<p><span class="u">Under <b>bold</b></span> <span class="s">struck</span> <span class="u"><i class="ib">block</i></span></p>`;
		r.update();
		const list = describePaint(r.painter.items);
		const at = (t: string) => list.findIndex((l) => l.startsWith(`text "${t}`));
		const lines = (r.painter.items as IgeUiPaintItem[]).map((it, i) => ({ it, i })).filter(({ it }) => it.op === "box" && it.h <= 3);
		// "Under", "bold" each with an underline before them; "struck" with its line after; the inline-block's text none
		const before = (t: string) => lines.some(({ i }) => i === at(t) - 1);
		expect(before("Under")).toBe(true);
		expect(before("bold")).toBe(true);
		const strike = (r.painter.items as IgeUiPaintItem[])[at("struck") + 1] as IgeUiPaintBox;
		expect(strike.op).toBe("box");
		expect(strike.h).toBe(2);
		expect(strike.color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		expect(before("block")).toBe(false);
		expect(r.document.defaultView!.getComputedStyle(r.document.querySelector(".s")!).textDecorationLine).toBe("line-through");
	});
});

describe("ui2: CSS filters", () => {
	it("a filter list's steps: colour functions as their matrices, blurs, drop shadows; identities left out", () => {
		const ops = parseFilterList("grayscale(1) brightness(50%) blur(2px) drop-shadow(0 2px 4px red) saturate(1) url(#x)", ctx, { r: 0, g: 0, b: 0, a: 1 });
		expect(ops.map((o) => o.type)).toEqual(["matrix", "matrix", "blur", "shadow"]);
		// (grayscale: every channel the same mix of the three)
		const g = (ops[0] as { m: number[] }).m;
		expect(round([g[0], g[1], g[2]])).toEqual(round([g[5], g[6], g[7]]));
		expect((ops[1] as { m: number[] }).m[0]).toBe(0.5);
		expect(colorMatrix("invert", "1")!.slice(0, 5)).toEqual([-1, 0, 0, 0, 1]);
		expect(colorMatrix("contrast", "2")![4]).toBe(-0.5);
	});

	it("a filter that isn't only drop-shadows marks the element's run with its steps; its opacity is applied to the result whole", () => {
		const r = ui(".c { width: 50px; height: 20px; background: red; filter: grayscale(0.5) blur(1px); opacity: 0.5; } .d { filter: drop-shadow(0 1px 2px black); }");
		r.document.body.innerHTML = `<div class="c"><b>x</b></div><div class="d">y</div>`;
		r.update();
		const list = describePaint(r.painter.items);
		expect(list.some((l) => l === "filter colour blur(1) {")).toBe(true);
		expect(list.some((l) => l.startsWith("drop-shadow "))).toBe(true);
		const group = (r.painter.items as IgeUiPaintItem[]).find((i) => i.op === "group" && i.open && i.filters)!;
		expect(group.opacity).toBe(0.5);
		// (What's in it drawn whole: not faded item by item)
		expect(boxesOf(r, r.document.querySelector(".c"))[0].opacity).toBe(1);
	});

	it("backdrop-filter: grayscale() contrast() greys and hardens what's behind (with no blur too)", () => {
		const r = ui(".t { position: fixed; inset: 0; backdrop-filter: grayscale(0.8) contrast(1.3); }");
		r.document.body.innerHTML = `<div class="t"></div>`;
		r.update();
		expect(describePaint(r.painter.items)).toContain("backdrop 0,0 800x600 blur(0) colour(2)");
	});

	it("animates from none through each function's identity (brightness from 1, blur from 0)", () => {
		expect(identityFilter("brightness(1.25) contrast(110%) blur(4px) drop-shadow(0px 0px 18px rgba(255, 170, 40, 0.7))")).toBe("brightness(1) contrast(100%) blur(0px) drop-shadow(0px 0px 0px rgba(255, 170, 40, 0))");
		expect(interpolate("filter", "none", "brightness(2)", 0.5)).toBe("brightness(1.5)");
	});
});

describe("ui2: url() backgrounds", () => {
	it("a picture placed by background-size and -position, repeating or not, once it's arrived", () => {
		const r = ui(".a { width: 100px; height: 60px; background: #000 url(a.png) center / cover no-repeat; } .b { width: 100px; height: 60px; background-image: url(b.png); background-position: 10px 5px; }");
		r.images.sizes.set("a.png", { w: 50, h: 50 });
		r.images.sizes.set("b.png", { w: 30, h: 20 });
		r.document.body.innerHTML = `<div class="a"></div><div class="b"></div>`;
		r.update();
		const imgs = (r.painter.items as IgeUiPaintItem[]).filter((i) => i.op === "image") as { src?: string; x: number; y: number; w: number; h: number; uv?: number[]; repeat?: boolean[] }[];
		expect(imgs.map((i) => i.src)).toEqual(["a.png", "b.png"]);
		// Cover: 100 x 100, its middle shown (uv 0.2 to 0.8 down)
		expect([imgs[0].x, imgs[0].y, imgs[0].w, imgs[0].h]).toEqual([0, 0, 100, 60]);
		expect(round(imgs[0].uv!)).toEqual([0, 0.2, 1, 0.8]);
		expect(imgs[0].repeat).toEqual([false, false]);
		// Repeating from 10, 5: the whole box, uv starting a third of a tile back
		expect([imgs[1].x, imgs[1].y, imgs[1].w, imgs[1].h]).toEqual([0, 60, 100, 60]);
		expect(round(imgs[1].uv!)).toEqual([-0.333, -0.25, 3, 2.75]);
		expect(imgs[1].repeat).toEqual([true, true]);
	});

	it("an inline style's url(data:...;base64,...) is kept whole (its ; isn't the declaration's end)", () => {
		const r = ui();
		r.document.body.innerHTML = `<div style="color: red; background-image: url(data:image/png;base64,AAAA); width: 10px"></div>`;
		const d = r.document.body.firstElementChild!;
		expect(r.document.defaultView!.getComputedStyle(d).backgroundImage).toBe('url("data:image/png;base64,AAAA")');
		expect(r.document.defaultView!.getComputedStyle(d).width).toBe("10px");
	});
});

describe("ui2: group opacity", () => {
	it("an element faded with more than one thing in it is faded whole (a layer); one lone item is faded as it is", () => {
		const r = ui(".panel { position: absolute; width: 100px; height: 40px; background: #123; opacity: 0.5; } .leaf { position: absolute; top: 50px; width: 20px; height: 20px; background: red; opacity: 0.4; }");
		r.document.body.innerHTML = `<div class="panel">Text over its own background</div><div class="leaf"></div>`;
		r.update();
		const list = describePaint(r.painter.items);
		expect(list.filter((l) => l.startsWith("opacity("))).toEqual(["opacity(0.5) {"]);
		// (Inside the layer: drawn as they are, the layer faded)
		expect(boxesOf(r, r.document.querySelector(".panel"))[0].opacity).toBe(1);
		expect(boxesOf(r, r.document.querySelector(".leaf"))[0].opacity).toBeCloseTo(0.4);
		// (Off: item by item, as before)
		r.painter.groupOpacity = false;
		r.painter.paint(r.rootBox!);
		expect(describePaint(r.painter.items).some((l) => l.startsWith("opacity("))).toBe(false);
		expect(boxesOf(r, r.document.querySelector(".panel"))[0].opacity).toBeCloseTo(0.5);
	});
});

describe("ui2: planes in a preserve-3d context", () => {
	it("are drawn farthest first, whatever their order or z-index", () => {
		const r = ui(`.stage { position: absolute; left: 50px; top: 50px; width: 200px; height: 200px; perspective: 600px; }
			.ctx { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateY(20deg); }
			.p { position: absolute; inset: 40px; } .near { transform: translateZ(60px); background: red; z-index: 1; } .far { transform: translateZ(-60px); background: blue; z-index: 2; }`);
		r.document.body.innerHTML = `<div class="stage"><div class="ctx"><div class="p far"></div><div class="p near"></div></div></div>`;
		r.update();
		const at = (q: string) => (r.painter.items as IgeUiPaintItem[]).findIndex((i) => i.el === r.document.querySelector(q));
		expect(at(".far")).toBeLessThan(at(".near"));
		// (Its z-index would put the far one on top: in 3D it's behind)
		r.document.querySelector(".near")!.setAttribute("style", "transform: translateZ(-90px)");
		r.update();
		expect(at(".near")).toBeLessThan(at(".far"));
	});
});

describe("ui2: text decoration styles and skip-ink", () => {
	it("dashes are fitted to the run as Chrome fits them, starting and ending on one", () => {
		// (13px text: 1px dashes of 3, about 2 apart; 3px: dashes of 6, 3 apart)
		expect(fitDashes(67.7, 3, 2).length).toBe(14);
		const d = fitDashes(78, 6, 3);
		expect(d.length).toBe(9);
		expect(d[d.length - 1] + 6).toBeCloseTo(78);
	});

	it("double, dotted, dashed and wavy lines; an underline broken round the glyphs' ink, a thickness clear of it", () => {
		const r = ui(".d { text-decoration: underline double; } .o { text-decoration: underline dotted; } .w { text-decoration: underline wavy; } .s { text-decoration: underline; } .n { text-decoration: underline; text-decoration-skip-ink: none; }");
		r.document.body.innerHTML = `<p><span class="d">double</span> <span class="o">dotted</span> <span class="w">wavy</span> <span class="s">skip</span> <span class="n">none</span></p>`;
		// (Ink from x 5 to 7 wherever it's asked: the underline breaks there)
		r.painter.inkSpans = (t) => [[t.x + 5, t.x + 7]];
		r.update();
		const items = r.painter.items as IgeUiPaintItem[];
		// (A word's underlines: what's drawn just before its text)
		const lines = (word: string) => {
			const at = items.findIndex((i) => i.op === "text" && i.text === word);
			const out: IgeUiPaintItem[] = [];
			for (let k = at - 1; k >= 0 && (items[k].op === "line" || (items[k].op === "box" && (items[k] as IgeUiPaintBox).h <= 3)); k--) out.unshift(items[k]);
			return out;
		};
		// (Two lines, each broken round the ink)
		expect(lines("double").length).toBe(4);
		// (Dots: one strip each side of the ink, round dots a dot apart drawn along it)
		const dots = lines("dotted") as IgeUiPaintBox[];
		expect(dots.length).toBe(2);
		for (const d of dots) expect(d.dash).toMatchObject({ len: d.h, period: 2 * d.h, round: true });
		expect(dots[1].dash!.phase).toBeCloseTo(dots[0].x - dots[1].x);
		expect(lines("wavy").length).toBe(2);
		expect(lines("wavy").every((i) => i.op === "line")).toBe(true);
		const skip = lines("skip") as IgeUiPaintBox[];
		expect(skip.length).toBe(2);
		expect(skip[1].x - (skip[0].x + skip[0].w)).toBeCloseTo(2 + 2 * 1);
		expect(lines("none").length).toBe(1);
	});
});

describe("ui2: background-repeat space and round", () => {
	it("space: whole tiles spread out to the edges; round: tiles stretched to fit a whole number", () => {
		const r = ui(".s, .r { width: 100px; height: 30px; background-image: url(t.png); } .s { background-repeat: space no-repeat; } .r { background-repeat: round no-repeat; }");
		r.images.sizes.set("t.png", { w: 30, h: 30 });
		r.document.body.innerHTML = `<div class="s"></div><div class="r"></div>`;
		r.update();
		const imgs = (el: string) => (r.painter.items as IgeUiPaintItem[]).filter((i) => i.op === "image" && i.el === r.document.querySelector(el)) as { x: number; w: number }[];
		// Three 30px tiles in 100: 5px between
		expect(imgs(".s").map((i) => i.x)).toEqual([0, 35, 70]);
		// Round: 100 / 3 each, one quad repeating
		expect(imgs(".r").length).toBe(1);
	});
});
