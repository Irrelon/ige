# Aircraft, boats and water

`IgePhysics3d` flies planes and helicopters and floats boats, crates and wrecks on water. It's GTA-style arcade
handling: planes that are forgiving but can still stall and need their landing gear, helicopters that hover by
themselves, boats that ride the waves, lean into turns and won't stay capsized.

Flight and buoyancy are worked out in the engine's own code (lift, drag, thrust, buoyancy and water drag) and pushed
onto ordinary bodies with forces and torques through the physics backend. Nothing uses a physics library's own vehicle
or buoyancy features, so it all works the same on any backend (see "Backends" at the end). Read
[physics-3d.md](physics-3d.md) first for the world, units and threads.

## Water

```typescript
const water = physics.water({
	level: 0,
	waves: [
		{ direction: 25, length: 6000, amplitude: 32, steepness: 0.4 }, // a long swell
		{ direction: 70, length: 2300, amplitude: 12, steepness: 0.5, phase: 1.3 } // a shorter chop across it
	]
});
water.heightAt(x, z); // the surface under a point, now
```

Water is a level with a few waves summed on it: one function of position and time, `IgeWater3d`
(`src/engine/physics/IgeWater3d.ts`). It needs nothing else, no physics and no renderer, so the same options give the
same surface everywhere: buoyancy, the drawn sea, the server and every client. Send the options (they're plain JSON,
`water.options()`) and keep the clocks together.

| Wave option | | |
|---|---|---|
| `direction` | | The way it travels, degrees: 0 along +Z, 90 along +X |
| `length` | | Crest to crest, IGE units |
| `amplitude` | | A crest's height above the level, IGE units |
| `steepness` | 0.5 | 0 a rounded swell, towards 1 sharp crests and flat troughs (Gerstner waves: the surface sways to and fro as well). Keep the waves' total under 1 |
| `speed` | deep water's | IGE units per second. Deep water carries a 60 m wave at about 9.7 m/s |
| `phase` | 0 | Radians, so waves start out of step |

The water also takes a `current` (IGE units per second: floating things drift with it), a `density` (1025, sea water;
1000 for fresh) and `regions`: boxes seen from above where there is water, each with its own `level`, `waves` (0 for
a flat dock or pond, 1 for the full waves) and `current`. Outside every region there's no water (`heightAt()` gives
`-Infinity`), so a lake up a hill and the sea can sit in one world. The first region holding a point wins.

