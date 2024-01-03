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
import { b2Abs, b2Vec2, b2Vec3, b2Mat33, b2Rot, XY } from "../common/b2_math.js";
import { b2Body } from "./b2_body.js";
import { b2Joint, b2JointDef, b2JointType, b2IJointDef } from "./b2_joint.js";
import { b2SolverData } from "./b2_time_step.js";

export interface b2IWeldJointDef extends b2IJointDef {
  localAnchorA?: XY;

  localAnchorB?: XY;

  referenceAngle?: number;

  stiffness?: number;

  damping?: number;
}

/// Weld joint definition. You need to specify local anchor points
/// where they are attached and the relative body angle. The position
/// of the anchor points is important for computing the reaction torque.
export class b2WeldJointDef extends b2JointDef implements b2IWeldJointDef {
  public readonly localAnchorA: b2Vec2 = new b2Vec2();

  public readonly localAnchorB: b2Vec2 = new b2Vec2();

  public referenceAngle: number = 0;

  public stiffness: number = 0;

  public damping: number = 0;

  constructor() {
    super(b2JointType.e_weldJoint);
  }

  public Initialize(bA: b2Body, bB: b2Body, anchor: XY): void {
    this.bodyA = bA;
    this.bodyB = bB;
    this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
    this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
    this.referenceAngle = this.bodyB.GetAngle() - this.bodyA.GetAngle();
  }
}

export class b2WeldJoint extends b2Joint {
  public m_stiffness: number = 0;
  public m_damping: number = 0;
  public m_bias: number = 0;

  // Solver shared
  public readonly m_localAnchorA: b2Vec2 = new b2Vec2();
  public readonly m_localAnchorB: b2Vec2 = new b2Vec2();
  public m_referenceAngle: number = 0;
  public m_gamma: number = 0;
  public readonly m_impulse: b2Vec3 = new b2Vec3(0, 0, 0);

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
  public readonly m_mass: b2Mat33 = new b2Mat33();

  public readonly m_qA: b2Rot = new b2Rot();
  public readonly m_qB: b2Rot = new b2Rot();
  public readonly m_lalcA: b2Vec2 = new b2Vec2();
  public readonly m_lalcB: b2Vec2 = new b2Vec2();
  public readonly m_K: b2Mat33 = new b2Mat33();

