import type JoltApi from "jolt-physics";
import type {
	IgePhysicsBackend,
	IgePhysicsBackendBodyDesc,
	IgePhysicsBackendInertia,
	IgePhysicsBackendCharacterDesc,
	IgePhysicsBackendCharacterState,
	IgePhysicsBackendConfig,
	IgePhysicsBackendFactory,
	IgePhysicsBackendRagdollDesc,
	IgePhysicsBackendRaycastHit,
	IgePhysicsBackendShape,
	IgePhysicsBodyHandle,
	IgePhysicsCharacterHandle,
	IgePhysicsRagdollHandle
} from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsQuat, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type { IgeVehicleBackend, IgeVehicleBackendSpec } from "@/engine/physics/IgePhysicsVehicle3dBackend";
import { IgeJoltVehicle3d } from "@/engine/physics/IgeJoltVehicle3d";

/*
 * The Jolt Physics backend (https://github.com/jrouwe/JoltPhysics), running
 * as WebAssembly: the jolt-physics package, loaded when the first world is
 * made and shared by the worlds after it, multithreaded when the page is
 * cross-origin isolated (or asked for in Node). Every Jolt object it makes
 * is freed by the call that removes what it belongs to, and the world's
 * own in destroy().
 */

export type IgeJolt = typeof JoltApi;
type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

export interface IgeJoltBackendOptions {
	/**
	 * Load and initialise Jolt yourself: a test environment, a custom build.
	 * Given whether the threaded build is wanted. Default: igeLoadJolt()
	 * (the jolt-physics package, its multithreaded build when threaded),
	 * with the world's `jolt: { memory, instance }`.
	 */
	load?: (threaded: boolean) => Promise<IgeJolt>;
	/** Override IgePhysics3dOptions.jolt.maxBodyPairs. */
	maxBodyPairs?: number;
	/** Override IgePhysics3dOptions.jolt.maxContactConstraints. */
	maxContactConstraints?: number;
}

/** jolt-physics' own WebAssembly memory, in 64 KB pages: 128 MB, fixed (it can't grow). */
const JOLT_PAGES = 2048;
/** The most memory a Jolt instance can have (32-bit WebAssembly), in pages. */
const MAX_PAGES = 65536;
/** Workers the threaded build starts when it loads (its pthread pool), shared by every world in the instance. */
export const IGE_JOLT_POOL_THREADS = 16;

export interface IgeJoltLoadOptions {
	/** The multithreaded build (default false). */
	threaded?: boolean;
	/** Megabytes of memory (default 128: the package's own). Rounded up to 64 KB, at most 4096. */
	memory?: number;
	/** "shared" (default): the instance already loaded for this build and memory, if any; "own": a new one. */
	instance?: "shared" | "own";
}

/** Loaded instances, by build and memory (instance: "shared"). */
const loaded = new Map<string, Promise<IgeJolt>>();
/** Initialisations run one at a time (a memory size is set round each). */
let initialising: Promise<unknown> = Promise.resolve();

/**
 * Jolt, loaded and initialised: the instance already loaded for this build
 * and memory size (the default), or a new one. Worlds made with the default
 * backend get theirs from here; a game can load it ahead of time the same
 * way.
 * @example #A server holding several worlds in one instance
 *     await igeLoadJolt({ memory: 512 });
 *     const physics = await IgePhysics3d.create({ jolt: { memory: 512 } });
 */
export function igeLoadJolt (options: IgeJoltLoadOptions = {}): Promise<IgeJolt> {
	const threaded = !!options.threaded;
	const pages = joltPages(options.memory);
	if (options.instance === "own") return initJolt(threaded, pages);
	const key = `${threaded ? "mt" : "st"}:${pages}`;
	let instance = loaded.get(key);
	if (!instance) {
		instance = initJolt(threaded, pages);
		loaded.set(key, instance);
		instance.catch(() => loaded.delete(key));
	}
	return instance;
}

/** Megabytes as 64 KB pages. */
function joltPages (memory?: number): number {
	if (memory === undefined) return JOLT_PAGES;
	if (!(memory > 0)) throw new Error(`IgePhysics3d: jolt.memory must be a number of megabytes (got ${memory})`);
	const pages = Math.ceil(memory * 16);
	if (pages > MAX_PAGES) throw new Error(`IgePhysics3d: jolt.memory can be at most 4096 MB (got ${memory})`);
	return pages;
}

/** Import the jolt-physics package and initialise a new instance with this many pages of memory. */
async function initJolt (threaded: boolean, pages: number): Promise<IgeJolt> {
	let init: (target?: object) => Promise<IgeJolt>;
	if (threaded) {
		// @ts-ignore - subpath export (the package's typings cover the main entry)
		init = (await import(/* webpackChunkName: "jolt-physics-mt" */ "jolt-physics/wasm-compat-multithread")).default;
	} else {
		init = (await import(/* webpackChunkName: "jolt-physics" */ "jolt-physics")).default as unknown as typeof init;
	}
	return igeJoltInit(() => init(), pages / 16);
}

/**
 * Run a jolt-physics initialisation (the package's default export, or a
 * build of it) with `memory` megabytes of WebAssembly memory rather than its
 * fixed 128. igeLoadJolt() uses it; it's for loading Jolt some other way.
 * `wasm` is the WebAssembly the build loads with (default this realm's; a
 * test sandbox loading Jolt outside itself passes that realm's).
 */
export function igeJoltInit (init: () => Promise<IgeJolt>, memory?: number, wasm: typeof WebAssembly = WebAssembly): Promise<IgeJolt> {
	const pages = joltPages(memory);
	if (pages === JOLT_PAGES) return init();
	// One at a time: the memory size is set by wrapping WebAssembly's constructors while it initialises
	const run = initialising.then(() => withJoltMemory(pages, init, wasm));
	initialising = run.catch(() => undefined);
	return run;
}

/**
 * Run `init` (a jolt-physics initialisation) with its WebAssembly memory
 * at `pages` instead of the package's fixed 2048. The single-threaded build
 * defines its memory in the module, the threaded one imports a shared
 * memory its script makes: while `init` runs, a module whose memory (made or
 * imported) is exactly 2048 pages, and a shared memory of exactly 2048
 * pages, get `pages` instead. Anything else loading meanwhile is untouched.
 */
