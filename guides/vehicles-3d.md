# 3D vehicles

`IgePhysics3d.addVehicle()` turns an entity into a car, van, bus or motorcycle: a body held up by sprung wheels,
with an engine, a gearbox and tyres. You drive it with `drive()` every frame. Like any body, it moves its entity
between physics steps, and it poses its wheels' entities (steering, spin and suspension) too. It runs headless in Node
as well, so a game server can simulate vehicles.

The API (`IgePhysicsVehicle3dApi` in `src/engine/physics/IgePhysicsVehicle3dApi.ts`) is in engine terms only: IGE
units, plain numbers and objects, and entities. It runs on the world's physics backend (Jolt's vehicle constraint
today; see "Backends" at the end). Read [physics-3d.md](physics-3d.md) first for the world, units and threads.

## A car

```typescript
const physics = await IgePhysics3d.create({ unitsPerMetre: 100 });
physics.addBody(ground, { type: "static", shape: { type: "box", halfExtents: { x: 30000, y: 50, z: 30000 } } });

const car = physics.addVehicle(carEntity); // an arcade-leaning saloon
physics.start();

// every frame, from input
car.drive({ forward: throttle, right: steer, brake, handbrake });
```

With no options, it's a 1,300 kg rear-wheel-drive saloon about 4.4 m long, with its origin on the ground under its
middle. It does 0 to 100 km/h in about 6 seconds, stops from 100 km/h in 35 m, corners at about 1.2 g with very little
body roll, and swings round about 140 degrees in a handbrake turn from 60 km/h.

**Axes.** A vehicle faces +Z of its entity with +Y up, so its left is +X and its right is -X. That's glTF's
convention, which most vehicle models already use.

**Units.** Distances are in IGE units, speeds in IGE units per second, angles in degrees and wheel spin in radians per
second. Masses, torques and spring rates are real-world values (kg, N·m, N/m), so you can use a real car's figures. A
spring rate is the same number whatever `unitsPerMetre` is.

## Driving

`drive()` holds its controls until the next call. Fields you leave out are 0.

| Control | Range | What it does |
|---|---|---|
| `forward` | -1..1 | Throttle. Negative brakes until the vehicle stops, then reverses. |
| `right` | -1..1 | Steering, positive to the right. |
| `brake` | 0..1 | Brakes. Held while stopped, it reverses (`reverseOnBrake: false` to stop that). |
| `handbrake` | 0..1 | Locks the rear wheels. |
| `pitch` | -1..1 | Lean forward (1, nose down) or back (-1). See "In the air, on the roof and on one wheel". |
| `roll` | -1..1 | Roll right (1, right side down) or left. |

So a gamepad can drive with the triggers alone: right trigger `forward`, left trigger `brake` (it reverses once
stopped), left stick `right`, right stick `pitch` and `roll`, A `handbrake`. The example does this, with WASD and the
arrow keys too, and I K J L for pitch and roll.

Input is shaped to feel like a driving game rather than a simulator:

- **Steering** follows the input at `steering.rate` (4 full locks a second), so keyboard steering isn't twitchy. The
  lock narrows with speed, down to `steering.highSpeedLock` (35%) at `steering.highSpeed` (30 m/s), so a flick at
  speed doesn't spin the car.
- **Traction control** eases off the throttle while the driven wheels spin, so the car pulls away cleanly and keeps
  shifting up. It's on for cars and off for motorcycles (`tractionControl`).
- **The handbrake** locks the rear wheels, and they keep only `handbrakeGrip` (40%) of their sideways grip, as locked
  tyres do, so the tail swings round.
- **Gearboxes** are automatic. With `gearbox: { mode: "manual" }` the vehicle stays in the gear you `shift()` it to.

## In the air, on the roof and on one wheel

`pitch` and `roll` turn the vehicle in the ways a driving game expects, each with a strength you can tune:

- **In the air** they pitch and roll it (air control), so a jump can be landed on the wheels. The vehicle spins
  towards a rate set by the stick (up to 150 degrees a second), at `airControl` (300 degrees per second squared).
- **A car on its roof or side** that has nearly stopped (under 3 m/s) rocks back onto its wheels while steering (or
  `roll`) is held. It takes a second or two (`selfRighting`, 1200 degrees per second squared).
