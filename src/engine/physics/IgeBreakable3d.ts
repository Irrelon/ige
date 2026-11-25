import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { ige } from "@/engine/instance";
import { invertMat4 } from "@/engine/webgl/IgeRaycast";
import { matrixToQuaternion } from "@/engine/webgl/IgeModelParts";
import {
	igeFracture,
	igeFracturePieces,
	igeFracturePrepare,
	igeFractureRandom,
	igeFractureSeed,
	type IgeFractureColor,
	type IgeFractureMesh,
	type IgeFracturePattern,
	type IgeFracturePiece
} from "@/engine/physics/IgeFracture";
import { multiplyQuat, rotateVector, type IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsBodyHandle } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsBodyOptions, IgePhysicsBodyState, IgePhysicsQuat, IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";

/*
 * Breakable props for IgePhysics3d: watch a body's hits, and past a
 * threshold cut it into pieces (igeFracture(), seeded, so every machine
 * cuts the same ones) or swap in pre-made pieces, throw them along the
 * blow, and clear the small ones away after a while. Neutral code over the
 * physics backend: nothing here knows which engine runs the world.
 *
 * Online, the authority breaks props and sends the "break" event (a
 * seed, the hit in the prop's own space, the impulse); clients replay it
 * with replay() and cut the same pieces. Big pieces have stable ids
 * (`${key}#${index}`) for the server to replicate; small ones are each
 * machine's own. See guides/breakables-3d.md.
 */

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** How a material breaks. */
export interface IgeBreakableMaterial {
	/** kg per cubic metre of the solid stuff (a hollow prop: pass `mass` instead). */
	density: number;
	/** Colour of the cut faces. */
	insideColor: IgeFractureColor;
	pattern: IgeFracturePattern;
	/** About how many pieces near the hit. */
	pieces: number;
	/** Thin parts crack like glass. */
	glass?: boolean;
	friction: number;
	restitution: number;
	/** What effects to show (IgeBreakableEffects3d): "splinters", "glass", "dust", "chips", "sparks" or "none". */
	effect: string;
}

/** The built-in materials. Override any value with an object: `material: { ...IGE_BREAKABLE_MATERIALS.wood, pieces: 6 }`. */
export const IGE_BREAKABLE_MATERIALS: Record<"wood" | "glass" | "concrete" | "plastic" | "metal", IgeBreakableMaterial> = {
	wood: { density: 550, insideColor: { r: 0.9, g: 0.77, b: 0.55 }, pattern: "auto", pieces: 10, friction: 0.6, restitution: 0.1, effect: "splinters" },
	glass: { density: 2500, insideColor: { r: 0.62, g: 0.82, b: 0.76 }, pattern: "glass", glass: true, pieces: 14, friction: 0.4, restitution: 0.05, effect: "glass" },
	concrete: { density: 2400, insideColor: { r: 0.6, g: 0.58, b: 0.54 }, pattern: "voronoi", pieces: 9, friction: 0.8, restitution: 0.02, effect: "dust" },
	plastic: { density: 950, insideColor: { r: 0.92, g: 0.9, b: 0.86 }, pattern: "slab", pieces: 6, friction: 0.5, restitution: 0.25, effect: "chips" },
	metal: { density: 7800, insideColor: { r: 0.55, g: 0.56, b: 0.58 }, pattern: "whole", pieces: 1, friction: 0.5, restitution: 0.1, effect: "sparks" }
};

export interface IgeBreakableOptions {
	/**
	 * How hard a hit breaks it: an impulse in kg * IGE units per second,
	 * as in "impact" events (speed change times mass). For a body that the
	 * world moves (a crate), its own change of momentum; for a fixed one (a
	 * fence, a window), the change of momentum of what hit it.
	 */
	threshold: number;
	/** "wood" (default), "glass", "concrete", "plastic", "metal", or your own (see IgeBreakableMaterial). */
	material?: keyof typeof IGE_BREAKABLE_MATERIALS | IgeBreakableMaterial;
	/**
	 * About how many pieces to cut it into near the hit (the material's
	 * default otherwise), or pre-made pieces: meshes in the prop's own space
	 * that spawn instead of cut ones.
	 */
	pieces?: number | IgeFractureMesh[];
	/** How it breaks (the material's otherwise): see IgeFracturePattern. */
	pattern?: IgeFracturePattern;
	/** The seed of its cuts (default: from `key`). Every machine uses the same one, so they cut the same pieces. */
	seed?: number;
	/** Its id across machines, naming its pieces `${key}#${index}` (default: the entity's id). */
	key?: string;
	/** The mesh to cut (default: the entity's geometry), in the entity's own space. */
	geometry?: IgeGeometryData3d;
	/** A body for it when the entity has none yet (default: a static convex hull of its mesh). */
	body?: IgePhysicsBodyOptions;
	/** Total mass in kg; its pieces share it by volume (for hollow props: a crate is mostly air). */
	mass?: number;
	/** kg per cubic metre (the material's otherwise; `mass` wins). */
	density?: number;
	/** How far from the hit it breaks, in IGE units (default: a quarter of its size). Harder hits reach up to 1.6 times further. */
	radius?: number;
	/** Pieces at least this big (IGE units cubed) are big (synced online). Default 20 litres (20,000 at 100 units per metre). */
	bigVolume?: number;
	/** At most this many big pieces, the largest (default 6). */
	maxBig?: number;
	/** Seconds small pieces last before fading (default 6). */
	debrisLifetime?: number;
	/** Seconds big pieces last before fading (default: until removed). */
	bigLifetime?: number;
	/** Seconds a piece takes to fade out (default 0.6). */
	fadeTime?: number;
	/**
	 * For a fixed prop: what hit it carries on through, losing the
	 * threshold's worth of momentum times this (default 1). 0: it keeps all
	 * its speed.
	 */
	absorb?: number;
	/**
	 * Default true: it breaks itself when hit hard enough. False on a
	 * client whose server breaks things: a hard hit only emits "hit" and
	 * lets the hitter through, and the pieces come when the server's event
	 * is replayed (replay()); if none comes within predictTimeout, the prop
	 * is solid again.
	 */
	authority?: boolean;
	/** Seconds to wait for the server's break after a predicted hit (default 1). */
	predictTimeout?: number;
	/**
	 * "dynamic" (default): big pieces are simulated here. "kinematic": they
	 * follow their entities, which the game moves from replication (a
	 * client), and still push small debris and cars about.
	 */
	bigPieces?: "dynamic" | "kinematic";
	/** Colour of cut faces (the material's otherwise). */
	insideColor?: IgeFractureColor;
	/** Collision layer for big pieces (default: the prop's, or "moving"). */
	layer?: string;
	/** Collision layer for small pieces, e.g. one characters ignore (default: as big ones). */
	debrisLayer?: string;
	/**
	 * Continuous collision so fast pieces don't pass through walls:
	 * "small" (default: small pieces only), "all" or "none".
	 */
	continuous?: "small" | "all" | "none";
	/** What happens to the prop's own entity: "destroy" (default), "hide" or "keep". */
	remove?: "destroy" | "hide" | "keep";
	/** How hard pieces burst out from the hit, times the default (1). */
	burst?: number;
	/** Most pieces from one break (the smallest dropped; default 40). */
	maxPieces?: number;
}

