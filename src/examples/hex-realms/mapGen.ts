import { hexDistance, ODD_R_NEIGHBOURS } from "./hex";
import { hash2, mulberry32, SimplexNoise2d } from "./noise";
import {
	Feature,
	LAND_BEVEL,
	LAND_HEIGHT,
	moveCostFor,
	Relief,
	Terrain,
	TERRAIN_INFO,
	WATER_BEVEL
} from "./terrain";

export interface MapOptions {
	width: number;
	height: number;
	seed: number;
	/** Fraction of tiles that are land (0-1). */
	landRatio?: number;
}

/**
 * Tile data for a rectangular hex map, stored in flat typed arrays indexed by
 * `row * width + col` so maps with hundreds of thousands of tiles stay cheap.
 */
export class HexMap {
	readonly width: number;
	readonly height: number;
	readonly count: number;
	readonly seed: number;

	terrain: Uint8Array;
	relief: Uint8Array;
	feature: Uint8Array;
	/** Resource deposit per tile (see Deposit in sim/rules.ts). */
	deposit: Uint8Array;
	/** Per-tile colour variation (shade multiplier around 1). */
	shade: Float32Array;
	/** Player that owns the tile's territory, -1 if none. */
	owner: Int8Array;
	/** Rivers along each tile's edges: bit d set when edge d has one (see rivers.ts). */
	river: Uint8Array;
	/** River courses, source to mouth (for drawing; not saved, regenerated from the seed). */
	riverCourses: { corners: [number, number][] }[] = [];
	/** Id of the landmass (connected land) a tile belongs to, -1 for water. */
	landmass: Int32Array;
	landmassSizes: number[] = [];

	constructor (width: number, height: number, seed: number) {
		this.width = width;
		this.height = height;
		this.count = width * height;
		this.seed = seed;
		this.terrain = new Uint8Array(this.count);
		this.relief = new Uint8Array(this.count);
		this.feature = new Uint8Array(this.count);
		this.deposit = new Uint8Array(this.count);
		this.shade = new Float32Array(this.count);
		this.owner = new Int8Array(this.count).fill(-1);
		this.landmass = new Int32Array(this.count).fill(-1);
		this.river = new Uint8Array(this.count);
	}

	index (col: number, row: number): number {
		return row * this.width + col;
	}

	col (index: number): number {
		return index % this.width;
	}

	row (index: number): number {
		return Math.floor(index / this.width);
	}

	inBounds (col: number, row: number): boolean {
		return col >= 0 && row >= 0 && col < this.width && row < this.height;
	}

	/** Neighbour of a tile in a direction (0-5: E, SE, SW, W, NW, NE), or -1 off the map. */
	neighbor (index: number, dir: number): number {
		const row = Math.floor(index / this.width);
		const col = index - row * this.width;
		const d = ODD_R_NEIGHBOURS[row & 1][dir];
		const nc = col + d[0];
		const nr = row + d[1];
		if (nc < 0 || nr < 0 || nc >= this.width || nr >= this.height) return -1;
		return nr * this.width + nc;
	}

	distance (a: number, b: number): number {
		return hexDistance(this.col(a), this.row(a), this.col(b), this.row(b));
	}

	isWater (index: number): boolean {
		return TERRAIN_INFO[this.terrain[index] as Terrain].water;
	}

	/** Height of the flat top of a tile. */
	topHeight (index: number): number {
		const relief = this.relief[index] as Relief;
		if (relief === Relief.Water) return TERRAIN_INFO[this.terrain[index] as Terrain].waterHeight;
		return LAND_HEIGHT[relief];
	}

	/** Height of the bevelled rim where a tile meets its neighbours. */
	rimHeight (index: number): number {
		return this.topHeight(index) - (this.isWater(index) ? WATER_BEVEL : LAND_BEVEL);
	}

	moveCost (index: number): number {
		return moveCostFor(this.terrain[index] as Terrain, this.relief[index] as Relief, this.feature[index] as Feature);
	}

