import { IgeNetBitReader, IgeNetBitWriter, igeNetBitsFor } from "@/engine/network/replication/IgeNetBits";

/** Options every field type shares. */
export interface IgeNetFieldCommon {
	/** The field may be absent (undefined): one presence bit goes before its value. */
	optional?: boolean;
	/**
	 * A named group of fields (the old "stream sections": a transform, the details). Groups only
	 * label fields for now; later they let a group be sent at a rate of its own.
	 */
	group?: string;
	/**
	 * Set false to keep the client from blending this field between states (it steps instead), or
	 * "angle" to blend a number field (a heading kept to a precision, not wrapped) the short way round.
	 */
	blend?: boolean | "angle";
}

/**
 * A number to a precision: `precision` is the smallest step kept (0.01: two decimals), so jitter
 * below it never counts as a change. With `min` and `max` it takes a fixed number of bits for the
 * range (values outside are clamped); without, a zigzag varint (small values cost little).
 */
export interface IgeNetNumberField extends IgeNetFieldCommon {
	type: "number";
	precision: number;
	min?: number;
	max?: number;
}

/** A whole number: a varint (zigzag when signed), or fixed bits for a `min` to `max` range. */
export interface IgeNetIntField extends IgeNetFieldCommon {
	type: "int";
	signed?: boolean;
	min?: number;
	max?: number;
}

/** An angle in radians kept to `bits` bits (default 10) and blended the short way round. */
export interface IgeNetAngleField extends IgeNetFieldCommon {
	type: "angle";
	bits?: number;
}

/** One of a list of strings, as many bits as the list needs. */
export interface IgeNetEnumField extends IgeNetFieldCommon {
	type: "enum";
	values: readonly string[];
}

/** A full 32-bit float, for the odd value that needs range and precision both. */
export interface IgeNetFloatField extends IgeNetFieldCommon {
	type: "float";
}

/**
 * Any JSON value, for complex data (a market table, a crew record). It's compared as JSON text only
 * when written (or touched). Replicated objects send a change as a patch of what changed inside it
 * (keys, array items) against the version the viewer has, or whole when that's smaller
 * (igeNetJsonDelta.ts); an input's json fields go whole.
 */
export interface IgeNetJsonField extends IgeNetFieldCommon {
	type: "json";
}

export type IgeNetFieldDef =
	| IgeNetNumberField
	| IgeNetIntField
	| IgeNetAngleField
	| IgeNetEnumField
	| IgeNetFloatField
	| IgeNetJsonField
	| (IgeNetFieldCommon & { type: "bool" })
	| (IgeNetFieldCommon & { type: "string" });

const TWO_PI = Math.PI * 2;

/** One compiled field: how its values are made canonical, compared, written and read. */
export class IgeNetField {
	readonly name: string;
	readonly index: number;
	readonly def: IgeNetFieldDef;
	readonly type: IgeNetFieldDef["type"];
	readonly optional: boolean;
	readonly group?: string;
	/** Part of the kind's position (the object's grid cell depends on it). */
	positional = false;
	/** How the client blends this field between states. */
	readonly blend: "linear" | "angle" | "none";
	/** The value a created object has when the game doesn't give one. */
	readonly defaultValue: unknown;
	_canon: (value: unknown) => unknown;
	_write: (w: IgeNetBitWriter, value: any, json?: string) => void;
	_read: (r: IgeNetBitReader) => unknown;

