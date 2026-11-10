import type { FogMode } from "../fog";
import type { HistoryPoint } from "./history";
import type { AgendaId, AmbitionId, BuildingId, CivId, EndableTreaty, Good, Goods, RewardId, TechId, UnitTypeId } from "./rules";

/**
 * Plain, serialisable game state plus the commands that change it and the
 * events it reports. The simulation never touches rendering; the view
 * replays events, the AI and players issue commands.
 */

export type VictoryType = "domination" | "score" | "prosperity" | "alliance" | "diplomatic";
export type Difficulty = "easy" | "normal" | "hard";
export type Priority = "construction" | "production" | "food";

export interface GameOptions {
	width: number;
	height: number;
	seed: number;
	seedText: string;
	players: number;
	/** Player indices controlled by people (the rest are AI). */
	humans: number[];
	/** Civ per player; random unique civs when omitted. */
	civs?: CivId[];
	fog: FogMode;
	lineOfSight: boolean;
	/** "Allow founding cities": settlers exist and can found cities. */
	allowFounding: boolean;
	/**
	 * "Tribe starting techs": each civ starts with its own technology, as in
	 * Polytopia. Off, every civ starts with none. (Missing in older saves: on.)
	 */
	tribeTechs?: boolean;
	/**
	 * Shuffle the start spots between the civs. They are chosen best first, so
	 * without this the first seat (the host, or you against the AI) always got
	 * the best one. Missing in games from before it, which keep their starts.
	 */
	shuffleStarts?: boolean;
	victories: Record<VictoryType, boolean>;
	/** Score victory is decided after this many turns. */
	turnLimit: number;
	difficulty: Difficulty;
}

export interface PlayerStats {
	kills: number;
	lost: number;
	produced: number;
	captured: number;
	delivered: number;
	/** Cities taken from other civs (villages don't count). */
	conquered: number;
	/** Wars this civ declared. */
	warsDeclared: number;
}

export interface PlayerState {
	index: number;
	name: string;
	color: string;
	civ: CivId;
	human: boolean;
	alive: boolean;
	stars: number;
	techs: TechId[];
	/** Goods markets sell for stars. */
	sell: Good[];
	/** Which consumers get scarce goods first. */
	priority: Priority[];
	stats: PlayerStats;
	/** Monuments this civ has earned the right to build (by their feat). */
	feats: BuildingId[];
	/** The ambition this civ races for (null until chosen). */
	ambition: AmbitionId | null;
	/** Milestones of the ambition reached, by index. */
	milestones: number[];
	/** Completed its ambition and holds the legacy perk. */
	legacy: boolean;
	/** The last turn this civ was at war (for the peace monument). */
	lastWar: number;
	/** An AI leader's agenda, shown in diplomacy (null for people). */
	agenda: AgendaId | null;
}

export interface UnitState {
	id: number;
	type: UnitTypeId;
	owner: number;
	tile: number;
	hp: number;
	maxHp: number;
	/** Movement points left this turn. */
	moves: number;
	attacked: boolean;
	/** Moved, attacked or captured this turn (resting units heal). */
	acted: boolean;
	kills: number;
	veteran: boolean;
	/** Standing order: asleep until an enemy comes near, or fortified (dug in for defence). */
	order?: "sleep" | "fortify";
	/** A far tile the unit walks to over several turns. */
	goto?: number;
}

export interface CityState {
	id: number;
	/** -1 for a neutral village. */
	owner: number;
	tile: number;
	name: string;
	level: number;
	growth: number;
	capital: boolean;
	founded: number;
	walls: boolean;
	/** Extra stars per turn from rewards. */
	bonusIncome: number;
	/** Level-up rewards waiting for the owner's choice. */
	pendingRewards: number;
	radius: number;
	store: Goods;
}

export interface BuildingState {
	id: number;
	type: BuildingId;
	owner: number;
	tile: number;
	/** City whose territory (and building slots) it belongs to. */
	city: number;
	built: boolean;
	/** Materials still to be delivered (construction sites). */
	needs: Goods;
	input: Goods;
	output: Goods;
	/** Warehouses keep goods here. */
	store: Goods;
	/** Why it didn't produce last economy phase ("" when it did). */
	status: string;
	/** Stars paid to place it. */
	paid?: number;
}

