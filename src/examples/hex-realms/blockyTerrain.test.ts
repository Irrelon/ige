import { buildChunk, type ChunkDetail, type TerrainDecor } from "./chunkMesh";
import { FOGGED, UNEXPLORED, VISIBLE } from "./fog";
import { HexLayout } from "./hex";
import { generateMap } from "./mapGen";
import { MeshBuilder } from "./meshBuilder";

describe("blocky terrain", () => {
	const map = generateMap({ width: 32, height: 32, seed: 99 });
	const layout = new HexLayout(50);
	// Explored in the middle, fogged around it, clouds beyond
	const view = new Uint8Array(map.count);
	for (let t = 0; t < map.count; t++) {
		const d = Math.hypot(map.col(t) - 16, map.row(t) - 16);
		view[t] = d < 7 ? VISIBLE : d < 10 ? FOGGED : UNEXPLORED;
	}

	const build = (decor: TerrainDecor, detail: ChunkDetail) => {
		const b = new MeshBuilder();
		const geometry = buildChunk(map, layout, b, 0, 0, 32, `test_${decor}_${detail}`, detail, view, decor);
		return { b, geometry };
	};

	test("chunks build in both styles at both levels, with sound geometry", () => {
		const counts: Record<string, number> = {};
		for (const decor of ["smooth", "blocky"] as const) {
			for (const detail of ["full", "lite"] as const) {
				const { b, geometry } = build(decor, detail);
				expect(geometry).not.toBeNull();
				counts[`${decor} ${detail}`] = b.indexCount / 3;
				let bad = 0;
				for (let i = 0; i < b.vertexCount * 3; i++) if (!Number.isFinite(b.positions[i])) bad++;
				for (let v = 0; v < b.vertexCount; v++) {
					const n = Math.hypot(b.normals[v * 3], b.normals[v * 3 + 1], b.normals[v * 3 + 2]);
					if (Math.abs(n - 1) > 1e-3) bad++;
				}
				expect(bad).toBe(0);
			}
		}
		if (process.env.TERRAIN_COUNTS) console.log(counts);
		// Blocky decorations cost more triangles, but not wildly more
		expect(counts["blocky full"]).toBeLessThan(counts["smooth full"] * 4);
		expect(counts["blocky lite"]).toBeLessThan(counts["smooth lite"] * 4);
	});

	test("the same map builds the same mesh every time", () => {
		const a = build("blocky", "full").b;
		const first = a.positions.slice(0, a.vertexCount * 3);
		const b = build("blocky", "full").b;
		expect(b.positions.slice(0, b.vertexCount * 3)).toEqual(first);
	});
});
