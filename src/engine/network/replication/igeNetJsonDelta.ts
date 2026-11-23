import type { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";

/**
 * Json fields of replicated objects go as patches: what changed inside the value (a key of an
 * object, an item of an array), against a version the machine already has, instead of the whole
 * value again. A pilot's 3 KB crew record whose clock ticks costs a few bytes, not 3 KB.
 *
 * The authority numbers each json field's versions and keeps the last few (IGE_NET_JSON_VERSIONS);
 * a change goes as a patch against the version the viewer is known to have, or whole when the
 * patch wouldn't be smaller (or that version is too old to be kept). The machine keeps as many of
 * its own latest versions, so a patch against any of them applies even on a lossy transport, where
 * packets arrive late or out of order.
 *
 * On the wire, a json field of a replicated object is:
 *     varuint version
 *     1 bit   patch?
 *     whole:  string (the JSON text; "" for an absent optional field)
 *     patch:  varuint (version - base version), then the patch node:
 *         2 bits  0 a new value: string (JSON text)
 *                 1 an object's changed keys: varuint count, then per key: string key, node (3: removed)
 *                 2 an array's changed items: varuint new length, varuint count, then per item:
 *                   varuint gap (index - previous index - 1), node
 *
 * A patch keeps the value exactly as the authority has it, key order included (an object whose
 * keys moved goes whole), so its JSON text on the machine is the authority's.
 */

/** How many versions of a json field each end keeps (both ends must agree). */
export const IGE_NET_JSON_VERSIONS = 16;

/** A change to a JSON value: a new value, an object's changed keys, an array's changed items, or (in an object) a key removed. */
export type IgeNetJsonPatch =
	| { t: 0; v: unknown }
	| { t: 1; k: [string, IgeNetJsonPatch][] }
	| { t: 2; n: number; i: [number, IgeNetJsonPatch][] }
	| { t: 3 };

const REMOVED: IgeNetJsonPatch = { t: 3 };
const hasOwn = Object.prototype.hasOwnProperty;

function isRecord (value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An entry of a patch that is a new value outright (or a removal). */
function replaced (op: [unknown, IgeNetJsonPatch]): boolean {
	return op[1].t === 0 || op[1].t === 3;
}

/**
 * The patch that turns `a` into `b` (both plain JSON values, as JSON.parse makes them), or null
 * when they're the same. A container whose every entry is replaced outright is replaced whole.
 */
export function igeNetJsonDiff (a: unknown, b: unknown): IgeNetJsonPatch | null {
	if (a === b) return null;
	if (isRecord(a) && isRecord(b)) {
		const ka = Object.keys(a);
		const kb = Object.keys(b);
		const ops: [string, IgeNetJsonPatch][] = [];
		let ia = 0;
		let added = false;
		for (const key of kb) {
			if (hasOwn.call(a, key)) {
				// The kept keys must be in the order they were, with new ones after them, or the patch wouldn't keep the order
				if (added) return { t: 0, v: b };
				while (ia < ka.length && !hasOwn.call(b, ka[ia])) ia++;
				if (ka[ia] !== key) return { t: 0, v: b };
				ia++;
				const sub = igeNetJsonDiff(a[key], b[key]);
				if (sub) ops.push([key, sub]);
			} else {
				added = true;
				ops.push([key, { t: 0, v: b[key] }]);
			}
		}
		for (const key of ka) if (!hasOwn.call(b, key)) ops.push([key, REMOVED]);
		if (!ops.length) return null;
		if (kb.length && ops.length >= kb.length && ops.every(replaced)) return { t: 0, v: b };
		return { t: 1, k: ops };
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		const ops: [number, IgeNetJsonPatch][] = [];
		for (let i = 0; i < b.length; i++) {
			if (i >= a.length) {
				ops.push([i, { t: 0, v: b[i] }]);
			} else {
				const sub = igeNetJsonDiff(a[i], b[i]);
				if (sub) ops.push([i, sub]);
			}
		}
		if (!ops.length && a.length === b.length) return null;
		if (b.length && ops.length === b.length && ops.every(replaced)) return { t: 0, v: b };
		return { t: 2, n: b.length, i: ops };
	}
	return { t: 0, v: b };
}

export function igeNetWriteJsonPatch (w: IgeNetBitWriter, patch: IgeNetJsonPatch): void {
	w.writeBits(patch.t, 2);
	switch (patch.t) {
		case 0:
			w.writeString(JSON.stringify(patch.v) ?? "null");
			return;
		case 1:
			w.writeVarUint(patch.k.length);
			for (const [key, op] of patch.k) {
				w.writeString(key);
				igeNetWriteJsonPatch(w, op);
			}
			return;
		case 2: {
			w.writeVarUint(patch.n);
			w.writeVarUint(patch.i.length);
			let prev = -1;
			for (const [index, op] of patch.i) {
				w.writeVarUint(index - prev - 1);
				prev = index;
				igeNetWriteJsonPatch(w, op);
			}
			return;
		}
	}
}

export function igeNetReadJsonPatch (r: IgeNetBitReader, depth = 0): IgeNetJsonPatch {
	if (depth > 64) throw new RangeError("JSON patch nested too deep");
	const t = r.readBits(2);
	switch (t) {
		case 0:
			return { t: 0, v: JSON.parse(r.readString()) };
		case 1: {
			const count = r.readVarUint();
			if (count > r.bitsLeft) throw new RangeError("Read past the end of the message");
			const k: [string, IgeNetJsonPatch][] = [];
			for (let i = 0; i < count; i++) {
				const key = r.readString();
				k.push([key, igeNetReadJsonPatch(r, depth + 1)]);
			}
			return { t: 1, k };
		}
		case 2: {
			const n = r.readVarUint();
			const count = r.readVarUint();
			if (count > r.bitsLeft || count > n) throw new RangeError("Bad JSON patch");
			const items: [number, IgeNetJsonPatch][] = [];
			let prev = -1;
			for (let i = 0; i < count; i++) {
				const index = prev + 1 + r.readVarUint();
				if (index >= n) throw new RangeError("Bad JSON patch");
				prev = index;
				const op = igeNetReadJsonPatch(r, depth + 1);
				if (op.t === 3) throw new RangeError("Bad JSON patch");
				items.push([index, op]);
			}
			return { t: 2, n, i: items };
		}
		default:
			return REMOVED;
	}
}

function setKey (out: Record<string, unknown>, key: string, value: unknown): void {
	// (A key named __proto__ is an own key in JSON, not the prototype)
	if (key === "__proto__") Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
	else out[key] = value;
}

/**
 * `base` with a patch applied, as a new value: the parts the patch doesn't touch are the base's own
 * (shared, never changed), so neither value may be changed afterwards.
 */
export function igeNetApplyJsonPatch (base: unknown, patch: IgeNetJsonPatch): unknown {
	switch (patch.t) {
		case 0:
			return patch.v;
		case 1: {
			if (!isRecord(base)) throw new RangeError("An object's JSON patch on something else");
			const ops = new Map(patch.k);
			const out: Record<string, unknown> = {};
			for (const key of Object.keys(base)) {
				const op = ops.get(key);
				if (!op) setKey(out, key, base[key]);
				else if (op.t !== 3) setKey(out, key, igeNetApplyJsonPatch(base[key], op));
			}
			for (const [key, op] of patch.k) {
				if (op.t !== 3 && !hasOwn.call(base, key)) setKey(out, key, igeNetApplyJsonPatch(undefined, op));
			}
			return out;
		}
		case 2: {
			if (!Array.isArray(base)) throw new RangeError("An array's JSON patch on something else");
			const out = base.slice(0, patch.n);
			for (const [index, op] of patch.i) out[index] = igeNetApplyJsonPatch(base[index], op);
			if (out.length !== patch.n) throw new RangeError("Bad JSON patch");
			return out;
		}
		default:
			throw new RangeError("A removal outside an object");
	}
}

/**
 * A json field as it arrives: its version, and its whole value or a patch against an earlier
 * version (`back` versions before it) that the machine has. The client turns it into the value.
 */
export class IgeNetJsonWire {
	readonly ver: number;
	readonly back: number;
	readonly value: unknown;
	readonly patch?: IgeNetJsonPatch;

	constructor (ver: number, back: number, value: unknown, patch?: IgeNetJsonPatch) {
		this.ver = ver;
		this.back = back;
		this.value = value;
		this.patch = patch;
	}

	/** For logs and the packet inspector: the value, or the patch and what it's against. */
	toJSON (): unknown {
		return this.back ? { ver: this.ver, from: this.ver - this.back, patch: this.patch } : this.value;
	}
}

/** Writes a json field whole (a create, or a change no patch would make smaller). `text` undefined: an absent optional field. */
export function igeNetWriteJsonWhole (w: IgeNetBitWriter, ver: number, text: string | undefined): void {
	w.writeVarUint(ver);
	w.writeBits(0, 1);
	w.writeString(text ?? "");
}

export function igeNetReadJsonWire (r: IgeNetBitReader): IgeNetJsonWire {
	const ver = r.readVarUint();
	if (r.readBits(1)) {
		const back = r.readVarUint();
		if (!back || back > ver) throw new RangeError("Bad JSON patch base");
		return new IgeNetJsonWire(ver, back, undefined, igeNetReadJsonPatch(r));
	}
	const text = r.readString();
	return new IgeNetJsonWire(ver, 0, text === "" ? undefined : JSON.parse(text));
}

/** No value: the patch's base version isn't one the machine has. */
export const IGE_NET_JSON_MISSING: unique symbol = Symbol("missing");

/**
 * One object's json fields as a machine has them: the last few versions of each, so a patch
 * against any of them applies, and which is newest.
 */
export class IgeNetJsonStore {
	_by: Map<number, { ver: number; value: unknown }[]> = new Map();
	/** Whether the version the last resolve() gave is the newest of its field so far. */
	newest = false;

	/** The value a field arrives as, kept among the field's versions; IGE_NET_JSON_MISSING if a patch's base isn't here. */
	resolve (index: number, wire: IgeNetJsonWire): unknown {
		let list = this._by.get(index);
		this.newest = false;
		let at = list ? list.length : 0;
		while (at > 0 && list![at - 1].ver > wire.ver) at--;
		// A version already here (sent again): the same value
		if (at > 0 && list![at - 1].ver === wire.ver) return list![at - 1].value;
		let value: unknown;
		if (wire.back) {
			const baseVer = wire.ver - wire.back;
			const base = list?.find((v) => v.ver === baseVer);
			if (!base) return IGE_NET_JSON_MISSING;
			value = igeNetApplyJsonPatch(base.value, wire.patch!);
		} else {
			value = wire.value;
		}
		if (!list) this._by.set(index, (list = []));
		this.newest = at === list.length;
		list.splice(at, 0, { ver: wire.ver, value });
		if (list.length > IGE_NET_JSON_VERSIONS) list.shift();
		return value;
	}
}
