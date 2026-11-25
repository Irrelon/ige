# 3D physics

`IgePhysics3d` gives entities rigid bodies. The physics engine behind it is a backend. The default, and so far the only
one, is [Jolt Physics](https://github.com/jrouwe/JoltPhysics) (the engine Godot uses by default and Horizon Forbidden
West ships with), running as WebAssembly. Jolt was chosen after the comparison and benchmark in `development-plan.md`
and `benchmarks/physics`. Nothing in the API depends on Jolt, so a game can move to another engine (Rapier, or IGE's
own) without changing its code: see [Backends](#backends). The zombie demo uses it with
`src/examples/zombie-game/index.html?physics=1`.

## Set up

```sh
npm install jolt-physics     # optional peer dependency, only needed by games that use physics
```

```typescript
import { IgePhysics3d } from "@/engine/physics/IgePhysics3d";

const physics = await IgePhysics3d.create({ unitsPerMetre: 100 }); // Jolt
// ...add bodies...
physics.start(); // steps every engine frame, after entity updates, at a fixed 1/60 s
```

`IgePhysics3d.create({ backend })` picks the engine: `"jolt"` (the default) or a backend factory. Tuning that only
one engine has goes under its own key, e.g. `jolt: { maxBodyPairs, maxContactConstraints }`; other backends ignore it.
The old top-level `maxBodyPairs` and `maxContactConstraints` still work, with a warning, and go in the next minor
version. `physics.backendName()` says which engine is running.

Steps run at a fixed rate (`fixedTimeStep`), and entities are drawn between the last two steps (`interpolate`,
default true), so motion stays smooth on 120 Hz screens or when frames are uneven. The engine's frame delta is each
frame's exact length (it was whole milliseconds, so a 120 Hz frame's 8.33 ms came as 8, 8 and 9, and everything
interpolated juddered by up to a millisecond's movement a frame: 2.4 cm at 130 km/h).

**Following a body with a camera.** `start()` steps the world in the engine's `postUpdate` phase, and the engine runs
a phase's behaviours newest first, so a `postUpdate` behaviour added after `start()` runs *before* the step: a camera
placed there follows where the body was a frame ago while the body is drawn where it is now, and the body shakes
against the camera by its speed times the change in frame time (up to 14 cm a frame at 130 km/h in the driving spike).
Place cameras, and anything else that follows a body, in `preTick`, which runs after the step and before drawing:
`ige.engine.addBehaviour(IgeBehaviourType.preTick, "camera", (_e, tickDelta) => chase.update(tickDelta / 1000))`.

Jolt (about 0.9 MB gzipped) is loaded when the world is created, so games without physics don't download it.

**Units.** Shapes, positions and velocities are in IGE units; the simulation runs in metres, because physics engines'
tolerances assume real-world sizes. `unitsPerMetre` (default 100) converts between them: with 100, a 170-unit
character is 1.7 m tall and gravity is 9.81 m/s².

**Threads.** When the page is cross-origin isolated, Jolt's multithreaded build is used automatically
(`threads: "auto"`). That needs two response headers on the game's page:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

They stop the page loading cross-origin resources that don't opt in (some ad and analytics scripts, iframes), so
check the hosting first; itch.io has a "SharedArrayBuffer support" option for this. Without them the single-threaded
build runs. The threaded build takes about a second to start its workers.

## Bodies

```typescript
// The level: static boxes (don't move, cost almost nothing)
physics.addBody(wall, { type: "static", shape: { type: "box", halfExtents: { x: 1000, y: 150, z: 10 } } });

// Debris: dynamic boxes the simulation moves and turns
const crate = physics.addBody(crateEntity, {
	shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } },
	density: 250, // kg per cubic metre
	friction: 0.6
});
crate.applyImpulse(400 * crate.mass(), 200 * crate.mass(), 0); // kg * units per second

// Crowds (zombies): upright dynamic capsules moved by velocity
const body = physics.addBody(zombie, {
	shape: { type: "capsule", radius: 26, halfHeight: 39 }, // 130 units tall in total
	offset: { x: 0, y: 65, z: 0 }, // capsule centre above the entity's feet
	lockRotation: true, // never tips over; the entity keeps its own facing
	friction: 0 // slide along walls and each other
});
body.setVelocityXZ(moveX * 80, moveZ * 80); // each frame, from AI; gravity keeps working
```

## Player characters

```typescript
const hero = physics.addCharacter(player, { radius: 28, height: 130, mass: 90, maxStrength: 900 });
hero.move(moveX * 260, moveZ * 260); // each frame, from input; move(0, 0) to stop
hero.jump(450); // upward speed, if on the ground
hero.onGround();
```

`addCharacter()` makes a player character (Jolt's `CharacterVirtual`): its feet are at the entity's origin, it walks
up steps (`stepHeight`, default 0.3 m) and slopes (`maxSlopeAngle`, default 50 degrees), sticks to the floor going
down them, pushes dynamic bodies with at most `maxStrength` newtons, and characters collide with each other. Other
bodies collide with it through an inner body, `hero.body`, which raycasts and sensors report. Characters are updated
before each world step, on the main thread, and interpolated like bodies. A crowd pushing into a character moves it
(as a horde would) unless it has `pushable: false`, which keeps it where its own movement puts it; `teleport()` and
`enabled()` work as for bodies, and `getState()` / `setState()` save and restore it.

- A body starts at its entity's world position and rotation. After every step, dynamic bodies move their entity
  (position, and rotation through `entity.quaternion()` unless `lockRotation`); kinematic bodies (`type:
  "kinematic"`) follow their entity instead, e.g. moving platforms or doors.
- Shapes: `box` (half extents), `sphere` (radius), `capsule` (radius and half the straight part, upright), and from
  a geometry (scaled by the entity's scale): `mesh` (its triangles: level geometry and terrain, static or kinematic
  only) and `convex` (the hull of its vertices: props of any shape, dynamic too):
  `physics.addBody(terrain, { type: "static", shape: { type: "mesh", geometry: terrain._geometryData } })`.
- More shapes: `compound` (several child shapes with positions and rotations as one body, e.g. a table from a top and
  legs) and `heightfield` (grid terrain: `heights`, `size` samples per side, `spacing`; static only, starting at the
  entity's origin along +x and +z).
- Options: `density` (kg per cubic metre, default 1000) or `mass` (kg, overriding the density), `restitution` (bounciness), `linearDamping`,
  `angularDamping`, `gravityFactor`, `ccd`, `centreOfMass`, `layer` (see below) and `impacts`. Until November 2026
  Jolt ignored `density`, so every body was 1000: give props their real weight (a 75 cm wooden crate about 35 kg,
  density 83).
- `ccd: true` sweeps the body through each step (continuous collision), so a fast or thin body can't pass into or
  through a wall or the ground in one step: debris, projectiles, a felled lamp post. A 4 m bar thrown down at 40 m/s
  sank 58 cm into the ground for a step without it, 4 cm with it.
- `centreOfMass: { x, y, z }` (IGE units from the entity's origin) puts the body's weight there rather than spread
  evenly through its shape: a lamp post or a sign on a heavy base stands and falls like one, and a shape with a big,
  light part (a lamp's arm and head) doesn't topple over by itself.
- `impacts: 220` (or `true` for 100) makes the body emit `"impact"` when a step changes its velocity by more than
  that (IGE units per second), with the speed change, the impulse (the speed change times the mass) and the bodies
  touching it: sounds, splinters, damage from a falling crate. `body.on("impact", ({ speed, impulse, others }) => ...)`.
- `body.enabled(false)` takes a body out of the simulation (e.g. while a character is dead), `teleport(x, y, z)`
  moves it (respawns), `destroy()` frees it. `physics.bodyOf(entity)` finds an entity's body. Also `velocity()`,
  `setVelocity()`, `angularVelocity()`, `setAngularVelocity()`, `mass()` and `asleep()`.
- `physics.gravity(-20)` changes gravity (metres per second squared).
- Entities with dynamic bodies should be mounted to the scene, or to a parent that doesn't move.
- After adding many bodies at once (loading a level), the world rebuilds its spatial index automatically; call
  `physics.optimize()` yourself after other bulk changes.

## Vehicles

Cars, vans, buses and motorcycles have their own guide: [vehicles-3d.md](vehicles-3d.md).

```typescript
const car = physics.addVehicle(carEntity); // an arcade-leaning saloon
car.drive({ forward: throttle, right: steer, brake, handbrake }); // each frame
car.setOptions({ engine: { maxTorque: 650 } }); // tuning while it's driven
```

They ride up kerbs (`stepHeight`), have wheel guards that keep wheels out of low walls, share each tyre's grip
between driving and cornering (`combinedGrip`), and take a clutch as strong as their engine.

## Aircraft, boats and water

Planes, helicopters, boats and floating bodies have their own guide: [aircraft-boats-3d.md](aircraft-boats-3d.md).

```typescript
physics.water({ level: 0, waves: [{ direction: 30, length: 4000, amplitude: 25 }] });
const boat = physics.addBoat(boatEntity, { preset: "speedboat" });
const plane = physics.addAircraft(planeEntity, { preset: "lightPlane" });
physics.addBuoyancy(crateBody); // floats or sinks by its density
```

Any body can be pushed steadily too: `body.applyForce(x, y, z, at?)` (kg * IGE units per second squared, for the next
step), `body.applyTorque(x, y, z)` (newton metres) and `body.centreOfMass()`. Bodies take a `mass` instead of a
density, and a `centreOfMass` of their own.

## Collision layers

```typescript
const physics = await IgePhysics3d.create({
	layers: [{ name: "static", static: true }, { name: "moving" }, { name: "characters" }, { name: "corpses" }],
	ignore: [["characters", "corpses"]] // the living walk through corpses
});
physics.addBody(zombie, { /* ... */ layer: "characters" });
physics.createRagdoll(deadZombie, { layer: "corpses" });
physics.raycast(from, dir, 1000, { layer: "characters" }); // what a character would hit
```

Static layers hold bodies that never move and don't collide with each other; every other pair of layers collides
unless listed in `ignore`. Bodies default to "static" or "moving"; bodies, sensors, characters, ragdolls and raycasts
all take a `layer`.

## Ragdolls

```typescript
// When a character dies: its capsule gives way to a ragdoll thrown along the blow
body.enabled(false);
const ragdoll = physics.createRagdoll(zombie, {
	velocity: { x: dirX * 380, y: 160, z: dirZ * 380 } // parts: found from the rig, see below
});

// When it gets up again
ragdoll.destroy();
zombie.skeletalAnimation()?.play("Walk");
```

A ragdoll is a capsule body per part along the skeleton, starting from the current pose, joined with swing-twist
joints (`swingLimit`, `twistLimit` in degrees). After every step it poses the skeleton, so the skinned mesh falls and
tumbles; the entity's animation is stopped while the ragdoll lasts. Parts name the bones they run between, when you
choose them yourself:

```typescript
const RAGDOLL_PARTS = [
	{ bone: "Hips", to: "Chest", radius: 10 },
	{ bone: "Chest", to: "Head", radius: 9 },
	{ bone: "Head", length: 14, radius: 8 },          // an end bone: runs along its parent part
	{ bone: "LeftUpperArm", to: "LeftForeArm", radius: 4 },
	// ...
];
```

Bones without a part (hands, feet, the neck) ride along with the part above them. Without `parts`, humanoids get
`humanoidRagdollParts(entity)`: two torso parts, the head, and the upper and lower arms and legs, found from the
rig's shape (`humanoidBones()`, so auto-rigged models with numbered bones work), with radii in proportion to the
character's height. Other rigs fall back to `autoRagdollParts(entity)`, one part per bone that has children,
following the spine. Pass `parts` to choose them by hand.

### Bodies that stay down

A ragdoll is simulated until it's destroyed, so a game where the dead stay where they fell builds up hundreds of
them. Give it `restAfter` and it comes to rest instead: once the engine has put every part to sleep, or at the
latest after that many seconds of simulation, its bodies and joints are removed and the skeleton keeps its last pose.

```typescript
const ragdoll = physics.createRagdoll(zombie, { layer: "corpses", velocity, restAfter: 5 });
physics.on("ragdollRest", (r: IgeRagdoll3d) => { /* r.entity lies still now */ });
ragdoll.rested(); // true once it has come to rest
ragdoll.rest();   // come to rest now
```

Bodies in a heap keep nudging each other and seldom all fall asleep, so `restAfter` is what retires most of them. In
the zombie game, 4 players killing about 200 zombies at once: without it, 172 ragdolls kept 1,190 bodies awake and a
physics step took 9 ms (12 frames a second); with `restAfter: 5`, at most 95 ragdolls were simulated at once (a 1.6 ms
step), and once the wave was over none were.

## Trigger volumes

```typescript
const zone = physics.addSensor(pad, {
	shape: { type: "box", halfExtents: { x: 90, y: 60, z: 60 } },
	offset: { x: 0, y: 60, z: 0 }
});
zone.on("enter", (body) => { /* body.entity stepped in */ });
zone.on("exit", (body) => { /* ...and out */ });
zone.overlapping(); // bodies inside now
```

A sensor follows its entity, doesn't collide with anything, and after every step reports the bodies that entered or
left it (static bodies only with `includeStatic: true`). The overlap query runs on the main thread, so events work
with the threaded build too. The zombie demo's healing pad is one.

## Queries

```typescript
const hit = physics.raycast({ x, y: 100, z }, { x: dirX, y: 0, z: dirZ }, 2000);
if (hit) console.log(hit.entity.id(), hit.point, hit.normal, hit.distance);
```

`raycast()` tests physics shapes (fast, uses the engine's spatial index): line of sight, bullets, ground checks. For
exact picking against rendered meshes use the renderer's `raycast()` instead.

## Performance

In the zombie demo (four views, 120 zombies, about 25 ragdolls and 15 crates, around 450 bodies), on an Apple
silicon Mac in Chrome:

| | Physics step (median) | Frame (median) |
|---|---|---|
| No physics | | 16.8 ms |
| Jolt, single-threaded | 3.1 ms | 19.2 ms |
| Jolt, threaded | 0.84 ms | 16.1 ms |

`physics.stats()` reports bodies, awake bodies, ragdolls and the last step's time.

Ragdoll parts are registered with the world, so raycasts, sensors and impacts report the ragdoll's entity.

## Saving and restoring state

Bodies, characters, ragdolls and vehicles give their state as plain numbers, safe to send over the network or keep as
JSON. A body that changes hands (another player's machine takes it over) or moves to another server's world is made
there with the same options, then given the state:

```typescript
const state = body.getState(); // { position, rotation, velocity, angularVelocity, asleep }
send(JSON.stringify(state));

// Elsewhere: the same options, then the state
const copy = otherWorld.addBody(entity, sameOptions);
copy.setState(JSON.parse(message));
```

- A body's `position` is its entity's origin, not the shape's centre, so offsets don't matter. `rotation` is always
  upright for `lockRotation` bodies. A body that was asleep stays asleep.
- `character.getState()` gives `position` (the feet) and `velocity`; `ragdoll.getState()` gives each part's body in
  order, for a ragdoll made with the same parts.
- Vehicles have their own, with the drivetrain and the controls (see [vehicles-3d.md](vehicles-3d.md)).
- The options (shape, mass, layer) aren't part of a state. In the tests a body restored in another world, in flight,
  lands and tumbles within 5 units of the original two seconds later. Physics isn't deterministic across machines,
  though, so keep sending states rather than inputs alone.

## Limits

- Ragdolls pose the skeleton from the latest step (not interpolated).
- Impact events find the bodies touching after the step; a glancing hit on something that has already bounced away
  reports no `others`.
- Backends may let resting bodies sink a little into what holds them up: Jolt up to 2 cm.

## Backends

A backend is the physics engine behind `IgePhysics3d`. `IgePhysics3d` keeps everything that is the same whatever the
engine: IGE units, entities, fixed steps and interpolation, layer names, sensor enter and exit, impact events,
character and vehicle input, ragdolls posing skeletons, and state as JSON. A backend only simulates. It works in SI
units (metres, kilograms, seconds, radians and newtons, Y up), sees no entities, and hands out opaque handles for its
bodies, characters and ragdolls. No engine types leave it.

The interface is `IgePhysicsBackend` in `src/engine/physics/IgePhysicsBackend.ts`. A backend must provide:

| Area | Calls |
|---|---|
| The world | `step()`, `setGravity()`, `optimize()`, `activeBodyCount()`, `threaded()`, `destroy()` |
| Bodies | `createBody()` (static, dynamic or kinematic; box, sphere, capsule, mesh, convex, compound and heightfield shapes; density or a mass, a centre of mass, friction, restitution, damping, gravity factor, locked rotation, continuous collision, sensors, `allowKinematic`), `destroyBody()`, `setBodyEnabled()`, `readBodyPose()`, `readBodyVelocity()`, `setBodyVelocity()`, `setBodyTransform()`, `moveKinematic()`, `setBodyKinematic()`, `addImpulse()`, `addForce()`, `addTorque()`, `readBodyCentreOfMass()`, `readBodyInertia()`, `bodyMass()`, `bodyAwake()`, `setBodyAwake()` |
| Layers | Named by index: static layers don't collide with each other; every other pair does unless ignored |
| Queries | `raycast()` (nearest hit, distance and normal, by what a layer collides with, skipping an `ignore` body), `touching()` (what overlaps a body: sensors and impacts are built on it) |
| Characters | `createCharacter()` (walks up steps and slopes, sticks to the floor, pushes bodies with a limited strength, optionally unpushable), `characterBody()`, `moveCharacter()`, `readCharacter()`, `setCharacterState()`, `setCharacterEnabled()`, `destroyCharacter()` |
| Ragdolls | `createRagdoll()` (capsules joined by swing-twist joints, parts not colliding with each other), `destroyRagdoll()` |
| Vehicles | `createVehicle()`, returning an `IgeVehicleBackend` (see [vehicles-3d.md](vehicles-3d.md)) |

Queries run after the step on the main thread, so a threaded engine needs no callbacks from its workers.

Flight, boats and buoyancy need no more than forces, torques, the centre of mass, inertia, kinematic switching and
raycasts: lift, drag, thrust, buoyancy and water drag are worked out in IGE's own code (see
[aircraft-boats-3d.md](aircraft-boats-3d.md), "Backends"), never by an engine's own features.

To write one:

1. Make a factory: `{ name: "rapier", create (config) { ... } }`. `create()` loads the engine (dynamically, so games that
   don't use it don't download it) and returns the world. `config` has the gravity, the layers by index, the ignored
   pairs, `threads`, `maxBodies`, and everything given to `IgePhysics3d.create()` for options of its own.
2. Implement `IgePhysicsBackend`, using `IgeJoltBackend.ts` (and `IgeJoltVehicle3d.ts`) as the reference. Free
   everything a call makes in the call that removes it.
3. Add it to `BACKENDS` in `src/tests/support/physics3dTestWorld.ts`. The behaviour suite
   (`src/tests/IgePhysics3dContract.test.ts`: falling and resting, every shape, forces and torques, layers, sensors,
   raycasts, characters on steps and slopes, pushing, impacts, ragdolls, state round trips, freeing), the vehicle
   suite (`IgePhysicsVehicle3d.test.ts`) and the aircraft and boat suite (`IgePhysicsCraft3d.test.ts`) then run
   against it too. `IGE_PHYSICS_BACKENDS=rapier npx jest` runs them for it
   alone.
4. Games choose it with `IgePhysics3d.create({ backend: myRapierBackend() })`.

Jolt's own checks (that every byte of WebAssembly memory comes back) are in `IgeJoltBackend.test.ts`,
`IgeJoltVehicle3d.test.ts` and `IgeJoltCraft3d.test.ts`.
