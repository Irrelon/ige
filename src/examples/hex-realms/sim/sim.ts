import { FogOfWar, VISIBLE, UNEXPLORED, tileView, CITY_SIGHT, UNIT_SIGHT, type SightSource } from "../fog";
import { hexDistance } from "../hex";
import { chooseStartPositions, generateMap, type HexMap } from "../mapGen";
import { Relief, TERRAIN_INFO, type Terrain } from "../terrain";
import * as ambitions from "./ambitions";
import * as cities from "./cities";
import * as combat from "./combat";
import * as diplomacy from "./diplomacy";
import * as economy from "./economy";
import * as growth from "./growth";
import { hasWonder, researchCost, sightBonus } from "./effects";
import * as movement from "./movement";
import * as orders from "./orders";
import * as raiders from "./raiders";
import { recordHistory } from "./history";
import { addRivers } from "../rivers";
import { CIV_IDS, CIVS, type CivId, STARTING_STARS, STARTING_STORE, type TechId, TECHS, techCost, UNIT_TYPES, type UnitTypeId } from "./rules";
import * as treasury from "./treasury";
import * as wonders from "./wonders";
import {
	ALLIANCE, type BuildingState, type CargoState, type CityState, type Command, type CommandResult, type GameOptions,
	type GameState, NEUTRAL, PEACE, type PlayerState, RAIDERS, type SimEvent, type UnitState, WAR
} from "./types";
import { fail, ok } from "./result";
import * as victory from "./victory";

export const PLAYER_COLORS: [string, string][] = [
	["Azure", "#3b82f6"], ["Crimson", "#e5484d"], ["Amber", "#f5a524"], ["Violet", "#9b5de5"],
	["Teal", "#12a594"], ["Rose", "#e93d82"], ["Lime", "#8bc34a"], ["Orange", "#f76b15"],
	["Indigo", "#4f5bd5"], ["Bronze", "#b0815a"], ["Ivory", "#e8e4d8"], ["Slate", "#4a5568"]
];

const SYLLABLES = ["ka", "ro", "mel", "an", "tor", "vi", "sa", "dun", "el", "mar", "is", "bra", "the", "no", "gal", "rin", "os", "ur", "fen", "lo", "zan", "qua", "ber", "sil", "ta", "hu", "dor", "ne"];

export function defaultOptions (overrides: Partial<GameOptions> = {}): GameOptions {
	return {
		width: 48,
		height: 32,
		seed: 1,
		seedText: "hexrealms",
		players: 4,
		humans: [0],
		fog: "civ",
		lineOfSight: true,
		allowFounding: true,
		tribeTechs: true,
		shuffleStarts: true,
		rivers: true,
		neutralStart: true,
		buildGrowth: true,
		raiders: true,
		victories: { domination: true, score: true, prosperity: true, alliance: true, diplomatic: true },
		turnLimit: 60,
		difficulty: "normal",
		...overrides
	};
}

/**
 * The game simulation. Holds the serialisable GameState plus derived
 * per-tile indices, applies commands, runs turns and reports events.
 * Deterministic: the same options and commands always give the same game.
 */
export class Sim {
	state: GameState;
	map: HexMap;
	fog: FogOfWar;
	/** Road owner per tile, -1 for none. */
	roads: Int8Array;
	/** City whose territory each tile belongs to, -1 for none. */
	tileCity: Int32Array;
	unitAt: Int32Array;
	cityAt: Int32Array;
	buildingAt: Int32Array;

	protected _units = new Map<number, UnitState>();
	protected _cities = new Map<number, CityState>();
	protected _buildings = new Map<number, BuildingState>();
	protected _events: SimEvent[] = [];
	protected _fogDirty = new Set<number>();
	/** Called after every successfully applied command (for replays and online play). */
	onApplied?: (player: number, command: Command) => void;

	constructor (state: GameState, map: HexMap) {
		this.state = state;
		this.map = map;
		this.fog = new FogOfWar(map, state.options.players);
		this.fog.los = state.options.lineOfSight;
		this.roads = new Int8Array(map.count).fill(-1);
		this.tileCity = new Int32Array(map.count).fill(-1);
		this.unitAt = new Int32Array(map.count).fill(-1);
		this.cityAt = new Int32Array(map.count).fill(-1);
		this.buildingAt = new Int32Array(map.count).fill(-1);
		this.reindex();
	}

