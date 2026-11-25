import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import { floatSamples, IgeBuoyancySolver, type IgeFloatSample } from "@/engine/physics/IgePhysicsBuoyancy3d";
import { type IgeCraftHost, IgePhysicsCraft3d } from "@/engine/physics/IgePhysicsCraft3d";
import type {
	IgePhysicsBoat3dApi,
	IgePhysicsBoatInput,
	IgePhysicsBoatOptions,
	IgePhysicsCraftState,
	IgePhysicsWaterDrag
} from "@/engine/physics/IgePhysicsCraft3dApi";
import { axisAngleQuat, clamp, DEG, multiplyQuats, smoothstep, vec } from "@/engine/physics/IgePhysicsCraft3dFrame";
import { BOAT_PRESETS } from "@/engine/physics/IgePhysicsCraft3dPresets";

/*
 * A boat, in engine-neutral code over the physics backend's forces:
 * buoyancy at sample points over the hull against the shared water, drag
 * (little forwards, a lot sideways, damped turning), a propeller that only
 * pushes while it's under water, a rudder that turns the boat harder the
 * faster it goes, planing (the hull lifts and the bow rises at speed), and
 * arcade help: it leans into turns, is hard to capsize and rights itself,
 * and leaping clear of the water it holds itself about level.
 */

type Vec3 = IgePhysicsVec3;

/** A boat, every option resolved: metres and SI units (the shape stays in IGE units for the body). */
export interface IgeBoatSpec {
	mass: number;
	shape: IgePhysicsShape;
	centreOfMass: Vec3;
	volume: number;
	samples: IgeFloatSample[];
	maxSpeed: number;
	thrust: number;
	reverse: number;
	propeller: Vec3;
	turnRate: number;
	turnSpeed: number;
	bank: number;
	planing: { lift: number; bowRise: number; speed: number };
	stability: number;
	drag: Required<IgePhysicsWaterDrag>;
	friction: number;
	extrapolate: number;
	impacts?: boolean | number;
	layer?: string;
	propellerEntity?: IgeEntity;
}

function scaleShape (shape: IgePhysicsShape, u: number): IgePhysicsShape {
	switch (shape.type) {
		case "box":
			return { type: "box", halfExtents: { x: shape.halfExtents.x * u, y: shape.halfExtents.y * u, z: shape.halfExtents.z * u } };
		case "sphere":
			return { type: "sphere", radius: shape.radius * u };
		case "capsule":
			return { type: "capsule", radius: shape.radius * u, halfHeight: shape.halfHeight * u };
		case "compound":
			return {
				type: "compound",
				children: shape.children.map((c) => ({
					...c,
					shape: scaleShape(c.shape, u),
					position: c.position && { x: c.position.x * u, y: c.position.y * u, z: c.position.z * u }
				}))
			};
		default:
			return shape;
	}
}

export { scaleShape as scaleCraftShape };

/** Fill in every option of a boat (options in IGE units, presets in metres). */
export function resolveBoatSpec (options: IgePhysicsBoatOptions, u: number): IgeBoatSpec {
	const preset = BOAT_PRESETS[options.preset ?? "speedboat"];
	if (!preset) throw new Error(`IgePhysics3d: no boat preset "${options.preset}"`);
	const hull = options.hull
		? { length: options.hull.length / u, width: options.hull.width / u, height: options.hull.height / u }
		: preset.hull;
	const ownHull = !!options.hull;
	const volume = options.volume ?? hull.length * hull.width * hull.height * preset.fullness;

	// Buoyancy: a grid of columns over the hull, keel to deck
	let samples: IgeFloatSample[];
	if (options.points?.length) {
		samples = floatSamples(options.points, volume, hull.height, u);
	} else {
		const { along, across } = preset.grid;
		samples = [];
		for (let i = 0; i < along; i++) {
			for (let j = 0; j < across; j++) {
				samples.push({
					x: -hull.width / 2 + ((j + 0.5) / across) * hull.width * 0.9 + hull.width * 0.05,
					y: hull.height / 2,
					z: -hull.length / 2 + ((i + 0.5) / along) * hull.length,
					volume: volume / (along * across),
					height: hull.height
				});
			}
		}
	}

	const shape = options.shape ?? (ownHull
		? { type: "compound" as const, children: [{ shape: { type: "box" as const, halfExtents: { x: options.hull!.width / 2, y: options.hull!.height / 2, z: options.hull!.length / 2 } }, position: { x: 0, y: options.hull!.height / 2, z: 0 } }] }
		: scaleShape(preset.shape, u));
	const com = options.centreOfMass
		? { x: options.centreOfMass.x / u, y: options.centreOfMass.y / u, z: options.centreOfMass.z / u }
		: ownHull ? { x: 0, y: hull.height * 0.3, z: -hull.length * 0.05 } : { ...preset.centreOfMass };
	const propeller = options.propeller
		? { x: options.propeller.x / u, y: options.propeller.y / u, z: options.propeller.z / u }
		: { x: 0, y: preset.propellerDepth, z: -hull.length / 2 + Math.min(0.4, hull.length * 0.05) };
	const planing = options.planing ?? {};
	return {
		mass: options.mass ?? preset.mass,
		shape,
		centreOfMass: com,
		volume,
		samples,
		maxSpeed: Math.max(0.1, (options.maxSpeed ?? preset.maxSpeed * u) / u),
		thrust: options.thrust ?? preset.thrust,
		reverse: clamp(options.reverse ?? preset.reverse, 0, 1),
		propeller,
		turnRate: (options.turnRate ?? preset.turnRate) * DEG,
		turnSpeed: Math.max(0.1, (options.turnSpeed ?? preset.turnSpeed * u) / u),
		bank: (options.bank ?? preset.bank) * DEG,
		planing: {
			lift: clamp(planing.lift ?? preset.planing.lift, 0, 0.95),
			bowRise: (planing.bowRise ?? preset.planing.bowRise) * DEG,
			speed: Math.max(0.1, (planing.speed ?? preset.planing.speed * u) / u)
		},
		stability: Math.max(0, options.stability ?? preset.stability),
		drag: { ...preset.drag, ...options.drag },
		friction: options.friction ?? 0.3,
		extrapolate: options.extrapolate ?? 0.25,
		impacts: options.impacts,
		layer: options.layer,
		propellerEntity: options.propellerEntity
	};
}

