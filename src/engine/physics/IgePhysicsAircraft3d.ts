import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysicsBackendRaycastHit } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import { floatSamples, IgeBuoyancySolver, type IgeFloatSample } from "@/engine/physics/IgePhysicsBuoyancy3d";
import { scaleCraftShape } from "@/engine/physics/IgePhysicsBoat3d";
import { type IgeCraftHost, IgePhysicsCraft3d } from "@/engine/physics/IgePhysicsCraft3d";
import type {
	IgePhysicsAircraft3dApi,
	IgePhysicsAircraftInput,
	IgePhysicsAircraftOptions,
	IgePhysicsCraftState,
	IgePhysicsGearOptions,
	IgePhysicsWaterDrag
} from "@/engine/physics/IgePhysicsCraft3dApi";
import { axisAngleQuat, clamp, DEG, multiplyQuats, smoothstep, vec } from "@/engine/physics/IgePhysicsCraft3dFrame";
import { AIRCRAFT_PRESETS } from "@/engine/physics/IgePhysicsCraft3dPresets";

/*
 * Planes and helicopters, in engine-neutral code over the physics
 * backend's forces and torques (no physics library's flight or vehicle
 * features), with GTA-style arcade handling.
 *
 * Planes: thrust along the nose; lift from airspeed and the wing's angle
 * of attack, which falls away softly past the stall; drag (parasitic,
 * induced, flaps, gear, stalled); a side force that keeps the plane
 * flying where it points. The stick sets turn rates, reached through the
 * body's inertia and scaled by airspeed (the controls do little when
 * slow). With assists, wings and nose level themselves when the stick is
 * let go and banked turns are coordinated. Stalled, the nose drops by
 * itself until the wing flies again. Landing gear is sprung struts found
 * by rays down to the ground, with brakes and nose-wheel steering;
 * retractable. Floats are buoyancy points on the water.
 *
 * Helicopters: the rotor pushes along the body's up; the collective sets
 * a climb or descent rate (with assists: centred, it holds height, and it
 * eases down onto the ground); the cyclic tilts it to a target angle
 * (released: it levels and slows to a hover); the tail rotor yaws it.
 *
 * All in metres and SI units inside; IGE units at the API.
 */

type Vec3 = IgePhysicsVec3;

/** Air density, kg/m³ (sea level). */
const AIR = 1.225;
/** The wing's incidence on the fuselage: it lifts a little with the fuselage level. */
const INCIDENCE = 2 * DEG;
/** Induced drag factor (1 / (pi * aspect ratio * efficiency)). */
const INDUCED = 0.045;
/** Drag coefficient of lowered gear. */
const GEAR_DRAG = 0.02;
/** Side force coefficient per unit of sideslip: keeps it flying where it points. */
const SIDE_FORCE = 0.8;
/** The bounce of default gear springs (Hz). */
const GEAR_FREQUENCY = 1.5;
/** Tyre grip sideways, rolling resistance, and braking grip. */
const TYRE_GRIP = 0.9;
const ROLLING = 0.02;
const BRAKING = 0.8;

export interface IgeGearSpec {
	/** Metres from the entity's origin. */
	position: Vec3;
	radius: number;
	travel: number;
	stiffness: number;
	damping: number;
	/** Radians either way. */
	steer: number;
	brake: boolean;
	/** Share of the weight it carries at rest. */
	share: number;
	entity?: IgeEntity;
}

/** An aircraft, every option resolved: metres and SI units (the shape stays in IGE units for the body). */
export interface IgeAircraftSpec {
	type: "plane" | "helicopter";
	mass: number;
	shape: IgePhysicsShape;
	centreOfMass: Vec3;
	wingArea: number;
	stallSpeed: number;
	maxSpeed: number;
	thrust: number;
	engine: "propeller" | "jet";
	spoolTime: number;
	stallAngle: number;
	pitchRate: number;
	rollRate: number;
	yawRate: number;
	response: number;
	controlSpeed: number;
	flaps: { lift: number; drag: number };
	gear: IgeGearSpec[];
	retractable: boolean;
	gearTime: number;
	floats?: { samples: IgeFloatSample[]; volume: number; drag: IgePhysicsWaterDrag };
	assists: boolean;
	climbRate: number;
	descentRate: number;
	maxTilt: number;
	spinUp: number;
	friction: number;
	extrapolate: number;
	impacts?: boolean | number;
	layer?: string;
	rotorEntity?: IgeEntity;
	tailRotorEntity?: IgeEntity;
	/** Planes: the wing's most lift coefficient (from the stall speed), lift per radian, and drag at no lift (from the top speed). */
	clMax: number;
	liftSlope: number;
	cd0: number;
	/** Helicopters: drag per (m/s)² sideways and forwards, so it tops out at maxSpeed tilted fully. */
	rotorDrag: number;
}

/**
 * Each wheel's share of the weight at rest: the shares whose centre is the
 * centre of mass, seen from above (the least-squares answer for more than
 * three wheels; equal shares when they're all in a line).
 */
