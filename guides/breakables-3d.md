# Breakable props

`physics.addBreakable(entity, options)` makes a prop break when something hits it hard enough. It's cut into pieces
where it was hit, at run time, and the pieces fly off with the blow. Small pieces fade away after a few seconds. Big
ones stay, so a game can sync them online. Crates fall apart plank by plank, fences snap near the hit, glass cracks
out from the hit in rays and rings, and concrete splits into chunks.

The cutting is `igeFracture()` (`src/engine/physics/IgeFracture.ts`) and the prop handling is `IgeBreakable3d`
(`src/engine/physics/IgeBreakable3d.ts`). Both are engine-neutral: they run on any physics backend, in the browser or
in Node. Read [physics-3d.md](physics-3d.md) first for the world, units and bodies.

The `breakables` example drives a car down a street of crates, pallets, a fence, barriers, cones, a bin, a bench,
bollards, a bus shelter, a phone box and a shop window.

## A crate that breaks

```typescript
const crate = new IgeEntity().geometry(crateMesh).material({ color: { r: 1, g: 1, b: 1 } }).mount(scene);
physics.addBody(crate, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, offset: { x: 0, y: 30, z: 0 } });
const breakable = physics.addBreakable(crate, { threshold: 5000, material: "wood", mass: 20 });

breakable.on("break", (result) => {
	console.log(`${result.pieces.length} pieces, ${result.big.length} big`);
});
```

- `threshold` is how hard a hit must be to break it: an impulse in kg × IGE units per second, the same units as an
  "impact" event's `impulse`. A 20 kg crate with a threshold of 5,000 survives a 30 cm drop (about 4,900) and
  breaks when a car hits it at 15 km/h or more.
- `mass` is the whole prop's mass. A crate is mostly air, so give its mass rather than wood's density. The pieces
  share it by volume.
- Give the entity a body first, or `addBreakable()` makes a static one from the convex hull of its mesh. Fixed props
  (fences, windows, benches) can simply leave it to `addBreakable()`.
- `breakable.break({ point, impulse })` breaks it for a game's own reasons (an explosion, a shot).

## How a hit is measured

A prop the world moves (a crate, a cone, a bin) breaks on its own change of momentum in one step: its mass times how
much its velocity changed, not counting gravity.

A fixed prop (a fence, a window, a bench) can't feel a hit, so the change of momentum of what hit it is measured
instead. Only the part that pushed it back off the prop counts, so a car braking alongside doesn't break it. When it
breaks, the car carries on through it, less the momentum it took to break it: a 1,300 kg car through a fence with a
threshold of 350,000 loses 350,000 / 1,300 = 270 units per second, about 10 km/h. `absorb: 0` lets it keep all its
speed.

Characters push with a limited strength and aren't measured, so walking into a window doesn't break it.

## Materials

| Material | Breaks into | Density | Effect |
|---|---|---|---|
| `wood` | Long parts snap across the grain near the hit, slanted. Wide boards sometimes split along it | 550 | splinters |
| `glass` | Shards from rays and rings round the hit, through the whole pane | 2,500 | glass |
| `concrete` | Chunks, smaller near the hit (Voronoi cells) | 2,400 | dust |
| `plastic` | Thin walls into shards through their thickness | 950 | chips |
| `metal` | Doesn't break: it's knocked loose whole | 7,800 | sparks |

Override any of it: `material: { ...IGE_BREAKABLE_MATERIALS.wood, pieces: 6 }`, or `pieces`, `pattern`, `density`
and `insideColor` on their own. The inside colour is drawn on the cut faces (pale wood, broken concrete). The outside
keeps the mesh's uvs and vertex colours, and the entity's material colour is baked into them, so a piece looks like
the prop it came from.

## Building props that break well

The fracturer cuts a mesh's **parts**: the pieces of it joined edge to edge. A part that's a convex block (a plank, a
pane, a post, a wedge) gives exact pieces, each a closed convex mesh with a matching convex hull for physics. So build
breakable props from blocks:

```typescript
const fence = IgePrimitiveGeometry.createBoxes([
	{ x: 0, y: 25, z: 0, w: 200, h: 8, d: 3, color: darkWood },        // rails
	{ x: 0, y: 95, z: 0, w: 200, h: 8, d: 3, color: darkWood },
	...pales.map((x) => ({ x, y: 61, z: 2.5, w: 16, h: 118, d: 2, color: wood }))
], "fencePanel");
```

