/*
 * Copyright (c) 2013 Google, Inc.
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
import { b2Vec2, b2Transform } from "../common/b2_math.js"
import { b2Color } from "../common/b2_draw.js"
export var b2ParticleGroupFlag;
(function (b2ParticleGroupFlag) {
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_none"] = 0] = "b2_none";
    /// Prevents overlapping or leaking.
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_solidParticleGroup"] = 1] = "b2_solidParticleGroup";
    /// Keeps its shape.
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_rigidParticleGroup"] = 2] = "b2_rigidParticleGroup";
    /// Won't be destroyed if it gets empty.
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_particleGroupCanBeEmpty"] = 4] = "b2_particleGroupCanBeEmpty";
    /// Will be destroyed on next simulation step.
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_particleGroupWillBeDestroyed"] = 8] = "b2_particleGroupWillBeDestroyed";
    /// Updates depth data on next simulation step.
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_particleGroupNeedsUpdateDepth"] = 16] = "b2_particleGroupNeedsUpdateDepth";
    b2ParticleGroupFlag[b2ParticleGroupFlag["b2_particleGroupInternalMask"] = 24] = "b2_particleGroupInternalMask";
})(b2ParticleGroupFlag || (b2ParticleGroupFlag = {}));
export class b2ParticleGroupDef {
    flags = 0;
    groupFlags = 0;
    position = new b2Vec2();
    angle = 0.0;
    linearVelocity = new b2Vec2();
    angularVelocity = 0.0;
    color = new b2Color();
    strength = 1.0;
    shape;
    shapes;
    shapeCount = 0;
    stride = 0;
    particleCount = 0;
    positionData;
    lifetime = 0;
    userData = null;
    group = null;
}
export class b2ParticleGroup {
    m_system;
    m_firstIndex = 0;
    m_lastIndex = 0;
    m_groupFlags = 0;
    m_strength = 1.0;
    m_prev = null;
    m_next = null;
    m_timestamp = -1;
    m_mass = 0.0;
    m_inertia = 0.0;
    m_center = new b2Vec2();
    m_linearVelocity = new b2Vec2();
    m_angularVelocity = 0.0;
    m_transform = new b2Transform();
    ///m_transform.SetIdentity();
    m_userData = null;
    constructor(system) {
        this.m_system = system;
    }
    GetNext() {
        return this.m_next;
    }
    GetParticleSystem() {
        return this.m_system;
    }
    GetParticleCount() {
        return this.m_lastIndex - this.m_firstIndex;
    }
    GetBufferIndex() {
        return this.m_firstIndex;
    }
    ContainsParticle(index) {
        return this.m_firstIndex <= index && index < this.m_lastIndex;
    }
    GetAllParticleFlags() {
        if (!this.m_system.m_flagsBuffer.data) {
            throw new Error();
        }
        let flags = 0;
        for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
            flags |= this.m_system.m_flagsBuffer.data[i];
        }
        return flags;
    }
    GetGroupFlags() {
        return this.m_groupFlags;
    }
    SetGroupFlags(flags) {
        // DEBUG: b2Assert((flags & b2ParticleGroupFlag.b2_particleGroupInternalMask) === 0);
        flags |= this.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupInternalMask;
        this.m_system.SetGroupFlags(this, flags);
    }
    GetMass() {
        this.UpdateStatistics();
        return this.m_mass;
    }
    GetInertia() {
        this.UpdateStatistics();
        return this.m_inertia;
    }
    GetCenter() {
        this.UpdateStatistics();
        return this.m_center;
    }
    GetLinearVelocity() {
        this.UpdateStatistics();
        return this.m_linearVelocity;
    }
    GetAngularVelocity() {
        this.UpdateStatistics();
        return this.m_angularVelocity;
    }
    GetTransform() {
        return this.m_transform;
    }
    GetPosition() {
        return this.m_transform.p;
    }
    GetAngle() {
        return this.m_transform.q.GetAngle();
    }
    GetLinearVelocityFromWorldPoint(worldPoint, out) {
        const s_t0 = b2ParticleGroup.GetLinearVelocityFromWorldPoint_s_t0;
        this.UpdateStatistics();
        ///  return m_linearVelocity + b2Cross(m_angularVelocity, worldPoint - m_center);
        return b2Vec2.AddVCrossSV(this.m_linearVelocity, this.m_angularVelocity, b2Vec2.SubVV(worldPoint, this.m_center, s_t0), out);
    }
    static GetLinearVelocityFromWorldPoint_s_t0 = new b2Vec2();
    GetUserData() {
        return this.m_userData;
    }
    SetUserData(data) {
        this.m_userData = data;
    }
    ApplyForce(force) {
        this.m_system.ApplyForce(this.m_firstIndex, this.m_lastIndex, force);
    }
    ApplyLinearImpulse(impulse) {
        this.m_system.ApplyLinearImpulse(this.m_firstIndex, this.m_lastIndex, impulse);
    }
    DestroyParticles(callDestructionListener) {
        if (this.m_system.m_world.IsLocked()) {
            throw new Error();
        }
        for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
            this.m_system.DestroyParticle(i, callDestructionListener);
        }
    }
    UpdateStatistics() {
        if (!this.m_system.m_positionBuffer.data) {
            throw new Error();
        }
        if (!this.m_system.m_velocityBuffer.data) {
            throw new Error();
        }
        const p = new b2Vec2();
        const v = new b2Vec2();
        if (this.m_timestamp !== this.m_system.m_timestamp) {
            const m = this.m_system.GetParticleMass();
            ///  this.m_mass = 0;
            this.m_mass = m * (this.m_lastIndex - this.m_firstIndex);
            this.m_center.SetZero();
            this.m_linearVelocity.SetZero();
            for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
                ///  this.m_mass += m;
                ///  this.m_center += m * this.m_system.m_positionBuffer.data[i];
                this.m_center.SelfMulAdd(m, this.m_system.m_positionBuffer.data[i]);
                ///  this.m_linearVelocity += m * this.m_system.m_velocityBuffer.data[i];
                this.m_linearVelocity.SelfMulAdd(m, this.m_system.m_velocityBuffer.data[i]);
            }
            if (this.m_mass > 0) {
                const inv_mass = 1 / this.m_mass;
                ///this.m_center *= 1 / this.m_mass;
                this.m_center.SelfMul(inv_mass);
                ///this.m_linearVelocity *= 1 / this.m_mass;
                this.m_linearVelocity.SelfMul(inv_mass);
            }
            this.m_inertia = 0;
            this.m_angularVelocity = 0;
            for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
                ///b2Vec2 p = this.m_system.m_positionBuffer.data[i] - this.m_center;
                b2Vec2.SubVV(this.m_system.m_positionBuffer.data[i], this.m_center, p);
                ///b2Vec2 v = this.m_system.m_velocityBuffer.data[i] - this.m_linearVelocity;
                b2Vec2.SubVV(this.m_system.m_velocityBuffer.data[i], this.m_linearVelocity, v);
                this.m_inertia += m * b2Vec2.DotVV(p, p);
                this.m_angularVelocity += m * b2Vec2.CrossVV(p, v);
            }
            if (this.m_inertia > 0) {
                this.m_angularVelocity *= 1 / this.m_inertia;
            }
            this.m_timestamp = this.m_system.m_timestamp;
        }
    }
}
// #endif
