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

import { b2_linearSlop, b2_angularSlop, b2Maybe } from "../common/b2_settings.js";
import { b2Abs, b2Min, b2Max, b2Clamp, b2Vec2, b2Mat22, b2Vec3, b2Mat33, b2Rot, XY, b2Transform } from "../common/b2_math.js";
import { b2Body } from "./b2_body.js";
import { b2Joint, b2JointDef, b2JointType, b2IJointDef } from "./b2_joint.js";
import { b2SolverData } from "./b2_time_step.js";
import { b2Draw, b2Color } from "../common/b2_draw.js";

export interface b2IPrismaticJointDef extends b2IJointDef {
  localAnchorA?: XY;

  localAnchorB?: XY;

  localAxisA?: XY;

  referenceAngle?: number;

  enableLimit?: boolean;

  lowerTranslation?: number;

  upperTranslation?: number;

  enableMotor?: boolean;

  maxMotorForce?: number;

  motorSpeed?: number;
}

/// Prismatic joint definition. This requires defining a line of
/// motion using an axis and an anchor point. The definition uses local
/// anchor points and a local axis so that the initial configuration
/// can violate the constraint slightly. The joint translation is zero
/// when the local anchor points coincide in world space. Using local
/// anchors and a local axis helps when saving and loading a game.
export class b2PrismaticJointDef extends b2JointDef implements b2IPrismaticJointDef {
  public readonly localAnchorA: b2Vec2 = new b2Vec2();

  public readonly localAnchorB: b2Vec2 = new b2Vec2();

  public readonly localAxisA: b2Vec2 = new b2Vec2(1, 0);

  public referenceAngle: number = 0;

  public enableLimit = false;

  public lowerTranslation: number = 0;

  public upperTranslation: number = 0;

  public enableMotor = false;

  public maxMotorForce: number = 0;

  public motorSpeed: number = 0;

  constructor() {
    super(b2JointType.e_prismaticJoint);
  }

  public Initialize(bA: b2Body, bB: b2Body, anchor: XY, axis: XY): void {
    this.bodyA = bA;
    this.bodyB = bB;
    this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
    this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
    this.bodyA.GetLocalVector(axis, this.localAxisA);
    this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
  }
}

// Linear constraint (point-to-line)
// d = p2 - p1 = x2 + r2 - x1 - r1
// C = dot(perp, d)
// Cdot = dot(d, cross(w1, perp)) + dot(perp, v2 + cross(w2, r2) - v1 - cross(w1, r1))
//      = -dot(perp, v1) - dot(cross(d + r1, perp), w1) + dot(perp, v2) + dot(cross(r2, perp), v2)
// J = [-perp, -cross(d + r1, perp), perp, cross(r2,perp)]
//
// Angular constraint
// C = a2 - a1 + a_initial
// Cdot = w2 - w1
// J = [0 0 -1 0 0 1]
//
// K = J * invM * JT
//
// J = [-a -s1 a s2]
//     [0  -1  0  1]
// a = perp
// s1 = cross(d + r1, a) = cross(p2 - x1, a)
// s2 = cross(r2, a) = cross(p2 - x2, a)

// Motor/Limit linear constraint
// C = dot(ax1, d)
// Cdot = -dot(ax1, v1) - dot(cross(d + r1, ax1), w1) + dot(ax1, v2) + dot(cross(r2, ax1), v2)
// J = [-ax1 -cross(d+r1,ax1) ax1 cross(r2,ax1)]

// Predictive limit is applied even when the limit is not active.
// Prevents a constraint speed that can lead to a constraint error in one time step.
// Want C2 = C1 + h * Cdot >= 0
// Or:
// Cdot + C1/h >= 0
// I do not apply a negative constraint error because that is handled in position correction.
// So:
// Cdot + max(C1, 0)/h >= 0

// Block Solver
// We develop a block solver that includes the angular and linear constraints. This makes the limit stiffer.
//
// The Jacobian has 2 rows:
// J = [-uT -s1 uT s2] // linear
//     [0   -1   0  1] // angular
//
// u = perp
// s1 = cross(d + r1, u), s2 = cross(r2, u)
// a1 = cross(d + r1, v), a2 = cross(r2, v)