/**
 * A break, as plain numbers: what the authority sends, and what replay()
 * takes. Points and impulses are in the prop's own space (so the prop
 * may sit at slightly different places on different machines), rounded
 * so that JSON carries them exactly.
 */
export interface IgeBreakEvent {
	/** The breakable's key. */
	id: string;
	seed: number;
	/** Where it was hit, in its own space, to 1/16 of a unit. */
	point: Vec3;
	/** The blow, in its own space, kg * IGE units per second (whole numbers). */
	impulse: Vec3;
	/** Where its entity was (world origin and rotation) when it broke. */
	position?: Vec3;
	rotation?: Quat;
	/** Its velocity (IGE units per second) when it broke, and what hit it's. */
	velocity?: Vec3;
	hitVelocity?: Vec3;
	/** The big pieces' ids, in order. */
	big: string[];
}

/** What a break made: the event plus the pieces on this machine. */
export interface IgeBreakResult {
	event: IgeBreakEvent;
	breakable: IgeBreakable3d;
	pieces: IgeBreakablePiece3d[];
	big: IgeBreakablePiece3d[];
	/** World position of the hit, and the blow's direction (unit). */
	point: Vec3;
	direction: Vec3;
	/** The impulse over the threshold (1 = just broke it). */
	strength: number;
	/** The material's effect name (see IgeBreakableMaterial.effect). */
	effect: string;
	material: IgeBreakableMaterial;
	/** Milliseconds cutting and spawning. */
	fractureMs: number;
	spawnMs: number;
}

/** A piece of a broken prop: an entity with a body, and a stable id. */
export class IgeBreakablePiece3d {
	/** `${key}#${index}`: the same on every machine that cut the same break. */
	readonly id: string;
	readonly index: number;
	/** Big pieces are synced online; small ones are each machine's own debris. */
	readonly big: boolean;
	readonly entity: IgeEntity;
	readonly body: IgePhysicsBody3d;
	/** IGE units cubed. */
	readonly volume: number;
	readonly breakable: IgeBreakable3d;
	/** Seconds since it spawned (simulated time). */
	age: number = 0;
	/** Seconds it lasts before fading (Infinity: until removed). */
	lifetime: number;
	_fadeTime: number;
	_geometry: IgeGeometryData3d;
	_removed: boolean = false;

	constructor (breakable: IgeBreakable3d, index: number, big: boolean, entity: IgeEntity, body: IgePhysicsBody3d, volume: number, geometry: IgeGeometryData3d, lifetime: number, fadeTime: number) {
		this.breakable = breakable;
		this.id = `${breakable.key}#${index}`;
		this.index = index;
		this.big = big;
		this.entity = entity;
		this.body = body;
		this.volume = volume;
		this._geometry = geometry;
		this.lifetime = lifetime;
		this._fadeTime = fadeTime;
	}

	/** Whether it has been removed (faded, capped or destroyed). */
	removed (): boolean {
		return this._removed;
	}

	/**
	 * Put the piece where a replicated state says (a client following the
	 * server's big pieces): a kinematic piece glides there over the next
	 * step, a dynamic one jumps.
	 */
	follow (state: IgePhysicsBodyState): this {
		if (this._removed) return this;
		if (this.body.type === "kinematic") {
			this.entity.translateTo(state.position.x, state.position.y, state.position.z);
			this.entity.quaternion(state.rotation);
		} else {
			this.body.setState(state);
		}
		return this;
	}

	/** Remove it now (no fade): its body, entity and GPU mesh. */
	destroy (): void {
		this.breakable._world._removePiece(this);
	}
}

interface WatchPair {
	breakable: IgeBreakable3d;
	/** The body that may hit it (null: its own velocity, a dynamic prop). */
	other: IgePhysicsBody3d | null;
	/** Velocity before the step, metres per second. */
	v0: Vec3;
	w0: Vec3;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
/** Movers slower than this (IGE units per second) aren't watched. */
const MIN_MOVER_SPEED = 30;

let nextGeometryId = 1;

/**
 * Every breakable in a physics world, and the pieces they broke into
 * (physics.breakables). Caps the debris across the world, oldest first.
 * Events: "break" (IgeBreakResult), "piece" (IgeBreakablePiece3d) for
 * each piece spawned, "pieceRemoved" (IgeBreakablePiece3d), "hit"
 * (IgeBreakEvent, IgeBreakable3d) for a hit predicted on a non-authority
 * breakable.
 */
export class IgeBreakables3d extends IgeEventingClass {
	classId = "IgeBreakables3d";
	readonly physics: IgePhysics3d;
	_list: IgeBreakable3d[] = [];
	_byKey: Map<string, IgeBreakable3d> = new Map();
	_pieces: Map<string, IgeBreakablePiece3d> = new Map();
	/** Small pieces, oldest first. */
	_debris: IgeBreakablePiece3d[] = [];
	_maxDebris: number = 150;
	_pairs: WatchPair[] = [];
	_movers: { body: IgePhysicsBody3d; x: number; y: number; z: number; reach: number }[] = [];
	_lastFractureMs: number = 0;
	_lastSpawnMs: number = 0;
	_breaks: number = 0;
	/** Meshes with the material's colour baked into their vertex colours, per geometry and colour. */
	_bakedMeshes: WeakMap<IgeGeometryData3d, Map<string, IgeFractureMesh>> = new WeakMap();

	constructor (physics: IgePhysics3d) {
		super();
		this.physics = physics;
	}

	/** Gets / sets the most small pieces alive in the world at once (default 150); past it the oldest go. */
	maxDebris (): number;
	maxDebris (val: number): this;
	maxDebris (val?: number): number | this {
		if (val === undefined) return this._maxDebris;
		this._maxDebris = Math.max(0, val);
		this._capDebris();
		return this;
	}

