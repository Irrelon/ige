import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEntity } from "../core/IgeEntity.js";
import type { IgeAnimationClipData, IgeAnimationState, IgeAnimationPlayOptions, IgeAnimationSampler } from "../../types/IgeAnimationClipData.js"
import type { IgeSkeleton } from "../../types/IgeSkeletonData.js"
/**
 * Skeletal animation component for GPU-based bone animation.
 * Handles animation playback, keyframe sampling, and animation blending.
 *
 * @example
 * // Add component to entity
 * entity.addComponent(IgeSkeletalAnimationComponent);
 *
 * // Define animations (from loaded GLTF)
 * entity.skeletalAnimation.define("idle", idleClip);
 * entity.skeletalAnimation.define("walk", walkClip);
 *
 * // Play with cross-fade
 * entity.skeletalAnimation.play("walk", { crossFadeDuration: 0.2 });
 */
export declare class IgeSkeletalAnimationComponent extends IgeComponent<IgeEntity> {
    classId: string;
    componentId: string;
    protected _clips: Map<string, IgeAnimationClipData>;
    protected _activeStates: IgeAnimationState[];
    protected _skeleton?: IgeSkeleton;
    private _tempVec3A;
    private _tempVec3B;
    private _tempQuat;
    private _tempQuatA;
    private _tempQuatB;
    private _boneTranslations;
    private _boneRotations;
    private _boneScales;
    private _boneTranslationWeights;
    private _boneRotationWeights;
    private _boneScaleWeights;
    constructor(entity: IgeEntity, options?: any);
    /**
     * Set the skeleton instance to animate.
     */
    setSkeleton(skeleton: IgeSkeleton): this;
    /**
     * Define an animation clip.
     */
    define(id: string, clip: IgeAnimationClipData): this;
    /**
     * Check if an animation is defined.
     */
    defined(id: string): boolean;
    /**
     * Get an animation clip by ID.
     */
    getClip(id: string): IgeAnimationClipData | undefined;
    /**
     * Play an animation with optional cross-fade.
     */
    play(animId: string, options?: IgeAnimationPlayOptions): this;
    /**
     * Stop all animations.
     */
    stop(): this;
    /**
     * Stop a specific animation with optional fade-out.
     */
    stopAnimation(animId: string, fadeOutDuration?: number): this;
    /**
     * Check if any animation is playing.
     */
    playing(): boolean;
    /**
     * Check if a specific animation is playing.
     */
    isPlaying(animId: string): boolean;
    /**
     * Set playback speed for all active animations.
     */
    setSpeed(speed: number): this;
    /**
     * Update animation playback.
     */
    protected _update: (entity: IgeEntity, tickDelta: number) => void;
    /**
     * Sample an animation clip at a specific time and accumulate transforms.
     */
    protected _sampleAnimation(clip: IgeAnimationClipData, time: number, weight: number): void;
    /**
     * Sample a keyframe sampler at a specific time.
     */
    protected _sampleSampler(sampler: IgeAnimationSampler, time: number): Float32Array;
    /**
     * Linear interpolation of vec3.
     */
    protected _lerpVec3(a: Float32Array, aOffset: number, b: Float32Array, bOffset: number, t: number): Float32Array;
    /**
     * Spherical linear interpolation of quaternions.
     */
    protected _slerpQuaternion(a: Float32Array, aOffset: number, b: Float32Array, bOffset: number, t: number): Float32Array;
    /**
     * Apply blended transforms to the skeleton.
     */
    protected _applyBlendedTransforms(totalWeight: number): void;
    /**
     * Apply TRS transform to a specific bone in the skeleton.
     */
    protected _applyBoneTransform(boneIndex: number, translation: Float32Array, rotation: Float32Array, scale: Float32Array): void;
    /**
     * Get list of defined animation IDs.
     */
    getAnimationList(): string[];
    /**
     * Get current playback time of the first active animation.
     */
    getCurrentTime(): number;
    /**
     * Set current playback time of the first active animation.
     */
    setCurrentTime(time: number): this;
    /**
     * Clean up component.
     */
    destroy(): this;
}
