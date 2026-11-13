import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

function ui (): IgeUiRoot {
	const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
	r.addStyleSheet("body { margin: 0; font-size: 10px; } .a, .t, .u { width: 100px; height: 40px; } .a { background: #f00; }");
	r.document.body.innerHTML = `<div class="a" draggable="true"><span>drag me</span></div><div class="t"></div><div class="u"></div>`;
	r.update();
	return r;
}

/** A page pointer event as the UI's input sees it. */
const pe = (x: number, y: number, buttons = 1) => ({ clientX: x, clientY: y, button: 0, buttons, pointerId: 1, pointerType: "mouse", timeStamp: 0, detail: 0, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, stopImmediatePropagation () {}, preventDefault () {} }) as unknown as PointerEvent;

describe("ui2: drag and drop", () => {
	it("press and move a draggable: dragstart (the press cancelled), then dragenter/dragover where it is (entering the next before leaving the last, as the standard has it); a drop where dragover was cancelled; dragend; no click", () => {
		const r = ui();
		const log: string[] = [];
		const a = r.document.querySelector(".a")!, t = r.document.querySelector(".t")!;
		for (const type of ["dragstart", "dragenter", "dragleave", "dragover", "drop", "dragend", "click", "pointercancel"]) {
			r.document.body.addEventListener(type, (e) => log.push(`${type}:${(e.target as unknown as { className: string }).className || (e.target as unknown as { localName: string }).localName}`));
		}
		a.addEventListener("dragstart", (e) => (e as unknown as { dataTransfer: { setData (t: string, v: string): void; effectAllowed: string } }).dataTransfer.setData("text/plain", "A"));
		t.addEventListener("dragover", (e) => e.preventDefault());
		let got = "";
		t.addEventListener("drop", (e) => {
			e.preventDefault();
			got = (e as unknown as { dataTransfer: { getData (t: string): string } }).dataTransfer.getData("text");
		});
		r._pointer("pointerdown", pe(10, 10));
		// (Under the threshold: still a press)
		r._pointer("pointermove", pe(12, 11));
		expect(log.filter((l) => l.startsWith("drag"))).toEqual([]);
		r._pointer("pointermove", pe(20, 20));
		expect(r.drag.active).toBe(true);
		r._pointer("pointermove", pe(20, 60));
		r._pointer("pointerup", pe(20, 60, 0));
		expect(got).toBe("A");
		expect(log.filter((l) => !l.startsWith("dragover"))).toEqual(["dragstart:a", "pointercancel:span", "dragenter:a", "dragenter:t", "dragleave:a", "drop:t", "dragend:a"]);
		expect(log).not.toContain("click:a");
		expect(r.drag.active).toBe(false);
	});

	it("dropped where nothing takes it: dragleave and dragend, no drop; Escape gives up; a cancelled dragstart leaves a press", () => {
		const r = ui();
		const log: string[] = [];
		for (const type of ["dragstart", "dragleave", "drop", "dragend", "click"]) r.document.body.addEventListener(type, () => log.push(type));
		r._pointer("pointerdown", pe(10, 10));
		r._pointer("pointermove", pe(20, 90));
		r._pointer("pointerup", pe(20, 90, 0));
		expect(log).toEqual(["dragstart", "dragleave", "dragend"]);
		log.length = 0;
		r._pointer("pointerdown", pe(10, 10));
		r._pointer("pointermove", pe(20, 50));
		r._key("keydown", { key: "Escape", code: "Escape", preventDefault () {}, stopImmediatePropagation () {} } as unknown as KeyboardEvent);
		expect(log).toEqual(["dragstart", "dragleave", "dragend"]);
		expect(r.drag.active).toBe(false);
		log.length = 0;
		r.document.querySelector(".a")!.addEventListener("dragstart", (e) => e.preventDefault());
		r._pointer("pointerdown", pe(10, 10));
		r._pointer("pointermove", pe(30, 10));
		r._pointer("pointerup", pe(30, 10, 0));
		expect(log).toEqual(["dragstart", "click"]);
	});

	it("draws a see-through copy of what's dragged under the pointer", () => {
		const r = ui();
		r._pointer("pointerdown", pe(10, 10));
		r._pointer("pointermove", pe(110, 210));
		const drawn = r.drag.withGhost(r.items);
		const copy = drawn.slice(r.items.length);
		expect(copy.length).toBeGreaterThan(0);
		const box = copy.find((i) => i.op === "box")!;
		expect(box.matrix).toEqual([1, 0, 0, 1, 100, 200]);
		expect(box.opacity).toBeCloseTo(0.6);
		r._pointer("pointerup", pe(110, 210, 0));
		expect(r.drag.withGhost(r.items)).toBe(r.items);
	});
});