	/** Make an entity breakable (see IgePhysics3d.addBreakable()). */
	add (entity: IgeEntity, options: IgeBreakableOptions): IgeBreakable3d {
		const breakable = new IgeBreakable3d(this, entity, options);
		if (this._byKey.has(breakable.key)) throw new Error(`IgeBreakables3d: a breakable called "${breakable.key}" already exists (give each a unique key)`);
		this._list.push(breakable);
		this._byKey.set(breakable.key, breakable);
		return breakable;
	}

	/** The breakable with this key. */
	get (key: string): IgeBreakable3d | undefined {
		return this._byKey.get(key);
	}

	/** A live piece by its id (`${key}#${index}`), e.g. to move a replicated big piece. */
	piece (id: string): IgeBreakablePiece3d | undefined {
		return this._pieces.get(id);
	}

	/** Every live piece. */
	pieces (): IgeBreakablePiece3d[] {
		return [...this._pieces.values()];
	}

	/**
	 * Break a prop as another machine broke it: the same seed, hit and
	 * impulse cut the same pieces with the same ids. Returns null if there's
	 * no breakable with that key or it's already broken.
	 */
	replay (event: IgeBreakEvent): IgeBreakResult | null {
		const breakable = this._byKey.get(event.id);
		return breakable ? breakable.replay(event) : null;
	}

	/** Counts, and how long the last break took to cut and to spawn (ms). */
	stats (): { breakables: number; intact: number; pieces: number; debris: number; big: number; breaks: number; lastFractureMs: number; lastSpawnMs: number } {
		let intact = 0, big = 0;
		for (const breakable of this._list) if (!breakable._broken) intact++;
		for (const piece of this._pieces.values()) if (piece.big) big++;
		return { breakables: this._list.length, intact, pieces: this._pieces.size, debris: this._debris.length, big, breaks: this._breaks, lastFractureMs: this._lastFractureMs, lastSpawnMs: this._lastSpawnMs };
	}

	/** Remove every piece and forget every breakable (their props stay as they are). */
	destroy (): void {
		for (const piece of [...this._pieces.values()]) this._removePiece(piece);
		for (const breakable of [...this._list]) breakable.destroy();
		this._pairs.length = 0;
	}

	/* Stepping (IgePhysics3d calls these round every fixed step) */

	/** Before a step: remember the velocities of what might break something. */
	_preStep (dt: number): void {
		const pairs = this._pairs;
		pairs.length = 0;
		let watching = false;
		for (const breakable of this._list) {
			if (breakable._watching()) {
				watching = true;
				break;
			}
		}
		if (!watching) return;
		const physics = this.physics;
		const backend = physics._backend;

		// What's moving: dynamic bodies and vehicles, from their last two steps
		const movers = this._movers;
		movers.length = 0;
		const minStep2 = (MIN_MOVER_SPEED * dt) * (MIN_MOVER_SPEED * dt);
		for (const body of physics._list) {
			if (body.type !== "dynamic" || !body._enabled || !body._moving || body._sensor) continue;
			const c = body._current, p = body._previous;
			const dx = c[0] - p[0], dy = c[1] - p[1], dz = c[2] - p[2];
			const step2 = dx * dx + dy * dy + dz * dz;
			if (step2 < minStep2) continue;
			movers.push({ body, x: c[0], y: c[1], z: c[2], reach: reachOf(body) + Math.sqrt(step2) * 2 });
		}
		for (const vehicle of physics._vehicles) {
			if (!vehicle._enabled || vehicle._destroyed) continue;
			const body = physics._vehicleBodies.get(vehicle);
			if (!body) continue;
			const v = vehicle._velocity;
			const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
			if (speed < MIN_MOVER_SPEED) continue;
			const c = vehicle._current;
			movers.push({ body, x: c[0], y: c[1], z: c[2], reach: reachOf(body) + 100 + speed * dt * 2 });
		}

		for (const breakable of this._list) {
			if (!breakable._watching()) continue;
			const own = breakable.body;
			if (own.type === "dynamic") {
				// Its own change of momentum tells: no need to know what hit it
				const v0 = { x: 0, y: 0, z: 0 }, w0 = { x: 0, y: 0, z: 0 };
				if (own._moving) backend.readBodyVelocity(own._handle, v0, w0);
				pairs.push({ breakable, other: null, v0, w0 });
				continue;
			}
			const centre = breakable._worldCentre();
			for (const mover of movers) {
				if (mover.body === own) continue;
				const dx = mover.x - centre.x, dy = mover.y - centre.y, dz = mover.z - centre.z;
				const reach = mover.reach + breakable._radius + 20;
				if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
				const v0 = { x: 0, y: 0, z: 0 }, w0 = { x: 0, y: 0, z: 0 };
				backend.readBodyVelocity(mover.body._handle, v0, w0);
				pairs.push({ breakable, other: mover.body, v0, w0 });
			}
		}
	}

	/** After a step: break what was hit hard enough, and age the debris. */
	_postStep (dt: number): void {
		if (this._pairs.length) this._checkHits(dt);
		for (const breakable of this._list) breakable._tickPrediction(dt);
		this._ageDebris(dt);
	}

	_checkHits (dt: number): void {
		const physics = this.physics;
		const backend = physics._backend;
		const u = physics.unitsPerMetre();
		const gravity = physics.gravity();
		const v1: Vec3 = { x: 0, y: 0, z: 0 }, w1: Vec3 = { x: 0, y: 0, z: 0 };
		// The hardest hit on each breakable this step
		const best = new Map<IgeBreakable3d, { impulse: number; pair: WatchPair; dv: Vec3; mass: number }>();
		for (const pair of this._pairs) {
			const breakable = pair.breakable;
			if (!breakable._watching()) continue;
			const body = pair.other ?? breakable.body;
			if (body._destroyed || !body._enabled) continue;
			backend.readBodyVelocity(body._handle, v1, w1);
			const g = gravity * (body.options.gravityFactor ?? 1) * dt;
			const dv = { x: v1.x - pair.v0.x, y: v1.y - (pair.v0.y + g), z: v1.z - pair.v0.z };
			const mass = backend.bodyMass(body._handle);
			if (!isFinite(mass) || mass <= 0) continue;
			let impulse: number;
			if (!pair.other) {
				impulse = mass * Math.sqrt(dv.x * dv.x + dv.y * dv.y + dv.z * dv.z) * u;
			} else {
				// Only what pushed it back off the prop counts (not its own braking alongside)
				const away = breakable._awayFrom(body);
				impulse = mass * Math.max(0, dv.x * away.x + dv.y * away.y + dv.z * away.z) * u;
			}
			if (impulse < breakable.threshold) continue;
			const current = best.get(breakable);
			if (!current || impulse > current.impulse) best.set(breakable, { impulse, pair, dv, mass });
		}
		for (const [breakable, hit] of best) {
			if (!breakable._watching()) continue;
			const other = hit.pair.other;
			// A fixed prop: make sure the hitter really is touching it
			if (other && !this._touching(breakable.body, other)) continue;
			breakable._hit(hit.impulse, hit.dv, hit.mass, hit.pair);
		}
	}

