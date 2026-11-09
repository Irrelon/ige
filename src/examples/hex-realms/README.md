# Hex Realms

A turn-based hex strategy game on `IgeWebGlRenderer`: Polytopia pacing, some Civilization depth, and a Settlers
II-style economy where goods are made in production chains and carried along roads. Units, cities, buildings,
wonders and monuments are 3D models (see [Models](#models)); until a model has loaded, or with models turned off,
they are drawn as primitives (cube = warrior, pyramid = archer, orb = settler). The full design and its status are
in [DESIGN.md](DESIGN.md).

Play against AI civs in the browser, or online with friends through the bundled server (the AI fills the empty
seats).

## Running

```sh
# Build the client (every example), then serve it
npm run build-examples && npm run copy-static
npx http-server dist/esm -p 8642 -c-1
# open http://localhost:8642/examples/hex-realms/index.html
```

Online play needs the game server. It also serves the built client, so one port does everything:

```sh
npx webpack --config src/examples/hex-realms/server/webpack.server.cjs
node dist/hex-realms-server/server.cjs            # --port 8650 --static dist/esm --data hex-realms-games
# open http://localhost:8650/ , host a game, and share the invite link from the in-game menu
```

When the setup screen finds a server (the page's own host on port 8650, or `?server=ws://host:port/hexrealms`) it
offers **Host online game** and **Join**. Online play runs on the engine's game rooms (`IgeRoomServer` and
`IgeRoomClient`, see `ige/guides/online-rooms.md`) over a plain WebSocket. Games are saved to disk after every change
and survive server restarts; players rejoin their own seat automatically (a seat token kept per game and name). In
game, players can chat (the Chat button) and set turn timers (when a player's time runs out, the AI plays that turn):
the host sets the game's timer when hosting or from the menu, and each player can have their own, set by the host or
by themselves. **Leave game** gives a seat up for good: the AI plays that civ from then on, and joining again takes a
free seat. Without a timer, turns wait for absent players.

Tests (headless simulation: rules, economy, upkeep, wonders, ambitions, combat, diplomacy and deals, victories,
determinism, save/load and old-save upgrades, command replay and an AI soak game):

```sh
npx jest src/examples/hex-realms
```

From the browser console, `ige.client.autoplay(20)` lets the AI play your seat for 20 rounds (online too).

## How to play

- **Expand**: move a unit onto a grey village and press **Capture** at the start of your next turn. With "Allow
  founding cities" on, settlers found new cities (F).
- **Grow**: deliver food (fish, game, or bread from grain → flour → bread) to cities. Each level adds a building slot,
  star income and a reward choice.
- **Build**: click a tile in your territory. Woodcutters are ready at once; other buildings start as construction
  sites that carriers supply by road (logs for extractors and sawmills, planks and stone for workshops). **Rush**
  finishes a site for stars. Roads cost 1 star a tile and can reach out from your roads across neutral land.
- **Carry**: carriers move goods 4 road tiles per turn and each road tile takes 2 loads per turn, so busy routes jam.
  Ports (Sailing) join coastal cities into one network: carriers sail sea lanes between your ports, however far
  apart, four tiles for each road tile (deep ocean needs Navigation). A market also sells you goods at twice its price; they wait at the market until carriers take them
  where they're needed.
  The Economy screen (B) sets which demand gets scarce goods first, and the **Lens** (V) shows each building's state
  and each city's store on the map.
- **Research** (R): costs rise with the number of cities.
- **Stars**: cities earn them every turn. Units beyond a free allowance (3, plus 1 per city) cost upkeep every turn,
  doubled once you know 12 techs, and cities beyond your tenth cost administration. Hover your stars in the top bar
  for the breakdown.
- **Ambition** (J): pick a goal (Conquest, Expansion, Industry, Knowledge, Diplomacy or Wonders) and race through
  its four milestones. Each pays stars and score, double for the first civ in the world to reach it; all four earn a
  permanent legacy. The race board shows everyone's progress.
- **Wonders** (M): ten world wonders, one of each in the world: the first civ to finish one keeps it and rivals' sites
  are cancelled. Eight monuments are earned by feats (10 battles won, a level-6 city, 100 stars banked...) and raise
  their city a level.
- **Fight**: declare war in Diplomacy (G). Select a unit to see attack rings; hovering one previews the damage both
  ways (combat is deterministic). Ranged units need line of sight; units stop next to enemies (zone of control).
- **Negotiate** (G): peace (then a 10-turn truce), alliances (shared vision, called into defensive wars), defensive
  pacts, open borders, trade agreements, cultural exchanges, research agreements, gifts, and a deal editor that
  trades goods and stars once or every turn as a trade route (where the two road networks meet, the goods travel as
  carts along both; otherwise a caravan delivers them to the capital). Demand tribute or a city; denounce or sanction rivals.
  Each AI leader has a visible agenda, and the screen lists why it feels the way it does. Grievances (surprise wars,
  captured cities, refused demands...) justify wars; a war without them angers everyone. Researching Diplomacy forms
  the World Council. Long wars wear both sides down, so peace gets easier the longer one lasts.
- **Win** by Domination, Score (after the turn limit), Prosperity (the Grand Exchange), Alliance or Diplomatic (two
  council elections in a row, with backing from at least half the other civs). Each can be switched off in setup.

Controls: WASD / arrows / left-drag pan, wheel or Z/X zoom, Q/E or right-drag rotate (pinch and twist on touch).
Click a unit, then a highlighted tile to move or a red ring to attack. Buttons float above a selected unit when it can
do something where it stands, as in Polytopia: crossed swords capture the city, a house founds one, a flame pillages. Space next unit, Enter end turn, Esc deselect,
C centre, T terrain style, R research, G diplomacy, J ambition, M wonders, B economy, V economy lens, L cities,
F found city, O menu, H help.
Click the minimap to jump.

## Options

The setup screen sets everything; the same options work as URL parameters (`?quick=1` skips the setup screen):

| Parameter | Values |
|-----------|--------|
| `size` | `tiny` 32x20, `small` 40x26, `medium` 48x32 (default), `large` 64x40, `huge` 96x60, and the sandbox sizes `giant` 128x80, `epic` 256x160, `colossal` 512x320; or `w=` and `h=` |
| `players`, `civ`, `difficulty` | 2-12 civs; your civ (`highlanders`, `riverfolk`, `woodlanders`, `horselords`, `coastfolk`, `plainsfolk`); `easy`, `normal`, `hard` |
| `seed`, `turns` | Map seed text; turn limit for the Score victory (default 60) |
| `fog` | `civ` (default): explored tiles out of sight dim and show last-known terrain. `polytopia`: explored tiles stay visible. `off`: everything revealed |
| `los` | `1` (default): hills see further; mountains, forests and jungle block the view. `0`: plain sight radius |
| `founding` | `1` (default) or `0`: allow settlers to found cities |
| `v` | Victory types that are on, e.g. `v=domination,score` |
| `style` | `tiles` (Polytopia-like stepped hexes, clouds over unexplored land) or `natural` (Civilization-like blended heightfield, parchment over unexplored land) |
| `chunk`, `shadows` | Terrain chunk size (16); `shadows=0` turns shadows off |
| `join`, `name`, `server` | Join an online game by code, your player name, and a server URL |

## Architecture

| Folder | Role |
|--------|------|
| `sim/` | The game, as pure TypeScript with no IGE: state, commands and events (`types.ts`), rules data (`rules.ts`), turn flow and save/load (`sim.ts`), movement, combat, cities, the road economy (`economy.ts`, `network.ts`), income and upkeep (`treasury.ts`), wonders and monuments (`wonders.ts`, with every wonder and legacy effect in `effects.ts`), ambitions, diplomacy, victory and the AI. Deterministic and seeded: the same commands always give the same game. Older saves are upgraded on load (`Sim.migrate`) |
| `view/` | IGE: `TerrainView` (chunked terrain in either style, fog, LOD), `WorldView` (units, cities, buildings, roads, deposits, cargo, borders, overlays), which plays simulation events back as animations, and `ModelLibrary` (`models.ts`: model loading, sizing and team colours) |
| `ui/` | DOM HUD (panels, modals, combat preview, toasts, economy lens), the diplomacy screen and deal editor, the wonders and ambition screens, setup screen, advisor tips and synthesised sound |
| `net/`, `server/` | Online play on the engine's game rooms: the room options, timer command and a WebSocket transport (`net/`), and the Node server that runs the authoritative sim, the AI and turn timers (`server/`) |
| `tools/`, `assets/models/` | The model import tool and the game's models |
| `client.ts` | Ties it together: game start (setup, save, replay, online), input and picking, selection, turns, render on demand |

Map and terrain modules: `mapGen.ts` (seeded continents, mountain ranges, climate, forests, deposits, start
positions), `chunkMesh.ts` and `natural.ts` (the two terrain styles), `palette.ts`, `fog.ts`, `surface.ts` (height
queries per style), `shapes.ts`, `strategyCamera.ts`, `minimap.ts`.

Every action, by a person or the AI, is a command applied by `Sim.apply()`. That one path gives the rest for free:

- **Save and load**: the state (typed arrays plus records) serialises to JSON.
- **Replays**: the command log is recorded and played back from the end-of-game screen.
- **Online**: the server applies commands and broadcasts them with sequence numbers; clients apply the same stream to
  their own copy. The AI uses its own seeded random numbers, never the game's, so replaying commands reproduces AI
  games exactly (covered by a test).

## Models

The models in `assets/models/` were made for this game with AssetFurnace (text to 3D, auto-rigging and motion
retargeting) and are listed, with their bounds, triangle counts and clips, in `assets/models/models.json`.
`view/models.ts` loads them in the background after the map appears (units first) and the views swap them in as
they arrive. The **3D models** toggle in the menu (or `?models=0`) falls back to the primitives.

- **Units** (warrior, archer, swordsman, settler) are rigged characters with `idle`, `walk`, `attack`, `hit` and
  `death` clips. They walk while moving, play `attack` when they strike, `hit` when struck and survive, and `death`
  before a killed unit is removed. Idle characters hold still until selected, so an idle map costs no GPU time.
  Riders, catapults and boats are unrigged props.
- **Team colours**: unit models are textured with bright magenta areas (cloaks, banners, trim). For each player
  the library repaints those pixels of the colour texture in the player's colour, keeping their shading, and loads
  the result as its own model, so every warrior looks the same and only its team colour differs. A coloured disc
  under each unit, and an owner banner or base on cities and buildings, add to it.
- **Cities** use the village, town or city model for their level; unfinished buildings show the construction site.
  Buildings, wonders and monuments are static props; ports turn to face the water.
- Props get engine-generated levels of detail (`PROP_LOD`); copies of a model are GPU-instanced.

To add or replace a model, run `tools/import_model.py`:

```sh
python3 tools/import_model.py --id archer --out assets/models --lossless-base \
    --model archer_rigged.glb --move idle=archer_idle.glb --move walk=archer_walk.glb \
    --move attack=archer_attack.glb --move hit=archer_hit_react.glb --move death=archer_death.glb
```

It merges each move file's animation into the rigged model by node name, re-encodes textures at 512 px (JPEG, or
PNG for the base colour with `--lossless-base` so the magenta stays exact), drops maps the engine doesn't use and
updates `models.json`. A model's id is its unit type, building id, `village`/`town`/`city`, `construction` or
`boat`.

## How the map stays fast

Tiles-style chunks bake 16 x 16 tiles into one mesh, with a `lite` version (flat tops, tinted forests) when tiles are
under ~18 px on screen. Full detail is built only when the camera is close and freed when it leaves, so memory and
load time stay bounded on any map size. Fog changes rebuild only the chunks they touch, and frames are drawn only
when something changes (`ige.engine.useManualRender(true)`), so an idle map uses no GPU time.

Measured in Chrome on the development machine (Apple silicon, 1920 x 907 at 2x DPR, shadows on), before the game
rules were added:

| Map | Generate | Mesh | Zoomed in | Whole map on screen |
|-----|----------|------|-----------|---------------------|
| 128 x 80 (10k tiles, 40 chunks), tiles | 17 ms | 17 ms | 60 fps | 60 fps |
| 128 x 80, natural | 19 ms | 318 ms | 60 fps, 309k tris | 60 fps, 103k tris |
| Colossal 512 x 320 (164k tiles, 640 chunks), tiles, no fog | 187 ms | 339 ms | 60 fps, 14 draws, 156k tris | 60 fps, 509 draws, 810k tris (3.8M without chunk LOD) |
| Colossal, tiles, fog (clouds) | 189 ms | 148 ms | 60 fps, 325k tris, 81 chunks at full detail | 60 fps, 634k tris, 566 draws |
| Colossal, natural, fog | 420 ms | 0.23 s (was 6.3 s: unexplored chunks are now flat parchment sharing one texture) | | |

On a medium map an AI turn takes about 10-50 ms (more late in the game); a headless 80-turn, 4-civ AI game runs in
3-6 seconds.

## Engine notes (gaps found while building this)

Items 1-4 and 6-8 were addressed in the engine (`36dda7ff`). This example uses `releaseGeometry()`,
`IgeTexture.destroy()`, `screenToHeightfield()`, `backFaceCulling(true)` and geometry vertex colours (deposit
markers). It keeps its palette/baked textures for terrain (sharper than per-vertex colour at this mesh density) and
its own chunk LOD (built lazily, survives frequent fog rebuilds).

1. ~~Vertex colours ignored by the lit shaders.~~ Done.
2. ~~LOD only for model parts.~~ Done (`lod()` on `_geometryData`).
3. ~~No public way to free geometry or textures.~~ Done.
4. ~~Three copies of every geometry.~~ Partly done: the engine no longer keeps its interleaved copy.
5. ~~Static shadow caching.~~ Done (`shadowCaching()`), used here: panning a 128 x 80 map with fog off drops
   shadow draw calls from about 14 to 2 a frame, with identical shadows (`?shadowcache=0` turns it off).
6. ~~Back-face culling never enabled.~~ Done (opt-in), enabled here.
7. ~~Picking only against a flat plane.~~ Done (`screenToHeightfield()`), used here.
8. ~~Every geometry creation logged.~~ Done.
9. ~~Render-on-demand helper.~~ `ige.engine.renderOnDemand()` exists; this example keeps `useManualRender()` with
   its own invalidation, because its views assign `_geometryData` directly (chunk LOD swaps, fog rebuilds), which
   render-on-demand can't see, and it throttles idle animation (settlers bob on every third frame). It would still
   need its manual render calls, so switching gains nothing here.
10. ~~Network transport.~~ Done: the engine's `IgeRoomServer` / `IgeRoomClient` now provide rooms, seats, presence,
    chat, room info and the sequenced command stream, and this game uses them. It runs them over its own WebSocket
    transport rather than IgeNetIo so one port serves both the game files and the rooms (IgeNetIo's HTTP server
    answers every request with a 404). Seat changes are game commands too (`seat`, issued only by the server), so
    every client agrees which civs the AI plays.

## Known follow-ups

- Balance: upkeep, administration, dearer research and market buying keep treasuries to tens of stars through turn
  60 and a few hundred by turn 90 in AI games; a runaway conqueror still holds about a thousand by turn 90.
- Online: chat is plain text with no moderation beyond length and markup stripping.
