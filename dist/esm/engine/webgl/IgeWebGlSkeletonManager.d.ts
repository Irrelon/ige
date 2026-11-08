import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeSkeleton, IgeSkeletonData } from "../../types/IgeSkeletonData.js";
/**
 * Manages skeleton instances for skeletal animation.
 * Handles bone hierarchy traversal and matrix computation.
 */
export declare class IgeWebGlSkeletonManager extends IgeBaseClass {
    classId: string;
    protected _skeletonData: Map<string, IgeSkeletonData>;
    protected _skeletons: Map<string, IgeSkeleton>;
    private _tempMat4;
    constructor();
    /**
     * Register skeleton data (shared across all instances).
     */
    registerSkeletonData(data: IgeSkeletonData): void;
    /**
     * Get skeleton data by ID.
     */
    getSkeletonData(skeletonId: string): IgeSkeletonData | undefined;
    /**
     * Create a new skeleton instance from registered skeleton data.
     * Each animated entity gets its own skeleton instance.
     */
    createSkeletonInstance(skeletonDataId: string, instanceId: string): IgeSkeleton | null;
    /**
     * Get a skeleton instance by ID.
     */
    getSkeletonInstance(instanceId: string): IgeSkeleton | undefined;
    /**
     * Delete a skeleton instance.
     */
    deleteSkeletonInstance(instanceId: string): void;
    /**
     * Update world and skin matrices for a skeleton.
     * Call this after animation has updated local matrices.
     */
    updateSkeletonMatrices(skeleton: IgeSkeleton): void;
    /**
     * Recursively compute world matrix for a bone and its children.
     */
    private _computeWorldMatrixRecursive;
    /**
     * Set the local transform matrix for a specific bone.
     * Used by animation system to apply keyframe transforms.
     */
    setBoneLocalMatrix(skeleton: IgeSkeleton, boneIndex: number, matrix: Float32Array): void;
    /**
     * Set individual bone transform components.
     * More efficient when animation channels target specific TRS components.
     */
    setBoneLocalTransform(skeleton: IgeSkeleton, boneIndex: number, translation?: Float32Array, rotation?: Float32Array, // Quaternion [x, y, z, w]
    scale?: Float32Array): void;
    /**
     * Reset skeleton to bind pose.
     */
    resetToBindPose(skeleton: IgeSkeleton): void;
    /**
     * Multiply two 4x4 matrices.
     * out = a * b (column-major)
     */
    private _multiplyMat4;
    /**
     * Get statistics about managed skeletons.
     */
    getStats(): {
        skeletonDataCount: number;
        skeletonInstanceCount: number;
        skeletonData: string[];
        skeletonInstances: string[];
    };
    /**
     * Clean up all skeletons.
     */
    cleanup(): void;
}