function staticShares (wheels: Vec3[], com: Vec3): number[] {
	const n = wheels.length;
	if (!n) return [];
	// Solve (A Aᵀ) y = b, w = Aᵀ y, with A's rows 1, x, z
	const s = [0, 0, 0, 0, 0, 0]; // sums: 1, x, z, xx, xz, zz
	for (const w of wheels) { s[0] += 1; s[1] += w.x; s[2] += w.z; s[3] += w.x * w.x; s[4] += w.x * w.z; s[5] += w.z * w.z; }
	const m = [[s[0], s[1], s[2]], [s[1], s[3], s[4]], [s[2], s[4], s[5]]];
	const b = [1, com.x, com.z];
	const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
	if (Math.abs(det) < 1e-9) return wheels.map(() => 1 / n);
	const solve = (col: number) => {
		const c = m.map((row) => [...row]);
		for (let r = 0; r < 3; r++) c[r][col] = b[r];
		return (c[0][0] * (c[1][1] * c[2][2] - c[1][2] * c[2][1]) - c[0][1] * (c[1][0] * c[2][2] - c[1][2] * c[2][0]) + c[0][2] * (c[1][0] * c[2][1] - c[1][1] * c[2][0])) / det;
	};
	const y = [solve(0), solve(1), solve(2)];
	const shares = wheels.map((w) => Math.max(0.02, y[0] + y[1] * w.x + y[2] * w.z));
	const total = shares.reduce((a, v) => a + v, 0);
	return shares.map((v) => v / total);
}

/** Fill in every option of an aircraft (options in IGE units, presets in metres). */
export function resolveAircraftSpec (options: IgePhysicsAircraftOptions, u: number): IgeAircraftSpec {
	const presetName = options.preset ?? (options.type === "helicopter" ? "helicopter" : "lightPlane");
	const preset = AIRCRAFT_PRESETS[presetName];
	if (!preset) throw new Error(`IgePhysics3d: no aircraft preset "${options.preset}"`);
	const type = options.type ?? preset.type;
	const mass = options.mass ?? preset.mass;
	const metres = (v: Vec3) => ({ x: v.x / u, y: v.y / u, z: v.z / u });
	const com = options.centreOfMass ? metres(options.centreOfMass) : { ...preset.centreOfMass };
	const g = 9.81;

	// Landing gear: given in IGE units, or the preset's in metres (with gearEntities posed on them)
	const given = options.gear;
	const wheels: (Omit<IgePhysicsGearOptions, "entity"> & { entity?: IgeEntity })[] = given
		? given.map((w) => ({ ...w, position: metres(w.position), radius: w.radius !== undefined ? w.radius / u : undefined, travel: w.travel !== undefined ? w.travel / u : undefined }))
		: preset.gear.map((w, i) => ({ ...w, position: { ...w.position }, entity: options.gearEntities?.[i] }));
	const shares = staticShares(wheels.map((w) => w.position), com);
	const omega = 2 * Math.PI * GEAR_FREQUENCY;
	const gear: IgeGearSpec[] = wheels.map((w, i) => {
		const load = mass * shares[i];
		const stiffness = w.stiffness ?? load * omega * omega;
		return {
			position: w.position,
			radius: w.radius ?? 0.3,
			travel: w.travel ?? 0.3,
			stiffness,
			damping: w.damping ?? 2 * 0.5 * Math.sqrt(stiffness * load),
			steer: Math.min(89, Math.abs(w.steer ?? 0)) * DEG,
			brake: w.brake ?? !w.steer,
			share: shares[i],
			entity: w.entity
		};
	});

	const stallSpeed = Math.max(1, (options.stallSpeed ?? preset.stallSpeed * u) / u);
	const maxSpeed = Math.max(stallSpeed * 1.2, (options.maxSpeed ?? preset.maxSpeed * u) / u);
	const wingArea = options.wingArea ?? preset.wingArea;
	const thrust = options.thrust ?? preset.thrust;
	const engine = options.engine ?? preset.engine;
	const stallAngle = (options.stallAngle ?? preset.stallAngle) * DEG;
	let clMax = 0, liftSlope = 0, cd0 = 0, rotorDrag = 0;
	if (type === "plane") {
		// The stall speed sets the wing's most lift; the top speed sets its drag
		clMax = (2 * mass * g) / (AIR * Math.max(0.1, wingArea) * stallSpeed * stallSpeed);
		liftSlope = clMax / Math.max(stallAngle, 1 * DEG);
		const thrustAtTop = engine === "propeller" ? thrust * 0.5 : thrust;
		const qs = 0.5 * AIR * maxSpeed * maxSpeed * Math.max(0.1, wingArea);
		const clTop = (mass * g) / qs;
		cd0 = Math.max(0.008, thrustAtTop / qs - INDUCED * clTop * clTop);
	} else {
		const maxTilt = (options.maxTilt ?? preset.maxTilt) * DEG;
		rotorDrag = (mass * g * Math.tan(maxTilt)) / (maxSpeed * maxSpeed);
	}

	const floats = options.floats ?? (preset.floats ? {
		points: preset.floats.points.map((p) => ({ ...p, position: { x: p.position.x * u, y: p.position.y * u, z: p.position.z * u }, height: p.height !== undefined ? p.height * u : undefined })),
		volume: preset.floats.volume,
		drag: preset.floats.drag
	} : undefined);

	return {
		type,
		mass,
		shape: options.shape ?? scaleCraftShape(preset.shape, u),
		centreOfMass: com,
		wingArea,
		stallSpeed,
		maxSpeed,
		thrust,
		engine,
		spoolTime: Math.max(0.05, options.spoolTime ?? preset.spoolTime),
		stallAngle,
		pitchRate: (options.pitchRate ?? preset.pitchRate) * DEG,
		rollRate: (options.rollRate ?? preset.rollRate) * DEG,
		yawRate: (options.yawRate ?? preset.yawRate) * DEG,
		response: Math.max(0.05, options.response ?? preset.response),
		controlSpeed: Math.max(1, (options.controlSpeed ?? stallSpeed * 1.3 * u) / u),
		flaps: { lift: options.flaps?.lift ?? preset.flaps.lift, drag: options.flaps?.drag ?? preset.flaps.drag },
		gear,
		retractable: options.retractable ?? (preset.retractable && gear.length > 0),
		gearTime: Math.max(0.1, options.gearTime ?? (preset.gearTime || 3)),
		floats: floats ? { samples: floatSamples(floats.points, floats.volume, 0.6, u), volume: floats.volume, drag: floats.drag ?? {} } : undefined,
		assists: options.assists ?? true,
		climbRate: Math.max(0.1, (options.climbRate ?? preset.climbRate * u) / u),
		descentRate: Math.max(0.1, (options.descentRate ?? preset.descentRate * u) / u),
		maxTilt: (options.maxTilt ?? preset.maxTilt) * DEG,
		spinUp: Math.max(0.05, options.spinUp ?? (preset.spinUp || 3)),
		friction: options.friction ?? 0.5,
		extrapolate: options.extrapolate ?? 0.25,
		impacts: options.impacts,
		layer: options.layer,
		rotorEntity: options.rotorEntity,
		tailRotorEntity: options.tailRotorEntity,
		clMax,
		liftSlope,
		cd0,
		rotorDrag
	};
}

