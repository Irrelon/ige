/**
 * What the entity streaming examples share (entityStream: host and two clients in one page;
 * entityStreamNet: a Node server and browser tabs): the entity classes, the schemas, the movement
 * rule, and the game that runs on the authority.
 *
 * The world is a square on the ground plane (x and z, y is up). Pilots are steered by their players;
 * tumblers drift about in circles turning over in 3D, replicated as quaternions. Both are spatial
 * kinds: a machine sees only what's within RANGE of its own pilot.
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeNetEntityHost } from "@/engine/network/entities/IgeNetEntityHost";
import { igeNetEntity, igeNetEntitySchemas } from "@/engine/network/entities/igeNetEntity";
import type { IgeNetQuat } from "@/engine/network/entities/igeNetQuat";
import { IgeNetReplicationHost, type IgeNetReplicationMachine } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicator } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import type { IgeNetListener } from "@/engine/network/transport/IgeNetTransport";

/** The world spans -WORLD/2 to WORLD/2 on x and z. */
export const WORLD = 1600;
/** How far a machine sees round its pilot. */
export const RANGE = 360;
/** Units per second at full stick. */
export const SPEED = 240;
export const TICK_RATE = 30;
export const SEND_RATE = 20;
export const TUMBLER_COUNT = 26;
export const SCENE_ID = "world";

/** A player's ship: steered, replicated with a heading (y rotation). */
export class Pilot extends IgeEntity {
	static net = igeNetEntity(
		"pilot",
		{ hue: { type: "int", min: 0, max: 7 }, callsign: { type: "string" } },
		{ transform: { precision: 0.05, rotation: "y" } }
	);
	hue = 0;
	callsign = "";
}

/** A drifting, tumbling block: replicated with a quaternion rotation. */
export class Tumbler extends IgeEntity {
	static net = igeNetEntity(
		"tumbler",
		{ shape: { type: "int", min: 0, max: 2 } },
		{ transform: { precision: 0.05 }, rotation: "quaternion" }
	);
	shape = 0;
}

/** A player's ship: flown in 3D, replicated with a quaternion rotation (the player's own is predicted). */
export class Ship extends IgeEntity {
	static net = igeNetEntity(
		"ship",
		{ hue: { type: "int", min: 0, max: 7 }, callsign: { type: "string" } },
		{ transform: { precision: 0.05 }, rotation: "quaternion" }
	);
	hue = 0;
	callsign = "";
}

export const ENTITY_CLASSES = [Pilot, Ship, Tumbler];
export const ENTITY_SCHEMAS = igeNetEntitySchemas(ENTITY_CLASSES);

export interface PilotInput {
	dx: number;
	dz: number;
}

export const INPUT_SCHEMA = {
	dx: { type: "number", precision: 0.01, min: -1, max: 1 },
	dz: { type: "number", precision: 0.01, min: -1, max: 1 }
} as const;

/** What a ship's pilot asks for: pitch, yaw and roll (-1 to 1, about the ship's own axes) and thrust (0 to 1, along its nose). */
export interface ShipInput {
	pitch: number;
	yaw: number;
	roll: number;
	thrust: number;
}

export const SHIP_INPUT_SCHEMA = {
	pitch: { type: "number", precision: 0.01, min: -1, max: 1 },
	yaw: { type: "number", precision: 0.01, min: -1, max: 1 },
	roll: { type: "number", precision: 0.01, min: -1, max: 1 },
	thrust: { type: "number", precision: 0.01, min: 0, max: 1 }
} as const;

/** Radians per second at full deflection. */
export const TURN_RATE = 2;
/** Ships fly between the ground and this height. */
export const CEILING = 500;

/** The replicated values the movement rule reads and writes. */
export interface PilotState {
	[key: string]: unknown;
	x: number;
	z: number;
	ry: number;
}

/** One step of a pilot: the authority runs it, and the client predicts its own pilot with it. */
export function movePilot (state: PilotState, input: PilotInput, dt: number): PilotState {
	const length = Math.hypot(input.dx, input.dz);
	if (length === 0) return state;
	const scale = (length > 1 ? 1 / length : 1) * SPEED * dt;
	const half = WORLD / 2;
	return {
		...state,
		x: Math.max(-half, Math.min(half, state.x + input.dx * scale)),
		z: Math.max(-half, Math.min(half, state.z + input.dz * scale)),
		ry: Math.atan2(input.dx, input.dz)
	};
}

