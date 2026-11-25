/**
 * Hierarchical level of detail (IgeHlod, IgeHlodBuilder): proxies a fraction of their chunks' triangles within their
 * error, small parts dropped, one draw a group; levels picked by distance and screen size with hysteresis; every
 * chunk in range drawn by exactly one node, no holes while groups load, children kept until their group is ready;
 * cross-fades; content let go once it's out of use.
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/instance";
import { type IgeMergePiece } from "@/engine/webgl/IgeGeometryMerge";
import { IgeHlod, type IgeHlodNode, type IgeHlodOptions, type IgeHlodViewpoint } from "@/engine/webgl/IgeHlod";
import { igeBuildHlodProxy, igeClusterGeometry, igeDropSmallParts } from "@/engine/webgl/IgeHlodBuilder";
import { IGE_QUANTISED_ENCODINGS, unpackVertices } from "@/engine/webgl/IgeVertexPacking";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

const cube = IgePrimitiveGeometry.createCube(1, "hlodTestCube");
const place = (x: number, y: number, z: number, w: number, h: number, d: number): number[] => [w, 0, 0, 0, 0, h, 0, 0, 0, 0, d, 0, x, y + h / 2, z, 1];

/** A 64 m chunk: four buildings, each with window ledges, and some bollards. */
function chunkPieces (cx: number, cz: number, material: unknown = "atlas"): IgeMergePiece[] {
	const pieces: IgeMergePiece[] = [];
	for (let i = 0; i < 4; i++) {
		const x = cx * 64 + 8 + (i % 2) * 30, z = cz * 64 + 8 + Math.floor(i / 2) * 30, h = 12 + i * 3;
		pieces.push({ geometry: cube, matrix: place(x + 10, 0, z + 10, 20, h, 20), material, color: [0.7, 0.6, 0.5] });
		// Ledges: 0.3 m deep, along the front at each floor
		for (let f = 1; f < h / 3; f++) pieces.push({ geometry: cube, matrix: place(x + 10, f * 3, z - 0.15, 18, 0.2, 0.3), material, color: [0.9, 0.9, 0.9] });
		// Bollards
		for (let b = 0; b < 4; b++) pieces.push({ geometry: cube, matrix: place(x + b * 5, 0, z - 3, 0.25, 0.9, 0.25), material: "paving" });
	}
	return pieces;
}

const triangles = (g: IgeGeometryData3d) => Math.floor((g.indices?.length ?? 0) / 3);

// Just enough of an engine for mounting content entities (no renderer: nothing to upload)
beforeAll(() => {
	(ige as unknown as { engine: unknown }).engine = { renderer: () => undefined, _bounds2d: new IgePoint2d(800, 600), _tickDelta: 16, _currentTime: 0, _tickStart: 0 };
});