	constructor (name: string, index: number, def: IgeNetFieldDef) {
		this.name = name;
		this.index = index;
		this.def = def;
		this.type = def.type;
		this.optional = !!def.optional;
		this.group = def.group;
		this.blend = def.blend === false ? "none" : def.blend === "angle" || def.type === "angle" ? "angle" : def.type === "number" || def.type === "int" || def.type === "float" ? "linear" : "none";
		let defaultValue: unknown = 0;
		switch (def.type) {
			case "number": {
				const { precision, min, max } = def;
				if (!(precision > 0)) throw new Error(`Field ${name}: precision must be above 0`);
				// A precision of 1/n (0.1, 0.001) is kept as whole steps over n, so values come out clean (0.3, not 0.30000000000000004)
				const per = 1 / precision;
				const scale = Math.abs(per - Math.round(per)) < 1e-9 ? Math.round(per) : 0;
				const toStep = scale ? (v: number) => Math.round(v * scale) : (v: number) => Math.round(v / precision);
				const fromStep = scale ? (n: number) => n / scale : (n: number) => n * precision;
				if (min !== undefined && max !== undefined) {
					const minStep = toStep(min);
					const top = toStep(max) - minStep;
					const bits = igeNetBitsFor(top + 1);
					if (bits > 32) throw new Error(`Field ${name}: the range needs more than 32 bits`);
					this._canon = (v) => fromStep(minStep + clampInt(toStep(toNumber(v)) - minStep, 0, top));
					this._write = (w, v) => w.writeBits(clampInt(toStep(v) - minStep, 0, top), bits);
					this._read = (r) => fromStep(minStep + r.readBits(bits));
					defaultValue = min <= 0 && max >= 0 ? 0 : min;
					defaultValue = this._canon(defaultValue);
				} else {
					this._canon = (v) => fromStep(toStep(toNumber(v)));
					this._write = (w, v) => w.writeVarInt(toStep(v));
					this._read = (r) => fromStep(r.readVarInt());
				}
				break;
			}
			case "int": {
				const { min, max } = def;
				if (min !== undefined && max !== undefined) {
					const bits = igeNetBitsFor(max - min + 1);
					if (bits > 32) throw new Error(`Field ${name}: the range needs more than 32 bits`);
					this._canon = (v) => min + clampInt(Math.round(toNumber(v)) - min, 0, max - min);
					this._write = (w, v) => w.writeBits(v - min, bits);
					this._read = (r) => min + r.readBits(bits);
					defaultValue = this._canon(0);
				} else if (def.signed) {
					this._canon = (v) => Math.round(toNumber(v));
					this._write = (w, v) => w.writeVarInt(v);
					this._read = (r) => r.readVarInt();
				} else {
					this._canon = (v) => Math.max(0, Math.round(toNumber(v)));
					this._write = (w, v) => w.writeVarUint(v);
					this._read = (r) => r.readVarUint();
				}
				break;
			}
			case "bool":
				defaultValue = false;
				this._canon = (v) => !!v;
				this._write = (w, v) => w.writeBool(v);
				this._read = (r) => r.readBool();
				break;
			case "angle": {
				const bits = def.bits ?? 10;
				if (bits < 1 || bits > 32) throw new Error(`Field ${name}: angle bits must be 1 to 32`);
				const steps = 2 ** bits;
				const quantise = (v: number) => {
					const q = Math.round((((v % TWO_PI) + TWO_PI) % TWO_PI / TWO_PI) * steps);
					return q >= steps ? 0 : q;
				};
				this._canon = (v) => (quantise(toNumber(v)) / steps) * TWO_PI;
				this._write = (w, v) => w.writeBits(quantise(v), bits);
				this._read = (r) => (r.readBits(bits) / steps) * TWO_PI;
				break;
			}
			case "enum": {
				const values = def.values;
				if (!values.length) throw new Error(`Field ${name}: an enum needs values`);
				const bits = igeNetBitsFor(values.length);
				const lookup = new Map(values.map((v, i) => [v, i]));
				defaultValue = values[0];
				this._canon = (v) => {
					if (!lookup.has(v as string)) throw new Error(`Field ${name}: "${String(v)}" isn't one of ${values.join(", ")}`);
					return v;
				};
				this._write = (w, v) => w.writeBits(lookup.get(v) as number, bits);
				this._read = (r) => {
					const i = r.readBits(bits);
					if (i >= values.length) throw new RangeError("Bad enum value");
					return values[i];
				};
				break;
			}
			case "float":
				this._canon = (v) => Math.fround(toNumber(v));
				this._write = (w, v) => w.writeFloat32(v);
				this._read = (r) => r.readFloat32();
				break;
			case "string":
				defaultValue = "";
				this._canon = (v) => String(v ?? "");
				this._write = (w, v) => w.writeString(v);
				this._read = (r) => r.readString();
				break;
			case "json":
				defaultValue = null;
				this._canon = (v) => v;
				this._write = (w, v, json) => w.writeString(json ?? JSON.stringify(v) ?? "null");
				this._read = (r) => JSON.parse(r.readString());
				break;
			default:
				throw new Error(`Field ${name}: unknown type`);
		}
		this.defaultValue = this.optional ? undefined : defaultValue;
	}