`IgePrimitiveGeometry.createBoxes()` takes boxes (centre, size, rotation, colour) and `createBlocks()` takes six-sided
blocks by their eight corners (tapered posts, a barrier's profile, the segments of a cone's wall). Parts that only
touch stay separate parts, so a crate made of eighteen planks falls apart into planks.

- Make parts touch, not overlap. Overlapping pieces push each other apart hard when they spawn.
- Hollow things (a bin, a cone) are thin walls. Each wall cracks through its thickness, and a shard that spans
  several touching walls is one piece, with one convex hull per wall (a compound shape).
- Parts far from the hit stay joined to what they touch: the far side of a crate comes off as a broken half-crate,
  the end of a fence as a section with the stubs of its rails.
- A part that isn't convex is still cut, but its cut faces may overlap and its collision is its convex hull.

## Pieces

Each break makes `IgeBreakablePiece3d`s: an entity with a mesh of its own, a dynamic body (a convex hull, or a
compound of them), an `id` of `${key}#${index}`, and `big` true or false.

- **Big** pieces are at least `bigVolume` (default 20 litres), at most `maxBig` (6) of them, the largest. They're the
  ones to sync online. They last until removed (`bigLifetime` to fade them too).
- **Small** pieces last `debrisLifetime` seconds (default 6, give or take a fifth), fade for `fadeTime` (0.6) and go:
  body, entity and GPU mesh.
- `physics.breakables.maxDebris(150)` caps the small pieces in the whole world. Past it, the oldest go at once.
- Pieces start with the prop's own motion, a push from what hit it, a burst away from the hit and a tumble. `burst`
  scales the burst.
- Small pieces use continuous collision so they don't fly through walls (`continuous: "small" | "all" | "none"`):
  the bodies' `ccd` option, which every physics backend takes.
- `debrisLayer` puts small pieces on their own collision layer, e.g. one that characters ignore.
- `maxPieces` (default 40) drops the smallest pieces of a break past that many.

`physics.breakables` has every breakable and piece: `get(key)`, `piece(id)`, `pieces()`, `stats()`,
`maxDebris()`, and the events `"break"` (an `IgeBreakResult`), `"piece"` (each piece as it spawns) and
`"pieceRemoved"`.

## Pre-made pieces

Run-time cutting can be swapped for pieces made by hand. Pass meshes in the prop's own space:

```typescript
physics.addBreakable(window, { threshold: 30000, material: "glass", pieces: [shard1, shard2, shard3] });
```

They spawn the same way as cut pieces, with the same ids, masses and big or small classes. The two mix, too: a prop
modelled as separate parts (planks, panes) is "pre-made pieces" that still snap near the hit. `pattern: "parts"`
uses the parts as they are, uncut.

## Effects

```typescript
const effects = new IgeBreakableEffects3d(physics.breakables, scene, { decals });
```

`IgeBreakableEffects3d` (`src/engine/webgl/IgeBreakableEffects3d.ts`) bursts particles at each break: splinters and a
little dust for wood, sparkles for glass (along the shards too), dust and a mark on the ground for concrete, chips for
plastic, sparks for metal. More for harder hits. Set your own particle settings per effect with `particles`. For
anything else, the `"break"` event has the hit's world `point`, `direction`, `strength` (the impulse over the
threshold), the material's `effect` name and the pieces.

## Online

Every machine cuts the same pieces from the same seed, hit point and impulse. So the server breaks props and sends
one small event; clients replay it and cut the pieces themselves. Only the big pieces then need syncing, by id.

**On the server**, break props and send the event. Big pieces are replicated like any object, by their ids:

```typescript
physics.breakables.on("break", (result: IgeBreakResult) => {
	host.event({ t: "break", ...result.event }, { at: { scope: "street", x: result.point.x, z: result.point.z } });
	for (const piece of result.big) host.replicator.create("piece", piece.id, transformOf(piece.entity), { scope: "street" });
});
// each tick, for each big piece: host.replicator.get(piece.id)?.write(transformOf(piece.entity))
```

**On a client**, make the same props with `authority: false` and kinematic big pieces, replay each event, and move the
big pieces from replication:

```typescript
physics.addBreakable(fence, { ...fenceOptions, key: "fence-12", authority: false, bigPieces: "kinematic" });

client.on("event", (data) => {
	if (data.t === "break") physics.breakables.replay(data);
});
// each frame, for each replicated piece:
physics.breakables.piece(id)?.follow({ position, rotation, velocity, angularVelocity });
```