interface WheelState {
	contact: boolean;
	/** Metres the strut is pushed in, now and at the step before (for drawing between them). */
	compression: number;
	previous: number;
	/** Radians and radians per second. */
	spin: number;
	spinRate: number;
	steer: number;
	base: { x: number; y: number; z: number; w: number };
}

const _a = vec();
const _b = vec();
const _c = vec();
const _d = vec();

/** Move towards a target by at most step. */
function towards (value: number, target: number, step: number): number {
	return value + clamp(target - value, -step, step);
}

/** An angle brought into -PI..PI. */
function wrap (angle: number): number {
	let a = angle % (2 * Math.PI);
	if (a > Math.PI) a -= 2 * Math.PI;
	else if (a < -Math.PI) a += 2 * Math.PI;
	return a;
}

/** A plane or helicopter (see IgePhysicsAircraft3dApi), made with IgePhysics3d.addAircraft(). */
export class IgePhysicsAircraft3d extends IgePhysicsCraft3d implements IgePhysicsAircraft3dApi {
	classId = "IgePhysicsAircraft3d";
	readonly type: "plane" | "helicopter";
	_spec: IgeAircraftSpec;
	_input: IgePhysicsAircraftInput = { throttle: 0, pitch: 0, roll: 0, yaw: 0, collective: 0, flaps: 0, gear: true, brake: 0, engine: true };
	_engine: number = 0;
	_rotor: number = 0;
	_gear: number = 1;
	_flaps: number = 0;
	_aoa: number = 0;
	_stalled: boolean = false;
	_wheels: WheelState[];
	_wheelsDown: boolean = false;
	_floats?: IgeBuoyancySolver;
	_floatsRest: number = 1;
	_hit: IgePhysicsBackendRaycastHit = { body: {}, distance: 0, normal: { x: 0, y: 1, z: 0 } };
	_rotorAngle: number = 0;
	_tailAngle: number = 0;
	_rotorBase: { x: number; y: number; z: number; w: number };
	_tailBase: { x: number; y: number; z: number; w: number };
	/** Helicopters: holding height (the collective has lifted it), and the height held with the collective centred (metres). */
	_holding: boolean = false;
	_holdHeight: number = NaN;
	/** Helicopters: the rotor's lift last step, newtons. */
	_thrust: number = NaN;

