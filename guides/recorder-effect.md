# Recorder look for panels (`IgeRecorderEffect`)

A panel effect (`panel.effect`, see `guides/panel-viewport.md`) that gives a panel the look of the device it came
from: a site recorder, a warship's pod camera, or a precursor machine's memory. It reads the panel's colour and
composites it with the look applied. It draws picture only: the timestamp and device label are the game's own UI
over the panel.

Code: `src/engine/webgl/IgeRecorderEffect.ts`. Example: `src/examples/timeline` (P cycles the presets).

```typescript
import { IgeRecorderEffect } from "@/engine/webgl/IgeRecorderEffect";

const look = new IgeRecorderEffect("warshipCamera");   // a preset by name, or a settings object
panel.effect = look;
look.time(playback.time());                            // see "Time" (a timeline bound to the panel does this)
look.set({ dropout: 1 });                              // change settings (all numbers)
look.preset("siteRecorder");                           // switch look (resets to the defaults first)
panel.effect = null;                                   // plain copy again
```

## Settings

All are numbers (so a timeline can animate any of them). Defaults leave the picture unchanged.

| setting | meaning | default |
|---|---|---|
| `grain` | per-pixel grain, new each noise frame (0 to 1) | 0 |
| `flicker` | frame-to-frame brightness flicker (0 to 1) | 0 |
| `scanlines`, `scanlineSize` | line strength (0 to 1) and period in device px | 0, 3 |
| `tintR`, `tintG`, `tintB`, `tint` | colour cast multiplied in, and how much of it | 1, 1, 1, 0 |
| `desaturate` | 0 colour to 1 grey | 0 |
| `contrast`, `crush`, `brightness` | contrast (1 = unchanged), blacks pushed to black (0 to 0.5), brightness | 1, 0, 1 |
| `vignette` | dark corners (0 to 1) | 0 |
| `fringe` | chromatic fringe: channels pulled apart toward the edges, in device px | 0 |
| `blur`, `sharpen` | soft focus (0 to 1), sharpening (0 to 2) | 0, 0 |
| `warp` | barrel distortion (0 to about 0.2); corners fall away to black | 0 |
| `dropout` | a scripted glitch, 0 none to 1 total loss (below) | 0 |
| `dropoutRandom` | how often small random dropouts happen (0 never to 1) | 0 |
| `shimmer`, `shimmerSpeed` | 0 recorder to 1 shimmer mode (below); its speed | 0, 1 |
| `fps` | noise frames a second | 24 |
| `seed` | another (equally repeatable) take of all the noise | 0 |

**Dropouts.** The level `dropout` (0 to 1) makes the picture glitch, worse as it rises: torn horizontal rows, a bright
band rolling up the picture, the picture rolling and holding in coarse blocks (the "freeze"), and above 0.8 a loss into
static. The effect has no picture history, so "freeze" is a blocky hold rather than a repeated old frame. The scene
sets `dropout` at dramatic moments (a timeline track, below); between them small random ones come from
`dropoutRandom`: each half-second has that much chance (times a half) of one short glitch of low level. The level
drawn is the larger of the two.

**Shimmer.** `shimmer: 1` is a mode for something that isn't a recorder: the picture's light is remapped onto a warm,
slowly drifting gold, with a slow ripple and a soft glow. Mix it in partway for a transition.

## Presets

| preset | look |
|---|---|
| `siteRecorder` | rough site recorder: grainy, flickering, greenish and washed, soft, a little warped, now and then losing the picture |
| `warshipCamera` | warship pod camera: sharp, blue-grey, clear scanlines, little grain, rare dropouts |
| `precursorMemory` | precursor memory: shimmering gold, no scanlines and no grain, soft vignette |

`IGE_RECORDER_PRESETS` holds them. **A game's own preset** is a partial settings object, merged over the defaults:

```typescript
import { igeRecorderPreset, IgeRecorderEffect } from "@/engine/webgl/IgeRecorderEffect";

igeRecorderPreset("derelict", { grain: 0.6, flicker: 0.7, tintR: 1, tintG: 0.6, tintB: 0.4, tint: 0.7, vignette: 0.6, dropoutRandom: 0.5 });
panel.effect = new IgeRecorderEffect("derelict");
// or with no name: new IgeRecorderEffect({ grain: 0.6 })
```

## Time

Grain, flicker, the small random dropouts and the shimmer are a pure function of a time you set, never the clock:
`look.time(seconds)`. The noise changes only at `fps` (24 by default), so it holds steady within a frame, a paused
frame holds still, and scrubbing back to a moment gives exactly the same picture. `igeRecorderState(settings, time)`
is the pure function (frame, flicker, glitch level, roll, band) the shader is given, and it's tested to be one. The
shader's own grain is a hash of the pixel and the noise frame.

When the timeline is bound to the panel (`playback.bind({ panel })`) it sets `panel.effect.time()` to its time on every
`apply()` (every update and every seek), so nothing else is needed. Without a timeline, call `look.time()` yourself.
Setting the time or a setting asks for a frame (render on demand).

## Animating it from a timeline

A track property `effect.<setting>` animates a numeric setting of the effect on the bound panel, with step, linear and
smooth keys like any number (default linear):

```typescript
timeline({ duration: 10 })
	.track("panel", (t) => t
		.at(0, { effect: { dropout: 0 } })
		.at(3.2, { effect: { dropout: 1 } }, "smooth")      // the hatch blows: spike
		.at(3.9, { effect: { dropout: 0 } }))
	.build();
// as data: { target: "panel", property: "effect.dropout", keys: [ { t: 3.2, value: 1, ease: "smooth" }, ... ] }
```

A track whose target has no effect, or names a setting that doesn't exist, is ignored. The target is the panel (the effect on it is used), or an `IgeRecorderEffect` bound directly.

## Cost

One full-rectangle pass reading the panel's colour: up to seven texture reads a pixel (fringe on, blur or sharpen on, shimmer on),
fewer when those are off. It costs nothing while the panel is hidden.
