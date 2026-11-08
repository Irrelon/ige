import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { CORNER_X, CORNER_Z, type HexLayout } from "./hex";
import type { HexMap } from "./mapGen";
import { MeshBuilder } from "./meshBuilder";
import { UNEXPLORED } from "./fog";
import type { TerrainSurface } from "./surface";

/**
 * Placeholder geometry. Each shape is created once and shared by id, so the
 * renderer draws every unit of a type with one instanced call and gives each
 * instance its own colour.
 */

/** Unit cube centred on the origin (1 x 1 x 1). */
export const CUBE = IgePrimitiveGeometry.createCube(1, "hexRealms_cube");

/** Sphere of diameter 1 centred on the origin. */
export const ORB = IgePrimitiveGeometry.createSphere(0.5, 18, 12, "hexRealms_orb");

/** Square pyramid with its 1 x 1 base on y = 0 and apex at y = 1. */
export const PYRAMID = createPyramid("hexRealms_pyramid");

function createPyramid (id: string): IgeGeometryData3d {
	const b = new MeshBuilder();
	const c = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
	for (let k = 0; k < 4; k++) {
		const [x0, z0] = c[k];
		const [x1, z1] = c[(k + 1) % 4];
		b.flatTri(x0, 0, z0, x1, 0, z1, 0, 1, 0, 0, 0.25, 0, 0, 0);
	}
	// Base
	b.flatTri(-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0, 0, 0);
	b.flatTri(-0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0, 0, 0);
	return b.toGeometry(id);
}

/** Flat hexagonal ring between two radii, lying on y = 0 (for hover/selection outlines). */
export function createHexRing (id: string, outer: number, inner: number): IgeGeometryData3d {
	const b = new MeshBuilder();
	for (let i = 0; i < 6; i++) b.vertex(CORNER_X[i] * outer, 0, CORNER_Z[i] * outer, 0, 1, 0, 0, 0);
	for (let i = 0; i < 6; i++) b.vertex(CORNER_X[i] * inner, 0, CORNER_Z[i] * inner, 0, 1, 0, 0, 0);
	for (let i = 0; i < 6; i++) {
		const j = (i + 1) % 6;
		b.quadFacing(i, j, 6 + j, 6 + i, 0, 1, 0);
	}
	return b.toGeometry(id);
}

/** Flat hexagon on y = 0 (for movement range markers). */
export function createHexDisc (id: string, radius: number): IgeGeometryData3d {
	const b = new MeshBuilder();
	for (let i = 0; i < 6; i++) b.vertex(CORNER_X[i] * radius, 0, CORNER_Z[i] * radius, 0, 1, 0, 0, 0);
	for (let i = 1; i < 5; i++) b.triFacing(0, i, i + 1, 0, 1, 0);
	return b.toGeometry(id);
}

/**
 * Territory border for one player: a strip along every edge of their land
 * that faces a tile they don't own. On natural terrain each edge is split
 * into segments that follow the ground. Only tiles the viewer has explored
 * get a border (`view`). Returns null if there is nothing to draw.
 */
export function buildBorderGeometry (
	map: HexMap, layout: HexLayout, player: number, id: string, surface: TerrainSurface,
	ownedTiles: number[], view?: Uint8Array
): IgeGeometryData3d | null {
	const b = new MeshBuilder();
	const R = layout.size;
	const outer = R * 0.97;
	const inner = R * 0.8;
	const natural = surface.style === "natural";
	const segments = natural ? 4 : 1;
	const lift = natural ? 2.5 : 1.2;

	for (const t of ownedTiles) {
		if (view && view[t] === UNEXPLORED) continue;
		const col = map.col(t);
		const row = map.row(t);
		const cx = layout.centerX(col, row);
		const cz = layout.centerZ(row);
		const flatY = surface.tileHeight(t) + lift;
		const yAt = (x: number, z: number) => (natural ? surface.heightAt(x, z) + lift : flatY);

		for (let i = 0; i < 6; i++) {
			const n = map.neighbor(t, i);
			if (n >= 0 && map.owner[n] === player) continue;
			const j = (i + 1) % 6;
			let prevOuter = -1;
			let prevInner = -1;
			for (let s = 0; s <= segments; s++) {
				const f = s / segments;
				const ux = CORNER_X[i] + (CORNER_X[j] - CORNER_X[i]) * f;
				const uz = CORNER_Z[i] + (CORNER_Z[j] - CORNER_Z[i]) * f;
				const ox = cx + ux * outer, oz = cz + uz * outer;
				const ix = cx + ux * inner, iz = cz + uz * inner;
				const o = b.vertex(ox, yAt(ox, oz), oz, 0, 1, 0, 0, 0);
				const k = b.vertex(ix, yAt(ix, iz), iz, 0, 1, 0, 0, 0);
				if (prevOuter >= 0) b.quadFacing(prevOuter, o, k, prevInner, 0, 1, 0);
				prevOuter = o;
				prevInner = k;
			}
		}
	}

	return b.vertexCount > 0 ? b.toGeometry(id) : null;
}
