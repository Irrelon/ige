import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { FOGGED, UNEXPLORED } from "./fog";
import { CORNER_X, CORNER_Z, EDGE_X, EDGE_Z, type HexLayout } from "./hex";
import type { HexMap } from "./mapGen";
import type { MeshBuilder } from "./meshBuilder";
import { mulberry32 } from "./noise";
import { forestedKey, type PaletteKey, paletteU, paletteV } from "./palette";
import { Feature, FLOOR_HEIGHT, LAND_BEVEL, Relief, Terrain, TERRAIN_INFO, WATER_BEVEL } from "./terrain";

/**
 * Builds the terrain mesh for one rectangular chunk of the map. Everything
 * static (tile tops, bevels, cliffs, trees, hills and mountains) is baked
 * into a single mesh so the renderer draws a chunk with one call and culls
 * it with one bounding sphere, which is what makes very large maps cheap.
 *
 * Each tile is a flat inner hexagon at the tile's height surrounded by a
 * bevelled rim that slopes down to the tile edge. Where a neighbour is lower
 * (or off the map) a wall drops from this tile's rim to the neighbour's rim,
 * so terraces, coastlines and the map's outer edge are closed without gaps.
 *
 * Fog of war: with a view array (UNEXPLORED / FOGGED / VISIBLE per tile),
 * unexplored tiles are covered in Polytopia-style clouds, and fogged tiles
 * use the palette's desaturated rows.
 */

/** Inner (flat) hexagon radius as a fraction of the tile radius. */
const LAND_INNER = 0.82;
const WATER_INNER = 0.9;
/** Shade multiplier at the outer rim, which outlines every tile. */
const LAND_RIM_SHADE = 0.8;
const WATER_RIM_SHADE = 0.92;

/**
 * Clouds over unexplored tiles: a flat cloud layer at CLOUD_BASE (which is
 * also where cloud banks drop to explored neighbours) with puffs rising to
 * about CLOUD_TOP.
 */
export const CLOUD_BASE = 9;
export const CLOUD_TOP = CLOUD_BASE + 24;

/**
 * "full" is the close-up mesh. "lite" is for when tiles are only a few
 * pixels across: each top is one flat hexagon at rim height (so it meets
 * full-detail neighbours exactly), forests tint the top instead of adding
 * trees, and mountains keep a single peak. Roughly a third of the triangles.
 */
export type ChunkDetail = "full" | "lite";

/** Tile top as shown: the cloud layer when unexplored. */
export function shownTop (map: HexMap, view: Uint8Array | undefined, t: number): number {
	return view && view[t] === UNEXPLORED ? CLOUD_BASE : map.topHeight(t);
}

function shownRim (map: HexMap, view: Uint8Array | undefined, t: number): number {
	return view && view[t] === UNEXPLORED ? CLOUD_BASE : map.rimHeight(t);
}

export function buildChunk (
	map: HexMap,
	layout: HexLayout,
	builder: MeshBuilder,
	col0: number,
	row0: number,
	size: number,
	id: string,
	detail: ChunkDetail = "full",
	view?: Uint8Array
): IgeGeometryData3d | null {
	builder.reset();
	const col1 = Math.min(map.width, col0 + size);
	const row1 = Math.min(map.height, row0 + size);

	for (let row = row0; row < row1; row++) {
		for (let col = col0; col < col1; col++) {
			const t = row * map.width + col;
			if (view && view[t] === UNEXPLORED) addCloudTile(map, layout, builder, t, col, row, view, detail);
			else if (detail === "lite") addLiteTile(map, layout, builder, t, col, row, view);
			else addTile(map, layout, builder, t, col, row, view);
		}
	}

	return builder.vertexCount > 0 ? builder.toGeometry(id) : null;
}

const FEATURE_MIX: Partial<Record<Feature, "Forest" | "Jungle" | "Pine">> = {
	[Feature.Forest]: "Forest",
	[Feature.Jungle]: "Jungle",
	[Feature.Pine]: "Pine"
};

/**
 * Inner hexagon at `top` plus a bevelled rim sloping to `rim` at the tile
 * edge, coloured from one palette row (shade for the top, rimShade at the edge).
 */
