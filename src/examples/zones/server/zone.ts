/**
 * One zone server of the zones example (the directory starts these; see
 * directory.ts). It's an IgeNetReplicationHost on a WebSocket, with an IgeZoneHost
 * for its side of zones: registering, heartbeats, checking the tickets
 * players arrive with, and handing players on when they fly off an edge.
 */
import http from "node:http";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetWebSocketServer } from "@/engine/network/transport/IgeNetWebSocketServer";
import { IgeZoneHost } from "@/engine/network/zones/IgeZoneHost";
import type { IgeZoneTicket } from "@/engine/network/zones/igeZoneTicket";
import {
	moveDot,
	NEIGHBOURS,
	ZONE_SCOPE,
	ZONE_HEIGHT,
	ZONE_WIDTH,
	ZONES_INPUT_SCHEMA,
	ZONES_SCHEMAS,
	type ZonesArrival,
	type ZonesDot,
	type ZonesInfo,
	type ZonesInput,
	type ZonesTransferEvent
} from "../shared";

const zone = IgeZoneHost.fromEnv({ players: () => host.replicator.size });
const neighbours = NEIGHBOURS[zone.zone] ?? {};

const server = http.createServer();
const sockets = new IgeNetWebSocketServer(server);
const host = new IgeNetReplicationHost<ZonesInput>(sockets.listen("/sync"), {
	schemas: ZONES_SCHEMAS,
	inputSchema: ZONES_INPUT_SCHEMA,
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
		machine.viewer.subscribe(ZONE_SCOPE);
		const dot = host.replicator.create("dot", player, {
			x: Math.max(0, Math.min(ZONE_WIDTH, arrival.x ?? ZONE_WIDTH / 2)),
			y: Math.max(0, Math.min(ZONE_HEIGHT, arrival.y ?? ZONE_HEIGHT / 2)),
			name: arrival.name ?? player,
			leaving: false
		}, { scope: ZONE_SCOPE });
		console.log(`${player} arrived at x ${Math.round(dot.values.x as number)}`);
		return [player];
	},
	leave: (machine) => {
		for (const id of machine.players) {
			if (host.replicator.get(id)) host.replicator.destroy(id);
			console.log(`${id} left`);
		}
	},
	step: (dt, tick, inputs) => {
		inputs.forEach((input, id) => {
			const obj = host.replicator.get(id);
			if (!obj || obj.values.leaving) return;
			const moved = moveDot(obj.values as ZonesDot, input, dt);
			const next = moved.x > ZONE_WIDTH ? neighbours.east : moved.x < 0 ? neighbours.west : undefined;
			if (next) {
				handOn(id, moved, next);
				return;
			}
			// No zone that way: the edge of the map
			obj.write({ x: Math.max(0, Math.min(ZONE_WIDTH, moved.x)), y: moved.y });
		});
	},
	info: (): ZonesInfo => ({ zone: zone.zone, width: ZONE_WIDTH, height: ZONE_HEIGHT, ...neighbours })
});

/** A dot flew off an edge: the next zone (started if need be) and a ticket in go to its machine. */
function handOn (id: string, dot: ZonesDot, next: string): void {
	const east = dot.x > ZONE_WIDTH;
	host.replicator.get(id)?.write({ x: east ? ZONE_WIDTH : 0, y: dot.y, leaving: true });
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
		host.replicator.get(id)?.write({ x: east ? ZONE_WIDTH - 20 : 20, leaving: false });
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
