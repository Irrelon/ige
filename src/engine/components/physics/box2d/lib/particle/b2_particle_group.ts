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

// #if B2_ENABLE_PARTICLE

// DEBUG: import { b2Assert } from "../common/b2_settings.js";
import { b2Vec2, b2Transform, XY } from "../common/b2_math.js";
import { b2Color, RGBA } from "../common/b2_draw.js";
import { b2Shape } from "../collision/b2_shape.js";
import { b2ParticleFlag } from "./b2_particle.js";
import { b2ParticleSystem } from "./b2_particle_system.js";

export enum b2ParticleGroupFlag {
  b2_none = 0,
  /// Prevents overlapping or leaking.
  b2_solidParticleGroup = 1 << 0,
  /// Keeps its shape.
  b2_rigidParticleGroup = 1 << 1,
  /// Won't be destroyed if it gets empty.
  b2_particleGroupCanBeEmpty = 1 << 2,
  /// Will be destroyed on next simulation step.
  b2_particleGroupWillBeDestroyed = 1 << 3,
  /// Updates depth data on next simulation step.
  b2_particleGroupNeedsUpdateDepth = 1 << 4,

  b2_particleGroupInternalMask = b2_particleGroupWillBeDestroyed | b2_particleGroupNeedsUpdateDepth,
}

export interface b2IParticleGroupDef {
  flags?: b2ParticleFlag;
  groupFlags?: b2ParticleGroupFlag;
  position?: XY;
  angle?: number;
  linearVelocity?: XY;
  angularVelocity?: number;
  color?: RGBA;
  strength?: number;
  shape?: b2Shape;
  shapes?: b2Shape[];
  shapeCount?: number;
  stride?: number;
  particleCount?: number;
  positionData?: XY[];
  lifetime?: number;
  userData?: any;
  group?: b2ParticleGroup | null;
}

export class b2ParticleGroupDef implements b2IParticleGroupDef {
  public flags: b2ParticleFlag = 0;
  public groupFlags: b2ParticleGroupFlag = 0;
  public readonly position: b2Vec2 = new b2Vec2();
  public angle: number = 0.0;
  public readonly linearVelocity: b2Vec2 = new b2Vec2();
  public angularVelocity: number = 0.0;
  public readonly color: b2Color = new b2Color();
  public strength: number = 1.0;
  public shape?: b2Shape;
  public shapes?: b2Shape[];
  public shapeCount: number = 0;
  public stride: number = 0;
  public particleCount: number = 0;
  public positionData?: b2Vec2[];
  public lifetime: number = 0;
  public userData: any = null;
  public group: b2ParticleGroup | null = null;
}

export class b2ParticleGroup {

  public readonly m_system: b2ParticleSystem;
  public m_firstIndex: number = 0;
  public m_lastIndex: number = 0;
  public m_groupFlags: b2ParticleGroupFlag = 0;
  public m_strength: number = 1.0;
  public m_prev: b2ParticleGroup | null = null;
  public m_next: b2ParticleGroup | null = null;
  public m_timestamp: number = -1;
  public m_mass: number = 0.0;
  public m_inertia: number = 0.0;
  public readonly m_center: b2Vec2 = new b2Vec2();
  public readonly m_linearVelocity: b2Vec2 = new b2Vec2();
  public m_angularVelocity: number = 0.0;
  public readonly m_transform: b2Transform = new b2Transform();
  ///m_transform.SetIdentity();
  public m_userData: any = null;

  constructor(system: b2ParticleSystem) {
    this.m_system = system;
  }

  public GetNext(): b2ParticleGroup | null {
    return this.m_next;
  }

  public GetParticleSystem(): b2ParticleSystem {
    return this.m_system;
  }

  public GetParticleCount(): number {
    return this.m_lastIndex - this.m_firstIndex;
  }

  public GetBufferIndex(): number {
    return this.m_firstIndex;
  }

  public ContainsParticle(index: number): boolean {
    return this.m_firstIndex <= index && index < this.m_lastIndex;
  }

  public GetAllParticleFlags(): b2ParticleFlag {
    if (!this.m_system.m_flagsBuffer.data) { throw new Error(); }
    let flags = 0;
    for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
      flags |= this.m_system.m_flagsBuffer.data[i];
    }
    return flags;
  }

  public GetGroupFlags(): b2ParticleGroupFlag {
    return this.m_groupFlags;
  }

  public SetGroupFlags(flags: number): void {
    // DEBUG: b2Assert((flags & b2ParticleGroupFlag.b2_particleGroupInternalMask) === 0);
    flags |= this.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupInternalMask;
    this.m_system.SetGroupFlags(this, flags);
  }

  public GetMass(): number {
    this.UpdateStatistics();
    return this.m_mass;
  }

  public GetInertia(): number {
    this.UpdateStatistics();
    return this.m_inertia;
  }

  public GetCenter(): Readonly<b2Vec2> {
    this.UpdateStatistics();
    return this.m_center;
  }

  public GetLinearVelocity(): Readonly<b2Vec2> {
    this.UpdateStatistics();
    return this.m_linearVelocity;
  }

  public GetAngularVelocity(): number {
    this.UpdateStatistics();
    return this.m_angularVelocity;
  }

  public GetTransform(): Readonly<b2Transform> {
    return this.m_transform;
  }

  public GetPosition(): Readonly<b2Vec2> {
    return this.m_transform.p;
  }

  public GetAngle(): number {
    return this.m_transform.q.GetAngle();
  }

  public GetLinearVelocityFromWorldPoint<T extends XY>(worldPoint: XY, out: T): T {
    const s_t0 = b2ParticleGroup.GetLinearVelocityFromWorldPoint_s_t0;
    this.UpdateStatistics();
    ///  return m_linearVelocity + b2Cross(m_angularVelocity, worldPoint - m_center);
    return b2Vec2.AddVCrossSV(this.m_linearVelocity, this.m_angularVelocity, b2Vec2.SubVV(worldPoint, this.m_center, s_t0), out);
  }
  public static readonly GetLinearVelocityFromWorldPoint_s_t0 = new b2Vec2();

  public GetUserData(): void {
    return this.m_userData;
  }

  public SetUserData(data: any): void {
    this.m_userData = data;
  }

  public ApplyForce(force: XY): void {
    this.m_system.ApplyForce(this.m_firstIndex, this.m_lastIndex, force);
  }

  public ApplyLinearImpulse(impulse: XY): void {
    this.m_system.ApplyLinearImpulse(this.m_firstIndex, this.m_lastIndex, impulse);
  }

  public DestroyParticles(callDestructionListener: boolean): void {
    if (this.m_system.m_world.IsLocked()) { throw new Error(); }

    for (let i = this.m_firstIndex; i < this.m_lastIndex; i++) {
      this.m_system.DestroyParticle(i, callDestructionListener);
    }
  }

  public UpdateStatistics(): void {
    if (!this.m_system.m_positionBuffer.data) { throw new Error(); }
    if (!this.m_system.m_velocityBuffer.data) { throw new Error(); }
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
