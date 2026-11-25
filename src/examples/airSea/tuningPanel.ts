/**
 * A live tuning panel for the craft being flown or driven (P toggles it): a slider for each of its main figures,
 * applied as it's dragged. Values are in the presets' own units (metres per second, degrees, newtons, seconds), so
 * "Copy JSON" gives a line to paste into the craft's preset in src/engine/physics/IgePhysicsCraft3dPresets.ts. Each
 * craft's tune is kept in this browser (used whenever the example starts); "Reset to preset" forgets it.
 */

export type TuningKind = "plane" | "helicopter" | "boat";
export type Tuning = Record<string, number>;

interface Field {
	key: string;
	label: string;
	/** Min, max and step, from the preset's value. */
	range: (preset: number) => [number, number, number];
	format: (value: number) => string;
}

const kmh = (v: number) => `${Math.round(v * 3.6)} km/h`;
const unit = (suffix: string, decimals = 0) => (v: number) => `${v.toFixed(decimals)} ${suffix}`;
const speed = (p: number): [number, number, number] => [Math.round(p * 0.4 * 10) / 10, Math.round(p * 2 * 10) / 10, 0.1];
const rate = (p: number): [number, number, number] => [Math.max(2, Math.round(p * 0.25)), Math.round(p * 3), 1];
const force = (p: number): [number, number, number] => {
	const step = Math.max(10, Math.round(p / 200 / 10) * 10);
	return [Math.round(p * 0.25 / step) * step, Math.round(p * 3 / step) * step, step];
};

const FIELDS: Record<TuningKind, Field[]> = {
	plane: [
		{ key: "stallSpeed", label: "Stall speed", range: speed, format: kmh },
		{ key: "stallRecovery", label: "Stall recovery", range: () => [0.2, 4, 0.1], format: unit("s", 1) },
		{ key: "pitchRate", label: "Pitch rate", range: rate, format: unit("°/s") },
		{ key: "rollRate", label: "Roll rate", range: rate, format: unit("°/s") },
		{ key: "maxSpeed", label: "Top speed", range: speed, format: kmh },
		{ key: "thrust", label: "Thrust", range: force, format: unit("N") }
	],
	helicopter: [
		{ key: "levelTime", label: "Level time", range: () => [0.1, 2, 0.05], format: unit("s", 2) },
		{ key: "maxTilt", label: "Max tilt", range: () => [10, 60, 1], format: unit("°") },
		{ key: "maxSpeed", label: "Top speed", range: speed, format: kmh }
	],
	boat: [
		{ key: "maxSpeed", label: "Top speed", range: speed, format: kmh },
		{ key: "thrust", label: "Thrust", range: force, format: unit("N") },
		{ key: "turnRate", label: "Turn rate", range: rate, format: unit("°/s") }
	]
};

const STORE = "airSea.tuning.";

export interface TunedCraft {
	/** The preset's name: what a tune is saved and copied under. */
	key: string;
	name: string;
	kind: TuningKind;
	/** The preset's figures, in its own units. */
	preset: Tuning;
	/** The figures in use now. */
	tuning: Tuning;
}

/** The fields a kind of craft has sliders for. */
export function tuningFields (kind: TuningKind): string[] {
	return FIELDS[kind].map((field) => field.key);
}

/** A craft's saved tune in this browser, if any. */
export function savedTuning (key: string): Tuning | undefined {
	try {
		const text = localStorage.getItem(STORE + key);
		return text ? JSON.parse(text) : undefined;
	} catch {
		return undefined;
	}
}

export class TuningPanel {
	root: HTMLElement;
	current: () => TunedCraft | undefined;
	apply: (tuning: Tuning) => void;
	private title: HTMLElement;
	private rows: HTMLElement;
	private note: HTMLElement;
	private inputs = new Map<string, { input: HTMLInputElement; value: HTMLElement; field: Field }>();
	private shown?: string;
	private pending?: ReturnType<typeof setTimeout>;

	constructor (root: HTMLElement, current: () => TunedCraft | undefined, apply: (tuning: Tuning) => void) {
		this.root = root;
		this.current = current;
		this.apply = apply;
		root.innerHTML = "";
		const head = el("div", "head");
		this.title = el("b");
		head.append(this.title, el("span", "muted", "P"));
		this.rows = el("div");
		const buttons = el("div", "row buttons");
		buttons.append(button("Copy JSON", () => this.copy()), button("Reset to preset", () => this.reset()));
		this.note = el("div", "muted note");
		root.append(head, this.rows, buttons, this.note);
		this.refresh();
	}

