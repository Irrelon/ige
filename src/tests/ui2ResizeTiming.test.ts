/**
 * Resize observers are told at the frame's step, as a browser's are: a layout a measurement forces mid-frame doesn't
 * tell them; the next frame does, once.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: when resize observers are told", () => {
	it("at the frame's step, not on a forced layout", async () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.addStyleSheet(`body { margin: 0; } .b { width: 100px; height: 10px; }`);
		r.root.innerHTML = `<div class="b"></div>`;
		r.update(0);
		const b = r.root.querySelector(".b")!;
		const seen: number[] = [];
		const RO = r.document.defaultView!.ResizeObserver;
		new RO((entries: { contentRect: { width: number } }[]) => seen.push(entries[0].contentRect.width)).observe(b as never);
		r.update(16);
		await Promise.resolve();
		expect(seen).toEqual([100]);
		b.style.width = "150px";
		// (Measured mid-frame: laid out now, observers not told)
		expect(b.offsetWidth).toBe(150);
		await Promise.resolve();
		expect(seen).toEqual([100]);
		r.update(32);
		await Promise.resolve();
		expect(seen).toEqual([100, 150]);
		r.update(48);
		await Promise.resolve();
		expect(seen).toEqual([100, 150]);
	});
});
