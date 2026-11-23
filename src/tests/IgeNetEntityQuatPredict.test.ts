import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/instance";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { igeNetQuatAngle, type IgeNetQuat } from "@/engine/network/entities/igeNetQuat";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";
import { createEntityGame, ENTITY_CLASSES, flyShip, SHIP_INPUT_SCHEMA, TURN_RATE, type Ship, type ShipInput, type ShipState } from "../examples/entityStream/shared";

const DEG = 180 / Math.PI;
const TICK = 1000 / 30;
const IDLE: ShipInput = { pitch: 0, yaw: 0, roll: 0, thrust: 0 };

const about = (axis: "x" | "y" | "z", angle: number): IgeNetQuat => {
	const q = { x: 0, y: 0, z: 0, w: Math.cos(angle / 2) };
	q[axis] = Math.sin(angle / 2);
	return q;
};

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => undefined, _bounds2d: new IgePoint2d(0, 0), _currentTime: 0, addBehaviour: () => undefined, removeBehaviour: () => undefined },
		configurable: true,
		writable: true
	});
});

describe("predicting a player-steered quaternion", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	async function setup (latency = 50) {
		const net = igeNetLoopback({ latency });
		const game = createEntityGame(net.listener, { tumblers: 2 });
		let uid = 0;
		const join = async (name: string) => {
			const client = new IgeNetReplicationClient<ShipInput>(net.connect(), { schemas: game.replicator.schemas, inputSchema: SHIP_INPUT_SCHEMA, interpolationDelay: 0, pingInterval: 0, now: () => Date.now() });
			const prefix = `${name}${uid++}:`;
			const entities = new IgeNetEntityClient(client, ENTITY_CLASSES, { idOf: (id) => `${prefix}${id}` });
			const joining = client.join([{ callsign: name }]);
			await jest.advanceTimersByTimeAsync(300);
			const me = (await joining).players[0];
			return { client, entities, me };
		};
		const a = await join("a");
		const b = await join("b");
		/** One tick: the clients send their inputs, the host steps, time passes, the clients draw. */
		const tick = async (inputA: ShipInput = IDLE, inputB: ShipInput = IDLE, between = 0.5) => {
			a.client.sendInput([inputA]);
			b.client.sendInput([inputB]);
			game.host.update(TICK);
			await jest.advanceTimersByTimeAsync(TICK);
			a.entities.update(undefined, between);
			b.entities.update(undefined, between);
		};
		for (let i = 0; i < 20; i++) await tick();
		const destroy = () => {
			a.entities.destroy();
			b.entities.destroy();
			a.client.destroy();
			b.client.destroy();
			game.destroy();
		};
		return { game, a, b, tick, destroy };
	}

	it("turns a controlled quaternion entity with its input at once, not a latency later", async () => {
		const s = await setup();
		const applied: unknown[] = [];
		s.a.entities.control<ShipState, ShipInput>(s.a.me, 0, (state, input, dt) => {
			applied.push(state.q);
			return flyShip(state, input, dt);
		});
		const mine = s.a.entities.entityOf(s.a.me)!;
		await s.tick();
		const before = { ...mine.quaternion()! };
		// Input, and a draw before anything has gone anywhere: the entity has turned already
		s.a.client.sendInput([{ pitch: 0, yaw: 1, roll: 0, thrust: 0 }]);
		s.a.entities.update(undefined, 1);
		const turned = igeNetQuatAngle(before, mine.quaternion()!) * DEG;
		expect(turned).toBeGreaterThan((TURN_RATE / 30) * DEG * 0.9);
		expect(turned).toBeLessThan((TURN_RATE / 30) * DEG * 1.1 + 0.2);
		// The interpolated server state has not moved
		const server = s.a.entities._quaternionOf(s.a.entities._made.get(s.a.me)!, s.a.client.interpolated()[s.a.me]) as IgeNetQuat;
		expect(igeNetQuatAngle(before, server) * DEG).toBeLessThan(0.2);
		expect(applied.length).toBeGreaterThan(0);
		s.destroy();
	});

	it("agrees with the host within the quantisation error once its inputs are acked", async () => {
		const s = await setup();
		s.a.entities.control<ShipState, ShipInput>(s.a.me, 0, flyShip);
		const turn = { pitch: 0.6, yaw: 1, roll: -0.8, thrust: 1 };
		for (let i = 0; i < 40; i++) await s.tick(turn);
		for (let i = 0; i < 20; i++) await s.tick(IDLE, IDLE, 1);
		const host = s.game.pilots.get(s.a.me)!;
		const mine = s.a.entities.entityOf(s.a.me)!;
		expect(igeNetQuatAngle(host._quaternion!, mine.quaternion()!) * DEG).toBeLessThan(0.2);
		expect(Math.hypot(host._translate.x - mine._translate.x, host._translate.y - mine._translate.y, host._translate.z - mine._translate.z)).toBeLessThan(0.5);
		// It really did turn
		expect(igeNetQuatAngle({ x: 0, y: 0, z: 0, w: 1 }, host._quaternion!) * DEG).toBeGreaterThan(10);
		s.destroy();
	});

	it("blends the last two predicted ticks along the shortest path, across the q / -q sign flip", async () => {
		const s = await setup();
		const id = s.a.me;
		// Absolute results: 179 degrees about y, then the same rotation as 181 degrees written as its negative
		const first = about("y", 179 / DEG);
		const second = about("y", 181 / DEG);
		const negated = { x: -second.x, y: -second.y, z: -second.z, w: -second.w };
		const predict = (q: IgeNetQuat, between: number) => s.a.client.predict<ShipState>(id, 0, (state) => ({ ...state, q }), { between, quats: ["q"] })!.q;
		s.a.client.sendInput([IDLE]);
		predict(first, 0);
		await s.tick();
		s.a.client.sendInput([IDLE]);
		const mid = predict(negated, 0.5);
		expect(igeNetQuatAngle(mid, about("y", 180 / DEG)) * DEG).toBeLessThan(0.01);
		expect(Math.hypot(mid.x, mid.y, mid.z, mid.w)).toBeCloseTo(1, 6);
		// The ends of the blend
		expect(igeNetQuatAngle(predict(negated, 0), first) * DEG).toBeLessThan(0.01);
		expect(igeNetQuatAngle(predict(negated, 1), second) * DEG).toBeLessThan(0.01);
		s.destroy();
	});

	it("gives apply an { x, y, z, w } object and takes one back", async () => {
		const s = await setup();
		const seen: unknown[] = [];
		const result = about("x", 0.5);
		s.a.entities.control<ShipState, ShipInput>(s.a.me, 0, (state) => {
			seen.push(state.q);
			return { ...state, q: result };
		});
		await s.tick();
		s.a.client.sendInput([IDLE]);
		s.a.entities.update(undefined, 1);
		expect(seen.length).toBeGreaterThan(0);
		for (const q of seen) {
			expect(typeof q).toBe("object");
			expect(Object.keys(q as object).sort()).toEqual(["w", "x", "y", "z"]);
		}
		expect(igeNetQuatAngle(s.a.entities.entityOf(s.a.me)!.quaternion()!, result) * DEG).toBeLessThan(0.001);
		s.destroy();
	});

	it("leaves quaternion entities that aren't controlled interpolated, and predict() without quats as it was", async () => {
		const s = await setup();
		let calls = 0;
		s.a.entities.control<ShipState, ShipInput>(s.a.me, 0, (state, input, dt) => {
			calls++;
			return flyShip(state, input, dt);
		});
		for (let i = 0; i < 30; i++) await s.tick({ pitch: 0, yaw: 1, roll: 0, thrust: 0 }, { pitch: 0.5, yaw: 0, roll: 1, thrust: 0 });
		for (let i = 0; i < 20; i++) await s.tick(IDLE, IDLE, 1);
		expect(calls).toBeGreaterThan(0);
		// B's ship, seen by A, is not predicted: it follows the interpolated server state
		const theirs = s.a.entities.entityOf(s.b.me);
		expect(theirs).toBeDefined();
		{
			const server = s.a.entities._quaternionOf(s.a.entities._made.get(s.b.me)!, s.a.client.interpolated()[s.b.me]) as IgeNetQuat;
			expect(igeNetQuatAngle(theirs!.quaternion()!, server) * DEG).toBeLessThan(0.001);
		}
		// Tumblers (never controlled) hold the interpolated quaternion too
		let compared = 0;
		for (const tumbler of s.game.tumblers) {
			const copy = s.a.entities.entityOf(tumbler.id());
			if (!copy || !s.a.client.interpolated()[tumbler.id()]) continue;
			compared++;
			const server = s.a.entities._quaternionOf(s.a.entities._made.get(tumbler.id())!, s.a.client.interpolated()[tumbler.id()]) as IgeNetQuat;
			expect(igeNetQuatAngle(copy.quaternion()!, server) * DEG).toBeLessThan(0.001);
		}
		expect(compared).toBeGreaterThan(0);
		// Without `quats`, predict() hands the packed number to apply as before
		const raw = s.a.client.predict<{ [key: string]: unknown }>(s.a.me, 0, (state) => state, {});
		expect(typeof raw!.q).toBe("number");
		expect((s.game.pilots.get(s.a.me) as Ship).callsign).toBe("a");
		s.destroy();
	});
});
