import { mergeGeometry, type IgeMergeSource } from "@/engine/webgl/IgeGeometryMerge";
import { IGE_QUANTISED_ENCODINGS, unpackVertices } from "@/engine/webgl/IgeVertexPacking";

/** One triangle in the XY plane facing +Z, texture coordinates at its corners. */
function triangle (): IgeMergeSource {
	return {
		vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
		normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
		uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
		indices: new Uint16Array([0, 1, 2])
	};
}

/** A quad (two triangles) with vertex colours. */
function quad (): IgeMergeSource {
	return {
		vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
		normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
		uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
		colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0.5]),
		indices: new Uint16Array([0, 1, 2, 0, 2, 3])
	};
}

/** Column-major matrix: scale (sx, sy, sz), then a turn of `angle` about Y, then a move. */
function trs (tx: number, ty: number, tz: number, angle = 0, sx = 1, sy = 1, sz = 1): number[] {
	const c = Math.cos(angle), s = Math.sin(angle);
	return [c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sz, 0, c * sz, 0, tx, ty, tz, 1];
}

/** A triangle's face normal from its corners (counter-clockwise faces it). */
function faceNormal (p: ArrayLike<number>, a: number, b: number, c: number): number[] {
	const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
	const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
	const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
	const len = Math.hypot(n[0], n[1], n[2]);
	return n.map((v) => v / len);
}

