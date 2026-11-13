/**
 * ui2's look tunings, all off by default: the game's own scrollbars (one width and colour wherever there's a
 * scrollbar, whatever the CSS says) and back to the CSS's; the text and backdrop tunings start as a browser has them.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: the look's tunings", () => {
	it("start off; gameScrollbars sets every scrollbar's width and colours, null puts the CSS's back", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		expect(r.look).toEqual({ textWeight: 0, textGamma: 1, textMinSize: 0, backdrop: "panel" });
		r.addStyleSheet(`body { margin: 0; } .s { height: 50px; overflow-y: auto; } .s > div { height: 30px; } .thin { scrollbar-width: thin; }`);
		r.root.innerHTML = `<div class="s"><div></div><div></div><div></div></div><div class="s thin"><div></div><div></div></div>`;
		const [s, thin] = r.root.querySelectorAll(".s");
		r.update(0);
		expect([s.clientWidth, thin.clientWidth]).toEqual([385, 389]);
		r.gameScrollbars({ width: 6, thumb: "rgba(95, 227, 255, 0.55)", track: "rgba(95, 227, 255, 0.06)" });
		r.update(16);
		expect([s.clientWidth, thin.clientWidth]).toEqual([394, 394]);
		const bars = describePaint(r.items).filter((l) => l.startsWith("box") && /rgba\(95,227,255/.test(l));
		// (A track and a thumb for each, in the game's colours)
		expect(bars).toHaveLength(4);
		r.gameScrollbars(null);
		r.update(32);
		expect([s.clientWidth, thin.clientWidth]).toEqual([385, 389]);
		expect(describePaint(r.items).some((l) => /rgba\(95,227,255/.test(l))).toBe(false);
	});
});