`water.time()` is the clock, in seconds. The physics world moves it on with every step. Set it from a shared clock
(the server's time) so every machine has the same waves: `physics.water().time(serverSeconds)`.

To draw the sea, move a grid's vertices with `water.surfaceAt(x0, z0, t, position, normal)`: it gives where the
surface point that rests at `(x0, z0)` is, and its normal. The example's `SeaGrid` (`src/examples/airSea/geometry.ts`)
is a grid that follows the camera in whole steps of its spacing (so the waves don't swim), finer in the middle, its
waves fading out at the edge to meet a flat far sea.

## Boats

```typescript
physics.water({ level: 0, waves });
const boat = physics.addBoat(boatEntity, { preset: "speedboat" });

// every frame, from input
boat.drive({ throttle, steer });
```

A boat faces +Z of its entity, with its origin on the keel under the middle of the hull. Put it on the water and it
settles as deep as its weight says.

| Control | Range | |
|---|---|---|
| `throttle` | -1..1 | Ahead; below 0, astern (at `reverse`, 40% of the thrust) |
| `steer` | -1..1 | Rudder, 1 turns right |

What it does:

- **Buoyancy.** A grid of sample points over the hull, each a column from the keel to the deck. A column pushes up
  with the weight of the water it displaces, where it is, so a boat tips back level, pitches over a swell and rides
  the waves. Bobbing is damped as real hulls are by the waves they make.
- **Drag.** Little forwards (it tops out at `maxSpeed`), a lot sideways (the keel), damped turning.
- **Propeller.** It only pushes while it's under water: a boat leaping off a wave revs, and a boat on dry land goes
  nowhere. `propellerInWater()` says which.
- **Rudder.** It turns the boat harder the faster it goes (full effect from `turnSpeed`), and a little at low speed
  in the propeller's wash, but never tighter than 2.5 g across the water, so a speedboat flat out turns at about 28
  degrees a second rather than its full `turnRate`. Going astern, it turns the other way.
- **Planing.** At speed a speedboat's hull lifts out of the water (less of it under, less drag) and its bow rises,
  most around `planing.speed`, settling a little once it's up on the plane.
- **Arcade help.** It leans into turns (`bank`), is hard to capsize and rights itself if it does (`stability`), in a
  second or two from upside down. The propeller pushes level with the centre of mass, so full throttle can't stand
  it on its stern, and leaping clear of the water off a swell it holds itself about level, so it lands flat.

| Preset | Size | Mass | Top speed | Feel |
|---|---|---|---|---|
| `speedboat` (default) | 7 x 2.4 m | 1.8 t | 180 km/h | Quick (0 to 100 km/h in about 2.5 s), bow up getting going, banks into turns, leaps the swell |
| `fishingBoat` | 12 x 4 m | 15 t | 32 km/h | Heavy and steady |
| `yacht` | 22 x 6 m | 60 t | 58 km/h | Big, lifts its bow a little |
| `cargoShip` | 120 x 20 m | 8,000 t | 32 km/h | Slow to get going, slower to turn |

Every option falls back to the preset: `mass`, `hull` (`{ length, width, height }`, IGE units), `shape` (collision,
default the preset's hull and cabin), `centreOfMass`, `volume` (cubic metres it displaces fully under), `points`
(buoyancy sample points), `maxSpeed`, `thrust` (newtons), `reverse`, `propeller` (where it is), `turnRate` (degrees per
second), `turnSpeed`, `bank` (degrees), `planing` (`{ lift, bowRise, speed }`), `stability`, `drag`, `friction`,
`impacts`, `extrapolate`, `layer` and `propellerEntity` (spun with the engine).

Readouts: `speed()` (along its facing, IGE units per second), `speedKmh()`, `velocity()`, `submerged()` (the share
of the hull under water), `propellerInWater()`, `airborne()`, `tilt()` and `attitude()` (`{ pitch, roll, heading }`
in degrees).

## Floating anything

```typescript
const crate = physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 40, y: 40, z: 40 } }, density: 300 });
physics.addBuoyancy(crate); // floats with 29% of it under

const safe = physics.addBody(other, { shape, density: 3000 });
physics.addBuoyancy(safe); // sinks, slowed by the water
```

`addBuoyancy(body, options)` floats any dynamic body by its density. Its volume is its mass over the density it was
made with, so a body lighter than water floats with that share of it under and a heavier one sinks. Give a `volume`
for something full of air (a wreck, a barrel), `points` to float it from places of your own, and `drag`. By default it
floats from eight points, one in each corner of its shape's box, so it floats right however it's turned. It drifts with
the current. `submerged()` and `inWater()` say how it's doing; `destroy()` stops it floating.

`addBuoyancy(ragdoll)` floats a person: every part by the ragdoll's density. That's 1000 by default, about a body's,
so the dead float in the sea, mostly under. Make the ragdoll with `density: 1100` and they sink in fresh water and sea
alike.

## Planes

```typescript
const plane = physics.addAircraft(planeEntity, { preset: "lightPlane", gearEntities: [noseWheel, leftWheel, rightWheel] });

// every frame, from input
plane.fly({ throttle, pitch, roll, yaw, brake, flaps, gear });
```

A plane faces +Z, with its origin on the ground under it as it rests on its wheels. The sticks and the brake are 0
when left out of `fly()`. The levers (`throttle`, `flaps`, `gear`, `engine`) stay where they were, like a real lever,
so a game can set them only when the player moves them.

| Control | Range | |
|---|---|---|
| `throttle` | 0..1 | Lever. The engine follows it over `spoolTime` (quick for a propeller, slower for a jet) |
| `pitch` | -1..1 | 1 pushes the nose down (stick forward), -1 pulls it up. The same way round as a vehicle's `pitch` |
| `roll` | -1..1 | 1 rolls right |
| `yaw` | -1..1 | 1 turns the nose right: rudder in the air, nose-wheel steering on the ground |
| `brake` | 0..1 | Wheel brakes |
| `flaps` | 0..1 | Lever: more lift and drag, a lower stall speed |
| `gear` | true / false | Lever: down or up. It won't come up with weight on it |
| `engine` | true / false | Lever, default true |

What it does:

- **Lift** from airspeed and the wing's angle of attack, straight up to `stallAngle` (20 degrees for the light plane),
  then falling away softly. The wing has a 2-degree incidence, so it lifts a little with the fuselage level.
- **Stalls** are rare: it takes being really slow and nose-high. Past the stall angle, lift drops, drag climbs and
  the nose drops by itself, even with the stick held back, briskly enough that the wing flies again in about
  `stallRecovery` seconds (1; a short nod of 10 to 20 degrees). `stalled()` says when.
- **Drag**: parasitic (set so it tops out at `maxSpeed` at full throttle), induced, flaps, lowered gear.
- **Thrust** along the nose. A propeller's falls off with speed, a jet's doesn't.
- **Control.** The stick sets turn rates (`pitchRate`, `rollRate`, `yawRate`), reached at the `response` rate through
  the body's inertia, and only as far as the airflow allows: the controls do little until `controlSpeed`, but a
  propeller's wash helps the elevator and rudder taxiing. It weathervanes into the airflow and side-slip pushes it
  back in line with its nose, so it flies where it points.
- **Assists** (`assists: false` to turn off):
  - let go of the stick and the wings level and the nose eases level; banked turns are coordinated, so the nose comes
    round with the bank;
  - a hard pull flies at the edge of the stall, not over it: the nose comes up no faster than the airflow follows it.
    This fades out below 1.3 times the stall speed (so slow and nose-high it can still stall), and holds after a
    stall until it has its speed back, so it doesn't stall again straight away;
  - **auto-flare**: low over the ground (or the water, on floats) with the gear down and sinking, the sink eases off
    as it gets lower (to about half a metre a second at the ground, from 5 m up for the light plane and 12 m for the
    airliner) and the nose comes up to about 5 degrees, so it touches down gently without careful timing. Pushing
    the stick forward overrides the nose; the gear up, it doesn't flare;
  - on its wheels at speed, the nose follows the way it's rolling, so a crabbed touchdown straightens up.
- **Landing gear.** Each wheel is a sprung strut found by a ray down to the ground, with its own spring and damper (a
  1.5 Hz bounce for its share of the weight), tyre grip sideways, rolling resistance, brakes on the main wheels and
  steering on the nose wheel (full lock taxiing, little at take-off speed). Retracted, it lands on its belly.
  `gearEntities` (or `entity` per wheel in `gear`) are posed: compression, steering, spin, and folding away.
- **Forgiving touchdowns.** A firm or crooked landing (3 m/s down, 5 degrees of crab, a wing low) neither bounces nor
  tips it: the struts are damped two and a half times harder springing back out than going in, and soak up the blow
  when they bottom out; the tyres' grip acts most of the way up towards the centre of mass, so it can't roll the
  aircraft over its wheels; roll is damped while it's on its wheels; for half a second after touching down the tyres
  skid sideways as they spin up, and the nose wheel castors at speed, so the nose swings into the direction it's
  going rather than snatching it sideways. Only a real crash ends badly.
- **Floats** (the floatplane) are buoyancy points: it floats, taxis and turns on the water with the rudder in the
  propeller's wash, and takes off when the wing lifts it clear.

| Preset | Mass | Stall | Stall angle | Top speed | Take-off run | Feel |
|---|---|---|---|---|---|---|
| `lightPlane` (default) | 1.1 t | 60 km/h | 20° | 234 km/h | about 115 m | Forgiving, quick to answer |
| `floatplane` | 1.25 t | 63 km/h | 20° | 209 km/h | about 13 s on the water | The light plane on floats |
| `jet` | 9 t | 132 km/h | 23° | 900 km/h | about 110 m | Fast, high thrust, rolls hard |
| `airliner` | 65 t | 149 km/h | 19° | 864 km/h | about 630 m | Heavy, slow to answer, a long run |

Stall speeds are for level flight with flaps up; full flaps take 10 to 15% off. A stall lasts about half a second in
the light plane, floatplane and jet (`stallRecovery` 1) and a little over a second in the airliner
(`stallRecovery` 1.5). Options fall back to the preset: `mass`, `shape`, `centreOfMass`, `wingArea` (m²),
`stallSpeed`, `maxSpeed`, `thrust` (newtons), `engine` (`"propeller"` or `"jet"`), `spoolTime`, `stallAngle`,
`stallRecovery` (seconds), `pitchRate`, `rollRate`, `yawRate`, `response`, `controlSpeed`, `flaps`
(`{ lift, drag }`), `gear`, `retractable`, `gearTime`, `floats`, `assists`, `friction`, `impacts`, `extrapolate`,
`layer` and `rotorEntity` (a propeller, spun about its Z).

The wing's most lift is worked out from the stall speed, and its drag from the top speed, so a plane is tuned with
figures you'd look up: weight, wing area, stall speed, top speed, thrust.

Readouts: `airspeed()`, `speedKmh()`, `altitude()` (its origin's height), `heightAboveGround()` (to the ground or the
water's surface below, up to a kilometre), `verticalSpeed()`, `angleOfAttack()` (degrees), `stalled()`, `engine()`,
`gear()` (0 up to 1 down) and `gearDown()`, `flaps()`, `grounded()`, `wheel(i)` (`contact`, `compression`, `spin`,
`steer`), `submerged()` (floats), `attitude()`.

## Helicopters

```typescript
const heli = physics.addAircraft(heliEntity, { preset: "helicopter", rotorEntity: rotor, tailRotorEntity: tail });

// every frame, from input
heli.fly({ collective, pitch, roll, yaw });
```

| Control | Range | |
|---|---|---|
| `collective` | -1..1 | 1 climbs (`climbRate`, 10 m/s), -1 descends (`descentRate`, 8 m/s). Centred, it holds height |
| `pitch` | -1..1 | Cyclic: 1 tilts the nose down and flies forwards |
| `roll` | -1..1 | Cyclic: 1 tilts right and slides right |
| `yaw` | -1..1 | Tail rotor: 1 turns right |

The rotor pushes along the helicopter's up, so tilting it flies it. With the assists (on unless `assists: false`):

- **Hover.** Sitting on the ground with the collective centred, it stays down. Raise the collective to lift off; centre
  it and it settles and holds that height, even tilted in forward flight.
- **Level.** The cyclic tilts it to a target angle (up to `maxTilt`, 32 degrees). Let go and it's level within
  `levelTime` (half a second), without overshooting, then leans back against its drift (about 2.5 degrees per m/s,
  at most 60% of `maxTilt`) and brakes it, so it stops without wobbling or coming back: a drift of a few metres a
  second in about two seconds, from flat out in about seven. A gamepad stick near the middle blends into this, so
  small movements fly slowly rather than switching the levelling off.
- **Landing.** Descending near the ground (or water), it eases down to about half a metre a second, so it sets down
  softly on a helipad or a roof.

The rotor spins up over `spinUp` seconds (`fly({ engine: false })` stops it), and drives `rotorEntity` (spun about its
Y) and `tailRotorEntity` (about its X). `rotor()` is its speed, 0 to 1. In forward flight its tail fin turns it into
the airflow. It tops out at `maxSpeed` (250 km/h) fully tilted.

## Events, state and the network

Boats and aircraft share these with vehicles:

- `"impact"` (with `impacts: true` or a threshold in IGE units per second): `{ speed, impulse, others }`. Their own
  forces (lift, thrust, the gear's springs, buoyancy) are allowed for, so flying, landing on the gear and riding waves
  report nothing; hitting a wall does.
- `"landed"`: `{ airTime, speed, velocity, tilt, onGear, onWater }` when it comes down after a quarter of a second in
  the air. `onGear` is on its wheels, skids or floats; `onWater` into the water. Whether a hard landing breaks
  something is the game's call.
- `getState()` / `setState()`: `position`, `rotation`, `velocity`, `angularVelocity`, and the craft's own: `input`
  (the held controls), `engine`, `rotor`, `gear` and `flaps`. Plain JSON. A plane copied into another world in flight
  carries on within half a metre of the original a second later. Set the copy's water clock the same, or its waves
  differ.
- `kinematic(true)`: it follows the states given to `setState()`, carrying on at their velocity for `extrapolate`
  seconds (0.25), still pushing bodies out of its way; the rotor, propeller and gear follow the state. A state more
  than 5 m away jumps it there. `kinematic(false)` hands it back to the simulation at the last state's speed.

The game's plan (`ige-gta/ARCHITECTURE.md`, "Netcode for fast things") maps onto this as it does for cars: the pilot's
machine flies its own aircraft and sends its state; everyone else's copy is kinematic.

`physics.craftOf(entity)` finds a boat or aircraft, raycasts report its entity, `craft.destroy()` or
`physics.removeCraft(craft)` removes it, and `physics.stats()` counts `crafts` and `floating` bodies.

## Bodies: forces, mass and centre of mass

The same calls are open to any body:

```typescript
body.applyForce(0, body.mass() * 9.81 * 100, 0); // every frame: holds it up (kg * IGE units per second squared)
body.applyForce(x, y, z, worldPoint);              // off-centre: pushes and turns it
body.applyTorque(0, 5, 0);                         // newton metres
body.centreOfMass();                               // world position
physics.addBody(entity, { shape, mass: 20, centreOfMass: { x: 0, y: -55, z: 0 } }); // a weeble
```

## Limits

- Arcade, not a simulator: control is by turn rate, there's no wind, no ground effect (bar the auto-flare's
  cushion), no torque from the propeller, air density is sea level's everywhere (no ceiling), and the lift and drag of
  the wing and tail act at the centre of mass (stability comes from the controller and the assists, not the tail's
  own lift). The low stall speeds come from a wing that lifts more than a real one could, not from a bigger wing.
- Water is a height field. Waves don't break, wakes and splashes aren't simulated, and a hull's sample points are
  columns, so very thin or tilted shapes float only roughly right. Buoyancy acts per point, so a few points per hull is
  cheap: eight to twelve for a boat.
- The drawn sea in the example is a grid re-uploaded every frame (about 26,000 vertices).
- Regions change the waves abruptly at their edges.
- Landing gear rays don't hit the water: a wheeled plane landing on the sea sinks (there's no ditching float).
- Helicopter skids are part of the body's shape: they slide on the ground and don't spring.
- Rotor blades and propellers aren't collision shapes.

## Backends

Flight and buoyancy use only these backend calls (see [physics-3d.md](physics-3d.md), "Backends"): `addForce()`,
`addTorque()` (newtons and newton metres, for the next step), `readBodyCentreOfMass()`, `readBodyInertia()`
(principal moments and their axes), `raycast()` with an `ignore` body (the gear's rays skip their own aircraft),
`setBodyKinematic()` (for bodies made with `allowKinematic`), and a body description's `mass` and `centreOfMass`. A new
backend that provides them flies and floats the same; `src/tests/IgePhysicsCraft3d.test.ts` checks it.

The neutral code: `IgeWater3d.ts` (the waves), `IgePhysicsBuoyancy3d.ts` (sample points, buoyancy, water drag),
`IgePhysicsCraft3d.ts` (what boats and aircraft share: forces counted for impacts, landings, state, kinematic mode),
`IgePhysicsBoat3d.ts`, `IgePhysicsAircraft3d.ts`, `IgePhysicsCraft3dFrame.ts` (a body's pose and motion for a step,
point velocities, torque for an angular acceleration), `IgePhysicsCraft3dPresets.ts` and the public types in
`IgePhysicsCraft3dApi.ts`.

## Example and tests

`src/examples/airSea` is an airfield island in a sea with waves: a 3 km runway and a short one, a helipad, a jetty with
floating crates, and a helicopter, light plane, floatplane, jet, airliner and speedboat to fly and drive, each with a
chase camera and a readout. Build it with `npx webpack --config ./config/webpack.config.cjs --config-name airSea`, copy
`src/examples/airSea/index.html` next to the bundle, and serve `dist/esm` with the cross-origin isolation headers.

| Craft | Keyboard | Gamepad |
|---|---|---|
| Planes | W S throttle, up down nose down and up, left right roll, A D rudder, space brakes, G gear, F flaps | Triggers throttle (left: brakes on the ground), left stick, bumpers yaw, A gear, X flaps |
| Helicopter | W S collective, arrows cyclic, A D yaw | Triggers collective, left stick, bumpers |
| Boat | W S throttle, A D or left right rudder | Triggers, left stick |

1 to 6 (or C, or gamepad Y) pick a craft, R (or B) puts it back at its start. P shows a tuning panel for the
current craft: sliders for its main figures (planes: stall speed, stall recovery, pitch and roll rates, top speed,
thrust; the helicopter: level time, most tilt, top speed; the speedboat: top speed, thrust, turn rate), applied live
by remaking the craft where it is. Each craft's tune is kept in the browser's localStorage and used whenever the
example starts; "Copy JSON" gives it in the presets' units (m/s, degrees, newtons, seconds) to fold into
`IgePhysicsCraft3dPresets.ts`; "Reset to preset" forgets it.

`src/tests/IgePhysicsCraft3d.test.ts` flies and drives them headlessly through the public API, once per backend:
boats floating at their depth, righting themselves, throttle, turning and planing, a speedboat flat out on the
example's waves and turning hard at top speed, crates floating or sinking by density, a light plane's take-off speed,
climb, stall, recovery and landing, every plane's stall speed, a hard pull at twice it that doesn't stall, stall
recovery and `stallRecovery`, firm crabbed and wing-low touchdowns that neither bounce nor tip, the auto-flare, a
jet's top speed, an airliner's run, a floatplane on the water, a helicopter's hover, flight and landing (on a helipad
too), its levelling and drift stop after the cyclic is let go, impacts, state round trips and kinematic mode. `IgeWater3d.test.ts` checks the waves; `IgeJoltCraft3d.test.ts` that Jolt gets back every byte.
