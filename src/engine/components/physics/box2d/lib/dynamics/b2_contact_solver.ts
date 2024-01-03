/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
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

// DEBUG: import { b2Assert } from "../common/b2_settings.js";
import { b2_linearSlop, b2_maxManifoldPoints, b2_maxLinearCorrection, b2_baumgarte, b2_toiBaumgarte, b2MakeArray } from "../common/b2_settings.js";
import { b2Min, b2Max, b2Clamp, b2Vec2, b2Mat22, b2Rot, b2Transform } from "../common/b2_math.js";
import { b2Manifold } from "../collision/b2_collision.js";
import { b2ManifoldPoint } from "../collision/b2_collision.js";
import { b2WorldManifold } from "../collision/b2_collision.js";
import { b2ManifoldType } from "../collision/b2_collision.js";
import { b2Shape } from "../collision/b2_shape.js";
import { b2Contact } from "./b2_contact.js";
import { b2Body } from "./b2_body.js";
import { b2Fixture } from "./b2_fixture.js";
import { b2TimeStep, b2Position, b2Velocity } from "./b2_time_step.js";

// Solver debugging is normally disabled because the block solver sometimes has to deal with a poorly conditioned effective mass matrix.
// #define B2_DEBUG_SOLVER 0

export let g_blockSolve: boolean = false;
export function get_g_blockSolve(): boolean { return g_blockSolve; }
export function set_g_blockSolve(value: boolean): void { g_blockSolve = value; }

export class b2VelocityConstraintPoint {
  public readonly rA: b2Vec2 = new b2Vec2();
  public readonly rB: b2Vec2 = new b2Vec2();
  public normalImpulse: number = 0;
  public tangentImpulse: number = 0;
  public normalMass: number = 0;
  public tangentMass: number = 0;
  public velocityBias: number = 0;

  public static MakeArray(length: number): b2VelocityConstraintPoint[] {
    return b2MakeArray(length, (i: number) => new b2VelocityConstraintPoint());
  }
}

export class b2ContactVelocityConstraint {
  public readonly points: b2VelocityConstraintPoint[] = b2VelocityConstraintPoint.MakeArray(b2_maxManifoldPoints);
  public readonly normal: b2Vec2 = new b2Vec2();
  public readonly tangent: b2Vec2 = new b2Vec2();
  public readonly normalMass: b2Mat22 = new b2Mat22();
  public readonly K: b2Mat22 = new b2Mat22();
  public indexA: number = 0;
  public indexB: number = 0;
  public invMassA: number = 0;
  public invMassB: number = 0;
  public invIA: number = 0;
  public invIB: number = 0;
  public friction: number = 0;
  public restitution: number = 0;
  public threshold: number = 0;
  public tangentSpeed: number = 0;
  public pointCount: number = 0;
  public contactIndex: number = 0;

  public static MakeArray(length: number): b2ContactVelocityConstraint[] {
    return b2MakeArray(length, (i: number) => new b2ContactVelocityConstraint());
  }
}

export class b2ContactPositionConstraint {
  public readonly localPoints: b2Vec2[] = b2Vec2.MakeArray(b2_maxManifoldPoints);
  public readonly localNormal: b2Vec2 = new b2Vec2();
  public readonly localPoint: b2Vec2 = new b2Vec2();
  public indexA: number = 0;
  public indexB: number = 0;
  public invMassA: number = 0;
  public invMassB: number = 0;
  public readonly localCenterA: b2Vec2 = new b2Vec2();
  public readonly localCenterB: b2Vec2 = new b2Vec2();
  public invIA: number = 0;
  public invIB: number = 0;
  public type: b2ManifoldType = b2ManifoldType.e_unknown;
  public radiusA: number = 0;
  public radiusB: number = 0;
  public pointCount: number = 0;

  public static MakeArray(length: number): b2ContactPositionConstraint[] {
    return b2MakeArray(length, (i: number) => new b2ContactPositionConstraint());
  }
}

export class b2ContactSolverDef {
  public readonly step: b2TimeStep = new b2TimeStep();
  public contacts!: b2Contact[];
  public count: number = 0;
  public positions!: b2Position[];
  public velocities!: b2Velocity[];
}

export class b2PositionSolverManifold {
  public readonly normal: b2Vec2 = new b2Vec2();
  public readonly point: b2Vec2 = new b2Vec2();
  public separation: number = 0;

