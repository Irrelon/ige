# Zone servers

A world too big for one server is split into zones: a star system, a map region, a dungeon. Each zone is its own
process running an `IgeNetSyncHost` (see `realtime-sync.md`), started when a player needs it and stopped when it has
been empty a while. Players connect straight to the zone they're in. A small directory knows which zones are running
and where; game traffic never goes through it. A player leaving one zone for another gets the next zone's address
and a signed ticket, and their client moves over during the game's own transition (a jump, a loading screen).

The pieces live in `src/engine/network/zones/` (Node only, apart from the client side in `sync/`). Nothing in them
is game-specific: the game says where a player enters, what a zone simulates and what a ticket carries.

## How it fits together

```
           browser
     1. POST /enter { player, session } ──► directory (HTTP) ── launcher.start("valeria")
     2. { zone, url, ticket } ◄──────────      │   ▲                      │
     3. connect(url), join with the ticket ─► zone "valeria" ── registers, heartbeats
        ... the player flies off the edge ...  │
     4. zone event { url, ticket }  (the zone asked the directory to ensure "orhaan")
     5. client.transfer({ url, ticket }) ───► zone "orhaan"
                                               │
                         every zone ◄──── the game's own shared store (profiles, world state)
```

- **The directory** (`IgeZoneDirectory`) is the control plane, an HTTP service. Players `POST /enter`; the game's
  `resolveEntry` hook says which zone they're in, and the directory makes sure that zone is running and answers with
  its url and a ticket. Zones register when they're ready, send heartbeats with their player count, and ask the
  directory to ensure a zone when they hand a player on. A zone empty for `idleMs` is stopped; one that stops sending
  heartbeats is forgotten, and started again the next time someone needs it.
- **A launcher** (`IgeZoneLauncher`) starts and stops zone processes for the directory: `IgeChildProcessLauncher`
  (processes on one machine: development and small servers) or `IgeDockerLauncher` (containers). Kubernetes with
  Agones is planned behind the same interface. Every zone gets the same environment whichever starts it (see
  Reference).
- **The zone host** (`IgeZoneHost`) is a zone's side: it registers, sends heartbeats, starts other zones early
  (`ensure`), hands players on to them (`handoff`) and checks the tickets players arrive with (`acceptTicket`).
- **Tickets** (`signTicket` / `verifyTicket`) are HMAC-SHA256 signed with the secret the directory and zones share.
  Each names a player and a zone, expires (30 seconds by default) and is good for one join. `data` is the game's
  own, opaque to the engine: where the player arrives, their velocity. Anything bigger belongs in the game's store.
- **The client** (`IgeNetSyncClient`) joins with a ticket (`join([], ticket)`) and moves to another zone with
  `transfer({ url, ticket })`: it leaves the old zone, connects to the new one, joins with the ticket and starts
  afresh from its snapshots. `IgeNetSyncHost` lets ticket joins in through its `acceptTicket` option, whether the
  player is arriving from another zone or reconnecting to the one they were in.

A player belongs to one zone at a time. Keeping it that way is the game's job: save the player as they leave, and
load them as they arrive (a lock in the store, if two zones could ever race for one player).

Every process keeps its own memory, so anything a process caches about a player (a profile, an account) goes stale
the moment they move to another zone and it changes there. Read the store fresh where it matters: in the
directory's `resolveEntry`, and in a zone's `join`. Cache only what a zone owns while the player is in it.

## Wiring a game

The example in `src/examples/zones` is all of this in miniature: a directory, a zone script, a page and a headless
probe, two zones side by side.

### The directory

The directory takes `player` from the request as given, so `resolveEntry` must check it's really them. With a JWT
session signed by a sign-in service (EdDSA here: only that service holds the private key, and everything else
verifies with the public one), using the `jose` package (the game's dependency, not the engine's):

