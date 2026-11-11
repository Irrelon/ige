import type { MeshBuilder } from "./meshBuilder";
import { type PaletteKey, paletteU, paletteV } from "./palette";

/**
 * The terrain's decorations in the blocky art pack: Minecraft-style trees,
 * stepped stone mountains, rocks and cloud puffs made of boxes, baked into
 * the terrain chunks like their smooth low-poly counterparts. Sizes are
 * relative to the tile radius R.
 */

/** Texture coordinates for a palette colour at a shade (the same as chunkMesh's ColorUv). */
type ColorUv = (key: PaletteKey, shade: number) => [number, number];

/** Brightness of a box's top relative to its sides (the light does the rest). */
const TOP = 1.1;

/**
 * A box standing on (x, y, z), w x h x d, turned `rot` about the vertical:
 * a top and four sides (nothing underneath), flat-shaded.
 */
export function addBox (
	b: MeshBuilder, x: number, y: number, z: number, w: number, h: number, d: number, rot: number,
	uSide: number, uTop: number, v: number
): void {
	const c = Math.cos(rot), s = Math.sin(rot);
	const hw = w / 2, hd = d / 2;
	const lx = [-hw, hw, hw, -hw], lz = [-hd, -hd, hd, hd];
	const px: number[] = [], pz: number[] = [];
	for (let i = 0; i < 4; i++) {
		px.push(x + lx[i] * c + lz[i] * s);
		pz.push(z - lx[i] * s + lz[i] * c);
	}
	const top = y + h;
	const t0 = b.vertex(px[0], top, pz[0], 0, 1, 0, uTop, v);
	b.vertex(px[1], top, pz[1], 0, 1, 0, uTop, v);
	b.vertex(px[2], top, pz[2], 0, 1, 0, uTop, v);
	b.vertex(px[3], top, pz[3], 0, 1, 0, uTop, v);
	b.quadFacing(t0, t0 + 1, t0 + 2, t0 + 3, 0, 1, 0);
	// Side i runs from corner i to corner i + 1; its outward normal, turned with the box
	const NX = [0, 1, 0, -1], NZ = [-1, 0, 1, 0];
	for (let i = 0; i < 4; i++) {
		const j = (i + 1) % 4;
		const nx = NX[i] * c + NZ[i] * s, nz = -NX[i] * s + NZ[i] * c;
		const a = b.vertex(px[i], top, pz[i], nx, 0, nz, uSide, v);
		b.vertex(px[j], top, pz[j], nx, 0, nz, uSide, v);
		b.vertex(px[j], y, pz[j], nx, 0, nz, uSide, v);
		b.vertex(px[i], y, pz[i], nx, 0, nz, uSide, v);
		b.quadFacing(a, a + 1, a + 2, a + 3, nx, 0, nz);
	}
}

/** A box coloured from one palette row: sides at `shade`, top a little brighter. */
function block (b: MeshBuilder, x: number, y: number, z: number, w: number, h: number, d: number, rot: number, key: PaletteKey, shade: number, uv: ColorUv): void {
	const [u, v] = uv(key, shade);
	const [uTop] = uv(key, shade * TOP);
	addBox(b, x, y, z, w, h, d, rot, u, uTop, v);
}

/**
 * A blocky tree of a forest type standing on (x, y, z): a broadleaf is a
 * trunk under a leafy cube and a smaller cap, a pine is stacked tiers
 * narrowing to a tip, a jungle tree is a tall trunk under a wide flat
 * canopy with leaves hanging off its sides.
 */
