# Timeline (`IgeTimeline`)

A timeline plays a scripted scene that can be paused and scrubbed to any moment, and looks the same every time.
The scene's state at time `t` is worked out from the tracks, not by playing forward to it, so rewinding and
scrubbing land on exactly the picture that playing to `t` shows. It's for scripted playbacks in a panel
(`guides/panel-viewport.md`) and for set pieces in the main view.

Code: `src/engine/timeline/IgeTimeline.ts` (player and data types), `IgeTimelineBuilder.ts` (the builder).
Example: `src/examples/timeline` (a panel over a main view: play, pause, rewind, a scrub bar, captions, a sound,
camera cuts, a skeletal model, sparks).

## Data

A timeline is plain JSON-able data. Targets are names; the game binds names to entities, so a scene file holds no
engine objects.

```json
{
  "duration": 10,
  "loop": false,
  "tracks": [
    { "target": "ring", "property": "position",
      "keys": [ { "t": 0, "value": { "x": 0, "y": 0, "z": 0 }, "ease": "smooth" },
                { "t": 2.5, "value": { "x": 100, "y": 0, "z": 0 } } ] },
    { "target": "panel", "property": "camera", "keys": [ { "t": 3.5, "value": "wide" } ] }
  ],
  "captions": [ { "start": 0.4, "end": 3, "speaker": "Foreman", "text": "Did you hear that?" } ],
  "sounds":   [ { "start": 3, "source": "ping" }, { "start": 1, "source": "hum", "loop": true, "end": 9 } ],
  "events":   [ { "at": 3, "name": "sparks", "data": { "where": "hatch" } } ],
  "particles":[ { "target": "sparks", "at": 3, "count": 60, "position": { "x": 0, "y": 30, "z": 0 }, "seed": 11 } ]
}
```

`duration` defaults to the end of the last key or cue.

### Tracks

A track is the keys of one property of one target. Before its first key it holds the first value, after its last
key the last. Each key has a time `t` (seconds), a `value` and an `ease`: how the value moves from this key to the
next one (`"step"` holds it, `"linear"`, `"smooth"` is ease in and out). Default: linear for numbers, vectors and
colours; step for everything else.

| property | value | applied as |
|---|---|---|
| `position`, `scale` | `{x, y, z}` | `translateTo`, `scaleTo` |
| `rotation` | `{x, y, z}` Euler, radians | `rotateTo` |
| `quaternion` | `{x, y, z, w}` (slerped, shortest way) | `entity.quaternion()` (replaces the Euler rotation) |
| `visible` | boolean | `show()` / `hide()` |
| `opacity` | number | `entity.opacity()` |
| `color` | `{r, g, b, a?}` | `entity.material()`: over the material the entity had when the timeline first touched it |
| `animation` | `{ clip, time?, speed?, loop? }` | skeletal clip, see below |
| `camera` | camera name | `panel.cut(name)`; the target is the panel's name |
| `effect.<setting>` | number | a setting of the panel's recorder look (`guides/recorder-effect.md`): `effect.dropout`, `effect.grain`, ...; the target is the panel's name; default linear |

**Skeletal animation.** A key says which clip and the clip's time at that key (`time`, 0 by default); from there
the clip runs at `speed` (1) until the next key (`speed: 0` holds a pose). At time `t` the timeline works out the
clip time and calls `IgeSkeletalAnimationComponent.pose(clip, time)`, which poses the skeleton at exactly that
moment (it replaces whatever was playing; the pose is applied on the next update and kept). The timeline turns
`poseCache(false)` on for the entity so poses aren't quantised to the shared cache's rate. Clips wrap unless
`loop: false`. `pose()` is also usable on its own.

### Cues

- **Captions** `{ start, end, speaker?, text }`: shown from `start` up to (not including) `end`.
  `timeline.captionsAt(t)` returns the ones showing (the current time by default), earliest first, so after a seek
  the right lines show. The `"captions"` event fires with the list whenever the set showing changes.