describe("HLOD proxies (igeBuildHlodProxy)", () => {
	it("a 2 x 2 group of chunks: a fraction of the triangles, ledges and bollards gone, one draw when its materials are mapped to one", () => {
		const pieces = [0, 1].flatMap((x) => [0, 1].map((z) => chunkPieces(x, z))).flat();
		const proxies = igeBuildHlodProxy(pieces, { id: "g", error: 2, material: () => "atlas" });
		expect(proxies).toHaveLength(1);
		const [p] = proxies;
		expect(p.sourceTriangles).toBe(pieces.length * 12);
		// 16 buildings, a box each at most (and shared faces gone)
		expect(p.triangles).toBeLessThanOrEqual(16 * 12);
		expect(p.triangles).toBeLessThan(p.sourceTriangles / 8);
		expect(p.droppedParts).toBeGreaterThan(0);
		// Nothing moved further than the cell's diagonal from where it was: each corner near a building's box
		const v = p.geometry.vertices!;
		for (let i = 0; i < v.length / 3; i++) expect(v[i * 3 + 1]).toBeLessThanOrEqual(12 + 9 + 2 * Math.sqrt(3) + 1e-6);
		expect(p.geometry.boundingSphere!.radius).toBeGreaterThan(50);
	});

	it("keeps the materials apart unless mapped, and packs quantised ready to upload", () => {
		const proxies = igeBuildHlodProxy(chunkPieces(0, 0), { id: "c", error: 0.05, minSize: 0, pack: IGE_QUANTISED_ENCODINGS });
		expect(proxies.map((p) => p.material).sort()).toEqual(["atlas", "paving"]);
		const atlas = proxies.find((p) => p.material === "atlas")!;
		expect(atlas.geometry.packed).toBeDefined();
		expect(atlas.geometry.vertices).toBeUndefined();
		const back = unpackVertices(atlas.geometry.packed!);
		expect(back.vertices!.length / 3).toBe(atlas.geometry.packed!.count);
		// Small enough an error: every box kept (12 triangles each, unless two faces of a ledge meet a wall)
		expect(atlas.triangles).toBeGreaterThan(atlas.sourceTriangles * 0.8);
	});

	it("edge collapses (method collapse) keep closed boxes: they stop where clustering goes on", () => {
		const pieces = chunkPieces(0, 0).filter((p) => p.material === "atlas");
		const [cluster] = igeBuildHlodProxy(pieces, { error: 2, minSize: 0 });
		const [collapse] = igeBuildHlodProxy(pieces, { error: 2, minSize: 0, method: "collapse" });
		expect(collapse.triangles).toBeGreaterThan(cluster.triangles);
	});

	it("drops parts smaller than the size, finding parts across hard edges (a cube's faces don't share corners)", () => {
		const two: IgeGeometryData3d = igeBuildHlodProxy([
			{ geometry: cube, matrix: place(0, 0, 0, 10, 10, 10) },
			{ geometry: cube, matrix: place(20, 0, 0, 0.5, 0.5, 0.5) }
		], { error: 0.001, minSize: 0 })[0].geometry;
		const { geometry, dropped } = igeDropSmallParts(two, 1);
		expect(dropped).toBe(1);
		expect(triangles(geometry)).toBe(12);
		// A post 6 m tall but 0.3 m across is a line: dropped; a wall 6 m by 4 m but 0.3 m thick isn't
		const posts = igeBuildHlodProxy([
			{ geometry: cube, matrix: place(0, 0, 0, 0.3, 6, 0.3) },
			{ geometry: cube, matrix: place(10, 0, 0, 6, 4, 0.3) }
		], { error: 0.001, minSize: 0 })[0].geometry;
		expect(igeDropSmallParts(posts, 1).dropped).toBe(1);
		expect(triangles(igeDropSmallParts(posts, 1).geometry)).toBe(12);
	});

	it("clustering: a box bigger than the cell stays a box, flat-shaded; one smaller than a cell goes", () => {
		const big = igeBuildHlodProxy([{ geometry: cube, matrix: place(0.5, 0.5, 0.5, 6, 6, 6) }], { error: 0.001, minSize: 0 })[0].geometry;
		const out = igeClusterGeometry(big, 2);
		expect(triangles(out)).toBe(12);
		const n = out.normals!;
		for (let i = 0; i < n.length / 3; i++) expect(Math.abs(n[i * 3]) + Math.abs(n[i * 3 + 1]) + Math.abs(n[i * 3 + 2])).toBeCloseTo(1, 5);
		const small = igeBuildHlodProxy([{ geometry: cube, matrix: place(0.5, 0.25, 0.5, 0.5, 0.5, 0.5) }], { error: 0.001, minSize: 0 })[0].geometry;
		expect(triangles(igeClusterGeometry(small, 2))).toBe(0);
	});
});

/** A 16 x 16 world of 64 m chunks: levels 1 (2 x 2) beyond 150 m, 2 (4 x 4) beyond 300 m, 3 (8 x 8) beyond 600 m. */
function world (options: Partial<IgeHlodOptions> = {}) {
	const loads: string[] = [];
	const pending = new Map<string, () => void>();
	const unloads: string[] = [];
	const hlod = new IgeHlod({
		cellSize: 64, cells: { x: 16, z: 16 }, minY: 0, maxY: 30,
		levels: [{ distance: 150 }, { distance: 300 }, { distance: 600 }],
		fade: 0,
		load: (node) => {
			loads.push(node.key);
			return null;
		},
		unload: (node) => {
			unloads.push(node.key);
		},
		viewpoints: () => [],
		...options
	});
	return { hlod, loads, pending, unloads };
}

/** Flush the loads' promises. */
const settle = async () => {
	for (let i = 0; i < 6; i++) await Promise.resolve();
};

