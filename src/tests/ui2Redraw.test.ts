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

describe("ui2: computed styles as a browser reports them", () => {
	it("a flex item's or an absolutely placed box's display is blockified; an SVG transform attribute is the transform", () => {
		const r = ui(`.f { display: flex; } .i { display: inline-flex; } .a { position: absolute; display: inline-block; }`, 400, 300);
		r.root.innerHTML = `<div class="f"><span class="i">x</span><span>y</span></div><span class="i k">z</span><span class="a">w</span><svg viewBox="0 0 10 10"><g transform="translate(2 3) scale(2)"><circle r="1"></circle></g></svg>`;
		r.update(0);
		const view = r.document.defaultView!;
		const d = (s: string) => view.getComputedStyle(r.root.querySelector(s)!).display;
		expect([d(".f .i"), d(".f span:not(.i)"), d(".k"), d(".a")]).toEqual(["flex", "block", "inline-flex", "block"]);
		expect(view.getComputedStyle(r.root.querySelector("g")!).transform).toBe("matrix(2, 0, 0, 2, 2, 3)");
		expect(view.getComputedStyle(r.root.querySelector("circle")!).transform).toBe("none");
	});
});

describe("ui2: a text field's selection set by code", () => {
	it("select() highlights the whole value while the field's focused", () => {
		const r = ui(`input { font-size: 10px; width: 100px; }`, 400, 300);
		r.root.innerHTML = `<input value="hello">`;
		const input = r.root.querySelector("input")!;
		r.update(0);
		r.focus(input);
		input.select();
		r.update(16);
		const sel = input as unknown as { selectionStart: number; selectionEnd: number };
		expect([sel.selectionStart, sel.selectionEnd]).toEqual([0, 5]);
		const marks = r.items.filter((i) => i.el === input && i.op === "box" && (i as { w: number }).w > 1 && (i as { color?: { a: number } }).color?.a === 0.4);
		expect(marks.length).toBe(1);
		input.setSelectionRange(2, 2);
		r.update(32);
		expect(r.items.filter((i) => i.el === input && i.op === "box" && (i as { w: number }).w === 1).length).toBe(1);
	});
});

describe("ui2: moving an element where it's drawn (placeAt)", () => {
	it("moves it, its hits and its rect with no restyle or layout after the first time, as a transform would", () => {
		const r = ui(`.l { position: absolute; left: 0; top: 0; width: 40px; height: 10px; background: #f00; transform: translateX(-50%); } .q { width: 30px; height: 30px; background: #00f; }`, 400, 300);
		r.root.innerHTML = `<div class="q"></div><div class="l">x</div>`;
		const l = r.root.querySelector(".l")!;
		r.update(0);
		r.placeAt(l, 100, 50);
		r.update(16);
		expect(l.getBoundingClientRect().left).toBe(80);
		const compute = r.styles.compute.bind(r.styles);
		let computed = 0;
		r.styles.compute = (...a: Parameters<typeof compute>) => {
			computed++;
			return compute(...a);
		};
		const painted = r.stats.partialPaint;
		r.placeAt(l, 200, 120);
		r.update(32);
		expect(computed).toBe(0);
		expect(r.stats.partialPaint).toBe(painted + 1);
		expect(l.getBoundingClientRect().left).toBe(180);
		expect(l.getBoundingClientRect().top).toBe(120);
		expect(r.hitTest(190, 125)).toBe(l);
		r.styles.compute = compute;
		const now = snapshot(r);
		expect(fresh(r, 48)).toEqual(now);
		r.placeAt(l, null);
		r.update(64);
		expect(l.getBoundingClientRect().left).toBe(-20);
	});
});

describe("ui2: the translate, rotate and scale properties", () => {
	it("apply before the transform, about its origin", () => {
		const r = ui(`.a, .b { position: absolute; left: 0; top: 0; width: 20px; height: 10px; } .a { translate: 10px 50%; scale: 2; } .b { transform: translate(10px, 50%) scale(2); } .c { position: absolute; left: 0; top: 50px; width: 20px; height: 20px; rotate: 90deg; translate: 5px; }`, 400, 300);
		r.root.innerHTML = `<div class="a"></div><div class="b"></div><div class="c"></div>`;
		r.update(0);
		expect(r.root.querySelector(".a")!.getBoundingClientRect()).toEqual(r.root.querySelector(".b")!.getBoundingClientRect());
		const c = r.root.querySelector(".c")!.getBoundingClientRect();
		expect([Math.round(c.left), Math.round(c.top)]).toEqual([5, 50]);
	});
});

describe("ui2: hover after a redraw", () => {
	it("what's under a pointer that hasn't moved is hovered, also when the layout was done by a measurement first", () => {
		const r = ui(`button { display: block; width: 80px; height: 20px; } button:hover { color: red; }`, 400, 300);
		r.root.innerHTML = `<div class="list"><button class="a">A</button></div>`;
		r.update(0);
		const pt = { clientX: 10, clientY: 10, button: 0, buttons: 0, pointerType: "mouse", pointerId: 1, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} };
		r._pointer("pointermove", pt as never);
		r.update(16);
		// (A new button above the hovered one, which is kept: it moves down, the new one's under the pointer)
		r.root.querySelector(".list")!.insertAdjacentHTML("afterbegin", `<button class="b">B</button>`);
		void r.root.querySelector(".b")!.getBoundingClientRect();
		r.update(32);
		r.update(48);
		expect(r.root.querySelector("button.b")!._states.has("hover")).toBe(true);
		expect(r.root.querySelector("button.b")!._computed!.color).toBe("red");
		expect(r.root.querySelector("button.a")!._computed!.color).not.toBe("red");
	});
});

