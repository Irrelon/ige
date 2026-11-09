import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeSkeleton, IgeSkeletonData, IgeBone } from "@/types/IgeSkeletonData";
import { MAX_BONES } from "@/types/IgeSkeletonData";

/**
 * Manages skeleton instances for skeletal animation.
 * Handles bone hierarchy traversal and matrix computation.
 */
export class IgeWebGlSkeletonManager extends IgeBaseClass {
	classId = "IgeWebGlSkeletonManager";

	// Static skeleton data (shared across instances)
	protected _skeletonData: Map<string, IgeSkeletonData> = new Map();

	// Active skeleton instances
	protected _skeletons: Map<string, IgeSkeleton> = new Map();

	// Temporary matrices for computation
	private _tempMat4: Float32Array = new Float32Array(16);

	constructor() {
		super();
	}

	/**
	 * Register skeleton data (shared across all instances).
	 */
	registerSkeletonData(data: IgeSkeletonData): void {
		if (data.boneCount > MAX_BONES) {
			this.log(
				`Skeleton "${data.id}" has ${data.boneCount} bones, exceeding limit of ${MAX_BONES}`,
				"warning"
			);
		}

		this._skeletonData.set(data.id, data);
		this.log(`Registered skeleton data "${data.id}" with ${data.boneCount} bones`);
	}

	/**
	 * Get skeleton data by ID.
	 */
	getSkeletonData(skeletonId: string): IgeSkeletonData | undefined {
		return this._skeletonData.get(skeletonId);
	}

	/**
	 * Create a new skeleton instance from registered skeleton data.
	 * Each animated entity gets its own skeleton instance.
	 */
	createSkeletonInstance(skeletonDataId: string, instanceId: string): IgeSkeleton | null {
		const data = this._skeletonData.get(skeletonDataId);
		if (!data) {
			this.log(`Skeleton data "${skeletonDataId}" not found`, "error");
			return null;
		}

		const boneCount = data.boneCount;

		// Create skeleton instance with matrix arrays
		const skeleton: IgeSkeleton = {
			data,
			localMatrices: new Float32Array(boneCount * 16),
			worldMatrices: new Float32Array(boneCount * 16),
			skinMatrices: new Float32Array(boneCount * 16),
			dirty: true
		};

		// Initialize local matrices to bind pose
		for (let i = 0; i < boneCount; i++) {
			const bone = data.bones[i];
			const offset = i * 16;

			// Copy local bind transform to local matrices
			skeleton.localMatrices.set(bone.localBindTransform, offset);
		}

		this._skeletons.set(instanceId, skeleton);
		this.log(`Created skeleton instance "${instanceId}" from data "${skeletonDataId}"`);

		return skeleton;
	}

	/**
	 * Get a skeleton instance by ID.
	 */
	getSkeletonInstance(instanceId: string): IgeSkeleton | undefined {
		return this._skeletons.get(instanceId);
	}

	/**
	 * Delete a skeleton instance.
	 */
	deleteSkeletonInstance(instanceId: string): void {
		this._skeletons.delete(instanceId);
	}

	/**
	 * Update world and skin matrices for a skeleton.
	 * Call this after animation has updated local matrices.
	 */
	updateSkeletonMatrices(skeleton: IgeSkeleton): void {
		if (!skeleton.dirty) {
			return;
		}

		const data = skeleton.data;

		// Compute world matrices by traversing hierarchy from roots
		for (const rootIndex of data.rootBoneIndices) {
			this._computeWorldMatrixRecursive(skeleton, rootIndex, -1);
		}

		// Extra rotations on top of the pose (ancestors first): each turns a bone's subtree about its joint
		if (skeleton.boneRotations?.length) this._applyBoneRotations(skeleton);

		// Compute skin matrices: skinMatrix = worldMatrix * inverseBindMatrix
		for (let i = 0; i < data.boneCount; i++) {
			const bone = data.bones[i];
			const worldOffset = i * 16;
			const skinOffset = i * 16;

			this._multiplyMat4(
				skeleton.skinMatrices,
				skinOffset,
				skeleton.worldMatrices,
				worldOffset,
				bone.inverseBindMatrix,
				0
			);
		}

		skeleton.dirty = false;
	}

