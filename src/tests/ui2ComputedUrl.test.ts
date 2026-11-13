import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: a url() in a computed style", () => {
	it("is made whole against the page, as Chrome gives it; a data URL stays as it is", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 200, height: 100 });
		r.addStyleSheet(`.a { background: url("/img/felt.png"), linear-gradient(red, blue); } .b { background-image: url("data:image/png;base64,AAAA"); }`);
		r.document.body.innerHTML = `<div class="a"></div><div class="b"></div>`;
		const v = r.document.defaultView!;
		// (The page's address, as a browser has it)
		(globalThis as { document?: unknown }).document = { baseURI: "http://127.0.0.1:5246/uifixture.html" };
		try {
			expect(v.getComputedStyle(r.document.querySelector(".a")!).backgroundImage).toBe(`url("http://127.0.0.1:5246/img/felt.png"), linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))`);
			expect(v.getComputedStyle(r.document.querySelector(".b")!).backgroundImage).toBe(`url("data:image/png;base64,AAAA")`);
		} finally {
			delete (globalThis as { document?: unknown }).document;
		}
	});
});