	_touching (a: IgePhysicsBody3d, b: IgePhysicsBody3d): boolean {
		const out: IgePhysicsBodyHandle[] = [];
		this.physics._backend.touching(a._handle, 0.05, out);
		return out.includes(b._handle);
	}

	_ageDebris (dt: number): void {
		if (!this._pieces.size) return;
		for (const piece of [...this._pieces.values()]) {
			piece.age += dt;
			if (piece.age < piece.lifetime) continue;
			const fade = piece._fadeTime > 0 ? (piece.age - piece.lifetime) / piece._fadeTime : 1;
			if (fade >= 1) {
				this._removePiece(piece);
				continue;
			}
			piece.entity.opacity(1 - fade);
		}
	}

	_addPiece (piece: IgeBreakablePiece3d): void {
		this._pieces.set(piece.id, piece);
		if (!piece.big) {
			this._debris.push(piece);
			this._capDebris();
		}
	}

	/** Over the cap: the oldest small pieces go at once. */
	_capDebris (): void {
		while (this._debris.length > this._maxDebris) {
			const oldest = this._debris[0];
			this._removePiece(oldest);
		}
	}

	_removePiece (piece: IgeBreakablePiece3d): void {
		if (piece._removed) return;
		piece._removed = true;
		this._pieces.delete(piece.id);
		const index = this._debris.indexOf(piece);
		if (index >= 0) this._debris.splice(index, 1);
		if (!piece.body._destroyed) this.physics.removeBody(piece.body);
		piece.entity.destroy();
		releaseGeometry(piece._geometry);
		this.emit("pieceRemoved", piece);
	}

	/** The prop's mesh with the material's colour baked into its vertex colours (shared by props alike). */
	_bakedMesh (geometry: IgeGeometryData3d, material: IgeMaterialData | null): IgeFractureMesh {
		const color = material && typeof material.color === "object" ? material.color : null;
		const key = color ? `${color.r},${color.g},${color.b}` : "-";
		let byColor = this._bakedMeshes.get(geometry);
		if (!byColor) {
			byColor = new Map();
			this._bakedMeshes.set(geometry, byColor);
		}
		let mesh = byColor.get(key);
		if (mesh) return mesh;
		const count = Math.floor((geometry.vertices?.length ?? 0) / 3);
		const colors = new Float32Array(count * 4);
		const source = geometry.colors && geometry.colors.length >= count * 4 ? geometry.colors : null;
		for (let i = 0; i < count; i++) {
			const r = source ? source[i * 4] : 1, g = source ? source[i * 4 + 1] : 1, b = source ? source[i * 4 + 2] : 1;
			colors[i * 4] = r * (color ? color.r : 1);
			colors[i * 4 + 1] = g * (color ? color.g : 1);
			colors[i * 4 + 2] = b * (color ? color.b : 1);
			colors[i * 4 + 3] = 1;
		}
		mesh = { vertices: geometry.vertices, indices: geometry.indices, normals: geometry.normals, uvs: geometry.uvs, colors };
		byColor.set(key, mesh);
		return mesh;
	}
}

/**
 * A breakable prop: an entity whose body breaks into pieces when hit hard
 * enough. Made with physics.addBreakable(entity, options). Events:
 * "break" (IgeBreakResult) and, on a non-authority breakable, "hit"
 * (the predicted IgeBreakEvent).
 */
export class IgeBreakable3d extends IgeEventingClass {
	classId = "IgeBreakable3d";
	readonly entity: IgeEntity;
	readonly key: string;
	readonly options: IgeBreakableOptions;
	readonly threshold: number;
	readonly material: IgeBreakableMaterial;
	body: IgePhysicsBody3d;
	_world: IgeBreakables3d;
	_ownBody: boolean = false;
	_broken: boolean = false;
	_destroyed: boolean = false;
	/** Seconds left waiting for the server's break after a predicted hit (0: not waiting). */
	_predicting: number = 0;
	_geometry: IgeGeometryData3d;
	_premade: IgeFracturePiece[] | null = null;
	/** Mesh-space box: centre and half sizes. */
	_localCentre: Vec3;
	_localHalf: Vec3;
	/** Bounding radius in world units. */
	_radius: number;
	_seed: number;

	constructor (world: IgeBreakables3d, entity: IgeEntity, options: IgeBreakableOptions) {
		super();
		this._world = world;
		this.entity = entity;
		this.options = options;
		this.threshold = options.threshold;
		this.key = options.key ?? String(entity.id());
		this._seed = (options.seed ?? igeFractureSeed(this.key)) >>> 0;
		const preset = typeof options.material === "object" ? options.material : IGE_BREAKABLE_MATERIALS[options.material ?? "wood"];
		if (!preset) throw new Error(`IgeBreakable3d: no material called "${options.material}"`);
		this.material = preset;

		const geometry = options.geometry ?? entity._geometryData;
		if (!geometry?.vertices || geometry.vertices.length < 12) {
			throw new Error(`IgeBreakable3d: "${this.key}" has no mesh to break (give the entity a geometry, or pass one)`);
		}
		this._geometry = geometry;
		const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
		const v = geometry.vertices;
		for (let i = 0; i + 2 < v.length; i += 3) {
			for (let k = 0; k < 3; k++) {
				if (v[i + k] < lo[k]) lo[k] = v[i + k];
				if (v[i + k] > hi[k]) hi[k] = v[i + k];
			}
		}
		this._localCentre = { x: (lo[0] + hi[0]) / 2, y: (lo[1] + hi[1]) / 2, z: (lo[2] + hi[2]) / 2 };
		this._localHalf = { x: (hi[0] - lo[0]) / 2, y: (hi[1] - lo[1]) / 2, z: (hi[2] - lo[2]) / 2 };
		const scale = world.physics._entityPose(entity).scale;
		this._radius = Math.sqrt((this._localHalf.x * scale.x) ** 2 + (this._localHalf.y * scale.y) ** 2 + (this._localHalf.z * scale.z) ** 2);

		if (Array.isArray(options.pieces)) {
			const volumeScale = scale.x * scale.y * scale.z;
			this._premade = igeFracturePieces(options.pieces, {
				bigVolume: (options.bigVolume ?? defaultBigVolume(world.physics.unitsPerMetre())) / volumeScale,
				maxBig: options.maxBig ?? 6,
				insideColor: options.insideColor ?? preset.insideColor
			});
		}

		// Split its mesh into parts now, not on the first hit
		if (!this._premade) igeFracturePrepare(world._bakedMesh(geometry, entity._materialData));

		const existing = world.physics.bodyOf(entity);
		if (existing) {
			this.body = existing;
		} else {
			const bodyOptions: IgePhysicsBodyOptions = options.body ?? { type: "static", shape: { type: "convex", geometry } };
			this.body = world.physics.addBody(entity, bodyOptions);
			this._ownBody = true;
		}
		entity.on("destroyed", () => {
			if (!this._broken) this.destroy();
		});
	}

