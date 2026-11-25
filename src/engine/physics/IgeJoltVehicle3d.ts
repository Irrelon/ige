import type JoltApi from "jolt-physics";
import type { IgeJoltBackend, IgeJoltBody } from "@/engine/physics/IgeJoltBackend";
import type { IgePhysicsQuat, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgeVehicleBackend,
	IgeVehicleBackendSpec,
	IgeVehicleBackendState,
	IgeVehicleWheelSample
} from "@/engine/physics/IgePhysicsVehicle3dBackend";

/** Limited-slip ratio for every differential (Jolt's default). */
const LIMITED_SLIP = 1.4;
/** Friction of bodies made without one (IgePhysicsBodyOptions.friction), which tyre grip is measured against. */
const DEFAULT_GROUND_FRICTION = 0.5;
/**
 * The stiffest an anti-roll bar may be, as the angular frequency of the
 * roll it alone would set swinging times the step. Jolt works a bar out
 * once a step, and past about 0.5 the body rocks between its wheels by
 * itself.
 */
const ANTI_ROLL_STEADY = 0.4;
/** A wheel's cast starts this far (metres) above the tallest step it rides up, at full bump. */
const STEP_MARGIN = 0.03;

/**
 * Whether a vehicle made from spec `a` can become `b` in place: the same
 * kind, chassis, wheels' size, travel and layout, and number of gears.
 */
function retunable (a: IgeVehicleBackendSpec, b: IgeVehicleBackendSpec): boolean {
	const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
	const build = (spec: IgeVehicleBackendSpec) => ({
		type: spec.type,
		layer: spec.layer,
		wheelCast: spec.wheelCast,
		gears: [spec.gearbox.ratios.length, spec.gearbox.reverseRatios.length],
		lean: spec.type === "motorcycle" ? spec.maxLean : 0,
		chassis: spec.chassis,
		guards: spec.guards,
		centreOfMass: spec.centreOfMass,
		differentials: spec.differentials,
		bars: spec.antiRollBars.map((bar) => [bar.left, bar.right]),
		wheels: spec.wheels.map((w) => [w.radius, w.width, w.suspensionMin, w.suspensionMax, w.stepHeight, w.suspensionDirection, w.steeringAxis, w.driven])
	});
	return same(build(a), build(b));
}

/** Tyre curve scale for a grip (see the curves in the constructor). */
function tyreScale (grip: number): number {
	return (grip * 1.2) ** 2 / DEFAULT_GROUND_FRICTION / 1.2;
}

/** v rotated by the unit quaternion (x, y, z, w). */
function rotateBy (v: IgePhysicsVec3, x: number, y: number, z: number, w: number): IgePhysicsVec3 {
	const tx = 2 * (y * v.z - z * v.y), ty = 2 * (z * v.x - x * v.z), tz = 2 * (x * v.y - y * v.x);
	return { x: v.x + w * tx + (y * tz - z * ty), y: v.y + w * ty + (z * tx - x * tz), z: v.z + w * tz + (x * ty - y * tx) };
}

/** Sideways friction by slip angle in degrees (Jolt's curve, scaled). */
function setLateralCurve (curve: JoltApi.LinearCurve, scale: number): void {
	curve.Clear();
	curve.AddPoint(0, 0);
	curve.AddPoint(3, 1.2 * scale);
	curve.AddPoint(20, 1.0 * scale);
}

/**
 * Friction along the tyre by slip ratio (Jolt's curve, scaled). A car's
 * tyre holds the road even when it isn't slipping (see the constructor);
 * a motorcycle's keeps Jolt's curve.
 */
function setLongitudinalCurve (curve: JoltApi.LinearCurve, scale: number, motorcycle: boolean): void {
	curve.Clear();
	curve.AddPoint(0, motorcycle ? 0 : 1.0 * scale);
	curve.AddPoint(0.06, 1.2 * scale);
	curve.AddPoint(0.2, 1.0 * scale);
}

/** The slip ratio where the tyre curve along peaks (see setLongitudinalCurve()). */
const PEAK_SLIP_RATIO = 0.06;

/**
 * A wheel's slip for combined grip falls to this share of itself each step
 * unless it slips more: a held peak, so a wheel flicking between spinning
 * and rolling stays loose, gripping again about 0.1 s after it stops.
 */
const SLIP_HOLD = 0.6;
/** The sine of the tilt (1 degree) at which a car tyre rests fully on its tread's edge (see _placeRays()). */
const EDGE_TILT = Math.sin(Math.PI / 180);
/**
 * Steps a wheel must have carried at least LOADED_SHARE of its share of the
 * weight before its slip counts: one landing from a jump, or the inside
 * wheel of a fast swerve loading up again, spins until the ground slows it.
 */
const LANDED_STEPS = 15;
const LOADED_SHARE = 0.5;

/** Tyre curves are rebuilt only when a wheel's grip changes by this share or more. */
const GRIP_STEP = 0.05;
/** Least share of its sideways grip combined grip leaves a tyre, so a spinning or locked wheel still steers a little. */
const MIN_COMBINED_GRIP = 0.1;

/**
 * The Jolt backend for a vehicle (IgeVehicleBackend): a dynamic body that
 * can switch to kinematic, held up and driven by Jolt's VehicleConstraint
 * with a WheeledVehicleController (or MotorcycleController), stepped by a
 * VehicleConstraintStepListener. Wheels find the ground with a cylinder
 * (or ray) cast against what the vehicle's layer collides with. Metres.
 *
 * Every Jolt object it makes is freed in destroy(): the step listener and
 * scratch vector directly, the constraint by its reference (which frees
 * its controller, wheels and collision tester), and the body (which frees
 * its shape).
 */