- **Sounds** `{ start, source, volume?, loop?, end?, track? }`, `source` an audio source id
  (`new IgeAudioSource(id, url)`, with `ige.uses("audio")`).
  A **one-shot** (no `loop`, `end` or `track`) starts when play passes `start`; scrubbing over it makes no sound.
  A **long** sound (`loop`, `end` or `track: true`: ambience, a log's voice) is sounding between `start` and `end`
  (its own length; the timeline's end when it loops). Whenever playback starts, resumes or follows a seek inside
  that stretch it starts at the right offset (wrapped for a loop). Pause and seek stop what's sounding.
  **Audio rate:** `rate()` sets the playback rate of the sounds (`IgeAudioControl.playbackRate()`, also the `rate`
  option of `ige.audio.createAudioControl()` and `play()`): sounds start at the timeline's rate and what's sounding
  speeds up or slows down (pitch with it) when `rate()` changes. Backwards is silent: at a negative rate sounds that are live stop and none start, and long sounds come back at the right offset when the rate is positive again. The rate is kept to
  0.1x to 8x. Seeking still stops what's ringing. Swap `timeline.audio` (an
  `IgeTimelineAudio`: `start(source, {offset, loop, volume, rate})` returning something with `stop()`, and `setRate(rate)` if it can) for other sound.
- **Events** `{ at, name, data? }`: fire (`on("event", cue => ...)`) when play crosses them, once. Seeking doesn't
  fire them. `timeline.eventsBetween(from, to)` lists the events with `from < at <= to`, for a game that wants to
  know what a stretch holds. A cue at exactly 0 fires when played from the start.
- **Particles** below.

## Particles

Answer: **particle cues are seekable.** `IgeParticleSystem3d` draws from `Math.random` and steps with the frame's
time, so on its own it can't be reproduced. The timeline instead drives the systems it has particle cues for from a
seed: `seed(n)` (a seeded random sequence; unseeded systems still use `Math.random`, unchanged), `driven(true)` (its
own `update()` no longer simulates) and `simulate(dt)`. The timeline steps the system on a fixed 1/60 s grid from
time 0, emitting each cue's burst (`count` at `at`) or stream (`rate` particles a second from `at` until `until`)
in the step it falls in. The particles at time `t` are the state after the steps up to `t`, so play, seeking forward
and seeking back give identical particles (tested bit for bit). Seeking back restarts from the seed and replays,
which costs a few hundred `simulate()` calls at most for a short effect (steps where nothing is alive and no cue is
active are skipped).

Give the system `rate: 0` (the cues emit; an own rate would also run). A system whose emitter moves with
`worldSpace: false` builds its render data at the emitter's position of the last update, so prefer `worldSpace`
and give cues a `position`. A cue with no `position` emits at the system's own position.

## Writing it in TypeScript

```typescript
import { timeline } from "@/engine/timeline/IgeTimelineBuilder";

const data = timeline({ duration: 10 })
	.track("ring", t => t
		.at(0, { position: { x: 0, y: 0, z: 0 }, visible: false, opacity: 0 })
		.at(1, { visible: true })
		.at(2.5, { position: { x: 100, y: 0, z: 0 }, opacity: 1 }, "smooth")) // "smooth": how these move on to the next key
	.track("man", t => t.at(0, { animation: { clip: "Walk", time: 0 } }))      // animation: "Walk" is shorthand for { clip: "Walk" }
	.cut("panel", 0, "main").cut("panel", 3.5, "wide")
	.caption(0.4, 3, "Recorder", "Site 7 camera two. Recording.")
	.sound(3, "ping")
	.sound(1, "hum", { loop: true, end: 9 })
	.event(3, "sparks", { where: "hatch" })
	.particles("sparks", 3, { count: 60, position: { x: 0, y: 30, z: 0 }, seed: 11 })
	.build(); // plain JSON-able data (builder.create() makes the IgeTimeline directly)
```

`at(time, values, ease?)` takes any of `position`, `rotation`, `quaternion`, `scale`, `visible`, `color`,
`opacity`, `animation`, and `effect` (a record of recorder settings, each its own `effect.<name>` track); each gets a key at that time. Calling `track()` again for the same target adds keys.
`new IgeTimeline(data)` reads the data back (keys sorted, eases filled in; `toData()` gives it again, and loading
that gives the same thing); an unknown property throws.

## Playing

```typescript
const playback = new IgeTimeline(data)
	.bind({ ring, man, sparks, panel })  // names -> IgeEntity, IgeParticleSystem3d, IgePanelViewport (for camera tracks)
	.attach(panelScene);                 // runs from that entity's update (or call playback.update(deltaMs) yourself)
playback.play();
playback.seek(4.2);                      // the scene at 4.2s, wherever it was
playback.pause();
playback.rate(0.5).loop(true);
playback.time(); playback.duration(); playback.playing();
playback.on("event", cue => { ... });    // also "captions", "loop", "ended", "play", "pause", "seek"
playback.missingTargets();               // names with nothing bound
```

- `bind()` applies the state at the current time. `apply()` re-applies it (after changing the scene by hand).
- `play()` from the end of a non-looping timeline starts again at 0. `stop()` pauses and goes to 0 (cues at 0 fire
  when it plays again).
- `seek(t)` clamps to `0..duration` (wraps when looping). It sets everything, fires nothing, and restarts long
  sounds at the right offset while playing.
- `update(deltaMs)` advances by the real time times `rate()` while playing; with a loop it wraps and fires cues on
  both sides of the wrap. A negative rate plays backwards (nothing fires going backwards).
- Floating-point: time accumulates in floating point while playing, so "the same picture" means the same as
  `seek()` to the time reached; avoid comparing exactly at a key's time.

## With a panel

A panel shows a scene of its own and its camera is fixed, so the timeline cuts cameras with `camera` tracks and
`panel.cut()`:

```typescript
panel.newCamera("wide");                           // set the camera up like any camera
playback.bind({ panel });                          // camera tracks name "panel"
playback.attach(playbackScene);                    // the panel scene updates only while the panel is shown
```

`attach()` to the panel's scene means a hidden panel's timeline waits (a hidden panel costs nothing and isn't
updated). To keep time while it's hidden, `playback.attach(playbackScene, { whileHidden: true })`: the engine drives
it every tick instead (the default stays as above; or attach to an entity in the main view, or call `update()`
yourself).

**Recorder look.** `panel.effect = new IgeRecorderEffect("siteRecorder")` (`guides/recorder-effect.md`). A timeline
bound to the panel sets the effect's time on every apply, so its grain, flicker and random dropouts are a function of
the timeline's time: paused holds still, scrubbing back gives the same picture. `effect.<setting>` tracks animate its
settings, e.g. a dropout spike at 3.2 s. For the effect's freeze the timeline also gives it `source` (the scripted value of a setting at any time) and
`renderAt(time, draw)`, which sets the scene to `time` for one draw and puts it back, emitting and firing nothing; it's public
if you need the scene at another moment for a draw of your own.
Show captions in the game's own UI from `captionsAt()` / the `"captions"` event, placed from `panel.rect()`.
`panel.samples` sets the panel's multisampling. 
