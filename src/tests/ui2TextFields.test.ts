/**
 * ui2's text fields as a browser's: a value set by code, maxlength, the window's focus going and coming back, a
 * press placing the caret (a drag selecting, a double press a word, a triple all of it), and the selection's numbers.
 */
import { igeUiHeadlessHost, type IgeUiTextEntryEvents, type IgeUiTextEntryField } from "@/engine/ui2/IgeUiHost";
import { IgeUiRoot } from "@/engine/ui2/IgeUiRoot";
import { webUiHost } from "@/engine/ui2/IgeUiWebHost";
import type { IgeUiElement } from "@/engine/ui2/dom/IgeUiDom";

/** A headless UI with fixed-width fonts (10px: a letter's 5px), a field at the top left: its text from x 3 (border 1, padding 2). */
function ui (markup: string) {
	const host = igeUiHeadlessHost({ width: 800, height: 600 });
	const r = new IgeUiRoot({ host, width: 800, height: 600 });
	r.addStyleSheet("body { margin: 0; font-size: 10px; line-height: 1; } input { width: 200px; height: 14px; padding: 2px; border: 1px solid #000; font: inherit; }");
	r.document.body.innerHTML = markup;
	r.update(0);
	return { r, host, f: r.document.querySelector("input")! };
}

const sel = (f: IgeUiElement) => [f.selectionStart, f.selectionEnd];

describe("ui2 text fields, as a browser's", () => {
	it("the selection's a number from the start (null on a checkbox); set past the end, or backwards, as a browser keeps it", () => {
		const { r, f } = ui(`<input value="hello"><input type="checkbox">`);
		const box = r.document.querySelectorAll("input")[1];
		expect(sel(f)).toEqual([0, 0]);
		expect(box.selectionStart).toBe(null);
		// Focused by code: where it was (the start), as numbers at once
		r.focus(f);
		expect(sel(f)).toEqual([0, 0]);
		f.selectionStart = 9;
		expect(sel(f)).toEqual([5, 5]);
		f.setSelectionRange(1, 3);
		f.selectionEnd = 0;
		expect(sel(f)).toEqual([0, 0]);
		f.setSelectionRange(4, 2);
		expect(sel(f)).toEqual([2, 2]);
	});

	it("a value set by code puts the caret at its end (the same value leaves it), and the typing is given it", () => {
		const { r, host, f } = ui(`<input value="127.0.0.1:1">`);
		r.focus(f);
		f.setSelectionRange(3, 3);
		f.value = "127.0.0.1:1";
		expect(sel(f)).toEqual([3, 3]);
		f.value = "ws://127.0.0.1:1/sync";
		expect(sel(f)).toEqual([21, 21]);
		// The host's text input reads the field as it is now (the web host's hidden input takes this value and caret)
		expect(host.typing?.field.value).toBe("ws://127.0.0.1:1/sync");
		expect([host.typing?.field.selectionStart, host.typing?.field.selectionEnd]).toEqual([21, 21]);
		// Typed on from there, then cleared by code (the market's Esc) and typed into again
		host.typing!.events.input("ws://127.0.0.1:1/syncx");
		host.typing!.events.selection(22, 22);
		f.value = "";
		expect(host.typing?.field.value).toBe("");
		host.typing!.events.input("i");
		expect(f.value).toBe("i");
	});

	it("maxlength: what's pasted or composed past it is cut where it went in, the caret after it", () => {
		const { r, host, f } = ui(`<input maxlength="7" value="Bo">`);
		r.focus(f);
		f.setSelectionRange(2, 2);
		expect(host.typing?.field.maxLength).toBe(7);
		// (A host that let it through: " Vance" pasted after "Bo")
		host.typing!.events.input("Bo Vance");
		expect(f.value).toBe("Bo Vanc");
		expect(sel(f)).toEqual([7, 7]);
		// In the middle: "XYZ" pasted between "Bo" and " Va" of "Bo Va" (two places left)
		f.value = "Bo Va";
		f.setSelectionRange(2, 2);
		host.typing!.events.input("BoXYZ Va");
		expect(f.value).toBe("BoXY Va");
		expect(sel(f)).toEqual([4, 4]);
		// No maxlength (or not a number): -1, nothing cut
		const other = ui(`<input maxlength="x">`);
		other.r.focus(other.f);
		expect(other.host.typing?.field.maxLength).toBe(-1);
		other.host.typing!.events.input("a long name typed in");
		expect(other.f.value).toBe("a long name typed in");
	});

	it("a press in the text puts the caret at the character pressed; a drag selects; a double press a word, a triple all of it", () => {
		const { r, f } = ui(`<input value="Rob Vance">`);
		let t = 1000;
		const at = (type: "pointerdown" | "pointermove" | "pointerup", x: number, dt = 0) => {
			t += dt;
			r.input({ type, clientX: x, clientY: 8, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, timeStamp: t });
		};
		// Boundaries at 3, 8, 13, 18 ... (5px a letter): x 10 is nearest the one after "R"
		at("pointerdown", 10);
		expect(r.document.activeElement).toBe(f);
		expect(sel(f)).toEqual([1, 1]);
		// Held and dragged to x 17: from after "R" to after "Rob"
		at("pointermove", 17, 50);
		expect(sel(f)).toEqual([1, 3]);
		// Back past where it went down: the other way
		at("pointermove", 2, 50);
		expect(sel(f)).toEqual([0, 1]);
		at("pointerup", 2, 50);
		// Later, twice at once over "Vance" (x 30: its "a"): the word
		at("pointerdown", 30, 1000);
		at("pointerup", 30, 30);
		at("pointerdown", 30, 60);
		expect(sel(f)).toEqual([4, 9]);
		at("pointerup", 30, 30);
		// A third time: all of it
		at("pointerdown", 30, 60);
		expect(sel(f)).toEqual([0, 9]);
		at("pointerup", 30, 30);
	});

	it("the web host: the hidden input takes the field's maxlength and its value set by code; the window losing the focus keeps the field's", async () => {
		const restore = fakePage();
		try {
			const page = (globalThis as unknown as { document: FakeDocument }).document;
			const te = webUiHost().textEntry;
			const blurred: string[] = [];
			let value = "Bo", start = 2, end = 2;
			const events: IgeUiTextEntryEvents = {
				input: (v) => (value = v),
				change: () => undefined,
				key: () => false,
				selection: (s, e) => {
					start = s ?? 0;
					end = e ?? 0;
				},
				blur: () => blurred.push("blur"),
				composition: () => undefined
			};
			const el = {} as IgeUiElement;
			const field = (maxLength: number): IgeUiTextEntryField => ({
				el,
				get value () {
					return value;
				},
				get selectionStart () {
					return start;
				},
				get selectionEnd () {
					return end;
				},
				type: "text",
				maxLength,
				rect: () => ({ x: 0, y: 0, w: 100, h: 20 })
			});
			te.focus(field(7), events);
			const input = page.activeElement as FakeInput;
			expect(input.maxLength).toBe(7);
			expect([input.value, input.selectionStart]).toEqual(["Bo", 2]);
			// A value set by code (the root focuses the typing again): the input takes it and the caret at its end
			value = "";
			start = end = 0;
			te.focus(field(-1), events);
			expect(input.value).toBe("");
			expect(input.maxLength).toBe(-1);
			// The window loses the system's focus: the input's blurred, but the page (and the UI) keeps its focused element
			page.focused = false;
			input.blur();
			await new Promise((r) => setTimeout(r, 5));
			expect(blurred).toEqual([]);
			// A press somewhere else on the page (the window still focused): the field's focus goes
			page.focused = true;
			input.focus();
			input.blur();
			await new Promise((r) => setTimeout(r, 5));
			expect(blurred).toEqual(["blur"]);
		} finally {
			restore();
		}
	});
});

