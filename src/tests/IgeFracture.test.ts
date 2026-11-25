import { igeFracture, igeFractureChecksum, igeFracturePieces, type IgeFractureOptions, type IgeFracturePiece } from "@/engine/physics/IgeFracture";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { barrierMesh, coneMesh, crateMesh, fenceMesh, paneMesh } from "./support/breakableProps";

/*
 * The fracturer on its own: deterministic, conserving volume, convex
 * closed pieces with capped cuts, the patterns, and how long it takes.
 * One unit is a centimetre.
 */

const CASES: { name: string; mesh: () => IgeGeometryData3d; options: Omit<IgeFractureOptions, "seed"> }[] = [
	{ name: "crate", mesh: crateMesh, options: { point: { x: 0, y: 10, z: 30 }, direction: { x: 0, y: 0, z: -1 }, pieces: 12, pattern: "auto" } },
	{ name: "fence panel", mesh: fenceMesh, options: { point: { x: 30, y: 60, z: 4 }, direction: { x: 0, y: 0, z: -1 }, pieces: 12, radius: 70 } },
	{ name: "glass pane", mesh: paneMesh, options: { point: { x: 20, y: 70, z: 0.4 }, direction: { x: 0, y: 0, z: -1 }, pieces: 14, glass: true } },
	{ name: "concrete barrier", mesh: barrierMesh, options: { point: { x: -40, y: 50, z: 18 }, direction: { x: 0, y: 0, z: -1 }, pieces: 10 } },
	{ name: "cone", mesh: coneMesh, options: { point: { x: 0, y: 30, z: 10 }, direction: { x: 0, y: 0, z: -1 }, pieces: 6, pattern: "slab" } }
];

function hullOk (piece: IgeFracturePiece): string | null {
	// Every triangle faces out of the piece: all its corners (or, for a piece joined from several
	// convex ones, all the corners of one of them) lie behind the triangle's plane
	const v = piece.vertices, idx = piece.indices;
	const hulls = piece.hulls ?? [piece.hull];
	const size = Math.max(piece.halfExtents.x, piece.halfExtents.y, piece.halfExtents.z);
	const tolerance = size * 1e-3 + 1e-4;
	let area = 0;
	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
		const e1 = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]];
		const e2 = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]];
		const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
		const len = Math.hypot(n[0], n[1], n[2]);
		area += len / 2;
		if (len < 1e-9) continue;
		const d = (n[0] * v[a] + n[1] * v[a + 1] + n[2] * v[a + 2]) / len;
		let worst = Infinity;
		for (const hull of hulls) {
			let most = -Infinity;
			for (let i = 0; i < hull.length; i += 3) most = Math.max(most, (n[0] * hull[i] + n[1] * hull[i + 1] + n[2] * hull[i + 2]) / len - d);
			worst = Math.min(worst, most);
		}
		if (worst > tolerance) return `a corner is ${worst.toFixed(4)} in front of triangle ${t / 3}`;
	}
	for (const hull of hulls) if (hull.length < 12) return "fewer than 4 hull points";
	if (!(piece.volume > 0)) return "no volume";
	if (area <= 0) return "no area";
	return null;
}

