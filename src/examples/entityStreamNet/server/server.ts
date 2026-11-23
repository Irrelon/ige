/**
 * The entity streaming example's server: the authority from ../../entityStream/shared.ts on a WebSocket.
 * Run it from the repository root:
 *
 *     node --experimental-transform-types --import ./src/examples/entityStreamNet/server/register.mjs src/examples/entityStreamNet/server/server.ts
 *
 * It listens on PORT (default 8693) at /sync. Then serve the built example page and open it in several tabs.
 */
import http from "node:http";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/instance";
import { IgeNetWebSocketServer } from "@/engine/network/transport/IgeNetWebSocketServer";
import { createEntityGame } from "../../entityStream/shared";

// Entities need an engine to exist; a server has no renderer, so a bare stand-in does
Object.defineProperty(ige, "engine", {
	value: {
		renderer: () => undefined,
		_bounds2d: new IgePoint2d(0, 0),
		_currentTime: 0,
		addBehaviour: () => undefined,
		removeBehaviour: () => undefined
	},
	configurable: true,
	writable: true
});

const port = Number(process.env.PORT ?? 8693);
const server = http.createServer((_request, response) => {
	response.writeHead(200, { "content-type": "text/plain" });
	response.end("Entity streaming example: connect a page to ws://<this host>/sync\n");
});
const sockets = new IgeNetWebSocketServer(server);
const game = createEntityGame(sockets.listen("/sync"), { log: (message) => console.log(message) });

server.listen(port, "127.0.0.1", () => {
	game.host.start();
	console.log(`entity streaming server on ws://localhost:${port}/sync`);
});

function shutdown (): void {
	game.destroy();
	server.close();
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