async function withJoltMemory (pages: number, init: () => Promise<IgeJolt>, namespace: typeof WebAssembly): Promise<IgeJolt> {
	const wasm = namespace as unknown as {
		instantiate: (source: unknown, imports?: unknown) => Promise<unknown>;
		Memory: new (descriptor: { initial: number; maximum?: number; shared?: boolean }) => WebAssembly.Memory;
	};
	const instantiate = wasm.instantiate, Memory = wasm.Memory;
	wasm.instantiate = function (source: unknown, imports?: unknown) {
		// (ArrayBuffer and views of it from either realm)
		const bytes = isBuffer(source) ? new Uint8Array(source) : ArrayBuffer.isView(source) ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength) : null;
		const patched = bytes && igeJoltWasmWithMemory(bytes, JOLT_PAGES, pages);
		return instantiate.call(namespace, patched ?? source, imports);
	};
	const SizedMemory = function (descriptor: { initial: number; maximum?: number; shared?: boolean }) {
		const jolts = descriptor.shared && descriptor.initial === JOLT_PAGES && descriptor.maximum === JOLT_PAGES;
		return new Memory(jolts ? { ...descriptor, initial: pages, maximum: pages } : descriptor);
	} as unknown as typeof Memory;
	SizedMemory.prototype = Memory.prototype;
	wasm.Memory = SizedMemory;
	try {
		return await init();
	} finally {
		wasm.instantiate = instantiate;
		wasm.Memory = Memory;
	}
}

/** An ArrayBuffer (made in any realm). */
function isBuffer (value: unknown): value is ArrayBuffer {
	return value instanceof ArrayBuffer || Object.prototype.toString.call(value) === "[object ArrayBuffer]";
}

/** Read an unsigned LEB128 number: [value, next index]. */
function readLeb (bytes: Uint8Array, at: number): [number, number] {
	let value = 0, scale = 1, byte: number;
	do {
		byte = bytes[at++];
		value += (byte & 0x7f) * scale;
		scale *= 128;
	} while (byte & 0x80);
	return [value, at];
}

function writeLeb (value: number): number[] {
	const out: number[] = [];
	do {
		let byte = value % 128;
		value = Math.floor(value / 128);
		if (value) byte |= 0x80;
		out.push(byte);
	} while (value);
	return out;
}

/**
 * A WebAssembly module's bytes with its memory (defined in its memory
 * section, or imported) changed from `from` pages (minimum and maximum) to
 * `to`, or null when it has no memory of exactly that size.
 */
export function igeJoltWasmWithMemory (bytes: Uint8Array, from: number, to: number): Uint8Array | null {
	if (bytes.length < 8 || bytes[0] !== 0 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) return null;
	let at = 8;
	while (at < bytes.length) {
		const sectionAt = at;
		const id = bytes[at++];
		let size: number;
		[size, at] = readLeb(bytes, at);
		const start = at, end = start + size;
		let limitsAt = -1, limitsEnd = -1, flags = 0, min = 0, max = -1;
		const readLimits = () => {
			limitsAt = at;
			flags = bytes[at++];
			[min, at] = readLeb(bytes, at);
			if (flags & 1) [max, at] = readLeb(bytes, at);
			limitsEnd = at;
		};
		if (id === 5) {
			// The memory section
			let count: number;
			[count, at] = readLeb(bytes, at);
			if (count === 1) readLimits();
		} else if (id === 2) {
			// Imports: the memory's limits
			let count: number;
			[count, at] = readLeb(bytes, at);
			for (let i = 0; i < count && limitsAt < 0; i++) {
				let length: number;
				[length, at] = readLeb(bytes, at);
				at += length;
				[length, at] = readLeb(bytes, at);
				at += length;
				const kind = bytes[at++];
				if (kind === 0) [, at] = readLeb(bytes, at);
				else if (kind === 1) { at++; const tableFlags = bytes[at++]; [, at] = readLeb(bytes, at); if (tableFlags & 1) [, at] = readLeb(bytes, at); }
				else if (kind === 2) readLimits();
				else if (kind === 3) at += 2;
				else if (kind === 4) { at++; [, at] = readLeb(bytes, at); }
				else return null;
			}
		}
		if (limitsAt >= 0) {
			if (min !== from || max !== from) return null;
			const body = [...bytes.subarray(start, limitsAt), flags | 1, ...writeLeb(to), ...writeLeb(to), ...bytes.subarray(limitsEnd, end)];
			const head = [id, ...writeLeb(body.length)];
			const out = new Uint8Array(sectionAt + head.length + body.length + (bytes.length - end));
			out.set(bytes.subarray(0, sectionAt), 0);
			out.set(head, sectionAt);
			out.set(body, sectionAt + head.length);
			out.set(bytes.subarray(end), sectionAt + head.length + body.length);
			return out;
		}
		at = end;
	}
	return null;
}

/** Whether this is Node (a server, a test), where the threaded build runs on worker_threads with no isolated page. */
function inNode (): boolean {
	const global = globalThis as { process?: { versions?: { node?: string } }; window?: unknown };
	return !!global.process?.versions?.node && global.window === undefined;
}

/**
 * The Jolt backend, for IgePhysics3d.create({ backend }). `backend: "jolt"`
 * (the default) is this with no options.
 * @example #Jolt loaded by the game itself, e.g. in a test or on a server
 *     const physics = await IgePhysics3d.create({ backend: igeJoltPhysics({ load: () => myJolt }) });
 */
export function igeJoltPhysics (options: IgeJoltBackendOptions = {}): IgePhysicsBackendFactory {
	return {
		name: "jolt",
		async create (config: IgePhysicsBackendConfig): Promise<IgePhysicsBackend> {
			const node = inNode();
			const isolated = typeof globalThis !== "undefined" && (globalThis as any).crossOriginIsolated === true;
			// In Node threads are there to ask for; "auto" stays single-threaded (a server decides its own cores)
			const threaded = config.threads === true || (config.threads === "auto" && isolated && !node);
			if (config.threads === true && !isolated && !node) {
				throw new Error("IgePhysics3d: threads need a cross-origin isolated page (COOP/COEP headers)");
			}
			const tuning = config.options.jolt || {};
			const jolt = await (options.load ? options.load(threaded) : igeLoadJolt({ threaded, memory: tuning.memory, instance: tuning.instance }));
			return new IgeJoltBackend(jolt, config, threaded, {
				maxBodyPairs: options.maxBodyPairs ?? tuning.maxBodyPairs ?? 65536,
				maxContactConstraints: options.maxContactConstraints ?? tuning.maxContactConstraints ?? 20000,
				workerThreads: tuning.workerThreads
			});
		}
	};
}

/** A Jolt body and its id. */
export class IgeJoltBody {
	body: JoltApi.Body;
	id: JoltApi.BodyID;
	/** The id as a number (index and sequence), to find the body from query results. */
	key: number;
	/** Whether it's in the world (not taken out with setBodyEnabled()). */
	added: boolean = true;