export function addBlockyTree (
	b: MeshBuilder, x: number, y: number, z: number, R: number, scale: number,
	kind: "forest" | "pine" | "jungle", rand: () => number, uv: ColorUv
): void {
	const k = R * scale;
	// Mostly square to the map, a little turned, so a forest doesn't look planted in rows
	const rot = (rand() - 0.5) * 0.7;
	const shade = 0.86 + rand() * 0.2;
	// Each tree a touch warmer or cooler, so a forest isn't one flat green
	const warm = (rand() - 0.5) * 0.16;
	b.tint(1 + warm, 1, 1 - warm * 0.6);
	if (kind === "pine") {
		block(b, x, y, z, k * 0.07, k * 0.16, k * 0.07, rot, "trunk", 1, uv);
		const tiers = [0.36, 0.27, 0.18];
		let ty = y + k * 0.1;
		tiers.forEach((w, i) => {
			const h = k * (0.15 - i * 0.015);
			block(b, x, ty, z, k * w, h, k * w, rot, "blockPine", shade * (i % 2 ? 1.06 : 0.96), uv);
			ty += h;
		});
		block(b, x, ty, z, k * 0.08, k * 0.09, k * 0.08, rot, "blockPine", shade * 1.1, uv);
	} else if (kind === "jungle") {
		const trunk = k * (0.4 + rand() * 0.08);
		block(b, x, y, z, k * 0.075, trunk, k * 0.075, rot, "trunk", 0.95, uv);
		block(b, x, y + trunk - k * 0.02, z, k * 0.42, k * 0.1, k * 0.42, rot, "blockJungle", shade, uv);
		block(b, x, y + trunk + k * 0.08, z, k * 0.24, k * 0.08, k * 0.24, rot, "blockJungle", shade * 1.08, uv);
		// Leaves hanging off two sides of the canopy
		const c = Math.cos(rot), s = Math.sin(rot);
		const side = rand() < 0.5 ? 1 : -1;
		for (const [lx, lz] of [[0.19 * side, 0.07], [-0.07, -0.19 * side]]) {
			block(b, x + (lx * c + lz * s) * k, y + trunk - k * 0.1, z + (-lx * s + lz * c) * k, k * 0.07, k * 0.09, k * 0.07, rot, "blockJungle", shade * 0.9, uv);
		}
	} else {
		const c = Math.cos(rot), s = Math.sin(rot);
		const off = (lx: number, lz: number): [number, number] => [x + (lx * c + lz * s) * k, z + (-lx * s + lz * c) * k];
		const tall = rand() < 0.35;
		const trunk = k * (tall ? 0.32 : 0.22);
		block(b, x, y, z, k * 0.08, trunk + k * 0.04, k * 0.08, rot, "trunk", 1, uv);
		const w = k * (tall ? 0.27 : 0.32 + rand() * 0.04), h = k * (tall ? 0.3 : 0.22);
		block(b, x, y + trunk, z, w, h, w, rot, "blockLeaf", shade, uv);
		block(b, x, y + trunk + h, z, w * 0.62, k * 0.09, w * 0.62, rot, "blockLeaf", shade * 1.07, uv);
		// A bushy tree has a smaller clump of leaves off one side
		if (!tall && rand() < 0.45) {
			const [bx, bz] = off(0.17 * (rand() < 0.5 ? 1 : -1), 0.06);
			block(b, bx, y + trunk + k * 0.03, bz, k * 0.15, k * 0.14, k * 0.15, rot, "blockLeaf", shade * 0.94, uv);
		}
		// The odd apple or blossom
		if (rand() < 0.3) {
			const [ax, az] = off(0.08, w / k / 2 + 0.005);
			block(b, ax, y + trunk + h * 0.45, az, k * 0.045, k * 0.045, k * 0.02, rot, "blossom", 1, uv);
		}
	}
	b.tint(1);
}

/**
 * Steps of stone per column of a mountain's grid (0 = no column): heights
 * fall away from a main peak, and sometimes a lower second one, rounded to
 * whole steps with a little roughness.
 */
function mountainLevels (R: number, cell: number, step: number, rand: () => number): { n: number; size: number; levels: Int32Array; top: number } {
	const reach = R * 0.74;
	const n = Math.ceil(reach / cell);
	const size = n * 2 + 1;
	const height = R * (1.05 + rand() * 0.45);
	const peakX = (rand() - 0.5) * R * 0.2, peakZ = (rand() - 0.5) * R * 0.2;
	const twin = rand() < 0.6;
	const ta = rand() * Math.PI * 2;
	const twinX = Math.cos(ta) * R * 0.42, twinZ = Math.sin(ta) * R * 0.42;
	const twinH = twin ? height * (0.45 + rand() * 0.2) : 0;
	const levels = new Int32Array(size * size);
	let top = 0;
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			const lx = (i - n) * cell, lz = (j - n) * cell;
			if (Math.hypot(lx, lz) > reach + cell * (rand() - 0.5) * 0.8) continue;
			const main = height * Math.max(0, 1 - Math.hypot(lx - peakX, lz - peakZ) / reach) ** 1.15;
			const second = twinH * Math.max(0, 1 - Math.hypot(lx - twinX, lz - twinZ) / (R * 0.4));
			const level = Math.max(1, Math.round((Math.max(main, second) + (rand() - 0.5) * step * 0.45) / step));
			levels[i * size + j] = level;
			top = Math.max(top, level);
		}
	}
	return { n, size, levels, top };
}

