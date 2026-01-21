/**
 * GLTF animation interpolation modes.
 */
export type IgeAnimationInterpolation = "LINEAR" | "STEP" | "CUBICSPLINE";
/**
 * Animation channel target path - what property is being animated.
 */
export type IgeAnimationTargetPath = "translation" | "rotation" | "scale" | "weights";
/**
 * Animation sampler - defines keyframe times, values, and interpolation.
 */
export interface IgeAnimationSampler {
    /** Keyframe times in seconds */
    input: Float32Array;
    /**
     * Keyframe values.
     * For translation/scale: 3 floats per keyframe (vec3)
     * For rotation: 4 floats per keyframe (quaternion)
     * For CUBICSPLINE: 3x the values (in-tangent, value, out-tangent)
     */
    output: Float32Array;
    /** Interpolation mode */
    interpolation: IgeAnimationInterpolation;
    /**
     * Number of components per keyframe value.
     * 3 for translation/scale, 4 for rotation quaternion
     */
    componentCount: number;
}
/**
 * Animation channel - maps a sampler to a specific bone property.
 */
export interface IgeAnimationChannel {
    /** Index into the animation's samplers array */
    samplerIndex: number;
    /** Target bone index in the skeleton */
    targetBoneIndex: number;
    /** Which transform property to animate */
    targetPath: IgeAnimationTargetPath;
}
/**
 * Complete animation clip data.
 */
export interface IgeAnimationClipData {
    /** Unique identifier */
    id: string;
    /** Animation name (e.g., "walk", "idle", "attack") */
    name: string;
    /** Total duration in seconds */
    duration: number;
    /** Array of samplers containing keyframe data */
    samplers: IgeAnimationSampler[];
    /** Array of channels mapping samplers to bone properties */
    channels: IgeAnimationChannel[];
}
/**
 * Active animation playback state.
 */
export interface IgeAnimationState {
    /** The clip being played */
    clip: IgeAnimationClipData;
    /** Current playback time in seconds */
    time: number;
    /** Blend weight (0-1) for animation mixing */
    weight: number;
    /** Playback speed multiplier (1.0 = normal) */
    speed: number;
    /** Whether to loop the animation */
    loop: boolean;
    /** Whether animation is currently playing */
    playing: boolean;
    /** Fade-in duration for blending in (seconds) */
    fadeInDuration: number;
    /** Fade-out duration for blending out (seconds) */
    fadeOutDuration: number;
    /** Current fade progress time */
    fadeTime: number;
}
/**
 * Options for playing an animation.
 */
export interface IgeAnimationPlayOptions {
    /** Cross-fade duration from current animation (default: 0.2s) */
    crossFadeDuration?: number;
    /** Playback speed multiplier (default: 1.0) */
    speed?: number;
    /** Whether to loop (default: true) */
    loop?: boolean;
    /** Callback when animation completes (non-looping only) */
    onComplete?: (animId: string) => void;
    /** Callback when animation loops */
    onLoop?: (animId: string) => void;
}