export class b2PrismaticJoint extends b2Joint {
  public readonly m_localAnchorA: b2Vec2 = new b2Vec2();
  public readonly m_localAnchorB: b2Vec2 = new b2Vec2();
  public readonly m_localXAxisA: b2Vec2 = new b2Vec2();
  public readonly m_localYAxisA: b2Vec2 = new b2Vec2();
  public m_referenceAngle: number = 0;
  public readonly m_impulse: b2Vec2 = new b2Vec2(0, 0);
  public m_motorImpulse: number = 0;
  public m_lowerImpulse: number = 0;
  public m_upperImpulse: number = 0;
  public m_lowerTranslation: number = 0;
  public m_upperTranslation: number = 0;
  public m_maxMotorForce: number = 0;
  public m_motorSpeed: number = 0;
  public m_enableLimit: boolean = false;
  public m_enableMotor: boolean = false;

  // Solver temp
  public m_indexA: number = 0;
  public m_indexB: number = 0;
  public readonly m_localCenterA: b2Vec2 = new b2Vec2();
  public readonly m_localCenterB: b2Vec2 = new b2Vec2();
  public m_invMassA: number = 0;
  public m_invMassB: number = 0;
  public m_invIA: number = 0;
  public m_invIB: number = 0;
  public readonly m_axis: b2Vec2 = new b2Vec2(0, 0);
  public readonly m_perp: b2Vec2 = new b2Vec2(0, 0);
  public m_s1: number = 0;
  public m_s2: number = 0;
  public m_a1: number = 0;
  public m_a2: number = 0;
  public readonly m_K: b2Mat22 = new b2Mat22();
  public readonly m_K3: b2Mat33 = new b2Mat33();
  public readonly m_K2: b2Mat22 = new b2Mat22();
  public m_translation: number = 0;
  public m_axialMass: number = 0;

  public readonly m_qA: b2Rot = new b2Rot();
  public readonly m_qB: b2Rot = new b2Rot();
  public readonly m_lalcA: b2Vec2 = new b2Vec2();
  public readonly m_lalcB: b2Vec2 = new b2Vec2();
  public readonly m_rA: b2Vec2 = new b2Vec2();
  public readonly m_rB: b2Vec2 = new b2Vec2();

  constructor(def: b2IPrismaticJointDef) {
    super(def);

    this.m_localAnchorA.Copy(b2Maybe(def.localAnchorA, b2Vec2.ZERO));
    this.m_localAnchorB.Copy(b2Maybe(def.localAnchorB, b2Vec2.ZERO));
    this.m_localXAxisA.Copy(b2Maybe(def.localAxisA, new b2Vec2(1, 0))).SelfNormalize();
    b2Vec2.CrossOneV(this.m_localXAxisA, this.m_localYAxisA);
    this.m_referenceAngle = b2Maybe(def.referenceAngle, 0);
    this.m_lowerTranslation = b2Maybe(def.lowerTranslation, 0);
    this.m_upperTranslation = b2Maybe(def.upperTranslation, 0);
    // b2Assert(this.m_lowerTranslation <= this.m_upperTranslation);
    this.m_maxMotorForce = b2Maybe(def.maxMotorForce, 0);
    this.m_motorSpeed = b2Maybe(def.motorSpeed, 0);
    this.m_enableLimit = b2Maybe(def.enableLimit, false);
    this.m_enableMotor = b2Maybe(def.enableMotor, false);
  }

  private static InitVelocityConstraints_s_d = new b2Vec2();
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

    const cA: b2Vec2 = data.positions[this.m_indexA].c;
    const aA: number = data.positions[this.m_indexA].a;
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;

    const cB: b2Vec2 = data.positions[this.m_indexB].c;
    const aB: number = data.positions[this.m_indexB].a;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    // Compute the effective masses.
    // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
    const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
    // b2Vec2 d = (cB - cA) + rB - rA;
    const d: b2Vec2 = b2Vec2.AddVV(
      b2Vec2.SubVV(cB, cA, b2Vec2.s_t0),
      b2Vec2.SubVV(rB, rA, b2Vec2.s_t1),
      b2PrismaticJoint.InitVelocityConstraints_s_d);

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    // Compute motor Jacobian and effective mass.
    {
      // m_axis = b2Mul(qA, m_localXAxisA);
      b2Rot.MulRV(qA, this.m_localXAxisA, this.m_axis);
      // m_a1 = b2Cross(d + rA, m_axis);
      this.m_a1 = b2Vec2.CrossVV(b2Vec2.AddVV(d, rA, b2Vec2.s_t0), this.m_axis);
      // m_a2 = b2Cross(rB, m_axis);
      this.m_a2 = b2Vec2.CrossVV(rB, this.m_axis);

      this.m_axialMass = mA + mB + iA * this.m_a1 * this.m_a1 + iB * this.m_a2 * this.m_a2;
      if (this.m_axialMass > 0) {
        this.m_axialMass = 1 / this.m_axialMass;
      }
    }

