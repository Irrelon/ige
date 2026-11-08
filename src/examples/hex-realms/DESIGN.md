# Hex Realms: Game Design and Plan

Status (2026-11-08): milestones M0-M12 are built and playable, including online play (see 13), and the second
round of stars, wonders, ambitions and diplomacy (see 15). Decisions marked
**Decided** came from design discussion; numbers marked **Proposal** are a first balance pass, tuned with AI soak
games and open to change. Where the built rule differs from the first draft, the text below gives the built rule.

## 1. Pillars

1. **Fast, readable turns** (Polytopia pacing). A game lasts 30 to 90 minutes. Every turn has a real decision, numbers
   stay small, and AI turns are quick to watch. **Decided.**
2. **An economy you build and can see** (The Settlers II). Goods are gathered, refined in production chains and
   physically carried along roads. Supply lines take time, can jam and can be cut. **Decided.**
3. **Strategic depth where it pays** (Civilization). Terrain, borders, line of sight, fog of war, city growth and
   specialisation. **Decided.**
4. **Big, good-looking maps** on IGE: the two terrain styles (tiles and natural), clouds and parchment fog, from tiny
   duels to colossal sandboxes. **Built.**

## 2. Decisions so far

| Topic | Decision |
|-------|----------|
| Pace and depth | Polytopia pacing with some Civ depth, plus a Settlers II-style production and distribution economy |
| Opponents | AI first; rules built as a deterministic, server-ready simulation so online play can follow |
| Economy | One currency (stars) plus city levels; physical goods for construction, units, growth and trade |
| Logistics | Roads with travel time: goods move a few tiles per turn, shown as carriers; routes can jam or be cut |
| Chain depth | 3 tiers (raw, refined, finished), about 15 goods |
| Goods used for | Units and equipment, buildings and upgrades, city growth, trade for stars |
| Player control | Place roads and buildings; carriers and routing are automatic; priorities for scarce goods |
| Devices | Desktop first (mouse and keyboard), designed so touch works later |
| Fog of war | Civ (3 states) or Polytopia (2 states) and line of sight on/off, as game options (built) |
| Expansion | Neutral villages to capture are always on the map; a game option "Allow founding cities" adds settlers |
| Construction | Buildings start as construction sites supplied by road; a site can be rushed (finished) with stars |
| Workforce | A city's level caps how many buildings its territory can run |
| Project home | Stays in `ige/src/examples/hex-realms`; the online server is bundled from there too (see 12) |
| Combat | Deterministic (Polytopia-style); the game previews the result before you attack |
| Victory | Domination, Score (turn limit), Prosperity and Alliance/diplomatic; each can be switched on or off in setup |
| Stars | Units cost stars like Polytopia, plus upkeep beyond a free allowance (see 15.1) |
| Goals | Civilization VII-style ambitions raced for bonuses; the victory types stay (see 15.3) |
| Wonders | Unique world wonders raced between civs, plus personal monuments earned by feats (see 15.2) |
| Diplomacy | Star-priced actions, goods trading, demands and grievances (see 15.4) |
| Turn order | Sequential: each civ takes its turn in order |
| Art | Primitives (cubes, orbs, pyramids and combinations) for now; models later via `IgeEntity.model()` |

## 3. The turn

Each civ's turn has two parts:

1. **Economy phase** (automatic, animated for the human at the start of their turn):
   1. Production: every supplied building runs one cycle (consumes inputs, fills its output slot).
   2. Dispatch: each new output is assigned to the nearest consumer that wants it, in priority order (construction
      sites, workshops, barracks, cities), otherwise to the nearest warehouse or city store.
   3. Transport: cargo moves along the road network (see 5.3).
   4. Delivery: workshops get inputs, construction sites progress, cities gain growth from food.
   5. Income: stars from cities, mints and market sales.
   6. A turn report summarises what arrived, what is stuck and what levelled up.
2. **Command phase** (the player or AI): move and fight with units, place roads and buildings, choose city level-up
   rewards, research, set priorities, then end the turn.

Turns are sequential (each civ in order), like Polytopia. **Decided.** Online, this also allows asynchronous play:
you take your turn whenever it comes round. Everything resolves in a fixed order with a seeded random number
generator, so the same commands always give the same result.

