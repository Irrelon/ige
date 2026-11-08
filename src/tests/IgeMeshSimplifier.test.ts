import { simplifyGeometry, triangleCount } from "@/engine/webgl/IgeMeshSimplifier";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** UV sphere with a texture seam along one meridian (duplicated vertices). */
function createSphere (segments: number, rings: number, radius = 1): IgeGeometryData3d {
	const vertices: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let r = 0; r <= rings; r++) {
		const phi = (r / rings) * Math.PI;
		for (let s = 0; s <= segments; s++) {
			const theta = (s / segments) * Math.PI * 2;
			// Exact pole and seam positions so duplicated vertices weld
			const sinPhi = r === 0 || r === rings ? 0 : Math.sin(phi);
			const cosPhi = r === 0 ? 1 : r === rings ? -1 : Math.cos(phi);
			const t = s === segments ? 0 : theta;
			const x = Math.cos(t) * sinPhi, y = cosPhi, z = Math.sin(t) * sinPhi;
			vertices.push(x * radius, y * radius, z * radius);
			normals.push(x, y, z);
			uvs.push(s / segments, r / rings);
		}
	}

	for (let r = 0; r < rings; r++) {
		for (let s = 0; s < segments; s++) {
			const a = r * (segments + 1) + s;
			const b = a + segments + 1;
			if (r !== 0) indices.push(a, a + 1, b);
			if (r !== rings - 1) indices.push(a + 1, b + 1, b);
		}
	}

	return {
		id: "sphere",
		vertices: new Float32Array(vertices),
		normals: new Float32Array(normals),
		uvs: new Float32Array(uvs),
		indices: new Uint32Array(indices)
	};
}

/** Flat grid on the XZ plane with skin attributes that encode position. */
function createGrid (cells: number): IgeGeometryData3d {
	const vertices: number[] = [];
	const boneIndices: number[] = [];
	const boneWeights: number[] = [];
	const indices: number[] = [];

	for (let z = 0; z <= cells; z++) {
		for (let x = 0; x <= cells; x++) {
			vertices.push(x, 0, z);
			boneIndices.push(x % 4, z % 4, 0, 0);
			boneWeights.push(x / cells, 1 - x / cells, 0, 0);
		}
	}

	for (let z = 0; z < cells; z++) {
		for (let x = 0; x < cells; x++) {
			const a = z * (cells + 1) + x;
			const b = a + cells + 1;
			indices.push(a, b, a + 1, a + 1, b, b + 1);
		}
	}

	return {
		id: "grid",
		vertices: new Float32Array(vertices),
		boneIndices: new Uint8Array(boneIndices),
		boneWeights: new Float32Array(boneWeights),
		indices: new Uint16Array(indices)
	};
}

function positionKey (v: Float32Array, i: number): string {
	return `${v[i * 3]},${v[i * 3 + 1]},${v[i * 3 + 2]}`;
}

/** Map of position-space edges to the number of triangles using them. */
function edgeUse (geometry: IgeGeometryData3d): Map<string, number> {
	const v = geometry.vertices!;
	const idx = geometry.indices!;
	const edges = new Map<string, number>();
	for (let t = 0; t < idx.length; t += 3) {
		for (let e = 0; e < 3; e++) {
			const a = positionKey(v, idx[t + e]);
			const b = positionKey(v, idx[t + ((e + 1) % 3)]);
			const key = a < b ? `${a}|${b}` : `${b}|${a}`;
			edges.set(key, (edges.get(key) || 0) + 1);
		}
	}
	return edges;
}

function expectValidTriangles (geometry: IgeGeometryData3d) {
	const v = geometry.vertices!;
	const idx = geometry.indices!;
	const vertexCount = v.length / 3;
	for (let t = 0; t < idx.length; t += 3) {
		for (let k = 0; k < 3; k++) expect(idx[t + k]).toBeLessThan(vertexCount);
		const a = positionKey(v, idx[t]), b = positionKey(v, idx[t + 1]), c = positionKey(v, idx[t + 2]);
		expect(a !== b && b !== c && a !== c).toBe(true);
	}
}

