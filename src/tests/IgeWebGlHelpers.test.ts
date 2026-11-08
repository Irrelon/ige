import { intersectHeightfield } from "@/engine/webgl/IgeHeightfieldRay";
import { getGeometryLod, takeGeneratedLods } from "@/engine/webgl/IgeModelParts";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

/** A flat grid on the XZ plane (simplifies well). */
function grid (cells: number, id: string): IgeGeometryData3d {
	const vertices: number[] = [];
	const indices: number[] = [];
	for (let z = 0; z <= cells; z++) for (let x = 0; x <= cells; x++) vertices.push(x, 0, z);
	for (let z = 0; z < cells; z++) {
		for (let x = 0; x < cells; x++) {
			const a = z * (cells + 1) + x, b = a + cells + 1;
			indices.push(a, b, a + 1, a + 1, b, b + 1);
		}
	}
	return { id, vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

const pick = intersectHeightfield;

describe("plain geometry level of detail", () => {
	it("generates and caches levels for a geometry, sorted by screen size", () => {
		const geometry = grid(10, "plainGrid");
		const authored = grid(2, "authoredLite");
		const lod = getGeometryLod(geometry, [
			{ screenSize: 50, geometry: authored },
			{ screenSize: 200, ratio: 0.5 }
		])!;

		expect(lod.source).toBe(geometry);
		expect(lod.screenSizes).toEqual([200, 50]);
		expect(lod.partGeometries[0][0].id).toBe("plainGrid_lod0.5");
		expect(lod.partGeometries[0][1]).toBe(authored);

		// Generated levels are shared until taken for release
		expect(getGeometryLod(geometry, [{ screenSize: 200, ratio: 0.5 }])!.partGeometries[0][0]).toBe(lod.partGeometries[0][0]);
		expect(takeGeneratedLods(geometry).map((g) => g.id)).toEqual(["plainGrid_lod0.5"]);
		expect(takeGeneratedLods(geometry)).toEqual([]);
	});
});

describe("intersectHeightfield (screenToHeightfield)", () => {
	const down45 = { origin: { x: 0, y: 100, z: 0 }, direction: { x: Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 } };

	it("finds the ground on a slope and refines the hit", () => {
		// Ground rises along X: height = x / 2. The ray meets it at x = 66.67
		const hit = pick(down45, (x) => x / 2, { minHeight: 0, maxHeight: 200, step: 10 })!;
		expect(hit.x).toBeCloseTo(200 / 3, 1);
		expect(hit.y).toBeCloseTo(100 / 3, 1);
	});

	it("doesn't step over a narrow peak when the step is small enough", () => {
		// A 4-unit-wide wall at x = 40..44, 80 high; flat ground elsewhere
		const wall = (x: number) => (x >= 40 && x <= 44 ? 80 : 0);
		const hit = pick(down45, wall, { minHeight: 0, maxHeight: 100, step: 2 })!;
		expect(hit.x).toBeGreaterThanOrEqual(40);
		expect(hit.x).toBeLessThanOrEqual(44);
		expect(hit.y).toBe(80);
	});

	it("returns null when the ray misses the height band", () => {
		const up = { origin: { x: 0, y: 100, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
		expect(pick(up, () => 0, { minHeight: 0, maxHeight: 50 })).toBeNull();
	});
});
