import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { type IgeNetConnection, type IgeNetListener, igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";
import { igeNetConnect } from "@/engine/network/transport/igeNetWebTransport";

/** A WebSocket that opens at once. */
class FakeSocket {
	static opened: string[] = [];
	readyState = 1;
	onopen?: () => void;
	onerror?: () => void;
	onclose?: () => void;
	onmessage?: (event: { data: unknown }) => void;
	binaryType = "";
	constructor (public url: string) {
		FakeSocket.opened.push(url);
		queueMicrotask(() => this.onopen?.());
	}
	send () {}
	close () {}
}

/** A WebTransport whose handshake does what the test says. */
function fakeWebTransport (behaviour: "never" | "fails") {
	const made: { url: string; closed: boolean; options?: any }[] = [];
	class Fake {
		ready: Promise<void>;
		closed = new Promise<void>(() => {});
		datagrams = { readable: new ReadableStream(), writable: new WritableStream(), maxDatagramSize: 1000 };
		record: { url: string; closed: boolean; options?: any };
		constructor (url: string, options?: any) {
			this.record = { url, closed: false, options };
			made.push(this.record);
			this.ready = behaviour === "never" ? new Promise(() => {}) : Promise.reject(new Error("QUIC handshake failed"));
			this.ready.catch(() => {});
		}
		close () {
			this.record.closed = true;
		}
	}
	return { Class: Fake as any, made };
}

describe("igeNetConnect: WebTransport with the WebSocket as the fallback", () => {
	beforeEach(() => { FakeSocket.opened = []; });
	const base = { webSocket: "ws://zone/sync", WebSocket: FakeSocket as any };

	it("uses the WebSocket when the browser has no WebTransport", async () => {
		const result = await igeNetConnect({ ...base, webTransport: { url: "https://zone/sync" }, WebTransport: undefined, isSecureContext: true });
		expect(result.transport).toBe("websocket");
		expect(result.fallbackReason).toMatch(/no WebTransport/);
		expect(FakeSocket.opened).toEqual(["ws://zone/sync"]);
	});

	it("blames the page, not the browser, when WebTransport is hidden because the page isn't a secure context", async () => {
		const result = await igeNetConnect({ ...base, webTransport: { url: "https://zone/sync" }, WebTransport: undefined, isSecureContext: false });
		expect(result.transport).toBe("websocket");
		expect(result.fallbackReason).toMatch(/secure context/);
	});

	it("uses the WebSocket when the page isn't a secure context, without trying WebTransport", async () => {
		const wt = fakeWebTransport("never");
		const result = await igeNetConnect({ ...base, webTransport: { url: "https://zone/sync" }, WebTransport: wt.Class, isSecureContext: false });
		expect(result.transport).toBe("websocket");
		expect(result.fallbackReason).toMatch(/secure context/);
		expect(wt.made).toHaveLength(0);
	});

	it("uses the WebSocket when the server gives no WebTransport address", async () => {
		const wt = fakeWebTransport("never");
		const result = await igeNetConnect({ ...base, WebTransport: wt.Class, isSecureContext: true });
		expect(result.transport).toBe("websocket");
		expect(wt.made).toHaveLength(0);
	});

	it("falls back when the handshake doesn't finish in time, and drops the attempt", async () => {
		const wt = fakeWebTransport("never");
		const started = Date.now();
		const result = await igeNetConnect({ ...base, webTransport: { url: "https://zone/sync", certHash: "abcd" }, WebTransport: wt.Class, isSecureContext: true, timeout: 60 });
		expect(Date.now() - started).toBeLessThan(1000);
		expect(result.transport).toBe("websocket");
		expect(result.fallbackReason).toMatch(/Timed out/);
		expect(wt.made).toHaveLength(1);
		expect(wt.made[0].closed).toBe(true);
		// The certificate hash was handed to the browser as serverCertificateHashes
		expect(wt.made[0].options.serverCertificateHashes[0]).toMatchObject({ algorithm: "sha-256" });
		expect(Array.from(wt.made[0].options.serverCertificateHashes[0].value)).toEqual([0xab, 0xcd]);
	});

	it("falls back when the handshake fails (UDP blocked, certificate refused)", async () => {
		const wt = fakeWebTransport("fails");
		const result = await igeNetConnect({ ...base, webTransport: { url: "https://zone/sync" }, WebTransport: wt.Class, isSecureContext: true });
		expect(result.transport).toBe("websocket");
		expect(result.fallbackReason).toMatch(/handshake failed/);
	});
});

describe("per-connection lossy mode", () => {
	const defs: Record<string, Record<string, IgeNetFieldDef>> = {
		ship: { x: { type: "number", precision: 0.1 }, name: { type: "string" } },
		rock: { x: { type: "number", precision: 0.1 }, label: { type: "string" } }
	};
	const inputDefs: Record<string, IgeNetFieldDef> = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } };

	/** A loopback whose machines' connections say what the test wants of them, and which records the packets the host sends. */
	function world (connection: { lossy?: boolean; maxDatagramSize?: number }, hostLossy?: boolean) {
		const net = igeNetLoopback({ copy: false });
		const sent: { size: number; reliable: boolean }[] = [];
		const listener: IgeNetListener = {
			onConnection: (fn) => net.listener.onConnection((c) => {
				const send = c.send.bind(c);
				const wrapped: IgeNetConnection = {
					...c,
					lossy: connection.lossy,
					maxDatagramSize: connection.maxDatagramSize === undefined ? undefined : () => connection.maxDatagramSize,
					send: (m, reliable) => {
						if (m instanceof Uint8Array) sent.push({ size: m.length, reliable: reliable !== false });
						send(m, reliable);
					}
				};
				fn(wrapped);
			}),
			close: () => net.listener.close()
		};
		const host = new IgeNetReplicationHost<{ thrust: number }>(listener, {
			schemas: defs,
			inputSchema: inputDefs,
			lossy: hostLossy,
			join: (machine) => {
				machine.viewer.subscribe("w");
				for (let i = 0; i < 80; i++) host.replicator.create("rock", `r${i}`, { x: i, label: `a rock named ${i} out here` }, { scope: "w" });
				host.replicator.create("ship", "s", { x: 1, name: "Ann" }, { scope: "w" });
				return ["s"];
			},
			step: () => {}
		});
		const client = new IgeNetReplicationClient<{ thrust: number }>(net.connect(), { schemas: defs, inputSchema: inputDefs, pingInterval: 0 });
		return { host, client, sent };
	}
	const settle = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 5)); };
	const viewerOf = (host: IgeNetReplicationHost<{ thrust: number }>) => [...host._machines.values()][0].machine.viewer;

	it("runs a connection that says it's lossy in lossy mode, with datagram-sized packets sent unreliably", async () => {
		const { host, client, sent } = world({ lossy: true, maxDatagramSize: 700 });
		await client.join([{}]);
		for (let i = 0; i < 4; i++) {
			client.sendInput([{ thrust: 1 }]);
			host.update(1000 / 30);
			await settle();
		}
		const viewer = viewerOf(host);
		expect(viewer.lossy).toBe(true);
		expect(viewer.maxPacketBytes).toBe(700);
		expect(sent.length).toBeGreaterThan(2);
		expect(sent.every((p) => !p.reliable && p.size <= 700)).toBe(true);
		expect(client.objects.size).toBe(81);
		host.destroy();
		client.destroy();
	});

	it("uses a size that fits any path when the connection doesn't know its datagram size", async () => {
		const { host, client } = world({ lossy: true });
		await client.join([{}]);
		expect(viewerOf(host).maxPacketBytes).toBe(1150);
		host.destroy();
		client.destroy();
	});

	it("keeps a connection that isn't lossy (a WebSocket) reliable, with no size limit", async () => {
		const { host, client, sent } = world({});
		await client.join([{}]);
		host.update(1000 / 30);
		await settle();
		expect(viewerOf(host).lossy).toBe(false);
		expect(viewerOf(host).maxPacketBytes ?? 0).toBe(0);
		expect(sent.every((p) => p.reliable)).toBe(true);
		host.destroy();
		client.destroy();
	});

	it("lets the host's lossy option override what the connection says", async () => {
		const forced = world({}, true);
		await forced.client.join([{}]);
		expect(viewerOf(forced.host).lossy).toBe(true);
		const off = world({ lossy: true }, false);
		await off.client.join([{}]);
		expect(viewerOf(off.host).lossy).toBe(false);
		for (const w of [forced, off]) {
			w.host.destroy();
			w.client.destroy();
		}
	});

	it("sends each input tick unreliably with the recent frames repeated, so one lost datagram loses no input", async () => {
		const net = igeNetLoopback({ copy: false });
		const client = new IgeNetReplicationClient<{ thrust: number }>(net.connect(), { schemas: defs, inputSchema: inputDefs, pingInterval: 0 });
		const sends: { reliable?: boolean; bytes: Uint8Array }[] = [];
		const connection = (client as any)._connection as IgeNetConnection;
		const original = connection.send.bind(connection);
		connection.send = (m, reliable) => {
			if (m instanceof Uint8Array) sends.push({ reliable, bytes: m.slice() });
			original(m, reliable);
		};
		client.players = ["p"];
		const seqs: number[] = [];
		for (let i = 0; i < 5; i++) seqs.push(client.sendInput([{ thrust: (i + 1) / 10 }]));
		expect(sends.every((s) => s.reliable === false)).toBe(true);
		// Read the last packet back as the host would: it holds the newest three frames
		const { IgeNetBitReader } = await import("@/engine/network/replication/IgeNetBits");
		const { igeNetReadInputPacket } = await import("@/engine/network/replication/igeNetReplicationProtocol");
		const packet = igeNetReadInputPacket(new IgeNetBitReader(sends[4].bytes), client.inputSchema, 1);
		expect(packet.frames.map((f) => f.seq)).toEqual(seqs.slice(-3));
		client.destroy();
	});
});
