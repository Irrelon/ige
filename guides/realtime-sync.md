# Real-time multiplayer with IgeNetSyncHost and IgeNetSyncClient

For action games (as opposed to the turn-based games `IgeRoomServer` suits): one authority runs the simulation at a
fixed tick rate, every machine sends its local players' inputs each tick, and the authority sends snapshots of the
world back. Machines predict their own players so controls respond instantly, and draw everything else slightly in
the past, smoothly interpolated. Nothing here is game-specific: the game supplies its own players, inputs, rules
and entity fields through hooks.

The authority can run anywhere: in the browser that hosts a game (or offline, for local split-screen play), or in
Node as a dedicated server. Machines connect through a transport. `igeNetLoopback()` keeps everything in one page
(and simulates latency, jitter and loss for tests); network transports have the same shape (`IgeNetConnection`,
`IgeNetListener`).

## The authority

```typescript
import { IgeNetSyncHost } from "@/engine/network/sync/IgeNetSyncHost";

const host = new IgeNetSyncHost<PadInput>(listener, {
	tickRate: 30,         // simulation steps per second
	snapshotRate: 20,     // snapshots per second to each machine
	join: (machine, players) => players.map((p, slot) => game.addPlayer(`${machine.id}.${slot}`, p)), // ids, or an error string
	leave: (machine) => machine.players.forEach((id) => game.removePlayer(id)),
	step: (dt, tick, inputs) => game.step(dt, inputs),         // inputs: Map of player id to this step's input
	snapshot: (machine) => game.visibleTo(machine.players),     // { id: { x, z, facing, anim, hp } }
	info: () => ({ seed: game.seed })                           // sent with the welcome
});
host.start();                      // its own timer (servers); or host.update(ms) from a frame loop
host.event({ type: "death", id, impulse: [x, y, z] });   // reliable, to every machine (or pass one)
```

- Each player's inputs are queued and applied one per step; while none has arrived, the last one is held.
- Snapshots are deltas against the last one the machine acknowledged: unchanged entities and fields aren't sent.
  Keep an entity's field names the same from snapshot to snapshot (use `null` rather than leaving a field out).
- Return only what's near a machine's players from `snapshot()` to save bandwidth (interest management).

## A machine

```typescript
import { IgeNetSyncClient } from "@/engine/network/sync/IgeNetSyncClient";

const client = new IgeNetSyncClient<PadInput>(connection, { interpolationDelay: 100, blend: { facing: "angle" } });
const welcome = await client.join([{ name: "Ann" }, { name: "Bob" }]); // two local players (split screen)

// Every tick (tickRate times a second): one input per local player, in slot order
client.sendInput([readPad(0), readPad(1)]);

// Every frame
const world = client.interpolated();                         // everyone, ~100 ms ago, blended
const me = client.predict(welcome.players[0], 0, moveRule);   // my player now: snapshot + unapplied inputs replayed
client.on("event", (data) => effects.play(data));
```

- `predict()` replays the inputs the authority hasn't applied yet through the game's own movement rule (the same
  function the authority uses), so a player responds the moment the stick moves and agrees with the authority when
  snapshots arrive. Blend any small correction smoothly in the game.
- Prediction moves a tick at a time, so a player drawn at it every frame steps (at 30 ticks a second on a 60 Hz
  screen they move every other frame, and a camera following them makes the whole world judder). Pass how far the
  frame is into the next tick, and the player is drawn between their last two ticks, at most a tick behind:
  `client.predict(id, slot, moveRule, { between: accumulator / tickLength })`. Snap rather than blend after a
  teleport (compare with the unblended prediction).
- `interpolated()` returns a new map each time: put your predicted players in it, but replace their states rather
  than changing them (they may be the client's own copies, which later snapshots are built on).
- Numbers and numeric arrays blend linearly; mark angles with `blend: { facing: "angle" }` and fields that must not
  blend with `"none"`.
- Inputs are sent unreliably with the last few frames repeated (`inputRedundancy`), so lost packets cost nothing.
- `rtt` and `serverTick()` give the round-trip time and the authority's clock.

## Transports

- `igeNetLoopback({ latency, jitter, loss })`: the authority and its machines in one page (offline and local
  split-screen play), or tests with a simulated network.
- `igeNetSyncServerTransport(network)` / `igeNetSyncClientTransport(network)`: over IGE's own IgeNetIo WebSockets,
  for a dedicated Node server:

```typescript
// Server (Node)
ige.init();
const network = ige.network as IgeNetIoServerController;
await network.start(8660);
const host = new IgeNetSyncHost(igeNetSyncServerTransport(network), { ... });
network.acceptConnections(true);
host.start();

// Browser
await (ige.network as IgeNetIoClientController).start("ws://my-server:8660");
const client = new IgeNetSyncClient(igeNetSyncClientTransport(ige.network));
```

- Plain WebSockets (JSON messages), with the server side on an HTTP server of your own
  (`IgeNetWebSocketServer`, Node). One path can run an authority on the server (a dedicated server), another can
  relay games hosted in players' browsers: the host gets a short join code, and machines joining with it have their
  messages passed to the host and back, so nobody needs an open port.

```typescript
// Server (Node): a dedicated game on /sync, and a relay for browser-hosted games on /relay
const server = http.createServer();
const sockets = new IgeNetWebSocketServer(server);
const host = new IgeNetSyncHost(sockets.listen("/sync"), { ... });
sockets.relay("/relay");
server.listen(8670);
host.start();

// Browser: join the dedicated game
const client = new IgeNetSyncClient(await igeNetWebSocketConnect("ws://my-server:8670/sync"));

// Browser: host a game here (own players over a loopback, others through the relay)
const hosting = await igeNetRelayHost("ws://my-server:8670/relay");
const local = igeNetLoopback();
const host = new IgeNetSyncHost(igeNetMergeListeners(local.listener, hosting.listener), { ... });
const me = new IgeNetSyncClient(local.connect());
showJoinCode(hosting.code);

// Browser: join a friend's game by its code
const client = new IgeNetSyncClient(await igeNetRelayJoin("ws://my-server:8670/relay", "KX7QD"));
```

- Coming next: WebRTC data channels, so browsers connect directly (the relay then only introduces them).