	constructor (host: IgeCraftHost, entity: IgeEntity, body: IgePhysicsBody3d, spec: IgeAircraftSpec, layer: number) {
		super(host, entity, spec.type, body, { layer, impacts: spec.impacts, extrapolate: spec.extrapolate });
		this.type = spec.type;
		this._spec = spec;
		this._wheels = spec.gear.map((w) => ({
			contact: false, compression: 0, previous: 0, spin: 0, spinRate: 0, steer: 0,
			base: w.entity?.quaternion() ?? { x: 0, y: 0, z: 0, w: 1 }
		}));
		if (spec.floats) {
			this._floats = new IgeBuoyancySolver(spec.floats.samples, spec.floats.drag);
			this._floatsRest = clamp(this._frame.mass / ((host._water?.density ?? 1025) * spec.floats.volume), 0.02, 1);
		}
		this._rotorBase = spec.rotorEntity?.quaternion() ?? { x: 0, y: 0, z: 0, w: 1 };
		this._tailBase = spec.tailRotorEntity?.quaternion() ?? { x: 0, y: 0, z: 0, w: 1 };
		if (spec.type === "helicopter") this._rotor = 1;
	}

	fly (input: Partial<IgePhysicsAircraftInput>): this {
		const stick = (v: number | undefined) => clamp(Number.isFinite(v) ? v as number : 0, -1, 1);
		const own = this._input;
		own.pitch = stick(input.pitch);
		own.roll = stick(input.roll);
		own.yaw = stick(input.yaw);
		own.collective = stick(input.collective);
		own.brake = clamp(Number.isFinite(input.brake) ? input.brake as number : 0, 0, 1);
		// Levers stay where they were unless moved
		if (Number.isFinite(input.throttle)) own.throttle = clamp(input.throttle as number, 0, 1);
		if (Number.isFinite(input.flaps)) own.flaps = clamp(input.flaps as number, 0, 1);
		if (input.gear !== undefined) own.gear = !!input.gear;
		if (input.engine !== undefined) own.engine = !!input.engine;
		return this;
	}

	input (): IgePhysicsAircraftInput {
		return { ...this._input };
	}

	/* Readouts */

	airspeed (): number {
		const v = this._frame.velocity;
		return Math.hypot(v.x, v.y, v.z) * this._u;
	}

	speedKmh (): number {
		return (this.airspeed() / this._u) * 3.6;
	}

	altitude (): number {
		return this._frame.position.y * this._u;
	}

	heightAboveGround (): number {
		return this._heightBelow(1000) * this._u;
	}

	/** Metres from the origin down to what's below (the ground, or the water's surface), up to a distance; Infinity past it. */
	_heightBelow (most: number): number {
		const f = this._frame, u = this._u;
		const from = { x: f.position.x, y: f.position.y + 1, z: f.position.z };
		let height = Infinity;
		if (this._host._backend.raycast(from, { x: 0, y: -1, z: 0 }, most + 1, this._layer, this._hit, this.body._handle)) height = Math.max(0, this._hit.distance - 1);
		const water = this._host._water;
		if (water) {
			const surface = water.heightAt(f.position.x * u, f.position.z * u) / u;
			if (Number.isFinite(surface) && f.position.y - surface < most) height = Math.min(height, Math.max(0, f.position.y - surface));
		}
		return height;
	}

	verticalSpeed (): number {
		return this._frame.velocity.y * this._u;
	}

	angleOfAttack (): number {
		return this._aoa / DEG;
	}

	stalled (): boolean {
		return this._stalled;
	}

	engine (): number {
		return this.type === "helicopter" ? this._rotor : this._engine;
	}

	rotor (): number {
		return this._rotor;
	}

	gear (): number {
		return this._gear;
	}

	gearDown (): boolean {
		return this._gear >= 1;
	}

	flaps (): number {
		return this._flaps;
	}

	grounded (): boolean {
		if (this.type === "helicopter") return this._touching && !this._airborne && this._frame.tilt() < 40;
		return this._wheelsDown || (!!this._floats && this._floats.submerged > 0);
	}

	submerged (): number {
		return this._floats?.submerged ?? 0;
	}

	wheelCount (): number {
		return this._wheels.length;
	}

	wheel (index: number): { contact: boolean; compression: number; spin: number; steer: number } {
		const w = this._wheels[index];
		if (!w) throw new Error(`IgePhysicsAircraft3d: no wheel ${index}`);
		const travel = this._spec.gear[index].travel;
		return { contact: w.contact, compression: travel > 0 ? clamp(w.compression / travel, 0, 1) : 0, spin: w.spinRate, steer: w.steer / DEG };
	}

	_gearContact (): boolean {
		return this._wheelsDown || (!!this._floats && this._floats.submerged > 0);
	}

	_waterContact (): boolean {
		return !!this._floats && this._floats.submerged > 0;
	}

	_bodyIsGear (): boolean {
		return this.type === "helicopter";
	}

	/* The step */