## 4. Cities and expansion

- **City levels** (Polytopia-style): cities collect growth points; each level gives a choice of two rewards, such as
  +1 star income, border growth, a free unit, city walls or a store (more storage). **Proposal.**
- **Growth comes from food deliveries**: fish and game give 1 growth point, bread gives 2. Goods arrive by road, so a
  city grows as fast as its supply lines allow. Food flows every turn, so the next level needs level² + 1 points
  (2, 5, 10, 17, ...); with a linear curve big cities, and their star income, ran away in soak tests. **Proposal.**
- New cities (founded, or captured from a neutral village) start with 3 logs in store, enough for their first
  extractor.
- **Territory**: radius 1 (capital 2) when a city is captured or founded, grown by the border reward. Buildings can
  only go inside your territory, and each building belongs to the city whose territory it is in.
- **Building slots** (**Decided**): a city's level caps how many buildings its territory can run, which ties growth to
  economic size. Starting values (**Proposal**): level + 1 slots; roads don't use slots, warehouses and markets do.
  A city that loses a level (when captured) keeps its buildings, but the extra ones stop working until it grows back.
- **Expansion** (**Decided**):
  - **Neutral villages** are always placed by map generation, spread across the land. A unit standing on a village
    can spend its turn capturing it, turning it into a level 1 city. This is the main, Polytopia-fast way to grow.
  - **Game option "Allow founding cities"** (a checkbox, on or off). When on, cities can train settlers, which found
    a new city on any free land tile at least 3 tiles from other cities (as today). When off, settlers don't exist
    and the only ways to grow are villages and conquest.

## 5. Economy

### 5.1 Goods (Proposal)

| Tier | Good | Made by | From |
|------|------|---------|------|
| Raw | Logs | Woodcutter | Forest tile |
| Raw | Stone | Quarry | Hills or mountain edge |
| Raw | Ore | Mine | Ore deposit (hills/mountains) |
| Raw | Coal | Mine | Coal deposit (hills/mountains) |
| Raw | Gold | Mine | Gold deposit (rare) |
| Raw | Grain | Farm | Grassland or plains |
| Raw | Fish | Fishery | Coast with fish |
| Raw | Game | Hunter's lodge | Forest with game |
| Raw | Horses | Pasture | Plains or grassland with horses |
| Refined | Planks | Sawmill | Logs |
| Refined | Iron | Smelter | Ore + coal |
| Refined | Flour | Mill | Grain |
| Refined | Coins | Mint | Gold + coal (sold for stars) |
| Finished | Tools | Toolsmith | Iron + planks |
| Finished | Weapons | Armoury | Iron + coal |
| Finished | Bread | Bakery | Flour |

Uses:

- **Construction**: woodcutters cost only stars; extractors (quarry, mine, farm, fishery, hunter, pasture) and
  sawmills are built from logs; workshops from planks and stone; the armoury and the Grand Exchange also need tools
  (and coins). This order means the chain can always restart: an earlier draft built sawmills from planks, and AI
  civs that ran out of planks deadlocked.
- **Units**: weapons (swordsmen), horses (riders), planks (boats, catapults), on top of a star fee.
- **Growth**: fish, game, bread.
- **Trade**: a market sells surplus goods for stars at prices that drop as you flood them; coins convert directly.

Resource deposits are placed by map generation and shown on tiles (placeholder icons first).

### 5.2 Buildings and construction

- **Decided**: placing a building costs stars and creates a **construction site**. The site finishes when its
  materials (planks, stone, sometimes tools) are delivered by road. Expansion therefore depends on logistics, as in
  Settlers II.
- **Decided**: a site can be **rushed** with stars, which buys the missing materials and finishes it at once.
  Price (**Proposal**): four times each missing good's market price, at least 2 stars a good, so supplying a site by
  road is always cheaper and rushing is for emergencies, such as walls before an attack. The Grand Exchange can't be
  rushed (otherwise a rich civ simply buys the Prosperity victory).
- A building must be on or next to a road to receive or send goods.
- Each building has small input and output slots (about 2 each). A full output slot stops production, which makes
  bottlenecks visible.
- Warehouses store goods and act as hubs, so goods have somewhere to wait.

### 5.3 Roads and carriers (Decided: roads with travel time; numbers are a Proposal)

