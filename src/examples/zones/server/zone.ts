/**
 * One zone server of the zones example (the directory starts these; see
 * directory.ts). It's an IgeNetSyncHost on a WebSocket, with an IgeZoneHost
 * for its side of zones: registering, heartbeats, checking the tickets
 * players arrive with, and handing players on when they fly off an edge.
 */
import http from "node:http";
import { IgeNetSyncHost } from "@/engine/network/sync/IgeNetSyncHost";
import { IgeNetWebSocketServer } from "@/engine/network/sync/IgeNetWebSocketServer";
import { IgeZoneHost } from "@/engine/network/zones/IgeZoneHost";
import type { IgeZoneTicket } from "@/engine/network/zones/igeZoneTicket";
import {
	moveDot,
	NEIGHBOURS,
	ZONE_HEIGHT,
	ZONE_WIDTH,
	type ZonesArrival,
	type ZonesDot,
	type ZonesInfo,
	type ZonesInput,
	type ZonesTransferEvent
} from "../shared";

const zone = IgeZoneHost.fromEnv({ players: () => Object.keys(dots).length });
const neighbours = NEIGHBOURS[zone.zone] ?? {};
const dots: Record<string, ZonesDot> = {};

const server = http.createServer();
const sockets = new IgeNetWebSocketServer(server);
const host = new IgeNetSyncHost<ZonesInput>(sockets.listen("/sync"), {
	acceptTicket: (token) => zone.acceptTicket(token),
	// Everyone comes in on a ticket: from the directory (entering the game,
	// or reconnecting) or from the zone next door
	join: (machine, players, ticket) => {
		if (!ticket) return "Enter through the directory (POST /enter).";
		const { player, data } = ticket as IgeZoneTicket;
		const arrival = (data ?? {}) as Partial<ZonesArrival>;
		// Reconnecting while their old connection lingers: it's replaced
		const old = host.machines().find((m) => m.players.includes(player));
		if (old) host.disconnect(old);
		dots[player] = {
			x: Math.max(0, Math.min(ZONE_WIDTH, arrival.x ?? ZONE_WIDTH / 2)),
			y: Math.max(0, Math.min(ZONE_HEIGHT, arrival.y ?? ZONE_HEIGHT / 2)),
			name: arrival.name ?? player,
			leaving: 0
		};
		console.log(`${player} arrived at x ${Math.round(dots[player].x)}`);
		return [player];
	},
	leave: (machine) => {
		for (const id of machine.players) {
			delete dots[id];
			console.log(`${id} left`);
		}
	},
	step: (dt, tick, inputs) => {
		inputs.forEach((input, id) => {
			const dot = dots[id];
			if (!dot || dot.leaving) return;
			const moved = moveDot(dot, input, dt);
			const next = moved.x > ZONE_WIDTH ? neighbours.east : moved.x < 0 ? neighbours.west : undefined;
			if (next) {
				handOn(id, moved, next);
				return;
			}
			// No zone that way: the edge of the map
			moved.x = Math.max(0, Math.min(ZONE_WIDTH, moved.x));
			dots[id] = moved;
		});
	},
	snapshot: () => dots,
	info: (): ZonesInfo => ({ zone: zone.zone, width: ZONE_WIDTH, height: ZONE_HEIGHT, ...neighbours })
});

/** A dot flew off an edge: the next zone (started if need be) and a ticket in go to its machine. */
function handOn (id: string, dot: ZonesDot, next: string): void {
	const east = dot.x > ZONE_WIDTH;
	dots[id] = { ...dot, x: east ? ZONE_WIDTH : 0, leaving: 1 };
	const arrival: ZonesArrival = { x: east ? dot.x - ZONE_WIDTH : ZONE_WIDTH + dot.x, y: dot.y, name: dot.name };
	console.log(`handing ${id} on to ${next}`);
	zone.handoff(id, next, arrival).then(({ url, ticket }) => {
		const machine = host.machines().find((m) => m.players.includes(id));
		if (!machine) return;
		const event: ZonesTransferEvent = { t: "zone", zone: next, url, ticket };
		host.event(event, machine);
	}).catch((error: Error) => {
		// The next zone wouldn't start: back off the edge and carry on here
		console.log(`couldn't hand ${id} on to ${next}: ${error.message}`);
		const here = dots[id];
		if (here) dots[id] = { ...here, x: east ? ZONE_WIDTH - 20 : 20, leaving: 0 };
	});
}

zone.on("heartbeatFailed", (error: Error) => console.log(`heartbeat failed: ${error.message}`));

server.listen(Number(process.env.PORT), "127.0.0.1", async () => {
	host.start();
	await zone.start();
	console.log(`zone ${zone.zone} up at ${process.env.ZONE_URL}`);
});

function shutdown (): void {
	zone.stop();
	host.destroy();
	server.close();
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
