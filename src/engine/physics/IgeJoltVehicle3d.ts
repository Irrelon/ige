import type JoltApi from "jolt-physics";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsQuat, IgePhysicsVec3 } from "@/engine/physics/IgePhysicsVehicle3dApi";
import type {
	IgeVehicleBackend,
	IgeVehicleBackendState,
	IgeVehicleSpec,
	IgeVehicleWheelSample
} from "@/engine/physics/IgePhysicsVehicle3dBackend";
import { matrixToQuaternion } from "@/engine/webgl/IgeModelParts";

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

/** Tyre curve scale for a grip (see the curves in the constructor). */
function tyreScale (grip: number): number {
	return (grip * 1.2) ** 2 / DEFAULT_GROUND_FRICTION / 1.2;
}

/** Sideways friction by slip angle in degrees (Jolt's curve, scaled). */
function setLateralCurve (curve: JoltApi.LinearCurve, scale: number): void {
	curve.Clear();
	curve.AddPoint(0, 0);
	curve.AddPoint(3, 1.2 * scale);
	curve.AddPoint(20, 1.0 * scale);
}

/**
 * The Jolt backend for a vehicle (IgeVehicleBackend): a dynamic body that
 * can switch to kinematic, held up and driven by Jolt's VehicleConstraint
 * with a WheeledVehicleController (or MotorcycleController), stepped by a
 * VehicleConstraintStepListener. Converts IGE units to metres. Wheels find
 * the ground with a cylinder (or ray) cast against what the vehicle's
 * layer collides with.
 *
 * Every Jolt object it makes is freed in destroy(): the step listener and
 * scratch vector directly, the constraint by its reference (which frees
 * its controller, wheels and collision tester), and the body (which frees
 * its shape).
 */
export class IgeJoltVehicle3d implements IgeVehicleBackend {
	_physics: IgePhysics3d;
	_jolt: typeof JoltApi;
	_spec: IgeVehicleSpec;
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
	/** The handbrake grip the handbrake's wheels' sideways curves are set for (1: full grip). */
	_handbrakeGrip: number = 1;
	_destroyed: boolean = false;
	/** A second scratch vector (the world's _vec is the first). */
	_vec2: JoltApi.Vec3;
	/** The step length the anti-roll bars were last set for (see _setAntiRollBars()). */
	_antiRollDt: number = 0;