describe("ui2: settling after a redraw under the pointer", () => {
	it("hovers what's there now and finishes its :hover transition (a fixture's still frame)", () => {
		const r = ui(`.s { display: block; width: 80px; height: 20px; background: #000; transition: background 0.12s; } .s:hover { background: #f00; }`, 400, 300);
		r.root.innerHTML = `<div class="list"><button class="s a">A</button></div>`;
		r.update(0);
		const pt = { clientX: 10, clientY: 10, button: 0, buttons: 0, pointerType: "mouse", pointerId: 1, timeStamp: 0, stopImmediatePropagation () {}, preventDefault () {} };
		r._pointer("pointermove", pt as never);
		r.settleAnimations(0);
		r.update(0);
		r.root.querySelector(".list")!.innerHTML = `<button class="s b">B</button>`;
		r.settleAnimations(0);
		r.update(0);
		expect(r.document.defaultView!.getComputedStyle(r.root.querySelector(".b")!).backgroundColor).toBe("rgb(255, 0, 0)");
	});
});

describe("ui2: focus while the page hasn't the system's focus", () => {
	it("shows none (as a browser's unfocused window), and comes back with its ring when the page is focused", () => {
		let focused = false;
		const g = globalThis as unknown as { document?: unknown };
		g.document = { hasFocus: () => focused };
		try {
			const r = ui(`button:focus { color: red; } button:focus-visible { outline: 2px solid; }`, 400, 300);
			r.root.innerHTML = `<button>a</button>`;
			const b = r.root.querySelector("button")!;
			r.update(0);
			r.focus(b);
			r.update(16);
			expect(r.document.activeElement).toBe(b);
			expect([b.matches(":focus"), b._computed!.color === "red"]).toEqual([false, false]);
			focused = true;
			r.update(32);
			r.update(48);
			expect([b.matches(":focus"), b.matches(":focus-visible"), b._computed!.color]).toEqual([true, true, "red"]);
		} finally {
			delete g.document;
		}
	});
});

describe("ui2: content sizes of replaced elements and margins through a min-height", () => {
	it("a canvas at width: 100% doesn't hold a flex item open to its own width; a last child's margin collapses through a min-height that doesn't hold", () => {
		const r = ui(`.row { display: flex; } .chart { flex: 0 0 216px; height: 216px; } canvas { display: block; width: 100%; height: 100%; } .body { min-height: 20px; } .body p { margin: 0 0 6px; height: 30px; } .next { margin-top: 8px; height: 5px; }`, 800, 600);
		r.root.innerHTML = `<div class="row"><div class="chart"><canvas width="360" height="360"></canvas></div><div>text</div></div><div class="body"><p></p><p></p></div><div class="next"></div>`;
		r.update(0);
		expect(r.root.querySelector(".chart")!.getBoundingClientRect().width).toBe(216);
		const body = r.root.querySelector(".body")!.getBoundingClientRect();
		expect(body.height).toBe(66);
		expect(r.root.querySelector(".next")!.getBoundingClientRect().top).toBe(body.top + 66 + 8);
	});
});

describe("ui2: clip-path polygons", () => {
	it("a polygon that isn't cut corners is filled in its own shape; cut corners stay a chamfer", () => {
		const r = ui(`.hex { width: 13px; height: 12px; background: #8fd2ee; clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%); } .cut { width: 40px; height: 20px; background: #f00; clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px); }`, 400, 300);
		r.root.innerHTML = `<div class="hex"></div><div class="cut"></div>`;
		r.update(0);
		const hex = r.items.filter((i) => i.el === r.root.querySelector(".hex"));
		expect(hex.map((i) => i.op)).toEqual(["fill"]);
		expect((hex[0] as { tris: number[] }).tris.length).toBe(4 * 6);
		const cut = r.items.filter((i) => i.el === r.root.querySelector(".cut"));
		expect(cut.map((i) => i.op)).toEqual(["box"]);
		expect((cut[0] as { chamfer?: number[] }).chamfer).toEqual([6, 0, 6, 0]);
	});
});

describe("ui2: a stylesheet replaced (an edited <style>)", () => {
	it("takes its new rules in its place among the others, and its old ones away", () => {
		const r = ui(`.a { color: red; }`, 400, 300);
		const sheet = r.addStyleSheet(`.a { color: blue; width: 10px; } @keyframes k { to { opacity: 0; } }`);
		r.addStyleSheet(`.a { width: 20px; }`);
		r.root.innerHTML = `<div class="a">x</div>`;
		r.update(0);
		const a = r.root.querySelector(".a")!;
		expect([a._computed!.color, a.getBoundingClientRect().width]).toEqual(["blue", 20]);
		// (Edited: still before the sheet after it, which keeps its width)
		const again = r.replaceStyleSheet(sheet, `.a { color: green; width: 30px; }`);
		r.update(16);
		expect([a._computed!.color, a.getBoundingClientRect().width]).toEqual(["green", 20]);
		expect(r.styles.keyframes.has("k")).toBe(false);
		r.replaceStyleSheet(again, "");
		r.update(32);
		expect(a._computed!.color).toBe("red");
	});
});