/** Every node drawn, by walking the tree. */
function drawnNodes (hlod: IgeHlod): IgeHlodNode[] {
	const out: IgeHlodNode[] = [];
	const walk = (level: number, x: number, z: number) => {
		const n = hlod.node(level, x, z);
		if (!n) return;
		if (hlod.drawn(n)) out.push(n);
		if (level > 0) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) walk(level - 1, x * 2 + dx, z * 2 + dz);
	};
	for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) walk(3, x, z);
	return out;
}

/** Each chunk drawn by how many nodes. */
function coverage (hlod: IgeHlod): number[] {
	const cover = new Array(256).fill(0);
	for (const n of drawnNodes(hlod)) {
		for (let z = n.cells.z0; z < n.cells.z1; z++) for (let x = n.cells.x0; x < n.cells.x1; x++) cover[z * 16 + x]++;
	}
	return cover;
}

const at = (x: number, z: number, y = 2): IgeHlodViewpoint[] => [{ x, y, z }];

describe("HLOD proxies: no z-fighting built in", () => {
	it("flat faces stacked in one row of cells keep their own heights (a roof slab on a building's top doesn't merge into it)", () => {
		// A 20 m building 12 m tall with a 0.6 m roof slab on top; cells 8 m across, 2 m tall: both tops in one row
		const pieces: IgeMergePiece[] = [
			{ geometry: cube, matrix: place(10, 0, 10, 20, 12, 20), color: [0.7, 0.6, 0.5] },
			{ geometry: cube, matrix: place(10, 12, 10, 19, 0.6, 19), color: [0.35, 0.35, 0.37] }
		];
		for (const offset of [0, 0.3, 3.7]) {
			// (Wherever the cell boundaries fall: shifted under the roof's corners too)
			const shifted = pieces.map((p) => ({ ...p, matrix: (p.matrix as number[]).map((v, i) => (i === 12 || i === 14 ? v + offset : v)) }));
			const [proxy] = igeBuildHlodProxy(shifted, { error: 8, heightError: 2, minSize: 0 });
			const v = proxy.geometry.vertices!, n = proxy.geometry.normals!, idx = proxy.geometry.indices!;
			const ups = new Set<number>();
			for (let t = 0; t < idx.length / 3; t++) {
				const a = idx[t * 3];
				if (n[a * 3 + 1] > 0.99) ups.add(Math.round(v[a * 3 + 1] * 100) / 100);
			}
			// The building's top at 12 m and the roof's at 12.6 m, apart: nothing up-facing in between
			expect([...ups].sort()).toEqual([12, 12.6]);
		}
	});
});

