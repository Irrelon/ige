# 3D physics with Jolt

`IgePhysics3d` gives entities rigid bodies simulated by [Jolt Physics](https://github.com/jrouwe/JoltPhysics) (the
engine Godot uses by default and Horizon Forbidden West ships with), running as WebAssembly. Jolt was chosen after
the comparison and benchmark in `development-plan.md` and `benchmarks/physics`. The zombie demo uses it with
`src/examples/zombie-game/index.html?physics=1`.

## Set up

```sh
npm install jolt-physics     # optional peer dependency, only needed by games that use physics
```

```typescript
import { IgePhysics3d } from "@/engine/physics/IgePhysics3d";

const physics = await IgePhysics3d.create({ unitsPerMetre: 100 });
// ...add bodies...
physics.start(); // steps every engine frame, after entity updates, at a fixed 1/60 s
```

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

// Characters: upright capsules moved by velocity
const body = physics.addBody(hero, {
	shape: { type: "capsule", radius: 28, halfHeight: 37 }, // 130 units tall in total
	offset: { x: 0, y: 65, z: 0 }, // capsule centre above the entity's feet
	lockRotation: true, // never tips over; the entity keeps its own facing
	friction: 0 // slide along walls and other characters
});
body.setVelocityXZ(moveX * 260, moveZ * 260); // each frame, from input or AI; gravity keeps working
```

- A body starts at its entity's world position and rotation. After every step, dynamic bodies move their entity
  (position, and rotation through `entity.quaternion()` unless `lockRotation`); kinematic bodies (`type:
  "kinematic"`) follow their entity instead, e.g. moving platforms or doors.
- Shapes: `box` (half extents), `sphere` (radius), `capsule` (radius and half the straight part, upright).
- Options: `restitution` (bounciness), `linearDamping`, `angularDamping`, `gravityFactor`, `ccd` (continuous
  collision for small fast bodies so they don't pass through walls).
- `body.enabled(false)` takes a body out of the simulation (e.g. while a character is dead), `teleport(x, y, z)`
  moves it (respawns), `destroy()` frees it. `physics.bodyOf(entity)` finds an entity's body.
- Entities with dynamic bodies should be mounted to the scene, or to a parent that doesn't move.
- After adding many bodies at once (loading a level), the world rebuilds its spatial index automatically; call
  `physics.optimize()` yourself after other bulk changes.

## Ragdolls

```typescript
// When a character dies: its capsule gives way to a ragdoll thrown along the blow
body.enabled(false);
const ragdoll = physics.createRagdoll(zombie, {
	parts: RAGDOLL_PARTS,
	velocity: { x: dirX * 380, y: 160, z: dirZ * 380 }
});

// When it gets up again
ragdoll.destroy();
zombie.skeletalAnimation()?.play("Walk");
```

A ragdoll is a capsule body per part along the skeleton, starting from the current pose, joined with swing-twist
joints (`swingLimit`, `twistLimit` in degrees). After every step it poses the skeleton, so the skinned mesh falls and
tumbles; the entity's animation is stopped while the ragdoll lasts. Parts name the bones they run between:

```typescript
const RAGDOLL_PARTS = [
	{ bone: "Hips", to: "Chest", radius: 10 },
	{ bone: "Chest", to: "Head", radius: 9 },
	{ bone: "Head", length: 14, radius: 8 },          // an end bone: runs along its parent part
	{ bone: "LeftUpperArm", to: "LeftForeArm", radius: 4 },
	// ...
];
```

Bones without a part (hands, feet, the neck) ride along with the part above them. Without `parts`,
`autoRagdollParts(entity)` picks one per bone that has children, following the spine; hand-picked parts look better
(a head, sensible radii). The zombie demo's `RAGDOLL_PARTS` is a worked example for CesiumMan.

## Queries

```typescript
const hit = physics.raycast({ x, y: 100, z }, { x: dirX, y: 0, z: dirZ }, 2000);
if (hit) console.log(hit.entity.id(), hit.point, hit.normal, hit.distance);
```

`raycast()` tests physics shapes (fast, uses Jolt's spatial index): line of sight, bullets, ground checks. For exact
picking against rendered meshes use the renderer's `raycast()` instead.

## Performance

In the zombie demo (four views, 120 zombies, about 25 ragdolls and 15 crates, around 450 bodies), on an Apple
silicon Mac in Chrome:

| | Physics step (median) | Frame (median) |
|---|---|---|
| No physics | | 16.8 ms |
| Jolt, single-threaded | 3.1 ms | 19.2 ms |
| Jolt, threaded | 0.84 ms | 16.1 ms |

`physics.stats()` reports bodies, awake bodies, ragdolls and the last step's time.

## Not there yet

- Character controller: players are dynamic capsules. Jolt's `CharacterVirtual` (stairs, slopes, standing on moving
  platforms) would suit player characters better.
- Mesh and heightfield shapes for terrain (e.g. Hex Realms); the level must be built from boxes, spheres and capsules
  for now.
- Contact events and trigger volumes, collision layers beyond static/moving, and interpolation between steps (the
  render shows the latest step).