	constructor (body: JoltApi.Body) {
		this.body = body;
		this.id = body.GetID();
		this.key = this.id.GetIndexAndSequenceNumber();
	}
}

/** A CharacterVirtual and what it was made with. */
class IgeJoltCharacter {
	character: JoltApi.CharacterVirtual;
	update: JoltApi.ExtendedUpdateSettings;
	inner: IgeJoltBody;
	layer: number;
	listener?: JoltApi.CharacterContactListenerJS;

	constructor (character: JoltApi.CharacterVirtual, update: JoltApi.ExtendedUpdateSettings, inner: IgeJoltBody, layer: number) {
		this.character = character;
		this.update = update;
		this.inner = inner;
		this.layer = layer;
	}
}

class IgeJoltRagdoll {
	parts: IgeJoltBody[] = [];
	constraints: JoltApi.Constraint[] = [];
}

/**
 * One Jolt world (IgePhysicsBackend). Collision layers are Jolt object
 * layers, static ones in their own broad phase layer; queries run on the
 * main thread (so they work with the threaded build too).
 */
export class IgeJoltBackend implements IgePhysicsBackend {
	readonly name = "jolt";
	_jolt: IgeJolt;
	_threaded: boolean;
	/** Worker threads this world steps on (threaded build), 0 when single-threaded. */
	_workerThreads: number = 0;
	/** Seconds per step the world was made for (vehicles' anti-roll bars are worked out for it before their first step). */
	_fixedTimeStep: number;
	_layerCount: number;
	_interface: JoltApi.JoltInterface;
	_system: JoltApi.PhysicsSystem;
	_bodies: JoltApi.BodyInterface;
	/** Every body by its id number, to turn query results into handles. */
	_byKey: Map<number, IgeJoltBody> = new Map();
	_layerFilters: Map<number, { bp: JoltApi.DefaultBroadPhaseLayerFilter; object: JoltApi.DefaultObjectLayerFilter }> = new Map();
	_characterCollision?: JoltApi.CharacterVsCharacterCollisionSimple;
	_collector?: JoltApi.CollideShapeAllHitCollisionCollector;
	_collideSettings?: JoltApi.CollideShapeSettings;
	_unitScale?: JoltApi.Vec3;
	/** Raycast filters that skip one body (made the first time a ray ignores it, freed with the body). */
	_ignoreFilters: Map<IgeJoltBody, JoltApi.IgnoreSingleBodyFilter> = new Map();

	// Reused Jolt values (never allocate per call)
	_vec: JoltApi.Vec3;
	_rvec: JoltApi.RVec3;
	_quat: JoltApi.Quat;
	_identity: JoltApi.Quat;
	_ray: JoltApi.RRayCast;
	_raySettings: JoltApi.RayCastSettings;
	_rayCollector: JoltApi.CastRayClosestHitCollisionCollector;
	_bodyFilter: JoltApi.BodyFilter;
	_shapeFilter: JoltApi.ShapeFilter;

	constructor (jolt: IgeJolt, config: IgePhysicsBackendConfig, threaded: boolean, tuning: { maxBodyPairs: number; maxContactConstraints: number; workerThreads?: number }) {
		this._jolt = jolt;
		this._threaded = threaded;
		this._fixedTimeStep = config.options?.fixedTimeStep ?? 1 / 60;

		const settings = new jolt.JoltSettings();
		settings.mMaxBodies = config.maxBodies;
		settings.mMaxBodyPairs = tuning.maxBodyPairs;
		settings.mMaxContactConstraints = tuning.maxContactConstraints;
		if (threaded) {
			const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
			const asked = tuning.workerThreads ?? Math.min(8, cores - 1);
			settings.mMaxWorkerThreads = Math.max(1, Math.min(IGE_JOLT_POOL_THREADS, Math.floor(asked)));
			this._workerThreads = settings.mMaxWorkerThreads;
			const total = (threadsInUse.get(jolt) ?? 0) + this._workerThreads;
			threadsInUse.set(jolt, total);
			if (total > IGE_JOLT_POOL_THREADS && !warnedThreads) {
				warnedThreads = true;
				console.warn(`IgePhysics3d: the worlds in this Jolt instance ask for ${total} worker threads, more than its ${IGE_JOLT_POOL_THREADS}; give each fewer (jolt: { workerThreads })`);
			}
		}

		// Collision layers: static layers don't collide with each other, every
		// other pair does unless ignored. Jolt indexes static and moving
		// bodies in separate broad phase layers.
		const layers = config.layers;
		if (!layers.length) throw new Error("IgePhysics3d: at least one collision layer is needed");
		this._layerCount = layers.length;
		const pairs = new jolt.ObjectLayerPairFilterTable(layers.length);
		for (let a = 0; a < layers.length; a++) {
			for (let b = a; b < layers.length; b++) {
				if (layers[a].static && layers[b].static) continue;
				const ignored = config.ignore.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
				if (!ignored) pairs.EnableCollision(a, b);
			}
		}
		const bpStatic = new jolt.BroadPhaseLayer(0);
		const bpMoving = new jolt.BroadPhaseLayer(1);
		const bpInterface = new jolt.BroadPhaseLayerInterfaceTable(layers.length, 2);
		layers.forEach((layer, index) => bpInterface.MapObjectToBroadPhaseLayer(index, layer.static ? bpStatic : bpMoving));
		settings.mObjectLayerPairFilter = pairs;
		settings.mBroadPhaseLayerInterface = bpInterface;
		settings.mObjectVsBroadPhaseLayerFilter = new jolt.ObjectVsBroadPhaseLayerFilterTable(bpInterface, 2, pairs, layers.length);

		this._interface = new jolt.JoltInterface(settings);
		jolt.destroy(settings);
		jolt.destroy(bpStatic);
		jolt.destroy(bpMoving);

		this._system = this._interface.GetPhysicsSystem();
		this._bodies = this._system.GetBodyInterface();
		this._vec = new jolt.Vec3(0, config.gravity, 0);
		this._system.SetGravity(this._vec);

		this._rvec = new jolt.RVec3(0, 0, 0);
		this._quat = new jolt.Quat(0, 0, 0, 1);
		this._identity = new jolt.Quat(0, 0, 0, 1);
		this._ray = new jolt.RRayCast();
		this._raySettings = new jolt.RayCastSettings();
		this._rayCollector = new jolt.CastRayClosestHitCollisionCollector();
		this._bodyFilter = new jolt.BodyFilter();
		this._shapeFilter = new jolt.ShapeFilter();
	}

	threaded (): boolean {
		return this._threaded;
	}