	/** The value as it will arrive on the other side (quantised); undefined stays undefined if optional. */
	canonical (value: unknown): unknown {
		if (value === undefined) {
			if (!this.optional) throw new Error(`Field ${this.name} isn't optional`);
			return undefined;
		}
		return this._canon(value);
	}

	/** Whether two canonical values are the same (not for json, which the object compares as text). */
	equal (a: unknown, b: unknown): boolean {
		return a === b;
	}

	/** Writes a canonical value (with the presence bit of an optional field). `json` is the value's JSON text, if already known. */
	write (w: IgeNetBitWriter, value: unknown, json?: string): void {
		if (this.optional) {
			w.writeBool(value !== undefined);
			if (value === undefined) return;
		}
		this._write(w, value, json);
	}

	read (r: IgeNetBitReader): unknown {
		if (this.optional && !r.readBool()) return undefined;
		return this._read(r);
	}
}

/**
 * How the replicator treats one kind of object beyond its fields: where it is, who needs it and how
 * urgently. Everything is optional; a kind with none of it is sent to every viewer of its scope in full.
 * Everything here that changes the wire format (relevance, position, blip) is part of the schema hash.
 */
export interface IgeNetKindOptions {
	/**
	 * "scope": sent in full to everyone in the scope, any distance (stations, gates, asteroids).
	 * "spatial": full detail within a viewer's range (or when focused); beyond it a blip (position
	 * only, anonymous, at a low rate) or, with `blip: false`, nothing at all (the object is
	 * destroyed on that machine and made again in full when it comes back in range). Needs `position`.
	 */
	relevance?: "scope" | "spatial";
	/** The fields that say where the object is: two for the ground plane, optionally a third for height (used for distance only). */
	position?: string[];
	/**
	 * The field group sent as the blip (default: the position fields), or false for no blips: beyond
	 * range the object is not sent. A blip arrives as an anonymous contact (no id, no kind), so
	 * nothing in the group should identify the object either.
	 */
	blip?: string | false;
	/** Blips per second of one object (default: the replicator's blipRate). */
	blipRate?: number;
	/** Base priority of the kind (default 1). */
	priority?: number;
	/** Base priority of a group of fields (multiplies the kind's), by group name. */
	groupPriority?: Record<string, number>;
	/**
	 * Send and acknowledge each group of fields on its own, though none has a rate or priority (those
	 * that do always are). A big change that goes in slices then holds up only its own group: put a
	 * record's fast-changing numbers in a group of their own and they never wait behind it.
	 */
	separateGroups?: boolean;
	/** The most sends per second of the object as a whole, per viewer. */
	maxRate?: number;
	/** The most sends per second of each group of fields, per viewer, by group name. */
	groupRates?: Record<string, number>;
}

/** Writes json field `index` of the object being encoded (the replicator's versioned, patched form). */
export type IgeNetJsonWriter = (w: IgeNetBitWriter, index: number) => void;
/** Reads a json field written by an IgeNetJsonWriter. */
export type IgeNetJsonReader = (r: IgeNetBitReader) => unknown;

/** The most fields one kind may have. */
export const IGE_NET_MAX_FIELDS = 1024;

