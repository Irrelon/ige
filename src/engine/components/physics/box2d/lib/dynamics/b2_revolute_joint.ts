/*
* Copyright (c) 2006-2011 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

import { b2_linearSlop, b2_angularSlop, b2_maxAngularCorrection, b2Maybe } from "../common/b2_settings.js";
import { b2Abs, b2Clamp, b2Vec2, b2Mat22, b2Rot, XY, b2Max, b2Transform } from "../common/b2_math.js";
import { b2Body } from "./b2_body.js";
import { b2Joint, b2JointDef, b2JointType, b2IJointDef } from "./b2_joint.js";
import { b2SolverData } from "./b2_time_step.js";
import { b2Draw, b2Color } from "../common/b2_draw.js";

export interface b2IRevoluteJointDef extends b2IJointDef {
  localAnchorA?: XY;

  localAnchorB?: XY;

  referenceAngle?: number;

  enableLimit?: boolean;

  lowerAngle?: number;

  upperAngle?: number;

  enableMotor?: boolean;

  motorSpeed?: number;

  maxMotorTorque?: number;
}

/// Revolute joint definition. This requires defining an anchor point where the
/// bodies are joined. The definition uses local anchor points so that the
/// initial configuration can violate the constraint slightly. You also need to
/// specify the initial relative angle for joint limits. This helps when saving
/// and loading a game.
/// The local anchor points are measured from the body's origin
/// rather than the center of mass because:
/// 1. you might not know where the center of mass will be.
/// 2. if you add/remove shapes from a body and recompute the mass,
///    the joints will be broken.
export class b2RevoluteJointDef extends b2JointDef implements b2IRevoluteJointDef {
  public readonly localAnchorA: b2Vec2 = new b2Vec2(0, 0);

  public readonly localAnchorB: b2Vec2 = new b2Vec2(0, 0);

  public referenceAngle: number = 0;

  public enableLimit = false;

  public lowerAngle: number = 0;

  public upperAngle: number = 0;

  public enableMotor = false;

  public motorSpeed: number = 0;

  public maxMotorTorque: number = 0;

  constructor() {
    super(b2JointType.e_revoluteJoint);
  }

  public Initialize(bA: b2Body, bB: b2Body, anchor: XY): void {
    this.bodyA = bA;
    this.bodyB = bB;
    this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
    this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
    this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
  }
}

export class b2RevoluteJoint extends b2Joint {
  // Solver shared
  public readonly m_localAnchorA: b2Vec2 = new b2Vec2();
  public readonly m_localAnchorB: b2Vec2 = new b2Vec2();
  public readonly m_impulse: b2Vec2 = new b2Vec2();
  public m_motorImpulse: number = 0;
  public m_lowerImpulse: number = 0;
  public m_upperImpulse: number = 0;
  public m_enableMotor: boolean = false;
  public m_maxMotorTorque: number = 0;
  public m_motorSpeed: number = 0;
  public m_enableLimit: boolean = false;
  public m_referenceAngle: number = 0;
  public m_lowerAngle: number = 0;
  public m_upperAngle: number = 0;

  // Solver temp
  public m_indexA: number = 0;
  public m_indexB: number = 0;
  public readonly m_rA: b2Vec2 = new b2Vec2();
  public readonly m_rB: b2Vec2 = new b2Vec2();
  public readonly m_localCenterA: b2Vec2 = new b2Vec2();
  public readonly m_localCenterB: b2Vec2 = new b2Vec2();
  public m_invMassA: number = 0;
  public m_invMassB: number = 0;
  public m_invIA: number = 0;
  public m_invIB: number = 0;
  public readonly m_K: b2Mat22 = new b2Mat22();
  public m_angle: number = 0;
  public m_axialMass: number = 0;

  public readonly m_qA: b2Rot = new b2Rot();
  public readonly m_qB: b2Rot = new b2Rot();
  public readonly m_lalcA: b2Vec2 = new b2Vec2();
  public readonly m_lalcB: b2Vec2 = new b2Vec2();

  constructor(def: b2IRevoluteJointDef) {
    super(def);

    this.m_localAnchorA.Copy(b2Maybe(def.localAnchorA, b2Vec2.ZERO));
    this.m_localAnchorB.Copy(b2Maybe(def.localAnchorB, b2Vec2.ZERO));
    this.m_referenceAngle = b2Maybe(def.referenceAngle, 0);

    this.m_impulse.SetZero();
    this.m_motorImpulse = 0;

    this.m_lowerAngle = b2Maybe(def.lowerAngle, 0);
    this.m_upperAngle = b2Maybe(def.upperAngle, 0);
    this.m_maxMotorTorque = b2Maybe(def.maxMotorTorque, 0);
    this.m_motorSpeed = b2Maybe(def.motorSpeed, 0);
    this.m_enableLimit = b2Maybe(def.enableLimit, false);
    this.m_enableMotor = b2Maybe(def.enableMotor, false);
  }

  private static InitVelocityConstraints_s_P = new b2Vec2();
  public InitVelocityConstraints(data: b2SolverData): void {
    this.m_indexA = this.m_bodyA.m_islandIndex;
    this.m_indexB = this.m_bodyB.m_islandIndex;
    this.m_localCenterA.Copy(this.m_bodyA.m_sweep.localCenter);
    this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
    this.m_invMassA = this.m_bodyA.m_invMass;
    this.m_invMassB = this.m_bodyB.m_invMass;
    this.m_invIA = this.m_bodyA.m_invI;
    this.m_invIB = this.m_bodyB.m_invI;

    const aA: number = data.positions[this.m_indexA].a;
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;

    const aB: number = data.positions[this.m_indexB].a;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    // b2Rot qA(aA), qB(aB);
    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    // m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
    b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

    // J = [-I -r1_skew I r2_skew]
    // r_skew = [-ry; rx]

    // Matlab
    // K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x]
    //     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB]

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    this.m_K.ex.x = mA + mB + this.m_rA.y * this.m_rA.y * iA + this.m_rB.y * this.m_rB.y * iB;
    this.m_K.ey.x = -this.m_rA.y * this.m_rA.x * iA - this.m_rB.y * this.m_rB.x * iB;
    this.m_K.ex.y = this.m_K.ey.x;
    this.m_K.ey.y = mA + mB + this.m_rA.x * this.m_rA.x * iA + this.m_rB.x * this.m_rB.x * iB;

    this.m_axialMass = iA + iB;
    let fixedRotation: boolean;
    if (this.m_axialMass > 0.0) {
      this.m_axialMass = 1.0 / this.m_axialMass;
      fixedRotation = false;
    } else {
      fixedRotation = true;
    }

    this.m_angle = aB - aA - this.m_referenceAngle;
    if (this.m_enableLimit === false || fixedRotation) {
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }

    if (this.m_enableMotor === false || fixedRotation) {
      this.m_motorImpulse = 0.0;
    }

    if (data.step.warmStarting) {
      // Scale impulses to support a variable time step.
      this.m_impulse.SelfMul(data.step.dtRatio);
      this.m_motorImpulse *= data.step.dtRatio;
      this.m_lowerImpulse *= data.step.dtRatio;
      this.m_upperImpulse *= data.step.dtRatio;

      const axialImpulse: number = this.m_motorImpulse + this.m_lowerImpulse - this.m_upperImpulse;
      // b2Vec2 P(m_impulse.x, m_impulse.y);
      const P: b2Vec2 = b2RevoluteJoint.InitVelocityConstraints_s_P.Set(this.m_impulse.x, this.m_impulse.y);

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * (b2Vec2.CrossVV(this.m_rA, P) + axialImpulse);

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * (b2Vec2.CrossVV(this.m_rB, P) + axialImpulse);
    } else {
      this.m_impulse.SetZero();
      this.m_motorImpulse = 0;
      this.m_lowerImpulse = 0;
      this.m_upperImpulse = 0;
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  // private static SolveVelocityConstraints_s_P: b2Vec2 = new b2Vec2();
  private static SolveVelocityConstraints_s_Cdot_v2: b2Vec2 = new b2Vec2();
  // private static SolveVelocityConstraints_s_Cdot1: b2Vec2 = new b2Vec2();
  // private static SolveVelocityConstraints_s_impulse_v3: b2Vec3 = new b2Vec3();
  // private static SolveVelocityConstraints_s_reduced_v2: b2Vec2 = new b2Vec2();
  private static SolveVelocityConstraints_s_impulse_v2: b2Vec2 = new b2Vec2();
  public SolveVelocityConstraints(data: b2SolverData): void {
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    const fixedRotation: boolean = (iA + iB === 0);

    // Solve motor constraint.
    if (this.m_enableMotor && !fixedRotation) {
      const Cdot: number = wB - wA - this.m_motorSpeed;
      let impulse: number = -this.m_axialMass * Cdot;
      const oldImpulse: number = this.m_motorImpulse;
      const maxImpulse: number = data.step.dt * this.m_maxMotorTorque;
      this.m_motorImpulse = b2Clamp(this.m_motorImpulse + impulse, -maxImpulse, maxImpulse);
      impulse = this.m_motorImpulse - oldImpulse;

      wA -= iA * impulse;
      wB += iB * impulse;
    }

    // Solve limit constraint.
    if (this.m_enableLimit && !fixedRotation) {
		// Lower limit
		{
			const C: number = this.m_angle - this.m_lowerAngle;
			const Cdot: number = wB - wA;
			let impulse: number = -this.m_axialMass * (Cdot + b2Max(C, 0.0) * data.step.inv_dt);
			const oldImpulse: number = this.m_lowerImpulse;
			this.m_lowerImpulse = b2Max(this.m_lowerImpulse + impulse, 0.0);
			impulse = this.m_lowerImpulse - oldImpulse;

			wA -= iA * impulse;
			wB += iB * impulse;
		}

		// Upper limit
		// Note: signs are flipped to keep C positive when the constraint is satisfied.
		// This also keeps the impulse positive when the limit is active.
		{
			const C: number = this.m_upperAngle - this.m_angle;
			const Cdot: number = wA - wB;
			let impulse: number = -this.m_axialMass * (Cdot + b2Max(C, 0.0) * data.step.inv_dt);
			const oldImpulse: number = this.m_upperImpulse;
			this.m_upperImpulse = b2Max(this.m_upperImpulse + impulse, 0.0);
			impulse = this.m_upperImpulse - oldImpulse;

			wA += iA * impulse;
			wB -= iB * impulse;
		}
  }

    // Solve point-to-point constraint
    {
      // b2Vec2 Cdot = vB + b2Cross(wB, m_rB) - vA - b2Cross(wA, m_rA);
      const Cdot_v2: b2Vec2 = b2Vec2.SubVV(
        b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
        b2Vec2.AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
        b2RevoluteJoint.SolveVelocityConstraints_s_Cdot_v2);
      // b2Vec2 impulse = m_K.Solve(-Cdot);
      const impulse_v2: b2Vec2 = this.m_K.Solve(-Cdot_v2.x, -Cdot_v2.y, b2RevoluteJoint.SolveVelocityConstraints_s_impulse_v2);

      this.m_impulse.x += impulse_v2.x;
      this.m_impulse.y += impulse_v2.y;

      // vA -= mA * impulse;
      vA.SelfMulSub(mA, impulse_v2);
      wA -= iA * b2Vec2.CrossVV(this.m_rA, impulse_v2);

      // vB += mB * impulse;
      vB.SelfMulAdd(mB, impulse_v2);
      wB += iB * b2Vec2.CrossVV(this.m_rB, impulse_v2);
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolvePositionConstraints_s_C_v2 = new b2Vec2();
  private static SolvePositionConstraints_s_impulse = new b2Vec2();
  public SolvePositionConstraints(data: b2SolverData): boolean {
    const cA: b2Vec2 = data.positions[this.m_indexA].c;
    let aA: number = data.positions[this.m_indexA].a;
    const cB: b2Vec2 = data.positions[this.m_indexB].c;
    let aB: number = data.positions[this.m_indexB].a;

    // b2Rot qA(aA), qB(aB);
    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    let angularError: number = 0;
    let positionError: number = 0;

    const fixedRotation: boolean = (this.m_invIA + this.m_invIB === 0);

    // Solve angular limit constraint.
    if (this.m_enableLimit && !fixedRotation) {
      const angle: number = aB - aA - this.m_referenceAngle;
      let C: number = 0.0;

      if (b2Abs(this.m_upperAngle - this.m_lowerAngle) < 2.0 * b2_angularSlop) {
        // Prevent large angular corrections
        C = b2Clamp(angle - this.m_lowerAngle, -b2_maxAngularCorrection, b2_maxAngularCorrection);
      } else if (angle <= this.m_lowerAngle) {
        // Prevent large angular corrections and allow some slop.
        C = b2Clamp(angle - this.m_lowerAngle + b2_angularSlop, -b2_maxAngularCorrection, 0.0);
      } else if (angle >= this.m_upperAngle) {
        // Prevent large angular corrections and allow some slop.
        C = b2Clamp(angle - this.m_upperAngle - b2_angularSlop, 0.0, b2_maxAngularCorrection);
      }

      const limitImpulse: number = -this.m_axialMass * C;
      aA -= this.m_invIA * limitImpulse;
      aB += this.m_invIB * limitImpulse;
      angularError = b2Abs(C);
    }

    // Solve point-to-point constraint.
    {
      qA.SetAngle(aA);
      qB.SetAngle(aB);
      // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
      b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
      const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
      // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
      b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
      const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

      // b2Vec2 C = cB + rB - cA - rA;
      const C_v2 =
        b2Vec2.SubVV(
          b2Vec2.AddVV(cB, rB, b2Vec2.s_t0),
          b2Vec2.AddVV(cA, rA, b2Vec2.s_t1),
          b2RevoluteJoint.SolvePositionConstraints_s_C_v2);
      // positionError = C.Length();
      positionError = C_v2.Length();

      const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
      const iA: number = this.m_invIA, iB: number = this.m_invIB;

      const K: b2Mat22 = this.m_K;
      K.ex.x = mA + mB + iA * rA.y * rA.y + iB * rB.y * rB.y;
      K.ex.y = -iA * rA.x * rA.y - iB * rB.x * rB.y;
      K.ey.x = K.ex.y;
      K.ey.y = mA + mB + iA * rA.x * rA.x + iB * rB.x * rB.x;

      // b2Vec2 impulse = -K.Solve(C);
      const impulse: b2Vec2 = K.Solve(C_v2.x, C_v2.y, b2RevoluteJoint.SolvePositionConstraints_s_impulse).SelfNeg();

      // cA -= mA * impulse;
      cA.SelfMulSub(mA, impulse);
      aA -= iA * b2Vec2.CrossVV(rA, impulse);

      // cB += mB * impulse;
      cB.SelfMulAdd(mB, impulse);
      aB += iB * b2Vec2.CrossVV(rB, impulse);
    }

    // data.positions[this.m_indexA].c = cA;
    data.positions[this.m_indexA].a = aA;
    // data.positions[this.m_indexB].c = cB;
    data.positions[this.m_indexB].a = aB;

    return positionError <= b2_linearSlop && angularError <= b2_angularSlop;
  }

  public GetAnchorA<T extends XY>(out: T): T {
    return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
  }

  public GetAnchorB<T extends XY>(out: T): T {
    return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
  }

  public GetReactionForce<T extends XY>(inv_dt: number, out: T): T {
    // b2Vec2 P(this.m_impulse.x, this.m_impulse.y);
    // return inv_dt * P;
    out.x = inv_dt * this.m_impulse.x;
    out.y = inv_dt * this.m_impulse.y;
    return out;
  }

  public GetReactionTorque(inv_dt: number): number {
    return inv_dt * (this.m_lowerImpulse - this.m_upperImpulse);
  }

  public GetLocalAnchorA(): Readonly<b2Vec2> { return this.m_localAnchorA; }

  public GetLocalAnchorB(): Readonly<b2Vec2> { return this.m_localAnchorB; }

  public GetReferenceAngle(): number { return this.m_referenceAngle; }

  public GetJointAngle(): number {
    // b2Body* bA = this.m_bodyA;
    // b2Body* bB = this.m_bodyB;
    // return bB.this.m_sweep.a - bA.this.m_sweep.a - this.m_referenceAngle;
    return this.m_bodyB.m_sweep.a - this.m_bodyA.m_sweep.a - this.m_referenceAngle;
  }

  public GetJointSpeed(): number {
    // b2Body* bA = this.m_bodyA;
    // b2Body* bB = this.m_bodyB;
    // return bB.this.m_angularVelocity - bA.this.m_angularVelocity;
    return this.m_bodyB.m_angularVelocity - this.m_bodyA.m_angularVelocity;
  }

  public IsMotorEnabled(): boolean {
    return this.m_enableMotor;
  }

  public EnableMotor(flag: boolean): void {
    if (flag !== this.m_enableMotor) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_enableMotor = flag;
    }
  }

  public GetMotorTorque(inv_dt: number): number {
    return inv_dt * this.m_motorImpulse;
  }

  public GetMotorSpeed(): number {
    return this.m_motorSpeed;
  }

  public SetMaxMotorTorque(torque: number): void {
    if (torque !== this.m_maxMotorTorque) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_maxMotorTorque = torque;
    }
  }

  public GetMaxMotorTorque(): number { return this.m_maxMotorTorque; }

  public IsLimitEnabled(): boolean {
    return this.m_enableLimit;
  }

  public EnableLimit(flag: boolean): void {
    if (flag !== this.m_enableLimit) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_enableLimit = flag;
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }
  }

  public GetLowerLimit(): number {
    return this.m_lowerAngle;
  }

  public GetUpperLimit(): number {
    return this.m_upperAngle;
  }

  public SetLimits(lower: number, upper: number): void {

    if (lower !== this.m_lowerAngle || upper !== this.m_upperAngle) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
      this.m_lowerAngle = lower;
      this.m_upperAngle = upper;
    }
  }

  public SetMotorSpeed(speed: number): void {
    if (speed !== this.m_motorSpeed) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_motorSpeed = speed;
    }
  }

  public override Dump(log: (format: string, ...args: any[]) => void) {
    const indexA = this.m_bodyA.m_islandIndex;
    const indexB = this.m_bodyB.m_islandIndex;

    log("  const jd: b2RevoluteJointDef = new b2RevoluteJointDef();\n");
    log("  jd.bodyA = bodies[%d];\n", indexA);
    log("  jd.bodyB = bodies[%d];\n", indexB);
    log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
    log("  jd.localAnchorA.Set(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
    log("  jd.localAnchorB.Set(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
    log("  jd.referenceAngle = %.15f;\n", this.m_referenceAngle);
    log("  jd.enableLimit = %s;\n", (this.m_enableLimit) ? ("true") : ("false"));
    log("  jd.lowerAngle = %.15f;\n", this.m_lowerAngle);
    log("  jd.upperAngle = %.15f;\n", this.m_upperAngle);
    log("  jd.enableMotor = %s;\n", (this.m_enableMotor) ? ("true") : ("false"));
    log("  jd.motorSpeed = %.15f;\n", this.m_motorSpeed);
    log("  jd.maxMotorTorque = %.15f;\n", this.m_maxMotorTorque);
    log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
  }

  private static Draw_s_pA = new b2Vec2();
  private static Draw_s_pB = new b2Vec2();
  private static Draw_s_c1 = new b2Color(0.7, 0.7, 0.7);
  private static Draw_s_c2 = new b2Color(0.3, 0.9, 0.3);
  private static Draw_s_c3 = new b2Color(0.9, 0.3, 0.3);
  private static Draw_s_c4 = new b2Color(0.3, 0.3, 0.9);
  private static Draw_s_c5 = new b2Color(0.4, 0.4, 0.4);
  private static Draw_s_color_ = new b2Color(0.5, 0.8, 0.8);
  private static Draw_s_r = new b2Vec2();
  private static Draw_s_rlo = new b2Vec2();
  private static Draw_s_rhi = new b2Vec2();
  public override Draw(draw: b2Draw): void {
    const xfA: Readonly<b2Transform> = this.m_bodyA.GetTransform();
    const xfB: Readonly<b2Transform> = this.m_bodyB.GetTransform();
    const pA = b2Transform.MulXV(xfA, this.m_localAnchorA, b2RevoluteJoint.Draw_s_pA);
    const pB = b2Transform.MulXV(xfB, this.m_localAnchorB, b2RevoluteJoint.Draw_s_pB);

    const c1 = b2RevoluteJoint.Draw_s_c1; // b2Color c1(0.7f, 0.7f, 0.7f);
    const c2 = b2RevoluteJoint.Draw_s_c2; // b2Color c2(0.3f, 0.9f, 0.3f);
    const c3 = b2RevoluteJoint.Draw_s_c3; // b2Color c3(0.9f, 0.3f, 0.3f);
    const c4 = b2RevoluteJoint.Draw_s_c4; // b2Color c4(0.3f, 0.3f, 0.9f);
    const c5 = b2RevoluteJoint.Draw_s_c5; // b2Color c5(0.4f, 0.4f, 0.4f);

    draw.DrawPoint(pA, 5.0, c4);
    draw.DrawPoint(pB, 5.0, c5);

    const aA: number = this.m_bodyA.GetAngle();
    const aB: number = this.m_bodyB.GetAngle();
    const angle: number = aB - aA - this.m_referenceAngle;

    const L: number = 0.5;

    // b2Vec2 r = L * b2Vec2(Math.cos(angle), Math.sin(angle));
    const r = b2RevoluteJoint.Draw_s_r.Set(L * Math.cos(angle), L * Math.sin(angle));
    // draw.DrawSegment(pB, pB + r, c1);
    draw.DrawSegment(pB, b2Vec2.AddVV(pB, r, b2Vec2.s_t0), c1);
    draw.DrawCircle(pB, L, c1);

    if (this.m_enableLimit) {
      // b2Vec2 rlo = L * b2Vec2(Math.cos(m_lowerAngle), Math.sin(m_lowerAngle));
      const rlo = b2RevoluteJoint.Draw_s_rlo.Set(L * Math.cos(this.m_lowerAngle), L * Math.sin(this.m_lowerAngle));
      // b2Vec2 rhi = L * b2Vec2(Math.cos(m_upperAngle), Math.sin(m_upperAngle));
      const rhi = b2RevoluteJoint.Draw_s_rhi.Set(L * Math.cos(this.m_upperAngle), L * Math.sin(this.m_upperAngle));

      // draw.DrawSegment(pB, pB + rlo, c2);
      draw.DrawSegment(pB, b2Vec2.AddVV(pB, rlo, b2Vec2.s_t0), c2);
      // draw.DrawSegment(pB, pB + rhi, c3);
      draw.DrawSegment(pB, b2Vec2.AddVV(pB, rhi, b2Vec2.s_t0), c3);
    }

    const color = b2RevoluteJoint.Draw_s_color_; // b2Color color(0.5f, 0.8f, 0.8f);
    draw.DrawSegment(xfA.p, pA, color);
    draw.DrawSegment(pA, pB, color);
    draw.DrawSegment(xfB.p, pB, color);
  }
}
