import { clipInPlace } from "@/engine/webgl/IgeAnimationInPlace";
import type { IgeAnimationClipData } from "@/types/IgeAnimationClipData";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";

const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function translationAt (x: number, y: number, z: number) {
	const m = identity();
	m[12] = x;
	m[13] = y;
	m[14] = z;
	return m;
}

/** Hips (root, optionally under an armature node) and a spine. */
function skeleton (hipsRest: Float32Array, armature?: Float32Array): IgeSkeletonData {
	return {
		id: `test-${Math.random()}`,
		name: "test",
		bones: [
			{ name: "Hips", index: 0, parentIndex: -1, childIndices: [1], localBindTransform: hipsRest, inverseBindMatrix: identity(), parentTransform: armature },
			{ name: "Spine", index: 1, parentIndex: 0, childIndices: [], localBindTransform: translationAt(0, 0.2, 0), inverseBindMatrix: identity() }
		],
		rootBoneIndices: [0],
		boneCount: 2
	} as IgeSkeletonData;
}

function walk (keys: number[][]): IgeAnimationClipData {
	return {
		id: "walk",
		name: "walk",
		duration: 1,
		samplers: [
			{ input: new Float32Array(keys.map((_, i) => i / (keys.length - 1))), output: new Float32Array(keys.flat()), interpolation: "LINEAR", componentCount: 3 },
			{ input: new Float32Array([0, 1]), output: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]), interpolation: "LINEAR", componentCount: 4 }
		],
		channels: [
			{ samplerIndex: 0, targetBoneIndex: 0, targetPath: "translation" },
			{ samplerIndex: 1, targetBoneIndex: 1, targetPath: "rotation" }
		]
	};
}

const rounded = (values: Float32Array) => Array.from(values, (v) => Math.round(v * 1000) / 1000 + 0);

describe("clipInPlace", () => {
	it("takes out the forward drift and start offset, keeping the bob and sway", () => {
		const bones = skeleton(translationAt(0, 1, 0));
		const clip = walk([[0.1, 1, 0], [0.15, 1.05, 1], [0.1, 1, 2]]);
		const result = clipInPlace(clip, bones);

		expect(rounded(result.samplers[0].output)).toEqual([0, 1, 0, 0.05, 1.05, 0, 0, 1, 0]);
		expect(result.samplers[1]).toBe(clip.samplers[1]); // other channels untouched
		expect(rounded(clip.samplers[0].output)).toEqual([0.1, 1, 0, 0.15, 1.05, 1, 0.1, 1, 2]); // original kept
		expect(result.id).toBe("walk");
		expect(clipInPlace(clip, bones)).toBe(result); // shared between entities
	});

	it("works out world up through a Z-up armature node", () => {
		// Rotation of -90 degrees about X: local z is world up, local -y is world forward (+z)
		const armature = new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
		const bones = skeleton(translationAt(0, 0, 1), armature);
		const result = clipInPlace(walk([[0, 0, 1], [0, -1, 1.05], [0, -2, 1.1]]), bones);

		expect(rounded(result.samplers[0].output)).toEqual([0, 0, 1, 0, 0, 1.05, 0, 0, 1.1]);
	});

	it("leaves clips without root translation alone", () => {
		const clip = walk([[0, 1, 0], [0, 1, 0]]);
		clip.channels = [clip.channels[1]];
		expect(clipInPlace(clip, skeleton(translationAt(0, 1, 0)))).toBe(clip);
	});
});