function addBevelledTop (
	b: MeshBuilder, cx: number, cz: number, R: number,
	top: number, rim: number, inner: number, u: number, uRim: number, v: number
): { inner: number; outer: number } {
	// The rim slopes outward; tilt its normals to match so it catches light
	const slope = (top - rim) / (R * (1 - inner));
	const nLen = Math.sqrt(1 + slope * slope);

	const i0 = b.vertexCount;
	for (let i = 0; i < 6; i++) {
		b.vertex(cx + CORNER_X[i] * R * inner, top, cz + CORNER_Z[i] * R * inner, 0, 1, 0, u, v);
	}
	const o0 = b.vertexCount;
	for (let i = 0; i < 6; i++) {
		b.vertex(
			cx + CORNER_X[i] * R, rim, cz + CORNER_Z[i] * R,
			(CORNER_X[i] * slope) / nLen, 1 / nLen, (CORNER_Z[i] * slope) / nLen,
			uRim, v
		);
	}

	// Flat top: a fan of four triangles
	for (let i = 1; i < 5; i++) b.triFacing(i0, i0 + i, i0 + i + 1, 0, 1, 0);

	// Bevelled rim: six quads from the inner hexagon out to the edge
	for (let i = 0; i < 6; i++) {
		const j = (i + 1) % 6;
		b.quadFacing(i0 + i, o0 + i, o0 + j, i0 + j, EDGE_X[i] * slope, 1, EDGE_Z[i] * slope);
	}
	return { inner: i0, outer: o0 };
}

/** A small per-tile shift in hue (warmer or cooler), so no two tiles are quite the same colour. */
function tileTint (map: HexMap, t: number): [number, number, number] {
	const h = Math.imul(t + 7, 2246822519) ^ map.seed;
	const a = ((h >>> 8) & 255) / 255 - 0.5;
	const c = ((h >>> 16) & 255) / 255 - 0.5;
	return [1 + a * 0.06, 1 + c * 0.04, 1 - a * 0.06];
}

const isLand = (map: HexMap, n: number) => n >= 0 && !TERRAIN_INFO[map.terrain[n] as Terrain].water;

/**
 * Unexplored: a flat cloud layer with no tile outline, so neighbouring cloud
 * tiles merge, topped (at full detail) by three soft puffs that spill over
 * the tile edges. Banks drop from the layer to lower explored neighbours.
 */
function addCloudTile (
	map: HexMap, layout: HexLayout, b: MeshBuilder, t: number, col: number, row: number,
	view: Uint8Array, detail: ChunkDetail
): void {
	const R = layout.size;
	const cx = layout.centerX(col, row);
	const cz = layout.centerZ(row);
	const v = paletteV("cloud");

	// Cloud layer: one flat hexagon, slightly shaded so puffs stand out
	const i0 = b.vertexCount;
	const u = paletteU(detail === "lite" ? 1 : 0.9);
	for (let i = 0; i < 6; i++) b.vertex(cx + CORNER_X[i] * R, CLOUD_BASE, cz + CORNER_Z[i] * R, 0, 1, 0, u, v);
	for (let i = 1; i < 5; i++) b.triFacing(i0, i0 + i, i0 + i + 1, 0, 1, 0);
	addWalls(map, layout, b, t, cx, cz, CLOUD_BASE, 1, "cloudShade", view, false);

	if (detail === "lite") return;

	const rand = mulberry32(Math.imul(t + 3, 2654435761) ^ map.seed);
	const pu = paletteU(1.02);
	// One large puff near the centre...
	const a = rand() * Math.PI * 2;
	const off = rand() * R * 0.15;
	addPuff(b, cx + Math.cos(a) * off, CLOUD_BASE - 1, cz + Math.sin(a) * off, R * (0.62 + rand() * 0.13), R * (0.38 + rand() * 0.12), rand() * Math.PI, pu, v);
	// ...and two smaller ones either side, reaching over the tile edge
	const side = rand() * Math.PI * 2;
	for (let k = 0; k < 2; k++) {
		const angle = side + k * Math.PI + (rand() - 0.5) * 1.2;
		const dist = R * (0.42 + rand() * 0.12);
		addPuff(
			b, cx + Math.cos(angle) * dist, CLOUD_BASE - 1, cz + Math.sin(angle) * dist,
			R * (0.42 + rand() * 0.14), R * (0.26 + rand() * 0.12), rand() * Math.PI, pu, v
		);
	}
}