	/** Query filters that test what a layer collides with (cached per layer). */
	_filtersFor (layer: number): { bp: JoltApi.DefaultBroadPhaseLayerFilter; object: JoltApi.DefaultObjectLayerFilter } {
		let filters = this._layerFilters.get(layer);
		if (!filters) {
			filters = {
				bp: new this._jolt.DefaultBroadPhaseLayerFilter(this._interface.GetObjectVsBroadPhaseLayerFilter(), layer),
				object: new this._jolt.DefaultObjectLayerFilter(this._interface.GetObjectLayerPairFilter(), layer)
			};
			this._layerFilters.set(layer, filters);
		}
		return filters;
	}

	_layer (layer: number): number {
		if (!(layer >= 0 && layer < this._layerCount)) throw new Error(`IgePhysics3d: no collision layer ${layer}`);
		return layer;
	}

	/** Register a Jolt body so query results find it. */
	_register (body: JoltApi.Body): IgeJoltBody {
		const handle = new IgeJoltBody(body);
		this._byKey.set(handle.key, handle);
		return handle;
	}

	/** The handle of a body id from a query result, if it's one of ours. */
	_handleOf (id: JoltApi.BodyID): IgeJoltBody | undefined {
		return this._byKey.get(id.GetIndexAndSequenceNumber());
	}

	setGravity (y: number): void {
		this._vec.Set(0, y, 0);
		this._system.SetGravity(this._vec);
	}

	step (dt: number): void {
		this._interface.Step(dt, 1);
	}

	optimize (): void {
		this._system.OptimizeBroadPhase();
	}

	activeBodyCount (): number {
		return this._system.GetNumActiveBodies(this._jolt.EBodyType_RigidBody);
	}

	destroy (): void {
		const jolt = this._jolt;
		// Anything still here (IgePhysics3d removes everything first)
		for (const handle of [...this._byKey.values()]) {
			if (handle.added) this._bodies.RemoveBody(handle.id);
			this._bodies.DestroyBody(handle.id);
		}
		this._byKey.clear();
		for (const filter of this._ignoreFilters.values()) jolt.destroy(filter);
		this._ignoreFilters.clear();
		if (this._characterCollision) jolt.destroy(this._characterCollision);
		if (this._collector) jolt.destroy(this._collector);
		if (this._collideSettings) jolt.destroy(this._collideSettings);
		if (this._unitScale) jolt.destroy(this._unitScale);
		for (const value of [this._vec, this._rvec, this._quat, this._identity, this._ray, this._raySettings, this._rayCollector,
			this._bodyFilter, this._shapeFilter]) {
			jolt.destroy(value);
		}
		for (const filters of this._layerFilters.values()) {
			jolt.destroy(filters.bp);
			jolt.destroy(filters.object);
		}
		this._layerFilters.clear();
		jolt.destroy(this._interface);
		if (this._workerThreads) threadsInUse.set(jolt, Math.max(0, (threadsInUse.get(jolt) ?? 0) - this._workerThreads));
	}

	/* Bodies */

	createBody (desc: IgePhysicsBackendBodyDesc): IgePhysicsBodyHandle {
		const jolt = this._jolt;
		const built = this._createShape(desc.shape, desc.density);
		const cleanup = built.cleanup;
		let shape = built.shape;
		const type = desc.sensor ? "kinematic" : desc.type;
		if (desc.centreOfMass && type === "dynamic") {
			// Move the centre of mass where it's asked for (the body keeps a reference to the new shape)
			const com = shape.GetCenterOfMass();
			const c = desc.centreOfMass;
			this._vec.Set(c.x - com.GetX(), c.y - com.GetY(), c.z - com.GetZ());
			shape = new jolt.OffsetCenterOfMassShape(shape, this._vec);
		}
		const p = desc.position, r = desc.rotation;
		this._rvec.Set(p.x, p.y, p.z);
		this._quat.Set(r.x, r.y, r.z, r.w);
		const motion = type === "static" ? jolt.EMotionType_Static : type === "kinematic" ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic;
		const settings = new jolt.BodyCreationSettings(shape, this._rvec, this._quat, motion, this._layer(desc.layer));
		if (desc.mass !== undefined && desc.mass > 0 && type === "dynamic") {
			settings.mOverrideMassProperties = jolt.EOverrideMassProperties_CalculateInertia;
			settings.mMassPropertiesOverride.mMass = desc.mass;
		}
		if (desc.allowKinematic) settings.mAllowDynamicOrKinematic = true;
		settings.mFriction = desc.friction;
		settings.mRestitution = desc.restitution;
		settings.mLinearDamping = desc.linearDamping;
		settings.mAngularDamping = desc.angularDamping;
		settings.mGravityFactor = desc.gravityFactor;
		if (desc.lockRotation) {
			settings.mAllowedDOFs = jolt.EAllowedDOFs_TranslationX | jolt.EAllowedDOFs_TranslationY | jolt.EAllowedDOFs_TranslationZ;
		}
		if (desc.ccd) settings.mMotionQuality = jolt.EMotionQuality_LinearCast;
		if (desc.sensor) settings.mIsSensor = true;

		const body = this._bodies.CreateBody(settings);
		jolt.destroy(settings);
		cleanup?.();
		this._bodies.AddBody(body.GetID(), type === "static" ? jolt.EActivation_DontActivate : jolt.EActivation_Activate);
		return this._register(body);
	}

	destroyBody (handle: IgePhysicsBodyHandle): void {
		const body = handle as IgeJoltBody;
		if (!this._byKey.has(body.key)) return;
		if (body.added) this._bodies.RemoveBody(body.id);
		this._bodies.DestroyBody(body.id);
		this._byKey.delete(body.key);
		const ignore = this._ignoreFilters.get(body);
		if (ignore) {
			this._jolt.destroy(ignore);
			this._ignoreFilters.delete(body);
		}
	}

	setBodyEnabled (handle: IgePhysicsBodyHandle, enabled: boolean): void {
		const body = handle as IgeJoltBody;
		if (enabled === body.added) return;
		body.added = enabled;
		if (enabled) this._bodies.AddBody(body.id, body.body.IsStatic() ? this._jolt.EActivation_DontActivate : this._jolt.EActivation_Activate);
		else this._bodies.RemoveBody(body.id);
	}

	readBodyPose (handle: IgePhysicsBodyHandle, out: Float64Array): void {
		const body = (handle as IgeJoltBody).body;
		const p = body.GetPosition();
		out[0] = p.GetX(); out[1] = p.GetY(); out[2] = p.GetZ();
		const r = body.GetRotation();
		out[3] = r.GetX(); out[4] = r.GetY(); out[5] = r.GetZ(); out[6] = r.GetW();
	}

