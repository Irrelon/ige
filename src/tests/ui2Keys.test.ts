/**
 * ui2's keys reach the page as a browser's do: a key typed into a focused text field isn't kept from the window's
 * listeners (the game's own handlers see it aimed at a field and leave it alone); only what the field's handlers
 * cancelled is cancelled. Another form control's keys (a slider's) are kept from the page: nothing there stands in for it.
 */
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { IgeUiFixedFonts } from "@/engine/ui2/text/IgeUiFonts";

describe("ui2: keys while a text field has the focus", () => {
	it("aren't stopped (the page's listeners hear them); what the field's handler cancelled is cancelled", () => {
		const r = new IgeUiRoot({ fonts: new IgeUiFixedFonts(), width: 400, height: 300 });
		r.root.innerHTML = `<input class="name" type="text"><textarea class="chat"></textarea><button>Go</button><input class="vol" type="range">`;
		r.update(0);
		const name = r.root.querySelector(".name")!;
		const heard: string[] = [];
		name.addEventListener("keydown", (e) => {
			heard.push((e as unknown as KeyboardEvent).key);
			if ((e as unknown as KeyboardEvent).key === "Enter") e.preventDefault();
		});
		name.focus();
		expect(r.input({ type: "keydown", key: "m", code: "KeyM" })).toEqual({ stop: false, prevent: false });
		expect(r.input({ type: "keyup", key: "m", code: "KeyM" })).toEqual({ stop: false, prevent: false });
		expect(r.input({ type: "keydown", key: "Enter", code: "Enter" })).toEqual({ stop: false, prevent: true });
		expect(heard).toEqual(["m", "Enter"]);
		r.root.querySelector(".chat")!.focus();
		expect(r.input({ type: "keydown", key: " ", code: "Space" })).toEqual({ stop: false, prevent: false });
		// (A button, as before: its keys go on to the page too)
		r.root.querySelector("button")!.focus();
		expect(r.input({ type: "keydown", key: "i", code: "KeyI" }).stop).toBe(false);
		// (A slider keeps its keys: nothing on the page stands in for it, so the game couldn't tell they were aimed at a field)
		r.root.querySelector(".vol")!.focus();
		expect(r.input({ type: "keydown", key: "ArrowLeft", code: "ArrowLeft" }).stop).toBe(true);
	});
});
