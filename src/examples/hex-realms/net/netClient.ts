import { type ClientMessage, DEFAULT_PORT, type ServerMessage, SOCKET_PATH } from "./protocol";

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

/** A WebSocket connection to the game server. */
export class NetClient {
	ws?: WebSocket;
	onMessage?: (msg: ServerMessage) => void;
	onClose?: () => void;

	connect (url = serverUrl()): Promise<void> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(url);
			this.ws = ws;
			ws.onopen = () => resolve();
			ws.onerror = () => reject(new Error(`Can't reach the game server at ${url}`));
			ws.onclose = () => this.onClose?.();
			ws.onmessage = (e) => {
				try {
					this.onMessage?.(JSON.parse(String(e.data)) as ServerMessage);
				} catch (err) {
					console.error("Bad server message", err);
				}
			};
		});
	}

	send (msg: ClientMessage): void {
		this.ws?.send(JSON.stringify(msg));
	}

	close (): void {
		this.ws?.close();
	}
}

/**
 * Seat tokens are kept per game and player name, so rejoining puts you back
 * in your own seat, while someone else joining from the same browser (another
 * tab, another name) gets a seat of their own.
 */
function seatKey (code: string, name: string): string {
	return `hexRealms.seat.${code}.${name.trim().toLowerCase()}`;
}

export function seatToken (code: string, name: string): string | undefined {
	try {
		return localStorage.getItem(seatKey(code, name)) ?? undefined;
	} catch {
		return undefined;
	}
}

export function saveSeatToken (code: string, name: string, token: string): void {
	try {
		localStorage.setItem(seatKey(code, name), token);
	} catch {
		// Without storage, rejoining takes a free seat instead of your own
	}
}
