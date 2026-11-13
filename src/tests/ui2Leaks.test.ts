/**
 * ui2 lets go of what a redraw drops: elements innerHTML replaced, and their boxes, are garbage once they're gone
 * (nothing in the root, its layout, its painter or its caches holds them), checked with the engine's own garbage
 * collector. An element innerHTML makes just like the one it replaced takes that one's computed style over (the same
 * object), so a style outlives the element it was worked out for: anything keyed by style that holds a box (and through
 * it the element and its tree) is a leak this finds.
 */
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

/** A full garbage collection, now (V8's own, exposed for the test). */
function collect (): void {
	setFlagsFromString("--expose_gc");
	const gc = runInNewContext("gc") as () => void;
	gc();
	gc();
}

/** A market-like table in a size container (its cells sized in cq units), redrawn `ticks` times; the elements each redraw dropped that are still alive. */
async function redraw (rows: (n: number) => string, ticks: number): Promise<{ kept: number; dropped: number; root: IgeUiRoot }> {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet(`body { margin: 0; font: 10px sans-serif; } .c { container-type: inline-size; width: 300px; } .c td { width: 10cqw; padding: 0; } .list { height: 80px; overflow-y: auto; }`);
	r.root.innerHTML = `<div class="c"><div class="list"><table></table></div></div>`;
	const table = r.root.querySelector("table")!;
	// (Helpers, so no element is left in a variable of this async function's frame, which would hold it)
	const draw = (n: number) => {
		table.innerHTML = rows(n);
		r.update(n * 16);
		// The game's own click handlers on what it drew (an element with listeners isn't kept by the next innerHTML)
		for (const el of r.root.querySelectorAll("tr, button")) el.addEventListener("click", () => undefined);
	};
	const watch = () => r.root.querySelectorAll("tr, button").map((el) => new WeakRef(el as object));
	draw(0);
	const dropped: WeakRef<object>[] = [];
	for (let n = 1; n <= ticks; n++) {
		dropped.push(...watch());
		draw(n);
	}
	const alive = () => dropped.filter((w) => {
		const el = w.deref() as { isConnected?: boolean } | undefined;
		return el && !el.isConnected;
	}).length;
	// (Rounds of a task later (a WeakRef's target is held to the end of the task that made it) and a full collection,
	// until they're gone: one sometimes isn't enough for what was let go, while what a leak holds stays through them all)
	let kept = dropped.length;
	for (let round = 0; round < 10 && kept > 0; round++) {
		await new Promise((res) => setTimeout(res, 0));
		collect();
		kept = alive();
	}
	return { kept, dropped: dropped.length, root: r };
}

describe("ui2: what a redraw drops is let go", () => {
	it("rows redrawn just as they were (each new element taking the old one's style over) are collected", async () => {
		const { kept, dropped, root } = await redraw(() => Array.from({ length: 12 }, (_, i) => `<tr class="r"><td>${i}</td><td>${i * 7} cr</td><td><button>Buy</button></td></tr>`).join(""), 6);
		expect(dropped).toBe(6 * 24);
		expect(kept).toBe(0);
		// cq units still resolve against the container
		expect(root.root.querySelector("td")!.getBoundingClientRect().width).toBeCloseTo(30, 0);
	});

	it("rows redrawn with new prices, more or fewer of them, are collected", async () => {
		const { kept, root } = await redraw((n) => Array.from({ length: 12 - (n % 3) * 3 }, (_, i) => `<tr class="r${i % 2}"><td>${i}</td><td>${n * 7 + i} cr</td><td><button>Buy</button></td></tr>`).join(""), 6);
		expect(kept).toBe(0);
		expect(root.root.querySelector("td")!.getBoundingClientRect().width).toBeCloseTo(30, 0);
	});
});
