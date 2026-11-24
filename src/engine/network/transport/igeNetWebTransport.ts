import type { IgeNetConnection } from "@/engine/network/transport/IgeNetTransport";

/**
 * The WebTransport transport (HTTP/3 over QUIC): replication packets and inputs travel as
 * datagrams (lost ones aren't resent, nothing waits behind them), everything else (control
 * messages, joins, transfers, events, chat) on one reliable bidirectional stream of the same
 * session, in order. Connections are marked `lossy`, so the replication host runs them with its
 * resend-against-the-last-acknowledged-packet mode.
 *
 * - igeNetWebTransport(url, options): a browser (or anything with a WebTransport class) joins an
 *   authority listening with IgeNetWebTransportServer.
 * - igeNetConnect(options): WebTransport where it's available and works, the WebSocket otherwise.
 *
 * Stream messages are length-prefixed frames: [kind u8][length u32 big-endian][payload]; kind 0
 * is a hello (empty), 1 a JSON text message, 2 a binary one. Unreliable binary messages that
 * don't fit one datagram go on the stream instead.
 */

export const IGE_WT_HELLO = 0;
export const IGE_WT_JSON = 1;
export const IGE_WT_BINARY = 2;
/** A datagram size that fits any path when the session doesn't say (bytes). */
export const IGE_WT_DEFAULT_DATAGRAM = 1150;

/** Anything shaped like the browser's WebTransport class. */
export type IgeWebTransportClass = new (url: string, options?: Record<string, unknown>) => any;

/** One frame for a message: JSON text, or bytes as they are. */
export function igeNetWtFrame (message: unknown): Uint8Array {
	const binary = message instanceof Uint8Array;
	const payload = binary ? message : new TextEncoder().encode(JSON.stringify(message));
	const out = new Uint8Array(5 + payload.length);
	out[0] = binary ? IGE_WT_BINARY : IGE_WT_JSON;
	new DataView(out.buffer).setUint32(1, payload.length);
	out.set(payload, 5);
	return out;
}

export const igeNetWtHelloFrame = (): Uint8Array => Uint8Array.from([IGE_WT_HELLO, 0, 0, 0, 0]);

/** Cuts a byte stream into frames. */
export class IgeNetWtFrameReader {
	_chunks: Uint8Array[] = [];
	_size = 0;

	/** Add bytes; calls `onFrame` for each complete frame (a hello comes as kind 0). */
	push (bytes: Uint8Array, onFrame: (kind: number, payload: Uint8Array) => void): void {
		this._chunks.push(bytes);
		this._size += bytes.length;
		for (;;) {
			if (this._size < 5) return;
			const buffer = this._chunks.length === 1 ? this._chunks[0] : this._join();
			const length = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getUint32(1);
			if (buffer.length < 5 + length) return;
			const kind = buffer[0];
			const payload = buffer.slice(5, 5 + length);
			const rest = buffer.subarray(5 + length);
			this._chunks = rest.length ? [rest] : [];
			this._size = rest.length;
			onFrame(kind, payload);
		}
	}

	_join (): Uint8Array {
		const all = new Uint8Array(this._size);
		let at = 0;
		for (const chunk of this._chunks) {
			all.set(chunk, at);
			at += chunk.length;
		}
		this._chunks = [all];
		return all;
	}
}

/** Reads a session (client or server side) as an IgeNetConnection once its reliable stream is open. */
export function igeNetWtConnection (
	session: any,
	stream: { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> },
	onHello: () => void
): IgeNetConnection & { _end: () => void; sendHello: () => void } {
	const messageListeners: ((message: unknown) => void)[] = [];
	const closeListeners: (() => void)[] = [];
	let closed = false;
	const writer = stream.writable.getWriter();
	const datagramWriter = (session.datagrams.createWritable?.() ?? session.datagrams.writable).getWriter();
	const end = (): void => {
		if (closed) return;
		closed = true;
		for (const fn of closeListeners) fn();
	};
	const deliver = (message: unknown): void => {
		if (!closed) for (const fn of messageListeners) fn(message);
	};
	const write = (w: WritableStreamDefaultWriter<Uint8Array>, bytes: Uint8Array): void => {
		w.write(bytes).catch(end);
	};
	const frames = new IgeNetWtFrameReader();
	(async () => {
		const reader = stream.readable.getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			frames.push(value, (kind, payload) => {
				if (kind === IGE_WT_HELLO) onHello();
				else if (kind === IGE_WT_BINARY) deliver(payload);
				else if (kind === IGE_WT_JSON) {
					try {
						deliver(JSON.parse(new TextDecoder().decode(payload)));
					} catch {
						// Not ours
					}
				}
			});
		}
	})().catch(() => {}).then(end);
	(async () => {
		const reader = session.datagrams.readable.getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value.length) deliver(value instanceof Uint8Array ? value : new Uint8Array(value));
		}
	})().catch(() => {});
	Promise.resolve(session.closed).catch(() => {}).then(end);
	const connection = {
		lossy: true,
		transport: "webtransport",
		maxDatagramSize: (): number | undefined => {
			const size = session.datagrams.maxDatagramSize;
			return typeof size === "number" && size > 0 ? size : undefined;
		},
		send: (message: unknown, reliable = true) => {
			if (closed) return;
			if (!reliable && message instanceof Uint8Array && message.length <= (connection.maxDatagramSize() ?? IGE_WT_DEFAULT_DATAGRAM)) {
				write(datagramWriter, message);
				return;
			}
			write(writer, igeNetWtFrame(message));
		},
		sendHello: () => write(writer, igeNetWtHelloFrame()),
		onMessage: (fn: (message: unknown) => void) => { messageListeners.push(fn); },
		onClose: (fn: () => void) => { closeListeners.push(fn); },
		close: () => {
			if (closed) return;
			try {
				session.close({ closeCode: 0, reason: "closed" });
			} catch {
				// Gone already
			}
			end();
		},
		_end: end
	};
	return connection;
}

