import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsBackendCharacterState, IgePhysicsCharacterHandle } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsCharacterState } from "@/engine/physics/IgePhysics3dTypes";

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
 * A player character: a capsule that walks where it's told, up stairs and
 * slopes, sticks to the floor going down them, and pushes crates and other
 * bodies with a limited strength. Other bodies collide with it (through
 * `body`), and raycasts and sensors report it. Jolt runs it as a
 * CharacterVirtual.
 *
 * The character's position is its feet, at the entity's origin; the entity
 * keeps its own rotation (facing).
 */
export class IgePhysicsCharacter3d {
	readonly entity: IgeEntity;
	/** The body other bodies collide with; raycasts and sensors report this. */
	readonly body: IgePhysicsBody3d;
	_physics: IgePhysics3d;
	/** The backend's character. */
	_handle: IgePhysicsCharacterHandle;
	_moveX: number = 0;
	_moveZ: number = 0;
	_jump: number = 0;
	_enabled: boolean = true;
	_destroyed: boolean = false;
	_previous = new Float64Array(3);
	_current = new Float64Array(3);
	/** The backend's latest report (metres). */
	_state: IgePhysicsBackendCharacterState = {
		position: { x: 0, y: 0, z: 0 },
		velocity: { x: 0, y: 0, z: 0 },
		onGround: false,
		groundVelocity: { x: 0, y: 0, z: 0 }
	};
	_velocity = { x: 0, y: 0, z: 0 };

	constructor (physics: IgePhysics3d, entity: IgeEntity, handle: IgePhysicsCharacterHandle, body: IgePhysicsBody3d) {
		this._physics = physics;
		this.entity = entity;
		this._handle = handle;
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
		this._physics._backend.readCharacter(this._handle, this._state);
		return this._state.onGround;
	}

	/** Velocity in IGE units per second. */
	velocity (): { x: number; y: number; z: number } {
		this._physics._backend.readCharacter(this._handle, this._state);
		const v = this._state.velocity;
		const u = this._physics.unitsPerMetre();
		return { x: v.x * u, y: v.y * u, z: v.z * u };
	}

	/** Move the character (and its entity) to a position, e.g. a respawn. */
	teleport (x: number, y: number, z: number): this {
		return this.setState({ position: { x, y, z }, velocity: { x: 0, y: 0, z: 0 } });
	}

	/** Where the character is and how it's moving, as plain numbers safe to send or keep as JSON. */
	getState (): IgePhysicsCharacterState {
		const state = this._state;
		this._physics._backend.readCharacter(this._handle, state);
		const u = this._physics.unitsPerMetre();
		const p = state.position, v = state.velocity;
		return { position: { x: p.x * u, y: p.y * u, z: p.z * u }, velocity: { x: v.x * u, y: v.y * u, z: v.z * u } };
	}

	/** Put the character (and its entity) in a state from getState(), e.g. in another world. */
	setState (state: IgePhysicsCharacterState): this {
		if (this._destroyed) return this;
		const u = this._physics.unitsPerMetre();
		const p = state.position, v = state.velocity ?? { x: 0, y: 0, z: 0 };
		this._physics._backend.setCharacterState(this._handle, { x: p.x / u, y: p.y / u, z: p.z / u }, { x: v.x / u, y: v.y / u, z: v.z / u });
		this.entity.translateTo(p.x, p.y, p.z);
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
		this.body._enabled = val;
		this._physics._backend.setCharacterEnabled(this._handle, val);
		if (val) this._capture(true);
		return this;
	}

	/** Remove the character and free it. */
	destroy (): void {
		this._physics.removeCharacter(this);
	}

	_capture (reset: boolean = false): void {
		const u = this._physics.unitsPerMetre();
		this._physics._backend.readCharacter(this._handle, this._state);
		const p = this._state.position;
		if (!reset) this._previous.set(this._current);
		this._current[0] = p.x * u; this._current[1] = p.y * u; this._current[2] = p.z * u;
		if (reset) this._previous.set(this._current);
	}

	/**
	 * Move the character on by dt seconds, alone: its move(), jump() and
	 * gravity against the world as it stands, without stepping the world.
	 * The world does exactly this for each character before each of its
	 * steps. A client predicting its player replays the inputs the
	 * authority hasn't applied yet with it: setState() to the authority's
	 * state, then move() and step() for each input. (It pushes what it walks
	 * into each time, so replay where nothing loose is close, or accept the
	 * pushes.)
	 * @example #Replaying unacknowledged inputs
	 *     hero.setState(serverState);
	 *     for (const input of pending) hero.move(input.x * SPEED, input.z * SPEED).step(1 / 30);
	 */
	step (dt: number): this {
		this._update(dt);
		return this;
	}

	/** Advance the character by one step (before the world steps; see step()). */
	_update (dt: number): void {
		if (!this._enabled || this._destroyed) return;
		const physics = this._physics;
		const backend = physics._backend;
		const u = physics.unitsPerMetre();
		const gravity = physics._options.gravity;
		const state = this._state;

		// Walk along the ground when supported; otherwise keep falling
		backend.readCharacter(this._handle, state);
		let vy: number;
		if (state.onGround) {
			vy = state.groundVelocity.y;
			if (this._jump > 0) vy += this._jump / u;
		} else {
			vy = state.velocity.y;
		}
		this._jump = 0;
		vy += gravity * dt;

		const v = this._velocity;
		v.x = this._moveX / u; v.y = vy; v.z = this._moveZ / u;
		backend.moveCharacter(this._handle, v, gravity, dt);
		this._capture();
	}

	/** Place the entity between the last two steps (alpha 0-1). */
	_sync (alpha: number): void {
		if (!this._enabled) return;
		const a = this._previous, b = this._current;
		this.entity.translateTo(a[0] + (b[0] - a[0]) * alpha, a[1] + (b[1] - a[1]) * alpha, a[2] + (b[2] - a[2]) * alpha);
	}
}