	visible (): boolean {
		return !this.root.hidden;
	}

	toggle (): void {
		this.root.hidden = !this.root.hidden;
		this.refresh();
	}

	/** Show the current craft's figures (call when the craft changes). */
	refresh (): void {
		const craft = this.current();
		if (!craft || this.root.hidden) return;
		const saved = !!savedTuning(craft.key);
		this.title.textContent = `${craft.name}${saved ? " (your saved tune)" : " (preset)"}`;
		if (this.shown !== craft.key) {
			// A new craft: its own sliders
			this.shown = craft.key;
			this.note.textContent = "";
			this.rows.innerHTML = "";
			this.inputs.clear();
			for (const field of FIELDS[craft.kind]) {
				const row = el("label", "row");
				const input = document.createElement("input");
				input.type = "range";
				const value = el("span", "value");
				input.addEventListener("input", () => {
					value.textContent = field.format(Number(input.value));
					this.schedule();
				});
				// Let go of the slider: the keys fly the craft again
				input.addEventListener("change", () => input.blur());
				row.append(el("span", "label", field.label), input, value);
				this.rows.append(row);
				this.inputs.set(field.key, { input, value, field });
			}
		}
		for (const { input, value, field } of this.inputs.values()) {
			const now = craft.tuning[field.key], preset = craft.preset[field.key];
			const [min, max, step] = field.range(preset);
			input.min = String(Math.min(min, now));
			input.max = String(Math.max(max, now));
			input.step = String(step);
			input.value = String(now);
			value.textContent = field.format(now);
		}
	}

	/** The sliders' values. */
	values (): Tuning {
		const tuning: Tuning = {};
		for (const [key, { input }] of this.inputs) tuning[key] = Number(input.value);
		return tuning;
	}

	private schedule (): void {
		if (this.pending) return;
		// Rebuilding the craft a few times a second is plenty while a slider is dragged
		this.pending = setTimeout(() => {
			this.pending = undefined;
			const craft = this.current();
			if (!craft || craft.key !== this.shown) return;
			const tuning = this.values();
			this.apply(tuning);
			try {
				localStorage.setItem(STORE + craft.key, JSON.stringify(tuning));
				this.note.textContent = "Saved in this browser.";
			} catch {
				this.note.textContent = "Couldn't save (storage blocked).";
			}
			this.title.textContent = `${craft.name} (your saved tune)`;
		}, 120);
	}

	private copy (): void {
		const craft = this.current();
		if (!craft) return;
		const text = `"${craft.key}": ${JSON.stringify(craft.tuning)}`;
		console.log(text);
		// Shown as well, to copy by hand if the browser won't
		const done = () => (this.note.textContent = `Copied: ${text}`);
		const fail = () => (this.note.textContent = text);
		// The clipboard API needs a secure page (https or localhost); served over the network, copy the old way
		if (navigator.clipboard?.writeText && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(done, fail);
			return;
		}
		const area = document.createElement("textarea");
		area.value = text;
		Object.assign(area.style, { position: "fixed", left: "-1000px", top: "0" });
		document.body.append(area);
		area.select();
		let copied = false;
		try {
			copied = document.execCommand("copy");
		} catch {
			copied = false;
		}
		area.remove();
		if (copied) done();
		else fail();
	}

	private reset (): void {
		const craft = this.current();
		if (!craft) return;
		try {
			localStorage.removeItem(STORE + craft.key);
		} catch {
			// Storage blocked: nothing was saved anyway
		}
		this.apply({ ...craft.preset });
		this.refresh();
		this.note.textContent = "Back to the preset.";
	}
}

function el (tag: string, className = "", text = ""): HTMLElement {
	const e = document.createElement(tag);
	if (className) e.className = className;
	if (text) e.textContent = text;
	return e;
}

function button (text: string, onClick: () => void): HTMLButtonElement {
	const b = document.createElement("button");
	b.textContent = text;
	b.addEventListener("click", () => {
		onClick();
		b.blur();
	});
	return b;
}
