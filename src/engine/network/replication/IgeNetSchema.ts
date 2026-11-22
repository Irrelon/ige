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
	/** Set false to keep the client from blending this field between states (it steps instead). */
	blend?: boolean;
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
 * Any JSON value, for rare complex data (a market table). It's compared as JSON text only when
 * written (or touched), encoded once when it changes, and sent whole.
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
		this.blend = def.blend === false ? "none" : def.type === "angle" ? "angle" : def.type === "number" || def.type === "int" || def.type === "float" ? "linear" : "none";
		let defaultValue: unknown = 0;
		switch (def.type) {
			case "number": {
				const { precision, min, max } = def;
				if (!(precision > 0)) throw new Error(`Field ${name}: precision must be above 0`);
				if (min !== undefined && max !== undefined) {
					const top = Math.round((max - min) / precision);
					const bits = igeNetBitsFor(top + 1);
					if (bits > 32) throw new Error(`Field ${name}: the range needs more than 32 bits`);
					this._canon = (v) => min + clampInt(Math.round((toNumber(v) - min) / precision), 0, top) * precision;
					this._write = (w, v) => w.writeBits(clampInt(Math.round((v - min) / precision), 0, top), bits);
					this._read = (r) => min + r.readBits(bits) * precision;
					defaultValue = min <= 0 && max >= 0 ? 0 : min;
					defaultValue = this._canon(defaultValue);
				} else {
					this._canon = (v) => Math.round(toNumber(v) / precision) * precision;
					this._write = (w, v) => w.writeVarInt(Math.round(v / precision));
					this._read = (r) => r.readVarInt() * precision;
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

/** The most fields one kind may have (a changed-field mask is one 32-bit word). */
export const IGE_NET_MAX_FIELDS = 32;

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
	readonly fullMask: number;

	constructor (name: string, defs: Record<string, IgeNetFieldDef>) {
		this.name = name;
		this.hash = hashText(JSON.stringify(defs));
		const names = Object.keys(defs);
		if (names.length > IGE_NET_MAX_FIELDS) throw new Error(`${name}: at most ${IGE_NET_MAX_FIELDS} fields (it has ${names.length})`);
		this.fields = names.map((n, i) => new IgeNetField(n, i, defs[n]));
		for (const field of this.fields) {
			this.byName.set(field.name, field);
			if (field.group) {
				const list = this.groups.get(field.group) ?? [];
				list.push(field.index);
				this.groups.set(field.group, list);
			}
		}
		this.fullMask = names.length === 32 ? 0xffffffff : ((1 << names.length) - 1) >>> 0;
	}

	/** The bit mask of a group's fields. */
	groupMask (group: string): number {
		let mask = 0;
		for (const i of this.groups.get(group) ?? []) mask |= 1 << i;
		return mask >>> 0;
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

	/** Writes every field. */
	writeAll (w: IgeNetBitWriter, values: Record<string, unknown>, json?: (string | undefined)[]): void {
		for (const field of this.fields) field.write(w, values[field.name], json?.[field.index]);
	}

	readAll (r: IgeNetBitReader): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		for (const field of this.fields) out[field.name] = field.read(r);
		return out;
	}

	/** Writes the mask (a bit per field) and the fields in it. `json` holds fields' JSON text where known. */
	writeMasked (w: IgeNetBitWriter, mask: number, values: Record<string, unknown>, json?: (string | undefined)[]): void {
		const fields = this.fields;
		for (let i = 0; i < fields.length; i++) w.writeBits((mask >>> i) & 1, 1);
		for (let i = 0; i < fields.length; i++) {
			if ((mask >>> i) & 1) fields[i].write(w, values[fields[i].name], json?.[i]);
		}
	}

	readMasked (r: IgeNetBitReader): Record<string, unknown> {
		const fields = this.fields;
		let mask = 0;
		for (let i = 0; i < fields.length; i++) mask |= r.readBits(1) << i;
		const out: Record<string, unknown> = {};
		for (let i = 0; i < fields.length; i++) {
			if ((mask >>> i) & 1) out[fields[i].name] = fields[i].read(r);
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
	readonly hash: string;

	constructor (defs: Record<string, Record<string, IgeNetFieldDef>>) {
		this.kinds = Object.keys(defs).map((name) => new IgeNetSchema(name, defs[name]));
		for (const kind of this.kinds) this.byName.set(kind.name, kind);
		this.kindBits = igeNetBitsFor(this.kinds.length);
		this.hash = hashText(JSON.stringify(defs));
	}

	kind (name: string): IgeNetSchema {
		const schema = this.byName.get(name);
		if (!schema) throw new Error(`Unknown kind "${name}"`);
		return schema;
	}
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