	canSettle (index: number): boolean {
		const relief = this.relief[index] as Relief;
		return TERRAIN_INFO[this.terrain[index] as Terrain].settleable && (relief === Relief.Flat || relief === Relief.Hills);
	}
}

/** Value at a quantile (0-1) of an array, using a sorted copy. */
function quantile (values: Float32Array, q: number): number {
	const sorted = Float32Array.from(values).sort();
	const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
	return sorted[i];
}

/**
 * Generate a map of continents and islands:
 * 1. Elevation from layered noise, pushed down near the map edges so the map
 *    is ringed by ocean. Sea level is picked so `landRatio` of tiles are land.
 * 2. Ridged noise picks mountain ranges and hills among the higher land.
 * 3. Temperature (latitude + altitude) and moisture (noise + coast proximity)
 *    choose biomes, and a clustered noise field places forests and jungle.
 * 4. Water near land becomes shallow coast; polar seas freeze into pack ice.
 */
export function generateMap (options: MapOptions): HexMap {
	const { width, height, seed } = options;
	const landRatio = options.landRatio ?? 0.4;
	const map = new HexMap(width, height, seed);
	const count = map.count;

	const rng = mulberry32(seed);
	const elevationNoise = new SimplexNoise2d(rng);
	const continentNoise = new SimplexNoise2d(rng);
	const ridgeNoise = new SimplexNoise2d(rng);
	const moistureNoise = new SimplexNoise2d(rng);
	const temperatureNoise = new SimplexNoise2d(rng);
	const forestNoise = new SimplexNoise2d(rng);

	// Noise is sampled in "tile units" on the real hex layout, so features
	// are round rather than stretched by the row spacing. Larger maps get
	// proportionally larger continents rather than more noise detail.
	const continentScale = Math.max(width, height * 1.15) / 3.2;
	const detailScale = 9;

	const elevation = new Float32Array(count);
	const ridge = new Float32Array(count);
	const moisture = new Float32Array(count);
	const temperature = new Float32Array(count);

	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			const i = row * width + col;
			const x = col + 0.5 * (row & 1);
			const z = row * 0.866;

			const continent = continentNoise.fbm(x / continentScale, z / continentScale, 3);
			const detail = elevationNoise.fbm(x / detailScale, z / detailScale, 5);

			// Push the edges of the map underwater
			const ex = Math.min(col, width - 1 - col) / Math.max(1, width * 0.12);
			const ez = Math.min(row, height - 1 - row) / Math.max(1, height * 0.12);
			const edge = Math.min(1, ex) * Math.min(1, ez);
			const edgeFalloff = (1 - edge) * (1 - edge);

			elevation[i] = continent * 0.75 + detail * 0.35 - edgeFalloff * 0.9;
			ridge[i] = ridgeNoise.ridged(x / 14, z / 14, 3);
			moisture[i] = moistureNoise.fbm(x / 12, z / 12, 4) * 0.5 + 0.5;

			// Temperate bands stay wide; it only gets cold close to the poles
			const latitude = Math.abs(row / Math.max(1, height - 1) - 0.5) * 2;
			temperature[i] = 1 - Math.pow(latitude, 1.6) * 1.1 + temperatureNoise.fbm(x / 10, z / 10, 2) * 0.12;
		}
	}

	// Sea level such that `landRatio` of the map is land
	const seaLevel = quantile(elevation, 1 - landRatio);

	// Rank-normalise moisture over land so biome thresholds read as
	// "the driest 20% of land" whatever the noise distribution looks like
	const landIndices: number[] = [];
	for (let i = 0; i < count; i++) if (elevation[i] > seaLevel) landIndices.push(i);
	landIndices.sort((a, b) => moisture[a] - moisture[b]);
	for (let k = 0; k < landIndices.length; k++) moisture[landIndices[k]] = k / Math.max(1, landIndices.length - 1);

	// Distance (in tiles, capped) from each water tile to the nearest land
	const landDistance = new Int16Array(count).fill(32767);
	const queue = new Int32Array(count);
	let head = 0;
	let tail = 0;
	for (let i = 0; i < count; i++) {
		if (elevation[i] > seaLevel) {
			landDistance[i] = 0;
			queue[tail++] = i;
		}
	}
	while (head < tail) {
		const i = queue[head++];
		const d = landDistance[i] + 1;
		if (d > 4) continue;
		for (let dir = 0; dir < 6; dir++) {
			const n = map.neighbor(i, dir);
			if (n >= 0 && landDistance[n] > d) {
				landDistance[n] = d;
				queue[tail++] = n;
			}
		}
	}

	// Mountains and hills: the highest-scoring land by elevation and ridges
	const landScores: number[] = [];
	const mountainScore = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		if (elevation[i] <= seaLevel) continue;
		const score = (elevation[i] - seaLevel) * 1.4 + ridge[i] * 0.9;
		mountainScore[i] = score;
		landScores.push(score);
	}
	landScores.sort((a, b) => a - b);
	const pick = (q: number) => landScores[Math.min(landScores.length - 1, Math.floor(q * landScores.length))] ?? Infinity;
	const mountainLevel = pick(0.93);
	const hillLevel = pick(0.78);

	for (let i = 0; i < count; i++) {
		const col = map.col(i);
		const row = map.row(i);
		const isLand = elevation[i] > seaLevel;
		const latitude = Math.abs(row / Math.max(1, height - 1) - 0.5) * 2;
		map.shade[i] = 0.95 + hash2(col, row, seed) * 0.09;

		if (!isLand) {
			map.relief[i] = Relief.Water;
			const shallow = landDistance[i] <= 1 || (landDistance[i] <= 3 && elevation[i] > seaLevel - 0.05);
			const frozen = latitude > 0.9 && hash2(col, row, seed + 7) < (latitude - 0.9) * 12;
			map.terrain[i] = frozen ? Terrain.Ice : shallow ? Terrain.Ocean : Terrain.DeepOcean;
			continue;
		}

		const relief = mountainScore[i] >= mountainLevel ? Relief.Mountain : mountainScore[i] >= hillLevel ? Relief.Hills : Relief.Flat;
		map.relief[i] = relief;

		// Coastal land is wetter; high land is colder
		const wet = Math.min(1, moisture[i] + (hasWaterNeighbour(map, i, elevation, seaLevel) ? 0.08 : 0));
		const temp = temperature[i] - (relief === Relief.Hills ? 0.06 : relief === Relief.Mountain ? 0.12 : 0);

		let terrain: Terrain;
		if (temp < 0.13) terrain = Terrain.Snow;
		else if (temp < 0.3) terrain = Terrain.Tundra;
		else if (wet < 0.24 && temp > 0.5) terrain = Terrain.Desert;
		else if (wet < 0.5) terrain = Terrain.Plains;
		else terrain = Terrain.Grassland;
		map.terrain[i] = terrain;

		// Forests cluster in patches, more of them where it is wet
		if (relief !== Relief.Mountain && terrain !== Terrain.Desert && terrain !== Terrain.Snow) {
			const x = col + 0.5 * (row & 1);
			const z = row * 0.866;
			const patch = forestNoise.fbm(x / 5, z / 5, 3) * 0.5 + 0.5;
			if (patch + wet * 0.5 > 0.88) {
				if (terrain === Terrain.Tundra) map.feature[i] = Feature.Pine;
				else if (temp > 0.74 && wet > 0.55) map.feature[i] = Feature.Jungle;
				else map.feature[i] = Feature.Forest;
			}
		}
	}

	placeDeposits(map, mulberry32(seed ^ 0x2f6b9d1));
	labelLandmasses(map);
	return map;
}

