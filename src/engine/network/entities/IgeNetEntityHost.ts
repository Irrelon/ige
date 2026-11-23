import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import type { IgeNetEntityClass, IgeNetEntityDescription } from "@/engine/network/entities/igeNetEntity";
import { igeNetSetLatestEntityHost } from "@/engine/network/entities/igeNetEntityHostRef";
import type { IgeNetObject, IgeNetReplicator, IgeNetViewer } from "@/engine/network/replication/IgeNetReplicator";

export interface IgeNetEntityAddOptions {
	/** Private to one viewer (a player's own entity or its private state). */
	owner?: IgeNetViewer;
	/**
	 * Decides per viewer whether it sees the entity. Called each send round for every viewer; the entity
	 * is revealed to those that get `true` and hidden from the rest (replaces `streamControl`).
	 */
	relevant?: (viewer: IgeNetViewer) => boolean;
	/** The scope viewers subscribe to. Default: the id of the entity's scene (its first IgeScene2d ancestor, or the root of its tree). */
	scope?: string;
	/** For `entity.replicate()`: the host to use, instead of the most recently made one. */
	host?: IgeNetEntityHost;
}

interface Held {
	entity: IgeEntity;
	net: IgeNetEntityDescription;
	obj: IgeNetObject;
	options: IgeNetEntityAddOptions;
	/** Viewers the entity is revealed to (with `relevant`). */
	shown?: Set<IgeNetViewer>;
}

/**
 * Replicates entities of classes that have `static net` (see igeNetEntity). The game adds entities
 * (or calls `entity.replicate()`); each send round the host reads their transform, declared fields
 * and parent into replicated objects, so only what changed goes out, and destroys the objects of
 * entities that were destroyed.
 * @example #Replicate zombies
 *     const entities = new IgeNetEntityHost(host.replicator, [Zombie]);
 *     new Zombie().mount(scene).replicate();
 *     viewer.subscribe(scene.id());
 */
export class IgeNetEntityHost {
	readonly replicator: IgeNetReplicator;
	readonly classes: IgeNetEntityClass[];
	_held: Map<string, Held> = new Map();
	_byKind: Map<string, IgeNetEntityClass> = new Map();
	/** A reused object per kind to read entities into. */
	_scratch: Map<IgeNetEntityDescription, Record<string, unknown>> = new Map();
	_off: () => void;

	constructor (replicator: IgeNetReplicator, classes: IgeNetEntityClass[]) {
		this.replicator = replicator;
		this.classes = classes;
		for (const cls of classes) {
			if (!cls.net) throw new Error(`${cls.name} has no static net (igeNetEntity)`);
			if (this._byKind.has(cls.net.kind)) throw new Error(`Two entity classes have the kind "${cls.net.kind}"`);
			this._byKind.set(cls.net.kind, cls);
		}
		this._off = replicator.beforeFlush(() => this._sync());
		igeNetSetLatestEntityHost(this);
	}

	/** Starts replicating an entity (its class must be one of this host's). */
	add (entity: IgeEntity, options: IgeNetEntityAddOptions = {}): this {
		const id = entity.id();
		if (this._held.has(id)) return this;
		const net = this._netOf(entity);
		const relevant = options.relevant;
		const scope = options.scope ?? sceneIdOf(entity);
		const values: Record<string, unknown> = {};
		this._read(entity, net, values);
		const obj = this.replicator.create(net.kind, id, values, { scope, owner: options.owner, hidden: !!relevant });
		const held: Held = { entity, net, obj, options };
		if (relevant) held.shown = new Set();
		this._held.set(id, held);
		if (relevant) this._reveal(held, this.replicator.viewers());
		return this;
	}

	/** Stops replicating an entity: its object is destroyed (clients lose it). */
	remove (entity: IgeEntity): this {
		const id = entity._id;
		const held = id ? this._held.get(id) : undefined;
		if (!held) return this;
		this._held.delete(id!);
		this.replicator.destroy(held.obj);
		return this;
	}

	/** Whether the entity is being replicated. */
	has (entity: IgeEntity): boolean {
		return !!entity._id && this._held.get(entity._id)?.entity === entity;
	}

	/** An entity's replicated object: for `viewer.control(obj)`, `addInterest(obj)`, `focus(obj)`. */
	objectOf (entity: IgeEntity): IgeNetObject | undefined {
		return entity._id ? this._held.get(entity._id)?.obj : undefined;
	}

	/** Stops reading entities each round. The objects stay as they are. */
	destroy (): void {
		this._off();
		this._held.clear();
		igeNetSetLatestEntityHost(undefined);
	}

	_netOf (entity: IgeEntity): IgeNetEntityDescription {
		const net = (entity.constructor as Partial<IgeNetEntityClass>).net;
		if (!net || this._byKind.get(net.kind)?.net !== net) throw new Error(`${entity.constructor.name} isn't one of this host's entity classes`);
		return net;
	}

	/** Reads an entity into `out`: transform, declared fields and the parent's id. */
	_read (entity: IgeEntity, net: IgeNetEntityDescription, out: Record<string, unknown>): void {
		const t = entity._translate;
		out.x = t.x;
		out.y = t.y;
		out.z = t.z;
		if (net.rotation !== "none") {
			const r = entity._rotate;
			if (net.rotation === "xyz") {
				out.rx = r.x;
				out.ry = r.y;
				out.rz = r.z;
			} else if (net.rotation === "y") out.ry = r.y;
			else out.rz = r.z;
		}
		if (net.scale) {
			const s = entity._scale;
			out.sx = s.x;
			out.sy = s.y;
			out.sz = s.z;
		}
		for (const name in net.fields) out[name] = (entity as unknown as Record<string, unknown>)[name];
		out.p = entity._parent ? entity._parent.id() : "";
	}

	_reveal (held: Held, viewers: IgeNetViewer[]): void {
		const shown = held.shown!;
		const relevant = held.options.relevant!;
		for (const viewer of viewers) {
			const want = relevant(viewer);
			if (want && !shown.has(viewer)) {
				shown.add(viewer);
				viewer.reveal(held.obj);
			} else if (!want && shown.has(viewer)) {
				shown.delete(viewer);
				viewer.unreveal(held.obj);
			}
		}
		// Viewers that have gone
		if (shown.size > viewers.length) for (const viewer of shown) if (!viewers.includes(viewer)) shown.delete(viewer);
	}

	/** Each send round: reads every entity into its object. */
	_sync (): void {
		let viewers: IgeNetViewer[] | undefined;
		for (const [id, held] of this._held) {
			const { entity, obj, options } = held;
			if (!entity._alive || obj.destroyed) {
				this._held.delete(id);
				this.replicator.destroy(obj);
				continue;
			}
			let scratch = this._scratch.get(held.net);
			if (!scratch) this._scratch.set(held.net, (scratch = {}));
			this._read(entity, held.net, scratch);
			obj.write(scratch);
			if (!options.owner && options.scope === undefined) {
				const scope = sceneIdOf(entity);
				if (obj.scope !== scope) obj.moveTo(scope);
			}
			if (held.shown) this._reveal(held, (viewers ??= this.replicator.viewers()));
		}
	}
}

/** The id of an entity's scene: its first IgeScene2d ancestor, or the root of its tree. */
function sceneIdOf (entity: IgeEntity): string {
	let at: IgeObject = entity;
	while (at._parent) {
		at = at._parent;
		if (at instanceof IgeScene2d) break;
	}
	return at.id();
}
