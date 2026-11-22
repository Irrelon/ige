# Replication

`IgeNetReplicationHost` and `IgeNetReplicationClient` (`src/engine/network/replication/`) are the engine's real-time state replication. They do what `IgeNetSyncHost` / `IgeNetSyncClient` do (a fixed-rate authority, inputs from machines, prediction, interpolation, zone transfers) without the game handing the engine its whole world for every connection on every send. This is stage 1 of the one replication system IGE will use everywhere; the sync classes and `IgeObject` streaming stay as they are until games move over.

## Why it's cheaper

The sync host asks the game for a snapshot per machine, diffs every field of every entity against that machine's last acknowledged copy (JSON comparisons for objects) and deep-copies it all for next time: entities x connections of work, whatever changed. Replication turns that round:

- **Changes are found where they happen.** `obj.write({ x: 12 })` compares each field with the current value once (not per connection) and stamps what changed with the current epoch. Nothing is compared or copied per connection. An object nobody writes is never visited again after its create: a rock costs nothing per send.
- **Visibility is incremental.** Scopes, owners and reveals are applied when things are created, destroyed, subscribed or revealed, not rediscovered each send.
- **Encode once, share.** An update is encoded once per set of changed fields and the bytes are reused by every connection that needs them; only a small per-connection handle goes in front.
- **Compact binary.** No field names or ids on the wire after the create; numbers are quantised to the precision the schema declares; changed fields are named by a bit mask. Inputs are binary too.

## Use

```ts
const schemas = {
	ship: {
		x: { type: "number", precision: 0.1, group: "transform" },
		y: { type: "number", precision: 0.1, group: "transform" },
		heading: { type: "angle", bits: 9, group: "transform" },
		thrust: { type: "bool" },
		faction: { type: "enum", values: ["red", "blue"] },
		name: { type: "string" }
	},
	station: { name: { type: "string" }, market: { type: "json" } }
};
const inputSchema = { turn: { type: "number", precision: 0.01, min: -1, max: 1 }, thrust: { type: "bool" } };

// Server
const host = new IgeNetReplicationHost(sockets.listen("/game"), {
	schemas, inputSchema, tickRate: 30, sendRate: 30,
	join: (machine, players) => {
		machine.viewer.subscribe("sol");                       // see everything in the star system
		return players.map((p, i) => {
			const id = `${machine.id}.${i}`;
			host.replicator.create("ship", id, { name: p.name }, { scope: "sol" });
			host.replicator.create("cargo", `${id}.cargo`, {}, { owner: machine.viewer }); // private to this machine
			return id;
		});
	},
	leave: (machine) => machine.players.forEach((id) => host.replicator.destroy(id)),
	step: (dt, tick, inputs) => {
		inputs.forEach((input, id) => {
			const ship = host.replicator.get(id)!;
			ship.write({ heading: ship.get("heading") + input.turn * dt, thrust: input.thrust });
		});
	}
});
host.start();

// Client
const client = new IgeNetReplicationClient(await igeNetWebSocketConnect(url), { schemas, inputSchema });
const welcome = await client.join([{ name: "Ann" }]);
client.sendInput([{ turn: 0.5, thrust: true }]);               // every tick
const world = client.interpolated();                           // every frame: id -> fields, a little in the past
const me = client.predict(welcome.players[0], 0, (ship, input, dt) => stepShip(ship, input, dt), { between });
await client.transfer({ url: nextZoneUrl, ticket });           // zone handoff, as with IgeNetSyncClient
```

The schema set and the input schema must be the same on both ends (a hash is checked on join). Events (`host.event(data)` / client `"event"`) are reliable JSON.

### Fields

