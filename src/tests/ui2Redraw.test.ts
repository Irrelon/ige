import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** A headless UI of w x h, its body unpadded, with the given stylesheet. */
function ui (css: string = "", w = 800, h = 600): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	r.addStyleSheet(`body { margin: 0; font-family: sans-serif; font-size: 10px; line-height: 1; } ${css}`);
	return r;
}

/** Every element's place and size, colour, and the display list: what a redraw must get right. */
function snapshot (r: IgeUiRoot): string[] {
	const out: string[] = [];
	for (const el of r.root.querySelectorAll("*")) {
		const b = el.getBoundingClientRect();
		out.push(`${el.localName}.${el.className} ${b.left},${b.top} ${b.width}x${b.height} ${el._computed?.color}`);
	}
	return [...out, ...describePaint(r.items)];
}

/** The same UI styled, laid out and painted again from scratch. */
function fresh (r: IgeUiRoot, now: number): string[] {
	r._styleAll = true;
	r._layoutAll = true;
	r._layoutDirty = true;
	r._paintDirty = true;
	r.update(now);
	return snapshot(r);
}

const MARKET = `
	.panel { position: absolute; left: 20px; top: 20px; width: 400px; padding: 8px; }
	.list { height: 120px; overflow-y: auto; }
	table { width: 100%; border-collapse: collapse; }
	td { border-bottom: 1px solid #333; padding: 2px 4px; }
	td.price { text-align: right; color: #5fe3ff; }
	tr:nth-child(odd) td { background: #111; }
	.foot { margin-top: 4px; }
`;

const rows = (prices: number[]) => prices.map((p, i) => `<tr><td class="name">Item ${i}</td><td class="price">${p} cr</td><td><button>Buy</button></td></tr>`).join("");
const market = (prices: number[]) => `<div class="panel"><h1>Market</h1><div class="list"><table>${rows(prices)}</table></div><div class="foot">Total <b>${prices.reduce((a, b) => a + b, 0)}</b></div></div>`;