	/** Nothing to do: asleep, engine idle, controls untouched. */
	_idle (): boolean {
		const i = this._input;
		const sticks = !i.pitch && !i.roll && !i.yaw && !i.brake && (this.type === "plane" || i.collective <= 0);
		const levers = this.type === "plane" ? this._engine < 0.01 && i.throttle < 0.01 : true;
		const moving = this._gear !== (i.gear || !this._spec.retractable ? 1 : 0) || this._flaps !== i.flaps;
		return sticks && levers && !moving;
	}

	_applyForces (dt: number): void {
		const spec = this._spec, input = this._input;
		// Levers move at their own pace
		if (spec.type === "plane") this._engine = towards(this._engine, input.engine ? input.throttle : 0, dt / spec.spoolTime);
		this._rotor = towards(this._rotor, input.engine ? 1 : 0, dt / spec.spinUp);
		if (spec.retractable && spec.gear.length) {
			const target = input.gear ? 1 : 0;
			// The gear won't come up with weight on it
			if (!(target < this._gear && this._wheelsDown)) this._gear = towards(this._gear, target, dt / spec.gearTime);
		}
		this._flaps = towards(this._flaps, input.flaps, dt / 2);

		if (!this._host._backend.bodyAwake(this.body._handle) && this._idle()) return;
		if (spec.type === "helicopter") this._helicopter(dt);
		else this._plane(dt);
	}

	/** Landing gear: a sprung strut per wheel, found by a ray down to the ground. */
	_gearForces (dt: number): void {
		const spec = this._spec, input = this._input, frame = this._frame, backend = this._host._backend;
		let down = false;
		const deployed = this._gear >= 1;
		// Nose-wheel steering: full lock taxiing, little at take-off speed
		const along = frame.velocity.x * frame.forward.x + frame.velocity.y * frame.forward.y + frame.velocity.z * frame.forward.z;
		const steer = input.yaw * (1 - 0.75 * smoothstep(5, 35, Math.abs(along)));
		const d = _d;
		d.x = -frame.up.x; d.y = -frame.up.y; d.z = -frame.up.z;
		for (let i = 0; i < spec.gear.length; i++) {
			const w = spec.gear[i], state = this._wheels[i];
			state.previous = state.compression;
			state.steer = w.steer * steer;
			if (!deployed) {
				state.contact = false;
				state.compression = 0;
				continue;
			}
			const top = frame.pointToWorld(w.position, _a);
			const reach = w.travel + w.radius;
			if (!backend.raycast(top, d, reach, this._layer, this._hit, this.body._handle)) {
				state.contact = false;
				state.compression = 0;
				state.spinRate *= 0.995;
				continue;
			}
			const dist = this._hit.distance;
			const pushed = reach - dist;
			state.contact = true;
			state.compression = Math.min(pushed, w.travel);
			down = true;

			// The strut: spring and damper (and very stiff once it bottoms out)
			const point = _b;
			point.x = top.x + d.x * dist; point.y = top.y + d.y * dist; point.z = top.z + d.z * dist;
			const v = frame.pointVelocity(point, _c);
			const closing = v.x * d.x + v.y * d.y + v.z * d.z;
			let load = w.stiffness * Math.min(pushed, w.travel) + w.damping * closing;
			if (pushed > w.travel) load += (pushed - w.travel) * w.stiffness * 20;
			load = Math.max(0, load);

			// The tyre: rolling along its heading (turned by the steering), gripping sideways
			const n = this._hit.normal;
			const cs = Math.cos(state.steer), sn = Math.sin(state.steer);
			let fx = frame.forward.x * cs - frame.left.x * sn, fy = frame.forward.y * cs - frame.left.y * sn, fz = frame.forward.z * cs - frame.left.z * sn;
			const along = fx * n.x + fy * n.y + fz * n.z;
			fx -= n.x * along; fy -= n.y * along; fz -= n.z * along;
			const len = Math.hypot(fx, fy, fz) || 1;
			fx /= len; fy /= len; fz /= len;
			// Sideways: n x forward (the wheel's left)
			const sx = n.y * fz - n.z * fy, sy = n.z * fx - n.x * fz, sz = n.x * fy - n.y * fx;
			const rolling = v.x * fx + v.y * fy + v.z * fz;
			const sliding = v.x * sx + v.y * sy + v.z * sz;
			const share = this._frame.mass * w.share;
			const grip = TYRE_GRIP * load;
			const side = clamp(-sliding * share / dt * 0.35, -grip, grip);
			const brake = w.brake ? input.brake : 0;
			const holding = (ROLLING + BRAKING * brake) * load;
			const roll = -Math.sign(rolling) * Math.min(Math.abs(rolling) * share / dt * 0.35, holding);
			const force = _a;
			force.x = -d.x * load + sx * side + fx * roll;
			force.y = -d.y * load + sy * side + fy * roll;
			force.z = -d.z * load + sz * side + fz * roll;
			this._force(force, point);
			state.spinRate = rolling / w.radius;
		}
		this._wheelsDown = down;
	}

