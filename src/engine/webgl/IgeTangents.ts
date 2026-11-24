import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/**
 * Per-vertex tangents (x, y, z, handedness w) for normal mapping, by Lengyel's method: each triangle's tangent and
 * bitangent from its positions and UVs are summed onto its vertices, then each vertex's tangent is made perpendicular
 * to its normal (Gram-Schmidt) and w says whether the bitangent runs with or against cross(normal, tangent). Vertices
 * that share a position but not a UV (seams) are separate vertices in a glTF mesh, so each gets its own side's tangent.
 *
 * Needs vertices, normals and uvs; returns undefined without them. Works on indexed and non-indexed meshes.
 */
export function igeComputeTangents (geometry: Pick<IgeGeometryData3d, "vertices" | "normals" | "uvs" | "indices">): Float32Array | undefined {
	const { vertices: pos, normals: nor, uvs, indices } = geometry;
	if (!pos || !nor || !uvs) return undefined;
	const count = pos.length / 3;
	if (nor.length < count * 3 || uvs.length < count * 2) return undefined;

	const tan = new Float32Array(count * 3);
	const bit = new Float32Array(count * 3);
	const triangles = (indices ? indices.length : count) / 3;

	for (let t = 0; t < triangles; t++) {
		const i0 = indices ? indices[t * 3] : t * 3;
		const i1 = indices ? indices[t * 3 + 1] : t * 3 + 1;
		const i2 = indices ? indices[t * 3 + 2] : t * 3 + 2;

		const e1x = pos[i1 * 3] - pos[i0 * 3], e1y = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], e1z = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
		const e2x = pos[i2 * 3] - pos[i0 * 3], e2y = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], e2z = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
		const du1 = uvs[i1 * 2] - uvs[i0 * 2], dv1 = uvs[i1 * 2 + 1] - uvs[i0 * 2 + 1];
		const du2 = uvs[i2 * 2] - uvs[i0 * 2], dv2 = uvs[i2 * 2 + 1] - uvs[i0 * 2 + 1];

		const det = du1 * dv2 - du2 * dv1;
		if (Math.abs(det) < 1e-20) continue; // degenerate UVs: no direction to give
		const r = 1 / det;
		const tx = (e1x * dv2 - e2x * dv1) * r, ty = (e1y * dv2 - e2y * dv1) * r, tz = (e1z * dv2 - e2z * dv1) * r;
		const bx = (e2x * du1 - e1x * du2) * r, by = (e2y * du1 - e1y * du2) * r, bz = (e2z * du1 - e1z * du2) * r;

		for (const i of [i0, i1, i2]) {
			tan[i * 3] += tx; tan[i * 3 + 1] += ty; tan[i * 3 + 2] += tz;
			bit[i * 3] += bx; bit[i * 3 + 1] += by; bit[i * 3 + 2] += bz;
		}
	}

	const out = new Float32Array(count * 4);
	for (let v = 0; v < count; v++) {
		const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2];
		let tx = tan[v * 3], ty = tan[v * 3 + 1], tz = tan[v * 3 + 2];
		// Gram-Schmidt: take the part of the tangent along the normal out
		const d = nx * tx + ny * ty + nz * tz;
		tx -= nx * d; ty -= ny * d; tz -= nz * d;
		let len = Math.hypot(tx, ty, tz);
		if (len < 1e-12) {
			// No usable tangent (no UV area): any direction square to the normal
			if (Math.abs(nx) < 0.9) { tx = 0; ty = nz; tz = -ny; } else { tx = -nz; ty = 0; tz = nx; }
			len = Math.hypot(tx, ty, tz) || 1;
		}
		tx /= len; ty /= len; tz /= len;
		// Handedness: does cross(n, t) agree with the bitangent? A glTF normal map's +Y (green) points up the image,
		// against increasing v, so the bitangent is the accumulated one (which follows +v) negated.
		const cx = ny * tz - nz * ty, cy = nz * tx - nx * tz, cz = nx * ty - ny * tx;
		const w = cx * bit[v * 3] + cy * bit[v * 3 + 1] + cz * bit[v * 3 + 2] > 0 ? -1 : 1;
		out[v * 4] = tx; out[v * 4 + 1] = ty; out[v * 4 + 2] = tz; out[v * 4 + 3] = w;
	}
	return out;
}