- Roads are built tile by tile, for 1 star each, on land inside or next to your territory, or extending your own
  roads across neutral land (so distant cities can be connected); never inside another civ's territory.
- Cargo moves up to **4 road tiles per turn**. Each road tile carries at most **2 cargo per turn** (one carrier
  each way); extra cargo queues, so busy junctions jam. The pack animals tech (fed by horses) doubles capacity.
- Routing is automatic: shortest road path, re-planned when roads change.
- Enemy units on a road block it; units can pillage roads. Supply lines become a military target.
- Visuals: small coloured carts move along roads during the economy phase. The **Economy screen** lists stores,
  priorities and every building's state, and the **economy lens** (V) shows building states and city stores on the
  map.
- Later: ports and boats move goods across water.

### 5.4 Stars

- Income: city level (Polytopia-like), mints, market sales, trade agreements, wonders and legacies.
- Spending: research, unit fees and upkeep, administration of big empires, building placement, wonders and
  monuments, roads, rushing, and diplomacy (see 15.1 for the numbers).

## 6. Units and combat

- **Combat** (**Decided**): Polytopia-style and deterministic, so the same fight always gives the same result.
  Hovering a target previews the damage both ways before you commit.
- Starting rules (**Proposal**): attack and defence are scaled by health. Defence gets a terrain bonus (hills and
  forest x1.5, city walls x4). Melee defenders retaliate. Units become veterans after a few kills.
- **Ranged** units attack at range 2 and need line of sight (the fog LOS rules); there is no retaliation at range.
- **Zone of control**: a unit that moves next to an enemy must stop.
- **Capturing** an enemy city takes it over, along with its buildings and roads.
- **Roster v1** (placeholder shapes built from primitives):

| Unit | Shape | Needs | Role |
|------|-------|-------|------|
| Warrior | Cube | Stars | Starting melee |
| Archer | Pyramid | Stars | Ranged 2 |
| Settler | Orb | Stars + bread | Founds a city (only when "Allow founding cities" is on) |
| Swordsman | Tall cube | Weapons | Strong melee |
| Rider | Cube on orb | Horses | Fast, flanking |
| Catapult | Wide pyramid | Planks + iron | Siege, ranged 3 |
| Boat | Flat cube | Planks | Embark and transport over water |

## 7. Technology (Proposal)

A compact Polytopia-style tree of about 20 techs bought with stars; the cost rises with the number of cities.

| Branch | Techs (unlocks) |
|--------|-----------------|
| Industry | Forestry (woodcutter) → Sawmills → Carpentry (toolsmith); Mining (quarry, mine) → Smelting (smelter) → Smithing (armoury) |
| Food | Farming (farm) → Milling (mill) → Baking (bakery); Hunting (hunter) → Riding (pasture, rider) |
| Sea | Fishing (fishery) → Sailing (boat, port) → Navigation |
| Society | Roads → Trade (market, warehouse) → Coinage (mint) → Logistics (pack animals, faster carriers) |
| War | Archery → Masonry (walls) → Siege (catapult); Smithing also unlocks swordsmen |

## 8. Civilisations (Proposal)

