import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiDropShadowPass, type IgeUiShadowGroup, type IgeUiShadowHost, shadowStep } from "@/engine/ui2/render/IgeUiDropShadow";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** Just enough of a host for packing: textures sized as asked, framebuffers that are nothing. */
function host (): IgeUiShadowHost {
	const gl = { FRAMEBUFFER: 0, COLOR_ATTACHMENT0: 0, TEXTURE_2D: 0, createFramebuffer: () => ({}), bindFramebuffer () {}, framebufferTexture2D () {} };
	return { gl, _tex: (have: unknown, w: number, h: number) => ({ tex: {}, w, h }) } as unknown as IgeUiShadowHost;
}

const group = (blur: number, w: number, h: number): IgeUiShadowGroup => ({
	shadows: [{ x: 0, y: 2, blur, color: { r: 0, g: 0, b: 0, a: 0.4 } }], from: 0, to: 0, start: 0, end: 0, clip: [], composites: [], region: { x: 0, y: 0, w, h }
});

describe("ui2: the drop shadows' atlas", () => {
	it("groups with alike blurs share a band, blurred in one draw a pass; each far enough from the next that none bleeds into it", () => {
		const pass = new IgeUiDropShadowPass();
		// (A reel's symbols' soft shadows, a line's glow, another symbol: in any order)
		const groups = [group(2, 60, 60), group(12, 300, 40), group(2, 60, 60), group(2, 60, 60)];
		pass.packAtlas(host(), groups, null, 2);
		expect(pass.bands.map((b) => b.sigma)).toEqual([2, 12]);
		const [a, b] = pass.bands;
		// The bands' rows apart
		expect(a.y1).toBeLessThanOrEqual(b.y0);
		const inBand = (g: IgeUiShadowGroup, band: typeof a) => g.atlas![1] >= band.y0 && g.atlas![1] + g.region!.h <= band.y1 && g.atlas![0] + g.region!.w <= band.w;
		for (const g of [groups[0], groups[2], groups[3]]) expect(inBand(g, a)).toBe(true);
		expect(inBand(groups[1], b)).toBe(true);
		// Neighbours in a band: two texels and two of the blur's coarse reads between them
		const xs = [groups[0], groups[2], groups[3]].map((g) => g.atlas![0]).sort((p, q) => p - q);
		for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBe(60 + 2 + 2 * shadowStep(2));
	});
});

describe("ui2: an anonymous box's effects", () => {
	it("text beside a block, in an element faded and shadowed: faded and shadowed once, with the element (not again by its anonymous box)", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.addStyleSheet("body { margin: 0; font-size: 10px; } .p { opacity: 0.5; filter: drop-shadow(0 2px 2px black); overflow: hidden; border-radius: 8px; }");
		r.document.body.innerHTML = `<div class="p"><div>block</div>text</div>`;
		r.update(0);
		const texts = r.items.filter((i) => i.op === "text") as { text: string; opacity: number; clip: unknown }[];
		expect(texts.map((t) => t.opacity)).toEqual([0.5, 0.5]);
		expect(r.items.filter((i) => i.op === "group" && i.open).length).toBe(1);
		// (Clipped by the element round it, not again by its anonymous box)
		expect(texts[1].clip).toEqual(texts[0].clip);
	});
});
