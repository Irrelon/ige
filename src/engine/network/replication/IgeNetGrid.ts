// Cell coordinates are kept within +-16383 so a cell's key is a small integer (a fast map key)
const OFFSET = 16384;
const STRIDE = 32768;
const LIMIT = OFFSET - 1;

/** What a grid holds: it keeps the object's cell and its place in the cell on the object, so a move costs no lookups. */
export interface IgeNetGridMember {
	_cell: number;
	_cellIdx: number;
}

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
export class IgeNetGrid<T extends IgeNetGridMember> {
	readonly cellSize: number;
	/** Cell key to the objects in it. */
	readonly cells: Map<number, T[]> = new Map();
	size = 0;
	/** Cell changes made, for tests and stats. */
	moves = 0;
	_inv: number;

	constructor (cellSize: number) {
		if (!(cellSize > 0)) throw new Error("cellSize must be above 0");
		this.cellSize = cellSize;
		this._inv = 1 / cellSize;
	}

	cellOf (x: number, z: number): number {
		let cx = Math.floor(x * this._inv), cz = Math.floor(z * this._inv);
		if (cx < -OFFSET) cx = -OFFSET;
		else if (cx > LIMIT) cx = LIMIT;
		if (cz < -OFFSET) cz = -OFFSET;
		else if (cz > LIMIT) cz = LIMIT;
		return (cx + OFFSET) * STRIDE + (cz + OFFSET);
	}

	add (obj: T, x: number, z: number): void {
		this._put(obj, this.cellOf(x, z));
		this.size++;
	}

	_put (obj: T, key: number): void {
		let cell = this.cells.get(key);
		if (!cell) this.cells.set(key, (cell = []));
		obj._cell = key;
		obj._cellIdx = cell.length;
		cell.push(obj);
	}

	/** Moves an object to where it is now. Returns whether it changed cell (false: nothing was done). */
	move (obj: T, x: number, z: number): boolean {
		const key = this.cellOf(x, z);
		if (key === obj._cell) return false;
		this._take(obj);
		this._put(obj, key);
		this.moves++;
		return true;
	}

	remove (obj: T): void {
		if (this._take(obj)) this.size--;
	}

	_take (obj: T): boolean {
		const cell = this.cells.get(obj._cell);
		if (!cell || cell[obj._cellIdx] !== obj) return false;
		const last = cell.pop()!;
		if (last !== obj) {
			cell[obj._cellIdx] = last;
			last._cellIdx = obj._cellIdx;
		}
		if (!cell.length) this.cells.delete(obj._cell);
		return true;
	}

	/** Pushes every object in the cells that touch the circle into `out` (a superset of those within it: filter by distance). */
	query (x: number, z: number, radius: number, out: T[]): T[] {
		const size = this.cellSize;
		const x0 = Math.floor((x - radius) * this._inv), x1 = Math.floor((x + radius) * this._inv);
		const z0 = Math.floor((z - radius) * this._inv), z1 = Math.floor((z + radius) * this._inv);
		const r2 = radius * radius;
		const cells = this.cells;
		for (let cx = x0; cx <= x1; cx++) {
			// Distance from the point to the cell's rectangle, to leave out the corners
			const nearX = cx * size > x ? cx * size - x : (cx + 1) * size < x ? x - (cx + 1) * size : 0;
			const kx = (cx < -OFFSET ? -OFFSET : cx > LIMIT ? LIMIT : cx) + OFFSET;
			for (let cz = z0; cz <= z1; cz++) {
				const nearZ = cz * size > z ? cz * size - z : (cz + 1) * size < z ? z - (cz + 1) * size : 0;
				if (nearX * nearX + nearZ * nearZ > r2) continue;
				const cell = cells.get(kx * STRIDE + (cz < -OFFSET ? -OFFSET : cz > LIMIT ? LIMIT : cz) + OFFSET);
				if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i]);
			}
		}
		return out;
	}

	/** Every object, for tests and tools. */
	all (): T[] {
		const out: T[] = [];
		for (const cell of this.cells.values()) for (const obj of cell) out.push(obj);
		return out;
	}

	/** How many cells a query of this radius touches. */
	cellsFor (radius: number): number {
		const n = Math.floor((2 * radius) / this.cellSize) + 2;
		return n * n;
	}
}
