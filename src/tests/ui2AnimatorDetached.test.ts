import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (css: string): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; font-size: 10px; } ${css}`);
	return r;
}

describe("ui2 animator: elements out of the document", () => {
	it("a dropped element with an endless animation leaves the animator (and the tree it was dropped with goes)", () => {
		const r = ui(`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .s { width: 20px; height: 20px; animation: spin 1s linear infinite; }`);
		r.root.innerHTML = `<div class="panel"><div class="felt"><div class="s"></div></div></div>`;
		r.update(0);
		const s = r.root.querySelector(".s")!;
		expect(r.animator.active.has(s)).toBe(true);
		// Redrawn: the old felt (and its spinner) dropped
		r.root.querySelector(".panel")!.innerHTML = `<div class="felt2"></div>`;
		r.update(16);
		r.update(32);
		expect(s.isConnected).toBe(false);
		expect(r.animator.active.has(s)).toBe(false);
		expect([...r.animator.active].every((el) => el.isConnected)).toBe(true);
	});

	it("put back, its animation starts again from the beginning, as a browser's does", () => {
		const r = ui(`@keyframes fade { from { opacity: 0; } to { opacity: 1; } } .f { animation: fade 1000ms linear infinite; }`);
		r.root.innerHTML = `<div class="a"><div class="f"></div></div><div class="b"></div>`;
		r.update(0);
		const f = r.root.querySelector(".f")!;
		r.update(500);
		expect(Number(f._computed?.opacity)).toBeCloseTo(0.5, 1);
		f.remove();
		r.update(600);
		expect(r.animator.active.has(f)).toBe(false);
		r.root.querySelector(".b")!.appendChild(f);
		r.update(700);
		expect(r.animator.active.has(f)).toBe(true);
		r.update(950);
		expect(Number(f._computed?.opacity)).toBeCloseTo(0.25, 1);
	});
});
