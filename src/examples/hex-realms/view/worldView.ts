import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import { IgeParticleSystem3d, type IgeParticleSystem3dOptions } from "@/engine/webgl/IgeParticleSystem3d";
import { UNEXPLORED, VISIBLE } from "../fog";
import { CORNER_X, CORNER_Z, type HexLayout } from "../hex";
import { MeshBuilder } from "../meshBuilder";
import { type BuildingId, BUILDINGS, Deposit, type Good, GOOD_INFO, UNIT_LOOK, UNIT_TYPE_IDS, type UnitTypeId } from "../sim/rules";
import type { Sim } from "../sim/sim";
import type { BuildingState, CityState, SimEvent, UnitState } from "../sim/types";
import { buildBorderGeometry, createDisc, createHexRing, createRing, CUBE, ORB, PYRAMID } from "../shapes";
import { mulberry32 } from "../noise";
import { type DepositLook, depositVox } from "./blocky/deposits";
import { separatedBoxes } from "./blocky/mesh";
import type { ModelLibrary } from "./models";
import type { TerrainView } from "./terrainView";

/**
 * Everything standing on the map: units, cities, buildings, roads, carriers
 * and borders, plus selection overlays. Built from the simulation state and
 * kept in sync by replaying its events as animations.
 */

type Rgb = { r: number; g: number; b: number };

interface Part {
	geometry: IgeGeometryData3d;
	size: [number, number, number];
	y: number;
	tint: "player" | "dark" | "wood" | "light";
}

const BASE_UNIT_PARTS: Record<"warrior" | "archer" | "rider" | "swordsman" | "catapult" | "settler", Part[]> = {
	warrior: [{ geometry: CUBE, size: [22, 22, 22], y: 11, tint: "player" }],
	archer: [{ geometry: PYRAMID, size: [26, 34, 26], y: 0, tint: "player" }],
	rider: [
		{ geometry: ORB, size: [30, 22, 34], y: 11, tint: "dark" },
		{ geometry: CUBE, size: [14, 18, 14], y: 30, tint: "player" }
	],
	swordsman: [{ geometry: CUBE, size: [20, 38, 20], y: 19, tint: "player" }],
	catapult: [
		{ geometry: CUBE, size: [34, 10, 26], y: 5, tint: "wood" },
		{ geometry: PYRAMID, size: [26, 26, 20], y: 10, tint: "player" }
	],
	settler: [{ geometry: ORB, size: [24, 24, 24], y: 15, tint: "player" }]
};

/** Vehicles without a model yet: simple shapes that read as what they are. */
const VEHICLE_PARTS: Partial<Record<UnitTypeId, Part[]>> = {
	tank: [
		{ geometry: CUBE, size: [36, 12, 26], y: 7, tint: "dark" },
		{ geometry: CUBE, size: [20, 10, 18], y: 17, tint: "player" },
		{ geometry: CUBE, size: [26, 4, 4], y: 18, tint: "dark" }
	],
	hoverTank: [
		{ geometry: ORB, size: [40, 10, 30], y: 10, tint: "light" },
		{ geometry: CUBE, size: [18, 9, 16], y: 18, tint: "player" },
		{ geometry: CUBE, size: [30, 3, 3], y: 19, tint: "light" }
	],
	rocketArtillery: [
		{ geometry: CUBE, size: [34, 12, 22], y: 7, tint: "dark" },
		{ geometry: CUBE, size: [22, 8, 16], y: 18, tint: "player" }
	],
	railgun: [
		{ geometry: CUBE, size: [30, 10, 24], y: 6, tint: "dark" },
		{ geometry: CUBE, size: [44, 5, 5], y: 15, tint: "light" },
		{ geometry: ORB, size: [14, 14, 14], y: 14, tint: "player" }
	]
};

const UNIT_PARTS = Object.fromEntries(UNIT_TYPE_IDS.map((t) => [t, VEHICLE_PARTS[t] ?? BASE_UNIT_PARTS[UNIT_LOOK[t]]])) as Record<UnitTypeId, Part[]>;

/**
 * A unit's model: its own once one is imported (named after the unit type),
 * otherwise its line's (vehicles use their parts instead).
 */
function modelOf (type: UnitTypeId, models?: ModelLibrary): string {
	if (type !== UNIT_LOOK[type] && models?.info(type)) return type;
	return VEHICLE_PARTS[type] ? `vehicle:${type}` : UNIT_LOOK[type];
}

const BOAT: Part = { geometry: CUBE, size: [44, 8, 24], y: 2, tint: "wood" };
/**
 * Under a modelled unit, so you can tell whose it is at a glance: a ring in
 * its owner's colour round a darker disc of the same colour (the models
 * themselves keep their own colours).
 */
const UNIT_BASE: Part = { geometry: createRing("hexRealms_unitBaseRing", 1, 0.76), size: [19, 1, 19], y: 1.2, tint: "player" };
const UNIT_BASE_FILL: Part = { geometry: createDisc("hexRealms_unitBaseFill", 0.78), size: [19, 1, 19], y: 0.9, tint: "dark" };
/** Model sizes (world units): characters by height, props by footprint. */
const BASE_MODEL_FIT = {
	warrior: { height: 46 }, archer: { height: 46 }, swordsman: { height: 50 }, settler: { height: 44 },
	rider: { height: 54, footprint: 50 }, catapult: { height: 40, footprint: 46 }
};
const UNIT_MODEL_FIT = Object.fromEntries(UNIT_TYPE_IDS.map((t) => [t, BASE_MODEL_FIT[UNIT_LOOK[t]]])) as Record<UnitTypeId, { height?: number; footprint?: number }>;
/** Later industries borrow an older building's model until they have their own. */
const BUILDING_MODEL_OF: Partial<Record<BuildingId, string>> = { steelworks: "smelter", powderMill: "toolsmith", factory: "armoury", electronicsWorks: "mint" };

/** The model a building is drawn with: its own if the art pack has one, else the one it borrows. */
function buildingModelOf (type: BuildingId, models?: ModelLibrary): string {
	return models?.info(type) ? type : BUILDING_MODEL_OF[type] ?? type;
}
/** Buildings whose models read small at the usual size (long and low ones) are drawn this much bigger. */
const MODEL_GROW: Partial<Record<BuildingId, number>> = { market: 1.3, mill: 1.35, greatWall: 1.4 };
/**
 * The boat model's size, and where a unit stands on it: its deck height, and how far forward of the
 * middle. The boat's sail runs along its centreline nearly bow to stern, so the unit stands right
 * up in the bow, ahead of the sail's foot.
 */
const BOAT_FIT = { footprint: 62 };
const BOAT_DECK = 9;
const BOAT_BOW = 22;
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const STONE: Rgb = { r: 0.86, g: 0.82, b: 0.74 };
const ROOF: Rgb = { r: 0.72, g: 0.36, b: 0.24 };
const NEUTRAL: Rgb = { r: 0.62, g: 0.6, b: 0.56 };
const WOOD: Rgb = { r: 0.5, g: 0.34, b: 0.2 };

/** The blocky pack's scene for each deposit. */
const DEPOSIT_VOX: Record<Exclude<Deposit, Deposit.None>, DepositLook> = {
	[Deposit.Fish]: "fish",
	[Deposit.Game]: "game",
	[Deposit.Ore]: "ore",
	[Deposit.Coal]: "coal",
	[Deposit.Gold]: "gold",
	[Deposit.Horses]: "horses"
};

/** Little piles marking resource deposits: [colour, shape] per deposit. */
const DEPOSIT_LOOK: Record<Exclude<Deposit, Deposit.None>, { color: Rgb; shape: "rocks" | "fish" | "game" | "horses" }> = {
	[Deposit.Fish]: { color: { r: 0.86, g: 0.92, b: 0.98 }, shape: "fish" },
	[Deposit.Game]: { color: { r: 0.62, g: 0.43, b: 0.25 }, shape: "game" },
	[Deposit.Ore]: { color: { r: 0.7, g: 0.34, b: 0.24 }, shape: "rocks" },
	[Deposit.Coal]: { color: { r: 0.16, g: 0.16, b: 0.18 }, shape: "rocks" },
	[Deposit.Gold]: { color: { r: 1, g: 0.8, b: 0.2 }, shape: "rocks" },
	[Deposit.Horses]: { color: { r: 0.48, g: 0.3, b: 0.17 }, shape: "horses" }
};

const STEP_TIME = 0.18;
const LUNGE_TIME = 0.35;
/** Character clips play faster than recorded, to match the game's quick moves. */
const WALK_SPEED = 2.4;
const ATTACK_SPEED = 1.8;
const HIT_SPEED = 1.7;
const DEATH_SPEED = 1.6;
/** Seconds a killed character spends dying before it is removed. */
const DEATH_TIME = 1.5;
/** Simpler meshes for props that are small on screen (generated by the engine). */
const PROP_LOD = [{ screenSize: 110, ratio: 0.35 }, { screenSize: 40, ratio: 0.12 }];
/**
 * The windmill in two parts, so its sails turn: a sail-less body and a sail
 * cross on a hub at the front of the cap (in tile radii from the foot of the
 * mill, in the body's own frame: +z is its front). Sizes are in tile radii too.
 */
const WINDMILL = { body: "millBody", sails: "millSails", bodyHeight: 1.2, sailSpan: 0.82, hub: { x: 0, y: 0.85, z: 0.27 }, depth: 0.3, turn: 0.9 };
const CARGO_TILES_PER_SECOND = 6;

interface UnitView {
	/** The unit's 3D model (a rigged character or a prop), when loaded. */
	model?: IgeEntity | null;
	/** Player-coloured ring and disc under a modelled unit. */
	base?: IgeEntity;
	baseFill?: IgeEntity;
	/** The clip playing, and until when a one-shot clip runs. */
	clip?: string;
	clipUntil?: number;
	/** When a killed character starts its death clip. */
	dying?: number;
	clipSpeed?: number;
	/** Holds the model (raised onto the boat's deck at sea). */
	body?: IgeEntity;
	id: number;
	type: UnitTypeId;
	owner: number;
	root: IgeEntity;
	parts: IgeEntity[];
	boat: IgeEntity;
	/** Tile the unit is shown on (lags the simulation while animating). */
	tile: number;
	queue: number[];
	stepT: number;
	lunge: { to: number; t: number; ranged?: boolean } | null;
	flash: number;
	pop: number;
	removeAt: number;
	phase: number;
	selected: boolean;
	shown: boolean;
}

/** An arrow or a catapult stone in flight. */
interface ShotView {
	entity: IgeEntity;
	from: { x: number; y: number; z: number };
	to: { x: number; y: number; z: number };
	/** Progress, 0 to 1 (negative while waiting for the attack clip to loose it). */
	t: number;
	time: number;
	arc: number;
}

interface CargoView {
	entity: IgeEntity;
	path: number[];
	t: number;
	afloat?: boolean;
}