// ---------------------------------------------------------------- a page just big enough for the web host's text input

class FakeInput {
	value = "";
	type = "text";
	style: Record<string, string> = {};
	selectionStart = 0;
	selectionEnd = 0;
	_max = -1;
	_on = new Map<string, (() => void)[]>();
	constructor (readonly doc: FakeDocument) {}
	get maxLength (): number {
		return this._max;
	}
	set maxLength (v: number) {
		if (v < 0) throw new Error("IndexSizeError");
		this._max = v;
	}
	removeAttribute (name: string): void {
		if (name === "maxlength") this._max = -1;
	}
	setAttribute (): void {}
	addEventListener (type: string, fn: () => void): void {
		this._on.set(type, [...(this._on.get(type) ?? []), fn]);
	}
	setSelectionRange (s: number, e: number): void {
		this.selectionStart = s;
		this.selectionEnd = e;
	}
	focus (): void {
		this.doc.activeElement = this;
	}
	blur (): void {
		if (this.doc.activeElement === this) this.doc.activeElement = this.doc.body;
		for (const fn of this._on.get("blur") ?? []) fn();
	}
}

class FakeDocument {
	focused = true;
	body = { appendChild: () => undefined };
	activeElement: unknown = this.body;
	createElement (): FakeInput {
		return new FakeInput(this);
	}
	addEventListener (): void {}
	hasFocus (): boolean {
		return this.focused;
	}
}

/** A stand-in `document` for the web host (none in Node); the function puts things back. */
function fakePage (): () => void {
	const g = globalThis as unknown as { document?: unknown };
	const had = "document" in g, was = g.document;
	g.document = new FakeDocument();
	return () => {
		if (had) g.document = was;
		else delete g.document;
	};
}
