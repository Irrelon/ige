import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2TypedVec2, b2Rot, b2Transform } from "../common/b2_math.js"
import { b2Color } from "../common/b2_draw.js"
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "../collision/b2_collision.js"
import type { b2MassData } from "../collision/b2_shape.js"
import { b2Shape } from "../collision/b2_shape.js"
import { b2EdgeShape } from "../collision/b2_edge_shape.js"
import { b2TimeStep } from "../dynamics/b2_time_step.js"
import type { b2Fixture } from "../dynamics/b2_fixture.js"
import type { b2Body } from "../dynamics/b2_body.js"
import type { b2World } from "../dynamics/b2_world.js"
import type { b2ContactFilter, b2ContactListener, b2RayCastCallback } from "../dynamics/b2_world_callbacks.js"
import { b2QueryCallback } from "../dynamics/b2_world_callbacks.js"
import type { b2IParticleDef } from "./b2_particle.js"
import { b2ParticleFlag, b2ParticleHandle } from "./b2_particle.js"
import type { b2IParticleGroupDef } from "./b2_particle_group.js"
import { b2ParticleGroupFlag, b2ParticleGroup } from "./b2_particle_group.js"
import type { b2DistanceProxy } from "../collision/b2_distance.js"
export declare class b2GrowableBuffer<T> {
    data: T[];
    count: number;
    capacity: number;
    allocator: () => T;
    constructor(allocator: () => T);
    Append(): number;
    Reserve(newCapacity: number): void;
    Grow(): void;
    Free(): void;
    Shorten(newEnd: number): void;
    Data(): T[];
    GetCount(): number;
    SetCount(newCount: number): void;
    GetCapacity(): number;
    RemoveIf(pred: (t: T) => boolean): void;
    Unique(pred: (a: T, b: T) => boolean): void;
}
export type b2ParticleIndex = number;
export declare class b2FixtureParticleQueryCallback extends b2QueryCallback {
    m_system: b2ParticleSystem;
    constructor(system: b2ParticleSystem);
    ShouldQueryParticleSystem(system: b2ParticleSystem): boolean;
    ReportFixture(fixture: b2Fixture): boolean;
    ReportParticle(system: b2ParticleSystem, index: number): boolean;
    ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, index: number): void;
}
export declare class b2ParticleContact {
    indexA: number;
    indexB: number;
    weight: number;
    normal: b2Vec2;
    flags: b2ParticleFlag;
    SetIndices(a: number, b: number): void;
    SetWeight(w: number): void;
    SetNormal(n: b2Vec2): void;
    SetFlags(f: b2ParticleFlag): void;
    GetIndexA(): number;
    GetIndexB(): number;
    GetWeight(): number;
    GetNormal(): b2Vec2;
    GetFlags(): b2ParticleFlag;
    IsEqual(rhs: b2ParticleContact): boolean;
    IsNotEqual(rhs: b2ParticleContact): boolean;
    ApproximatelyEqual(rhs: b2ParticleContact): boolean;
}
export declare class b2ParticleBodyContact {
    index: number;
    body: b2Body;
    fixture: b2Fixture;
    weight: number;
    normal: b2Vec2;
    mass: number;
}
export declare class b2ParticlePair {
    indexA: number;
    indexB: number;
    flags: b2ParticleFlag;
    strength: number;
    distance: number;
}
export declare class b2ParticleTriad {
    indexA: number;
    indexB: number;
    indexC: number;
    flags: b2ParticleFlag;
    strength: number;
    pa: b2Vec2;
    pb: b2Vec2;
    pc: b2Vec2;
    ka: number;
    kb: number;
    kc: number;
    s: number;
}
export declare class b2ParticleSystemDef {
    /**
   * Enable strict Particle/Body contact check.
   * See SetStrictContactCheck for details.
   */
    strictContactCheck: boolean;
    /**
   * Set the particle density.
   * See SetDensity for details.
   */
    density: number;
    /**
   * Change the particle gravity scale. Adjusts the effect of the
   * global gravity vector on particles. Default value is 1.0f.
   */
    gravityScale: number;
    /**
   * Particles behave as circles with this radius. In Box2D units.
   */
    radius: number;
    /**
   * Set the maximum number of particles.
   * By default, there is no maximum. The particle buffers can
   * continue to grow while b2World's block allocator still has
   * memory.
   * See SetMaxParticleCount for details.
   */
    maxCount: number;
    /**
   * Increases pressure in response to compression
   * Smaller values allow more compression
   */
    pressureStrength: number;
    /**
   * Reduces velocity along the collision normal
   * Smaller value reduces less
   */
    dampingStrength: number;
    /**
   * Restores shape of elastic particle groups
   * Larger values increase elastic particle velocity
   */
    elasticStrength: number;
    /**
   * Restores length of spring particle groups
   * Larger values increase spring particle velocity
   */
    springStrength: number;
    /**
   * Reduces relative velocity of viscous particles
   * Larger values slow down viscous particles more
   */
    viscousStrength: number;
    /**
   * Produces pressure on tensile particles
   * 0~0.2. Larger values increase the amount of surface tension.
   */
    surfaceTensionPressureStrength: number;
    /**
   * Smoothes outline of tensile particles
   * 0~0.2. Larger values result in rounder, smoother,
   * water-drop-like clusters of particles.
   */
    surfaceTensionNormalStrength: number;
    /**
   * Produces additional pressure on repulsive particles
   * Larger values repulse more
   * Negative values mean attraction. The range where particles
   * behave stably is about -0.2 to 2.0.
   */
    repulsiveStrength: number;
    /**
   * Produces repulsion between powder particles
   * Larger values repulse more
   */
    powderStrength: number;
    /**
   * Pushes particles out of solid particle group
   * Larger values repulse more
   */
    ejectionStrength: number;
    /**
   * Produces static pressure
   * Larger values increase the pressure on neighboring partilces
   * For a description of static pressure, see
   * http://en.wikipedia.org/wiki/Static_pressure#Static_pressure_in_fluid_dynamics
   */
    staticPressureStrength: number;
    /**
   * Reduces instability in static pressure calculation
   * Larger values make stabilize static pressure with fewer
   * iterations
   */
    staticPressureRelaxation: number;
    /**
   * Computes static pressure more precisely
   * See SetStaticPressureIterations for details
   */
    staticPressureIterations: number;
    /**
   * Determines how fast colors are mixed
   * 1.0f ==> mixed immediately
   * 0.5f ==> mixed half way each simulation step (see
   * b2World::Step())
   */
    colorMixingStrength: number;
    /**
   * Whether to destroy particles by age when no more particles
   * can be created.  See #b2ParticleSystem::SetDestructionByAge()
   * for more information.
   */
    destroyByAge: boolean;
    /**
   * Granularity of particle lifetimes in seconds.  By default
   * this is set to (1.0f / 60.0f) seconds.  b2ParticleSystem uses
   * a 32-bit signed value to track particle lifetimes so the
   * maximum lifetime of a particle is (2^32 - 1) / (1.0f /
   * lifetimeGranularity) seconds. With the value set to 1/60 the
   * maximum lifetime or age of a particle is 2.27 years.
   */
    lifetimeGranularity: number;
    Copy(def: b2ParticleSystemDef): b2ParticleSystemDef;
    Clone(): b2ParticleSystemDef;
}
export declare class b2ParticleSystem {
    m_paused: boolean;
    m_timestamp: number;
    m_allParticleFlags: b2ParticleFlag;
    m_needsUpdateAllParticleFlags: boolean;
    m_allGroupFlags: b2ParticleGroupFlag;
    m_needsUpdateAllGroupFlags: boolean;
    m_hasForce: boolean;
    m_iterationIndex: number;
    m_inverseDensity: number;
    m_particleDiameter: number;
    m_inverseDiameter: number;
    m_squaredDiameter: number;
    m_count: number;
    m_internalAllocatedCapacity: number;
    /**
   * Allocator for b2ParticleHandle instances.
   */
    /**
   * Maps particle indicies to handles.
   */
    m_handleIndexBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleHandle | null>;
    m_flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>;
    m_positionBuffer: b2ParticleSystem_UserOverridableBuffer<b2Vec2>;
    m_velocityBuffer: b2ParticleSystem_UserOverridableBuffer<b2Vec2>;
    m_forceBuffer: b2Vec2[];
    /**
   * this.m_weightBuffer is populated in ComputeWeight and used in
   * ComputeDepth(), SolveStaticPressure() and SolvePressure().
   */
    m_weightBuffer: number[];
    /**
   * When any particles have the flag b2_staticPressureParticle,
   * this.m_staticPressureBuffer is first allocated and used in
   * SolveStaticPressure() and SolvePressure().  It will be
   * reallocated on subsequent CreateParticle() calls.
   */
    m_staticPressureBuffer: number[];
    /**
   * this.m_accumulationBuffer is used in many functions as a temporary
   * buffer for scalar values.
   */
    m_accumulationBuffer: number[];
    /**
   * When any particles have the flag b2_tensileParticle,
   * this.m_accumulation2Buffer is first allocated and used in
   * SolveTensile() as a temporary buffer for vector values.  It
   * will be reallocated on subsequent CreateParticle() calls.
   */
    m_accumulation2Buffer: b2Vec2[];
    /**
   * When any particle groups have the flag b2_solidParticleGroup,
   * this.m_depthBuffer is first allocated and populated in
   * ComputeDepth() and used in SolveSolid(). It will be
   * reallocated on subsequent CreateParticle() calls.
   */
    m_depthBuffer: number[];
    m_colorBuffer: b2ParticleSystem_UserOverridableBuffer<b2Color>;
    m_groupBuffer: Array<b2ParticleGroup | null>;
    m_userDataBuffer: b2ParticleSystem_UserOverridableBuffer<any>;
    /**
   * Stuck particle detection parameters and record keeping
   */
    m_stuckThreshold: number;
    m_lastBodyContactStepBuffer: b2ParticleSystem_UserOverridableBuffer<number>;
    m_bodyContactCountBuffer: b2ParticleSystem_UserOverridableBuffer<number>;
    m_consecutiveContactStepsBuffer: b2ParticleSystem_UserOverridableBuffer<number>;
    m_stuckParticleBuffer: b2GrowableBuffer<number>;
    m_proxyBuffer: b2GrowableBuffer<b2ParticleSystem_Proxy>;
    m_contactBuffer: b2GrowableBuffer<b2ParticleContact>;
    m_bodyContactBuffer: b2GrowableBuffer<b2ParticleBodyContact>;
    m_pairBuffer: b2GrowableBuffer<b2ParticlePair>;
    m_triadBuffer: b2GrowableBuffer<b2ParticleTriad>;
    /**
   * Time each particle should be destroyed relative to the last
   * time this.m_timeElapsed was initialized.  Each unit of time
   * corresponds to b2ParticleSystemDef::lifetimeGranularity
   * seconds.
   */
    m_expirationTimeBuffer: b2ParticleSystem_UserOverridableBuffer<number>;
    /**
   * List of particle indices sorted by expiration time.
   */
    m_indexByExpirationTimeBuffer: b2ParticleSystem_UserOverridableBuffer<number>;
    /**
   * Time elapsed in 32:32 fixed point.  Each non-fractional unit
   * of time corresponds to
   * b2ParticleSystemDef::lifetimeGranularity seconds.
   */
    m_timeElapsed: number;
    /**
   * Whether the expiration time buffer has been modified and
   * needs to be resorted.
   */
    m_expirationTimeBufferRequiresSorting: boolean;
    m_groupCount: number;
    m_groupList: b2ParticleGroup | null;
    m_def: b2ParticleSystemDef;
    m_world: b2World;
    m_prev: b2ParticleSystem | null;
    m_next: b2ParticleSystem | null;
    static readonly xTruncBits: number;
    static readonly yTruncBits: number;
    static readonly tagBits: number;
    static readonly yOffset: number;
    static readonly yShift: number;
    static readonly xShift: number;
    static readonly xScale: number;
    static readonly xOffset: number;
    static readonly yMask: number;
    static readonly xMask: number;
    static computeTag(x: number, y: number): number;
    static computeRelativeTag(tag: number, x: number, y: number): number;
    constructor(def: b2ParticleSystemDef, world: b2World);
    Drop(): void;
    /**
   * Create a particle whose properties have been defined.
   *
   * No reference to the definition is retained.
   *
   * A simulation step must occur before it's possible to interact
   * with a newly created particle.  For example,
   * DestroyParticleInShape() will not destroy a particle until
   * b2World::Step() has been called.
   *
   * warning: This function is locked during callbacks.
   */
    CreateParticle(def: b2IParticleDef): number;
    /**
   * Retrieve a handle to the particle at the specified index.
   *
   * Please see #b2ParticleHandle for why you might want a handle.
   */
    GetParticleHandleFromIndex(index: number): b2ParticleHandle;
    /**
   * Destroy a particle.
   *
   * The particle is removed after the next simulation step (see
   * b2World::Step()).
   *
   * @param index Index of the particle to destroy.
   * @param callDestructionListener Whether to call the
   *      destruction listener just before the particle is
   *      destroyed.
   */
    DestroyParticle(index: number, callDestructionListener?: boolean): void;
    /**
   * Destroy the Nth oldest particle in the system.
   *
   * The particle is removed after the next b2World::Step().
   *
   * @param index Index of the Nth oldest particle to
   *      destroy, 0 will destroy the oldest particle in the
   *      system, 1 will destroy the next oldest particle etc.
   * @param callDestructionListener Whether to call the
   *      destruction listener just before the particle is
   *      destroyed.
   */
    DestroyOldestParticle(index: number, callDestructionListener?: boolean): void;
    /**
   * Destroy particles inside a shape.
   *
   * warning: This function is locked during callbacks.
   *
   * In addition, this function immediately destroys particles in
   * the shape in constrast to DestroyParticle() which defers the
   * destruction until the next simulation step.
   *
   * @return Number of particles destroyed.
   * @param shape Shape which encloses particles
   *      that should be destroyed.
   * @param xf Transform applied to the shape.
   * @param callDestructionListener Whether to call the
   *      world b2DestructionListener for each particle
   *      destroyed.
   */
    DestroyParticlesInShape(shape: b2Shape, xf: b2Transform, callDestructionListener?: boolean): number;
    static readonly DestroyParticlesInShape_s_aabb: b2AABB;
    /**
   * Create a particle group whose properties have been defined.
   *
   * No reference to the definition is retained.
   *
   * warning: This function is locked during callbacks.
   */
    CreateParticleGroup(groupDef: b2IParticleGroupDef): b2ParticleGroup;
    static readonly CreateParticleGroup_s_transform: b2Transform;
    /**
   * Join two particle groups.
   *
   * warning: This function is locked during callbacks.
   *
   * @param groupA the first group. Expands to encompass the second group.
   * @param groupB the second group. It is destroyed.
   */
    JoinParticleGroups(groupA: b2ParticleGroup, groupB: b2ParticleGroup): void;
    /**
   * Split particle group into multiple disconnected groups.
   *
   * warning: This function is locked during callbacks.
   *
   * @param group the group to be split.
   */
    SplitParticleGroup(group: b2ParticleGroup): void;
    /**
   * Get the world particle group list. With the returned group,
   * use b2ParticleGroup::GetNext to get the next group in the
   * world list.
   *
   * A null group indicates the end of the list.
   *
   * @return the head of the world particle group list.
   */
    GetParticleGroupList(): b2ParticleGroup | null;
    /**
   * Get the number of particle groups.
   */
    GetParticleGroupCount(): number;
    /**
   * Get the number of particles.
   */
    GetParticleCount(): number;
    /**
   * Get the maximum number of particles.
   */
    GetMaxParticleCount(): number;
    /**
   * Set the maximum number of particles.
   *
   * A value of 0 means there is no maximum. The particle buffers
   * can continue to grow while b2World's block allocator still
   * has memory.
   *
   * Note: If you try to CreateParticle() with more than this
   * count, b2_invalidParticleIndex is returned unless
   * SetDestructionByAge() is used to enable the destruction of
   * the oldest particles in the system.
   */
    SetMaxParticleCount(count: number): void;
    /**
   * Get all existing particle flags.
   */
    GetAllParticleFlags(): b2ParticleFlag;
    /**
   * Get all existing particle group flags.
   */
    GetAllGroupFlags(): b2ParticleGroupFlag;
    /**
   * Pause or unpause the particle system. When paused,
   * b2World::Step() skips over this particle system. All
   * b2ParticleSystem function calls still work.
   *
   * @param paused paused is true to pause, false to un-pause.
   */
    SetPaused(paused: boolean): void;
    /**
   * Initially, true, then, the last value passed into
   * SetPaused().
   *
   * @return true if the particle system is being updated in b2World::Step().
   */
    GetPaused(): boolean;
    /**
   * Change the particle density.
   *
   * Particle density affects the mass of the particles, which in
   * turn affects how the particles interact with b2Bodies. Note
   * that the density does not affect how the particles interact
   * with each other.
   */
    SetDensity(density: number): void;
    /**
   * Get the particle density.
   */
    GetDensity(): number;
    /**
   * Change the particle gravity scale. Adjusts the effect of the
   * global gravity vector on particles.
   */
    SetGravityScale(gravityScale: number): void;
    /**
   * Get the particle gravity scale.
   */
    GetGravityScale(): number;
    /**
   * Damping is used to reduce the velocity of particles. The
   * damping parameter can be larger than 1.0f but the damping
   * effect becomes sensitive to the time step when the damping
   * parameter is large.
   */
    SetDamping(damping: number): void;
    /**
   * Get damping for particles
   */
    GetDamping(): number;
    /**
   * Change the number of iterations when calculating the static
   * pressure of particles. By default, 8 iterations. You can
   * reduce the number of iterations down to 1 in some situations,
   * but this may cause instabilities when many particles come
   * together. If you see particles popping away from each other
   * like popcorn, you may have to increase the number of
   * iterations.
   *
   * For a description of static pressure, see
   * http://en.wikipedia.org/wiki/Static_pressure#Static_pressure_in_fluid_dynamics
   */
    SetStaticPressureIterations(iterations: number): void;
    /**
   * Get the number of iterations for static pressure of
   * particles.
   */
    GetStaticPressureIterations(): number;
    /**
   * Change the particle radius.
   *
   * You should set this only once, on world start.
   * If you change the radius during execution, existing particles
   * may explode, shrink, or behave unexpectedly.
   */
    SetRadius(radius: number): void;
    /**
   * Get the particle radius.
   */
    GetRadius(): number;
    /**
   * Get the position of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle positions array.
   */
    GetPositionBuffer(): b2Vec2[];
    /**
   * Get the velocity of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle velocities array.
   */
    GetVelocityBuffer(): b2Vec2[];
    /**
   * Get the color of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle colors array.
   */
    GetColorBuffer(): b2Color[];
    /**
   * Get the particle-group of each particle.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle group array.
   */
    GetGroupBuffer(): Array<b2ParticleGroup | null>;
    /**
   * Get the weight of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle positions array.
   */
    GetWeightBuffer(): number[];
    /**
   * Get the user-specified data of each particle.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle user-data array.
   */
    GetUserDataBuffer<T>(): T[];
    /**
   * Get the flags for each particle. See the b2ParticleFlag enum.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle-flags array.
   */
    GetFlagsBuffer(): b2ParticleFlag[];
    /**
   * Set flags for a particle. See the b2ParticleFlag enum.
   */
    SetParticleFlags(index: number, newFlags: b2ParticleFlag): void;
    /**
   * Get flags for a particle. See the b2ParticleFlag enum.
   */
    GetParticleFlags(index: number): b2ParticleFlag;
    /**
   * Set an external buffer for particle data.
   *
   * Normally, the b2World's block allocator is used for particle
   * data. However, sometimes you may have an OpenGL or Java
   * buffer for particle data. To avoid data duplication, you may
   * supply this external buffer.
   *
   * Note that, when b2World's block allocator is used, the
   * particle data buffers can grow as required. However, when
   * external buffers are used, the maximum number of particles is
   * clamped to the size of the smallest external buffer.
   *
   * @param buffer a pointer to a block of memory.
   * @param capacity the number of values in the block.
   */
    SetFlagsBuffer(buffer: b2ParticleFlag[]): void;
    SetPositionBuffer(buffer: b2Vec2[] | Float32Array): void;
    SetVelocityBuffer(buffer: b2TypedVec2[] | Float32Array): void;
    SetColorBuffer(buffer: b2Color[] | Float32Array): void;
    SetUserDataBuffer<T>(buffer: T[]): void;
    /**
   * Get contacts between particles
   * Contact data can be used for many reasons, for example to
   * trigger rendering or audio effects.
   */
    GetContacts(): b2ParticleContact[];
    GetContactCount(): number;
    /**
   * Get contacts between particles and bodies
   *
   * Contact data can be used for many reasons, for example to
   * trigger rendering or audio effects.
   */
    GetBodyContacts(): b2ParticleBodyContact[];
    GetBodyContactCount(): number;
    /**
   * Get array of particle pairs. The particles in a pair:
   *   (1) are contacting,
   *   (2) are in the same particle group,
   *   (3) are part of a rigid particle group, or are spring, elastic,
   *       or wall particles.
   *   (4) have at least one particle that is a spring or barrier
   *       particle (i.e. one of the types in k_pairFlags),
   *   (5) have at least one particle that returns true for
   *       ConnectionFilter::IsNecessary,
   *   (6) are not zombie particles.
   *
   * Essentially, this is an array of spring or barrier particles
   * that are interacting. The array is sorted by b2ParticlePair's
   * indexA, and then indexB. There are no duplicate entries.
   */
    GetPairs(): b2ParticlePair[];
    GetPairCount(): number;
    /**
   * Get array of particle triads. The particles in a triad:
   *   (1) are in the same particle group,
   *   (2) are in a Voronoi triangle together,
   *   (3) are within b2_maxTriadDistance particle diameters of each
   *       other,
   *   (4) return true for ConnectionFilter::ShouldCreateTriad
   *   (5) have at least one particle of type elastic (i.e. one of the
   *       types in k_triadFlags),
   *   (6) are part of a rigid particle group, or are spring, elastic,
   *       or wall particles.
   *   (7) are not zombie particles.
   *
   * Essentially, this is an array of elastic particles that are
   * interacting. The array is sorted by b2ParticleTriad's indexA,
   * then indexB, then indexC. There are no duplicate entries.
   */
    GetTriads(): b2ParticleTriad[];
    GetTriadCount(): number;
    /**
   * Set an optional threshold for the maximum number of
   * consecutive particle iterations that a particle may contact
   * multiple bodies before it is considered a candidate for being
   * "stuck". Setting to zero or less disables.
   */
    SetStuckThreshold(steps: number): void;
    /**
   * Get potentially stuck particles from the last step; the user
   * must decide if they are stuck or not, and if so, delete or
   * move them
   */
    GetStuckCandidates(): number[];
    /**
   * Get the number of stuck particle candidates from the last
   * step.
   */
    GetStuckCandidateCount(): number;
    /**
   * Compute the kinetic energy that can be lost by damping force
   */
    ComputeCollisionEnergy(): number;
    static readonly ComputeCollisionEnergy_s_v: b2Vec2;
    /**
   * Set strict Particle/Body contact check.
   *
   * This is an option that will help ensure correct behavior if
   * there are corners in the world model where Particle/Body
   * contact is ambiguous. This option scales at n*log(n) of the
   * number of Particle/Body contacts, so it is best to only
   * enable if it is necessary for your geometry. Enable if you
   * see strange particle behavior around b2Body intersections.
   */
    SetStrictContactCheck(enabled: boolean): void;
    /**
   * Get the status of the strict contact check.
   */
    GetStrictContactCheck(): boolean;
    /**
   * Set the lifetime (in seconds) of a particle relative to the
   * current time.  A lifetime of less than or equal to 0.0f
   * results in the particle living forever until it's manually
   * destroyed by the application.
   */
    SetParticleLifetime(index: number, lifetime: number): void;
    /**
   * Get the lifetime (in seconds) of a particle relative to the
   * current time.  A value > 0.0f is returned if the particle is
   * scheduled to be destroyed in the future, values <= 0.0f
   * indicate the particle has an infinite lifetime.
   */
    GetParticleLifetime(index: number): number;
    /**
   * Enable / disable destruction of particles in CreateParticle()
   * when no more particles can be created due to a prior call to
   * SetMaxParticleCount().  When this is enabled, the oldest
   * particle is destroyed in CreateParticle() favoring the
   * destruction of particles with a finite lifetime over
   * particles with infinite lifetimes. This feature is enabled by
   * default when particle lifetimes are tracked.  Explicitly
   * enabling this feature using this function enables particle
   * lifetime tracking.
   */
    SetDestructionByAge(enable: boolean): void;
    /**
   * Get whether the oldest particle will be destroyed in
   * CreateParticle() when the maximum number of particles are
   * present in the system.
   */
    GetDestructionByAge(): boolean;
    /**
   * Get the array of particle expiration times indexed by
   * particle index.
   *
   * GetParticleCount() items are in the returned array.
   */
    GetExpirationTimeBuffer(): number[];
    /**
   * Convert a expiration time value in returned by
   * GetExpirationTimeBuffer() to a time in seconds relative to
   * the current simulation time.
   */
    ExpirationTimeToLifetime(expirationTime: number): number;
    /**
   * Get the array of particle indices ordered by reverse
   * lifetime. The oldest particle indexes are at the end of the
   * array with the newest at the start.  Particles with infinite
   * lifetimes (i.e expiration times less than or equal to 0) are
   * placed at the start of the array.
   * ExpirationTimeToLifetime(GetExpirationTimeBuffer()[index]) is
   * equivalent to GetParticleLifetime(index).
   *
   * GetParticleCount() items are in the returned array.
   */
    GetIndexByExpirationTimeBuffer(): number[];
    /**
   * Apply an impulse to one particle. This immediately modifies
   * the velocity. Similar to b2Body::ApplyLinearImpulse.
   *
   * @param index the particle that will be modified.
   * @param impulse impulse the world impulse vector, usually in N-seconds or kg-m/s.
   */
    ParticleApplyLinearImpulse(index: number, impulse: XY): void;
    /**
   * Apply an impulse to all particles between 'firstIndex' and
   * 'lastIndex'. This immediately modifies the velocity. Note
   * that the impulse is applied to the total mass of all
   * particles. So, calling ParticleApplyLinearImpulse(0, impulse)
   * and ParticleApplyLinearImpulse(1, impulse) will impart twice
   * as much velocity as calling just ApplyLinearImpulse(0, 1,
   * impulse).
   *
   * @param firstIndex the first particle to be modified.
   * @param lastIndex the last particle to be modified.
   * @param impulse the world impulse vector, usually in N-seconds or kg-m/s.
   */
    ApplyLinearImpulse(firstIndex: number, lastIndex: number, impulse: XY): void;
    static IsSignificantForce(force: XY): boolean;
    /**
   * Apply a force to the center of a particle.
   *
   * @param index the particle that will be modified.
   * @param force the world force vector, usually in Newtons (N).
   */
    ParticleApplyForce(index: number, force: XY): void;
    /**
   * Distribute a force across several particles. The particles
   * must not be wall particles. Note that the force is
   * distributed across all the particles, so calling this
   * function for indices 0..N is not the same as calling
   * ParticleApplyForce(i, force) for i in 0..N.
   *
   * @param firstIndex the first particle to be modified.
   * @param lastIndex the last particle to be modified.
   * @param force the world force vector, usually in Newtons (N).
   */
    ApplyForce(firstIndex: number, lastIndex: number, force: XY): void;
    /**
   * Get the next particle-system in the world's particle-system
   * list.
   */
    GetNext(): b2ParticleSystem | null;
    /**
   * Query the particle system for all particles that potentially
   * overlap the provided AABB.
   * b2QueryCallback::ShouldQueryParticleSystem is ignored.
   *
   * @param callback a user implemented callback class.
   * @param aabb the query box.
   */
    QueryAABB(callback: b2QueryCallback, aabb: b2AABB): void;
    /**
   * Query the particle system for all particles that potentially
   * overlap the provided shape's AABB. Calls QueryAABB
   * internally. b2QueryCallback::ShouldQueryParticleSystem is
   * ignored.
   *
   * @param callback a user implemented callback class.
   * @param shape the query shape
   * @param xf the transform of the AABB
   * @param childIndex
   */
    QueryShapeAABB(callback: b2QueryCallback, shape: b2Shape, xf: b2Transform, childIndex?: number): void;
    static readonly QueryShapeAABB_s_aabb: b2AABB;
    QueryPointAABB(callback: b2QueryCallback, point: XY, slop?: number): void;
    static readonly QueryPointAABB_s_aabb: b2AABB;
    /**
   * Ray-cast the particle system for all particles in the path of
   * the ray. Your callback controls whether you get the closest
   * point, any point, or n-points. The ray-cast ignores particles
   * that contain the starting point.
   * b2RayCastCallback::ShouldQueryParticleSystem is ignored.
   *
   * @param callback a user implemented callback class.
   * @param point1 the ray starting point
   * @param point2 the ray ending point
   */
    RayCast(callback: b2RayCastCallback, point1: XY, point2: XY): void;
    static readonly RayCast_s_aabb: b2AABB;
    static readonly RayCast_s_p: b2Vec2;
    static readonly RayCast_s_v: b2Vec2;
    static readonly RayCast_s_n: b2Vec2;
    static readonly RayCast_s_point: b2Vec2;
    /**
   * Compute the axis-aligned bounding box for all particles
   * contained within this particle system.
   * @param aabb Returns the axis-aligned bounding box of the system.
   */
    ComputeAABB(aabb: b2AABB): void;
    /**
   * All particle types that require creating pairs
   */
    static readonly k_pairFlags: number;
    /**
   * All particle types that require creating triads
   */
    static readonly k_triadFlags = b2ParticleFlag.b2_elasticParticle;
    /**
   * All particle types that do not produce dynamic pressure
   */
    static readonly k_noPressureFlags: number;
    /**
   * All particle types that apply extra damping force with bodies
   */
    static readonly k_extraDampingFlags = b2ParticleFlag.b2_staticPressureParticle;
    static readonly k_barrierWallFlags: number;
    FreeBuffer<T>(b: T[] | null, capacity: number): void;
    FreeUserOverridableBuffer<T>(b: b2ParticleSystem_UserOverridableBuffer<T>): void;
    /**
   * Reallocate a buffer
   */
    ReallocateBuffer3<T>(oldBuffer: T[] | null, oldCapacity: number, newCapacity: number): T[];
    /**
   * Reallocate a buffer
   */
    ReallocateBuffer5<T>(buffer: T[] | null, userSuppliedCapacity: number, oldCapacity: number, newCapacity: number, deferred: boolean): T[];
    /**
   * Reallocate a buffer
   */
    ReallocateBuffer4<T>(buffer: b2ParticleSystem_UserOverridableBuffer<any>, oldCapacity: number, newCapacity: number, deferred: boolean): T[];
    RequestBuffer<T>(buffer: T[] | null): T[];
    /**
   * Reallocate the handle / index map and schedule the allocation
   * of a new pool for handle allocation.
   */
    ReallocateHandleBuffers(newCapacity: number): void;
    ReallocateInternalAllocatedBuffers(capacity: number): void;
    CreateParticleForGroup(groupDef: b2IParticleGroupDef, xf: b2Transform, p: XY): void;
    CreateParticlesStrokeShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void;
    static readonly CreateParticlesStrokeShapeForGroup_s_edge: b2EdgeShape;
    static readonly CreateParticlesStrokeShapeForGroup_s_d: b2Vec2;
    static readonly CreateParticlesStrokeShapeForGroup_s_p: b2Vec2;
    CreateParticlesFillShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void;
    static readonly CreateParticlesFillShapeForGroup_s_aabb: b2AABB;
    static readonly CreateParticlesFillShapeForGroup_s_p: b2Vec2;
    CreateParticlesWithShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void;
    CreateParticlesWithShapesForGroup(shapes: b2Shape[], shapeCount: number, groupDef: b2IParticleGroupDef, xf: b2Transform): void;
    CloneParticle(oldIndex: number, group: b2ParticleGroup): number;
    DestroyParticlesInGroup(group: b2ParticleGroup, callDestructionListener?: boolean): void;
    DestroyParticleGroup(group: b2ParticleGroup): void;
    static ParticleCanBeConnected(flags: b2ParticleFlag, group: b2ParticleGroup | null): boolean;
    UpdatePairsAndTriads(firstIndex: number, lastIndex: number, filter: b2ParticleSystem_ConnectionFilter): void;
    private static UpdatePairsAndTriads_s_dab;
    private static UpdatePairsAndTriads_s_dbc;
    private static UpdatePairsAndTriads_s_dca;
    UpdatePairsAndTriadsWithReactiveParticles(): void;
    static ComparePairIndices(a: b2ParticlePair, b: b2ParticlePair): boolean;
    static MatchPairIndices(a: b2ParticlePair, b: b2ParticlePair): boolean;
    static CompareTriadIndices(a: b2ParticleTriad, b: b2ParticleTriad): boolean;
    static MatchTriadIndices(a: b2ParticleTriad, b: b2ParticleTriad): boolean;
    static InitializeParticleLists(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void;
    MergeParticleListsInContact(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void;
    static MergeParticleLists(listA: b2ParticleSystem_ParticleListNode, listB: b2ParticleSystem_ParticleListNode): void;
    static FindLongestParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): b2ParticleSystem_ParticleListNode;
    MergeZombieParticleListNodes(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[], survivingList: b2ParticleSystem_ParticleListNode): void;
    static MergeParticleListAndNode(list: b2ParticleSystem_ParticleListNode, node: b2ParticleSystem_ParticleListNode): void;
    CreateParticleGroupsFromParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[], survivingList: b2ParticleSystem_ParticleListNode): void;
    UpdatePairsAndTriadsWithParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void;
    ComputeDepth(): void;
    GetInsideBoundsEnumerator(aabb: Readonly<b2AABB>): b2ParticleSystem_InsideBoundsEnumerator;
    UpdateAllParticleFlags(): void;
    UpdateAllGroupFlags(): void;
    AddContact(a: number, b: number, contacts: b2GrowableBuffer<b2ParticleContact>): void;
    static readonly AddContact_s_d: b2Vec2;
    FindContacts_Reference(contacts: b2GrowableBuffer<b2ParticleContact>): void;
    FindContacts(contacts: b2GrowableBuffer<b2ParticleContact>): void;
    UpdateProxies_Reference(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void;
    UpdateProxies(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void;
    SortProxies(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void;
    FilterContacts(contacts: b2GrowableBuffer<b2ParticleContact>): void;
    NotifyContactListenerPreContact(particlePairs: b2ParticlePairSet): void;
    NotifyContactListenerPostContact(particlePairs: b2ParticlePairSet): void;
    static b2ParticleContactIsZombie(contact: b2ParticleContact): boolean;
    UpdateContacts(exceptZombie: boolean): void;
    NotifyBodyContactListenerPreContact(fixtureSet: b2ParticleSystem_FixtureParticleSet): void;
    NotifyBodyContactListenerPostContact(fixtureSet: b2ParticleSystem_FixtureParticleSet): void;
    UpdateBodyContacts(): void;
    static readonly UpdateBodyContacts_s_aabb: b2AABB;
    UpdateBodyContacts_callback: b2ParticleSystem_UpdateBodyContactsCallback | null;
    Solve(step: b2TimeStep): void;
    static readonly Solve_s_subStep: b2TimeStep;
    SolveCollision(step: b2TimeStep): void;
    static readonly SolveCollision_s_aabb: b2AABB;
    SolveCollision_callback: b2ParticleSystem_SolveCollisionCallback | null;
    LimitVelocity(step: b2TimeStep): void;
    SolveGravity(step: b2TimeStep): void;
    static readonly SolveGravity_s_gravity: b2Vec2;
    SolveBarrier(step: b2TimeStep): void;
    static readonly SolveBarrier_s_aabb: b2AABB;
    static readonly SolveBarrier_s_va: b2Vec2;
    static readonly SolveBarrier_s_vb: b2Vec2;
    static readonly SolveBarrier_s_pba: b2Vec2;
    static readonly SolveBarrier_s_vba: b2Vec2;
    static readonly SolveBarrier_s_vc: b2Vec2;
    static readonly SolveBarrier_s_pca: b2Vec2;
    static readonly SolveBarrier_s_vca: b2Vec2;
    static readonly SolveBarrier_s_qba: b2Vec2;
    static readonly SolveBarrier_s_qca: b2Vec2;
    static readonly SolveBarrier_s_dv: b2Vec2;
    static readonly SolveBarrier_s_f: b2Vec2;
    SolveStaticPressure(step: b2TimeStep): void;
    ComputeWeight(): void;
    SolvePressure(step: b2TimeStep): void;
    static readonly SolvePressure_s_f: b2Vec2;
    SolveDamping(step: b2TimeStep): void;
    static readonly SolveDamping_s_v: b2Vec2;
    static readonly SolveDamping_s_f: b2Vec2;
    SolveRigidDamping(): void;
    static readonly SolveRigidDamping_s_t0: b2Vec2;
    static readonly SolveRigidDamping_s_t1: b2Vec2;
    static readonly SolveRigidDamping_s_p: b2Vec2;
    static readonly SolveRigidDamping_s_v: b2Vec2;
    SolveExtraDamping(): void;
    static readonly SolveExtraDamping_s_v: b2Vec2;
    static readonly SolveExtraDamping_s_f: b2Vec2;
    SolveWall(): void;
    SolveRigid(step: b2TimeStep): void;
    static readonly SolveRigid_s_position: b2Vec2;
    static readonly SolveRigid_s_rotation: b2Rot;
    static readonly SolveRigid_s_transform: b2Transform;
    static readonly SolveRigid_s_velocityTransform: b2Transform;
    SolveElastic(step: b2TimeStep): void;
    static readonly SolveElastic_s_pa: b2Vec2;
    static readonly SolveElastic_s_pb: b2Vec2;
    static readonly SolveElastic_s_pc: b2Vec2;
    static readonly SolveElastic_s_r: b2Rot;
    static readonly SolveElastic_s_t0: b2Vec2;
    SolveSpring(step: b2TimeStep): void;
    static readonly SolveSpring_s_pa: b2Vec2;
    static readonly SolveSpring_s_pb: b2Vec2;
    static readonly SolveSpring_s_d: b2Vec2;
    static readonly SolveSpring_s_f: b2Vec2;
    SolveTensile(step: b2TimeStep): void;
    static readonly SolveTensile_s_weightedNormal: b2Vec2;
    static readonly SolveTensile_s_s: b2Vec2;
    static readonly SolveTensile_s_f: b2Vec2;
    SolveViscous(): void;
    static readonly SolveViscous_s_v: b2Vec2;
    static readonly SolveViscous_s_f: b2Vec2;
    SolveRepulsive(step: b2TimeStep): void;
    static readonly SolveRepulsive_s_f: b2Vec2;
    SolvePowder(step: b2TimeStep): void;
    static readonly SolvePowder_s_f: b2Vec2;
    SolveSolid(step: b2TimeStep): void;
    static readonly SolveSolid_s_f: b2Vec2;
    SolveForce(step: b2TimeStep): void;
    SolveColorMixing(): void;
    SolveZombie(): void;
    /**
   * Destroy all particles which have outlived their lifetimes set
   * by SetParticleLifetime().
   */
    SolveLifetimes(step: b2TimeStep): void;
    RotateBuffer(start: number, mid: number, end: number): void;
    GetCriticalVelocity(step: b2TimeStep): number;
    GetCriticalVelocitySquared(step: b2TimeStep): number;
    GetCriticalPressure(step: b2TimeStep): number;
    GetParticleStride(): number;
    GetParticleMass(): number;
    GetParticleInvMass(): number;
    /**
   * Get the world's contact filter if any particles with the
   * b2_contactFilterParticle flag are present in the system.
   */
    GetFixtureContactFilter(): b2ContactFilter | null;
    /**
   * Get the world's contact filter if any particles with the
   * b2_particleContactFilterParticle flag are present in the
   * system.
   */
    GetParticleContactFilter(): b2ContactFilter | null;
    /**
   * Get the world's contact listener if any particles with the
   * b2_fixtureContactListenerParticle flag are present in the
   * system.
   */
    GetFixtureContactListener(): b2ContactListener | null;
    /**
   * Get the world's contact listener if any particles with the
   * b2_particleContactListenerParticle flag are present in the
   * system.
   */
    GetParticleContactListener(): b2ContactListener | null;
    SetUserOverridableBuffer<T>(buffer: b2ParticleSystem_UserOverridableBuffer<T>, data: T[]): void;
    SetGroupFlags(group: b2ParticleGroup, newFlags: b2ParticleGroupFlag): void;
    static BodyContactCompare(lhs: b2ParticleBodyContact, rhs: b2ParticleBodyContact): boolean;
    RemoveSpuriousBodyContacts(): void;
    private static RemoveSpuriousBodyContacts_s_n;
    private static RemoveSpuriousBodyContacts_s_pos;
    private static RemoveSpuriousBodyContacts_s_normal;
    DetectStuckParticle(particle: number): void;
    /**
   * Determine whether a particle index is valid.
   */
    ValidateParticleIndex(index: number): boolean;
    /**
   * Get the time elapsed in
   * b2ParticleSystemDef::lifetimeGranularity.
   */
    GetQuantizedTimeElapsed(): number;
    /**
   * Convert a lifetime in seconds to an expiration time.
   */
    LifetimeToExpirationTime(lifetime: number): number;
    ForceCanBeApplied(flags: b2ParticleFlag): boolean;
    PrepareForceBuffer(): void;
    IsRigidGroup(group: b2ParticleGroup | null): boolean;
    GetLinearVelocity(group: b2ParticleGroup | null, particleIndex: number, point: b2Vec2, out: b2Vec2): b2Vec2;
    InitDampingParameter(invMass: number[], invInertia: number[], tangentDistance: number[], mass: number, inertia: number, center: b2Vec2, point: b2Vec2, normal: b2Vec2): void;
    InitDampingParameterWithRigidGroupOrParticle(invMass: number[], invInertia: number[], tangentDistance: number[], isRigidGroup: boolean, group: b2ParticleGroup | null, particleIndex: number, point: b2Vec2, normal: b2Vec2): void;
    ComputeDampingImpulse(invMassA: number, invInertiaA: number, tangentDistanceA: number, invMassB: number, invInertiaB: number, tangentDistanceB: number, normalVelocity: number): number;
    ApplyDamping(invMass: number, invInertia: number, tangentDistance: number, isRigidGroup: boolean, group: b2ParticleGroup | null, particleIndex: number, impulse: number, normal: b2Vec2): void;
}
export declare class b2ParticleSystem_UserOverridableBuffer<T> {
    _data: T[] | null;
    get data(): T[];
    set data(value: T[]);
    userSuppliedCapacity: number;
}
export declare class b2ParticleSystem_Proxy {
    index: number;
    tag: number;
    static CompareProxyProxy(a: b2ParticleSystem_Proxy, b: b2ParticleSystem_Proxy): boolean;
    static CompareTagProxy(a: number, b: b2ParticleSystem_Proxy): boolean;
    static CompareProxyTag(a: b2ParticleSystem_Proxy, b: number): boolean;
}
export declare class b2ParticleSystem_InsideBoundsEnumerator {
    m_system: b2ParticleSystem;
    m_xLower: number;
    m_xUpper: number;
    m_yLower: number;
    m_yUpper: number;
    m_first: number;
    m_last: number;
    /**
   * InsideBoundsEnumerator enumerates all particles inside the
   * given bounds.
   *
   * Construct an enumerator with bounds of tags and a range of
   * proxies.
   */
    constructor(system: b2ParticleSystem, lower: number, upper: number, first: number, last: number);
    /**
   * Get index of the next particle. Returns
   * b2_invalidParticleIndex if there are no more particles.
   */
    GetNext(): number;
}
export declare class b2ParticleSystem_ParticleListNode {
    /**
   * The head of the list.
   */
    list: b2ParticleSystem_ParticleListNode;
    /**
   * The next node in the list.
   */
    next: b2ParticleSystem_ParticleListNode | null;
    /**
   * Number of entries in the list. Valid only for the node at the
   * head of the list.
   */
    count: number;
    /**
   * Particle index.
   */
    index: number;
}
/**
 * @constructor
 */
export declare class b2ParticleSystem_FixedSetAllocator<T> {
    Allocate(itemSize: number, count: number): number;
    Clear(): void;
    GetCount(): number;
    Invalidate(itemIndex: number): void;
    GetValidBuffer(): boolean[];
    GetBuffer(): T[];
    SetCount(count: number): void;
}
export declare class b2ParticleSystem_FixtureParticle {
    first: b2Fixture;
    second: number;
    constructor(fixture: b2Fixture, particle: number);
}
export declare class b2ParticleSystem_FixtureParticleSet extends b2ParticleSystem_FixedSetAllocator<b2ParticleSystem_FixtureParticle> {
    Initialize(bodyContactBuffer: b2GrowableBuffer<b2ParticleBodyContact>, flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>): void;
    Find(pair: b2ParticleSystem_FixtureParticle): number;
}
export declare class b2ParticleSystem_ParticlePair {
    first: number;
    second: number;
    constructor(particleA: number, particleB: number);
}
export declare class b2ParticlePairSet extends b2ParticleSystem_FixedSetAllocator<b2ParticleSystem_ParticlePair> {
    Initialize(contactBuffer: b2GrowableBuffer<b2ParticleContact>, flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>): void;
    Find(pair: b2ParticleSystem_ParticlePair): number;
}
export declare class b2ParticleSystem_ConnectionFilter {
    /**
   * Is the particle necessary for connection?
   * A pair or a triad should contain at least one 'necessary'
   * particle.
   */
    IsNecessary(index: number): boolean;
    /**
   * An additional condition for creating a pair.
   */
    ShouldCreatePair(a: number, b: number): boolean;
    /**
   * An additional condition for creating a triad.
   */
    ShouldCreateTriad(a: number, b: number, c: number): boolean;
}
export declare class b2ParticleSystem_DestroyParticlesInShapeCallback extends b2QueryCallback {
    m_system: b2ParticleSystem;
    m_shape: b2Shape;
    m_xf: b2Transform;
    m_callDestructionListener: boolean;
    m_destroyed: number;
    constructor(system: b2ParticleSystem, shape: b2Shape, xf: b2Transform, callDestructionListener: boolean);
    ReportFixture(fixture: b2Fixture): boolean;
    ReportParticle(particleSystem: b2ParticleSystem, index: number): boolean;
    Destroyed(): number;
}
export declare class b2ParticleSystem_JoinParticleGroupsFilter extends b2ParticleSystem_ConnectionFilter {
    m_threshold: number;
    constructor(threshold: number);
    /**
   * An additional condition for creating a pair.
   */
    ShouldCreatePair(a: number, b: number): boolean;
    /**
   * An additional condition for creating a triad.
   */
    ShouldCreateTriad(a: number, b: number, c: number): boolean;
}
export declare class b2ParticleSystem_CompositeShape extends b2Shape {
    constructor(shapes: b2Shape[], shapeCount?: number);
    m_shapes: b2Shape[];
    m_shapeCount: number;
    Clone(): b2Shape;
    GetChildCount(): number;
    /**
   * @see b2Shape::TestPoint
   */
    TestPoint(xf: b2Transform, p: XY): boolean;
    /**
   * @see b2Shape::ComputeDistance
   */
    ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number;
    /**
   * Implement b2Shape.
   */
    RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean;
    /**
   * @see b2Shape::ComputeAABB
   */
    ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void;
    /**
   * @see b2Shape::ComputeMass
   */
    ComputeMass(massData: b2MassData, density: number): void;
    SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void;
    ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
export declare class b2ParticleSystem_ReactiveFilter extends b2ParticleSystem_ConnectionFilter {
    m_flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>;
    constructor(flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>);
    IsNecessary(index: number): boolean;
}
export declare class b2ParticleSystem_UpdateBodyContactsCallback extends b2FixtureParticleQueryCallback {
    m_contactFilter: b2ContactFilter | null;
    constructor(system: b2ParticleSystem, contactFilter?: b2ContactFilter | null);
    ShouldCollideFixtureParticle(fixture: b2Fixture, particleSystem: b2ParticleSystem, particleIndex: number): boolean;
    ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, a: number): void;
    static readonly ReportFixtureAndParticle_s_n: b2Vec2;
    static readonly ReportFixtureAndParticle_s_rp: b2Vec2;
}
export declare class b2ParticleSystem_SolveCollisionCallback extends b2FixtureParticleQueryCallback {
    m_step: b2TimeStep;
    constructor(system: b2ParticleSystem, step: b2TimeStep);
    ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, a: number): void;
    static readonly ReportFixtureAndParticle_s_p1: b2Vec2;
    static readonly ReportFixtureAndParticle_s_output: b2RayCastOutput;
    static readonly ReportFixtureAndParticle_s_input: b2RayCastInput;
    static readonly ReportFixtureAndParticle_s_p: b2Vec2;
    static readonly ReportFixtureAndParticle_s_v: b2Vec2;
    static readonly ReportFixtureAndParticle_s_f: b2Vec2;
    ReportParticle(system: b2ParticleSystem, index: number): boolean;
}
