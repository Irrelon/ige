/*
* Copyright (c) 2006-2007 Erin Catto http://www.box2d.org
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

import { b2Maybe } from "../common/b2_settings.js";
import { b2Clamp, b2Vec2, b2Mat22, b2Rot, XY } from "../common/b2_math.js";
import { b2Joint, b2JointDef, b2JointType, b2IJointDef } from "./b2_joint.js";
import { b2SolverData } from "./b2_time_step.js";
import { b2Body } from "./b2_body.js";

export interface b2IFrictionJointDef extends b2IJointDef {
  localAnchorA?: XY;

  localAnchorB?: XY;

  maxForce?: number;

  maxTorque?: number;
}

/// Friction joint definition.
export class b2FrictionJointDef extends b2JointDef implements b2IFrictionJointDef {
  public readonly localAnchorA: b2Vec2 = new b2Vec2();

  public readonly localAnchorB: b2Vec2 = new b2Vec2();

  public maxForce: number = 0;

  public maxTorque: number = 0;

  constructor() {
    super(b2JointType.e_frictionJoint);
  }

  public Initialize(bA: b2Body, bB: b2Body, anchor: XY): void {
    this.bodyA = bA;
    this.bodyB = bB;
    this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
    this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
  }
}

export class b2FrictionJoint extends b2Joint {
  public readonly m_localAnchorA: b2Vec2 = new b2Vec2();
  public readonly m_localAnchorB: b2Vec2 = new b2Vec2();

  // Solver shared
  public readonly m_linearImpulse: b2Vec2 = new b2Vec2();
  public m_angularImpulse: number = 0;
  public m_maxForce: number = 0;
  public m_maxTorque: number = 0;

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
  public readonly m_linearMass: b2Mat22 = new b2Mat22();
  public m_angularMass: number = 0;

  public readonly m_qA: b2Rot = new b2Rot();
  public readonly m_qB: b2Rot = new b2Rot();
  public readonly m_lalcA: b2Vec2 = new b2Vec2();
  public readonly m_lalcB: b2Vec2 = new b2Vec2();
  public readonly m_K: b2Mat22 = new b2Mat22();

  constructor(def: b2IFrictionJointDef) {
    super(def);

    this.m_localAnchorA.Copy(b2Maybe(def.localAnchorA, b2Vec2.ZERO));
    this.m_localAnchorB.Copy(b2Maybe(def.localAnchorB, b2Vec2.ZERO));

    this.m_linearImpulse.SetZero();
    this.m_maxForce = b2Maybe(def.maxForce, 0);
    this.m_maxTorque = b2Maybe(def.maxTorque, 0);

    this.m_linearMass.SetZero();
  }

  public InitVelocityConstraints(data: b2SolverData): void {
    this.m_indexA = this.m_bodyA.m_islandIndex;
    this.m_indexB = this.m_bodyB.m_islandIndex;
    this.m_localCenterA.Copy(this.m_bodyA.m_sweep.localCenter);
    this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
    this.m_invMassA = this.m_bodyA.m_invMass;
    this.m_invMassB = this.m_bodyB.m_invMass;
    this.m_invIA = this.m_bodyA.m_invI;
    this.m_invIB = this.m_bodyB.m_invI;

    // const cA: b2Vec2 = data.positions[this.m_indexA].c;
    const aA: number = data.positions[this.m_indexA].a;
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;

    // const cB: b2Vec2 = data.positions[this.m_indexB].c;
    const aB: number = data.positions[this.m_indexB].a;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    // const qA: b2Rot = new b2Rot(aA), qB: b2Rot = new b2Rot(aB);
    const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);

    // Compute the effective mass matrix.
    // m_rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
    b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
    const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
    // m_rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

    // J = [-I -r1_skew I r2_skew]
    //     [ 0       -1 0       1]
    // r_skew = [-ry; rx]

    // Matlab
    // K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x,          -r1y*iA-r2y*iB]
    //     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB,           r1x*iA+r2x*iB]
    //     [          -r1y*iA-r2y*iB,           r1x*iA+r2x*iB,                   iA+iB]

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    const K: b2Mat22 = this.m_K; // new b2Mat22();
    K.ex.x = mA + mB + iA * rA.y * rA.y + iB * rB.y * rB.y;
    K.ex.y = -iA * rA.x * rA.y - iB * rB.x * rB.y;
    K.ey.x = K.ex.y;
    K.ey.y = mA + mB + iA * rA.x * rA.x + iB * rB.x * rB.x;

    K.GetInverse(this.m_linearMass);

    this.m_angularMass = iA + iB;
    if (this.m_angularMass > 0) {
      this.m_angularMass = 1 / this.m_angularMass;
    }

    if (data.step.warmStarting) {
      // Scale impulses to support a variable time step.
      // m_linearImpulse *= data.step.dtRatio;
      this.m_linearImpulse.SelfMul(data.step.dtRatio);
      this.m_angularImpulse *= data.step.dtRatio;

      // const P: b2Vec2(m_linearImpulse.x, m_linearImpulse.y);
      const P: b2Vec2 = this.m_linearImpulse;

      // vA -= mA * P;
      vA.SelfMulSub(mA, P);
      // wA -= iA * (b2Cross(m_rA, P) + m_angularImpulse);
      wA -= iA * (b2Vec2.CrossVV(this.m_rA, P) + this.m_angularImpulse);
      // vB += mB * P;
      vB.SelfMulAdd(mB, P);
      // wB += iB * (b2Cross(m_rB, P) + m_angularImpulse);
      wB += iB * (b2Vec2.CrossVV(this.m_rB, P) + this.m_angularImpulse);
    } else {
      this.m_linearImpulse.SetZero();
      this.m_angularImpulse = 0;
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolveVelocityConstraints_s_Cdot_v2 = new b2Vec2();
  private static SolveVelocityConstraints_s_impulseV = new b2Vec2();
  private static SolveVelocityConstraints_s_oldImpulseV = new b2Vec2();
  public SolveVelocityConstraints(data: b2SolverData): void {
    const vA: b2Vec2 = data.velocities[this.m_indexA].v;
    let wA: number = data.velocities[this.m_indexA].w;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const mA: number = this.m_invMassA, mB: number = this.m_invMassB;
    const iA: number = this.m_invIA, iB: number = this.m_invIB;

    const h: number = data.step.dt;

    // Solve angular friction
    {
      const Cdot: number = wB - wA;
      let impulse: number = (-this.m_angularMass * Cdot);

      const oldImpulse: number = this.m_angularImpulse;
      const maxImpulse: number = h * this.m_maxTorque;
      this.m_angularImpulse = b2Clamp(this.m_angularImpulse + impulse, (-maxImpulse), maxImpulse);
      impulse = this.m_angularImpulse - oldImpulse;

      wA -= iA * impulse;
      wB += iB * impulse;
    }

    // Solve linear friction
    {
      // b2Vec2 Cdot = vB + b2Cross(wB, m_rB) - vA - b2Cross(wA, m_rA);
      const Cdot_v2: b2Vec2 = b2Vec2.SubVV(
        b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2Vec2.s_t0),
        b2Vec2.AddVCrossSV(vA, wA, this.m_rA, b2Vec2.s_t1),
        b2FrictionJoint.SolveVelocityConstraints_s_Cdot_v2);

      // b2Vec2 impulse = -b2Mul(m_linearMass, Cdot);
      const impulseV: b2Vec2 = b2Mat22.MulMV(this.m_linearMass, Cdot_v2, b2FrictionJoint.SolveVelocityConstraints_s_impulseV).SelfNeg();
      // b2Vec2 oldImpulse = m_linearImpulse;
      const oldImpulseV = b2FrictionJoint.SolveVelocityConstraints_s_oldImpulseV.Copy(this.m_linearImpulse);
      // m_linearImpulse += impulse;
      this.m_linearImpulse.SelfAdd(impulseV);

      const maxImpulse: number = h * this.m_maxForce;

      if (this.m_linearImpulse.LengthSquared() > maxImpulse * maxImpulse) {
        this.m_linearImpulse.Normalize();
        this.m_linearImpulse.SelfMul(maxImpulse);
      }

      // impulse = m_linearImpulse - oldImpulse;
      b2Vec2.SubVV(this.m_linearImpulse, oldImpulseV, impulseV);

      // vA -= mA * impulse;
      vA.SelfMulSub(mA, impulseV);
      // wA -= iA * b2Cross(m_rA, impulse);
      wA -= iA * b2Vec2.CrossVV(this.m_rA, impulseV);

      // vB += mB * impulse;
      vB.SelfMulAdd(mB, impulseV);
      // wB += iB * b2Cross(m_rB, impulse);
      wB += iB * b2Vec2.CrossVV(this.m_rB, impulseV);
    }

    // data.velocities[this.m_indexA].v = vA;
    data.velocities[this.m_indexA].w = wA;
    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  public SolvePositionConstraints(data: b2SolverData): boolean {
    return true;
  }

  public GetAnchorA<T extends XY>(out: T): T {
    return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
  }

  public GetAnchorB<T extends XY>(out: T): T {
    return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
  }

  public GetReactionForce<T extends XY>(inv_dt: number, out: T): T {
    out.x = inv_dt * this.m_linearImpulse.x;
    out.y = inv_dt * this.m_linearImpulse.y;
    return out;
  }

  public GetReactionTorque(inv_dt: number): number {
    return inv_dt * this.m_angularImpulse;
  }

  public GetLocalAnchorA(): Readonly<b2Vec2> { return this.m_localAnchorA; }

  public GetLocalAnchorB(): Readonly<b2Vec2> { return this.m_localAnchorB; }

  public SetMaxForce(force: number): void {
    this.m_maxForce = force;
  }

  public GetMaxForce(): number {
    return this.m_maxForce;
  }

  public SetMaxTorque(torque: number): void {
    this.m_maxTorque = torque;
  }

  public GetMaxTorque(): number {
    return this.m_maxTorque;
  }

  public override Dump(log: (format: string, ...args: any[]) => void): void {
    const indexA: number = this.m_bodyA.m_islandIndex;
    const indexB: number = this.m_bodyB.m_islandIndex;

    log("  const jd: b2FrictionJointDef = new b2FrictionJointDef();\n");
    log("  jd.bodyA = bodies[%d];\n", indexA);
    log("  jd.bodyB = bodies[%d];\n", indexB);
    log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
    log("  jd.localAnchorA.Set(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
    log("  jd.localAnchorB.Set(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
    log("  jd.maxForce = %.15f;\n", this.m_maxForce);
    log("  jd.maxTorque = %.15f;\n", this.m_maxTorque);
    log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
  }
}