describe("IgeHlod: picking levels", () => {
	it("chunks near the camera, bigger groups further off; every chunk drawn exactly once", async () => {
		const { hlod } = world();
		for (let i = 0; i < 40; i++) {
			hlod.select(at(100, 100), i * 16);
			await settle();
		}
		expect(coverage(hlod).every((c) => c === 1)).toBe(true);
		expect(hlod.stats().holes).toBe(0);
		const drawn = drawnNodes(hlod);
		// The chunk under the camera at full detail; the far corner in an 8 x 8 group
		expect(drawn.find((n) => n.cells.x0 <= 1 && n.cells.x1 > 1 && n.cells.z0 <= 1 && n.cells.z1 > 1)!.level).toBe(0);
		expect(drawn.find((n) => n.cells.x1 === 16 && n.cells.z1 === 16)!.level).toBe(3);
		const levels = hlod.stats().drawn;
		expect(levels[0]).toBeGreaterThan(0);
		expect(levels[3]).toBeGreaterThan(0);
	});

	it("from high up, nothing at full detail: the whole world in a few groups", async () => {
		const { hlod } = world();
		for (let i = 0; i < 20; i++) {
			hlod.select(at(512, 512, 2000), i * 16);
			await settle();
		}
		expect(coverage(hlod).every((c) => c === 1)).toBe(true);
		expect(hlod.stats().drawn).toEqual([0, 0, 0, 4]);
	});

	it("screen size: the same choice by on-screen size (and orthographic cameras pick by scale alone)", async () => {
		// Groups under 200 px across. At 1500 px a unit (at a unit's distance) from 2 km up: 4 x 4 groups (362 m
		// across) are 271 px and split; 2 x 2 ones (181 m) are 136 px and kept
		const { hlod } = world({ levels: [{ screenSize: 200 }, { screenSize: 200 }, { screenSize: 200 }] });
		for (let i = 0; i < 20; i++) {
			hlod.select([{ x: 512, y: 2000, z: 512, pixelsPerUnit: 1500 }], i * 16);
			await settle();
		}
		expect(hlod.stats().drawn).toEqual([0, 64, 0, 0]);
		// Orthographic, 0.4 px a unit: the 8 x 8 groups (724 m across) are 290 px and split, 4 x 4 ones 145 px and kept
		const { hlod: ortho } = world({ levels: [{ screenSize: 200 }, { screenSize: 200 }, { screenSize: 200 }] });
		for (let i = 0; i < 20; i++) {
			ortho.select([{ x: 512, y: 2000, z: 512, pixelsPerUnit: 0.4, orthographic: true }], i * 16);
			await settle();
		}
		expect(ortho.stats().drawn).toEqual([0, 0, 16, 0]);
	});

	it("beyond maxDistance nothing is drawn or loaded", async () => {
		const { hlod, loads } = world({ maxDistance: 400 });
		for (let i = 0; i < 20; i++) {
			hlod.select(at(32, 32), i * 16);
			await settle();
		}
		const cover = coverage(hlod);
		expect(cover[0]).toBe(1);
		expect(cover[255]).toBe(0);
		expect(loads.some((k) => k === "0:15:15")).toBe(false);
	});

	it("hysteresis: moving back and forth across a threshold doesn't swap each time", async () => {
		const { hlod } = world({ levels: [{ distance: 150 }, { distance: 1e6 }, { distance: 1e7 }] });
		// The chunks 0..1 (group 1:0:0) seen from straight along x, 145 to 155 m off its edge
		const group = () => hlod.node(1, 0, 0)!;
		let swaps = 0, last: boolean | undefined;
		// (Loaded first, from the threshold)
		for (let i = 0; i < 10; i++) {
			hlod.select([{ x: 278, y: 10, z: 64 }], i * 16);
			await settle();
		}
		for (let i = 0; i < 60; i++) {
			const d = 150 + Math.sin(i / 3) * 5;
			hlod.select([{ x: 128 + d, y: 10, z: 64 }], i * 16);
			await settle();
			const now = hlod.drawn(group());
			if (last !== undefined && now !== last) swaps++;
			last = now;
		}
		expect(swaps).toBe(0);
	});
});

describe("IgeHlod: no holes while loading", () => {
	/** Loads that wait until let go. */
	function slow () {
		const release = new Map<string, () => void>();
		const w = world({
			load: (node) => new Promise((resolve) => {
				release.set(node.key, () => resolve(null));
			})
		});
		return { ...w, release };
	}

	it("a group stays drawn until all four of its children are ready, then they take over", async () => {
		const { hlod, release } = slow();
		// Far off: the top groups load and are drawn
		for (let i = 0; i < 4; i++) {
			hlod.select(at(512, 512, 5000), i * 16);
			for (const go of release.values()) go();
			await settle();
		}
		expect(hlod.stats().drawn).toEqual([0, 0, 0, 4]);
		release.clear();
		// Come down over one corner: its group wants its children; hold one back
		// (400 m up: the corner's 8 x 8 group splits, its 4 x 4 ones don't)
		hlod.select(at(100, 100, 400), 100);
		await settle();
		const top = hlod.node(3, 0, 0)!;
		const kids = [...release.keys()].filter((k) => k.startsWith("2:"));
		expect(kids).toHaveLength(4);
		for (const k of kids.slice(1)) release.get(k)!();
		await settle();
		hlod.select(at(100, 100, 400), 116);
		expect(hlod.drawn(top)).toBe(true);
		expect(coverage(hlod).every((c) => c === 1)).toBe(true);
		release.get(kids[0])!();
		await settle();
		hlod.select(at(100, 100, 400), 132);
		expect(hlod.drawn(top)).toBe(false);
		expect(coverage(hlod).every((c) => c === 1)).toBe(true);
	});

	it("children stay drawn until their group is ready again (going back up)", async () => {
		const { hlod, release } = slow();
		const step = async (v: IgeHlodViewpoint[], t: number, letGo = true) => {
			hlod.select(v, t);
			if (letGo) for (const go of release.values()) go();
			await settle();
		};
		for (let i = 0; i < 30; i++) await step(at(100, 100), i * 16);
		expect(coverage(hlod).every((c) => c === 1)).toBe(true);
		// Up high, groups not loaded before (the far ones), held back: what was drawn stays, nothing missing
		release.clear();
		for (let i = 0; i < 5; i++) {
			await step(at(100, 100, 5000), 1000 + i * 16, false);
			expect(coverage(hlod).every((c) => c === 1)).toBe(true);
		}
		for (const go of release.values()) go();
		await settle();
		await step(at(100, 100, 5000), 2000);
		await step(at(100, 100, 5000), 2016);
		expect(hlod.stats().drawn).toEqual([0, 0, 0, 4]);
	});
});

