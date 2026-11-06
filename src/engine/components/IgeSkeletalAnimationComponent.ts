import { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import type {
	IgeAnimationClipData,
	IgeAnimationState,
	IgeAnimationPlayOptions,
	IgeAnimationSampler,
	IgeAnimationInterpolation
} from "@/types/IgeAnimationClipData";
import type { IgeSkeleton, IgeSkeletonData } from "@/types/IgeSkeletonData";

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
/**
 * Bone matrices for one quantised frame of a clip on one skeleton.
 */
interface IgePoseCacheEntry {
	world: Float32Array;
	skin: Float32Array;
}

/** clip -> skeleton data id -> frame index -> pose. Shared by all instances. */
const poseCache: WeakMap<IgeAnimationClipData, Map<string, IgePoseCacheEntry[]>> = new WeakMap();

/**
 * A skeleton's rest (bind) pose decomposed into per-bone TRS components,
 * used for properties a clip doesn't animate.
 */
interface IgeRestPose {
	translations: Float32Array;
	rotations: Float32Array;
	scales: Float32Array;
}

const restPoseCache: WeakMap<IgeSkeletonData, IgeRestPose> = new WeakMap();

/**
 * Decompose each bone's local bind matrix into translation, rotation
 * (quaternion) and scale. Computed once per skeleton data.
 */
function getRestPose (data: IgeSkeletonData): IgeRestPose {
	let rest = restPoseCache.get(data);
	if (rest) return rest;

	const n = data.boneCount;
	rest = {
		translations: new Float32Array(n * 3),
		rotations: new Float32Array(n * 4),
		scales: new Float32Array(n * 3)
	};

	for (let i = 0; i < n; i++) {
		const m = data.bones[i].localBindTransform;
		const sx = Math.hypot(m[0], m[1], m[2]) || 1;
		const sy = Math.hypot(m[4], m[5], m[6]) || 1;
		const sz = Math.hypot(m[8], m[9], m[10]) || 1;

		rest.translations[i * 3] = m[12];
		rest.translations[i * 3 + 1] = m[13];
		rest.translations[i * 3 + 2] = m[14];
		rest.scales[i * 3] = sx;
		rest.scales[i * 3 + 1] = sy;
		rest.scales[i * 3 + 2] = sz;

		// Rotation matrix (scale removed) -> quaternion
		const m00 = m[0] / sx, m01 = m[4] / sy, m02 = m[8] / sz;
		const m10 = m[1] / sx, m11 = m[5] / sy, m12 = m[9] / sz;
		const m20 = m[2] / sx, m21 = m[6] / sy, m22 = m[10] / sz;
		const trace = m00 + m11 + m22;
		let qx: number, qy: number, qz: number, qw: number;

		if (trace > 0) {
			const s = 0.5 / Math.sqrt(trace + 1);
			qw = 0.25 / s;
			qx = (m21 - m12) * s;
			qy = (m02 - m20) * s;
			qz = (m10 - m01) * s;
		} else if (m00 > m11 && m00 > m22) {
			const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
			qw = (m21 - m12) / s;
			qx = 0.25 * s;
			qy = (m01 + m10) / s;
			qz = (m02 + m20) / s;
		} else if (m11 > m22) {
			const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
			qw = (m02 - m20) / s;
			qx = (m01 + m10) / s;
			qy = 0.25 * s;
			qz = (m12 + m21) / s;
		} else {
			const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
			qw = (m10 - m01) / s;
			qx = (m02 + m20) / s;
			qy = (m12 + m21) / s;
			qz = 0.25 * s;
		}

		rest.rotations[i * 4] = qx;
		rest.rotations[i * 4 + 1] = qy;
		rest.rotations[i * 4 + 2] = qz;
		rest.rotations[i * 4 + 3] = qw;
	}

	restPoseCache.set(data, rest);
	return rest;
}

export class IgeSkeletalAnimationComponent extends IgeComponent<IgeEntity> {
	/**
	 * Samples per second used by the shared pose cache (see poseCache()).
	 * Entities playing the same clip on the same skeleton share one set of
	 * bone matrices per quantised frame. 0 disables caching globally.
	 */
	static poseCacheRate: number = 30;

	classId = "IgeSkeletalAnimationComponent";
	componentId = "skeletalAnimation";

	// Animation clip library
	protected _clips: Map<string, IgeAnimationClipData> = new Map();

	// Active animation states (supports blending multiple animations)
	protected _activeStates: IgeAnimationState[] = [];

	// Reference to entity's skeleton instance
	protected _skeleton?: IgeSkeleton;

	// Skip pose sampling while the entity is not being drawn
	protected _cullOffscreen: boolean = true;

	// Use the shared pose cache for single full-weight clips
	protected _poseCache: boolean = true;

	// Temporary arrays for interpolation
	private _tempVec3A: Float32Array = new Float32Array(3);
	private _tempVec3B: Float32Array = new Float32Array(3);
	private _tempQuat: Float32Array = new Float32Array(4);
	private _tempQuatA: Float32Array = new Float32Array(4);
	private _tempQuatB: Float32Array = new Float32Array(4);

	// Accumulated transforms per bone during blending
	private _boneTranslations: Float32Array[] = [];
	private _boneRotations: Float32Array[] = [];
	private _boneScales: Float32Array[] = [];
	// Per-property weights for proper normalization
	private _boneTranslationWeights: number[] = [];
	private _boneRotationWeights: number[] = [];
	private _boneScaleWeights: number[] = [];

	constructor(entity: IgeEntity, options?: any) {
		super(entity, options);

		// Add the animation behaviour to the entity
		entity.addBehaviour(IgeBehaviourType.preUpdate, "skeletalAnimation", this._update);
	}

	/**
	 * Set the skeleton instance to animate.
	 */
	setSkeleton(skeleton: IgeSkeleton): this {
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
	define(id: string, clip: IgeAnimationClipData): this {
		this._clips.set(id, clip);
		this.log(`Defined animation "${id}" (duration: ${clip.duration.toFixed(2)}s)`);
		return this;
	}

	/**
	 * Check if an animation is defined.
	 */
	/**
	 * Define several clips at once, registering each under its name and
	 * its id. Used by IgeEntity.model(); doesn't log per clip.
	 */
	defineClips(clips: IgeAnimationClipData[]): this {
		for (const clip of clips) {
			this._clips.set(clip.name, clip);
			if (clip.id !== clip.name) {
				this._clips.set(clip.id, clip);
			}
		}
		return this;
	}

	defined(id: string): boolean {
		return this._clips.has(id);
	}

	/**
	 * Get an animation clip by ID.
	 */
	getClip(id: string): IgeAnimationClipData | undefined {
		return this._clips.get(id);
	}

	/**
	 * Play an animation with optional cross-fade.
	 */
	play(animId: string, options?: IgeAnimationPlayOptions): this {
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
		} else {
			// Instant switch - clear all existing animations
			this._activeStates = [];
		}

		// Create new animation state
		const state: IgeAnimationState = {
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
	stop(): this {
		this._activeStates = [];
		this.emit("stopped");
		return this;
	}

	/**
	 * Stop a specific animation with optional fade-out.
	 */
	stopAnimation(animId: string, fadeOutDuration: number = 0.2): this {
		for (const state of this._activeStates) {
			if (state.clip.id === animId && state.fadeOutDuration === 0) {
				if (fadeOutDuration > 0) {
					state.fadeOutDuration = fadeOutDuration;
					state.fadeTime = 0;
				} else {
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
	playing(): boolean {
		return this._activeStates.some((s) => s.playing);
	}

	/**
	 * Check if a specific animation is playing.
	 */
	isPlaying(animId: string): boolean {
		return this._activeStates.some((s) => s.clip.id === animId && s.playing);
	}

	/**
	 * Set playback speed for all active animations.
	 */
	setSpeed(speed: number): this {
		for (const state of this._activeStates) {
			state.speed = speed;
		}
		return this;
	}

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
	cullOffscreen(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._cullOffscreen;
		}
		this._cullOffscreen = val;
		return this;
	}

	/**
	 * Gets / sets whether this entity may use the shared pose cache (default
	 * true). Cached poses are quantised to
	 * IgeSkeletalAnimationComponent.poseCacheRate samples per second, which
	 * is ideal for crowds; disable it for a hero character that should
	 * animate at full frame rate.
	 */
	poseCache(): boolean;
	poseCache(val: boolean): this;
	poseCache(val?: boolean): boolean | this {
		if (val === undefined) {
			return this._poseCache;
		}
		this._poseCache = val;
		return this;
	}

	/**
	 * Whether the entity's pose needs sampling this frame.
	 */
	protected _isPoseVisible(entity: IgeEntity): boolean {
		if (!this._cullOffscreen || entity._lastRenderedFrame < 0) {
			return true;
		}

		const renderer = ige.engine.renderer() as { frameId?: () => number } | undefined;
		if (!renderer || typeof renderer.frameId !== "function") {
			return true;
		}

		// The renderer hasn't drawn this frame yet, so frameId() is the
		// previous frame: sample if the entity was drawn in it.
		return renderer.frameId() - entity._lastRenderedFrame <= 1;
	}

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
	protected _update = (entity: IgeEntity, tickDelta: number): void => {
		if (!this._skeleton || this._activeStates.length === 0) {
			return;
		}

		const deltaSeconds = tickDelta / 1000;
		const samplePose = this._isPoseVisible(entity);

		// Advance every active state
		let totalWeight = 0;
		const states = this._activeStates;

		for (let i = 0; i < states.length; i++) {
			const state = states[i];

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
					state.playing = false;
					continue;
				}
			}

			// Update animation time
			state.time += deltaSeconds * state.speed;

			// Handle looping
			if (state.time >= state.clip.duration) {
				if (state.loop) {
					state.time = state.clip.duration > 0 ? state.time % state.clip.duration : 0;
					this.emit("loopComplete", state.clip.id);
				} else {
					state.time = state.clip.duration;
					state.playing = false;
					this.emit("complete", state.clip.id);
					continue;
				}
			}

			totalWeight += state.weight;
		}

		// Remove completed/faded-out animations
		for (let i = states.length - 1; i >= 0; i--) {
			if (!states[i].playing) {
				states.splice(i, 1);
			}
		}

		if (!samplePose || totalWeight <= 0 || states.length === 0) {
			return;
		}

		// Fast path: one clip at full weight -> shared pose cache
		if (states.length === 1 && states[0].weight >= 1 && this._poseCache && this._applyCachedPose(states[0])) {
			return;
		}

		this._sampleBlendedPose(totalWeight);
	};

	/**
	 * Sample every active state at its own time, blend and write the result
	 * into the skeleton's local matrices.
	 */
	protected _sampleBlendedPose(totalWeight: number): void {
		const skeleton = this._skeleton!;

		// Reset bone accumulators
		const boneCount = skeleton.data.boneCount;
		for (let i = 0; i < boneCount; i++) {
			const t = this._boneTranslations[i];
			const r = this._boneRotations[i];
			const sc = this._boneScales[i];
			t[0] = 0; t[1] = 0; t[2] = 0;
			r[0] = 0; r[1] = 0; r[2] = 0; r[3] = 0;
			sc[0] = 0; sc[1] = 0; sc[2] = 0;
			this._boneTranslationWeights[i] = 0;
			this._boneRotationWeights[i] = 0;
			this._boneScaleWeights[i] = 0;
		}

		const states = this._activeStates;
		for (let i = 0; i < states.length; i++) {
			const state = states[i];
			if (state.weight > 0) {
				this._sampleAnimation(state.clip, state.time, state.weight);
			}
		}

		this._applyBlendedTransforms(totalWeight);
	}

	/**
	 * Copy the pose for a single full-weight clip from the shared cache,
	 * filling the cache entry on first use. Returns false when the cache
	 * can't be used (no skeleton manager available, caching disabled).
	 */
	protected _applyCachedPose(state: IgeAnimationState): boolean {
		const rate = IgeSkeletalAnimationComponent.poseCacheRate;
		const skeleton = this._skeleton!;
		if (rate <= 0) return false;

		const skeletonManager = (ige.engine.renderer() as any)?.skeletonManager as
			{ updateSkeletonMatrices: (skeleton: IgeSkeleton) => void } | undefined;
		if (!skeletonManager) return false;

		let bySkeleton = poseCache.get(state.clip);
		if (!bySkeleton) {
			bySkeleton = new Map();
			poseCache.set(state.clip, bySkeleton);
		}

		const skeletonId = skeleton.data.id;
		let frames = bySkeleton.get(skeletonId);
		if (!frames) {
			frames = [];
			bySkeleton.set(skeletonId, frames);
		}

		const frame = Math.floor(state.time * rate);
		let entry = frames[frame];

		if (!entry) {
			// Sample the clip at the quantised time so the entry is exact for
			// every entity that lands on this frame.
			const sampleTime = Math.min(frame / rate, state.clip.duration);
			const boneCount = skeleton.data.boneCount;
			for (let i = 0; i < boneCount; i++) {
				const t = this._boneTranslations[i];
				const r = this._boneRotations[i];
				const sc = this._boneScales[i];
				t[0] = 0; t[1] = 0; t[2] = 0;
				r[0] = 0; r[1] = 0; r[2] = 0; r[3] = 0;
				sc[0] = 0; sc[1] = 0; sc[2] = 0;
				this._boneTranslationWeights[i] = 0;
				this._boneRotationWeights[i] = 0;
				this._boneScaleWeights[i] = 0;
			}
			this._sampleAnimation(state.clip, sampleTime, 1);
			this._applyBlendedTransforms(1);
			skeletonManager.updateSkeletonMatrices(skeleton);

			entry = {
				world: skeleton.worldMatrices.slice(),
				skin: skeleton.skinMatrices.slice()
			};
			frames[frame] = entry;
			return true;
		}

		skeleton.worldMatrices.set(entry.world);
		skeleton.skinMatrices.set(entry.skin);
		skeleton.dirty = false;
		return true;
	}

	/**
	 * Sample an animation clip at a specific time and accumulate transforms.
	 */
	protected _sampleAnimation(
		clip: IgeAnimationClipData,
		time: number,
		weight: number
	): void {
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

				case "rotation": {
					// Weighted quaternion sum (normalised later). q and -q are the
					// same rotation, so flip contributions into the accumulator's
					// hemisphere or blends can take the long way round.
					const acc = this._boneRotations[boneIndex];
					const dot = acc[0] * value[0] + acc[1] * value[1] + acc[2] * value[2] + acc[3] * value[3];
					const w = dot < 0 ? -weight : weight;
					acc[0] += value[0] * w;
					acc[1] += value[1] * w;
					acc[2] += value[2] * w;
					acc[3] += value[3] * w;
					this._boneRotationWeights[boneIndex] += weight;
					break;
				}

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
	protected _sampleSampler(sampler: IgeAnimationSampler, time: number): Float32Array {
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
			} else {
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
			} else {
				this._tempVec3A[0] = output[lastOffset];
				this._tempVec3A[1] = output[lastOffset + 1];
				this._tempVec3A[2] = output[lastOffset + 2];
				return this._tempVec3A;
			}
		}

		// Find keyframe indices for interpolation: the last key whose time is
		// <= time. Binary search keeps this cheap for long clips sampled by
		// many characters every frame (input[0] < time < input[last] here).
		let lo = 0;
		let hi = input.length - 1;
		while (hi - lo > 1) {
			const mid = (lo + hi) >> 1;
			if (input[mid] <= time) {
				lo = mid;
			} else {
				hi = mid;
			}
		}
		const keyIndex = lo;

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
			} else {
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
		let t: number;
		if (t1 === t0) {
			t = 0; // Avoid division by zero
		} else {
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
				} else {
					this._tempVec3A[0] = output[offset0];
					this._tempVec3A[1] = output[offset0 + 1];
					this._tempVec3A[2] = output[offset0 + 2];
					return this._tempVec3A;
				}

			case "LINEAR":
				if (componentCount === 4) {
					// Quaternion SLERP
					return this._slerpQuaternion(
						output, offset0,
						output, offset1,
						t
					);
				} else {
					// Linear interpolation for vec3
					return this._lerpVec3(
						output, offset0,
						output, offset1,
						t
					);
				}

			case "CUBICSPLINE":
				// CUBICSPLINE has 3 values per keyframe: in-tangent, value, out-tangent
				// For simplicity, we'll use linear interpolation on the values
				// Full cubic spline implementation would be more accurate
				const valueOffset0 = offset0 * 3 + componentCount; // Skip in-tangent
				const valueOffset1 = offset1 * 3 + componentCount;

				if (componentCount === 4) {
					return this._slerpQuaternion(
						output, valueOffset0,
						output, valueOffset1,
						t
					);
				} else {
					return this._lerpVec3(
						output, valueOffset0,
						output, valueOffset1,
						t
					);
				}

			default:
				// Default to LINEAR
				if (componentCount === 4) {
					return this._slerpQuaternion(output, offset0, output, offset1, t);
				} else {
					return this._lerpVec3(output, offset0, output, offset1, t);
				}
		}
	}

	/**
	 * Linear interpolation of vec3.
	 */
	protected _lerpVec3(
		a: Float32Array, aOffset: number,
		b: Float32Array, bOffset: number,
		t: number
	): Float32Array {
		this._tempVec3A[0] = a[aOffset] + (b[bOffset] - a[aOffset]) * t;
		this._tempVec3A[1] = a[aOffset + 1] + (b[bOffset + 1] - a[aOffset + 1]) * t;
		this._tempVec3A[2] = a[aOffset + 2] + (b[bOffset + 2] - a[aOffset + 2]) * t;
		return this._tempVec3A;
	}

	/**
	 * Spherical linear interpolation of quaternions.
	 */
	protected _slerpQuaternion(
		a: Float32Array, aOffset: number,
		b: Float32Array, bOffset: number,
		t: number
	): Float32Array {
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

		let scale0: number, scale1: number;

		if (1 - cosom > 0.000001) {
			// Standard SLERP
			const omega = Math.acos(cosom);
			const sinom = Math.sin(omega);
			scale0 = Math.sin((1 - t) * omega) / sinom;
			scale1 = Math.sin(t * omega) / sinom;
		} else {
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
	protected _applyBlendedTransforms(totalWeight: number): void {
		if (!this._skeleton) {
			return;
		}

		const boneCount = this._skeleton.data.boneCount;
		const rest = getRestPose(this._skeleton.data);

		for (let i = 0; i < boneCount; i++) {
			const translationWeight = this._boneTranslationWeights[i];
			const rotationWeight = this._boneRotationWeights[i];
			const scaleWeight = this._boneScaleWeights[i];

			// Any weight a property didn't receive from the clips (a clip with
			// no channel for it, or part of a cross-fade) is filled from the
			// bone's rest pose rather than from zero. Bones no active clip
			// animates therefore return to rest instead of keeping a stale pose
			// from a previous clip (and cached poses stay deterministic).
			const r3 = i * 3;
			const r4 = i * 4;

			// Translation
			const translation = this._boneTranslations[i];
			const missingT = totalWeight - translationWeight;
			if (missingT > 0) {
				translation[0] += rest.translations[r3] * missingT;
				translation[1] += rest.translations[r3 + 1] * missingT;
				translation[2] += rest.translations[r3 + 2] * missingT;
			}
			const invT = 1 / Math.max(totalWeight, translationWeight);
			translation[0] *= invT;
			translation[1] *= invT;
			translation[2] *= invT;

			// Rotation (normalised weighted quaternion sum)
			const rotation = this._boneRotations[i];
			const missingR = totalWeight - rotationWeight;
			if (missingR > 0) {
				const rx = rest.rotations[r4], ry = rest.rotations[r4 + 1], rz = rest.rotations[r4 + 2], rw = rest.rotations[r4 + 3];
				const dot = rotation[0] * rx + rotation[1] * ry + rotation[2] * rz + rotation[3] * rw;
				const w = dot < 0 ? -missingR : missingR;
				rotation[0] += rx * w;
				rotation[1] += ry * w;
				rotation[2] += rz * w;
				rotation[3] += rw * w;
			}
			const len = Math.sqrt(
				rotation[0] * rotation[0] +
				rotation[1] * rotation[1] +
				rotation[2] * rotation[2] +
				rotation[3] * rotation[3]
			);
			if (len > 0) {
				const invLen = 1 / len;
				rotation[0] *= invLen;
				rotation[1] *= invLen;
				rotation[2] *= invLen;
				rotation[3] *= invLen;
			} else {
				rotation[0] = rest.rotations[r4];
				rotation[1] = rest.rotations[r4 + 1];
				rotation[2] = rest.rotations[r4 + 2];
				rotation[3] = rest.rotations[r4 + 3];
			}

			// Scale
			const scale = this._boneScales[i];
			const missingS = totalWeight - scaleWeight;
			if (missingS > 0) {
				scale[0] += rest.scales[r3] * missingS;
				scale[1] += rest.scales[r3 + 1] * missingS;
				scale[2] += rest.scales[r3 + 2] * missingS;
			}
			const invS = 1 / Math.max(totalWeight, scaleWeight);
			scale[0] *= invS;
			scale[1] *= invS;
			scale[2] *= invS;

			// Apply to skeleton; the skeleton manager computes the final matrices
			this._applyBoneTransform(i, translation, rotation, scale);
		}

		// Mark skeleton as dirty so matrices get recomputed
		this._skeleton.dirty = true;
	}

	/**
	 * Apply TRS transform to a specific bone in the skeleton.
	 */
	protected _applyBoneTransform(
		boneIndex: number,
		translation: Float32Array,
		rotation: Float32Array,
		scale: Float32Array
	): void {
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
	getAnimationList(): string[] {
		return Array.from(this._clips.keys());
	}

	/**
	 * Get current playback time of the first active animation.
	 */
	getCurrentTime(): number {
		if (this._activeStates.length > 0) {
			return this._activeStates[0].time;
		}
		return 0;
	}

	/**
	 * Set current playback time of the first active animation.
	 */
	setCurrentTime(time: number): this {
		if (this._activeStates.length > 0) {
			this._activeStates[0].time = time;
		}
		return this;
	}

	/**
	 * Clean up component.
	 */
	destroy(): this {
		this._clips.clear();
		this._activeStates = [];
		this._skeleton = undefined;
		return this;
	}
}
