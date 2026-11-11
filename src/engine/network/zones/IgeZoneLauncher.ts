/**
 * Starts and stops zone processes (Node only), for IgeZoneDirectory. A
 * zone is a game server for one part of the world (a star system, a
 * level, a dungeon) that runs only while someone needs it.
 *
 * Implementations: IgeChildProcessLauncher (processes on this machine:
 * development and small servers), IgeDockerLauncher (containers), and
 * later Kubernetes + Agones (a GameServer allocated from a fleet). Every
 * zone gets the same environment, whichever starts it:
 *
 * - `ZONE_ID`: the zone it is;
 * - `PORT`: the port to listen on;
 * - `ZONE_URL`: where clients reach it (what it registers);
 * - `DIRECTORY_URL`: where the directory is (register, heartbeat, ensure);
 * - `ZONE_SECRET`: the shared secret for tickets and the directory;
 * - plus whatever the directory passes (`env`).
 */
export interface IgeZoneLauncher {
	/** Starts a zone; resolves with the url clients will connect to (it registers once it's ready). */
	start (zone: string, env: Record<string, string>): Promise<{ url: string }>;
	/** Stops a zone (and waits until it has). */
	stop (zone: string): Promise<void>;
	/** Called when a zone's process ends by itself (crashed, or quit): the directory forgets it. */
	onExit? (listener: (zone: string, code: number | null) => void): void;
}

/** Zone ids launchers accept: letters, digits, `-` and `_`, up to 64 (they become process names and hostnames). */
export function igeZoneIdValid (zone: string): boolean {
	return typeof zone === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(zone);
}