function hexToRgb (hex: string): Rgb {
	const n = parseInt(hex.slice(1), 16);
	return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function material (c: Rgb, emissive?: Rgb, glow = 0): IgeMaterialData {
	const m: IgeMaterialData = { color: { r: c.r, g: c.g, b: c.b, a: 1 }, roughness: 0.7 };
	if (emissive && glow > 0) {
		m.emissiveColor = emissive;
		m.emissiveIntensity = glow;
	}
	return m;
}

const MARBLE: Rgb = { r: 0.93, g: 0.91, b: 0.86 };
const GOLD: Rgb = { r: 0.98, g: 0.8, b: 0.3 };
const BRONZE: Rgb = { r: 0.74, g: 0.5, b: 0.26 };
const LEAF: Rgb = { r: 0.32, g: 0.62, b: 0.3 };
const WATER: Rgb = { r: 0.4, g: 0.7, b: 0.95 };
const SAND: Rgb = { r: 0.88, g: 0.76, b: 0.52 };

/** Places one part, in units of the hex size from the building's base (cubes and orbs centred; pyramids stand on py). */
type PartFn = (g: IgeGeometryData3d, w: number, h: number, d: number, px: number, py: number, pz: number, c: Rgb, rot?: number) => void;

/** Placeholder models for world wonders and monuments, built from cubes, orbs and pyramids. */
function wonderModel (type: BuildingId, owner: Rgb, part: PartFn): void {
	const pillar = (px: number, pz: number, h: number, c: Rgb, w = 0.06) => part(CUBE, w, h, w, px, h / 2, pz, c);
	switch (type) {
		case "greatLibrary":
			part(CUBE, 0.58, 0.06, 0.42, 0, 0.03, 0, MARBLE);
			for (const pz of [-0.15, 0.15]) for (const px of [-0.22, -0.11, 0, 0.11, 0.22]) pillar(px, pz, 0.26, MARBLE, 0.05);
			part(CUBE, 0.6, 0.05, 0.44, 0, 0.3, 0, MARBLE);
			part(PYRAMID, 0.6, 0.14, 0.44, 0, 0.32, 0, owner);
			break;
		case "greatWall":
			for (let k = 0; k < 6; k++) {
				const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
				part(CUBE, 0.42, 0.16, 0.07, Math.sin(a) * 0.33, 0.08, Math.cos(a) * 0.33, STONE, a);
				if (k % 2 === 0) {
					const c = a + Math.PI / 6;
					part(CUBE, 0.12, 0.28, 0.12, Math.sin(c) * 0.38, 0.14, Math.cos(c) * 0.38, STONE);
					part(PYRAMID, 0.14, 0.08, 0.14, Math.sin(c) * 0.38, 0.28, Math.cos(c) * 0.38, owner);
				}
			}
			break;
		case "colossus":
			part(CUBE, 0.3, 0.12, 0.3, 0, 0.06, 0, STONE);
			pillar(-0.05, 0, 0.2, BRONZE, 0.06);
			pillar(0.05, 0, 0.2, BRONZE, 0.06);
			part(CUBE, 0.18, 0.24, 0.1, 0, 0.44, 0, BRONZE);
			part(ORB, 0.12, 0.12, 0.12, 0, 0.62, 0, BRONZE);
			part(CUBE, 0.04, 0.24, 0.04, 0.12, 0.62, 0, BRONZE);
			part(ORB, 0.08, 0.08, 0.08, 0.12, 0.76, 0, GOLD);
			break;
		case "hangingGardens":
			for (let k = 0; k < 3; k++) {
				const s = 0.56 - k * 0.15;
				part(CUBE, s, 0.12, s, 0, 0.06 + k * 0.12, 0, SAND);
				part(CUBE, s * 0.96, 0.025, s * 0.96, 0, 0.13 + k * 0.12, 0, LEAF);
			}
			for (const [px, pz] of [[0.2, 0.2], [-0.2, 0.18], [0.16, -0.2], [-0.18, -0.16], [0, 0.07]]) part(ORB, 0.09, 0.09, 0.09, px, 0.18 + (Math.abs(px) < 0.1 ? 0.25 : 0), pz, LEAF);
			part(PYRAMID, 0.12, 0.1, 0.12, 0, 0.36, 0, owner);
			break;
		case "grandBazaar":
			part(CUBE, 0.52, 0.18, 0.46, 0, 0.09, 0, SAND);
			part(ORB, 0.32, 0.32, 0.32, 0, 0.22, 0, MARBLE);
			part(ORB, 0.13, 0.13, 0.13, 0.2, 0.2, 0.17, MARBLE);
			part(ORB, 0.13, 0.13, 0.13, -0.2, 0.2, 0.17, MARBLE);
			part(PYRAMID, 0.18, 0.06, 0.12, 0, 0.18, -0.26, owner);
			part(CUBE, 0.03, 0.1, 0.03, 0, 0.42, 0, GOLD);
			break;
		case "imperialRoad":
			part(CUBE, 0.66, 0.02, 0.2, 0, 0.01, 0, { r: 0.5, g: 0.42, b: 0.32 });
			pillar(-0.22, 0, 0.42, STONE, 0.12);
			pillar(0.22, 0, 0.42, STONE, 0.12);
			part(CUBE, 0.6, 0.1, 0.16, 0, 0.47, 0, STONE);
			part(CUBE, 0.24, 0.05, 0.17, 0, 0.545, 0, owner);
			break;
		case "hallOfHeroes":
			part(CUBE, 0.34, 0.34, 0.3, 0, 0.17, 0, STONE);
			part(PYRAMID, 0.4, 0.18, 0.36, 0, 0.34, 0, owner);
			for (const px of [-0.26, 0.26]) {
				part(CUBE, 0.08, 0.06, 0.08, px, 0.03, 0.12, STONE);
				part(CUBE, 0.06, 0.18, 0.05, px, 0.15, 0.12, BRONZE);
				part(ORB, 0.06, 0.06, 0.06, px, 0.27, 0.12, BRONZE);
			}
			break;
		case "observatory":
			part(CUBE, 0.3, 0.08, 0.3, 0, 0.04, 0, STONE);
			part(CUBE, 0.18, 0.56, 0.18, 0, 0.36, 0, STONE);
			part(ORB, 0.26, 0.26, 0.26, 0, 0.66, 0, { r: 0.35, g: 0.5, b: 0.78 });
			part(CUBE, 0.03, 0.16, 0.03, 0.08, 0.78, 0.04, GOLD);
			break;
		case "councilHall":
			part(CUBE, 0.54, 0.05, 0.54, 0, 0.025, 0, MARBLE);
			for (let k = 0; k < 8; k++) {
				const a = (k / 8) * Math.PI * 2;
				pillar(Math.sin(a) * 0.21, Math.cos(a) * 0.21, 0.24, MARBLE, 0.045);
			}
			part(CUBE, 0.5, 0.05, 0.5, 0, 0.27, 0, MARBLE);
			part(ORB, 0.38, 0.26, 0.38, 0, 0.3, 0, MARBLE);
			part(CUBE, 0.02, 0.14, 0.02, 0, 0.5, 0, STONE);
			part(CUBE, 0.1, 0.06, 0.01, 0.05, 0.54, 0, owner);
			break;
		// Monuments: smaller, on a plinth
		case "victoryArch":
			part(CUBE, 0.4, 0.04, 0.16, 0, 0.02, 0, STONE);
			pillar(-0.13, 0, 0.3, MARBLE, 0.09);
			pillar(0.13, 0, 0.3, MARBLE, 0.09);
			part(CUBE, 0.38, 0.09, 0.14, 0, 0.34, 0, MARBLE);
			part(CUBE, 0.14, 0.05, 0.15, 0, 0.41, 0, owner);
			break;
		case "grandFountain":
			part(ORB, 0.46, 0.08, 0.46, 0, 0.04, 0, STONE);
			part(ORB, 0.38, 0.05, 0.38, 0, 0.07, 0, WATER);
			pillar(0, 0, 0.22, MARBLE, 0.06);
			part(ORB, 0.14, 0.06, 0.14, 0, 0.22, 0, MARBLE);
			part(ORB, 0.08, 0.1, 0.08, 0, 0.28, 0, WATER);
			break;
		case "sageTower":
			part(CUBE, 0.22, 0.06, 0.22, 0, 0.03, 0, STONE);
			part(CUBE, 0.13, 0.46, 0.13, 0, 0.29, 0, MARBLE);
			part(PYRAMID, 0.18, 0.18, 0.18, 0, 0.52, 0, owner);
			break;
		case "gildedVault":
			part(CUBE, 0.3, 0.06, 0.3, 0, 0.03, 0, STONE);
			part(CUBE, 0.24, 0.2, 0.24, 0, 0.16, 0, GOLD);
			part(PYRAMID, 0.26, 0.1, 0.26, 0, 0.26, 0, GOLD);
			part(CUBE, 0.06, 0.08, 0.01, 0, 0.12, 0.125, owner);
			break;
		case "pathfinderCairn":
			for (const [s, py] of [[0.26, 0.08], [0.2, 0.22], [0.15, 0.33], [0.1, 0.42]] as [number, number][]) part(ORB, s, s * 0.7, s, 0, py, 0, STONE);
			part(CUBE, 0.02, 0.18, 0.02, 0.03, 0.55, 0, WOOD);
			part(CUBE, 0.1, 0.06, 0.01, 0.08, 0.6, 0, owner);
			break;
		case "marketCross":
			part(CUBE, 0.28, 0.05, 0.28, 0, 0.025, 0, STONE);
			part(CUBE, 0.07, 0.48, 0.07, 0, 0.29, 0, STONE);
			part(CUBE, 0.26, 0.06, 0.06, 0, 0.42, 0, STONE);
			part(ORB, 0.08, 0.08, 0.08, 0, 0.56, 0, owner);
			break;
		case "artisansColumn":
			part(CUBE, 0.22, 0.06, 0.22, 0, 0.03, 0, STONE);
			part(CUBE, 0.1, 0.5, 0.1, 0, 0.31, 0, MARBLE);
			part(CUBE, 0.16, 0.04, 0.16, 0, 0.58, 0, MARBLE);
			part(ORB, 0.1, 0.1, 0.1, 0, 0.65, 0, BRONZE);
			break;
		case "peaceGarden":
			part(ORB, 0.5, 0.05, 0.5, 0, 0.025, 0, LEAF);
			for (const [px, pz] of [[0.16, 0.12], [-0.15, 0.14], [0.1, -0.16], [-0.14, -0.12]]) part(ORB, 0.1, 0.12, 0.1, px, 0.08, pz, LEAF);
			pillar(0, 0, 0.16, MARBLE, 0.07);
			part(ORB, 0.1, 0.07, 0.1, 0, 0.2, 0, MARBLE);
			part(CUBE, 0.06, 0.03, 0.06, 0, 0.25, 0, owner);
			break;
	}
}

export interface WorldViewHooks {
	/** A unit took damage (for floating numbers). */
	onDamage?: (tile: number, amount: number) => void;
	/** Something visible changed; render a frame. */
	invalidate?: () => void;
}

export class WorldView {
	sim: Sim;
	layout: HexLayout;
	terrain: TerrainView;
	renderer: IgeWebGlRenderer;
	unitLayer: IgeEntity;
	overlayLayer: IgeEntity;
	player: number;
	hooks: WorldViewHooks;
	/** 3D models (when loaded and turned on); primitives otherwise. */
	models?: ModelLibrary;

	units = new Map<number, UnitView>();
	cities = new Map<number, IgeEntity[]>();
	buildings = new Map<number, IgeEntity[]>();
	cargo: CargoView[] = [];
	shots: ShotView[] = [];
	cargoPool: IgeEntity[] = [];
	roads?: IgeEntity;
	deposits?: IgeEntity;
	/** Deposit tiles currently drawn (explored and not built over). */
	shownDeposits = new Set<number>();
	depositsDirty = true;
	borders: (IgeEntity | null)[] = [];
	roadsDirty = true;
	bordersDirty = true;
	time = 0;

	hoverRing: IgeEntity;
	selectRing: IgeEntity;
	markers: IgeEntity[] = [];
	targets: IgeEntity[] = [];
	/** Dots along a multi-turn route (go-to orders and their preview). */
	routeDots: IgeEntity[] = [];
	/** Rings on the best city sites near a selected settler. */
	siteRings: IgeEntity[] = [];
	protected _uid = 0;

	constructor (sim: Sim, layout: HexLayout, terrain: TerrainView, renderer: IgeWebGlRenderer, unitLayer: IgeEntity, overlayLayer: IgeEntity, player: number, hooks: WorldViewHooks = {}) {
		this.sim = sim;
		this.layout = layout;
		this.terrain = terrain;
		this.renderer = renderer;
		this.unitLayer = unitLayer;
		this.overlayLayer = overlayLayer;
		this.player = player;
		this.hooks = hooks;
		const R = layout.size;
		this.hoverRing = this.overlay(createHexRing("hexRealms_hoverRing", R * 0.95, R * 0.89), { r: 1, g: 1, b: 1 }, 0.55);
		this.selectRing = this.overlay(createHexRing("hexRealms_selectRing", R * 0.96, R * 0.86), { r: 1, g: 0.82, b: 0.3 }, 0.9);
	}

	get surface () {
		return this.terrain.surface;
	}

	protected uid (prefix: string): string {
		return `${prefix}_${++this._uid}`;
	}

	protected overlay (geometry: IgeGeometryData3d, c: Rgb, glow: number): IgeEntity {
		const e = new IgeEntity();
		e.id(this.uid("overlay"));
		e._geometryData = geometry;
		e._materialData = material(c, c, glow);
		e._noShadowCast = true;
		e.mount(this.overlayLayer).hide();
		return e;
	}

	// ------------------------------------------------------------------
	// Raider camps
	// ------------------------------------------------------------------

	/** Camp views by camp id; rebuilt when camps come and go or the fog lifts. */
	camps = new Map<number, IgeEntity>();
	campsDirty = true;

	/** Show the camps this player has explored (and drop the scattered ones). */
	rebuildCamps (): void {
		this.campsDirty = false;
		const live = new Map(this.sim.state.camps.map((c) => [c.id, c]));
		for (const [id, e] of this.camps) {
			const camp = live.get(id);
			if (!camp || this.terrain.fogView[camp.tile] === UNEXPLORED) {
				e.destroy();
				this.camps.delete(id);
			}
		}
		for (const camp of live.values()) {
			if (this.camps.has(camp.id) || this.terrain.fogView[camp.tile] === UNEXPLORED) continue;
			this.camps.set(camp.id, this.buildCamp(camp.tile, camp.id));
		}
		this.hooks.invalidate?.();
	}

	/** Hide tents round a fire, a ring of sharpened stakes and a ragged banner. */
	protected buildCamp (tile: number, id: number): IgeEntity {
		const R = this.layout.size;
		const x = this.tileX(tile), z = this.tileZ(tile);
		const root = new IgeEntity();
		root.id(this.uid("camp"));
		root.translateTo(x, this.groundAt(x, z), z).mount(this.unitLayer);
		const rand = mulberry32(id * 31 + 7);
		const piece = (g: IgeGeometryData3d, c: Rgb, sx: number, sy: number, sz: number, px: number, py: number, pz: number, glow = 0) => {
			const e = new IgeEntity();
			e.id(this.uid("campPart"));
			e._geometryData = g;
			e._materialData = material(c, c, glow);
			e.scaleTo(sx, sy, sz).translateTo(px, py, pz).mount(root);
			return e;
		};
		const hide: Rgb[] = [{ r: 0.42, g: 0.3, b: 0.22 }, { r: 0.36, g: 0.27, b: 0.2 }, { r: 0.5, g: 0.38, b: 0.27 }];
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2 + rand() * 0.5;
			const tent = piece(PYRAMID, hide[i], R * 0.36, R * 0.34, R * 0.36, Math.cos(a) * R * 0.3, R * 0.17, Math.sin(a) * R * 0.3);
			tent.rotateTo(0, a + Math.PI / 4, 0);
		}
		// The fire: logs and a glowing heart
		piece(CUBE, { r: 0.3, g: 0.2, b: 0.12 }, R * 0.2, R * 0.04, R * 0.05, 0, R * 0.02, 0).rotateTo(0, 0.6, 0);
		piece(CUBE, { r: 0.3, g: 0.2, b: 0.12 }, R * 0.2, R * 0.04, R * 0.05, 0, R * 0.02, 0).rotateTo(0, -0.6, 0);
		piece(ORB, { r: 1, g: 0.5, b: 0.15 }, R * 0.1, R * 0.12, R * 0.1, 0, R * 0.07, 0, 1.6);
		// Stakes round the edge, leaning out
		for (let i = 0; i < 11; i++) {
			const a = (i / 11) * Math.PI * 2 + rand() * 0.2;
			const stake = piece(CUBE, { r: 0.46, g: 0.33, b: 0.2 }, R * 0.04, R * 0.22, R * 0.04, Math.cos(a) * R * 0.6, R * 0.09, Math.sin(a) * R * 0.6);
			stake.rotateTo(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
		}
		// A pole with a dark red banner
		piece(CUBE, { r: 0.3, g: 0.22, b: 0.15 }, R * 0.035, R * 0.7, R * 0.035, -R * 0.1, R * 0.35, R * 0.02);
		piece(CUBE, { r: 0.55, g: 0.1, b: 0.08 }, R * 0.22, R * 0.14, R * 0.015, R * 0.02, R * 0.6, R * 0.02);
		return root;
	}

	/** Create views for everything already in the game. */
	build (): void {
		for (const u of this.sim.state.units) this.addUnit(u);
		for (const c of this.sim.state.cities) this.buildCity(c);
		for (const b of this.sim.state.buildings) this.buildBuilding(b);
		this.campsDirty = true;
		this.roadsDirty = true;
		this.bordersDirty = true;
		this.depositsDirty = true;
	}

	/** Everything stands on the active terrain surface: re-place it all (style switch). */
	reseatAll (): void {
		for (const e of this.camps.values()) e.destroy();
		this.camps.clear();
		this.campsDirty = true;
		for (const v of this.units.values()) this.placeUnit(v);
		for (const c of this.sim.state.cities) this.buildCity(c);
		for (const b of this.sim.state.buildings) this.buildBuilding(b);
		this.roadsDirty = true;
		this.bordersDirty = true;
		this.shownDeposits.clear();
		this.depositsDirty = true;
	}

	// ------------------------------------------------------------------
	// Positions
	// ------------------------------------------------------------------

	tileX (tile: number): number {
		return this.layout.centerX(this.sim.map.col(tile), this.sim.map.row(tile));
	}

	tileZ (tile: number): number {
		return this.layout.centerZ(this.sim.map.row(tile));
	}

	/** Where a unit stands on a tile: the centre, or the front of a city tile. */
	anchor (tile: number): { x: number; z: number } {
		const inCity = this.sim.cityAt[tile] >= 0;
		return { x: this.tileX(tile), z: this.tileZ(tile) + (inCity ? this.layout.size * 0.62 : 0) };
	}

	groundAt (x: number, z: number): number {
		return this.surface.heightAt(x, z);
	}

	// ------------------------------------------------------------------
	// Units
	// ------------------------------------------------------------------

	tintColor (owner: number, tint: Part["tint"]): Rgb {
		if (tint === "wood") return WOOD;
		const c = owner >= 0 ? hexToRgb(this.sim.player(owner).color) : NEUTRAL;
		if (tint === "dark") return { r: c.r * 0.55, g: c.g * 0.55, b: c.b * 0.55 };
		if (tint === "light") return { r: 0.5 + c.r * 0.5, g: 0.5 + c.g * 0.5, b: 0.5 + c.b * 0.5 };
		return c;
	}

	addUnit (unit: UnitState, pop = false): void {
		if (this.units.has(unit.id)) return;
		const root = new IgeEntity();
		root.id(this.uid(`unit_${unit.id}`));
		root.mount(this.unitLayer);
		// A 3D model when one is loaded (characters stand in their idle pose), primitives otherwise;
		// whose it is shows in its base and its badge (the HUD), not in the model
		const model = this.models?.create(modelOf(unit.type, this.models), { ...UNIT_MODEL_FIT[unit.type], animation: "idle", speed: 0 }) ?? null;
		let body: IgeEntity | undefined;
		let base: IgeEntity | undefined;
		let baseFill: IgeEntity | undefined;
		if (model) {
			body = new IgeEntity();
			body.id(this.uid("body"));
			body.mount(root);
			model.mount(body);
			base = this.part(root, UNIT_BASE, unit.owner);
			baseFill = this.part(root, UNIT_BASE_FILL, unit.owner);
			// Ground markers: casting shadows, they darkened (and dithered) the ground under the unit
			base._noShadowCast = true;
			baseFill._noShadowCast = true;
		}
		const parts = model ? [] : UNIT_PARTS[unit.type].map((part) => this.part(root, part, unit.owner));
		const boatModel = this.models?.create("boat", BOAT_FIT) ?? null;
		if (boatModel) boatModel.mount(root);
		const boat = boatModel ?? this.part(root, BOAT, unit.owner);
		const view: UnitView = {
			id: unit.id, type: unit.type, owner: unit.owner, root, parts, boat,
			tile: unit.tile, queue: [], stepT: 0, lunge: null, flash: 0,
			pop: pop ? 0 : 1, removeAt: -1, phase: (unit.id * 1.7) % (Math.PI * 2), selected: false, shown: true,
			model, base, baseFill, body, clip: model ? "idle" : undefined
		};
		this.units.set(unit.id, view);
		this.placeUnit(view);
		this.refreshUnit(view);
	}

	/** Play a character clip (looping, or once for attack, hit and death). */
	protected playClip (v: UnitView, clip: string, speed = 1, once = false): void {
		const models = this.models;
		if (!v.model || !models || !models.hasClip(modelOf(v.type, this.models), clip)) return;
		if (!once && v.clip === clip && v.clipSpeed === speed) return;
		const anim = v.model.components.skeletalAnimation as unknown as { play: (id: string, o: object) => void } | undefined;
		if (!anim) return;
		anim.play(clip, { crossFadeDuration: 0.12, speed, loop: !once });
		v.clip = clip;
		v.clipSpeed = speed;
		v.clipUntil = once ? this.time + models.clipDuration(modelOf(v.type, this.models), clip) / Math.max(0.01, speed) : undefined;
	}

	/** The clip a character should be playing now: dying, a one-shot, walking, or idle (only the selected unit breathes). */
	protected settleClip (v: UnitView, time: number): void {
		if (!v.model) return;
		if (v.dying !== undefined) {
			if (time >= v.dying && v.clip !== "death") this.playClip(v, "death", DEATH_SPEED, true);
			return;
		}
		if (v.clipUntil !== undefined && time < v.clipUntil) return;
		if (v.queue.length) this.playClip(v, "walk", WALK_SPEED);
		else this.playClip(v, "idle", v.selected ? 1 : 0);
	}

	/** Is a selected character breathing (worth drawing a few frames a second)? */
	get idleAnimating (): boolean {
		for (const v of this.units.values()) if (v.selected && v.model && v.shown && this.models?.hasClip(modelOf(v.type, this.models), "idle")) return true;
		return false;
	}

	/** A model finished loading: swap it in where it's used. */
	modelLoaded (id: string): void {
		const sim = this.sim;
		for (const v of [...this.units.values()]) {
			if ((modelOf(v.type, this.models) === id || id === "boat") && !v.queue.length && !v.lunge && v.removeAt < 0) this.rebuildUnit(v);
		}
		if (id === "village" || id === "town" || id === "city") for (const c of sim.state.cities) this.buildCity(c);
		for (const b of sim.state.buildings) {
			if (buildingModelOf(b.type, this.models) === id || (id === "construction" && !b.built) || (b.type === "mill" && (id === WINDMILL.body || id === WINDMILL.sails))) this.buildBuilding(b);
		}
		this.hooks.invalidate?.();
	}

	/** Models were turned on or off: rebuild everything that can use one. */
	rebuildModels (): void {
		// Deposits are drawn differently in the blocky pack
		this.shownDeposits.clear();
		this.depositsDirty = true;
		for (const v of [...this.units.values()]) if (v.removeAt < 0) this.rebuildUnit(v);
		for (const c of this.sim.state.cities) this.buildCity(c);
		for (const b of this.sim.state.buildings) this.buildBuilding(b);
		this.hooks.invalidate?.();
	}

	protected rebuildUnit (v: UnitView): void {
		const unit = this.sim.unit(v.id);
		if (!unit) return;
		const selected = v.selected;
		v.root.destroy();
		this.units.delete(v.id);
		this.addUnit(unit);
		const fresh = this.units.get(v.id);
		if (fresh && selected) {
			fresh.selected = true;
			this.refreshUnit(fresh);
		}
	}

	protected part (root: IgeEntity, part: Part, owner: number): IgeEntity {
		const e = new IgeEntity();
		e.id(this.uid("part"));
		e._geometryData = part.geometry;
		e._materialData = material(this.tintColor(owner, part.tint));
		e.scaleTo(part.size[0], part.size[1], part.size[2]);
		e.translateTo(0, part.y, 0);
		(e as unknown as { _partTint: Part["tint"] })._partTint = part.tint;
		e.mount(root);
		return e;
	}

	/** Recolour a unit: owner colour, selection glow, hit flash. */
	refreshUnit (view: UnitView): void {
		const flash = view.flash > 0;
		for (const e of [...view.parts, view.boat, ...(view.base ? [view.base] : []), ...(view.baseFill ? [view.baseFill] : [])]) {
			const tint = (e as unknown as { _partTint?: Part["tint"] })._partTint;
			if (tint === undefined) continue; // a model keeps its own materials
			const c = this.tintColor(view.owner, tint);
			e._materialData = flash
				? material(c, { r: 1, g: 0.15, b: 0.1 }, 1.1)
				: view.selected ? material(c, { r: 1, g: 0.95, b: 0.6 }, 0.35) : material(c);
		}
		if (view.model) {
			view.model.material(flash
				? { color: WHITE, emissiveColor: { r: 1, g: 0.15, b: 0.1 }, emissiveIntensity: 0.9 }
				: view.selected ? { color: WHITE, emissiveColor: { r: 1, g: 0.95, b: 0.6 }, emissiveIntensity: 0.18 } : null);
		}
		const water = this.sim.map.isWater(view.tile);
		if (water) view.boat.show();
		else view.boat.hide();
		// Afloat, a character stands on its boat's deck
		// (in the bow, ahead of the mast and sail, when the boat is a model)
		const modelBoat = !!this.models?.has("boat");
		if (view.body) view.body.translateTo(0, water ? (modelBoat ? BOAT_DECK : 10) : 0, water && modelBoat ? BOAT_BOW : 0);
		for (const e of [view.base, view.baseFill]) {
			if (!e) continue;
			if (water) e.hide();
			else e.show();
		}
	}

	placeUnit (view: UnitView, time = this.time): void {
		const a = this.anchor(view.tile);
		const water = this.sim.map.isWater(view.tile);
		const bob = view.type === "settler" && !view.model ? Math.sin(time * 2.4 + view.phase) * 2.5 : 0;
		view.root.translateTo(a.x, this.groundAt(a.x, a.z) + bob + (water ? 6 : 0), a.z);
		const s = view.pop < 1 ? 0.3 + view.pop * 0.7 : 1;
		view.root.scaleTo(s, s, s);
	}

	setSelected (unitId: number | null): void {
		for (const v of this.units.values()) {
			const sel = v.id === unitId;
			if (v.selected !== sel) {
				v.selected = sel;
				this.refreshUnit(v);
			}
		}
	}

	/** Units are shown when they are ours or on a tile we can see now. */
	updateVisibility (): void {
		for (const v of this.units.values()) {
			const show = v.owner === this.player || this.terrain.fogView[v.tile] === VISIBLE;
			if (show !== v.shown) {
				v.shown = show;
				if (show) v.root.show();
				else v.root.hide();
				this.hooks.invalidate?.();
			}
		}
	}

	// ------------------------------------------------------------------
	// Cities
	// ------------------------------------------------------------------

	/**
	 * As a city grows it spreads over the land around it (for show only):
	 * from level 3, a hamlet on a free neighbouring tile for each level, up
	 * to six; smaller copies of the village or town model, turned at random.
	 * Free means explored land with no city, building, mountain or water;
	 * the city's own territory first.
	 */
	protected buildSprawl (city: CityState, entities: IgeEntity[], rand: () => number): void {
		const count = Math.min(6, Math.max(0, city.level - 2));
		if (!count || !this.models) return;
		const R = this.layout.size;
		const sim = this.sim;
		const free = sim.neighbors(city.tile).filter((t) => !sim.map.isWater(t) && sim.map.relief[t] !== 3 && sim.cityAt[t] < 0 && sim.buildingAt[t] < 0 && this.terrain.fogView[t] !== UNEXPLORED);
		free.sort((a, b) => (sim.map.owner[b] === city.owner ? 1 : 0) - (sim.map.owner[a] === city.owner ? 1 : 0) || ((a * 2654435761) >>> 0) % 97 - ((b * 2654435761) >>> 0) % 97);
		const size = city.level >= 6 ? "town" : "village";
		for (const t of free.slice(0, count)) {
			const hamlet = this.models.create(size, { footprint: R * 0.78, height: R * 0.62, lod: PROP_LOD });
			if (!hamlet) return;
			// Off-centre toward the city, so roads through the tile stay clear
			const tx = this.tileX(t), tz = this.tileZ(t);
			const x = tx + (this.tileX(city.tile) - tx) * 0.2, z = tz + (this.tileZ(city.tile) - tz) * 0.2;
			const holder = new IgeEntity();
			holder.id(this.uid(`city_${city.id}_sprawl`));
			holder.translateTo(x, this.groundAt(x, z), z).rotateTo(0, Math.floor(rand() * 6) * (Math.PI / 3), 0).mount(this.unitLayer);
			hamlet.mount(holder);
			entities.push(holder);
		}
	}

	/** A building came or went beside a city: redraw that city's hamlets around it. */
	protected resprawl (tile: number): void {
		for (const n of this.sim.neighbors(tile)) {
			const c = this.sim.cityOn(n);
			if (c && c.level > 2) this.buildCity(c);
		}
	}

	buildCity (city: CityState): void {
		for (const e of this.cities.get(city.id) ?? []) e.destroy();
		const entities: IgeEntity[] = [];
		this.cities.set(city.id, entities);
		const R = this.layout.size;
		const x = this.tileX(city.tile), z = this.tileZ(city.tile);
		const y = this.surface.tileHeight(city.tile);
		const neutral = city.owner < 0;
		const color = neutral ? NEUTRAL : hexToRgb(this.sim.player(city.owner).color);
		let seed = city.id * 7919;
		const rand = () => {
			seed = (seed * 16807) % 2147483647;
			return seed / 2147483647;
		};
		const block = (g: IgeGeometryData3d, w: number, h: number, d: number, px: number, py: number, pz: number, c: Rgb, rot = 0) => {
			const e = new IgeEntity();
			e.id(this.uid(`city_${city.id}`));
			e._geometryData = g;
			e._materialData = material(c);
			e.scaleTo(w, h, d).translateTo(px, py, pz).rotateTo(0, rot, 0).mount(this.unitLayer);
			entities.push(e);
		};

		// A model by size with the owner's banner, when loaded: a village (neutral, or levels 1-2), a town (3-4), a city (5+)
		const size = neutral || city.level <= 2 ? "village" : city.level <= 4 ? "town" : "city";
		const cityModel = this.models?.create(size, {
			footprint: R * (size === "village" ? 1.1 : size === "town" ? 1.35 : 1.55),
			height: R * (size === "village" ? 0.9 : size === "town" ? 1.2 : 1.5),
			lod: PROP_LOD
		});
		if (cityModel) {
			const holder = new IgeEntity();
			holder.id(this.uid(`city_${city.id}`));
			holder.translateTo(x, y, z).rotateTo(0, Math.floor(rand() * 6) * (Math.PI / 3), 0).mount(this.unitLayer);
			cityModel.mount(holder);
			entities.push(holder);
			if (!neutral) this.buildSprawl(city, entities, rand);
			if (!neutral) {
				const poleH = R * (city.capital ? 1.05 : 0.8);
				const px = x + R * 0.5, pz = z + R * 0.12;
				const py = this.groundAt(px, pz);
				block(CUBE, R * 0.035, poleH, R * 0.035, px, py + poleH / 2, pz, WOOD);
				block(CUBE, R * 0.26, R * 0.15, R * 0.02, px + R * 0.13, py + poleH - R * 0.09, pz, color);
				if (city.capital) block(ORB, R * 0.08, R * 0.08, R * 0.08, px, py + poleH + R * 0.03, pz, { r: 1, g: 0.82, b: 0.25 });
			}
		}
		if (!neutral && !cityModel) {
			const towerH = R * (city.capital ? 0.95 : 0.6 + Math.min(city.level, 6) * 0.05);
			block(CUBE, R * 0.24, towerH, R * 0.24, x, y + towerH / 2, z, color);
			block(PYRAMID, R * 0.32, R * 0.28, R * 0.32, x, y + towerH, z, { r: color.r * 0.75, g: color.g * 0.75, b: color.b * 0.75 });
		}
		const houses = cityModel ? 0 : neutral ? 3 : Math.min(9, 3 + city.level);
		const start = rand() * Math.PI * 2;
		for (let k = 0; k < houses; k++) {
			const a = start + (k / houses) * Math.PI * 2;
			const dist = R * (neutral ? 0.25 : 0.4 + rand() * 0.08 + (k >= 6 ? 0.1 : 0));
			const w = R * (0.15 + rand() * 0.06);
			const h = R * (0.13 + rand() * 0.1);
			const hx = x + Math.cos(a) * dist, hz = z + Math.sin(a) * dist;
			const hy = this.groundAt(hx, hz) - 2;
			block(CUBE, w, h + 2, w, hx, hy + (h + 2) / 2, hz, neutral ? NEUTRAL : STONE, a);
			block(PYRAMID, w * 1.25, h * 0.7, w * 1.25, hx, hy + h + 2, hz, neutral ? WOOD : ROOF, a);
		}
		if (city.walls) {
			for (let i = 0; i < 6; i++) {
				const j = (i + 1) % 6;
				const mx = (CORNER_X[i] + CORNER_X[j]) / 2, mz = (CORNER_Z[i] + CORNER_Z[j]) / 2;
				const wx = x + mx * R * 0.78, wz = z + mz * R * 0.78;
				block(CUBE, R * 0.5, R * 0.16, R * 0.06, wx, this.groundAt(wx, wz) + R * 0.08, wz, STONE, -Math.atan2(mz, mx) + Math.PI / 2);
			}
		}
		this.updateCityVisibility(city);
	}

	updateCityVisibility (city: CityState): void {
		const show = this.terrain.fogView[city.tile] !== UNEXPLORED;
		for (const e of this.cities.get(city.id) ?? []) {
			if (show) e.show();
			else e.hide();
		}
	}

	// ------------------------------------------------------------------
	// Buildings
	// ------------------------------------------------------------------

	buildBuilding (b: BuildingState): void {
		this.removeBuildingView(b.id);
		const entities: IgeEntity[] = [];
		this.buildings.set(b.id, entities);
		const R = this.layout.size;
		const x = this.tileX(b.tile), z = this.tileZ(b.tile);
		const y = this.groundAt(x, z);
		const owner = hexToRgb(this.sim.player(b.owner).color);
		const info = BUILDINGS[b.type];
		const good = (Object.keys(info.outputs)[0] as Good | undefined) ?? (b.type === "mine" ? "ore" : undefined);
		const body = good ? hexToRgb(GOOD_INFO[good].color) : STONE;
		const block = (g: IgeGeometryData3d, w: number, h: number, d: number, px: number, py: number, pz: number, c: Rgb, rot = 0) => {
			const e = new IgeEntity();
			e.id(this.uid(`building_${b.id}`));
			e._geometryData = g;
			e._materialData = material(c);
			e.scaleTo(w, h, d).translateTo(px, py, pz);
			if (rot) e.rotateTo(0, rot, 0);
			e.mount(this.unitLayer);
			entities.push(e);
		};

		if (b.type === "walls") {
			this.removeBuildingView(b.id);
			return; // drawn by the city once finished
		}

		// A windmill with turning sails, once its two parts are in
		if (b.type === "mill" && b.built && this.buildWindmill(b, entities, x, y, z, owner)) return;
		// A model when one is loaded: the building, wonder or monument, or a construction site
		const kind = info.wonder;
		const grow = b.built ? MODEL_GROW[b.type] ?? 1 : 1;
		const prop = this.models?.create(b.built ? buildingModelOf(b.type, this.models) : "construction", {
			footprint: R * grow * (kind === "world" ? 1.25 : kind === "monument" ? 0.85 : 0.95),
			height: R * grow * (kind === "world" ? 1.7 : kind === "monument" ? 1.15 : 1),
			lod: PROP_LOD
		});
		if (prop) {
			// The owner's colour as a disc around its foot
			block(ORB, R * 0.82, R * 0.04, R * 0.82, x, y + R * 0.01, z, owner);
			entities[entities.length - 1]._noShadowCast = true; // a ground marker, not a caster
			const holder = new IgeEntity();
			holder.id(this.uid(`building_${b.id}`));
			// Ports and fisheries face the water (a port out on the water faces away from the shore);
			// other buildings turn by tile so rows don't look stamped
			const water = this.sim.neighbors(b.tile).find((n) => this.sim.map.isWater(n));
			const land = this.sim.neighbors(b.tile).filter((n) => !this.sim.map.isWater(n));
			let yaw = ((b.tile * 7) % 6) * (Math.PI / 3);
			if (b.type === "port" && this.sim.map.isWater(b.tile) && land.length) {
				const lx = land.reduce((n, t) => n + this.tileX(t), 0) / land.length, lz = land.reduce((n, t) => n + this.tileZ(t), 0) / land.length;
				yaw = Math.atan2(x - lx, z - lz);
			} else if ((b.type === "port" || b.type === "fishery") && water !== undefined) {
				yaw = Math.atan2(this.tileX(water) - x, this.tileZ(water) - z);
			}
			holder.translateTo(x, y, z).rotateTo(0, yaw, 0).mount(this.unitLayer);
			prop.mount(holder);
			entities.push(holder);
			this.updateBuildingVisibility(b);
			return;
		}
		// Platform
		block(CUBE, R * 0.62, R * 0.06, R * 0.62, x, y + R * 0.03, z, { r: 0.6, g: 0.57, b: 0.52 });

		if (!b.built) {
			// Construction site: posts and a half-built frame
			for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
				block(CUBE, R * 0.05, R * 0.4, R * 0.05, x + ox * R * 0.22, y + R * 0.2, z + oz * R * 0.22, WOOD);
			}
			block(CUBE, R * 0.44, R * 0.05, R * 0.44, x, y + R * 0.38, z, WOOD);
		} else if (info.wonder && b.type !== "grandExchange") {
			wonderModel(b.type, owner, (g, w, h, d, px, py, pz, c, rot) => block(g, R * w, R * h, R * d, x + R * px, y + R * 0.06 + R * py, z + R * pz, c, rot));
		} else if (b.type === "grandExchange") {
			for (let k = 0; k < 4; k++) {
				const s = R * (0.62 - k * 0.13);
				block(CUBE, s, R * 0.14, s, x, y + R * (0.13 + k * 0.14), z, { r: 0.95, g: 0.8, b: 0.3 });
			}
			block(PYRAMID, R * 0.2, R * 0.3, R * 0.2, x, y + R * 0.7, z, owner);
		} else if (b.type === "farm") {
			block(CUBE, R * 0.7, R * 0.04, R * 0.5, x, y + R * 0.08, z, { r: 0.85, g: 0.75, b: 0.35 });
			block(CUBE, R * 0.16, R * 0.16, R * 0.16, x + R * 0.25, y + R * 0.16, z - R * 0.2, STONE);
			block(PYRAMID, R * 0.2, R * 0.12, R * 0.2, x + R * 0.25, y + R * 0.24, z - R * 0.2, owner);
		} else if (b.type === "port") {
			// A pier reaching toward the water, a warehouse and a mast
			const water = this.sim.neighbors(b.tile).find((n) => this.sim.map.isWater(n));
			const dx = water !== undefined ? this.tileX(water) - x : R, dz = water !== undefined ? this.tileZ(water) - z : 0;
			const len = Math.hypot(dx, dz) || 1;
			const ux = dx / len, uz = dz / len;
			block(CUBE, R * 0.16, R * 0.04, R * 0.62, x + ux * R * 0.45, y + R * 0.05, z + uz * R * 0.45, WOOD, Math.atan2(ux, uz));
			block(CUBE, R * 0.3, R * 0.22, R * 0.26, x - ux * R * 0.08, y + R * 0.17, z - uz * R * 0.08, STONE);
			block(PYRAMID, R * 0.36, R * 0.14, R * 0.32, x - ux * R * 0.08, y + R * 0.28, z - uz * R * 0.08, owner);
			block(CUBE, R * 0.03, R * 0.5, R * 0.03, x + ux * R * 0.62, y + R * 0.3, z + uz * R * 0.62, WOOD);
		} else if (b.type === "market") {
			for (let k = 0; k < 3; k++) {
				const a = (k / 3) * Math.PI * 2;
				const sx = x + Math.cos(a) * R * 0.17, sz = z + Math.sin(a) * R * 0.17;
				block(CUBE, R * 0.16, R * 0.14, R * 0.16, sx, y + R * 0.13, sz, STONE);
				block(PYRAMID, R * 0.22, R * 0.12, R * 0.22, sx, y + R * 0.2, sz, k === 0 ? owner : { r: 0.9, g: 0.75, b: 0.3 });
			}
		} else {
			const workshop = Object.keys(info.inputs).length > 0;
			const h = R * (workshop ? 0.3 : 0.22);
			const w = R * (b.type === "warehouse" ? 0.5 : workshop ? 0.36 : 0.3);
			block(CUBE, w, h, w, x, y + R * 0.06 + h / 2, z, b.type === "warehouse" ? WOOD : body);
			block(PYRAMID, w * 1.2, R * 0.16, w * 1.2, x, y + R * 0.06 + h, z, owner);
			if (workshop) block(CUBE, R * 0.07, R * 0.22, R * 0.07, x + w * 0.3, y + R * 0.06 + h + R * 0.08, z - w * 0.3, { r: 0.35, g: 0.33, b: 0.32 });
		}
		this.updateBuildingVisibility(b);
	}

	removeBuildingView (id: number): void {
		for (const e of this.buildings.get(id) ?? []) e.destroy();
		this.buildings.delete(id);
		this.spinners.delete(id);
	}

	// ------------------------------------------------------------------
	// Windmills
	// ------------------------------------------------------------------

	/** Turning parts (windmill sails) by building id. */
	spinners = new Map<number, IgeEntity>();

	/** A mill as body and turning sails, once both models have loaded. False to fall back to the one-piece mill. */
	protected buildWindmill (b: BuildingState, entities: IgeEntity[], x: number, y: number, z: number, owner: Rgb): boolean {
		const models = this.models;
		if (!models?.info(WINDMILL.body) || !models.info(WINDMILL.sails)) return false;
		const R = this.layout.size;
		const body = models.create(WINDMILL.body, { height: R * WINDMILL.bodyHeight, footprint: R * 0.95, lod: PROP_LOD });
		// Sized by the blades' height (the axle rod through the hub would set the footprint)
		const sails = models.create(WINDMILL.sails, { height: R * WINDMILL.sailSpan, lod: PROP_LOD });
		if (!body || !sails) {
			body?.destroy();
			sails?.destroy();
			return false;
		}
		const disc = new IgeEntity();
		disc.id(this.uid(`building_${b.id}`));
		disc._geometryData = ORB;
		disc._materialData = material(owner);
		disc._noShadowCast = true;
		disc.scaleTo(R * 0.82, R * 0.04, R * 0.82).translateTo(x, y + R * 0.01, z).mount(this.unitLayer);
		entities.push(disc);
		const holder = new IgeEntity();
		holder.id(this.uid(`building_${b.id}`));
		holder.translateTo(x, y, z).rotateTo(0, ((b.tile * 7) % 6) * (Math.PI / 3), 0).mount(this.unitLayer);
		body.mount(holder);
		const hub = new IgeEntity();
		hub.id(this.uid(`building_${b.id}_hub`));
		hub.translateTo(R * WINDMILL.hub.x, R * WINDMILL.hub.y, R * WINDMILL.hub.z).mount(holder);
		// Flattened front to back: the sail model's axle rod is about as long as the sails are wide
		const spinner = new IgeEntity();
		spinner.id(this.uid(`building_${b.id}_sails`));
		spinner.scaleTo(1, 1, WINDMILL.depth).mount(hub);
		// The sails model stands on y = 0 from create(); lift it so it turns about its middle
		const info = models.info(WINDMILL.sails);
		const lift = info ? (sails._translate.y + ((info.min[1] + info.max[1]) / 2) * sails._scale.y) : 0;
		sails.translateTo(sails._translate.x, sails._translate.y - lift, sails._translate.z);
		sails.mount(spinner);
		entities.push(holder);
		this.spinners.set(b.id, spinner);
		this.updateBuildingVisibility(b);
		return true;
	}

	/** Turn the windmills' sails (when the camera is close enough to see them). True if any turned. */
	spin (time: number, distance: number): boolean {
		if (!this.spinners.size || distance > 2400) return false;
		for (const s of this.spinners.values()) s.rotateTo(0, 0, -time * WINDMILL.turn);
		return true;
	}

	updateBuildingVisibility (b: BuildingState): void {
		const show = this.terrain.fogView[b.tile] !== UNEXPLORED;
		for (const e of this.buildings.get(b.id) ?? []) {
			if (show) e.show();
			else e.hide();
		}
	}

	// ------------------------------------------------------------------
	// Roads and borders
	// ------------------------------------------------------------------

	/**
	 * One mesh for every explored road. A road through a tile is a curve
	 * from one edge to another through the middle (so roads bend smoothly
	 * across tiles); junctions and dead ends meet in a round patch of
	 * packed earth. Each road has worn green-brown verges, a lighter crown
	 * and two wheel ruts (vertex colours), and the odd stone along its edge.
	 */
	rebuildRoads (): void {
		this.roadsDirty = false;
		const sim = this.sim;
		const b = new MeshBuilder();
		const R = this.layout.size;
		const w = R * 0.12;
		const natural = this.terrain.style === "natural";
		const lift = natural ? 1.6 : 0.7;
		const connects = (t: number) => sim.roads[t] >= 0 || sim.cityAt[t] >= 0 || sim.buildingAt[t] >= 0;
		// Across the road: verge, earth, rut, crown, rut, earth, verge
		const across = [-1, -0.62, -0.3, 0, 0.3, 0.62, 1];
		const verge: Rgb = { r: 0.42, g: 0.4, b: 0.23 }, earth: Rgb = { r: 0.66, g: 0.53, b: 0.36 };
		const rut: Rgb = { r: 0.59, g: 0.47, b: 0.32 }, crown: Rgb = { r: 0.72, g: 0.6, b: 0.42 };
		const shades = [verge, earth, rut, crown, rut, earth, verge];

		const ribbon = (pts: { x: number; z: number }[], y: (x: number, z: number) => number): void => {
			let prev: number[] | null = null;
			for (let k = 0; k < pts.length; k++) {
				const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)];
				let tx = c.x - a.x, tz = c.z - a.z;
				const tl = Math.hypot(tx, tz) || 1;
				tx /= tl;
				tz /= tl;
				const p = pts[k];
				const row = across.map((f, i) => {
					const x = p.x - tz * w * f, z = p.z + tx * w * f;
					b.tint(shades[i].r, shades[i].g, shades[i].b);
					return b.vertex(x, y(x, z), z, 0, 1, 0, 0, 0);
				});
				if (prev) for (let i = 0; i < across.length - 1; i++) b.quadFacing(prev[i], row[i], row[i + 1], prev[i + 1], 0, 1, 0);
				prev = row;
			}
			b.tint(1);
		};
		/** Quadratic Bezier through a control point, sampled into points. */
		const curve = (p0: { x: number; z: number }, p1: { x: number; z: number }, p2: { x: number; z: number }, n: number) => {
			const out: { x: number; z: number }[] = [];
			for (let i = 0; i <= n; i++) {
				const t = i / n, u = 1 - t;
				out.push({ x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, z: u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z });
			}
			return out;
		};
		/** A round patch of packed earth (junctions, dead ends), a little above the ribbons. */
		const patch = (x: number, z: number, radius: number, y: number) => {
			const seg = 14;
			b.tint(crown.r * 0.96, crown.g * 0.96, crown.b * 0.96);
			const centre = b.vertex(x, y, z, 0, 1, 0, 0, 0);
			b.tint(earth.r, earth.g, earth.b);
			const ring0 = b.vertexCount;
			for (let i = 0; i < seg; i++) {
				const a = (i / seg) * Math.PI * 2;
				b.vertex(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius, 0, 1, 0, 0, 0);
			}
			b.tint(verge.r, verge.g, verge.b);
			const ring1 = b.vertexCount;
			for (let i = 0; i < seg; i++) {
				const a = (i / seg) * Math.PI * 2;
				b.vertex(x + Math.cos(a) * radius * 1.35, y - 0.02, z + Math.sin(a) * radius * 1.35, 0, 1, 0, 0, 0);
			}
			b.tint(1);
			for (let i = 0; i < seg; i++) {
				const j = (i + 1) % seg;
				b.triFacing(centre, ring0 + i, ring0 + j, 0, 1, 0);
				b.quadFacing(ring0 + i, ring1 + i, ring1 + j, ring0 + j, 0, 1, 0);
			}
		};

		for (let t = 0; t < sim.map.count; t++) {
			if (this.terrain.fogView[t] === UNEXPLORED) continue;
			const road = sim.roads[t] >= 0;
			// Cities and buildings get the ends of the roads that reach them, drawn under their models
			const site = !road && (sim.cityAt[t] >= 0 || sim.buildingAt[t] >= 0);
			if (!road && !site) continue;
			if (site && !sim.neighbors(t).some((n) => sim.roads[n] >= 0)) continue;
			const cx = this.tileX(t), cz = this.tileZ(t);
			// Roads follow the ground (over hills, and the natural style's slopes)
			const y = (x: number, z: number) => this.groundAt(x, z) + lift;
			const rand = mulberry32(Math.imul(t + 5, 2654435761) ^ 0x2f6b);
			// Where the road leaves this tile: the middle of each edge it crosses
			const exits: { x: number; z: number }[] = [];
			for (const n of sim.neighbors(t)) {
				if (site ? sim.roads[n] < 0 : !connects(n)) continue;
				exits.push({ x: (cx + this.tileX(n)) / 2, z: (cz + this.tileZ(n)) / 2 });
			}
			const centre = site ? { x: cx, z: cz } : { x: cx + (rand() - 0.5) * R * 0.12, z: cz + (rand() - 0.5) * R * 0.12 };
			if (exits.length === 2 && !site) {
				// One smooth bend through the tile
				ribbon(curve(exits[0], centre, exits[1], 10), y);
			} else {
				for (const e of exits) {
					const mid = { x: (e.x + centre.x) / 2 + (rand() - 0.5) * R * 0.1, z: (e.z + centre.z) / 2 + (rand() - 0.5) * R * 0.1 };
					ribbon(curve(e, mid, centre, 6), y);
				}
				patch(centre.x, centre.z, w * (exits.length > 2 ? 1.25 : 0.95), y(centre.x, centre.z) + 0.06);
			}
			// The odd stone along the verge
			const stones = Math.floor(rand() * 3);
			for (let k = 0; k < stones && exits.length; k++) {
				const e = exits[Math.floor(rand() * exits.length)];
				const f = 0.25 + rand() * 0.5;
				const sx = centre.x + (e.x - centre.x) * f, sz = centre.z + (e.z - centre.z) * f;
				const dx = e.x - centre.x, dz = e.z - centre.z, dl = Math.hypot(dx, dz) || 1;
				const side = rand() < 0.5 ? -1 : 1;
				const px = sx - (dz / dl) * w * 1.25 * side, pz = sz + (dx / dl) * w * 1.25 * side;
				const r = R * (0.025 + rand() * 0.02);
				b.tint(0.62, 0.6, 0.56);
				b.flatTri(px - r, y(px, pz), pz - r * 0.5, px + r, y(px, pz), pz - r * 0.3, px, y(px, pz) + r * 1.1, pz + r * 0.2, px, y(px, pz) - 1, pz, 0, 0);
				b.flatTri(px + r, y(px, pz), pz - r * 0.3, px + r * 0.2, y(px, pz), pz + r, px, y(px, pz) + r * 1.1, pz + r * 0.2, px, y(px, pz) - 1, pz, 0, 0);
				b.flatTri(px + r * 0.2, y(px, pz), pz + r, px - r, y(px, pz), pz - r * 0.5, px, y(px, pz) + r * 1.1, pz + r * 0.2, px, y(px, pz) - 1, pz, 0, 0);
				b.tint(1);
			}
		}

		const oldId = this.roads?._geometryData?.id;
		if (!b.vertexCount) {
			this.roads?.hide();
		} else {
			if (!this.roads) {
				this.roads = new IgeEntity();
				this.roads.id(this.uid("roads"));
				// Colours come from the vertices (verges, earth, ruts, crown)
				this.roads._materialData = material({ r: 1, g: 1, b: 1 });
				this.roads._noShadowCast = true;
				this.roads.mount(this.overlayLayer);
			}
			this.roads._geometryData = b.toGeometry(this.uid("roadsGeo"));
			this.roads.show();
		}
		if (oldId) this.renderer.releaseGeometry(oldId);
		this.hooks.invalidate?.();
	}

	/** Should a deposit marker show on this tile? (Explored, and no building working it.) */
	protected depositShown (t: number): boolean {
		return this.sim.map.deposit[t] !== Deposit.None && this.terrain.fogView[t] !== UNEXPLORED && this.sim.buildingAt[t] < 0 && this.sim.cityAt[t] < 0;
	}

	/**
	 * One merged, vertex-coloured mesh of every visible deposit. Explored land
	 * only grows, so this rebuilds only when the set of shown deposits changes.
	 */
	rebuildDeposits (): void {
		this.depositsDirty = false;
		const sim = this.sim;
		const tiles: number[] = [];
		let changed = false;
		for (let t = 0; t < sim.map.count; t++) {
			if (!this.depositShown(t)) continue;
			tiles.push(t);
			if (!this.shownDeposits.has(t)) changed = true;
		}
		if (!changed && tiles.length === this.shownDeposits.size) return;
		this.shownDeposits = new Set(tiles);

		const b = new MeshBuilder();
		const colors: number[] = [];
		const R = this.layout.size;
		const natural = this.terrain.style === "natural";
		const paint = (from: number, c: Rgb) => {
			for (let v = from; v < b.vertexCount; v++) colors.push(c.r, c.g, c.b, 1);
		};
		const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, c: Rgb) => {
			const from = b.vertexCount;
			const cos = Math.cos(yaw), sin = Math.sin(yaw);
			const p = (dx: number, dy: number, dz: number): [number, number, number] => [x + dx * cos + dz * sin, y + dy, z - dx * sin + dz * cos];
			const hx = sx / 2, hz = sz / 2;
			const c8 = [p(-hx, 0, -hz), p(hx, 0, -hz), p(hx, 0, hz), p(-hx, 0, hz), p(-hx, sy, -hz), p(hx, sy, -hz), p(hx, sy, hz), p(-hx, sy, hz)];
			const faces = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
			const ix = x, iy = y + sy / 2, iz = z;
			for (const [a, bb, cc, d] of faces) {
				b.flatTri(...c8[a], ...c8[bb], ...c8[cc], ix, iy, iz, 0, 0);
				b.flatTri(...c8[a], ...c8[cc], ...c8[d], ix, iy, iz, 0, 0);
			}
			paint(from, c);
		};
		const cone = (x: number, y: number, z: number, r: number, h: number, c: Rgb) => {
			const from = b.vertexCount;
			for (let i = 0; i < 4; i++) {
				const a0 = (i / 4) * Math.PI * 2, a1 = ((i + 1) / 4) * Math.PI * 2;
				b.flatTri(x + Math.cos(a0) * r, y, z + Math.sin(a0) * r, x + Math.cos(a1) * r, y, z + Math.sin(a1) * r, x, y + h, z, x, y + h / 3, z, 0, 0);
			}
			paint(from, c);
		};

		const blocky = this.models?.pack === "blocky";
		// A blocky scene, its boxes nudged apart where faces would flicker
		const scene = (look: DepositLook, x: number, y: number, z: number, s: number) => {
			const vox = depositVox(look);
			const corners = separatedBoxes(vox.boxes);
			vox.boxes.forEach((bx, i) => {
				const [lo, hi] = corners[i];
				const c = { r: ((bx.c >> 16) & 255) / 255, g: ((bx.c >> 8) & 255) / 255, b: (bx.c & 255) / 255 };
				box(x + ((lo[0] + hi[0]) / 2) * s, y + lo[1] * s, z + ((lo[2] + hi[2]) / 2) * s, (hi[0] - lo[0]) * s, (hi[1] - lo[1]) * s, (hi[2] - lo[2]) * s, 0, c);
			});
		};

		for (const t of tiles) {
			const deposit = sim.map.deposit[t] as Exclude<Deposit, Deposit.None>;
			const look = DEPOSIT_LOOK[deposit];
			if (!look) continue;
			// Off to one side of the tile so units and buildings stay clear
			const x = this.tileX(t) + R * 0.38, z = this.tileZ(t) - R * 0.3;
			const ground = natural ? Math.max(this.groundAt(x, z), this.surface.tileHeight(t)) : this.surface.tileHeight(t);
			const y = ground + (natural ? 0.5 : 0);
			if (blocky) {
				scene(DEPOSIT_VOX[deposit], x, y, z, 1.75);
				continue;
			}
			const c = look.color;
			const dark = { r: c.r * 0.7, g: c.g * 0.7, b: c.b * 0.7 };
			switch (look.shape) {
				case "rocks":
					box(x - 4, y, z + 2, 7, 6, 7, 0.4, c);
					box(x + 4, y, z + 3, 6, 4, 6, 1.1, dark);
					box(x, y, z - 4, 5, 5, 5, 0.2, c);
					break;
				case "fish":
					box(x - 4, y + 0.6, z, 9, 2, 3.5, 0.5, c);
					box(x + 5, y + 0.6, z + 4, 8, 2, 3, -0.4, c);
					break;
				case "game":
					cone(x - 4, y, z, 4, 10, c);
					cone(x + 4, y, z + 3, 3.5, 8, dark);
					break;
				case "horses":
					box(x - 4, y + 3, z, 10, 4, 4, 0.3, c);
					box(x + 5, y + 3, z + 4, 9, 4, 4, -0.5, dark);
					box(x - 4, y, z, 6, 3, 2.5, 0.3, dark);
					box(x + 5, y, z + 4, 5, 3, 2.5, -0.5, c);
					break;
			}
		}

		const oldId = this.deposits?._geometryData?.id;
		if (!b.vertexCount) {
			this.deposits?.hide();
		} else {
			if (!this.deposits) {
				this.deposits = new IgeEntity();
				this.deposits.id(this.uid("deposits"));
				this.deposits._materialData = material({ r: 1, g: 1, b: 1 });
				this.deposits._noShadowCast = true;
				this.deposits.mount(this.overlayLayer);
			}
			const geometry = b.toGeometry(this.uid("depositsGeo"));
			geometry.colors = new Float32Array(colors);
			this.deposits._geometryData = geometry;
			this.deposits.show();
		}
		if (oldId) this.renderer.releaseGeometry(oldId);
		this.hooks.invalidate?.();
	}

	rebuildBorders (): void {
		this.bordersDirty = false;
		const sim = this.sim;
		const owned: number[][] = sim.state.players.map(() => []);
		for (let t = 0; t < sim.map.count; t++) {
			const o = sim.map.owner[t];
			if (o >= 0) owned[o].push(t);
		}
		for (const p of sim.state.players) {
			const id = this.uid(`border_${p.index}`);
			const geometry = p.alive ? buildBorderGeometry(sim.map, this.layout, p.index, id, this.surface, owned[p.index], this.terrain.fogView) : null;
			let entity = this.borders[p.index];
			const oldId = entity?._geometryData?.id;
			if (geometry) {
				if (!entity) {
					const c = hexToRgb(p.color);
					entity = this.overlay(geometry, c, 0.35);
					this.borders[p.index] = entity;
				}
				entity._geometryData = geometry;
				entity.show();
			} else if (entity) {
				entity.hide();
			}
			if (oldId && geometry) this.renderer.releaseGeometry(oldId);
		}
		this.hooks.invalidate?.();
	}

	// ------------------------------------------------------------------
	// Overlays
	// ------------------------------------------------------------------

	placeOverlay (entity: IgeEntity, tile: number, lift = 1.6): void {
		const natural = this.terrain.style === "natural";
		entity.translateTo(this.tileX(tile), this.surface.overlayHeight(tile) + lift * (natural ? 1.5 : 1), this.tileZ(tile));
		entity.show();
	}

	setHover (tile: number, kind: "normal" | "move" | "attack"): void {
		if (tile < 0) {
			this.hoverRing.hide();
			return;
		}
		const c = kind === "move" ? { r: 0.45, g: 1, b: 0.5 } : kind === "attack" ? { r: 1, g: 0.3, b: 0.25 } : { r: 1, g: 1, b: 1 };
		this.hoverRing._materialData = material(c, c, 0.55);
		this.placeOverlay(this.hoverRing, tile, 1.8);
	}

	setSelectedTile (tile: number): void {
		if (tile < 0) this.selectRing.hide();
		else this.placeOverlay(this.selectRing, tile);
	}

	/** Movement range markers; tiles on `path` are highlighted. */
	showReach (tiles: number[], path: number[] = []): void {
		const onPath = new Set(path);
		while (this.markers.length < tiles.length) {
			this.markers.push(this.overlay(createDisc("hexRealms_marker", this.layout.size * 0.13, 20), { r: 0.92, g: 0.96, b: 1 }, 0.45));
		}
		this.markers.forEach((m, i) => {
			if (i >= tiles.length) {
				m.hide();
				return;
			}
			const c = onPath.has(tiles[i]) ? { r: 1, g: 0.86, b: 0.35 } : { r: 0.92, g: 0.96, b: 1 };
			m._materialData = material(c, c, onPath.has(tiles[i]) ? 0.75 : 0.45);
			const k = onPath.has(tiles[i]) ? 1.35 : 1;
			m.scaleTo(k, 1, k);
			// Centre markers sit on whatever is at the tile's middle (a hill's crown)
			m.translateTo(this.tileX(tiles[i]), Math.max(this.surface.overlayHeight(tiles[i]), this.surface.tileHeight(tiles[i])) + 1.2 * (this.terrain.style === "natural" ? 1.5 : 1), this.tileZ(tiles[i]));
			m.show();
		});
	}

	/**
	 * A route over several turns: gold dots, brighter for the part walked
	 * this turn (`firstTurn` tiles), dimmer beyond, and a ring at the end.
	 */
	/** The multi-turn route line (a ribbon mesh, rebuilt when the route changes). */
	protected routeLine?: IgeEntity;
	protected routeKey = "";

	/**
	 * A unit's route over several turns, as a line from the unit through each
	 * tile's centre, rounded at the corners: solid gold for the part it walks
	 * this turn, dashed and dimmer beyond, with an arrowhead at the end and a
	 * dot where each later turn ends.
	 */
	showRoute (tiles: number[], firstTurn = 0, from = -1, turnEnds: number[] = []): void {
		const key = `${from}:${firstTurn}:${tiles.join(",")}`;
		if (key === this.routeKey) return;
		this.routeKey = key;
		const R = this.layout.size;
		// Turn-end dots (the first turn's end too, unless that's the destination)
		const ends = turnEnds.filter((i) => i >= 0 && i < tiles.length - 1);
		while (this.routeDots.length < ends.length) this.routeDots.push(this.overlay(createDisc("hexRealms_routeDot", R * 0.09, 16), { r: 1, g: 0.85, b: 0.35 }, 0.6));
		this.routeDots.forEach((m, i) => {
			if (i >= ends.length) {
				m.hide();
				return;
			}
			const t = tiles[ends[i]];
			const near = ends[i] < firstTurn;
			const c = near ? { r: 1, g: 0.86, b: 0.4 } : { r: 0.86, g: 0.74, b: 0.45 };
			m._materialData = material(c, c, near ? 0.9 : 0.5);
			m.scaleTo(1.25, 1, 1.25);
			m.translateTo(this.tileX(t), this.routeHeight(this.tileX(t), this.tileZ(t)) + 0.4, this.tileZ(t));
			m.show();
		});

		const oldId = this.routeLine?._geometryData?.id;
		if (!tiles.length || from < 0) {
			this.routeLine?.hide();
			if (oldId) this.renderer.releaseGeometry(oldId);
			if (this.routeLine) this.routeLine._geometryData = null;
			this.hooks.invalidate?.();
			return;
		}
		const pts = [from, ...tiles].map((t) => ({ x: this.tileX(t), z: this.tileZ(t) }));
		// Samples along the path: straight through tile centres, rounded with a curve at each corner
		const samples: { x: number; z: number; near: boolean }[] = [{ ...pts[0], near: firstTurn > 0 }];
		for (let i = 1; i < pts.length - 1; i++) {
			const a = { x: (pts[i - 1].x + pts[i].x) / 2, z: (pts[i - 1].z + pts[i].z) / 2 };
			const b = { x: (pts[i].x + pts[i + 1].x) / 2, z: (pts[i].z + pts[i + 1].z) / 2 };
			for (let k = 0; k <= 6; k++) {
				const u = k / 6;
				const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * pts[i].x + u * u * b.x;
				const z = (1 - u) * (1 - u) * a.z + 2 * (1 - u) * u * pts[i].z + u * u * b.z;
				// Corner i is route tile i - 1: the way in is walked this turn if that tile is, the way out if the next one is
				samples.push({ x, z, near: u <= 0.5 ? i - 1 < firstTurn : i < firstTurn });
			}
		}
		const last = pts[pts.length - 1];
		samples.push({ ...last, near: tiles.length <= firstTurn });

		const b = new MeshBuilder();
		const w = R * 0.055;
		const arrow = w * 3.2;
		// Stop the ribbon short of the end, where the arrowhead starts
		const prev = samples[samples.length - 2];
		const dl = Math.hypot(last.x - prev.x, last.z - prev.z) || 1;
		const dir = { x: (last.x - prev.x) / dl, z: (last.z - prev.z) / dl };
		const tip = { x: last.x + dir.x * w * 0.6, z: last.z + dir.z * w * 0.6 };
		samples[samples.length - 1] = { x: last.x - dir.x * arrow * 0.7, z: last.z - dir.z * arrow * 0.7, near: samples[samples.length - 1].near };
		const NEAR = { r: 1, g: 0.84, b: 0.36 }, FAR = { r: 0.92, g: 0.82, b: 0.6 };
		const dash = R * 0.22;
		let run = 0;
		let prevPair: [number, number] | null = null;
		for (let j = 0; j < samples.length; j++) {
			const s0 = samples[Math.max(0, j - 1)], s1 = samples[Math.min(samples.length - 1, j + 1)];
			const tl = Math.hypot(s1.x - s0.x, s1.z - s0.z) || 1;
			const px = -(s1.z - s0.z) / tl, pz = (s1.x - s0.x) / tl;
			const s = samples[j];
			if (j > 0) run += Math.hypot(s.x - samples[j - 1].x, s.z - samples[j - 1].z);
			const c = s.near ? NEAR : FAR;
			b.tint(c.r, c.g, c.b);
			const y = this.routeHeight(s.x, s.z);
			const l = b.vertex(s.x + px * w, y, s.z + pz * w, 0, 1, 0, 0, 0);
			const r = b.vertex(s.x - px * w, y, s.z - pz * w, 0, 1, 0, 0, 0);
			// Dashed beyond this turn
			const gap = !s.near && Math.floor(run / dash) % 2 === 1;
			if (prevPair && !gap) b.quadFacing(prevPair[0], prevPair[1], r, l, 0, 1, 0);
			prevPair = [l, r];
		}
		// The arrowhead
		const end = samples[samples.length - 1];
		const c = end.near ? NEAR : FAR;
		b.tint(c.r, c.g, c.b);
		const ay = this.routeHeight(end.x, end.z);
		const al = b.vertex(end.x - dir.z * w * 2.3, ay, end.z + dir.x * w * 2.3, 0, 1, 0, 0, 0);
		const ar = b.vertex(end.x + dir.z * w * 2.3, ay, end.z - dir.x * w * 2.3, 0, 1, 0, 0, 0);
		const at = b.vertex(tip.x, this.routeHeight(tip.x, tip.z), tip.z, 0, 1, 0, 0, 0);
		b.triFacing(al, ar, at, 0, 1, 0);
		if (!this.routeLine) {
			this.routeLine = new IgeEntity();
			this.routeLine.id(this.uid("route"));
			this.routeLine._materialData = material({ r: 1, g: 1, b: 1 }, { r: 1, g: 0.85, b: 0.45 }, 0.35);
			this.routeLine._noShadowCast = true;
			this.routeLine.mount(this.overlayLayer);
		}
		this.routeLine._geometryData = b.toGeometry(this.uid("routeGeo"));
		this.routeLine.show();
		if (oldId) this.renderer.releaseGeometry(oldId);
		this.hooks.invalidate?.();
	}

	/** Height for route overlays: just above the ground (more in the blended natural style). */
	protected routeHeight (x: number, z: number): number {
		return this.surface.heightAt(x, z) + (this.terrain.style === "natural" ? 3 : 1.8);
	}

	/** Ring the best city sites (gold for excellent, green for good, pale for fair). */
	showSites (sites: { tile: number; grade: string }[]): void {
		const R = this.layout.size;
		while (this.siteRings.length < sites.length) {
			this.siteRings.push(this.overlay(createRing("hexRealms_siteRing", R * 0.62, R * 0.52, 36), { r: 1, g: 0.82, b: 0.3 }, 0.9));
		}
		const COLORS: Record<string, Rgb> = { Excellent: { r: 1, g: 0.82, b: 0.3 }, Good: { r: 0.45, g: 0.92, b: 0.55 }, Fair: { r: 0.9, g: 0.74, b: 0.46 } };
		this.siteRings.forEach((m, i) => {
			const site = sites[i];
			if (!site) {
				m.hide();
				return;
			}
			const c = COLORS[site.grade] ?? COLORS.Fair;
			m._materialData = material(c, c, site.grade === "Fair" ? 0.4 : 0.9);
			this.placeOverlay(m, site.tile, 2);
		});
		this.hooks.invalidate?.();
	}

	showTargets (tiles: number[]): void {
		while (this.targets.length < tiles.length) {
			this.targets.push(this.overlay(createRing("hexRealms_target", this.layout.size * 0.5, this.layout.size * 0.4, 32), { r: 1, g: 0.28, b: 0.22 }, 0.9));
		}
		this.targets.forEach((m, i) => {
			if (i < tiles.length) this.placeOverlay(m, tiles[i], 2.2);
			else m.hide();
		});
	}

	// ------------------------------------------------------------------
	// Events
	// ------------------------------------------------------------------

	/** Turn simulation events into view changes and animations. */
	ingest (events: SimEvent[]): void {
		const sim = this.sim;
		for (const e of events) {
			switch (e.type) {
				case "unitCreated": {
					const u = sim.unit(e.unit);
					if (u) this.addUnit(u, true);
					break;
				}
				case "unitMoved": {
					const v = this.units.get(e.unit);
					if (v) v.queue.push(...e.path.slice(1));
					break;
				}
				case "unitRemoved": {
					const v = this.units.get(e.unit);
					if (v) {
						v.removeAt = e.reason === "killed" ? this.time + LUNGE_TIME + this.pathTime(v) : this.time + this.pathTime(v);
						// Characters play their death before they go
						if (e.reason === "killed" && v.model && this.models?.hasClip(modelOf(v.type, this.models), "death")) {
							v.dying = v.removeAt;
							v.removeAt += DEATH_TIME;
						}
					}
					break;
				}
				case "unitChanged": {
					const v = this.units.get(e.unit);
					const u = sim.unit(e.unit);
					if (v && u && v.owner !== u.owner) {
						v.owner = u.owner;
						// A modelled unit is repainted in its new owner's colours
						if (v.model) this.rebuildUnit(v);
						else this.refreshUnit(v);
					}
					break;
				}
				case "attack": {
					const a = this.units.get(e.attacker);
					const d = this.units.get(e.defender);
					if (a) {
						a.lunge = { to: e.to, t: 0, ranged: e.ranged };
						this.playClip(a, "attack", ATTACK_SPEED, true);
						if (e.ranged) this.addShot(a.type === "catapult", e.from, e.to);
					}
					if (d) {
						d.flash = 0.4;
						this.refreshUnit(d);
						if (!e.killed) this.playClip(d, "hit", HIT_SPEED, true);
					}
					this.hooks.onDamage?.(e.to, e.damage);
					if (e.retaliation && a) {
						a.flash = 0.4;
						this.refreshUnit(a);
						this.hooks.onDamage?.(e.from, e.retaliation);
					}
					break;
				}
				case "cityChanged":
				case "cityLevel":
				case "cityCaptured":
				case "cityFounded": {
					const c = sim.city(e.city);
					if (c) this.buildCity(c);
					this.roadsDirty = true;
					this.depositsDirty = true;
					break;
				}
				case "buildingPlaced":
				case "buildingCompleted": {
					const b = sim.building(e.building);
					if (b) {
						this.buildBuilding(b);
						if (e.type === "buildingPlaced") this.resprawl(b.tile);
					}
					this.roadsDirty = true;
					this.depositsDirty = true;
					break;
				}
				case "buildingRemoved":
					this.removeBuildingView(e.building);
					this.resprawl(e.tile);
					this.roadsDirty = true;
					this.depositsDirty = true;
					break;
				case "road":
					this.roadsDirty = true;
					break;
				case "cargoMoved":
					if ((e.owner === this.player || e.receiver === this.player) && this.terrain.fogView[e.path[0]] !== UNEXPLORED) this.addCargo(e.good, e.path);
					break;
				case "featureCleared":
					this.terrain.terrainChangedAt(e.tile);
					break;
				case "harvested":
					this.depositsDirty = true;
					break;
				case "campFounded":
				case "campCleared":
					this.campsDirty = true;
					break;
				case "territory":
				case "eliminated":
					this.bordersDirty = true;
					break;
				case "fog":
					if (e.player === this.player) this.fogChanged(this.terrain.applyFog(e.tiles));
					break;
			}
		}
		this.hooks.invalidate?.();
	}

	/** Revealed or hidden tiles: re-seat what stands near them and refresh what's shown. */
	fogChanged (tiles: number[]): void {
		if (!tiles.length) return;
		this.campsDirty = true;
		this.roadsDirty = true;
		this.bordersDirty = true;
		this.depositsDirty = true;
		const changed = new Set(tiles);
		const near = (t: number) => changed.has(t) || this.sim.neighbors(t).some((n) => changed.has(n));
		for (const v of this.units.values()) if (!v.queue.length && near(v.tile)) this.placeUnit(v);
		for (const c of this.sim.state.cities) {
			if (near(c.tile)) this.buildCity(c);
		}
		for (const b of this.sim.state.buildings) {
			if (near(b.tile)) this.buildBuilding(b);
		}
	}

	protected pathTime (v: UnitView): number {
		return (v.queue.length - v.stepT) * STEP_TIME;
	}

	/** An arrow (or a catapult's stone) flying from one tile to another. */
	protected addShot (stone: boolean, from: number, to: number): void {
		const entity = new IgeEntity();
		entity.id(this.uid("shot"));
		entity._geometryData = stone ? ORB : CUBE;
		entity._materialData = material(stone ? { r: 0.45, g: 0.43, b: 0.4 } : { r: 0.3, g: 0.2, b: 0.12 });
		entity._noShadowCast = true;
		const fx = this.tileX(from), fz = this.tileZ(from), tx = this.tileX(to), tz = this.tileZ(to);
		if (stone) entity.scaleTo(10, 10, 10);
		else entity.scaleTo(1.6, 1.6, 18).rotateTo(0, Math.atan2(tx - fx, tz - fz), 0);
		entity.hide();
		entity.mount(this.unitLayer);
		const dist = Math.hypot(tx - fx, tz - fz);
		this.shots.push({
			entity,
			from: { x: fx, y: this.groundAt(fx, fz) + 30, z: fz },
			to: { x: tx, y: this.groundAt(tx, tz) + 18, z: tz },
			t: -0.5,
			time: stone ? 0.6 : 0.4,
			arc: dist * (stone ? 0.45 : 0.18)
		});
	}

	protected addCargo (good: Good, path: number[]): void {
		if (path.length < 2) return;
		let entity = this.cargoPool.pop();
		if (!entity) {
			entity = new IgeEntity();
			entity.id(this.uid("cargo"));
			entity._geometryData = CUBE;
			entity._noShadowCast = true;
			entity.scaleTo(9, 9, 9);
			entity.mount(this.unitLayer);
		}
		entity._materialData = material(hexToRgb(GOOD_INFO[good].color));
		entity.scaleTo(9, 9, 9);
		entity.show();
		this.cargo.push({ entity, path, t: 0, afloat: false });
	}

	// ------------------------------------------------------------------
	// Per frame
	// ------------------------------------------------------------------

	get animating (): boolean {
		if (this.cargo.length || this.shots.length || this.time < this.burstUntil) return true;
		for (const v of this.units.values()) {
			if (v.queue.length || v.lunge || v.flash > 0 || v.pop < 1 || v.removeAt >= 0) return true;
			if (v.clipUntil !== undefined && v.clipUntil > this.time) return true;
		}
		return false;
	}

	// ------------------------------------------------------------------
	// Celebrations
	// ------------------------------------------------------------------

	/** The particle effects for a city changing hands (made on first use), and until when they're alive. */
	protected bursts: { gold: IgeParticleSystem3d; colour: IgeParticleSystem3d; twinkle: IgeParticleSystem3d; rise: IgeParticleSystem3d } | null = null;
	protected burstUntil = 0;
	protected laterBursts: { at: number; fire: () => void }[] = [];

	/**
	 * A shimmering burst over a city that has just been captured: gold sparks and sparks in the new
	 * owner's colour shooting up and drifting down, a column of golden sparkles streaming up from it,
	 * white twinkles, and a second gold pop a moment later.
	 */
	celebrate (tile: number, owner: number): void {
		const R = this.layout.size;
		if (!this.bursts) {
			const make = (o: Partial<IgeParticleSystem3dOptions>) => {
				const p = new IgeParticleSystem3d(o);
				p.id(this.uid("burst"));
				p.mount(this.unitLayer);
				return p;
			};
			const sparks: Partial<IgeParticleSystem3dOptions> = {
				maxParticles: 400, blending: "additive", lifetime: [1.4, 2.5], speed: [R * 1.2, R * 3], direction: { x: 0, y: 1, z: 0 }, spread: 0.95,
				gravity: { x: 0, y: -R * 2.2, z: 0 }, drag: 0.9, size: [R * 0.17, R * 0.06], emitterRadius: R * 0.35
			};
			this.bursts = {
				gold: make({ ...sparks, startColor: { r: 1, g: 0.86, b: 0.35, a: 1 }, endColor: { r: 1, g: 0.55, b: 0.15, a: 0 } }),
				colour: make({ ...sparks, maxParticles: 200, size: [R * 0.15, R * 0.05], spread: 1.25 }),
				twinkle: make({
					maxParticles: 200, blending: "additive", lifetime: [1.6, 2.8], speed: [R * 0.3, R * 0.9], direction: { x: 0, y: 1, z: 0 }, spread: 0.7,
					gravity: { x: 0, y: R * 0.5, z: 0 }, drag: 0.4, size: [R * 0.13, R * 0.03], emitterRadius: R * 0.6,
					startColor: { r: 1, g: 1, b: 1, a: 1 }, endColor: { r: 0.75, g: 0.88, b: 1, a: 0 }
				}),
				rise: make({
					maxParticles: 300, blending: "additive", rate: 0, lifetime: [1.2, 2], speed: [R * 0.8, R * 1.6], direction: { x: 0, y: 1, z: 0 }, spread: 0.25,
					gravity: { x: 0, y: R * 0.4, z: 0 }, drag: 0.2, size: [R * 0.12, R * 0.02], emitterRadius: R * 0.45,
					startColor: { r: 1, g: 0.95, b: 0.7, a: 1 }, endColor: { r: 1, g: 0.75, b: 0.3, a: 0 }
				})
			};
		}
		const b = this.bursts;
		const a = this.anchor(tile);
		const y = this.groundAt(a.x, a.z) + R * 0.7;
		const c = owner >= 0 ? hexToRgb(this.sim.player(owner).color) : NEUTRAL;
		b.colour._options.startColor = { r: c.r, g: c.g, b: c.b, a: 1 };
		b.colour._options.endColor = { r: c.r, g: c.g, b: c.b, a: 0 };
		b.gold.burst(110, { x: a.x, y, z: a.z });
		b.colour.burst(70, { x: a.x, y, z: a.z });
		b.twinkle.burst(40, { x: a.x, y: y - R * 0.3, z: a.z });
		// The column streams up for a second and a half
		b.rise.translateTo(a.x, y - R * 0.5, a.z);
		b.rise._options.rate = 70;
		this.laterBursts.push(
			{ at: this.time + 1.5, fire: () => (b.rise._options.rate = 0) },
			{ at: this.time + 0.35, fire: () => b.gold.burst(70, { x: a.x, y: y + R * 0.4, z: a.z }) },
			{ at: this.time + 0.7, fire: () => b.twinkle.burst(30, { x: a.x, y, z: a.z }) }
		);
		this.burstUntil = Math.max(this.burstUntil, this.time + 3.4);
		this.hooks.invalidate?.();
	}

	/** Advance animations. Returns true while anything moved. */
	update (dt: number, time: number): boolean {
		this.time = time;
		let moving = time < this.burstUntil;
		for (let i = this.laterBursts.length - 1; i >= 0; i--) {
			if (time < this.laterBursts[i].at) continue;
			this.laterBursts[i].fire();
			this.laterBursts.splice(i, 1);
		}

		for (const v of [...this.units.values()]) {
			if (v.removeAt >= 0 && time >= v.removeAt) {
				v.root.destroy();
				this.units.delete(v.id);
				moving = true;
				continue;
			}
			if (v.pop < 1) {
				v.pop = Math.min(1, v.pop + dt * 4);
				this.placeUnit(v, time);
				moving = true;
			}
			if (v.flash > 0) {
				v.flash -= dt;
				if (v.flash <= 0) this.refreshUnit(v);
				moving = true;
			}
			if (v.queue.length) {
				moving = true;
				v.stepT += dt / STEP_TIME;
				while (v.stepT >= 1 && v.queue.length) {
					v.stepT -= 1;
					v.tile = v.queue.shift() as number;
					this.refreshUnit(v);
				}
				if (!v.queue.length) {
					v.stepT = 0;
					this.placeUnit(v, time);
				} else {
					const a = this.anchor(v.tile), b = this.anchor(v.queue[0]);
					const t = v.stepT;
					const fy = this.groundAt(a.x, a.z), ty = this.groundAt(b.x, b.z);
					// Blocks hop from tile to tile; a model with a walk clip walks, a prop rocks along
					const hop = !v.model ? 14 : v.clip === "walk" ? 0 : 3;
					v.root.translateTo(a.x + (b.x - a.x) * t, fy + (ty - fy) * t + Math.abs(Math.sin(t * Math.PI * (v.model ? 2 : 1))) * hop, a.z + (b.z - a.z) * t);
					v.root.rotateTo(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
				}
			} else if (v.lunge) {
				moving = true;
				v.lunge.t += dt / LUNGE_TIME;
				const a = this.anchor(v.tile);
				const tx = this.tileX(v.lunge.to), tz = this.tileZ(v.lunge.to);
				// Melee units lunge at their target; ranged ones lean in and loose a shot
				const k = Math.sin(Math.min(1, v.lunge.t) * Math.PI) * (v.lunge.ranged ? 0.06 : 0.4);
				v.root.translateTo(a.x + (tx - a.x) * k, this.groundAt(a.x, a.z) + k * 10, a.z + (tz - a.z) * k);
				v.root.rotateTo(0, Math.atan2(tx - a.x, tz - a.z), 0);
				if (v.lunge.t >= 1) {
					v.lunge = null;
					this.placeUnit(v, time);
				}
			} else if (v.type === "settler" && v.shown && !v.model) {
				this.placeUnit(v, time);
			}
			this.settleClip(v, time);
			if (v.clipUntil !== undefined && v.clipUntil > time) moving = true;
		}

		for (let i = this.shots.length - 1; i >= 0; i--) {
			const s = this.shots[i];
			moving = true;
			s.t += dt / s.time;
			if (s.t >= 1) {
				s.entity.destroy();
				this.shots.splice(i, 1);
				continue;
			}
			if (s.t < 0) continue;
			const k = s.t;
			s.entity.show();
			s.entity.translateTo(
				s.from.x + (s.to.x - s.from.x) * k,
				s.from.y + (s.to.y - s.from.y) * k + Math.sin(k * Math.PI) * s.arc,
				s.from.z + (s.to.z - s.from.z) * k
			);
		}

		for (let i = this.cargo.length - 1; i >= 0; i--) {
			const c = this.cargo[i];
			moving = true;
			c.t += dt * CARGO_TILES_PER_SECOND;
			const seg = Math.min(c.path.length - 1, Math.floor(c.t));
			if (c.t >= c.path.length - 1) {
				c.entity.hide();
				this.cargoPool.push(c.entity);
				this.cargo.splice(i, 1);
				continue;
			}
			const f = c.t - seg;
			const ax = this.tileX(c.path[seg]), az = this.tileZ(c.path[seg]);
			const bx = this.tileX(c.path[seg + 1]), bz = this.tileZ(c.path[seg + 1]);
			const x = ax + (bx - ax) * f, z = az + (bz - az) * f;
			// On the water a load sails as a flat little boat
			const afloat = this.sim.map.isWater(c.path[f < 0.5 ? seg : seg + 1]);
			if (afloat !== c.afloat) {
				c.afloat = afloat;
				c.entity.scaleTo(afloat ? 18 : 9, afloat ? 5 : 9, afloat ? 10 : 9);
			}
			c.entity.translateTo(x, this.groundAt(x, z) + (afloat ? 4 : 9 + Math.abs(Math.sin(f * Math.PI)) * 3), z);
		}

		this.updateVisibility();
		if (this.roadsDirty) this.rebuildRoads();
		if (this.depositsDirty) this.rebuildDeposits();
		if (this.bordersDirty) this.rebuildBorders();
		if (this.campsDirty) this.rebuildCamps();
		return moving;
	}

	/** Shown world position of a unit (for health badges). */
	unitPosition (id: number): { x: number; y: number; z: number; shown: boolean } | null {
		const v = this.units.get(id);
		if (!v) return null;
		const t = v.root._translate;
		return { x: t.x, y: t.y, z: t.z, shown: v.shown };
	}
}
