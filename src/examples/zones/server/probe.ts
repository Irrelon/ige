/**
 * A headless player for the zones example: enters through the directory,
 * flies east into the other zone, back west again, and exits 0 once it has
 * crossed both ways (1 if it hasn't within 30 seconds).
 *
 *     node --experimental-transform-types --import ./src/examples/zones/server/register.mjs src/examples/zones/server/probe.ts [directory url]
 */
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import type { IgeNetWelcome } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetWebSocketConnect } from "@/engine/network/transport/igeNetWebSocket";
import { ZONES_INPUT_SCHEMA, ZONES_SCHEMAS, type ZonesInfo, type ZonesInput, type ZonesTransferEvent } from "../shared";

const directoryUrl = process.argv[2] ?? "http://127.0.0.1:8810";
const name = `probe-${process.pid}`;

async function main (): Promise<void> {
	const response = await fetch(`${directoryUrl}/enter`, { method: "POST", body: JSON.stringify({ player: name }) });
	const entry = await response.json() as { zone: string; url: string; ticket: string; error?: string };
	if (!response.ok) throw new Error(entry.error ?? `The directory said ${response.status}`);
	console.log(`${name} enters at ${entry.zone} (${entry.url})`);

	const client = new IgeNetReplicationClient<ZonesInput>(await igeNetWebSocketConnect(entry.url), { schemas: ZONES_SCHEMAS, inputSchema: ZONES_INPUT_SCHEMA });
	const visited = [entry.zone];
	let dx = 1;

	client.on("event", (data: ZonesTransferEvent) => {
		if (data?.t !== "zone") return;
		console.log(`handed on to ${data.zone}`);
		client.transfer({ url: data.url, ticket: data.ticket }).catch((error: Error) => {
			console.log(`transfer failed: ${error.message}`);
			process.exit(1);
		});
	});

	client.on("transferred", (welcome: IgeNetWelcome) => {
		const info = welcome.info as ZonesInfo;
		visited.push(info.zone);
		console.log(`now in ${info.zone} as ${welcome.players[0]}`);
		if (visited.length === 2) dx = -1;
		if (visited.length === 3) {
			console.log(`crossed both ways: ${visited.join(" -> ")}`);
			client.leave();
			client.destroy();
			process.exit(0);
		}
	});

	await client.join([], entry.ticket);

	setInterval(() => {
		if (!client.transferring) client.sendInput([{ dx, dy: 0 }]);
	}, 1000 / 30);

	setTimeout(() => {
		console.log(`didn't cross both ways in time (visited ${visited.join(" -> ")})`);
		process.exit(1);
	}, 30000);
}

main().catch((error: Error) => {
	console.log(error.message);
	process.exit(1);
});