/** A change of steering (share of the lock) that wakes a sleeping vehicle (smaller ones come from speed noise). */
const STEER_WAKE = 1e-3;

export class IgeJoltVehicle3d implements IgeVehicleBackend {
	_physics: IgeJoltBackend;
	_jolt: typeof JoltApi;
	_spec: IgeVehicleBackendSpec;
	/** The chassis, registered with the world so queries and other vehicles' wheels find it. */
	body: IgeJoltBody;
	_body: JoltApi.Body;
	_id: JoltApi.BodyID;
	_constraint: JoltApi.VehicleConstraint;
	_controller: JoltApi.WheeledVehicleController;
	_listener: JoltApi.VehicleConstraintStepListener;
	_wheels: JoltApi.WheelWV[];
	_layer: number;
	_kinematic: boolean = false;
	_enabled: boolean = true;
	_driving: boolean = false;
	/** The steering given last (a change wakes it). */
	_right: number = 0;
	/** The handbrake grip the handbrake's wheels' sideways curves are set for (1: full grip). */
	_handbrakeGrip: number = 1;
	/** The handbrake grip the curves are set for. */
	_appliedHandbrake: number = 1;
	/** scaleGrip(): every wheel's sideways grip, the handbrake's wheels', and what the curves are set for. */
	_gripScale = { wheels: 1, handbrake: 1 };
	_appliedGripScale = { wheels: 1, handbrake: 1 };
	/** Balancing (setUpright()). */
	_upright: boolean = true;
	/** The controls being held, for combined grip: only a wheel being driven or braked spins or locks. */
	_pushing = { forward: 0, brake: 0, handbrake: 0 };
	/** Each wheel's share of its sideways grip (combined grip), and the shares its curves are set for (along is always whole; -1: rebuild). */
	_gripAcross: number[];
	_curveAlong: number[];
	_curveAcross: number[];
	/** Each wheel's slip ratio over the curve's peak, held at its recent peak, and steps on the ground. */
	_slipAlong: number[];
	/** Steps each wheel has carried at least LOADED_SHARE of its share of the weight. */
	_grounded: number[];
	/** How far (metres, along the axle) each wheel's ray starts from the middle of its tyre (see _placeRays()). */
	_rayShift: number[];
	_destroyed: boolean = false;
	/** A second scratch vector (the world's _vec is the first), and a third. */
	_vec2: JoltApi.Vec3;
	_vec3: JoltApi.Vec3;
	/** The step length the anti-roll bars were last set for (see _setAntiRollBars()). */
	_antiRollDt: number = 0;
	/**
	 * How far above its spec each wheel's suspension is fixed to Jolt (and
	 * its lengths longer by the same), so its cast starts above any step it
	 * can ride up (see the constructor).
	 */
	_lift: number[];