/** The replicated values a ship's rule reads and writes (`q` is an unpacked quaternion). */
export interface ShipState {
	[key: string]: unknown;
	x: number;
	y: number;
	z: number;
	q: IgeNetQuat;
}

/** a * b: the turn b, then the turn a. */
export function quatMultiply (a: IgeNetQuat, b: IgeNetQuat): IgeNetQuat {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
	};
}

/** The ship's nose (its local +z) in world space. */
export function shipNose (q: IgeNetQuat): [number, number, number] {
	return [2 * (q.x * q.z + q.w * q.y), 2 * (q.y * q.z - q.w * q.x), 1 - 2 * (q.x * q.x + q.y * q.y)];
}

/**
 * One step of a ship: pitch (about its own x), yaw (y) and roll (z) turn it, thrust moves it along its nose.
 * The authority runs it, and the client predicts its own ship with it.
 */
export function flyShip (state: ShipState, input: ShipInput, dt: number): ShipState {
	const hx = (input.pitch * TURN_RATE * dt) / 2, hy = (input.yaw * TURN_RATE * dt) / 2, hz = (input.roll * TURN_RATE * dt) / 2;
	const dq = quatMultiply(
		quatMultiply({ x: Math.sin(hx), y: 0, z: 0, w: Math.cos(hx) }, { x: 0, y: Math.sin(hy), z: 0, w: Math.cos(hy) }),
		{ x: 0, y: 0, z: Math.sin(hz), w: Math.cos(hz) }
	);
	const q = quatMultiply(state.q, dq);
	const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
	q.x /= length;
	q.y /= length;
	q.z /= length;
	q.w /= length;
	const nose = shipNose(q);
	const move = input.thrust * SPEED * dt;
	const half = WORLD / 2;
	return {
		...state,
		x: Math.max(-half, Math.min(half, state.x + nose[0] * move)),
		y: Math.max(0, Math.min(CEILING, state.y + nose[1] * move)),
		z: Math.max(-half, Math.min(half, state.z + nose[2] * move)),
		q
	};
}

/** A tumbler's place and turn at a time (seconds): a circle round a centre, a quaternion from two spins. */
interface TumblerPath {
	cx: number;
	cz: number;
	radius: number;
	speed: number;
	phase: number;
	axis: [number, number, number];
	spin: number;
	spin2: number;
}

