/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgeBreakEvent, IgeBreakResult, IgeBreakableOptions } from "@/engine/physics/IgeBreakable3d";
import type { IgeJoltBackend } from "@/engine/physics/IgeJoltBackend";
import { igeFractureChecksum, type IgeFracturePiece } from "@/engine/physics/IgeFracture";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { addFloor, createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";
import { crateMesh, fenceMesh, paneMesh } from "./support/breakableProps";

/*
 * Breakable props through IgePhysics3d's public API, once per physics
 * backend: thresholds, pieces thrown and freed, the debris cap, a fixed
 * prop letting what hit it through, and two worlds (a server and a client
 * over a loopback link) cutting the same big pieces from one break event.
 * One unit is a centimetre; the floor's top is at y = 0.
 */

beforeAll(() => stubWebGlEngine());

const WOOD_COLOR = { r: 0.6, g: 0.45, b: 0.3, a: 1 };

/** A prop entity with a mesh and a colour, at a position. */
function prop (geometry: IgeGeometryData3d, x: number, y: number, z: number): IgeEntity {
	const entity = new IgeEntity();
	entity.geometry(geometry);
	entity.material({ color: WOOD_COLOR });
	entity.translateTo(x, y, z);
	return entity;
}

/** A 1000 kg box (a car stand-in) sliding along x at a speed, on a floor with no friction. */
function ram (physics: IgePhysics3d, x: number, y: number, z: number, speed: number) {
	const entity = new IgeEntity().translateTo(x, y, z);
	// 2 x 1 x 1 m at 500 kg per cubic metre: 1000 kg
	const body = physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 100, y: 50, z: 50 } }, density: 500, friction: 0 });
	body.setVelocity(speed, 0, 0);
	return body;
}

/** Checksums of pieces' meshes, by id. */
function shapes (result: IgeBreakResult): Map<string, number> {
	const map = new Map<string, number>();
	for (const piece of result.pieces) {
		const g = piece.entity.geometry()!;
		map.set(piece.id, igeFractureChecksum([{ index: piece.index, big: piece.big, vertices: g.vertices, normals: g.normals, uvs: g.uvs, colors: g.colors, indices: g.indices, hull: new Float32Array(0), centre: { x: 0, y: 0, z: 0 }, volume: 0 } as unknown as IgeFracturePiece]));
	}
	return map;
}

const CRATE: IgeBreakableOptions = { threshold: 6000, material: "wood", mass: 20, debrisLifetime: 2, fadeTime: 0.5 };
const FENCE: IgeBreakableOptions = { threshold: 150000, material: "wood", mass: 25, debrisLifetime: 2 };

