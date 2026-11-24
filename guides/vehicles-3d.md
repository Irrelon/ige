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
middle. It does 0 to 100 km/h in about 6 seconds, stops from 100 km/h in 35 m, corners at about 1.2 g rolling under 2
degrees, and swings round about 140 degrees in a handbrake turn from 60 km/h. It handles like a driving game's car
(see "Arcade assists"): it turns firmly at any speed and doesn't spin unless you ask it to.

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

- **Steering** follows the input at `steering.rate` (4 full locks a second; twice that at speed, see "Arcade
  assists"), so keyboard steering isn't twitchy. The
  lock narrows with speed: towards `steering.highSpeedLock` (35%) by `steering.highSpeed` (30 m/s), and at speed to
  the turn the arcade assists ask for (see "Arcade assists"), so the stick's whole travel turns the car.
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
anti-roll bar (`antiRoll`, 10,000 N/m; 0 for none): stiffer keeps the body flatter in corners.

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
| `gearbox` | auto, 2.66 / 1.78 / 1.3 / 1.0 / 0.74, reverse 2.9, final drive 3.42 | `mode`, `ratios`, `reverseRatios`, `finalDrive`, `shiftUpRpm`, `shiftDownRpm`, `shiftTime`, `clutchStrength` (see "Vans, buses and lorries") |
| `antiRoll` | 10000 N/m | Per axle, see "Suspension" |
| `grip` | 1.2 | Tyre grip; 1 is a road tyre on ground of the default friction (0.5) |
| `combinedGrip` | 1 for cars, 0 for motorcycles | How much wheelspin and locked brakes use up sideways grip, see "Combined grip" |
| `handbrakeGrip` | 0.4 | Sideways grip the handbrake's wheels keep |
| `friction` | 0.4 | The body's own, when it scrapes along things |
| `steering` | rate 4, highSpeed 30 m/s, highSpeedLock 0.35, slip 2.5 | See "Driving" and "Arcade assists" |
| `yawAssist` | strength 1 (cars), lateralG the tyres' grip, highSpeedG 3, highSpeed 28 m/s, highSpeedRate twice steering.rate | See "Arcade assists" |
| `stabilityAssist` | strength 1 (cars), slideSpeed 15 m/s | See "Arcade assists" |
| `antiRollover` | 2.5 g, or twice the grip (cars) | See "Arcade assists" |
| `downforce` | 0 | Share of the weight pushing down at 50 m/s |
| `maxTilt` | none (60 for a motorcycle) | Most the body pitches or rolls, in degrees: an arcade stabiliser |
| `maxLean` | 45 | Motorcycles: most it leans into a turn, in degrees |
| `reverseOnBrake` | true | |
| `tractionControl` | true for cars | |
| `wheelCast` | `"ray"` for cars, `"cylinder"` for motorcycles | How wheels find the ground, see "Kerbs and wheel guards" |
| `stepHeight` | 65% of each wheel's radius (22 cm on the default car) | Tallest kerb the wheels ride up |
| `wheelGuards` | true | A weightless box over each wheel's upper half that collides, see "Kerbs and wheel guards" |
| `layer` | `"moving"` | Collision layer; wheels touch what it collides with |
| `extrapolate` | 0.25 s | Kinematic mode, see below |
| `impacts` | off | `true` (1 m/s) or a velocity change in IGE units per second: "impact" events |
| `airControl` | 300 | Degrees per second squared; 0 for none |
| `selfRighting` | 1200 (cars) | Degrees per second squared; 0 for never |
| `weightShift` | 6000 (motorcycles) | Degrees per second squared; 0 for none |

Grip is measured against ground of the engine's default friction (0.5). Ground with less friction is slippery for
every vehicle (ice at 0.05), and ground with more is grippier.

## Suspension

Each wheel's spring defaults to a 1.5 Hz bounce for its share of the mass, with half of critical damping, and 0.2 m
of travel. Driving off a 15 cm kerb, the default car's wheels drop and land once, and the body is still again within
0.25 s of the back wheels landing; landing from a 1.5 m drop at 50 km/h it doesn't leave the ground again and is still
within 0.4 s. Parked or driving along with one side up a kerb, no wheel lifts off. The tests check all of these
(below).

Anti-roll bars are real rates: 10,000 N/m on the default car rolls it 1.7 degrees at 1.2 g, 40,000 about 0.7. The
simulation works a bar out once a step, so a very stiff one would set the body rocking between its wheels by itself:
a bar too stiff to keep steady at the step rate is limited to the stiffest that does (about 170,000 N/m for the
default car at 60 steps a second).

## Kerbs and wheel guards

A car meets a kerb up to `stepHeight` tall (65% of the wheel's radius: 22 cm on the default car, so a 20 cm city
kerb) with a jolt: the front wheels bump up, then the back, and it carries on. Coasting into a 15 cm kerb or a 20 cm
road-tile kerb at 10, 30 or 60 km/h, head-on or at 30 degrees, the default car and a saloon whose wheels stand
outside its body keep their speed (87 to 93%, the same as coasting that far on the flat) and pitch a few degrees.
A taller step stops the wheel like a wall.

Each wheel finds the ground with a cast down from its suspension's fixing point. Two things made kerbs stop cars:
that point sits only a wheel's sag above the bottom of the tyre (about 20 cm), so a wheel's cast already overlapped a
kerb's face instead of coming down on its top, and the suspension (and its bump stop) pushes along the contact's
normal, which was the kerb's face: the bump stop took all the car's speed into the kerb at once, and on a road tile's
kerb (a surface, not a solid) the wheel then dropped inside it. Now the cast starts above any step the wheel rides
up (the suspension is fixed higher and made longer by the same, so the wheel, spring and stops don't move), and a
car's wheels cast a ray, which reports the top of the kerb (facing up) as the wheel's centre crosses its edge. A
cylinder (the tyre's outline, `wheelCast: "cylinder"`) meets the kerb's edge at an angle as a real tyre does, but the
push back is a rigid bump stop's, not a tyre's: a car coasting at 10 km/h stopped at a 20 cm kerb, and lost 20 to 40%
of its speed at 30. Motorcycles keep the cylinder: a ray along a fork leaning 45 degrees reaches the ground 13 cm late.

Wheel guards (`wheelGuards`, on by default) are boxes over each wheel's upper half, as wide as the tyre and a
centimetre more, added to the chassis for collision only (the mass and inertia are the chassis shape's alone). A wheel
side-on to a low wall or a bollard, or a motorcycle's front wheel meeting a wall, stops at it instead of poking in.
Their bottoms sit 5 cm above `stepHeight` (where the wheel rests on its springs), so kerbs pass under them. They have
the chassis' `friction`: a lower friction of their own needs per-shape friction, which Jolt gives only through a
contact callback that can't run on its worker threads.

## Combined grip

A tyre has one budget of grip, shared between driving or braking and cornering (a friction circle): spin the driven
wheels or lock the brakes and there's little left for cornering. `combinedGrip` (default 1 for cars, 0 for
motorcycles) sets how much of this the tyres do: 1 is a real tyre, 0 keeps the two apart, as before (a spinning wheel
still corners).

With it, a powerful car without traction control does doughnuts (full lock and full throttle from rest: its tail
slides out, 37 degrees at the rear axle against 2 without it) and steps its tail out when it's floored out of a slow
corner; a car with traction control (the default) keeps its wheels near the peak of their grip and stays tidy (2
degrees). Locked wheels lose their sideways grip too: a car on full brakes in a bend goes straighter on (there's no
anti-lock braking), and handbrake turns swing round further (`handbrakeGrip` still scales them).

A wheel's slip ratio past its curve's peak (6%) cuts its sideways grip to 1 / sqrt(1 + over²) (over: the slip ratio
over the peak's, less one): 89% at 9% slip (about what traction control allows), 45% at 18%, 7% locked, never below
10%. Within the peak it's untouched. Only a wheel the driver is driving (throttle) or braking (brakes, handbrake)
counts, once it has carried half its share of the weight for a quarter of a second: a wheel spun up in the air off a
jump, or one nearly unloaded on the inside of a fast swerve under throttle, spins until the ground slows it once it's
loaded again, and counting that spun rear-drive cars out of lane changes. Grip along the tyre isn't cut for sliding
sideways: a car's tyre needs some just to keep rolling, and taking it away let wheels spin or lock in fast corners.
A tall, heavy rear-drive van or bus can still lift and spin an inside wheel under throttle in a fast swerve: give it
less (0.35 keeps the driving spike's van and bus straight through a 110 km/h lane change).

## Arcade assists

A driving game's car turns hard and fast at any speed (in GTA a 90 degree junction at 100 km/h takes a radius of about
25 to 30 m, about 3 g), goes where it's pointed, and doesn't spin or roll over unless the player asks it to (the
handbrake, a power slide). Real tyres at speed do none of that: a full stick at 120 km/h spins a car or ploughs on, and
a car's tyres can't corner much over 1.2 g. So cars have assists by default, worked out in `IgePhysicsVehicle3d` for
every backend and applied as a force and a torque through the backend (accelerations, so a bus gets the same help as a
car). A simulation turns them off:

```typescript
physics.addVehicle(entity, {
	yawAssist: { strength: 0 }, stabilityAssist: { strength: 0 }, steering: { slip: Infinity }, antiRollover: 0
});
```

- **The turn asked for.** The steering asks for a rate of turn: what the steering's geometry gives at low speed (speed
  x tan(lock) / wheelbase), and faster the rate that gives a sideways acceleration of `yawAssist.lateralG` (default:
  the tyres' grip, about 1.2 g), so the turning circle widens with speed. From 60% of `yawAssist.highSpeed` (28 m/s,
  100 km/h; so from 60 km/h) the acceleration asked for blends to `yawAssist.highSpeedG` (default 3 g), reached at
  `highSpeed`: arcade turning at speed, beyond the tyres' grip. Half the stick asks for half. Below 60 km/h nothing
  of the high-speed turning applies.
- **Steering at speed.** The steering follows the input at `steering.rate` slowly, blending to
  `yawAssist.highSpeedRate` (default twice `steering.rate`) at speed, so the turn builds quickly there (90% in 0.1 to
  0.15 s at 100 km/h) while slow steering stays smooth. The lock narrows at speed to the angle that makes the turn
  asked for plus `steering.slip` (2.5 degrees), so the stick's whole travel turns the car; `highSpeedLock` still
  narrows it at low speed. Without it (`slip: Infinity`), at 60 km/h the driving spike's saloon turned as hard at half
  the stick as at full.
- **Yaw assist** (`yawAssist.strength`, 0..1): turning less than asked, in its direction (understeer), a torque turns
  the vehicle towards it: at most 3 radians per second squared slowly, rising to 30 at speed. It stops helping once
  the rear axle slides from 3 to 6 degrees (9 to 18 at speed; it isn't there to spin the car), and fades out as the
  body tilts from 8 to 14 degrees.
- **Stability** (`stabilityAssist.strength`, 0..1): turning more than asked (overshoot, oversteer), the other way, or
  at all with the steering straight, a torque turns it back beyond a margin of 0.02 radians a second (at most 20
  radians per second squared, 40 at speed): no sudden spins, and a lane change stops turning at once. Its rear axle
  sliding sideways more than 3 degrees (a car turning without sliding goes straight along its rear axle), its velocity
  turns towards where it's pointed, keeping its speed: up to 0.6 g slowly, and at speed up to the whole turn asked for,
  which is how it corners at 3 g on tyres that hold 1.2 (the car drifts 4 to 5 degrees doing it). It eases off while
  the handbrake is on, and while the driven wheels spin under throttle below `stabilityAssist.slideSpeed` (15 m/s), so
  handbrake turns, power slides and doughnuts still happen; it comes back over 0.8 s after (eased in), so a slide let
  go of carries on a little and is then caught. A vehicle sliding more than 70 degrees has spun, and is left to it.
- **Anti-rollover** (`antiRollover`, g; default 2.5, or twice the tyres' grip if more, for cars): the tyres' sideways
  force acts at the ground, below the centre of mass, and rolls the body out of a turn. Measured from each step's
  change in velocity (less gravity and the assists' own push), it's met with a torque that makes the centre of mass act
  as low as cornering at `antiRollover` without tipping needs. A car with a low centre of mass is hardly touched; a van
  or bus gets most of it, and leans 2 to 3 degrees instead of rolling over. The stability's push acts at the centre of
  mass and rolls nothing.
- **Downforce** (`downforce`, default 0): a push down with the square of the speed, as a share of the weight at
  50 m/s, so the tyres grip harder at speed. 0.3 is 18% more grip at 140 km/h.

None of them act in the air, with fewer than half the wheels down, tilted past 45 degrees, below 1 to 4 m/s forward or
reversing (anti-rollover apart), or in kinematic mode. Motorcycles have none unless given (they lean into their turns
themselves).

In the tests, a saloon with less grip at the back than the front spins round at 120 km/h in a full-stick turn, a lane
change and even a quarter-second tap without the assists, and slides under 6 degrees with them; the default car turns
at 3 g at 120 km/h (a 38 m radius), reaches 90% of it within 0.2 s, at half the stick about half as hard, as before
below 60 km/h, and stops turning within half a second of a lane change; a tall van rolls over at full lock at 50 km/h
without anti-rollover and leans under 8 degrees with it; a handbrake turn swings as far as without the assists, and a
powerful car without traction control still does doughnuts. In the driving spike (ige-gta, `docs/spikes/driving.md`),
the game's cars at 100 km/h turn on a 24 to 29 m radius and reach 90% of the turn in 0.10 to 0.15 s, with no spins or
rollovers (before the assists: 50 to 58 m, darting in 0.03 to 0.08 s and overshooting by 15 to 110%, and the taxi
spun at 140).

Tuning:

- `yawAssist.highSpeedG` is the feel at speed, `lateralG` below 60 km/h. The stability's push makes the turn at speed
  whatever the tyres' grip, so it's the arcade's dial; a tall vehicle wants less, and anti-rollover.
- Grippy tyres (grip 2 and up) turn harder than asked by 10 to 25% at speed: the stability holds the car near it, not
  exactly to it. Their default anti-rollover is higher (twice the grip): grip 2.6 rolled a sports car over at 3.4 g.
- The assists don't know the ground's friction: on ice the stability still pulls the car round at up to the turn
  asked for. Anti-rollover takes gravity as 9.81 m/s².

## Changing options

```typescript
car.setOptions({ mass: 1600, engine: { maxTorque: 650 }, grip: 1.4 });
car.options(); // what it's using
```

`setOptions()` changes a vehicle while it's driven (a tuning panel, an upgrade, damage): the fields given replace the
ones it was made with (`engine`, `gearbox`, `steering`, `yawAssist` and `stabilityAssist` field by field), and it
carries on at the same place, speed, revs and gear. The assists and downforce change at once. Mass, engine, gearbox and clutch, final drive, springs, dampers and where they're fixed, steering lock,
brakes, grip, anti-roll bars, friction and the tilt limit change in place. A new chassis, wheels of another size or
number, or more gears make its simulation again from its state, still the same vehicle object (its events, entity and
wheel entities stay). `type` can't change.

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

The clutch passes the engine's torque in proportion to how much faster the engine turns than the wheels behind it.
`gearbox.clutchStrength` is that rate, N·m per radian per second of slip, and defaults to the engine's peak torque
over 50 rad/s (480 rpm; 10 for the default car), so a big engine gets a strong clutch. With every vehicle's at 10, an
11-tonne bus with 1,250 N·m slipped its clutch, the revs ran up and the automatic box changed up at 14 km/h instead
of the 17 km/h first gear reaches.

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
Apple silicon Mac. Each wheel casts a ray (a car's) or a cylinder (a motorcycle's) down to the ground every step.

## Limits

- Wheels are casts, not bodies; the chassis shape and the wheel guards are what hit things. A car's front tyre passes
  into a kerb's face by up to its radius before its centre crosses the edge and it bumps up (a few frames at speed).
- No anti-lock brakes: full braking locks wheels, and with `combinedGrip` locked front wheels don't steer.
- `maxTilt` keeps a ridden motorcycle from falling over at all (until `upright(false)`).
- Air control, self-righting and weight shift turn the vehicle directly (as an angular acceleration), not through a
  modelled rider or centre of mass.
- The arcade assists push the chassis directly too (torques, and a sideways force when it slides), not through the
  tyres or the brakes, and don't know the ground's friction (see "Arcade assists").
- Traction control's hold on the throttle isn't in `getState()`: a copy put in a state just before a gear change can
  change up a few steps early.

## Backends

The public API is `IgePhysicsVehicle3dApi` and its option, input, readout and state types (in
`IgePhysicsVehicle3dApi.ts`, with no physics library in them). `IgePhysicsVehicle3d` implements it for every backend:
it fills in the options (`resolveVehicleSpec()`), shapes the input, places the entity and poses the wheels between
steps, works out the readouts, air control, self-righting and weight shift, impacts and landings, and handles state
and kinematic targets. Underneath, the world's backend makes an `IgeVehicleBackend` with
`IgePhysicsBackend.createVehicle()` (see [physics-3d.md](physics-3d.md), "Backends"), from the resolved spec in metres
(`IgeVehicleBackendSpec`, `IgePhysicsVehicle3dBackend.ts`): `setInput()`, `preStep()`, `readPose()`,
`readVelocity()`, `readWheel()` (which reports the ground's body handle), `rpm()`, `gear()`, `shift()`, `setState()`,
`setKinematic()`, `moveKinematic()`, `setEnabled()`, `addAngularVelocity()`, `accelerate()` (a force and a torque that
give the chassis an acceleration for a step, and a further torque in N·m: the arcade assists), `setUpright()`,
optionally `retune()`
(a new spec in place, for `setOptions()`; without it the vehicle is made again) and `destroy()`, and its chassis as
`body`, so raycasts, sensors and impacts find it. The chassis includes the spec's wheel `guards`, which collide but
don't count towards its mass. A wheel must find a step up to its `stepHeight` from above.

`IgeJoltVehicle3d` is Jolt's: a body (which can switch to kinematic) with Jolt's `VehicleConstraint`, a
`WheeledVehicleController` or `MotorcycleController`, and a step listener. A second backend needs suspension casts
with springs and dampers, anti-roll bars, tyre friction from slip, an engine, gearbox and differentials, a lean
controller for motorcycles, and a kinematic mode that still pushes bodies, and must report each wheel's suspension
length, steering and spin angles, spin rate, contact and slip. `setUpright(false)` turns off the motorcycle's balance
and the tilt limit (Jolt: the lean controller and the constraint's pitch and roll limit).

Seven things in the Jolt backend are worth knowing when tuning:

- Jolt combines tyre and ground friction as `sqrt(tyre * ground)`, so its tyre curves are scaled for `grip` to mean
  the same on ground of friction 0.5.
- Jolt hands an anti-roll bar's impulse to each wheel's suspension as a velocity bias, and the suspension is a soft
  constraint, so the bar pushes with that bias times the constraint's effective mass (about 50 kg for the default car
  at 60 Hz). `IgeJoltVehicle3d._setAntiRollBars()` divides that out, so `antiRoll` is in N/m. Given to Jolt as it
  was, the default 10,000 acted like 530,000 N/m, 18 times stiffer than the springs: cars rocked between their wheels
  at 15 Hz, and one parked with a side up a kerb, or driving off one at an angle, hopped from wheel to wheel and could
  tip over.
- Jolt reads its tyre curve once a step, from the slip at the start of the step, and its curve gives no grip at zero
  slip, so driven wheels pulling away flick between rolling and spinning on alternate steps (with every wheel on the
  ground throughout). Car tyres get full grip at zero slip instead. Motorcycles keep Jolt's curve: with grip at zero
  slip, a heavier, more powerful bike fell onto its tilt limit when weaving and after jumps. The friction circle
  doesn't change this: Jolt's curves are the most friction its tyre constraints may use, and a car's still needs some
  at zero slip to keep a wheel rolling.
- Jolt casts a wheel from its suspension's fixing point, so `IgeJoltVehicle3d` fixes each wheel higher by
  `stepHeight` plus 3 cm less the travel to the bump stop, and lengthens the suspension by the same, keeping the
  wheel, spring and stops where they were; `readWheel()` takes the extra length back off. Jolt's cylinder cast reports
  where it first overlaps (with no slope limit) and the suspension pushes along that normal, hence rays for cars.
- Combined grip (`_updateGrip()`) scales each wheel's sideways tyre curve before each step from Jolt's slip ratio in
  the last one. A wheel at the edge of spinning flicks between spinning and rolling from step to step, so its slip is
  held at its recent peak (falling by 40% a step) and the scale eased.
- Car wheels cast rays from the lower edge of the tyre's tread, half its width out, as the body rolls (`_placeRays()`):
  a tilted cylinder rests on that edge, which widens the track, and rays from the middle of the tyre made a van roll
  over at 1.1 g that rolls 4 degrees on cylinders. Body roll and stability are as the cylinder cast gave them.
- `retune()` changes the engine, transmission, differentials, wheel settings, curves, anti-roll bars, mass (inverse
  mass and inertia scaled; the shape is the same) and friction of the live constraint and body.

## Example and tests

`src/examples/vehicles` is a drivable car and motorcycle on a field with roads, a pavement behind a 15 cm kerb, ramps,
speed bumps and crates, with a chase camera and a readout of speed, revs and gear, crashes and landings. I K J L (or
the right stick) pitch and roll it, and X drops the motorcycle. Build it with
`npx webpack --config ./config/webpack.config.cjs --config-name vehicles`, and serve `dist/esm` with the
cross-origin isolation headers (see [physics-3d.md](physics-3d.md), "Threads") to run Jolt threaded.

`src/tests/IgePhysicsVehicle3d.test.ts` drives vehicles headlessly in jest through the public API only, once for each
backend in `src/tests/support/physics3dTestWorld.ts`: driving, braking, slip, state, kinematic mode, impacts, wheels
against walls, landings, air control, self-righting, letting a motorcycle fall, wheelies and stoppies. Its kerb and
jump tests drive off a 15 cm kerb straight and at an angle, park and drive with one side up a kerb, and land from
1.5 m, counting wheels lifting off and how long the body takes to be still. Others drive up 15 cm box and 20 cm
road-tile kerbs at 10, 30 and 60 km/h, head-on and at 30 degrees, keep wheels out of a low wall and a motorcycle's
front wheel out of a wall with guards, do doughnuts with combined grip, pull a heavy bus away on its clutch, change
options while driving, and check the arcade assists: no spin at full stick, in a lane change or a tap at 120 km/h for a
car that spins without them, the high-speed turn at 120 km/h (how hard, how quickly, in proportion to the stick, the
same as before below 60 km/h), settling after a lane change, a tall van kept on its wheels by anti-rollover, handbrake
turns and doughnuts as without them, and none on motorcycles.
`src/tests/IgeJoltVehicle3d.test.ts` checks that Jolt gets back every byte a vehicle takes.