/**
 * Which fields of an object changed: a number (a bit per field) for a kind of 32 fields or fewer,
 * an array of 32-bit words (field `i` is bit `i & 31` of word `i >> 5`) for a wider one.
 */
export type IgeNetMask = number | number[];

/** Whether no field is in a mask. */
export function igeNetMaskEmpty (mask: IgeNetMask): boolean {
	if (typeof mask === "number") return mask === 0;
	for (let i = 0; i < mask.length; i++) if (mask[i]) return false;
	return true;
}

/** A value that is the same for the same fields in a mask (a map key). */
export function igeNetMaskKey (mask: IgeNetMask): number | string {
	return typeof mask === "number" ? mask : mask.join(",");
}

/**
 * What one kind of replicated object (or one player's input) is made of: its fields, declared
 * once, in an order both ends share.
 * @example #A ship
 *     new IgeNetSchema("ship", {
 *         x: { type: "number", precision: 0.1, group: "transform" },
 *         heading: { type: "angle", bits: 9, group: "transform" },
 *         docked: { type: "bool" },
 *         faction: { type: "enum", values: ["red", "blue"] }
 *     });
 */
export class IgeNetSchema {
	readonly name: string;
	readonly fields: IgeNetField[];
	readonly byName: Map<string, IgeNetField> = new Map();
	/** A short hash of the definitions: two ends with the same hash agree on the wire format. */
	readonly hash: string;
	/** Field indexes by group name. */
	readonly groups: Map<string, number[]> = new Map();
	/** The mask with every field's bit set. */
	readonly fullMask: IgeNetMask;
	/** More than 32 fields: masks are arrays of words. */
	readonly wide: boolean;
	/** The mask with no field in it. */
	readonly emptyMask: IgeNetMask;
	readonly options: IgeNetKindOptions;
	readonly relevance?: "scope" | "spatial";
	/** A spatial kind: sent by distance from the viewer's interests. */
	readonly leveled: boolean;
	/** A spatial kind that is sent as a blip beyond range (not `blip: false`). */
	readonly blips: boolean;
	/** The index of this kind's blip layout in the schema set (-1: none). */
	blipLayout = -1;
	/** Field indexes of the position (two or three). */
	readonly positionIdx: number[] = [];
	/** Indexes of the json fields. */
	readonly jsonIdx: number[] = [];
	/**
	 * Fields are sorted into classes that are sent and acknowledged on their own: the blip class
	 * (first, when the kind has one), a class per other group, the ungrouped rest. A kind that needs
	 * no distinction has the one class.
	 */
	readonly classCount: number;
	readonly classOf: number[];
	readonly classFields: number[][] = [];
	readonly classNames: string[] = [];
	/** The blip class, or -1. */
	readonly blipClass: number;
	/** Per class: priority and the most sends per second (0: unlimited). */
	readonly classPriority: number[] = [];
	readonly classRate: number[] = [];
	/** Whether any rate limits are set. */
	readonly rated: boolean;
	readonly priority: number;

