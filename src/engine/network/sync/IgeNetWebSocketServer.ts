import type http from "http";
import websocket from "websocket";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";
import { IGE_RELAY_CODE_CHARS } from "@/engine/network/sync/igeNetWebSocket";

/**
 * The server side of the sync layer's WebSocket transports (Node only), on
 * an HTTP server of your own. Each path does one job:
 *
 * - listen(path): an authority on this server (IgeNetSyncHost), e.g. a
 *   dedicated server's game. Machines join with igeNetWebSocketConnect().
 * - relay(path): browser-hosted games. A host (igeNetRelayHost()) gets a
 *   short join code; machines joining with that code (igeNetRelayJoin())
 *   have their messages passed to the host and back.
 *
 * Messages are JSON text frames.
 * @example #A dedicated server that also relays browser-hosted games
 *     const server = http.createServer();
 *     const sockets = new IgeNetWebSocketServer(server);
 *     const host = new IgeNetSyncHost(sockets.listen("/sync"), { ... });
 *     sockets.relay("/relay");
 *     server.listen(8670);
 *     host.start();
 */
export class IgeNetWebSocketServer {
	_server: websocket.server;
	_routes = new Map<string, (connection: websocket.connection) => void>();
	/** Relayed games by join code: the host's socket and its machines' sockets by id. */
	_games = new Map<string, { host: websocket.connection; machines: Map<string, websocket.connection> }>();
	_nextId = 1;

	constructor (httpServer: http.Server) {
		this._server = new websocket.server({ httpServer, autoAcceptConnections: false, maxReceivedFrameSize: 1 << 20, maxReceivedMessageSize: 4 << 20 });
		this._server.on("request", (request) => {
			const path = request.resourceURL.pathname ?? "/";
			const route = this._routes.get(path);
			if (!route) {
				request.reject(404, "No such path");
				return;
			}
			route(request.accept(undefined, request.origin));
		});
	}

	/** Listen for machines joining an authority on this server (IgeNetSyncHost's listener). */
	listen (path = "/sync"): IgeNetListener {
		let onConnection: ((connection: IgeNetConnection) => void) | undefined;
		this._routes.set(path, (socket) => {
			const messageListeners: ((message: unknown) => void)[] = [];
			const closeListeners: (() => void)[] = [];
			let closed = false;
			const end = () => {
				if (closed) return;
				closed = true;
				for (const fn of closeListeners) fn();
			};
			socket.on("message", (data) => {
				if (data.type !== "utf8" || closed) return;
				let message: unknown;
				try {
					message = JSON.parse(data.utf8Data);
				} catch {
					return;
				}
				for (const fn of messageListeners) fn(message);
			});
			socket.on("close", end);
			const connection: IgeNetConnection = {
				send: (message) => {
					if (!closed && socket.connected) socket.sendUTF(JSON.stringify(message));
				},
				onMessage: (fn) => { messageListeners.push(fn); },
				onClose: (fn) => { closeListeners.push(fn); },
				close: () => {
					socket.close();
					end();
				}
			};
			if (onConnection) onConnection(connection);
			else socket.close();
		});
		return {
			onConnection: (fn) => { onConnection = fn; },
			close: () => {
				onConnection = undefined;
				this._routes.delete(path);
			}
		};
	}

	/**
	 * Relay browser-hosted games on this path (see igeNetRelayHost() and
	 * igeNetRelayJoin()). `log` hears about games starting and ending and
	 * machines joining and leaving.
	 */
	relay (path = "/relay", options: { log?: (message: string) => void } = {}): this {
		const log = options.log ?? (() => {});
		this._routes.set(path, (socket) => {
			let hosting: string | undefined;
			let joined: { code: string; id: string } | undefined;
			const send = (to: websocket.connection, message: unknown) => {
				if (to.connected) to.sendUTF(JSON.stringify(message));
			};
			socket.on("message", (data) => {
				if (data.type !== "utf8") return;
				let message: any;
				try {
					message = JSON.parse(data.utf8Data);
				} catch {
					return;
				}
				if (message.t === "host" && !hosting && !joined) {
					const wanted = typeof message.code === "string" ? message.code.toUpperCase() : undefined;
					const code = wanted && !this._games.has(wanted) ? wanted : this._newCode();
					this._games.set(code, { host: socket, machines: new Map() });
					hosting = code;
					send(socket, { t: "hosted", code });
					log(`game ${code} hosted`);
				} else if (message.t === "join" && !hosting && !joined) {
					const game = this._games.get(String(message.code ?? "").toUpperCase());
					if (!game) {
						send(socket, { t: "error", reason: "No game with that code" });
						return;
					}
					const id = `r${this._nextId++}`;
					game.machines.set(id, socket);
					joined = { code: String(message.code).toUpperCase(), id };
					send(socket, { t: "joined" });
					send(game.host, { t: "open", id });
					log(`machine ${id} joined game ${joined.code}`);
				} else if (message.t === "m" && joined) {
					const game = this._games.get(joined.code);
					if (game) send(game.host, { t: "m", id: joined.id, d: message.d });
				} else if (message.t === "m" && hosting) {
					const to = this._games.get(hosting)?.machines.get(message.id);
					if (to) send(to, { t: "m", d: message.d });
				} else if (message.t === "kick" && hosting) {
					const game = this._games.get(hosting);
					game?.machines.get(message.id)?.close();
					game?.machines.delete(message.id);
				}
			});
			socket.on("close", () => {
				if (hosting) {
					// The host left: the game is over for everyone in it
					const game = this._games.get(hosting);
					this._games.delete(hosting);
					log(`game ${hosting} ended (its host left)`);
					for (const machine of game?.machines.values() ?? []) machine.close();
				} else if (joined) {
					const game = this._games.get(joined.code);
					if (game?.machines.delete(joined.id)) send(game.host, { t: "close", id: joined.id });
					log(`machine ${joined.id} left game ${joined.code}`);
				}
			});
		});
		return this;
	}

	/** Games being relayed now. */
	relayedGames (): number {
		return this._games.size;
	}

	/** Stop accepting and close every socket. */
	close (): void {
		this._routes.clear();
		this._server.shutDown();
	}

	_newCode (): string {
		for (;;) {
			let code = "";
			for (let i = 0; i < 5; i++) code += IGE_RELAY_CODE_CHARS[Math.floor(Math.random() * IGE_RELAY_CODE_CHARS.length)];
			if (!this._games.has(code)) return code;
		}
	}
}
