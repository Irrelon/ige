import { execFile } from "node:child_process";
import { igeZoneIdValid, type IgeZoneLauncher } from "@/engine/network/zones/IgeZoneLauncher";

export interface IgeDockerLauncherOptions {
	/** The image to run (one image runs the directory or a zone, by its environment). */
	image: string;
	/** The Docker network the zones join (the directory and Redis are on it too). */
	network?: string;
	/**
	 * Where clients reach a zone, `{zone}` replaced: `wss://{zone}.zones.example.com/sync`
	 * behind a TLS proxy with a wildcard certificate, or (default)
	 * `ws://localhost:{port}/sync` with ports published from `publish`.
	 */
	urlTemplate?: string;
	/** Publish each zone's port on the host from this range (local development, no proxy). */
	publish?: [number, number];
	/** The port zones listen on inside their containers (default 8080). */
	port?: number;
	/** Extra environment for every zone, and extra `docker run` arguments. */
	env?: Record<string, string>;
	runArgs?: string[];
	/** Container names: `{prefix}{zone}` (default "ige-zone-"). */
	prefix?: string;
	/** Runs docker (tests replace it). */
	exec?: (args: string[]) => Promise<string>;
}

/**
 * Zones as Docker containers: `docker run -d --rm` of the game's image
 * with the zone environment (IgeZoneLauncher), on a network shared with
 * the directory and Redis; `docker stop` to stop. In the cloud a TLS
 * proxy with a wildcard certificate gives each zone its own `wss://`
 * hostname (`urlTemplate`); locally, ports can be published instead.
 *
 *     new IgeDockerLauncher({ image: "starflight", network: "starflight", urlTemplate: "wss://{zone}.zones.example.com/sync" })
 */
export class IgeDockerLauncher implements IgeZoneLauncher {
	_options: IgeDockerLauncherOptions;
	/** The host port each zone was published on. */
	_published = new Map<string, number>();

	constructor (options: IgeDockerLauncherOptions) {
		this._options = options;
	}

	_name (zone: string): string {
		return `${this._options.prefix ?? "ige-zone-"}${zone}`;
	}

	_exec (args: string[]): Promise<string> {
		if (this._options.exec) return this._options.exec(args);
		return new Promise((resolve, reject) => execFile("docker", args, (error, stdout, stderr) => (error ? reject(new Error(stderr || error.message)) : resolve(stdout))));
	}

	/** The `docker run` arguments for a zone (for tests and logs). */
	runArgs (zone: string, env: Record<string, string>, hostPort?: number): { args: string[]; url: string } {
		const o = this._options;
		const port = o.port ?? 8080;
		const url = (o.urlTemplate ?? "ws://localhost:{port}/sync").replace(/\{zone\}/g, zone).replace(/\{port\}/g, String(hostPort ?? port));
		const all: Record<string, string> = { ...o.env, ...env, ZONE_ID: zone, PORT: String(port), ZONE_URL: url };
		const args = ["run", "-d", "--rm", "--name", this._name(zone)];
		if (o.network) args.push("--network", o.network, "--network-alias", this._name(zone));
		if (hostPort) args.push("-p", `${hostPort}:${port}`);
		for (const [key, value] of Object.entries(all)) args.push("-e", `${key}=${value}`);
		args.push(...(o.runArgs ?? []), o.image);
		return { args, url };
	}

	async start (zone: string, env: Record<string, string>): Promise<{ url: string }> {
		if (!igeZoneIdValid(zone)) throw new Error(`Not a zone id: ${zone}`);
		let hostPort: number | undefined;
		if (this._options.publish) {
			const [from, to] = this._options.publish;
			const used = new Set(this._published.values());
			for (let p = from; p <= to && hostPort === undefined; p++) if (!used.has(p)) hostPort = p;
			if (hostPort === undefined) throw new Error(`No free port for a zone between ${from} and ${to}`);
			this._published.set(zone, hostPort);
		}
		const { args, url } = this.runArgs(zone, env, hostPort);
		try {
			await this._exec(args);
		} catch (error) {
			this._published.delete(zone);
			throw error;
		}
		return { url };
	}

	async stop (zone: string): Promise<void> {
		this._published.delete(zone);
		try {
			await this._exec(["stop", this._name(zone)]);
		} catch {
			// Already gone
		}
	}
}
