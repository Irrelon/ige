import { cssUnescape } from "@/engine/ui2/css/IgeCssSelector";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: CSS escapes in selectors", () => {
	it("unescapes hex and character escapes", () => {
		expect(cssUnescape("\\31 0")).toBe("10");
		expect(cssUnescape("a\\:b")).toBe("a:b");
		expect(cssUnescape("plain")).toBe("plain");
	});

	it("attribute values, ids and classes written by CSS.escape() find their elements", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.document.body.innerHTML = `<g data-hp="1"><i class="dot"></i></g><b id="10" class="a:b"></b>`;
		expect(r.document.querySelector(`[data-hp="\\31 "] .dot`)).not.toBeNull();
		expect(r.document.querySelector("#\\31 0")?.localName).toBe("b");
		expect(r.document.querySelector(".a\\:b")?.localName).toBe("b");
	});
});

describe("ui2: computed colours", () => {
	it("a color-mix() in srgb is written as Chrome writes it: color(srgb r g b / a)", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.addStyleSheet(".a { --accent: #ff7a5c; background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%); color: color-mix(in srgb, #ff7a5c 50%, #000000); }");
		r.document.body.innerHTML = `<div class="a"></div>`;
		r.update();
		const cs = r.document.defaultView!.getComputedStyle(r.document.querySelector(".a")!);
		expect(cs.backgroundImage).toBe("radial-gradient(circle at 50% 35%, color(srgb 1 0.478431 0.360784 / 0.22), rgba(0, 0, 0, 0) 70%)");
		expect(cs.color).toBe("color(srgb 0.5 0.239216 0.180392)");
	});
});