/**
 * A smooth-shaded half-ellipsoid of radius `r` and height `h` standing on
 * (x, y, z): a base ring, a staggered middle ring and a top vertex, with
 * ellipsoid normals so lighting rounds it off. 13 vertices, 18 triangles.
 */
function addPuff (b: MeshBuilder, x: number, y: number, z: number, r: number, h: number, rot: number, u: number, v: number): void {
	const seg = 6;
	const step = (Math.PI * 2) / seg;
	const ringAt = (radius: number, height: number, offset: number): number => {
		const first = b.vertexCount;
		for (let k = 0; k < seg; k++) {
			const a = rot + (k + offset) * step;
			const px = Math.cos(a) * radius, pz = Math.sin(a) * radius;
			// Ellipsoid normal: gradient of (x/r)^2 + (y/h)^2 + (z/r)^2
			let nx = px / (r * r), ny = height / (h * h), nz = pz / (r * r);
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
			nx /= len;
			ny /= len;
			nz /= len;
			b.vertex(x + px, y + height, z + pz, nx, ny, nz, u, v);
		}
		return first;
	};

	const base = ringAt(r, 0, 0);
	const mid = ringAt(r * 0.8, h * 0.6, 0.5);
	const top = b.vertex(x, y + h, z, 0, 1, 0, u, v);

	for (let k = 0; k < seg; k++) {
		const k1 = (k + 1) % seg;
		const a = rot + (k + 0.5) * step;
		const fx = Math.cos(a), fz = Math.sin(a);
		b.triFacing(base + k, base + k1, mid + k, fx, 0.4, fz);
		b.triFacing(mid + k, base + k1, mid + k1, fx, 0.4, fz);
		b.triFacing(mid + k, mid + k1, top, fx * 0.3, 1, fz * 0.3);
	}
}

function addLiteTile (
	map: HexMap, layout: HexLayout, b: MeshBuilder, t: number, col: number, row: number, view?: Uint8Array
): void {
	const R = layout.size;
	const cx = layout.centerX(col, row);
	const cz = layout.centerZ(row);
	const terrain = map.terrain[t] as Terrain;
	const relief = map.relief[t] as Relief;
	const feature = map.feature[t] as Feature;
	const info = TERRAIN_INFO[terrain];
	const rim = map.rimHeight(t);
	const shade = map.shade[t];
	const fogged = !!view && view[t] === FOGGED;

	const forest = FEATURE_MIX[feature];
	const tint = relief !== Relief.Mountain && forest ? forestedKey(info.top, forest) : undefined;
	const key: PaletteKey = relief === Relief.Mountain ? "rock" : tint ?? info.top;
	const u = paletteU(shade);
	const v = paletteV(key, fogged);

	const i0 = b.vertexCount;
	for (let i = 0; i < 6; i++) b.vertex(cx + CORNER_X[i] * R, rim, cz + CORNER_Z[i] * R, 0, 1, 0, u, v);
	for (let i = 1; i < 5; i++) b.triFacing(i0, i0 + i, i0 + i + 1, 0, 1, 0);

	addWalls(map, layout, b, t, cx, cz, rim, shade, info.wall, view, fogged);

	if (relief === Relief.Mountain) {
		const rand = mulberry32(Math.imul(t + 1, 2654435761) ^ map.seed);
		const cold = terrain === Terrain.Tundra || terrain === Terrain.Snow;
		addPeak(b, cx, rim - 1, cz, R * 0.68, R * (1.1 + rand() * 0.55), 4, rand, cold ? 0.35 : 0.62, fogged);
	}
}

