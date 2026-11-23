# Replication

`IgeNetReplicationHost` and `IgeNetReplicationClient` (`src/engine/network/replication/`) are the engine's real-time state replication. They do what `IgeNetSyncHost` / `IgeNetSyncClient` do (a fixed-rate authority, inputs from machines, prediction, interpolation, zone transfers) without the game handing the engine its whole world for every connection on every send. This is stages 1 and 2 of the one replication system IGE will use everywhere (stage 2: relevance, detail levels, priority and a bandwidth budget, below); the sync classes and `IgeObject` streaming stay as they are until games move over.

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
| `json` | any JSON value; compared as text only when written (or `obj.touch(field)` after changing it in place); a change goes as a patch of what changed inside it (see [Json fields as patches](#json-fields-as-patches)) |

Any field may be `optional: true` (a presence bit; `undefined` is a value), `group: "name"` (labels fields for blips, per-group rates and priorities), `blend: false` (steps instead of blending) or, on a `number`, `blend: "angle"` (a heading kept to a precision and not wrapped, blended the short way round). A kind may have any number of fields: the changed-field mask is a 32-bit number up to 32 fields and an array of words beyond. Values read back from `obj.values` are the quantised ones the clients get, so the server and the clients agree exactly. A precision of 1/n (0.1, 0.001) is kept as whole steps over n, so values come out clean (0.3, not 0.30000000000000004).

### Scopes, owners, reveals

- `create(kind, id, fields, { scope })`: seen by every viewer subscribed to the scope. `obj.moveTo(scope)` moves it.
- `{ owner: viewer }`: only that viewer sees it (a player's private state).
- `{ hidden: true }` with `viewer.reveal(obj)` / `viewer.hide(obj)`: a hidden station a pilot has charted. `hide` also hides a normal scope object from one viewer.
- `viewer.unreveal(obj)`: ends a reveal without excluding the viewer from the object's scope (a cloaked ship revealed to its wing, then not). An object moved out of every scope (`obj.moveTo(undefined)`) is seen only by viewers it's revealed to.
- `viewer.subscribe(scope)` / `unsubscribe(scope)`: creates and destroys go out for what appears and disappears.
- `viewer.view()`: every object the viewer sees now as `{ id, kind, values }` (with `{ copy: true }` json fields are parsed afresh): for tests, tools and debugging, and for a game that keeps a `snapshotFor`-style helper built from what's replicated.

Writing the same json value to many objects (a table every pilot's private object carries): `obj.writeJson(field, value, text)` takes the JSON text so it's made once.

A game can make its objects before there's a host (a world a test steps with nobody connected): `new IgeNetReplicator(schemas)`, then `new IgeNetReplicationHost(listener, { replicator, ... })` uses it.

### Reliable and lossy transports

`lossy: false` (the default, WebSocket): a send counts as delivered, nothing is resent. `lossy: true` (datagram channels, coming in stage 3): each object has a baseline the machine has acknowledged. Every packet carries a sequence number, the machine acks the newest seen plus 32 earlier as bits (riding on its input packets, so it must send inputs every tick), and an update carries everything changed since the acknowledged baseline, so any packet can be lost or arrive late. Creates and destroys repeat until acknowledged and a destroyed object's handle is not reused before. Tests run both modes over `igeNetLoopback({ latency, jitter, loss })`.

### Stats and debugging

`host.stats()`: totals, cache hits and misses (payloads encoded vs reused), time spent in sends, per-kind bytes, per-machine bytes and bytes/s; `host.replicator.rates()` is the last full second. `new IgeNetPacketInspector(schemas, inputSchema).describe(bytes)` turns a packet into JSON (feed it a connection's packets in order, from its first).

## Transports

`IgeNetConnection.send()` takes a JSON-able object or a `Uint8Array`; binary goes as a binary WebSocket frame (`igeNetWebSocketConnect`, `IgeNetWebSocketServer.listen`) or byte for byte over `igeNetLoopback`. The browser-host relay (`igeNetRelayHost` / `igeNetRelayJoin` / `IgeNetWebSocketServer.relay()`) carries binary too, as binary frames with no JSON or base64 around them: a joiner's packet reaches the host with a header of one byte (the machine id's length) and the id, which the relay adds; the host's frames to a machine carry the same header, which the relay strips before passing the packet on. Not carried: the IgeNetIo adapter (`igeNetIoSyncTransport`) stays JSON only, because IgeNetIo commands serialise their data as JSON; use the WebSocket transports for replication.

## Measured

`NET_BENCH=1 npx jest src/tests/IgeNetBench.test.ts`: 140 static rocks, 5 stations with a 40-row market, N moving ships, N connections, 30 sends/s, old sync host against this (CPU ms per second of `update()` including the game's writes; bytes per connection per second).

| N | old CPU | new CPU | old bytes | new bytes |
|---|---|---|---|---|
| 10 | 87 | 2.9 | 46,299 | 4,955 |
| 50 | 524 | 21 | 222,910 | 21,023 |
| 100 | 1,273 | 66 | 443,733 | 40,921 |
| 200 | 3,527 | 245 | 888,340 | 81,201 |

Still entities x connections once everything moves every tick (every ship is in every packet), but each is a few bytes copied, not a diff and a copy. Stage 2 cuts that count:

Crowd of N ships spread over 20 km x 20 km (near range 2.2 km, cell 1.1 km, blips 2/s, 32 KB/s budget), every ship moving every tick, the same rocks and stations, N connections, 30 sends/s (`NET_BENCH=1 NET_BENCH_SIZES=100,200,400 npx jest src/tests/IgeNetBench.test.ts -t crowd`; CPU is process CPU time of `update()` including the game's writes, measured on a busy machine):

| N | stage 1 CPU ms/s | stage 2 CPU ms/s | stage 1 bytes/conn/s | stage 2 bytes/conn/s | busiest connection |
|---|---|---|---|---|---|
| 100 | 87 | 54 | 41,994 | 4,563 | 5,680 |
| 200 | 362 | 157 | 83,909 | 7,475 | 9,126 |
| 400 | 1,578 | 669 | 168,391 | 13,349 | 15,766 |

## Relevance, detail levels, priority and a budget (stage 2)

In a crowded zone every object moving every tick goes into every connection's packet, so work and bytes grow with players x players. Stage 2 sends each viewer what it needs: full detail near it, position-only blips far from it, and never what it can't see, inside a bandwidth budget. Objects of kinds that declare nothing behave exactly as before (everything in the scope, in full, no budget).

### Declaring kinds

Kind options go beside the field definitions (the host and the clients take the same ones: `new IgeNetSchemaSet(defs, kinds)`, or `kinds:` on the host and client options when passing plain definitions; what changes the wire format is part of the schema hash):

```ts
const defs = {
	ship: {
		x: { type: "number", precision: 0.1 },
		z: { type: "number", precision: 0.1 },
		heading: { type: "angle", bits: 9, group: "look" },
		name: { type: "string", group: "id" },
		shield: { type: "int", group: "status" }
	},
	asteroid: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string" } }
};
const kinds = {
	ship: {
		relevance: "spatial",            // full detail near a viewer, blips far away
		position: ["x", "z"],           // the fields that say where it is (a third is a height: used for distance only)
		blip: "blip",                    // the field group sent as the blip; default: the position fields; false: no blips (beyond range the object isn't sent at all)
		blipRate: 2,                     // blips per second (default: replicator option, 2)
		priority: 1,                     // base priority of the kind (default 1)
		groupPriority: { status: 3, id: 0.2 },
		groupRates: { look: 10, id: 1 }, // the most sends per second of a group, per viewer
		maxRate: 30                      // the most sends per second of the object as a whole, per viewer
	},
	asteroid: { relevance: "scope" }     // everyone in the scope, any distance (stations, gates: after the first send they cost nothing)
};
```

- `"spatial"`: the object sits in its scope's grid. A viewer sees it in full detail within range of one of its interest points or when it focuses on it, and as an anonymous blip otherwise (or, with `blip: false`, not at all).
- `"scope"`: sent in full to every viewer of the scope whatever the distance (it can still have priority and rates).
- No `relevance`: as stage 1.
- A **blip** is a field group (`blip: "name of a group"`) or, by default, just the position fields. A blip is **opaque**: the authority sends neither the object's id nor its kind, only the fields of the group, and the client holds it as an anonymous contact. Put nothing in the group that identifies the object.
- `blip: false`: the kind has no blips. Beyond range (with the same hysteresis) the object is **destroyed on that client and not sent**; when it comes back in range it is created again in full. Focus (`viewer.focus`) still brings it in at any distance. Use it for things that shouldn't be known of beyond range at all (loose cargo, missiles, ships out of scanner range).
- `groupRates` / `groupPriority` name groups from the field definitions (`group:`). Fields of one group are sent and acknowledged together; each group keeps its own baseline, so a rate-limited group never makes the others wait, and nothing is lost: what's held back goes when the rate allows, as the latest values.
- Hidden objects (`hidden: true`, never revealed) are never sent in any form; objects with an `owner` are always full and have the highest priority.

The grid: per scope, a uniform grid (`cellSize`, default 1000; about half the usual near range works well; `replicator.configureScope(scope, { cellSize })` for one scope). Writing a position field moves the object between cells only when it crosses a cell border; finding what's near a viewer costs the cells its range covers, not every object in the scope.

### Setting up a viewer

```ts
const host = new IgeNetReplicationHost(listener, {
	schemas: defs, kinds, tickRate: 30, sendRate: 30,
	relevance: { bandwidth: 32768, nearRadius: 2200, cellSize: 1100, blipRate: 2, maxPacketBytes: 0 },
	join: (machine, players) => {
		machine.viewer.subscribe("sol");
		const ship = host.replicator.create("ship", id, {}, { scope: "sol" });
		machine.viewer.addInterest(ship, { radius: 2200 }); // follows the ship by itself
		return [id];
	},
	// ...
});

const interest = viewer.addInterest(ship, { radius: 2200 }); // follow an object (its position fields)
interest.radius = 4000;                                      // a better scanner: takes effect next send
viewer.addInterest({ x: 0, z: 0 }, { radius: 500 });         // or a fixed point; a viewer may have several
viewer.focus(wingman);   viewer.unfocus(wingman);            // always full, whatever the distance, top boost
viewer.control(myShip);  viewer.uncontrol(myShip);            // the machine predicts it: every change, never held back
viewer.bandwidth = 16000;                                    // bytes/s for this viewer (host default 32768)
viewer.nearRadius = 1500;                                    // default radius for interests without one
```

A viewer with no interest point sees every spatial object as a blip (plus whatever it focuses on). An object that was in range stays in full detail until it's 10% beyond the range (`hysteresis`), so one on the edge doesn't flip each round. The bandwidth default of 32 KB/s applies only when a kind declares relevance; set `bandwidth: Infinity` (or 0) for none.

### Priority and the budget

Each send round, every object with something to send to a viewer is a candidate. If everything fits in the round's byte budget (`bandwidth / sendRate`) it all goes. If not, each candidate accumulates priority this round,

    weight = kind priority x group priority x distance falloff x focus boost x owner boost x create boost

(distance falloff `1/(1+(d/range)^2)` for spatial objects, so a blip is far below an object in range; focus 8, owner-only 10, create 4, all configurable in `relevance.weights`), then entries go out highest accumulated priority first until the budget is used; sent entries reset to zero and unsent ones keep accumulating, so nothing starves. A change that isn't sent stays pending (the viewer's baseline for the object doesn't move); when it goes it carries the latest values. Destroys always go first. At least one entry goes every round, and up to `carry` rounds (default 2) of unused budget are kept; an entry bigger than `sliceBytes` goes in slices (below). On a lossy transport the same unacknowledged change isn't resent within `resendAfter` rounds (default: a sixth of a second, when a budget is set).

**What the machine predicts** (`viewer.control(obj)`: its own player's ship or character) is never held back: its changes go every round they happen, first, whatever the budget or the kind's rates, and it's always in full detail. Prediction replays the inputs the authority hasn't applied on top of the newest state, and each packet acknowledges inputs; a state held back while the inputs before it are acknowledged would pull the player back. It counts against the budget like anything else, so keep it to the few objects that need it.

**Held-back changes blend.** A client holds an object that wasn't in a packet still (it didn't change), so blending towards its next state starts from the round before the change, not from the last change long ago. When a change waits (the budget, a rate), the update carries how many ticks back the viewer's copy was last current (a bit per update, and a byte or so when it waited), and the client blends from there across the wait: an object moving steadily stays on its line instead of standing still and then jumping. Waits shorter than the interpolation delay are invisible.

**Big entries go in slices.** With a budget, an entry bigger than `sliceBytes` (default 512 bytes: a big record's create, a large change) isn't sent at once: its bytes go in slices over the next rounds, and the client applies it when the last one is in (as an entry of the packet that completed it). Meanwhile the classes (field groups) it carries wait: no newer change of them goes until it's delivered, and then what changed meanwhile goes as usual (json fields as patches against what it carried). The object's other classes go on. An update with several classes is split: only the classes too big on their own wait, the rest goes now. So put a record's fast-changing numbers in a group of their own and give the kind `separateGroups: true` (groups are sent and acknowledged on their own; a group with a rate or priority always is):

```ts
const kinds = { pilot: { separateGroups: true } };
const defs = { pilot: { fuel: { type: "number", precision: 0.1, group: "hot" }, shield: { type: "number", precision: 0.1, group: "hot" }, codex: { type: "json" } } };
```

Slices take only budget nothing else wants (`sliceShare`, default 0: a share from 0 to 1 is kept for them each round while any wait), except the viewer's own objects (`owner`): a slice of each of those goes first every round. What the machine predicts is never sliced. On a lossy transport each slice is acknowledged with its packet and sent again if lost (or unacknowledged for `resendAfter` rounds); a late slice of a transfer the machine has finished, or of an object gone from its handle, is ignored. `viewer.report().transfers` / `transferBytes` say what's under way; `replicator.stats.transfers` / `slices` count them.

`maxPacketBytes` (viewer or `relevance`; default 0, any size) splits a round into packets no bigger than it, each decodable alone and acknowledged on its own (so each can be one datagram). With a budget, entries over `sliceBytes` are sliced (keep it under the packet size); without one, an entry bigger than the limit goes in a packet by itself. The client applies packets in any order: each field keeps the number of the newest packet that set it, so a late packet never puts back older data.

### Json fields as patches

A json field (a market table, a crew record) changes by a little at a time, so a change goes as a patch: the keys of an object that changed, were added or removed, and the items of an array that changed (by position), nested as deep as the change, against the version of the field the viewer is known to have. A 3 KB crew record whose clock ticks costs a few bytes. If the patch wouldn't be smaller than the value (or that version is too old), the field goes whole. The machine's copy is exactly the authority's, key order included (an object whose keys moved goes whole), so its JSON text matches.

The authority numbers each json field's versions and keeps the last 16 (`IGE_NET_JSON_VERSIONS`); a patch names the version it's against, and the client keeps its last 16 too, so patches apply on a lossy transport, late or out of order. Patches are worked out once per round per base version and shared by every viewer with the same one (normally all of them). Arrays are compared position by position: an item put at the front changes every position after it, and then the array goes whole. Input fields are always whole.

Treat the values a client gives you as read-only: a patched value shares the parts it didn't change with the version before.

`IgeNetPacketInspector` shows a patched field as `{ ver, from, patch }`; the patch format is in `igeNetJsonDelta.ts`.

### What the client sees

A far object of a blip kind arrives as an **anonymous contact**: a client object with `kind: "blip"`, `anon: true`, `detail: "blip"` and an `id` that is only this machine's own handle (`"?12"`), holding the blip fields alone. `created` fires for it like any object. When the object comes into range (or is focused) the authority sends a full create at the same handle and the **same client object continues** under its real id and kind: `client.objects` re-keys it, `anon` becomes false, `detail` becomes `"full"`, its earlier states are kept (so its position stays smooth), and `"revealed"` (object, anonymousId) and `"detail"` (object, "full") fire. When it goes out of range again it is destroyed (`"destroyed"` with the real id) and a **new** anonymous contact appears under a new handle: nothing ties the new contact to the object it was. `client.detailOf(id)` is `"full"` or `"blip"`.

What a client can and can't infer from a blip: it learns the position (the blip fields), the timing of updates (the blip rate), the number of contacts, and which **blip layout** the contact has. Kinds whose blip fields are identical (same names, types and precisions) share a layout and can't be told apart; kinds with different blip fields can, so give kinds you want hidden from each other the same blip group. It never learns the id, the kind, the other fields, or whether a contact now is the same object as one before. Once an object has been named the client knows it (and may remember where it was); a game that must prevent that should use `blip: false`. Handles are small integers reused by the authority and mean nothing. On a lossy transport, acknowledgements from before an object was named or sent back to a blip are ignored, and a packet older than the one that named a contact still reads as a blip.

### Stats

- `viewer.report()`: bytes per second, `bandwidth`, `budgetUse`, `deferred` (entries held back last round), `oldestPendingAge` (seconds the oldest unsent change has waited: starvation), `detail` counts (full / blip; a `blip: false` object out of range isn't seen at all), bytes by kind, `transfers` and `transferBytes` (entries going in slices).
- `replicator.stats`: `jsonPatches` / `jsonWhole` (json fields sent as patches and whole), `transfers` / `slices`.
- `replicator.report()` (`host.stats().report`): totals over every viewer (by kind, deferred, worst age, worst budget use, detail counts, grid sizes). `host.stats().machines` lists each machine's report.
- `viewer.detailOf(obj)`, `viewer.stats.deferred / oldestPendingAge / entries` (last round).

## Coming

- **Stage 3, datagram transport:** WebTransport / WebRTC data channels with the lossy baselines, versioned json patches and slices already in place (and MTU budgeting).
- **Stage 4, lag compensation:** server history of positions to rewind for hit checks.
- Later: the author's `IgeObject` streaming rebuilt on this, and Starflight and the zombie game ported.
