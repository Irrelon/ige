import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { intersectTriangles, invertMat4, raycastEntities, skinnedPositions } from "@/engine/webgl/IgeRaycast";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeSkeleton } from "@/types/IgeSkeletonData";

// updateTransform() builds 3D world matrices when the renderer is the WebGL one
beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer" }) },
		configurable: true,
		writable: true
	});
});

/** A 2 x 2 square on the z = 0 plane, facing +Z. */
function square (id = "square"): IgeGeometryData3d {
	return {
		id,
		vertices: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
		indices: new Uint16Array([0, 1, 2, 0, 2, 3])
	};
}

function meshEntity (geometry: IgeGeometryData3d): IgeEntity {
	const entity = new IgeEntity();
	entity._geometryData = geometry;
	return entity;
}

const down = (x: number, y: number) => ({ origin: { x, y, z: 100 }, direction: { x: 0, y: 0, z: -1 } });

describe("IgeRaycast", () => {
	it("finds the nearest triangle and misses outside it", () => {
		const { vertices, indices } = square();
		expect(intersectTriangles(vertices!, indices, 0.5, 0.9, 10, 0, 0, -1)).toEqual({ t: 10, triangle: 1 });
		expect(intersectTriangles(vertices!, indices, 0.9, -0.5, 10, 0, 0, -1)?.triangle).toBe(0);
		expect(intersectTriangles(vertices!, indices, 1.5, 0, 10, 0, 0, -1)).toBeNull();
		// Beyond maxT, or behind the origin
		expect(intersectTriangles(vertices!, indices, 0, 0, 10, 0, 0, -1, 5)).toBeNull();
		expect(intersectTriangles(vertices!, indices, 0, 0, 10, 0, 0, 1)).toBeNull();
	});

	it("inverts matrices", () => {
		const m = new Float32Array([2, 0, 0, 0, 0, 0, 3, 0, 0, -1, 0, 0, 5, 6, 7, 1]);
		const inv = invertMat4(m)!;
		for (let col = 0; col < 4; col++) {
			for (let row = 0; row < 4; row++) {
				let sum = 0;
				for (let k = 0; k < 4; k++) sum += m[k * 4 + row] * inv[col * 4 + k];
				expect(sum).toBeCloseTo(col === row ? 1 : 0, 5);
			}
		}
		expect(invertMat4(new Float32Array(16))).toBeNull();
	});

	it("tests entities through their world transform, nearest first", () => {
		const scene = new IgeEntity();
		// Scaled up 50x and moved: covers x, y in [50, 150] at z = 20
		const near = meshEntity(square("near")).translateTo(100, 100, 20).scaleTo(50, 50, 50).mount(scene);
		const far = meshEntity(square("far")).translateTo(100, 100, -30).scaleTo(50, 50, 50).mount(scene);
		[scene, near, far].forEach((e) => e.updateTransform());

		const hits = raycastEntities({ origin: { x: 120, y: 80, z: 100 }, direction: { x: 0, y: 0, z: -1 } }, scene);
		expect(hits.map((h) => h.entity)).toEqual([near, far]);
		expect(hits[0].distance).toBeCloseTo(80, 4);
		expect(hits[0].point.x).toBeCloseTo(120, 4);
		expect(hits[0].point.z).toBeCloseTo(20, 4);
		expect(hits[0].normal.z).toBeCloseTo(1, 5);

		// From below, the normal still faces the ray
		const below = raycastEntities({ origin: { x: 120, y: 80, z: -100 }, direction: { x: 0, y: 0, z: 1 } }, scene);
		expect(below[0].entity).toBe(far);
		expect(below[0].normal.z).toBeCloseTo(-1, 5);

		// Outside the scaled square, children off, hidden and filtered entities
		expect(raycastEntities(down(10, 10), scene)).toHaveLength(0);
		expect(raycastEntities(down(120, 80), scene, { children: false })).toHaveLength(0);
		expect(raycastEntities(down(120, 80), scene, { maxDistance: 50 })).toHaveLength(0);
		near.hide();
		expect(raycastEntities(down(120, 80), scene).map((h) => h.entity)).toEqual([far]);
		near.show();
		expect(raycastEntities(down(120, 80), scene, { filter: (e) => e !== far }).map((h) => h.entity)).toEqual([near]);
	});

	it("skins vertices on the CPU by their bone weights", () => {
		const geometry: IgeGeometryData3d = {
			id: "skinned",
			vertices: new Float32Array([0, 0, 0, 1, 0, 0]),
			boneIndices: new Uint8Array([0, 0, 0, 0, 0, 1, 0, 0]),
			boneWeights: new Float32Array([1, 0, 0, 0, 0.5, 0.5, 0, 0])
		};
		const skin = new Float32Array(32);
		// Bone 0: identity; bone 1: move up 2
		skin.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 0);
		skin.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 1], 16);
		const posed = skinnedPositions(geometry, { skinMatrices: skin } as unknown as IgeSkeleton);
		expect(Array.from(posed)).toEqual([0, 0, 0, 1, 1, 0]);
	});
});
