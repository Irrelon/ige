import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeSkeletalAnimationComponent } from "@/engine/components/IgeSkeletalAnimationComponent";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import type { IgeAnimationClipData } from "@/types/IgeAnimationClipData";

const at = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

/** Hips one unit up with a head above them. */
const SKELETON: IgeSkeletonData = {
	id: "finish-body",
	name: "body",
	bones: [
		{ name: "Hips", index: 0, parentIndex: -1, childIndices: [1], localBindTransform: at(0, 1, 0), inverseBindMatrix: at(0, 0, 0) },
		{ name: "Head", index: 1, parentIndex: 0, childIndices: [], localBindTransform: at(0, 0.6, 0), inverseBindMatrix: at(0, 0, 0) }
	],
	rootBoneIndices: [0],
	boneCount: 2
} as unknown as IgeSkeletonData;

/** A fall: the hips go from one unit up to the floor over a second. */
const FALL: IgeAnimationClipData = {
	id: "fall",
	name: "fall",
	duration: 1,
	samplers: [{ input: new Float32Array([0, 1]), output: new Float32Array([0, 1, 0, 0, 0.1, 0]), interpolation: "LINEAR", componentCount: 3 }],
	channels: [{ samplerIndex: 0, targetBoneIndex: 0, targetPath: "translation" }]
};

let frame = 100;
const skeletonManager = new IgeWebGlSkeletonManager();

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => frame, skeletonManager }) },
		configurable: true,
		writable: true
	});
});

function character () {
	const entity = new IgeEntity();
	const anim = new IgeSkeletalAnimationComponent(entity);
	const skeleton = createSkeletonInstance(SKELETON);
	anim.setSkeleton(skeleton);
	anim.define("fall", FALL);
	entity._skeleton = skeleton;
	return { entity, anim, skeleton, update: (ms: number) => (anim as any)._update(entity, ms) };
}

const hipsHeight = (local: Float32Array) => Math.round(local[13] * 1000) / 1000;

describe("A clip that isn't looping", () => {
	it("ends in its last frame even when it finishes while the character isn't being drawn", () => {
		const { entity, anim, skeleton, update } = character();
		anim.poseCache(false);
		anim.play("fall", { loop: false, crossFadeDuration: 0 });
		// Drawn a while ago, not since (in a room nobody can see)
		entity._lastRenderedFrame = frame - 10;
		update(2000);
		expect(hipsHeight(skeleton.localMatrices)).toBe(1);
		// Seen again: the last frame is posed, then the clip is done
		entity._lastRenderedFrame = frame;
		update(16);
		expect(hipsHeight(skeleton.localMatrices)).toBe(0.1);
		expect((anim as any)._activeStates).toHaveLength(0);
		// And it stays down
		update(16);
		expect(hipsHeight(skeleton.localMatrices)).toBe(0.1);
	});

	it("posed from the shared pose cache, leaves the skeleton's bones in that pose too", () => {
		const a = character(), b = character();
		for (const c of [a, b]) {
			c.anim.play("fall", { loop: true, crossFadeDuration: 0, startTime: 0.5 });
			c.update(0);
		}
		// b took a's sample from the cache: its bones agree with its matrices
		expect(hipsHeight(b.skeleton.localMatrices)).toBe(hipsHeight(a.skeleton.localMatrices));
		expect(hipsHeight(b.skeleton.localMatrices)).toBeCloseTo(0.55, 2);
		// Rebuilding b's matrices from its bones (as a bone rotation would) keeps the pose
		b.skeleton.dirty = true;
		skeletonManager.updateSkeletonMatrices(b.skeleton);
		expect(Array.from(b.skeleton.worldMatrices)).toEqual(Array.from(a.skeleton.worldMatrices));
	});
});
