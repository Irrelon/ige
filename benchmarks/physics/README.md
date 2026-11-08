# Physics engine benchmark

Compares the browser builds of Jolt, Rapier and PhysX on scenes shaped like the zombie ARPG's physics load, to choose
IGE's physics engine. Separate from the engine: it has its own `package.json` and nothing in `src/` uses it.

```sh
cd benchmarks/physics
npm install
npm run dev            # http://localhost:5195
```

Open `http://localhost:5195/?auto=1` (or press Run). Options: `rounds=2`, `engines=jolt,jolt-mt,rapier,rapier-simd,physx`,
`scenes=horde,debris,ragdolls,raycasts`, `joltContacts=20000`. Each engine/scene run happens in a fresh iframe and the
engine order rotates every round; the table shows the best round. Results are also on `window.benchmarkResults`.

The page is served cross-origin isolated (see `vite.config.js`), which gives precise timers and lets Jolt's
multithreaded build use `SharedArrayBuffer`. A game using threaded Jolt needs the same two headers.

## Scenes

All in metres with 1/60 s steps, density 1000, friction 0.5, and each engine's default solver settings (Jolt: 10
velocity and 2 position iterations; Rapier: 4 iterations; PhysX: PGS, 4 position and 1 velocity iteration), so the
engines aren't doing equal work per step: Jolt's defaults are the most thorough.

| Scene | What it does |
|---|---|
| horde | 500 upright capsules (1.8 m zombies, rotation locked) steering at 2.5 m/s towards four players walking in circles, in a 60 x 60 m lobby with walls and 12 pillars; they crowd into tight clumps |
| debris | 1000 boxes of mixed sizes dropped in 25 columns, settling into piles |
| ragdolls | 100 ragdolls of 11 boxes and 10 ball joints, dropped onto each other |
| raycasts | the horde scene plus 2000 horizontal rays (20 m) per step |

Each run checks the result is sane (zombies stand at their expected height, nothing fell through the floor).

Engine notes found while building it:

- Jolt aborts on its first step when `mMaxContactConstraints` is large (100000 here): it sizes a per-step buffer from it
  in a fixed-size temporary allocator. 20000 works.
- PhysX capsules lie along X, so standing ones need a local rotation.
- Rapier and Jolt need joint/group settings so jointed ragdoll parts don't collide; PhysX joints do that by default.

## Results (2026-11-08)

Apple silicon Mac, Chrome, cross-origin isolated, best of two rounds (the rounds agreed closely). Milliseconds per
1/60 s step, mean / 95th percentile; every run passed its sanity check.

| Scene | Jolt | Jolt, threaded | Rapier | Rapier SIMD | PhysX |
|---|---|---|---|---|---|
| Horde, 500 capsules | 2.63 / 2.98 | 0.94 / 1.33 | 1.68 / 1.91 | 0.94 / 1.11 | **0.88 / 1.00** |
| Debris, 1000 boxes | 5.08 / 10.49 | 1.75 / 3.05 | 2.26 / 4.86 | **1.56** / 3.79 | 2.04 / **2.67** |
| Ragdolls, 100 x 11 bodies | 4.76 / 8.32 | **0.99 / 1.37** | 3.87 / 5.20 | 2.20 / 3.56 | 1.17 / 2.67 |
| 2000 raycasts (excluding the step) | 2.54 | 1.78 | **1.67** | 1.69 | 2.51 |
| First 10 steps, total | 20-50 | 11-16 | 45-70 | 37-56 | **4-17** |
| Start-up (cached) | 14 | 884 (worker threads) | 14 | 14 | 21 |
| Download, gzip (MB) | **0.7** (0.9 single file) | 0.8 | 1.1 (1.6 single file) | 1.6 single file | 1.9 |

- PhysX is the fastest single-threaded engine on most scenes; Rapier's SIMD build is close (and fastest on debris),
  and much faster than its plain build.
- Single-threaded Jolt is the slowest, two to four times PhysX, but its threaded build is the fastest on ragdolls
  and matches the best elsewhere. Threads need the page served cross-origin isolated (COOP/COEP headers), which
  restricts embedding third-party content, and take almost a second to start.
- Jolt with fewer solver iterations (`joltIterations=4,1`, closer to the others' defaults) was not faster: debris
  slowed to 8.5 ms, apparently because piles take longer to settle and sleep.
- At this game's scale every engine fits easily in a frame: 500 zombies cost 0.9 to 2.6 ms per step.