	/** The wing's lift coefficient at an angle of attack: straight up to the stall, then falling away softly. */
	_lift (alpha: number, stall: number, flaps: number): number {
		const spec = this._spec;
		const x = Math.abs(alpha), sign = alpha < 0 ? -1 : 1;
		if (x <= stall) return spec.liftSlope * alpha + flaps;
		const peak = spec.liftSlope * stall * sign + flaps;
		let cl = peak * (1 - 0.45 * smoothstep(0, 8 * DEG, x - stall));
		if (x > 30 * DEG) cl *= Math.max(0, Math.cos((x - 30 * DEG) * 1.5));
		return cl;
	}

	_plane (dt: number): void {
		const spec = this._spec, input = this._input, frame = this._frame;
		this._gearForces(dt);
		let onWater = 0;
		if (this._floats) {
			const world = this._waterWorld();
			if (world) onWater = this._floats.apply(frame, world) / this._floatsRest;
			else this._floats.submerged = 0;
		}
		const onGround = this._wheelsDown || onWater > 0;

		const v = frame.velocity;
		const speed = Math.hypot(v.x, v.y, v.z);
		const vb = frame.toBody(v, _c);
		const alpha = speed > 0.5 ? wrap(Math.atan2(-vb.y, vb.z) + INCIDENCE) : INCIDENCE;
		this._aoa = alpha;
		const stall = spec.stallAngle - this._flaps * 2 * DEG;
		const flapLift = this._flaps * spec.flaps.lift * spec.clMax;
		// Stalls past the stall angle, flies again a little under it
		this._stalled = !onGround && speed > 3 && Math.abs(alpha) > (this._stalled ? stall - 2 * DEG : stall);

		// Aerodynamic forces at the centre of mass
		const q = 0.5 * AIR * speed * speed;
		const area = spec.wingArea;
		const force = _a;
		force.x = 0; force.y = 0; force.z = 0;
		if (speed > 0.5) {
			const ix = v.x / speed, iy = v.y / speed, iz = v.z / speed;
			const cl = this._lift(alpha, stall, flapLift);
			// Lift: across the airflow, in the plane of the airflow and the wing's up (v x left)
			const l = frame.left;
			let lx = iy * l.z - iz * l.y, ly = iz * l.x - ix * l.z, lz = ix * l.y - iy * l.x;
			const ll = Math.hypot(lx, ly, lz);
			if (ll > 1e-6) {
				lx /= ll; ly /= ll; lz /= ll;
				const lift = q * area * cl;
				force.x += lx * lift; force.y += ly * lift; force.z += lz * lift;
			}
			let cd = spec.cd0 + INDUCED * cl * cl + this._flaps * spec.flaps.drag + (spec.retractable || spec.gear.length ? this._gear * GEAR_DRAG : 0);
			if (Math.abs(alpha) > stall) cd += 1.1 * Math.sin(Math.abs(alpha)) ** 2;
			const drag = q * area * cd;
			force.x -= ix * drag; force.y -= iy * drag; force.z -= iz * drag;
			// Sideslip pushes it back into line with its nose
			const side = -q * area * SIDE_FORCE * (vb.x / speed);
			force.x += l.x * side; force.y += l.y * side; force.z += l.z * side;
		}
		const thrust = this._engine * spec.thrust * (spec.engine === "propeller" ? clamp(1 - 0.5 * speed / spec.maxSpeed, 0.35, 1) : 1);
		force.x += frame.forward.x * thrust; force.y += frame.forward.y * thrust; force.z += frame.forward.z * thrust;
		this._force(force);

		// Control: the stick sets turn rates, reached at the response rate, and
		// only as far as the airflow over the controls allows
		const w = frame.toBody(frame.angular, _b);
		const ahead = Math.max(0, vb.z);
		const effect = clamp((ahead / spec.controlSpeed) ** 2, 0, 1);
		const wash = (spec.engine === "propeller" ? 0.45 : 0.15) * this._engine;
		let pitchEffect = Math.max(effect, wash);
		let yawEffect = Math.max(effect, wash, onWater > 0 ? 0.6 * Math.min(1, onWater) : 0);
		const rollEffect = onGround ? effect * 0.3 : effect;
		const airborne = !onGround;
		const k = 1 / spec.response;
		const bank = frame.roll();
		const pitchNow = frame.pitch();
		const g = Math.abs(this._host.gravity());

		// With assists, a banked turn is flown for you: the nose comes round
		// at the rate the bank turns the flight path
		let turn = 0;
		if (spec.assists && airborne && speed > spec.stallSpeed * 0.5) turn = (g * Math.tan(clamp(bank, -70 * DEG, 70 * DEG))) / speed;

		let noseUp: number;
		if (input.pitch) noseUp = -input.pitch * spec.pitchRate;
		else if (spec.assists && airborne && Math.abs(bank) < 80 * DEG) noseUp = clamp(-pitchNow * 0.6, -spec.pitchRate * 0.25, spec.pitchRate * 0.25);
		else noseUp = 0;
		if (Math.abs(bank) < 80 * DEG) noseUp += turn * Math.sin(bank);
		let rollRight: number;
		if (input.roll) rollRight = input.roll * spec.rollRate;
		else if (spec.assists && airborne) rollRight = clamp(-bank * 1.2, -spec.rollRate * 0.4, spec.rollRate * 0.4);
		else rollRight = 0;
		let yawRight = input.yaw * spec.yawRate;
		if (Math.abs(bank) < 80 * DEG) yawRight += turn * Math.cos(bank);

		// Stalled: the nose drops by itself until the wing flies again
		if (this._stalled) {
			const depth = clamp((Math.abs(alpha) - stall) / (5 * DEG), 0.3, 1);
			if (alpha > 0) noseUp = Math.min(noseUp, -spec.pitchRate * 0.6 * depth);
			else noseUp = Math.max(noseUp, spec.pitchRate * 0.6 * depth);
			pitchEffect = Math.max(pitchEffect, 0.6);
		}

		const most = 1.5 * k, gain = 4 * k;
		let noseUpAccel = clamp(gain * (noseUp + w.x), -spec.pitchRate * most, spec.pitchRate * most) * pitchEffect;
		let rollAccel = clamp(gain * (rollRight - w.z), -spec.rollRate * most, spec.rollRate * most) * rollEffect;
		let yawAccel = clamp(gain * (yawRight + w.y), -spec.yawRate * most, spec.yawRate * most) * yawEffect;
		// It weathervanes into the airflow
		if (speed > 2) yawAccel -= 6 * Math.atan2(vb.x, Math.max(vb.z, 1)) * effect;
		// A little damping whatever the airspeed, so it doesn't tumble on
		noseUpAccel += w.x * 0.5 * (1 - pitchEffect);
		rollAccel -= w.z * 0.5 * (1 - rollEffect);
		yawAccel += w.y * 0.5 * (1 - yawEffect);
		_c.x = -noseUpAccel; _c.y = -yawAccel; _c.z = rollAccel;
		this._torque(frame.torqueFor(_c, _a));
	}

