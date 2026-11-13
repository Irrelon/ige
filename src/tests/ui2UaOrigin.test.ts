import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: the user agent's styles under the page's", () => {
	it("a page's rule beats a more specific default (a disabled button's grey)", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 200, height: 100 });
		r.addStyleSheet(".chip { background: none; color: gold; }");
		r.document.body.innerHTML = `<button class="chip" disabled>5</button><button disabled>6</button>`;
		const [a, b] = [...r.document.querySelectorAll("button")].map((e) => r.document.defaultView!.getComputedStyle(e));
		expect(a.backgroundColor).toBe("rgba(0, 0, 0, 0)");
		expect(a.color).toBe("rgb(255, 215, 0)");
		// (And the default where the page says nothing)
		expect(b.backgroundColor).toBe("rgba(239, 239, 239, 0.3)");
	});
});
