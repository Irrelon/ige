/**
 * The zones example's page: enters through the directory, joins its zone
 * with the ticket, and follows the zone servers' handoffs with
 * IgeNetSyncClient.transfer. ?directory=<url> points it at another directory
 * (default http://localhost:8810), ?name=<name> picks the player's name.
 */
import { IgeNetSyncClient } from "@/engine/network/sync/IgeNetSyncClient";
import type { IgeNetWelcome } from "@/engine/network/sync/igeNetSyncProtocol";
import { igeNetWebSocketConnect } from "@/engine/network/sync/igeNetWebSocket";
import { moveDot, ZONE_HEIGHT, ZONE_WIDTH, type ZonesDot, type ZonesInfo, type ZonesInput, type ZonesTransferEvent } from "./shared";

const params = new URLSearchParams(location.search);
const directoryUrl = params.get("directory") ?? "http://localhost:8810";
const name = params.get("name") ?? `pilot-${Math.random().toString(36).slice(2, 6)}`;

const canvas = document.getElementById("view") as HTMLCanvasElement;
const context = canvas.getContext("2d") as CanvasRenderingContext2D;
const status = document.getElementById("status") as HTMLElement;

const keys = new Set<string>();
addEventListener("keydown", (event) => keys.add(event.code));
addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("blur", () => keys.clear());

/** Keyboard and the first pad's left stick, together. */
function readInput (): ZonesInput {
	let dx = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
	let dy = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0);
	const pad = navigator.getGamepads?.().find((p) => p);
	if (pad) {
		const deadzone = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
		dx += deadzone(pad.axes[0] ?? 0);
		dy += deadzone(pad.axes[1] ?? 0);
	}
	return { dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) };
}

let info: ZonesInfo | undefined;
let me = "";
let jumping = "";

async function main (): Promise<void> {
	const response = await fetch(`${directoryUrl}/enter`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ player: name }) });
	const entry = await response.json() as { zone: string; url: string; ticket: string; error?: string };
	if (!response.ok) throw new Error(entry.error ?? `The directory said ${response.status}`);

	const client = new IgeNetSyncClient<ZonesInput>(await igeNetWebSocketConnect(entry.url));
	const arrived = (welcome: IgeNetWelcome) => {
		info = welcome.info as ZonesInfo;
		me = welcome.players[0];
		status.textContent = `${name} in zone ${info.zone}`;
	};
	client.on("event", (data: ZonesTransferEvent) => {
		if (data?.t !== "zone") return;
		jumping = data.zone;
		client.transfer({ url: data.url, ticket: data.ticket }).catch((error: Error) => {
			status.textContent = `Couldn't reach ${data.zone}: ${error.message}`;
		});
	});
	client.on("transferred", arrived);
	// The jump shows until the new zone's first snapshot
	client.on("snapshot", () => {
		if (!client.transferring) jumping = "";
	});
	client.on("disconnected", () => {
		status.textContent = "Disconnected (reload to enter again).";
	});
	arrived(await client.join([], entry.ticket));

	// Input at the zones' tick rate; drawing every frame
	const tickMs = 1000 / client.tickRate;
	let last = performance.now();
	let accumulator = 0;
	const frame = (now: number) => {
		accumulator += Math.min(250, now - last);
		last = now;
		while (accumulator >= tickMs) {
			accumulator -= tickMs;
			if (!client.transferring) client.sendInput([readInput()]);
		}
		const others = client.interpolated();
		const mine = me ? client.predict<ZonesDot>(me, 0, moveDot, { between: accumulator / tickMs }) : undefined;
		draw(others as Record<string, ZonesDot>, mine);
		requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
}

function draw (dots: Record<string, ZonesDot>, mine: ZonesDot | undefined): void {
	const width = canvas.width = innerWidth * devicePixelRatio;
	const height = canvas.height = innerHeight * devicePixelRatio;
	context.fillStyle = "#0b0e14";
	context.fillRect(0, 0, width, height);
	const scale = Math.min(width / (ZONE_WIDTH + 160), height / (ZONE_HEIGHT + 160));
	context.save();
	context.translate((width - ZONE_WIDTH * scale) / 2, (height - ZONE_HEIGHT * scale) / 2);
	context.scale(scale, scale);
	context.strokeStyle = "#3a4a66";
	context.lineWidth = 2;
	context.strokeRect(0, 0, ZONE_WIDTH, ZONE_HEIGHT);
	context.fillStyle = "#6c7a96";
	context.font = "20px monospace";
	context.textAlign = "center";
	context.fillText(`zone ${info?.zone ?? "?"}`, ZONE_WIDTH / 2, -16);
	if (info?.west) context.fillText(`<- ${info.west}`, -50, ZONE_HEIGHT / 2);
	if (info?.east) context.fillText(`${info.east} ->`, ZONE_WIDTH + 50, ZONE_HEIGHT / 2);
	for (const id in dots) {
		const dot = id === me && mine ? mine : dots[id];
		context.fillStyle = id === me ? "#ffd166" : "#4cc9f0";
		context.beginPath();
		context.arc(dot.x, dot.y, 10, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#9aa7bf";
		context.font = "14px monospace";
		context.fillText(String(dot.name), dot.x, dot.y - 16);
	}
	if (jumping) {
		context.fillStyle = "#ffd166";
		context.font = "28px monospace";
		context.fillText(`Jumping to ${jumping}...`, ZONE_WIDTH / 2, ZONE_HEIGHT / 2);
	}
	context.restore();
}

main().catch((error: Error) => {
	status.textContent = `Couldn't enter: ${error.message} (is the directory running at ${directoryUrl}?)`;
});