	// ------------------------------------------------------------------
	// Creation
	// ------------------------------------------------------------------

	/**
	 * Start a new game. Tests can pass their own map and start tiles, and
	 * turn off villages, to set up exact situations.
	 */
	static create (options: GameOptions, setup: { map?: HexMap; starts?: number[]; villages?: boolean } = {}): Sim {
		const map = setup.map ?? generateMap({ width: options.width, height: options.height, seed: options.seed });
		if (!setup.map && options.rivers) map.riverCourses = addRivers(map);
		const n = options.players;
		const state: GameState = {
			version: 2,
			options,
			turn: 1,
			current: 0,
			rng: options.seed >>> 0,
			nextId: 1,
			players: [],
			units: [],
			cities: [],
			buildings: [],
			cargo: [],
			diplomacy: {
				met: new Array(n * n).fill(0),
				relation: new Array(n * n).fill(options.neutralStart ? NEUTRAL : PEACE),
				openBorders: new Array(n * n).fill(0),
				trade: new Array(n * n).fill(0),
				attitude: new Array(n * n).fill(0),
				pact: new Array(n * n).fill(0),
				truce: new Array(n * n).fill(0),
				warSince: new Array(n * n).fill(0),
				grievance: new Array(n * n).fill(0),
				denounced: new Array(n * n).fill(0),
				treaties: [],
				proposals: [],
				council: { formed: false, nextVote: 0, lastWinner: -1, streak: 0, lastVotes: [] }
			},
			firsts: {},
			winner: null,
			history: [],
			camps: []
		};
		const sim = new Sim(state, map);

		// Civs: as requested, otherwise a shuffled unique set
		const civPool = CIV_IDS.filter((c) => !options.civs?.includes(c));
		for (let i = civPool.length - 1; i > 0; i--) {
			const j = Math.floor(sim.rand() * (i + 1));
			[civPool[i], civPool[j]] = [civPool[j], civPool[i]];
		}

		const starts = [...(setup.starts ?? chooseStartPositions(map, n))];
		if (!setup.starts && options.shuffleStarts) {
			for (let i = starts.length - 1; i > 0; i--) {
				const j = Math.floor(sim.rand() * (i + 1));
				[starts[i], starts[j]] = [starts[j], starts[i]];
			}
		}
		for (let p = 0; p < n; p++) {
			const civ: CivId = options.civs?.[p] ?? civPool[(p - (options.civs?.length ?? 0) + civPool.length * 4) % civPool.length];
			const [colorName, css] = PLAYER_COLORS[p % PLAYER_COLORS.length];
			state.players.push({
				index: p,
				name: `${CIVS[civ].name} (${colorName})`,
				color: css,
				civ,
				human: options.humans.includes(p),
				alive: true,
				stars: STARTING_STARS,
				techs: options.tribeTechs === false ? [] : [CIVS[civ].startTech],
				sell: ["coins"],
				priority: ["construction", "production", "food"],
				stats: { kills: 0, lost: 0, produced: 0, captured: 0, delivered: 0, conquered: 0, warsDeclared: 0 },
				feats: [],
				ambition: null,
				milestones: [],
				legacy: false,
				lastWar: 0,
				agenda: options.humans.includes(p) ? null : diplomacy.pickAgenda(options.seed, p)
			});
			state.diplomacy.relation[p * n + p] = ALLIANCE;
			state.diplomacy.met[p * n + p] = 1;
		}

		for (let p = 0; p < n; p++) {
			const tile = starts[p];
			if (tile === undefined) continue;
			const capital = cities.createCity(sim, p, tile, true);
			capital.store = { ...STARTING_STORE };
			const spots = sim.freeLandNear(tile, 2).filter((t) => t !== tile);
			sim.createUnit("warrior", p, spots[0] ?? tile, true);
			sim.createUnit("warrior", p, spots[1] ?? tile, true);
			if (options.allowFounding) sim.createUnit("settler", p, spots[2] ?? tile, true);
		}

		if (setup.villages !== false) sim.placeVillages(starts);
		for (let p = 0; p < n; p++) sim.markFog(p);
		sim.updateFog();
		recordHistory(sim);
		sim.beginTurn(0);
		return sim;
	}

