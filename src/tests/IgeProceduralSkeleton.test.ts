import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { igeProceduralSkeleton, igeSetBonePose } from "@/engine/webgl/IgeProceduralSkeleton";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import { ige } from "@/engine/instance";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";

const at = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

const skeletonManager = new IgeWebGlSkeletonManager();

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager }) },
		configurable: true,
		writable: true
	});
});

const mesh = (): IgeGeometryData3d => ({
	id: "procedural-test",
	vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
	normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
	indices: new Uint16Array([0, 1, 2]),
	boneIndices: new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
	boneWeights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
});

describe("igeProceduralSkeleton", () => {
	const data = () => igeProceduralSkeleton("test", [{ name: "body" }, { name: "arm", rest: at(5, 10, 0) }]);

	it("makes root bones whose inverse bind undoes their rest", () => {
		const d = data();
		expect(d.boneCount).toBe(2);
		expect(d.rootBoneIndices).toEqual([0, 1]);
		expect(Array.from(d.bones[1].inverseBindMatrix.subarray(12, 15))).toEqual([-5, -10, 0]);
		expect(d.boundsFromMesh).toBe(true);
	});

	it("gives identity skin matrices at rest", () => {
		const d = data();
		const skeleton = createSkeletonInstance(d);
		igeSetBonePose(skeleton, [...at(0, 0, 0), ...at(5, 10, 0)]);
		skeletonManager.updateSkeletonMatrices(skeleton);
		expect(skeleton.dirty).toBe(false);
		for (let i = 0; i < 32; i++) expect(skeleton.skinMatrices[i]).toBeCloseTo(i % 16 % 5 === 0 ? 1 : 0, 5);
	});

	it("moves a bone's vertices by its pose", () => {
		const entity = new IgeEntity().skin(mesh(), data());
		entity.setBonePose([...at(0, 0, 0), ...at(5, 12, 0)]);
		skeletonManager.updateSkeletonMatrices(entity._skeleton!);
		// Bone 1: pose minus rest is a translation of (0, 2, 0)
		const m = entity._skeleton!.skinMatrices;
		expect(Array.from(m.subarray(16 + 12, 16 + 15))).toEqual([0, 2, 0]);
	});

	it("lets entities share one pose, and gives each its own when given data", () => {
		const d = data();
		const a = new IgeEntity().skin(mesh(), d);
		const b = new IgeEntity().skin(mesh(), a._skeleton!);
		const c = new IgeEntity().skin(mesh(), d);
		expect(b._skeleton).toBe(a._skeleton);
		expect(c._skeleton).not.toBe(a._skeleton);
		a.setBonePose(at(1, 2, 3));
		expect(b._skeleton!.localMatrices[12]).toBe(1);
		expect(c._skeleton!.localMatrices[12]).toBe(0);
	});

	it("finds a bone by name for items held on it", () => {
		const entity = new IgeEntity().skin(mesh(), data());
		entity.setBonePose([...at(0, 0, 0), ...at(8, 20, 0)]);
		(entity as any)._worldMatrix4 = { matrix: new Float32Array(at(0, 0, 0)) };
		const p = entity.bonePosition("arm");
		expect(p && [p.x, p.y, p.z]).toEqual([8, 20, 0]);
	});

	it("refuses more bones than the palette holds", () => {
		expect(() => igeProceduralSkeleton("big", Array.from({ length: 65 }, (_, i) => ({ name: `b${i}` })))).toThrow();
	});
});
