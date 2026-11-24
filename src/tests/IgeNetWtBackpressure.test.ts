import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { igeNetPacketType, igeNetReadPing, igeNetReadPong, igeNetWritePing, igeNetWritePong, IGE_NET_PACKET_PING, IGE_NET_PACKET_PONG } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetLoopback, type IgeNetConnection } from "@/engine/network/transport/IgeNetTransport";
import { IGE_WT_DATAGRAM_MAX_AGE, IGE_WT_MAX_PENDING_DATAGRAMS, IGE_WT_MAX_UNRELIABLE_BACKLOG, igeNetWtConnection } from "@/engine/network/transport/igeNetWebTransport";

/** A writer whose writes stay pending until `release()`, like a session that can't keep up. */
function fakeWriter () {
	const writes: Uint8Array[] = [];
	const waiting: (() => void)[] = [];
	let hold = true;
	return {
		writes,
		release: () => {
			hold = false;
			for (const fn of waiting.splice(0)) fn();
		},
		hold: () => { hold = true; },
		getWriter: () => ({
			write: (bytes: Uint8Array) => {
				writes.push(bytes);
				return hold ? new Promise<void>((resolve) => waiting.push(resolve)) : Promise.resolve();
			}
		})
	};
}

function fakeSession () {
	const stream = fakeWriter();
	const datagrams = fakeWriter();
	const never = new ReadableStream<Uint8Array>({ start: () => {} });
	const session = {
		datagrams: { readable: never, createWritable: () => ({ getWriter: datagrams.getWriter }), maxDatagramSize: 1150, outgoingMaxAge: null as number | null },
		closed: new Promise(() => {}),
		close: () => {}
	};
	const connection = igeNetWtConnection(session, { readable: never, writable: { getWriter: stream.getWriter } as never }, () => {});
	return { connection, stream, datagrams, session };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("WebTransport writers under backpressure", () => {
	it("drops datagrams past a small number waiting instead of queueing them without limit", async () => {
		const { connection, datagrams } = fakeSession();
		const packet = new Uint8Array(200);
		for (let i = 0; i < 100; i++) connection.send(packet, false);
		expect(datagrams.writes.length).toBe(IGE_WT_MAX_PENDING_DATAGRAMS);
		expect(connection.backlog().datagramsPending).toBe(IGE_WT_MAX_PENDING_DATAGRAMS);
		expect(connection.backlog().dropped).toBe(100 - IGE_WT_MAX_PENDING_DATAGRAMS);
		datagrams.release();
		await flush();
		expect(connection.backlog().datagramsPending).toBe(0);
		connection.send(packet, false);
		expect(datagrams.writes.length).toBe(IGE_WT_MAX_PENDING_DATAGRAMS + 1);
	});

	it("asks the browser to age out old datagrams", () => {
		const { session } = fakeSession();
		expect(session.datagrams.outgoingMaxAge).toBe(IGE_WT_DATAGRAM_MAX_AGE);
	});

	it("keeps every reliable message, however big the backlog", async () => {
		const { connection, stream } = fakeSession();
		const before = stream.writes.length;
		for (let i = 0; i < 50; i++) connection.send({ t: "blob", data: "x".repeat(10000) }, true);
		expect(stream.writes.length - before).toBe(50);
		expect(connection.backlog().streamMessages).toBe(50);
		expect(connection.backlog().streamBytes).toBeGreaterThan(IGE_WT_MAX_UNRELIABLE_BACKLOG);
		stream.release();
		await flush();
		expect(connection.backlog().streamBytes).toBe(0);
		expect(connection.backlog().dropped).toBe(0);
	});

	it("drops an unreliable packet too big for a datagram while the stream is backed up, but not JSON and not reliable ones", () => {
		const { connection, stream } = fakeSession();
		const big = new Uint8Array(3000);
		connection.send(big, false);
		const afterFirst = stream.writes.length;
		expect(connection.backlog().dropped).toBe(0);
		connection.send({ t: "blob", data: "x".repeat(IGE_WT_MAX_UNRELIABLE_BACKLOG) }, true);
		connection.send(big, false);
		expect(connection.backlog().dropped).toBe(1);
		connection.send(big, true);
		connection.send({ t: "ping", time: 1 }, false);
		expect(stream.writes.length).toBe(afterFirst + 3);
	});
});

describe("ping packets", () => {
	it("round trip the time and tick", () => {
		const ping = igeNetWritePing(1700000123456.5);
		expect(igeNetPacketType(ping)).toBe(IGE_NET_PACKET_PING);
		expect(igeNetReadPing(ping)).toBe(1700000123456.5);
		const pong = igeNetWritePong(ping, 4242);
		expect(igeNetPacketType(pong)).toBe(IGE_NET_PACKET_PONG);
		expect(igeNetReadPong(pong)).toEqual({ time: 1700000123456.5, tick: 4242 });
		expect(igeNetReadPing(new Uint8Array(3))).toBeUndefined();
		expect(igeNetReadPong(new Uint8Array(3))).toBeUndefined();
	});
});

const defs = { ship: { x: { type: "number", precision: 0.1 } } } as const;
const inputDefs = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } } as const;