- **A motorcycle on the ground** shifts its rider's weight. Leaning back on the throttle lifts the front into a
  wheelie, held at up to 35 degrees for full throttle; leaning forward on the brakes lifts the back into a stoppie,
  up to 25 degrees. Without throttle or brake, leaning only shifts the bike a little. `weightShift` (6000 degrees per
  second squared) caps how hard the rider can pitch the bike against its springs.
- On the ground, a car ignores them.

A ridden motorcycle stays upright, even stopped. `bike.upright(false)` lets go: its balance stops, so it falls over
and tumbles like any body (a car loses its `maxTilt` limit). Stand it back up with `setState()` and call
`upright(true)` when someone gets back on. Throwing the rider off (a ragdoll) is the game's job:

```typescript
bike.on("impact", ({ speed }) => { if (speed > 800) throwRiderOff(); });            // over 8 m/s
bike.on("landed", ({ speed, tilt, onWheels }) => {
	if (!onWheels || tilt > 45 || speed > 900) throwRiderOff();                    // a bad landing
});

function throwRiderOff () {
	bike.upright(false);
	bike.drive({}); // nobody riding it
	physics.createRagdoll(rider, { velocity: bike.velocity() });
}
```

- `airborne()`: no wheel on the ground and the body touching nothing. A car on its roof is neither airborne nor
  grounded.
- `"landed"` fires when it comes down after at least a quarter of a second in the air, on its wheels or not:
  `{ airTime, speed, velocity, tilt, onWheels }`, with `speed` how fast it was falling (IGE units per second) and
  `tilt` how far it was from upright (degrees).
- `"impact"`, with `impacts: true` (or a threshold): `{ speed, impulse, others }`, as for bodies. `speed` is how much
  its velocity changed in a step, `impulse` that times its mass, `others` the bodies touching its chassis: a wall, a
  person's body (`other.entity`), another vehicle's chassis (`physics.vehicleOf(other.entity)`). Pulling away,
  braking hard and sliding stay under the default threshold (1 m/s). Someone it runs into reports it too, if their
  body has `impacts`.

## Wheels and their models

```typescript
const car = physics.addVehicle(carEntity, {
	wheels: [
		{ position: { x: 78, y: 53, z: 135 }, steer: 32, entity: frontLeft },
		{ position: { x: -78, y: 53, z: 135 }, steer: 32, entity: frontRight },
		{ position: { x: 78, y: 53, z: -130 }, entity: rearLeft },
		{ position: { x: -78, y: 53, z: -130 }, entity: rearRight }
	]
});
```

That's the default saloon's layout in centimetres. A wheel's `position` is where its suspension is fixed to the
body, relative to the vehicle entity's origin. The wheel's centre hangs below that point, between `suspensionMin`
(fully compressed, default 0.1 m) and `suspensionMax` (fully extended, default 0.3 m). With the default springs a
wheel settles about 0.11 m above full extension, so a wheel whose centre is at `(x, y, z)` in a model standing on the
ground wants a `position` of about `(x, y + 0.19 m, z)`.

