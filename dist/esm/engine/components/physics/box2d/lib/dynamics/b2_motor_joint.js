/*
* Copyright (c) 2006-2012 Erin Catto http://www.box2d.org
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
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
// DEBUG: import { b2IsValid } from "../common/b2_math.js"
import { b2Maybe } from "../common/b2_settings.js"
import { b2Clamp, b2Vec2, b2Mat22, b2Rot } from "../common/b2_math.js"
import { b2Joint, b2JointDef, b2JointType } from "./b2_joint.js"
export class b2MotorJointDef extends b2JointDef {
    linearOffset = new b2Vec2(0, 0);
    angularOffset = 0;
    maxForce = 1;
    maxTorque = 1;
    correctionFactor = 0.3;
    constructor() {
        super(b2JointType.e_motorJoint);
    }
    Initialize(bA, bB) {
        this.bodyA = bA;
        this.bodyB = bB;
        // b2Vec2 xB = bodyB->GetPosition();
        // linearOffset = bodyA->GetLocalPoint(xB);
        this.bodyA.GetLocalPoint(this.bodyB.GetPosition(), this.linearOffset);
        const angleA = this.bodyA.GetAngle();
        const angleB = this.bodyB.GetAngle();
        this.angularOffset = angleB - angleA;
    }
}
export class b2MotorJoint extends b2Joint {
    // Solver shared
    m_linearOffset = new b2Vec2();
    m_angularOffset = 0;
    m_linearImpulse = new b2Vec2();
    m_angularImpulse = 0;
    m_maxForce = 0;
    m_maxTorque = 0;
    m_correctionFactor = 0.3;
    // Solver temp
    m_indexA = 0;
    m_indexB = 0;
    m_rA = new b2Vec2();
    m_rB = new b2Vec2();
    m_localCenterA = new b2Vec2();
    m_localCenterB = new b2Vec2();
    m_linearError = new b2Vec2();
    m_angularError = 0;
    m_invMassA = 0;
    m_invMassB = 0;
    m_invIA = 0;
    m_invIB = 0;
    m_linearMass = new b2Mat22();
    m_angularMass = 0;
    m_qA = new b2Rot();
    m_qB = new b2Rot();
    m_K = new b2Mat22();
    constructor(def) {
        super(def);
        this.m_linearOffset.Copy(b2Maybe(def.linearOffset, b2Vec2.ZERO));
        this.m_linearImpulse.SetZero();
        this.m_maxForce = b2Maybe(def.maxForce, 0);
        this.m_maxTorque = b2Maybe(def.maxTorque, 0);
        this.m_correctionFactor = b2Maybe(def.correctionFactor, 0.3);
    }
    GetAnchorA(out) {
        const pos = this.m_bodyA.GetPosition();
        out.x = pos.x;
        out.y = pos.y;
        return out;
    }
    GetAnchorB(out) {
        const pos = this.m_bodyB.GetPosition();
        out.x = pos.x;
        out.y = pos.y;
        return out;
    }
    GetReactionForce(inv_dt, out) {
        // return inv_dt * m_linearImpulse;
        return b2Vec2.MulSV(inv_dt, this.m_linearImpulse, out);
    }
    GetReactionTorque(inv_dt) {
        return inv_dt * this.m_angularImpulse;
    }
    SetLinearOffset(linearOffset) {
        if (!b2Vec2.IsEqualToV(linearOffset, this.m_linearOffset)) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_linearOffset.Copy(linearOffset);
        }
    }
    GetLinearOffset() {
        return this.m_linearOffset;
    }
    SetAngularOffset(angularOffset) {
        if (angularOffset !== this.m_angularOffset) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_angularOffset = angularOffset;
        }
    }
    GetAngularOffset() {
        return this.m_angularOffset;
    }
    SetMaxForce(force) {
        // DEBUG: b2Assert(b2IsValid(force) && force >= 0);
        this.m_maxForce = force;
    }
    GetMaxForce() {
        return this.m_maxForce;
    }
    SetMaxTorque(torque) {
        // DEBUG: b2Assert(b2IsValid(torque) && torque >= 0);
        this.m_maxTorque = torque;
    }
    GetMaxTorque() {
        return this.m_maxTorque;
    }
    InitVelocityConstraints(data) {
        this.m_indexA = this.m_bodyA.m_islandIndex;
        this.m_indexB = this.m_bodyB.m_islandIndex;
        this.m_localCenterA.Copy(this.m_bodyA.m_sweep.localCenter);
        this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
        this.m_invMassA = this.m_bodyA.m_invMass;
        this.m_invMassB = this.m_bodyB.m_invMass;
        this.m_invIA = this.m_bodyA.m_invI;
        this.m_invIB = this.m_bodyB.m_invI;
        const cA = data.positions[this.m_indexA].c;
        const aA = data.positions[this.m_indexA].a;
        const vA = data.velocities[this.m_indexA].v;
        let wA = data.velocities[this.m_indexA].w;
        const cB = data.positions[this.m_indexB].c;
        const aB = data.positions[this.m_indexB].a;
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        const qA = this.m_qA.SetAngle(aA), qB = this.m_qB.SetAngle(aB);
        // Compute the effective mass matrix.
        // this.m_rA = b2Mul(qA, m_linearOffset - this.m_localCenterA);
        const rA = b2Rot.MulRV(qA, b2Vec2.SubVV(this.m_linearOffset, this.m_localCenterA, b2Vec2.s_t0), this.m_rA);
        // this.m_rB = b2Mul(qB, -this.m_localCenterB);
        const rB = b2Rot.MulRV(qB, b2Vec2.NegV(this.m_localCenterB, b2Vec2.s_t0), this.m_rB);
        // J = [-I -r1_skew I r2_skew]
        // r_skew = [-ry; rx]
        // Matlab
        // K = [ mA+r1y^2*iA+mB+r2y^2*iB,  -r1y*iA*r1x-r2y*iB*r2x,          -r1y*iA-r2y*iB]
        //     [  -r1y*iA*r1x-r2y*iB*r2x, mA+r1x^2*iA+mB+r2x^2*iB,           r1x*iA+r2x*iB]
        //     [          -r1y*iA-r2y*iB,           r1x*iA+r2x*iB,                   iA+iB]
        const mA = this.m_invMassA, mB = this.m_invMassB;
        const iA = this.m_invIA, iB = this.m_invIB;
        // Upper 2 by 2 of K for point to point
        const K = this.m_K;
        K.ex.x = mA + mB + iA * rA.y * rA.y + iB * rB.y * rB.y;
        K.ex.y = -iA * rA.x * rA.y - iB * rB.x * rB.y;
        K.ey.x = K.ex.y;
        K.ey.y = mA + mB + iA * rA.x * rA.x + iB * rB.x * rB.x;
        // this.m_linearMass = K.GetInverse();
        K.GetInverse(this.m_linearMass);
        this.m_angularMass = iA + iB;
        if (this.m_angularMass > 0) {
            this.m_angularMass = 1 / this.m_angularMass;
        }
        // this.m_linearError = cB + rB - cA - rA;
        b2Vec2.SubVV(b2Vec2.AddVV(cB, rB, b2Vec2.s_t0), b2Vec2.AddVV(cA, rA, b2Vec2.s_t1), this.m_linearError);
        this.m_angularError = aB - aA - this.m_angularOffset;
        if (data.step.warmStarting) {
            // Scale impulses to support a variable time step.
            // this.m_linearImpulse *= data.step.dtRatio;
            this.m_linearImpulse.SelfMul(data.step.dtRatio);
            this.m_angularImpulse *= data.step.dtRatio;
            // b2Vec2 P(this.m_linearImpulse.x, this.m_linearImpulse.y);
            const P = this.m_linearImpulse;
            // vA -= mA * P;
            vA.SelfMulSub(mA, P);
            wA -= iA * (b2Vec2.CrossVV(rA, P) + this.m_angularImpulse);
            // vB += mB * P;
            vB.SelfMulAdd(mB, P);
            wB += iB * (b2Vec2.CrossVV(rB, P) + this.m_angularImpulse);
        }
        else {
            this.m_linearImpulse.SetZero();
            this.m_angularImpulse = 0;
        }
        // data.velocities[this.m_indexA].v = vA; // vA is a reference
        data.velocities[this.m_indexA].w = wA;
        // data.velocities[this.m_indexB].v = vB; // vB is a reference
        data.velocities[this.m_indexB].w = wB;
    }
    static SolveVelocityConstraints_s_Cdot_v2 = new b2Vec2();
    static SolveVelocityConstraints_s_impulse_v2 = new b2Vec2();
    static SolveVelocityConstraints_s_oldImpulse_v2 = new b2Vec2();
    SolveVelocityConstraints(data) {
        const vA = data.velocities[this.m_indexA].v;
        let wA = data.velocities[this.m_indexA].w;
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        const mA = this.m_invMassA, mB = this.m_invMassB;
        const iA = this.m_invIA, iB = this.m_invIB;
        const h = data.step.dt;
        const inv_h = data.step.inv_dt;
        // Solve angular friction
        {
            const Cdot = wB - wA + inv_h * this.m_correctionFactor * this.m_angularError;
            let impulse = -this.m_angularMass * Cdot;
            const oldImpulse = this.m_angularImpulse;
            const maxImpulse = h * this.m_maxTorque;
            this.m_angularImpulse = b2Clamp(this.m_angularImpulse + impulse, -maxImpulse, maxImpulse);
            impulse = this.m_angularImpulse - oldImpulse;
            wA -= iA * impulse;
            wB += iB * impulse;
        }
        // Solve linear friction
        {
            const rA = this.m_rA;
            const rB = this.m_rB;
            // b2Vec2 Cdot = vB + b2Vec2.CrossSV(wB, rB) - vA - b2Vec2.CrossSV(wA, rA) + inv_h * this.m_correctionFactor * this.m_linearError;
            const Cdot_v2 = b2Vec2.AddVV(b2Vec2.SubVV(b2Vec2.AddVV(vB, b2Vec2.CrossSV(wB, rB, b2Vec2.s_t0), b2Vec2.s_t0), b2Vec2.AddVV(vA, b2Vec2.CrossSV(wA, rA, b2Vec2.s_t1), b2Vec2.s_t1), b2Vec2.s_t2), b2Vec2.MulSV(inv_h * this.m_correctionFactor, this.m_linearError, b2Vec2.s_t3), b2MotorJoint.SolveVelocityConstraints_s_Cdot_v2);
            // b2Vec2 impulse = -b2Mul(this.m_linearMass, Cdot);
            const impulse_v2 = b2Mat22.MulMV(this.m_linearMass, Cdot_v2, b2MotorJoint.SolveVelocityConstraints_s_impulse_v2).SelfNeg();
            // b2Vec2 oldImpulse = this.m_linearImpulse;
            const oldImpulse_v2 = b2MotorJoint.SolveVelocityConstraints_s_oldImpulse_v2.Copy(this.m_linearImpulse);
            // this.m_linearImpulse += impulse;
            this.m_linearImpulse.SelfAdd(impulse_v2);
            const maxImpulse = h * this.m_maxForce;
            if (this.m_linearImpulse.LengthSquared() > maxImpulse * maxImpulse) {
                this.m_linearImpulse.Normalize();
                // this.m_linearImpulse *= maxImpulse;
                this.m_linearImpulse.SelfMul(maxImpulse);
            }
            // impulse = this.m_linearImpulse - oldImpulse;
            b2Vec2.SubVV(this.m_linearImpulse, oldImpulse_v2, impulse_v2);
            // vA -= mA * impulse;
            vA.SelfMulSub(mA, impulse_v2);
            // wA -= iA * b2Vec2.CrossVV(rA, impulse);
            wA -= iA * b2Vec2.CrossVV(rA, impulse_v2);
            // vB += mB * impulse;
            vB.SelfMulAdd(mB, impulse_v2);
            // wB += iB * b2Vec2.CrossVV(rB, impulse);
            wB += iB * b2Vec2.CrossVV(rB, impulse_v2);
        }
        // data.velocities[this.m_indexA].v = vA; // vA is a reference
        data.velocities[this.m_indexA].w = wA;
        // data.velocities[this.m_indexB].v = vB; // vB is a reference
        data.velocities[this.m_indexB].w = wB;
    }
    SolvePositionConstraints(data) {
        return true;
    }
    Dump(log) {
        const indexA = this.m_bodyA.m_islandIndex;
        const indexB = this.m_bodyB.m_islandIndex;
        log("  const jd: b2MotorJointDef = new b2MotorJointDef();\n");
        log("  jd.bodyA = bodies[%d];\n", indexA);
        log("  jd.bodyB = bodies[%d];\n", indexB);
        log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
        log("  jd.linearOffset.Set(%.15f, %.15f);\n", this.m_linearOffset.x, this.m_linearOffset.y);
        log("  jd.angularOffset = %.15f;\n", this.m_angularOffset);
        log("  jd.maxForce = %.15f;\n", this.m_maxForce);
        log("  jd.maxTorque = %.15f;\n", this.m_maxTorque);
        log("  jd.correctionFactor = %.15f;\n", this.m_correctionFactor);
        log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
    }
}