describe("ping on a lossy transport", () => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	/** A client whose JSON messages (the stream) wait `streamDelay` ms before going, as behind a backlog. */
	async function setup (lossy: boolean, streamDelay: number, onlyStream = false) {
		const net = igeNetLoopback({ latency: 20, lossy });
		const host = new IgeNetReplicationHost<{ thrust: number }>(net.listener, {
			schemas: defs as never, inputSchema: inputDefs as never, tickRate: 30, sendRate: 30,
			join: (machine) => {
				machine.viewer.subscribe("w");
				host.replicator.create("ship", "s", { x: 0 }, { scope: "w" });
				return ["s"];
			},
			step: () => {}
		});
		const raw = net.connect();
		const slow: IgeNetConnection = {
			...raw,
			send: (message, reliable) => {
				if (message instanceof Uint8Array) {
					// A datagram ping isn't sent when the test models a transport without them
					if (onlyStream && igeNetPacketType(message) === IGE_NET_PACKET_PING) return;
					raw.send(message, reliable);
				} else if ((message as { t?: string }).t === "ping") setTimeout(() => raw.send(message, reliable), streamDelay);
				else raw.send(message, reliable);
			}
		};
		const client = new IgeNetReplicationClient<{ thrust: number }>(slow, { schemas: defs as never, inputSchema: inputDefs as never, pingInterval: 1000, now: () => Date.now() });
		const joined = client.join([{}]);
		for (let i = 0; i < 20; i++) {
			host.update(1000 / 30);
			await jest.advanceTimersByTimeAsync(1000 / 30);
		}
		await joined;
		return { host, client };
	}

	const run = async (host: IgeNetReplicationHost<{ thrust: number }>, client: IgeNetReplicationClient<{ thrust: number }>, seconds: number) => {
		for (let i = 0; i < seconds * 30; i++) {
			client.sendInput([{ thrust: 0 }]);
			host.update(1000 / 30);
			await jest.advanceTimersByTimeAsync(1000 / 30);
		}
	};

	it("measures the datagram path when the stream is backed up", async () => {
		const { host, client } = await setup(true, 900);
		await run(host, client, 5);
		expect(client.rtt).toBeGreaterThanOrEqual(35);
		expect(client.rtt).toBeLessThan(100);
		expect(client.streamRtt).toBeGreaterThan(900);
		client.destroy();
		host.destroy();
	});

	it("falls back to the stream's round trip when no datagram pong comes", async () => {
		const { host, client } = await setup(true, 100, true);
		await run(host, client, 6);
		expect(client.rtt).toBeGreaterThanOrEqual(135);
		expect(client.rtt).toBeLessThan(200);
		client.destroy();
		host.destroy();
	});

	it("uses the stream's round trip on a transport that isn't lossy (a WebSocket)", async () => {
		const { host, client } = await setup(false, 100);
		await run(host, client, 5);
		expect(client.rtt).toBeGreaterThanOrEqual(135);
		expect(client.streamRtt).toBe(client.rtt);
		client.destroy();
		host.destroy();
	});
});

describe("clock sync and round trip outliers", () => {
	function bare (now: { t: number }) {
		const client = new IgeNetReplicationClient(igeNetLoopback().connect(), { schemas: defs as never, pingInterval: 0, now: () => now.t });
		client.tickRate = 30;
		return client;
	}

	it("ignores a pong whose round trip is far above the recent smallest, and keeps the clock", () => {
		const now = { t: 10000 };
		const client = bare(now);
		// Steady 40 ms round trips: the authority's tick runs with the clock
		for (let i = 0; i < 8; i++) {
			now.t += 1000;
			client._onPong(now.t - 40, ((now.t - 20) * 30) / 1000, true);
		}
		const offset = client._offset!;
		// A pong that waited behind a backlog for a second: a stale tick and a huge round trip
		now.t += 1000;
		client._onPong(now.t - 1100, ((now.t - 1100 - 20) * 30) / 1000, false);
		expect(client._offset).toBe(offset);
		expect(client.streamRtt).toBe(1100);
	});

	it("uses the smallest recent round trip for the clock, not the latest", () => {
		const now = { t: 10000 };
		const client = bare(now);
		for (let i = 0; i < 8; i++) {
			now.t += 1000;
			client._onPong(now.t - 40, ((now.t - 20) * 30) / 1000, true);
		}
		now.t += 1000;
		client.rtt = 900;
		expect(client._clockRtt()).toBe(40);
		// A snapshot packet's clock sample uses it too: serverTick stays near the true tick
		const tick = Math.round(((now.t - 20) * 30) / 1000);
		client._syncClock(tick, client._clockRtt() / 2);
		expect(Math.abs(client.serverTick() - (now.t * 30) / 1000)).toBeLessThan(2);
	});

	it("takes a lasting change of round trip once the window has moved on", () => {
		const now = { t: 10000 };
		const client = bare(now);
		for (let i = 0; i < 8; i++) {
			now.t += 1000;
			client._onPong(now.t - 40, ((now.t - 20) * 30) / 1000, true);
		}
		for (let i = 0; i < 10; i++) {
			now.t += 1000;
			client._onPong(now.t - 300, ((now.t - 150) * 30) / 1000, true);
		}
		expect(client._clockRtt()).toBe(300);
	});
});
