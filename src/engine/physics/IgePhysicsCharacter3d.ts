import type JoltApi from "jolt-physics";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d, IgePhysicsBody3d } from "@/engine/physics/IgePhysics3d";

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
export class IgePhysicsCharacter3d {
	readonly entity: IgeEntity;
	/** The body other bodies collide with; raycasts and sensors report this. */
	readonly body: IgePhysicsBody3d;
	_physics: IgePhysics3d;
	_character: JoltApi.CharacterVirtual;
	_settings: JoltApi.ExtendedUpdateSettings;
	_moveX: number = 0;
	_moveZ: number = 0;
	_jump: number = 0;
	_enabled: boolean = true;
	_destroyed: boolean = false;
	_previous = new Float64Array(3);
	_current = new Float64Array(3);

	constructor (physics: IgePhysics3d, entity: IgeEntity, character: JoltApi.CharacterVirtual, settings: JoltApi.ExtendedUpdateSettings, body: IgePhysicsBody3d) {
		this._physics = physics;
		this.entity = entity;
		this._character = character;
		this._settings = settings;
		this.body = body;
		this._capture(true);
	}

	/** Walk at this horizontal velocity (IGE units per second) until told otherwise. */
	move (vx: number, vz: number): this {
		this._moveX = vx;
		this._moveZ = vz;
		return this;
	}

	/** Jump with this upward speed (IGE units per second) if standing on something. */
	jump (speed: number): this {
		this._jump = speed;
		return this;
	}

	/** Whether the character stands on walkable ground. */
	onGround (): boolean {
		return this._character.GetGroundState() === this._physics._jolt.EGroundState_OnGround;
	}

	/** Velocity in IGE units per second. */
	velocity (): { x: number; y: number; z: number } {
		const v = this._character.GetLinearVelocity();
		const u = this._physics.unitsPerMetre();
		return { x: v.GetX() * u, y: v.GetY() * u, z: v.GetZ() * u };
	}

	/** Move the character (and its entity) to a position, e.g. a respawn. */
	teleport (x: number, y: number, z: number): this {
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

	/** Gets / sets whether the character takes part (e.g. off while dead: other bodies pass where it was). */
	enabled (): boolean;
	enabled (val: boolean): this;
	enabled (val?: boolean): boolean | this {
		if (val === undefined) return this._enabled;
		if (val === this._enabled || this._destroyed) return this;
		this._enabled = val;
		this.body.enabled(val);
		return this;
	}

	/** Remove the character and free it. */
	destroy (): void {
		this._physics.removeCharacter(this);
	}

	_capture (reset: boolean = false): void {
		const u = this._physics.unitsPerMetre();
		const p = this._character.GetPosition();
		if (!reset) this._previous.set(this._current);
		this._current[0] = p.GetX() * u; this._current[1] = p.GetY() * u; this._current[2] = p.GetZ() * u;
		if (reset) this._previous.set(this._current);
	}

	/** Advance the character by one step (before the world steps). */
	_update (dt: number): void {
		if (!this._enabled) return;
		const physics = this._physics;
		const jolt = physics._jolt;
		const u = physics.unitsPerMetre();
		const character = this._character;
		const gravity = physics._options.gravity;

		// Walk along the ground when supported; otherwise keep falling
		const current = character.GetLinearVelocity();
		let vy: number;
		if (character.GetGroundState() === jolt.EGroundState_OnGround) {
			vy = character.GetGroundVelocity().GetY();
			if (this._jump > 0) vy += this._jump / u;
		} else {
			vy = current.GetY();
		}
		this._jump = 0;
		vy += gravity * dt;

		physics._vec.Set(this._moveX / u, vy, this._moveZ / u);
		character.SetLinearVelocity(physics._vec);
		physics._vec.Set(0, gravity, 0);
		character.ExtendedUpdate(dt, physics._vec, this._settings, physics._bpFilter, physics._objectFilter,
			physics._bodyFilter, physics._shapeFilter, physics._interface.GetTempAllocator());
		this._capture();
	}

	/** Place the entity between the last two steps (alpha 0-1). */
	_sync (alpha: number): void {
		if (!this._enabled) return;
		const a = this._previous, b = this._current;
		this.entity.translateTo(a[0] + (b[0] - a[0]) * alpha, a[1] + (b[1] - a[1]) * alpha, a[2] + (b[2] - a[2]) * alpha);
	}
}
