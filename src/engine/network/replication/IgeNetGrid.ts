const OFFSET = 524288;
const STRIDE = 1048576;

/**
 * A uniform grid over the ground plane: objects sit in the cell their position is in, and a query
 * for a circle visits only the cells it touches. An object's cell changes only when it crosses a
 * cell border, so keeping the grid up to date costs a division and a compare per move.
 * @example #Find what's near
 *     const grid = new IgeNetGrid<Ship>(1000);
 *     grid.add(ship, 120, 4300);
 *     grid.move(ship, 980, 4300);
 *     const near = grid.query(0, 4000, 2200, []);
 */
export class IgeNetGrid<T extends { _cell: number }> {
	readonly cellSize: number;
	/** Cell key to the objects in it. */
	readonly cells: Map<number, Set<T>> = new Map();
	size = 0;
	/** Cell changes made, for tests and stats. */
	moves = 0;

	constructor (cellSize: number) {
		if (!(cellSize > 0)) throw new Error("cellSize must be above 0");
		this.cellSize = cellSize;
	}

	cellOf (x: number, z: number): number {
		const cx = Math.floor(x / this.cellSize), cz = Math.floor(z / this.cellSize);
		return ((cx < -OFFSET ? -OFFSET : cx >= OFFSET ? OFFSET - 1 : cx) + OFFSET) * STRIDE + ((cz < -OFFSET ? -OFFSET : cz >= OFFSET ? OFFSET - 1 : cz) + OFFSET);
	}

	add (obj: T, x: number, z: number): void {
		const key = this.cellOf(x, z);
		obj._cell = key;
		let cell = this.cells.get(key);
		if (!cell) this.cells.set(key, (cell = new Set()));
		cell.add(obj);
		this.size++;
	}

	/** Moves an object to where it is now. Returns whether it changed cell (false: nothing was done). */
	move (obj: T, x: number, z: number): boolean {
		const key = this.cellOf(x, z);
		if (key === obj._cell) return false;
		this._take(obj);
		let cell = this.cells.get(key);
		if (!cell) this.cells.set(key, (cell = new Set()));
		cell.add(obj);
		obj._cell = key;
		this.moves++;
		return true;
	}

	remove (obj: T): void {
		if (this._take(obj)) this.size--;
	}

	_take (obj: T): boolean {
		const cell = this.cells.get(obj._cell);
		if (!cell || !cell.delete(obj)) return false;
		if (!cell.size) this.cells.delete(obj._cell);
		return true;
	}

	/** Pushes every object in the cells that touch the circle into `out` (a superset of those within it: filter by distance). */
	query (x: number, z: number, radius: number, out: T[]): T[] {
		const size = this.cellSize;
		const x0 = Math.floor((x - radius) / size), x1 = Math.floor((x + radius) / size);
		const z0 = Math.floor((z - radius) / size), z1 = Math.floor((z + radius) / size);
		const r2 = radius * radius;
		for (let cx = x0; cx <= x1; cx++) {
			// Distance from the point to the cell's rectangle, to leave out the corners
			const nearX = cx * size > x ? cx * size - x : (cx + 1) * size < x ? x - (cx + 1) * size : 0;
			for (let cz = z0; cz <= z1; cz++) {
				const nearZ = cz * size > z ? cz * size - z : (cz + 1) * size < z ? z - (cz + 1) * size : 0;
				if (nearX * nearX + nearZ * nearZ > r2) continue;
				const cell = this.cells.get((Math.max(-OFFSET, Math.min(OFFSET - 1, cx)) + OFFSET) * STRIDE + (Math.max(-OFFSET, Math.min(OFFSET - 1, cz)) + OFFSET));
				if (cell) for (const obj of cell) out.push(obj);
			}
		}
		return out;
	}

	/** How many cells a query of this radius touches. */
	cellsFor (radius: number): number {
		const n = Math.floor((2 * radius) / this.cellSize) + 2;
		return n * n;
	}
}
