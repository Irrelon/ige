/**
 * The engine's UI at other scales, as Chrome's zoomed page UI is: @container queries with and, not and parentheses;
 * an image's content size from its set height or max-height by its proportion; scrollbars in screen pixels at any
 * scale; borders on whole device pixels at a fractional scale; images asked for as their src is set.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { describePaint } from "@/engine/ui2/render/IgeUiPaint";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string, html: string, w = 1280, h = 720, scale = 1): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: w, height: h });
	if (scale !== 1) r.resize(w, h, scale);
	r.addStyleSheet(`body { margin: 0; } ${css}`);
	r.root.innerHTML = html;
	r.update(0);
	return r;
}
const width = (r: IgeUiRoot, sel: string) => r.root.querySelector(sel)!.getBoundingClientRect().width;

describe("ui2 at other scales", () => {
	it("@container queries join tests with and, or, not and parentheses, and read the range syntax", () => {
		const css = `.c { container-type: size; width: 800px; height: 600px; } .t { width: 1px; height: 1px; }
			@container (max-width: 900px) and (min-height: 561px) { .a { width: 10px; } }
			@container (max-width: 900px) and (min-height: 700px) { .b { width: 10px; } }
			@container not (min-width: 1000px) { .n { width: 10px; } }
			@container ((width > 700px) and (height < 650px)) or (width < 10px) { .p { width: 10px; } }
			@container (500px <= width <= 799px) { .r { width: 10px; } }
			@container (orientation: landscape) and (aspect-ratio > 1) { .o { width: 10px; } }`;
		const r = ui(css, `<div class="c">${["a", "b", "n", "p", "r", "o"].map((k) => `<div class="t ${k}"></div>`).join("")}</div>`);
		r.update(16);
		expect(["a", "b", "n", "p", "r", "o"].map((k) => width(r, `.${k}`))).toEqual([10, 1, 10, 10, 1, 10]);
	});

	it("an image's content size goes by its set height, or its max-height, in proportion (a flex column round it)", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 1280, height: 720 });
		r.layoutEngine.imageSizes.set("logo.png", { w: 1600, h: 294 });
		r.addStyleSheet(`body { margin: 0; } .col { position: absolute; display: flex; flex-direction: column; align-items: center; } .d { width: 562px; height: 10px; } .b img { height: 75px; width: auto; } .c img { width: auto; height: auto; max-height: 75px; }`);
		r.root.innerHTML = `<div class="col b"><img src="logo.png" width="760" height="140"><div class="d"></div></div><div class="col c" style="top: 200px"><img src="logo.png" width="760" height="140"><div class="d"></div></div>`;
		r.update(0);
		for (const s of [".b", ".c"]) {
			expect(width(r, s)).toBe(562);
			const img = r.root.querySelector(`${s} img`)!.getBoundingClientRect();
			expect([Math.round(img.width), img.height]).toEqual([407, 75]);
		}
	});

	it("scrollbars are screen pixels wide at any scale (15, thin 11), their thumbs too", () => {
		const css = `.s { width: 100px; height: 50px; overflow-y: auto; } .s > div { height: 200px; } .thin { scrollbar-width: thin; }`;
		const r = ui(css, `<div class="s a"><div></div></div><div class="s thin"><div></div></div>`, 1280, 720, 2);
		expect([r.root.querySelector(".a")!.clientWidth, r.root.querySelector(".thin")!.clientWidth]).toEqual([93, 95]);
		// (The classic bar's thumb: 7 screen pixels, 3.5 of the UI's)
		const thumb = describePaint(r.items).find((l) => l.startsWith("box") && l.includes("rgba(193,193,193,1)"))!;
		expect(thumb).toMatch(/ 3\.5x/);
	});

	it("borders on whole device pixels at a fractional scale (2px at 0.8: one device pixel, 1.25px)", () => {
		const r = ui(`.b { border: 2px solid red; height: 10px; }`, `<div class="b"></div>`, 1280, 720, 0.8);
		const b = r.root.querySelector(".b")!;
		expect([b._box!.borderTop, b._box!.borderH]).toEqual([1.25, 12.5]);
		expect(r.document.defaultView!.getComputedStyle(b).borderTopWidth).toBe("1.25px");
	});

	it("an image is asked for as its src is set, or as it's put in, before it's laid out", () => {
		const r = ui("", `<div class="h" style="display: none"></div>`);
		const asked: string[] = [];
		const orig = r.images.request.bind(r.images);
		r.images.request = ((src: string) => {
			asked.push(src);
			return orig(src);
		}) as typeof r.images.request;
		const img = r.document.createElement("img");
		img.setAttribute("src", "a.png");
		r.root.querySelector(".h")!.appendChild(img);
		img.setAttribute("src", "b.png");
		r.root.querySelector(".h")!.innerHTML = `<span><img src="c.png"></span>`;
		// (Asked again is nothing: the images keep what they've asked for)
		expect([...new Set(asked)]).toEqual(["a.png", "b.png", "c.png"]);
	});

	it("a scroller scrolls to its end on the device's pixels, its content's extent less its room, halves rounded up", () => {
		// (At 1.5: 528.33px of content (792.5 device pixels, 793) in 177.33px (266): to 527 device pixels, 351.33, where the
		// rounded scrollHeight less clientHeight said 351. Float error left 792.4999…, a half a browser rounds up)
		const r = ui(`.s { box-sizing: border-box; height: calc(532px / 3); overflow-y: auto; padding-top: 1px; } .s i { display: block; height: calc(226px / 3); }`,
			`<div class="s">${"<i></i>".repeat(7)}</div>`, 1280, 720, 1.5);
		const s = r.root.querySelector(".s")!;
		s.scrollTop = 1e6;
		const end = s.scrollTop;
		// (A reveal's target a hair under a half: 183.6666666666666 is 275.5 device pixels, 276)
		s.scrollTop = 183.6666666666666;
		expect([Math.round(end * 1000) / 1000, s.scrollTop]).toEqual([351.333, 184]);
	});

	it("a round button's corners don't take the pointer: what's under them does, as in Chrome", () => {
		// (The touch controls' action ring at 200%: a finger on the aim zone just off its circle was the ring's)
		const r = ui(`.z { position: fixed; inset: 0; } .b { position: absolute; left: 100px; top: 100px; width: 60px; height: 60px; border-radius: 50%; }`,
			`<div class="z"></div><button class="b"></button>`, 1280, 720, 2);
		const at = (x: number, y: number) => r.hitTest(x * 2, y * 2)?.className;
		// (Its middle, the edge of its circle across, and a corner of its box, outside the circle)
		expect([at(130, 130), at(101, 130), at(104, 104), at(158, 102)]).toEqual(["b", "b", "z", "z"]);
	});
});