/** Walls from a tile's rim down to each lower neighbour, or to the floor at the map edge. */
function addWalls (
	map: HexMap, layout: HexLayout, b: MeshBuilder, t: number,
	cx: number, cz: number, rim: number, shade: number, wall: PaletteKey,
	view: Uint8Array | undefined, fogged: boolean, lip?: PaletteKey
): void {
	const R = layout.size;
	const wallV = paletteV(wall, fogged);
	const lipV = lip ? paletteV(lip, fogged) : 0;
	for (let i = 0; i < 6; i++) {
		const n = map.neighbor(t, i);
		const bottom = n < 0 ? FLOOR_HEIGHT : shownRim(map, view, n);
		if (bottom >= rim - 0.01) continue;

		const j = (i + 1) % 6;
		const ex = EDGE_X[i], ez = EDGE_Z[i];
		const ax = cx + CORNER_X[i] * R, az = cz + CORNER_Z[i] * R;
		const bx = cx + CORNER_X[j] * R, bz = cz + CORNER_Z[j] * R;
		// Darker toward the bottom, which reads as depth
		const uHigh = paletteU(shade * 0.85);
		const uLow = paletteU(shade * (n < 0 ? 0.45 : 0.6));
		let from = rim;
		if (lip) {
			// The turf's edge: a band of the top colour before the earth shows
			const band = Math.min(3.2, (rim - bottom) * 0.3);
			const a0 = b.vertex(ax, rim, az, ex, 0, ez, paletteU(shade * 0.82), lipV);
			const b0 = b.vertex(bx, rim, bz, ex, 0, ez, paletteU(shade * 0.82), lipV);
			const b1 = b.vertex(bx, rim - band, bz, ex, 0, ez, paletteU(shade * 0.68), lipV);
			const a1 = b.vertex(ax, rim - band, az, ex, 0, ez, paletteU(shade * 0.68), lipV);
			b.quadFacing(a0, b0, b1, a1, ex, 0, ez);
			from = rim - band;
		}
		const a0 = b.vertex(ax, from, az, ex, 0, ez, uHigh, wallV);
		const b0 = b.vertex(bx, from, bz, ex, 0, ez, uHigh, wallV);
		// Contact shadow where the wall meets lower ground
		b.tint(0.82);
		const b1 = b.vertex(bx, bottom, bz, ex, 0, ez, uLow, wallV);
		const a1 = b.vertex(ax, bottom, az, ex, 0, ez, uLow, wallV);
		b.tint(1);
		b.quadFacing(a0, b0, b1, a1, ex, 0, ez);
	}
}

function addTile (map: HexMap, layout: HexLayout, b: MeshBuilder, t: number, col: number, row: number, view?: Uint8Array): void {
	const R = layout.size;
	const cx = layout.centerX(col, row);
	const cz = layout.centerZ(row);
	const terrain = map.terrain[t] as Terrain;
	const relief = map.relief[t] as Relief;
	const info = TERRAIN_INFO[terrain];
	const water = info.water;
	const fogged = !!view && view[t] === FOGGED;

	const top = map.topHeight(t);
	const rim = top - (water ? WATER_BEVEL : LAND_BEVEL);
	const shade = map.shade[t];
	const topKey: PaletteKey = relief === Relief.Mountain ? "rock" : info.top;

	const [tr, tg, tb] = tileTint(map, t);
	b.tint(tr, tg, tb);
	const verts = addBevelledTop(
		b, cx, cz, R, top, rim, water ? WATER_INNER : LAND_INNER,
		paletteU(shade), paletteU(shade * (water ? WATER_RIM_SHADE : LAND_RIM_SHADE)), paletteV(topKey, fogged)
	);
	b.tint(1);
	if (water && terrain !== Terrain.Ice) {
		// Shallows and surf: water lightens toward land, and the rim along a shore is foam
		for (let k = 0; k < 6; k++) {
			const shoreA = isLand(map, map.neighbor(t, (k + 5) % 6)), shoreB = isLand(map, map.neighbor(t, k));
			if (!shoreA && !shoreB) continue;
			const both = shoreA && shoreB;
			const s = terrain === Terrain.Ocean ? 1 : 0.6;
			b.setColor(verts.inner + k, tr * (1 + 0.55 * s), tg * (1 + 0.38 * s), tb * (1 + 0.16 * s));
			b.setColor(verts.outer + k, tr * (both ? 2.7 : 2.3), tg * (both ? 1.95 : 1.75), tb * (both ? 1.5 : 1.4));
		}
	}
	addWalls(map, layout, b, t, cx, cz, rim, shade, info.wall, view, fogged, water ? undefined : topKey);

	if (water) return;

	const feature = map.feature[t] as Feature;
	if (relief === Relief.Mountain || relief === Relief.Hills || feature !== Feature.None) {
		const rand = mulberry32(Math.imul(t + 1, 2654435761) ^ map.seed);
		if (relief === Relief.Mountain) addMountain(b, cx, top, cz, R, rand, terrain, fogged);
		else if (relief === Relief.Hills) addHillMounds(b, cx, top, cz, R, rand, topKey, shade, fogged);
		if (feature !== Feature.None && relief !== Relief.Mountain) addTrees(b, cx, top, cz, R, rand, feature, fogged);
	}
	if (relief !== Relief.Mountain && feature === Feature.None) addGroundDetail(map, b, t, cx, top, cz, R, terrain, fogged);
}

