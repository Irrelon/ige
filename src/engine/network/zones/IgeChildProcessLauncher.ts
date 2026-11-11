import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { igeZoneIdValid, type IgeZoneLauncher } from "@/engine/network/zones/IgeZoneLauncher";

export interface IgeChildProcessLauncherOptions {
	/** The zone's script (run as `command ...args script`). */
	script: string;
	/** What runs it (default this Node) and the arguments before the script (a TypeScript loader, say). */
	command?: string;
	args?: string[];
	/** The host zones listen on and clients reach them at (default 127.0.0.1), and the ports to use, [from, to] inclusive. */
	host?: string;
	ports: [number, number];
	/** The url clients connect to (default `ws://host:port/sync`); a template for TLS behind a proxy: `wss://{zone}.zones.example.com/sync`. */
	urlTemplate?: string;
	/** Extra environment for every zone, and the working directory. */
	env?: Record<string, string>;
	cwd?: string;
	/** The zones' output (default: prefixed lines on this process's console; false: none). */
	log?: ((zone: string, line: string) => void) | false;
	/** How long a zone gets to stop before it's killed (ms, default 5000). */
	stopTimeout?: number;
}

interface Running {
	child: ChildProcess;
	port: number;
	stopping: boolean;
}

/**
 * Zones as child processes on this machine (development, and small
 * servers): each zone is `node <script>` (or `command ...args script`) on
 * a port from the range, with the zone environment (IgeZoneLauncher).
 *
 *     const launcher = new IgeChildProcessLauncher({ script: "dist/zone.js", ports: [8700, 8799] });
 */
export class IgeChildProcessLauncher implements IgeZoneLauncher {
	_options: IgeChildProcessLauncherOptions;
	_running = new Map<string, Running>();
	_exitListeners: ((zone: string, code: number | null) => void)[] = [];

	constructor (options: IgeChildProcessLauncherOptions) {
		this._options = options;
	}

	onExit (listener: (zone: string, code: number | null) => void): void {
		this._exitListeners.push(listener);
	}

	/** The url a zone on a port is reached at. */
	urlFor (zone: string, port: number): string {
		const host = this._options.host ?? "127.0.0.1";
		const template = this._options.urlTemplate ?? "ws://{host}:{port}/sync";
		return template.replace(/\{zone\}/g, zone).replace(/\{host\}/g, host).replace(/\{port\}/g, String(port));
	}

	async start (zone: string, env: Record<string, string>): Promise<{ url: string }> {
		if (!igeZoneIdValid(zone)) throw new Error(`Not a zone id: ${zone}`);
		const was = this._running.get(zone);
		if (was && !was.stopping) return { url: this.urlFor(zone, was.port) };
		const port = await this._freePort();
		const url = this.urlFor(zone, port);
		const o = this._options;
		const child = spawn(o.command ?? process.execPath, [...(o.args ?? []), o.script], {
			cwd: o.cwd,
			env: { ...process.env, ...o.env, ...env, ZONE_ID: zone, PORT: String(port), ZONE_URL: url },
			stdio: ["ignore", "pipe", "pipe"]
		});
		const running: Running = { child, port, stopping: false };
		this._running.set(zone, running);
		const log = o.log === false ? undefined : o.log ?? ((z: string, line: string) => console.log(`[zone ${z}] ${line}`));
		const lines = (data: Buffer) => {
			if (!log) return;
			for (const line of data.toString().split(/\r?\n/)) if (line.trim()) log(zone, line);
		};
		child.stdout?.on("data", lines);
		child.stderr?.on("data", lines);
		child.on("exit", (code) => {
			if (this._running.get(zone) === running) this._running.delete(zone);
			if (!running.stopping) for (const fn of this._exitListeners) fn(zone, code);
		});
		return { url };
	}

	async stop (zone: string): Promise<void> {
		const running = this._running.get(zone);
		if (!running) return;
		running.stopping = true;
		const child = running.child;
		if (child.exitCode !== null || child.signalCode !== null) {
			this._running.delete(zone);
			return;
		}
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => child.kill("SIGKILL"), this._options.stopTimeout ?? 5000);
			child.once("exit", () => {
				clearTimeout(timer);
				resolve();
			});
			child.kill("SIGTERM");
		});
		this._running.delete(zone);
	}

	/** Stops every zone (shutting down). */
	async stopAll (): Promise<void> {
		await Promise.all([...this._running.keys()].map((zone) => this.stop(zone)));
	}

	/** A port in the range that nothing (ours or anyone's) is listening on. */
	async _freePort (): Promise<number> {
		const [from, to] = this._options.ports;
		const ours = new Set([...this._running.values()].map((r) => r.port));
		for (let port = from; port <= to; port++) {
			if (ours.has(port)) continue;
			if (await portFree(port, this._options.host ?? "127.0.0.1")) return port;
		}
		throw new Error(`No free port for a zone between ${from} and ${to}`);
	}
}

function portFree (port: number, host: string): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer();
		server.once("error", () => resolve(false));
		server.listen(port, host, () => server.close(() => resolve(true)));
	});
}