	/** Whether it has broken. */
	broken (): boolean {
		return this._broken;
	}

	/**
	 * Break it now (a game's own reason: an explosion, a shot), hit at a
	 * world point with an impulse (kg * IGE units per second, world axes).
	 * Without a point, its middle; without an impulse, the threshold's worth
	 * straight down. Breaks it even on a non-authority breakable.
	 */
	break (hit: { point?: Vec3; impulse?: Vec3 } = {}): IgeBreakResult | null {
		if (this._broken || this._destroyed) return null;
		const pose = this._pose();
		const point = hit.point ? this._toLocal(hit.point, pose) : { ...this._localCentre };
		const impulse = hit.impulse ? this._toLocalDirection(hit.impulse, pose) : { x: 0, y: -this.threshold, z: 0 };
		const event = this._event(point, impulse, pose, null);
		return this._breakWith(event, null);
	}

	/** Break it as another machine did, from its "break" event: the same pieces, the same ids. */
	replay (event: IgeBreakEvent): IgeBreakResult | null {
		if (this._broken || this._destroyed) return null;
		return this._breakWith(event, null);
	}

	/** Stop watching it (it stays as it is); the body goes too if addBreakable() made it. */
	destroy (): void {
		if (this._destroyed) return;
		this._destroyed = true;
		const world = this._world;
		const index = world._list.indexOf(this);
		if (index >= 0) world._list.splice(index, 1);
		if (world._byKey.get(this.key) === this) world._byKey.delete(this.key);
		if (this._ownBody && !this._broken && !this.body._destroyed) world.physics.removeBody(this.body);
	}

	/* Internals */

	/** Whether hits on it are being checked. */
	_watching (): boolean {
		return !this._broken && !this._destroyed && this._predicting <= 0 && this.body._enabled && !this.body._destroyed;
	}

	_tickPrediction (dt: number): void {
		if (this._predicting <= 0 || this._broken) return;
		this._predicting -= dt;
		// No break came: solid again
		if (this._predicting <= 0 && !this.body._destroyed) this.body.enabled(true);
	}

	/** The entity's origin, rotation and scale in the world (from its body when the world moves it). */
	_pose (): { position: Vec3; rotation: Quat; scale: Vec3 } {
		const physics = this._world.physics;
		const pose = physics._entityPose(this.entity);
		const body = this.body;
		if (body.type === "dynamic" && !body._destroyed && body._enabled) {
			const c = body._current;
			const q = body.options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : { x: c[3], y: c[4], z: c[5], w: c[6] };
			const o = body._worldOffset(q);
			return { position: { x: c[0] - o.x, y: c[1] - o.y, z: c[2] - o.z }, rotation: q, scale: pose.scale };
		}
		return pose;
	}

	_worldCentre (): Vec3 {
		return this._toWorld(this._localCentre, this._pose());
	}

	_toWorld (p: Vec3, pose: { position: Vec3; rotation: Quat; scale: Vec3 }): Vec3 {
		const q = pose.rotation, s = pose.scale;
		const r = rotateVector({ x: p.x * s.x, y: p.y * s.y, z: p.z * s.z }, q.x, q.y, q.z, q.w);
		return { x: pose.position.x + r.x, y: pose.position.y + r.y, z: pose.position.z + r.z };
	}

	_toLocal (p: Vec3, pose: { position: Vec3; rotation: Quat; scale: Vec3 }): Vec3 {
		const q = pose.rotation, s = pose.scale;
		const r = rotateVector({ x: p.x - pose.position.x, y: p.y - pose.position.y, z: p.z - pose.position.z }, -q.x, -q.y, -q.z, q.w);
		return { x: r.x / (s.x || 1), y: r.y / (s.y || 1), z: r.z / (s.z || 1) };
	}

	_toLocalDirection (v: Vec3, pose: { rotation: Quat }): Vec3 {
		const q = pose.rotation;
		return rotateVector(v, -q.x, -q.y, -q.z, q.w);
	}

	/** World direction from the prop's nearest surface to a body's centre. */
	_awayFrom (body: IgePhysicsBody3d): Vec3 {
		const pose = this._pose();
		const c = centreOf(body, this._world.physics.unitsPerMetre());
		const local = this._toLocal({ x: c[0], y: c[1], z: c[2] }, pose);
		const near = this._nearestOnBox(local);
		const world = this._toWorld(near, pose);
		let dx = c[0] - world.x, dy = c[1] - world.y, dz = c[2] - world.z;
		let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (len < 1e-6) {
			// Inside its box: away from its middle
			const centre = this._toWorld(this._localCentre, pose);
			dx = c[0] - centre.x; dy = c[1] - centre.y; dz = c[2] - centre.z;
			len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
		}
		return { x: dx / len, y: dy / len, z: dz / len };
	}

	/** The nearest point of the mesh's box to a local point (on its surface when the point is inside). */
	_nearestOnBox (p: Vec3): Vec3 {
		const c = this._localCentre, h = this._localHalf;
		const x = Math.min(c.x + h.x, Math.max(c.x - h.x, p.x));
		const y = Math.min(c.y + h.y, Math.max(c.y - h.y, p.y));
		const z = Math.min(c.z + h.z, Math.max(c.z - h.z, p.z));
		if (x !== p.x || y !== p.y || z !== p.z) return { x, y, z };
		// Inside: out through the nearest face
		const dx = h.x - Math.abs(p.x - c.x), dy = h.y - Math.abs(p.y - c.y), dz = h.z - Math.abs(p.z - c.z);
		if (dx <= dy && dx <= dz) return { x: c.x + Math.sign(p.x - c.x || 1) * h.x, y, z };
		if (dy <= dz) return { x, y: c.y + Math.sign(p.y - c.y || 1) * h.y, z };
		return { x, y, z: c.z + Math.sign(p.z - c.z || 1) * h.z };
	}

