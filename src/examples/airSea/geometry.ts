import type { IgeWater3d } from "@/engine/physics/IgeWater3d";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

export { createBox, createFlatRects, createWheel } from "../vehicles/geometry";

/**
 * A sea surface: a square grid of rest points, fine in the middle and
 * coarser towards the edge, moved every frame to the shared wave function
 * (water.surfaceAt()), so what's drawn is what boats float on. The grid
 * follows the camera in whole steps of its coarsest spacing, so each rest
 * point stays put in the world and the waves don't swim. Towards the edge
 * the waves fade to the level, to meet a flat far sea.
 */
export class SeaGrid {
	geometry: IgeGeometryData3d;
	/** Rest offsets from the grid's centre along each axis (IGE units). */
	offsets: Float32Array;
	/** The coarsest spacing: the grid moves in steps of it. */
	step: number;
	radius: number;
	centreX: number = NaN;
	centreZ: number = NaN;
	_p = { x: 0, y: 0, z: 0 };
	_n = { x: 0, y: 1, z: 0 };

	/** half: vertices from the middle to an edge; spacing: between the middle ones; stretch: how much coarser the edge gets. */
	constructor (half: number, spacing: number, stretch: number, id: string) {
		const side = half * 2 + 1;
		this.offsets = new Float32Array(side);
		for (let i = -half; i <= half; i++) {
			const k = Math.abs(i) / half;
			this.offsets[i + half] = Math.sign(i) * spacing * Math.abs(i) * (1 + stretch * k * k);
		}
		this.radius = this.offsets[side - 1];
		this.step = Math.ceil((this.offsets[side - 1] - this.offsets[side - 2]) / spacing) * spacing;
		const count = side * side;
		const indices = count > 65535 ? new Uint32Array((side - 1) * (side - 1) * 6) : new Uint16Array((side - 1) * (side - 1) * 6);
		let k = 0;
		for (let j = 0; j < side - 1; j++) {
			for (let i = 0; i < side - 1; i++) {
				// Counter-clockwise seen from above
				const a = j * side + i, b = a + 1, c = a + side, d = c + 1;
				indices[k++] = a; indices[k++] = c; indices[k++] = b;
				indices[k++] = b; indices[k++] = c; indices[k++] = d;
			}
		}
		const r = this.radius;
		this.geometry = {
			id,
			type: "primitive",
			vertices: new Float32Array(count * 3),
			normals: new Float32Array(count * 3),
			indices,
			boundingBox: { min: [-r * 1.05, -500, -r * 1.05], max: [r * 1.05, 500, r * 1.05] }
		};
	}

	/**
	 * Move the grid's rest points round (x, z) and pose it at time t. Returns
	 * the grid's centre, where its entity goes.
	 */
	update (water: IgeWater3d, x: number, z: number, t: number): { x: number; z: number } {
		const cx = Math.round(x / this.step) * this.step, cz = Math.round(z / this.step) * this.step;
		this.centreX = cx; this.centreZ = cz;
		const offsets = this.offsets, side = offsets.length, r = this.radius;
		const vertices = this.geometry.vertices!, normals = this.geometry.normals!;
		const level = water.level;
		const p = this._p, n = this._n;
		let v = 0;
		for (let j = 0; j < side; j++) {
			const oz = offsets[j];
			for (let i = 0; i < side; i++) {
				const ox = offsets[i];
				// Fade the waves out towards the edge, to meet the flat far sea
				const edge = Math.max(Math.abs(ox), Math.abs(oz)) / r;
				const fade = edge < 0.55 ? 1 : edge > 0.95 ? 0 : 1 - (edge - 0.55) / 0.4;
				water.surfaceAt(cx + ox, cz + oz, t, p, n);
				if (!Number.isFinite(p.y)) { p.x = cx + ox; p.y = level; p.z = cz + oz; n.x = 0; n.y = 1; n.z = 0; }
				vertices[v] = (p.x - cx - ox) * fade + ox;
				vertices[v + 1] = (p.y - level) * fade + level;
				vertices[v + 2] = (p.z - cz - oz) * fade + oz;
				const nx = n.x * fade, ny = n.y * fade + (1 - fade), nz = n.z * fade;
				const len = Math.hypot(nx, ny, nz) || 1;
				normals[v] = nx / len; normals[v + 1] = ny / len; normals[v + 2] = nz / len;
				v += 3;
			}
		}
		return { x: cx, z: cz };
	}
}
