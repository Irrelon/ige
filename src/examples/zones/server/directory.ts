/**
 * The zones example's directory: a two-zone world ("west" and "east") run as
 * child processes. Zones start when someone needs one and stop a while after
 * they empty. Run it from the repository root:
 *
 *     node --experimental-transform-types --import ./src/examples/zones/server/register.mjs src/examples/zones/server/directory.ts
 *
 * Then either open the example's page (dist/esm/examples/zones/index.html,
 * arrow keys, WASD or a pad's left stick) or run the probe, which flies
 * east into the other zone and back again:
 *
 *     node --experimental-transform-types --import ./src/examples/zones/server/register.mjs src/examples/zones/server/probe.ts
 *
 * Environment: DIRECTORY_PORT (default 8810), ZONE_SECRET (default a random one).
 */
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IgeChildProcessLauncher } from "@/engine/network/zones/IgeChildProcessLauncher";
import { IgeZoneDirectory, type IgeZoneRecord } from "@/engine/network/zones/IgeZoneDirectory";
import { NEIGHBOURS, START_ZONE, ZONE_HEIGHT, ZONE_WIDTH, type ZonesArrival } from "../shared";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DIRECTORY_PORT ?? 8810);

const launcher = new IgeChildProcessLauncher({
	script: join(here, "zone.ts"),
	// Zones are TypeScript too: the same loader
	args: ["--experimental-transform-types", "--disable-warning=ExperimentalWarning", "--import", pathToFileURL(join(here, "register.mjs")).href],
	ports: [port + 1, port + 9]
});

const directory = new IgeZoneDirectory({
	launcher,
	secret: process.env.ZONE_SECRET ?? randomBytes(24).toString("base64url"),
	idleMs: 20000,
	// The example's page is served from elsewhere (it's only on this machine)
	cors: "*",
	// A real game checks a session here and looks up where the player was;
	// the example lets anyone in, at the start (or a zone they ask for)
	resolveEntry: (player, body) => {
		if (!/^[A-Za-z0-9-]{1,24}$/.test(player)) return "Pick a name of letters, digits and dashes.";
		const zone = typeof body.zone === "string" && NEIGHBOURS[body.zone] ? body.zone : START_ZONE;
		const data: ZonesArrival = { x: ZONE_WIDTH / 2, y: ZONE_HEIGHT / 2, name: player };
		return { zone, data };
	}
});

directory.on("start", (zone: string) => console.log(`starting zone ${zone}`));
directory.on("ready", (record: IgeZoneRecord) => console.log(`zone ${record.zone} ready at ${record.url}`));
directory.on("stop", (zone: string, why: string) => console.log(`stopped zone ${zone} (${why})`));
directory.on("lost", (zone: string, why: string) => console.log(`lost zone ${zone} (${why})`));
directory.on("enter", (player: string, zone: string) => console.log(`${player} enters at ${zone}`));

directory.listen(port).then((listening) => console.log(`zone directory on http://127.0.0.1:${listening}`), (error: Error) => {
	console.log(`The directory couldn't listen on ${port} (${error.message}); set DIRECTORY_PORT to another port.`);
	process.exit(1);
});

async function shutdown (): Promise<void> {
	await directory.close();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
