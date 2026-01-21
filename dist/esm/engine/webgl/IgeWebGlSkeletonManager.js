import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { MAX_BONES } from "../../types/IgeSkeletonData.js"
/**
 * Manages skeleton instances for skeletal animation.
 * Handles bone hierarchy traversal and matrix computation.
 */
export class IgeWebGlSkeletonManager extends IgeBaseClass {
    classId = "IgeWebGlSkeletonManager";
    // Static skeleton data (shared across instances)
    _skeletonData = new Map();
    // Active skeleton instances
    _skeletons = new Map();
    // Temporary matrices for computation
    _tempMat4 = new Float32Array(16);
    constructor() {
        super();
    }
    /**
     * Register skeleton data (shared across all instances).
     */
    registerSkeletonData(data) {
        if (data.boneCount > MAX_BONES) {
            this.log(`Skeleton "${data.id}" has ${data.boneCount} bones, exceeding limit of ${MAX_BONES}`, "warning");
        }
        this._skeletonData.set(data.id, data);
        this.log(`Registered skeleton data "${data.id}" with ${data.boneCount} bones`);
    }
    /**
     * Get skeleton data by ID.
     */
    getSkeletonData(skeletonId) {
        return this._skeletonData.get(skeletonId);
    }
    /**
     * Create a new skeleton instance from registered skeleton data.
     * Each animated entity gets its own skeleton instance.
     */
    createSkeletonInstance(skeletonDataId, instanceId) {
        const data = this._skeletonData.get(skeletonDataId);
        if (!data) {
            this.log(`Skeleton data "${skeletonDataId}" not found`, "error");
            return null;
        }
        const boneCount = data.boneCount;
        // Create skeleton instance with matrix arrays
        const skeleton = {
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
    getSkeletonInstance(instanceId) {
        return this._skeletons.get(instanceId);
    }
    /**
     * Delete a skeleton instance.
     */
    deleteSkeletonInstance(instanceId) {
        this._skeletons.delete(instanceId);
    }
    /**
     * Update world and skin matrices for a skeleton.
     * Call this after animation has updated local matrices.
     */
    updateSkeletonMatrices(skeleton) {
        if (!skeleton.dirty) {
            return;
        }
        const data = skeleton.data;
        // Compute world matrices by traversing hierarchy from roots
        for (const rootIndex of data.rootBoneIndices) {
            this._computeWorldMatrixRecursive(skeleton, rootIndex, null);
        }
        // Compute skin matrices: skinMatrix = worldMatrix * inverseBindMatrix
        for (let i = 0; i < data.boneCount; i++) {
            const bone = data.bones[i];
            const worldOffset = i * 16;
            const skinOffset = i * 16;
            this._multiplyMat4(skeleton.skinMatrices, skinOffset, skeleton.worldMatrices, worldOffset, bone.inverseBindMatrix, 0);
        }
        skeleton.dirty = false;
    }
    /**
     * Recursively compute world matrix for a bone and its children.
     */
    _computeWorldMatrixRecursive(skeleton, boneIndex, parentWorldMatrix) {
        const bone = skeleton.data.bones[boneIndex];
        const localOffset = boneIndex * 16;
        const worldOffset = boneIndex * 16;
        if (parentWorldMatrix) {
            // worldMatrix = parentWorld * localMatrix
            this._multiplyMat4(skeleton.worldMatrices, worldOffset, parentWorldMatrix, 0, skeleton.localMatrices, localOffset);
        }
        else {
            // Root bone: worldMatrix = localMatrix
            for (let i = 0; i < 16; i++) {
                skeleton.worldMatrices[worldOffset + i] = skeleton.localMatrices[localOffset + i];
            }
        }
        // Process children
        for (const childIndex of bone.childIndices) {
            this._computeWorldMatrixRecursive(skeleton, childIndex, new Float32Array(skeleton.worldMatrices.buffer, worldOffset * 4, 16));
        }
    }
    /**
     * Set the local transform matrix for a specific bone.
     * Used by animation system to apply keyframe transforms.
     */
    setBoneLocalMatrix(skeleton, boneIndex, matrix) {
        const offset = boneIndex * 16;
        skeleton.localMatrices.set(matrix, offset);
        skeleton.dirty = true;
    }
    /**
     * Set individual bone transform components.
     * More efficient when animation channels target specific TRS components.
     */
    setBoneLocalTransform(skeleton, boneIndex, translation, rotation, // Quaternion [x, y, z, w]
    scale) {
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
    resetToBindPose(skeleton) {
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
    _multiplyMat4(out, outOffset, a, aOffset, b, bOffset) {
        const a00 = a[aOffset + 0], a01 = a[aOffset + 1], a02 = a[aOffset + 2], a03 = a[aOffset + 3];
        const a10 = a[aOffset + 4], a11 = a[aOffset + 5], a12 = a[aOffset + 6], a13 = a[aOffset + 7];
        const a20 = a[aOffset + 8], a21 = a[aOffset + 9], a22 = a[aOffset + 10], a23 = a[aOffset + 11];
        const a30 = a[aOffset + 12], a31 = a[aOffset + 13], a32 = a[aOffset + 14], a33 = a[aOffset + 15];
        // Cache only the current line of the second matrix
        let b0 = b[bOffset + 0], b1 = b[bOffset + 1], b2 = b[bOffset + 2], b3 = b[bOffset + 3];
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
    cleanup() {
        this._skeletonData.clear();
        this._skeletons.clear();
    }
}
