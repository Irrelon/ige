import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IGE_NET_QUAT_BITS } from "@/engine/network/entities/igeNetQuat";
import type { IgeNetFieldDef, IgeNetKindOptions } from "@/engine/network/replication/IgeNetSchema";

/** The axes of rotation an entity kind replicates. */
export type IgeNetEntityRotation = "xyz" | "y" | "z" | "none" | "quaternion";

export interface IgeNetEntityTransformOptions {
	/** The smallest step of a position, in world units (default 0.01). */
	precision?: number;
	/** Which rotation angles go: "xyz" (default), "y" (a 3D character), "z" (a 2D sprite) or "none". */
	rotation?: IgeNetEntityRotation;
	/** Bits of each angle (default 12). */
	angleBits?: number;
	/** Replicate the scale too (sx, sy, sz). Default false. */
	scale?: boolean;
}

export interface IgeNetEntityOptions {
	/**
	 * `"quaternion"` replicates a 3D rotation as one packed quaternion (the field `q`, 38 bits, worst
	 * error under 0.1 degree) in place of the angles: the host sends the entity's `quaternion()` (or
	 * its Euler angles as one) and the client sets `entity.quaternion()`, blended along the shortest
	 * path. Any other value is the same as `transform.rotation`.
	 */
	rotation?: IgeNetEntityRotation;
	transform?: IgeNetEntityTransformOptions;
	/** The ground plane for range: "xz" (default, 3D) or "xy" (2D). */
	plane?: "xz" | "xy";
	/** "spatial" (default): full detail near a viewer's interest, nothing beyond. "scope": everyone in the scope, at any distance. */
	relevance?: "spatial" | "scope";
	/** Send far entities as anonymous position blips (default false: beyond range they aren't sent). */
	blip?: boolean;
	priority?: number;
	maxRate?: number;
	groupRates?: Record<string, number>;
	groupPriority?: Record<string, number>;
	separateGroups?: boolean;
}

/** What a class's `static net` holds: the kind, its fields and how it's replicated. */
export interface IgeNetEntityDescription {
	readonly kind: string;
	/** The fields the game declared, with their defaults filled in (`blend: false` unless set). */
	readonly fields: Record<string, IgeNetFieldDef>;
	/** Every field of the kind: the transform, the declared fields and `p`. */
	readonly defs: Record<string, IgeNetFieldDef>;
	readonly kindOptions: IgeNetKindOptions;
	readonly rotation: IgeNetEntityRotation;
	readonly scale: boolean;
	readonly plane: "xz" | "xy";
	readonly relevance: "spatial" | "scope";
}

/** A class that can be replicated: it has `static net`, and may have `static netCreate(values)`. */
export interface IgeNetEntityClass {
	new (...args: any[]): IgeEntity;
	net: IgeNetEntityDescription;
	netCreate?: (values: Record<string, unknown>) => IgeEntity;
}

const RESERVED = new Set(["x", "y", "z", "rx", "ry", "rz", "q", "sx", "sy", "sz", "p"]);

/**
 * Describes how an entity class is replicated: its kind name, its own fields and its options. Put it
 * on the class as `static net`. The transform fields (x, y, z, and by default rx, ry, rz) and `p` (the
 * parent's id) come with every kind; declared fields default to `blend: false`.
 * @example #A zombie
 *     class Zombie extends IgeEntity {
 *         static net = igeNetEntity("zombie", { hp: { type: "int", min: 0, max: 100 } }, { transform: { rotation: "y" } });
 *         hp = 100;
 *     }
 */
export function igeNetEntity (kind: string, fields: Record<string, IgeNetFieldDef> = {}, options: IgeNetEntityOptions = {}): IgeNetEntityDescription {
	const transform = options.transform ?? {};
	const precision = transform.precision ?? 0.01;
	const rotation = options.rotation ?? transform.rotation ?? "xyz";
	const angleBits = transform.angleBits ?? 12;
	const scale = !!transform.scale;
	const plane = options.plane ?? "xz";
	const relevance = options.relevance ?? "spatial";
	const declared: Record<string, IgeNetFieldDef> = {};
	for (const name of Object.keys(fields)) {
		if (RESERVED.has(name)) throw new Error(`${kind}: "${name}" is a field every entity kind has already`);
		declared[name] = { ...fields[name], blend: fields[name].blend ?? false } as IgeNetFieldDef;
	}
	const defs: Record<string, IgeNetFieldDef> = {};
	for (const axis of ["x", "y", "z"]) defs[axis] = { type: "number", precision, group: "transform" };
	if (rotation === "xyz") for (const axis of ["rx", "ry", "rz"]) defs[axis] = { type: "angle", bits: angleBits, group: "transform" };
	else if (rotation === "quaternion") defs.q = { type: "quat", bits: IGE_NET_QUAT_BITS, group: "transform" };
	else if (rotation !== "none") defs[`r${rotation}`] = { type: "angle", bits: angleBits, group: "transform" };
	if (scale) for (const axis of ["sx", "sy", "sz"]) defs[axis] = { type: "number", precision, group: "transform" };
	Object.assign(defs, declared);
	defs.p = { type: "string", blend: false };

	const kindOptions: IgeNetKindOptions = { relevance, position: plane === "xz" ? ["x", "z", "y"] : ["x", "y", "z"] };
	if (!options.blip) kindOptions.blip = false;
	for (const key of ["priority", "maxRate", "groupRates", "groupPriority", "separateGroups"] as const) {
		if (options[key] !== undefined) (kindOptions as Record<string, unknown>)[key] = options[key];
	}
	return { kind, fields: declared, defs, kindOptions, rotation, scale, plane, relevance };
}

/**
 * The schema definitions and kind options for some entity classes, in the order given. Both ends call
 * it with the same list and merge the result into the game's own schemas.
 */
export function igeNetEntitySchemas (classes: IgeNetEntityClass[]): { defs: Record<string, Record<string, IgeNetFieldDef>>; kinds: Record<string, IgeNetKindOptions> } {
	const defs: Record<string, Record<string, IgeNetFieldDef>> = {};
	const kinds: Record<string, IgeNetKindOptions> = {};
	for (const cls of classes) {
		const net = cls.net;
		if (!net) throw new Error(`${cls.name} has no static net (igeNetEntity)`);
		if (defs[net.kind]) throw new Error(`Two entity classes have the kind "${net.kind}"`);
		defs[net.kind] = net.defs;
		kinds[net.kind] = net.kindOptions;
	}
	return { defs, kinds };
}
