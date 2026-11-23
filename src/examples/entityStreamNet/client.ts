import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { igeNetWebSocketConnect } from "@/engine/network/transport/igeNetWebSocket";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { connectedPads, shipInput } from "../entityStream/controls";
import { ENTITY_CLASSES, ENTITY_SCHEMAS, flyShip, SCENE_ID, SHIP_INPUT_SCHEMA, type ShipInput, type ShipState } from "../entityStream/shared";
import { drawView } from "../entityStream/view";

/**
 * The same entities as the entityStream example, from a Node server over a WebSocket: one tab, one pilot.
 * ?server=<url> points it elsewhere (default ws://localhost:8693/sync), ?name=<callsign> names the pilot.
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const params = new URLSearchParams(location.search);
		const url = params.get("server") ?? `ws://${location.hostname || "localhost"}:8693/sync`;
		const name = params.get("name") ?? `pilot-${Math.random().toString(36).slice(2, 5)}`;
		const canvas = document.getElementById("view") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const status = document.getElementById("status") as HTMLElement;

		let client: IgeNetReplicationClient<ShipInput>;
		let me: string;
		try {
			client = new IgeNetReplicationClient<ShipInput>(await igeNetWebSocketConnect(url), {
				schemas: new IgeNetSchemaSet(ENTITY_SCHEMAS.defs, ENTITY_SCHEMAS.kinds),
				inputSchema: SHIP_INPUT_SCHEMA
			});
			me = (await client.join([{ callsign: name }])).players[0];
		} catch (error) {
			status.textContent = `Couldn't join: ${(error as Error).message} (is the server running at ${url}?)`;
			return;
		}
		client.on("disconnected", () => {
			status.textContent = "Disconnected (reload to join again).";
		});
		status.textContent = `${name} joined`;

		const scene = new IgeScene2d().id(SCENE_ID);
		const entities = new IgeNetEntityClient(client, ENTITY_CLASSES);
		entities.control<ShipState, ShipInput>(me, 0, flyShip);

		const pressed = new Set<string>();
		addEventListener("keydown", (event) => {
			pressed.add(event.code);
			if (event.code === "Space") event.preventDefault();
		});
		addEventListener("keyup", (event) => pressed.delete(event.code));
		addEventListener("blur", () => pressed.clear());

		const tickMs = 1000 / client.tickRate;
		let last = performance.now();
		let accumulator = 0;
		const frame = (now: number) => {
			const ms = Math.min(250, now - last);
			last = now;
			accumulator += ms;
			while (accumulator >= tickMs) {
				accumulator -= tickMs;
				client.sendInput([shipInput(pressed, connectedPads()[0])]);
			}
			entities.update(undefined, accumulator / tickMs);

			canvas.width = innerWidth * devicePixelRatio;
			canvas.height = innerHeight * devicePixelRatio;
			ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
			const all = entities.all();
			drawView(ctx, 0, 0, innerWidth, innerHeight, {
				title: name,
				lines: [`${all.length} entities in range`, `round trip ${Math.round(client.rtt)} ms`],
				entities: all,
				me: entities.entityOf(me)
			});
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
		void scene;
	}
}
