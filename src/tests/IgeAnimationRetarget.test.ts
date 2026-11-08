import { normaliseBoneName, retargetClips } from "@/engine/webgl/IgeAnimationRetarget";
import type { IgeGltfModel, IgeGltfNode } from "@/engine/webgl/IgeGltfLoader";
import type { IgeAnimationChannel, IgeAnimationClipData, IgeAnimationSampler } from "@/types/IgeAnimationClipData";
import type { IgeBone, IgeSkeletonData } from "@/types/IgeSkeletonData";

type Quat = [number, number, number, number];
type Vec3 = [number, number, number];

const mulQ = (a: Quat, b: Quat): Quat => [
	a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
	a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
	a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
	a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const conjQ = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
const axisAngle = (axis: Vec3, angle: number): Quat => {
	const len = Math.hypot(...axis);
	const s = Math.sin(angle / 2) / len;
	return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};
const rotate = (q: Quat, v: Vec3): Vec3 => {
	const r = mulQ(mulQ(q, [v[0], v[1], v[2], 0]), conjQ(q));
	return [r[0], r[1], r[2]];
};

/** Column-major TRS matrix. */
function trs (t: Vec3, q: Quat = [0, 0, 0, 1], s = 1): Float32Array {
	const [x, y, z, w] = q;
	const x2 = x + x, y2 = y + y, z2 = z + z;
	const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
	const wx = w * x2, wy = w * y2, wz = w * z2;
	return new Float32Array([
		(1 - (yy + zz)) * s, (xy + wz) * s, (xz - wy) * s, 0,
		(xy - wz) * s, (1 - (xx + zz)) * s, (yz + wx) * s, 0,
		(xz + wy) * s, (yz - wx) * s, (1 - (xx + yy)) * s, 0,
		t[0], t[1], t[2], 1
	]);
}

function expectQuat (actual: ArrayLike<number>, expected: Quat) {
	// q and -q are the same rotation
	const sign = actual[0] * expected[0] + actual[1] * expected[1] + actual[2] * expected[2] + actual[3] * expected[3] < 0 ? -1 : 1;
	for (let i = 0; i < 4; i++) expect(actual[i] * sign).toBeCloseTo(expected[i], 5);
}

function sampler (input: number[], output: number[], componentCount: number): IgeAnimationSampler {
	return { input: new Float32Array(input), output: new Float32Array(output), interpolation: "LINEAR", componentCount };
}

function channel (samplerIndex: number, targetNode: number, targetName: string, targetPath: "rotation" | "translation" | "scale"): IgeAnimationChannel {
	return { samplerIndex, targetBoneIndex: -1, targetNode, targetName, targetPath };
}

/** An animation-only source file: nodes and clips, no skin or meshes. */
function sourceModel (nodes: IgeGltfNode[], animations: IgeAnimationClipData[]): IgeGltfModel {
	return {
		id: "source",
		name: "source",
		scenes: [{ nodeIndices: [0] }],
		defaultSceneIndex: 0,
		meshes: [],
		materials: [],
		nodes,
		animations
	};
}

function skeleton (id: string, bones: { name: string; parent: number; local: Float32Array; parentTransform?: Float32Array }[]): IgeSkeletonData {
	const list: IgeBone[] = bones.map((b, index) => ({
		name: b.name,
		index,
		parentIndex: b.parent,
		childIndices: [],
		localBindTransform: b.local,
		inverseBindMatrix: new Float32Array(16),
		parentTransform: b.parentTransform
	}));
	list.forEach((bone) => {
		if (bone.parentIndex >= 0) list[bone.parentIndex].childIndices.push(bone.index);
	});
	return { id, name: id, bones: list, rootBoneIndices: list.filter((b) => b.parentIndex < 0).map((b) => b.index), boneCount: list.length };
}

describe("IgeAnimationRetarget", () => {
	it("normalises common bone name prefixes", () => {
		expect(normaliseBoneName("mixamorig:Hips")).toBe("hips");
		expect(normaliseBoneName("mixamorig1:LeftArm")).toBe("leftarm");
		expect(normaliseBoneName("mixamorig_Spine")).toBe("spine");
		expect(normaliseBoneName("Armature|Head")).toBe("head");
		expect(normaliseBoneName("Hips")).toBe("hips");
	});

	it("re-indexes clips for an identical rig and shares their keyframes", () => {
		const nodes: IgeGltfNode[] = [
			{ name: "Armature", children: [1] },
			{ name: "mixamorig:Hips", translation: [0, 1, 0], children: [2, 3] },
			{ name: "Bip01 Spine", translation: [0, 0.5, 0] },
			{ name: "Tail", translation: [0, 0, -0.5] }
		];
		const clip: IgeAnimationClipData = {
			id: "walk",
			name: "Walk",
			duration: 1,
			samplers: [
				sampler([0, 1], [0, 0, 0, 1, ...axisAngle([1, 0, 0], 0.5)], 4),
				sampler([0, 1], [0, 1, 0, 0, 1, 0.3], 3),
				sampler([0, 1], [0, 0, 0, 1, 0, 0, 0, 1], 4)
			],
			channels: [channel(0, 2, "Bip01 Spine", "rotation"), channel(1, 1, "mixamorig:Hips", "translation"), channel(2, 3, "Tail", "rotation")]
		};
		const target = skeleton("target", [
			{ name: "Spine", parent: 1, local: trs([0, 0.5, 0]) },
			{ name: "Hips", parent: -1, local: trs([0, 1, 0]) }
		]);

		const source = sourceModel(nodes, [clip]);
		const [result] = retargetClips(source, target, { boneMap: { "Bip01 Spine": "Spine" } });

		expect(result.name).toBe("Walk");
		expect(result.duration).toBe(1);
		expect(result.samplers).toBe(clip.samplers);
		expect(result.channels.map((c) => [c.targetBoneIndex, c.targetPath])).toEqual([[0, "rotation"], [1, "translation"]]);

		// Cached: every entity gets the same clip objects
		expect(retargetClips(source, target, { boneMap: { "Bip01 Spine": "Spine" } })[0]).toBe(result);

		// In-place playback drops translation
		const [inPlace] = retargetClips(source, target, { boneMap: { "Bip01 Spine": "Spine" }, translation: "none" });
		expect(inPlace.channels.map((c) => c.targetPath)).toEqual(["rotation"]);
	});

	it("reproduces each bone's motion on a rig with different bone orientations", () => {
		// Source: no rest rotations
		const nodes: IgeGltfNode[] = [
			{ name: "Armature", children: [1] },
			{ name: "Hips", translation: [0, 1, 0], children: [2] },
			{ name: "Spine", translation: [0, 0.5, 0], children: [3] },
			{ name: "Head", translation: [0, 0.3, 0] }
		];
		const hipsKey = axisAngle([0, 1, 0], Math.PI / 4);
		const spineKey = axisAngle([1, 0, 0], Math.PI / 2);
		const clip: IgeAnimationClipData = {
			id: "turn",
			name: "Turn",
			duration: 1,
			samplers: [
				sampler([0, 1], [0, 0, 0, 1, ...hipsKey], 4),
				sampler([0, 1], [0, 0, 0, 1, ...spineKey], 4)
			],
			channels: [channel(0, 1, "Hips", "rotation"), channel(1, 2, "Spine", "rotation")]
		};

		// Target: same posture and joint positions, but every bone's local
		// axes are rotated by an arbitrary constant (as in another tool's rig)
		const c: Quat[] = [axisAngle([0.3, 1, 0.2], 1.1), axisAngle([1, 0.4, -0.5], -0.7), axisAngle([0, 0.2, 1], 2.0)];
		const worldPos: Vec3[] = [[0, 1, 0], [0, 1.5, 0], [0, 1.8, 0]];
		const local = (b: number, parent: number) => {
			if (parent < 0) return trs(worldPos[b], c[b]);
			const inv = conjQ(c[parent]);
			const d: Vec3 = [worldPos[b][0] - worldPos[parent][0], worldPos[b][1] - worldPos[parent][1], worldPos[b][2] - worldPos[parent][2]];
			return trs(rotate(inv, d), mulQ(inv, c[b]));
		};
		const target = skeleton("rotatedRig", [
			{ name: "Hips", parent: -1, local: local(0, -1) },
			{ name: "Spine", parent: 0, local: local(1, 0) },
			{ name: "Head", parent: 1, local: local(2, 1) }
		]);

		const [result] = retargetClips(sourceModel(nodes, [clip]), target);
		const keyOf = (bone: number, key: number): Quat => {
			const ch = result.channels.find((x) => x.targetBoneIndex === bone && x.targetPath === "rotation")!;
			const out = result.samplers[ch.samplerIndex].output;
			return [out[key * 4], out[key * 4 + 1], out[key * 4 + 2], out[key * 4 + 3]];
		};

		// At the first key the target is in its own rest pose
		expectQuat(keyOf(0, 0), c[0]);
		expectQuat(keyOf(1, 0), mulQ(conjQ(c[0]), c[1]));

		// At the second key each bone's world rotation relative to rest
		// matches the source: source world delta of the spine is hips * spine
		const targetHips = keyOf(0, 1);
		const targetSpine = keyOf(1, 1);
		const hipsDelta = mulQ(targetHips, conjQ(c[0]));
		const spineDelta = mulQ(mulQ(targetHips, targetSpine), conjQ(c[1]));
		expectQuat(hipsDelta, hipsKey);
		expectQuat(spineDelta, mulQ(hipsKey, spineKey));
	});

	it("maps root motion across units, up axis and proportions", () => {
		// Source: Z-up armature in centimetres (as Blender/Mixamo exports)
		const nodes: IgeGltfNode[] = [
			{ name: "Armature", rotation: axisAngle([1, 0, 0], -Math.PI / 2), scale: [0.01, 0.01, 0.01], children: [1] },
			{ name: "Hips", translation: [0, 0, 100] } // 1 m above the ground
		];
		const clip: IgeAnimationClipData = {
			id: "lunge",
			name: "Lunge",
			duration: 1,
			samplers: [
				// Key 1: 50 cm along the armature's +Y, which is world -Z
				sampler([0, 1], [0, 0, 100, 0, 50, 100], 3),
				sampler([0, 1], [0, 0, 0, 1, 0, 0, 0, 1], 4)
			],
			channels: [channel(0, 1, "Hips", "translation"), channel(1, 1, "Hips", "rotation")]
		};
		// Target: Y-up metres, hips 2 m up (twice the size)
		const target = skeleton("big", [{ name: "Hips", parent: -1, local: trs([0, 2, 0]) }]);

		const [result] = retargetClips(sourceModel(nodes, [clip]), target);
		const translation = result.channels.find((x) => x.targetPath === "translation")!;
		const out = Array.from(result.samplers[translation.samplerIndex].output);
		[0, 2, 0, 0, 2, -1].forEach((value, i) => expect(out[i]).toBeCloseTo(value, 5));

		// The rest rotation (identity in the source) maps to the target's rest
		const rotation = result.channels.find((x) => x.targetPath === "rotation")!;
		expectQuat(result.samplers[rotation.samplerIndex].output.subarray(0, 4), [0, 0, 0, 1]);

		// rootScale overrides the proportion scaling
		const [unscaled] = retargetClips(sourceModel(nodes, [clip]), target, { rootScale: 1 });
		const t2 = unscaled.channels.find((x) => x.targetPath === "translation")!;
		expect(unscaled.samplers[t2.samplerIndex].output[5]).toBeCloseTo(-0.5, 5);
	});

	it("drops clips with no matching bones", () => {
		const nodes: IgeGltfNode[] = [{ name: "Wing" }];
		const clip: IgeAnimationClipData = {
			id: "flap",
			name: "Flap",
			duration: 1,
			samplers: [sampler([0], [0, 0, 0, 1], 4)],
			channels: [channel(0, 0, "Wing", "rotation")]
		};
		const target = skeleton("human", [{ name: "Hips", parent: -1, local: trs([0, 1, 0]) }]);
		expect(retargetClips(sourceModel(nodes, [clip]), target)).toEqual([]);
	});
});