	constructor (name: string, defs: Record<string, IgeNetFieldDef>, options: IgeNetKindOptions = {}) {
		this.name = name;
		this.options = options;
		this.hash = hashText(JSON.stringify(defs) + kindWireText(options));
		const names = Object.keys(defs);
		if (names.length > IGE_NET_MAX_FIELDS) throw new Error(`${name}: at most ${IGE_NET_MAX_FIELDS} fields (it has ${names.length})`);
		this.fields = names.map((n, i) => new IgeNetField(n, i, defs[n]));
		for (const field of this.fields) {
			this.byName.set(field.name, field);
			if (field.type === "json") this.jsonIdx.push(field.index);
			if (field.group) {
				const list = this.groups.get(field.group) ?? [];
				list.push(field.index);
				this.groups.set(field.group, list);
			}
		}
		this.relevance = options.relevance;
		this.leveled = options.relevance === "spatial";
		this.blips = this.leveled && options.blip !== false;
		this.priority = options.priority ?? 1;
		if (options.position) {
			if (options.position.length < 2 || options.position.length > 3) throw new Error(`${name}: position is two or three field names`);
			for (const fieldName of options.position) {
				const field = this.byName.get(fieldName);
				if (!field || (field.type !== "number" && field.type !== "int" && field.type !== "float")) throw new Error(`${name}: position field "${fieldName}" must be a number field`);
				field.positional = true;
				this.positionIdx.push(field.index);
			}
		}
		if (this.leveled && this.positionIdx.length < 2) throw new Error(`${name}: a spatial kind needs a position`);
		const useClasses = this.blips || !!options.groupRates || !!options.groupPriority || (!!options.separateGroups && this.groups.size > 0);
		this.classOf = new Array(names.length).fill(-1);
		let blipClass = -1;
		if (useClasses) {
			if (this.blips) {
				const blipFields = typeof options.blip === "string" ? this.groups.get(options.blip) : this.positionIdx;
				if (!blipFields || !blipFields.length) throw new Error(`${name}: blip group "${options.blip}" has no fields`);
				blipClass = 0;
				this.classNames.push(typeof options.blip === "string" ? options.blip : "blip");
				this.classFields.push([...blipFields]);
				for (const i of blipFields) this.classOf[i] = 0;
			}
			for (const field of this.fields) {
				if (this.classOf[field.index] >= 0) continue;
				const key = field.group ?? "";
				let c = this.classNames.indexOf(key);
				if (c < 0) {
					c = this.classNames.length;
					this.classNames.push(key);
					this.classFields.push([]);
				}
				this.classOf[field.index] = c;
				this.classFields[c].push(field.index);
			}
			if (this.classNames.length > 30) throw new Error(`${name}: at most 30 field groups`);
		} else {
			this.classNames.push("");
			this.classFields.push(names.map((_, i) => i));
			this.classOf.fill(0);
		}
		this.blipClass = blipClass;
		this.classCount = this.classNames.length;
		let rated = !!options.maxRate;
		for (let c = 0; c < this.classCount; c++) {
			this.classPriority.push(options.groupPriority?.[this.classNames[c]] ?? 1);
			const rate = options.groupRates?.[this.classNames[c]] ?? 0;
			this.classRate.push(rate);
			if (rate) rated = true;
		}
		this.rated = rated;
		for (const key of Object.keys(options.groupRates ?? {})) if (!this.classNames.includes(key)) throw new Error(`${name}: no group "${key}" for a rate`);
		for (const key of Object.keys(options.groupPriority ?? {})) if (!this.classNames.includes(key)) throw new Error(`${name}: no group "${key}" for a priority`);
		this.wide = names.length > 32;
		this.emptyMask = this.wide ? new Array(Math.ceil(names.length / 32)).fill(0) : 0;
		if (this.wide) {
			const words: number[] = new Array(Math.ceil(names.length / 32)).fill(0);
			for (let i = 0; i < names.length; i++) words[i >> 5] = (words[i >> 5] | (1 << (i & 31))) >>> 0;
			this.fullMask = words;
		} else {
			this.fullMask = names.length === 32 ? 0xffffffff : ((1 << names.length) - 1) >>> 0;
		}
	}

	/** The mask of a group's fields. */
	groupMask (group: string): IgeNetMask {
		const list = this.groups.get(group) ?? [];
		if (this.wide) {
			const words: number[] = new Array(Math.ceil(this.fields.length / 32)).fill(0);
			for (const i of list) words[i >> 5] = (words[i >> 5] | (1 << (i & 31))) >>> 0;
			return words;
		}
		let mask = 0;
		for (const i of list) mask |= 1 << i;
		return mask >>> 0;
	}

	/** The mask of the fields whose epoch (in `changed`, a slot per field) is after `epoch`. */
	maskAfter (changed: Float64Array, epoch: number): IgeNetMask {
		if (this.wide) {
			const words: number[] = new Array(Math.ceil(changed.length / 32)).fill(0);
			for (let i = 0; i < changed.length; i++) if (changed[i] > epoch) words[i >> 5] |= 1 << (i & 31);
			for (let w = 0; w < words.length; w++) words[w] >>>= 0;
			return words;
		}
		let mask = 0;
		for (let i = 0; i < changed.length; i++) if (changed[i] > epoch) mask |= 1 << i;
		return mask >>> 0;
	}