function random (seed: number): () => number {
	return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function paths (count: number): TumblerPath[] {
	const next = random(7);
	const out: TumblerPath[] = [];
	for (let i = 0; i < count; i++) {
		const axis: [number, number, number] = [next() - 0.5, next() - 0.5, next() - 0.5];
		const length = Math.hypot(...axis) || 1;
		out.push({
			// Most start near the pilots' spawn ring (so several are in range from the start and drift in and out); the rest are spread over the world
			cx: (next() - 0.5) * (i < count * 0.6 ? 640 : WORLD - 200),
			cz: (next() - 0.5) * (i < count * 0.6 ? 640 : WORLD - 200),
			radius: 40 + next() * 120,
			speed: (0.2 + next() * 0.5) * (next() < 0.5 ? -1 : 1),
			phase: next() * Math.PI * 2,
			axis: [axis[0] / length, axis[1] / length, axis[2] / length],
			spin: 0.8 + next() * 1.6,
			spin2: 0.4 + next()
		});
	}
	return out;
}

/** The unit quaternion of a turn of `angle` about a unit `axis`. */
function axisAngle (axis: [number, number, number], angle: number): { x: number; y: number; z: number; w: number } {
	const s = Math.sin(angle / 2);
	return { x: axis[0] * s, y: axis[1] * s, z: axis[2] * s, w: Math.cos(angle / 2) };
}

const multiply = quatMultiply;

/** Puts a tumbler where its path says at `time` (seconds), turned over. */
export function placeTumbler (tumbler: Tumbler, path: TumblerPath, time: number): void {
	const a = path.phase + path.speed * time;
	tumbler.translateTo(path.cx + Math.cos(a) * path.radius, 24, path.cz + Math.sin(a) * path.radius);
	tumbler.quaternion(multiply(axisAngle(path.axis, path.spin * time), axisAngle([0, 1, 0], path.spin2 * time)));
}

export interface EntityGameOptions {
	/** The replicator's send rate and the host's (default SEND_RATE). */
	sendRate?: number;
	/** Datagram-style delivery: updates are acknowledged and carry everything since (use it when the transport can drop messages). */
	lossy?: boolean;
	/** The number of tumblers (default TUMBLER_COUNT). */
	tumblers?: number;
	/** Told of joins and leaves. */
	log?: (message: string) => void;
}

/**
 * The authority: a scene of tumblers, and a pilot for each machine that joins (players' first
 * description is `{ callsign }`), each machine seeing what's within RANGE of its pilot. Drive it with
 * `host.update(ms)` or `host.start()`.
 */
export function createEntityGame (listener: IgeNetListener, options: EntityGameOptions = {}) {
	const sendRate = options.sendRate ?? SEND_RATE;
	const replicator = new IgeNetReplicator(new IgeNetSchemaSet(ENTITY_SCHEMAS.defs, ENTITY_SCHEMAS.kinds), { sendRate });
	const entities = new IgeNetEntityHost(replicator, ENTITY_CLASSES);
	const scene = new IgeScene2d().id(SCENE_ID);
	const pilots = new Map<string, Ship>();
	const tumblerPaths = paths(options.tumblers ?? TUMBLER_COUNT);
	const tumblers = tumblerPaths.map((path, i) => {
		const tumbler = new Tumbler().id(`tumbler${i}`).mount(scene) as Tumbler;
		tumbler.shape = i % 3;
		placeTumbler(tumbler, path, 0);
		tumbler.replicate({ host: entities });
		return tumbler;
	});
	let joined = 0;

	const host = new IgeNetReplicationHost<ShipInput>(listener, {
		schemas: replicator.schemas,
		replicator,
		inputSchema: SHIP_INPUT_SCHEMA,
		tickRate: TICK_RATE,
		sendRate,
		lossy: options.lossy,
		join: (machine: IgeNetReplicationMachine, players) => {
			const callsign = String((players[0] as { callsign?: string } | undefined)?.callsign ?? `pilot${joined + 1}`);
			machine.viewer.subscribe(scene.id());
			const angle = (joined * Math.PI * 2) / 5;
			const pilot = new Ship().id(`pilot:${machine.id}`).mount(scene) as Ship;
			pilot.hue = joined % 8;
			pilot.callsign = callsign;
			// In the air, nose along the ring
			pilot.translateTo(Math.cos(angle) * 160, 120, Math.sin(angle) * 160);
			pilot.quaternion({ x: 0, y: Math.sin(-angle / 2), z: 0, w: Math.cos(-angle / 2) });
			joined++;
			pilots.set(pilot.id(), pilot);
			pilot.replicate({ host: entities });
			const obj = entities.objectOf(pilot)!;
			machine.viewer.addInterest(obj, { radius: RANGE });
			machine.viewer.control(obj);
			options.log?.(`${callsign} joined as ${pilot.id()}`);
			return [pilot.id()];
		},
		leave: (machine) => {
			for (const id of machine.players) {
				pilots.get(id)?.destroy();
				pilots.delete(id);
				options.log?.(`${id} left`);
			}
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				const pilot = pilots.get(id);
				if (!pilot || !pilot._alive) return;
				const t = pilot._translate;
				const moved = flyShip({ x: t.x, y: t.y, z: t.z, q: pilot._quaternion ?? { x: 0, y: 0, z: 0, w: 1 } }, input, dt);
				pilot.translateTo(moved.x, moved.y, moved.z).quaternion(moved.q);
			});
			const time = tick / TICK_RATE;
			tumblerPaths.forEach((path, i) => placeTumbler(tumblers[i], path, time));
		}
	});

	return {
		host, replicator, entities, scene, pilots, tumblers,
		destroy () {
			host.destroy();
			entities.destroy();
			for (const pilot of pilots.values()) pilot.destroy();
			for (const tumbler of tumblers) tumbler.destroy();
			scene.destroy();
		}
	};
}