	constructor (physics: IgeJoltBackend, spec: IgeVehicleBackendSpec, position: IgePhysicsVec3, rotation: IgePhysicsQuat) {
		const jolt = physics._jolt;
		this._physics = physics;
		this._jolt = jolt;
		this._spec = spec;
		this._vec2 = new jolt.Vec3(0, 0, 0);
		this._vec3 = new jolt.Vec3(0, 0, 0);
		const layer = physics._layer(spec.layer);
		this._layer = layer;
		const motorcycle = spec.type === "motorcycle";

		// The chassis shape with its centre of mass moved where the spec puts it
		const offsetShape = (built: JoltApi.Shape): JoltApi.OffsetCenterOfMassShape => {
			const com = built.GetCenterOfMass();
			physics._vec.Set(spec.centreOfMass.x - com.GetX(), spec.centreOfMass.y - com.GetY(), spec.centreOfMass.z - com.GetZ());
			return new jolt.OffsetCenterOfMassShape(built, physics._vec);
		};
		const built = physics._createShape(spec.chassis);
		const chassis = offsetShape(built.shape);

		physics._rvec.Set(position.x, position.y, position.z);
		physics._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
		let settings: JoltApi.BodyCreationSettings;
		let withGuards: { shape: JoltApi.Shape; cleanup?: () => void } | undefined;
		if (spec.guards.length) {
			// The wheel guards collide but weigh nothing: the body's mass and
			// inertia are the chassis shape's alone
			withGuards = physics._createShape({
				type: "compound",
				children: [
					{ shape: spec.chassis, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
					...spec.guards.map((g) => ({ shape: { type: "box" as const, halfExtents: g.halfExtents }, position: g.position, rotation: { x: 0, y: 0, z: 0, w: 1 } }))
				]
			});
			settings = new jolt.BodyCreationSettings(offsetShape(withGuards.shape), physics._rvec, physics._quat, jolt.EMotionType_Dynamic, layer);
			const mass = chassis.GetMassProperties();
			mass.ScaleToMass(spec.mass);
			settings.mOverrideMassProperties = jolt.EOverrideMassProperties_MassAndInertiaProvided;
			settings.mMassPropertiesOverride = mass;
			jolt.destroy(chassis);
		} else {
			settings = new jolt.BodyCreationSettings(chassis, physics._rvec, physics._quat, jolt.EMotionType_Dynamic, layer);
			settings.mOverrideMassProperties = jolt.EOverrideMassProperties_CalculateInertia;
			settings.mMassPropertiesOverride.mMass = spec.mass;
		}
		settings.mAllowDynamicOrKinematic = true;
		settings.mFriction = spec.friction;
		settings.mMotionQuality = jolt.EMotionQuality_LinearCast;
		this._body = physics._bodies.CreateBody(settings);
		this._id = this._body.GetID();
		jolt.destroy(settings);
		built.cleanup?.();
		withGuards?.cleanup?.();
		physics._bodies.AddBody(this._id, jolt.EActivation_Activate);
		this.body = physics._register(this._body);

		// Wheels. Jolt casts a wheel from where its suspension is fixed, and
		// a wheel whose cast starts beside a kerb (not above it) finds the
		// kerb's face: the suspension and its bump stop push along the
		// contact's normal, so the car was stopped dead, or its wheels fell
		// inside a road tile's hollow kerb. Fixing the suspension higher (and
		// making it longer by the same, so the wheel, spring and stops don't
		// move) starts the cast above any step the wheel can ride up, which
		// it then finds from above, facing up.
		this._lift = spec.wheels.map((wheel) => Math.max(0, wheel.stepHeight + STEP_MARGIN - wheel.suspensionMin));
		const vehicle = new jolt.VehicleConstraintSettings();
		vehicle.mMaxPitchRollAngle = spec.maxTilt;
		spec.wheels.forEach((wheel, index) => {
			const w = new jolt.WheelSettingsWV();
			const vec = physics._vec;
			const lift = this._lift[index], d = wheel.suspensionDirection;
			vec.Set(wheel.position.x - d.x * lift, wheel.position.y - d.y * lift, wheel.position.z - d.z * lift);
			w.mPosition = vec;
			vec.Set(wheel.suspensionDirection.x, wheel.suspensionDirection.y, wheel.suspensionDirection.z);
			w.mSuspensionDirection = vec;
			vec.Set(wheel.steeringAxis.x, wheel.steeringAxis.y, wheel.steeringAxis.z);
			w.mSteeringAxis = vec;
			vec.Set(0, 1, 0);
			w.mWheelUp = vec;
			vec.Set(0, 0, 1);
			w.mWheelForward = vec;
			w.mRadius = wheel.radius;
			w.mWidth = wheel.width;
			w.mSuspensionMinLength = wheel.suspensionMin + lift;
			w.mSuspensionMaxLength = wheel.suspensionMax + lift;
			const spring = w.mSuspensionSpring;
			spring.mMode = jolt.ESpringMode_StiffnessAndDamping;
			spring.mStiffness = wheel.stiffness;
			spring.mDamping = wheel.damping;
			w.mMaxSteerAngle = wheel.maxSteer;
			w.mMaxBrakeTorque = wheel.brakeTorque;
			w.mMaxHandBrakeTorque = wheel.handbrakeTorque;
			// Tyre curves: friction by slip ratio, and by slip angle in
			// degrees. Jolt combines them with the ground's friction as
			// sqrt(tyre * ground), so they're scaled for grip 1 to peak at 1.2
			// on ground of the engine's default friction (0.5). A car's tyre
			// holds the road even when it isn't slipping: Jolt reads the
			// curve once a step from the slip at its start, and with Jolt's
			// curve (no friction at no slip) the driven wheels flick between
			// rolling and spinning on alternate steps when pulling away,
			// every wheel on the ground throughout. A motorcycle keeps
			// Jolt's curve: with grip at no slip, a heavier, more powerful
			// bike fell onto its tilt limit weaving and after jumps.
			const scale = tyreScale(wheel.grip);
			setLongitudinalCurve(w.mLongitudinalFriction, scale, motorcycle);
			setLateralCurve(w.mLateralFriction, scale);
			vehicle.mWheels.push_back(w);
		});
		this._gripAcross = spec.wheels.map(() => 1);
		this._curveAlong = spec.wheels.map(() => 1);
		this._curveAcross = spec.wheels.map(() => 1);
		this._slipAlong = spec.wheels.map(() => 0);
		this._grounded = spec.wheels.map(() => 0);
		this._rayShift = spec.wheels.map(() => 0);

		// Engine, gearbox and differentials
		const controller = motorcycle ? new jolt.MotorcycleControllerSettings() : new jolt.WheeledVehicleControllerSettings();
		const engine = controller.mEngine;
		engine.mMaxTorque = spec.engine.maxTorque;
		engine.mMinRPM = spec.engine.minRpm;
		engine.mMaxRPM = spec.engine.maxRpm;
		const gearbox = controller.mTransmission;
		gearbox.mMode = spec.gearbox.mode === "manual" ? jolt.ETransmissionMode_Manual : jolt.ETransmissionMode_Auto;
		gearbox.mGearRatios.clear();
		for (const ratio of spec.gearbox.ratios) gearbox.mGearRatios.push_back(ratio);
		gearbox.mReverseGearRatios.clear();
		for (const ratio of spec.gearbox.reverseRatios) gearbox.mReverseGearRatios.push_back(-ratio);
		gearbox.mShiftUpRPM = spec.gearbox.shiftUpRpm;
		gearbox.mShiftDownRPM = spec.gearbox.shiftDownRpm;
		gearbox.mSwitchTime = spec.gearbox.shiftTime;
		gearbox.mClutchStrength = spec.gearbox.clutchStrength;
		controller.mDifferentials.clear();
		for (const pair of spec.differentials) {
			const differential = new jolt.VehicleDifferentialSettings();
			differential.mLeftWheel = pair.left;
			differential.mRightWheel = pair.right;
			differential.mDifferentialRatio = spec.gearbox.finalDrive;
			differential.mLimitedSlipRatio = LIMITED_SLIP;
			differential.mEngineTorqueRatio = 1 / spec.differentials.length;
			controller.mDifferentials.push_back(differential);
			jolt.destroy(differential);
		}
		controller.mDifferentialLimitedSlipRatio = LIMITED_SLIP;
		if (motorcycle) (controller as JoltApi.MotorcycleControllerSettings).mMaxLeanAngle = spec.maxLean;
		vehicle.mController = controller;

		for (const pair of spec.antiRollBars) {
			const bar = new jolt.VehicleAntiRollBar();
			bar.mLeftWheel = pair.left;
			bar.mRightWheel = pair.right;
			bar.mStiffness = pair.stiffness;
			vehicle.mAntiRollBars.push_back(bar);
			jolt.destroy(bar);
		}

		// The constraint keeps references to its wheel settings; our own
		// reference keeps it alive until destroy()
		const constraint = new jolt.VehicleConstraint(this._body, vehicle);
		constraint.AddRef();
		jolt.destroy(vehicle);
		const tester = spec.wheelCast === "ray"
			? new jolt.VehicleCollisionTesterRay(layer)
			: new jolt.VehicleCollisionTesterCastCylinder(layer, motorcycle ? 1 : 0.05);
		constraint.SetVehicleCollisionTester(tester);
		physics._system.AddConstraint(constraint);
		this._listener = new jolt.VehicleConstraintStepListener(constraint);
		physics._system.AddStepListener(this._listener);
		this._constraint = constraint;
		this._controller = jolt.castObject(constraint.GetController(), motorcycle ? jolt.MotorcycleController : jolt.WheeledVehicleController);
		this._wheels = spec.wheels.map((_, index) => jolt.castObject(constraint.GetWheel(index), jolt.WheelWV));
		this._setAntiRollBars(physics._fixedTimeStep);
	}

	/**
	 * Set Jolt's anti-roll bars to the spec's rates (N/m) for steps of dt.
	 *
	 * Jolt works out a bar's impulse once a step (rate x difference in
	 * suspension length x dt) and hands it to each wheel's suspension as a
	 * velocity bias. The suspension is a soft constraint, so the impulse it
	 * gives for that bias is the bias times its effective mass, 1 / (1 / m
	 * + 1 / (dt (c + dt k))): about 50 kg for the default car at 60 Hz.
	 * Given straight to Jolt, a 10,000 N/m bar acted like a 530,000 N/m
	 * one, 18 times stiffer than the springs, and worked out once a step it
	 * rocked the body between its wheels at 15 Hz and threw it about (or
	 * over) when one side dropped off a kerb. Dividing by that effective
	 * mass makes the bar the rate asked for. A bar too stiff to stay steady
	 * at this step (ANTI_ROLL_STEADY) is limited to the stiffest that does.
	 */
	_setAntiRollBars (dt: number): void {
		this._antiRollDt = dt;
		const spec = this._spec;
		if (!spec.antiRollBars.length) return;
		const com = spec.centreOfMass;
		const motion = this._body.GetMotionProperties();
		const identity = this._physics._identity;
		// Where each tyre touches the ground (resting mid-travel) from the centre of mass, crossed with up: (-z, 0, x)
		const arms = spec.wheels.map((wheel) => {
			const length = (wheel.suspensionMin + wheel.suspensionMax) / 2;
			const d = wheel.suspensionDirection;
			return { x: -(wheel.position.z + d.z * length - com.z), z: wheel.position.x + d.x * length - com.x };
		});
		// a . I^-1 b, in the body's space
		const inertia = (a: { x: number; z: number }, b: { x: number; z: number }): number => {
			this._vec2.Set(b.x, 0, b.z);
			const w = motion.MultiplyWorldSpaceInverseInertiaByVector(identity, this._vec2);
			return a.x * w.GetX() + a.z * w.GetZ();
		};
		// The suspension's effective mass at a wheel: 1 / (1 / m + (r x up) . I^-1 (r x up) + softness)
		const effectiveMass = (index: number): number => {
			const wheel = spec.wheels[index];
			const softness = 1 / (dt * (wheel.damping + dt * wheel.stiffness));
			return 1 / (motion.GetInverseMass() + inertia(arms[index], arms[index]) + softness);
		};
		const bars = this._constraint.GetAntiRollBars();
		spec.antiRollBars.forEach((bar, index) => {
			// The roll the bar alone sets swinging: angular frequency^2 = rate x (d . I^-1 d), d the difference in arms
			const l = arms[bar.left], r = arms[bar.right];
			const d = { x: l.x - r.x, z: l.z - r.z };
			const steadiest = (ANTI_ROLL_STEADY / dt) ** 2 / Math.max(1e-9, inertia(d, d));
			const stiffness = Math.min(bar.stiffness, steadiest);
			bars.at(index).mStiffness = (2 * stiffness) / (effectiveMass(bar.left) + effectiveMass(bar.right));
		});
	}

	setInput (forward: number, right: number, brake: number, handbrake: number): void {
		this._controller.SetDriverInput(forward, right, brake, handbrake);
		// What wakes it: the throttle, the brake, the steering moving (not the handbrake held, or the wheels left turned)
		this._driving = forward !== 0 || brake !== 0 || Math.abs(right - this._right) > STEER_WAKE;
		this._right = right;
		// Locked tyres lose most of their sideways grip (Jolt keeps it all):
		// the handbrake's wheels' sideways curves are scaled by this
		this._handbrakeGrip = 1 - (1 - this._spec.handbrakeGrip) * handbrake;
		this._pushing.forward = Math.abs(forward);
		this._pushing.brake = brake;
		this._pushing.handbrake = handbrake;
	}

	/**
	 * Before a step: where each wheel's ray starts across the tyre. A tyre
	 * tilted with the body (rolling in a corner) rests on its lower tread
	 * edge, which moves the outside wheels' contact out by half their width
	 * and widens the track; a ray cast from the middle of the tyre doesn't,
	 * and with rays a van rolled over at 1.1 g that rolled 4 degrees on a
	 * cylinder cast (body roll and stability as the cylinder gave them). So
	 * each ray starts under the lower edge, fully once the axle is a degree
	 * off the ground's plane (a flat-faced tyre tips onto its edge), from
	 * the last step's ground.
	 */
	_placeRays (): void {
		const spec = this._spec;
		const r = this._body.GetRotation();
		const qx = r.GetX(), qy = r.GetY(), qz = r.GetZ(), qw = r.GetW();
		// The axle (+X) in the world
		const ax = 1 - 2 * (qy * qy + qz * qz), ay = 2 * (qx * qy + qw * qz), az = 2 * (qx * qz - qw * qy);
		this._wheels.forEach((wheel, index) => {
			const w = spec.wheels[index];
			let nx = 0, ny = 1, nz = 0;
			if (wheel.HasContact()) {
				const n = wheel.GetContactNormal();
				nx = n.GetX(); ny = n.GetY(); nz = n.GetZ();
			}
			// How far the axle's +X end is up off the ground's plane, as a share of a degree's worth
			const tilt = Math.max(-1, Math.min(1, (ax * nx + ay * ny + az * nz) / EDGE_TILT));
			const shift = Math.round(-tilt * (w.width / 2) * 1000) / 1000;
			if (shift === this._rayShift[index]) return;
			this._rayShift[index] = shift;
			const lift = this._lift[index], d = w.suspensionDirection;
			this._vec2.Set(w.position.x + shift - d.x * lift, w.position.y - d.y * lift, w.position.z - d.z * lift);
			wheel.GetSettings().mPosition = this._vec2;
		});
	}

	/**
	 * Before a step: each wheel's sideways grip, from how much it was
	 * spinning or locked in the last step (combinedGrip), and the handbrake.
	 *
	 * Jolt's tyre curves give the most friction each way independently, so
	 * a wheel spinning under power kept all its sideways grip. A tyre
	 * spinning or locked slides, and has little left for cornering: here
	 * the slip ratio past the curve's peak (6%) cuts the sideways grip, to
	 * 1 / sqrt(1 + over²) of it (over: the slip ratio over the peak's, less
	 * one): 89% at 9% slip (as traction control allows), 45% at 18%, 7%
	 * locked. Within the peak (driving and braking in grip) it's untouched,
	 * and so is a wheel the driver isn't driving or braking: coasting through
	 * a fast swerve, the differential drags a loaded wheel off the road's
	 * speed as the other unloads, which isn't wheelspin and spun cars.
	 * Grip along the tyre isn't cut for sliding sideways: a car's tyre needs
	 * some just to keep rolling (see the constructor), and taking it away
	 * let the wheels spin or lock in a fast corner, which took the sideways
	 * grip with it and spun cars changing lane.
	 *
	 * The slip is a step old (Jolt reads its curves once a step), and a
	 * wheel at the edge of spinning flicks between spinning and rolling
	 * from step to step, so each wheel's slip is held at its recent peak
	 * (SLIP_HOLD) and the scale eased; the curve is rebuilt only when it
	 * moves by GRIP_STEP. A wheel's slip counts once it has carried half
	 * its share of the weight for a few steps (LANDED_STEPS): a wheel
	 * spun up in the air off a jump, or nearly unloaded on the inside of a
	 * fast swerve under throttle, slips until the ground slows it once it's
	 * loaded again, and counting that took the back end away from rear-drive
	 * cars landing jumps and changing lanes.
	 */
	_updateGrip (): void {
		const spec = this._spec;
		const c = spec.combinedGrip;
		const motorcycle = spec.type === "motorcycle";
		const push = this._pushing;
		// A wheel's share of the weight as the suspension impulse it would carry level and at rest
		const share = (spec.mass * 9.81 * this._antiRollDt || 1) / this._wheels.length;
		this._wheels.forEach((wheel, index) => {
			let across = 1;
			const w = spec.wheels[index];
			// Driven or braked by the driver: a wheel coasting can be dragged off the road's speed through the
			// differential as the other one unloads in a fast swerve, and that isn't wheelspin
			const pushed = (w.driven && push.forward > 0.05) || (push.brake > 0.05 && w.brakeTorque > 0) || (push.handbrake > 0.05 && w.handbrakeTorque > 0);
			// Steps it has carried at least half its share of the weight (0 off the ground or nearly unloaded)
			const contact = wheel.HasContact();
			const loaded = this._grounded[index] = contact && wheel.GetSuspensionLambda() > share * LOADED_SHARE ? this._grounded[index] + 1 : 0;
			if (c > 0 && contact) {
				const counts = pushed && loaded > LANDED_STEPS;
				this._slipAlong[index] = Math.max(counts ? Math.abs(wheel.mLongitudinalSlip) / PEAK_SLIP_RATIO : 0, this._slipAlong[index] * SLIP_HOLD);
				const over = Math.max(0, this._slipAlong[index] - 1);
				across = 1 - c * (1 - Math.max(MIN_COMBINED_GRIP, 1 / Math.sqrt(1 + over * over)));
			} else {
				this._slipAlong[index] = 0;
			}
			this._gripAcross[index] += (across - this._gripAcross[index]) * 0.5;
		});

		const handbrake = Math.round(this._handbrakeGrip / GRIP_STEP) * GRIP_STEP;
		const applied = this._appliedGripScale;
		const all = Math.round(this._gripScale.wheels / GRIP_STEP) * GRIP_STEP, held = Math.round(this._gripScale.handbrake / GRIP_STEP) * GRIP_STEP;
		const scaleChanged = all !== applied.wheels || held !== applied.handbrake;
		const handbrakeChanged = handbrake !== this._appliedHandbrake || scaleChanged;
		this._appliedHandbrake = handbrake;
		applied.wheels = all;
		applied.handbrake = held;
		this._wheels.forEach((wheel, index) => {
			const w = spec.wheels[index];
			const scale = tyreScale(w.grip);
			const settings = wheel.GetSettings();
			if (this._curveAlong[index] !== 1) {
				this._curveAlong[index] = 1;
				setLongitudinalCurve(settings.mLongitudinalFriction, scale, motorcycle);
			}
			const across = this._gripAcross[index];
			const acrossChanged = Math.abs(across - this._curveAcross[index]) >= GRIP_STEP || (across === 1 && this._curveAcross[index] !== 1);
			if (acrossChanged) this._curveAcross[index] = across > 1 - GRIP_STEP / 2 ? 1 : across;
			if (acrossChanged || scaleChanged || (handbrakeChanged && w.handbrakeTorque > 0)) {
				// Jolt grips with sqrt(tyre x ground): the curve takes the square of a grip multiplier
				const speed = w.handbrakeTorque > 0 ? held : all;
				setLateralCurve(settings.mLateralFriction, scale * this._curveAcross[index] * speed * speed * (w.handbrakeTorque > 0 ? handbrake : 1));
			}
		});
	}

	preStep (dt: number): void {
		if (!this._enabled) return;
		if (dt !== this._antiRollDt) this._setAntiRollBars(dt);
		if (!this._kinematic) this._updateGrip();
		if (this._spec.wheelCast === "ray") this._placeRays();
		const bodies = this._physics._bodies;
		if (this._kinematic) {
			// The wheels roll at the chassis' speed (nothing simulates them)
			const v = this._body.GetLinearVelocity();
			const vx = v.GetX(), vy = v.GetY(), vz = v.GetZ();
			const r = this._body.GetRotation();
			const qx = r.GetX(), qy = r.GetY(), qz = r.GetZ(), qw = r.GetW();
			// Forward (+Z) rotated by the chassis
			const fx = 2 * (qx * qz + qw * qy), fy = 2 * (qy * qz - qw * qx), fz = 1 - 2 * (qx * qx + qy * qy);
			const forward = vx * fx + vy * fy + vz * fz;
			this._wheels.forEach((wheel, index) => {
				wheel.SetAngularVelocity(forward / this._spec.wheels[index].radius);
			});
		} else if (this._driving && !this._body.IsActive()) {
			bodies.ActivateBody(this._id);
		}
	}

	readPose (out: Float64Array): void {
		const p = this._body.GetPosition();
		out[0] = p.GetX(); out[1] = p.GetY(); out[2] = p.GetZ();
		const r = this._body.GetRotation();
		out[3] = r.GetX(); out[4] = r.GetY(); out[5] = r.GetZ(); out[6] = r.GetW();
	}

	readVelocity (linear: IgePhysicsVec3, angular: IgePhysicsVec3): void {
		const v = this._body.GetLinearVelocity();
		linear.x = v.GetX(); linear.y = v.GetY(); linear.z = v.GetZ();
		const w = this._body.GetAngularVelocity();
		angular.x = w.GetX(); angular.y = w.GetY(); angular.z = w.GetZ();
	}

	readWheel (index: number, out: IgeVehicleWheelSample): void {
		const wheel = this._wheels[index];
		out.suspensionLength = wheel.GetSuspensionLength() - this._lift[index];
		out.steerAngle = wheel.GetSteerAngle();
		out.spinAngle = wheel.GetRotationAngle();
		out.spin = wheel.GetAngularVelocity();
		out.contact = wheel.HasContact();
		if (!out.contact) {
			out.longitudinalSlip = 0;
			out.lateralSlip = 0;
			out.ground = null;
			return;
		}

		const p = wheel.GetContactPosition();
		const px = p.GetX(), py = p.GetY(), pz = p.GetZ();
		const n = wheel.GetContactNormal();
		const nx = n.GetX(), ny = n.GetY(), nz = n.GetZ();
		out.point.x = px; out.point.y = py; out.point.z = pz;
		out.normal.x = nx; out.normal.y = ny; out.normal.z = nz;

		// The tyre's velocity over the ground there: the chassis' point velocity less the ground's
		const body = this._body;
		const c = body.GetCenterOfMassPosition();
		const rx = px - c.GetX(), ry = py - c.GetY(), rz = pz - c.GetZ();
		const v = body.GetLinearVelocity();
		const vx = v.GetX(), vy = v.GetY(), vz = v.GetZ();
		const w = body.GetAngularVelocity();
		const wx = w.GetX(), wy = w.GetY(), wz = w.GetZ();
		const g = wheel.GetContactPointVelocity();
		let dx = vx + (wy * rz - wz * ry) - g.GetX();
		let dy = vy + (wz * rx - wx * rz) - g.GetY();
		let dz = vz + (wx * ry - wy * rx) - g.GetZ();
		const along = dx * nx + dy * ny + dz * nz;
		dx -= along * nx; dy -= along * ny; dz -= along * nz;
		const l = wheel.GetContactLongitudinal();
		const forward = dx * l.GetX() + dy * l.GetY() + dz * l.GetZ();
		const s = wheel.GetContactLateral();
		const sideways = dx * s.GetX() + dy * s.GetY() + dz * s.GetZ();
		const radius = this._spec.wheels[index].radius;
		out.longitudinalSlip = out.spin * radius - forward;
		out.lateralSlip = sideways;
		out.ground = this._physics._handleOf(wheel.GetContactBodyID()) ?? null;
	}

	awake (): boolean {
		return this._body.IsActive();
	}

	rpm (): number {
		return this._controller.GetEngine().GetCurrentRPM();
	}

	gear (): number {
		return this._controller.GetTransmission().GetCurrentGear();
	}

	shift (gear: number): void {
		const { ratios, reverseRatios } = this._spec.gearbox;
		const clamped = Math.max(-reverseRatios.length, Math.min(ratios.length, gear));
		this._controller.GetTransmission().Set(clamped, 1);
	}

	setState (state: IgeVehicleBackendState): void {
		const physics = this._physics;
		const { position: p, rotation: r, velocity: v, angularVelocity: w } = state;
		const len = Math.hypot(r.x, r.y, r.z, r.w) || 1;
		physics._rvec.Set(p.x, p.y, p.z);
		physics._quat.Set(r.x / len, r.y / len, r.z / len, r.w / len);
		physics._vec.Set(v.x, v.y, v.z);
		this._vec2.Set(w.x, w.y, w.z);
		physics._bodies.SetPositionRotationAndVelocity(this._id, physics._rvec, physics._quat, physics._vec, this._vec2);

		if (state.rpm !== undefined && Number.isFinite(state.rpm)) {
			const engine = this._controller.GetEngine();
			engine.SetCurrentRPM(state.rpm);
			engine.ClampRPM();
		}
		if (state.gear !== undefined && Number.isFinite(state.gear)) this.shift(Math.round(state.gear));
		state.wheelSpin?.forEach((spin, index) => {
			if (this._wheels[index] && Number.isFinite(spin)) this._wheels[index].SetAngularVelocity(spin);
		});
		if (this._enabled) physics._bodies.ActivateBody(this._id);
	}

	setKinematic (on: boolean): void {
		if (on === this._kinematic) return;
		this._kinematic = on;
		const jolt = this._jolt;
		// The constraint stops driving the chassis; its step listener still
		// finds the ground under the wheels, steers and spins them
		this._constraint.SetEnabled(!on);
		this._physics._bodies.SetMotionType(this._id, on ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic,
			this._enabled ? jolt.EActivation_Activate : jolt.EActivation_DontActivate);
	}

	moveKinematic (position: IgePhysicsVec3, rotation: IgePhysicsQuat, dt: number): void {
		if (!this._kinematic || !this._enabled) return;
		const physics = this._physics;
		const len = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) || 1;
		physics._rvec.Set(position.x, position.y, position.z);
		physics._quat.Set(rotation.x / len, rotation.y / len, rotation.z / len, rotation.w / len);
		physics._bodies.MoveKinematic(this._id, physics._rvec, physics._quat, dt);
	}

