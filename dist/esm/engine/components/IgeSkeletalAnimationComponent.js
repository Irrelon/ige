import { IgeComponent } from "../core/IgeComponent.js"
import { IgeBehaviourType } from "../../enums/index.js"
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
export class IgeSkeletalAnimationComponent extends IgeComponent {
    classId = "IgeSkeletalAnimationComponent";
    componentId = "skeletalAnimation";
    // Animation clip library
    _clips = new Map();
    // Active animation states (supports blending multiple animations)
    _activeStates = [];
    // Reference to entity's skeleton instance
    _skeleton;
    // Temporary arrays for interpolation
    _tempVec3A = new Float32Array(3);
    _tempVec3B = new Float32Array(3);
    _tempQuat = new Float32Array(4);
    _tempQuatA = new Float32Array(4);
    _tempQuatB = new Float32Array(4);
    // Accumulated transforms per bone during blending
    _boneTranslations = [];
    _boneRotations = [];
    _boneScales = [];
    // Per-property weights for proper normalization
    _boneTranslationWeights = [];
    _boneRotationWeights = [];
    _boneScaleWeights = [];
    constructor(entity, options) {
        super(entity, options);
        // Add the animation behaviour to the entity
        entity.addBehaviour(IgeBehaviourType.preUpdate, "skeletalAnimation", this._update);
    }
    /**
     * Set the skeleton instance to animate.
     */
    setSkeleton(skeleton) {
        this._skeleton = skeleton;
        // Initialize per-bone accumulation arrays
        const boneCount = skeleton.data.boneCount;
        this._boneTranslations = [];
        this._boneRotations = [];
        this._boneScales = [];
        this._boneTranslationWeights = [];
        this._boneRotationWeights = [];
        this._boneScaleWeights = [];
        for (let i = 0; i < boneCount; i++) {
            this._boneTranslations.push(new Float32Array(3));
            this._boneRotations.push(new Float32Array(4));
            this._boneScales.push(new Float32Array(3));
            this._boneTranslationWeights.push(0);
            this._boneRotationWeights.push(0);
            this._boneScaleWeights.push(0);
        }
        return this;
    }
    /**
     * Define an animation clip.
     */
    define(id, clip) {
        this._clips.set(id, clip);
        this.log(`Defined animation "${id}" (duration: ${clip.duration.toFixed(2)}s)`);
        return this;
    }
    /**
     * Check if an animation is defined.
     */
    defined(id) {
        return this._clips.has(id);
    }
    /**
     * Get an animation clip by ID.
     */
    getClip(id) {
        return this._clips.get(id);
    }
    /**
     * Play an animation with optional cross-fade.
     */
    play(animId, options) {
        const clip = this._clips.get(animId);
        if (!clip) {
            this.log(`Animation "${animId}" not found`, "error");
            return this;
        }
        const crossFadeDuration = options?.crossFadeDuration ?? 0.2;
        const speed = options?.speed ?? 1.0;
        const loop = options?.loop ?? true;
        // If there are existing animations, start fading them out
        if (crossFadeDuration > 0) {
            for (const state of this._activeStates) {
                if (state.fadeOutDuration === 0) {
                    state.fadeOutDuration = crossFadeDuration;
                    state.fadeTime = 0;
                }
            }
        }
        else {
            // Instant switch - clear all existing animations
            this._activeStates = [];
        }
        // Create new animation state
        const state = {
            clip,
            time: 0,
            weight: crossFadeDuration > 0 ? 0 : 1,
            speed,
            loop,
            playing: true,
            fadeInDuration: crossFadeDuration,
            fadeOutDuration: 0,
            fadeTime: 0
        };
        this._activeStates.push(state);
        this.emit("started", animId);
        return this;
    }
    /**
     * Stop all animations.
     */
    stop() {
        this._activeStates = [];
        this.emit("stopped");
        return this;
    }
    /**
     * Stop a specific animation with optional fade-out.
     */
    stopAnimation(animId, fadeOutDuration = 0.2) {
        for (const state of this._activeStates) {
            if (state.clip.id === animId && state.fadeOutDuration === 0) {
                if (fadeOutDuration > 0) {
                    state.fadeOutDuration = fadeOutDuration;
                    state.fadeTime = 0;
                }
                else {
                    // Immediate removal
                    const index = this._activeStates.indexOf(state);
                    if (index !== -1) {
                        this._activeStates.splice(index, 1);
                    }
                }
                break;
            }
        }
        return this;
    }
    /**
     * Check if any animation is playing.
     */
    playing() {
        return this._activeStates.some((s) => s.playing);
    }
    /**
     * Check if a specific animation is playing.
     */
    isPlaying(animId) {
        return this._activeStates.some((s) => s.clip.id === animId && s.playing);
    }
    /**
     * Set playback speed for all active animations.
     */
    setSpeed(speed) {
        for (const state of this._activeStates) {
            state.speed = speed;
        }
        return this;
    }
    /**
     * Update animation playback.
     */
    _update = (entity, tickDelta) => {
        if (!this._skeleton || this._activeStates.length === 0) {
            return;
        }
        const deltaSeconds = tickDelta / 1000;
        // Reset bone accumulators
        const boneCount = this._skeleton.data.boneCount;
        for (let i = 0; i < boneCount; i++) {
            this._boneTranslations[i][0] = 0;
            this._boneTranslations[i][1] = 0;
            this._boneTranslations[i][2] = 0;
            this._boneRotations[i][0] = 0;
            this._boneRotations[i][1] = 0;
            this._boneRotations[i][2] = 0;
            this._boneRotations[i][3] = 0;
            this._boneScales[i][0] = 0;
            this._boneScales[i][1] = 0;
            this._boneScales[i][2] = 0;
            this._boneTranslationWeights[i] = 0;
            this._boneRotationWeights[i] = 0;
            this._boneScaleWeights[i] = 0;
        }
        // Calculate total weight for normalization
        let totalWeight = 0;
        // Process each active animation state
        const statesToRemove = [];
        for (const state of this._activeStates) {
            // Update fade
            if (state.fadeInDuration > 0 && state.weight < 1) {
                state.fadeTime += deltaSeconds;
                state.weight = Math.min(1, state.fadeTime / state.fadeInDuration);
                if (state.weight >= 1) {
                    state.fadeInDuration = 0;
                    state.fadeTime = 0;
                }
            }
            if (state.fadeOutDuration > 0) {
                state.fadeTime += deltaSeconds;
                state.weight = Math.max(0, 1 - state.fadeTime / state.fadeOutDuration);
                if (state.weight <= 0) {
                    statesToRemove.push(state);
                    continue;
                }
            }
            // Update animation time
            state.time += deltaSeconds * state.speed;
            // Handle looping
            if (state.time >= state.clip.duration) {
                if (state.loop) {
                    state.time = state.time % state.clip.duration;
                    this.emit("loopComplete", state.clip.id);
                }
                else {
                    state.time = state.clip.duration;
                    state.playing = false;
                    statesToRemove.push(state);
                    this.emit("complete", state.clip.id);
                    continue;
                }
            }
            // Sample animation and accumulate transforms
            totalWeight += state.weight;
            this._sampleAnimation(state.clip, state.time, state.weight);
        }
        // Remove completed/faded-out animations
        for (const state of statesToRemove) {
            const index = this._activeStates.indexOf(state);
            if (index !== -1) {
                this._activeStates.splice(index, 1);
            }
        }
        // Apply blended transforms to skeleton
        if (totalWeight > 0) {
            this._applyBlendedTransforms(totalWeight);
        }
    };
    /**
     * Sample an animation clip at a specific time and accumulate transforms.
     */
    _sampleAnimation(clip, time, weight) {
        for (const channel of clip.channels) {
            const sampler = clip.samplers[channel.samplerIndex];
            const boneIndex = channel.targetBoneIndex;
            // Skip invalid bone indices
            if (boneIndex < 0 || boneIndex >= this._boneTranslationWeights.length) {
                continue;
            }
            // Sample the keyframes
            const value = this._sampleSampler(sampler, time);
            // Accumulate based on target path, tracking weight per property type
            switch (channel.targetPath) {
                case "translation":
                    this._boneTranslations[boneIndex][0] += value[0] * weight;
                    this._boneTranslations[boneIndex][1] += value[1] * weight;
                    this._boneTranslations[boneIndex][2] += value[2] * weight;
                    this._boneTranslationWeights[boneIndex] += weight;
                    break;
                case "rotation":
                    // For rotation blending, we accumulate quaternions
                    // This is a simplified approach; proper SLERP blending is more complex
                    this._boneRotations[boneIndex][0] += value[0] * weight;
                    this._boneRotations[boneIndex][1] += value[1] * weight;
                    this._boneRotations[boneIndex][2] += value[2] * weight;
                    this._boneRotations[boneIndex][3] += value[3] * weight;
                    this._boneRotationWeights[boneIndex] += weight;
                    break;
                case "scale":
                    this._boneScales[boneIndex][0] += value[0] * weight;
                    this._boneScales[boneIndex][1] += value[1] * weight;
                    this._boneScales[boneIndex][2] += value[2] * weight;
                    this._boneScaleWeights[boneIndex] += weight;
                    break;
            }
        }
    }
    /**
     * Sample a keyframe sampler at a specific time.
     */
    _sampleSampler(sampler, time) {
        const input = sampler.input;
        const output = sampler.output;
        const componentCount = sampler.componentCount;
        // Handle edge case: time is before first keyframe
        if (time <= input[0]) {
            if (componentCount === 4) {
                this._tempQuat[0] = output[0];
                this._tempQuat[1] = output[1];
                this._tempQuat[2] = output[2];
                this._tempQuat[3] = output[3];
                return this._tempQuat;
            }
            else {
                this._tempVec3A[0] = output[0];
                this._tempVec3A[1] = output[1];
                this._tempVec3A[2] = output[2];
                return this._tempVec3A;
            }
        }
        // Handle edge case: time is after last keyframe
        if (time >= input[input.length - 1]) {
            const lastOffset = (input.length - 1) * componentCount;
            if (componentCount === 4) {
                this._tempQuat[0] = output[lastOffset];
                this._tempQuat[1] = output[lastOffset + 1];
                this._tempQuat[2] = output[lastOffset + 2];
                this._tempQuat[3] = output[lastOffset + 3];
                return this._tempQuat;
            }
            else {
                this._tempVec3A[0] = output[lastOffset];
                this._tempVec3A[1] = output[lastOffset + 1];
                this._tempVec3A[2] = output[lastOffset + 2];
                return this._tempVec3A;
            }
        }
        // Find keyframe indices for interpolation
        let keyIndex = 0;
        for (let i = 0; i < input.length - 1; i++) {
            if (time < input[i + 1]) {
                keyIndex = i;
                break;
            }
            keyIndex = i;
        }
        const nextKeyIndex = Math.min(keyIndex + 1, input.length - 1);
        // If at the same keyframe, return directly
        if (keyIndex === nextKeyIndex) {
            const offset = keyIndex * componentCount;
            if (componentCount === 4) {
                this._tempQuat[0] = output[offset];
                this._tempQuat[1] = output[offset + 1];
                this._tempQuat[2] = output[offset + 2];
                this._tempQuat[3] = output[offset + 3];
                return this._tempQuat;
            }
            else {
                this._tempVec3A[0] = output[offset];
                this._tempVec3A[1] = output[offset + 1];
                this._tempVec3A[2] = output[offset + 2];
                return this._tempVec3A;
            }
        }
        // Calculate interpolation factor
        const t0 = input[keyIndex];
        const t1 = input[nextKeyIndex];
        // Handle edge cases: same keyframe or time before first keyframe
        let t;
        if (t1 === t0) {
            t = 0; // Avoid division by zero
        }
        else {
            t = (time - t0) / (t1 - t0);
        }
        // Clamp t to [0, 1] to handle times outside keyframe range
        t = Math.max(0, Math.min(1, t));
        // Get keyframe values
        const offset0 = keyIndex * componentCount;
        const offset1 = nextKeyIndex * componentCount;
        // Interpolate based on interpolation mode
        switch (sampler.interpolation) {
            case "STEP":
                if (componentCount === 4) {
                    this._tempQuat[0] = output[offset0];
                    this._tempQuat[1] = output[offset0 + 1];
                    this._tempQuat[2] = output[offset0 + 2];
                    this._tempQuat[3] = output[offset0 + 3];
                    return this._tempQuat;
                }
                else {
                    this._tempVec3A[0] = output[offset0];
                    this._tempVec3A[1] = output[offset0 + 1];
                    this._tempVec3A[2] = output[offset0 + 2];
                    return this._tempVec3A;
                }
            case "LINEAR":
                if (componentCount === 4) {
                    // Quaternion SLERP
                    return this._slerpQuaternion(output, offset0, output, offset1, t);
                }
                else {
                    // Linear interpolation for vec3
                    return this._lerpVec3(output, offset0, output, offset1, t);
                }
            case "CUBICSPLINE":
                // CUBICSPLINE has 3 values per keyframe: in-tangent, value, out-tangent
                // For simplicity, we'll use linear interpolation on the values
                // Full cubic spline implementation would be more accurate
                const valueOffset0 = offset0 * 3 + componentCount; // Skip in-tangent
                const valueOffset1 = offset1 * 3 + componentCount;
                if (componentCount === 4) {
                    return this._slerpQuaternion(output, valueOffset0, output, valueOffset1, t);
                }
                else {
                    return this._lerpVec3(output, valueOffset0, output, valueOffset1, t);
                }
            default:
                // Default to LINEAR
                if (componentCount === 4) {
                    return this._slerpQuaternion(output, offset0, output, offset1, t);
                }
                else {
                    return this._lerpVec3(output, offset0, output, offset1, t);
                }
        }
    }
    /**
     * Linear interpolation of vec3.
     */
    _lerpVec3(a, aOffset, b, bOffset, t) {
        this._tempVec3A[0] = a[aOffset] + (b[bOffset] - a[aOffset]) * t;
        this._tempVec3A[1] = a[aOffset + 1] + (b[bOffset + 1] - a[aOffset + 1]) * t;
        this._tempVec3A[2] = a[aOffset + 2] + (b[bOffset + 2] - a[aOffset + 2]) * t;
        return this._tempVec3A;
    }
    /**
     * Spherical linear interpolation of quaternions.
     */
    _slerpQuaternion(a, aOffset, b, bOffset, t) {
        // Get quaternion components
        let ax = a[aOffset], ay = a[aOffset + 1], az = a[aOffset + 2], aw = a[aOffset + 3];
        let bx = b[bOffset], by = b[bOffset + 1], bz = b[bOffset + 2], bw = b[bOffset + 3];
        // Calculate angle between quaternions
        let cosom = ax * bx + ay * by + az * bz + aw * bw;
        // If negative, negate one quaternion to take shorter path
        if (cosom < 0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }
        let scale0, scale1;
        if (1 - cosom > 0.000001) {
            // Standard SLERP
            const omega = Math.acos(cosom);
            const sinom = Math.sin(omega);
            scale0 = Math.sin((1 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        }
        else {
            // Very close - use linear interpolation
            scale0 = 1 - t;
            scale1 = t;
        }
        this._tempQuat[0] = scale0 * ax + scale1 * bx;
        this._tempQuat[1] = scale0 * ay + scale1 * by;
        this._tempQuat[2] = scale0 * az + scale1 * bz;
        this._tempQuat[3] = scale0 * aw + scale1 * bw;
        return this._tempQuat;
    }
    /**
     * Apply blended transforms to the skeleton.
     */
    _applyBlendedTransforms(totalWeight) {
        if (!this._skeleton) {
            return;
        }
        const boneCount = this._skeleton.data.boneCount;
        for (let i = 0; i < boneCount; i++) {
            const translationWeight = this._boneTranslationWeights[i];
            const rotationWeight = this._boneRotationWeights[i];
            const scaleWeight = this._boneScaleWeights[i];
            // Skip if no animation data for this bone
            if (translationWeight === 0 && rotationWeight === 0 && scaleWeight === 0) {
                continue;
            }
            // Normalize translation
            const translation = this._boneTranslations[i];
            if (translationWeight > 0) {
                const invWeight = 1 / translationWeight;
                translation[0] *= invWeight;
                translation[1] *= invWeight;
                translation[2] *= invWeight;
            }
            // Normalize rotation (quaternion)
            const rotation = this._boneRotations[i];
            if (rotationWeight > 0) {
                const len = Math.sqrt(rotation[0] * rotation[0] +
                    rotation[1] * rotation[1] +
                    rotation[2] * rotation[2] +
                    rotation[3] * rotation[3]);
                if (len > 0) {
                    const invLen = 1 / len;
                    rotation[0] *= invLen;
                    rotation[1] *= invLen;
                    rotation[2] *= invLen;
                    rotation[3] *= invLen;
                }
                else {
                    // Identity quaternion
                    rotation[0] = 0;
                    rotation[1] = 0;
                    rotation[2] = 0;
                    rotation[3] = 1;
                }
            }
            else {
                // No rotation data - use identity
                rotation[0] = 0;
                rotation[1] = 0;
                rotation[2] = 0;
                rotation[3] = 1;
            }
            // Normalize scale
            const scale = this._boneScales[i];
            if (scaleWeight > 0) {
                const invWeight = 1 / scaleWeight;
                scale[0] *= invWeight;
                scale[1] *= invWeight;
                scale[2] *= invWeight;
            }
            else {
                // No scale data - use identity
                scale[0] = 1;
                scale[1] = 1;
                scale[2] = 1;
            }
            // Apply to skeleton via the skeleton manager
            // The skeleton manager will compute the final matrices
            this._applyBoneTransform(i, translation, rotation, scale);
        }
        // Mark skeleton as dirty so matrices get recomputed
        this._skeleton.dirty = true;
    }
    /**
     * Apply TRS transform to a specific bone in the skeleton.
     */
    _applyBoneTransform(boneIndex, translation, rotation, scale) {
        if (!this._skeleton) {
            return;
        }
        const offset = boneIndex * 16;
        const m = this._skeleton.localMatrices;
        // Compose matrix from TRS (column-major)
        const qx = rotation[0], qy = rotation[1], qz = rotation[2], qw = rotation[3];
        const sx = scale[0], sy = scale[1], sz = scale[2];
        const tx = translation[0], ty = translation[1], tz = translation[2];
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
    }
    /**
     * Get list of defined animation IDs.
     */
    getAnimationList() {
        return Array.from(this._clips.keys());
    }
    /**
     * Get current playback time of the first active animation.
     */
    getCurrentTime() {
        if (this._activeStates.length > 0) {
            return this._activeStates[0].time;
        }
        return 0;
    }
    /**
     * Set current playback time of the first active animation.
     */
    setCurrentTime(time) {
        if (this._activeStates.length > 0) {
            this._activeStates[0].time = time;
        }
        return this;
    }
    /**
     * Clean up component.
     */
    destroy() {
        this._clips.clear();
        this._activeStates = [];
        this._skeleton = undefined;
        return this;
    }
}