| type | notes |
|---|---|
| `number` | `precision`, optionally `min` and `max` (fixed bits for the range, clamped) |
| `int` | varint (zigzag when `signed`), or `min` and `max` for fixed bits |
| `bool` | one bit |
| `angle` | `bits` (default 10); blended the short way round |
| `enum` | `values: string[]`; as many bits as the list needs |
| `string` | UTF-8, length-prefixed |
| `float` | 32-bit float |
| `json` | any JSON value; compared as text only when written (or `obj.touch(field)` after changing it in place), sent whole when it changes |

Any field may be `optional: true` (a presence bit; `undefined` is a value), `group: "name"` (labels fields for later per-group rates), `blend: false` (steps instead of blending). A kind has at most 32 fields. Values read back from `obj.values` are the quantised ones the clients get, so the server and the clients agree exactly.

### Scopes, owners, reveals

- `create(kind, id, fields, { scope })`: seen by every viewer subscribed to the scope. `obj.moveTo(scope)` moves it.
- `{ owner: viewer }`: only that viewer sees it (a player's private state).
- `{ hidden: true }` with `viewer.reveal(obj)` / `viewer.hide(obj)`: a hidden station a pilot has charted. `hide` also hides a normal scope object from one viewer.
- `viewer.subscribe(scope)` / `unsubscribe(scope)`: creates and destroys go out for what appears and disappears.

### Reliable and lossy transports

`lossy: false` (the default, WebSocket): a send counts as delivered, nothing is resent. `lossy: true` (datagram channels, coming in stage 3): each object has a baseline the machine has acknowledged. Every packet carries a sequence number, the machine acks the newest seen plus 32 earlier as bits (riding on its input packets, so it must send inputs every tick), and an update carries everything changed since the acknowledged baseline, so any packet can be lost or arrive late. Creates and destroys repeat until acknowledged and a destroyed object's handle is not reused before. Tests run both modes over `igeNetLoopback({ latency, jitter, loss })`.

### Stats and debugging

`host.stats()`: totals, cache hits and misses (payloads encoded vs reused), time spent in sends, per-kind bytes, per-machine bytes and bytes/s; `host.replicator.rates()` is the last full second. `new IgeNetPacketInspector(schemas, inputSchema).describe(bytes)` turns a packet into JSON (feed it a connection's packets in order, from its first).

## Transports

`IgeNetConnection.send()` takes a JSON-able object or a `Uint8Array`; binary goes as a binary WebSocket frame (`igeNetWebSocketConnect`, `IgeNetWebSocketServer.listen`) or byte for byte over `igeNetLoopback`. Not yet carried: the browser-host relay (`igeNetRelayHost`/`Join`, throws) and the IgeNetIo adapter (`igeNetIoSyncTransport`).

## Measured

`NET_BENCH=1 npx jest src/tests/IgeNetBench.test.ts`: 140 static rocks, 5 stations with a 40-row market, N moving ships, N connections, 30 sends/s, old sync host against this (CPU ms per second of `update()` including the game's writes; bytes per connection per second).

| N | old CPU | new CPU | old bytes | new bytes |
|---|---|---|---|---|
| 10 | 87 | 2.9 | 46,299 | 4,955 |
| 50 | 524 | 21 | 222,910 | 21,023 |
| 100 | 1,273 | 66 | 443,733 | 40,921 |
| 200 | 3,527 | 245 | 888,340 | 81,201 |

Still entities x connections once everything moves every tick (every ship is in every packet), but each is a few bytes copied, not a diff and a copy. Stage 2 cuts that count.

## Coming

- **Stage 2, relevance and budgets:** a spatial grid within a scope ("detail near, blips far": full detail within a range, position-only low-rate blips beyond, hidden objects never sent); per-object priority accumulators and a per-connection bandwidth budget (about 32 KB/s by default); groups sent at their own rates (the schema groups exist for this).
- **Stage 3, datagram transport:** WebTransport / WebRTC data channels with the lossy baselines already in place (and fragmentation / MTU budgeting).
- **Stage 4, lag compensation:** server history of positions to rewind for hit checks.
- Later: the author's `IgeObject` streaming rebuilt on this, and Starflight and the zombie game ported.
