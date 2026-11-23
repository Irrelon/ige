import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { igeNetLoopback, type IgeNetConnection, type IgeNetListener } from "@/engine/network/transport/IgeNetTransport";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { createEntityGame, ENTITY_CLASSES, INPUT_SCHEMA, movePilot, SCENE_ID, type PilotInput, type PilotState } from "./shared";
import { drawView } from "./view";

/** The simulated link: sliders change it while it runs. Latency and jitter are one way, in ms. */
interface Link {
	latency: number;
	jitter: number;
	loss: number;
}

/**
 * Wraps one end of a loopback connection so what it sends is delayed, jittered and (unreliable messages
 * only) lost by the current slider values. The host sends lossy, so its updates can drop and the replication
 * layer has to carry on without them.
 */
function lagged (connection: IgeNetConnection, link: Link): IgeNetConnection {
	let lastReliable = 0;
	return {
		send: (message, reliable = true) => {
			if (!reliable && Math.random() < link.loss) return;
			const delay = link.latency + Math.random() * link.jitter;
			if (delay <= 0) {
				connection.send(message, reliable);
				return;
			}
			let at = Date.now() + delay;
			if (reliable) at = lastReliable = Math.max(at, lastReliable);
			setTimeout(() => connection.send(message, reliable), Math.max(0, at - Date.now()));
		},
		onMessage: (listener) => connection.onMessage(listener),
		onClose: (listener) => connection.onClose(listener),
		close: () => connection.close()
	};
}

interface Player {
	name: string;
	client: IgeNetReplicationClient<PilotInput>;
	entities: IgeNetEntityClient;
	scene: IgeScene2d;
	me: string;
	keys: { left: string[]; right: string[]; up: string[]; down: string[] };
	tickAccumulator: number;
	bytesAt: number;
	rate: number;
}

/**
 * Entity streaming (guides/entity-streaming.md): the authority and two clients in one page, connected by
 * igeNetLoopback through a link with latency, jitter and loss sliders. Each half of the window is one client's
 * view of its own copy of the world: it steers its pilot (predicted, so it answers at once whatever the
 * latency), sees only what is within its range (the dashed circle: other things are not sent, and come
 * and go as they cross it), and sees everyone else interpolated a little in the past. The tumbling blocks
 * are replicated as packed quaternions.
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const canvas = document.getElementById("view") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const link: Link = { latency: 60, jitter: 20, loss: 0.05 };
		for (const name of ["latency", "jitter", "loss"] as const) {
			const input = document.getElementById(name) as HTMLInputElement;
			const label = document.getElementById(`${name}Value`) as HTMLElement;
			const apply = () => {
				const value = Number(input.value);
				link[name] = name === "loss" ? value / 100 : value;
				label.textContent = name === "loss" ? `${value}%` : `${value} ms`;
			};
			input.addEventListener("input", apply);
			apply();
		}

		// The authority, on a loopback whose host side delays what it sends
		const net = igeNetLoopback();
		const listener: IgeNetListener = {
			onConnection: (fn) => net.listener.onConnection((connection) => fn(lagged(connection, link))),
			close: () => net.listener.close()
		};
		const game = createEntityGame(listener, { lossy: true });
		// The host isn't started: the frame loop below drives it with update(ms)

		const players: Player[] = [];
		const join = async (name: string, keys: Player["keys"]) => {
			const client = new IgeNetReplicationClient<PilotInput>(lagged(net.connect(), link), {
				schemas: game.replicator.schemas,
				inputSchema: INPUT_SCHEMA
			});
			const prefix = `${name}:`;
			const scene = new IgeScene2d().id(`${prefix}${SCENE_ID}`);
			// Entity ids are global in a page: this client's copies get a prefix of its own
			const entities = new IgeNetEntityClient(client, ENTITY_CLASSES, { idOf: (id) => `${prefix}${id}` });
			const welcome = await client.join([{ callsign: name }]);
			const me = welcome.players[0];
			entities.control<PilotState, PilotInput>(me, 0, movePilot);
			players.push({ name, client, entities, scene, me, keys, tickAccumulator: 0, bytesAt: 0, rate: 0 });
		};
		await join("A", { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"] });
		await join("B", { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"] });

		const pressed = new Set<string>();
		let ghosts = false;
		addEventListener("keydown", (event) => {
			pressed.add(event.code);
			if (event.code === "KeyG") ghosts = !ghosts;
			if (event.code.startsWith("Arrow")) event.preventDefault();
		});
		addEventListener("keyup", (event) => pressed.delete(event.code));
		addEventListener("blur", () => pressed.clear());
		const held = (codes: string[]) => (codes.some((code) => pressed.has(code)) ? 1 : 0);

		let last = performance.now();
		let rateAt = last;
		const frame = (now: number) => {
			const ms = Math.min(250, now - last);
			last = now;
			game.host.update(ms);

			const machines = game.host.machines();
			const sample = now - rateAt >= 1000;
			for (const player of players) {
				// Input at the tick rate; drawing every frame, a fraction of the way into the next tick
				const tickMs = 1000 / player.client.tickRate;
				player.tickAccumulator += ms;
				while (player.tickAccumulator >= tickMs) {
					player.tickAccumulator -= tickMs;
					const k = player.keys;
					player.client.sendInput([{ dx: held(k.right) - held(k.left), dz: held(k.down) - held(k.up) }]);
				}
				player.entities.update(undefined, player.tickAccumulator / tickMs);
				if (sample) {
					const machine = machines.find((m) => m.players.includes(player.me));
					const bytes = machine?.viewer.stats.bytes ?? 0;
					player.rate = (bytes - player.bytesAt) / ((now - rateAt) / 1000);
					player.bytesAt = bytes;
				}
			}
			if (sample) rateAt = now;
			draw(ghosts);
			requestAnimationFrame(frame);
		};

		const draw = (showGhosts: boolean) => {
			canvas.width = innerWidth * devicePixelRatio;
			canvas.height = innerHeight * devicePixelRatio;
			ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
			const width = innerWidth, height = innerHeight;
			ctx.fillStyle = "#0b0e14";
			ctx.fillRect(0, 0, width, height);
			const half = Math.floor(width / 2);
			const truth: IgeEntity[] = showGhosts ? [...game.tumblers, ...game.pilots.values()] : [];
			players.forEach((player, i) => {
				const mine = player.entities.entityOf(player.me);
				const all = player.entities.all();
				drawView(ctx, i * half + (i ? 2 : 0), 0, half - 2, height, {
					title: `Client ${player.name} (${i ? "arrow keys" : "WASD"})`,
					lines: [
						`${all.length} of ${truth.length || game.tumblers.length + game.pilots.size} entities in range`,
						`round trip ${Math.round(player.client.rtt)} ms, ${(player.rate / 1024).toFixed(1)} KB/s down`,
						`own pilot predicted; the rest drawn ${player.client._options.interpolationDelay ?? 100} ms behind`
					],
					entities: all,
					me: mine,
					ghosts: truth
				});
			});
			ctx.fillStyle = "#3a4a66";
			ctx.fillRect(half - 2, 0, 4, height);
		};
		requestAnimationFrame(frame);
	}
}