- `steer` is how far the wheel steers either way, in degrees (0 doesn't steer).
- The engine drives the rear wheels (`drive: "rear"`), or `"front"` or `"all"`; a wheel's own `driven` overrides
  that. The handbrake holds the rear wheels unless a wheel says otherwise (`handbrake: true`, `false` or a torque).
- Also per wheel: `radius`, `width`, `suspensionStiffness` (N/m; default a 1.5 Hz bounce for the wheel's share of the
  mass), `suspensionDamping`, `brakeTorque` (N·m), `grip` and `caster` (degrees the steering axis leans back).

Each wheel's `entity` is posed every frame: suspension, steering and spin, between the last two steps like the body.
Mount it on the vehicle's entity. At rest a wheel model's axle runs along X and it rolls towards +Z. A wheel model with
a hub on one face is the right way round on one side only: put the mesh in a child entity and turn that 180 degrees
around Y for the other side.

Wheels front and rear are told apart by where they are along Z. Wheels level with each other (within a wheel's
radius) make an axle. Driven wheels on an axle share a differential, and an axle with wheels on both sides gets an
anti-roll bar (`antiRoll`, 10,000 N/m; 0 for none).

## Options

| Option | Default | |
|---|---|---|
| `type` | `"car"` | `"car"` (4 or more wheels) or `"motorcycle"` |
| `mass` | 1300 kg (240 for a motorcycle, rider included) | |
| `chassis` | a body and cabin | Box, convex or compound shape, IGE units |
| `chassisOffset` | 0, 0, 0 | Where the chassis shape's centre is from the entity's origin |
| `centreOfMass` | midway between the wheels, at their centres' height | Lower is harder to roll over |
| `wheels` | four (two for a motorcycle) | See above |
| `drive` | `"rear"` | `"front"`, `"rear"` or `"all"` |
| `engine` | 500 N·m, 1000 to 6500 rpm | `maxTorque`, `minRpm`, `maxRpm` |
| `gearbox` | auto, 2.66 / 1.78 / 1.3 / 1.0 / 0.74, reverse 2.9, final drive 3.42 | `mode`, `ratios`, `reverseRatios`, `finalDrive`, `shiftUpRpm`, `shiftDownRpm`, `shiftTime` |
| `antiRoll` | 10000 N/m | Per axle |
| `grip` | 1.2 | Tyre grip; 1 is a road tyre on ground of the default friction (0.5) |
| `handbrakeGrip` | 0.4 | Sideways grip the handbrake's wheels keep |
| `friction` | 0.4 | The body's own, when it scrapes along things |
| `steering` | rate 4, highSpeed 30 m/s, highSpeedLock 0.35 | See "Driving" |
| `maxTilt` | none (60 for a motorcycle) | Most the body pitches or rolls, in degrees: an arcade stabiliser |
| `maxLean` | 45 | Motorcycles: most it leans into a turn, in degrees |
| `reverseOnBrake` | true | |
| `tractionControl` | true for cars | |
| `wheelCast` | `"cylinder"` | How wheels find the ground: `"cylinder"` rolls smoothly over kerbs and edges, `"ray"` is cheaper |
| `layer` | `"moving"` | Collision layer; wheels touch what it collides with |
| `extrapolate` | 0.25 s | Kinematic mode, see below |
| `impacts` | off | `true` (1 m/s) or a velocity change in IGE units per second: "impact" events |
| `airControl` | 300 | Degrees per second squared; 0 for none |
| `selfRighting` | 1200 (cars) | Degrees per second squared; 0 for never |
| `weightShift` | 6000 (motorcycles) | Degrees per second squared; 0 for none |

Grip is measured against ground of the engine's default friction (0.5). Ground with less friction is slippery for
every vehicle (ice at 0.05), and ground with more is grippier.

## Motorcycles

```typescript
const bike = physics.addVehicle(bikeEntity, {
	type: "motorcycle",
	wheels: [
		{ position: { x: 0, y: 70, z: 75 }, steer: 30, caster: 30, brakeTorque: 500, handbrake: false, entity: frontWheel },
		{ position: { x: 0, y: 70, z: -75 }, brakeTorque: 250, handbrake: 500, entity: rearWheel }
	]
});
```

A motorcycle has two wheels and leans into turns by itself (up to `maxLean`, 45 degrees), with its front fork leaning
back 30 degrees. It stays upright when stopped, and `maxTilt` (60 degrees) stops it falling over. To crash a rider, take
them off in the game (a ragdoll) and let the bike go. The default bike's mass and centre of mass (0.68 m up) include
its rider.

## Vans, buses and lorries

Give them their own chassis, mass and wheels. A six-wheeled bus with all-wheel drive and a manual gearbox:

```typescript
const bus = physics.addVehicle(busEntity, {
	mass: 11000,
	chassis: { type: "box", halfExtents: { x: 125, y: 150, z: 550 } },
	chassisOffset: { x: 0, y: 200, z: 0 },
	drive: "all",
	engine: { maxTorque: 1500, maxRpm: 3000 },
	gearbox: { mode: "manual", ratios: [6, 3.5, 2, 1.3, 1], shiftUpRpm: 2500 },
	antiRoll: 40000,
	wheels: [
		{ position: { x: 105, y: 75, z: 380 }, radius: 50, width: 30, steer: 35 },
		{ position: { x: -105, y: 75, z: 380 }, radius: 50, width: 30, steer: 35 },
		{ position: { x: 105, y: 75, z: -280 }, radius: 50, width: 30 },
		{ position: { x: -105, y: 75, z: -280 }, radius: 50, width: 30 },
		{ position: { x: 105, y: 75, z: -400 }, radius: 50, width: 30 },
		{ position: { x: -105, y: 75, z: -400 }, radius: 50, width: 30 }
	]
});
bus.shift(1);
```

## What it's doing

| Readout | |
|---|---|
| `speed()` | Along its facing, IGE units per second, negative reversing |
| `speedKmh()` | The same in km/h |
| `velocity()`, `angularVelocity()` | World, IGE units and radians per second |
| `rpm()`, `gear()` | Engine revs; gear 1 and up forward, 0 neutral, -1 and down reverse |
| `grounded()` | Any wheel on the ground |
| `tilt()`, `upsideDown()` | Degrees from upright; over 90 |
| `airborne()` | No wheel down and the body touching nothing |
| `upright()` | Whether it keeps its balance |
| `wheel(i)` | `contact`, `compression` (0 extended to 1 compressed), `longitudinalSlip`, `lateralSlip`, `steer`, `spin`, `point`, `normal`, `entity` (what it stands on) |

Slip is how fast the tyre slides over the ground, in IGE units per second: `longitudinalSlip` is positive for
wheelspin and negative for locked brakes, `lateralSlip` positive when sliding to the right. It's what skid marks, tyre
smoke and screech want:

```typescript
for (let i = 0; i < car.wheelCount(); i++) {
	const wheel = car.wheel(i);
	if (wheel.contact && Math.hypot(wheel.longitudinalSlip, wheel.lateralSlip) > 300) {
		// Sliding at over 3 m/s: a dark mark on the ground (an IgeDecalSystem3d)
		skids.add(wheel.point.x, wheel.point.z, { y: wheel.point.y, size: 25, color: { r: 0.1, g: 0.1, b: 0.1 } });
	}
}
```

`wheel(i)` returns the same object every time, updated after each step. Raycasts and sensors report the vehicle's
entity, and `physics.vehicleOf(entity)` finds its vehicle.

## Over the network

`getState()` returns the vehicle as plain numbers, safe to send or keep as JSON: `position` and `rotation` (the
entity's), `velocity`, `angularVelocity`, `rpm`, `gear`, `steer` (where the steering is now), `input` (the held
controls, with `pitch` and `roll`), `wheelSpin` and `upright`. `setState(state)` puts it back: the body, the
drivetrain, the controls and the wheels' spin, so a car at 100 km/h carries on rather than restarting with locked
wheels. In the tests, a copy put in another car's state stays within 25 cm of it half a second later. Vehicles aren't
deterministic, though, so keep sending states rather than inputs alone.

In **kinematic mode** the simulation stops driving the vehicle, and it goes where the states given to `setState()`
put it instead. Between states it carries on at the last one's velocity for `extrapolate` seconds (0.25), then holds.
It still pushes dynamic bodies out of its way, its wheels still steer (to the state's `steer`), spin at its speed and
follow the ground, and `rpm()` and `gear()` report the state's. A state more than 5 m away moves it there at once
rather than sweeping it through the world. `kinematic(false)` hands it back to the simulation at the last state's
velocity, e.g. when its driver gets out and it rolls on.

The game's plan (`ige-gta/ARCHITECTURE.md`, "Vehicles over the network") maps onto this:

```typescript
// The driver's machine simulates its own car and sends its state with its inputs
send({ input, car: car.getState() });

// The authority checks the state, then moves its copy of the car there
remoteCar.kinematic(true);
remoteCar.setState(message.car); // each time one arrives

// Everyone else's machine does the same with the authority's states, or interpolates the entity
```

## In Node

Vehicles need no DOM. `IgePhysics3d.create()` loads Jolt with a dynamic import, which Node supports; call
`physics.update(seconds)` from the server's loop instead of `start()`. Without the WebGL renderer, entities have no 3D
world matrix, so a vehicle starts at its entity's position facing +Z: place it with `setState()`.

## Removing

`vehicle.destroy()` (or `physics.removeVehicle(vehicle)`) removes it and frees everything it made.
`physics.destroy()` removes every vehicle. `vehicle.enabled(false)` takes it out of the simulation without freeing
it, e.g. a parked car far from every player.

## Performance

The example (a car, a motorcycle and 25 crates, 38 bodies) steps in 0.25 to 0.3 ms with threaded Jolt in Chrome on an
Apple silicon Mac. Each wheel casts a cylinder (or a ray) down to the ground every step.

## Limits

- Wheels are casts, not bodies; the chassis shape is what hits things. The default car's body is as wide as its wheels'
  outer faces, so they don't poke into a wall side-on. Give your own chassis the same width. A wall lower than the
  body's underside (40 cm on the default car) can still take a wheel side-on, and a motorcycle's front wheel noses
  into a wall before its chassis (which sits above the wheels) reaches it.
- Tyre grip is the same all round a tyre's limit (no friction circle) except under the handbrake, so cars brake and
  turn at once better than real ones.
- `maxTilt` keeps a ridden motorcycle from falling over at all (until `upright(false)`).
- Air control, self-righting and weight shift turn the vehicle directly (as an angular acceleration), not through a
  modelled rider or centre of mass.

## Backends

The public API is `IgePhysicsVehicle3dApi` and its option, input, readout and state types (in
`IgePhysicsVehicle3dApi.ts`, with no physics library in them). `IgePhysicsVehicle3d` implements it for every backend:
it fills in the options (`resolveVehicleSpec()`), shapes the input, places the entity and poses the wheels between
steps, works out the readouts, air control, self-righting and weight shift, impacts and landings, and handles state
and kinematic targets. Underneath, the world's backend makes an `IgeVehicleBackend` with
`IgePhysicsBackend.createVehicle()` (see [physics-3d.md](physics-3d.md), "Backends"), from the resolved spec in metres
(`IgeVehicleBackendSpec`, `IgePhysicsVehicle3dBackend.ts`): `setInput()`, `preStep()`, `readPose()`,
`readVelocity()`, `readWheel()` (which reports the ground's body handle), `rpm()`, `gear()`, `shift()`, `setState()`,
`setKinematic()`, `moveKinematic()`, `setEnabled()`, `addAngularVelocity()`, `setUpright()` and `destroy()`, and its
chassis as `body`, so raycasts, sensors and impacts find it.

`IgeJoltVehicle3d` is Jolt's: a body (which can switch to kinematic) with Jolt's `VehicleConstraint`, a
`WheeledVehicleController` or `MotorcycleController`, and a step listener. A second backend needs suspension casts
with springs and dampers, tyre friction from slip, an engine, gearbox and differentials, a lean controller for
motorcycles, and a kinematic mode that still pushes bodies, and must report each wheel's suspension length, steering
and spin angles, spin rate, contact and slip. `setUpright(false)` turns off the motorcycle's balance and the tilt
limit (Jolt: the lean controller and the constraint's pitch and roll limit).

Two things in the Jolt backend are worth knowing when tuning:

- Jolt combines tyre and ground friction as `sqrt(tyre * ground)`, so its tyre curves are scaled for `grip` to mean
  the same on ground of friction 0.5.
- Jolt's tyre curve gives no grip at zero slip, which makes driven wheels flick between rolling and spinning on
  alternate steps when pulling away. Car tyres get full grip at zero slip instead. Motorcycles keep Jolt's curve, which
  its lean controller is tuned for.

## Example and tests

`src/examples/vehicles` is a drivable car and motorcycle on a field with roads, ramps, speed bumps and crates, with a
chase camera and a readout of speed, revs and gear, crashes and landings. I K J L (or the right stick) pitch and roll
it, and X drops the motorcycle. Build it with
`npx webpack --config ./config/webpack.config.cjs --config-name vehicles`, and serve `dist/esm` with the
cross-origin isolation headers (see [physics-3d.md](physics-3d.md), "Threads") to run Jolt threaded.

`src/tests/IgePhysicsVehicle3d.test.ts` drives vehicles headlessly in jest through the public API only, once for each
backend in `src/tests/support/physics3dTestWorld.ts`: driving, braking, slip, state, kinematic mode, impacts, wheels
against walls, landings, air control, self-righting, letting a motorcycle fall, wheelies and stoppies.
`src/tests/IgeJoltVehicle3d.test.ts` checks that Jolt gets back every byte a vehicle takes.