- The event (`IgeBreakEvent`) is plain JSON: the prop's `key`, the `seed`, the hit `point` and `impulse` in the
  prop's own space (rounded so JSON carries them exactly), the prop's pose and velocity, what hit it's velocity, and
  the big pieces' ids. Send it as JSON (as above), or declare it with `number` fields at precision 1/16 for the point
  and 1 for the impulse, which carry the rounded values exactly.
- Give every prop the same `key` on every machine (it names its pieces), and the same mesh and options. The seed
  comes from the key unless you give one.
- Small pieces are each machine's own: they start the same, but physics isn't deterministic across machines, so they
  end up in slightly different places. That's fine for debris.
- Kinematic big pieces still push small debris and the local car about.
- **Prediction.** On a client, `authority: false` doesn't break the prop when its own car hits it. It emits `"hit"`
  (with the event it would have made), lets the car through and turns the prop's collision off, so the car doesn't
  bounce off a fence the server has already broken. The pieces come with the server's event. If none comes within
  `predictTimeout` (1 s), the prop is solid again.
- `src/tests/IgeBreakable3d.test.ts` runs this over a loopback link: the server breaks a window, the client replays
  the event, and both have the same piece ids and the same meshes to the bit.

### Why it's deterministic

The cutting uses only `+`, `-`, `*`, `/` and `Math.sqrt`, which JavaScript engines must all round the same way. It
avoids `sin`, `cos`, `pow` and `atan2`, whose last bits can differ between browsers. Its random numbers come from a
seeded generator, and every sort has a fixed order. `igeFractureChecksum(pieces)` hashes the result, so two machines
can compare.

## Cutting on its own

```typescript
const result = igeFracture(mesh, { seed: 1234, point, direction, pieces: 12, pattern: "auto" });
for (const piece of result.pieces) {
	// piece.vertices, normals, uvs, colors, indices: a mesh round piece.centre
	// piece.hull (or piece.hulls): convex hull points for physics
	// piece.volume, piece.big, piece.index
}
```

It takes typed arrays and returns typed arrays, with no entities, physics or renderer. That suits a worker:
`postMessage(result, igeFractureTransferables(result))` hands the buffers back without copying. It's quick enough on
the main thread today (below), so the breakable helper doesn't use one. `igeFracturePrepare(mesh)` splits a mesh into
parts ahead of its first break (`addBreakable()` does this).

`igeFracturePieces(meshes)` turns pre-made meshes into the same kind of piece.

## Performance

In Chrome on an Apple M1 Max (GPU rendering, threaded Jolt), driving the example's car down the whole street:

| Prop | Pieces | Cutting | Spawning |
|---|---|---|---|
| Crate (18 planks) | 11 to 18 | 0.3 to 1.3 ms | 0.6 to 1.8 ms |
| Fence panel (11 parts) | 12 to 30 | 0.3 to 0.5 ms | 0.5 to 1.2 ms |
| Shelter pane | 14 to 15 | 0.3 to 1.2 ms | 0.5 to 0.6 ms |
| Shop window | 22 | 0.4 to 0.5 ms | 0.8 to 0.9 ms |
| Concrete barrier | 9 to 10 (5 or 6 big) | 0.3 to 0.4 ms | 0.4 to 0.6 ms |
| Cone, bin | 6 to 22 | 0.4 to 1.3 ms | 0.7 to 1.8 ms |

No frame took longer than about 19 ms in the second after a break. Twelve breaks in twelve seconds peaked at 109
awake bodies and a 2.4 ms physics step (median 0.35 ms). In Node (`src/tests/IgeBreakable3d.test.ts`, best of ten):
a crate 0.5 ms to cut and 0.7 ms to spawn, a fence panel 0.4 and 0.9 ms, a glass pane (39 shards) 1.0 and 1.4 ms.

Each piece has its own mesh, so it's a draw call of its own; 150 pieces is 150 draws.

## Limits

- Cuts are flat. Wood breaks with slanted cuts and glass with straight cracks, but there are no jagged splinters or
  bent metal. Pre-made pieces (or detail meshes on the cut faces) are the way to more detail.
- A part that isn't convex is cut as if it were: its cut faces may overlap.
- The hit point is where the hitter met the prop's bounding box, which is close but not exact for odd shapes.
- Watching for hits costs a little each step: dynamic bodies moving faster than 0.3 m/s and vehicles are checked
  against every unbroken fixed prop. A city will want a spatial grid there.
- Pieces aren't merged into fewer draws, and resting debris keeps its body until it fades.
