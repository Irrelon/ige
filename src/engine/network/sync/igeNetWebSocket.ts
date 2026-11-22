import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";

/**
 * Sync transports over plain WebSockets (JSON messages), for browsers and
 * Node (which has a global WebSocket from version 22):
 *
 * - igeNetWebSocketConnect(url): join an authority listening on a server
 *   (see IgeNetWebSocketServer.listen(), e.g. a dedicated Node server).
 * - igeNetRelayHost(url) / igeNetRelayJoin(url, code): a player's browser
 *   hosts the authority and other machines join it by a short code. Their
 *   messages pass through a relay on a server (IgeNetWebSocketServer.relay()),
 *   so nobody needs an open port; a WebRTC transport can later replace the
 *   relay with direct connections, with the same shapes.
 * - igeNetMergeListeners(): one authority, machines from several transports
 *   (a browser host: its own players over igeNetLoopback(), remote ones over
 *   the relay).
 *
 * Messages are JSON text frames; binary ones (the replication layer's packets, Uint8Array)
 * are binary frames, through a relay too: a joiner sends its packet as a binary frame
 * as it is; the relay passes it to the host with a small header (one byte for the
 * machine id's length, then the id), and the host's frames to a joiner carry the same
 * header, which the relay strips. No base64, no JSON around the bytes.
 *
 * WebSockets are TCP: every message arrives, in order, so unreliable sends
 * cost the same as reliable ones.
 */

/** Anything shaped like the browser's WebSocket class (pass one in where there's no global). */
export type IgeWebSocketClass = new (url: string) => WebSocket;

export interface IgeNetWebSocketOptions {
	/** The WebSocket class to use (default: the global one). */
	WebSocket?: IgeWebSocketClass;
	/** Give up connecting after this many ms (default 8000). */
	timeout?: number;
}

/** Characters for join codes: no 0/O, 1/I/L, so they read and type easily. */
export const IGE_RELAY_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Open a socket; resolves once it's open, rejects if it can't be reached in time. */
function openSocket (url: string, options: IgeNetWebSocketOptions): Promise<WebSocket> {
	const Socket = options.WebSocket ?? (globalThis as { WebSocket?: IgeWebSocketClass }).WebSocket;
	if (!Socket) return Promise.reject(new Error("No WebSocket class available (pass options.WebSocket)"));
	return new Promise((resolve, reject) => {
		const socket = new Socket(url);
		const timer = setTimeout(() => {
			socket.close();
			reject(new Error(`Couldn't reach ${url}`));
		}, options.timeout ?? 8000);
		socket.onopen = () => {
			clearTimeout(timer);
			resolve(socket);
		};
		socket.onerror = () => {
			clearTimeout(timer);
			reject(new Error(`Couldn't reach ${url}`));
		};
	});
}

/** An IgeNetConnection over an open socket, sending with `wrap` and reading with `unwrap` (undefined: not for us). */
const identity = (m: unknown): unknown => m;

function socketConnection (socket: WebSocket, wrap: (message: unknown) => unknown = identity, unwrap: (data: any) => unknown = (d) => d, wrapBinary?: (bytes: Uint8Array) => Uint8Array): IgeNetConnection & { _receive: (data: any) => void; _end: () => void } {
	const messageListeners: ((message: unknown) => void)[] = [];
	const closeListeners: (() => void)[] = [];
	let closed = false;
	const connection = {
		send: (message: unknown) => {
			if (closed || socket.readyState !== 1) return;
			if (message instanceof Uint8Array) {
				socket.send(wrapBinary ? wrapBinary(message) : message);
			} else {
				socket.send(JSON.stringify(wrap(message)));
			}
		},
		onMessage: (fn: (message: unknown) => void) => { messageListeners.push(fn); },
		onClose: (fn: () => void) => { closeListeners.push(fn); },
		close: () => {
			if (closed) return;
			socket.close();
			connection._end();
		},
		_receive: (data: any) => {
			const message = unwrap(data);
			if (message !== undefined && !closed) for (const fn of messageListeners) fn(message);
		},
		_end: () => {
			if (closed) return;
			closed = true;
			for (const fn of closeListeners) fn();
		}
	};
	return connection;
}

/**
 * Join an authority listening on a WebSocket server (IgeNetWebSocketServer.listen()).
 * @example #Join a dedicated server
 *     const client = new IgeNetSyncClient(await igeNetWebSocketConnect("ws://my-server:8670/sync"));
 */
export async function igeNetWebSocketConnect (url: string, options: IgeNetWebSocketOptions = {}): Promise<IgeNetConnection> {
	const socket = await openSocket(url, options);
	const connection = socketConnection(socket);
	socket.binaryType = "arraybuffer";
	socket.onmessage = (event) => connection._receive(typeof event.data === "string" ? JSON.parse(event.data) : new Uint8Array(event.data as ArrayBuffer));
	socket.onclose = () => connection._end();
	return connection;
}