	constructor (physics: IgePhysics3d, entity: IgeEntity, spec: IgeVehicleSpec) {
		const jolt = physics._jolt;
		const u = spec.unitsPerMetre;
		this._physics = physics;
		this._jolt = jolt;
		this._spec = spec;
		this._vec2 = new jolt.Vec3(0, 0, 0);
		const layer = spec.layer ? physics._layerIndex(spec.layer) : physics._defaultLayer(false);
		this._layer = layer;
		const motorcycle = spec.type === "motorcycle";

		// Start at the entity's world transform
		entity.updateTransform();
		const world = entity._worldMatrix4?.matrix;
		const position = world ? { x: world[12], y: world[13], z: world[14] } : { ...entity._translate };
		const rotation = world ? matrixToQuaternion(world) : { x: 0, y: 0, z: 0, w: 1 };

		// The chassis shape with its centre of mass moved where the spec puts it
		const built = physics._createShape(spec.chassis, { x: 1, y: 1, z: 1 });
		const com = built.shape.GetCenterOfMass();
		physics._vec.Set(spec.centreOfMass.x / u - com.GetX(), spec.centreOfMass.y / u - com.GetY(), spec.centreOfMass.z / u - com.GetZ());
		const shape = new jolt.OffsetCenterOfMassShape(built.shape, physics._vec);

		physics._rvec.Set(position.x / u, position.y / u, position.z / u);
		physics._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
		const settings = new jolt.BodyCreationSettings(shape, physics._rvec, physics._quat, jolt.EMotionType_Dynamic, layer);
		settings.mOverrideMassProperties = jolt.EOverrideMassProperties_CalculateInertia;
		settings.mMassPropertiesOverride.mMass = spec.mass;
		settings.mAllowDynamicOrKinematic = true;
		settings.mFriction = spec.friction;
		settings.mMotionQuality = jolt.EMotionQuality_LinearCast;
		this._body = physics._bodies.CreateBody(settings);
		this._id = this._body.GetID();
		jolt.destroy(settings);
		built.cleanup?.();
		physics._bodies.AddBody(this._id, jolt.EActivation_Activate);

		// Wheels
		const vehicle = new jolt.VehicleConstraintSettings();
		vehicle.mMaxPitchRollAngle = spec.maxTilt;
		for (const wheel of spec.wheels) {
			const w = new jolt.WheelSettingsWV();
			const vec = physics._vec;
			vec.Set(wheel.position.x / u, wheel.position.y / u, wheel.position.z / u);
			w.mPosition = vec;
			vec.Set(wheel.suspensionDirection.x, wheel.suspensionDirection.y, wheel.suspensionDirection.z);
			w.mSuspensionDirection = vec;
			vec.Set(wheel.steeringAxis.x, wheel.steeringAxis.y, wheel.steeringAxis.z);
			w.mSteeringAxis = vec;
			vec.Set(0, 1, 0);
			w.mWheelUp = vec;
			vec.Set(0, 0, 1);
			w.mWheelForward = vec;
			w.mRadius = wheel.radius / u;
			w.mWidth = wheel.width / u;
			w.mSuspensionMinLength = wheel.suspensionMin / u;
			w.mSuspensionMaxLength = wheel.suspensionMax / u;
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
			const longitudinal = w.mLongitudinalFriction;
			longitudinal.Clear();
			longitudinal.AddPoint(0, motorcycle ? 0 : 1.0 * scale);
			longitudinal.AddPoint(0.06, 1.2 * scale);
			longitudinal.AddPoint(0.2, 1.0 * scale);
			setLateralCurve(w.mLateralFriction, scale);
			vehicle.mWheels.push_back(w);
		}

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
		gearbox.mClutchStrength = motorcycle ? 2 : 10;
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
		this._setAntiRollBars(physics._options.fixedTimeStep);
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
		const u = spec.unitsPerMetre;
		const com = spec.centreOfMass;
		const motion = this._body.GetMotionProperties();
		const identity = this._physics._identity;
		// Where each tyre touches the ground (resting mid-travel) from the centre of mass, crossed with up: (-z, 0, x)
		const arms = spec.wheels.map((wheel) => {
			const length = (wheel.suspensionMin + wheel.suspensionMax) / 2;
			const d = wheel.suspensionDirection;
			return { x: -(wheel.position.z + d.z * length - com.z) / u, z: (wheel.position.x + d.x * length - com.x) / u };
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
		this._driving = forward !== 0 || right !== 0 || brake !== 0 || handbrake !== 0;

		// Locked tyres lose most of their sideways grip (Jolt keeps it all):
		// rescale the handbrake wheels' sideways curves when it changes
		const grip = Math.round((1 - (1 - this._spec.handbrakeGrip) * handbrake) * 20) / 20;
		if (grip !== this._handbrakeGrip) {
			this._handbrakeGrip = grip;
			this._spec.wheels.forEach((wheel, index) => {
				if (wheel.handbrakeTorque > 0) setLateralCurve(this._wheels[index].GetSettings().mLateralFriction, tyreScale(wheel.grip) * grip);
			});
		}
	}

	preStep (dt: number): void {
		if (!this._enabled) return;
		if (dt !== this._antiRollDt) this._setAntiRollBars(dt);
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
				wheel.SetAngularVelocity(forward / (this._spec.wheels[index].radius / this._spec.unitsPerMetre));
			});
		} else if (this._driving && !this._body.IsActive()) {
			bodies.ActivateBody(this._id);
		}
	}

	readPose (out: Float64Array): void {
		const u = this._spec.unitsPerMetre;
		const p = this._body.GetPosition();
		out[0] = p.GetX() * u; out[1] = p.GetY() * u; out[2] = p.GetZ() * u;
		const r = this._body.GetRotation();
		out[3] = r.GetX(); out[4] = r.GetY(); out[5] = r.GetZ(); out[6] = r.GetW();
	}

	readVelocity (linear: IgePhysicsVec3, angular: IgePhysicsVec3): void {
		const u = this._spec.unitsPerMetre;
		const v = this._body.GetLinearVelocity();
		linear.x = v.GetX() * u; linear.y = v.GetY() * u; linear.z = v.GetZ() * u;
		const w = this._body.GetAngularVelocity();
		angular.x = w.GetX(); angular.y = w.GetY(); angular.z = w.GetZ();
	}

	readWheel (index: number, out: IgeVehicleWheelSample): void {
		const u = this._spec.unitsPerMetre;
		const wheel = this._wheels[index];
		out.suspensionLength = wheel.GetSuspensionLength() * u;
		out.steerAngle = wheel.GetSteerAngle();
		out.spinAngle = wheel.GetRotationAngle();
		out.spin = wheel.GetAngularVelocity();
		out.contact = wheel.HasContact();
		if (!out.contact) {
			out.longitudinalSlip = 0;
			out.lateralSlip = 0;
			out.entity = null;
			return;
		}

		const p = wheel.GetContactPosition();
		const px = p.GetX(), py = p.GetY(), pz = p.GetZ();
		const n = wheel.GetContactNormal();
		const nx = n.GetX(), ny = n.GetY(), nz = n.GetZ();
		out.point.x = px * u; out.point.y = py * u; out.point.z = pz * u;
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
		const radius = this._spec.wheels[index].radius / u;
		out.longitudinalSlip = (out.spin * radius - forward) * u;
		out.lateralSlip = sideways * u;

		const ground = this._physics._byBodyId.get(wheel.GetContactBodyID().GetIndexAndSequenceNumber());
		out.entity = ground ? ground.entity : null;
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
		const u = this._spec.unitsPerMetre;
		const { position: p, rotation: r, velocity: v, angularVelocity: w } = state;
		const len = Math.hypot(r.x, r.y, r.z, r.w) || 1;
		physics._rvec.Set(p.x / u, p.y / u, p.z / u);
		physics._quat.Set(r.x / len, r.y / len, r.z / len, r.w / len);
		physics._vec.Set(v.x / u, v.y / u, v.z / u);
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
		const u = this._spec.unitsPerMetre;
		const len = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) || 1;
		physics._rvec.Set(position.x / u, position.y / u, position.z / u);
		physics._quat.Set(rotation.x / len, rotation.y / len, rotation.z / len, rotation.w / len);
		physics._bodies.MoveKinematic(this._id, physics._rvec, physics._quat, dt);
	}

	setEnabled (on: boolean): void {
		if (on === this._enabled || this._destroyed) return;
		this._enabled = on;
		const bodies = this._physics._bodies;
		if (on) bodies.AddBody(this._id, this._jolt.EActivation_Activate);
		else bodies.RemoveBody(this._id);
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
		if (this._enabled) physics._bodies.RemoveBody(this._id);
		physics._bodies.DestroyBody(this._id);
		jolt.destroy(this._vec2);
		this._wheels = [];
	}
}