	_helicopter (dt: number): void {
		const spec = this._spec, input = this._input, frame = this._frame, backend = this._host._backend;
		const m = frame.mass;
		const g = Math.abs(this._host.gravity());
		const up = frame.up;
		const climbing = frame.velocity.y;
		const collective = input.collective;

		// How high above the ground (a short ray down), for sitting down and easing onto it
		const height = this._heightBelow(10);
		const sitting = this._bodyTouching && height < 0.5 && frame.tilt() < 40;
		// Height holding starts once the collective lifts it (or it's in the air
		// with nothing close below), and stops once it sits down again
		if (collective > 0.05 || (height > 1.5 && !this._bodyTouching)) this._holding = true;
		else if (sitting && collective <= 0.05) this._holding = false;

		// The rotor's push along the body's up
		const most = spec.thrust * this._rotor;
		let thrust: number;
		if (spec.assists) {
			if (!this._holding) {
				thrust = 0.4 * m * g * this._rotor;
				this._holdHeight = NaN;
			} else {
				// The collective sets a climb or descent rate; centred, it holds the
				// height it settles at
				let target = collective >= 0 ? collective * spec.climbRate : collective * spec.descentRate;
				const centred = Math.abs(collective) < 0.05;
				if (!centred) this._holdHeight = NaN;
				else if (Number.isNaN(this._holdHeight) && Math.abs(climbing) < 0.3) this._holdHeight = frame.position.y;
				if (centred && !Number.isNaN(this._holdHeight)) target = clamp(this._holdHeight - frame.position.y, -2, 2);
				// Easing down onto the ground
				if (target < 0 && height < 6) target = Math.max(target, -(0.5 + 0.45 * height));
				const accel = clamp(4 * (target - climbing), -0.8 * g, 1.5 * g);
				thrust = clamp((m * (g + accel)) / Math.max(up.y, 0.5), 0, most);
			}
		} else {
			thrust = clamp(m * g * (1 + 0.6 * collective), 0, most) * this._rotor;
		}
		// The rotor's lift changes smoothly (at most three times the weight a second)
		if (Number.isFinite(this._thrust)) thrust = towards(this._thrust, thrust, 3 * m * g * dt);
		this._thrust = thrust;
		const force = _a;
		force.x = up.x * thrust; force.y = up.y * thrust; force.z = up.z * thrust;

		// Drag: by the square of the speed across the ground (so it tops out at
		// maxSpeed fully tilted), and a little against climbing and sinking
		const v = frame.velocity;
		const across = Math.hypot(v.x, v.z), c = spec.rotorDrag;
		force.x -= c * v.x * across;
		force.z -= c * v.z * across;
		force.y -= 0.3 * m * v.y;
		this._force(force);
		const vb = frame.toBody(v, _c);

		// The cyclic tilts it; the tail rotor yaws it
		const w = frame.toBody(frame.angular, _b);
		const control = this._rotor * (sitting && collective <= 0.05 ? 0 : 1);
		const k = 1 / spec.response;
		let pitchDownAccel: number, rollAccel: number;
		if (spec.assists) {
			// Stick to a target tilt; released, it levels and leans back against its drift to a hover
			let pitchTarget = input.pitch * spec.maxTilt;
			let rollTarget = input.roll * spec.maxTilt;
			if (!input.pitch) pitchTarget = -clamp(vb.z / spec.maxSpeed * 3, -0.7, 0.7) * spec.maxTilt;
			if (!input.roll) rollTarget = clamp(vb.x / spec.maxSpeed * 3, -0.7, 0.7) * spec.maxTilt;
			const stiffness = 10, damping = 2 * 0.85 * Math.sqrt(stiffness);
			pitchDownAccel = stiffness * (pitchTarget + frame.pitch()) - damping * w.x;
			rollAccel = stiffness * wrap(rollTarget - frame.roll()) - damping * w.z;
		} else {
			pitchDownAccel = k * (input.pitch * spec.pitchRate - w.x);
			rollAccel = k * (input.roll * spec.rollRate - w.z);
		}
		let yawAccel = clamp(k * (input.yaw * spec.yawRate + w.y), -spec.yawRate * 2 * k, spec.yawRate * 2 * k);
		// Moving forwards, the tail fin turns it into the airflow
		if (vb.z > 8) yawAccel -= 3 * Math.atan2(vb.x, vb.z) * clamp((vb.z - 8) / 20, 0, 1);
		_c.x = pitchDownAccel * control;
		_c.y = -yawAccel * control;
		_c.z = rollAccel * control;
		this._torque(frame.torqueFor(_c, _a));
	}

