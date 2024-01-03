"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2WheelJoint = exports.b2WheelJointDef = void 0;
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
const b2_settings_js_1 = require("../common/b2_settings.js");
const b2_math_js_1 = require("../common/b2_math.js");
const b2_joint_js_1 = require("./b2_joint.js");
const b2_draw_js_1 = require("../common/b2_draw.js");
/// Wheel joint definition. This requires defining a line of
/// motion using an axis and an anchor point. The definition uses local
/// anchor points and a local axis so that the initial configuration
/// can violate the constraint slightly. The joint translation is zero
/// when the local anchor points coincide in world space. Using local
/// anchors and a local axis helps when saving and loading a game.
class b2WheelJointDef extends b2_joint_js_1.b2JointDef {
    constructor() {
        super(b2_joint_js_1.b2JointType.e_wheelJoint);
        this.localAnchorA = new b2_math_js_1.b2Vec2(0, 0);
        this.localAnchorB = new b2_math_js_1.b2Vec2(0, 0);
        this.localAxisA = new b2_math_js_1.b2Vec2(1, 0);
        this.enableLimit = false;
        this.lowerTranslation = 0;
        this.upperTranslation = 0;
        this.enableMotor = false;
        this.maxMotorTorque = 0;
        this.motorSpeed = 0;
        this.stiffness = 0;
        this.damping = 0;
    }
    Initialize(bA, bB, anchor, axis) {
        this.bodyA = bA;
        this.bodyB = bB;
        this.bodyA.GetLocalPoint(anchor, this.localAnchorA);
        this.bodyB.GetLocalPoint(anchor, this.localAnchorB);
        this.bodyA.GetLocalVector(axis, this.localAxisA);
    }
}
exports.b2WheelJointDef = b2WheelJointDef;
class b2WheelJoint extends b2_joint_js_1.b2Joint {
    constructor(def) {
        super(def);
        this.m_localAnchorA = new b2_math_js_1.b2Vec2();
        this.m_localAnchorB = new b2_math_js_1.b2Vec2();
        this.m_localXAxisA = new b2_math_js_1.b2Vec2();
        this.m_localYAxisA = new b2_math_js_1.b2Vec2();
        this.m_impulse = 0;
        this.m_motorImpulse = 0;
        this.m_springImpulse = 0;
        this.m_lowerImpulse = 0;
        this.m_upperImpulse = 0;
        this.m_translation = 0;
        this.m_lowerTranslation = 0;
        this.m_upperTranslation = 0;
        this.m_maxMotorTorque = 0;
        this.m_motorSpeed = 0;
        this.m_enableLimit = false;
        this.m_enableMotor = false;
        this.m_stiffness = 0;
        this.m_damping = 0;
        // Solver temp
        this.m_indexA = 0;
        this.m_indexB = 0;
        this.m_localCenterA = new b2_math_js_1.b2Vec2();
        this.m_localCenterB = new b2_math_js_1.b2Vec2();
        this.m_invMassA = 0;
        this.m_invMassB = 0;
        this.m_invIA = 0;
        this.m_invIB = 0;
        this.m_ax = new b2_math_js_1.b2Vec2();
        this.m_ay = new b2_math_js_1.b2Vec2();
        this.m_sAx = 0;
        this.m_sBx = 0;
        this.m_sAy = 0;
        this.m_sBy = 0;
        this.m_mass = 0;
        this.m_motorMass = 0;
        this.m_axialMass = 0;
        this.m_springMass = 0;
        this.m_bias = 0;
        this.m_gamma = 0;
        this.m_qA = new b2_math_js_1.b2Rot();
        this.m_qB = new b2_math_js_1.b2Rot();
        this.m_lalcA = new b2_math_js_1.b2Vec2();
        this.m_lalcB = new b2_math_js_1.b2Vec2();
        this.m_rA = new b2_math_js_1.b2Vec2();
        this.m_rB = new b2_math_js_1.b2Vec2();
        this.m_localAnchorA.Copy((0, b2_settings_js_1.b2Maybe)(def.localAnchorA, b2_math_js_1.b2Vec2.ZERO));
        this.m_localAnchorB.Copy((0, b2_settings_js_1.b2Maybe)(def.localAnchorB, b2_math_js_1.b2Vec2.ZERO));
        this.m_localXAxisA.Copy((0, b2_settings_js_1.b2Maybe)(def.localAxisA, b2_math_js_1.b2Vec2.UNITX));
        b2_math_js_1.b2Vec2.CrossOneV(this.m_localXAxisA, this.m_localYAxisA);
        this.m_lowerTranslation = (0, b2_settings_js_1.b2Maybe)(def.lowerTranslation, 0);
        this.m_upperTranslation = (0, b2_settings_js_1.b2Maybe)(def.upperTranslation, 0);
        this.m_enableLimit = (0, b2_settings_js_1.b2Maybe)(def.enableLimit, false);
        this.m_maxMotorTorque = (0, b2_settings_js_1.b2Maybe)(def.maxMotorTorque, 0);
        this.m_motorSpeed = (0, b2_settings_js_1.b2Maybe)(def.motorSpeed, 0);
        this.m_enableMotor = (0, b2_settings_js_1.b2Maybe)(def.enableMotor, false);
        this.m_ax.SetZero();
        this.m_ay.SetZero();
        this.m_stiffness = (0, b2_settings_js_1.b2Maybe)(def.stiffness, 0);
        this.m_damping = (0, b2_settings_js_1.b2Maybe)(def.damping, 0);
    }
    GetMotorSpeed() {
        return this.m_motorSpeed;
    }
    GetMaxMotorTorque() {
        return this.m_maxMotorTorque;
    }
    SetSpringFrequencyHz(hz) {
        this.m_stiffness = hz;
    }
    GetSpringFrequencyHz() {
        return this.m_stiffness;
    }
    SetSpringDampingRatio(ratio) {
        this.m_damping = ratio;
    }
    GetSpringDampingRatio() {
        return this.m_damping;
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
        const mA = this.m_invMassA, mB = this.m_invMassB;
        const iA = this.m_invIA, iB = this.m_invIB;
        const cA = data.positions[this.m_indexA].c;
        const aA = data.positions[this.m_indexA].a;
        const vA = data.velocities[this.m_indexA].v;
        let wA = data.velocities[this.m_indexA].w;
        const cB = data.positions[this.m_indexB].c;
        const aB = data.positions[this.m_indexB].a;
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        const qA = this.m_qA.SetAngle(aA), qB = this.m_qB.SetAngle(aB);
        // Compute the effective masses.
        // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
        b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
        const rA = b2_math_js_1.b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
        // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
        b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
        const rB = b2_math_js_1.b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
        // b2Vec2 d = cB + rB - cA - rA;
        const d = b2_math_js_1.b2Vec2.SubVV(b2_math_js_1.b2Vec2.AddVV(cB, rB, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.AddVV(cA, rA, b2_math_js_1.b2Vec2.s_t1), b2WheelJoint.InitVelocityConstraints_s_d);
        // Point to line constraint
        {
            // m_ay = b2Mul(qA, m_localYAxisA);
            b2_math_js_1.b2Rot.MulRV(qA, this.m_localYAxisA, this.m_ay);
            // m_sAy = b2Cross(d + rA, m_ay);
            this.m_sAy = b2_math_js_1.b2Vec2.CrossVV(b2_math_js_1.b2Vec2.AddVV(d, rA, b2_math_js_1.b2Vec2.s_t0), this.m_ay);
            // m_sBy = b2Cross(rB, m_ay);
            this.m_sBy = b2_math_js_1.b2Vec2.CrossVV(rB, this.m_ay);
            this.m_mass = mA + mB + iA * this.m_sAy * this.m_sAy + iB * this.m_sBy * this.m_sBy;
            if (this.m_mass > 0) {
                this.m_mass = 1 / this.m_mass;
            }
        }
        // Spring constraint
        b2_math_js_1.b2Rot.MulRV(qA, this.m_localXAxisA, this.m_ax); // m_ax = b2Mul(qA, m_localXAxisA);
        this.m_sAx = b2_math_js_1.b2Vec2.CrossVV(b2_math_js_1.b2Vec2.AddVV(d, rA, b2_math_js_1.b2Vec2.s_t0), this.m_ax);
        this.m_sBx = b2_math_js_1.b2Vec2.CrossVV(rB, this.m_ax);
        const invMass = mA + mB + iA * this.m_sAx * this.m_sAx + iB * this.m_sBx * this.m_sBx;
        if (invMass > 0.0) {
            this.m_axialMass = 1.0 / invMass;
        }
        else {
            this.m_axialMass = 0.0;
        }
        this.m_springMass = 0;
        this.m_bias = 0;
        this.m_gamma = 0;
        if (this.m_stiffness > 0.0 && invMass > 0.0) {
            this.m_springMass = 1.0 / invMass;
            const C = b2_math_js_1.b2Vec2.DotVV(d, this.m_ax);
            // magic formulas
            const h = data.step.dt;
            this.m_gamma = h * (this.m_damping + h * this.m_stiffness);
            if (this.m_gamma > 0.0) {
                this.m_gamma = 1.0 / this.m_gamma;
            }
            this.m_bias = C * h * this.m_stiffness * this.m_gamma;
            this.m_springMass = invMass + this.m_gamma;
            if (this.m_springMass > 0.0) {
                this.m_springMass = 1.0 / this.m_springMass;
            }
        }
        else {
            this.m_springImpulse = 0.0;
        }
        if (this.m_enableLimit) {
            this.m_translation = b2_math_js_1.b2Vec2.DotVV(this.m_ax, d);
        }
        else {
            this.m_lowerImpulse = 0.0;
            this.m_upperImpulse = 0.0;
        }
        if (this.m_enableMotor) {
            this.m_motorMass = iA + iB;
            if (this.m_motorMass > 0) {
                this.m_motorMass = 1 / this.m_motorMass;
            }
        }
        else {
            this.m_motorMass = 0;
            this.m_motorImpulse = 0;
        }
        if (data.step.warmStarting) {
            // Account for variable time step.
            this.m_impulse *= data.step.dtRatio;
            this.m_springImpulse *= data.step.dtRatio;
            this.m_motorImpulse *= data.step.dtRatio;
            const axialImpulse = this.m_springImpulse + this.m_lowerImpulse - this.m_upperImpulse;
            // b2Vec2 P = m_impulse * m_ay + m_springImpulse * m_ax;
            const P = b2_math_js_1.b2Vec2.AddVV(b2_math_js_1.b2Vec2.MulSV(this.m_impulse, this.m_ay, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.MulSV(axialImpulse, this.m_ax, b2_math_js_1.b2Vec2.s_t1), b2WheelJoint.InitVelocityConstraints_s_P);
            // float32 LA = m_impulse * m_sAy + m_springImpulse * m_sAx + m_motorImpulse;
            const LA = this.m_impulse * this.m_sAy + axialImpulse * this.m_sAx + this.m_motorImpulse;
            // float32 LB = m_impulse * m_sBy + m_springImpulse * m_sBx + m_motorImpulse;
            const LB = this.m_impulse * this.m_sBy + axialImpulse * this.m_sBx + this.m_motorImpulse;
            // vA -= m_invMassA * P;
            vA.SelfMulSub(this.m_invMassA, P);
            wA -= this.m_invIA * LA;
            // vB += m_invMassB * P;
            vB.SelfMulAdd(this.m_invMassB, P);
            wB += this.m_invIB * LB;
        }
        else {
            this.m_impulse = 0;
            this.m_springImpulse = 0;
            this.m_motorImpulse = 0;
            this.m_lowerImpulse = 0;
            this.m_upperImpulse = 0;
        }
        // data.velocities[this.m_indexA].v = vA;
        data.velocities[this.m_indexA].w = wA;
        // data.velocities[this.m_indexB].v = vB;
        data.velocities[this.m_indexB].w = wB;
    }
    SolveVelocityConstraints(data) {
        const mA = this.m_invMassA, mB = this.m_invMassB;
        const iA = this.m_invIA, iB = this.m_invIB;
        const vA = data.velocities[this.m_indexA].v;
        let wA = data.velocities[this.m_indexA].w;
        const vB = data.velocities[this.m_indexB].v;
        let wB = data.velocities[this.m_indexB].w;
        // Solve spring constraint
        {
            const Cdot = b2_math_js_1.b2Vec2.DotVV(this.m_ax, b2_math_js_1.b2Vec2.SubVV(vB, vA, b2_math_js_1.b2Vec2.s_t0)) + this.m_sBx * wB - this.m_sAx * wA;
            const impulse = -this.m_springMass * (Cdot + this.m_bias + this.m_gamma * this.m_springImpulse);
            this.m_springImpulse += impulse;
            // b2Vec2 P = impulse * m_ax;
            const P = b2_math_js_1.b2Vec2.MulSV(impulse, this.m_ax, b2WheelJoint.SolveVelocityConstraints_s_P);
            const LA = impulse * this.m_sAx;
            const LB = impulse * this.m_sBx;
            // vA -= mA * P;
            vA.SelfMulSub(mA, P);
            wA -= iA * LA;
            // vB += mB * P;
            vB.SelfMulAdd(mB, P);
            wB += iB * LB;
        }
        // Solve rotational motor constraint
        {
            const Cdot = wB - wA - this.m_motorSpeed;
            let impulse = -this.m_motorMass * Cdot;
            const oldImpulse = this.m_motorImpulse;
            const maxImpulse = data.step.dt * this.m_maxMotorTorque;
            this.m_motorImpulse = (0, b2_math_js_1.b2Clamp)(this.m_motorImpulse + impulse, -maxImpulse, maxImpulse);
            impulse = this.m_motorImpulse - oldImpulse;
            wA -= iA * impulse;
            wB += iB * impulse;
        }
        if (this.m_enableLimit) {
            // Lower limit
            {
                const C = this.m_translation - this.m_lowerTranslation;
                const Cdot = b2_math_js_1.b2Vec2.DotVV(this.m_ax, b2_math_js_1.b2Vec2.SubVV(vB, vA, b2_math_js_1.b2Vec2.s_t0)) + this.m_sBx * wB - this.m_sAx * wA;
                let impulse = -this.m_axialMass * (Cdot + (0, b2_math_js_1.b2Max)(C, 0.0) * data.step.inv_dt);
                const oldImpulse = this.m_lowerImpulse;
                this.m_lowerImpulse = (0, b2_math_js_1.b2Max)(this.m_lowerImpulse + impulse, 0.0);
                impulse = this.m_lowerImpulse - oldImpulse;
                // b2Vec2 P = impulse * this.m_ax;
                const P = b2_math_js_1.b2Vec2.MulSV(impulse, this.m_ax, b2WheelJoint.SolveVelocityConstraints_s_P);
                const LA = impulse * this.m_sAx;
                const LB = impulse * this.m_sBx;
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
                const C = this.m_upperTranslation - this.m_translation;
                const Cdot = b2_math_js_1.b2Vec2.DotVV(this.m_ax, b2_math_js_1.b2Vec2.SubVV(vA, vB, b2_math_js_1.b2Vec2.s_t0)) + this.m_sAx * wA - this.m_sBx * wB;
                let impulse = -this.m_axialMass * (Cdot + (0, b2_math_js_1.b2Max)(C, 0.0) * data.step.inv_dt);
                const oldImpulse = this.m_upperImpulse;
                this.m_upperImpulse = (0, b2_math_js_1.b2Max)(this.m_upperImpulse + impulse, 0.0);
                impulse = this.m_upperImpulse - oldImpulse;
                // b2Vec2 P = impulse * this.m_ax;
                const P = b2_math_js_1.b2Vec2.MulSV(impulse, this.m_ax, b2WheelJoint.SolveVelocityConstraints_s_P);
                const LA = impulse * this.m_sAx;
                const LB = impulse * this.m_sBx;
                // vA += mA * P;
                vA.SelfMulAdd(mA, P);
                wA += iA * LA;
                // vB -= mB * P;
                vB.SelfMulSub(mB, P);
                wB -= iB * LB;
            }
        }
        // Solve point to line constraint
        {
            const Cdot = b2_math_js_1.b2Vec2.DotVV(this.m_ay, b2_math_js_1.b2Vec2.SubVV(vB, vA, b2_math_js_1.b2Vec2.s_t0)) + this.m_sBy * wB - this.m_sAy * wA;
            const impulse = -this.m_mass * Cdot;
            this.m_impulse += impulse;
            // b2Vec2 P = impulse * m_ay;
            const P = b2_math_js_1.b2Vec2.MulSV(impulse, this.m_ay, b2WheelJoint.SolveVelocityConstraints_s_P);
            const LA = impulse * this.m_sAy;
            const LB = impulse * this.m_sBy;
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
    SolvePositionConstraints(data) {
        const cA = data.positions[this.m_indexA].c;
        let aA = data.positions[this.m_indexA].a;
        const cB = data.positions[this.m_indexB].c;
        let aB = data.positions[this.m_indexB].a;
        // const qA: b2Rot = this.m_qA.SetAngle(aA), qB: b2Rot = this.m_qB.SetAngle(aB);
        // // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
        // b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
        // const rA: b2Vec2 = b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
        // // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
        // b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
        // const rB: b2Vec2 = b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
        // // b2Vec2 d = (cB - cA) + rB - rA;
        // const d: b2Vec2 = b2Vec2.AddVV(
        //   b2Vec2.SubVV(cB, cA, b2Vec2.s_t0),
        //   b2Vec2.SubVV(rB, rA, b2Vec2.s_t1),
        //   b2WheelJoint.SolvePositionConstraints_s_d);
        // // b2Vec2 ay = b2Mul(qA, m_localYAxisA);
        // const ay: b2Vec2 = b2Rot.MulRV(qA, this.m_localYAxisA, this.m_ay);
        // // float32 sAy = b2Cross(d + rA, ay);
        // const sAy = b2Vec2.CrossVV(b2Vec2.AddVV(d, rA, b2Vec2.s_t0), ay);
        // // float32 sBy = b2Cross(rB, ay);
        // const sBy = b2Vec2.CrossVV(rB, ay);
        // // float32 C = b2Dot(d, ay);
        // const C: number = b2Vec2.DotVV(d, this.m_ay);
        // const k: number = this.m_invMassA + this.m_invMassB + this.m_invIA * this.m_sAy * this.m_sAy + this.m_invIB * this.m_sBy * this.m_sBy;
        // let impulse: number;
        // if (k !== 0) {
        //   impulse = - C / k;
        // } else {
        //   impulse = 0;
        // }
        // // b2Vec2 P = impulse * ay;
        // const P: b2Vec2 = b2Vec2.MulSV(impulse, ay, b2WheelJoint.SolvePositionConstraints_s_P);
        // const LA: number = impulse * sAy;
        // const LB: number = impulse * sBy;
        // // cA -= m_invMassA * P;
        // cA.SelfMulSub(this.m_invMassA, P);
        // aA -= this.m_invIA * LA;
        // // cB += m_invMassB * P;
        // cB.SelfMulAdd(this.m_invMassB, P);
        // aB += this.m_invIB * LB;
        let linearError = 0.0;
        if (this.m_enableLimit) {
            // b2Rot qA(aA), qB(aB);
            const qA = this.m_qA.SetAngle(aA), qB = this.m_qB.SetAngle(aB);
            // b2Vec2 rA = b2Mul(qA, this.m_localAnchorA - this.m_localCenterA);
            // b2Vec2 rB = b2Mul(qB, this.m_localAnchorB - this.m_localCenterB);
            // b2Vec2 d = (cB - cA) + rB - rA;
            // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
            b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
            const rA = b2_math_js_1.b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
            // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
            b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
            const rB = b2_math_js_1.b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
            // b2Vec2 d = (cB - cA) + rB - rA;
            const d = b2_math_js_1.b2Vec2.AddVV(b2_math_js_1.b2Vec2.SubVV(cB, cA, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.SubVV(rB, rA, b2_math_js_1.b2Vec2.s_t1), b2WheelJoint.SolvePositionConstraints_s_d);
            // b2Vec2 ax = b2Mul(qA, this.m_localXAxisA);
            const ax = b2_math_js_1.b2Rot.MulRV(qA, this.m_localXAxisA, this.m_ax);
            // float sAx = b2Cross(d + rA, this.m_ax);
            const sAx = b2_math_js_1.b2Vec2.CrossVV(b2_math_js_1.b2Vec2.AddVV(d, rA, b2_math_js_1.b2Vec2.s_t0), this.m_ax);
            // float sBx = b2Cross(rB, this.m_ax);
            const sBx = b2_math_js_1.b2Vec2.CrossVV(rB, this.m_ax);
            let C = 0.0;
            const translation = b2_math_js_1.b2Vec2.DotVV(ax, d);
            if ((0, b2_math_js_1.b2Abs)(this.m_upperTranslation - this.m_lowerTranslation) < 2.0 * b2_settings_js_1.b2_linearSlop) {
                C = translation;
            }
            else if (translation <= this.m_lowerTranslation) {
                C = (0, b2_math_js_1.b2Min)(translation - this.m_lowerTranslation, 0.0);
            }
            else if (translation >= this.m_upperTranslation) {
                C = (0, b2_math_js_1.b2Max)(translation - this.m_upperTranslation, 0.0);
            }
            if (C !== 0.0) {
                const invMass = this.m_invMassA + this.m_invMassB + this.m_invIA * sAx * sAx + this.m_invIB * sBx * sBx;
                let impulse = 0.0;
                if (invMass !== 0.0) {
                    impulse = -C / invMass;
                }
                const P = b2_math_js_1.b2Vec2.MulSV(impulse, ax, b2WheelJoint.SolvePositionConstraints_s_P);
                const LA = impulse * sAx;
                const LB = impulse * sBx;
                // cA -= m_invMassA * P;
                cA.SelfMulSub(this.m_invMassA, P);
                aA -= this.m_invIA * LA;
                // cB += m_invMassB * P;
                cB.SelfMulAdd(this.m_invMassB, P);
                // aB += m_invIB * LB;
                aB += this.m_invIB * LB;
                linearError = (0, b2_math_js_1.b2Abs)(C);
            }
        }
        // Solve perpendicular constraint
        {
            // b2Rot qA(aA), qB(aB);
            const qA = this.m_qA.SetAngle(aA), qB = this.m_qB.SetAngle(aB);
            // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
            // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
            // b2Vec2 d = (cB - cA) + rB - rA;
            // b2Vec2 rA = b2Mul(qA, m_localAnchorA - m_localCenterA);
            b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorA, this.m_localCenterA, this.m_lalcA);
            const rA = b2_math_js_1.b2Rot.MulRV(qA, this.m_lalcA, this.m_rA);
            // b2Vec2 rB = b2Mul(qB, m_localAnchorB - m_localCenterB);
            b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorB, this.m_localCenterB, this.m_lalcB);
            const rB = b2_math_js_1.b2Rot.MulRV(qB, this.m_lalcB, this.m_rB);
            // b2Vec2 d = (cB - cA) + rB - rA;
            const d = b2_math_js_1.b2Vec2.AddVV(b2_math_js_1.b2Vec2.SubVV(cB, cA, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.SubVV(rB, rA, b2_math_js_1.b2Vec2.s_t1), b2WheelJoint.SolvePositionConstraints_s_d);
            // b2Vec2 ay = b2Mul(qA, m_localYAxisA);
            const ay = b2_math_js_1.b2Rot.MulRV(qA, this.m_localYAxisA, this.m_ay);
            // float sAy = b2Cross(d + rA, ay);
            const sAy = b2_math_js_1.b2Vec2.CrossVV(b2_math_js_1.b2Vec2.AddVV(d, rA, b2_math_js_1.b2Vec2.s_t0), ay);
            // float sBy = b2Cross(rB, ay);
            const sBy = b2_math_js_1.b2Vec2.CrossVV(rB, ay);
            // float C = b2Dot(d, ay);
            const C = b2_math_js_1.b2Vec2.DotVV(d, ay);
            const invMass = this.m_invMassA + this.m_invMassB + this.m_invIA * this.m_sAy * this.m_sAy + this.m_invIB * this.m_sBy * this.m_sBy;
            let impulse = 0.0;
            if (invMass !== 0.0) {
                impulse = -C / invMass;
            }
            // b2Vec2 P = impulse * ay;
            // const LA: number = impulse * sAy;
            // const LB: number = impulse * sBy;
            const P = b2_math_js_1.b2Vec2.MulSV(impulse, ay, b2WheelJoint.SolvePositionConstraints_s_P);
            const LA = impulse * sAy;
            const LB = impulse * sBy;
            // cA -= m_invMassA * P;
            cA.SelfMulSub(this.m_invMassA, P);
            aA -= this.m_invIA * LA;
            // cB += m_invMassB * P;
            cB.SelfMulAdd(this.m_invMassB, P);
            aB += this.m_invIB * LB;
            linearError = (0, b2_math_js_1.b2Max)(linearError, (0, b2_math_js_1.b2Abs)(C));
        }
        // data.positions[this.m_indexA].c = cA;
        data.positions[this.m_indexA].a = aA;
        // data.positions[this.m_indexB].c = cB;
        data.positions[this.m_indexB].a = aB;
        return linearError <= b2_settings_js_1.b2_linearSlop;
    }
    GetDefinition(def) {
        // DEBUG: b2Assert(false); // TODO
        return def;
    }
    GetAnchorA(out) {
        return this.m_bodyA.GetWorldPoint(this.m_localAnchorA, out);
    }
    GetAnchorB(out) {
        return this.m_bodyB.GetWorldPoint(this.m_localAnchorB, out);
    }
    GetReactionForce(inv_dt, out) {
        out.x = inv_dt * (this.m_impulse * this.m_ay.x + (this.m_springImpulse + this.m_lowerImpulse - this.m_upperImpulse) * this.m_ax.x);
        out.y = inv_dt * (this.m_impulse * this.m_ay.y + (this.m_springImpulse + this.m_lowerImpulse - this.m_upperImpulse) * this.m_ax.y);
        return out;
    }
    GetReactionTorque(inv_dt) {
        return inv_dt * this.m_motorImpulse;
    }
    GetLocalAnchorA() { return this.m_localAnchorA; }
    GetLocalAnchorB() { return this.m_localAnchorB; }
    GetLocalAxisA() { return this.m_localXAxisA; }
    GetJointTranslation() {
        return this.GetPrismaticJointTranslation();
    }
    GetJointLinearSpeed() {
        return this.GetPrismaticJointSpeed();
    }
    GetJointAngle() {
        return this.GetRevoluteJointAngle();
    }
    GetJointAngularSpeed() {
        return this.GetRevoluteJointSpeed();
    }
    GetPrismaticJointTranslation() {
        const bA = this.m_bodyA;
        const bB = this.m_bodyB;
        const pA = bA.GetWorldPoint(this.m_localAnchorA, new b2_math_js_1.b2Vec2());
        const pB = bB.GetWorldPoint(this.m_localAnchorB, new b2_math_js_1.b2Vec2());
        const d = b2_math_js_1.b2Vec2.SubVV(pB, pA, new b2_math_js_1.b2Vec2());
        const axis = bA.GetWorldVector(this.m_localXAxisA, new b2_math_js_1.b2Vec2());
        const translation = b2_math_js_1.b2Vec2.DotVV(d, axis);
        return translation;
    }
    GetPrismaticJointSpeed() {
        const bA = this.m_bodyA;
        const bB = this.m_bodyB;
        // b2Vec2 rA = b2Mul(bA.m_xf.q, m_localAnchorA - bA.m_sweep.localCenter);
        b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorA, bA.m_sweep.localCenter, this.m_lalcA);
        const rA = b2_math_js_1.b2Rot.MulRV(bA.m_xf.q, this.m_lalcA, this.m_rA);
        // b2Vec2 rB = b2Mul(bB.m_xf.q, m_localAnchorB - bB.m_sweep.localCenter);
        b2_math_js_1.b2Vec2.SubVV(this.m_localAnchorB, bB.m_sweep.localCenter, this.m_lalcB);
        const rB = b2_math_js_1.b2Rot.MulRV(bB.m_xf.q, this.m_lalcB, this.m_rB);
        // b2Vec2 pA = bA.m_sweep.c + rA;
        const pA = b2_math_js_1.b2Vec2.AddVV(bA.m_sweep.c, rA, b2_math_js_1.b2Vec2.s_t0); // pA uses s_t0
        // b2Vec2 pB = bB.m_sweep.c + rB;
        const pB = b2_math_js_1.b2Vec2.AddVV(bB.m_sweep.c, rB, b2_math_js_1.b2Vec2.s_t1); // pB uses s_t1
        // b2Vec2 d = pB - pA;
        const d = b2_math_js_1.b2Vec2.SubVV(pB, pA, b2_math_js_1.b2Vec2.s_t2); // d uses s_t2
        // b2Vec2 axis = b2Mul(bA.m_xf.q, m_localXAxisA);
        const axis = bA.GetWorldVector(this.m_localXAxisA, new b2_math_js_1.b2Vec2());
        const vA = bA.m_linearVelocity;
        const vB = bB.m_linearVelocity;
        const wA = bA.m_angularVelocity;
        const wB = bB.m_angularVelocity;
        // float32 speed = b2Dot(d, b2Cross(wA, axis)) + b2Dot(axis, vB + b2Cross(wB, rB) - vA - b2Cross(wA, rA));
        const speed = b2_math_js_1.b2Vec2.DotVV(d, b2_math_js_1.b2Vec2.CrossSV(wA, axis, b2_math_js_1.b2Vec2.s_t0)) +
            b2_math_js_1.b2Vec2.DotVV(axis, b2_math_js_1.b2Vec2.SubVV(b2_math_js_1.b2Vec2.AddVCrossSV(vB, wB, rB, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.AddVCrossSV(vA, wA, rA, b2_math_js_1.b2Vec2.s_t1), b2_math_js_1.b2Vec2.s_t0));
        return speed;
    }
    GetRevoluteJointAngle() {
        // b2Body* bA = this.m_bodyA;
        // b2Body* bB = this.m_bodyB;
        // return bB.this.m_sweep.a - bA.this.m_sweep.a;
        return this.m_bodyB.m_sweep.a - this.m_bodyA.m_sweep.a;
    }
    GetRevoluteJointSpeed() {
        const wA = this.m_bodyA.m_angularVelocity;
        const wB = this.m_bodyB.m_angularVelocity;
        return wB - wA;
    }
    IsMotorEnabled() {
        return this.m_enableMotor;
    }
    EnableMotor(flag) {
        if (flag !== this.m_enableMotor) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_enableMotor = flag;
        }
    }
    SetMotorSpeed(speed) {
        if (speed !== this.m_motorSpeed) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_motorSpeed = speed;
        }
    }
    SetMaxMotorTorque(force) {
        if (force !== this.m_maxMotorTorque) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_maxMotorTorque = force;
        }
    }
    GetMotorTorque(inv_dt) {
        return inv_dt * this.m_motorImpulse;
    }
    /// Is the joint limit enabled?
    IsLimitEnabled() {
        return this.m_enableLimit;
    }
    /// Enable/disable the joint translation limit.
    EnableLimit(flag) {
        if (flag !== this.m_enableLimit) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_enableLimit = flag;
            this.m_lowerImpulse = 0.0;
            this.m_upperImpulse = 0.0;
        }
    }
    /// Get the lower joint translation limit, usually in meters.
    GetLowerLimit() {
        return this.m_lowerTranslation;
    }
    /// Get the upper joint translation limit, usually in meters.
    GetUpperLimit() {
        return this.m_upperTranslation;
    }
    /// Set the joint translation limits, usually in meters.
    SetLimits(lower, upper) {
        // b2Assert(lower <= upper);
        if (lower !== this.m_lowerTranslation || upper !== this.m_upperTranslation) {
            this.m_bodyA.SetAwake(true);
            this.m_bodyB.SetAwake(true);
            this.m_lowerTranslation = lower;
            this.m_upperTranslation = upper;
            this.m_lowerImpulse = 0.0;
            this.m_upperImpulse = 0.0;
        }
    }
    Dump(log) {
        const indexA = this.m_bodyA.m_islandIndex;
        const indexB = this.m_bodyB.m_islandIndex;
        log("  const jd: b2WheelJointDef = new b2WheelJointDef();\n");
        log("  jd.bodyA = bodies[%d];\n", indexA);
        log("  jd.bodyB = bodies[%d];\n", indexB);
        log("  jd.collideConnected = %s;\n", (this.m_collideConnected) ? ("true") : ("false"));
        log("  jd.localAnchorA.Set(%.15f, %.15f);\n", this.m_localAnchorA.x, this.m_localAnchorA.y);
        log("  jd.localAnchorB.Set(%.15f, %.15f);\n", this.m_localAnchorB.x, this.m_localAnchorB.y);
        log("  jd.localAxisA.Set(%.15f, %.15f);\n", this.m_localXAxisA.x, this.m_localXAxisA.y);
        log("  jd.enableMotor = %s;\n", (this.m_enableMotor) ? ("true") : ("false"));
        log("  jd.motorSpeed = %.15f;\n", this.m_motorSpeed);
        log("  jd.maxMotorTorque = %.15f;\n", this.m_maxMotorTorque);
        log("  jd.stiffness = %.15f;\n", this.m_stiffness);
        log("  jd.damping = %.15f;\n", this.m_damping);
        log("  joints[%d] = this.m_world.CreateJoint(jd);\n", this.m_index);
    }
    Draw(draw) {
        const xfA = this.m_bodyA.GetTransform();
        const xfB = this.m_bodyB.GetTransform();
        const pA = b2_math_js_1.b2Transform.MulXV(xfA, this.m_localAnchorA, b2WheelJoint.Draw_s_pA);
        const pB = b2_math_js_1.b2Transform.MulXV(xfB, this.m_localAnchorB, b2WheelJoint.Draw_s_pB);
        // b2Vec2 axis = b2Mul(xfA.q, m_localXAxisA);
        const axis = b2_math_js_1.b2Rot.MulRV(xfA.q, this.m_localXAxisA, b2WheelJoint.Draw_s_axis);
        const c1 = b2WheelJoint.Draw_s_c1; // b2Color c1(0.7f, 0.7f, 0.7f);
        const c2 = b2WheelJoint.Draw_s_c2; // b2Color c2(0.3f, 0.9f, 0.3f);
        const c3 = b2WheelJoint.Draw_s_c3; // b2Color c3(0.9f, 0.3f, 0.3f);
        const c4 = b2WheelJoint.Draw_s_c4; // b2Color c4(0.3f, 0.3f, 0.9f);
        const c5 = b2WheelJoint.Draw_s_c5; // b2Color c5(0.4f, 0.4f, 0.4f);
        draw.DrawSegment(pA, pB, c5);
        if (this.m_enableLimit) {
            // b2Vec2 lower = pA + m_lowerTranslation * axis;
            const lower = b2_math_js_1.b2Vec2.AddVMulSV(pA, this.m_lowerTranslation, axis, b2WheelJoint.Draw_s_lower);
            // b2Vec2 upper = pA + m_upperTranslation * axis;
            const upper = b2_math_js_1.b2Vec2.AddVMulSV(pA, this.m_upperTranslation, axis, b2WheelJoint.Draw_s_upper);
            // b2Vec2 perp = b2Mul(xfA.q, m_localYAxisA);
            const perp = b2_math_js_1.b2Rot.MulRV(xfA.q, this.m_localYAxisA, b2WheelJoint.Draw_s_perp);
            // draw.DrawSegment(lower, upper, c1);
            draw.DrawSegment(lower, upper, c1);
            // draw.DrawSegment(lower - 0.5f * perp, lower + 0.5f * perp, c2);
            draw.DrawSegment(b2_math_js_1.b2Vec2.AddVMulSV(lower, -0.5, perp, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.AddVMulSV(lower, 0.5, perp, b2_math_js_1.b2Vec2.s_t1), c2);
            // draw.DrawSegment(upper - 0.5f * perp, upper + 0.5f * perp, c3);
            draw.DrawSegment(b2_math_js_1.b2Vec2.AddVMulSV(upper, -0.5, perp, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.AddVMulSV(upper, 0.5, perp, b2_math_js_1.b2Vec2.s_t1), c3);
        }
        else {
            // draw.DrawSegment(pA - 1.0f * axis, pA + 1.0f * axis, c1);
            draw.DrawSegment(b2_math_js_1.b2Vec2.AddVMulSV(pA, -1.0, axis, b2_math_js_1.b2Vec2.s_t0), b2_math_js_1.b2Vec2.AddVMulSV(pA, 1.0, axis, b2_math_js_1.b2Vec2.s_t1), c1);
        }
        draw.DrawPoint(pA, 5.0, c1);
        draw.DrawPoint(pB, 5.0, c4);
    }
}
exports.b2WheelJoint = b2WheelJoint;
b2WheelJoint.InitVelocityConstraints_s_d = new b2_math_js_1.b2Vec2();
b2WheelJoint.InitVelocityConstraints_s_P = new b2_math_js_1.b2Vec2();
b2WheelJoint.SolveVelocityConstraints_s_P = new b2_math_js_1.b2Vec2();
b2WheelJoint.SolvePositionConstraints_s_d = new b2_math_js_1.b2Vec2();
b2WheelJoint.SolvePositionConstraints_s_P = new b2_math_js_1.b2Vec2();
///
b2WheelJoint.Draw_s_pA = new b2_math_js_1.b2Vec2();
b2WheelJoint.Draw_s_pB = new b2_math_js_1.b2Vec2();
b2WheelJoint.Draw_s_axis = new b2_math_js_1.b2Vec2();
b2WheelJoint.Draw_s_c1 = new b2_draw_js_1.b2Color(0.7, 0.7, 0.7);
b2WheelJoint.Draw_s_c2 = new b2_draw_js_1.b2Color(0.3, 0.9, 0.3);
b2WheelJoint.Draw_s_c3 = new b2_draw_js_1.b2Color(0.9, 0.3, 0.3);
b2WheelJoint.Draw_s_c4 = new b2_draw_js_1.b2Color(0.3, 0.3, 0.9);
b2WheelJoint.Draw_s_c5 = new b2_draw_js_1.b2Color(0.4, 0.4, 0.4);
b2WheelJoint.Draw_s_lower = new b2_math_js_1.b2Vec2();
b2WheelJoint.Draw_s_upper = new b2_math_js_1.b2Vec2();
b2WheelJoint.Draw_s_perp = new b2_math_js_1.b2Vec2();
