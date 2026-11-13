import { expandShorthand } from "@/engine/ui2/style/IgeUiProperties";

const font = (v: string) => Object.fromEntries(expandShorthand("font", v) ?? []);

describe("ui2: the font shorthand", () => {
	it("weight, size and family", () => {
		expect(font('600 16px "Exo 2", sans-serif')).toMatchObject({ "font-weight": "600", "font-size": "16px", "font-family": '"Exo 2", sans-serif', "line-height": "normal" });
	});

	it("a size with nested functions stays one word (a roulette number's calc(clamp(…) * 0.36))", () => {
		expect(font('600 calc(clamp(30px, calc(3.55 * 1cqw), 50px) * 0.36) "Exo 2", sans-serif')).toMatchObject({ "font-weight": "600", "font-size": "calc(clamp(30px, calc(3.55 * 1cqw), 50px) * 0.36)", "font-family": '"Exo 2", sans-serif' });
	});

	it("style and line height, written together or apart", () => {
		expect(font("italic bold 12px/1.4 monospace")).toMatchObject({ "font-style": "italic", "font-weight": "bold", "font-size": "12px", "line-height": "1.4", "font-family": "monospace" });
		expect(font("700 14px / 20px var(--font-mono)")).toMatchObject({ "font-size": "14px", "line-height": "20px", "font-family": "var(--font-mono)" });
	});
});
