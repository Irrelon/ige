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
- Numbers and numeric arrays blend linearly; mark angles with `blend: { facing: "angle" }` and fields that must not
  blend with `"none"`.
- Inputs are sent unreliably with the last few frames repeated (`inputRedundancy`), so lost packets cost nothing.
- `rtt` and `serverTick()` give the round-trip time and the authority's clock.
