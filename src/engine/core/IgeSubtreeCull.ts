import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgeFrustum } from "@/engine/webgl/IgeFrustum";

/**
 * How many entities have cullSubtree() on. While there are none, nothing is tracked for them: moving or changing an
 * entity costs what it did before.
 */
export const igeSubtreeCullRoots = { count: 0 };

/** The most changed entities a culled-as-one entity keeps before it gives up and takes its box again from scratch. */
export const SUBTREE_MAX_CHANGED = 64;

/**
 * A subtree in view is walked with its box kept (grown round what changed) rather than taken again; every this many
 * such walks it's taken afresh, so a box grown round something that has since gone back shrinks again.
 */
export const SUBTREE_RETAKE_WALKS = 30;

let nextStamp = 1;

/**
 * What the WebGL renderer keeps for an entity culled with everything under it (IgeEntity.cullSubtree()): a box round
 * all that's drawn under it, in the entity's own space (the space its world matrix maps from, so the box goes where
 * the entity goes at no cost), and the entities under it that changed since the box was taken.
 *
 * The box is taken as the renderer walks the entity's subtree (the first time, and every SUBTREE_RETAKE_WALKS walks
 * while it's in view). Entities under it that move (relative to it), are mounted, shown or given a new mesh are noted
 * here (IgeObject._subtreeChanged()), and the renderer grows the box round each of them before it next uses the box:
 * the box only grows until it's taken afresh, so it's never too small. Some things can't be bounded without
 * walking them every frame (skinned meshes, particles, decals, the UI layer, preTick behaviours, entities following a
 * bone, meshes with no bounds): with one of those under it, the entity is `volatile` and walked every frame, as before.
 */
export class IgeSubtreeCull {
	/** The box holds everything drawn under the entity (as it was when last walked, grown by what changed since). */
	valid = false;
	/** Something under the entity can't be bounded without walking it: it's walked every frame. */
	volatile = false;
	minX = Infinity;
	minY = Infinity;
	minZ = Infinity;
	maxX = -Infinity;
	maxY = -Infinity;
	maxZ = -Infinity;
	/** Entities under it changed since the box was taken (moved, mounted, shown, given a mesh): the first changedCount. */
	changed: IgeObject[] = [];
	changedCount = 0;
	/** The changed entities being taken in (take()): the first takenCount. */
	taken: IgeObject[] = [];
	takenCount = 0;
	/** Marks the entities in `changed` (IgeObject._subtreeStamp), so each is noted once. */
	stamp = nextStamp++;
	/** The renderer frame it was last skipped in (IgeEntity.subtreeCulled()). */
	culledFrame = -1;
	/** The box is being taken as the subtree is walked (false: walked with its box kept, only volatility noticed). */
	boxing = true;
	/** Walks with its box kept since it was last taken afresh. */
	keptWalks = 0;
	/** The inverse of the entity's world matrix while its box is being taken or grown. */
	inv = new Float64Array(16);
	/** Scratch: a content's matrix into the entity's space. */
	toRoot = new Float64Array(16);

	/** Something under the entity changed: grow the box round it before the box is next used. */
	note (obj: IgeObject): void {
		if (!this.valid || this.volatile || obj._subtreeStamp === this.stamp) return;
		if (this.changedCount >= SUBTREE_MAX_CHANGED) {
			this.invalidate();
			return;
		}
		obj._subtreeStamp = this.stamp;
		this.changed[this.changedCount++] = obj;
	}

	/** The box can't be trusted: the subtree is walked (and the box taken again) the next time it's reached. */
	invalidate (): void {
		this.valid = false;
		this._forget();
	}

	/**
	 * Move the changed entities into `taken` to grow the box round (any noted meanwhile start a new list), returning
	 * how many; done() when they're taken in.
	 */
	take (): number {
		const list = this.changed;
		this.changed = this.taken;
		this.taken = list;
		this.takenCount = this.changedCount;
		this.changedCount = 0;
		this.stamp = nextStamp++;
		return this.takenCount;
	}

	done (): void {
		const list = this.taken;
		for (let i = 0; i < this.takenCount; i++) list[i] = undefined as unknown as IgeObject;
		this.takenCount = 0;
	}