```typescript
import { importSPKI, jwtVerify } from "jose";
import { IgeChildProcessLauncher } from "@/engine/network/zones/IgeChildProcessLauncher";
import { IgeZoneDirectory } from "@/engine/network/zones/IgeZoneDirectory";

const sessionKey = await importSPKI(process.env.SESSION_PUBLIC_KEY!, "EdDSA");

const directory = new IgeZoneDirectory({
	launcher: new IgeChildProcessLauncher({ script: "dist/zone.js", ports: [8700, 8799] }),
	secret: process.env.ZONE_SECRET!,
	cors: ["https://play.example.com"],   // the game's page, if it's served from another origin
	resolveEntry: async (player, body) => {
		let account: string;
		try {
			const { payload } = await jwtVerify(String(body.session ?? ""), sessionKey, {
				algorithms: ["EdDSA"], issuer: "https://auth.example.com", audience: "game"
			});
			account = String(payload.sub);
		} catch {
			return "Please sign in again.";   // a string turns them away (HTTP 403, { error })
		}
		const pilot = await store.pilot(player);
		if (!pilot || pilot.account !== account) return "That isn't one of your pilots.";
		return { zone: pilot.zone, data: { resume: true } };   // where they were, from the game's store
	}
});
directory.on("lost", (zone, why) => log(`zone ${zone} lost (${why})`));
await directory.listen(8690, "0.0.0.0");
```

- Send the session in the request body, not the url (urls end up in logs).
- `body` is the whole `/enter` request, so the game can send anything else it needs (a chosen pilot, a party).
- The directory keeps no record of who is where: `resolveEntry` reads it from the game's store. That's also what
  makes reconnecting work (below).

#### The game's own routes

The directory owns its HTTP server, but the game can add routes to it with `route`: the sign-in service, say, so
players sign in and enter at one address. It's called first for every request outside `/zones` (the control plane,
which is always the directory's own), and returns true once it has answered:

```typescript
const auth = new Auth({ ... });   // the game's sign-in: /auth/start, /auth/callback, /auth/me...

const directory = new IgeZoneDirectory({
	...,
	cors: ["https://play.example.com"],
	route: (req, res) => auth.handle(req, res),   // true: answered; false: the directory's (/enter, or a 404)
	resolveEntry: async (player, body) => auth.entry(player, body)
});
```

- Return false without reading the request's body, or the directory won't be able to read it for `/enter`.
- Pages the `cors` option allows get CORS headers before `route` is called (the route may set its own, which
  replace them), and a preflight (`OPTIONS`) the route leaves is answered for it.