/** The tightest turn at speed, g across the water. */
const TURN_MOST = 2.5;
/** Clear of the water: how quickly it levels itself (rad/s, critically damped), to a little bow-up. */
const AIR_LEVEL = 2.5;
const AIR_PITCH = 3 * Math.PI / 180;

const _a = vec();
const _b = vec();
const _c = vec();
const _current = { x: 0, z: 0 };

/** A boat (see IgePhysicsBoat3dApi), made with IgePhysics3d.addBoat(). */
export class IgePhysicsBoat3d extends IgePhysicsCraft3d implements IgePhysicsBoat3dApi {
	classId = "IgePhysicsBoat3d";
	_spec: IgeBoatSpec;
	_input: IgePhysicsBoatInput = { throttle: 0, steer: 0 };
	/** The engine's output, -1..1 (follows the throttle). */
	_engine: number = 0;
	_hull: IgeBuoyancySolver;
	_propInWater: boolean = false;
	_propAngle: number = 0;
	_propBase: { x: number; y: number; z: number; w: number };
	/** Share of the hull under water at rest (its weight over the most it can displace). */
	_restShare: number;
	/** How hard buoyancy pitches and rolls it back level (N·m per radian), and its inertia about those axes. */
	_pitchStiffness: number;
	_rollStiffness: number;
	_pitchInertia: number;
	_rollInertia: number;
	_yawInertia: number;

	constructor (host: IgeCraftHost, entity: IgeEntity, body: IgePhysicsBody3d, spec: IgeBoatSpec, layer: number) {
		super(host, entity, "boat", body, { layer, impacts: spec.impacts, extrapolate: spec.extrapolate });
		this._spec = spec;
		this._hull = new IgeBuoyancySolver(spec.samples, spec.drag);
		this._hull.dragHeight = spec.centreOfMass.y;
		this._propBase = spec.propellerEntity?.quaternion() ?? { x: 0, y: 0, z: 0, w: 1 };
		const density = host._water?.density ?? 1025;
		const frame = this._frame;
		this._restShare = clamp(frame.mass / (density * spec.volume), 0.02, 1);

		// Buoyancy's own righting stiffness (each column's water-plane area times its lever squared)
		const g = Math.abs(host.gravity()) || 9.81;
		let pitch = 0, roll = 0;
		const com = spec.centreOfMass;
		for (const s of spec.samples) {
			const area = s.volume / (s.height || 1);
			pitch += area * (s.z - com.z) ** 2;
			roll += area * (s.x - com.x) ** 2;
		}
		this._pitchStiffness = density * g * pitch;
		this._rollStiffness = density * g * roll;
		// The torque for a unit angular acceleration about each axis
		this._pitchInertia = Math.abs(frame.toBody(frame.torqueFor(vec(1, 0, 0), vec()), vec()).x) || 1;
		this._rollInertia = Math.abs(frame.toBody(frame.torqueFor(vec(0, 0, 1), vec()), vec()).z) || 1;
		this._yawInertia = Math.abs(frame.toBody(frame.torqueFor(vec(0, 1, 0), vec()), vec()).y) || 1;
	}