describe("IgeMeshSimplifier", () => {
	it("reduces a closed sphere and keeps it watertight across its UV seam", () => {
		const sphere = createSphere(48, 24);
		const before = triangleCount(sphere);
		const result = simplifyGeometry(sphere, { ratio: 0.25, maxError: 1 });

		expect(triangleCount(result)).toBeLessThanOrEqual(Math.ceil(before * 0.27));
		expect(triangleCount(result)).toBeGreaterThan(before * 0.15);
		expectValidTriangles(result);

		// Every edge (by position) still has exactly two triangles
		for (const count of edgeUse(result).values()) {
			expect(count).toBe(2);
		}

		// The seam is still split: some positions keep two different UVs
		const uvsByPosition = new Map<string, Set<string>>();
		const v = result.vertices!, uv = result.uvs!;
		for (let i = 0; i < v.length / 3; i++) {
			const key = positionKey(v, i);
			if (!uvsByPosition.has(key)) uvsByPosition.set(key, new Set());
			uvsByPosition.get(key)!.add(`${uv[i * 2]},${uv[i * 2 + 1]}`);
		}
		expect([...uvsByPosition.values()].some((set) => set.size > 1)).toBe(true);
	});

	it("simplifies a flat grid heavily while keeping its outline", () => {
		const grid = createGrid(20);
		const result = simplifyGeometry(grid, { ratio: 0.05 });

		expect(triangleCount(result)).toBeLessThanOrEqual(Math.ceil(triangleCount(grid) * 0.05) + 2);
		expectValidTriangles(result);

		// Corners survive, and every remaining vertex is still on the plane
		const v = result.vertices!;
		const positions = new Set<string>();
		for (let i = 0; i < v.length / 3; i++) {
			positions.add(positionKey(v, i));
			expect(v[i * 3 + 1]).toBe(0);
		}
		for (const corner of ["0,0,0", "20,0,0", "0,0,20", "20,0,20"]) {
			expect(positions.has(corner)).toBe(true);
		}

		// Area is preserved (no holes, no overlaps)
		let area = 0;
		const idx = result.indices!;
		for (let t = 0; t < idx.length; t += 3) {
			const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
			const e1x = v[b] - v[a], e1z = v[b + 2] - v[a + 2];
			const e2x = v[c] - v[a], e2z = v[c + 2] - v[a + 2];
			area += Math.abs(e1x * e2z - e1z * e2x) / 2;
		}
		expect(area).toBeCloseTo(400, 5);
	});

	it("keeps each remaining vertex's skin attributes", () => {
		const grid = createGrid(10);
		const result = simplifyGeometry(grid, { ratio: 0.3 });

		expect(result.boneIndices).toBeInstanceOf(Uint8Array);
		expect(result.boneWeights).toBeInstanceOf(Float32Array);

		const v = result.vertices!;
		for (let i = 0; i < v.length / 3; i++) {
			const x = v[i * 3], z = v[i * 3 + 2];
			expect(result.boneIndices![i * 4]).toBe(x % 4);
			expect(result.boneIndices![i * 4 + 1]).toBe(z % 4);
			expect(result.boneWeights![i * 4]).toBeCloseTo(x / 10, 6);
		}
	});

	it("leaves hard-edged boxes alone and indexes non-indexed input", () => {
		// 12 triangles, 36 vertices, every face with its own normal
		const faces = [
			[[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
			[[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
			[[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
			[[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
			[[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
			[[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]]
		] as [number[], number[][]][];
		const vertices: number[] = [];
		const normals: number[] = [];
		for (const [n, quad] of faces) {
			for (const corner of [0, 1, 2, 0, 2, 3]) {
				vertices.push(...quad[corner]);
				normals.push(...n);
			}
		}
		const box: IgeGeometryData3d = { id: "box", vertices: new Float32Array(vertices), normals: new Float32Array(normals) };

		const result = simplifyGeometry(box, { ratio: 0.5 });
		expect(triangleCount(result)).toBe(12);
		expect(result.vertices!.length / 3).toBe(24);
		expectValidTriangles(result);
	});

	it("respects the error limit", () => {
		const sphere = createSphere(32, 16);
		const loose = simplifyGeometry(sphere, { ratio: 0.1, maxError: 1 });
		const strict = simplifyGeometry(sphere, { ratio: 0.1, maxError: 0.001 });
		expect(triangleCount(strict)).toBeGreaterThan(triangleCount(loose));
	});

	it("returns the full mesh for ratio 1 with a new id", () => {
		const sphere = createSphere(16, 8);
		const result = simplifyGeometry(sphere, { ratio: 1 });
		expect(triangleCount(result)).toBe(triangleCount(sphere));
		expect(result.id).toBe("sphere_lod1");
		expect(result.indices).toBeInstanceOf(Uint16Array);
	});
});