  private static Initialize_s_pointA = new b2Vec2();
  private static Initialize_s_pointB = new b2Vec2();
  private static Initialize_s_planePoint = new b2Vec2();
  private static Initialize_s_clipPoint = new b2Vec2();
  public Initialize(pc: b2ContactPositionConstraint, xfA: b2Transform, xfB: b2Transform, index: number): void {
    const pointA: b2Vec2 = b2PositionSolverManifold.Initialize_s_pointA;
    const pointB: b2Vec2 = b2PositionSolverManifold.Initialize_s_pointB;
    const planePoint: b2Vec2 = b2PositionSolverManifold.Initialize_s_planePoint;
    const clipPoint: b2Vec2 = b2PositionSolverManifold.Initialize_s_clipPoint;

    // DEBUG: b2Assert(pc.pointCount > 0);

    switch (pc.type) {
    case b2ManifoldType.e_circles: {
        // b2Vec2 pointA = b2Mul(xfA, pc->localPoint);
        b2Transform.MulXV(xfA, pc.localPoint, pointA);
        // b2Vec2 pointB = b2Mul(xfB, pc->localPoints[0]);
        b2Transform.MulXV(xfB, pc.localPoints[0], pointB);
        // normal = pointB - pointA;
        // normal.Normalize();
        b2Vec2.SubVV(pointB, pointA, this.normal).SelfNormalize();
        // point = 0.5f * (pointA + pointB);
        b2Vec2.MidVV(pointA, pointB, this.point);
        // separation = b2Dot(pointB - pointA, normal) - pc->radius;
        this.separation = b2Vec2.DotVV(b2Vec2.SubVV(pointB, pointA, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
        break;
      }

    case b2ManifoldType.e_faceA: {
        // normal = b2Mul(xfA.q, pc->localNormal);
        b2Rot.MulRV(xfA.q, pc.localNormal, this.normal);
        // b2Vec2 planePoint = b2Mul(xfA, pc->localPoint);
        b2Transform.MulXV(xfA, pc.localPoint, planePoint);

        // b2Vec2 clipPoint = b2Mul(xfB, pc->localPoints[index]);
        b2Transform.MulXV(xfB, pc.localPoints[index], clipPoint);
        // separation = b2Dot(clipPoint - planePoint, normal) - pc->radius;
        this.separation = b2Vec2.DotVV(b2Vec2.SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
        // point = clipPoint;
        this.point.Copy(clipPoint);
        break;
      }

    case b2ManifoldType.e_faceB: {
        // normal = b2Mul(xfB.q, pc->localNormal);
        b2Rot.MulRV(xfB.q, pc.localNormal, this.normal);
        // b2Vec2 planePoint = b2Mul(xfB, pc->localPoint);
        b2Transform.MulXV(xfB, pc.localPoint, planePoint);

        // b2Vec2 clipPoint = b2Mul(xfA, pc->localPoints[index]);
        b2Transform.MulXV(xfA, pc.localPoints[index], clipPoint);
        // separation = b2Dot(clipPoint - planePoint, normal) - pc->radius;
        this.separation = b2Vec2.DotVV(b2Vec2.SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal) - pc.radiusA - pc.radiusB;
        // point = clipPoint;
        this.point.Copy(clipPoint);

        // Ensure normal points from A to B
        // normal = -normal;
        this.normal.SelfNeg();
        break;
      }
    }
  }
}

export class b2ContactSolver {
  public readonly m_step: b2TimeStep = new b2TimeStep();
  public m_positions!: b2Position[];
  public m_velocities!: b2Velocity[];
  public readonly m_positionConstraints: b2ContactPositionConstraint[] = b2ContactPositionConstraint.MakeArray(1024); // TODO: b2Settings
  public readonly m_velocityConstraints: b2ContactVelocityConstraint[] = b2ContactVelocityConstraint.MakeArray(1024); // TODO: b2Settings
  public m_contacts!: b2Contact[];
  public m_count: number = 0;

  public Initialize(def: b2ContactSolverDef): b2ContactSolver {
    this.m_step.Copy(def.step);
    this.m_count = def.count;
    // TODO:
    if (this.m_positionConstraints.length < this.m_count) {
      const new_length: number = b2Max(this.m_positionConstraints.length * 2, this.m_count);
      while (this.m_positionConstraints.length < new_length) {
        this.m_positionConstraints[this.m_positionConstraints.length] = new b2ContactPositionConstraint();
      }
    }
    // TODO:
    if (this.m_velocityConstraints.length < this.m_count) {
      const new_length: number = b2Max(this.m_velocityConstraints.length * 2, this.m_count);
      while (this.m_velocityConstraints.length < new_length) {
        this.m_velocityConstraints[this.m_velocityConstraints.length] = new b2ContactVelocityConstraint();
      }
    }
    this.m_positions = def.positions;
    this.m_velocities = def.velocities;
    this.m_contacts = def.contacts;

    // Initialize position independent portions of the constraints.
    for (let i: number = 0; i < this.m_count; ++i) {
      const contact: b2Contact = this.m_contacts[i];

      const fixtureA: b2Fixture = contact.m_fixtureA;
      const fixtureB: b2Fixture = contact.m_fixtureB;
      const shapeA: b2Shape = fixtureA.GetShape();
      const shapeB: b2Shape = fixtureB.GetShape();
      const radiusA: number = shapeA.m_radius;
      const radiusB: number = shapeB.m_radius;
      const bodyA: b2Body = fixtureA.GetBody();
      const bodyB: b2Body = fixtureB.GetBody();
      const manifold: b2Manifold = contact.GetManifold();

      const pointCount: number = manifold.pointCount;
      // DEBUG: b2Assert(pointCount > 0);

      const vc: b2ContactVelocityConstraint = this.m_velocityConstraints[i];
      vc.friction = contact.m_friction;
      vc.restitution = contact.m_restitution;
      vc.threshold = contact.m_restitutionThreshold;
      vc.tangentSpeed = contact.m_tangentSpeed;
      vc.indexA = bodyA.m_islandIndex;
      vc.indexB = bodyB.m_islandIndex;
      vc.invMassA = bodyA.m_invMass;
      vc.invMassB = bodyB.m_invMass;
      vc.invIA = bodyA.m_invI;
      vc.invIB = bodyB.m_invI;
      vc.contactIndex = i;
      vc.pointCount = pointCount;
      vc.K.SetZero();
      vc.normalMass.SetZero();

      const pc: b2ContactPositionConstraint = this.m_positionConstraints[i];
      pc.indexA = bodyA.m_islandIndex;
      pc.indexB = bodyB.m_islandIndex;
      pc.invMassA = bodyA.m_invMass;
      pc.invMassB = bodyB.m_invMass;
      pc.localCenterA.Copy(bodyA.m_sweep.localCenter);
      pc.localCenterB.Copy(bodyB.m_sweep.localCenter);
      pc.invIA = bodyA.m_invI;
      pc.invIB = bodyB.m_invI;
      pc.localNormal.Copy(manifold.localNormal);
      pc.localPoint.Copy(manifold.localPoint);
      pc.pointCount = pointCount;
      pc.radiusA = radiusA;
      pc.radiusB = radiusB;
      pc.type = manifold.type;

      for (let j: number = 0; j < pointCount; ++j) {
        const cp: b2ManifoldPoint = manifold.points[j];
        const vcp: b2VelocityConstraintPoint = vc.points[j];

        if (this.m_step.warmStarting) {
          vcp.normalImpulse = this.m_step.dtRatio * cp.normalImpulse;
          vcp.tangentImpulse = this.m_step.dtRatio * cp.tangentImpulse;
        } else {
          vcp.normalImpulse = 0;
          vcp.tangentImpulse = 0;
        }

        vcp.rA.SetZero();
        vcp.rB.SetZero();
        vcp.normalMass = 0;
        vcp.tangentMass = 0;
        vcp.velocityBias = 0;

        pc.localPoints[j].Copy(cp.localPoint);
      }
    }

    return this;
  }

  private static InitializeVelocityConstraints_s_xfA = new b2Transform();
  private static InitializeVelocityConstraints_s_xfB = new b2Transform();
  private static InitializeVelocityConstraints_s_worldManifold = new b2WorldManifold();
  public InitializeVelocityConstraints(): void {
    const xfA: b2Transform = b2ContactSolver.InitializeVelocityConstraints_s_xfA;
    const xfB: b2Transform = b2ContactSolver.InitializeVelocityConstraints_s_xfB;
    const worldManifold: b2WorldManifold = b2ContactSolver.InitializeVelocityConstraints_s_worldManifold;

    const k_maxConditionNumber: number = 1000;

    for (let i: number = 0; i < this.m_count; ++i) {
      const vc: b2ContactVelocityConstraint = this.m_velocityConstraints[i];
      const pc: b2ContactPositionConstraint = this.m_positionConstraints[i];

      const radiusA: number = pc.radiusA;
      const radiusB: number = pc.radiusB;
      const manifold: b2Manifold = this.m_contacts[vc.contactIndex].GetManifold();

      const indexA: number = vc.indexA;
      const indexB: number = vc.indexB;

      const mA: number = vc.invMassA;
      const mB: number = vc.invMassB;
      const iA: number = vc.invIA;
      const iB: number = vc.invIB;
      const localCenterA: b2Vec2 = pc.localCenterA;
      const localCenterB: b2Vec2 = pc.localCenterB;

      const cA: b2Vec2 = this.m_positions[indexA].c;
      const aA: number = this.m_positions[indexA].a;
      const vA: b2Vec2 = this.m_velocities[indexA].v;
      const wA: number = this.m_velocities[indexA].w;

      const cB: b2Vec2 = this.m_positions[indexB].c;
      const aB: number = this.m_positions[indexB].a;
      const vB: b2Vec2 = this.m_velocities[indexB].v;
      const wB: number = this.m_velocities[indexB].w;

      // DEBUG: b2Assert(manifold.pointCount > 0);

      xfA.q.SetAngle(aA);
      xfB.q.SetAngle(aB);
      b2Vec2.SubVV(cA, b2Rot.MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
      b2Vec2.SubVV(cB, b2Rot.MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

      worldManifold.Initialize(manifold, xfA, radiusA, xfB, radiusB);

      vc.normal.Copy(worldManifold.normal);
      b2Vec2.CrossVOne(vc.normal, vc.tangent); // compute from normal

      const pointCount: number = vc.pointCount;
      for (let j: number = 0; j < pointCount; ++j) {
        const vcp: b2VelocityConstraintPoint = vc.points[j];

        // vcp->rA = worldManifold.points[j] - cA;
        b2Vec2.SubVV(worldManifold.points[j], cA, vcp.rA);
        // vcp->rB = worldManifold.points[j] - cB;
        b2Vec2.SubVV(worldManifold.points[j], cB, vcp.rB);

        const rnA: number = b2Vec2.CrossVV(vcp.rA, vc.normal);
        const rnB: number = b2Vec2.CrossVV(vcp.rB, vc.normal);

        const kNormal: number = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

        vcp.normalMass = kNormal > 0 ? 1 / kNormal : 0;

        // b2Vec2 tangent = b2Cross(vc->normal, 1.0f);
        const tangent: b2Vec2 = vc.tangent; // precomputed from normal

        const rtA: number = b2Vec2.CrossVV(vcp.rA, tangent);
        const rtB: number = b2Vec2.CrossVV(vcp.rB, tangent);

        const kTangent: number = mA + mB + iA * rtA * rtA + iB * rtB * rtB;

        vcp.tangentMass = kTangent > 0 ? 1 / kTangent : 0;

        // Setup a velocity bias for restitution.
        vcp.velocityBias = 0;
        // float32 vRel = b2Dot(vc->normal, vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA));
        const vRel: number = b2Vec2.DotVV(
          vc.normal,
          b2Vec2.SubVV(
            b2Vec2.AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
            b2Vec2.AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
            b2Vec2.s_t0));
        if (vRel < -vc.threshold) {
          vcp.velocityBias += (-vc.restitution * vRel);
        }
      }

      // If we have two points, then prepare the block solver.
      if (vc.pointCount === 2 && g_blockSolve) {
        const vcp1: b2VelocityConstraintPoint = vc.points[0];
        const vcp2: b2VelocityConstraintPoint = vc.points[1];

        const rn1A: number = b2Vec2.CrossVV(vcp1.rA, vc.normal);
        const rn1B: number = b2Vec2.CrossVV(vcp1.rB, vc.normal);
        const rn2A: number = b2Vec2.CrossVV(vcp2.rA, vc.normal);
        const rn2B: number = b2Vec2.CrossVV(vcp2.rB, vc.normal);

        const k11: number = mA + mB + iA * rn1A * rn1A + iB * rn1B * rn1B;
        const k22: number = mA + mB + iA * rn2A * rn2A + iB * rn2B * rn2B;
        const k12: number = mA + mB + iA * rn1A * rn2A + iB * rn1B * rn2B;

        // Ensure a reasonable condition number.
        // float32 k_maxConditionNumber = 1000.0f;
        if (k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12)) {
          // K is safe to invert.
          vc.K.ex.Set(k11, k12);
          vc.K.ey.Set(k12, k22);
          vc.K.GetInverse(vc.normalMass);
        } else {
          // The constraints are redundant, just use one.
          // TODO_ERIN use deepest?
          vc.pointCount = 1;
        }
      }
    }
  }

  private static WarmStart_s_P = new b2Vec2();
  public WarmStart(): void {
    const P: b2Vec2 = b2ContactSolver.WarmStart_s_P;

    // Warm start.
    for (let i: number = 0; i < this.m_count; ++i) {
      const vc: b2ContactVelocityConstraint = this.m_velocityConstraints[i];

      const indexA: number = vc.indexA;
      const indexB: number = vc.indexB;
      const mA: number = vc.invMassA;
      const iA: number = vc.invIA;
      const mB: number = vc.invMassB;
      const iB: number = vc.invIB;
      const pointCount: number = vc.pointCount;

      const vA: b2Vec2 = this.m_velocities[indexA].v;
      let wA: number = this.m_velocities[indexA].w;
      const vB: b2Vec2 = this.m_velocities[indexB].v;
      let wB: number = this.m_velocities[indexB].w;

      const normal: b2Vec2 = vc.normal;
      // b2Vec2 tangent = b2Cross(normal, 1.0f);
      const tangent: b2Vec2 = vc.tangent; // precomputed from normal

      for (let j: number = 0; j < pointCount; ++j) {
        const vcp: b2VelocityConstraintPoint = vc.points[j];
        // b2Vec2 P = vcp->normalImpulse * normal + vcp->tangentImpulse * tangent;
        b2Vec2.AddVV(
          b2Vec2.MulSV(vcp.normalImpulse, normal, b2Vec2.s_t0),
          b2Vec2.MulSV(vcp.tangentImpulse, tangent, b2Vec2.s_t1),
          P);
        // wA -= iA * b2Cross(vcp->rA, P);
        wA -= iA * b2Vec2.CrossVV(vcp.rA, P);
        // vA -= mA * P;
        vA.SelfMulSub(mA, P);
        // wB += iB * b2Cross(vcp->rB, P);
        wB += iB * b2Vec2.CrossVV(vcp.rB, P);
        // vB += mB * P;
        vB.SelfMulAdd(mB, P);
      }

      // this.m_velocities[indexA].v = vA;
      this.m_velocities[indexA].w = wA;
      // this.m_velocities[indexB].v = vB;
      this.m_velocities[indexB].w = wB;
    }
  }

  private static SolveVelocityConstraints_s_dv = new b2Vec2();
  private static SolveVelocityConstraints_s_dv1 = new b2Vec2();
  private static SolveVelocityConstraints_s_dv2 = new b2Vec2();
  private static SolveVelocityConstraints_s_P = new b2Vec2();
  private static SolveVelocityConstraints_s_a = new b2Vec2();
  private static SolveVelocityConstraints_s_b = new b2Vec2();
  private static SolveVelocityConstraints_s_x = new b2Vec2();
  private static SolveVelocityConstraints_s_d = new b2Vec2();
  private static SolveVelocityConstraints_s_P1 = new b2Vec2();
  private static SolveVelocityConstraints_s_P2 = new b2Vec2();
  private static SolveVelocityConstraints_s_P1P2 = new b2Vec2();
  public SolveVelocityConstraints(): void {
    const dv: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv;
    const dv1: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv1;
    const dv2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_dv2;
    const P: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P;
    const a: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_a;
    const b: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_b;
    const x: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_x;
    const d: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_d;
    const P1: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P1;
    const P2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P2;
    const P1P2: b2Vec2 = b2ContactSolver.SolveVelocityConstraints_s_P1P2;

    for (let i: number = 0; i < this.m_count; ++i) {
      const vc: b2ContactVelocityConstraint = this.m_velocityConstraints[i];

      const indexA: number = vc.indexA;
      const indexB: number = vc.indexB;
      const mA: number = vc.invMassA;
      const iA: number = vc.invIA;
      const mB: number = vc.invMassB;
      const iB: number = vc.invIB;
      const pointCount: number = vc.pointCount;

      const vA: b2Vec2 = this.m_velocities[indexA].v;
      let wA: number = this.m_velocities[indexA].w;
      const vB: b2Vec2 = this.m_velocities[indexB].v;
      let wB: number = this.m_velocities[indexB].w;

      // b2Vec2 normal = vc->normal;
      const normal: b2Vec2 = vc.normal;
      // b2Vec2 tangent = b2Cross(normal, 1.0f);
      const tangent: b2Vec2 = vc.tangent; // precomputed from normal
      const friction: number = vc.friction;

      // DEBUG: b2Assert(pointCount === 1 || pointCount === 2);

      // Solve tangent constraints first because non-penetration is more important
      // than friction.
      for (let j: number = 0; j < pointCount; ++j) {
        const vcp: b2VelocityConstraintPoint = vc.points[j];

        // Relative velocity at contact
        // b2Vec2 dv = vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA);
        b2Vec2.SubVV(
          b2Vec2.AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
          b2Vec2.AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
          dv);

        // Compute tangent force
        // float32 vt = b2Dot(dv, tangent) - vc->tangentSpeed;
        const vt: number = b2Vec2.DotVV(dv, tangent) - vc.tangentSpeed;
        let lambda: number = vcp.tangentMass * (-vt);

        // b2Clamp the accumulated force
        const maxFriction: number = friction * vcp.normalImpulse;
        const newImpulse: number = b2Clamp(vcp.tangentImpulse + lambda, (-maxFriction), maxFriction);
        lambda = newImpulse - vcp.tangentImpulse;
        vcp.tangentImpulse = newImpulse;

        // Apply contact impulse
        // b2Vec2 P = lambda * tangent;
        b2Vec2.MulSV(lambda, tangent, P);

        // vA -= mA * P;
        vA.SelfMulSub(mA, P);
        // wA -= iA * b2Cross(vcp->rA, P);
        wA -= iA * b2Vec2.CrossVV(vcp.rA, P);

        // vB += mB * P;
        vB.SelfMulAdd(mB, P);
        // wB += iB * b2Cross(vcp->rB, P);
        wB += iB * b2Vec2.CrossVV(vcp.rB, P);
      }

      // Solve normal constraints
      if (vc.pointCount === 1 || g_blockSolve === false) {
        for (let j = 0; j < pointCount; ++j) {
          const vcp: b2VelocityConstraintPoint = vc.points[j];

          // Relative velocity at contact
          // b2Vec2 dv = vB + b2Cross(wB, vcp->rB) - vA - b2Cross(wA, vcp->rA);
          b2Vec2.SubVV(
            b2Vec2.AddVCrossSV(vB, wB, vcp.rB, b2Vec2.s_t0),
            b2Vec2.AddVCrossSV(vA, wA, vcp.rA, b2Vec2.s_t1),
            dv);

          // Compute normal impulse
          // float32 vn = b2Dot(dv, normal);
          const vn: number = b2Vec2.DotVV(dv, normal);
          let lambda: number = (-vcp.normalMass * (vn - vcp.velocityBias));

          // b2Clamp the accumulated impulse
          // float32 newImpulse = b2Max(vcp->normalImpulse + lambda, 0.0f);
          const newImpulse: number = b2Max(vcp.normalImpulse + lambda, 0);
          lambda = newImpulse - vcp.normalImpulse;
          vcp.normalImpulse = newImpulse;

          // Apply contact impulse
          // b2Vec2 P = lambda * normal;
          b2Vec2.MulSV(lambda, normal, P);
          // vA -= mA * P;
          vA.SelfMulSub(mA, P);
          // wA -= iA * b2Cross(vcp->rA, P);
          wA -= iA * b2Vec2.CrossVV(vcp.rA, P);

          // vB += mB * P;
          vB.SelfMulAdd(mB, P);
          // wB += iB * b2Cross(vcp->rB, P);
          wB += iB * b2Vec2.CrossVV(vcp.rB, P);
        }
      } else {
        // Block solver developed in collaboration with Dirk Gregorius (back in 01/07 on Box2D_Lite).
        // Build the mini LCP for this contact patch
        //
        // vn = A * x + b, vn >= 0, x >= 0 and vn_i * x_i = 0 with i = 1..2
        //
        // A = J * W * JT and J = ( -n, -r1 x n, n, r2 x n )
        // b = vn0 - velocityBias
        //
        // The system is solved using the "Total enumeration method" (s. Murty). The complementary constraint vn_i * x_i
        // implies that we must have in any solution either vn_i = 0 or x_i = 0. So for the 2D contact problem the cases
        // vn1 = 0 and vn2 = 0, x1 = 0 and x2 = 0, x1 = 0 and vn2 = 0, x2 = 0 and vn1 = 0 need to be tested. The first valid
        // solution that satisfies the problem is chosen.
        //
        // In order to account of the accumulated impulse 'a' (because of the iterative nature of the solver which only requires
        // that the accumulated impulse is clamped and not the incremental impulse) we change the impulse variable (x_i).
        //
        // Substitute:
        //
        // x = a + d
        //
        // a := old total impulse
        // x := new total impulse
        // d := incremental impulse
        //
        // For the current iteration we extend the formula for the incremental impulse
        // to compute the new total impulse:
        //
        // vn = A * d + b
        //    = A * (x - a) + b
        //    = A * x + b - A * a
        //    = A * x + b'
        // b' = b - A * a;

        const cp1: b2VelocityConstraintPoint = vc.points[0];
        const cp2: b2VelocityConstraintPoint = vc.points[1];

        // b2Vec2 a(cp1->normalImpulse, cp2->normalImpulse);
        a.Set(cp1.normalImpulse, cp2.normalImpulse);
        // DEBUG: b2Assert(a.x >= 0 && a.y >= 0);

        // Relative velocity at contact
        // b2Vec2 dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);
        b2Vec2.SubVV(
          b2Vec2.AddVCrossSV(vB, wB, cp1.rB, b2Vec2.s_t0),
          b2Vec2.AddVCrossSV(vA, wA, cp1.rA, b2Vec2.s_t1),
          dv1);
        // b2Vec2 dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);
        b2Vec2.SubVV(
          b2Vec2.AddVCrossSV(vB, wB, cp2.rB, b2Vec2.s_t0),
          b2Vec2.AddVCrossSV(vA, wA, cp2.rA, b2Vec2.s_t1),
          dv2);

        // Compute normal velocity
        // float32 vn1 = b2Dot(dv1, normal);
        let vn1: number = b2Vec2.DotVV(dv1, normal);
        // float32 vn2 = b2Dot(dv2, normal);
        let vn2: number = b2Vec2.DotVV(dv2, normal);

        // b2Vec2 b;
        b.x = vn1 - cp1.velocityBias;
        b.y = vn2 - cp2.velocityBias;

        // Compute b'
        // b -= b2Mul(vc->K, a);
        b.SelfSub(b2Mat22.MulMV(vc.K, a, b2Vec2.s_t0));

        /*
        #if B2_DEBUG_SOLVER === 1
        const k_errorTol: number = 0.001;
        #endif
        */

        for (; ; ) {
          //
          // Case 1: vn = 0
          //
          // 0 = A * x + b'
          //
          // Solve for x:
          //
          // x = - inv(A) * b'
          //
          // b2Vec2 x = - b2Mul(vc->normalMass, b);
          b2Mat22.MulMV(vc.normalMass, b, x).SelfNeg();

          if (x.x >= 0 && x.y >= 0) {
            // Get the incremental impulse
            // b2Vec2 d = x - a;
            b2Vec2.SubVV(x, a, d);

            // Apply incremental impulse
            // b2Vec2 P1 = d.x * normal;
            b2Vec2.MulSV(d.x, normal, P1);
            // b2Vec2 P2 = d.y * normal;
            b2Vec2.MulSV(d.y, normal, P2);
            b2Vec2.AddVV(P1, P2, P1P2);
            // vA -= mA * (P1 + P2);
            vA.SelfMulSub(mA, P1P2);
            // wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
            wA -= iA * (b2Vec2.CrossVV(cp1.rA, P1) + b2Vec2.CrossVV(cp2.rA, P2));

            // vB += mB * (P1 + P2);
            vB.SelfMulAdd(mB, P1P2);
            // wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
            wB += iB * (b2Vec2.CrossVV(cp1.rB, P1) + b2Vec2.CrossVV(cp2.rB, P2));

            // Accumulate
            cp1.normalImpulse = x.x;
            cp2.normalImpulse = x.y;

            /*
            #if B2_DEBUG_SOLVER === 1
            // Postconditions
            dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);
            dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);

            // Compute normal velocity
            vn1 = b2Dot(dv1, normal);
            vn2 = b2Dot(dv2, normal);

            b2Assert(b2Abs(vn1 - cp1->velocityBias) < k_errorTol);
            b2Assert(b2Abs(vn2 - cp2->velocityBias) < k_errorTol);
            #endif
            */
            break;
          }

          //
          // Case 2: vn1 = 0 and x2 = 0
          //
          //   0 = a11 * x1 + a12 * 0 + b1'
          // vn2 = a21 * x1 + a22 * 0 + b2'
          //
          x.x = (-cp1.normalMass * b.x);
          x.y = 0;
          vn1 = 0;
          vn2 = vc.K.ex.y * x.x + b.y;

          if (x.x >= 0 && vn2 >= 0) {
            // Get the incremental impulse
            // b2Vec2 d = x - a;
            b2Vec2.SubVV(x, a, d);

            // Apply incremental impulse
            // b2Vec2 P1 = d.x * normal;
            b2Vec2.MulSV(d.x, normal, P1);
            // b2Vec2 P2 = d.y * normal;
            b2Vec2.MulSV(d.y, normal, P2);
            b2Vec2.AddVV(P1, P2, P1P2);
            // vA -= mA * (P1 + P2);
            vA.SelfMulSub(mA, P1P2);
            // wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
            wA -= iA * (b2Vec2.CrossVV(cp1.rA, P1) + b2Vec2.CrossVV(cp2.rA, P2));

            // vB += mB * (P1 + P2);
            vB.SelfMulAdd(mB, P1P2);
            // wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
            wB += iB * (b2Vec2.CrossVV(cp1.rB, P1) + b2Vec2.CrossVV(cp2.rB, P2));

            // Accumulate
            cp1.normalImpulse = x.x;
            cp2.normalImpulse = x.y;

            /*
            #if B2_DEBUG_SOLVER === 1
            // Postconditions
            dv1 = vB + b2Cross(wB, cp1->rB) - vA - b2Cross(wA, cp1->rA);

            // Compute normal velocity
            vn1 = b2Dot(dv1, normal);

            b2Assert(b2Abs(vn1 - cp1->velocityBias) < k_errorTol);
            #endif
            */
            break;
          }

          //
          // Case 3: vn2 = 0 and x1 = 0
          //
          // vn1 = a11 * 0 + a12 * x2 + b1'
          //   0 = a21 * 0 + a22 * x2 + b2'
          //
          x.x = 0;
          x.y = (-cp2.normalMass * b.y);
          vn1 = vc.K.ey.x * x.y + b.x;
          vn2 = 0;

          if (x.y >= 0 && vn1 >= 0) {
            // Resubstitute for the incremental impulse
            // b2Vec2 d = x - a;
            b2Vec2.SubVV(x, a, d);

            // Apply incremental impulse
            // b2Vec2 P1 = d.x * normal;
            b2Vec2.MulSV(d.x, normal, P1);
            // b2Vec2 P2 = d.y * normal;
            b2Vec2.MulSV(d.y, normal, P2);
            b2Vec2.AddVV(P1, P2, P1P2);
            // vA -= mA * (P1 + P2);
            vA.SelfMulSub(mA, P1P2);
            // wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
            wA -= iA * (b2Vec2.CrossVV(cp1.rA, P1) + b2Vec2.CrossVV(cp2.rA, P2));

            // vB += mB * (P1 + P2);
            vB.SelfMulAdd(mB, P1P2);
            // wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
            wB += iB * (b2Vec2.CrossVV(cp1.rB, P1) + b2Vec2.CrossVV(cp2.rB, P2));

            // Accumulate
            cp1.normalImpulse = x.x;
            cp2.normalImpulse = x.y;

            /*
            #if B2_DEBUG_SOLVER === 1
            // Postconditions
            dv2 = vB + b2Cross(wB, cp2->rB) - vA - b2Cross(wA, cp2->rA);

            // Compute normal velocity
            vn2 = b2Dot(dv2, normal);

            b2Assert(b2Abs(vn2 - cp2->velocityBias) < k_errorTol);
            #endif
            */
            break;
          }

          //
          // Case 4: x1 = 0 and x2 = 0
          //
          // vn1 = b1
          // vn2 = b2;
          x.x = 0;
          x.y = 0;
          vn1 = b.x;
          vn2 = b.y;

          if (vn1 >= 0 && vn2 >= 0) {
            // Resubstitute for the incremental impulse
            // b2Vec2 d = x - a;
            b2Vec2.SubVV(x, a, d);

            // Apply incremental impulse
            // b2Vec2 P1 = d.x * normal;
            b2Vec2.MulSV(d.x, normal, P1);
            // b2Vec2 P2 = d.y * normal;
            b2Vec2.MulSV(d.y, normal, P2);
            b2Vec2.AddVV(P1, P2, P1P2);
            // vA -= mA * (P1 + P2);
            vA.SelfMulSub(mA, P1P2);
            // wA -= iA * (b2Cross(cp1->rA, P1) + b2Cross(cp2->rA, P2));
            wA -= iA * (b2Vec2.CrossVV(cp1.rA, P1) + b2Vec2.CrossVV(cp2.rA, P2));

            // vB += mB * (P1 + P2);
            vB.SelfMulAdd(mB, P1P2);
            // wB += iB * (b2Cross(cp1->rB, P1) + b2Cross(cp2->rB, P2));
            wB += iB * (b2Vec2.CrossVV(cp1.rB, P1) + b2Vec2.CrossVV(cp2.rB, P2));

            // Accumulate
            cp1.normalImpulse = x.x;
            cp2.normalImpulse = x.y;

            break;
          }

          // No solution, give up. This is hit sometimes, but it doesn't seem to matter.
          break;
        }
      }

      // this.m_velocities[indexA].v = vA;
      this.m_velocities[indexA].w = wA;
      // this.m_velocities[indexB].v = vB;
      this.m_velocities[indexB].w = wB;
    }
  }

  public StoreImpulses(): void {
    for (let i: number = 0; i < this.m_count; ++i) {
      const vc: b2ContactVelocityConstraint = this.m_velocityConstraints[i];
      const manifold: b2Manifold = this.m_contacts[vc.contactIndex].GetManifold();

      for (let j: number = 0; j < vc.pointCount; ++j) {
        manifold.points[j].normalImpulse = vc.points[j].normalImpulse;
        manifold.points[j].tangentImpulse = vc.points[j].tangentImpulse;
      }
    }
  }

  private static SolvePositionConstraints_s_xfA = new b2Transform();
  private static SolvePositionConstraints_s_xfB = new b2Transform();
  private static SolvePositionConstraints_s_psm = new b2PositionSolverManifold();
  private static SolvePositionConstraints_s_rA = new b2Vec2();
  private static SolvePositionConstraints_s_rB = new b2Vec2();
  private static SolvePositionConstraints_s_P = new b2Vec2();
  public SolvePositionConstraints(): boolean {
    const xfA: b2Transform = b2ContactSolver.SolvePositionConstraints_s_xfA;
    const xfB: b2Transform = b2ContactSolver.SolvePositionConstraints_s_xfB;
    const psm: b2PositionSolverManifold = b2ContactSolver.SolvePositionConstraints_s_psm;
    const rA: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_rA;
    const rB: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_rB;
    const P: b2Vec2 = b2ContactSolver.SolvePositionConstraints_s_P;

    let minSeparation: number = 0;

    for (let i: number = 0; i < this.m_count; ++i) {
      const pc: b2ContactPositionConstraint = this.m_positionConstraints[i];

      const indexA: number = pc.indexA;
      const indexB: number = pc.indexB;
      const localCenterA: b2Vec2 = pc.localCenterA;
      const mA: number = pc.invMassA;
      const iA: number = pc.invIA;
      const localCenterB: b2Vec2 = pc.localCenterB;
      const mB: number = pc.invMassB;
      const iB: number = pc.invIB;
      const pointCount: number = pc.pointCount;

      const cA: b2Vec2 = this.m_positions[indexA].c;
      let aA: number = this.m_positions[indexA].a;

      const cB: b2Vec2 = this.m_positions[indexB].c;
      let aB: number = this.m_positions[indexB].a;

      // Solve normal constraints
      for (let j: number = 0; j < pointCount; ++j) {
        xfA.q.SetAngle(aA);
        xfB.q.SetAngle(aB);
        b2Vec2.SubVV(cA, b2Rot.MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
        b2Vec2.SubVV(cB, b2Rot.MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

        psm.Initialize(pc, xfA, xfB, j);
        const normal: b2Vec2 = psm.normal;

        const point: b2Vec2 = psm.point;
        const separation: number = psm.separation;

        // b2Vec2 rA = point - cA;
        b2Vec2.SubVV(point, cA, rA);
        // b2Vec2 rB = point - cB;
        b2Vec2.SubVV(point, cB, rB);

        // Track max constraint error.
        minSeparation = b2Min(minSeparation, separation);

        // Prevent large corrections and allow slop.
        const C: number = b2Clamp(b2_baumgarte * (separation + b2_linearSlop), (-b2_maxLinearCorrection), 0);

        // Compute the effective mass.
        // float32 rnA = b2Cross(rA, normal);
        const rnA: number = b2Vec2.CrossVV(rA, normal);
        // float32 rnB = b2Cross(rB, normal);
        const rnB: number = b2Vec2.CrossVV(rB, normal);
        // float32 K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
        const K: number = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

        // Compute normal impulse
        const impulse: number = K > 0 ? - C / K : 0;

        // b2Vec2 P = impulse * normal;
        b2Vec2.MulSV(impulse, normal, P);

        // cA -= mA * P;
        cA.SelfMulSub(mA, P);
        // aA -= iA * b2Cross(rA, P);
        aA -= iA * b2Vec2.CrossVV(rA, P);

        // cB += mB * P;
        cB.SelfMulAdd(mB, P);
        // aB += iB * b2Cross(rB, P);
        aB += iB * b2Vec2.CrossVV(rB, P);
      }

      // this.m_positions[indexA].c = cA;
      this.m_positions[indexA].a = aA;

      // this.m_positions[indexB].c = cB;
      this.m_positions[indexB].a = aB;
    }

    // We can't expect minSpeparation >= -b2_linearSlop because we don't
    // push the separation above -b2_linearSlop.
    return minSeparation > (-3 * b2_linearSlop);
  }

  private static SolveTOIPositionConstraints_s_xfA = new b2Transform();
  private static SolveTOIPositionConstraints_s_xfB = new b2Transform();
  private static SolveTOIPositionConstraints_s_psm = new b2PositionSolverManifold();
  private static SolveTOIPositionConstraints_s_rA = new b2Vec2();
  private static SolveTOIPositionConstraints_s_rB = new b2Vec2();
  private static SolveTOIPositionConstraints_s_P = new b2Vec2();
  public SolveTOIPositionConstraints(toiIndexA: number, toiIndexB: number): boolean {
    const xfA: b2Transform = b2ContactSolver.SolveTOIPositionConstraints_s_xfA;
    const xfB: b2Transform = b2ContactSolver.SolveTOIPositionConstraints_s_xfB;
    const psm: b2PositionSolverManifold = b2ContactSolver.SolveTOIPositionConstraints_s_psm;
    const rA: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_rA;
    const rB: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_rB;
    const P: b2Vec2 = b2ContactSolver.SolveTOIPositionConstraints_s_P;

    let minSeparation: number = 0;

    for (let i: number = 0; i < this.m_count; ++i) {
      const pc: b2ContactPositionConstraint = this.m_positionConstraints[i];

      const indexA: number = pc.indexA;
      const indexB: number = pc.indexB;
      const localCenterA: b2Vec2 = pc.localCenterA;
      const localCenterB: b2Vec2 = pc.localCenterB;
      const pointCount: number = pc.pointCount;

      let mA: number = 0;
      let iA: number = 0;
      if (indexA === toiIndexA || indexA === toiIndexB) {
        mA = pc.invMassA;
        iA = pc.invIA;
      }

      let mB: number = 0;
      let iB: number = 0;
      if (indexB === toiIndexA || indexB === toiIndexB) {
        mB = pc.invMassB;
        iB = pc.invIB;
      }

      const cA: b2Vec2 = this.m_positions[indexA].c;
      let aA: number = this.m_positions[indexA].a;

      const cB: b2Vec2 = this.m_positions[indexB].c;
      let aB: number = this.m_positions[indexB].a;

      // Solve normal constraints
      for (let j: number = 0; j < pointCount; ++j) {
        xfA.q.SetAngle(aA);
        xfB.q.SetAngle(aB);
        b2Vec2.SubVV(cA, b2Rot.MulRV(xfA.q, localCenterA, b2Vec2.s_t0), xfA.p);
        b2Vec2.SubVV(cB, b2Rot.MulRV(xfB.q, localCenterB, b2Vec2.s_t0), xfB.p);

        psm.Initialize(pc, xfA, xfB, j);
        const normal: b2Vec2 = psm.normal;

        const point: b2Vec2 = psm.point;
        const separation: number = psm.separation;

        // b2Vec2 rA = point - cA;
        b2Vec2.SubVV(point, cA, rA);
        // b2Vec2 rB = point - cB;
        b2Vec2.SubVV(point, cB, rB);

        // Track max constraint error.
        minSeparation = b2Min(minSeparation, separation);

        // Prevent large corrections and allow slop.
        const C: number = b2Clamp(b2_toiBaumgarte * (separation + b2_linearSlop), (-b2_maxLinearCorrection), 0);

        // Compute the effective mass.
        // float32 rnA = b2Cross(rA, normal);
        const rnA: number = b2Vec2.CrossVV(rA, normal);
        // float32 rnB = b2Cross(rB, normal);
        const rnB: number = b2Vec2.CrossVV(rB, normal);
        // float32 K = mA + mB + iA * rnA * rnA + iB * rnB * rnB;
        const K: number = mA + mB + iA * rnA * rnA + iB * rnB * rnB;

        // Compute normal impulse
        const impulse: number = K > 0 ? - C / K : 0;

        // b2Vec2 P = impulse * normal;
        b2Vec2.MulSV(impulse, normal, P);

        // cA -= mA * P;
        cA.SelfMulSub(mA, P);
        // aA -= iA * b2Cross(rA, P);
        aA -= iA * b2Vec2.CrossVV(rA, P);

        // cB += mB * P;
        cB.SelfMulAdd(mB, P);
        // aB += iB * b2Cross(rB, P);
        aB += iB * b2Vec2.CrossVV(rB, P);
      }

      // this.m_positions[indexA].c = cA;
      this.m_positions[indexA].a = aA;

      // this.m_positions[indexB].c = cB;
      this.m_positions[indexB].a = aB;
    }

    // We can't expect minSpeparation >= -b2_linearSlop because we don't
    // push the separation above -b2_linearSlop.
    return minSeparation >= -1.5 * b2_linearSlop;
  }
}
