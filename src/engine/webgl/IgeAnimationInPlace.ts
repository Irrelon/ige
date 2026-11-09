import type { IgeAnimationClipData, IgeAnimationSampler } from "@/types/IgeAnimationClipData";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";

const cache: WeakMap<IgeAnimationClipData, Map<string, IgeAnimationClipData>> = new WeakMap();

/** Inverse of a 3x3 matrix (column-major), or undefined when it has none. */
function invert3 (m: number[]): number[] | undefined {
	const [a, b, c, d, e, f, g, h, i] = m;
	const A = e * i - f * h;
	const B = -(d * i - f * g);
	const C = d * h - e * g;
	const det = a * A + b * B + c * C;
	if (Math.abs(det) < 1e-12) return undefined;
	const k = 1 / det;
	return [
		A * k, -(b * i - c * h) * k, (b * f - c * e) * k,
		B * k, (a * i - c * g) * k, -(a * f - c * d) * k,
		C * k, -(a * h - b * g) * k, (a * e - b * d) * k
	];
}

function mul3 (m: number[], x: number, y: number, z: number): [number, number, number] {
	return [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
}

/**
 * A copy of a clip with its horizontal root motion taken out, for games
 * that move characters themselves: a walk or run cycle whose hips travel
 * forward (and snap back when it loops) plays on the spot instead. The
 * root-most bone with translation keys keeps its up and down bob and its
 * side-to-side sway; only its drift over the clip, and any offset from
 * its rest position at the start, are removed. "Horizontal" is the
 * world's x and z, so rigs exported Z-up under an armature node work too.
 *
 * Results are cached per clip and skeleton, so every entity shares one
 * copy (and its cached poses). IgeEntity.model() applies it with the
 * `inPlace` option.
 * @example #Walk on the spot
 *     zombie.model(model, { inPlace: ["walk", "run"] });
 *     // or by hand:
 *     const walk = clipInPlace(model.animations[0], model.skins[0].skeleton);
 */
export function clipInPlace (clip: IgeAnimationClipData, skeleton: IgeSkeletonData): IgeAnimationClipData {
	let bySkeleton = cache.get(clip);
	if (!bySkeleton) {
		bySkeleton = new Map();
		cache.set(clip, bySkeleton);
	}
	let result = bySkeleton.get(skeleton.id);
	if (!result) {
		result = makeInPlace(clip, skeleton);
		bySkeleton.set(skeleton.id, result);
	}
	return result;
}

function boneDepth (skeleton: IgeSkeletonData, index: number): number {
	let depth = 0;
	for (let bone = skeleton.bones[index]; bone && bone.parentIndex >= 0; bone = skeleton.bones[bone.parentIndex]) {
		depth++;
	}
	return depth;
}

function makeInPlace (clip: IgeAnimationClipData, skeleton: IgeSkeletonData): IgeAnimationClipData {
	// The root-most bone with translation keys carries the root motion
	let root = -1;
	let rootDepth = Infinity;
	for (const channel of clip.channels) {
		if (channel.targetPath !== "translation" || channel.targetBoneIndex < 0) continue;
		const depth = boneDepth(skeleton, channel.targetBoneIndex);
		if (depth < rootDepth) {
			rootDepth = depth;
			root = channel.targetBoneIndex;
		}
	}
	if (root < 0) return clip;

	const bone = skeleton.bones[root];
	const rest = bone.localBindTransform;

	// The bone's translation is in its parent's space: work out world x/z through the
	// chain of parent rest transforms (and an armature node's transform above the root)
	let linear = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	const chain: Float32Array[] = []; // outermost first
	let top = root;
	for (let p = bone.parentIndex; p >= 0; p = skeleton.bones[p].parentIndex) {
		chain.unshift(skeleton.bones[p].localBindTransform);
		top = p;
	}
	const armature = skeleton.bones[top].parentTransform;
	if (armature) chain.unshift(armature);
	for (const m of chain) {
		const m3 = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
		linear = [
			...mul3(linear, m3[0], m3[1], m3[2]),
			...mul3(linear, m3[3], m3[4], m3[5]),
			...mul3(linear, m3[6], m3[7], m3[8])
		];
	}
	const inverse = invert3(linear);
	if (!inverse) return clip;

	/** The horizontal (world x/z) part of a local offset, back in local space. */
	const horizontal = (x: number, y: number, z: number): [number, number, number] => {
		const [wx, , wz] = mul3(linear, x, y, z);
		return mul3(inverse, wx, 0, wz);
	};

	const samplers = clip.samplers.slice();
	for (const channel of clip.channels) {
		if (channel.targetPath !== "translation" || channel.targetBoneIndex !== root) continue;
		const sampler = clip.samplers[channel.samplerIndex];
		const keys = sampler.input.length;
		if (!keys) continue;
		const cubic = sampler.interpolation === "CUBICSPLINE";
		const stride = cubic ? 9 : 3;
		const at = cubic ? 3 : 0; // the value inside each key (after the in-tangent)
		const out = sampler.output;
		const first = [out[at], out[at + 1], out[at + 2]];
		const lastAt = (keys - 1) * stride + at;
		const offset = horizontal(first[0] - rest[12], first[1] - rest[13], first[2] - rest[14]);
		const drift = horizontal(out[lastAt] - first[0], out[lastAt + 1] - first[1], out[lastAt + 2] - first[2]);
		const t0 = sampler.input[0];
		const span = sampler.input[keys - 1] - t0;

		const output = new Float32Array(out);
		for (let k = 0; k < keys; k++) {
			const f = span > 0 ? (sampler.input[k] - t0) / span : 0;
			for (let c = 0; c < 3; c++) {
				output[k * stride + at + c] -= offset[c] + drift[c] * f;
				if (cubic && span > 0) {
					// Tangents are rates of change: take the drift's rate out of them too
					output[k * stride + c] -= drift[c] / span;
					output[k * stride + 6 + c] -= drift[c] / span;
				}
			}
		}
		const converted: IgeAnimationSampler = { ...sampler, output };
		samplers[channel.samplerIndex] = converted;
	}

	return { ...clip, samplers };
}