	/** Neutral villages spread over the land, a few tiles from capitals and each other. */
	protected placeVillages (starts: number[]): void {
		const map = this.map;
		const candidates: number[] = [];
		let land = 0;
		for (let t = 0; t < map.count; t++) {
			if (map.isWater(t)) continue;
			land++;
			if (map.canSettle(t) && (map.landmassSizes[map.landmass[t]] ?? 0) >= 6) candidates.push(t);
		}
		for (let i = candidates.length - 1; i > 0; i--) {
			const j = Math.floor(this.rand() * (i + 1));
			[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
		}

		const target = Math.max(2, Math.floor(land / 22));
		const placed: number[] = [...starts];
		let count = 0;
		for (const t of candidates) {
			if (count >= target) break;
			if (placed.some((s) => map.distance(s, t) < 4)) continue;
			cities.createCity(this, -1, t, false);
			placed.push(t);
			count++;
		}
	}

	// ------------------------------------------------------------------
	// Indices and lookups
	// ------------------------------------------------------------------

	/** Rebuild derived indices from the state (after loading). */
	reindex (): void {
		this._units.clear();
		this._cities.clear();
		this._buildings.clear();
		this.unitAt.fill(-1);
		this.cityAt.fill(-1);
		this.buildingAt.fill(-1);
		for (const u of this.state.units) {
			this._units.set(u.id, u);
			this.unitAt[u.tile] = u.id;
		}
		for (const c of this.state.cities) {
			this._cities.set(c.id, c);
			this.cityAt[c.tile] = c.id;
		}
		for (const b of this.state.buildings) {
			this._buildings.set(b.id, b);
			this.buildingAt[b.tile] = b.id;
		}
	}

	nextId (): number {
		return this.state.nextId++;
	}

	/** Deterministic random number in [0, 1) from the state's seed. */
	rand (): number {
		const a = (this.state.rng + 0x6d2b79f5) >>> 0;
		this.state.rng = a;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	get options (): GameOptions {
		return this.state.options;
	}

	get playerCount (): number {
		return this.state.players.length;
	}

	player (p: number): PlayerState {
		return p >= 0 ? this.state.players[p] : this.raiderPlayer;
	}

	protected _raiderPlayer?: PlayerState;

	/** Raiders (owner -1) as a stand-in civ: a name and colour for their units, no techs, at war with all. */
	get raiderPlayer (): PlayerState {
		this._raiderPlayer ??= {
			index: RAIDERS, name: "Raiders", color: "#8c2318", civ: "highlanders", human: false, alive: true, stars: 0, techs: [], sell: [], priority: [],
			stats: { kills: 0, lost: 0, produced: 0, captured: 0, delivered: 0, conquered: 0, warsDeclared: 0 },
			feats: [], ambition: null, milestones: [], legacy: false, lastWar: 0, agenda: null
		};
		return this._raiderPlayer;
	}

	unit (id: number): UnitState | undefined {
		return this._units.get(id);
	}

	city (id: number): CityState | undefined {
		return this._cities.get(id);
	}

	building (id: number): BuildingState | undefined {
		return this._buildings.get(id);
	}

	unitOn (tile: number): UnitState | undefined {
		const id = this.unitAt[tile];
		return id >= 0 ? this._units.get(id) : undefined;
	}

	cityOn (tile: number): CityState | undefined {
		const id = this.cityAt[tile];
		return id >= 0 ? this._cities.get(id) : undefined;
	}

	buildingOn (tile: number): BuildingState | undefined {
		const id = this.buildingAt[tile];
		return id >= 0 ? this._buildings.get(id) : undefined;
	}

	citiesOf (p: number): CityState[] {
		return this.state.cities.filter((c) => c.owner === p);
	}

	unitsOf (p: number): UnitState[] {
		return this.state.units.filter((u) => u.owner === p);
	}

	buildingsOf (p: number): BuildingState[] {
		return this.state.buildings.filter((b) => b.owner === p);
	}

	hasTech (p: number, tech: TechId | null): boolean {
		return !tech || (p >= 0 && this.state.players[p].techs.includes(tech));
	}

	distance (a: number, b: number): number {
		return hexDistance(this.map.col(a), this.map.row(a), this.map.col(b), this.map.row(b));
	}

	tilesWithin (center: number, radius: number): number[] {
		const map = this.map;
		const out: number[] = [];
		const c0 = map.col(center), r0 = map.row(center);
		for (let r = r0 - radius; r <= r0 + radius; r++) {
			if (r < 0 || r >= map.height) continue;
			for (let c = c0 - radius - 1; c <= c0 + radius + 1; c++) {
				if (c < 0 || c >= map.width) continue;
				const t = r * map.width + c;
				if (hexDistance(c0, r0, c, r) <= radius) out.push(t);
			}
		}
		return out;
	}

	neighbors (tile: number): number[] {
		const out: number[] = [];
		for (let d = 0; d < 6; d++) {
			const n = this.map.neighbor(tile, d);
			if (n >= 0) out.push(n);
		}
		return out;
	}

	isLand (tile: number): boolean {
		return !TERRAIN_INFO[this.map.terrain[tile] as Terrain].water;
	}

	isPassableLand (tile: number): boolean {
		return this.isLand(tile) && this.map.relief[tile] !== Relief.Mountain;
	}

	/** Free (no unit) passable land tiles around a tile, nearest first. */
	freeLandNear (tile: number, radius: number): number[] {
		return this.tilesWithin(tile, radius)
			.filter((t) => this.isPassableLand(t) && this.unitAt[t] < 0)
			.sort((a, b) => this.distance(tile, a) - this.distance(tile, b) || a - b);
	}

	// ------------------------------------------------------------------
	// Diplomacy helpers
	// ------------------------------------------------------------------

	relation (a: number, b: number): number {
		if (a < 0 || b < 0) return a === b ? ALLIANCE : WAR; // neutral villages are fair game
		return this.state.diplomacy.relation[a * this.playerCount + b];
	}

	atWar (a: number, b: number): boolean {
		return a !== b && this.relation(a, b) === WAR;
	}

	allied (a: number, b: number): boolean {
		return a === b || (a >= 0 && b >= 0 && this.relation(a, b) === ALLIANCE);
	}

	hasMet (a: number, b: number): boolean {
		return this.state.diplomacy.met[a * this.playerCount + b] === 1;
	}

	// ------------------------------------------------------------------
	// Units
	// ------------------------------------------------------------------

	createUnit (type: UnitTypeId, owner: number, tile: number, ready = false): UnitState {
		const info = UNIT_TYPES[type];
		const unit: UnitState = {
			id: this.nextId(),
			type,
			owner,
			tile,
			hp: info.hp,
			maxHp: info.hp,
			moves: ready ? info.moves : 0,
			attacked: !ready,
			acted: true,
			kills: 0,
			veteran: false
		};
		this.state.units.push(unit);
		this._units.set(unit.id, unit);
		this.unitAt[tile] = unit.id;
		this.emit({ type: "unitCreated", unit: unit.id });
		this.markFog(owner);
		return unit;
	}

	removeUnit (unit: UnitState, reason: "killed" | "founded" | "disbanded" | "eliminated"): void {
		if (this.unitAt[unit.tile] === unit.id) this.unitAt[unit.tile] = -1;
		this._units.delete(unit.id);
		this.state.units = this.state.units.filter((u) => u !== unit);
		this.emit({ type: "unitRemoved", unit: unit.id, owner: unit.owner, tile: unit.tile, reason });
		this.markFog(unit.owner);
	}

	/** Move a unit's index entry (the caller has validated the move). */
	relocateUnit (unit: UnitState, tile: number): void {
		if (this.unitAt[unit.tile] === unit.id) this.unitAt[unit.tile] = -1;
		unit.tile = tile;
		this.unitAt[tile] = unit.id;
		this.markFog(unit.owner);
		if (unit.owner >= 0 && this.state.camps.length) raiders.enterCamp(this, unit);
	}

	// ------------------------------------------------------------------
	// Cities, buildings, cargo bookkeeping (used by the rule modules)
	// ------------------------------------------------------------------

	addCity (city: CityState): void {
		this.state.cities.push(city);
		this._cities.set(city.id, city);
		this.cityAt[city.tile] = city.id;
	}

	addBuilding (building: BuildingState): void {
		this.state.buildings.push(building);
		this._buildings.set(building.id, building);
		this.buildingAt[building.tile] = building.id;
	}

	removeBuilding (building: BuildingState): void {
		if (this.buildingAt[building.tile] === building.id) this.buildingAt[building.tile] = -1;
		this._buildings.delete(building.id);
		this.state.buildings = this.state.buildings.filter((b) => b !== building);
		this.state.cargo = this.state.cargo.filter((c) => !(c.destKind === "building" && c.dest === building.id));
		this.emit({ type: "buildingRemoved", building: building.id, tile: building.tile });
	}

	removeCargo (cargo: CargoState): void {
		this.state.cargo = this.state.cargo.filter((c) => c !== cargo);
	}

	/** Hand a city to another civ (used by deals; capture goes through the cities module directly). */
	transferCity (city: CityState, to: number): void {
		cities.transferCity(this, city, to);
	}

	cityName (): string {
		const used = new Set(this.state.cities.map((c) => c.name));
		for (let attempt = 0; attempt < 60; attempt++) {
			const parts = 2 + (this.rand() < 0.35 ? 1 : 0);
			let name = "";
			for (let p = 0; p < parts; p++) name += SYLLABLES[Math.floor(this.rand() * SYLLABLES.length)];
			name = name[0].toUpperCase() + name.slice(1);
			if (!used.has(name)) return name;
		}
		return `City ${this.state.cities.length + 1}`;
	}

	// ------------------------------------------------------------------
	// Fog of war
	// ------------------------------------------------------------------

	markFog (player: number): void {
		if (player < 0) return;
		this._fogDirty.add(player);
		// Allies share vision
		for (let q = 0; q < this.playerCount; q++) {
			if (q !== player && this.allied(player, q)) this._fogDirty.add(q);
		}
	}

	markAllFog (): void {
		for (let p = 0; p < this.playerCount; p++) this._fogDirty.add(p);
	}

	sightSources (p: number): SightSource[] {
		const sources: SightSource[] = [];
		const bonus = new Map<number, number>();
		const extra = (owner: number) => {
			let b = bonus.get(owner);
			if (b === undefined) bonus.set(owner, b = sightBonus(this, owner));
			return b;
		};
		for (const u of this.state.units) {
			if (this.allied(p, u.owner)) sources.push({ tile: u.tile, radius: this.fog.sightRadius(u.tile, UNIT_SIGHT + extra(u.owner)) });
		}
		for (const c of this.state.cities) {
			if (c.owner >= 0 && this.allied(p, c.owner)) sources.push({ tile: c.tile, radius: this.fog.sightRadius(c.tile, CITY_SIGHT + extra(c.owner)) });
		}
		return sources;
	}

	/** Recompute sight for players whose units or cities changed, and note civs meeting. */
	updateFog (): void {
		if (!this._fogDirty.size) return;
		const dirty = [...this._fogDirty].sort((a, b) => a - b);
		this._fogDirty.clear();
		for (const p of dirty) {
			if (!this.state.players[p].alive) continue;
			const changed = this.fog.update(p, this.sightSources(p));
			if (changed.length) this.emit({ type: "fog", player: p, tiles: changed });
			this.detectContact(p);
		}
	}

	protected detectContact (p: number): void {
		const visible = this.fog.visible[p];
		const meet = (q: number) => {
			if (q < 0 || q === p || this.hasMet(p, q)) return;
			const n = this.playerCount;
			this.state.diplomacy.met[p * n + q] = 1;
			this.state.diplomacy.met[q * n + p] = 1;
			this.emit({ type: "met", a: p, b: q });
		};
		for (const u of this.state.units) if (u.owner >= 0 && u.owner !== p && visible[u.tile]) meet(u.owner);
		for (const c of this.state.cities) if (c.owner >= 0 && c.owner !== p && visible[c.tile]) meet(c.owner);
	}

	/** What player p knows of a tile under the game's fog mode (UNEXPLORED / FOGGED / VISIBLE). */
	viewOf (p: number, tile: number): number {
		// Raiders know the land
		if (p < 0) return VISIBLE;
		return tileView(this.options.fog, this.fog.explored[p][tile], this.fog.visible[p][tile]);
	}

	/** Whether p can currently see a tile's contents (other civs' units). */
	canSee (p: number, tile: number): boolean {
		return this.viewOf(p, tile) === VISIBLE;
	}

	/** Whether p may plan movement through a tile. */
	knows (p: number, tile: number): boolean {
		return this.viewOf(p, tile) !== UNEXPLORED;
	}

	// ------------------------------------------------------------------
	// Events
	// ------------------------------------------------------------------

	emit (event: SimEvent): void {
		this._events.push(event);
	}

	/** Take the events emitted since the last call. */
	drainEvents (): SimEvent[] {
		const events = this._events;
		this._events = [];
		return events;
	}

	// ------------------------------------------------------------------
	// Commands
	// ------------------------------------------------------------------

	/**
	 * Apply a command for a player. Only the current player may act, except
	 * for answering diplomatic proposals addressed to them.
	 */
	apply (player: number, command: Command): CommandResult {
		if (this.state.winner) return fail("The game is over");
		if (player !== this.state.current && command.type !== "respond" && command.type !== "seat") return fail("It is not your turn");
		const p = this.state.players[player];
		if (!p || !p.alive) return fail("Unknown or eliminated player");

		let result: CommandResult;
		// A direct order replaces a unit's standing one (sleep, fortify, go to)
		if (command.type === "move" || command.type === "attack" || command.type === "capture" || command.type === "found" || command.type === "pillage") {
			const u = this.unit(command.unit);
			if (u && u.owner === player && orders.hasOrders(u)) {
				orders.clearOrders(u);
				this.emit({ type: "unitChanged", unit: u.id });
			}
		}
		switch (command.type) {
			case "move": result = movement.moveCommand(this, player, command.unit, command.to); break;
			case "attack": result = combat.attackCommand(this, player, command.unit, command.target); break;
			case "capture": result = cities.captureCommand(this, player, command.unit); break;
			case "found": result = cities.foundCommand(this, player, command.unit); break;
			case "pillage": result = economy.pillageCommand(this, player, command.unit); break;
			case "disband": result = this.disbandCommand(player, command.unit); break;
			case "train": result = cities.trainCommand(this, player, command.city, command.unit); break;
			case "build": result = economy.buildCommand(this, player, command.tile, command.building); break;
			case "rush": result = economy.rushCommand(this, player, command.building); break;
			case "buy": result = economy.buyCommand(this, player, command.building, command.good, command.count); break;
			case "demolish": result = economy.demolishCommand(this, player, command.building); break;
			case "road": result = economy.roadCommand(this, player, command.tile); break;
			case "research": result = this.researchCommand(player, command.tech); break;
			case "reward": result = cities.rewardCommand(this, player, command.city, command.reward); break;
			case "sell": result = economy.sellCommand(this, player, command.good, command.on); break;
			case "priority": result = economy.priorityCommand(this, player, command.order); break;
			case "declareWar": result = diplomacy.declareWarCommand(this, player, command.target); break;
			case "propose": result = diplomacy.proposeCommand(this, player, command.to, command.kind, command); break;
			case "respond": result = diplomacy.respondCommand(this, player, command.proposal, command.accept); break;
			case "denounce": result = diplomacy.denounceCommand(this, player, command.target); break;
			case "sanction": result = diplomacy.sanctionCommand(this, player, command.target); break;
			case "endTreaty": result = diplomacy.endTreatyCommand(this, player, command.target, command.kind); break;
			case "closeBorders": result = diplomacy.endTreatyCommand(this, player, command.target, "openBorders"); break;
			case "ambition": result = ambitions.ambitionCommand(this, player, command.ambition); break;
			case "seat": result = this.seatCommand(command.player, command.human); break;
			case "sleep": result = orders.sleepCommand(this, player, command.unit); break;
			case "fortify": result = orders.fortifyCommand(this, player, command.unit); break;
			case "wake": result = orders.wakeCommand(this, player, command.unit); break;
			case "explore": result = orders.exploreCommand(this, player, command.unit); break;
			case "goto": result = orders.gotoCommand(this, player, command.unit, command.to); break;
			case "upgrade": result = orders.upgradeCommand(this, player, command.unit); break;
			case "renameCity": result = cities.renameCommand(this, player, command.city, command.name); break;
			case "harvest": result = growth.harvestCommand(this, player, command.tile); break;
			case "endTurn": result = this.endTurn(player); break;
			default: result = fail("Unknown command");
		}

		if (result.ok) {
			this.updateFog();
			ambitions.checkAmbition(this, player);
			victory.checkVictory(this);
			this.onApplied?.(player, command);
		}
		return result;
	}

	/** Online: a person takes a civ's seat, or leaves it to the AI. */
	protected seatCommand (player: number, human: boolean): CommandResult {
		const p = this.state.players[player];
		if (!p) return fail("Unknown civ");
		p.human = !!human;
		return ok();
	}

	protected disbandCommand (player: number, unitId: number): CommandResult {
		const unit = this.unit(unitId);
		if (!unit || unit.owner !== player) return fail("Not your unit");
		this.removeUnit(unit, "disbanded");
		return ok();
	}

	protected researchCommand (player: number, tech: TechId): CommandResult {
		const p = this.state.players[player];
		const info = TECHS[tech];
		if (!info) return fail("Unknown tech");
		if (p.techs.includes(tech)) return fail("Already researched");
		if (!info.requires.every((r) => p.techs.includes(r))) return fail("Requires " + info.requires.map((r) => TECHS[r].name).join(", "));
		const cost = researchCost(this, player, tech);
		if (p.stars < cost) return fail(`Needs ${cost} stars`);
		p.stars -= cost;
		p.techs.push(tech);
		this.emit({ type: "stars", player, amount: -cost, reason: TECHS[tech].name });
		this.emit({ type: "tech", player, tech });
		if (tech === "statecraft") diplomacy.formCouncil(this);
		return ok();
	}

	// ------------------------------------------------------------------
	// Turns
	// ------------------------------------------------------------------

	protected endTurn (player: number): CommandResult {
		const n = this.playerCount;
		let next = player;
		let wrapped = false;
		for (let i = 0; i < n; i++) {
			next = (next + 1) % n;
			if (next <= player) wrapped = true;
			if (this.state.players[next].alive) break;
		}
		if (wrapped) {
			this.state.turn++;
			this.endRound();
			if (this.state.winner) return ok();
		}
		this.state.current = next;
		this.beginTurn(next);
		return ok();
	}

	/** Once per round, after the last civ has played. */
	protected endRound (): void {
		raiders.raidersRound(this);
		diplomacy.roundUpdate(this);
		victory.roundCheck(this);
		recordHistory(this);
	}

	/**
	 * Start a civ's turn: the economy phase (production, carriers,
	 * deliveries), income, healing, fresh moves and a turn report.
	 */
	beginTurn (player: number): void {
		const p = this.state.players[player];
		const lines: string[] = [];
		this.emit({ type: "turnStart", player, turn: this.state.turn });

		if (this.state.turn > 1) economy.economyPhase(this, player, lines);
		if (hasWonder(this, player, "hangingGardens")) {
			for (const c of this.citiesOf(player)) cities.addGrowth(this, c, 1);
		}

		treasury.collect(this, player, lines);
		wonders.checkFeats(this, player, lines);
		ambitions.checkAmbition(this, player);

		for (const u of this.unitsOf(player)) {
			if (!u.acted && u.hp < u.maxHp) {
				const home = this.map.owner[u.tile] === player;
				u.hp = Math.min(u.maxHp, u.hp + (home ? 4 : 2));
				this.emit({ type: "unitChanged", unit: u.id });
			}
			u.moves = UNIT_TYPES[u.type].moves;
			u.attacked = false;
			u.acted = false;
		}
		// Sleepers near enemies wake; units with a go-to order walk on
		this.updateFog();
		orders.runOrders(this, player, lines);

		for (const c of this.citiesOf(player)) {
			if (c.pendingRewards > 0) lines.push(`${c.name} grew to level ${c.level}: choose a reward`);
		}
		const pending = this.state.diplomacy.proposals.filter((pr) => pr.to === player);
		for (const pr of pending) lines.push(`${this.state.players[pr.from].name} proposes ${pr.kind}`);

		this.markFog(player);
		this.updateFog();
		this.emit({ type: "report", player, lines });
	}

	/** The player whose turn it is. */
	get current (): number {
		return this.state.current;
	}

	isHuman (p: number): boolean {
		return this.state.players[p].human;
	}

	// ------------------------------------------------------------------
	// Elimination
	// ------------------------------------------------------------------

	/** Remove a civ that has lost all its cities. */
	eliminate (player: number): void {
		const p = this.state.players[player];
		if (!p.alive) return;
		p.alive = false;
		for (const u of this.unitsOf(player)) this.removeUnit(u, "eliminated");
		for (const b of this.buildingsOf(player)) this.removeBuilding(b);
		this.state.cargo = this.state.cargo.filter((c) => c.owner !== player);
		for (let t = 0; t < this.map.count; t++) {
			if (this.roads[t] === player) {
				this.roads[t] = -1;
				this.emit({ type: "road", tile: t, owner: -1 });
			}
		}
		this.state.diplomacy.proposals = this.state.diplomacy.proposals.filter((pr) => pr.from !== player && pr.to !== player);
		this.emit({ type: "eliminated", player });
	}

	// ------------------------------------------------------------------
	// Save / load
	// ------------------------------------------------------------------

	serialize (): string {
		const map = this.map;
		return JSON.stringify({
			state: this.state,
			map: {
				feature: encode(map.feature),
				owner: encode(new Uint8Array(map.owner.buffer)),
				deposit: encode(map.deposit)
			},
			roads: encode(new Uint8Array(this.roads.buffer)),
			tileCity: encode(new Uint8Array(this.tileCity.buffer)),
			explored: this.fog.explored.map((e) => encode(e))
		});
	}

	/** Fill in state added since a save was made. */
	static migrate (state: GameState): void {
		// Version 2: the World Council tech became Statecraft, and a new tier-2 Diplomacy tech opens the
		// diplomacy screen; civs that had the old Diplomacy get both. Older civs keep their diplomacy as it was.
		if ((state.version ?? 1) < 2) {
			for (const p of state.players) {
				const techs = p.techs as string[];
				if (techs.includes("diplomacy")) techs.push("statecraft");
				else techs.push("diplomacy");
			}
			state.version = 2;
		}
		const n = state.players.length;
		const d = state.diplomacy;
		const zeros = () => new Array(n * n).fill(0);
		d.pact ??= zeros();
		d.truce ??= zeros();
		d.warSince ??= zeros();
		d.grievance ??= zeros();
		d.denounced ??= zeros();
		d.treaties ??= [];
		state.firsts ??= {};
		state.history ??= [];
		state.camps ??= [];
		for (const p of state.players) {
			p.feats ??= [];
			p.ambition ??= null;
			p.milestones ??= [];
			p.legacy ??= false;
			p.lastWar ??= 0;
			p.agenda ??= p.human ? null : diplomacy.pickAgenda(state.options.seed, p.index);
			p.stats.conquered ??= 0;
			p.stats.warsDeclared ??= 0;
		}
	}

	static load (json: string): Sim {
		const data = JSON.parse(json);
		const state = data.state as GameState;
		const o = state.options;
		const map = generateMap({ width: o.width, height: o.height, seed: o.seed });
		if (o.rivers) map.riverCourses = addRivers(map);
		map.feature.set(decode(data.map.feature));
		map.owner.set(new Int8Array(decode(data.map.owner).buffer));
		map.deposit.set(decode(data.map.deposit));
		Sim.migrate(state);
		const sim = new Sim(state, map);
		sim.roads.set(new Int8Array(decode(data.roads).buffer));
		sim.tileCity.set(new Int32Array(decode(data.tileCity).buffer.slice(0)));
		data.explored.forEach((e: string, p: number) => sim.fog.explored[p].set(decode(e)));
		sim.markAllFog();
		sim.updateFog();
		sim.drainEvents();
		return sim;
	}
}

function encode (bytes: Uint8Array): string {
	let s = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
	}
	return typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64");
}

function decode (text: string): Uint8Array {
	const s = typeof atob === "function" ? atob(text) : Buffer.from(text, "base64").toString("binary");
	const out = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
	return out;
}

export { fail, ok, techCost };