	/** The mask of the fields of one class whose epoch is after `epoch`. */
	classMaskAfter (changed: Float64Array, epoch: number, c: number): IgeNetMask {
		const list = this.classFields[c];
		if (this.wide) {
			const words: number[] = new Array(Math.ceil(changed.length / 32)).fill(0);
			for (const i of list) if (changed[i] > epoch) words[i >> 5] |= 1 << (i & 31);
			for (let w = 0; w < words.length; w++) words[w] >>>= 0;
			return words;
		}
		let mask = 0;
		for (const i of list) if (changed[i] > epoch) mask |= 1 << i;
		return mask >>> 0;
	}

	/** The definitions of the blip class's fields, in wire order (what a blip layout is made from). */
	blipDefs (): Record<string, IgeNetFieldDef> {
		const out: Record<string, IgeNetFieldDef> = {};
		for (const i of this.classFields[this.blipClass]) {
			const { group: _group, ...def } = this.fields[i].def as IgeNetFieldDef & { group?: string };
			out[this.fields[i].name] = def as IgeNetFieldDef;
		}
		return out;
	}

	/** Writes the fields of the blip class (no mask: both ends know which they are). */
	writeBlip (w: IgeNetBitWriter, values: Record<string, unknown>, json?: (string | undefined)[], jw?: IgeNetJsonWriter): void {
		for (const i of this.classFields[this.blipClass]) {
			if (jw && this.fields[i].type === "json") jw(w, i);
			else this.fields[i].write(w, values[this.fields[i].name], json?.[i]);
		}
	}

	readBlip (r: IgeNetBitReader, jr?: IgeNetJsonReader): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const i of this.classFields[this.blipClass]) out[this.fields[i].name] = jr && this.fields[i].type === "json" ? jr(r) : this.fields[i].read(r);
		return out;
	}

	/** Every field of `values` made canonical (missing ones take their defaults). */
	canonical (values: Record<string, unknown> = {}): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const key in values) if (!this.byName.has(key)) throw new Error(`${this.name} has no field "${key}"`);
		for (const field of this.fields) {
			const v = values[field.name];
			out[field.name] = v === undefined ? field.defaultValue : field.canonical(v);
		}
		return out;
	}

	/** Writes every field (json fields by `jw` when given: the replicator's versioned form). */
	writeAll (w: IgeNetBitWriter, values: Record<string, unknown>, json?: (string | undefined)[], jw?: IgeNetJsonWriter): void {
		for (const field of this.fields) {
			if (jw && field.type === "json") jw(w, field.index);
			else field.write(w, values[field.name], json?.[field.index]);
		}
	}

	readAll (r: IgeNetBitReader, jr?: IgeNetJsonReader): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const field of this.fields) out[field.name] = jr && field.type === "json" ? jr(r) : field.read(r);
		return out;
	}

	/** Writes the mask (a bit per field) and the fields in it. `json` holds fields' JSON text where known; `jw` writes json fields instead. */
	writeMasked (w: IgeNetBitWriter, mask: IgeNetMask, values: Record<string, unknown>, json?: (string | undefined)[], jw?: IgeNetJsonWriter): void {
		const fields = this.fields;
		if (typeof mask === "number") {
			for (let i = 0; i < fields.length; i++) w.writeBits((mask >>> i) & 1, 1);
			for (let i = 0; i < fields.length; i++) {
				if (!((mask >>> i) & 1)) continue;
				if (jw && fields[i].type === "json") jw(w, i);
				else fields[i].write(w, values[fields[i].name], json?.[i]);
			}
			return;
		}
		for (let i = 0; i < fields.length; i++) w.writeBits((mask[i >> 5] >>> (i & 31)) & 1, 1);
		for (let i = 0; i < fields.length; i++) {
			if (!((mask[i >> 5] >>> (i & 31)) & 1)) continue;
			if (jw && fields[i].type === "json") jw(w, i);
			else fields[i].write(w, values[fields[i].name], json?.[i]);
		}
	}

	readMasked (r: IgeNetBitReader, jr?: IgeNetJsonReader): Record<string, unknown> {
		const fields = this.fields;
		const set: boolean[] = [];
		for (let i = 0; i < fields.length; i++) set.push(r.readBits(1) === 1);
		const out: Record<string, unknown> = {};
		for (let i = 0; i < fields.length; i++) {
			if (set[i]) out[fields[i].name] = jr && fields[i].type === "json" ? jr(r) : fields[i].read(r);
		}
		return out;
	}
}