	/** Where a ray from a local point enters the mesh's box (null if it misses). */
	_rayIntoBox (from: Vec3, d: Vec3): Vec3 | null {
		const c = this._localCentre, h = this._localHalf;
		let near = 0, far = Infinity;
		const o = [from.x - c.x, from.y - c.y, from.z - c.z], dir = [d.x, d.y, d.z], half = [h.x, h.y, h.z];
		for (let k = 0; k < 3; k++) {
			if (Math.abs(dir[k]) < 1e-12) {
				if (Math.abs(o[k]) > half[k]) return null;
				continue;
			}
			let t1 = (-half[k] - o[k]) / dir[k], t2 = (half[k] - o[k]) / dir[k];
			if (t1 > t2) [t1, t2] = [t2, t1];
			near = Math.max(near, t1);
			far = Math.min(far, t2);
			if (near > far) return null;
		}
		return { x: from.x + d.x * near, y: from.y + d.y * near, z: from.z + d.z * near };
	}

	/** Where a ray from the box's middle along a local direction leaves the box. */
	_exitOfBox (d: Vec3): Vec3 {
		const c = this._localCentre, h = this._localHalf;
		let t = Infinity;
		if (Math.abs(d.x) > 1e-9) t = Math.min(t, h.x / Math.abs(d.x));
		if (Math.abs(d.y) > 1e-9) t = Math.min(t, h.y / Math.abs(d.y));
		if (Math.abs(d.z) > 1e-9) t = Math.min(t, h.z / Math.abs(d.z));
		if (!isFinite(t)) t = 0;
		return { x: c.x + d.x * t, y: c.y + d.y * t, z: c.z + d.z * t };
	}

	/** A hit over the threshold this step (from IgeBreakables3d). */
	_hit (impulse: number, dv: Vec3, mass: number, pair: WatchPair): void {
		const pose = this._pose();
		const u = this._world.physics.unitsPerMetre();
		const other = pair.other;
		let point: Vec3, blow: Vec3;
		if (other) {
			// Where the hitter met it (along its way in from its centre), and the blow it took (the reverse of what the hitter felt)
			const c = centreOf(other, u);
			const from = this._toLocal({ x: c[0], y: c[1], z: c[2] }, pose);
			const way = this._toLocalDirection(pair.v0, pose);
			const s = pose.scale;
			point = this._rayIntoBox(from, { x: way.x / (s.x || 1), y: way.y / (s.y || 1), z: way.z / (s.z || 1) }) ?? this._nearestOnBox(from);
			blow = { x: -dv.x * mass * u, y: -dv.y * mass * u, z: -dv.z * mass * u };
		} else {
			// Its own blow: it was hit on the side the push came from
			const len = Math.sqrt(dv.x * dv.x + dv.y * dv.y + dv.z * dv.z) || 1;
			const local = this._toLocalDirection({ x: -dv.x / len, y: -dv.y / len, z: -dv.z / len }, pose);
			const s = pose.scale;
			point = this._exitOfBox({ x: local.x / (s.x || 1), y: local.y / (s.y || 1), z: local.z / (s.z || 1) });
			blow = { x: dv.x * mass * u, y: dv.y * mass * u, z: dv.z * mass * u };
		}
		// Scale the blow to the measured impulse along it
		const blen = Math.sqrt(blow.x * blow.x + blow.y * blow.y + blow.z * blow.z) || 1;
		blow = { x: (blow.x / blen) * impulse, y: (blow.y / blen) * impulse, z: (blow.z / blen) * impulse };
		const hitVelocity = other ? { x: pair.v0.x * u, y: pair.v0.y * u, z: pair.v0.z * u } : null;
		const event = this._event(point, this._toLocalDirection(blow, pose), pose, hitVelocity);

		// A fixed prop lets what hit it carry on, less the momentum it took to break it
		if (other && this.body.type !== "dynamic") this._letThrough(pair, mass);

		if (this.options.authority === false) {
			this._predicting = this.options.predictTimeout ?? 1;
			this.body.enabled(false);
			this.emit("hit", event);
			this._world.emit("hit", event, this);
			return;
		}
		this._breakWith(event, other);
	}

	_letThrough (pair: WatchPair, mass: number): void {
		const other = pair.other!;
		const physics = this._world.physics;
		const u = physics.unitsPerMetre();
		const v0 = pair.v0;
		const speed = Math.sqrt(v0.x * v0.x + v0.y * v0.y + v0.z * v0.z);
		const loss = (this.threshold * (this.options.absorb ?? 1)) / mass / u;
		const k = speed > 0 ? Math.max(0, speed - loss) / speed : 0;
		const v = { x: v0.x * k, y: v0.y * k, z: v0.z * k };
		physics._backend.setBodyVelocity(other._handle, v, pair.w0);
		// A vehicle reads its velocity once a step: keep it in step, so it doesn't see a crash twice
		const vehicle = (other as any)._vehicle;
		if (vehicle?._velocity) {
			vehicle._velocity.x = v.x * u; vehicle._velocity.y = v.y * u; vehicle._velocity.z = v.z * u;
		}
	}

	/** A break event from a local hit, rounded so JSON carries it exactly. */
	_event (point: Vec3, impulse: Vec3, pose: { position: Vec3; rotation: Quat }, hitVelocity: Vec3 | null): IgeBreakEvent {
		const q16 = (n: number) => Math.round(n * 16) / 16;
		const round = (n: number) => Math.round(n);
		const event: IgeBreakEvent = {
			id: this.key,
			seed: this._seed,
			point: { x: q16(point.x), y: q16(point.y), z: q16(point.z) },
			impulse: { x: round(impulse.x), y: round(impulse.y), z: round(impulse.z) },
			position: { x: q16(pose.position.x), y: q16(pose.position.y), z: q16(pose.position.z) },
			rotation: { ...pose.rotation },
			big: []
		};
		if (this.body.type === "dynamic" && !this.body._destroyed) {
			const v = this.body.velocity();
			event.velocity = { x: round(v.x), y: round(v.y), z: round(v.z) };
		}
		if (hitVelocity) event.hitVelocity = { x: round(hitVelocity.x), y: round(hitVelocity.y), z: round(hitVelocity.z) };
		return event;
	}