export type CargoPurpose = "construction" | "input" | "food" | "store" | "market" | "trade";

export interface CargoState {
	id: number;
	owner: number;
	good: Good;
	/** Tiles from the source to the destination; `at` indexes the current tile. */
	path: number[];
	at: number;
	destKind: "building" | "city";
	dest: number;
	purpose: CargoPurpose;
	/** Trade cargo: the civ it is going to (along both civs' roads). */
	receiver?: number;
}

/**
 * Deals one civ can propose to another:
 * - peace, alliance, openBorders, trade (agreement), pact (defensive pact)
 * - gift: stars, accepted at once
 * - exchange: a cultural exchange, paid by the proposer
 * - research: a research agreement, both pay
 * - barter: goods and stars swapped once, or every turn as a trade route
 *   (goods travel as cargo along both civs' roads where they meet)
 * - tribute: a demand for stars or goods; city: a demand for a city
 */
export type DealKind = "peace" | "alliance" | "openBorders" | "trade" | "gift" | "pact" | "exchange" | "research" | "barter" | "tribute" | "city";

export interface ProposalState {
	id: number;
	from: number;
	to: number;
	kind: DealKind;
	/** Stars the proposer gives (gift, barter). */
	stars: number;
	turn: number;
	/** Goods the proposer gives (barter). */
	give?: Goods;
	/** Goods and stars the proposer asks for (barter, tribute). */
	get?: Goods;
	getStars?: number;
	/** Barter every turn for this many turns (a trade route); 0 or missing is once. */
	turns?: number;
	/** The city demanded. */
	city?: number;
}

/** A standing deal between two civs that lasts until a turn. */
export interface TreatyState {
	kind: "exchange" | "research" | "sanction" | "route";
	a: number;
	b: number;
	until: number;
	/** Routes: what a sends b and b sends a each turn. */
	give?: Goods;
	stars?: number;
	get?: Goods;
	getStars?: number;
}

export const WAR = 0;
export const PEACE = 1;
export const ALLIANCE = 2;

export interface CouncilState {
	formed: boolean;
	nextVote: number;
	lastWinner: number;
	streak: number;
	lastVotes: number[];
}

export interface DiplomacyState {
	/** n x n matrices, row-major [a * n + b]. */
	met: number[];
	relation: number[];
	openBorders: number[];
	trade: number[];
	/** How player a feels about b (-10..10); drives AI decisions. */
	attitude: number[];
	/** Defensive pacts (symmetric). */
	pact: number[];
	/** Turn until which neither side may declare war (after peace). */
	truce: number[];
	/** Turn the current war between a and b began. */
	warSince: number[];
	/** a's grievances against b; enough of them justify a war. */
	grievance: number[];
	/** Turn a last denounced b (0 for never). */
	denounced: number[];
	/** Exchanges, research agreements, sanctions and trade routes in force. */
	treaties: TreatyState[];
	proposals: ProposalState[];
	council: CouncilState;
}

export interface Winner {
	type: VictoryType;
	players: number[];
}

export interface GameState {
	version: number;
	options: GameOptions;
	turn: number;
	current: number;
	rng: number;
	nextId: number;
	players: PlayerState[];
	units: UnitState[];
	cities: CityState[];
	buildings: BuildingState[];
	cargo: CargoState[];
	diplomacy: DiplomacyState;
	/** Milestones already claimed by a first civ: "ambition:index" -> player. */
	firsts: Record<string, number>;
	winner: Winner | null;
	/** Each civ's standing once per round (Rankings charts). */
	history: HistoryPoint[];
}

// ------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------