  constructor(def: b2IWeldJointDef) {
    super(def);

    this.m_stiffness = b2Maybe(def.stiffness, 0);
    this.m_damping = b2Maybe(def.damping, 0);

    this.m_localAnchorA.Copy(b2Maybe(def.localAnchorA, b2Vec2.ZERO));
    this.m_localAnchorB.Copy(b2Maybe(def.localAnchorB, b2Vec2.ZERO));
    this.m_referenceAngle = b2Maybe(def.referenceAngle, 0);
    this.m_impulse.SetZero();
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

    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    // m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
    b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

    // J = [-I -r1_skew I r2_skew]
    //     [ 0       -1 0       1]
    // r_skew = [-ry; rx]

    // Matlab
    // K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x,          -r1y*iA-r2y*iB]
    //     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB,           r1x*iA+r2x*iB]
    //     [          -r1y*iA-r2y*iB,           r1x*iA+r2x*iB,                   iA+iB]

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    const K: b2Mat33 = this.m_K;
    K.ex.x = mA + mB + this.m_rA.y * this.m_rA.y * iA + this.m_rB.y * this.m_rB.y * iB;
    K.ey.x = -this.m_rA.y * this.m_rA.x * iA - this.m_rB.y * this.m_rB.x * iB;
    K.ez.x = -this.m_rA.y * iA - this.m_rB.y * iB;
    K.ex.y = K.ey.x;
    K.ey.y = mA + mB + this.m_rA.x * this.m_rA.x * iA + this.m_rB.x * this.m_rB.x * iB;
    K.ez.y = this.m_rA.x * iA + this.m_rB.x * iB;
    K.ex.z = K.ez.x;
    K.ey.z = K.ez.y;
    K.ez.z = iA + iB;

    if (this.m_stiffness > 0) {
      K.GetInverse22(this.m_mass);

      let invM: number = iA + iB;

      const C: number = aB - aA - this.m_referenceAngle;

      // Damping coefficient
      const d: number = this.m_damping;

      // Spring stiffness
      const k: number = this.m_stiffness;

      // magic formulas
      const h: number = data.step.dt;
      this.m_gamma = h * (d + h * k);
      this.m_gamma = this.m_gamma !== 0 ? 1 / this.m_gamma : 0;
      this.m_bias = C * h * k * this.m_gamma;

      invM += this.m_gamma;
      this.m_mass.ez.z = invM !== 0 ? 1 / invM : 0;
    } else {
      K.GetSymInverse33(this.m_mass);
      this.m_gamma = 0;
      this.m_bias = 0;
    }

    if (data.step.warmStarting) {
      // Scale impulses to support a variable time step.
      this.m_impulse.SelfMul(data.step.dtRatio);

      // b2Vec2 P(m_impulse.x, m_impulse.y);
      const P: b2Vec2 = b2WeldJoint.InitVelocityConstraints_s_P.Set(this.m_impulse.x, this.m_impulse.y);

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * (b2Vec2.CrossVV(this.m_rA, P) + this.m_impulse.z);

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * (b2Vec2.CrossVV(this.m_rB, P) + this.m_impulse.z);
    } else {
      this.m_impulse.SetZero();
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolveVelocityConstraints_s_Cdot1 = new b2Vec2();
  private static SolveVelocityConstraints_s_impulse1 = new b2Vec2();
  private static SolveVelocityConstraints_s_impulse = new b2Vec3();
  private static SolveVelocityConstraints_s_P = new b2Vec2();
  public SolveVelocityConstraints(data: b2SolverData): void {
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    if (this.m_stiffness > 0) {
      const Cdot2: number = wB - wA;

      const impulse2: number = -this.m_mass.ez.z * (Cdot2 + this.m_bias + this.m_gamma * this.m_impulse.z);
      this.m_impulse.z += impulse2;

      wA -= iA * impulse2;
      wB += iB * impulse2;

      // b2Vec2 Cdot1 = vB + b2Vec2.CrossSV(wB, this.m_rB) - vA - b2Vec2.CrossSV(wA, this.m_rA);
      const Cdot1: b2Vec2 = b2Vec2.SubVV(
        b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
        b2Vec2.AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
        b2WeldJoint.SolveVelocityConstraints_s_Cdot1);

      // b2Vec2 impulse1 = -b2Mul22(m_mass, Cdot1);
      const impulse1: b2Vec2 = b2Mat33.MulM33XY(this.m_mass, Cdot1.x, Cdot1.y, b2WeldJoint.SolveVelocityConstraints_s_impulse1).SelfNeg();
      this.m_impulse.x += impulse1.x;
      this.m_impulse.y += impulse1.y;

      // b2Vec2 P = impulse1;
      const P: b2Vec2 = impulse1;

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      // wA -= iA * b2Cross(m_rA, P);
      wA -= iA * b2Vec2.CrossVV(this.m_rA, P);

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      // wB += iB * b2Cross(m_rB, P);
      wB += iB * b2Vec2.CrossVV(this.m_rB, P);
    } else {
      // b2Vec2 Cdot1 = vB + b2Cross(wB, this.m_rB) - vA - b2Cross(wA, this.m_rA);
      const Cdot1: b2Vec2 = b2Vec2.SubVV(
        b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
        b2Vec2.AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
        b2WeldJoint.SolveVelocityConstraints_s_Cdot1);
      const Cdot2: number = wB - wA;
      // b2Vec3 const Cdot(Cdot1.x, Cdot1.y, Cdot2);

      // b2Vec3 impulse = -b2Mul(m_mass, Cdot);
      const impulse: b2Vec3 = b2Mat33.MulM33XYZ(this.m_mass, Cdot1.x, Cdot1.y, Cdot2, b2WeldJoint.SolveVelocityConstraints_s_impulse).SelfNeg();
      this.m_impulse.SelfAdd(impulse);

      // b2Vec2 P(impulse.x, impulse.y);
      const P: b2Vec2 = b2WeldJoint.SolveVelocityConstraints_s_P.Set(impulse.x, impulse.y);

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      wA -= iA * (b2Vec2.CrossVV(this.m_rA, P) + impulse.z);

      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      wB += iB * (b2Vec2.CrossVV(this.m_rB, P) + impulse.z);
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolvePositionConstraints_s_C1 = new b2Vec2();
  private static SolvePositionConstraints_s_P = new b2Vec2();
  private static SolvePositionConstraints_s_impulse = new b2Vec3();
  public SolvePositionConstraints(data: b2SolverData): boolean {
    const cA: b2Vec2 = data.positions[this.m_indexA].c;
    let aA: number = data.positions[this.m_indexA].a;
    const cB: b2Vec2 = data.positions[this.m_indexB].c;
    let aB: number = data.positions[this.m_indexB].a;

    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
    const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

    let positionError: number, angularError: number;

    const K: b2Mat33 = this.m_K;
    K.ex.x = mA + mB + rA.y * rA.y * iA + rB.y * rB.y * iB;
    K.ey.x = -rA.y * rA.x * iA - rB.y * rB.x * iB;
    K.ez.x = -rA.y * iA - rB.y * iB;
    K.ex.y = K.ey.x;
    K.ey.y = mA + mB + rA.x * rA.x * iA + rB.x * rB.x * iB;
    K.ez.y = rA.x * iA + rB.x * iB;
    K.ex.z = K.ez.x;
    K.ey.z = K.ez.y;
    K.ez.z = iA + iB;

    if (this.m_stiffness > 0) {
      // b2Vec2 C1 =  cB + rB - cA - rA;
      const C1 =
        b2Vec2.SubVV(
          b2Vec2.AddVV(cB, rB, b2Vec2.s_t0),
          b2Vec2.AddVV(cA, rA, b2Vec2.s_t1),
          b2WeldJoint.SolvePositionConstraints_s_C1);
      positionError = C1.Length();
      angularError = 0;

      // b2Vec2 P = -K.Solve22(C1);
      const P: b2Vec2 = K.Solve22(C1.x, C1.y, b2WeldJoint.SolvePositionConstraints_s_P).SelfNeg();

      // cA -= mA * P;
      cA.SelfMulSub(mA, P);
      aA -= iA * b2Vec2.CrossVV(rA, P);

      // cB += mB * P;
      cB.SelfMulAdd(mB, P);
      aB += iB * b2Vec2.CrossVV(rB, P);
    } else {
      // b2Vec2 C1 =  cB + rB - cA - rA;
      const C1 =
        b2Vec2.SubVV(
          b2Vec2.AddVV(cB, rB, b2Vec2.s_t0),
          b2Vec2.AddVV(cA, rA, b2Vec2.s_t1),
          b2WeldJoint.SolvePositionConstraints_s_C1);
      const C2: number = aB - aA - this.m_referenceAngle;

      positionError = C1.Length();
      angularError = b2Abs(C2);

      // b2Vec3 C(C1.x, C1.y, C2);

      // b2Vec3 impulse = -K.Solve33(C);
      const impulse: b2Vec3 = K.Solve33(C1.x, C1.y, C2, b2WeldJoint.SolvePositionConstraints_s_impulse).SelfNeg();

      // b2Vec2 P(impulse.x, impulse.y);
      const P: b2Vec2 = b2WeldJoint.SolvePositionConstraints_s_P.Set(impulse.x, impulse.y);

      // cA -= mA * P;
      cA.SelfMulSub(mA, P);
      aA -= iA * (b2Vec2.CrossVV(this.m_rA, P) + impulse.z);

      // cB += mB * P;
      cB.SelfMulAdd(mB, P);
      aB += iB * (b2Vec2.CrossVV(this.m_rB, P) + impulse.z);
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
    return inv_dt * this.m_impulse.z;
  }

  public GetLocalAnchorA(): Readonly<b2Vec2> { return this.m_localAnchorA; }

  public GetLocalAnchorB(): Readonly<b2Vec2> { return this.m_localAnchorB; }

  public GetReferenceAngle(): number { return this.m_referenceAngle; }

  public SetStiffness(stiffness: number): void { this.m_stiffness = stiffness; }
  public GetStiffness(): number { return this.m_stiffness; }

  public SetDamping(damping: number) { this.m_damping = damping; }
  public GetDamping() { return this.m_damping; }

  public override Dump(log: (format: string, ...args: any[]) => void) {
    const indexA = this.m_bodyA.m_islandIndex;
    const indexB = this.m_bodyB.m_islandIndex;

    log("  const jd: b2WeldJointDef = new b2WeldJointDef();\n");
    log("  jd.bodyA = bodies[%d];\n", indexA);
    log("  jd.bodyB = bodies[%d];\n", indexB);
    log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
    log("  jd.localAnchorA.Set(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
    log("  jd.localAnchorB.Set(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
    log("  jd.referenceAngle = %.15f;\n", this.m_referenceAngle);
    log("  jd.stiffness = %.15f;\n", this.m_stiffness);
    log("  jd.damping = %.15f;\n", this.m_damping);
    log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
  }
}
