"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2MouseJoint = exports.b2MouseJointDef = void 0;
// DEBUG: import { b2Assert, b2_epsilon } from "../common/b2_settings.js"
// DEBUG: import { b2IsValid } from "../common/b2_math.js"
const b2_settings_1 = require("../common/b2_settings");
const b2_math_1 = require("../common/b2_math");
const b2_joint_1 = require("./b2_joint");
/// Mouse joint definition. This requires a world target point,
/// tuning parameters, and the time step.
class b2MouseJointDef extends b2_joint_1.b2JointDef {
    constructor() {
        super(b2_joint_1.b2JointType.e_mouseJoint);
        this.target = new b2_math_1.b2Vec2();
        this.maxForce = 0;
        this.stiffness = 5;
        this.damping = 0.7;
    }
}
exports.b2MouseJointDef = b2MouseJointDef;
class b2MouseJoint extends b2_joint_1.b2Joint {
    constructor(def) {
        super(def);
        this.m_localAnchorB = new b2_math_1.b2Vec2();
        this.m_targetA = new b2_math_1.b2Vec2();
        this.m_stiffness = 0;
        this.m_damping = 0;
        this.m_beta = 0;
        // Solver shared
        this.m_impulse = new b2_math_1.b2Vec2();
        this.m_maxForce = 0;
        this.m_gamma = 0;
        // Solver temp
        this.m_indexA = 0;
        this.m_indexB = 0;
        this.m_rB = new b2_math_1.b2Vec2();
        this.m_localCenterB = new b2_math_1.b2Vec2();
        this.m_invMassB = 0;
        this.m_invIB = 0;
        this.m_mass = new b2_math_1.b2Mat22();
        this.m_C = new b2_math_1.b2Vec2();
        this.m_qB = new b2_math_1.b2Rot();
        this.m_lalcB = new b2_math_1.b2Vec2();
        this.m_K = new b2_math_1.b2Mat22();
        this.m_targetA.Copy((0, b2_settings_1.b2Maybe)(def.target, b2_math_1.b2Vec2.ZERO));
        // DEBUG: b2Assert(this.m_targetA.IsValid());
        b2_math_1.b2Transform.MulTXV(this.m_bodyB.GetTransform(), this.m_targetA, this.m_localAnchorB);
        this.m_maxForce = (0, b2_settings_1.b2Maybe)(def.maxForce, 0);
        // DEBUG: b2Assert(b2IsValid(this.m_maxForce) && this.m_maxForce >= 0);
        this.m_impulse.SetZero();
        this.m_stiffness = (0, b2_settings_1.b2Maybe)(def.stiffness, 0);
        // DEBUG: b2Assert(b2IsValid(this.m_stiffness) && this.m_stiffness >= 0);
        this.m_damping = (0, b2_settings_1.b2Maybe)(def.damping, 0);
        // DEBUG: b2Assert(b2IsValid(this.m_damping) && this.m_damping >= 0);
        this.m_beta = 0;
        this.m_gamma = 0;
    }
    SetTarget(target) {
        if (!this.m_bodyB.IsAwake()) {
            this.m_bodyB.SetAwake(true);
        }
        this.m_targetA.Copy(target);
    }
    GetTarget() {
        return this.m_targetA;
    }
    SetMaxForce(maxForce) {
        this.m_maxForce = maxForce;
    }
    GetMaxForce() {
        return this.m_maxForce;
    }
    SetStiffness(stiffness) {
        this.m_stiffness = stiffness;
    }
    GetStiffness() {
        return this.m_stiffness;
    }
    SetDamping(damping) {
        this.m_damping = damping;
    }
    GetDamping() {
        return this.m_damping;
    }
    InitVelocityConstraints(data) {
        this.m_indexB = this.m_bodyB.m_islandIndex;
        this.m_localCenterB.Copy(this.m_bodyB.m_sweep.localCenter);
        this.m_invMassB = this.m_bodyB.m_invMass;
        this.m_invIB = this.m_bodyB.m_invI;
        const cB = data.positions[this.m_indexB].c;
        const aB = data.positions[this.m_indexB].a;
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        const qB = this.m_qB.SetAngle(aB);
        const mass = this.m_bodyB.GetMass();
        // Frequency
        const omega = 2 * b2_settings_1.b2_pi * this.m_stiffness;
        // Damping coefficient
        const d = 2 * mass * this.m_damping * omega;
        // Spring stiffness
        const k = mass * (omega * omega);
        // magic formulas
        // gamma has units of inverse mass.
        // beta has units of inverse time.
        const h = data.step.dt;
        this.m_gamma = h * (d + h * k);
        if (this.m_gamma !== 0) {
            this.m_gamma = 1 / this.m_gamma;
        }
        this.m_beta = h * k * this.m_gamma;
        // Compute the effective mass matrix.
        b2_math_1.b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
        b2_math_1.b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
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
            wB += this.m_invIB * b2_math_1.b2Vec2.CrossVV(this.m_rB, this.m_impulse);
        }
        else {
            this.m_impulse.SetZero();
        }
        // data.velocities[this.m_indexB].v = vB;
        data.velocities[this.m_indexB].w = wB;
    }
    SolveVelocityConstraints(data) {
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        // Cdot = v + cross(w, r)
        // b2Vec2 Cdot = vB + b2Cross(wB, m_rB);
        const Cdot = b2_math_1.b2Vec2.AddVCrossSV(vB, wB, this.m_rB, b2MouseJoint.SolveVelocityConstraints_s_Cdot);
        //  b2Vec2 impulse = b2Mul(m_mass, -(Cdot + m_C + m_gamma * m_impulse));
        const impulse = b2_math_1.b2Mat22.MulMV(this.m_mass, b2_math_1.b2Vec2.AddVV(Cdot, b2_math_1.b2Vec2.AddVV(this.m_C, b2_math_1.b2Vec2.MulSV(this.m_gamma, this.m_impulse, b2_math_1.b2Vec2.s_t0), b2_math_1.b2Vec2.s_t0), b2_math_1.b2Vec2.s_t0).SelfNeg(), b2MouseJoint.SolveVelocityConstraints_s_impulse);
        // b2Vec2 oldImpulse = m_impulse;
        const oldImpulse = b2MouseJoint.SolveVelocityConstraints_s_oldImpulse.Copy(this.m_impulse);
        // m_impulse += impulse;
        this.m_impulse.SelfAdd(impulse);
        const maxImpulse = data.step.dt * this.m_maxForce;
        if (this.m_impulse.LengthSquared() > maxImpulse * maxImpulse) {
            this.m_impulse.SelfMul(maxImpulse / this.m_impulse.Length());
        }
        // impulse = m_impulse - oldImpulse;
        b2_math_1.b2Vec2.SubVV(this.m_impulse, oldImpulse, impulse);
        // vB += m_invMassB * impulse;
        vB.SelfMulAdd(this.m_invMassB, impulse);
        wB += this.m_invIB * b2_math_1.b2Vec2.CrossVV(this.m_rB, impulse);
        // data.velocities[this.m_indexB].v = vB;
        data.velocities[this.m_indexB].w = wB;
    }
    SolvePositionConstraints(data) {
        return true;
    }
    GetAnchorA(out) {
        out.x = this.m_targetA.x;
        out.y = this.m_targetA.y;
        return out;
    }
    GetAnchorB(out) {
        return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
    }
    GetReactionForce(inv_dt, out) {
        return b2_math_1.b2Vec2.MulSV(inv_dt, this.m_impulse, out);
    }
    GetReactionTorque(inv_dt) {
        return 0;
    }
    Dump(log) {
        log("Mouse joint dumping is not supported.\n");
    }
    ShiftOrigin(newOrigin) {
        this.m_targetA.SelfSub(newOrigin);
    }
}
exports.b2MouseJoint = b2MouseJoint;
b2MouseJoint.SolveVelocityConstraints_s_Cdot = new b2_math_1.b2Vec2();
b2MouseJoint.SolveVelocityConstraints_s_impulse = new b2_math_1.b2Vec2();
b2MouseJoint.SolveVelocityConstraints_s_oldImpulse = new b2_math_1.b2Vec2();