/**
 * Small things on open ground: grass tufts and the odd flower on grassland
 * and plains, pebbles on desert and tundra. They sit toward the tile's
 * corners, clear of the centre (units, cities, buildings) and of the edge
 * midpoints (where roads run).
 */
function addGroundDetail (map: HexMap, b: MeshBuilder, t: number, cx: number, top: number, cz: number, R: number, terrain: Terrain, fogged: boolean): void {
	const rand = mulberry32(Math.imul(t + 11, 2654435761) ^ (map.seed * 3));
	const grassy = terrain === Terrain.Grassland || terrain === Terrain.Plains;
	const stony = terrain === Terrain.Desert || terrain === Terrain.Tundra;
	if (!grassy && !stony) return;
	const count = grassy ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);
	const first = Math.floor(rand() * 6);
	for (let k = 0; k < count; k++) {
		const corner = (first + k * 2 + (rand() < 0.3 ? 1 : 0)) % 6;
		const dist = R * (0.56 + rand() * 0.14);
		const x = cx + CORNER_X[corner] * dist + (rand() - 0.5) * R * 0.08;
		const z = cz + CORNER_Z[corner] * dist + (rand() - 0.5) * R * 0.08;
		if (grassy) {
			const key: PaletteKey = terrain === Terrain.Grassland ? "grassland" : "plains";
			addTuft(b, x, top, z, R * (0.12 + rand() * 0.05), rand, paletteU(1.08 + rand() * 0.16), paletteV(key, fogged));
			if (terrain === Terrain.Grassland && rand() < 0.35) {
				// A flower: a tiny bright cone on a blade
				const petals = [[1.3, 1.25, 0.55], [1.35, 1.3, 1.3], [1.5, 0.75, 0.7], [1.15, 0.95, 1.4]][Math.floor(rand() * 4)];
				b.tint(petals[0], petals[1], petals[2]);
				const fx = x + (rand() - 0.5) * R * 0.12, fz = z + (rand() - 0.5) * R * 0.12;
				addCone(b, fx, top + R * 0.07, fz, R * 0.04, R * 0.05, 5, rand() * Math.PI, paletteU(1.3), paletteV("snow", fogged));
				b.tint(1);
			}
		} else {
			const key: PaletteKey = terrain === Terrain.Desert ? "sand" : "rock";
			addCone(b, x, top - 0.5, z, R * (0.05 + rand() * 0.04), R * (0.04 + rand() * 0.04), 4, rand() * Math.PI, paletteU(0.9 + rand() * 0.2), paletteV(key, fogged));
		}
	}
}