    // Prismatic constraint.
    {
      // m_perp = b2Mul(qA, m_localYAxisA);
      b2Rot.MulRV(qA, this.m_localYAxisA, this.m_perp);

      // m_s1 = b2Cross(d + rA, m_perp);
      this.m_s1 = b2Vec2.CrossVV(b2Vec2.AddVV(d, rA, b2Vec2.s_t0), this.m_perp);
      // m_s2 = b2Cross(rB, m_perp);
      this.m_s2 = b2Vec2.CrossVV(rB, this.m_perp);

      // float32 k11 = mA + mB + iA * m_s1 * m_s1 + iB * m_s2 * m_s2;
      this.m_K.ex.x = mA + mB + iA * this.m_s1 * this.m_s1 + iB * this.m_s2 * this.m_s2;
      // float32 k12 = iA * m_s1 + iB * m_s2;
      this.m_K.ex.y = iA * this.m_s1 + iB * this.m_s2;
      this.m_K.ey.x = this.m_K.ex.y;
      // float32 k22 = iA + iB;
      this.m_K.ey.y = iA + iB;
      if (this.m_K.ey.y === 0) {
        // For bodies with fixed rotation.
        this.m_K.ey.y = 1;
      }

      // m_K.ex.Set(k11, k12);
      // m_K.ey.Set(k12, k22);
    }

    // Compute motor and limit terms.
    if (this.m_enableLimit) {
      this.m_translation = b2Vec2.DotVV(this.m_axis, d);
    } else {
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }

    if (!this.m_enableMotor) {
      this.m_motorImpulse = 0;
    }