/**
 * A mountain built from stone columns on a square grid (turned to suit the
 * tile): heights fall away from one or two peaks in whole steps, so the
 * slopes are stairs. Only what can be seen is built: each column's top,
 * and the parts of its sides that stand above its neighbours. The upper
 * steps are snow, with a snowy lip on the stone below.
 */
export function addBlockyMountain (
	b: MeshBuilder, cx: number, y: number, cz: number, R: number, rand: () => number,
	cold: boolean, uv: ColorUv, cellFrac = 0.21
): void {
	const cell = R * cellFrac;
	const step = cell * 0.82;
	const rot = rand() * Math.PI * 0.5;
	const { n, size, levels, top } = mountainLevels(R, cell, step, rand);
	const snowFrom = Math.max(2, Math.ceil(top * (cold ? 0.4 : 0.68)));
	const c = Math.cos(rot), s = Math.sin(rot);
	const at = (lx: number, lz: number): [number, number] => [cx + lx * c + lz * s, cz - lx * s + lz * c];
	// Directions to the four neighbours, and the corners of the side facing each
	const DI = [0, 1, 0, -1], DJ = [-1, 0, 1, 0];
	const CX = [-0.5, 0.5, 0.5, -0.5], CZ = [-0.5, -0.5, 0.5, 0.5];

	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			const level = levels[i * size + j];
			if (!level) continue;
			const lx = (i - n) * cell, lz = (j - n) * cell;
			const yTop = y + level * step;
			const snowy = level >= snowFrom;
			const shade = 0.95 + rand() * 0.1;
			const [rockU, rockV] = uv("rock", shade);
			const [snowU, snowV] = uv("snowCap", 1.02);
			const [topU] = uv("rock", shade * TOP);
			// Top
			const t0 = b.vertexCount;
			for (let k = 0; k < 4; k++) {
				const [px, pz] = at(lx + CX[k] * cell, lz + CZ[k] * cell);
				b.vertex(px, yTop, pz, 0, 1, 0, snowy ? snowU : topU, snowy ? snowV : rockV);
			}
			b.quadFacing(t0, t0 + 1, t0 + 2, t0 + 3, 0, 1, 0);
			// Sides, from the neighbour's top (or the ground) up
			for (let k = 0; k < 4; k++) {
				const ni = i + DI[k], nj = j + DJ[k];
				const below = ni >= 0 && nj >= 0 && ni < size && nj < size ? levels[ni * size + nj] : 0;
				if (below >= level) continue;
				const kk = (k + 1) % 4;
				const [ax, az] = at(lx + CX[k] * cell, lz + CZ[k] * cell);
				const [bx, bz] = at(lx + CX[kk] * cell, lz + CZ[kk] * cell);
				const nx = DI[k] * c + DJ[k] * s, nz = -DI[k] * s + DJ[k] * c;
				const from = y + below * step;
				const lip = snowy ? Math.min(step * 0.3, yTop - from) : 0;
				const quad = (y0: number, y1: number, u: number, v: number) => {
					const q = b.vertex(ax, y1, az, nx, 0, nz, u, v);
					b.vertex(bx, y1, bz, nx, 0, nz, u, v);
					b.vertex(bx, y0, bz, nx, 0, nz, u, v);
					b.vertex(ax, y0, az, nx, 0, nz, u, v);
					b.quadFacing(q, q + 1, q + 2, q + 3, nx, 0, nz);
				};
				if (lip > 0) quad(yTop - lip, yTop, snowU, snowV);
				if (yTop - lip > from) quad(from, yTop - lip, rockU, rockV);
			}
		}
	}
}

