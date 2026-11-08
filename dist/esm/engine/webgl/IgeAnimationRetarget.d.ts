import type { IgeGltfModel } from "./IgeGltfLoader.js"
import type { IgeAnimationClipData } from "../../types/IgeAnimationClipData.js";
import type { IgeSkeletonData } from "../../types/IgeSkeletonData.js"
export interface IgeRetargetOptions {
    /**
     * Which translation keyframes to keep:
     * - "auto" (default): all of them when both rigs have identical rest
     *   poses, otherwise "root";
     * - "root": only the root bone (hips) moves, mapped into the target's
     *   units and scaled to its proportions, so bone lengths stay the
     *   target's own;
     * - "all": every translation as authored (only correct for identical rigs);
     * - "none": no translation, e.g. to keep a walk cycle in place.
     */
    translation?: "auto" | "root" | "all" | "none";
    /**
     * Bone names that differ between the rigs, source name to target name
     * (e.g. { "Bip01 Pelvis": "Hips" }). Other bones match by name, ignoring
     * case and prefixes such as "mixamorig:".
     */
    boneMap?: Record<string, string>;
    /** Override the root motion scale (default: ratio of the rigs' hip heights). */
    rootScale?: number;
}
/**
 * Make the animation clips of one file play on another model's skeleton.
 *
 * Use it when animations come in separate files from the character (one
 * file per clip, or an animation library shared by several characters).
 * Channels are matched to target bones by name. When both rigs have the
 * same rest pose (the usual case for files exported from one character)
 * the clips are simply re-indexed and share their keyframe data.
 * Otherwise each rotation is converted so the target bone makes the same
 * motion relative to its own rest pose, which handles rigs with different
 * bone orientations and units as long as both rest in the same posture
 * (e.g. both T-pose). Root motion is scaled to the target's proportions.
 *
 * Results are cached per source file, skeleton and options, so every
 * entity gets the same clip objects (and shares cached poses).
 * @example #Use a separate attack animation file
 *     const attack = await igeGltfLoader.load("zombie_attack.glb");
 *     const clips = retargetClips(attack, zombieModel.skins[0].skeleton);
 *     zombie.skeletalAnimation().define("Attack", clips[0]);
 */
export declare function retargetClips(source: IgeGltfModel, target: IgeSkeletonData, options?: IgeRetargetOptions): IgeAnimationClipData[];
/**
 * Normalise a bone name for matching: drop namespace prefixes such as
 * "mixamorig:" or "Armature|" and ignore case.
 */
export declare function normaliseBoneName(name: string): string;