/**
 * Every kind of object a game replicates, in an order both ends share: the host and its clients
 * make the set from the same definitions. A hash of it is checked when a machine joins, so a
 * mismatch is an error rather than garbage.
 */
export class IgeNetSchemaSet {
	readonly kinds: IgeNetSchema[];
	readonly byName: Map<string, IgeNetSchema> = new Map();
	readonly kindBits: number;
	/**
	 * The shapes a blip can have: kinds whose blips have the same fields share one, so a blip says
	 * which shape it is, never which kind. A client reads an anonymous contact with one of these.
	 */
	readonly blipLayouts: IgeNetSchema[] = [];
	/** Whether any kind sends blips (then a kind number past the real ones means "anonymous blip"). */
	readonly hasBlips: boolean;
	readonly layoutBits: number;
	readonly hash: string;

	/** Whether any kind declares relevance (the game uses stage 2 of replication). */
	readonly hasRelevance: boolean;

	constructor (defs: Record<string, Record<string, IgeNetFieldDef>>, kinds: Record<string, IgeNetKindOptions> = {}) {
		for (const name of Object.keys(kinds)) if (!defs[name]) throw new Error(`Options for unknown kind "${name}"`);
		this.kinds = Object.keys(defs).map((name) => new IgeNetSchema(name, defs[name], kinds[name]));
		for (const kind of this.kinds) this.byName.set(kind.name, kind);
		this.hasBlips = this.kinds.some((k) => k.blips);
		this.kindBits = igeNetBitsFor(this.kinds.length + (this.hasBlips ? 1 : 0));
		const layoutKeys: string[] = [];
		for (const kind of this.kinds) {
			if (!kind.blips) continue;
			const defs = kind.blipDefs();
			const key = JSON.stringify(Object.entries(defs));
			let at = layoutKeys.indexOf(key);
			if (at < 0) {
				at = layoutKeys.length;
				layoutKeys.push(key);
				this.blipLayouts.push(new IgeNetSchema(`blip${at}`, defs));
			}
			kind.blipLayout = at;
		}
		this.layoutBits = igeNetBitsFor(this.blipLayouts.length);
		this.hasRelevance = this.kinds.some((k) => !!k.relevance);
		this.hash = hashText(JSON.stringify(defs) + this.kinds.map((k) => kindWireText(k.options)).join(""));
	}

	kind (name: string): IgeNetSchema {
		const schema = this.byName.get(name);
		if (!schema) throw new Error(`Unknown kind "${name}"`);
		return schema;
	}
}

/** The part of a kind's options that changes the wire format ("" when none do, so older hashes stay). */
function kindWireText (options: IgeNetKindOptions): string {
	if (!options.relevance) return "";
	return JSON.stringify([options.relevance, options.position, options.blip]);
}

function toNumber (value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function clampInt (value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}

/** A short FNV-1a hash of text. */
export function hashText (text: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16);
}

/** The hash a host and its clients compare when a machine joins: every kind, and the input. */
export function igeNetSchemaHash (schemas: IgeNetSchemaSet, input: IgeNetSchema): string {
	return hashText(`${schemas.hash}/${input.hash}`);
}
