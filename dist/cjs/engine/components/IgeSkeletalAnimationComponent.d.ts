import { IgeComponent } from "../core/IgeComponent.js"
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeAnimationClipData, IgeAnimationState, IgeAnimationPlayOptions, IgeAnimationSampler } from "../../types/IgeAnimationClipData.js"
import type { IgeSkeleton } from "../../types/IgeSkeletonData.js"
export declare class IgeSkeletalAnimationComponent extends IgeComponent<IgeEntity> {
    /**
     * Samples per second used by the shared pose cache (see poseCache()).
     * Entities playing the same clip on the same skeleton share one set of
     * bone matrices per quantised frame. 0 disables caching globally.
     */
    static poseCacheRate: number;
    classId: string;
    componentId: string;
    protected _clips: Map<string, IgeAnimationClipData>;
    protected _activeStates: IgeAnimationState[];
    protected _skeleton?: IgeSkeleton;
    protected _cullOffscreen: boolean;
    protected _poseCache: boolean;
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
    /**
     * Define several clips at once. An array registers each clip under its
     * name and its id; a record registers each clip under its key. Used by
     * IgeEntity.model(); doesn't log per clip.
     */
    defineClips(clips: IgeAnimationClipData[] | Record<string, IgeAnimationClipData>): this;
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
     * Gets / sets whether pose sampling is skipped while the entity is off
     * screen (default true). When the WebGL renderer did not draw the entity
     * in any viewport or shadow pass last frame, clip time, fades and
     * completion events still advance, but the expensive keyframe sampling
     * and bone updates are skipped. The pose catches up the next time the
     * entity is drawn. Disable it for entities whose bone poses are read by
     * game logic (e.g. attachment points) even when unseen.
     */
    cullOffscreen(): boolean;
    cullOffscreen(val: boolean): this;
    /**
     * Gets / sets whether this entity may use the shared pose cache (default
     * true). Cached poses are quantised to
     * IgeSkeletalAnimationComponent.poseCacheRate samples per second, which
     * is ideal for crowds; disable it for a hero character that should
     * animate at full frame rate.
     */
    poseCache(): boolean;
    poseCache(val: boolean): this;
    /**
     * Whether the entity's pose needs sampling this frame.
     */
    protected _isPoseVisible(entity: IgeEntity): boolean;
    /**
     * Update animation playback.
     *
     * Clip time, fades and completion events always advance. The pose is
     * then produced in one of two ways:
     * - a single clip at full weight (the common case for crowds) copies
     *   bone matrices from a cache shared by every entity playing that clip
     *   on the same skeleton, keyed by time quantised to poseCacheRate;
     * - anything else (cross-fades, blends) samples and blends every clip.
     */
    protected _update: (entity: IgeEntity, tickDelta: number) => void;
    /**
     * Sample every active state at its own time, blend and write the result
     * into the skeleton's local matrices.
     */
    protected _sampleBlendedPose(totalWeight: number): void;
    /**
     * Copy the pose for a single full-weight clip from the shared cache,
     * filling the cache entry on first use. Returns false when the cache
     * can't be used (no skeleton manager available, caching disabled).
     */
    protected _applyCachedPose(state: IgeAnimationState): boolean;
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
