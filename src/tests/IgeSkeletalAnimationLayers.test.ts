import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeSkeletalAnimationComponent } from "@/engine/components/IgeSkeletalAnimationComponent";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import type { IgeAnimationClipData } from "@/types/IgeAnimationClipData";

const at = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

/** Hips with a leg below and a spine above, an arm on the spine. */
const SKELETON: IgeSkeletonData = {
	id: "layers-body",
	name: "body",
	bones: [
		{ name: "Hips", index: 0, parentIndex: -1, childIndices: [1, 2], localBindTransform: at(0, 1, 0), inverseBindMatrix: at(0, 0, 0) },
		{ name: "Leg", index: 1, parentIndex: 0, childIndices: [], localBindTransform: at(0, -0.5, 0), inverseBindMatrix: at(0, 0, 0) },
		{ name: "Spine", index: 2, parentIndex: 0, childIndices: [3], localBindTransform: at(0, 0.3, 0), inverseBindMatrix: at(0, 0, 0) },
		{ name: "Arm", index: 3, parentIndex: 2, childIndices: [], localBindTransform: at(0.2, 0.3, 0), inverseBindMatrix: at(0, 0, 0) }
	],
	rootBoneIndices: [0],
	boneCount: 4
} as unknown as IgeSkeletonData;

/** A clip moving the leg and the arm forward (z) by `leg` and `arm` throughout. */
function clip (id: string, leg: number, arm: number, duration = 1): IgeAnimationClipData {
	return {
		id,
		name: id,
		duration,
		samplers: [
			{ input: new Float32Array([0, duration]), output: new Float32Array([0, -0.5, leg, 0, -0.5, leg]), interpolation: "LINEAR", componentCount: 3 },
			{ input: new Float32Array([0, duration]), output: new Float32Array([0.2, 0.3, arm, 0.2, 0.3, arm]), interpolation: "LINEAR", componentCount: 3 }
		],
		channels: [
			{ samplerIndex: 0, targetBoneIndex: 1, targetPath: "translation" },
			{ samplerIndex: 1, targetBoneIndex: 3, targetPath: "translation" }
		]
	};
}

const skeletonManager = new IgeWebGlSkeletonManager();

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager }) },
		configurable: true,
		writable: true
	});
});

function character () {
	const entity = new IgeEntity();
	const anim = new IgeSkeletalAnimationComponent(entity);
	const skeleton = createSkeletonInstance(SKELETON);
	anim.setSkeleton(skeleton);
	anim.define("walk", clip("walk", 0.4, -0.1));
	anim.define("swing", clip("swing", -1, 0.8, 0.5));
	anim.layer("upper", { root: "Spine" });
	entity._skeleton = skeleton;
	return { anim, skeleton, update: (ms: number) => (anim as any)._update(entity, ms) };
}

/** A bone's forward (z) offset from its parent. */
const forward = (local: Float32Array, bone: number) => Math.round(local[bone * 16 + 14] * 1000) / 1000;

describe("Animation layers", () => {
	it("move only their bones: the upper body swings while the legs keep walking", () => {
		const { anim, skeleton, update } = character();
		anim.play("walk", { crossFadeDuration: 0 });
		update(16);
		expect([forward(skeleton.localMatrices, 1), forward(skeleton.localMatrices, 3)]).toEqual([0.4, -0.1]);
		anim.play("swing", { layer: "upper", loop: false, crossFadeDuration: 0 });
		update(16);
		// The leg walks on; the arm (under the spine) swings
		expect([forward(skeleton.localMatrices, 1), forward(skeleton.localMatrices, 3)]).toEqual([0.4, 0.8]);
		expect(anim.layerPlaying("upper")).toBe(true);
	});

	it("blend in and out over the base, and hand back to it when they end", () => {
		const { anim, skeleton, update } = character();
		anim.play("walk", { crossFadeDuration: 0 });
		update(16);
		anim.play("swing", { layer: "upper", loop: false, crossFadeDuration: 0.1, blendOut: 0.1 });
		update(50);
		// Half faded in: halfway between the walk's arm and the swing's
		expect(forward(skeleton.localMatrices, 3)).toBeCloseTo(0.35, 2);
		update(100);
		expect(forward(skeleton.localMatrices, 3)).toBe(0.8);
		// Fading out over the last tenth of a second (half way, 0.05s from the end), then gone: the walk's arm again
		update(300);
		expect(forward(skeleton.localMatrices, 3)).toBeCloseTo(0.35, 2);
		update(100);
		expect(anim.layerPlaying("upper")).toBe(false);
		expect(forward(skeleton.localMatrices, 3)).toBe(-0.1);
		expect(forward(skeleton.localMatrices, 1)).toBe(0.4);
	});

	it("stop on request, and work with nothing playing underneath (the rest pose)", () => {
		const { anim, skeleton, update } = character();
		anim.play("swing", { layer: "upper", loop: true, crossFadeDuration: 0 });
		update(16);
		expect([forward(skeleton.localMatrices, 1), forward(skeleton.localMatrices, 3)]).toEqual([0, 0.8]);
		anim.stopLayer("upper", 0.1);
		update(200);
		update(16);
		expect(anim.layerPlaying("upper")).toBe(false);
		// Playing on a layer that doesn't exist does nothing
		anim.play("swing", { layer: "lower" });
		expect(anim.layerPlaying("lower")).toBe(false);
	});
});