describe("mergeGeometry", () => {
	it("moves, turns and scales each piece and offsets its indices", () => {
		const [m] = mergeGeometry([
			{ geometry: triangle(), matrix: trs(10, 0, 0) },
			{ geometry: triangle(), matrix: trs(0, 5, 0, Math.PI / 2, 2, 2, 2) }
		]);
		const g = m.geometry;
		expect(m.pieces).toBe(2);
		expect(m.vertices).toBe(6);
		expect(m.triangles).toBe(2);
		expect(Array.from(g.indices!)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(g.indices).toBeInstanceOf(Uint16Array);
		const v = Array.from(g.vertices!).map((x) => +x.toFixed(5));
		// First: moved 10 along x
		expect(v.slice(0, 9)).toEqual([10, 0, 0, 11, 0, 0, 10, 1, 0]);
		// Second: doubled, a quarter turn about y (x goes to -z), lifted 5
		expect(v.slice(9, 18)).toEqual([0, 5, 0, 0, 5, -2, 0, 7, 0]);
		// Its normal turned with it (+z to +x)
		expect(Array.from(g.normals!.slice(9, 12)).map((x) => +x.toFixed(5))).toEqual([1, 0, 0]);
		expect(g.boundingBox).toEqual({ min: [0, 0, -2], max: [11, 7, 0] });
	});

	it("turns normals by the inverse transpose, so stretched pieces stay lit right", () => {
		// A slope: normal (1, 1, 0)/√2, stretched 4× along x. Its surface leans over, so its normal tips toward +y
		const slope: IgeMergeSource = {
			vertices: new Float32Array([0, 0, 0, 0, 0, 1, -1, 1, 0]),
			normals: new Float32Array([Math.SQRT1_2, Math.SQRT1_2, 0, Math.SQRT1_2, Math.SQRT1_2, 0, Math.SQRT1_2, Math.SQRT1_2, 0])
		};
		const [m] = mergeGeometry([{ geometry: slope, matrix: trs(0, 0, 0, 0, 4, 1, 1) }]);
		const n = Array.from(m.geometry.normals!.slice(0, 3));
		const expected = [1 / 4, 1, 0].map((x) => x / Math.hypot(1 / 4, 1));
		n.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 5));
		// Perpendicular to the stretched surface's edge from (0,0,0) to (-4,1,0)
		expect(n[0] * -4 + n[1] * 1).toBeCloseTo(0, 5);
	});

	it("flips a mirrored piece's winding so it still faces out", () => {
		const [m] = mergeGeometry([{ geometry: triangle(), matrix: trs(0, 0, 0, 0, 1, 1, -1) }, { geometry: triangle(), matrix: trs(0, 0, 0, 0, -1, 1, 1) }]);
		const g = m.geometry, p = g.vertices!, idx = g.indices!;
		for (let t = 0; t < 2; t++) {
			const face = faceNormal(p, idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
			const vn = Array.from(g.normals!.slice(idx[t * 3] * 3, idx[t * 3] * 3 + 3));
			// The winding's face and the stored normal agree
			expect(face[0] * vn[0] + face[1] * vn[1] + face[2] * vn[2]).toBeCloseTo(1, 5);
		}
		// Mirrored in z: the normal points -z
		expect(Array.from(g.normals!.slice(0, 3)).map((x) => +x.toFixed(5))).toEqual([0, 0, -1]);
	});

	it("keeps vertex colours and texture coordinates, filling pieces that have none", () => {
		const [m] = mergeGeometry([
			{ geometry: quad() },
			{ geometry: triangle(), color: [0.2, 0.4, 0.6], uvTransform: { scale: [0.5, 0.25], offset: [0.5, 0] } }
		]);
		const g = m.geometry;
		expect(g.colors!.length).toBe(7 * 4);
		expect(Array.from(g.colors!.slice(12, 16))).toEqual([1, 1, 1, 0.5]);
		expect(Array.from(g.colors!.slice(16, 20)).map((x) => +x.toFixed(5))).toEqual([0.2, 0.4, 0.6, 1]);
		expect(Array.from(g.uvs!.slice(0, 8))).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
		// The triangle's moved into its cell: (1, 0) → (1, 0), (0, 1) → (0.5, 0.25)
		expect(Array.from(g.uvs!.slice(8, 14))).toEqual([0.5, 0, 1, 0, 0.5, 0.25]);
		expect(Array.from(g.indices!)).toEqual([0, 1, 2, 0, 2, 3, 4, 5, 6]);
	});

	it("makes one mesh per material, in the order they first appear", () => {
		const merged = mergeGeometry([
			{ geometry: triangle(), material: "atlas" },
			{ geometry: quad(), material: "paving" },
			{ geometry: triangle(), material: "atlas", matrix: trs(3, 0, 0) }
		], { id: "chunk_4_2" });
		expect(merged.map((m) => [m.material, m.geometry.id, m.pieces, m.triangles])).toEqual([
			["atlas", "chunk_4_2_0", 2, 2],
			["paving", "chunk_4_2_1", 1, 2]
		]);
		expect(merged[0].geometry.colors).toBeUndefined();
	});

	it("drops triangles and gives recoloured ones vertices of their own", () => {
		const [m] = mergeGeometry([{
			geometry: quad(),
			triangle: (a, b, c) => (c === 3 ? [0.9, 0.1] : true) // the second triangle onto a swatch
		}]);
		const g = m.geometry;
		expect(m.vertices).toBe(6);
		expect(Array.from(g.indices!)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(Array.from(g.uvs!.slice(6, 12)).map((x) => +x.toFixed(5))).toEqual([0.9, 0.1, 0.9, 0.1, 0.9, 0.1]);
		const [dropped] = mergeGeometry([{ geometry: quad(), triangle: (a, b, c) => c !== 3 }]);
		expect(dropped.vertices).toBe(3);
		expect(dropped.triangles).toBe(1);
	});

	it("uses 32-bit indices past 65,535 vertices", () => {
		const big: IgeMergeSource = { vertices: new Float32Array(70000 * 3), indices: new Uint32Array([0, 1, 69999]) };
		const [m] = mergeGeometry([{ geometry: big }, { geometry: triangle() }]);
		expect(m.geometry.indices).toBeInstanceOf(Uint32Array);
		expect(Array.from(m.geometry.indices!)).toEqual([0, 1, 69999, 70000, 70001, 70002]);
	});

	it("hands back packed, quantised meshes ready to upload, and reads packed pieces", () => {
		const pieces = [{ geometry: quad(), matrix: trs(30, 0, 0) }, { geometry: quad(), matrix: trs(-30, 20, 0) }];
		const [floats] = mergeGeometry(pieces);
		const [packed] = mergeGeometry(pieces, { pack: IGE_QUANTISED_ENCODINGS });
		expect(packed.geometry.vertices).toBeUndefined();
		expect(packed.geometry.packed!.stride).toBe(20); // position 8, normal 4, uv 4, colour 4
		const back = unpackVertices(packed.geometry.packed!);
		for (let i = 0; i < floats.geometry.vertices!.length; i++) expect(back.vertices[i]).toBeCloseTo(floats.geometry.vertices![i], 2);
		expect(packed.geometry.boundingBox).toEqual(floats.geometry.boundingBox);
		// A packed piece merges like any other
		const [again] = mergeGeometry([{ geometry: { packed: packed.geometry.packed, indices: packed.geometry.indices }, matrix: trs(0, 1, 0) }]);
		expect(again.vertices).toBe(8);
		expect(again.geometry.vertices![1]).toBeCloseTo(1, 2);
	});
});
