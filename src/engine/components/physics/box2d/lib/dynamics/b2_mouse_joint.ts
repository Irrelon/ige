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

// DEBUG: import { b2Assert, b2_epsilon } from "../common/b2_settings.js";
// DEBUG: import { b2IsValid } from "../common/b2_math.js";
import { b2_pi, b2Maybe } from "../common/b2_settings.js";
import { b2Vec2, b2Mat22, b2Rot, b2Transform, XY } from "../common/b2_math.js";
import { b2Joint, b2JointDef, b2JointType, b2IJointDef } from "./b2_joint.js";
import { b2SolverData } from "./b2_time_step.js";

export interface b2IMouseJointDef extends b2IJointDef {
  target?: XY;

  maxForce?: number;

  stiffness?: number;

  damping?: number;
}

/// Mouse joint definition. This requires a world target point,
/// tuning parameters, and the time step.
export class b2MouseJointDef extends b2JointDef implements b2IMouseJointDef {
  public readonly target: b2Vec2 = new b2Vec2();

  public maxForce: number = 0;

  public stiffness: number = 5;

  public damping: number = 0.7;

  constructor() {
    super(b2JointType.e_mouseJoint);
  }
}

export class b2MouseJoint extends b2Joint {
  public readonly m_localAnchorB: b2Vec2 = new b2Vec2();
  public readonly m_targetA: b2Vec2 = new b2Vec2();
  public m_stiffness: number = 0;
  public m_damping: number = 0;
  public m_beta: number = 0;

  // Solver shared
  public readonly m_impulse: b2Vec2 = new b2Vec2();
  public m_maxForce: number = 0;
  public m_gamma: number = 0;

  // Solver temp
  public m_indexA: number = 0;
  public m_indexB: number = 0;
  public readonly m_rB: b2Vec2 = new b2Vec2();
  public readonly m_localCenterB: b2Vec2 = new b2Vec2();
  public m_invMassB: number = 0;
  public m_invIB: number = 0;
  public readonly m_mass: b2Mat22 = new b2Mat22();
  public readonly m_C: b2Vec2 = new b2Vec2();
  public readonly m_qB: b2Rot = new b2Rot();
  public readonly m_lalcB: b2Vec2 = new b2Vec2();
  public readonly m_K: b2Mat22 = new b2Mat22();

  constructor(def: b2IMouseJointDef) {
    super(def);

    this.m_targetA.Copy(b2Maybe(def.target, b2Vec2.ZERO));
    // DEBUG: b2Assert(this.m_targetA.IsValid());
    b2Transform.MulTXV(this.m_bodyB.GetTransform(), this.m_targetA, this.m_localAnchorB);

    this.m_maxForce = b2Maybe(def.maxForce, 0);
    // DEBUG: b2Assert(b2IsValid(this.m_maxForce) && this.m_maxForce >= 0);
    this.m_impulse.SetZero();

    this.m_stiffness = b2Maybe(def.stiffness, 0);
    // DEBUG: b2Assert(b2IsValid(this.m_stiffness) && this.m_stiffness >= 0);
    this.m_damping = b2Maybe(def.damping, 0);
    // DEBUG: b2Assert(b2IsValid(this.m_damping) && this.m_damping >= 0);

    this.m_beta = 0;
    this.m_gamma = 0;
  }

  public SetTarget(target: XY): void {
    if (!this.m_bodyB.IsAwake()) {
      this.m_bodyB.SetAwake(true);
    }
    this.m_targetA.Copy(target);
  }

  public GetTarget() {
    return this.m_targetA;
  }

  public SetMaxForce(maxForce: number): void {
    this.m_maxForce = maxForce;
  }

  public GetMaxForce() {
    return this.m_maxForce;
  }

  public SetStiffness(stiffness: number): void {
    this.m_stiffness = stiffness;
  }

  public GetStiffness() {
    return this.m_stiffness;
  }

  public SetDamping(damping: number) {
    this.m_damping = damping;
  }

  public GetDamping() {
    return this.m_damping;
  }

  public InitVelocityConstraints(data: b2SolverData): void {
    this.m_indexB = this.m_bodyB.m_islandIndex;
    this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
    this.m_invMassB = this.m_bodyB.m_invMass;
    this.m_invIB = this.m_bodyB.m_invI;

    const cB: b2Vec2 = data.positions[this.m_indexB].c;
    const aB: number = data.positions[this.m_indexB].a;
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    const qB = this.m_qB.SetAngle(aB);

    const mass: number = this.m_bodyB.GetMass();

    // Frequency
    const omega: number = 2 * b2_pi * this.m_stiffness;

    // Damping coefficient
    const d: number = 2 * mass * this.m_damping * omega;

    // Spring stiffness
    const k: number = mass * (omega * omega);

    // magic formulas
    // gamma has units of inverse mass.
    // beta has units of inverse time.
    const h: number = data.step.dt;
    this.m_gamma = h * (d + h * k);
    if (this.m_gamma !== 0) {
      this.m_gamma = 1 / this.m_gamma;
    }
    this.m_beta = h * k * this.m_gamma;

    // Compute the effective mass matrix.
    b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
    b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);

