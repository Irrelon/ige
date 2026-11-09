import http from "http";
import type { AddressInfo } from "net";
import websocket from "websocket";
import { IgeNetSyncHost, type IgeNetMachine } from "@/engine/network/sync/IgeNetSyncHost";
import { IgeNetSyncClient } from "@/engine/network/sync/IgeNetSyncClient";
import { igeNetLoopback, type IgeNetListener } from "@/engine/network/sync/IgeNetTransport";
import { igeNetMergeListeners, igeNetRelayHost, igeNetRelayJoin, igeNetWebSocketConnect, type IgeWebSocketClass } from "@/engine/network/sync/igeNetWebSocket";
import { IgeNetWebSocketServer } from "@/engine/network/sync/IgeNetWebSocketServer";

/** Node's own WebSocket where the test environment has one, else the websocket package's browser-style class. */
const WebSocketClass = ((globalThis as { WebSocket?: IgeWebSocketClass }).WebSocket ?? websocket.w3cwebsocket) as unknown as IgeWebSocketClass;

type Input = { dx: number };

/** A tiny game on any listener: each player a dot moved by its input. */
function game (listener: IgeNetListener) {
	const dots: Record<string, { x: number; name: string }> = {};
	const left: string[] = [];
	const host = new IgeNetSyncHost<Input>(listener, {
		join: (machine, players) => players.map((p, i) => {
			const id = `${machine.id}.${i}`;
			dots[id] = { x: 0, name: (p as { name: string }).name };
			return id;
		}),
		leave: (machine: IgeNetMachine) => {
			left.push(machine.id);
			for (const id of machine.players) delete dots[id];
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				if (dots[id]) dots[id].x += input.dx * 100 * dt;
			});
		},
		snapshot: () => dots,
		snapshotRate: 30
	});
	return { host, dots, left };
}

/** Run the host's clock for `ms`, letting sockets deliver in between. */
async function run (host: IgeNetSyncHost<Input>, ms: number): Promise<void> {
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

describe("Sync over WebSockets", () => {
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
		const { host, dots } = game(sockets.listen("/sync"));
		const client = new IgeNetSyncClient<Input>(await igeNetWebSocketConnect(`${base}/sync`, { WebSocket: WebSocketClass }), { pingInterval: 0 });
		const joining = client.join([{ name: "Ann" }]);
		await run(host, 100);
		const { players: [id] } = await joining;
		expect(dots[id].name).toBe("Ann");
		for (let i = 0; i < 10; i++) {
			client.sendInput([{ dx: 1 }]);
			await run(host, 40);
		}
		await until(() => ((client.latest()?.entities[id]?.x as number) ?? 0) > 0);
		expect(dots[id].x).toBeGreaterThan(0);
		host.destroy();
	});

	it("relays a browser-hosted game: local and remote machines together, by join code", async () => {
		sockets.relay("/relay");
		const hosting = await igeNetRelayHost(`${base}/relay`, { WebSocket: WebSocketClass });
		expect(hosting.code).toMatch(/^[A-Z2-9]{5}$/);
		const local = igeNetLoopback();
		const { host, dots, left } = game(igeNetMergeListeners(local.listener, hosting.listener));

		const mine = new IgeNetSyncClient<Input>(local.connect(), { pingInterval: 0 });
		const theirs = new IgeNetSyncClient<Input>(await igeNetRelayJoin(`${base}/relay`, hosting.code.toLowerCase(), { WebSocket: WebSocketClass }), { pingInterval: 0 });
		const others = new IgeNetSyncClient<Input>(await igeNetRelayJoin(`${base}/relay`, hosting.code, { WebSocket: WebSocketClass }), { pingInterval: 0 });
		const joins = [mine.join([{ name: "Host" }]), theirs.join([{ name: "Bob" }, { name: "Cat" }]), others.join([{ name: "Dee" }])];
		await run(host, 150);
		await Promise.all(joins);
		expect(Object.values(dots).map((d) => d.name).sort()).toEqual(["Bob", "Cat", "Dee", "Host"]);

		// Everyone sees everyone
		await run(host, 100);
		await until(() => Object.keys(others.latest()?.entities ?? {}).length === 4);

		// A remote machine leaving is noticed by the host
		theirs.destroy();
		await run(host, 100);
		await until(() => left.length === 1);
		expect(Object.values(dots).map((d) => d.name).sort()).toEqual(["Dee", "Host"]);

		await expect(igeNetRelayJoin(`${base}/relay`, "ZZZZZ", { WebSocket: WebSocketClass })).rejects.toThrow("No game with that code");
		host.destroy();
		hosting.close();
	});
});