	setEnabled (on: boolean): void {
		if (on === this._enabled || this._destroyed) return;
		this._enabled = on;
		this._physics.setBodyEnabled(this.body, on);
	}

	addAngularVelocity (change: IgePhysicsVec3): void {
		if (!this._enabled || this._kinematic) return;
		const bodies = this._physics._bodies;
		const w = this._body.GetAngularVelocity();
		this._vec2.Set(w.GetX() + change.x, w.GetY() + change.y, w.GetZ() + change.z);
		bodies.SetAngularVelocity(this._id, this._vec2);
		if (!this._body.IsActive()) bodies.ActivateBody(this._id);
	}

	accelerate (linear: IgePhysicsVec3, angular: IgePhysicsVec3, extra?: IgePhysicsVec3): void {
		if (!this._enabled || this._kinematic || this._destroyed) return;
		const motion = this._body.GetMotionProperties();
		const inverseMass = motion.GetInverseMass();
		if (!(inverseMass > 0)) return;
		// Torque = I x angular, I = R diag(1 / inverse diagonal) R^T, R the body's rotation times its inertia's
		const b = this._body.GetRotation();
		const bx = b.GetX(), by = b.GetY(), bz = b.GetZ(), bw = b.GetW();
		const i = motion.GetInertiaRotation();
		const ix = i.GetX(), iy = i.GetY(), iz = i.GetZ(), iw = i.GetW();
		const q = {
			x: bw * ix + bx * iw + by * iz - bz * iy,
			y: bw * iy - bx * iz + by * iw + bz * ix,
			z: bw * iz + bx * iy - by * ix + bz * iw,
			w: bw * iw - bx * ix - by * iy - bz * iz
		};
		const local = rotateBy(angular, -q.x, -q.y, -q.z, q.w);
		const d = motion.GetInverseInertiaDiagonal();
		const dx = d.GetX(), dy = d.GetY(), dz = d.GetZ();
		const torque = rotateBy({ x: dx > 0 ? local.x / dx : 0, y: dy > 0 ? local.y / dy : 0, z: dz > 0 ? local.z / dz : 0 }, q.x, q.y, q.z, q.w);
		this._vec2.Set(linear.x / inverseMass, linear.y / inverseMass, linear.z / inverseMass);
		this._vec3.Set(torque.x + (extra?.x ?? 0), torque.y + (extra?.y ?? 0), torque.z + (extra?.z ?? 0));
		// Wake it if it's asleep, but don't restart an awake body's sleep timer: Jolt's Activate does, and assists push
		// every step, so it would never come to rest
		const activation = this._body.IsActive() ? this._jolt.EActivation_DontActivate : this._jolt.EActivation_Activate;
		this._physics._bodies.AddForceAndTorque(this._id, this._vec2, this._vec3, activation);
	}

