# Entity streaming

Entity streaming sends `IgeEntity` objects from an authority to clients through the [replication layer](replication.md). The server keeps its entities as it always did; the engine reads their transform, declared fields and parent into replicated objects each send round, and clients make and follow matching entities. It replaces the old `IgeObject` streaming (`streamMode`, `streamSections` and the rest), which has been removed.

The code is in `src/engine/network/entities/`: `igeNetEntity()` and `igeNetEntitySchemas()`, `IgeNetEntityHost` and `IgeNetEntityClient`.

## Declare a class

Put a description on the class as `static net`. Declared fields are ordinary replication fields, read from the property of the same name on the entity (a getter works).

```ts
class Zombie extends IgeEntity {
	static net = igeNetEntity("zombie", {
		hp: { type: "int", min: 0, max: 100 },
		mood: { type: "enum", values: ["idle", "hunt"] }
	}, { transform: { precision: 0.01, rotation: "y" } });
	hp = 100;
	mood = "idle";
}
```

Every kind also has:

- the transform fields `x`, `y`, `z` (precision 0.01 by default) and, by default, the angles `rx`, `ry`, `rz` (`angle` fields of 12 bits). These blend between states, angles the short way round.
- `p`, a string: the id of the entity's parent.

Declared fields do not blend by default (an `hp` should not show 73.4). Set `blend: true` on a field that should.

Options (the third argument):

| option | meaning |
|---|---|
| `transform.precision` | smallest position step (default 0.01) |
| `transform.rotation` | `"xyz"` (default), `"y"`, `"z"` or `"none"` |
| `transform.angleBits` | bits per angle (default 12) |
| `transform.scale` | `true` adds `sx`, `sy`, `sz` (default false) |
| `plane` | `"xz"` (default, 3D: the ground) or `"xy"` (2D); the plane range is measured in |
| `relevance` | `"spatial"` (default: full detail near a viewer's interest, otherwise not sent) or `"scope"` (everyone in the scope, at any distance) |
| `blip` | `true` sends far entities as anonymous position blips (default false) |
| `priority`, `maxRate`, `groupRates`, `groupPriority`, `separateGroups` | passed to the kind (see the replication guide). The transform fields are in the group `transform`. |

A class may also have `static netCreate(values)`, used on clients to make the entity.

Both ends make the schemas from the same list of classes, in the same order, and merge them into their own:

```ts
const entitySchemas = igeNetEntitySchemas([Zombie, Crate]);
const defs = { ...gameDefs, ...entitySchemas.defs };
const kinds = { ...gameKinds, ...entitySchemas.kinds };
```

Two classes with the same kind name is an error.

## Replicate on the server

```ts
const entities = new IgeNetEntityHost(host.replicator, [Zombie, Crate]);

const zombie = new Zombie().mount(scene).translateTo(100, 0, 50);
zombie.replicate();                       // or entities.add(zombie)
// later
zombie.unreplicate();                     // or entities.remove(zombie)
```

`entity.replicate(options?)` uses the most recently made `IgeNetEntityHost`, or `options.host`. Options:

- `owner: viewer`: the entity is private to that viewer.
- `relevant: (viewer) => boolean`: decides per viewer. The entity is hidden, and each send round the host reveals or unreveals it for every viewer by calling the hook.
- `scope: "name"`: the scope viewers subscribe to. The default is the id of the entity's scene.

You do not copy values into objects. At the start of every send round (`IgeNetReplicator.beforeFlush()`) the host reads each entity and writes the transform, the declared fields and `p`. Replication compares each field once, so only changes go out and an entity that did not change costs nothing after its create. An entity that was destroyed (`_alive === false`) has its object destroyed. An entity mounted in another scene moves its object to that scene's scope.

**Scope.** The default scope is the id of the first `IgeScene2d` above the entity (or the root of its tree). Subscribe viewers to scene ids, and range, priority and the bandwidth budget work as for any spatial kind:

```ts
join: (machine) => {
	machine.viewer.subscribe(scene.id());
	machine.viewer.addInterest({ x: 0, z: 0 }, { radius: 2000 });
	const hero = new Zombie().mount(scene);
	hero.replicate();
	machine.viewer.addInterest(entities.objectOf(hero)!);
	machine.viewer.control(entities.objectOf(hero)!);
	return [hero.id()];
}
```

`entities.objectOf(entity)` is the `IgeNetObject`, for `viewer.control()`, `addInterest()` and `focus()`.

## Follow on the client

```ts
const entities = new IgeNetEntityClient(client, [Zombie, Crate], {
	parent: (id) => ige.$(id) as IgeObject | undefined, // the default
	idOf: (objectId) => objectId                         // the default
});
entities.attach();            // the engine calls update() each frame; detach() stops it
```

Or call `entities.update()` yourself each frame. Each update:

- **New object of a registered kind:** the entity is made (`Class.netCreate(values)` if the class has it, otherwise `new Class()`), given its id, its fields, and mounted under its parent. A streamed parent is found among the client's own entities first, then with `options.parent`. If the parent is not there yet, the entity waits unmounted and tries again each update, so create order does not matter.
- **Every entity** takes the interpolated values: `translateTo`, `rotateTo`, `scaleTo` for the transform, and its declared fields set as properties.
- **Changed fields:** if declared fields changed since the last update, the entity's `onNetChange?(changed: string[])` is called after they are set. Creating the entity is not a change.
- **Destroyed objects:** the entity is destroyed. When `p` changes the entity is mounted under its new parent.

`entities.entityOf(objectId)` gives the client entity. `idOf` is for a test that runs a server and client in one process, where entity ids are global and must differ.

## Prediction

Tell the client which entity is the player's own and give it the game's movement rule:

```ts
entities.control(heroId, 0, (state, input, dt) => ({ ...state, x: state.x + input.dx * SPEED * dt }));
```

That entity takes `client.predict()` each frame instead of the interpolated values: its newest replicated values with the inputs the server has not applied yet replayed on top through your rule. It is drawn between its last two input ticks for smooth movement at any frame rate; `update()` works out how far into the tick the frame is from the time since the last `sendInput()`. You can pass it yourself: `update(renderTime, between)`.

On the server, call `viewer.control(entities.objectOf(hero))`. A controlled object's changes are never held back by the budget or rates, which the client's prediction needs. `entities.uncontrol(id)` stops predicting.

## From the old API

| old | new |
|---|---|
| `entity.streamMode(1)` | `entity.replicate()` |
| `streamSections`, `streamSectionData` | declared fields (`igeNetEntity(kind, fields)`), read from the entity's properties; transform is built in |
| `streamControl` | `relevant: (viewer) => boolean` |
| `streamSyncInterval` | `maxRate` and `groupRates` on the kind |
| `streamCreateConstructorArgs` | `static netCreate(values)` |
| the client's class by `classId` | the class registry: the classes you give `IgeNetEntityClient`, by kind |
| time-stream interpolation | `client.interpolated()`, applied by `update()` |
