import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { createSkeletonInstance } from "@/engine/webgl/IgeModelParts";
import type { IgeBone, IgeSkeleton, IgeSkeletonData } from "@/types/IgeSkeletonData";
import { MAX_BONES } from "@/types/IgeSkeletonData";

/** One bone of a procedural skeleton: its name and where it sits at rest (a column-major 4x4, in the mesh's space). */
export interface IgeProceduralBone {
	name: string;
	/** The bone's rest transform in model space. Omit for the origin. */
	rest?: ArrayLike<number>;
}

let counter = 0;

/**
 * A skeleton made in code, for meshes built from rigid parts (a character of boxes with a bone per limb): every bone
 * is a root, its pose is a model-space matrix you write each frame with `setBonePose()` (or
 * `entity.setBonePose()`), no glTF clip involved. Weight each vertex 1.0 to its part's bone (`boneIndices`,
 * `boneWeights`), with the vertices in rest space (where the part sits when every bone is at its `rest`). The
 * skeleton's bounds follow the mesh, not the joints.
 * @example #A figure with a body and two arms
 *     const data = igeProceduralSkeleton("figure", [
 *         { name: "body" },
 *         { name: "armL", rest: translation(-9, 35, 0) },
 *         { name: "armR", rest: translation(9, 35, 0) }
 *     ]);
 */
export function igeProceduralSkeleton (id: string, bones: IgeProceduralBone[]): IgeSkeletonData {
	if (bones.length > MAX_BONES) throw new Error(`A skeleton has at most ${MAX_BONES} bones (${bones.length} given)`);
	const out: IgeBone[] = bones.map((b, index) => {
		const rest = new Float32Array(16);
		if (b.rest) rest.set(Array.prototype.slice.call(b.rest, 0, 16));
		else rest[0] = rest[5] = rest[10] = rest[15] = 1;
		const inverse = new IgeMatrix4();
		inverse.matrix.set(rest);
		const inv = inverse.getInverse();
		return {
			name: b.name,
			index,
			parentIndex: -1,
			childIndices: [],
			localBindTransform: rest,
			inverseBindMatrix: inv ? new Float32Array(inv.matrix) : new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
		};
	});
	return {
		id: `${id}#${counter++}`,
		name: id,
		bones: out,
		rootBoneIndices: out.map((b) => b.index),
		boneCount: out.length,
		boundsFromMesh: true
	};
}

/** A pose-able copy of a skeleton's matrices for one character (entities may share it: they then share its pose). */
export function igeProceduralSkeletonInstance (data: IgeSkeletonData): IgeSkeleton {
	return createSkeletonInstance(data);
}

/**
 * Sets a procedural skeleton's pose: each bone's current model-space matrix (column-major, 16 floats per bone, in
 * bone order; fewer bones leaves the rest as they were). Returns whether anything changed. The skin matrices are worked out when the frame is
 * collected (or when `bonePosition()` / `attachToBone()` ask), so call this as often as you like.
 */
export function igeSetBonePose (skeleton: IgeSkeleton, matrices: ArrayLike<number>): boolean {
	const n = Math.min(matrices.length, skeleton.localMatrices.length);
	const local = skeleton.localMatrices;
	let changed = false;
	for (let i = 0; i < n; i++) {
		if (local[i] !== matrices[i]) {
			local[i] = matrices[i];
			changed = true;
		}
	}
	// Writing the pose it already has leaves everything as it was (and the shadow cache sees a still pose)
	if (changed) skeleton.dirty = true;
	return changed;
}