describe("ui2: innerHTML reconciles", () => {
	it("markup that says the same keeps the elements; changed text is changed in place", () => {
		const r = ui(MARKET);
		r.root.innerHTML = market([10, 20, 30]);
		r.update(0);
		const cells = [...r.root.querySelectorAll("td.price")];
		const h1 = r.root.querySelector("h1");
		const compute = r.styles.compute.bind(r.styles);
		let computed = 0;
		r.styles.compute = (...a: Parameters<typeof compute>) => {
			computed++;
			return compute(...a);
		};
		r.root.innerHTML = market([10, 25, 30]);
		expect([...r.root.querySelectorAll("td.price")]).toEqual(cells);
		expect(r.root.querySelector("h1")).toBe(h1);
		expect(cells[1].textContent).toBe("25 cr");
		r.update(16);
		// (Only the cells whose text changed are looked at again, by themselves: tr:nth-child() td is about them)
		expect(computed).toBeLessThan(3);
		r.styles.compute = compute;
		expect(r.stats.kept).toBeGreaterThan(0);
		const now = snapshot(r);
		expect(fresh(r, 32)).toEqual(now);
	});

	it("an element with listeners, focus, a value, a scroll or other attributes is made anew", () => {
		const r = ui(MARKET);
		r.root.innerHTML = market([10, 20, 30]);
		r.update(0);
		const [b0, b1, b2] = [...r.root.querySelectorAll("button")];
		b0.addEventListener("click", () => undefined);
		r.focus(b1);
		b2.setAttribute("data-x", "1");
		const name = r.root.querySelector("td.name")!;
		r.root.innerHTML = market([10, 20, 30]);
		const [n0, n1, n2] = [...r.root.querySelectorAll("button")];
		expect(n0).not.toBe(b0);
		expect(n1).not.toBe(b1);
		expect(n2).not.toBe(b2);
		expect(r.root.querySelector("td.name")).toBe(name);
		// (A class differing: made anew; the same classes in another order: kept)
		r.root.innerHTML = `<p class="a b">x</p>`;
		const p = r.root.firstElementChild;
		r.root.innerHTML = `<p class="b a">x</p>`;
		expect(r.root.firstElementChild).toBe(p);
		r.root.innerHTML = `<p class="b">x</p>`;
		expect(r.root.firstElementChild).not.toBe(p);
	});

	it("observers are told of every top-level node as added (what fills nodes in fills them in again)", async () => {
		const r = ui();
		const view = r.document.defaultView!;
		r.root.innerHTML = `<i>a</i><i>b</i>`;
		r.update(0);
		const added: number[] = [];
		new view.MutationObserver(((recs: { addedNodes: unknown[] }[]) => {
			for (const x of recs) if (x.addedNodes.length) added.push(x.addedNodes.length);
		}) as never).observe(r.root, { childList: true, subtree: true });
		r.root.innerHTML = `<i>a</i><i>c</i>`;
		await Promise.resolve();
		expect(added).toEqual([2]);
		// (Nothing different: nothing to tell)
		r.root.innerHTML = `<i>a</i><i>c</i>`;
		await Promise.resolve();
		expect(added).toEqual([2]);
	});

	it(":empty, :first-child and + see what a reconciled innerHTML changed", () => {
		const r = ui(`span { color: blue; } span:empty { color: red; } li { color: blue; } li:first-child { color: green; } .on + li { color: orange; }`);
		r.root.innerHTML = `<span>x</span><ul><li>a</li><li>b</li></ul>`;
		r.update(0);
		r.root.innerHTML = `<span></span><ul><li>a</li><li>b</li></ul>`;
		r.update(16);
		expect(r.root.querySelector("span")!._computed!.color).toBe("red");
		r.root.innerHTML = `<span></span><ul><li>z</li><li class="on">a</li><li>b</li></ul>`;
		r.update(32);
		expect([...r.root.querySelectorAll("li")].map((li) => li._computed!.color)).toEqual(["green", "blue", "orange"]);
		const now = snapshot(r);
		expect(fresh(r, 48)).toEqual(now);
	});
});

