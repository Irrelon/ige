import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { igeNetQuatSlerp, igeNetQuatUnpack, type IgeNetQuat } from "@/engine/network/entities/igeNetQuat";
import type { IgeNetEntityClass, IgeNetEntityDescription } from "@/engine/network/entities/igeNetEntity";
import type { IgeNetClientObject, IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";

export interface IgeNetEntityClientOptions {
	/** Finds a parent by id (default `ige.$(id)`). Streamed parents are found among the client's own entities first. */
	parent?: (id: string) => IgeObject | undefined;
	/** The id a client entity gets for an object id (default the same id). Tests with a server and a client in one process need this, because entity ids are global. */
	idOf?: (objectId: string) => string;
}

interface Control {
	slot: number;
	apply: (values: any, input: any, dt: number) => any;
}

interface Made {
	entity: IgeEntity;
	net: IgeNetEntityDescription;
	/** The client's object this entity follows (a new one with the same id means a new entity). */
	source: IgeNetClientObject;
	/** The declared field values last set on the entity. */
	last: Record<string, unknown>;
	/** The parent id the entity is mounted for, or undefined while its parent isn't there yet. */
	mountedFor?: string;
}

/**
 * Makes and follows entities for the objects an IgeNetReplicationClient receives, for the classes
 * given (each with `static net`). Call `update()` each frame (or `attach()` to have the engine do it):
 * new objects get an entity (made by the class's `netCreate(values)` or `new Class()`), mounted under
 * its parent; every entity takes the interpolated transform and declared fields; entities of
 * destroyed objects are destroyed.
 * @example #Follow replicated zombies
 *     const entities = new IgeNetEntityClient(client, [Zombie]);
 *     entities.attach();
 *     entities.control(me, 0, (state, input, dt) => movePlayer(state, input, dt)); // predict my own
 */
export class IgeNetEntityClient {
	readonly client: IgeNetReplicationClient<any>;
	readonly classes: IgeNetEntityClass[];
	_byKind: Map<string, IgeNetEntityClass> = new Map();
	_made: Map<string, Made> = new Map();
	_controls: Map<string, Control> = new Map();
	_parentOf: (id: string) => IgeObject | undefined;
	_idOf: (objectId: string) => string;
	_attachedId?: string;
	_quat: IgeNetQuat = { x: 0, y: 0, z: 0, w: 1 };
	_seq = -1;
	_seqAt = 0;

	constructor (client: IgeNetReplicationClient<any>, classes: IgeNetEntityClass[], options: IgeNetEntityClientOptions = {}) {
		this.client = client;
		this.classes = classes;
		for (const cls of classes) {
			if (!cls.net) throw new Error(`${cls.name} has no static net (igeNetEntity)`);
			if (this._byKind.has(cls.net.kind)) throw new Error(`Two entity classes have the kind "${cls.net.kind}"`);
			this._byKind.set(cls.net.kind, cls);
		}
		this._parentOf = options.parent ?? ((id) => ige.$(id) as IgeObject | undefined);
		this._idOf = options.idOf ?? ((id) => id);
	}

	/** The client entity of an object id. */
	entityOf (objectId: string): IgeEntity | undefined {
		return this._made.get(objectId)?.entity;
	}

	/** Every entity made and not yet destroyed. */
	all (): IgeEntity[] {
		const out: IgeEntity[] = [];
		for (const made of this._made.values()) if (made.entity._alive) out.push(made.entity);
		return out;
	}

	/**
	 * The player's own entity is predicted: each frame it takes `client.predict()` through `apply(values, input, dt)`
	 * (the game's movement rule on the replicated values) in place of the interpolated values.
	 */
	control<State extends Record<string, unknown> = Record<string, unknown>, Input = Record<string, unknown>> (
		objectId: string,
		slot: number,
		apply: (values: State, input: Input, dt: number) => State
	): this {
		this._controls.set(objectId, { slot, apply });
		return this;
	}

	uncontrol (objectId: string): this {
		this._controls.delete(objectId);
		return this;
	}

	/** Has the engine call `update()` each frame. */
	attach (): this {
		if (this._attachedId) return this;
		this._attachedId = `igeNetEntityClient${nextAttach++}`;
		ige.engine.addBehaviour(IgeBehaviourType.preUpdate, this._attachedId, () => this.update());
		return this;
	}

	detach (): this {
		if (!this._attachedId) return this;
		ige.engine.removeBehaviour(IgeBehaviourType.preUpdate, this._attachedId);
		this._attachedId = undefined;
		return this;
	}

	/**
	 * Brings the entities in line with what the client has. `renderTime` is a time in ms (default the client's clock):
	 * a predicted entity is drawn that far between its last two input ticks. `between` (0 to 1) says it directly.
	 */
	update (renderTime?: number, between?: number): void {
		const client = this.client;
		const world = client.interpolated();
		// Entities of objects that went (or came back as another object)
		for (const [id, made] of this._made) {
			if (client.objects.get(id) !== made.source) {
				this._made.delete(id);
				if (made.entity._alive) made.entity.destroy();
			}
		}
		// New objects first, so a child whose create came before its parent's still finds it
		for (const id in world) {
			if (this._made.has(id)) continue;
			const source = client.objects.get(id);
			const cls = source && !source.anon ? this._byKind.get(source.kind) : undefined;
			if (!source || !cls) continue;
			const values = world[id];
			const entity = cls.netCreate ? cls.netCreate(values) : new cls();
			entity.id(this._idOf(id));
			const made: Made = { entity, net: cls.net, source, last: {} };
			this._made.set(id, made);
			this._setFields(made, values, false);
		}
		if (this._controls.size) {
			const now = renderTime ?? client._now();
			if (client._seq !== this._seq) {
				this._seq = client._seq;
				this._seqAt = now;
			}
			if (between === undefined) between = Math.max(0, Math.min(1, ((now - this._seqAt) * client.tickRate) / 1000));
		}
		for (const [id, made] of this._made) {
			if (!made.entity._alive) continue;
			let values = world[id];
			const control = this._controls.get(id);
			if (control) values = client.predict(id, control.slot, control.apply, { between }) ?? values;
			if (!values) continue;
			this._follow(made, values);
			this._setFields(made, values, true);
		}
	}

	_follow (made: Made, values: Record<string, unknown>): void {
		const { entity, net } = made;
		const t = entity._translate;
		const x = values.x as number, y = values.y as number, z = values.z as number;
		if (t.x !== x || t.y !== y || t.z !== z) entity.translateTo(x, y, z);
		if (net.rotation === "quaternion") {
			const q = this._quaternionOf(made, values);
			if (q) {
				const current = entity._quaternion;
				if (!current || current.x !== q.x || current.y !== q.y || current.z !== q.z || current.w !== q.w) entity.quaternion(q);
			}
		} else if (net.rotation !== "none") {
			const r = entity._rotate;
			const rx = net.rotation === "xyz" ? (values.rx as number) : r.x;
			const ry = net.rotation === "xyz" || net.rotation === "y" ? (values.ry as number) : r.y;
			const rz = net.rotation === "xyz" || net.rotation === "z" ? (values.rz as number) : r.z;
			if (r.x !== rx || r.y !== ry || r.z !== rz) entity.rotateTo(rx, ry, rz);
		}
		if (net.scale) {
			const s = entity._scale;
			const sx = values.sx as number, sy = values.sy as number, sz = values.sz as number;
			if (s.x !== sx || s.y !== sy || s.z !== sz) entity.scaleTo(sx, sy, sz);
		}
		// The parent: mount (again) when it changed, or when it wasn't there yet
		const p = (values.p as string | undefined) ?? "";
		if (made.mountedFor !== p) {
			if (p === "") {
				entity.unMount();
				made.mountedFor = p;
			} else {
				const parent = this._made.get(p)?.entity ?? this._parentOf(this._idOf(p));
				if (parent && parent._alive) {
					entity.mount(parent);
					made.mountedFor = p;
				}
			}
		}
	}

	/**
	 * The entity's rotation now: the quaternions of the two states either side of the tick the client
	 * last drew at, blended along the shortest path (replicated packed quaternions step, so this is
	 * done here). Falls back to the packed value in `values`.
	 */
	_quaternionOf (made: Made, values: Record<string, unknown>): IgeNetQuat | undefined {
		const states = made.source.states;
		const tick = this.client._viewTick;
		if (tick !== undefined && states.length > 1) {
			let i = states.length - 1;
			while (i >= 0 && states[i].tick > tick) i--;
			if (i >= 0 && i < states.length - 1) {
				const a = states[i], b = states[i + 1];
				const qa = a.values.q, qb = b.values.q;
				if (typeof qa === "number" && typeof qb === "number") {
					const f = Math.min(1, (tick - a.tick) / (b.tick - a.tick));
					return igeNetQuatSlerp(igeNetQuatUnpack(qa), igeNetQuatUnpack(qb), f, this._quat);
				}
			}
		}
		return typeof values.q === "number" ? igeNetQuatUnpack(values.q, undefined, this._quat) : undefined;
	}

	_setFields (made: Made, values: Record<string, unknown>, notify: boolean): void {
		const { entity, net, last } = made;
		let changed: string[] | undefined;
		for (const name in net.fields) {
			const value = values[name];
			if (value === undefined && !(name in values)) continue;
			if (name in last && last[name] === value) continue;
			last[name] = value;
			Reflect.set(entity, name, value);
			(changed ??= []).push(name);
		}
		if (changed && notify) (entity as unknown as { onNetChange?: (changed: string[]) => void }).onNetChange?.(changed);
	}

	/** Detaches and destroys every entity made. */
	destroy (): void {
		this.detach();
		for (const made of this._made.values()) if (made.entity._alive) made.entity.destroy();
		this._made.clear();
	}
}

let nextAttach = 1;
