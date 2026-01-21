/**
 * Represents a single bone in a skeleton hierarchy.
 */
export interface IgeBone {
    /** Bone name from GLTF */
    name: string;
    /** Index in the flat bone array */
    index: number;
    /** Parent bone index (-1 for root bones) */
    parentIndex: number;
    /** Child bone indices */
    childIndices: number[];
    /** Local bind pose transform (4x4 matrix as 16 floats) */
    localBindTransform: Float32Array;
    /** Inverse bind matrix from GLTF skin (4x4 matrix as 16 floats) */
    inverseBindMatrix: Float32Array;
}
/**
 * Represents a complete skeleton structure (static data).
 */
export interface IgeSkeletonData {
    /** Unique identifier */
    id: string;
    /** Skeleton name */
    name: string;
    /** Array of bones in the skeleton */
    bones: IgeBone[];
    /** Indices of root-level bones (bones with no parent) */
    rootBoneIndices: number[];
    /** Total number of bones */
    boneCount: number;
}
/**
 * Runtime skeleton instance with current pose matrices.
 * Each entity with a skinned mesh gets its own skeleton instance.
 */
export interface IgeSkeleton {
    /** Reference to the static skeleton data */
    data: IgeSkeletonData;
    /**
     * Local space matrices for each bone (current pose).
     * Flat array: boneCount * 16 floats
     */
    localMatrices: Float32Array;
    /**
     * World space matrices for each bone.
     * Computed by traversing hierarchy: parent.world * local
     * Flat array: boneCount * 16 floats
     */
    worldMatrices: Float32Array;
    /**
     * Final skin matrices for GPU upload.
     * Computed as: worldMatrix * inverseBindMatrix
     * These transform vertices from bind pose to current pose.
     * Flat array: boneCount * 16 floats
     */
    skinMatrices: Float32Array;
    /** Whether matrices need recomputation */
    dirty: boolean;
}
/**
 * Maximum number of bones supported per skeleton.
 * This limit is based on WebGL uniform limits.
 * 64 bones * 16 floats per mat4 = 1024 floats = 256 vec4 uniforms
 */
export declare const MAX_BONES = 64;
/**
 * Maximum number of bone influences per vertex.
 * Standard GLTF uses 4 bones per vertex (JOINTS_0, WEIGHTS_0).
 */
export declare const BONES_PER_VERTEX = 4;