describe("ui2: restyling only what a change can reach", () => {
	it("elements innerHTML made just like the ones they replaced take their styles over", () => {
		const r = ui(`.row { color: #abc; } .row b { color: red; }`);
		const list = (n: number) => Array.from({ length: n }, (_, i) => `<div class="row" data-i="${i}"><b>${i}</b><canvas></canvas></div>`).join("");
		r.root.innerHTML = list(20);
		r.update(0);
		// (A canvas is never kept, so its row is made anew each time: that row's style is taken over)
		r.root.innerHTML = list(20);
		r.update(16);
		expect(r.stats.adopted).toBeGreaterThan(0);
		expect(r.root.querySelector(".row b")!._computed!.color).toBe("red");
		const now = snapshot(r);
		expect(fresh(r, 32)).toEqual(now);
	});

	it("a class change restyles the siblings after it that + and ~ are about, and :has() subjects", () => {
		const r = ui(`.a.on + .b { color: red; } .a.on ~ .c { color: green; } .box:has(.hot) { color: orange; } .b, .c, .box { color: blue; }`);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div><div class="c"></div><div class="box"><i></i></div>`;
		r.update(0);
		r.root.querySelector(".a")!.classList.add("on");
		r.root.querySelector(".box i")!.classList.add("hot");
		r.update(16);
		const color = (s: string) => (r.root.querySelector(s) as IgeUiElement)._computed!.color;
		expect([color(".b"), color(".c"), color(".box")]).toEqual(["red", "green", "orange"]);
		r.root.querySelector(".a")!.classList.remove("on");
		r.root.querySelector(".box i")!.classList.remove("hot");
		r.update(32);
		expect([color(".b"), color(".c"), color(".box")]).toEqual(["blue", "blue", "blue"]);
	});
});

describe("ui2: laying out only what changed", () => {
	it("a price changed in a scrolling table: the rest of the table is kept, and it's as a full layout has it", () => {
		const r = ui(MARKET);
		r.root.innerHTML = market(Array.from({ length: 30 }, (_, i) => 10 + i));
		r.update(0);
		const before = r.root.querySelector(".list")!.scrollHeight;
		r.root.querySelectorAll("td.price")[4].textContent = "123456 cr";
		r.update(16);
		expect(r.stats.kept).toBeGreaterThan(0);
		expect(r.root.querySelector(".list")!.scrollHeight).toBe(before);
		const now = snapshot(r);
		expect(fresh(r, 32)).toEqual(now);
		// (A row gone: the rows after it move up)
		const last = r.root.querySelectorAll("tr")[29];
		const y = last.getBoundingClientRect().top;
		r.root.querySelector("tr")!.remove();
		r.update(48);
		expect(last.getBoundingClientRect().top).toBeLessThan(y);
		const after = snapshot(r);
		expect(fresh(r, 64)).toEqual(after);
	});

	it("text growing in a kept box lays it out again (a line more)", () => {
		const r = ui(`.w { width: 60px; } .x { height: 5px; }`, 400, 300);
		r.root.innerHTML = `<div class="w"><p>aa</p><div class="x"></div></div><div class="y">y</div>`;
		r.update(0);
		const y0 = r.root.querySelector(".y")!.getBoundingClientRect().top;
		r.root.querySelector("p")!.textContent = "aaaa aaaa aaaa aaaa aaaa";
		r.update(16);
		expect(r.root.querySelector(".y")!.getBoundingClientRect().top).toBeGreaterThan(y0);
		const now = snapshot(r);
		expect(fresh(r, 32)).toEqual(now);
	});
});

describe("ui2: painting only what moved", () => {
	it("an animation that only changes how something looks repaints its run of items, the same as painting it all", () => {
		const r = ui(`@keyframes glow { from { opacity: 0.2; } to { opacity: 1; } } .p { position: absolute; left: 10px; top: 10px; width: 50px; height: 20px; background: #f00; animation: glow 1s linear infinite; } .q { width: 30px; height: 30px; background: #00f; }`, 400, 300);
		r.root.innerHTML = `<div class="q"></div><div class="p"><span>x</span></div><div class="q"></div>`;
		r.update(0);
		const n = r.stats.partialPaint;
		r.update(250);
		r.update(500);
		expect(r.stats.partialPaint).toBeGreaterThan(n);
		const part = describePaint(r.items);
		r._paintDirty = true;
		r.update(500);
		expect(describePaint(r.items)).toEqual(part);
		// (What's under the pointer is still found)
		expect(r.hitTest(20, 15)?.className).toBe("p");
	});

	it("a transform animation that ends while something else's size is animating: the box is drawn where it rests", () => {
		const r = ui(`@keyframes slide { from { transform: translateX(100px); } to { transform: translateX(40px); } } @keyframes grow { from { width: 10px; } to { width: 50px; } } .t { width: 20px; height: 20px; animation: slide 1s linear; } .g { height: 5px; animation: grow 2s linear; }`, 400, 300);
		r.root.innerHTML = `<div class="t"></div><div class="g"></div>`;
		const t = r.root.querySelector(".t")!;
		r.update(0);
		r.update(500);
		expect(t.getBoundingClientRect().left).toBe(70);
		r.update(1100);
		expect(t.getBoundingClientRect().left).toBe(0);
		const now = snapshot(r);
		expect(fresh(r, 1100)).toEqual(now);
	});
});

describe("ui2: a grid's content width", () => {
	it("is its tracks' (a fixed column and an fr one), not its widest item times its columns", () => {
		const r = ui(`.g { display: inline-grid; grid-template-columns: 34px 1fr; } .n { grid-row: span 2; } .a { width: 120px; } .b { width: 60px; } .h { display: inline-grid; grid-template-columns: repeat(3, 1fr); column-gap: 10px; } .h i { display: block; } .w { width: 50px; } .v { width: 20px; } .s { display: inline-grid; grid-template-columns: auto auto; } .x { grid-column: span 2; width: 200px; } .y { width: 30px; }`, 800, 600);
		r.root.innerHTML = `<div class="g"><span class="n">1</span><div class="a"></div><div class="b"></div></div><br><div class="h"><i class="w"></i><i class="v"></i><i class="v"></i></div><br><div class="s"><i class="x"></i><i class="y"></i><i class="y"></i></div>`;
		r.update(0);
		expect(r.root.querySelector(".g")!.getBoundingClientRect().width).toBe(154);
		// (Equal fr columns: each as wide as the widest needs)
		expect(r.root.querySelector(".h")!.getBoundingClientRect().width).toBe(170);
		// (An item over both auto columns widens them to its width)
		expect(r.root.querySelector(".s")!.getBoundingClientRect().width).toBe(200);
	});
});

describe("ui2: focus fixup", () => {
	it("a focused element hidden (display: none round it) or removed: nothing's focused", () => {
		const r = ui(`.panel { position: absolute; left: 10px; top: 10px; display: none; } .panel.on { display: block; }`, 400, 300);
		r.root.innerHTML = `<div class="panel on"><table><tr><td><button>a</button></td></tr></table></div><button class="other">b</button>`;
		r.update(0);
		const b = r.root.querySelector(".panel button")!;
		r.focus(b);
		r.update(16);
		expect(r.document.activeElement).toBe(b);
		r.root.querySelector(".panel")!.classList.remove("on");
		r.update(32);
		expect(r.document.activeElement).toBe(null);
		expect(b._states.has("focus")).toBe(false);
		const o = r.root.querySelector(".other")!;
		r.focus(o);
		o.remove();
		r.update(48);
		expect(r.document.activeElement).toBe(null);
	});
});

describe("ui2: text in a flex item's anonymous block", () => {
	it("is on the baseline, whatever its element's vertical-align (that's the element's own, in its line)", () => {
		const r = ui(`.row { display: flex; align-items: baseline; } .t { font-size: 20px; } .pg { display: inline-flex; align-items: center; box-sizing: border-box; height: 18px; padding: 0 4px; border: 1px solid; font-size: 10px; line-height: 1; } .m { vertical-align: middle; }`, 400, 300);
		r.root.innerHTML = `<div class="row"><span class="t">A</span><span class="pg">LB</span></div><div class="row"><span class="t">A</span><span class="pg m">LB</span></div>`;
		r.update(0);
		const [a, b] = [...r.root.querySelectorAll(".row")];
		expect(b.getBoundingClientRect().height).toBe(a.getBoundingClientRect().height);
		expect(b.querySelector(".pg")!.getBoundingClientRect().top - b.getBoundingClientRect().top).toBe(a.querySelector(".pg")!.getBoundingClientRect().top - a.getBoundingClientRect().top);
	});
});

describe("ui2: borders of different colours", () => {
	it("meet on the diagonal (a CSS triangle is a triangle, not a box)", () => {
		const r = ui(`.tri { width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #f00; } .sq { width: 10px; height: 10px; border: 2px solid #0f0; }`, 400, 300);
		r.root.innerHTML = `<div class="tri"></div><div class="sq"></div>`;
		r.update(0);
		const tri = r.items.filter((i) => i.el === r.root.querySelector(".tri"));
		expect(tri.map((i) => i.op)).toEqual(["fill"]);
		const f = tri[0] as Extract<(typeof tri)[number], { op: "fill" }>;
		// (One triangle: the top side's inner edge has no length)
		expect(f.tris).toEqual([0, 0, 12, 0, 6, 8]);
		// (All one colour: the usual border box)
		expect(r.items.filter((i) => i.el === r.root.querySelector(".sq")).map((i) => i.op)).toEqual(["box"]);
	});
});