	/** Cut (or take the pre-made pieces), remove the prop and spawn the pieces. */
	_breakWith (event: IgeBreakEvent, hitter: IgePhysicsBody3d | null): IgeBreakResult {
		const world = this._world;
		const physics = world.physics;
		const options = this.options;
		const material = this.material;
		const u = physics.unitsPerMetre();
		const pose = event.position && event.rotation
			? { position: event.position, rotation: event.rotation, scale: physics._entityPose(this.entity).scale }
			: this._pose();
		const scale = pose.scale;
		const volumeScale = scale.x * scale.y * scale.z;
		const sizeScale = Math.cbrt(Math.abs(volumeScale)) || 1;
		const j = event.impulse;
		const impulse = Math.sqrt(j.x * j.x + j.y * j.y + j.z * j.z);
		const strength = Math.max(1, impulse / this.threshold);

		// Cut it: harder hits make more, smaller pieces and reach further
		const started = now();
		let pieces: IgeFracturePiece[];
		if (this._premade) {
			pieces = this._premade;
		} else {
			const base = typeof options.pieces === "number" ? options.pieces : material.pieces;
			const count = Math.max(1, Math.round(base * Math.min(1.6, 0.8 + 0.2 * strength)));
			const size = Math.sqrt(this._localHalf.x ** 2 + this._localHalf.y ** 2 + this._localHalf.z ** 2) * 2;
			const radius = (options.radius !== undefined ? options.radius / sizeScale : size * 0.25) * Math.min(1.6, Math.sqrt(strength));
			const result = igeFracture(world._bakedMesh(this._geometry, this.entity._materialData), {
				seed: event.seed,
				point: event.point,
				direction: event.impulse,
				pieces: count,
				pattern: options.pattern ?? material.pattern,
				glass: material.glass,
				radius,
				insideColor: options.insideColor ?? material.insideColor,
				bigVolume: (options.bigVolume ?? defaultBigVolume(u)) / volumeScale,
				maxBig: options.maxBig ?? 6
			});
			pieces = result.pieces;
			// Too many: the smallest go (the order of the rest is kept, so ids still match)
			const maxPieces = options.maxPieces ?? 40;
			if (pieces.length > maxPieces) {
				const keep = new Set([...pieces].sort((a, b) => b.volume - a.volume || a.index - b.index).slice(0, maxPieces));
				pieces = pieces.filter((piece) => keep.has(piece));
			}
		}
		const fractureMs = now() - started;
		event.big = pieces.filter((piece) => piece.big).map((piece) => `${this.key}#${piece.index}`);

		// The prop goes
		const parent = this.entity._parent as IgeEntity | null;
		const bodyType = this.body.type;
		const propVelocity = event.velocity ?? ZERO;
		let propSpin: Vec3 = ZERO;
		if (bodyType === "dynamic" && !this.body._destroyed) propSpin = this.body.angularVelocity();
		const propLayer = this.body.options.layer;
		this._broken = true;
		this._predicting = 0;
		if (!this.body._destroyed) physics.removeBody(this.body);
		const remove = options.remove ?? "destroy";
		if (remove === "destroy") this.entity.destroy();
		else if (remove === "hide") this.entity.hide();

		// Its pieces
		const spawnStarted = now();
		const spawned: IgeBreakablePiece3d[] = [];
		const rng = igeFractureRandom((event.seed ^ 0x9e3779b9) >>> 0);
		const totalVolume = pieces.reduce((sum, piece) => sum + piece.volume, 0) * volumeScale;
		const density = options.density ?? (options.mass !== undefined ? options.mass / (totalVolume / (u * u * u)) : material.density);
		const totalMass = density * totalVolume / (u * u * u);
		const hitPoint = this._toWorld(event.point, pose);
		const blowDir = rotateVector(j, pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
		const blowLen = Math.sqrt(blowDir.x ** 2 + blowDir.y ** 2 + blowDir.z ** 2) || 1;
		const direction = { x: blowDir.x / blowLen, y: blowDir.y / blowLen, z: blowDir.z / blowLen };
		const hitVelocity = event.hitVelocity ?? null;
		const reach = Math.max(1, this._radius);
		// The burst: from the impulse spread over the mass, kept sensible
		const burst = Math.min(500, (0.35 * impulse) / Math.max(totalMass, 1)) * (options.burst ?? 1);
		const material3d = this.entity._materialData;
		const alpha = material3d && typeof material3d.color === "object" ? material3d.color.a ?? 1 : 1;
		const pieceMaterial: IgeMaterialData = { ...(material3d || {}), color: { r: 1, g: 1, b: 1, a: alpha } };
		const continuous = options.continuous ?? "small";
		const bigKinematic = (options.bigPieces ?? "dynamic") === "kinematic";

		for (const piece of pieces) {
			const id = `${this.key}#${piece.index}`;
			const geometry: IgeGeometryData3d = {
				id: `breakPiece_${nextGeometryId++}`,
				type: "primitive",
				vertices: piece.vertices,
				normals: piece.normals,
				uvs: piece.uvs,
				colors: piece.colors,
				indices: piece.indices
			};
			const entity = new IgeEntity();
			entity.geometry(geometry);
			entity.material(pieceMaterial);
			const centre = this._toWorld(piece.centre, pose);
			placeInParent(entity, parent, centre, pose.rotation, scale);
			if (parent) entity.mount(parent);

			const shape: IgePhysicsShape = piece.hulls && piece.hulls.length > 1
				? { type: "compound", children: piece.hulls.map((hull, i) => ({ shape: { type: "convex" as const, geometry: { id: `${geometry.id}_${i}`, vertices: hull } } })) }
				: { type: "convex", geometry: { id: `${geometry.id}_hull`, vertices: piece.hull } };
			const kinematic = piece.big && bigKinematic;
			const body = physics.addBody(entity, {
				type: kinematic ? "kinematic" : "dynamic",
				shape,
				density,
				friction: material.friction,
				restitution: material.restitution,
				layer: piece.big ? options.layer ?? propLayer : options.debrisLayer ?? options.layer ?? propLayer,
				// Continuous collision (the neutral `continuous` body option will take over from ccd)
				ccd: continuous === "all" || (continuous === "small" && !piece.big),
				linearDamping: 0.1,
				angularDamping: 0.2
			});

			if (!kinematic) {
				// The prop's own motion, a push from what hit it, a burst away from the hit and a tumble
				const rx = centre.x - hitPoint.x, ry = centre.y - hitPoint.y, rz = centre.z - hitPoint.z;
				const distance = Math.sqrt(rx * rx + ry * ry + rz * rz);
				const near = 1 / (1 + (distance / (reach * 0.6)) ** 2);
				let vx = propVelocity.x + (propSpin.y * (centre.z - pose.position.z) - propSpin.z * (centre.y - pose.position.y));
				let vy = propVelocity.y + (propSpin.z * (centre.x - pose.position.x) - propSpin.x * (centre.z - pose.position.z));
				let vz = propVelocity.z + (propSpin.x * (centre.y - pose.position.y) - propSpin.y * (centre.x - pose.position.x));
				if (hitVelocity) {
					const push = 0.75 * near;
					vx += (hitVelocity.x - propVelocity.x) * push;
					vy += (hitVelocity.y - propVelocity.y) * push;
					vz += (hitVelocity.z - propVelocity.z) * push;
				}
				const outx = distance > 1e-6 ? rx / distance : direction.x, outy = distance > 1e-6 ? ry / distance : direction.y, outz = distance > 1e-6 ? rz / distance : direction.z;
				const kick = burst * near;
				vx += (outx * 0.6 + direction.x * 0.4) * kick + (rng() - 0.5) * kick * 0.4;
				vy += (outy * 0.6 + direction.y * 0.4) * kick + rng() * kick * 0.3;
				vz += (outz * 0.6 + direction.z * 0.4) * kick + (rng() - 0.5) * kick * 0.4;
				body.setVelocity(vx, vy, vz);
				const size = Math.max(piece.halfExtents.x, piece.halfExtents.y, piece.halfExtents.z) * sizeScale || 1;
				const spin = Math.min(25, (Math.sqrt(vx * vx + vy * vy + vz * vz) / size) * 0.5 * rng());
				body.setAngularVelocity(propSpin.x + (rng() - 0.5) * spin, propSpin.y + (rng() - 0.5) * spin, propSpin.z + (rng() - 0.5) * spin);
			}

			const lifetime = piece.big
				? options.bigLifetime ?? Infinity
				: (options.debrisLifetime ?? 6) * (0.8 + rng() * 0.4);
			const spawnedPiece = new IgeBreakablePiece3d(this, piece.index, piece.big, entity, body, piece.volume * volumeScale, geometry, lifetime, options.fadeTime ?? 0.6);
			(body as any)._breakablePiece = spawnedPiece;
			spawned.push(spawnedPiece);
			world._addPiece(spawnedPiece);
			world.emit("piece", spawnedPiece);
		}
		const spawnMs = now() - spawnStarted;
		world._lastFractureMs = fractureMs;
		world._lastSpawnMs = spawnMs;
		world._breaks++;

		const result: IgeBreakResult = {
			event,
			breakable: this,
			pieces: spawned,
			big: spawned.filter((piece) => piece.big),
			point: hitPoint,
			direction,
			strength,
			effect: material.effect,
			material,
			fractureMs,
			spawnMs
		};
		void hitter;
		this.emit("break", result);
		world.emit("break", result);
		return result;
	}
}

const POSE = new Float64Array(7);

/** Where a body's shape is after the last step, IGE units (a vehicle's chassis is read from the world). */
function centreOf (body: IgePhysicsBody3d, unitsPerMetre: number): ArrayLike<number> {
	if (!(body as any)._vehicle) return body._current;
	body._physics._backend.readBodyPose(body._handle, POSE);
	POSE[0] *= unitsPerMetre; POSE[1] *= unitsPerMetre; POSE[2] *= unitsPerMetre;
	return POSE;
}

/** 20 litres in IGE units cubed. */
function defaultBigVolume (unitsPerMetre: number): number {
	return 0.02 * unitsPerMetre * unitsPerMetre * unitsPerMetre;
}

/** How far a body's shape reaches from its centre (IGE units), worked out once. */
function reachOf (body: IgePhysicsBody3d): number {
	const cached = (body as any)._breakReach;
	if (cached !== undefined) return cached;
	const reach = shapeReach(body.options.shape);
	(body as any)._breakReach = reach;
	return reach;
}

function shapeReach (shape: IgePhysicsShape): number {
	switch (shape.type) {
		case "box": return Math.sqrt(shape.halfExtents.x ** 2 + shape.halfExtents.y ** 2 + shape.halfExtents.z ** 2);
		case "sphere": return shape.radius;
		case "capsule": return shape.radius + shape.halfHeight;
		case "convex":
		case "mesh": {
			const v = shape.geometry.vertices;
			let r = 0;
			if (v) for (let i = 0; i + 2 < v.length; i += 3) r = Math.max(r, Math.sqrt(v[i] ** 2 + v[i + 1] ** 2 + v[i + 2] ** 2));
			return r;
		}
		case "compound": {
			let r = 0;
			for (const child of shape.children) {
				const p = child.position || ZERO;
				r = Math.max(r, Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2) + shapeReach(child.shape));
			}
			return r;
		}
		default: return 100;
	}
}

/** Put an entity at a world position and rotation (and scale) under a parent. */
function placeInParent (entity: IgeEntity, parent: IgeEntity | null, position: Vec3, rotation: Quat, scale: Vec3): void {
	let p = position, q = rotation;
	const m = parent?._worldMatrix4?.matrix;
	if (m && !(m[0] === 1 && m[5] === 1 && m[10] === 1 && m[12] === 0 && m[13] === 0 && m[14] === 0 && m[1] === 0 && m[2] === 0 && m[4] === 0)) {
		const inverse = invertMat4(m);
		if (inverse) {
			p = {
				x: inverse[0] * position.x + inverse[4] * position.y + inverse[8] * position.z + inverse[12],
				y: inverse[1] * position.x + inverse[5] * position.y + inverse[9] * position.z + inverse[13],
				z: inverse[2] * position.x + inverse[6] * position.y + inverse[10] * position.z + inverse[14]
			};
			const pq = matrixToQuaternion(m);
			q = multiplyQuat({ x: -pq.x, y: -pq.y, z: -pq.z, w: pq.w }, rotation);
		}
	}
	entity.translateTo(p.x, p.y, p.z);
	entity.quaternion({ ...q });
	entity.scaleTo(scale.x, scale.y, scale.z);
}

/** Free a piece's mesh on the GPU, when there's a renderer that holds it. */
function releaseGeometry (geometry: IgeGeometryData3d): void {
	const renderer = (ige.engine as any)?.renderer?.();
	if (renderer && typeof renderer.releaseGeometry === "function") renderer.releaseGeometry(geometry);
}

function now (): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}