	readBodyVelocity (handle: IgePhysicsBodyHandle, linear: Vec3, angular?: Vec3): void {
		const body = (handle as IgeJoltBody).body;
		const v = body.GetLinearVelocity();
		linear.x = v.GetX(); linear.y = v.GetY(); linear.z = v.GetZ();
		if (angular) {
			const w = body.GetAngularVelocity();
			angular.x = w.GetX(); angular.y = w.GetY(); angular.z = w.GetZ();
		}
	}

	setBodyVelocity (handle: IgePhysicsBodyHandle, linear: Vec3 | null, angular: Vec3 | null): void {
		const body = handle as IgeJoltBody;
		if (body.body.IsStatic()) return;
		if (linear) {
			this._vec.Set(linear.x, linear.y, linear.z);
			this._bodies.SetLinearVelocity(body.id, this._vec);
		}
		if (angular) {
			this._vec.Set(angular.x, angular.y, angular.z);
			this._bodies.SetAngularVelocity(body.id, this._vec);
			if (body.added && (angular.x || angular.y || angular.z)) this._bodies.ActivateBody(body.id);
		}
	}

	setBodyTransform (handle: IgePhysicsBodyHandle, position: Vec3, rotation: Quat, wake: boolean): void {
		const body = handle as IgeJoltBody;
		this._rvec.Set(position.x, position.y, position.z);
		this._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
		const activate = wake && body.added && !body.body.IsStatic();
		this._bodies.SetPositionAndRotation(body.id, this._rvec, this._quat, activate ? this._jolt.EActivation_Activate : this._jolt.EActivation_DontActivate);
	}

	moveKinematic (handle: IgePhysicsBodyHandle, position: Vec3, rotation: Quat, dt: number): void {
		const body = handle as IgeJoltBody;
		this._rvec.Set(position.x, position.y, position.z);
		this._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
		this._bodies.MoveKinematic(body.id, this._rvec, this._quat, dt);
	}

	addImpulse (handle: IgePhysicsBodyHandle, impulse: Vec3, at?: Vec3): void {
		const body = handle as IgeJoltBody;
		if (!body.body.IsDynamic()) return;
		this._vec.Set(impulse.x, impulse.y, impulse.z);
		if (at) {
			this._rvec.Set(at.x, at.y, at.z);
			this._bodies.AddImpulse(body.id, this._vec, this._rvec);
		} else {
			this._bodies.AddImpulse(body.id, this._vec);
		}
	}

	addForce (handle: IgePhysicsBodyHandle, force: Vec3, at?: Vec3): void {
		const body = handle as IgeJoltBody;
		if (!body.added || !body.body.IsDynamic()) return;
		this._vec.Set(force.x, force.y, force.z);
		if (at) {
			this._rvec.Set(at.x, at.y, at.z);
			this._bodies.AddForce(body.id, this._vec, this._rvec, this._jolt.EActivation_Activate);
		} else {
			this._bodies.AddForce(body.id, this._vec, this._jolt.EActivation_Activate);
		}
	}

	addTorque (handle: IgePhysicsBodyHandle, torque: Vec3): void {
		const body = handle as IgeJoltBody;
		if (!body.added || !body.body.IsDynamic()) return;
		this._vec.Set(torque.x, torque.y, torque.z);
		this._bodies.AddTorque(body.id, this._vec, this._jolt.EActivation_Activate);
	}

	readBodyCentreOfMass (handle: IgePhysicsBodyHandle, out: Vec3): void {
		const c = (handle as IgeJoltBody).body.GetCenterOfMassPosition();
		out.x = c.GetX(); out.y = c.GetY(); out.z = c.GetZ();
	}

	readBodyInertia (handle: IgePhysicsBodyHandle, out: IgePhysicsBackendInertia): void {
		const body = (handle as IgeJoltBody).body;
		if (body.IsStatic()) {
			out.moments.x = out.moments.y = out.moments.z = Infinity;
			out.rotation.x = out.rotation.y = out.rotation.z = 0;
			out.rotation.w = 1;
			return;
		}
		const motion = body.GetMotionProperties();
		const d = motion.GetInverseInertiaDiagonal();
		out.moments.x = d.GetX() > 0 ? 1 / d.GetX() : Infinity;
		out.moments.y = d.GetY() > 0 ? 1 / d.GetY() : Infinity;
		out.moments.z = d.GetZ() > 0 ? 1 / d.GetZ() : Infinity;
		const r = motion.GetInertiaRotation();
		out.rotation.x = r.GetX(); out.rotation.y = r.GetY(); out.rotation.z = r.GetZ(); out.rotation.w = r.GetW();
	}

	setBodyKinematic (handle: IgePhysicsBodyHandle, kinematic: boolean): void {
		const body = handle as IgeJoltBody;
		if (body.body.IsStatic() || body.body.IsKinematic() === kinematic) return;
		const jolt = this._jolt;
		this._bodies.SetMotionType(body.id, kinematic ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic,
			body.added ? jolt.EActivation_Activate : jolt.EActivation_DontActivate);
	}

	bodyMass (handle: IgePhysicsBodyHandle): number {
		const body = (handle as IgeJoltBody).body;
		if (!body.IsDynamic()) return Infinity;
		const inverse = body.GetMotionProperties().GetInverseMass();
		return inverse > 0 ? 1 / inverse : Infinity;
	}

	bodyAwake (handle: IgePhysicsBodyHandle): boolean {
		return (handle as IgeJoltBody).body.IsActive();
	}

	setBodyAwake (handle: IgePhysicsBodyHandle, awake: boolean): void {
		const body = handle as IgeJoltBody;
		if (!body.added || body.body.IsStatic()) return;
		if (awake) this._bodies.ActivateBody(body.id);
		else this._bodies.DeactivateBody(body.id);
	}

	/* Queries */

