import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";

const at = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

/** Hips at (0, 1, 0) with a leg (down) and a spine (up), each with an end bone. */
function body (): IgeSkeletonData {
	const bone = (name: string, index: number, parentIndex: number, local: Float32Array, childIndices: number[]) => ({
		name, index, parentIndex, childIndices, localBindTransform: local, inverseBindMatrix: at(0, 0, 0)
	});
	const bones = [
		bone("Hips", 0, -1, at(0, 1, 0), [1, 3]),
		bone("Leg", 1, 0, at(0.2, 0, 0), [2]),
		bone("Foot", 2, 1, at(0, -1, 0), []),
		bone("Spine", 3, 0, at(0, 0.3, 0), [4]),
		bone("Head", 4, 3, at(0, 0, 0.5), [])
	];
	return { id: `body-${Math.random()}`, name: "body", bones, rootBoneIndices: [0], boneCount: bones.length } as IgeSkeletonData;
}

const position = (world: Float32Array, i: number) => [world[i * 16 + 12], world[i * 16 + 13], world[i * 16 + 14]].map((v) => Math.round(v * 1000) / 1000 + 0);
const yaw = (a: number): [number, number, number, number] => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];

describe("Bone rotations after the pose", () => {
	it("turns a bone's subtree about its joint, and an inner rotation from where the outer one left it", () => {
		const manager = new IgeWebGlSkeletonManager();
		const skeleton = createSkeletonInstance(body());
		// Legs turned 90 degrees one way, the spine back the other: legs turn, upper body doesn't
		skeleton.boneRotations = [{ bone: 3, q: yaw(-Math.PI / 2) }, { bone: 0, q: yaw(Math.PI / 2) }];
		skeleton.dirty = true;
		manager.updateSkeletonMatrices(skeleton);
		const w = skeleton.worldMatrices;
		expect(position(w, 0)).toEqual([0, 1, 0]); // the hips' joint stays put
		expect(position(w, 1)).toEqual([0, 1, -0.2]); // the leg swung round the hips
		expect(position(w, 4)).toEqual([0, 1.3, 0.5]); // the head faces forward again
		// Skin matrices follow (world * inverse bind; identity here)
		expect(Array.from(skeleton.skinMatrices.slice(16, 32))).toEqual(Array.from(w.slice(16, 32)));
	});
});