    if (data.step.warmStarting) {
      // Account for variable time step.
      // m_impulse *= data.step.dtRatio;
      this.m_impulse.SelfMul(data.step.dtRatio);
      this.m_motorImpulse *= data.step.dtRatio;
      this.m_lowerImpulse *= data.step.dtRatio;
      this.m_upperImpulse *= data.step.dtRatio;

      const axialImpulse: number = this.m_motorImpulse + this.m_lowerImpulse - this.m_upperImpulse;
      // b2Vec2 P = m_impulse.x * m_perp + axialImpulse * m_axis;
      const P: b2Vec2 = b2Vec2.AddVV(
        b2Vec2.MulSV(this.m_impulse.x, this.m_perp, b2Vec2.s_t0),
        b2Vec2.MulSV(axialImpulse, this.m_axis, b2Vec2.s_t1),
        b2PrismaticJoint.InitVelocityConstraints_s_P);
      // float LA = m_impulse.x * m_s1 + m_impulse.y + axialImpulse * m_a1;
      const LA = this.m_impulse.x * this.m_s1 + this.m_impulse.y + axialImpulse * this.m_a1;
      // float LB = m_impulse.x * m_s2 + m_impulse.y + axialImpulse * m_a2;
      const LB = this.m_impulse.x * this.m_s2 + this.m_impulse.y + axialImpulse * this.m_a2;

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * LA;

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * LB;
    } else {
      this.m_impulse.SetZero();
      this.m_motorImpulse = 0.0;
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolveVelocityConstraints_s_P = new b2Vec2();
  // private static SolveVelocityConstraints_s_f2r = new b2Vec2();
  // private static SolveVelocityConstraints_s_f1 = new b2Vec3();
  // private static SolveVelocityConstraints_s_df3 = new b2Vec3();
  private static SolveVelocityConstraints_s_df = new b2Vec2();
  public SolveVelocityConstraints(data: b2SolverData): void {
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    // Solve linear motor constraint.
    if (this.m_enableMotor) {
      // float32 Cdot = b2Dot(m_axis, vB - vA) + m_a2 * wB - m_a1 * wA;
      const Cdot: number = b2Vec2.DotVV(this.m_axis, b2Vec2.SubVV(vB, vA, b2Vec2.s_t0)) + this.m_a2 * wB - this.m_a1 * wA;
      let impulse = this.m_axialMass * (this.m_motorSpeed - Cdot);
      const oldImpulse = this.m_motorImpulse;
      const maxImpulse = data.step.dt * this.m_maxMotorForce;
      this.m_motorImpulse = b2Clamp(this.m_motorImpulse + impulse, (-maxImpulse), maxImpulse);
      impulse = this.m_motorImpulse - oldImpulse;

      // b2Vec2 P = impulse * m_axis;
      const P: b2Vec2 = b2Vec2.MulSV(impulse, this.m_axis, b2PrismaticJoint.SolveVelocityConstraints_s_P);
      const LA = impulse * this.m_a1;
      const LB = impulse * this.m_a2;

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * LA;
      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * LB;
    }

    if (this.m_enableLimit) {
      // Lower limit
      {
        const C: number = this.m_translation - this.m_lowerTranslation;
        const Cdot: number = b2Vec2.DotVV(this.m_axis, b2Vec2.SubVV(vB, vA, b2Vec2.s_t0)) + this.m_a2 * wB - this.m_a1 * wA;
        let impulse: number = -this.m_axialMass * (Cdot + b2Max(C, 0.0) * data.step.inv_dt);
        const oldImpulse: number = this.m_lowerImpulse;
        this.m_lowerImpulse = b2Max(this.m_lowerImpulse + impulse, 0.0);
        impulse = this.m_lowerImpulse - oldImpulse;

        // b2Vec2 P = impulse * this.m_axis;
        const P: b2Vec2 = b2Vec2.MulSV(impulse, this.m_axis, b2PrismaticJoint.SolveVelocityConstraints_s_P);
        const LA: number = impulse * this.m_a1;
        const LB: number = impulse * this.m_a2;

        // vA -= mA * P;
        vA.SelfMulSub(mA, P);
        wA -= iA * LA;
        // vB += mB * P;
        vB.SelfMulAdd(mB, P);
        wB += iB * LB;
      }

      // Upper limit
      // Note: signs are flipped to keep C positive when the constraint is satisfied.
      // This also keeps the impulse positive when the limit is active.
      {
        const C: number = this.m_upperTranslation - this.m_translation;
        const Cdot: number = b2Vec2.DotVV(this.m_axis, b2Vec2.SubVV(vA, vB, b2Vec2.s_t0)) + this.m_a1 * wA - this.m_a2 * wB;
        let impulse: number = -this.m_axialMass * (Cdot + b2Max(C, 0.0) * data.step.inv_dt);
        const oldImpulse: number = this.m_upperImpulse;
        this.m_upperImpulse = b2Max(this.m_upperImpulse + impulse, 0.0);
        impulse = this.m_upperImpulse - oldImpulse;

        // b2Vec2 P = impulse * this.m_axis;
        const P: b2Vec2 = b2Vec2.MulSV(impulse, this.m_axis, b2PrismaticJoint.SolveVelocityConstraints_s_P);
        const LA: number = impulse * this.m_a1;
        const LB: number = impulse * this.m_a2;

        // vA += mA * P;
        vA.SelfMulAdd(mA, P);
        wA += iA * LA;
        // vB -= mB * P;
        vB.SelfMulSub(mB, P);
        wB -= iB * LB;
      }
    }

    // Solve the prismatic constraint in block form.
    {
      // b2Vec2 Cdot;
      // Cdot.x = b2Dot(m_perp, vB - vA) + m_s2 * wB - m_s1 * wA;
      const Cdot_x: number = b2Vec2.DotVV(this.m_perp, b2Vec2.SubVV(vB, vA, b2Vec2.s_t0)) + this.m_s2 * wB - this.m_s1 * wA;
      // Cdot.y = wB - wA;
      const Cdot_y = wB - wA;

      // b2Vec2 df = m_K.Solve(-Cdot);
      const df = this.m_K.Solve(-Cdot_x, -Cdot_y, b2PrismaticJoint.SolveVelocityConstraints_s_df);
      // m_impulse += df;
      this.m_impulse.SelfAdd(df);

      // b2Vec2 P = df.x * m_perp;
      const P: b2Vec2 = b2Vec2.MulSV(df.x, this.m_perp, b2PrismaticJoint.SolveVelocityConstraints_s_P);
      // float32 LA = df.x * m_s1 + df.y;
      const LA = df.x * this.m_s1 + df.y;
      // float32 LB = df.x * m_s2 + df.y;
      const LB = df.x * this.m_s2 + df.y;

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * LA;

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * LB;
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  // A velocity based solver computes reaction forces(impulses) using the velocity constraint solver.Under this context,
  // the position solver is not there to resolve forces.It is only there to cope with integration error.
  //
  // Therefore, the pseudo impulses in the position solver do not have any physical meaning.Thus it is okay if they suck.
  //
  // We could take the active state from the velocity solver.However, the joint might push past the limit when the velocity
  // solver indicates the limit is inactive.
  private static SolvePositionConstraints_s_d = new b2Vec2();
  private static SolvePositionConstraints_s_impulse = new b2Vec3();
  private static SolvePositionConstraints_s_impulse1 = new b2Vec2();
  private static SolvePositionConstraints_s_P = new b2Vec2();
  public SolvePositionConstraints(data: b2SolverData): boolean {
    const cA: b2Vec2 = data.positions[this.m_indexA].c;
    let aA: number = data.positions[this.m_indexA].a;
    const cB: b2Vec2 = data.positions[this.m_indexB].c;
    let aB: number = data.positions[this.m_indexB].a;

    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
    // b2Vec2 d = cB + rB - cA - rA;
    const d: b2Vec2 = b2Vec2.SubVV(
      b2Vec2.AddVV(cB, rB, b2Vec2.s_t0),
      b2Vec2.AddVV(cA, rA, b2Vec2.s_t1),
      b2PrismaticJoint.SolvePositionConstraints_s_d);

    // b2Vec2 axis = b2Mul(qA, m_localXAxisA);
    const axis: b2Vec2 = b2Rot.MulRV(qA, this.m_localXAxisA, this.m_axis);
    // float32 a1 = b2Cross(d + rA, axis);
    const a1 = b2Vec2.CrossVV(b2Vec2.AddVV(d, rA, b2Vec2.s_t0), axis);
    // float32 a2 = b2Cross(rB, axis);
    const a2 = b2Vec2.CrossVV(rB, axis);
    // b2Vec2 perp = b2Mul(qA, m_localYAxisA);
    const perp: b2Vec2 = b2Rot.MulRV(qA, this.m_localYAxisA, this.m_perp);

    // float32 s1 = b2Cross(d + rA, perp);
    const s1 = b2Vec2.CrossVV(b2Vec2.AddVV(d, rA, b2Vec2.s_t0), perp);
    // float32 s2 = b2Cross(rB, perp);
    const s2 = b2Vec2.CrossVV(rB, perp);

    // b2Vec3 impulse;
    let impulse = b2PrismaticJoint.SolvePositionConstraints_s_impulse;
    // b2Vec2 C1;
    // C1.x = b2Dot(perp, d);
    const C1_x: number = b2Vec2.DotVV(perp, d);
    // C1.y = aB - aA - m_referenceAngle;
    const C1_y = aB - aA - this.m_referenceAngle;

    let linearError = b2Abs(C1_x);
    const angularError = b2Abs(C1_y);

    let active = false;
    let C2: number = 0;
    if (this.m_enableLimit) {
      // float32 translation = b2Dot(axis, d);
      const translation: number = b2Vec2.DotVV(axis, d);
      if (b2Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2 * b2_linearSlop) {
        C2 = translation;
        linearError = b2Max(linearError, b2Abs(translation));
        active = true;
      } else if (translation <= this.m_lowerTranslation) {
        C2 = b2Min(translation - this.m_lowerTranslation, 0.0);
        linearError = b2Max(linearError, this.m_lowerTranslation - translation);
        active = true;
      } else if (translation >= this.m_upperTranslation) {
        C2 = b2Max(translation - this.m_upperTranslation, 0.0);
        linearError = b2Max(linearError, translation - this.m_upperTranslation);
        active = true;
      }
    }

    if (active) {
      // float32 k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
      const k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
      // float32 k12 = iA * s1 + iB * s2;
      const k12 = iA * s1 + iB * s2;
      // float32 k13 = iA * s1 * a1 + iB * s2 * a2;
      const k13 = iA * s1 * a1 + iB * s2 * a2;
      // float32 k22 = iA + iB;
      let k22 = iA + iB;
      if (k22 === 0) {
        // For fixed rotation
        k22 = 1;
      }
      // float32 k23 = iA * a1 + iB * a2;
      const k23 = iA * a1 + iB * a2;
      // float32 k33 = mA + mB + iA * a1 * a1 + iB * a2 * a2;
      const k33 = mA + mB + iA * a1 * a1 + iB * a2 * a2;

      // b2Mat33 K;
      const K = this.m_K3;
      // K.ex.Set(k11, k12, k13);
      K.ex.SetXYZ(k11, k12, k13);
      // K.ey.Set(k12, k22, k23);
      K.ey.SetXYZ(k12, k22, k23);
      // K.ez.Set(k13, k23, k33);
      K.ez.SetXYZ(k13, k23, k33);

      // b2Vec3 C;
      // C.x = C1.x;
      // C.y = C1.y;
      // C.z = C2;

      // impulse = K.Solve33(-C);
      impulse = K.Solve33((-C1_x), (-C1_y), (-C2), impulse);
    } else {
      // float32 k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
      const k11 = mA + mB + iA * s1 * s1 + iB * s2 * s2;
      // float32 k12 = iA * s1 + iB * s2;
      const k12 = iA * s1 + iB * s2;
      // float32 k22 = iA + iB;
      let k22 = iA + iB;
      if (k22 === 0) {
        k22 = 1;
      }

      // b2Mat22 K;
      const K2 = this.m_K2;
      // K.ex.Set(k11, k12);
      K2.ex.Set(k11, k12);
      // K.ey.Set(k12, k22);
      K2.ey.Set(k12, k22);

      // b2Vec2 impulse1 = K.Solve(-C1);
      const impulse1 = K2.Solve((-C1_x), (-C1_y), b2PrismaticJoint.SolvePositionConstraints_s_impulse1);
      impulse.x = impulse1.x;
      impulse.y = impulse1.y;
      impulse.z = 0;
    }

    // b2Vec2 P = impulse.x * perp + impulse.z * axis;
    const P: b2Vec2 = b2Vec2.AddVV(
      b2Vec2.MulSV(impulse.x, perp, b2Vec2.s_t0),
      b2Vec2.MulSV(impulse.z, axis, b2Vec2.s_t1),
      b2PrismaticJoint.SolvePositionConstraints_s_P);
    // float32 LA = impulse.x * s1 + impulse.y + impulse.z * a1;
    const LA = impulse.x * s1 + impulse.y + impulse.z * a1;
    // float32 LB = impulse.x * s2 + impulse.y + impulse.z * a2;
    const LB = impulse.x * s2 + impulse.y + impulse.z * a2;

    // cA -= mA * P;
    cA.SelfMulSub(mA, P);
    aA -= iA * LA;
    // cB += mB * P;
    cB.SelfMulAdd(mB, P);
    aB += iB * LB;

    // data.positions[this.m_indexA].c = cA;
    data.positions[this.m_indexA].a = aA;
    // data.positions[this.m_indexB].c = cB;
    data.positions[this.m_indexB].a = aB;

    return linearError <= b2_linearSlop && angularError <= b2_angularSlop;
  }

  public GetAnchorA<T extends XY>(out: T): T {
    return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
  }

  public GetAnchorB<T extends XY>(out: T): T {
    return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
  }

  public GetReactionForce<T extends XY>(inv_dt: number, out: T): T {
    out.x = inv_dt * (this.m_impulse.x * this.m_perp.x + (this.m_motorImpulse + this.m_lowerImpulse - this.m_upperImpulse) * this.m_axis.x);
    out.y = inv_dt * (this.m_impulse.y * this.m_perp.y + (this.m_motorImpulse + this.m_lowerImpulse - this.m_upperImpulse) * this.m_axis.y);
    return out;
  }

  public GetReactionTorque(inv_dt: number): number {
    return inv_dt * this.m_impulse.y;
  }

  public GetLocalAnchorA(): Readonly<b2Vec2> { return this.m_localAnchorA; }

  public GetLocalAnchorB(): Readonly<b2Vec2> { return this.m_localAnchorB; }

  public GetLocalAxisA(): Readonly<b2Vec2> { return this.m_localXAxisA; }

  public GetReferenceAngle() { return this.m_referenceAngle; }

  private static GetJointTranslation_s_pA = new b2Vec2();
  private static GetJointTranslation_s_pB = new b2Vec2();
  private static GetJointTranslation_s_d = new b2Vec2();
  private static GetJointTranslation_s_axis = new b2Vec2();
  public GetJointTranslation(): number {
    // b2Vec2 pA = m_bodyA.GetWorldPoint(m_localAnchorA);
    const pA = this.m_bodyA.GetWorldPoint(this.m_localAnchorA, b2PrismaticJoint.GetJointTranslation_s_pA);
    // b2Vec2 pB = m_bodyB.GetWorldPoint(m_localAnchorB);
    const pB = this.m_bodyB.GetWorldPoint(this.m_localAnchorB, b2PrismaticJoint.GetJointTranslation_s_pB);
    // b2Vec2 d = pB - pA;
    const d: b2Vec2 = b2Vec2.SubVV(pB, pA, b2PrismaticJoint.GetJointTranslation_s_d);
    // b2Vec2 axis = m_bodyA.GetWorldVector(m_localXAxisA);
    const axis = this.m_bodyA.GetWorldVector(this.m_localXAxisA, b2PrismaticJoint.GetJointTranslation_s_axis);

    // float32 translation = b2Dot(d, axis);
    const translation: number = b2Vec2.DotVV(d, axis);
    return translation;
  }

  public GetJointSpeed(): number {
    const bA: b2Body = this.m_bodyA;
    const bB: b2Body = this.m_bodyB;

    // b2Vec2 rA = b2Mul(bA->m_xf.q, m_localAnchorA - bA->m_sweep.localCenter);
    b2Vec2.SubVV(this.m_localAnchorA, bA.m_sweep.localCenter, this.m_lalcA);
    const rA: b2Vec2 = b2Rot.MulRV(bA.m_xf.q, this.m_lalcA, this.m_rA);
    // b2Vec2 rB = b2Mul(bB->m_xf.q, m_localAnchorB - bB->m_sweep.localCenter);
    b2Vec2.SubVV(this.m_localAnchorB, bB.m_sweep.localCenter, this.m_lalcB);
    const rB: b2Vec2 = b2Rot.MulRV(bB.m_xf.q, this.m_lalcB, this.m_rB);
    // b2Vec2 pA = bA->m_sweep.c + rA;
    const pA: b2Vec2 = b2Vec2.AddVV(bA.m_sweep.c, rA, b2Vec2.s_t0); // pA uses s_t0
    // b2Vec2 pB = bB->m_sweep.c + rB;
    const pB: b2Vec2 = b2Vec2.AddVV(bB.m_sweep.c, rB, b2Vec2.s_t1); // pB uses s_t1
    // b2Vec2 d = pB - pA;
    const d: b2Vec2 = b2Vec2.SubVV(pB, pA, b2Vec2.s_t2); // d uses s_t2
    // b2Vec2 axis = b2Mul(bA.m_xf.q, m_localXAxisA);
    const axis = bA.GetWorldVector(this.m_localXAxisA, this.m_axis);

    const vA = bA.m_linearVelocity;
    const vB = bB.m_linearVelocity;
    const wA = bA.m_angularVelocity;
    const wB = bB.m_angularVelocity;

    // float32 speed = b2Dot(d, b2Cross(wA, axis)) + b2Dot(axis, vB + b2Cross(wB, rB) - vA - b2Cross(wA, rA));
    const speed =
      b2Vec2.DotVV(d, b2Vec2.CrossSV(wA, axis, b2Vec2.s_t0)) +
      b2Vec2.DotVV(
        axis,
        b2Vec2.SubVV(
          b2Vec2.AddVCrossSV(vB, wB, rB, b2Vec2.s_t0),
          b2Vec2.AddVCrossSV(vA, wA, rA, b2Vec2.s_t1),
          b2Vec2.s_t0));
    return speed;
  }

  public IsLimitEnabled() {
    return this.m_enableLimit;
  }

  public EnableLimit(flag: boolean) {
    if (flag !== this.m_enableLimit) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_enableLimit = flag;
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }
  }

  public GetLowerLimit() {
    return this.m_lowerTranslation;
  }

  public GetUpperLimit() {
    return this.m_upperTranslation;
  }

  public SetLimits(lower: number, upper: number): void {
    if (lower !== this.m_lowerTranslation || upper !== this.m_upperTranslation) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_lowerTranslation = lower;
      this.m_upperTranslation = upper;
      this.m_lowerImpulse = 0.0;
      this.m_upperImpulse = 0.0;
    }
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

  public SetMotorSpeed(speed: number): void {
    if (speed !== this.m_motorSpeed) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_motorSpeed = speed;
    }
  }

  public GetMotorSpeed() {
    return this.m_motorSpeed;
  }

  public SetMaxMotorForce(force: number): void {
    if (force !== this.m_maxMotorForce) {
      this.m_bodyA.SetAwake(true);
      this.m_bodyB.SetAwake(true);
      this.m_maxMotorForce = force;
    }
  }

  public GetMaxMotorForce(): number { return this.m_maxMotorForce; }

  public GetMotorForce(inv_dt: number): number {
    return inv_dt * this.m_motorImpulse;
  }

  public override Dump(log: (format: string, ...args: any[]) => void) {
    const indexA = this.m_bodyA.m_islandIndex;
    const indexB = this.m_bodyB.m_islandIndex;

    log("  const jd: b2PrismaticJointDef = new b2PrismaticJointDef();\n");
    log("  jd.bodyA = bodies[%d];\n", indexA);
    log("  jd.bodyB = bodies[%d];\n", indexB);
    log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
    log("  jd.localAnchorA.Set(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
    log("  jd.localAnchorB.Set(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
    log("  jd.localAxisA.Set(%.15f, %.15f);\n", this.m_localXAxisA.x, this.m_localXAxisA.y);
    log("  jd.referenceAngle = %.15f;\n", this.m_referenceAngle);
    log("  jd.enableLimit = %s;\n", (this.m_enableLimit) ? ("true") : ("false"));
    log("  jd.lowerTranslation = %.15f;\n", this.m_lowerTranslation);
    log("  jd.upperTranslation = %.15f;\n", this.m_upperTranslation);
    log("  jd.enableMotor = %s;\n", (this.m_enableMotor) ? ("true") : ("false"));
    log("  jd.motorSpeed = %.15f;\n", this.m_motorSpeed);
    log("  jd.maxMotorForce = %.15f;\n", this.m_maxMotorForce);
    log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
  }

  private static Draw_s_pA = new b2Vec2();
  private static Draw_s_pB = new b2Vec2();
  private static Draw_s_axis = new b2Vec2();
  private static Draw_s_c1 = new b2Color(0.7, 0.7, 0.7);
  private static Draw_s_c2 = new b2Color(0.3, 0.9, 0.3);
  private static Draw_s_c3 = new b2Color(0.9, 0.3, 0.3);
  private static Draw_s_c4 = new b2Color(0.3, 0.3, 0.9);
  private static Draw_s_c5 = new b2Color(0.4, 0.4, 0.4);
  private static Draw_s_lower = new b2Vec2();
  private static Draw_s_upper = new b2Vec2();
  private static Draw_s_perp = new b2Vec2();
  public override Draw(draw: b2Draw): void {
    const xfA: Readonly<b2Transform> = this.m_bodyA.GetTransform();
    const xfB: Readonly<b2Transform> = this.m_bodyB.GetTransform();
    const pA = b2Transform.MulXV(xfA, this.m_localAnchorA, b2PrismaticJoint.Draw_s_pA);
    const pB = b2Transform.MulXV(xfB, this.m_localAnchorB, b2PrismaticJoint.Draw_s_pB);

    // b2Vec2 axis = b2Mul(xfA.q, m_localXAxisA);
    const axis: b2Vec2 = b2Rot.MulRV(xfA.q, this.m_localXAxisA, b2PrismaticJoint.Draw_s_axis);

    const c1 = b2PrismaticJoint.Draw_s_c1; // b2Color c1(0.7f, 0.7f, 0.7f);
    const c2 = b2PrismaticJoint.Draw_s_c2; // b2Color c2(0.3f, 0.9f, 0.3f);
    const c3 = b2PrismaticJoint.Draw_s_c3; // b2Color c3(0.9f, 0.3f, 0.3f);
    const c4 = b2PrismaticJoint.Draw_s_c4; // b2Color c4(0.3f, 0.3f, 0.9f);
    const c5 = b2PrismaticJoint.Draw_s_c5; // b2Color c5(0.4f, 0.4f, 0.4f);

    draw.DrawSegment(pA, pB, c5);

    if (this.m_enableLimit) {
      // b2Vec2 lower = pA + m_lowerTranslation * axis;
      const lower = b2Vec2.AddVMulSV(pA, this.m_lowerTranslation, axis, b2PrismaticJoint.Draw_s_lower);
      // b2Vec2 upper = pA + m_upperTranslation * axis;
      const upper = b2Vec2.AddVMulSV(pA, this.m_upperTranslation, axis, b2PrismaticJoint.Draw_s_upper);
      // b2Vec2 perp = b2Mul(xfA.q, m_localYAxisA);
      const perp = b2Rot.MulRV(xfA.q, this.m_localYAxisA, b2PrismaticJoint.Draw_s_perp);
      draw.DrawSegment(lower, upper, c1);
      // draw.DrawSegment(lower - 0.5 * perp, lower + 0.5 * perp, c2);
      draw.DrawSegment(b2Vec2.AddVMulSV(lower, -0.5, perp, b2Vec2.s_t0), b2Vec2.AddVMulSV(lower, 0.5, perp, b2Vec2.s_t1), c2);
      // draw.DrawSegment(upper - 0.5 * perp, upper + 0.5 * perp, c3);
      draw.DrawSegment(b2Vec2.AddVMulSV(upper, -0.5, perp, b2Vec2.s_t0), b2Vec2.AddVMulSV(upper, 0.5, perp, b2Vec2.s_t1), c3);
    } else {
      // draw.DrawSegment(pA - 1.0 * axis, pA + 1.0 * axis, c1);
      draw.DrawSegment(b2Vec2.AddVMulSV(pA, -1.0, axis, b2Vec2.s_t0), b2Vec2.AddVMulSV(pA, 1.0, axis, b2Vec2.s_t1), c1);
    }

    draw.DrawPoint(pA, 5.0, c1);
    draw.DrawPoint(pB, 5.0, c4);
  }
}