	drive (input: Partial<IgePhysicsBoatInput>): this {
		const value = (v: number | undefined) => clamp(Number.isFinite(v) ? v as number : 0, -1, 1);
		this._input.throttle = value(input.throttle);
		this._input.steer = value(input.steer);
		return this;
	}

	input (): IgePhysicsBoatInput {
		return { ...this._input };
	}

	propellerInWater (): boolean {
		return this._propInWater;
	}

	submerged (): number {
		return this._hull.submerged;
	}

	_waterContact (): boolean {
		return this._hull.submerged > 0;
	}

	_applyForces (dt: number): void {
		const world = this._waterWorld();
		const spec = this._spec;
		const input = this._input;
		// The engine follows the throttle in about half a second
		this._engine += clamp(input.throttle - this._engine, -dt * 2, dt * 2);
		if (!world) {
			this._hull.submerged = 0;
			this._propInWater = false;
			return;
		}
		const frame = this._frame;
		const water = world.water;
		const u = this._u;

		// Buoyancy, and drag sideways and up and down, at each point
		const under = this._hull.apply(frame, world);
		if (under <= 0) {
			this._propInWater = false;
			this._airborneAttitude(1);
			return;
		}
		const m = frame.mass;
		const g = Math.abs(world.gravity);
		// How much it's really in the water: 1 floating, skimming crests or up on
		// the plane; less only once it's nearly clear, leaping off a wave
		const wet = clamp(under / (this._restShare * 0.25), 0, 1);

		// Its speed through the water, in its own axes
		water.currentAt(frame.position.x * u, frame.position.z * u, _current);
		_a.x = frame.velocity.x - _current.x / u; _a.y = frame.velocity.y; _a.z = frame.velocity.z - _current.z / u;
		const vb = frame.toBody(_a, _b);
		const ahead = vb.z;

		// The hull's resistance forwards: mostly by the square of the speed, so it tops out at maxSpeed
		const vmax = spec.maxSpeed;
		const resistance = -(0.1 * spec.thrust / vmax * ahead + 0.9 * spec.thrust / (vmax * vmax) * ahead * Math.abs(ahead)) * wet;
		_c.x = frame.forward.x * resistance; _c.y = frame.forward.y * resistance; _c.z = frame.forward.z * resistance;
		this._force(_c);

		// The propeller: pushes only while it's under water. It pushes level with the centre of mass (not from
		// down at the propeller), so full throttle can't stand the boat on its stern
		const prop = frame.pointToWorld(spec.propeller, _a);
		this._propInWater = water.heightAt(prop.x * u, prop.z * u) / u > prop.y;
		if (this._propInWater && this._engine !== 0) {
			const push = this._engine > 0 ? this._engine * spec.thrust : this._engine * spec.thrust * spec.reverse;
			_c.x = frame.forward.x * push; _c.y = frame.forward.y * push; _c.z = frame.forward.z * push;
			_b.x = spec.propeller.x; _b.y = spec.centreOfMass.y; _b.z = spec.propeller.z;
			this._force(_c, frame.pointToWorld(_b, _a));
		}

		// Planing: at speed the hull lifts out of the water
		const planing = spec.planing;
		const fast = ahead > 0 ? ahead / planing.speed : 0;
		if (planing.lift > 0 && fast > 0) {
			_c.x = 0; _c.y = m * g * planing.lift * Math.min(1, fast * fast) * wet; _c.z = 0;
			this._force(_c);
		}

		// Rudder: turns harder with speed (and a little with the propeller's wash at low speed)
		const w = frame.toBody(frame.angular, _c);
		let authority = clamp(Math.abs(ahead) / spec.turnSpeed, 0, 1);
		if (this._propInWater) authority = Math.max(authority, 0.35 * Math.abs(this._engine));
		const astern = ahead < -0.5 || (Math.abs(ahead) <= 0.5 && this._engine < 0) ? -1 : 1;
		// ...but no tighter than a few g across the water, so it stays on its keel at speed
		const yawTarget = input.steer * Math.min(spec.turnRate * authority, (TURN_MOST * g) / Math.max(Math.abs(ahead), 1)) * astern;
		const yawRight = -w.y;
		const yawMost = spec.turnRate * 4;
		// The rudder is sized to overcome the keel's drag at the turn rate it's after
		const yawAccel = clamp(3 * (yawTarget - yawRight) + this._keelYawDamping() * yawTarget, -yawMost, yawMost) * wet;

		// Attitude: the bow rises as it gets going and settles again on the plane;
		// it leans into turns; and it's pulled back upright, so it's hard to
		// capsize and rights itself if it does. The trim offsets buoyancy's own
		// pull back to level, so the boat settles at the target angle.
		const bowTarget = planing.bowRise * (smoothstep(0, 0.6, fast) - 0.55 * smoothstep(0.9, 1.8, fast));
		const bankTarget = spec.bank * input.steer * clamp(ahead / spec.turnSpeed, 0, 1) * astern;
		const s = spec.stability;
		const pitchNow = frame.pitch(), rollNow = frame.roll();
		let rollError = bankTarget - rollNow;
		if (rollError > Math.PI) rollError -= 2 * Math.PI;
		else if (rollError < -Math.PI) rollError += 2 * Math.PI;
		// Buoyancy's pull back to level comes only from columns at the surface
		// (one out of the water, or right under, pushes no harder as it tips), so
		// the trim that offsets it fades as the bow lifts clear: it can't
		// launch the boat
		const { pitch: pitchStiffness, roll: rollStiffness } = this._surfaceStiffness();
		const pitchDamp = 2 * 0.5 * Math.sqrt(s + this._pitchStiffness / this._pitchInertia);
		const rollDamp = 2 * 0.5 * Math.sqrt(s + this._rollStiffness / this._rollInertia);
		const noseUp = (pitchStiffness * bowTarget) / this._pitchInertia + s * (bowTarget - pitchNow) + pitchDamp * w.x * 0.3;
		const rollRight = (rollStiffness * bankTarget) / this._rollInertia + s * rollError - rollDamp * w.z * 0.3;
		const inWater = Math.min(1, under / this._restShare);
		_a.x = -noseUp * inWater;
		_a.y = -yawAccel;
		_a.z = rollRight * inWater;
		this._torque(frame.torqueFor(_a, _b));
		if (inWater < 1) this._airborneAttitude(1 - inWater);
	}