/** A grass tuft: a few thin blades leaning outward. */
function addTuft (b: MeshBuilder, x: number, y: number, z: number, h: number, rand: () => number, u: number, v: number): void {
	const blades = 5;
	const base = h * 0.16;
	for (let k = 0; k < blades; k++) {
		const a = (k / blades) * Math.PI * 2 + rand() * 0.8;
		const lean = h * (0.25 + rand() * 0.35);
		const ox = Math.cos(a), oz = Math.sin(a);
		// Two base points across the blade, the tip leaning out
		const px = -oz * base, pz = ox * base;
		b.flatTri(
			x - px, y, z - pz,
			x + px, y, z + pz,
			x + ox * lean, y + h * (0.8 + rand() * 0.4), z + oz * lean,
			x - ox * h, y + h * 0.3, z - oz * h,
			u, v
		);
	}
}

/** A main rocky peak with a snow cap, and sometimes a smaller second peak. */
function addMountain (
	b: MeshBuilder, cx: number, top: number, cz: number, R: number, rand: () => number, terrain: Terrain, fogged: boolean
): void {
	const cold = terrain === Terrain.Tundra || terrain === Terrain.Snow;
	const height = R * (1.1 + rand() * 0.55);
	addPeak(b, cx, top - 2, cz, R * (0.62 + rand() * 0.1), height, 5, rand, cold ? 0.35 : 0.62, fogged);

	if (rand() < 0.6) {
		const angle = rand() * Math.PI * 2;
		const dist = R * 0.42;
		addPeak(
			b,
			cx + Math.cos(angle) * dist, top - 2, cz + Math.sin(angle) * dist,
			R * 0.36, height * (0.45 + rand() * 0.2), 5, rand, cold ? 0.4 : 0.75, fogged
		);
	}
}

/**
 * An irregular pyramid. Faces are split at `snowFrom` (fraction of the
 * height) into rock below and snow above.
 */
function addPeak (
	b: MeshBuilder,
	x: number, y: number, z: number,
	radius: number, height: number, sides: number,
	rand: () => number, snowFrom: number, fogged: boolean
): void {
	const ax = x + (rand() - 0.5) * radius * 0.3;
	const az = z + (rand() - 0.5) * radius * 0.3;
	const ay = y + height;
	const start = rand() * Math.PI * 2;
	const bx: number[] = [];
	const bz: number[] = [];
	for (let k = 0; k < sides; k++) {
		const a = start + (k / sides) * Math.PI * 2 + (rand() - 0.5) * 0.5;
		const r = radius * (0.85 + rand() * 0.3);
		bx.push(x + Math.cos(a) * r);
		bz.push(z + Math.sin(a) * r);
	}

	const ix = x, iy = y + height * 0.25, iz = z;
	const rockU = paletteU(0.95 + rand() * 0.1), rockV = paletteV("rock", fogged);
	const snowU = paletteU(1), snowV = paletteV("snowCap", fogged);
	const f = snowFrom;

	for (let k = 0; k < sides; k++) {
		const j = (k + 1) % sides;
		const mkx = bx[k] + (ax - bx[k]) * f, mky = y + (ay - y) * f, mkz = bz[k] + (az - bz[k]) * f;
		const mjx = bx[j] + (ax - bx[j]) * f, mjz = bz[j] + (az - bz[j]) * f;
		b.flatTri(bx[k], y, bz[k], bx[j], y, bz[j], mjx, mky, mjz, ix, iy, iz, rockU, rockV);
		b.flatTri(bx[k], y, bz[k], mjx, mky, mjz, mkx, mky, mkz, ix, iy, iz, rockU, rockV);
		b.flatTri(mkx, mky, mkz, mjx, mky, mjz, ax, ay, az, ix, iy, iz, snowU, snowV);
	}
}

/** Two low faceted mounds near the tile edge, leaving the centre clear for units and cities. */
function addHillMounds (
	b: MeshBuilder, cx: number, top: number, cz: number, R: number,
	rand: () => number, key: PaletteKey, shade: number, fogged: boolean
): void {
	const start = rand() * Math.PI * 2;
	for (let m = 0; m < 2; m++) {
		const angle = start + m * Math.PI + (rand() - 0.5) * 0.8;
		const dist = R * 0.5;
		addCone(
			b,
			cx + Math.cos(angle) * dist, top - 1, cz + Math.sin(angle) * dist,
			R * (0.22 + rand() * 0.08), R * (0.16 + rand() * 0.08), 6,
			rand() * Math.PI, paletteU(shade * 1.04), paletteV(key, fogged)
		);
	}
}

