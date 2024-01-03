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

import { b2_invalidParticleIndex } from "../common/b2_settings.js";
import { b2Clamp, b2Vec2, XY } from "../common/b2_math.js";
import { b2Color, RGBA } from "../common/b2_draw.js";
import { b2ParticleGroup } from "./b2_particle_group.js";

/**
 * The particle type. Can be combined with the | operator.
 */
export enum b2ParticleFlag {
  /// Water particle.
  b2_waterParticle = 0,
  /// Removed after next simulation step.
  b2_zombieParticle = 1 << 1,
  /// Zero velocity.
  b2_wallParticle = 1 << 2,
  /// With restitution from stretching.
  b2_springParticle = 1 << 3,
  /// With restitution from deformation.
  b2_elasticParticle = 1 << 4,
  /// With viscosity.
  b2_viscousParticle = 1 << 5,
  /// Without isotropic pressure.
  b2_powderParticle = 1 << 6,
  /// With surface tension.
  b2_tensileParticle = 1 << 7,
  /// Mix color between contacting particles.
  b2_colorMixingParticle = 1 << 8,
  /// Call b2DestructionListener on destruction.
  b2_destructionListenerParticle = 1 << 9,
  /// Prevents other particles from leaking.
  b2_barrierParticle = 1 << 10,
  /// Less compressibility.
  b2_staticPressureParticle = 1 << 11,
  /// Makes pairs or triads with other particles.
  b2_reactiveParticle = 1 << 12,
  /// With high repulsive force.
  b2_repulsiveParticle = 1 << 13,
  /// Call b2ContactListener when this particle is about to interact with
  /// a rigid body or stops interacting with a rigid body.
  /// This results in an expensive operation compared to using
  /// b2_fixtureContactFilterParticle to detect collisions between
  /// particles.
  b2_fixtureContactListenerParticle = 1 << 14,
  /// Call b2ContactListener when this particle is about to interact with
  /// another particle or stops interacting with another particle.
  /// This results in an expensive operation compared to using
  /// b2_particleContactFilterParticle to detect collisions between
  /// particles.
  b2_particleContactListenerParticle = 1 << 15,
  /// Call b2ContactFilter when this particle interacts with rigid bodies.
  b2_fixtureContactFilterParticle = 1 << 16,
  /// Call b2ContactFilter when this particle interacts with other
  /// particles.
  b2_particleContactFilterParticle = 1 << 17,
}

export interface b2IParticleDef {
  flags?: b2ParticleFlag;
  position?: XY;
  velocity?: XY;
  color?: RGBA;
  lifetime?: number;
  userData?: any;
  group?: b2ParticleGroup | null;
}

export class b2ParticleDef implements b2IParticleDef {
  public flags: b2ParticleFlag = 0;
  public readonly position: b2Vec2 = new b2Vec2();
  public readonly velocity: b2Vec2 = new b2Vec2();
  public readonly color: b2Color = new b2Color(0, 0, 0, 0);
  public lifetime: number = 0.0;
  public userData: any = null;
  public group: b2ParticleGroup | null = null;
}

export function b2CalculateParticleIterations(gravity: number, radius: number, timeStep: number): number {
  // In some situations you may want more particle iterations than this,
  // but to avoid excessive cycle cost, don't recommend more than this.
  const B2_MAX_RECOMMENDED_PARTICLE_ITERATIONS = 8;
  const B2_RADIUS_THRESHOLD = 0.01;
  const iterations = Math.ceil(Math.sqrt(gravity / (B2_RADIUS_THRESHOLD * radius)) * timeStep);
  return b2Clamp(iterations, 1, B2_MAX_RECOMMENDED_PARTICLE_ITERATIONS);
}

export class b2ParticleHandle {
  public m_index: number = b2_invalidParticleIndex;
  public GetIndex(): number { return this.m_index; }
  public SetIndex(index: number): void { this.m_index = index; }
}

// #endif
