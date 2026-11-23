import http from "http";
import type { AddressInfo } from "net";
import websocket from "websocket";
import { IgeNetReplicationHost, type IgeNetReplicationMachine } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { igeNetLoopback, type IgeNetListener } from "@/engine/network/transport/IgeNetTransport";
import { igeNetMergeListeners, igeNetRelayHost, igeNetRelayJoin, igeNetWebSocketConnect, type IgeWebSocketClass } from "@/engine/network/transport/igeNetWebSocket";
import { IgeNetWebSocketServer } from "@/engine/network/transport/IgeNetWebSocketServer";

/** Node's own WebSocket where the test environment has one, else the websocket package's browser-style class. */
const WebSocketClass = ((globalThis as { WebSocket?: IgeWebSocketClass }).WebSocket ?? websocket.w3cwebsocket) as unknown as IgeWebSocketClass;

type Input = { dx: number };

const schemas = { dot: { x: { type: "number" as const, precision: 0.01 }, name: { type: "string" as const } } };
const inputSchema = { dx: { type: "number" as const, precision: 0.01, min: -1, max: 1 } };
const clientOptions = { schemas, inputSchema, pingInterval: 0 };

/** A tiny game on any listener: each player a dot moved by its input. */
function game (listener: IgeNetListener) {
	const left: string[] = [];
	const host: IgeNetReplicationHost<Input> = new IgeNetReplicationHost<Input>(listener, {
		schemas,
		inputSchema,
		sendRate: 30,
		join: (machine, players) => {
			machine.viewer.subscribe("world");
			return players.map((p, i) => {
				const id = `${machine.id}.${i}`;
				host.replicator.create("dot", id, { x: 0, name: (p as { name: string }).name }, { scope: "world" });
				return id;
			});
		},
		leave: (machine: IgeNetReplicationMachine) => {
			left.push(machine.id);
			for (const id of machine.players) host.replicator.destroy(id);
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				const dot = host.replicator.get(id);
				if (dot) dot.write({ x: (dot.values.x as number) + input.dx * 100 * dt });
			});
		}
	});
	/** The dots in the game, by id. */
	const dots = () => Object.fromEntries([...host.replicator.objects()].map((o) => [o.id, o.values as { x: number; name: string }]));
	return { host, dots, left };
}