/** Texture coordinates for a palette colour at a shade, in whatever texture the mesh uses. */
export type ColorUv = (key: PaletteKey, shade: number) => [number, number];

const paletteUv: ColorUv = (key, shade) => [paletteU(shade), paletteV(key)];
const paletteUvFogged: ColorUv = (key, shade) => [paletteU(shade), paletteV(key, true)];

/** Three or four trees spaced around the tile centre. */
function addTrees (
	b: MeshBuilder, cx: number, top: number, cz: number, R: number, rand: () => number, feature: Feature, fogged: boolean
): void {
	const count = 3 + (rand() < 0.5 ? 1 : 0);
	const start = rand() * Math.PI * 2;
	const uv = fogged ? paletteUvFogged : paletteUv;

	for (let k = 0; k < count; k++) {
		const angle = start + (k / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
		const dist = R * (0.42 + rand() * 0.14);
		addTree(b, cx + Math.cos(angle) * dist, top - 0.5, cz + Math.sin(angle) * dist, R, 0.85 + rand() * 0.35, feature, rand, uv);
	}
}

/** One tree of a forest type standing on (x, y, z), sized relative to the tile radius R. */
export function addTree (
	b: MeshBuilder, x: number, y: number, z: number, R: number, scale: number,
	feature: Feature, rand: () => number, uv: ColorUv
): void {
	const rot = rand() * Math.PI;
	if (feature === Feature.Pine) {
		const [u, v] = uv("pine", 0.9 + rand() * 0.2);
		addCone(b, x, y, z, R * 0.19 * scale, R * 0.48 * scale, 5, rot, u, v);
		addCone(b, x, y + R * 0.26 * scale, z, R * 0.13 * scale, R * 0.42 * scale, 5, rot + 0.6, u, v);
	} else if (feature === Feature.Jungle) {
		const [u, v] = uv("jungle", 0.9 + rand() * 0.25);
		addBicone(b, x, y, z, R * 0.22 * scale, R * 0.3 * scale, R * 0.72 * scale, 5, rot, u, v);
	} else {
		const [u, v] = uv("forest", 0.88 + rand() * 0.25);
		addCone(b, x, y, z, R * 0.18 * scale, R * 0.62 * scale, 5, rot, u, v);
	}
}

/** Flat-shaded cone (open base) standing on (x, y, z). */
function addCone (
	b: MeshBuilder, x: number, y: number, z: number,
	radius: number, height: number, sides: number, rotation: number, u: number, v: number
): void {
	const ay = y + height;
	const iy = y + height * 0.3;
	for (let k = 0; k < sides; k++) {
		const a0 = rotation + (k / sides) * Math.PI * 2;
		const a1 = rotation + ((k + 1) / sides) * Math.PI * 2;
		b.flatTri(
			x + Math.cos(a0) * radius, y, z + Math.sin(a0) * radius,
			x + Math.cos(a1) * radius, y, z + Math.sin(a1) * radius,
			x, ay, z,
			x, iy, z,
			u, v
		);
	}
}

/** Two cones joined at their widest ring: a stylised broadleaf canopy. */
function addBicone (
	b: MeshBuilder, x: number, y: number, z: number,
	radius: number, ringHeight: number, height: number, sides: number, rotation: number, u: number, v: number
): void {
	const ry = y + ringHeight;
	const ay = y + height;
	for (let k = 0; k < sides; k++) {
		const a0 = rotation + (k / sides) * Math.PI * 2;
		const a1 = rotation + ((k + 1) / sides) * Math.PI * 2;
		const x0 = x + Math.cos(a0) * radius, z0 = z + Math.sin(a0) * radius;
		const x1 = x + Math.cos(a1) * radius, z1 = z + Math.sin(a1) * radius;
		b.flatTri(x0, ry, z0, x1, ry, z1, x, ay, z, x, ry, z, u, v);
		b.flatTri(x0, ry, z0, x1, ry, z1, x, y, z, x, ry, z, u, v);
	}
}
