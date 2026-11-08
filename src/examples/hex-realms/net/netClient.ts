import type { IgeRoomClientTransport } from "@/engine/network/rooms/IgeRoomClient";
import type { IgeRoomServerMessage } from "@/engine/network/rooms/igeRoomProtocol";
import { DEFAULT_PORT, SOCKET_PATH } from "./protocol";

/** Where the Hex Realms server is: ?server=..., the page's own host when served by it, or localhost. */
export function serverUrl (): string {
	const q = new URLSearchParams(window.location.search).get("server");
	if (q) return q;
	const secure = window.location.protocol === "https:";
	if (window.location.port === String(DEFAULT_PORT)) return `${secure ? "wss" : "ws"}://${window.location.host}${SOCKET_PATH}`;
	return `ws://${window.location.hostname || "localhost"}:${DEFAULT_PORT}${SOCKET_PATH}`;
}

/** Is a server listening? (Used to offer online play on the setup screen.) */
export function serverAvailable (url = serverUrl(), timeoutMs = 700): Promise<boolean> {
	return new Promise((resolve) => {
		let done = false;
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			resolve(ok);
		};
		try {
			const ws = new WebSocket(url);
			ws.onopen = () => {
				finish(true);
				ws.close();
			};
			ws.onerror = () => finish(false);
			setTimeout(() => {
				finish(false);
				ws.close();
			}, timeoutMs);
		} catch {
			finish(false);
		}
	});
}

/**
 * The engine's room messages over a plain WebSocket (JSON text frames), so
 * the game server can serve the client and the rooms on one port.
 */
export function connectRoomTransport (url = serverUrl()): Promise<IgeRoomClientTransport> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		let onMessage: ((message: IgeRoomServerMessage) => void) | undefined;
		let onDisconnect: (() => void) | undefined;
		ws.onmessage = (e) => {
			try {
				onMessage?.(JSON.parse(String(e.data)) as IgeRoomServerMessage);
			} catch (err) {
				console.error("Bad server message", err);
			}
		};
		ws.onclose = () => onDisconnect?.();
		ws.onerror = () => reject(new Error(`Can't reach the game server at ${url}`));
		ws.onopen = () => resolve({
			send: (message) => {
				if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
			},
			listen: (message, disconnect) => {
				onMessage = message;
				onDisconnect = disconnect;
			}
		});
	});
}