	scaleGrip (wheels: number, handbrakeWheels: number): void {
		this._gripScale.wheels = wheels;
		this._gripScale.handbrake = handbrakeWheels;
	}

	setUpright (on: boolean): void {
		if (this._destroyed) return;
		this._upright = on;
		// Jolt's motorcycle leans into turns and holds itself up with its lean
		// controller; the constraint's pitch and roll limit stops it falling
		if (this._spec.type === "motorcycle") (this._controller as JoltApi.MotorcycleController).EnableLeanController(on);
		this._constraint.SetMaxPitchRollAngle(on ? this._spec.maxTilt : Math.PI);
		if (this._enabled && !this._body.IsActive()) this._physics._bodies.ActivateBody(this._id);
	}

	/**
	 * Change to a new spec in place: mass, engine, gearbox and clutch,
	 * final drive, springs, dampers and where they're fixed, steering
	 * lock, brakes, tyre grip, anti-roll bars, friction and tilt limit.
	 * Anything else (the chassis, the wheels' size, travel or number, the
	 * gear count, a motorcycle's lean) needs the vehicle made again: false.
	 */
	retune (spec: IgeVehicleBackendSpec): boolean {
		const old = this._spec;
		if (this._destroyed || !retunable(old, spec)) return false;
		const jolt = this._jolt;
		this._spec = spec;

		// Mass: the same shape, so the inertia scales with it
		const motion = this._body.GetMotionProperties();
		const ratio = old.mass / spec.mass;
		if (ratio !== 1) {
			const diagonal = motion.GetInverseInertiaDiagonal();
			this._vec2.Set(diagonal.GetX() * ratio, diagonal.GetY() * ratio, diagonal.GetZ() * ratio);
			motion.SetInverseInertia(this._vec2, motion.GetInertiaRotation());
			motion.SetInverseMass(1 / spec.mass);
		}
		this._body.SetFriction(spec.friction);

		// Engine, gearbox, clutch and final drive
		const engine = this._controller.GetEngine();
		engine.mMaxTorque = spec.engine.maxTorque;
		engine.mMinRPM = spec.engine.minRpm;
		engine.mMaxRPM = spec.engine.maxRpm;
		const gearbox = this._controller.GetTransmission();
		gearbox.mMode = spec.gearbox.mode === "manual" ? jolt.ETransmissionMode_Manual : jolt.ETransmissionMode_Auto;
		gearbox.mGearRatios.clear();
		for (const r of spec.gearbox.ratios) gearbox.mGearRatios.push_back(r);
		gearbox.mReverseGearRatios.clear();
		for (const r of spec.gearbox.reverseRatios) gearbox.mReverseGearRatios.push_back(-r);
		gearbox.mShiftUpRPM = spec.gearbox.shiftUpRpm;
		gearbox.mShiftDownRPM = spec.gearbox.shiftDownRpm;
		gearbox.mSwitchTime = spec.gearbox.shiftTime;
		gearbox.mClutchStrength = spec.gearbox.clutchStrength;
		const differentials = this._controller.GetDifferentials();
		for (let i = 0; i < differentials.size(); i++) differentials.at(i).mDifferentialRatio = spec.gearbox.finalDrive;

		// Wheels: where the springs are fixed (they move with the sag), springs, steering, brakes; the curves are rebuilt
		spec.wheels.forEach((wheel, index) => {
			const settings = this._wheels[index].GetSettings();
			const lift = this._lift[index], d = wheel.suspensionDirection;
			this._vec2.Set(wheel.position.x + this._rayShift[index] - d.x * lift, wheel.position.y - d.y * lift, wheel.position.z - d.z * lift);
			settings.mPosition = this._vec2;
			settings.mSuspensionSpring.mStiffness = wheel.stiffness;
			settings.mSuspensionSpring.mDamping = wheel.damping;
			settings.mMaxSteerAngle = wheel.maxSteer;
			settings.mMaxBrakeTorque = wheel.brakeTorque;
			settings.mMaxHandBrakeTorque = wheel.handbrakeTorque;
			this._curveAlong[index] = this._curveAcross[index] = -1;
		});
		this._appliedHandbrake = -1;
		this._updateGrip();
		this._setAntiRollBars(this._antiRollDt || this._physics._fixedTimeStep);
		this._constraint.SetMaxPitchRollAngle(this._upright ? spec.maxTilt : Math.PI);
		if (this._enabled && !this._kinematic) this._physics._bodies.ActivateBody(this._id);
		return true;
	}

	destroy (): void {
		if (this._destroyed) return;
		this._destroyed = true;
		const physics = this._physics;
		const jolt = this._jolt;
		physics._system.RemoveStepListener(this._listener);
		jolt.destroy(this._listener);
		// The world's reference goes, then ours: that frees the constraint,
		// its controller, wheels and collision tester
		physics._system.RemoveConstraint(this._constraint);
		this._constraint.Release();
		physics.destroyBody(this.body);
		jolt.destroy(this._vec2);
		jolt.destroy(this._vec3);
		this._wheels = [];
	}
}