/** A binary relay frame for a machine: [id length][id][payload]. */
function relayFrame (id: string, payload: Uint8Array): Uint8Array {
	const frame = new Uint8Array(1 + id.length + payload.length);
	frame[0] = id.length;
	for (let i = 0; i < id.length; i++) frame[1 + i] = id.charCodeAt(i);
	frame.set(payload, 1 + id.length);
	return frame;
}

/** Binary frames arrive as ArrayBuffers (or Blobs in some environments, which we don't use). */
function toBytes (data: unknown): Uint8Array {
	return data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
}

/** A browser-hosted game on a relay: its join code, the listener for IgeNetSyncHost, and how to stop hosting. */
export interface IgeNetRelayHosting {
	code: string;
	listener: IgeNetListener;
	close (): void;
}

/**
 * Host the authority in this page for machines joining through a relay
 * (IgeNetWebSocketServer.relay()). Resolves with the join code to share.
 * @example #Host in the browser
 *     const hosting = await igeNetRelayHost("ws://my-server:8670/relay");
 *     const local = igeNetLoopback();
 *     const host = new IgeNetSyncHost(igeNetMergeListeners(local.listener, hosting.listener), { ... });
 *     showCode(hosting.code);
 */
export async function igeNetRelayHost (url: string, options: IgeNetWebSocketOptions & { code?: string } = {}): Promise<IgeNetRelayHosting> {
	const socket = await openSocket(url, options);
	const machines = new Map<string, ReturnType<typeof socketConnection>>();
	let onConnection: ((connection: IgeNetConnection) => void) | undefined;
	let resolveCode!: (code: string) => void;
	let rejectCode!: (error: Error) => void;
	const coded = new Promise<string>((resolve, reject) => {
		resolveCode = resolve;
		rejectCode = reject;
	});
	socket.binaryType = "arraybuffer";
	socket.onmessage = (event) => {
		if (typeof event.data !== "string") {
			const frame = toBytes(event.data);
			const idLength = frame[0];
			let id = "";
			for (let i = 0; i < idLength; i++) id += String.fromCharCode(frame[1 + i]);
			machines.get(id)?._receive(frame.slice(1 + idLength));
			return;
		}
		const data = JSON.parse(event.data);
		if (data.t === "hosted") {
			resolveCode(data.code);
		} else if (data.t === "error") {
			rejectCode(new Error(data.reason));
		} else if (data.t === "open") {
			const id = data.id as string;
			const connection = socketConnection(socket, (m) => ({ t: "m", id, d: m }), (d) => d, (bytes) => relayFrame(id, bytes));
			connection.close = () => {
				socket.send(JSON.stringify({ t: "kick", id }));
				machines.delete(id);
				connection._end();
			};
			machines.set(id, connection);
			onConnection?.(connection);
		} else if (data.t === "m") {
			machines.get(data.id)?._receive(data.d);
		} else if (data.t === "close") {
			machines.get(data.id)?._end();
			machines.delete(data.id);
		}
	};
	socket.onclose = () => {
		rejectCode(new Error("The relay closed"));
		for (const machine of machines.values()) machine._end();
		machines.clear();
	};
	socket.send(JSON.stringify({ t: "host", code: options.code }));
	const code = await coded;
	return {
		code,
		listener: {
			onConnection: (fn) => { onConnection = fn; },
			close: () => { onConnection = undefined; }
		},
		close: () => socket.close()
	};
}

/**
 * Join a browser-hosted game through a relay by its code.
 * @example #Join a friend's game
 *     const client = new IgeNetSyncClient(await igeNetRelayJoin("ws://my-server:8670/relay", "KX7QD"));
 */
export async function igeNetRelayJoin (url: string, code: string, options: IgeNetWebSocketOptions = {}): Promise<IgeNetConnection> {
	const socket = await openSocket(url, options);
	const connection = socketConnection(socket, (m) => ({ t: "m", d: m }));
	socket.binaryType = "arraybuffer";
	return new Promise((resolve, reject) => {
		socket.onmessage = (event) => {
			if (typeof event.data !== "string") {
				connection._receive(toBytes(event.data));
				return;
			}
			const data = JSON.parse(event.data);
			if (data.t === "joined") resolve(connection);
			else if (data.t === "error") reject(new Error(data.reason));
			else if (data.t === "m") connection._receive(data.d);
		};
		socket.onclose = () => {
			reject(new Error("The relay closed"));
			connection._end();
		};
		socket.send(JSON.stringify({ t: "join", code: code.trim().toUpperCase() }));
	});
}

/** One listener for the machines of several transports (e.g. local players over a loopback, remote ones over a relay). */
export function igeNetMergeListeners (...listeners: IgeNetListener[]): IgeNetListener {
	return {
		onConnection: (fn) => {
			for (const listener of listeners) listener.onConnection(fn);
		},
		close: () => {
			for (const listener of listeners) listener.close();
		}
	};
}