	raycast (origin: Vec3, direction: Vec3, maxDistance: number, layer: number, out: IgePhysicsBackendRaycastHit, ignore?: IgePhysicsBodyHandle): boolean {
		this._rvec.Set(origin.x, origin.y, origin.z);
		this._ray.mOrigin = this._rvec;
		this._vec.Set(direction.x * maxDistance, direction.y * maxDistance, direction.z * maxDistance);
		this._ray.mDirection = this._vec;
		this._rayCollector.Reset();
		const filters = this._filtersFor(this._layer(layer));
		let bodyFilter: JoltApi.BodyFilter = this._bodyFilter;
		if (ignore && this._byKey.has((ignore as IgeJoltBody).key)) {
			const own = ignore as IgeJoltBody;
			let filter = this._ignoreFilters.get(own);
			if (!filter) {
				filter = new this._jolt.IgnoreSingleBodyFilter(own.id);
				this._ignoreFilters.set(own, filter);
			}
			bodyFilter = filter;
		}
		this._system.GetNarrowPhaseQuery().CastRay(this._ray, this._raySettings, this._rayCollector, filters.bp, filters.object, bodyFilter, this._shapeFilter);
		if (!this._rayCollector.HadHit()) return false;

		const hit = this._rayCollector.mHit;
		const handle = this._handleOf(hit.mBodyID);
		if (!handle) return false;
		const distance = hit.mFraction * maxDistance;
		this._rvec.Set(origin.x + direction.x * distance, origin.y + direction.y * distance, origin.z + direction.z * distance);
		const n = handle.body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, this._rvec);
		out.body = handle;
		out.distance = distance;
		out.normal.x = n.GetX(); out.normal.y = n.GetY(); out.normal.z = n.GetZ();
		return true;
	}

	touching (handle: IgePhysicsBodyHandle, margin: number, out: IgePhysicsBodyHandle[]): void {
		const jolt = this._jolt;
		const own = handle as IgeJoltBody;
		out.length = 0;
		if (!own.added) return;
		const collector = this._collector || (this._collector = new jolt.CollideShapeAllHitCollisionCollector());
		const settings = this._collideSettings || (this._collideSettings = new jolt.CollideShapeSettings());
		const unitScale = this._unitScale || (this._unitScale = new jolt.Vec3(1, 1, 1));
		settings.mMaxSeparationDistance = margin;
		collector.Reset();
		const filters = this._filtersFor(own.body.GetObjectLayer());
		this._rvec.Set(0, 0, 0);
		this._system.GetNarrowPhaseQuery().CollideShape(own.body.GetShape(), unitScale, own.body.GetCenterOfMassTransform(),
			settings, this._rvec, collector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);
		settings.mMaxSeparationDistance = 0;
		const hits = collector.mHits;
		for (let i = 0, n = hits.size(); i < n; i++) {
			const other = this._handleOf(hits.at(i).mBodyID2);
			if (other && other !== own && !out.includes(other)) out.push(other);
		}
	}

	/* Characters */

	createCharacter (desc: IgePhysicsBackendCharacterDesc): IgePhysicsCharacterHandle {
		const jolt = this._jolt;
		const radius = desc.radius, height = desc.height;
		const halfHeight = Math.max(0.01, height / 2 - radius);
		const layer = this._layer(desc.layer);

		// Capsule with its bottom at the character's position (the feet)
		const capsule = new jolt.CapsuleShapeSettings(halfHeight, radius, undefined);
		this._vec.Set(0, height / 2, 0);
		const shapeSettings = new jolt.RotatedTranslatedShapeSettings(this._vec, this._identity, capsule);
		const shape = shapeSettings.Create().Get();

		const settings = new jolt.CharacterVirtualSettings();
		settings.mMass = desc.mass;
		settings.mMaxStrength = desc.maxStrength;
		settings.mMaxSlopeAngle = desc.maxSlopeAngle;
		settings.mShape = shape;
		settings.mInnerBodyShape = shape;
		settings.mInnerBodyLayer = layer;
		settings.mCharacterPadding = 0.02;
		settings.mPenetrationRecoverySpeed = 1;
		settings.mPredictiveContactDistance = 0.1;
		this._vec.Set(0, 1, 0);
		settings.mUp = this._vec;
		// Contacts below the lower cap's centre hold the character up
		const plane = new jolt.Plane(this._vec, -radius);
		settings.mSupportingVolume = plane;
		jolt.destroy(plane);

		this._rvec.Set(desc.position.x, desc.position.y, desc.position.z);
		const character = new jolt.CharacterVirtual(settings, this._rvec, this._identity, this._system);
		jolt.destroy(settings);
		jolt.destroy(shapeSettings);

		const update = new jolt.ExtendedUpdateSettings();
		this._vec.Set(0, desc.stepHeight, 0);
		update.mWalkStairsStepUp = this._vec;

		// Characters collide with each other
		if (!this._characterCollision) this._characterCollision = new jolt.CharacterVsCharacterCollisionSimple();
		this._characterCollision.Add(character);
		character.SetCharacterVsCharacterCollision(this._characterCollision);

		// The inner body is what other bodies, raycasts and sensors meet
		const inner = this._system.GetBodyLockInterfaceNoLock().TryGetBody(character.GetInnerBodyID());
		const handle = new IgeJoltCharacter(character, update, this._register(inner), layer);

		if (!desc.pushable) {
			// Contacts can't push the character (the listener runs during its
			// update, on the main thread)
			const listener = new jolt.CharacterContactListenerJS();
			const noPush = (_character: number, _body: number, _subShape: number, _position: number, _normal: number, ioSettings: number) => {
				jolt.wrapPointer(ioSettings, jolt.CharacterContactSettings).mCanPushCharacter = false;
			};
			listener.OnAdjustBodyVelocity = () => {};
			listener.OnContactValidate = () => true;
			listener.OnCharacterContactValidate = () => true;
			listener.OnContactAdded = noPush;
			listener.OnContactPersisted = noPush;
			listener.OnContactRemoved = () => {};
			listener.OnCharacterContactAdded = noPush;
			listener.OnCharacterContactPersisted = noPush;
			listener.OnCharacterContactRemoved = () => {};
			listener.OnContactSolve = () => {};
			listener.OnCharacterContactSolve = () => {};
			character.SetListener(listener);
			handle.listener = listener;
		}
		return handle;
	}

	characterBody (handle: IgePhysicsCharacterHandle): IgePhysicsBodyHandle {
		return (handle as IgeJoltCharacter).inner;
	}

	moveCharacter (handle: IgePhysicsCharacterHandle, velocity: Vec3, gravity: number, dt: number): void {
		const own = handle as IgeJoltCharacter;
		const character = own.character;
		this._vec.Set(velocity.x, velocity.y, velocity.z);
		character.SetLinearVelocity(this._vec);
		this._vec.Set(0, gravity, 0);
		const filters = this._filtersFor(own.layer);
		character.ExtendedUpdate(dt, this._vec, own.update, filters.bp, filters.object, this._bodyFilter, this._shapeFilter,
			this._interface.GetTempAllocator());
	}

	readCharacter (handle: IgePhysicsCharacterHandle, out: IgePhysicsBackendCharacterState): void {
		const character = (handle as IgeJoltCharacter).character;
		const p = character.GetPosition();
		out.position.x = p.GetX(); out.position.y = p.GetY(); out.position.z = p.GetZ();
		const v = character.GetLinearVelocity();
		out.velocity.x = v.GetX(); out.velocity.y = v.GetY(); out.velocity.z = v.GetZ();
		out.onGround = character.GetGroundState() === this._jolt.EGroundState_OnGround;
		const g = character.GetGroundVelocity();
		out.groundVelocity.x = g.GetX(); out.groundVelocity.y = g.GetY(); out.groundVelocity.z = g.GetZ();
	}

	setCharacterState (handle: IgePhysicsCharacterHandle, position: Vec3, velocity: Vec3): void {
		const own = handle as IgeJoltCharacter;
		this._rvec.Set(position.x, position.y, position.z);
		own.character.SetPosition(this._rvec);
		this._vec.Set(velocity.x, velocity.y, velocity.z);
		own.character.SetLinearVelocity(this._vec);
		this._bodies.SetPosition(own.inner.id, this._rvec, this._jolt.EActivation_DontActivate);
		// What it stands on now (else it's still on the ground it left until its next move)
		const filters = this._filtersFor(own.layer);
		own.character.RefreshContacts(filters.bp, filters.object, this._bodyFilter, this._shapeFilter, this._interface.GetTempAllocator());
	}

	setCharacterEnabled (handle: IgePhysicsCharacterHandle, enabled: boolean): void {
		this.setBodyEnabled((handle as IgeJoltCharacter).inner, enabled);
	}

	destroyCharacter (handle: IgePhysicsCharacterHandle): void {
		const own = handle as IgeJoltCharacter;
		if (!this._byKey.has(own.inner.key)) return;
		this._byKey.delete(own.inner.key);
		const ignore = this._ignoreFilters.get(own.inner);
		if (ignore) {
			this._jolt.destroy(ignore);
			this._ignoreFilters.delete(own.inner);
		}
		// The character's destructor removes its inner body from the world
		if (!own.inner.added) this._bodies.AddBody(own.inner.id, this._jolt.EActivation_DontActivate);
		this._characterCollision?.Remove(own.character);
		this._jolt.destroy(own.character);
		this._jolt.destroy(own.update);
		if (own.listener) this._jolt.destroy(own.listener);
	}

	/* Ragdolls */

	createRagdoll (desc: IgePhysicsBackendRagdollDesc): { ragdoll: IgePhysicsRagdollHandle; parts: IgePhysicsBodyHandle[] } {
		const jolt = this._jolt;
		const ragdoll = new IgeJoltRagdoll();
		const layer = this._layer(desc.layer);
		// Parts don't collide with each other (capsules overlap at the joints)
		const filter = new jolt.GroupFilterTable(Math.max(1, desc.parts.length));
		for (let i = 0; i < desc.parts.length; i++) {
			for (let j = i + 1; j < desc.parts.length; j++) filter.DisableCollision(i, j);
		}
		const groupId = nextGroupId++;

		desc.parts.forEach((part, partIndex) => {
			const shape = new jolt.CapsuleShape(part.halfHeight, part.radius, undefined);
			shape.SetDensity(desc.density);
			this._rvec.Set(part.position.x, part.position.y, part.position.z);
			this._quat.Set(part.rotation.x, part.rotation.y, part.rotation.z, part.rotation.w);
			const settings = new jolt.BodyCreationSettings(shape, this._rvec, this._quat, jolt.EMotionType_Dynamic, layer);
			settings.mFriction = desc.friction;
			settings.mLinearDamping = desc.linearDamping;
			settings.mAngularDamping = desc.angularDamping;
			const group = new jolt.CollisionGroup(filter, groupId, partIndex);
			settings.mCollisionGroup = group;
			jolt.destroy(group);
			const body = this._bodies.CreateBody(settings);
			jolt.destroy(settings);
			this._bodies.AddBody(body.GetID(), jolt.EActivation_Activate);
			ragdoll.parts.push(this._register(body));
		});

		for (const joint of desc.joints) {
			const c = new jolt.SwingTwistConstraintSettings();
			c.mSpace = jolt.EConstraintSpace_WorldSpace;
			this._rvec.Set(joint.position.x, joint.position.y, joint.position.z);
			c.mPosition1 = this._rvec;
			c.mPosition2 = this._rvec;
			this._vec.Set(joint.twistAxis.x, joint.twistAxis.y, joint.twistAxis.z);
			c.mTwistAxis1 = this._vec;
			c.mTwistAxis2 = this._vec;
			this._vec.Set(joint.planeAxis.x, joint.planeAxis.y, joint.planeAxis.z);
			c.mPlaneAxis1 = this._vec;
			c.mPlaneAxis2 = this._vec;
			c.mNormalHalfConeAngle = joint.swingLimit;
			c.mPlaneHalfConeAngle = joint.swingLimit;
			c.mTwistMinAngle = -joint.twistLimit;
			c.mTwistMaxAngle = joint.twistLimit;
			const constraint = c.Create(ragdoll.parts[joint.parent].body, ragdoll.parts[joint.child].body);
			jolt.destroy(c);
			this._system.AddConstraint(constraint);
			ragdoll.constraints.push(constraint);
		}
		return { ragdoll, parts: [...ragdoll.parts] };
	}

	destroyRagdoll (handle: IgePhysicsRagdollHandle): void {
		const ragdoll = handle as IgeJoltRagdoll;
		// The world's reference to each joint goes (freeing it), then the bodies
		for (const constraint of ragdoll.constraints) this._system.RemoveConstraint(constraint);
		for (const part of ragdoll.parts) this.destroyBody(part);
		ragdoll.constraints.length = 0;
		ragdoll.parts.length = 0;
	}

	/* Vehicles */

	createVehicle (spec: IgeVehicleBackendSpec, position: Vec3, rotation: Quat): IgeVehicleBackend {
		return new IgeJoltVehicle3d(this, spec, position, rotation);
	}

	/* Shapes */

	/**
	 * Build a Jolt shape. Shapes made from settings (mesh, convex, compound,
	 * heightfield) belong to the settings until a body takes a reference,
	 * so cleanup() frees the settings after the body is created.
	 */
	_createShape (shape: IgePhysicsBackendShape, density: number = 1000): { shape: JoltApi.Shape; cleanup?: () => void } {
		const jolt = this._jolt;
		switch (shape.type) {
			case "box": {
				const { x: hx, y: hy, z: hz } = shape.halfExtents;
				this._vec.Set(hx, hy, hz);
				// Jolt rounds box corners by the convex radius; keep it within the smallest half extent
				const box = new jolt.BoxShape(this._vec, Math.min(0.05, hx * 0.5, hy * 0.5, hz * 0.5), undefined);
				box.SetDensity(density);
				return { shape: box };
			}
			case "sphere": {
				const sphere = new jolt.SphereShape(shape.radius, undefined);
				sphere.SetDensity(density);
				return { shape: sphere };
			}
			case "capsule": {
				const capsule = new jolt.CapsuleShape(shape.halfHeight, shape.radius, undefined);
				capsule.SetDensity(density);
				return { shape: capsule };
			}
			case "mesh":
				return this._createMeshShape(shape);
			case "convex":
				return this._createConvexShape(shape, density);
			case "compound":
				return this._createCompoundShape(shape, density);
			case "heightfield":
				return this._createHeightfieldShape(shape);
		}
	}

	_createCompoundShape (shape: Extract<IgePhysicsBackendShape, { type: "compound" }>, density: number): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const settings = new jolt.StaticCompoundShapeSettings();
		const cleanups: (() => void)[] = [];
		const position = new jolt.Vec3(0, 0, 0);
		const rotation = new jolt.Quat(0, 0, 0, 1);
		for (const child of shape.children) {
			const built = this._createShape(child.shape, density);
			if (built.cleanup) cleanups.push(built.cleanup);
			const p = child.position, r = child.rotation;
			position.Set(p.x, p.y, p.z);
			rotation.Set(r.x, r.y, r.z, r.w);
			settings.AddShapeShape(position, rotation, built.shape, 0);
		}
		jolt.destroy(position);
		jolt.destroy(rotation);
		const result = settings.Create();
		const cleanup = () => {
			jolt.destroy(settings);
			for (const fn of cleanups) fn();
		};
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: compound shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_createHeightfieldShape (shape: Extract<IgePhysicsBackendShape, { type: "heightfield" }>): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const size = shape.size;
		// Jolt needs an even sample count: pad an odd grid with a column and
		// row of holes (no collision)
		const count = size % 2 === 0 ? size : size + 1;
		const NO_COLLISION = 3.4028234663852886e38;
		const settings = new jolt.HeightFieldShapeSettings();
		settings.mSampleCount = count;
		settings.mBlockSize = 2;
		this._vec.Set(0, 0, 0);
		settings.mOffset = this._vec;
		this._vec.Set(shape.spacing, 1, shape.spacing);
		settings.mScale = this._vec;
		const samples = settings.mHeightSamples;
		samples.resize(count * count);
		const heap = jolt.HEAPF32;
		const start = jolt.getPointer(samples.data()) >> 2;
		for (let z = 0; z < count; z++) {
			for (let x = 0; x < count; x++) {
				heap[start + z * count + x] = x < size && z < size ? shape.heights[z * size + x] : NO_COLLISION;
			}
		}

		const result = settings.Create();
		const cleanup = () => jolt.destroy(settings);
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: heightfield shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_createMeshShape (shape: Extract<IgePhysicsBackendShape, { type: "mesh" }>): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const source = shape.vertices;
		const vertexCount = Math.floor(source.length / 3);
		const indices = shape.indices;
		const triangleCount = indices ? Math.floor(indices.length / 3) : Math.floor(vertexCount / 3);

		// Fill both lists straight into Jolt's memory. Going through each
		// element (vertices.at(i)) leaves a JS wrapper per element in the
		// binding's cache for good: 38 MB of JS heap for a city's collision.
		const vertices = new jolt.VertexList();
		vertices.resize(vertexCount);
		const v = this._listLayout(vertices, jolt.Float3, vertexCount, 12);
		const f32 = jolt.HEAPF32;
		if (v.stride === 12) {
			f32.set(source.subarray(0, vertexCount * 3), v.address >> 2);
		} else {
			for (let i = 0, at = v.address >> 2, step = v.stride >> 2; i < vertexCount; i++, at += step) {
				f32[at] = source[i * 3]; f32[at + 1] = source[i * 3 + 1]; f32[at + 2] = source[i * 3 + 2];
			}
		}
		const triangles = new jolt.IndexedTriangleList();
		triangles.resize(triangleCount);
		// Each triangle: three indices, a material index (0) and user data (0)
		const t = this._listLayout(triangles, jolt.IndexedTriangle, triangleCount, 16);
		const u32 = jolt.HEAPU32;
		for (let i = 0, at = t.address >> 2, step = t.stride >> 2; i < triangleCount; i++, at += step) {
			u32[at] = indices ? indices[i * 3] : i * 3;
			u32[at + 1] = indices ? indices[i * 3 + 1] : i * 3 + 1;
			u32[at + 2] = indices ? indices[i * 3 + 2] : i * 3 + 2;
			u32[at + 3] = 0;
			if (step > 4) u32[at + 4] = 0;
		}
		const materials = new jolt.PhysicsMaterialList();
		const settings = new jolt.MeshShapeSettings(vertices, triangles, materials);
		const result = settings.Create();
		const cleanup = () => {
			jolt.destroy(settings);
			jolt.destroy(vertices);
			jolt.destroy(triangles);
			jolt.destroy(materials);
		};
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: mesh shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	/**
	 * Where a list's elements start in Jolt's memory and how far apart
	 * they are (bytes), from the first two elements' wrappers, which are
	 * then dropped from the binding's cache. `least`: the smallest size an
	 * element can be.
	 */
	_listLayout (list: { at (index: number): object }, kind: unknown, count: number, least: number): { address: number; stride: number } {
		const jolt = this._jolt as IgeJolt & { getCache?: (kind: unknown) => Record<number, unknown> };
		if (!count) return { address: 0, stride: least };
		const address = jolt.getPointer(list.at(0));
		const stride = count > 1 ? jolt.getPointer(list.at(1)) - address : least;
		const cache = jolt.getCache?.(kind);
		if (cache) {
			delete cache[address];
			delete cache[address + stride];
		}
		if (stride < least || stride % 4) throw new Error(`IgePhysics3d: unexpected Jolt list layout (${stride} bytes an element)`);
		return { address, stride };
	}

	_createConvexShape (shape: Extract<IgePhysicsBackendShape, { type: "convex" }>, density: number): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const source = shape.points;
		const settings = new jolt.ConvexHullShapeSettings();
		settings.mDensity = density;
		for (let i = 0; i + 2 < source.length; i += 3) {
			this._vec.Set(source[i], source[i + 1], source[i + 2]);
			settings.mPoints.push_back(this._vec);
		}
		const result = settings.Create();
		const cleanup = () => jolt.destroy(settings);
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: convex shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}
}

let nextGroupId = 1;
/** Worker threads the live threaded worlds ask for, by Jolt instance. */
const threadsInUse = new WeakMap<IgeJolt, number>();
let warnedThreads = false;
