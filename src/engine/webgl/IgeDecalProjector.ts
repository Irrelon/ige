import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** Where and how a decal is projected (see projectDecal()). */
export interface IgeDecalProjection {
	/** World position at the centre of the decal (on or near the surface). */
	position: { x: number; y: number; z: number };
	/**
	 * Direction the decal faces: out of the surface, towards where it was
	 * "sprayed" from (e.g. a wall's normal, or the reverse of a bullet's
	 * direction). The decal covers surfaces facing this way.
	 */
	normal: { x: number; y: number; z: number };
	/** Width and height of the decal in world units. */
	size: number;
	/** How far in front of and behind the position surfaces are covered. */
	depth: number;
	/** Rotation around the normal in radians. */
	rotation: number;
	/**
	 * Surfaces turned further than this from the normal (radians) are left
	 * out, so a splat on a floor doesn't smear down the side of a step.
	 */
	maxAngle: number;
	/** Distance the decal is lifted off each surface, against z-fighting. */
	lift: number;
}

/** A mesh the decal can land on: geometry and its world matrix. */
export interface IgeDecalTargetMesh {
	geometry: IgeGeometryData3d;
	/** Column-major 4x4 world matrix. */
	matrix: Float32Array | number[];
}

/** Floats per vertex in projectDecal()'s output: x, y, z, u, v. */
export const PROJECTED_DECAL_VERTEX_FLOATS = 5;

// Outcodes for the decal box planes
const U_MIN = 1, U_MAX = 2, V_MIN = 4, V_MAX = 8, W_MIN = 16, W_MAX = 32;

// Reused per-vertex scratch: world x, y, z, decal u, v, w, outcode
let scratch = new Float32Array(7 * 1024);
const boundsCache = new WeakMap<IgeGeometryData3d, { x: number; y: number; z: number; r: number }>();

function geometryBounds (geometry: IgeGeometryData3d) {
	let bounds = boundsCache.get(geometry);
	if (bounds) return bounds;

	const v = geometry.vertices!;
	let minX = Infinity, minY = Infinity, minZ = Infinity;
	let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
	for (let i = 0; i + 2 < v.length; i += 3) {
		if (v[i] < minX) minX = v[i];
		if (v[i] > maxX) maxX = v[i];
		if (v[i + 1] < minY) minY = v[i + 1];
		if (v[i + 1] > maxY) maxY = v[i + 1];
		if (v[i + 2] < minZ) minZ = v[i + 2];
		if (v[i + 2] > maxZ) maxZ = v[i + 2];
	}
	bounds = {
		x: (minX + maxX) / 2,
		y: (minY + maxY) / 2,
		z: (minZ + maxZ) / 2,
		r: Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2
	};
	boundsCache.set(geometry, bounds);
	return bounds;
}

/**
 * Build the decal's axes: n (out of the surface), t and b across it. On a
 * floor t starts along world X; on a wall b points up.
 */
export function decalAxes (normal: { x: number; y: number; z: number }, rotation: number) {
	let nx = normal.x, ny = normal.y, nz = normal.z;
	const len = Math.hypot(nx, ny, nz) || 1;
	nx /= len; ny /= len; nz /= len;

	// Reference "up" for the tangent: world Y, or world Z for floors and ceilings
	const floorLike = Math.abs(ny) > 0.99;
	const rx = 0, ry = floorLike ? 0 : 1, rz = floorLike ? 1 : 0;

	// t0 = normalize(ref x n), b0 = n x t0
	let tx = ry * nz - rz * ny, ty = rz * nx - rx * nz, tz = rx * ny - ry * nx;
	const tl = Math.hypot(tx, ty, tz) || 1;
	tx /= tl; ty /= tl; tz /= tl;
	if (floorLike) { tx = -tx; ty = -ty; tz = -tz; } // world +X on floors
	const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;

	const c = Math.cos(rotation), s = Math.sin(rotation);
	const t = { x: tx * c + bx * s, y: ty * c + by * s, z: tz * c + bz * s };
	const b = { x: ny * t.z - nz * t.y, y: nz * t.x - nx * t.z, z: nx * t.y - ny * t.x };
	return { n: { x: nx, y: ny, z: nz }, t, b };
}

/**
 * Project a decal onto meshes: every triangle that faces the decal and
 * reaches into its box (size x size across, depth along the normal) is
 * clipped to the box and returned as world-space triangles with decal
 * UVs (0-1 across the decal). This is how marks follow walls, steps and
 * uneven terrain; animated (skinned) meshes should not be passed.
 * @returns x, y, z, u, v per vertex (PROJECTED_DECAL_VERTEX_FLOATS), three
 * vertices per triangle.
 */