/**
 * Resource deposits that buildings work: fish in coastal water, game in
 * forests, ore / coal / gold in hills and horses on open grassland.
 * Values match the Deposit enum in sim/rules.ts.
 */
function placeDeposits (map: HexMap, rand: () => number): void {
	const FISH = 1, GAME = 2, ORE = 3, COAL = 4, GOLD = 5, HORSES = 6;
	for (let t = 0; t < map.count; t++) {
		const terrain = map.terrain[t] as Terrain;
		const relief = map.relief[t] as Relief;
		const roll = rand();
		if (terrain === Terrain.Ocean) {
			if (roll < 0.2) map.deposit[t] = FISH;
		} else if (relief === Relief.Hills) {
			if (roll < 0.3) map.deposit[t] = ORE;
			else if (roll < 0.5) map.deposit[t] = COAL;
			else if (roll < 0.57) map.deposit[t] = GOLD;
		} else if (relief === Relief.Flat && map.feature[t] !== Feature.None) {
			if (roll < 0.3) map.deposit[t] = GAME;
		} else if (relief === Relief.Flat && (terrain === Terrain.Grassland || terrain === Terrain.Plains)) {
			if (roll < 0.06) map.deposit[t] = HORSES;
		}
	}
}

function hasWaterNeighbour (map: HexMap, i: number, elevation: Float32Array, seaLevel: number): boolean {
	for (let dir = 0; dir < 6; dir++) {
		const n = map.neighbor(i, dir);
		if (n >= 0 && elevation[n] <= seaLevel) return true;
	}
	return false;
}

