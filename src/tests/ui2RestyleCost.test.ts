/**
 * What a change restyles: a class no selector looks for on an ancestor restyles only its element (and what's under it
 * only for what it passes down); one that some selector does look for there restyles what's under it too. The rules
 * that could be about an element are found once for each tag, id and set of classes.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string, html: string): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; font: 10px sans-serif; } ${css}`);
	r.root.innerHTML = html;
	r.update(0);
	return r;
}

describe("ui2: what a change restyles", () => {
	it("finds the classes selectors look for on ancestors", () => {
		const r = ui(`.a .b { color: red; } .c > .d { color: red; } .x:not(.n .m) { color: red; } .p:is(.q *) { color: red; } .solo { color: red; } .e + .f { color: red; }`, "");
		// (Those it must have, and none that's only ever a selector's subject; a few more are harmless: a sibling's, one in :not())
		const got = r.styles.ancestorClasses;
		for (const c of ["a", "c", "n", "q"]) expect(got.has(c)).toBe(true);
		for (const c of ["b", "d", "x", "p", "solo", "f"]) expect(got.has(c)).toBe(false);
	});

	it(":has() looks again only at what's in (or is) an element a :has() is on that holds the change", () => {
		const menus = Array.from({ length: 12 }, (_, i) => `<div class="menu m${i}"><div class="body"></div></div>`).join("");
		const r = ui(`.menu { display: block; } .menu:has(> .tabRow) { height: 50px; } .menu:has(> .tabRow) > .body { width: 20px; } .x :is(.card):is(:hover, :has(.pf)) .mark { opacity: 1; }`,
			`${menus}<div class="hud"><span class="credits">10</span></div>`);
		expect([...r.styles.hasAnchors].sort()).toEqual([".card", ".menu"]);
		// (A change outside every menu: none of them looked at)
		const credits = r.root.querySelector(".credits")!;
		credits.appendChild(r.document.createElement("b"));
		r.update(16);
		expect(r.stats.elements).toBeLessThan(4);
		// (A tab row put in one: that one, and its body, take the rules; the others don't)
		const m3 = r.root.querySelector(".m3")!;
		const row = r.document.createElement("div");
		row.className = "tabRow";
		m3.appendChild(row);
		r.update(32);
		expect(m3.getBoundingClientRect().height).toBe(50);
		expect(r.root.querySelector(".m3 > .body")!.getBoundingClientRect().width).toBe(20);
		expect(r.root.querySelector(".m4")!.getBoundingClientRect().height).toBe(0);
		row.remove();
		r.update(48);
		expect(m3.getBoundingClientRect().height).toBe(0);
	});

	it("a class only the element itself is styled by restyles it alone; one a descendant's selector looks for restyles what's under it", () => {
		const kids = Array.from({ length: 40 }, () => `<i class="kid"></i>`).join("");
		const r = ui(`.box.blur { background: red; } .kid { display: block; } .box.win .kid { width: 5px; }`, `<div class="box">${kids}</div>`);
		const box = r.root.querySelector(".box")!;
		box.classList.add("blur");
		r.update(16);
		expect(r.stats.elements).toBe(1);
		box.classList.remove("blur");
		r.update(32);
		expect(r.stats.elements).toBe(1);
		box.classList.add("win");
		r.update(48);
		expect(r.stats.elements).toBe(41);
		expect(r.root.querySelector(".kid")!.getBoundingClientRect().width).toBe(5);
		// (One that changes what it passes down (color): what's under it takes it)
		r.addStyleSheet(`.box.warm { color: rgb(255, 0, 0); }`);
		r.update(64);
		box.classList.add("warm");
		r.update(80);
		expect(r.document.defaultView!.getComputedStyle(r.root.querySelector(".kid")!).color).toBe("rgb(255, 0, 0)");
	});
});
