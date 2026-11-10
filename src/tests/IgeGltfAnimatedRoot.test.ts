import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeSkeletalAnimationComponent } from "@/engine/components/IgeSkeletalAnimationComponent";
import { IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";

const skeletonManager = new IgeWebGlSkeletonManager();

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager }) },
		configurable: true,
		writable: true
	});
});

/**
 * A 3ds Max style rig: "Bip001" (not a joint) over the skinned "Bip001 Pelvis" and its "Head", and a clip that
 * moves only Bip001: from standing (one unit up) down to the floor, the way a death clip falls.
 */
function rig () {
	const floats = new Float32Array([0, 1, /* times */ 0, 1, 0, 0, 0.1, 0 /* Bip001 positions */]);
	const gltf = {
		nodes: [
			{ name: "Bip001", translation: [0, 1, 0], children: [1] },
			{ name: "Bip001 Pelvis", children: [2] },
			{ name: "Bip001 Head", translation: [0, 0.5, 0] }
		],
		skins: [{ joints: [1, 2] }],
		accessors: [
			{ bufferView: 0, componentType: 5126, count: 2, type: "SCALAR" },
			{ bufferView: 1, componentType: 5126, count: 2, type: "VEC3" }
		],
		bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 8 }, { buffer: 0, byteOffset: 8, byteLength: 24 }],
		animations: [{ name: "fall", samplers: [{ input: 0, output: 1, interpolation: "LINEAR" }], channels: [{ sampler: 0, target: { node: 0, path: "translation" } }] }]
	};
	const buffers = [floats.buffer];
	const loader = new IgeGltfLoader() as any;
	const skins = loader._parseSkins(gltf, buffers, loader._parseNodes(gltf));
	const clips = loader._parseAnimations(gltf, buffers, skins);
	return { skin: skins[0], clip: clips[0] };
}

describe("glTF skins under an animated node that isn't a joint", () => {
	it("make that node a bone after the skin's joints, and its animation moves the skeleton", () => {
		const { skin, clip } = rig();
		const bones = skin.skeleton.bones;
		// The skin's joints keep their indices (the vertices refer to them); Bip001 comes after, as their root
		expect(bones.map((b: any) => b.name)).toEqual(["Bip001 Pelvis", "Bip001 Head", "Bip001"]);
		expect(bones[0].parentIndex).toBe(2);
		expect(skin.skeleton.rootBoneIndices).toEqual([2]);
		expect(clip.channels[0].targetBoneIndex).toBe(2);

		// Played to its end: the pelvis comes down with Bip001
		const entity = new IgeEntity();
		const anim = new IgeSkeletalAnimationComponent(entity);
		const skeleton = createSkeletonInstance(skin.skeleton);
		anim.setSkeleton(skeleton);
		anim.define("fall", clip);
		anim.poseCache(false);
		anim.play("fall", { loop: false, crossFadeDuration: 0 });
		(anim as any)._update(entity, 2000);
		skeleton.dirty = true;
		skeletonManager.updateSkeletonMatrices(skeleton);
		const y = (bone: number) => Math.round(skeleton.worldMatrices[bone * 16 + 13] * 1000) / 1000;
		expect(y(0)).toBe(0.1);
		expect(y(1)).toBe(0.6);
	});
});