export function projectDecal (meshes: IgeDecalTargetMesh[], projection: IgeDecalProjection): Float32Array {
	const { position: c, size, depth, lift } = projection;
	const { n, t, b } = decalAxes(projection.normal, projection.rotation);
	const halfDepth = depth / 2;
	const invSize = 1 / size;
	const minFacing = Math.cos(projection.maxAngle);
	const reach = Math.sqrt(size * size * 0.5 + halfDepth * halfDepth);

	const out: number[] = [];
	const poly: number[] = [];
	const next: number[] = [];

	for (const mesh of meshes) {
		const geometry = mesh.geometry;
		const verts = geometry.vertices;
		if (!verts || verts.length < 9) continue;
		const m = mesh.matrix;

		// Skip meshes whose bounding sphere misses the decal box
		const gb = geometryBounds(geometry);
		const gx = m[0] * gb.x + m[4] * gb.y + m[8] * gb.z + m[12];
		const gy = m[1] * gb.x + m[5] * gb.y + m[9] * gb.z + m[13];
		const gz = m[2] * gb.x + m[6] * gb.y + m[10] * gb.z + m[14];
		const scale = Math.sqrt(Math.max(
			m[0] * m[0] + m[1] * m[1] + m[2] * m[2],
			m[4] * m[4] + m[5] * m[5] + m[6] * m[6],
			m[8] * m[8] + m[9] * m[9] + m[10] * m[10]
		));
		if (Math.hypot(gx - c.x, gy - c.y, gz - c.z) > gb.r * scale + reach) continue;

		// Transform every vertex into world and decal space once
		const vertexCount = Math.floor(verts.length / 3);
		if (scratch.length < vertexCount * 7) scratch = new Float32Array(vertexCount * 7 * 2);
		const s = scratch;
		for (let i = 0; i < vertexCount; i++) {
			const lx = verts[i * 3], ly = verts[i * 3 + 1], lz = verts[i * 3 + 2];
			const x = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
			const y = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
			const z = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
			const dx = x - c.x, dy = y - c.y, dz = z - c.z;
			const u = (dx * t.x + dy * t.y + dz * t.z) * invSize + 0.5;
			const v = (dx * b.x + dy * b.y + dz * b.z) * invSize + 0.5;
			const w = dx * n.x + dy * n.y + dz * n.z;
			const o = i * 7;
			s[o] = x; s[o + 1] = y; s[o + 2] = z;
			s[o + 3] = u; s[o + 4] = v; s[o + 5] = w;
			s[o + 6] = (u < 0 ? U_MIN : 0) | (u > 1 ? U_MAX : 0) | (v < 0 ? V_MIN : 0) | (v > 1 ? V_MAX : 0) |
				(w < -halfDepth ? W_MIN : 0) | (w > halfDepth ? W_MAX : 0);
		}

		const indices = geometry.indices;
		const triangleCount = indices ? Math.floor(indices.length / 3) : Math.floor(vertexCount / 3);
		for (let tri = 0; tri < triangleCount; tri++) {
			const i0 = indices ? indices[tri * 3] : tri * 3;
			const i1 = indices ? indices[tri * 3 + 1] : tri * 3 + 1;
			const i2 = indices ? indices[tri * 3 + 2] : tri * 3 + 2;
			const a = i0 * 7, bb = i1 * 7, cc = i2 * 7;

			// All three corners outside the same face of the box
			if (s[a + 6] & s[bb + 6] & s[cc + 6]) continue;

			// Facing: skip triangles turned away from the decal
			const e1x = s[bb] - s[a], e1y = s[bb + 1] - s[a + 1], e1z = s[bb + 2] - s[a + 2];
			const e2x = s[cc] - s[a], e2y = s[cc + 1] - s[a + 1], e2z = s[cc + 2] - s[a + 2];
			let fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
			const fl = Math.hypot(fx, fy, fz);
			if (fl < 1e-12) continue;
			fx /= fl; fy /= fl; fz /= fl;
			if (fx * n.x + fy * n.y + fz * n.z < minFacing) continue;

			// Clip the triangle to the box: vertices are u, v, w, x, y, z
			poly.length = 0;
			for (const o of [a, bb, cc]) {
				poly.push(s[o + 3], s[o + 4], s[o + 5], s[o], s[o + 1], s[o + 2]);
			}
			if (!clipPolygon(poly, next, 0, 0, 1) || !clipPolygon(poly, next, 0, 1, -1) ||
				!clipPolygon(poly, next, 1, 0, 1) || !clipPolygon(poly, next, 1, 1, -1) ||
				!clipPolygon(poly, next, 2, -halfDepth, 1) || !clipPolygon(poly, next, 2, halfDepth, -1)) {
				continue;
			}

			// Fan-triangulate, lifted off the surface along its normal
			const lx = fx * lift, ly = fy * lift, lz = fz * lift;
			const count = poly.length / 6;
			for (let k = 1; k + 1 < count; k++) {
				for (const p of [0, k, k + 1]) {
					const o = p * 6;
					out.push(poly[o + 3] + lx, poly[o + 4] + ly, poly[o + 5] + lz, poly[o], poly[o + 1]);
				}
			}
		}
	}

	return new Float32Array(out);
}

/**
 * Clip a convex polygon (6 numbers per vertex) in place against one plane
 * of the decal box: keeps the side where sign * (value[axis] - limit) >= 0.
 * Returns false when nothing is left.
 */
function clipPolygon (poly: number[], scratchOut: number[], axis: number, limit: number, sign: number): boolean {
	const count = poly.length / 6;
	if (count < 3) return false;

	scratchOut.length = 0;
	for (let i = 0; i < count; i++) {
		const a = i * 6;
		const b = ((i + 1) % count) * 6;
		const da = sign * (poly[a + axis] - limit);
		const db = sign * (poly[b + axis] - limit);

		if (da >= 0) {
			for (let k = 0; k < 6; k++) scratchOut.push(poly[a + k]);
		}
		if ((da >= 0) !== (db >= 0)) {
			const f = da / (da - db);
			for (let k = 0; k < 6; k++) scratchOut.push(poly[a + k] + (poly[b + k] - poly[a + k]) * f);
		}
	}

	poly.length = 0;
	for (let i = 0; i < scratchOut.length; i++) poly.push(scratchOut[i]);
	return poly.length >= 18;
}