	/**
	 * Turn each rotated bone's subtree about the bone's joint (model space),
	 * outermost bones first so an inner bone turns from where the outer one
	 * left it.
	 */
	private _applyBoneRotations(skeleton: IgeSkeleton): void {
		const data = skeleton.data;
		const world = skeleton.worldMatrices;
		const depth = (i: number) => {
			let d = 0;
			for (let b = data.bones[i]; b && b.parentIndex >= 0; b = data.bones[b.parentIndex]) d++;
			return d;
		};
		const rotations = [...skeleton.boneRotations!].sort((a, b) => depth(a.bone) - depth(b.bone));
		const m = new Float32Array(16);
		for (const { bone, q } of rotations) {
			if (bone < 0 || bone >= data.boneCount) continue;
			const [x, y, z, w] = q;
			// M = T(p) * R * T(-p), p = the bone's joint
			const px = world[bone * 16 + 12], py = world[bone * 16 + 13], pz = world[bone * 16 + 14];
			const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
			m[0] = 1 - 2 * (yy + zz); m[1] = 2 * (xy + wz); m[2] = 2 * (xz - wy); m[3] = 0;
			m[4] = 2 * (xy - wz); m[5] = 1 - 2 * (xx + zz); m[6] = 2 * (yz + wx); m[7] = 0;
			m[8] = 2 * (xz + wy); m[9] = 2 * (yz - wx); m[10] = 1 - 2 * (xx + yy); m[11] = 0;
			m[12] = px - (m[0] * px + m[4] * py + m[8] * pz);
			m[13] = py - (m[1] * px + m[5] * py + m[9] * pz);
			m[14] = pz - (m[2] * px + m[6] * py + m[10] * pz);
			m[15] = 1;
			const stack = [bone];
			while (stack.length) {
				const i = stack.pop()!;
				const o = i * 16;
				const a0 = world[o], a1 = world[o + 1], a2 = world[o + 2], a3 = world[o + 3];
				const a4 = world[o + 4], a5 = world[o + 5], a6 = world[o + 6], a7 = world[o + 7];
				const a8 = world[o + 8], a9 = world[o + 9], a10 = world[o + 10], a11 = world[o + 11];
				const a12 = world[o + 12], a13 = world[o + 13], a14 = world[o + 14], a15 = world[o + 15];
				for (let col = 0; col < 4; col++) {
					const c0 = [a0, a4, a8, a12][col], c1 = [a1, a5, a9, a13][col], c2 = [a2, a6, a10, a14][col], c3 = [a3, a7, a11, a15][col];
					world[o + col * 4] = m[0] * c0 + m[4] * c1 + m[8] * c2 + m[12] * c3;
					world[o + col * 4 + 1] = m[1] * c0 + m[5] * c1 + m[9] * c2 + m[13] * c3;
					world[o + col * 4 + 2] = m[2] * c0 + m[6] * c1 + m[10] * c2 + m[14] * c3;
					world[o + col * 4 + 3] = c3;
				}
				for (const child of data.bones[i].childIndices) stack.push(child);
			}
		}
	}

	/**
	 * Recursively compute world matrix for a bone and its children.
	 */
	private _computeWorldMatrixRecursive(
		skeleton: IgeSkeleton,
		boneIndex: number,
		parentWorldOffset: number
	): void {
		const bone = skeleton.data.bones[boneIndex];
		const localOffset = boneIndex * 16;
		const worldOffset = boneIndex * 16;

		if (parentWorldOffset >= 0) {
			// worldMatrix = parentWorld * localMatrix (parent is read from the
			// same array by offset, so no per-bone views are allocated)
			this._multiplyMat4(
				skeleton.worldMatrices,
				worldOffset,
				skeleton.worldMatrices,
				parentWorldOffset,
				skeleton.localMatrices,
				localOffset
			);
		} else if (bone.parentTransform) {
			// Root bone under non-joint ancestors: world = ancestors * local
			this._multiplyMat4(
				skeleton.worldMatrices,
				worldOffset,
				bone.parentTransform,
				0,
				skeleton.localMatrices,
				localOffset
			);
		} else {
			// Root bone: worldMatrix = localMatrix
			for (let i = 0; i < 16; i++) {
				skeleton.worldMatrices[worldOffset + i] = skeleton.localMatrices[localOffset + i];
			}
		}

		// Process children
		const children = bone.childIndices;
		for (let i = 0; i < children.length; i++) {
			this._computeWorldMatrixRecursive(skeleton, children[i], worldOffset);
		}
	}

	/**
	 * Set the local transform matrix for a specific bone.
	 * Used by animation system to apply keyframe transforms.
	 */
	setBoneLocalMatrix(skeleton: IgeSkeleton, boneIndex: number, matrix: Float32Array): void {
		const offset = boneIndex * 16;
		skeleton.localMatrices.set(matrix, offset);
		skeleton.dirty = true;
	}

