/**
 * A headless check of the entity streaming server: joins, walks east for a second and reports what it sees.
 *
 *     node --experimental-transform-types --import ./src/examples/entityStreamNet/server/register.mjs src/examples/entityStreamNet/server/probe.ts [ws://localhost:8693/sync]
 */
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { ige } from "@/engine/instance";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { igeNetWebSocketConnect } from "@/engine/network/transport/igeNetWebSocket";
import { ENTITY_CLASSES, ENTITY_SCHEMAS, INPUT_SCHEMA, movePilot, SCENE_ID, Tumbler, type PilotInput, type PilotState } from "../../entityStream/shared";

Object.defineProperty(ige, "engine", {
	value: { renderer: () => undefined, _bounds2d: new IgePoint2d(0, 0), _currentTime: 0, addBehaviour: () => undefined, removeBehaviour: () => undefined },
	configurable: true,
	writable: true
});

async function main (): Promise<void> {
	const url = process.argv[2] ?? "ws://localhost:8693/sync";
	const client = new IgeNetReplicationClient<PilotInput>(await igeNetWebSocketConnect(url), {
		schemas: new IgeNetSchemaSet(ENTITY_SCHEMAS.defs, ENTITY_SCHEMAS.kinds),
		inputSchema: INPUT_SCHEMA
	});
	const me = (await client.join([{ callsign: "probe" }])).players[0];
	new IgeScene2d().id(SCENE_ID);
	const entities = new IgeNetEntityClient(client, ENTITY_CLASSES);
	entities.control<PilotState, PilotInput>(me, 0, movePilot);
	const started = Date.now();
	while (Date.now() - started < 1500) {
		client.sendInput([{ dx: 1, dz: 0 }]);
		entities.update();
		await new Promise((resolve) => setTimeout(resolve, 1000 / client.tickRate));
	}
	const mine = entities.entityOf(me)!;
	const all = entities.all();
	console.log(`me ${me} at x ${mine._translate.x.toFixed(1)}, ${all.length} entities, ${all.filter((e) => e instanceof Tumbler && e._quaternion).length} tumblers with a quaternion`);
	client.destroy();
}

main().then(() => process.exit(0), (error) => {
	console.error(error);
	process.exit(1);
});