Four to six civs, each with a starting tech, a start-terrain bias and one perk (original names, not Polytopia's):

| Civ | Starts with | Perk |
|-----|-------------|------|
| Highlanders | Mining | Mines produce +1 |
| River folk | Roads | Carriers move +1 tile per turn |
| Woodlanders | Forestry | Sawmills produce double |
| Horse lords | Riding | Riders cost less |
| Coastfolk | Fishing | Fisheries give +1 growth |
| Plainsfolk | Farming | Farms produce double |

## 9. Victory and game setup

All four victory types are **Decided**; each can be switched on or off in game setup. The details are a **Proposal**.

- **Domination**: last civ standing.
- **Score** after a turn limit (30 / 60 / 90): territory, cities and levels, goods produced, tech, battles won.
- **Prosperity**: build the Grand Exchange wonder, which needs large amounts of finished goods, so the economy itself
  can win.
- **Alliance**: allies win together when no civ outside their alliance remains.
- **Diplomatic**: be elected leader by the World Council (see 10).
- Game setup screen: map size, civs and AI difficulty, victory types, fog model, line of sight, allow founding
  cities, terrain style.
- **Map sizes for 30-90 minute games**: about 32 x 24 (2-3 civs), 48 x 32 (4) and 64 x 40 (6). Today's 128 x 80
  default is far bigger than a normal game needs; the large presets stay as epic or sandbox modes.

## 10. Diplomacy (Proposal)

Needed for the Alliance and Diplomatic victories, and it gives the road economy a peaceful use between civs.

- **Contact**: you can only deal with civs you have met (seen one of their units or cities).
- **Relations**: each pair of civs is at **war**, **peace** or **alliance**. Starting state: peace. Breaking a treaty
  costs standing with every civ. Rule while at peace: units can't attack, and can't enter the other civ's territory
  unless both sides agree to open borders.
- **Attitude**: each AI civ keeps a score per civ, moved by shared borders, trade, gifts, broken treaties, attacks on
  its friends and relative strength. It decides what the AI will accept.
- **Deals**: peace, open borders, alliance, trade agreements, gifts of stars or goods, and declaring war on a common
  enemy.
- **Trade agreements**: when your road network connects to another civ's, goods can be sold to them for stars (both
  sides earn), so roads also matter in peacetime.
- **Alliances**: allies share vision (their fog view), can pass through each other's territory, and are called into
  each other's defensive wars.
- **World Council** (Diplomatic victory): formed when any civ researches Diplomacy. Every 5 turns the civs vote for a
  leader. Votes come from cities and city levels; an AI civ gives its votes to an ally or a civ it likes that is
  stronger than itself. A leader needs a majority of the votes **and** the backing of at least half of the other
  civs (in soak tests, size alone kept winning elections). Win two elections in a row to win the game.
- **Interface**: a diplomacy screen listing known civs with relations and attitude, a deal editor (offer and ask),
  and AI proposals arriving during your turn.

## 11. AI

The AI issues the same commands as a player, so it works unchanged online. **Proposal:** a utility AI with advisors:

- Exploration (built): head for unexplored land.
- Expansion: capture or found cities on good sites.
- Economy: place extraction sites on deposits, connect them with roads, add processors where inputs pile up, and
  build warehouses at jams.
- Military: defend threatened cities, attack weak targets using the combat formula, and raid enemy roads.
- Research: follow a per-civ preference order.
- Diplomacy: keep attitudes, accept or offer deals that serve its goals, form alliances against the leader, and
  vote in the World Council.

Difficulty adjusts bonuses and how far ahead the AI plans. It never sees through fog.

## 12. Architecture