- An error the route throws comes back as `{ error }` with a 500 (or an `IgeZoneError`'s status).

### The zone script

A zone is an `IgeNetSyncHost` on a WebSocket server, with an `IgeZoneHost` beside it. Everyone joins on a ticket:
from the directory (entering, or reconnecting) or from the zone next door.

```typescript
import http from "node:http";
import { IgeNetSyncHost } from "@/engine/network/sync/IgeNetSyncHost";
import { IgeNetWebSocketServer } from "@/engine/network/sync/IgeNetWebSocketServer";
import { IgeZoneHost } from "@/engine/network/zones/IgeZoneHost";
import type { IgeZoneTicket } from "@/engine/network/zones/igeZoneTicket";

const zone = IgeZoneHost.fromEnv({ players: () => world.playerCount() });   // ZONE_ID, ZONE_URL, DIRECTORY_URL, ZONE_SECRET
const world = await loadZone(zone.zone);                                     // the game's saved state for this zone
const server = http.createServer();
const sockets = new IgeNetWebSocketServer(server);

const host = new IgeNetSyncHost<PadInput>(sockets.listen("/sync"), {
	acceptTicket: (token) => zone.acceptTicket(token),   // signed, unexpired, for this zone, not used before
	join: async (machine, players, ticket) => {   // may be async: welcomed once it resolves
		if (!ticket) return "Enter through the directory.";
		const { player, data } = ticket as IgeZoneTicket;
		const saved = await store.loadPilot(player);   // fresh from the store, never a cached copy
		if (!saved) return "No such pilot.";
		// Reconnecting while their old connection lingers: replace it (its leave runs first)
		const old = host.machines().find((m) => m.players.includes(player));
		if (old) host.disconnect(old);
		world.arrive(player, saved, data);   // place them where the ticket says
		return [player];
	},
	leave: (machine) => machine.players.forEach((id) => world.depart(id)),   // save them
	step: (dt, tick, inputs) => world.step(dt, inputs),
	snapshot: (machine) => world.visibleTo(machine.players),
	info: () => ({ zone: zone.zone })
});

server.listen(Number(process.env.PORT), "0.0.0.0", async () => {
	host.start();
	await zone.start();   // register once players can connect; heartbeats follow
});

process.on("SIGTERM", async () => {   // the directory stopping an idle zone
	zone.stop();
	await world.save();
	host.destroy();
	process.exit(0);
});
```

- `join` may return a Promise, so the zone loads the player from the store itself and tickets stay small (who,
  and where they arrive). The machine is welcomed once it resolves; one that disconnects meanwhile is seen out
  through `leave`. If it throws, the machine is told only that it couldn't join, and the host emits `"joinFailed"`
  (error) for the logs; return a string to give the player a reason.
- A zone is stopped with SIGTERM once it has been empty for `idleMs` (60 seconds by default). The child process
  launcher sends SIGKILL if it hasn't exited within `stopTimeout` (5 seconds), so save promptly.
- A zone that crashes is forgotten (`"lost"`, `"exit"`) and restarted the next time someone needs it, from whatever
  the game last saved.
- `zone.on("heartbeatFailed", ...)` reports a directory it can't reach. Heartbeats carry the zone's url, so a
  directory that restarts takes running zones back as their next heartbeats arrive.

### Leaving an area: handoff

When a player leaves the zone (through a gate, off the map's edge), the zone hands them on:

```typescript
async function leaveFor (player: string, next: string, arrival: { x: number; z: number; vx: number; vz: number }) {
	world.freeze(player);                                          // no more moves here
	await world.savePlayer(player);                                // the next zone loads them from the store
	try {
		const { url, ticket } = await zone.handoff(player, next, arrival);   // starts `next` if need be
		const machine = host.machines().find((m) => m.players.includes(player));
		if (machine) host.event({ t: "zoneTransfer", url, ticket }, machine);
	} catch (error) {
		world.unfreeze(player);                                    // the next zone wouldn't start: stay here
	}
}
```

- `handoff` asks the directory to ensure the next zone (starting it and waiting for it to register: a cold start
  can take a second or two) and signs a ticket into it carrying `arrival`.
- Start the next zone early so the handoff doesn't wait: `zone.ensure(next)` as the player nears the way in (a
  gate's range, a level's exit). A zone started that way and never entered stops after `idleMs` like any other.
- The player leaves this zone when their client moves (its leave hook runs as the old connection closes).

### The client

```typescript
const entry = await (await fetch(`${directoryUrl}/enter`, {
	method: "POST", headers: { "content-type": "application/json" },
	body: JSON.stringify({ player: "Ann", session })
})).json();                                                       // { zone, url, ticket } or { error }

const client = new IgeNetSyncClient<PadInput>(await igeNetWebSocketConnect(entry.url));
await client.join([], entry.ticket);

client.on("event", (data) => {
	if (data.t === "zoneTransfer") client.transfer({ url: data.url, ticket: data.ticket });
});
client.on("transfer", () => showJump());                         // from here...
client.on("snapshot", () => { if (!client.transferring) hideJump(); });   // ...to the new zone's first snapshot
client.on("transferFailed", () => reconnect());                  // enter again through the directory
```

- `transfer()` drops the old zone's snapshots, the inputs it hadn't applied, the clock and prediction, and keeps the
  machine's local players in their slots (the new zone gives their ids in its welcome).
- Don't send inputs while `client.transferring`.

### Reconnecting

A player whose connection drops enters again: `POST /enter` with the same session. `resolveEntry` reads the zone
they're in from the store, the directory starts it if it has stopped in the meantime, and the player joins on a
fresh ticket with a new `IgeNetSyncClient`:

```typescript
async function reconnect () {
	const entry = await enter();   // as above
	client = new IgeNetSyncClient<PadInput>(await igeNetWebSocketConnect(entry.url));
	listen(client);                // its handlers, as for the first one
	await client.join([], entry.ticket);
}
client.on("disconnected", () => reconnect());
```

The zone can't tell a reconnect from an arrival, and doesn't need to: its join loads the player from the store. If
the old connection hasn't closed yet (a dropped network takes a while to notice), `host.disconnect(old)` in join
replaces it, as in the zone script above. Anything the game keeps across a disconnect (a fight in progress) lives
in the store with the player, so it's there however long they were away, and whichever process runs the zone now.

### Layers: busy zones split, quiet ones merge

A zone that gets crowded can run as several copies of itself ("layers"), each its own zone process with its own
players. Turn it on with the directory's `layers` option:

```typescript
const directory = new IgeZoneDirectory({
	launcher, secret,
	layers: { capacity: 60, mergeBelow: 0.5 },
	// Who a player should be put with (friends, party, guild), by the names zones report
	resolveEntry: async (player) => ({ zone: await savedZone(player), companions: await friendsOf(player) })
});
```

A layer's zone id is the zone's with its number after `--` (`valeria--2`); layer 0 is the zone itself, so with
nobody about there are no layer ids at all. `igeZoneLayer(zone)` splits one into `{ base, layer }` (the game
simulates `base`), `igeLayerZone(base, n)` makes one.

- **Placing.** `/enter` (and a handoff with `{ place: true }`) puts a player into the layer most of their
  `companions` are in, full or not; else the fullest one with room; else a new layer (the lowest number free, and
  a `"layer"` event). The place is held for `reserveMs` until the zone's heartbeats count them, so a rush of
  arrivals doesn't overfill one. An entry with `exact: true` (a zone that still has the player: a reconnect)
  isn't placed.
- **Who's where.** Give the zone host `who: () => names` and its heartbeats say who's in it.
- **Handing on.** `zone.handoff(player, toZone, data, { place: true, companions })` lets the directory choose the
  layer (the result's `zone` is the one chosen); without `place`, the exact zone: a hop to a friend's layer.
- **Merging.** Each check, of a zone's running layers, the highest-numbered one with players is merged into the
  fullest other they'd both fit in under `capacity × mergeBelow`. The directory answers that layer's next heartbeat
  with `drain`; its zone host emits `"drain"` (the target zone) and the game hands everyone there (a layer hop, as
  above). Nobody's placed in a draining layer, and once it's empty it stops (`"stop"`, `"merged"`).

## Running locally

### Child processes

`IgeChildProcessLauncher` runs each zone as `node <script>` on this machine, on a free port from `ports`, with its
output in the directory's log (prefixed `[zone <id>]`). The zone script listens on `PORT`; the url it registers is
`ws://127.0.0.1:<port>/sync` unless `host` or `urlTemplate` say otherwise.

```typescript
new IgeChildProcessLauncher({
	script: "dist/zone.js",
	ports: [8700, 8799],
	// TypeScript straight from src instead of a bundle (development):
	// script: "src/server/zone.ts",
	// args: ["--experimental-transform-types", "--import", "./src/server/register.mjs"]
});
```

The example runs that way, from the repository root:

```
node --experimental-transform-types --import ./src/examples/zones/server/register.mjs src/examples/zones/server/directory.ts
node --experimental-transform-types --import ./src/examples/zones/server/register.mjs src/examples/zones/server/probe.ts
```

The directory listens on 8810, and zones on the nine ports after it (`DIRECTORY_PORT` moves them; the probe takes
the directory's url as its argument). The probe enters, flies east into the other zone and back again, and exits 0.
The page (`dist/esm/examples/zones/index.html` once the examples are built; `?directory=<url>` for another directory)
does the same with the arrow keys, WASD or a pad's left stick. `src/examples/zones/server/register.mjs` is the
loader that lets Node run the engine's TypeScript (`@/` paths, imports without extensions); production zones are
bundled JavaScript.

### Docker

`IgeDockerLauncher` runs each zone as a container of the game's image (`docker run -d --rm`, named
`ige-zone-<zone>`, that name also its alias on `network`) and stops it with `docker stop`. One image can run either
the directory or a zone, chosen by its command or environment. Zones listen on `port` (8080) inside their
containers.

With the directory on the host and the zones' ports published (no proxy):

```typescript
new IgeZoneDirectory({
	launcher: new IgeDockerLauncher({ image: "mygame", publish: [8700, 8799] }),   // ws://localhost:<port>/sync
	directoryUrl: "http://host.docker.internal:8690",   // how zones in containers reach the directory
	...
});
await directory.listen(8690, "0.0.0.0");
```

With everything in containers (docker-compose), the directory needs the Docker CLI and the host's socket to start
its sibling containers, and zones reach it by its service name:

```yaml
services:
  directory:
    image: mygame
    command: ["node", "dist/directory.js"]
    environment: [ZONE_SECRET, SESSION_PUBLIC_KEY]
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    ports: ["8690:8690"]
networks:
  default:
    name: mygame
```

```typescript
new IgeDockerLauncher({ image: "mygame", network: "mygame", publish: [8700, 8799] });
// directoryUrl: "http://directory:8690"
```

A TLS proxy on the same network (below) gives local `wss://` without publishing ports.

## Production

- **`wss://` for every zone.** A page served over https can only open `wss://` sockets, so each zone gets its own
  hostname under one domain: `urlTemplate: "wss://{zone}.zones.example.com/sync"`. Point wildcard DNS
  (`*.zones.example.com`) at a TLS edge (Caddy, Traefik, nginx) holding a wildcard certificate (Let's Encrypt issues
  those through the DNS-01 challenge), and have it route each hostname to the zone's container,
  `ige-zone-<zone>:8080`, on the private network. Zone ids become hostnames, which is why they're limited to letters,
  digits, `-` and `_`.
- **The directory** gets an https hostname of its own. Only `POST /enter` (and the game's routes) need to be
  public; keep `/zones/*` and `GET /zones` on the private network (they need the secret anyway). Sign-in providers
  call back to the game's routes there, so register the directory's public address with them. Set `cors` to the game's page origins. One
  directory is enough: it restarts safely, since running zones re-register through their heartbeats, but nobody can
  enter while it's down, so run it under a supervisor.
- **Secrets come from the environment**, never the image, a url or a log. `ZONE_SECRET` (32 random bytes or more) is
  shared by the directory and every zone; the directory passes it to the zones it starts. The session's public key
  is only needed by the directory (and anything else that checks sessions). Rotating `ZONE_SECRET` means restarting
  the directory and the zones together; tickets live 30 seconds, so little is lost.
- **One zone, one process.** Node runs a zone on one thread, so size zones (and their tick rates) to what a core
  can simulate; split a crowded zone rather than growing it.
- **Kubernetes + Agones (planned).** A launcher implementing `IgeZoneLauncher` would allocate a GameServer from a
  fleet for `start` (labelled with the zone) and shut it down for `stop`, with zones reached through the same
  per-zone hostnames. The directory, tickets and zone hosts stay as they are.

## Reference

Zone environment (set by every launcher):

| Variable | |
|---|---|
| `ZONE_ID` | the zone this process is |
| `PORT` | the port to listen on |
| `ZONE_URL` | where clients reach it (what it registers) |
| `DIRECTORY_URL` | the directory (register, heartbeats, ensure); the directory's `directoryUrl`, or its own address |
| `ZONE_SECRET` | tickets and the directory's `/zones` routes |

Directory HTTP (JSON; errors are `{ error }` with a 400, 401, 403, 404 or 500):

| Route | Who | |
|---|---|---|
| `POST /enter { player, ... }` | players | `resolveEntry`, the zone started if need be → `{ zone, url, ticket }` |
| `POST /zones/ensure { zone, place?, player?, companions? }` | zones (handoff) | started and registered → `{ url, zone }` (`place`: into a layer) |
| `POST /zones/register { zone, url }` | zones | ready for players |
| `POST /zones/heartbeat { zone, players, url?, who? }` | zones | alive, how many are in it (and who) → `{ ok, drain? }` |
| `GET /zones` | operators | every zone's state, url, players and times |
| anything else | players | the game's `route`, if it answers (else a 404) |

The `/zones` routes need `Authorization: Bearer <ZONE_SECRET>`, and get no CORS headers.

Defaults: heartbeats every 5 s (`heartbeatMs`), a zone forgotten after 15 s without one (`heartbeatTimeoutMs`),
stopped after 60 s empty (`idleMs`), 20 s to register after starting (`startTimeoutMs`), tickets good for 30 s
(`ticketTtl`).

Events:

- `IgeZoneDirectory`: `"start"` (zone), `"ready"` (record), `"stop"` (zone, `"idle"`, `"merged"` or `"shutdown"`),
  `"lost"` (zone, `"heartbeat"` or `"exit"`), `"enter"` (player, zone), `"layer"` (a new layer's zone), `"drain"`
  (zone, into).
- `IgeZoneHost`: `"registered"`, `"heartbeatFailed"` (error), `"handoff"` (player, zone), `"drain"` (zone).
- `IgeNetSyncHost`: `"join"` (machine), `"leave"` (machine), `"joinFailed"` (error: the game's `join` or
  `acceptTicket` threw).
- `IgeNetSyncClient`: `"transfer"` ({ url }), `"transferred"` (welcome), `"transferFailed"` (error), as well as its
  usual events.
