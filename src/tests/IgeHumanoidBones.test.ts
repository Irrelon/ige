import { humanoidBones, restJointPositions } from "@/engine/webgl/IgeHumanoidBones";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";

/** A skeleton from [parent, x, y, z] joints in model space (no rotations), bones named bone_N. */
function rig (joints: [number, number, number, number][], armature?: Float32Array): IgeSkeletonData {
	const bones = joints.map(([parent, x, y, z], index) => {
		const p = parent >= 0 ? joints[parent] : [0, 0, 0, 0];
		const local = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x - p[1], y - p[2], z - p[3], 1]);
		return {
			name: `bone_${index}`, index, parentIndex: parent, childIndices: [] as number[],
			localBindTransform: local, inverseBindMatrix: new Float32Array(16), parentTransform: parent < 0 ? armature : undefined
		};
	});
	for (const bone of bones) if (bone.parentIndex >= 0) bones[bone.parentIndex].childIndices.push(bone.index);
	return { id: `rig-${Math.random()}`, name: "rig", bones, rootBoneIndices: [0], boneCount: bones.length } as IgeSkeletonData;
}

// An auto-rigged generated character (22 bones, no fingers), facing +Z: its right side is -X
const SWORDSMAN: [number, number, number, number][] = [
	[-1, 0.099, 0.015, -0.092], [0, 0.099, 0.072, -0.096], [1, 0.099, 0.14, -0.099], [2, 0.099, 0.218, -0.103],
	[3, 0.099, 0.303, -0.106], [4, 0.099, 0.328, -0.089],
	[3, 0.142, 0.285, -0.106], [6, 0.22, 0.25, -0.106], [7, 0.273, 0.132, -0.11], [8, 0.288, 0.026, -0.039],
	[3, 0.06, 0.285, -0.114], [10, -0.018, 0.25, -0.124], [11, -0.068, 0.132, -0.163], [12, -0.118, 0.026, -0.167],
	[0, 0.163, -0.017, -0.096], [14, 0.206, -0.213, -0.106], [15, 0.245, -0.38, -0.146], [16, 0.263, -0.447, -0.05],
	[0, 0.035, -0.017, -0.106], [18, 0.003, -0.213, -0.142], [19, -0.022, -0.38, -0.181], [20, -0.064, -0.447, -0.085]
];

describe("humanoidBones", () => {
	it("finds the main bones of a numbered rig from its shape", () => {
		const bones = humanoidBones(rig(SWORDSMAN))!;
		expect(bones).toMatchObject({
			hips: "bone_0", spine: ["bone_1", "bone_2", "bone_3"], chest: "bone_3", head: "bone_4", headEnd: "bone_5",
			left: { shoulder: "bone_6", upperArm: "bone_7", forearm: "bone_8", hand: "bone_9", thigh: "bone_14", shin: "bone_15", foot: "bone_16" },
			right: { shoulder: "bone_10", upperArm: "bone_11", forearm: "bone_12", hand: "bone_13", thigh: "bone_18", shin: "bone_19", foot: "bone_20" }
		});
		expect(bones.forward.z).toBeGreaterThan(0.95);
		expect(bones.height).toBeCloseTo(0.775, 3);
	});

	it("follows the longest chain past finger branches, and keeps its own sides when it faces -Z", () => {
		// Fingers on the left hand: two short chains off the wrist
		const fingers: [number, number, number, number][] = [
			[9, 0.29, 0.0, -0.03], [22, 0.29, -0.02, -0.02], [9, 0.3, 0.0, -0.06], [24, 0.3, -0.02, -0.07]
		];
		const facingBack = [...SWORDSMAN, ...fingers].map(([p, x, y, z]) => [p, -x, y, -z] as [number, number, number, number]);
		const bones = humanoidBones(rig(facingBack))!;
		expect(bones.forward.z).toBeLessThan(-0.95);
		// Turned round, its right hand is still its right (now on +X); the left wrist is found past the fingers
		expect(bones.right.hand).toBe("bone_13");
		expect(bones.left.hand).toBe("bone_9");
	});

	it("reads joints through a Z-up armature node", () => {
		// Stored Z-up, turned upright by the armature node (-90 degrees about X: y' = z, z' = -y)
		const zUp = SWORDSMAN.map(([p, x, y, z]) => [p, x, -z, y] as [number, number, number, number]);
		const armature = new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
		const skeleton = rig(zUp, armature);
		expect(restJointPositions(skeleton)[5].y).toBeCloseTo(0.328, 5);
		expect(humanoidBones(skeleton)?.right.hand).toBe("bone_13");
	});

	it("returns undefined for rigs that aren't humanoid", () => {
		const tail: [number, number, number, number][] = Array.from({ length: 12 }, (_, i) => [i - 1, 0, 0, i * 0.1]);
		expect(humanoidBones(rig(tail))).toBeUndefined();
	});
});