	/** Leaping clear of the water, it holds itself about level, so it lands flat rather than on its stern or its side. */
	_airborneAttitude (share: number): void {
		const frame = this._frame;
		const w = frame.toBody(frame.angular, _c);
		const stiffness = AIR_LEVEL * AIR_LEVEL, damping = 2 * AIR_LEVEL;
		let roll = frame.roll();
		if (roll > Math.PI) roll -= 2 * Math.PI;
		_a.x = -(stiffness * (AIR_PITCH - frame.pitch()) + damping * w.x) * share;
		_a.y = 0;
		_a.z = (-stiffness * roll - damping * w.z) * share;
		this._torque(frame.torqueFor(_a, _b));
	}

	/** How much the keel's sideways drag slows turning now, per second (from the points in the water). */
	_keelYawDamping (): number {
		const samples = this._spec.samples, shares = this._hull.pointSubmerged, com = this._spec.centreOfMass;
		const mass = this._frame.mass, total = this._hull.totalVolume;
		let sum = 0;
		for (let i = 0; i < samples.length; i++) {
			const s = samples[i];
			sum += mass * (s.volume / total) * shares[i] * ((s.z - com.z) ** 2 + (s.x - com.x) ** 2);
		}
		return (this._spec.drag.x * sum) / this._yawInertia;
	}

	/** How hard buoyancy pitches and rolls the hull back level now (N·m per radian): from the columns at the surface. */
	_surfaceStiffness (): { pitch: number; roll: number } {
		const samples = this._spec.samples, shares = this._hull.pointSubmerged, com = this._spec.centreOfMass;
		const density = this._host._water?.density ?? 1025;
		const g = Math.abs(this._host.gravity());
		let pitch = 0, roll = 0;
		for (let i = 0; i < samples.length; i++) {
			const share = shares[i];
			if (share <= 0 || share >= 1) continue;
			const s = samples[i];
			const area = s.volume / (s.height || 1);
			pitch += area * (s.z - com.z) ** 2;
			roll += area * (s.x - com.x) ** 2;
		}
		return { pitch: density * g * pitch, roll: density * g * roll };
	}

	_afterStep (dt: number): void {
		// The propeller entity spins with the engine (up to about 20 turns a second)
		if (this._spec.propellerEntity) this._propAngle = (this._propAngle + this._engine * 120 * dt) % (2 * Math.PI);
	}

	_followTarget (target: IgePhysicsCraftState, dt: number): void {
		this._engine = clamp(target.engine ?? Number(target.input?.throttle ?? 0), -1, 1);
		this._afterStep(dt);
	}

	_sync (_alpha: number): void {
		const prop = this._spec.propellerEntity;
		if (prop) prop.quaternion(multiplyQuats(this._propBase, axisAngleQuat(0, 0, 1, this._propAngle)));
	}

	_writeState (state: IgePhysicsCraftState): void {
		state.input = { ...this._input };
		state.engine = this._engine;
	}

	_readState (state: IgePhysicsCraftState): void {
		if (state.input) this.drive(state.input as Partial<IgePhysicsBoatInput>);
		if (Number.isFinite(state.engine)) this._engine = clamp(state.engine!, -1, 1);
	}
}
