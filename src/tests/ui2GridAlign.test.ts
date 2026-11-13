import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: a grid's justify-items and align-content", () => {
	const boxes = (css: string, html: string, qs: string[]) => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 600 });
		r.addStyleSheet(`body { margin: 0; } ${css}`);
		r.document.body.innerHTML = html;
		r.update(0);
		return qs.map((q) => {
			const b = r.document.querySelector(q)!.getBoundingClientRect();
			return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 10) / 10);
		});
	};

	it("justify-items: center keeps items to their content's width, in the middle (no justify-self given)", () => {
		const [lbl] = boxes(".g { display: grid; justify-items: center; width: 220px; }", `<div class="g"><div class="l">HAZARD</div></div>`, [".l"]);
		expect(lbl[2]).toBeLessThan(220);
		expect(lbl[0]).toBeCloseTo((220 - lbl[2]) / 2, 1);
	});

	it("align-content: space-between spreads the rows of a grid taller than they are", () => {
		const [a, b, c] = boxes(".g { display: grid; align-content: space-between; gap: 10px; height: 500px; } .r { height: 100px; }", `<div class="g"><div class="r a"></div><div class="r b"></div><div class="r c"></div></div>`, [".a", ".b", ".c"]);
		expect([a[1], b[1], c[1]]).toEqual([0, 200, 400]);
	});

	it("align-content: center and end move them", () => {
		const [m] = boxes(".g { display: grid; align-content: center; height: 300px; } .r { height: 100px; }", `<div class="g"><div class="r m"></div></div>`, [".m"]);
		expect(m[1]).toBe(100);
		const [e] = boxes(".g { display: grid; align-content: end; height: 300px; } .r { height: 100px; }", `<div class="g"><div class="r e"></div></div>`, [".e"]);
		expect(e[1]).toBe(200);
	});
});
