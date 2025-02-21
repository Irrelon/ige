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
import { b2_invalidParticleIndex } from "../common/b2_settings.js"
import { b2Clamp, b2Vec2 } from "../common/b2_math.js"
import { b2Color } from "../common/b2_draw.js"
/**
 * The particle type. Can be combined with the | operator.
 */
export var b2ParticleFlag;
(function (b2ParticleFlag) {
    /// Water particle.
    b2ParticleFlag[b2ParticleFlag["b2_waterParticle"] = 0] = "b2_waterParticle";
    /// Removed after next simulation step.
    b2ParticleFlag[b2ParticleFlag["b2_zombieParticle"] = 2] = "b2_zombieParticle";
    /// Zero velocity.
    b2ParticleFlag[b2ParticleFlag["b2_wallParticle"] = 4] = "b2_wallParticle";
    /// With restitution from stretching.
    b2ParticleFlag[b2ParticleFlag["b2_springParticle"] = 8] = "b2_springParticle";
    /// With restitution from deformation.
    b2ParticleFlag[b2ParticleFlag["b2_elasticParticle"] = 16] = "b2_elasticParticle";
    /// With viscosity.
    b2ParticleFlag[b2ParticleFlag["b2_viscousParticle"] = 32] = "b2_viscousParticle";
    /// Without isotropic pressure.
    b2ParticleFlag[b2ParticleFlag["b2_powderParticle"] = 64] = "b2_powderParticle";
    /// With surface tension.
    b2ParticleFlag[b2ParticleFlag["b2_tensileParticle"] = 128] = "b2_tensileParticle";
    /// Mix color between contacting particles.
    b2ParticleFlag[b2ParticleFlag["b2_colorMixingParticle"] = 256] = "b2_colorMixingParticle";
    /// Call b2DestructionListener on destruction.
    b2ParticleFlag[b2ParticleFlag["b2_destructionListenerParticle"] = 512] = "b2_destructionListenerParticle";
    /// Prevents other particles from leaking.
    b2ParticleFlag[b2ParticleFlag["b2_barrierParticle"] = 1024] = "b2_barrierParticle";
    /// Less compressibility.
    b2ParticleFlag[b2ParticleFlag["b2_staticPressureParticle"] = 2048] = "b2_staticPressureParticle";
    /// Makes pairs or triads with other particles.
    b2ParticleFlag[b2ParticleFlag["b2_reactiveParticle"] = 4096] = "b2_reactiveParticle";
    /// With high repulsive force.
    b2ParticleFlag[b2ParticleFlag["b2_repulsiveParticle"] = 8192] = "b2_repulsiveParticle";
    /// Call b2ContactListener when this particle is about to interact with
    /// a rigid body or stops interacting with a rigid body.
    /// This results in an expensive operation compared to using
    /// b2_fixtureContactFilterParticle to detect collisions between
    /// particles.
    b2ParticleFlag[b2ParticleFlag["b2_fixtureContactListenerParticle"] = 16384] = "b2_fixtureContactListenerParticle";
    /// Call b2ContactListener when this particle is about to interact with
    /// another particle or stops interacting with another particle.
    /// This results in an expensive operation compared to using
    /// b2_particleContactFilterParticle to detect collisions between
    /// particles.
    b2ParticleFlag[b2ParticleFlag["b2_particleContactListenerParticle"] = 32768] = "b2_particleContactListenerParticle";
    /// Call b2ContactFilter when this particle interacts with rigid bodies.
    b2ParticleFlag[b2ParticleFlag["b2_fixtureContactFilterParticle"] = 65536] = "b2_fixtureContactFilterParticle";
    /// Call b2ContactFilter when this particle interacts with other
    /// particles.
    b2ParticleFlag[b2ParticleFlag["b2_particleContactFilterParticle"] = 131072] = "b2_particleContactFilterParticle";
})(b2ParticleFlag || (b2ParticleFlag = {}));
export class b2ParticleDef {
    flags = 0;
    position = new b2Vec2();
    velocity = new b2Vec2();
    color = new b2Color(0, 0, 0, 0);
    lifetime = 0.0;
    userData = null;
    group = null;
}
export function b2CalculateParticleIterations(gravity, radius, timeStep) {
    // In some situations you may want more particle iterations than this,
    // but to avoid excessive cycle cost, don't recommend more than this.
    const B2_MAX_RECOMMENDED_PARTICLE_ITERATIONS = 8;
    const B2_RADIUS_THRESHOLD = 0.01;
    const iterations = Math.ceil(Math.sqrt(gravity / (B2_RADIUS_THRESHOLD * radius)) * timeStep);
    return b2Clamp(iterations, 1, B2_MAX_RECOMMENDED_PARTICLE_ITERATIONS);
}
export class b2ParticleHandle {
    m_index = b2_invalidParticleIndex;
    GetIndex() {
        return this.m_index;
    }
    SetIndex(index) {
        this.m_index = index;
    }
}
// #endif