Built as planned (the first prototype's `game.ts`, which mixed rules with rendering, is gone):

```
hex-realms/
  sim/    pure TypeScript, no IGE: game state, commands, rules, economy, combat, fog, AI, seeded RNG
  view/   IGE: terrain chunks, units, roads, cargo, overlays; plays back simulation events as animations
  ui/     DOM panels: city, tile actions, tech tree, turn report, economy lens, game setup
  net/    online client and protocol
  server/ Node game server: rooms, seats, the authoritative sim and the AI
```

- **Commands** are plain serialisable objects (move, attack, capture, build, road, rush, research, reward,
  priority, propose, endTurn, ...). `Sim.apply(player, command)` validates and applies; the economy phase is
  deterministic. Both emit **events** (unitMoved, cargoMoved, buildingCompleted, cityLevel, ...) that the view
  animates.
- **Save and load** comes from serialising the state (typed arrays plus records): localStorage in single player,
  JSON files on the server.
- The AI draws from its own random numbers (seeded by game, turn and civ), never the game's RNG, so replaying the
  command stream reproduces any game exactly. Replays and online play both rely on this.
- **Testing**: the sim is headless, so jest can cover production chains, routing and congestion, combat outcomes and
  long AI-vs-AI soak games.
- **Online**: one Node process hosts many games (rooms with five-letter codes). The server applies every command to
  the authoritative sim, broadcasts it with a sequence number, and runs AI turns; clients apply the same stream.
  Joining takes over an AI seat; a per-game seat token lets people rejoin their own seat. Rooms are saved to disk
  after every change. One server per game (the "Server-Based Instancing and Routing" idea in `ige/notes.md`) remains
  an option for scale.
- **Where the game lives** (**Decided**): in `ige/src/examples/hex-realms`. The engine is changing daily and this
  builds it from source, so every engine improvement is picked up immediately. The server is bundled from the same
  folder with its own webpack config, so moving to a separate repository (using `@irrelon/ige`) stays optional; the
  sim/view/ui split would make that move mechanical.

## 13. Roadmap

Each milestone ends in something playable. All nine are built; the Status column notes what was simplified or left
for later.

| # | Milestone | Contents | Status |
|---|-----------|----------|--------|
| M0 | Foundations | Split sim/view/ui; commands and events; deterministic turns; save and load; headless test harness; game options plumbing; smaller default map presets | Done |
| M1 | Cities and stars | Neutral villages and capturing, "Allow founding cities" option, city levels and rewards, building slots, territory growth, star income, tech tree skeleton, turn report | Done |
| M2 | Combat | Health, attack and defence, terrain bonuses, retaliation, damage preview, ranged with LOS, zone of control, capturing cities, roster v1, Domination victory, AI military | Done. Units pass through friendly units, and may always take one more step into rough ground |
| M3 | Economy I | Deposits, extraction buildings, roads (rendered on both terrain styles), carriers with travel time and capacity, warehouses, construction sites and rushing, food to growth (tiers 1-2) | Done; deposits are drawn as small coloured markers |
| M4 | Economy II | Tier 3 chains, unit equipment, markets and coins, priorities, economy lens, Prosperity victory, AI economy advisor | Done. The AI builds against civ-wide targets (food first, then the chain it is shortest of) and rushes sites its network can't supply |
| M5 | Diplomacy | Contact, war/peace/alliance, attitudes, deals and the deal editor, trade agreements over connected roads, allied vision, World Council, Alliance and Diplomatic victories, AI diplomacy | Done; deals are single proposals (peace, alliance, trade, open borders, gifts of stars) rather than a full offer/ask editor |
| M6 | Content and balance | Full tech tree, 4-6 civs, Score victory, boats, game setup screen (all victory toggles and options), AI difficulty levels, balance passes with AI soak tests | Done: 22 techs, 6 civs, 3 difficulties. Boats are units embarking on water; goods don't cross water yet. Late-game star surplus is a known gap (5.4) |
| M7 | Polish | UI pass, tutorial, sound, touch controls, accessibility, replays | Done: advisor tips as the tutorial, synthesised sound, pinch/twist touch, reduced motion and keyboard shortcuts, replays |
| M8 | Online | Server-authoritative sim, asynchronous sequential turns, invites, persistence, diplomacy between humans | Done: rooms with codes and invite links, seat tokens, saved games, proposals between humans wait for an answer. No chat or turn timer yet |

Second round (decided 2026-11-08, see 15):

| # | Milestone | Contents | Status |
|---|-----------|----------|--------|
| M9 | Stars | Polytopia-like unit prices, unit upkeep beyond a free allowance per city, slower income growth with city level, AI that budgets for upkeep | Done, plus administration for very wide civs, upkeep doubling for modern armies and dearer research |
| M10 | Wonders and monuments | Unique world wonders raced between civs (stars plus goods by road, never rushed, each with its own effect and model), personal monuments earned by feats | Done: 10 wonders, 8 monuments, each with a primitive model |
| M11 | Ambitions | Civ 7-style goals: each civ picks an ambition, races through its milestones for rewards (double for the first civ to reach each one) and a permanent legacy perk; victories unchanged | Done: 6 ambitions; AI civs pick one from their agenda and swap one that stalls |
| M12 | Diplomacy II | Star-priced actions (cultural exchange, research agreements, defensive pacts, denouncing, sanctions), goods trading (barter and standing trade routes), demands and grievances, truces with timers, visible AI agendas, a deal editor | Done. Goods traded between civs move instantly between stores rather than by visible carriers |

Follow-ups built after M12 (see 16): market buying, ports and sea lanes, traded goods as cargo, war weariness,
online chat, turn timer and leaving a seat to the AI, fast parchment chunks, static shadow caching.

Engine work these milestones lean on (for the engine process): many small moving cargo items (instancing or particles,
probably fine already), road meshes on both terrain styles, static shadow caching (in progress), automatic
render-on-demand, and later network command transport.

## 14. Open questions

None block the next milestones. Details marked **Proposal** above (numbers, the goods list, the tech tree, civ perks,
diplomacy rules such as allied vision and World Council voting) will be settled and tuned in the milestones that
build them.

Resolved: expansion (villages plus an "Allow founding cities" option), construction (supplied by road, rush with
stars), workforce (city level caps buildings), project home (examples for now), combat (deterministic), victory
(Domination, Score, Prosperity, Alliance/diplomatic), turn order (sequential), art (primitives for now).

## 15. Second round: stars, wonders, ambitions and diplomacy (M9-M12)

Decided with the user on 2026-11-08: unit upkeep plus Polytopia-like prices; ambitions give bonuses only (the
victory types stay); both world wonders and personal monuments; and three diplomacy additions (star-priced actions,
goods trading, demands and grievances). Numbers are a **Proposal**, tuned with AI soak games.

### 15.1 Stars (M9)

Units already cost stars, but in soak games a big civ earned 45-240 stars a turn by turns 60-90 and banked up to
8,800, so price alone couldn't bite. Built:

- **Prices** moved towards Polytopia's: warrior 2, archer 3, rider 3, swordsman 5, catapult 8, settler 5 (plus goods).
- **Upkeep**: every unit costs 1 star a turn (catapults 2) beyond a free allowance of 3 units plus 1 per city, and
  upkeep doubles once a civ knows 12 technologies (modern armies cost more to keep, as in Civilization VI). Upkeep
  is paid after income; a civ that can't pay disbands its newest units until it can.
- **Income** grows more slowly with city level: levels 1-2 earn 1 and 2 stars, then +1 star every two levels.
- **Administration**: a civ's first 10 cities cost nothing to run, the next 10 cost 1 star a turn each, the next 10
  cost 2, and so on. This only bites on very wide civs; it was added because a 30-city conqueror still banked
  thousands. (A first version started at 6 cities and starved civs that had captured many level-1 villages.)
- **Research** costs 4 + 4 x tier + 1.5 x tier per city beyond the first (was 3 + 3 x tier + tier per city): with
  healthier economies, AIs had finished the whole tree by turn 45.
- **Bigger civs pay more** for wonders (+2 stars per city) and monuments (+1 per city).
- The **AI** saves up for research it can reach within a few turns, researches a food technology first, keeps a
  margin of income when training, and in peacetime disbands its weakest units when its income goes negative.
- Results (4-civ AI games on a 48 x 32 map): treasuries at turn 60 hold 20-110 stars; at turn 90, 270-820 (they
  were 300-4,150 before); a runaway conqueror with 20-30 cities holds about 2,300 at turn 100 (was 8,800).

### 15.2 Wonders and monuments (M10)

- **World wonders** exist once in the world. A civ places one like any construction site (stars, then goods carried
  by road; never rushed, no building slot). The first to finish it gets it; rival sites are cancelled and their
  delivered goods and half their stars returned. Each has an effect and a model of its own, for example the Great
  Wall (unwalled cities defend at x2.5), Great Library (research 25% cheaper), Hanging Gardens (+1 growth a turn in
  every city), Grand Bazaar (markets earn 50% more), Imperial Road (faster carriers, busier roads), Hall of Heroes
  (new units start as veterans), Great Observatory (+1 sight), Colossus (coastal cities +1 star), Council Hall (World
  Council votes) and the Grand Exchange (Prosperity victory).
- **Monuments** are personal: every civ can build each one once it has earned it with a feat (10 battles won, a
  level-6 city, 15 techs, 100 stars in the bank, half the land explored, 5 cities linked to the capital by road,
  300 goods produced, 25 turns of peace having met 2 civs). A finished monument raises its city a level and adds
  score. They cost stars and a little stone and planks, and can be rushed. A captured city's wonders and monuments
  change hands with it.

### 15.3 Ambitions (M11)

Like Civilization VII's legacy paths, but you choose one: **Conquest**, **Expansion**, **Industry**, **Knowledge**,
**Diplomacy** or **Wonders**. Each has four milestones (for example Expansion: 3, 6, 9 and 12 cities). Every
milestone pays stars and score; the first civ in the world to reach it gets double. Completing all four gives the
ambition's permanent **legacy** perk (such as Warlords: units deal 20% more damage). The race board shows everyone's
ambition and progress. You can change ambition until you reach its first milestone; milestones already met when you
pick an ambition pay out without the first-civ bonus. Victories are unchanged; ambitions feed the score.
Milestones pay 5, 10, 15 and 20 stars and 10 score each (both doubled for the first civ); a legacy adds 30 score,
and 50 more for the first civ to complete that ambition. Legacies: Warlords (units deal 20% more damage), Founders
(half administration), Guilds (+1 star a turn per 4 working buildings), Enlightened (research at half price),
Peacemakers (+3 council votes, other civs warm to you) and Patrons (+2 stars a turn per wonder and monument).

### 15.4 Diplomacy II (M12)

- **Star-priced actions** (Civilization VII's influence actions, paid in stars to keep one currency): cultural
  exchange (both civs gain a star a turn and warm to each other for 10 turns), research agreements (both pay, both
  get a free tech after 8 turns), defensive pacts (each joins the other's defensive wars, without shared vision),
  denouncing and sanctions (the target's income drops while they last).
- **Goods trading**: a deal editor that swaps goods and stars once, or every turn for 10 turns as a trade route
  (routes need the two road networks to touch).
- **Demands and grievances**: demand tribute or a city. Grievances build up from surprise wars, broken treaties,
  captured cities, denouncing, sanctions and refused demands, and fade over time. Enough grievance gives a
  justified war that other civs don't hold against you; a surprise war angers everyone. Peace starts a 10-turn truce
  during which neither side can declare war.
- Costs: cultural exchange 12 stars (proposer), research agreement 10 + 2 per city (each side), denouncing 5,
  sanctions 15 (the target loses 15% of its income for 10 turns). Grievances fade by 0.15 a round; 4 justify a war.
- **AI agendas**: every AI leader has a visible agenda (Expansionist, Merchant, Militarist, Builder, Peacemaker,
  Scholar) that shapes its attitudes; the diplomacy screen shows why each civ feels the way it does.

## 16. Follow-ups (built after M12)

- **Markets sell to their own civ** at twice the market price (at least 1 star a good). Bought goods wait at the
  market and carriers take them to whoever asks (construction sites, workshops, cities) or to a store. Goods marked
  for sale can't be bought, and coins can't be bought at all. The AI buys what its stalled construction sites lack
  once it has 50 stars to spare. This is the main remaining star sink for rich civs.
- **Ports** (Sailing; on the coast; planks and stone): a civ's ports are joined by sea lanes, the shortest water route
  between each pair on the same water, however long (deep ocean needs Navigation), which become part of its
  network. Carriers load and unload only at ports; ships cover four sea tiles for each road tile a cart walks, and the
  sea never jams (road capacity applies on land only). A port still being built is
  already linked, so its own materials can sail over. The AI builds ports to join cities on other landmasses.
- **Traded goods travel as cargo**: where the two civs' networks meet, barter, trade-route and tribute goods leave the
  giver's nearest store and are carried along both civs' roads to the receiver's capital (both players see the
  carts). Otherwise a caravan delivers them at once, as before. Cargo is lost if the two go to war.
- **War weariness**: every 4 turns of a war add 1 (up to 6) to both sides' willingness to make peace. AI civs offer
  peace to other AIs only when it would be accepted, and to people at most every 6 turns, which ends the old
  proposal spam.
- **Online**: chat (kept with the game, 100 lines), presence (who is connected), player names on the diplomacy
  screen, turn timers (when a player's time runs out, the AI plays that turn: the host sets the game's timer, and each
  player can have their own, set by the host or by that player), and leaving a game (the AI plays the civ until the
  player rejoins with their seat token).
- **Quick unit actions** (Polytopia-style): round buttons float above the selected unit for what it can do where it
  stands: crossed swords to capture the city, a house to found one, a flame to pillage; greyed, with the reason, when
  not possible yet.
- **Natural terrain**: chunks where nothing is explored are flat parchment. The parchment pattern repeats every chunk,
  so interior unexplored chunks share one texture: the colossal map builds in 0.23 s instead of 6.3 s.
- **Engine**: static shadow caching is on (shadow draw calls while panning drop from about 14 to 2 a frame).
