"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgePhysicsCharacter3d = void 0;
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
class IgePhysicsCharacter3d {
    constructor(physics, entity, character, settings, body) {
        this._moveX = 0;
        this._moveZ = 0;
        this._jump = 0;
        this._enabled = true;
        this._destroyed = false;
        this._previous = new Float64Array(3);
        this._current = new Float64Array(3);
        this._physics = physics;
        this.entity = entity;
        this._character = character;
        this._settings = settings;
        this.body = body;
        this._capture(true);
    }
    /** Walk at this horizontal velocity (IGE units per second) until told otherwise. */
    move(vx, vz) {
        this._moveX = vx;
        this._moveZ = vz;
        return this;
    }
    /** Jump with this upward speed (IGE units per second) if standing on something. */
    jump(speed) {
        this._jump = speed;
        return this;
    }
    /** Whether the character stands on walkable ground. */
    onGround() {
        return this._character.GetGroundState() === this._physics._jolt.EGroundState_OnGround;
    }
    /** Velocity in IGE units per second. */
    velocity() {
        const v = this._character.GetLinearVelocity();
        const u = this._physics.unitsPerMetre();
        return { x: v.GetX() * u, y: v.GetY() * u, z: v.GetZ() * u };
    }
    /** Move the character (and its entity) to a position, e.g. a respawn. */
    teleport(x, y, z) {
        const physics = this._physics;
        const u = physics.unitsPerMetre();
        physics._rvec.Set(x / u, y / u, z / u);
        this._character.SetPosition(physics._rvec);
        physics._vec.Set(0, 0, 0);
        this._character.SetLinearVelocity(physics._vec);
        physics._bodies.SetPosition(this.body._id, physics._rvec, physics._jolt.EActivation_DontActivate);
        this.entity.translateTo(x, y, z);
        this._capture(true);
        return this;
    }
    enabled(val) {
        if (val === undefined)
            return this._enabled;
        if (val === this._enabled || this._destroyed)
            return this;
        this._enabled = val;
        this.body.enabled(val);
        return this;
    }
    /** Remove the character and free it. */
    destroy() {
        this._physics.removeCharacter(this);
    }
    _capture(reset = false) {
        const u = this._physics.unitsPerMetre();
        const p = this._character.GetPosition();
        if (!reset)
            this._previous.set(this._current);
        this._current[0] = p.GetX() * u;
        this._current[1] = p.GetY() * u;
        this._current[2] = p.GetZ() * u;
        if (reset)
            this._previous.set(this._current);
    }
    /** Advance the character by one step (before the world steps). */
    _update(dt) {
        if (!this._enabled)
            return;
        const physics = this._physics;
        const jolt = physics._jolt;
        const u = physics.unitsPerMetre();
        const character = this._character;
        const gravity = physics._options.gravity;
        // Walk along the ground when supported; otherwise keep falling
        const current = character.GetLinearVelocity();
        let vy;
        if (character.GetGroundState() === jolt.EGroundState_OnGround) {
            vy = character.GetGroundVelocity().GetY();
            if (this._jump > 0)
                vy += this._jump / u;
        }
        else {
            vy = current.GetY();
        }
        this._jump = 0;
        vy += gravity * dt;
        physics._vec.Set(this._moveX / u, vy, this._moveZ / u);
        character.SetLinearVelocity(physics._vec);
        physics._vec.Set(0, gravity, 0);
        character.ExtendedUpdate(dt, physics._vec, this._settings, physics._bpFilter, physics._objectFilter, physics._bodyFilter, physics._shapeFilter, physics._interface.GetTempAllocator());
        this._capture();
    }
    /** Place the entity between the last two steps (alpha 0-1). */
    _sync(alpha) {
        if (!this._enabled)
            return;
        const a = this._previous, b = this._current;
        this.entity.translateTo(a[0] + (b[0] - a[0]) * alpha, a[1] + (b[1] - a[1]) * alpha, a[2] + (b[2] - a[2]) * alpha);
    }
}
exports.IgePhysicsCharacter3d = IgePhysicsCharacter3d;
