/**
 * CSS zoom in the engine's UI, as Chrome has it (standardised zoom): lengths zoomed by the element's effective zoom
 * (its own times its parent's), percentages of zoomed sizes as they are; getBoundingClientRect as drawn, offset*,
 * client*, scroll* and getComputedStyle unzoomed; scrollbars not zoomed. The numbers are Chrome's for the same page.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: CSS zoom", () => {
	it("lays out and reports as Chrome does", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 800, height: 600 });
		r.addStyleSheet(`body { margin: 0; font: 10px sans-serif; } .z { zoom: 2; width: 100px; padding: 5px; border: 1px solid; margin: 3px; font-size: 12px; line-height: 1; overflow: auto; height: 50px; letter-spacing: 1px; box-shadow: 2px 3px 4px red; }
			.c { width: 30px; height: 200px; margin-left: 7px; font-size: 1.5em; } .v { width: 10vw; } .r { width: 2rem; } .p { width: 50%; } .zz { zoom: 1.5; width: 10px; } .e { width: 2em; }`);
		r.root.innerHTML = `<div class="z"><div class="c">x</div><div class="v"></div><div class="r"></div><div class="p"></div><div class="zz"><div class="e"></div></div></div>`;
		r.update(0);
		const q = (s: string) => r.root.querySelector(s)!;
		const rect = (s: string) => { const b = q(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10); };
		const z = q(".z"), c = q(".c");
		z.scrollTop = 20;
		r.update(16);
		expect(rect(".z")).toEqual([6, 6, 224, 124]);
		expect([z.offsetLeft, z.offsetTop, z.offsetWidth, z.offsetHeight]).toEqual([3, 3, 112, 62]);
		expect([z.clientWidth, z.clientHeight]).toEqual([103, 60]);
		expect([z.scrollWidth, z.scrollHeight, z.scrollTop]).toEqual([103, 210, 20]);
		const cs = r.document.defaultView!.getComputedStyle(z);
		expect([cs.width, cs.height, cs.paddingLeft, cs.marginLeft, cs.fontSize, cs.letterSpacing]).toEqual(["92.5px", "50px", "5px", "3px", "12px", "1px"]);
		expect(rect(".c")).toEqual([32, -22, 60, 400]);
		expect([c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight]).toEqual([16, 9, 30, 200]);
		const ccs = r.document.defaultView!.getComputedStyle(c);
		expect([ccs.width, ccs.marginLeft, ccs.fontSize]).toEqual(["30px", "7px", "18px"]);
		// (Viewport units and rem zoomed; a percentage of the zoomed size as it is; zoom within zoom multiplies; em of the zoomed font)
		expect(rect(".v")).toEqual([18, 378, 160, 0]);
		expect(rect(".r")).toEqual([18, 378, 64, 0]);
		expect(rect(".p")).toEqual([18, 378, 92.5, 0]);
		expect(rect(".zz")).toEqual([18, 378, 30, 0]);
		expect(rect(".e")).toEqual([18, 378, 72, 0]);
		expect(r.document.defaultView!.getComputedStyle(q(".e")).width).toBe("24px");
		expect(q(".e").currentCSSZoom).toBe(3);
	});
});
