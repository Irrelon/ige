import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";
import { igeUiCursor, igeUiWebCursorHost } from "@/engine/ui2/input/IgeUiCursor";

/** A page pointer event as the UI's input sees it. */
const pe = (x: number, y: number) => ({ clientX: x, clientY: y, button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", timeStamp: 0, detail: 0, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, stopImmediatePropagation () {}, preventDefault () {} }) as unknown as PointerEvent;

describe("ui2: the cursor", () => {
	it("is what's under the pointer wants: a button's pointer (its text's too, inherited), a field's text, auto and off the UI the platform's own; a change under a still pointer follows it", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.addStyleSheet("body { margin: 0; font-size: 10px; } div { width: 100px; height: 40px; } .b { cursor: pointer; } .f { cursor: text; }");
		r.document.body.innerHTML = `<div class="b"><span>press</span></div><div class="f"></div><div class="plain"></div>`;
		r.update();
		const canvas = { style: { cursor: "" } };
		const shown: string[] = [];
		const web = igeUiWebCursorHost(canvas);
		const stop = igeUiCursor(r, { cursor: (name) => {
			shown.push(name);
			web.cursor(name);
		} });
		r._pointer("pointermove", pe(5, 5));
		expect(canvas.style.cursor).toBe("pointer");
		r._pointer("pointermove", pe(5, 50));
		expect(canvas.style.cursor).toBe("text");
		r._pointer("pointermove", pe(5, 90));
		expect(canvas.style.cursor).toBe("");
		// (A screen changes the cursor of what's pointed at, the pointer moving on over it)
		const plain = r.document.querySelector(".plain")!;
		plain.style.cursor = "crosshair";
		r.update();
		r._pointer("pointermove", pe(6, 91));
		expect(canvas.style.cursor).toBe("crosshair");
		// Off everything (the page under it)
		r._pointer("pointermove", pe(5, 250));
		expect(canvas.style.cursor).toBe("");
		r._pointer("pointermove", pe(5, 5));
		stop();
		expect(canvas.style.cursor).toBe("");
		// (Told only when it changes)
		expect(shown).toEqual(["pointer", "text", "", "crosshair", "", "pointer", ""]);
	});
});