describe("IgeHlod: loading and letting go", () => {
	it("loads the cut nearest first, a few at a time, with the parents ahead", async () => {
		const order: { key: string; level: number }[] = [];
		const release: (() => void)[] = [];
		const { hlod } = world({
			concurrency: 2,
			load: (node) => {
				order.push({ key: node.key, level: node.level });
				return new Promise((r) => release.push(() => r(null)));
			}
		});
		hlod.select(at(32, 32), 0);
		await settle();
		expect(order).toHaveLength(2);
		// The camera's own chunk first
		expect(order[0].key).toBe("0:0:0");
		while (release.length) {
			release.shift()!();
			await settle();
			hlod.select(at(32, 32), 16);
		}
		// Parents of what's drawn were loaded too
		expect(order.some((o) => o.key === "1:0:0")).toBe(true);
	});

	it("lets content go after `keep` seconds out of use, and aborts loads no longer wanted", async () => {
		let aborted = 0;
		const { hlod, unloads } = world({
			keep: 1,
			load: (node, signal) => {
				signal.addEventListener("abort", () => aborted++);
				return node.level === 0 && node.x === 15 ? new Promise(() => undefined) : null;
			}
		});
		for (let i = 0; i < 20; i++) {
			hlod.select(at(32, 32), i * 16);
			await settle();
		}
		const loadedNear = hlod.stats().loaded;
		expect(loadedNear).toBeGreaterThan(0);
		// Fly to the far corner: the chunk at x 15 never finishes; fly back before it does, then wait
		for (let i = 0; i < 5; i++) {
			hlod.select(at(1000, 1000), 400 + i * 16);
			await settle();
		}
		hlod.select(at(32, 32), 600);
		await settle();
		expect(aborted).toBeGreaterThan(0);
		for (let i = 0; i < 5; i++) {
			hlod.select(at(32, 32), 3000 + i * 16);
			await settle();
		}
		expect(unloads.some((k) => k.startsWith("0:15") || k.startsWith("0:14"))).toBe(true);
	});
});

describe("IgeHlod: cross-fades", () => {
	it("old and new levels fade over `fade` seconds with complementary dithers, then the old is hidden", async () => {
		const made = new Map<string, IgeEntity>();
		const { hlod } = world({
			fade: 0.25,
			load: (node) => {
				const e = new IgeEntity();
				made.set(node.key, e);
				return e;
			}
		});
		for (let i = 0; i < 10; i++) {
			hlod.select(at(512, 512, 5000), i * 300);
			await settle();
		}
		const top = made.get("3:0:0")!;
		expect(top._hidden).toBe(false);
		expect(top._lodFade ?? 0).toBe(0);
		// Down over the corner: its level-2 children load...
		hlod.select(at(100, 100, 400), 5000);
		await settle();
		hlod.select(at(100, 100, 400), 5000);
		const kid = made.get("2:0:0")!;
		// ...and fade in as the group fades out, the same share each way
		hlod.select(at(100, 100, 400), 5100);
		expect(kid._lodFade!).toBeGreaterThan(0);
		expect(kid._lodFade!).toBeLessThan(1);
		expect(top._lodFade!).toBeCloseTo(-kid._lodFade!, 6);
		hlod.select(at(100, 100, 400), 5400);
		expect(kid._lodFade ?? 0).toBe(0);
		expect(top._hidden).toBe(true);
	});
});
