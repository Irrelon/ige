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