describe("igeFracture", () => {
	it.each(CASES)("cuts the same $name the same way every time", ({ mesh, options }) => {
		const a = igeFracture(mesh(), { ...options, seed: 42 });
		const b = igeFracture(mesh(), { ...options, seed: 42 });
		const c = igeFracture(mesh(), { ...options, seed: 43 });
		expect(a.pieces.length).toBeGreaterThan(1);
		expect(b.pieces.length).toBe(a.pieces.length);
		expect(igeFractureChecksum(b.pieces)).toBe(igeFractureChecksum(a.pieces));
		for (let i = 0; i < a.pieces.length; i++) {
			expect(Array.from(b.pieces[i].vertices)).toEqual(Array.from(a.pieces[i].vertices));
			expect(Array.from(b.pieces[i].indices)).toEqual(Array.from(a.pieces[i].indices));
			expect(b.pieces[i].centre).toEqual(a.pieces[i].centre);
		}
		// Another seed cuts differently
		expect(igeFractureChecksum(c.pieces)).not.toBe(igeFractureChecksum(a.pieces));
	});

	it.each(CASES)("keeps the $name's volume and makes every piece a closed convex hull", ({ mesh, options }) => {
		const result = igeFracture(mesh(), { ...options, seed: 7 });
		const sum = result.pieces.reduce((total, piece) => total + piece.volume, 0);
		expect(Math.abs(sum + result.droppedVolume - result.volume) / result.volume).toBeLessThan(1e-3);
		expect(result.droppedVolume / result.volume).toBeLessThan(0.01);
		for (const piece of result.pieces) {
			expect(hullOk(piece)).toBeNull();
			expect(piece.vertices.length / 3).toBe(piece.normals.length / 3);
			expect(piece.uvs.length / 2).toBe(piece.vertices.length / 3);
			expect(piece.colors.length / 4).toBe(piece.vertices.length / 3);
		}
		expect(result.nonConvexParts).toBe(0);
	});

	it("caps cut faces in the inside colour and keeps the outside's colours", () => {
		const result = igeFracture(paneMesh(), { seed: 3, point: { x: 0, y: 60, z: 0 }, glass: true, insideColor: { r: 0.2, g: 0.9, b: 0.3, a: 1 } });
		let inside = 0, outside = 0;
		for (const piece of result.pieces) {
			for (let i = 0; i < piece.colors.length; i += 4) {
				if (piece.colors[i] === Math.fround(0.2) && piece.colors[i + 1] === Math.fround(0.9)) inside++;
				else if (Math.abs(piece.colors[i] - 0.7) < 1e-6 && Math.abs(piece.colors[i + 2] - 0.9) < 1e-6) outside++;
				else throw new Error(`unexpected colour ${piece.colors.slice(i, i + 4)}`);
			}
			expect(piece.insideTriangles).toBeGreaterThan(0);
		}
		expect(inside).toBeGreaterThan(0);
		expect(outside).toBeGreaterThan(0);
	});

	it("breaks thin things into shards through their thickness, not lumps", () => {
		const pane = igeFracture(paneMesh(), { seed: 9, point: { x: 0, y: 60, z: 0 }, glass: true, pieces: 14 });
		for (const piece of pane.pieces) expect(piece.halfExtents.z * 2).toBeCloseTo(0.8, 3);
		expect(pane.pieces.length).toBeGreaterThanOrEqual(15);
		// Smaller near the hit than far from it (radial and concentric cracks)
		const near = pane.pieces.filter((p) => Math.hypot(p.centre.x, p.centre.y - 60) < 20);
		const far = pane.pieces.filter((p) => Math.hypot(p.centre.x, p.centre.y - 60) > 50);
		const mean = (list: IgeFracturePiece[]) => list.reduce((t, p) => t + p.volume, 0) / list.length;
		expect(near.length).toBeGreaterThan(0);
		expect(mean(near)).toBeLessThan(mean(far) / 4);
	});

	it("snaps a fence's planks near the hit and keeps the far end in one piece", () => {
		const result = igeFracture(fenceMesh(), { seed: 5, point: { x: 66, y: 60, z: 4 }, pieces: 12, radius: 50 });
		expect(result.parts).toBe(11);
		// Near the hit: pales in two or more pieces, long and thin (splinters), not lumps
		const near = result.pieces.filter((p) => !p.hulls && Math.abs(p.centre.x - 66) < 40);
		const byPart = new Map<number, number>();
		for (const piece of near) byPart.set(piece.part, (byPart.get(piece.part) ?? 0) + 1);
		expect([...byPart.values()].some((count) => count > 1)).toBe(true);
		for (const piece of near) expect(Math.max(piece.halfExtents.x, piece.halfExtents.y, piece.halfExtents.z)).toBeGreaterThan(3 * Math.min(piece.halfExtents.x, piece.halfExtents.y, piece.halfExtents.z));
		// The far end: its pales and the stubs of the rails, joined
		const farEnd = result.pieces.filter((p) => p.hulls && p.centre.x < -20);
		expect(farEnd.length).toBeGreaterThan(0);
		expect(farEnd[0].hulls!.length).toBeGreaterThan(3);
	});

	it("marks the largest pieces over a volume as big, at most maxBig of them", () => {
		const result = igeFracture(barrierMesh(), { seed: 11, point: { x: 0, y: 40, z: 20 }, pieces: 16, bigVolume: 20000, maxBig: 3 });
		const big = result.pieces.filter((p) => p.big);
		expect(big.length).toBeGreaterThan(0);
		expect(big.length).toBeLessThanOrEqual(3);
		const smallest = Math.min(...big.map((p) => p.volume));
		for (const piece of result.pieces) if (!piece.big) expect(piece.volume <= smallest || piece.volume < 20000).toBe(true);
		for (const piece of big) expect(piece.volume).toBeGreaterThanOrEqual(20000);
	});

	it("turns pre-made pieces into the same kind of piece", () => {
		const pieces = igeFracturePieces([paneMesh("a"), barrierMesh("b")], { bigVolume: 20000 });
		expect(pieces).toHaveLength(2);
		expect(pieces[0].big).toBe(false);
		expect(pieces[1].big).toBe(true);
		expect(pieces[1].centre.y).toBeCloseTo(80 * (2 * 10 + 30) / (3 * (10 + 30)), 1);
		for (const piece of pieces) expect(hullOk(piece)).toBeNull();
	});

	it.each(CASES)("times the $name", ({ name, mesh, options }) => {
		const geometry = mesh();
		for (let i = 0; i < 5; i++) igeFracture(geometry, { ...options, seed: i }); // warm up
		const times: number[] = [];
		let pieces = 0;
		for (let i = 0; i < 30; i++) {
			const result = igeFracture(geometry, { ...options, seed: 100 + i });
			times.push(result.ms);
			pieces += result.pieces.length;
		}
		times.sort((a, b) => a - b);
		const median = times[15];
		console.log(`fracture ${name}: best ${times[0].toFixed(2)} ms, median ${median.toFixed(2)} ms, worst ${times[29].toFixed(2)} ms, ${(pieces / 30).toFixed(1)} pieces`);
		// Generous: the machines that run the tests are often busy
		expect(times[0]).toBeLessThan(10);
	});
});