export type Command =
	| { type: "move"; unit: number; to: number }
	| { type: "attack"; unit: number; target: number }
	| { type: "capture"; unit: number }
	| { type: "found"; unit: number }
	| { type: "pillage"; unit: number }
	| { type: "disband"; unit: number }
	| { type: "train"; city: number; unit: UnitTypeId }
	| { type: "build"; tile: number; building: BuildingId }
	| { type: "rush"; building: number }
	| { type: "buy"; building: number; good: Good; count: number }
	| { type: "demolish"; building: number }
	| { type: "road"; tile: number }
	| { type: "research"; tech: TechId }
	| { type: "reward"; city: number; reward: RewardId }
	| { type: "sell"; good: Good; on: boolean }
	| { type: "priority"; order: Priority[] }
	| { type: "declareWar"; target: number }
	| { type: "propose"; to: number; kind: DealKind; stars?: number; give?: Goods; get?: Goods; getStars?: number; turns?: number; city?: number }
	| { type: "respond"; proposal: number; accept: boolean }
	| { type: "denounce"; target: number }
	| { type: "sanction"; target: number }
	/** End an agreement with a civ early (see diplomacy.endTreatyCommand). */
	| { type: "endTreaty"; target: number; kind: EndableTreaty }
	/** Older name for ending open borders, still read from older command streams. */
	| { type: "closeBorders"; target: number }
	| { type: "ambition"; ambition: AmbitionId }
	/** Online: a person took (human) or gave up a civ's seat. Only the server issues it. */
	| { type: "seat"; player: number; human: boolean }
	| { type: "sleep"; unit: number }
	| { type: "fortify"; unit: number }
	| { type: "wake"; unit: number }
	| { type: "goto"; unit: number; to: number }
	| { type: "upgrade"; unit: number }
	| { type: "renameCity"; city: number; name: string }
	| { type: "endTurn" };

export interface CommandResult {
	ok: boolean;
	error?: string;
}

// ------------------------------------------------------------------
// Events (what changed, for the view, turn reports and replays)
// ------------------------------------------------------------------

export type SimEvent =
	| { type: "turnStart"; player: number; turn: number }
	| { type: "unitCreated"; unit: number }
	| { type: "unitMoved"; unit: number; path: number[] }
	| { type: "unitRemoved"; unit: number; owner: number; tile: number; reason: "killed" | "founded" | "disbanded" | "eliminated" }
	| { type: "unitChanged"; unit: number }
	| { type: "attack"; attacker: number; defender: number; from: number; to: number; damage: number; retaliation: number; killed: boolean; ranged: boolean }
	| { type: "cityChanged"; city: number }
	| { type: "orderEnded"; unit: number; reason: "arrived" | "blocked" | "enemy" }
	| { type: "unitUpgraded"; unit: number; from: UnitTypeId; to: UnitTypeId }
	| { type: "cityCaptured"; city: number; from: number; to: number }
	| { type: "cityFounded"; city: number }
	| { type: "cityLevel"; city: number; level: number }
	| { type: "territory"; player: number; tiles: number[] }
	| { type: "featureCleared"; tile: number }
	| { type: "buildingPlaced"; building: number }
	| { type: "buildingCompleted"; building: number }
	| { type: "buildingRemoved"; building: number; tile: number }
	| { type: "road"; tile: number; owner: number }
	| { type: "cargoMoved"; cargo: number; owner: number; good: Good; path: number[]; delivered: boolean; receiver?: number }
	| { type: "stars"; player: number; amount: number; reason: string }
	| { type: "tech"; player: number; tech: TechId }
	| { type: "fog"; player: number; tiles: number[] }
	| { type: "met"; a: number; b: number }
	| { type: "relation"; a: number; b: number; relation: number }
	| { type: "proposal"; proposal: ProposalState }
	| { type: "proposalResolved"; proposal: ProposalState; accepted: boolean }
	| { type: "council"; votes: number[]; winner: number }
	| { type: "wonder"; player: number; building: BuildingId; city: number; lost: number[] }
	| { type: "feat"; player: number; building: BuildingId }
	| { type: "milestone"; player: number; ambition: AmbitionId; index: number; first: boolean; legacy: boolean }
	| { type: "diplomacyAction"; kind: "denounce" | "sanction"; from: number; to: number }
	| { type: "treatyEnded"; kind: EndableTreaty; from: number; to: number; lost: number }
	| { type: "eliminated"; player: number }
	| { type: "report"; player: number; lines: string[] }
	| { type: "gameOver"; winner: Winner };
