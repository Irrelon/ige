import type JoltApi from "jolt-physics";
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgePhysics3d } from "./IgePhysics3d.js";
type Vec3 = {
    x: number;
    y: number;
    z: number;
};
/** One body of a ragdoll: a capsule along a bone. */
export interface IgeRagdollPart {
    /** The bone the part starts at; its joint is the part's base. */
    bone: string;
    /** The bone whose joint ends the part. Without it the part runs `length` along its parent part's direction (e.g. a head). */
    to?: string;
    /** Capsule radius in IGE units (default 30% of the part's length). */
    radius?: number;
    /** Length (IGE units) for parts without `to`. */
    length?: number;
}
export interface IgeRagdollOptions {
    /**
     * The parts to simulate. Bones without a part move rigidly with the
     * nearest part above them. Default: one part per bone with children
     * whose segment is at least 8% of the skeleton's height (see
     * autoRagdollParts()).
     */
    parts?: IgeRagdollPart[];
    /** Starting velocity of every part (IGE units per second), e.g. along the killing blow. */
    velocity?: Vec3;
    /** How far a part can swing from its parent's direction, in degrees (default 50). */
    swingLimit?: number;
    /** How far a part can twist around its own axis, in degrees either way (default 25). */
    twistLimit?: number;
    /** kg per cubic metre (default 1000). */
    density?: number;
    /** Default 0.6. */
    friction?: number;
    /** Collision layer for the parts (default "moving"), e.g. a corpses layer the living walk through. */
    layer?: string;
}
interface PartState {
    boneIndex: number;
    body: JoltApi.Body;
    /** Bone world matrix relative to the body's (IGE units, includes the bone's scale). */
    offset: Float32Array;
}
/**
 * Ragdoll parts for a skeleton when none are given: one capsule per bone
 * with children, ending at the child that continues the bone's direction
 * (the spine rather than an arm), skipping segments shorter than 8% of
 * the skeleton's height. Characters usually look better with parts chosen
 * by hand (head, hands), but this works for any rig.
 */
export declare function autoRagdollParts(entity: IgeEntity): IgeRagdollPart[];
/**
 * A ragdoll made from a skinned entity's skeleton: a capsule body per part,
 * joined with swing-twist joints, that drives the skeleton every step so
 * the character falls and tumbles as physics dictates. The entity's
 * animation is stopped while it lasts. Create it with
 * IgePhysics3d.createRagdoll(), e.g. when a character dies.
 */
export declare class IgeRagdoll3d {
    readonly entity: IgeEntity;
    _physics: IgePhysics3d;
    _parts: PartState[];
    _constraints: JoltApi.Constraint[];
    _partOfBone: Int32Array;
    _order: number[];
    _frozenLocal: Float32Array;
    _model: Float32Array;
    _scratch: Float32Array;
    _scratch2: Float32Array;
    _entityInverse: Float32Array;
    _parentInverse: Float32Array;
    _destroyed: boolean;
    constructor(physics: IgePhysics3d, entity: IgeEntity, options?: IgeRagdollOptions);
    /** Push the ragdoll: an impulse (kg * IGE units per second) on one part, or spread over all of them. */
    applyImpulse(x: number, y: number, z: number, partIndex?: number): this;
    /** Whether every part has come to rest (Jolt has put them to sleep). */
    asleep(): boolean;
    /** Pose the skeleton from the bodies (IgePhysics3d calls this after every step). */
    sync(): void;
    /** Remove the bodies and joints; the skeleton stays in its last pose until animated again. */
    destroy(): void;
    _free(): void;
}
export {};