	/**
	 * Set individual bone transform components.
	 * More efficient when animation channels target specific TRS components.
	 */
	setBoneLocalTransform(
		skeleton: IgeSkeleton,
		boneIndex: number,
		translation?: Float32Array,
		rotation?: Float32Array, // Quaternion [x, y, z, w]
		scale?: Float32Array
	): void {
		const offset = boneIndex * 16;

		// Start with identity or current matrix
		// For efficiency, we compose directly from TRS components

		// Get current values or defaults
		const tx = translation ? translation[0] : 0;
		const ty = translation ? translation[1] : 0;
		const tz = translation ? translation[2] : 0;

		const sx = scale ? scale[0] : 1;
		const sy = scale ? scale[1] : 1;
		const sz = scale ? scale[2] : 1;

		// Quaternion components (default to identity)
		const qx = rotation ? rotation[0] : 0;
		const qy = rotation ? rotation[1] : 0;
		const qz = rotation ? rotation[2] : 0;
		const qw = rotation ? rotation[3] : 1;

		// Compose matrix from TRS
		// Matrix = T * R * S (column-major)
		const m = skeleton.localMatrices;

		// Rotation matrix from quaternion
		const x2 = qx + qx;
		const y2 = qy + qy;
		const z2 = qz + qz;
		const xx = qx * x2;
		const xy = qx * y2;
		const xz = qx * z2;
		const yy = qy * y2;
		const yz = qy * z2;
		const zz = qz * z2;
		const wx = qw * x2;
		const wy = qw * y2;
		const wz = qw * z2;

		// Column 0
		m[offset + 0] = (1 - (yy + zz)) * sx;
		m[offset + 1] = (xy + wz) * sx;
		m[offset + 2] = (xz - wy) * sx;
		m[offset + 3] = 0;

		// Column 1
		m[offset + 4] = (xy - wz) * sy;
		m[offset + 5] = (1 - (xx + zz)) * sy;
		m[offset + 6] = (yz + wx) * sy;
		m[offset + 7] = 0;

		// Column 2
		m[offset + 8] = (xz + wy) * sz;
		m[offset + 9] = (yz - wx) * sz;
		m[offset + 10] = (1 - (xx + yy)) * sz;
		m[offset + 11] = 0;

		// Column 3 (translation)
		m[offset + 12] = tx;
		m[offset + 13] = ty;
		m[offset + 14] = tz;
		m[offset + 15] = 1;

		skeleton.dirty = true;
	}

	/**
	 * Reset skeleton to bind pose.
	 */
	resetToBindPose(skeleton: IgeSkeleton): void {
		const data = skeleton.data;

		for (let i = 0; i < data.boneCount; i++) {
			const bone = data.bones[i];
			const offset = i * 16;
			skeleton.localMatrices.set(bone.localBindTransform, offset);
		}

		skeleton.dirty = true;
	}

	/**
	 * Multiply two 4x4 matrices.
	 * out = a * b (column-major)
	 */
	private _multiplyMat4(
		out: Float32Array,
		outOffset: number,
		a: Float32Array,
		aOffset: number,
		b: Float32Array,
		bOffset: number
	): void {
		const a00 = a[aOffset + 0],
			a01 = a[aOffset + 1],
			a02 = a[aOffset + 2],
			a03 = a[aOffset + 3];
		const a10 = a[aOffset + 4],
			a11 = a[aOffset + 5],
			a12 = a[aOffset + 6],
			a13 = a[aOffset + 7];
		const a20 = a[aOffset + 8],
			a21 = a[aOffset + 9],
			a22 = a[aOffset + 10],
			a23 = a[aOffset + 11];
		const a30 = a[aOffset + 12],
			a31 = a[aOffset + 13],
			a32 = a[aOffset + 14],
			a33 = a[aOffset + 15];

		// Cache only the current line of the second matrix
		let b0 = b[bOffset + 0],
			b1 = b[bOffset + 1],
			b2 = b[bOffset + 2],
			b3 = b[bOffset + 3];
		out[outOffset + 0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[outOffset + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[outOffset + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[outOffset + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[bOffset + 4];
		b1 = b[bOffset + 5];
		b2 = b[bOffset + 6];
		b3 = b[bOffset + 7];
		out[outOffset + 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[outOffset + 5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[outOffset + 6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[outOffset + 7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[bOffset + 8];
		b1 = b[bOffset + 9];
		b2 = b[bOffset + 10];
		b3 = b[bOffset + 11];
		out[outOffset + 8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[outOffset + 9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[outOffset + 10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[outOffset + 11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[bOffset + 12];
		b1 = b[bOffset + 13];
		b2 = b[bOffset + 14];
		b3 = b[bOffset + 15];
		out[outOffset + 12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[outOffset + 13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[outOffset + 14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[outOffset + 15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	}

	/**
	 * Get statistics about managed skeletons.
	 */
	getStats() {
		return {
			skeletonDataCount: this._skeletonData.size,
			skeletonInstanceCount: this._skeletons.size,
			skeletonData: Array.from(this._skeletonData.keys()),
			skeletonInstances: Array.from(this._skeletons.keys())
		};
	}

	/**
	 * Clean up all skeletons.
	 */
	cleanup(): void {
		this._skeletonData.clear();
		this._skeletons.clear();
	}
}
