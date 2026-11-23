/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeNetWebTransportServer, igeNetNodeWebTransport } from "@/engine/network/transport/IgeNetWebTransportServer";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { igeNetConnect, igeNetWebTransport } from "@/engine/network/transport/igeNetWebTransport";
import type { IgeNetConnection } from "@/engine/network/transport/IgeNetTransport";

jest.setTimeout(20000);

const load = (name: string) => (globalThis as unknown as { igeNativeImport: (n: string) => Promise<any> }).igeNativeImport(name);

const until = async (check: () => boolean, ms = 5000) => {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > ms) throw new Error("timed out");
		await new Promise((r) => setTimeout(r, 10));
	}
};

describe("WebTransport transport (library client against the server)", () => {
	let server: IgeNetWebTransportServer;
	let port: number;
	let WebTransport: any;
	const accepted: IgeNetConnection[] = [];

	beforeAll(async () => {
		WebTransport = await igeNetNodeWebTransport(load);
		server = new IgeNetWebTransportServer({ port: 0, host: "127.0.0.1", load });
		server.onConnection((c) => accepted.push(c));
		await server.start();
		port = server.address()!.port;
	});
	afterAll(() => server?.close());

	const connect = () => igeNetWebTransport(`https://127.0.0.1:${port}/sync`, { certHash: server.certHash, WebTransport });

	it("connects with a self-signed certificate pinned by hash and is marked lossy", async () => {
		const before = accepted.length;
		const client = await connect();
		await until(() => accepted.length > before);
		expect(client.lossy).toBe(true);
		expect(client.transport).toBe("webtransport");
		expect(accepted[before].lossy).toBe(true);
		expect(server.certExpires!.getTime() - Date.now()).toBeLessThan(14 * 86_400_000);
		client.close();
	});

	it("delivers reliable messages in order, JSON and binary, both ways", async () => {
		const before = accepted.length;
		const client = await connect();
		await until(() => accepted.length > before);
		const host = accepted[before];
		const atHost: unknown[] = [];
		const atClient: unknown[] = [];
		host.onMessage((m) => atHost.push(m));
		client.onMessage((m) => atClient.push(m));
		for (let i = 0; i < 20; i++) client.send({ t: "n", i });
		client.send(Uint8Array.from([1, 2, 3]), true);
		for (let i = 0; i < 20; i++) host.send({ t: "h", i });
		host.send(new Uint8Array(100000).fill(7), true);
		await until(() => atHost.length === 21 && atClient.length === 21);
		expect(atHost.slice(0, 20)).toEqual(Array.from({ length: 20 }, (_, i) => ({ t: "n", i })));
		expect(Array.from(atHost[20] as Uint8Array)).toEqual([1, 2, 3]);
		expect((atClient[20] as Uint8Array).length).toBe(100000);
		client.close();
	});

	it("sends unreliable binary messages as datagrams, and falls back to the stream for big ones", async () => {
		const before = accepted.length;
		const client = await connect();
		await until(() => accepted.length > before);
		const host = accepted[before];
		expect(host.maxDatagramSize?.()).toBeGreaterThan(500);
		const atHost: Uint8Array[] = [];
		const atClient: Uint8Array[] = [];
		host.onMessage((m) => atHost.push(m as Uint8Array));
		client.onMessage((m) => atClient.push(m as Uint8Array));
		for (let i = 0; i < 10; i++) {
			client.send(Uint8Array.from([i, 9, 9]), false);
			host.send(Uint8Array.from([i, 8]), false);
		}
		client.send(new Uint8Array(5000).fill(1), false);
		await until(() => atHost.length >= 5 && atClient.length >= 5);
		// Datagrams on a loopback path normally all arrive; at least most must
		expect(atHost.some((m) => m.length === 5000)).toBe(true);
		expect(atHost.filter((m) => m.length === 3).length).toBeGreaterThanOrEqual(5);
		expect(atClient.every((m) => m.length === 2)).toBe(true);
		client.close();
	});

	it("tells each end when the other closes", async () => {
		const before = accepted.length;
		const client = await connect();
		await until(() => accepted.length > before);
		const host = accepted[before];
		let hostClosed = false;
		let clientClosed = false;
		host.onClose(() => { hostClosed = true; });
		client.onClose(() => { clientClosed = true; });
		client.close();
		await until(() => hostClosed && clientClosed);
		const second = await connect();
		await until(() => accepted.length > before + 1);
		let secondClosed = false;
		second.onClose(() => { secondClosed = true; });
		accepted[before + 1].close();
		await until(() => secondClosed);
	});

	it("igeNetConnect picks WebTransport when it works", async () => {
		const before = accepted.length;
		const { connection, transport } = await igeNetConnect({ webTransport: { url: `https://127.0.0.1:${port}/sync`, certHash: server.certHash }, webSocket: "ws://127.0.0.1:1/unused", WebTransport, isSecureContext: true });
		expect(transport).toBe("webtransport");
		await until(() => accepted.length > before);
		connection.close();
	});

	it("carries a replication game: join over the stream, packets and inputs as datagrams, lossy mode on by itself", async () => {
		const defs = { ship: { x: { type: "number", precision: 0.1 } } } as const;
		const inputDefs = { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } } as const;
		const own = new IgeNetWebTransportServer({ port: 0, host: "127.0.0.1", load });
		await own.start();
		const host = new IgeNetReplicationHost<{ thrust: number }>(own, {
			schemas: defs as never,
			inputSchema: inputDefs as never,
			join: (machine) => {
				machine.viewer.subscribe("w");
				host.replicator.create("ship", "s", { x: 0 }, { scope: "w" });
				return ["s"];
			},
			step: (_dt, _tick, inputs) => {
				const ship = host.replicator.get("s")!;
				ship.write({ x: (ship.values.x as number) + (inputs.get("s")?.thrust ?? 0) });
			}
		});
		host.start();
		const { connection } = await igeNetConnect({ webTransport: { url: `https://127.0.0.1:${own.address()!.port}/sync`, certHash: own.certHash }, webSocket: "ws://127.0.0.1:1/unused", WebTransport, isSecureContext: true });
		const client = new IgeNetReplicationClient<{ thrust: number }>(connection, { schemas: defs as never, inputSchema: inputDefs as never, pingInterval: 0 });
		await client.join([{}]);
		expect(client.transport).toBe("webtransport");
		const timer = setInterval(() => client.sendInput([{ thrust: 1 }]), 1000 / 30);
		await until(() => ((client.latest("s")?.x as number) ?? 0) > 5);
		clearInterval(timer);
		expect([...host._machines.values()][0].machine.viewer.lossy).toBe(true);
		client.destroy();
		host.destroy();
		own.close();
	});
});
