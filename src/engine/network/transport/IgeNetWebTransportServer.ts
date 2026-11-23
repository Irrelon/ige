import { readFileSync } from "node:fs";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/transport/IgeNetTransport";
import { igeNetCertHash, igeNetSelfSignedCert } from "@/engine/network/transport/igeNetSelfSignedCert";
import { igeNetWtConnection } from "@/engine/network/transport/igeNetWebTransport";

export interface IgeNetWebTransportServerOptions {
	/** UDP port to listen on (0: any free one; `address()` says which). */
	port: number;
	/** Address to listen on (default "0.0.0.0"). */
	host?: string;
	/** Path sessions connect to (default "/sync"). */
	path?: string;
	/** Certificate and key as PEM text, or files holding them (production: a real certificate). Without them a short-lived self-signed one is made. */
	cert?: string;
	privKey?: string;
	certFile?: string;
	keyFile?: string;
	/** Secret for QUIC's stateless tokens (default: random per start). */
	secret?: string;
	/** Name on a self-signed certificate. */
	certName?: string;
	/** How to import the library (default: a native dynamic import; tests under jest pass their own). */
	load?: IgeNetImporter;
}

/** How to import a package: the library is ESM-only, so a CommonJS build needs a real dynamic import. */
export type IgeNetImporter = (name: string) => Promise<any>;

const nativeImport: IgeNetImporter = (name) => {
	try {
		return (new Function("n", "return import(n)") as IgeNetImporter)(name);
	} catch {
		return import(/* webpackIgnore: true */ name);
	}
};

/** Loaded on demand: the library is an optional peer dependency, and Node-only. */
async function loadLibrary (load: IgeNetImporter = nativeImport): Promise<any> {
	const name = "@fails-components/webtransport";
	try {
		const lib = await load(name);
		await lib.quicheLoaded;
		return lib;
	} catch (error) {
		throw new Error(`WebTransport needs the optional packages @fails-components/webtransport and @fails-components/webtransport-transport-http3-quiche (${(error as Error).message})`);
	}
}

/** The library's WebTransport client class (Node), for tests and Node clients. */
export async function igeNetNodeWebTransport (load?: IgeNetImporter): Promise<new (url: string, options?: Record<string, unknown>) => any> {
	return (await loadLibrary(load)).WebTransport;
}

/**
 * The server side of the WebTransport transport (Node, UDP): an IgeNetListener whose connections
 * send unreliable binary messages as datagrams and everything else on one reliable stream (see
 * igeNetWebTransport.ts). Uses the optional peer packages @fails-components/webtransport and
 * @fails-components/webtransport-transport-http3-quiche (a C++ binding to libquiche; prebuilt for
 * Linux, macOS and Windows) and accepts both the current and the legacy WebTransport protocol
 * token the browsers send.
 *
 * Browsers only trust a certificate from a real authority, or one whose hash they're given: without
 * `cert`/`privKey` (or files) it makes a self-signed certificate valid for 13 days and `certHash`
 * is what clients pin (igeNetWebTransport's `certHash`).
 * @example #Beside a WebSocket server
 *     const wt = new IgeNetWebTransportServer({ port: 8670 });
 *     await wt.start();
 *     const host = new IgeNetReplicationHost(igeNetMergeListeners(sockets.listen("/sync"), wt), { ... });
 *     // tell clients { url: "https://my-host:8670/sync", certHash: wt.certHash }
 */
export class IgeNetWebTransportServer implements IgeNetListener {
	/** Hex SHA-256 of the certificate when it's self-signed (undefined for real certificate files). */
	certHash?: string;
	/** When a self-signed certificate stops being valid. */
	certExpires?: Date;
	readonly path: string;
	_options: IgeNetWebTransportServerOptions;
	_onConnection?: (connection: IgeNetConnection) => void;
	_server?: any;
	_sessions = new Set<any>();
	_closed = false;
	_sessionsClosing = false;

	constructor (options: IgeNetWebTransportServerOptions) {
		this._options = options;
		this.path = options.path ?? "/sync";
	}

	onConnection (listener: (connection: IgeNetConnection) => void): void {
		this._onConnection = listener;
	}

	/** Start listening; resolves once the UDP port is bound. */
	async start (): Promise<this> {
		const lib = await loadLibrary(this._options.load);
		const options = this._options;
		let cert = options.cert ?? (options.certFile ? readFileSync(options.certFile, "utf8") : undefined);
		let privKey = options.privKey ?? (options.keyFile ? readFileSync(options.keyFile, "utf8") : undefined);
		if (!cert || !privKey) {
			const made = igeNetSelfSignedCert({ name: options.certName });
			cert = made.cert;
			privKey = made.privKey;
			this.certHash = made.hash;
			this.certExpires = made.expires;
		} else {
			this.certHash = undefined;
			try {
				igeNetCertHash(cert);
			} catch {
				// Not a certificate we can read: the library will say
			}
		}
		const server = new lib.Http3Server({ port: options.port, host: options.host ?? "0.0.0.0", secret: options.secret ?? Math.random().toString(36).slice(2), cert, privKey });
		this._server = server;
		const sessions = await server.sessionStream(this.path);
		server.startServer();
		await server.ready;
		this._accept(sessions.getReader());
		return this;
	}

	/** The address it listens on ({ port, host }), once started. */
	address (): { port: number; host: string } | undefined {
		return this._server?.address();
	}

	async _accept (reader: ReadableStreamDefaultReader<any>): Promise<void> {
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) return;
				this._session(value).catch(() => {});
			}
		} catch {
			// The server stopped
		}
	}

	async _session (session: any): Promise<void> {
		await session.ready;
		this._sessions.add(session);
		const streams = session.incomingBidirectionalStreams.getReader();
		const { value: stream, done } = await streams.read();
		if (done || !stream || this._closed) {
			session.close?.();
			return;
		}
		streams.releaseLock();
		const connection = igeNetWtConnection(session, stream, () => {});
		connection.onClose(() => this._sessions.delete(session));
		if (!this._onConnection) {
			connection.close();
			return;
		}
		// Answer the client's hello so it knows the stream is through, then hand the connection over
		connection.sendHello();
		this._onConnection(connection);
	}

	close (): void {
		this._closed = true;
		this._onConnection = undefined;
		this._sessionsClosing = this._sessions.size > 0;
		for (const session of this._sessions) {
			try {
				session.close({ closeCode: 0, reason: "server closing" });
			} catch {
				// Gone already
			}
		}
		this._sessions.clear();
		// Stopping the native server while its sessions are still closing can crash it: give them a moment
		const server = this._server;
		this._server = undefined;
		if (!server) return;
		const stop = () => {
			try {
				server.stopServer();
			} catch {
				// Not running
			}
		};
		if (this._sessionsClosing) setTimeout(stop, 300).unref();
		else stop();
	}
}