describe.each(physicsTestBackends())("breakables on $name", (backend) => {
	let physics: IgePhysics3d;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
		addFloor(physics);
	});

	afterEach(() => physics.destroy());

	/** A 20 kg crate standing on the floor, its body a box. */
	function crate (x: number, z: number, options: Partial<IgeBreakableOptions> = {}, key?: string) {
		const entity = prop(crateMesh(), x, 30, z);
		physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density: 20 / 0.216, friction: 0.6 });
		return physics.addBreakable(entity, { ...CRATE, ...options, key });
	}

	it("doesn't break from a gentle bump or a short drop, and does from a hard hit", () => {
		const breaks: IgeBreakResult[] = [];
		physics.breakables.on("break", (result: IgeBreakResult) => { breaks.push(result); });
		const a = crate(0, 0, {}, "a");
		// Dropped from 30 cm onto the floor, then nudged at 0.5 m/s
		const dropped = crate(500, 0, {}, "dropped");
		dropped.body.teleport(500, 60, 0);
		ram(physics, -300, 50, 0, 50);
		run(physics, 2);
		expect(breaks).toHaveLength(0);
		expect(a.broken()).toBe(false);
		expect(dropped.broken()).toBe(false);

		// The ram again, at 8 m/s
		const b = crate(0, 600, {}, "b");
		ram(physics, -300, 50, 600, 800);
		run(physics, 1);
		expect(b.broken()).toBe(true);
		expect(breaks).toHaveLength(1);
		const result = breaks[0];
		expect(result.breakable).toBe(b);
		expect(result.pieces.length).toBeGreaterThan(5);
		expect(result.event.id).toBe("b");
		expect(result.strength).toBeGreaterThanOrEqual(1);
		// Hit on its -x side, pushed along +x
		expect(result.event.point.x).toBeLessThan(-20);
		expect(result.direction.x).toBeGreaterThan(0.5);
		// The prop's body is gone, its pieces have their own with masses adding up to its 20 kg
		expect(physics.bodyOf(b.entity)).toBeUndefined();
		const mass = result.pieces.reduce((total, piece) => total + piece.body.mass(), 0);
		expect(mass).toBeGreaterThan(19);
		expect(mass).toBeLessThan(21);
	});

	it("throws the pieces along the blow and lands them on the floor, every hull a body", () => {
		const b = crate(0, 0);
		ram(physics, -300, 50, 0, 900);
		run(physics, 0.6);
		expect(b.broken()).toBe(true);
		const pieces = physics.breakables.pieces();
		const meanX = pieces.reduce((t, p) => t + p.entity._translate.x, 0) / pieces.length;
		expect(meanX).toBeGreaterThan(30);
		run(physics, 1);
		for (const piece of physics.breakables.pieces()) {
			expect(piece.entity._translate.y).toBeGreaterThan(-5); // nothing fell through
			expect(Number.isFinite(piece.body.mass())).toBe(true);
		}
	});

	it("lets what hits a fixed prop carry on, less the momentum it took to break it", () => {
		const fence = prop(fenceMesh(), 0, 0, 0);
		fence.rotateTo(0, Math.PI / 2, 0); // across the ram's path
		const breakable = physics.addBreakable(fence, { ...FENCE, key: "fence" });
		expect(breakable.body.type).toBe("static");
		const hitter = ram(physics, -250, 52, 0, 600);
		let speedAfter = 0;
		breakable.on("break", () => { speedAfter = hitter.velocity().x; });
		run(physics, 1);
		expect(breakable.broken()).toBe(true);
		// 1000 kg at 6 m/s loses 150,000 / 1000 = 150 units/s (and a little more pushing the pieces)
		expect(speedAfter).toBeGreaterThan(400);
		expect(speedAfter).toBeLessThan(500);
		expect(hitter.entity._translate.x).toBeGreaterThan(100);
	});

	it("lets the hitter bounce off when the hit is under the threshold", () => {
		const fence = prop(fenceMesh(), 0, 0, 0);
		fence.rotateTo(0, Math.PI / 2, 0);
		const breakable = physics.addBreakable(fence, { ...FENCE, key: "fence" });
		const hitter = ram(physics, -250, 52, 0, 100);
		run(physics, 2);
		expect(breakable.broken()).toBe(false);
		expect(hitter.entity._translate.x).toBeLessThan(-100);
	});

	it("fades small pieces after their lifetime and frees them", () => {
		const b = crate(0, 0);
		const removed: string[] = [];
		physics.breakables.on("pieceRemoved", (piece: { id: string }) => { removed.push(piece.id); });
		const result = b.break({ point: { x: 0, y: 60, z: 0 }, impulse: { x: 0, y: -20000, z: 0 } })!;
		const small = result.pieces.filter((p) => !p.big);
		expect(small.length).toBeGreaterThan(0);
		const before = physics.stats().bodies;
		run(physics, 1.5);
		expect(physics.breakables.stats().debris).toBe(small.length);
		// Lifetimes are 2 s give or take 20%, then half a second's fade
		run(physics, 0.5);
		const fading = small.filter((p) => !p.removed() && p.entity.opacity() < 1);
		expect(fading.length).toBeGreaterThan(0);
		run(physics, 1.5);
		expect(physics.breakables.stats().debris).toBe(0);
		for (const piece of small) {
			expect(piece.removed()).toBe(true);
			expect(piece.body._destroyed).toBe(true);
			expect(physics.breakables.piece(piece.id)).toBeUndefined();
		}
		expect(removed.length).toBe(small.length);
		expect(physics.stats().bodies).toBe(before - small.length);
	});

	it("caps the debris across the world, the oldest going first", () => {
		physics.breakables.maxDebris(40);
		const pane = (x: number, key: string) => physics.addBreakable(prop(paneMesh(), x, 0, 0), { threshold: 1000, material: "glass", key, debrisLifetime: 60 });
		const hit = (x: number) => ({ point: { x, y: 60, z: 0 }, impulse: { x: 0, y: 0, z: -2000 } });
		const first = pane(0, "first").break(hit(0))!;
		const firstSmall = first.pieces.filter((p) => !p.big);
		expect(firstSmall.length).toBeGreaterThan(20);
		const second = pane(300, "second").break(hit(300))!;
		expect(physics.breakables.stats().debris).toBe(40);
		const secondSmall = second.pieces.filter((p) => !p.big);
		// Everything of the second is there; of the first, only its newest
		for (const piece of secondSmall) expect(piece.removed()).toBe(false);
		const gone = firstSmall.filter((p) => p.removed());
		expect(gone.length).toBe(firstSmall.length + secondSmall.length - 40);
		expect(gone.map((p) => p.index)).toEqual(firstSmall.slice(0, gone.length).map((p) => p.index));
	});

	it("replays a break in another world: the same big pieces, ids and shapes", async () => {
		const other = await createTestPhysics({}, backend);
		addFloor(other);
		const make = (world: IgePhysics3d) => {
			const entity = prop(crateMesh("sharedCrate"), 0, 30, 0);
			world.addBody(entity, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density: 90 });
			return world.addBreakable(entity, { ...CRATE, key: "crate-7", bigVolume: 1000 });
		};
		const server = make(physics);
		const client = make(other);
		ram(physics, -300, 50, 0, 900);
		let sent: string | null = null;
		server.on("break", (result: IgeBreakResult) => { sent = JSON.stringify(result.event); });
		run(physics, 0.5);
		expect(sent).not.toBeNull();
		const event = JSON.parse(sent!) as IgeBreakEvent;
		const replayed = other.breakables.replay(event)!;
		const original = physics.breakables.pieces();
		expect(replayed.big.length).toBeGreaterThan(0);
		expect(replayed.big.map((p) => p.id)).toEqual(event.big);
		expect(replayed.pieces.map((p) => p.id)).toEqual(original.map((p) => p.id));
		const a = shapes({ pieces: original } as IgeBreakResult), b = shapes(replayed);
		for (const [id, checksum] of a) expect(b.get(id)).toBe(checksum);
		expect(client.broken()).toBe(true);
		other.destroy();
	});

	it("predicts a hit on a client and breaks when the server's event comes", () => {
		const fence = prop(fenceMesh(), 0, 0, 0);
		fence.rotateTo(0, Math.PI / 2, 0);
		const breakable = physics.addBreakable(fence, { ...FENCE, key: "fence", authority: false, bigPieces: "kinematic", predictTimeout: 0.5 });
		const hits: IgeBreakEvent[] = [];
		breakable.on("hit", (event: IgeBreakEvent) => { hits.push(event); });
		const hitter = ram(physics, -250, 52, 0, 600);
		run(physics, 0.6);
		// Let through, not broken: waiting for the server
		expect(hits).toHaveLength(1);
		expect(breakable.broken()).toBe(false);
		expect(hitter.entity._translate.x).toBeGreaterThan(0);
		const result = breakable.replay(hits[0])!;
		expect(result.pieces.length).toBeGreaterThan(1);
		for (const piece of result.big) expect(piece.body.type).toBe("kinematic");
	});
});

