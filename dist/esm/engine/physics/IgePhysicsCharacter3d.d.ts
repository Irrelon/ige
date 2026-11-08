import type JoltApi from "jolt-physics";
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgePhysics3d, IgePhysicsBody3d } from "./IgePhysics3d.js";
export interface IgePhysicsCharacterOptions {
    /** Capsule radius (IGE units). */
    radius: number;
    /** Height from the feet to the top of the head (IGE units). */
    height: number;
    /** kg (default 80). */
    mass?: number;
    /** Most force (newtons) the character pushes other bodies with (default 500). */
    maxStrength?: number;
    /** Steepest slope it can walk up, in degrees (default 50). */
    maxSlopeAngle?: number;
    /** Tallest step it walks up (IGE units, default 0.3 metres). */
    stepHeight?: number;
    /** Collision layer (default "moving"). */
    layer?: string;
    /**
     * Whether other bodies can push the character (default true): a horde
     * walking into a player shoves them. false keeps it where its own
     * movement puts it (it still can't walk through them).
     */
    pushable?: boolean;
}
/**
 * A player character moved by Jolt's CharacterVirtual: a capsule that
 * walks where it's told, up stairs and slopes, sticks to the floor going
 * down them, pushes crates and other bodies with a limited strength, and
 * isn't shoved around by them. Other bodies collide with it (through an
 * inner body, `body`), and raycasts and sensors report it.
 *
 * The character's position is its feet, at the entity's origin; the entity
 * keeps its own rotation (facing).
 */
export declare class IgePhysicsCharacter3d {
    readonly entity: IgeEntity;
    /** The body other bodies collide with; raycasts and sensors report this. */
    readonly body: IgePhysicsBody3d;
    _physics: IgePhysics3d;
    _character: JoltApi.CharacterVirtual;
    _settings: JoltApi.ExtendedUpdateSettings;
    _moveX: number;
    _moveZ: number;
    _jump: number;
    _enabled: boolean;
    /** Query filters for the character's layer. */
    _bpFilter?: JoltApi.BroadPhaseLayerFilter;
    _objectFilter?: JoltApi.ObjectLayerFilter;
    _listener?: JoltApi.CharacterContactListenerJS;
    _destroyed: boolean;
    _previous: Float64Array;
    _current: Float64Array;
    constructor(physics: IgePhysics3d, entity: IgeEntity, character: JoltApi.CharacterVirtual, settings: JoltApi.ExtendedUpdateSettings, body: IgePhysicsBody3d);
    /** Walk at this horizontal velocity (IGE units per second) until told otherwise. */
    move(vx: number, vz: number): this;
    /** Jump with this upward speed (IGE units per second) if standing on something. */
    jump(speed: number): this;
    /** Whether the character stands on walkable ground. */
    onGround(): boolean;
    /** Velocity in IGE units per second. */
    velocity(): {
        x: number;
        y: number;
        z: number;
    };
    /** Move the character (and its entity) to a position, e.g. a respawn. */
    teleport(x: number, y: number, z: number): this;
    /** Gets / sets whether the character takes part (e.g. off while dead: other bodies pass where it was). */
    enabled(): boolean;
    enabled(val: boolean): this;
    /** Remove the character and free it. */
    destroy(): void;
    _capture(reset?: boolean): void;
    /** Advance the character by one step (before the world steps). */
    _update(dt: number): void;
    /** Place the entity between the last two steps (alpha 0-1). */
    _sync(alpha: number): void;
}