/** Flood-fill connected land so start positions can avoid tiny islands. */
function labelLandmasses (map: HexMap): void {
	const stack: number[] = [];
	map.landmassSizes = [];
	for (let i = 0; i < map.count; i++) {
		if (map.isWater(i) || map.landmass[i] >= 0) continue;
		const id = map.landmassSizes.length;
		let size = 0;
		map.landmass[i] = id;
		stack.push(i);
		while (stack.length) {
			const t = stack.pop() as number;
			size++;
			for (let dir = 0; dir < 6; dir++) {
				const n = map.neighbor(t, dir);
				if (n >= 0 && map.landmass[n] < 0 && !map.isWater(n)) {
					map.landmass[n] = id;
					stack.push(n);
				}
			}
		}
		map.landmassSizes.push(size);
	}
}

/**
 * Choose well spread start tiles for `players` civilisations: settleable
 * land on large landmasses, scored by the quality of the surrounding tiles,
 * picked greedily with a minimum separation that shrinks if needed.
 */
export function chooseStartPositions (map: HexMap, players: number): number[] {
	const candidates: { tile: number; score: number }[] = [];
	const quality: Partial<Record<Terrain, number>> = {
		[Terrain.Grassland]: 3,
		[Terrain.Plains]: 3,
		[Terrain.Desert]: 1,
		[Terrain.Tundra]: 1,
		[Terrain.Ocean]: 1
	};

	for (let i = 0; i < map.count; i++) {
		if (!map.canSettle(i) || map.relief[i] !== Relief.Flat) continue;
		if ((map.landmassSizes[map.landmass[i]] ?? 0) < 40) continue;
		const t = map.terrain[i] as Terrain;
		if (t !== Terrain.Grassland && t !== Terrain.Plains) continue;

		let score = 0;
		for (let dir = 0; dir < 6; dir++) {
			const n = map.neighbor(i, dir);
			if (n < 0) continue;
			score += quality[map.terrain[n] as Terrain] ?? 0;
			if (map.relief[n] === Relief.Hills) score += 1;
			if (map.feature[n] !== Feature.None) score += 0.5;
		}
		candidates.push({ tile: i, score: score + hash2(i, 0, map.seed) });
	}
	candidates.sort((a, b) => b.score - a.score);

	const landTiles = map.landmassSizes.reduce((sum, size) => sum + size, 0);
	let minDistance = Math.max(5, Math.floor(Math.sqrt(landTiles / Math.max(1, players)) * 0.9));

	while (minDistance >= 3) {
		const chosen: number[] = [];
		for (const candidate of candidates) {
			if (chosen.every((tile) => map.distance(tile, candidate.tile) >= minDistance)) {
				chosen.push(candidate.tile);
				if (chosen.length === players) return chosen;
			}
		}
		minDistance--;
	}
	return candidates.slice(0, players).map((c) => c.tile);
}
