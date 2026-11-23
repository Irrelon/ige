/**
 * Quaternions for the wire, "smallest three": the index of the largest component (2 bits) and the
 * other three, quantised to `bits` bits each over -1/sqrt(2) to 1/sqrt(2) (the fourth is rebuilt
 * from the unit length, and the sign is chosen so the largest is positive: q and -q are one
 * rotation). A packed quaternion is one integer (up to 2^53) of `2 + 3 * bits` bits.
 */

export interface IgeNetQuat {
	x: number;
	y: number;
	z: number;
	w: number;
}

/** Bits per component the entity layer uses: 12 (38 bits a quaternion) keeps the worst angular error under 0.1 degree (measured over random rotations: about 0.06; 11 bits gave 0.12). */
export const IGE_NET_QUAT_BITS = 12;

const LIMIT = Math.SQRT1_2;

/** Packs a quaternion (any length but zero; it's normalised) into an integer. */
export function igeNetQuatPack (q: IgeNetQuat, bits: number = IGE_NET_QUAT_BITS): number {
	const c = [q.x, q.y, q.z, q.w];
	const length = Math.hypot(c[0], c[1], c[2], c[3]) || 1;
	let largest = 0;
	for (let i = 1; i < 4; i++) if (Math.abs(c[i]) > Math.abs(c[largest])) largest = i;
	const sign = c[largest] < 0 ? -1 : 1;
	const levels = 2 ** bits - 1;
	let code = 0;
	for (let i = 3; i >= 0; i--) {
		if (i === largest) continue;
		const v = Math.max(-LIMIT, Math.min(LIMIT, (c[i] * sign) / length));
		code = code * (levels + 1) + Math.round(((v + LIMIT) / (2 * LIMIT)) * levels);
	}
	return code * 4 + largest;
}

/** The quaternion a packed integer stands for (a new object, or `out`). */
export function igeNetQuatUnpack (code: number, bits: number = IGE_NET_QUAT_BITS, out: IgeNetQuat = { x: 0, y: 0, z: 0, w: 1 }): IgeNetQuat {
	const largest = code % 4;
	let rest = Math.floor(code / 4);
	const base = 2 ** bits;
	const levels = base - 1;
	const c = [0, 0, 0, 0];
	let sum = 0;
	for (let i = 0; i < 4; i++) {
		if (i === largest) continue;
		const step = rest % base;
		rest = Math.floor(rest / base);
		const v = (step / levels) * 2 * LIMIT - LIMIT;
		c[i] = v;
		sum += v * v;
	}
	c[largest] = Math.sqrt(Math.max(0, 1 - sum));
	out.x = c[0];
	out.y = c[1];
	out.z = c[2];
	out.w = c[3];
	return out;
}

/** The unit quaternion of Euler angles applied the way IgeEntity does (Z, then Y, then X: Rz * Ry * Rx). */
export function igeNetQuatFromEuler (rx: number, ry: number, rz: number, out: IgeNetQuat = { x: 0, y: 0, z: 0, w: 1 }): IgeNetQuat {
	const sx = Math.sin(rx / 2), cx = Math.cos(rx / 2);
	const sy = Math.sin(ry / 2), cy = Math.cos(ry / 2);
	const sz = Math.sin(rz / 2), cz = Math.cos(rz / 2);
	out.x = sx * cy * cz - cx * sy * sz;
	out.y = cx * sy * cz + sx * cy * sz;
	out.z = cx * cy * sz - sx * sy * cz;
	out.w = cx * cy * cz + sx * sy * sz;
	return out;
}

/** The angle in radians between two unit quaternions' rotations (q and -q are 0 apart). */
export function igeNetQuatAngle (a: IgeNetQuat, b: IgeNetQuat): number {
	const dot = Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w));
	return 2 * Math.acos(dot);
}

/** Spherical interpolation along the shortest path (the sign of `b` is flipped when that's shorter). */
export function igeNetQuatSlerp (a: IgeNetQuat, b: IgeNetQuat, f: number, out: IgeNetQuat = { x: 0, y: 0, z: 0, w: 1 }): IgeNetQuat {
	let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
	const s = dot < 0 ? -1 : 1;
	dot *= s;
	let ka: number, kb: number;
	if (dot > 0.9995) {
		ka = 1 - f;
		kb = f * s;
	} else {
		const theta = Math.acos(Math.min(1, dot));
		const sin = Math.sin(theta);
		ka = Math.sin((1 - f) * theta) / sin;
		kb = (Math.sin(f * theta) / sin) * s;
	}
	const x = ka * a.x + kb * b.x, y = ka * a.y + kb * b.y, z = ka * a.z + kb * b.z, w = ka * a.w + kb * b.w;
	const length = Math.hypot(x, y, z, w) || 1;
	out.x = x / length;
	out.y = y / length;
	out.z = z / length;
	out.w = w / length;
	return out;
}