	/** Start taking the box from scratch (as the subtree is walked). */
	clear (): void {
		this.minX = this.minY = this.minZ = Infinity;
		this.maxX = this.maxY = this.maxZ = -Infinity;
		this.volatile = false;
		this._forget();
	}

	/** Let go of the changed entities (a new stamp: none counts as noted). */
	protected _forget (): void {
		const list = this.changed;
		for (let i = 0; i < this.changedCount; i++) list[i] = undefined as unknown as IgeObject;
		this.changedCount = 0;
		this.stamp = nextStamp++;
	}

	/** Nothing drawn under it. */
	empty (): boolean {
		return this.minX > this.maxX;
	}

	/** Grow the box round a box (min and max corners) in a space that `m` (column-major 4x4) maps into the entity's. */
	addBox (m: ArrayLike<number>, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void {
		const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
		const hx = (maxX - minX) / 2, hy = (maxY - minY) / 2, hz = (maxZ - minZ) / 2;
		const x = m[0] * cx + m[4] * cy + m[8] * cz + m[12];
		const y = m[1] * cx + m[5] * cy + m[9] * cz + m[13];
		const z = m[2] * cx + m[6] * cy + m[10] * cz + m[14];
		const ex = Math.abs(m[0]) * hx + Math.abs(m[4]) * hy + Math.abs(m[8]) * hz;
		const ey = Math.abs(m[1]) * hx + Math.abs(m[5]) * hy + Math.abs(m[9]) * hz;
		const ez = Math.abs(m[2]) * hx + Math.abs(m[6]) * hy + Math.abs(m[10]) * hz;
		this._add(x - ex, y - ey, z - ez, x + ex, y + ey, z + ez);
	}

	/** Grow the box round a sphere in the entity's space. */
	addSphere (x: number, y: number, z: number, r: number): void {
		this._add(x - r, y - r, z - r, x + r, y + r, z + r);
	}

	/** Grow the box round another's box, `m` mapping that one's space into this one's. */
	addSubtree (m: ArrayLike<number>, other: IgeSubtreeCull): void {
		if (other.empty()) return;
		this.addBox(m, other.minX, other.minY, other.minZ, other.maxX, other.maxY, other.maxZ);
	}

	protected _add (minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void {
		if (minX < this.minX) this.minX = minX;
		if (minY < this.minY) this.minY = minY;
		if (minZ < this.minZ) this.minZ = minZ;
		if (maxX > this.maxX) this.maxX = maxX;
		if (maxY > this.maxY) this.maxY = maxY;
		if (maxZ > this.maxZ) this.maxZ = maxZ;
	}
}

/** out = a × b for column-major 4x4 matrices whose bottom row is 0 0 0 1 (transforms without projection). */
export function igeAffineMultiply (out: Float64Array, a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
	const a0 = a[0], a1 = a[1], a2 = a[2], a4 = a[4], a5 = a[5], a6 = a[6], a8 = a[8], a9 = a[9], a10 = a[10];
	for (let c = 0; c < 16; c += 4) {
		const b0 = b[c], b1 = b[c + 1], b2 = b[c + 2];
		out[c] = a0 * b0 + a4 * b1 + a8 * b2;
		out[c + 1] = a1 * b0 + a5 * b1 + a9 * b2;
		out[c + 2] = a2 * b0 + a6 * b1 + a10 * b2;
		out[c + 3] = 0;
	}
	out[12] += a[12];
	out[13] += a[13];
	out[14] += a[14];
	out[15] = 1;
	return out;
}

/** The inverse of a column-major 4x4 transform with no projection, into `out`; false when it has none (a zero scale). */
export function igeAffineInvert (m: ArrayLike<number>, out: Float64Array): boolean {
	const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
	const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
	const det = a * A + b * B + c * C;
	if (!(Math.abs(det) > 1e-30) || !Number.isFinite(det)) return false;
	const k = 1 / det;
	out[0] = A * k; out[1] = (c * h - b * i) * k; out[2] = (b * f - c * e) * k; out[3] = 0;
	out[4] = B * k; out[5] = (a * i - c * g) * k; out[6] = (c * d - a * f) * k; out[7] = 0;
	out[8] = C * k; out[9] = (b * g - a * h) * k; out[10] = (a * e - b * d) * k; out[11] = 0;
	const x = m[12], y = m[13], z = m[14];
	out[12] = -(out[0] * x + out[4] * y + out[8] * z);
	out[13] = -(out[1] * x + out[5] * y + out[9] * z);
	out[14] = -(out[2] * x + out[6] * y + out[10] * z);
	out[15] = 1;
	return true;
}

/**
 * Whether an entity's box (`cull`, in the space its world matrix `m` maps from) lies wholly outside one of a
 * frustum's planes, with `margin` (world units) to spare. Swept: the box carried along the unit direction
 * (dx, dy, dz) from `from` to `to` world units (a shadow falling along the light), outside only if all of that is.
 */
export function igeSubtreeOutside (
	frustum: IgeFrustum,
	m: ArrayLike<number>,
	cull: IgeSubtreeCull,
	margin: number = 0,
	dx: number = 0,
	dy: number = 0,
	dz: number = 0,
	from: number = 0,
	to: number = 0
): boolean {
	const lx = (cull.minX + cull.maxX) / 2, ly = (cull.minY + cull.maxY) / 2, lz = (cull.minZ + cull.maxZ) / 2;
	const hx = (cull.maxX - cull.minX) / 2, hy = (cull.maxY - cull.minY) / 2, hz = (cull.maxZ - cull.minZ) / 2;
	// The box's middle in the world, carried to the middle of the sweep, and the sweep's half length
	const mid = (from + to) / 2, half = (to - from) / 2;
	const x = m[0] * lx + m[4] * ly + m[8] * lz + m[12] + dx * mid;
	const y = m[1] * lx + m[5] * ly + m[9] * lz + m[13] + dy * mid;
	const z = m[2] * lx + m[6] * ly + m[10] * lz + m[14] + dz * mid;
	const planes = frustum.planes;
	for (let p = 0; p < 6; p++) {
		const { a, b, c, d } = planes[p];
		// How far the box reaches towards the plane's inside: its half sizes along its own axes, projected
		const reach = Math.abs(a * m[0] + b * m[1] + c * m[2]) * hx +
			Math.abs(a * m[4] + b * m[5] + c * m[6]) * hy +
			Math.abs(a * m[8] + b * m[9] + c * m[10]) * hz +
			Math.abs(a * dx + b * dy + c * dz) * half;
		if (a * x + b * y + c * z + d + reach < -margin) return true;
	}
	return false;
}

/** An entity's box in the world: its middle into `out` (x, y, z) and the radius of a sphere round it, returned. */
export function igeSubtreeSphere (m: ArrayLike<number>, cull: IgeSubtreeCull, out: { x: number; y: number; z: number }): number {
	const lx = (cull.minX + cull.maxX) / 2, ly = (cull.minY + cull.maxY) / 2, lz = (cull.minZ + cull.maxZ) / 2;
	out.x = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
	out.y = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
	out.z = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
	const hx = (cull.maxX - cull.minX) / 2, hy = (cull.maxY - cull.minY) / 2, hz = (cull.maxZ - cull.minZ) / 2;
	const ex = Math.abs(m[0]) * hx + Math.abs(m[4]) * hy + Math.abs(m[8]) * hz;
	const ey = Math.abs(m[1]) * hx + Math.abs(m[5]) * hy + Math.abs(m[9]) * hz;
	const ez = Math.abs(m[2]) * hx + Math.abs(m[6]) * hy + Math.abs(m[10]) * hz;
	return Math.hypot(ex, ey, ez);
}

/** An entity's box's lowest and highest world y, into `out`. */
export function igeSubtreeHeights (m: ArrayLike<number>, cull: IgeSubtreeCull, out: { min: number; max: number }): void {
	const lx = (cull.minX + cull.maxX) / 2, ly = (cull.minY + cull.maxY) / 2, lz = (cull.minZ + cull.maxZ) / 2;
	const hx = (cull.maxX - cull.minX) / 2, hy = (cull.maxY - cull.minY) / 2, hz = (cull.maxZ - cull.minZ) / 2;
	const y = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
	const ey = Math.abs(m[1]) * hx + Math.abs(m[5]) * hy + Math.abs(m[9]) * hz;
	out.min = y - ey;
	out.max = y + ey;
}
