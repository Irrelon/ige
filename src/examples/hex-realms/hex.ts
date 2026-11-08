/**
 * Hex grid maths for pointy-top hexagons stored in "odd-r" offset
 * coordinates (odd rows are shifted half a tile to the right), which keeps
 * the map a rectangle of `width` columns by `height` rows.
 *
 * World space: the map lies on the XZ plane with Y up. Columns run along +X
 * and rows along +Z, so row 0 is the top ("north") edge of the map.
 *
 * Corner i of a hex sits at angle (60i - 30) degrees measured from +X
 * toward +Z. Edge i joins corners i and i + 1 and faces angle 60i, which is
 * the direction of neighbour i: E, SE, SW, W, NW, NE.
 */

export const SQRT3 = Math.sqrt(3);

/** Unit-radius corner offsets, indexed by corner. */
export const CORNER_X = new Float64Array(6);
export const CORNER_Z = new Float64Array(6);
/** Outward unit normal of each edge, indexed by edge (= neighbour direction). */
export const EDGE_X = new Float64Array(6);
export const EDGE_Z = new Float64Array(6);

for (let i = 0; i < 6; i++) {
	const corner = ((60 * i - 30) * Math.PI) / 180;
	CORNER_X[i] = Math.cos(corner);
	CORNER_Z[i] = Math.sin(corner);
	const edge = (60 * i * Math.PI) / 180;
	EDGE_X[i] = Math.cos(edge);
	EDGE_Z[i] = Math.sin(edge);
}

/** Neighbour offsets [dCol, dRow] in odd-r coordinates, indexed [row parity][direction]. */
export const ODD_R_NEIGHBOURS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
	[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]],
	[[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]
];

export function offsetToAxialQ (col: number, row: number): number {
	return col - (row - (row & 1)) / 2;
}

/** Hex distance (number of steps) between two offset coordinates. */
export function hexDistance (col1: number, row1: number, col2: number, row2: number): number {
	const q1 = offsetToAxialQ(col1, row1);
	const q2 = offsetToAxialQ(col2, row2);
	const dq = q1 - q2;
	const dr = row1 - row2;
	return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Converts between offset tile coordinates and world positions. */
export class HexLayout {
	/** Centre to corner distance in world units. */
	readonly size: number;
	/** Distance between the centres of horizontally adjacent tiles. */
	readonly colSpacing: number;
	/** Distance between the centres of adjacent rows. */
	readonly rowSpacing: number;

	constructor (size: number) {
		this.size = size;
		this.colSpacing = size * SQRT3;
		this.rowSpacing = size * 1.5;
	}

	centerX (col: number, row: number): number {
		return this.colSpacing * (col + 0.5 * (row & 1));
	}

	centerZ (row: number): number {
		return this.rowSpacing * row;
	}

	/** The tile containing a world point (may be outside the map). */
	worldToOffset (x: number, z: number, out: { col: number; row: number }): { col: number; row: number } {
		const qf = ((SQRT3 / 3) * x - z / 3) / this.size;
		const rf = ((2 / 3) * z) / this.size;
		const sf = -qf - rf;
		let q = Math.round(qf);
		let r = Math.round(rf);
		const s = Math.round(sf);
		const dq = Math.abs(q - qf);
		const dr = Math.abs(r - rf);
		const ds = Math.abs(s - sf);
		if (dq > dr && dq > ds) q = -r - s;
		else if (dr > ds) r = -q - s;

		out.col = q + (r - (r & 1)) / 2;
		out.row = r;
		return out;
	}
}