/** A small stone (or sand) block, half sunk into the ground. */
export function addBlockyRock (b: MeshBuilder, x: number, y: number, z: number, size: number, rand: () => number, key: PaletteKey, uv: ColorUv): void {
	const rot = rand() * Math.PI * 0.5;
	const shade = 0.88 + rand() * 0.2;
	block(b, x, y - size * 0.3, z, size, size * (0.7 + rand() * 0.4), size * (0.8 + rand() * 0.3), rot, key, shade, uv);
	if (rand() < 0.4) block(b, x + size * 0.55, y - size * 0.3, z + size * 0.2, size * 0.5, size * 0.6, size * 0.5, rot, key, shade * 0.95, uv);
}

/** A flower: a thin stalk and a cube of colour (tinted by the caller). */
export function addBlockyFlower (b: MeshBuilder, x: number, y: number, z: number, size: number, uv: ColorUv, head: [number, number, number]): void {
	block(b, x, y, z, size * 0.25, size * 1.2, size * 0.25, 0, "blockLeaf", 0.85, uv);
	b.tint(head[0], head[1], head[2]);
	block(b, x, y + size * 1.1, z, size * 0.75, size * 0.6, size * 0.75, 0.3, "snow", 1.05, uv);
	b.tint(1);
}

/**
 * The blocky pack's clouds over one unexplored tile: cloud blocks on a
 * world-aligned grid, their heights in whole steps from smooth noise, so
 * the clouds of neighbouring tiles join into one stepped blanket like
 * Minecraft's. `mine` says whether a grid cell belongs to this tile (its
 * centre lies in it); `level` is a cell's steps (0 over explored ground).
 * Only tops and the sides standing above a neighbour are built.
 */
export function addCloudBlocks (
	b: MeshBuilder, cell: number, base: number, step: number,
	gi0: number, gi1: number, gj0: number, gj1: number,
	mine: (gi: number, gj: number) => boolean, level: (gi: number, gj: number) => number,
	uSide: number, uTop: number, v: number
): void {
	const DI = [0, 1, 0, -1], DJ = [-1, 0, 1, 0];
	const CX = [0, 1, 1, 0], CZ = [0, 0, 1, 1];
	for (let gi = gi0; gi <= gi1; gi++) {
		for (let gj = gj0; gj <= gj1; gj++) {
			if (!mine(gi, gj)) continue;
			const l = level(gi, gj);
			if (l <= 0) continue;
			const x0 = gi * cell, z0 = gj * cell;
			const top = base + l * step;
			const t0 = b.vertexCount;
			for (let k = 0; k < 4; k++) b.vertex(x0 + CX[k] * cell, top, z0 + CZ[k] * cell, 0, 1, 0, uTop, v);
			b.quadFacing(t0, t0 + 1, t0 + 2, t0 + 3, 0, 1, 0);
			for (let k = 0; k < 4; k++) {
				const below = level(gi + DI[k], gj + DJ[k]);
				if (below >= l) continue;
				const kk = (k + 1) % 4;
				const ax = x0 + CX[k] * cell, az = z0 + CZ[k] * cell, bx = x0 + CX[kk] * cell, bz = z0 + CZ[kk] * cell;
				const y0 = base + below * step;
				const q = b.vertex(ax, top, az, DI[k], 0, DJ[k], uSide, v);
				b.vertex(bx, top, bz, DI[k], 0, DJ[k], uSide, v);
				b.vertex(bx, y0, bz, DI[k], 0, DJ[k], uSide, v);
				b.vertex(ax, y0, az, DI[k], 0, DJ[k], uSide, v);
				b.quadFacing(q, q + 1, q + 2, q + 3, DI[k], 0, DJ[k]);
			}
		}
	}
}

/** Palette coordinates for blocky clouds: sides a shade darker than tops. */
export function cloudUv (fogged = false): { side: number; top: number; v: number } {
	return { side: paletteU(0.93), top: paletteU(1.03), v: paletteV("cloud", fogged) };
}