    // K    = [(1/m1 + 1/m2) * eye(2) - skew(r1) * invI1 * skew(r1) - skew(r2) * invI2 * skew(r2)]
    //      = [1/m1+1/m2     0    ] + invI1 * [r1.y*r1.y -r1.x*r1.y] + invI2 * [r1.y*r1.y -r1.x*r1.y]
    //        [    0     1/m1+1/m2]           [-r1.x*r1.y r1.x*r1.x]           [-r1.x*r1.y r1.x*r1.x]
    const K = this.m_K;
    K.ex.x = this.m_invMassB + this.m_invIB * this.m_rB.y * this.m_rB.y + this.m_gamma;
    K.ex.y = -this.m_invIB * this.m_rB.x * this.m_rB.y;
    K.ey.x = K.ex.y;
    K.ey.y = this.m_invMassB + this.m_invIB * this.m_rB.x * this.m_rB.x + this.m_gamma;

    K.GetInverse(this.m_mass);

    // m_C = cB + m_rB - m_targetA;
    this.m_C.x = cB.x + this.m_rB.x - this.m_targetA.x;
    this.m_C.y = cB.y + this.m_rB.y - this.m_targetA.y;
    // m_C *= m_beta;
    this.m_C.SelfMul(this.m_beta);

    // Cheat with some damping
    wB *= 0.98;

    if (data.step.warmStarting) {
      this.m_impulse.SelfMul(data.step.dtRatio);
      // vB += m_invMassB * m_impulse;
      vB.x += this.m_invMassB * this.m_impulse.x;
      vB.y += this.m_invMassB * this.m_impulse.y;
      wB += this.m_invIB * b2Vec2.CrossVV(this.m_rB, this.m_impulse);
    } else {
      this.m_impulse.SetZero();
    }

    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  private static SolveVelocityConstraints_s_Cdot = new b2Vec2();
  private static SolveVelocityConstraints_s_impulse = new b2Vec2();
  private static SolveVelocityConstraints_s_oldImpulse = new b2Vec2();
  public SolveVelocityConstraints(data: b2SolverData): void {
    const vB: b2Vec2 = data.velocities[this.m_indexB].v;
    let wB: number = data.velocities[this.m_indexB].w;

    // Cdot = v + cross(w, r)
    // b2Vec2 Cdot = vB + b2Cross(wB, m_rB);
    const Cdot: b2Vec2 = b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2MouseJoint.SolveVelocityConstraints_s_Cdot);
    //  b2Vec2 impulse = b2Mul(m_mass, -(Cdot + m_C + m_gamma * m_impulse));
    const impulse: b2Vec2 = b2Mat22.MulMV(
      this.m_mass,
      b2Vec2.AddVV(
        Cdot,
        b2Vec2.AddVV(this.m_C,
          b2Vec2.MulSV(this.m_gamma, this.m_impulse, b2Vec2.s_t0),
          b2Vec2.s_t0),
        b2Vec2.s_t0).SelfNeg(),
      b2MouseJoint.SolveVelocityConstraints_s_impulse);

    // b2Vec2 oldImpulse = m_impulse;
    const oldImpulse = b2MouseJoint.SolveVelocityConstraints_s_oldImpulse.Copy(this.m_impulse);
    // m_impulse += impulse;
    this.m_impulse.SelfAdd(impulse);
    const maxImpulse: number = data.step.dt * this.m_maxForce;
    if (this.m_impulse.LengthSquared() > maxImpulse * maxImpulse) {
      this.m_impulse.SelfMul(maxImpulse / this.m_impulse.Length());
    }
    // impulse = m_impulse - oldImpulse;
    b2Vec2.SubVV(this.m_impulse, oldImpulse, impulse);

    // vB += m_invMassB * impulse;
    vB.SelfMulAdd(this.m_invMassB, impulse);
    wB += this.m_invIB * b2Vec2.CrossVV(this.m_rB, impulse);

    // data.velocities[this.m_indexB].v = vB;
    data.velocities[this.m_indexB].w = wB;
  }

  public SolvePositionConstraints(data: b2SolverData): boolean {
    return true;
  }

  public GetAnchorA<T extends XY>(out: T): T {
    out.x = this.m_targetA.x;
    out.y = this.m_targetA.y;
    return out;
  }

  public GetAnchorB<T extends XY>(out: T): T {
    return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
  }

  public GetReactionForce<T extends XY>(inv_dt: number, out: T): T {
    return b2Vec2.MulSV(inv_dt, this.m_impulse, out);
  }

  public GetReactionTorque(inv_dt: number): number {
    return 0;
  }

  public override Dump(log: (format: string, ...args: any[]) => void) {
    log("Mouse joint dumping is not supported.\n");
  }

  public override ShiftOrigin(newOrigin: XY) {
    this.m_targetA.SelfSub(newOrigin);
  }
}