export interface IgeNetWebTransportOptions {
	/** SHA-256 hash (hex) of the server's certificate when it's self-signed (the server's `certHash`). */
	certHash?: string;
	/** The browser's own form of the above (overrides certHash). */
	serverCertificateHashes?: { algorithm: string; value: BufferSource }[];
	/** The WebTransport class to use (default: the global one). */
	WebTransport?: IgeWebTransportClass;
	/** Give up after this many ms (default 2000). */
	timeout?: number;
}

/** Hex text to bytes. */
export function igeNetHexToBytes (hex: string): Uint8Array {
	const clean = hex.replace(/[^0-9a-f]/gi, "");
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/**
 * Open a WebTransport session to an authority (IgeNetWebTransportServer); resolves once the
 * session and its reliable stream are up and the server has answered, rejects on error or timeout.
 * @example #Join with a self-signed server's hash
 *     const connection = await igeNetWebTransport("https://192.168.1.20:8670/sync", { certHash });
 */
export async function igeNetWebTransport (url: string, options: IgeNetWebTransportOptions = {}): Promise<IgeNetConnection> {
	const Class = options.WebTransport ?? (globalThis as { WebTransport?: IgeWebTransportClass }).WebTransport;
	if (!Class) throw new Error("No WebTransport class available");
	const hashes = options.serverCertificateHashes ?? (options.certHash ? [{ algorithm: "sha-256", value: igeNetHexToBytes(options.certHash) }] : undefined);
	const session = new Class(url, hashes ? { serverCertificateHashes: hashes } : {});
	let timer: ReturnType<typeof setTimeout> | undefined;
	const fail = (error: unknown): never => {
		try {
			session.close();
		} catch {
			// Never opened
		}
		throw error instanceof Error ? error : new Error(`Couldn't reach ${url}`);
	};
	const opened = (async () => {
		await session.ready;
		const stream = await session.createBidirectionalStream();
		let hello!: () => void;
		const answered = new Promise<void>((resolve) => { hello = resolve; });
		const connection = igeNetWtConnection(session, stream, () => hello());
		connection.sendHello();
		await answered;
		return connection;
	})();
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Timed out reaching ${url}`)), options.timeout ?? 2000);
	});
	try {
		return await Promise.race([opened, timeout]);
	} catch (error) {
		opened.then((c) => c.close()).catch(() => {});
		return fail(error);
	} finally {
		clearTimeout(timer);
	}
}

/** Where to find a zone over WebTransport (the address, and the hash of a self-signed certificate). */
export interface IgeNetWebTransportTarget {
	url: string;
	certHash?: string;
}

export interface IgeNetConnectOptions {
	/** Try this first, where the browser supports it. */
	webTransport?: IgeNetWebTransportTarget;
	/** The WebSocket address: the fallback. */
	webSocket: string;
	/** How long WebTransport gets to come up before falling back, in ms (default 2000). */
	timeout?: number;
	/** WebTransport class (default global) and secure-context flag (default the global's), for tests. */
	WebTransport?: IgeWebTransportClass;
	isSecureContext?: boolean;
	/** The WebSocket class (default global). */
	WebSocket?: new (url: string) => WebSocket;
}

export interface IgeNetConnected {
	connection: IgeNetConnection;
	transport: "webtransport" | "websocket";
	/** Why WebTransport wasn't used, when it wasn't. */
	fallbackReason?: string;
}

/**
 * Connect by WebTransport when the browser has it (and the page is a secure context: HTTPS or
 * localhost), falling back to the WebSocket when it's missing, fails or takes too long
 * (UDP blocked, no certificate match). Says which one it used.
 * @example #Prefer WebTransport
 *     const { connection, transport } = await igeNetConnect({ webTransport: { url, certHash }, webSocket: "ws://host:8670/sync" });
 */
export async function igeNetConnect (options: IgeNetConnectOptions): Promise<IgeNetConnected> {
	const Class = options.WebTransport ?? (globalThis as { WebTransport?: IgeWebTransportClass }).WebTransport;
	const secure = options.isSecureContext ?? (globalThis as { isSecureContext?: boolean }).isSecureContext !== false;
	let fallbackReason: string | undefined;
	if (!options.webTransport) fallbackReason = "no WebTransport address";
	// (Not a secure context first: browsers hide WebTransport there, so "no WebTransport" would blame the browser)
	else if (!secure) fallbackReason = "the page isn't a secure context (WebTransport needs HTTPS or localhost)";
	else if (!Class) fallbackReason = "this browser has no WebTransport";
	else {
		try {
			const connection = await igeNetWebTransport(options.webTransport.url, { certHash: options.webTransport.certHash, WebTransport: Class, timeout: options.timeout });
			return { connection, transport: "webtransport" };
		} catch (error) {
			fallbackReason = (error as Error).message;
		}
	}
	const { igeNetWebSocketConnect } = await import("@/engine/network/transport/igeNetWebSocket");
	return { connection: await igeNetWebSocketConnect(options.webSocket, { WebSocket: options.WebSocket }), transport: "websocket", fallbackReason };
}