/** Run the host's clock for `ms`, letting sockets deliver in between. */
async function run (host: IgeNetReplicationHost<Input>, ms: number): Promise<void> {
	for (let t = 0; t < ms; t += 20) {
		host.update(20);
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

async function until (check: () => boolean, ms = 2000): Promise<void> {
	const end = Date.now() + ms;
	while (!check()) {
		if (Date.now() > end) throw new Error("Timed out");
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

describe("Replication over WebSockets", () => {
	let server: http.Server;
	let sockets: IgeNetWebSocketServer;
	let base = "";

	beforeEach(async () => {
		server = http.createServer();
		sockets = new IgeNetWebSocketServer(server);
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		base = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		sockets.close();
		await new Promise((resolve) => server.close(resolve));
	});

	it("joins an authority on the server (a dedicated server's game) and plays", async () => {
		const { host, dots: dotsOf } = game(sockets.listen("/sync"));
		const client = new IgeNetReplicationClient<Input>(await igeNetWebSocketConnect(`${base}/sync`, { WebSocket: WebSocketClass }), clientOptions);
		const joining = client.join([{ name: "Ann" }]);
		await run(host, 100);
		const { players: [id] } = await joining;
		expect(dotsOf()[id].name).toBe("Ann");
		for (let i = 0; i < 10; i++) {
			client.sendInput([{ dx: 1 }]);
			await run(host, 40);
		}
		await until(() => ((client.interpolated()[id]?.x as number) ?? 0) > 0);
		expect(dotsOf()[id].x).toBeGreaterThan(0);
		host.destroy();
	});

	it("relays a browser-hosted game: local and remote machines together, by join code", async () => {
		sockets.relay("/relay");
		const hosting = await igeNetRelayHost(`${base}/relay`, { WebSocket: WebSocketClass });
		expect(hosting.code).toMatch(/^[A-Z2-9]{5}$/);
		const local = igeNetLoopback();
		const { host, dots: dotsOf, left } = game(igeNetMergeListeners(local.listener, hosting.listener));

		const mine = new IgeNetReplicationClient<Input>(local.connect(), clientOptions);
		const theirs = new IgeNetReplicationClient<Input>(await igeNetRelayJoin(`${base}/relay`, hosting.code.toLowerCase(), { WebSocket: WebSocketClass }), clientOptions);
		const others = new IgeNetReplicationClient<Input>(await igeNetRelayJoin(`${base}/relay`, hosting.code, { WebSocket: WebSocketClass }), clientOptions);
		const joins = [mine.join([{ name: "Host" }]), theirs.join([{ name: "Bob" }, { name: "Cat" }]), others.join([{ name: "Dee" }])];
		await run(host, 150);
		await Promise.all(joins);
		expect(Object.values(dotsOf()).map((d) => d.name).sort()).toEqual(["Bob", "Cat", "Dee", "Host"]);

		// Everyone sees everyone
		await run(host, 100);
		await until(() => others.objects.size === 4);

		// A remote machine leaving is noticed by the host
		theirs.destroy();
		await run(host, 100);
		await until(() => left.length === 1);
		expect(Object.values(dotsOf()).map((d) => d.name).sort()).toEqual(["Dee", "Host"]);

		await expect(igeNetRelayJoin(`${base}/relay`, "ZZZZZ", { WebSocket: WebSocketClass })).rejects.toThrow("No game with that code");

		// The host leaving ends the game for the machines in it
		let gone = false;
		others.on("disconnected", () => { gone = true; });
		hosting.close();
		await until(() => gone);
		host.destroy();
	});

	it("carries binary messages through the relay both ways, byte for byte", async () => {
		sockets.relay("/relay");
		const hosting = await igeNetRelayHost(`${base}/relay`, { WebSocket: WebSocketClass });
		const heard: Record<string, Uint8Array[]> = {};
		const connections: Record<string, import("@/engine/network/transport/IgeNetTransport").IgeNetConnection> = {};
		hosting.listener.onConnection((connection) => {
			const key = `m${Object.keys(connections).length}`;
			connections[key] = connection;
			heard[key] = [];
			connection.onMessage((m) => { if (m instanceof Uint8Array) heard[key].push(m); });
		});
		const a = await igeNetRelayJoin(`${base}/relay`, hosting.code, { WebSocket: WebSocketClass });
		const b = await igeNetRelayJoin(`${base}/relay`, hosting.code, { WebSocket: WebSocketClass });
		const got: Record<string, unknown[]> = { a: [], b: [] };
		a.onMessage((m) => got.a.push(m));
		b.onMessage((m) => got.b.push(m));
		const all = Uint8Array.from({ length: 256 }, (_, i) => i);
		a.send(all);
		b.send(new Uint8Array([9, 8, 7]));
		a.send({ json: true });
		await until(() => heard.m0?.length === 1 && heard.m1?.length === 1);
		expect([...heard.m0[0]]).toEqual([...all]);
		expect([...heard.m1[0]]).toEqual([9, 8, 7]);
		// The host answers each machine separately, binary and JSON mixed
		connections.m0.send(new Uint8Array([1, 2, 3]));
		connections.m1.send(new Uint8Array([4, 5]));
		connections.m1.send({ ok: 1 });
		await until(() => got.a.length === 1 && got.b.length === 2);
		expect(got.a[0]).toBeInstanceOf(Uint8Array);
		expect([...(got.a[0] as Uint8Array)]).toEqual([1, 2, 3]);
		expect([...(got.b[0] as Uint8Array)]).toEqual([4, 5]);
		expect(got.b[1]).toEqual({ ok: 1 });
		hosting.close();
	});
});