	_afterStep (dt: number): void {
		// Spin the rotor or propeller and the wheels
		if (this.type === "helicopter") {
			this._rotorAngle = (this._rotorAngle + this._rotor * 28 * dt) % (2 * Math.PI);
			this._tailAngle = (this._tailAngle + this._rotor * 110 * dt) % (2 * Math.PI);
		} else if (this._input.engine) {
			this._rotorAngle = (this._rotorAngle + (0.25 + this._engine) * 70 * dt) % (2 * Math.PI);
		}
		for (const wheel of this._wheels) wheel.spin = (wheel.spin + wheel.spinRate * dt) % (2 * Math.PI);
	}

	_followTarget (target: IgePhysicsCraftState, dt: number): void {
		if (Number.isFinite(target.engine)) this._engine = target.engine!;
		if (Number.isFinite(target.rotor)) this._rotor = target.rotor!;
		if (Number.isFinite(target.gear)) this._gear = target.gear!;
		if (Number.isFinite(target.flaps)) this._flaps = target.flaps!;
		this._afterStep(dt);
	}

	_sync (alpha: number): void {
		const spec = this._spec, u = this._u;
		if (spec.rotorEntity) {
			const axis = this.type === "helicopter" ? axisAngleQuat(0, 1, 0, this._rotorAngle) : axisAngleQuat(0, 0, 1, this._rotorAngle);
			spec.rotorEntity.quaternion(multiplyQuats(this._rotorBase, axis));
		}
		if (spec.tailRotorEntity) spec.tailRotorEntity.quaternion(multiplyQuats(this._tailBase, axisAngleQuat(1, 0, 0, this._tailAngle)));
		const gear = this._gear;
		spec.gear.forEach((w, i) => {
			const entity = w.entity;
			if (!entity) return;
			if (gear <= 0) {
				if (!entity.isHidden()) entity.hide();
				return;
			}
			if (entity.isHidden()) entity.show();
			const state = this._wheels[i];
			const compression = state.previous + (state.compression - state.previous) * alpha;
			// Hanging below the strut; folding up into the airframe as the gear comes up
			const hang = gear >= 1 ? w.travel - compression : w.travel * gear - (1 - gear) * w.radius;
			entity.translateTo(w.position.x * u, (w.position.y - hang) * u, w.position.z * u);
			entity.quaternion(multiplyQuats(state.base, multiplyQuats(axisAngleQuat(0, 1, 0, -state.steer), axisAngleQuat(1, 0, 0, state.spin))));
		});
	}

	_writeState (state: IgePhysicsCraftState): void {
		state.input = { ...this._input };
		state.engine = this._engine;
		state.rotor = this._rotor;
		state.gear = this._gear;
		state.flaps = this._flaps;
	}

	_readState (state: IgePhysicsCraftState): void {
		if (state.input) {
			const input = state.input as Partial<IgePhysicsAircraftInput>;
			this.fly(input);
		}
		if (Number.isFinite(state.engine)) this._engine = clamp(state.engine!, 0, 1);
		if (Number.isFinite(state.rotor)) this._rotor = clamp(state.rotor!, 0, 1);
		if (Number.isFinite(state.gear)) this._gear = clamp(state.gear!, 0, 1);
		if (Number.isFinite(state.flaps)) this._flaps = clamp(state.flaps!, 0, 1);
	}
}