describe.each(physicsTestBackends())("breaks over a replication link on $name", (backend) => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	it("sends the break as an event, replicates big pieces by id, and the client cuts the same pieces", async () => {
		jest.useRealTimers();
		const serverWorld = await createTestPhysics({}, backend);
		const clientWorld = await createTestPhysics({}, backend);
		jest.useFakeTimers({ now: 1000 });
		addFloor(serverWorld);
		addFloor(clientWorld);
		const make = (world: IgePhysics3d, authority: boolean) => {
			const entity = prop(paneMesh("window"), 0, 0, 0);
			return world.addBreakable(entity, { threshold: 1000, material: "glass", key: "window-3", authority, bigVolume: 100, maxBig: 4, bigPieces: authority ? "dynamic" : "kinematic" });
		};
		make(serverWorld, true);
		make(clientWorld, false);

		// The game's schemas: a piece's transform, and the break event as JSON
		const n = (precision: number): IgeNetFieldDef => ({ type: "number", precision });
		const defs = { piece: { x: n(0.1), y: n(0.1), z: n(0.1), qx: n(0.001), qy: n(0.001), qz: n(0.001), qw: n(0.001) } };
		const inputDefs: Record<string, IgeNetFieldDef> = { dx: { type: "number", precision: 0.1, min: -1, max: 1 } };
		const net = igeNetLoopback({ latency: 20, jitter: 0, loss: 0 });
		const host = new IgeNetReplicationHost(net.listener, {
			schemas: defs, inputSchema: inputDefs, tickRate: 30, sendRate: 30,
			join: (machine, players) => {
				machine.viewer.subscribe("street");
				return players.map((_, i) => `${machine.id}.${i}`);
			},
			step: () => undefined
		});
		const client = new IgeNetReplicationClient(net.connect(), { schemas: defs, inputSchema: inputDefs, pingInterval: 0, now: () => Date.now() });
		const welcome = client.join([{}]);
		await jest.advanceTimersByTimeAsync(300);
		await welcome;

		// Server: break it, send the event, replicate the big pieces by their ids
		serverWorld.breakables.on("break", (result: IgeBreakResult) => {
			host.event({ t: "break", ...result.event }, { scope: "street" });
			for (const piece of result.big) host.replicator.create("piece", piece.id, transformOf(piece.entity), { scope: "street" });
		});
		const serverResult = serverWorld.breakables.get("window-3")!.break({ point: { x: 10, y: 70, z: 0 }, impulse: { x: 0, y: 0, z: -5000 } })!;
		expect(serverResult.big.length).toBeGreaterThan(0);

		// Client: replay the event, then follow each big piece by id
		const replayed: IgeBreakResult[] = [];
		client.on("event", (data: any) => {
			if (data.t !== "break") return;
			const { t: _t, ...event } = data;
			replayed.push(clientWorld.breakables.replay(event as IgeBreakEvent)!);
		});
		for (let i = 0; i < 10; i++) {
			serverWorld.update(1 / 30);
			for (const piece of serverResult.big) host.replicator.get(piece.id)?.write(transformOf(piece.entity));
			host.update(1000 / 30);
			await jest.advanceTimersByTimeAsync(1000 / 30);
		}
		expect(replayed).toHaveLength(1);
		const clientResult = replayed[0];
		expect(clientResult.pieces.map((p) => p.id)).toEqual(serverResult.pieces.map((p) => p.id));
		expect(clientResult.big.map((p) => p.id)).toEqual(serverResult.big.map((p) => p.id));
		const a = shapes(serverResult), b = shapes(clientResult);
		for (const [id, checksum] of a) expect(b.get(id)).toBe(checksum);
		// Every replicated big piece is one the client cut itself
		const replicated = [...client.objects.keys()].filter((id) => id.startsWith("window-3#"));
		expect(replicated.sort()).toEqual(serverResult.big.map((p) => p.id).sort());
		for (const id of replicated) {
			const values = client.objects.get(id)!.states.at(-1)!.values as Record<string, number>;
			const piece = clientWorld.breakables.piece(id)!;
			piece.follow({ position: { x: values.x, y: values.y, z: values.z }, rotation: { x: values.qx, y: values.qy, z: values.qz, w: values.qw }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
			expect(piece.body.type).toBe("kinematic");
			expect(piece.entity._translate.y).toBeCloseTo(values.y, 5);
		}
		host.destroy();
		client.destroy();
		serverWorld.destroy();
		clientWorld.destroy();
	});
});

function transformOf (entity: IgeEntity) {
	const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
	return { x: entity._translate.x, y: entity._translate.y, z: entity._translate.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w };
}

describe("breakables and Jolt's memory", () => {
	const jolt = physicsTestBackends().find((backend) => backend.name === "jolt");
	const itJolt = jolt ? it : it.skip;

	itJolt("gives back every byte the pieces take", async () => {
		const physics = await createTestPhysics({}, jolt);
		addFloor(physics);
		const joltApi = (physics._backend as IgeJoltBackend)._jolt;
		const used = () => joltApi.JoltInterface.prototype.sGetTotalMemory() - joltApi.JoltInterface.prototype.sGetFreeMemory();
		let n = 0;
		const cycle = () => {
			for (const [mesh, material] of [[crateMesh("leakCrate"), "wood"], [paneMesh("leakPane"), "glass"]] as const) {
				const entity = prop(mesh, 0, 30, 0);
				const breakable = physics.addBreakable(entity, { threshold: 1000, material, key: `leak${n++}`, debrisLifetime: 0.2, fadeTime: 0.1, bigLifetime: 0.3 });
				breakable.break();
			}
			run(physics, 0.6);
			expect(physics.breakables.pieces()).toHaveLength(0);
		};
		cycle();
		cycle();
		const before = used();
		for (let i = 0; i < 8; i++) cycle();
		expect(used() - before).toBeLessThan(128);
		physics.destroy();
	});
});

describe.each(physicsTestBackends())("how long breaking takes on $name", (backend) => {
	it.each([
		["a crate", () => crateMesh("timeCrate"), "wood" as const, { x: 0, y: 40, z: 30 }],
		["a fence panel", () => fenceMesh("timeFence"), "wood" as const, { x: 30, y: 60, z: 4 }],
		["a glass pane", () => paneMesh("timePane"), "glass" as const, { x: 20, y: 70, z: 0.4 }]
	])("%s", async (name, mesh, material, point) => {
		const physics = await createTestPhysics({}, backend);
		addFloor(physics);
		const geometry = mesh();
		const fracture: number[] = [], spawn: number[] = [];
		let pieces = 0;
		for (let i = 0; i < 12; i++) {
			const entity = prop(geometry, i * 400, 0, 0);
			const breakable = physics.addBreakable(entity, { threshold: 1000, material, key: `t${i}`, seed: i });
			const result = breakable.break({ point: { x: point.x + i * 400, y: point.y, z: point.z }, impulse: { x: 0, y: 0, z: -3000 } })!;
			if (i >= 2) {
				fracture.push(result.fractureMs);
				spawn.push(result.spawnMs);
				pieces += result.pieces.length;
			}
			run(physics, 1 / 60);
		}
		fracture.sort((a, b) => a - b);
		spawn.sort((a, b) => a - b);
		const median = (list: number[]) => list[Math.floor(list.length / 2)];
		console.log(`break ${name} on ${backend.name}: cut best ${fracture[0].toFixed(2)} / median ${median(fracture).toFixed(2)} ms, spawn best ${spawn[0].toFixed(2)} / median ${median(spawn).toFixed(2)} ms, ${(pieces / fracture.length).toFixed(1)} pieces`);
		expect(fracture[0]).toBeLessThan(10);
		expect(spawn[0]).toBeLessThan(20);
		physics.destroy();
	});
});
