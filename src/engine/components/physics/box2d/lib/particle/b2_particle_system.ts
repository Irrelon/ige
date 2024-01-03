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

// DEBUG: import { b2Assert, b2_maxParticleIndex } from "../common/b2_settings.js";
import { b2_linearSlop, b2_maxFloat, b2_invalidParticleIndex, b2_minParticleSystemBufferCapacity, b2_maxTriadDistanceSquared, b2_barrierCollisionTime, b2MakeArray, b2Maybe } from "../common/b2_settings.js";
import { b2_maxParticlePressure, b2_minParticleWeight, b2_maxParticleForce, b2_particleStride } from "../common/b2_settings.js";
import { b2Min, b2Max, b2Abs, b2Clamp, b2Sqrt, b2InvSqrt, b2Vec2, b2TypedVec2, b2Rot, b2Transform, XY } from "../common/b2_math.js";
import { b2Color, b2TypedColor } from "../common/b2_draw.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "../collision/b2_collision.js";
import { b2ShapeType, b2Shape, b2MassData } from "../collision/b2_shape.js";
import { b2EdgeShape } from "../collision/b2_edge_shape.js";
import { b2ChainShape } from "../collision/b2_chain_shape.js";
import { b2TimeStep } from "../dynamics/b2_time_step.js";
import { b2Fixture } from "../dynamics/b2_fixture.js";
import { b2Body } from "../dynamics/b2_body.js";
import { b2World } from "../dynamics/b2_world.js";
import { b2ContactFilter, b2ContactListener, b2QueryCallback, b2RayCastCallback } from "../dynamics/b2_world_callbacks.js";
import { b2ParticleFlag, b2ParticleDef, b2ParticleHandle, b2IParticleDef } from "./b2_particle.js";
import { b2ParticleGroupFlag, b2ParticleGroupDef, b2ParticleGroup, b2IParticleGroupDef } from "./b2_particle_group.js";
import { b2VoronoiDiagram } from "./b2_voronoi_diagram.js";
import { b2DistanceProxy } from "../collision/b2_distance.js";

function std_iter_swap<T>(array: T[], a: number, b: number): void {
  const tmp: T = array[a];
  array[a] = array[b];
  array[b] = tmp;
}

function default_compare<T>(a: T, b: T): boolean { return a < b; }

function std_sort<T>(array: T[], first: number = 0, len: number = array.length - first, cmp: (a: T, b: T) => boolean = default_compare): T[] {
  let left = first;
  const stack: number[] = [];
  let pos = 0;

  for (; ; ) { /* outer loop */
    for (; left + 1 < len; len++) { /* sort left to len-1 */
      const pivot = array[left + Math.floor(Math.random() * (len - left))]; /* pick random pivot */
      stack[pos++] = len; /* sort right part later */
      for (let right = left - 1; ; ) { /* inner loop: partitioning */
        while (cmp(array[++right], pivot)) {} /* look for greater element */
        while (cmp(pivot, array[--len])) {} /* look for smaller element */
        if (right >= len) {
          break;
        } /* partition point found? */
        std_iter_swap(array, right, len); /* the only swap */
      } /* partitioned, continue left part */
    }
    if (pos === 0) {
      break;
    } /* stack empty? */
    left = len; /* left to right is sorted */
    len = stack[--pos]; /* get next range to sort */
  }

  return array;
}

function std_stable_sort<T>(array: T[], first: number = 0, len: number = array.length - first, cmp: (a: T, b: T) => boolean = default_compare): T[] {
  return std_sort(array, first, len, cmp);
}

function std_remove_if<T>(array: T[], predicate: (value: T) => boolean, length: number = array.length) {
  let l = 0;

  for (let c = 0; c < length; ++c) {
    // if we can be collapsed, keep l where it is.
    if (predicate(array[c])) {
      continue;
    }

    // this node can't be collapsed; push it back as far as we can.
    if (c === l) {
      ++l;
      continue; // quick exit if we're already in the right spot
    }

    // array[l++] = array[c];
    std_iter_swap(array, l++, c);
  }

  return l;
}

function std_lower_bound<A, B>(array: A[], first: number, last: number, val: B, cmp: (a: A, b: B) => boolean): number {
  let count = last - first;
  while (count > 0) {
    const step = Math.floor(count / 2);
    let it = first + step;

    if (cmp(array[it], val)) {
      first = ++it;
      count -= step + 1;
    } else {
      count = step;
    }
  }
  return first;
}

function std_upper_bound<A, B>(array: B[], first: number, last: number, val: A, cmp: (a: A, b: B) => boolean): number {
  let count = last - first;
  while (count > 0) {
    const step = Math.floor(count / 2);
    let it = first + step;

    if (!cmp(val, array[it])) {
      first = ++it;
      count -= step + 1;
    } else {
      count = step;
    }
  }
  return first;
}

function std_rotate<T>(array: T[], first: number, n_first: number, last: number): void {
  let next = n_first;
  while (first !== next) {
    std_iter_swap(array, first++, next++);
    if (next === last) {
      next = n_first;
    } else if (first === n_first) {
      n_first = next;
         }
  }
}

function std_unique<T>(array: T[], first: number, last: number, cmp: (a: T, b: T) => boolean): number {
  if (first === last) {
    return last;
  }
  let result = first;
  while (++first !== last) {
    if (!cmp(array[result], array[first])) {
      ///array[++result] = array[first];
      std_iter_swap(array, ++result, first);
    }
  }
  return ++result;
}

export class b2GrowableBuffer<T> {
  public data: T[] = [];
  public count: number = 0;
  public capacity: number = 0;
  public allocator: () => T;

  constructor(allocator: () => T) {
    this.allocator = allocator;
  }

  public Append(): number {
    if (this.count >= this.capacity) {
      this.Grow();
    }
    return this.count++;
  }

  public Reserve(newCapacity: number): void {
    if (this.capacity >= newCapacity) {
      return;
    }

    // DEBUG: b2Assert(this.capacity === this.data.length);
    for (let i = this.capacity; i < newCapacity; ++i) {
      this.data[i] = this.allocator();
    }
    this.capacity = newCapacity;
  }

  public Grow(): void {
    // Double the capacity.
    const newCapacity = this.capacity ? 2 * this.capacity : b2_minParticleSystemBufferCapacity;
    // DEBUG: b2Assert(newCapacity > this.capacity);
    this.Reserve(newCapacity);
  }

  public Free(): void {
    if (this.data.length === 0) {
      return;
    }

    this.data = [];
    this.capacity = 0;
    this.count = 0;
  }

  public Shorten(newEnd: number): void {
    // DEBUG: b2Assert(false);
  }

  public Data(): T[] {
    return this.data;
  }

  public GetCount(): number {
    return this.count;
  }

  public SetCount(newCount: number): void {
    // DEBUG: b2Assert(0 <= newCount && newCount <= this.capacity);
    this.count = newCount;
  }

  public GetCapacity(): number {
    return this.capacity;
  }

  public RemoveIf(pred: (t: T) => boolean): void {
    // DEBUG: let count = 0;
    // DEBUG: for (let i = 0; i < this.count; ++i) {
    // DEBUG:   if (!pred(this.data[i])) {
    // DEBUG:     count++;
    // DEBUG:   }
    // DEBUG: }

    this.count = std_remove_if(this.data, pred, this.count);

    // DEBUG: b2Assert(count === this.count);
  }

  public Unique(pred: (a: T, b: T) => boolean): void {
    this.count = std_unique(this.data, 0, this.count, pred);
  }
}

export type b2ParticleIndex = number;

export class b2FixtureParticleQueryCallback extends b2QueryCallback {
  public m_system: b2ParticleSystem;
  constructor(system: b2ParticleSystem) {
    super();
    this.m_system = system;
  }
  public override ShouldQueryParticleSystem(system: b2ParticleSystem): boolean {
    // Skip reporting particles.
    return false;
  }
  public override ReportFixture(fixture: b2Fixture): boolean {
    if (fixture.IsSensor()) {
      return true;
    }
    const shape = fixture.GetShape();
    const childCount = shape.GetChildCount();
    for (let childIndex = 0; childIndex < childCount; childIndex++) {
      const aabb = fixture.GetAABB(childIndex);
      const enumerator = this.m_system.GetInsideBoundsEnumerator(aabb);
      let index: number;
      while ((index = enumerator.GetNext()) >= 0) {
        this.ReportFixtureAndParticle(fixture, childIndex, index);
      }
    }
    return true;
  }
  public override ReportParticle(system: b2ParticleSystem, index: number): boolean {
    return false;
  }
  public ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, index: number): void {
    // DEBUG: b2Assert(false); // pure virtual
  }
}

export class b2ParticleContact {
  public indexA: number = 0;
  public indexB: number = 0;
  public weight: number = 0;
  public normal: b2Vec2 = new b2Vec2();
  public flags: b2ParticleFlag = 0;

  public SetIndices(a: number, b: number): void {
    // DEBUG: b2Assert(a <= b2_maxParticleIndex && b <= b2_maxParticleIndex);
    this.indexA = a;
    this.indexB = b;
  }

  public SetWeight(w: number): void {
    this.weight = w;
  }

  public SetNormal(n: b2Vec2): void {
    this.normal.Copy(n);
  }

  public SetFlags(f: b2ParticleFlag): void {
    this.flags = f;
  }

  public GetIndexA(): number {
    return this.indexA;
  }

  public GetIndexB(): number {
    return this.indexB;
  }

  public GetWeight(): number {
    return this.weight;
  }

  public GetNormal(): b2Vec2 {
    return this.normal;
  }

  public GetFlags(): b2ParticleFlag {
    return this.flags;
  }

  public IsEqual(rhs: b2ParticleContact): boolean {
    return this.indexA === rhs.indexA && this.indexB === rhs.indexB && this.flags === rhs.flags && this.weight === rhs.weight && this.normal.x === rhs.normal.x && this.normal.y === rhs.normal.y;
  }

  public IsNotEqual(rhs: b2ParticleContact): boolean {
    return !this.IsEqual(rhs);
  }

  public ApproximatelyEqual(rhs: b2ParticleContact): boolean {
    const MAX_WEIGHT_DIFF = 0.01; // Weight 0 ~ 1, so about 1%
    const MAX_NORMAL_DIFF_SQ = 0.01 * 0.01; // Normal length = 1, so 1%
    return this.indexA === rhs.indexA && this.indexB === rhs.indexB && this.flags === rhs.flags && b2Abs(this.weight - rhs.weight) < MAX_WEIGHT_DIFF && b2Vec2.DistanceSquaredVV(this.normal, rhs.normal) < MAX_NORMAL_DIFF_SQ;
  }
}

export class b2ParticleBodyContact {
  public index: number = 0; // Index of the particle making contact.
  public body!: b2Body; // The body making contact.
  public fixture!: b2Fixture; // The specific fixture making contact
  public weight: number = 0.0; // Weight of the contact. A value between 0.0f and 1.0f.
  public normal: b2Vec2 = new b2Vec2(); // The normalized direction from the particle to the body.
  public mass: number = 0.0; // The effective mass used in calculating force.
}

export class b2ParticlePair {
  public indexA: number = 0; // Indices of the respective particles making pair.
  public indexB: number = 0;
  public flags: b2ParticleFlag = 0; // The logical sum of the particle flags. See the b2ParticleFlag enum.
  public strength: number = 0.0; // The strength of cohesion among the particles.
  public distance: number = 0.0; // The initial distance of the particles.
}

export class b2ParticleTriad {
  public indexA: number = 0; // Indices of the respective particles making triad.
  public indexB: number = 0;
  public indexC: number = 0;
  public flags: b2ParticleFlag = 0; // The logical sum of the particle flags. See the b2ParticleFlag enum.
  public strength: number = 0.0; // The strength of cohesion among the particles.
  public pa: b2Vec2 = new b2Vec2(0.0, 0.0); // Values used for calculation.
  public pb: b2Vec2 = new b2Vec2(0.0, 0.0);
  public pc: b2Vec2 = new b2Vec2(0.0, 0.0);
  public ka: number = 0.0;
  public kb: number = 0.0;
  public kc: number = 0.0;
  public s: number = 0.0;
}

export class b2ParticleSystemDef {
  // Initialize physical coefficients to the maximum values that
  // maintain numerical stability.

  /**
   * Enable strict Particle/Body contact check.
   * See SetStrictContactCheck for details.
   */
  public strictContactCheck: boolean = false;

  /**
   * Set the particle density.
   * See SetDensity for details.
   */
  public density: number = 1.0;

  /**
   * Change the particle gravity scale. Adjusts the effect of the
   * global gravity vector on particles. Default value is 1.0f.
   */
  public gravityScale: number = 1.0;

  /**
   * Particles behave as circles with this radius. In Box2D units.
   */
  public radius: number = 1.0;

  /**
   * Set the maximum number of particles.
   * By default, there is no maximum. The particle buffers can
   * continue to grow while b2World's block allocator still has
   * memory.
   * See SetMaxParticleCount for details.
   */
  public maxCount: number = 0;

  /**
   * Increases pressure in response to compression
   * Smaller values allow more compression
   */
  public pressureStrength: number = 0.005;

  /**
   * Reduces velocity along the collision normal
   * Smaller value reduces less
   */
  public dampingStrength: number = 1.0;

  /**
   * Restores shape of elastic particle groups
   * Larger values increase elastic particle velocity
   */
  public elasticStrength: number = 0.25;

  /**
   * Restores length of spring particle groups
   * Larger values increase spring particle velocity
   */
  public springStrength: number = 0.25;

  /**
   * Reduces relative velocity of viscous particles
   * Larger values slow down viscous particles more
   */
  public viscousStrength: number = 0.25;

  /**
   * Produces pressure on tensile particles
   * 0~0.2. Larger values increase the amount of surface tension.
   */
  public surfaceTensionPressureStrength: number = 0.2;

  /**
   * Smoothes outline of tensile particles
   * 0~0.2. Larger values result in rounder, smoother,
   * water-drop-like clusters of particles.
   */
  public surfaceTensionNormalStrength: number = 0.2;

  /**
   * Produces additional pressure on repulsive particles
   * Larger values repulse more
   * Negative values mean attraction. The range where particles
   * behave stably is about -0.2 to 2.0.
   */
  public repulsiveStrength: number = 1.0;

  /**
   * Produces repulsion between powder particles
   * Larger values repulse more
   */
  public powderStrength: number = 0.5;

  /**
   * Pushes particles out of solid particle group
   * Larger values repulse more
   */
  public ejectionStrength: number = 0.5;

  /**
   * Produces static pressure
   * Larger values increase the pressure on neighboring partilces
   * For a description of static pressure, see
   * http://en.wikipedia.org/wiki/Static_pressure#Static_pressure_in_fluid_dynamics
   */
  public staticPressureStrength: number = 0.2;

  /**
   * Reduces instability in static pressure calculation
   * Larger values make stabilize static pressure with fewer
   * iterations
   */
  public staticPressureRelaxation: number = 0.2;

  /**
   * Computes static pressure more precisely
   * See SetStaticPressureIterations for details
   */
  public staticPressureIterations: number = 8;

  /**
   * Determines how fast colors are mixed
   * 1.0f ==> mixed immediately
   * 0.5f ==> mixed half way each simulation step (see
   * b2World::Step())
   */
  public colorMixingStrength: number = 0.5;

  /**
   * Whether to destroy particles by age when no more particles
   * can be created.  See #b2ParticleSystem::SetDestructionByAge()
   * for more information.
   */
  public destroyByAge: boolean = true;

  /**
   * Granularity of particle lifetimes in seconds.  By default
   * this is set to (1.0f / 60.0f) seconds.  b2ParticleSystem uses
   * a 32-bit signed value to track particle lifetimes so the
   * maximum lifetime of a particle is (2^32 - 1) / (1.0f /
   * lifetimeGranularity) seconds. With the value set to 1/60 the
   * maximum lifetime or age of a particle is 2.27 years.
   */
  public lifetimeGranularity: number = 1.0 / 60.0;

  public Copy(def: b2ParticleSystemDef): b2ParticleSystemDef {
    this.strictContactCheck = def.strictContactCheck;
    this.density = def.density;
    this.gravityScale = def.gravityScale;
    this.radius = def.radius;
    this.maxCount = def.maxCount;
    this.pressureStrength = def.pressureStrength;
    this.dampingStrength = def.dampingStrength;
    this.elasticStrength = def.elasticStrength;
    this.springStrength = def.springStrength;
    this.viscousStrength = def.viscousStrength;
    this.surfaceTensionPressureStrength = def.surfaceTensionPressureStrength;
    this.surfaceTensionNormalStrength = def.surfaceTensionNormalStrength;
    this.repulsiveStrength = def.repulsiveStrength;
    this.powderStrength = def.powderStrength;
    this.ejectionStrength = def.ejectionStrength;
    this.staticPressureStrength = def.staticPressureStrength;
    this.staticPressureRelaxation = def.staticPressureRelaxation;
    this.staticPressureIterations = def.staticPressureIterations;
    this.colorMixingStrength = def.colorMixingStrength;
    this.destroyByAge = def.destroyByAge;
    this.lifetimeGranularity = def.lifetimeGranularity;
    return this;
  }

  public Clone(): b2ParticleSystemDef {
    return new b2ParticleSystemDef().Copy(this);
  }
}

export class b2ParticleSystem {
  public m_paused: boolean = false;
  public m_timestamp: number = 0;
  public m_allParticleFlags: b2ParticleFlag = 0;
  public m_needsUpdateAllParticleFlags: boolean = false;
  public m_allGroupFlags: b2ParticleGroupFlag = 0;
  public m_needsUpdateAllGroupFlags: boolean = false;
  public m_hasForce: boolean = false;
  public m_iterationIndex: number = 0;
  public m_inverseDensity: number = 0.0;
  public m_particleDiameter: number = 0.0;
  public m_inverseDiameter: number = 0.0;
  public m_squaredDiameter: number = 0.0;
  public m_count: number = 0;
  public m_internalAllocatedCapacity: number = 0;
  /**
   * Allocator for b2ParticleHandle instances.
   */
  ///m_handleAllocator: any = null;
  /**
   * Maps particle indicies to handles.
   */
  public m_handleIndexBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleHandle | null> = new b2ParticleSystem_UserOverridableBuffer<b2ParticleHandle | null>();
  public m_flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag> = new b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>();
  public m_positionBuffer: b2ParticleSystem_UserOverridableBuffer<b2Vec2> = new b2ParticleSystem_UserOverridableBuffer<b2Vec2>();
  public m_velocityBuffer: b2ParticleSystem_UserOverridableBuffer<b2Vec2> = new b2ParticleSystem_UserOverridableBuffer<b2Vec2>();
  public m_forceBuffer: b2Vec2[] = [];
  /**
   * this.m_weightBuffer is populated in ComputeWeight and used in
   * ComputeDepth(), SolveStaticPressure() and SolvePressure().
   */
  public m_weightBuffer: number[] = [];
  /**
   * When any particles have the flag b2_staticPressureParticle,
   * this.m_staticPressureBuffer is first allocated and used in
   * SolveStaticPressure() and SolvePressure().  It will be
   * reallocated on subsequent CreateParticle() calls.
   */
  public m_staticPressureBuffer: number[] = [];
  /**
   * this.m_accumulationBuffer is used in many functions as a temporary
   * buffer for scalar values.
   */
  public m_accumulationBuffer: number[] = [];
  /**
   * When any particles have the flag b2_tensileParticle,
   * this.m_accumulation2Buffer is first allocated and used in
   * SolveTensile() as a temporary buffer for vector values.  It
   * will be reallocated on subsequent CreateParticle() calls.
   */
  public m_accumulation2Buffer: b2Vec2[] = [];
  /**
   * When any particle groups have the flag b2_solidParticleGroup,
   * this.m_depthBuffer is first allocated and populated in
   * ComputeDepth() and used in SolveSolid(). It will be
   * reallocated on subsequent CreateParticle() calls.
   */
  public m_depthBuffer: number[] = [];
  public m_colorBuffer: b2ParticleSystem_UserOverridableBuffer<b2Color> = new b2ParticleSystem_UserOverridableBuffer<b2Color>();
  public m_groupBuffer: Array<b2ParticleGroup | null> = [];
  public m_userDataBuffer: b2ParticleSystem_UserOverridableBuffer<any> = new b2ParticleSystem_UserOverridableBuffer();
  /**
   * Stuck particle detection parameters and record keeping
   */
  public m_stuckThreshold: number = 0;
  public m_lastBodyContactStepBuffer: b2ParticleSystem_UserOverridableBuffer<number> = new b2ParticleSystem_UserOverridableBuffer<number>();
  public m_bodyContactCountBuffer: b2ParticleSystem_UserOverridableBuffer<number> = new b2ParticleSystem_UserOverridableBuffer<number>();
  public m_consecutiveContactStepsBuffer: b2ParticleSystem_UserOverridableBuffer<number> = new b2ParticleSystem_UserOverridableBuffer<number>();
  public m_stuckParticleBuffer: b2GrowableBuffer<number> = new b2GrowableBuffer<number>(() => 0);
  public m_proxyBuffer: b2GrowableBuffer<b2ParticleSystem_Proxy> = new b2GrowableBuffer<b2ParticleSystem_Proxy>(() => new b2ParticleSystem_Proxy());
  public m_contactBuffer: b2GrowableBuffer<b2ParticleContact> = new b2GrowableBuffer<b2ParticleContact>(() => new b2ParticleContact());
  public m_bodyContactBuffer: b2GrowableBuffer<b2ParticleBodyContact> = new b2GrowableBuffer<b2ParticleBodyContact>(() => new b2ParticleBodyContact());
  public m_pairBuffer: b2GrowableBuffer<b2ParticlePair> = new b2GrowableBuffer<b2ParticlePair>(() => new b2ParticlePair());
  public m_triadBuffer: b2GrowableBuffer<b2ParticleTriad> = new b2GrowableBuffer<b2ParticleTriad>(() => new b2ParticleTriad());
  /**
   * Time each particle should be destroyed relative to the last
   * time this.m_timeElapsed was initialized.  Each unit of time
   * corresponds to b2ParticleSystemDef::lifetimeGranularity
   * seconds.
   */
  public m_expirationTimeBuffer: b2ParticleSystem_UserOverridableBuffer<number> = new b2ParticleSystem_UserOverridableBuffer<number>();
  /**
   * List of particle indices sorted by expiration time.
   */
  public m_indexByExpirationTimeBuffer: b2ParticleSystem_UserOverridableBuffer<number> = new b2ParticleSystem_UserOverridableBuffer<number>();
  /**
   * Time elapsed in 32:32 fixed point.  Each non-fractional unit
   * of time corresponds to
   * b2ParticleSystemDef::lifetimeGranularity seconds.
   */
  public m_timeElapsed: number = 0;
  /**
   * Whether the expiration time buffer has been modified and
   * needs to be resorted.
   */
  public m_expirationTimeBufferRequiresSorting: boolean = false;
  public m_groupCount: number = 0;
  public m_groupList: b2ParticleGroup | null = null;
  public m_def: b2ParticleSystemDef = new b2ParticleSystemDef();
  public m_world: b2World;
  public m_prev: b2ParticleSystem | null = null;
  public m_next: b2ParticleSystem | null = null;

  public static readonly xTruncBits: number = 12;
  public static readonly yTruncBits: number = 12;
  public static readonly tagBits: number = 8 * 4; // 8u * sizeof(uint32);
  public static readonly yOffset: number = 1 << (b2ParticleSystem.yTruncBits - 1);
  public static readonly yShift: number = b2ParticleSystem.tagBits - b2ParticleSystem.yTruncBits;
  public static readonly xShift: number = b2ParticleSystem.tagBits - b2ParticleSystem.yTruncBits - b2ParticleSystem.xTruncBits;
  public static readonly xScale: number = 1 << b2ParticleSystem.xShift;
  public static readonly xOffset: number = b2ParticleSystem.xScale * (1 << (b2ParticleSystem.xTruncBits - 1));
  public static readonly yMask: number = ((1 << b2ParticleSystem.yTruncBits) - 1) << b2ParticleSystem.yShift;
  public static readonly xMask: number = ~b2ParticleSystem.yMask;

  public static computeTag(x: number, y: number): number {
    ///return ((uint32)(y + yOffset) << yShift) + (uint32)(xScale * x + xOffset);
    return ((((y + b2ParticleSystem.yOffset) >>> 0) << b2ParticleSystem.yShift) + ((b2ParticleSystem.xScale * x + b2ParticleSystem.xOffset) >>> 0)) >>> 0;
  }

  public static computeRelativeTag(tag: number, x: number, y: number): number {
    ///return tag + (y << yShift) + (x << xShift);
    return (tag + (y << b2ParticleSystem.yShift) + (x << b2ParticleSystem.xShift)) >>> 0;
  }

  constructor(def: b2ParticleSystemDef, world: b2World) {
    this.SetStrictContactCheck(def.strictContactCheck);
    this.SetDensity(def.density);
    this.SetGravityScale(def.gravityScale);
    this.SetRadius(def.radius);
    this.SetMaxParticleCount(def.maxCount);
    // DEBUG: b2Assert(def.lifetimeGranularity > 0.0);
    this.m_def = def.Clone();
    this.m_world = world;
    this.SetDestructionByAge(this.m_def.destroyByAge);
  }

  public Drop(): void {
    while (this.m_groupList) {
      this.DestroyParticleGroup(this.m_groupList);
    }

    this.FreeUserOverridableBuffer(this.m_handleIndexBuffer);
    this.FreeUserOverridableBuffer(this.m_flagsBuffer);
    this.FreeUserOverridableBuffer(this.m_lastBodyContactStepBuffer);
    this.FreeUserOverridableBuffer(this.m_bodyContactCountBuffer);
    this.FreeUserOverridableBuffer(this.m_consecutiveContactStepsBuffer);
    this.FreeUserOverridableBuffer(this.m_positionBuffer);
    this.FreeUserOverridableBuffer(this.m_velocityBuffer);
    this.FreeUserOverridableBuffer(this.m_colorBuffer);
    this.FreeUserOverridableBuffer(this.m_userDataBuffer);
    this.FreeUserOverridableBuffer(this.m_expirationTimeBuffer);
    this.FreeUserOverridableBuffer(this.m_indexByExpirationTimeBuffer);
    this.FreeBuffer(this.m_forceBuffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_weightBuffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_staticPressureBuffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_accumulationBuffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_accumulation2Buffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_depthBuffer, this.m_internalAllocatedCapacity);
    this.FreeBuffer(this.m_groupBuffer, this.m_internalAllocatedCapacity);
  }

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
  public CreateParticle(def: b2IParticleDef): number {
    if (this.m_world.IsLocked()) { throw new Error(); }

    if (this.m_count >= this.m_internalAllocatedCapacity) {
      // Double the particle capacity.
      const capacity = this.m_count ? 2 * this.m_count : b2_minParticleSystemBufferCapacity;
      this.ReallocateInternalAllocatedBuffers(capacity);
    }
    if (this.m_count >= this.m_internalAllocatedCapacity) {
      // If the oldest particle should be destroyed...
      if (this.m_def.destroyByAge) {
        this.DestroyOldestParticle(0, false);
        // Need to destroy this particle *now* so that it's possible to
        // create a new particle.
        this.SolveZombie();
      } else {
        return b2_invalidParticleIndex;
      }
    }
    const index = this.m_count++;
    this.m_flagsBuffer.data[index] = 0;
    if (this.m_lastBodyContactStepBuffer.data) {
      this.m_lastBodyContactStepBuffer.data[index] = 0;
    }
    if (this.m_bodyContactCountBuffer.data) {
      this.m_bodyContactCountBuffer.data[index] = 0;
    }
    if (this.m_consecutiveContactStepsBuffer.data) {
      this.m_consecutiveContactStepsBuffer.data[index] = 0;
    }
    this.m_positionBuffer.data[index] = (this.m_positionBuffer.data[index] || new b2Vec2()).Copy(b2Maybe(def.position, b2Vec2.ZERO));
    this.m_velocityBuffer.data[index] = (this.m_velocityBuffer.data[index] || new b2Vec2()).Copy(b2Maybe(def.velocity, b2Vec2.ZERO));
    this.m_weightBuffer[index] = 0;
    this.m_forceBuffer[index] = (this.m_forceBuffer[index] || new b2Vec2()).SetZero();
    if (this.m_staticPressureBuffer) {
      this.m_staticPressureBuffer[index] = 0;
    }
    if (this.m_depthBuffer) {
      this.m_depthBuffer[index] = 0;
    }
    const color: b2Color = new b2Color().Copy(b2Maybe(def.color, b2Color.ZERO));
    if (this.m_colorBuffer.data || !color.IsZero()) {
      this.m_colorBuffer.data = this.RequestBuffer(this.m_colorBuffer.data);
      this.m_colorBuffer.data[index] = (this.m_colorBuffer.data[index] || new b2Color()).Copy(color);
    }
    if (this.m_userDataBuffer.data || def.userData) {
      this.m_userDataBuffer.data = this.RequestBuffer(this.m_userDataBuffer.data);
      this.m_userDataBuffer.data[index] = def.userData;
    }
    if (this.m_handleIndexBuffer.data) {
      this.m_handleIndexBuffer.data[index] = null;
    }
    ///Proxy& proxy = m_proxyBuffer.Append();
    const proxy = this.m_proxyBuffer.data[this.m_proxyBuffer.Append()];

    // If particle lifetimes are enabled or the lifetime is set in the particle
    // definition, initialize the lifetime.
    const lifetime = b2Maybe(def.lifetime, 0.0);
    const finiteLifetime = lifetime > 0.0;
    if (this.m_expirationTimeBuffer.data || finiteLifetime) {
      this.SetParticleLifetime(index, finiteLifetime ? lifetime :
        this.ExpirationTimeToLifetime(-this.GetQuantizedTimeElapsed()));
      // Add a reference to the newly added particle to the end of the
      // queue.
      this.m_indexByExpirationTimeBuffer.data[index] = index;
    }

    proxy.index = index;
    const group = b2Maybe(def.group, null);
    this.m_groupBuffer[index] = group;
    if (group) {
      if (group.m_firstIndex < group.m_lastIndex) {
        // Move particles in the group just before the new particle.
        this.RotateBuffer(group.m_firstIndex, group.m_lastIndex, index);
        // DEBUG: b2Assert(group.m_lastIndex === index);
        // Update the index range of the group to contain the new particle.
        group.m_lastIndex = index + 1;
      } else {
        // If the group is empty, reset the index range to contain only the
        // new particle.
        group.m_firstIndex = index;
        group.m_lastIndex = index + 1;
      }
    }
    this.SetParticleFlags(index, b2Maybe(def.flags, 0));
    return index;
  }

  /**
   * Retrieve a handle to the particle at the specified index.
   *
   * Please see #b2ParticleHandle for why you might want a handle.
   */
  public GetParticleHandleFromIndex(index: number): b2ParticleHandle {
    // DEBUG: b2Assert(index >= 0 && index < this.GetParticleCount() && index !== b2_invalidParticleIndex);
    this.m_handleIndexBuffer.data = this.RequestBuffer(this.m_handleIndexBuffer.data);
    let handle = this.m_handleIndexBuffer.data[index];
    if (handle) {
      return handle;
    }
    // Create a handle.
    ///handle = m_handleAllocator.Allocate();
    handle = new b2ParticleHandle();
    // DEBUG: b2Assert(handle !== null);
    handle.SetIndex(index);
    this.m_handleIndexBuffer.data[index] = handle;
    return handle;
  }

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
  public DestroyParticle(index: number, callDestructionListener: boolean = false): void {
    let flags = b2ParticleFlag.b2_zombieParticle;
    if (callDestructionListener) {
      flags |= b2ParticleFlag.b2_destructionListenerParticle;
    }
    this.SetParticleFlags(index, this.m_flagsBuffer.data[index] | flags);
  }

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
  public DestroyOldestParticle(index: number, callDestructionListener: boolean = false): void {
    const particleCount = this.GetParticleCount();
    // DEBUG: b2Assert(index >= 0 && index < particleCount);
    // Make sure particle lifetime tracking is enabled.
    // DEBUG: b2Assert(this.m_indexByExpirationTimeBuffer.data !== null);
    // Destroy the oldest particle (preferring to destroy finite
    // lifetime particles first) to free a slot in the buffer.
    const oldestFiniteLifetimeParticle =
      this.m_indexByExpirationTimeBuffer.data[particleCount - (index + 1)];
    const oldestInfiniteLifetimeParticle =
      this.m_indexByExpirationTimeBuffer.data[index];
    this.DestroyParticle(
      this.m_expirationTimeBuffer.data[oldestFiniteLifetimeParticle] > 0.0 ?
      oldestFiniteLifetimeParticle : oldestInfiniteLifetimeParticle,
      callDestructionListener);
  }

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
  public DestroyParticlesInShape(shape: b2Shape, xf: b2Transform, callDestructionListener: boolean = false): number {
    const s_aabb = b2ParticleSystem.DestroyParticlesInShape_s_aabb;
    if (this.m_world.IsLocked()) { throw new Error(); }

    const callback = new b2ParticleSystem_DestroyParticlesInShapeCallback(this, shape, xf, callDestructionListener);

    const aabb = s_aabb;
    shape.ComputeAABB(aabb, xf, 0);
    this.m_world.QueryAABB(callback, aabb);
    return callback.Destroyed();
  }
  public static readonly DestroyParticlesInShape_s_aabb = new b2AABB();

  /**
   * Create a particle group whose properties have been defined.
   *
   * No reference to the definition is retained.
   *
   * warning: This function is locked during callbacks.
   */
  public CreateParticleGroup(groupDef: b2IParticleGroupDef): b2ParticleGroup {
    const s_transform = b2ParticleSystem.CreateParticleGroup_s_transform;

    if (this.m_world.IsLocked()) { throw new Error(); }

    const transform = s_transform;
    transform.SetPositionAngle(b2Maybe(groupDef.position, b2Vec2.ZERO), b2Maybe(groupDef.angle, 0));
    const firstIndex = this.m_count;
    if (groupDef.shape) {
      this.CreateParticlesWithShapeForGroup(groupDef.shape, groupDef, transform);
    }
    if (groupDef.shapes) {
      this.CreateParticlesWithShapesForGroup(groupDef.shapes, b2Maybe(groupDef.shapeCount, groupDef.shapes.length), groupDef, transform);
    }
    if (groupDef.positionData) {
      const count = b2Maybe(groupDef.particleCount, groupDef.positionData.length);
      for (let i = 0; i < count; i++) {
        const p = groupDef.positionData[i];
        this.CreateParticleForGroup(groupDef, transform, p);
      }
    }
    const lastIndex = this.m_count;

    let group = new b2ParticleGroup(this);
    group.m_firstIndex = firstIndex;
    group.m_lastIndex = lastIndex;
    group.m_strength = b2Maybe(groupDef.strength, 1);
    group.m_userData = groupDef.userData;
    group.m_transform.Copy(transform);
    group.m_prev = null;
    group.m_next = this.m_groupList;
    if (this.m_groupList) {
      this.m_groupList.m_prev = group;
    }
    this.m_groupList = group;
    ++this.m_groupCount;
    for (let i = firstIndex; i < lastIndex; i++) {
      this.m_groupBuffer[i] = group;
    }
    this.SetGroupFlags(group, b2Maybe(groupDef.groupFlags, 0));

    // Create pairs and triads between particles in the group.
    const filter = new b2ParticleSystem_ConnectionFilter();
    this.UpdateContacts(true);
    this.UpdatePairsAndTriads(firstIndex, lastIndex, filter);

    if (groupDef.group) {
      this.JoinParticleGroups(groupDef.group, group);
      group = groupDef.group;
    }

    return group;
  }
  public static readonly CreateParticleGroup_s_transform = new b2Transform();

  /**
   * Join two particle groups.
   *
   * warning: This function is locked during callbacks.
   *
   * @param groupA the first group. Expands to encompass the second group.
   * @param groupB the second group. It is destroyed.
   */
  public JoinParticleGroups(groupA: b2ParticleGroup, groupB: b2ParticleGroup): void {
    if (this.m_world.IsLocked()) { throw new Error(); }

    // DEBUG: b2Assert(groupA !== groupB);
    this.RotateBuffer(groupB.m_firstIndex, groupB.m_lastIndex, this.m_count);
    // DEBUG: b2Assert(groupB.m_lastIndex === this.m_count);
    this.RotateBuffer(groupA.m_firstIndex, groupA.m_lastIndex, groupB.m_firstIndex);
    // DEBUG: b2Assert(groupA.m_lastIndex === groupB.m_firstIndex);

    // Create pairs and triads connecting groupA and groupB.
    const filter = new b2ParticleSystem_JoinParticleGroupsFilter(groupB.m_firstIndex);
    this.UpdateContacts(true);
    this.UpdatePairsAndTriads(groupA.m_firstIndex, groupB.m_lastIndex, filter);

    for (let i = groupB.m_firstIndex; i < groupB.m_lastIndex; i++) {
      this.m_groupBuffer[i] = groupA;
    }
    const groupFlags = groupA.m_groupFlags | groupB.m_groupFlags;
    this.SetGroupFlags(groupA, groupFlags);
    groupA.m_lastIndex = groupB.m_lastIndex;
    groupB.m_firstIndex = groupB.m_lastIndex;
    this.DestroyParticleGroup(groupB);
  }

  /**
   * Split particle group into multiple disconnected groups.
   *
   * warning: This function is locked during callbacks.
   *
   * @param group the group to be split.
   */
  public SplitParticleGroup(group: b2ParticleGroup): void {
    this.UpdateContacts(true);
    const particleCount = group.GetParticleCount();
    // We create several linked lists. Each list represents a set of connected particles.
    const nodeBuffer: b2ParticleSystem_ParticleListNode[] = b2MakeArray(particleCount, (index: number) => new b2ParticleSystem_ParticleListNode());
    b2ParticleSystem.InitializeParticleLists(group, nodeBuffer);
    this.MergeParticleListsInContact(group, nodeBuffer);
    const survivingList = b2ParticleSystem.FindLongestParticleList(group, nodeBuffer);
    this.MergeZombieParticleListNodes(group, nodeBuffer, survivingList);
    this.CreateParticleGroupsFromParticleList(group, nodeBuffer, survivingList);
    this.UpdatePairsAndTriadsWithParticleList(group, nodeBuffer);
  }

  /**
   * Get the world particle group list. With the returned group,
   * use b2ParticleGroup::GetNext to get the next group in the
   * world list.
   *
   * A null group indicates the end of the list.
   *
   * @return the head of the world particle group list.
   */
  public GetParticleGroupList(): b2ParticleGroup | null {
    return this.m_groupList;
  }

  /**
   * Get the number of particle groups.
   */
  public GetParticleGroupCount(): number {
    return this.m_groupCount;
  }

  /**
   * Get the number of particles.
   */
  public GetParticleCount(): number {
    return this.m_count;
  }

  /**
   * Get the maximum number of particles.
   */
  public GetMaxParticleCount(): number {
    return this.m_def.maxCount;
  }

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
  public SetMaxParticleCount(count: number): void {
    // DEBUG: b2Assert(this.m_count <= count);
    this.m_def.maxCount = count;
  }

  /**
   * Get all existing particle flags.
   */
  public GetAllParticleFlags(): b2ParticleFlag {
    return this.m_allParticleFlags;
  }

  /**
   * Get all existing particle group flags.
   */
  public GetAllGroupFlags(): b2ParticleGroupFlag {
    return this.m_allGroupFlags;
  }

  /**
   * Pause or unpause the particle system. When paused,
   * b2World::Step() skips over this particle system. All
   * b2ParticleSystem function calls still work.
   *
   * @param paused paused is true to pause, false to un-pause.
   */
  public SetPaused(paused: boolean): void {
    this.m_paused = paused;
  }

  /**
   * Initially, true, then, the last value passed into
   * SetPaused().
   *
   * @return true if the particle system is being updated in b2World::Step().
   */
  public GetPaused(): boolean {
    return this.m_paused;
  }

  /**
   * Change the particle density.
   *
   * Particle density affects the mass of the particles, which in
   * turn affects how the particles interact with b2Bodies. Note
   * that the density does not affect how the particles interact
   * with each other.
   */
  public SetDensity(density: number): void {
    this.m_def.density = density;
    this.m_inverseDensity = 1 / this.m_def.density;
  }

  /**
   * Get the particle density.
   */
  public GetDensity(): number {
    return this.m_def.density;
  }

  /**
   * Change the particle gravity scale. Adjusts the effect of the
   * global gravity vector on particles.
   */
  public SetGravityScale(gravityScale: number): void {
    this.m_def.gravityScale = gravityScale;
  }

  /**
   * Get the particle gravity scale.
   */
  public GetGravityScale(): number {
    return this.m_def.gravityScale;
  }

  /**
   * Damping is used to reduce the velocity of particles. The
   * damping parameter can be larger than 1.0f but the damping
   * effect becomes sensitive to the time step when the damping
   * parameter is large.
   */
  public SetDamping(damping: number): void {
    this.m_def.dampingStrength = damping;
  }

  /**
   * Get damping for particles
   */
  public GetDamping(): number {
    return this.m_def.dampingStrength;
  }

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
  public SetStaticPressureIterations(iterations: number): void {
    this.m_def.staticPressureIterations = iterations;
  }

  /**
   * Get the number of iterations for static pressure of
   * particles.
   */
  public GetStaticPressureIterations(): number {
    return this.m_def.staticPressureIterations;
  }

  /**
   * Change the particle radius.
   *
   * You should set this only once, on world start.
   * If you change the radius during execution, existing particles
   * may explode, shrink, or behave unexpectedly.
   */
  public SetRadius(radius: number): void {
    this.m_particleDiameter = 2 * radius;
    this.m_squaredDiameter = this.m_particleDiameter * this.m_particleDiameter;
    this.m_inverseDiameter = 1 / this.m_particleDiameter;
  }

  /**
   * Get the particle radius.
   */
  public GetRadius(): number {
    return this.m_particleDiameter / 2;
  }

  /**
   * Get the position of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle positions array.
   */
  public GetPositionBuffer(): b2Vec2[] {
    return this.m_positionBuffer.data;
  }

  /**
   * Get the velocity of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle velocities array.
   */
  public GetVelocityBuffer(): b2Vec2[] {
    return this.m_velocityBuffer.data;
  }

  /**
   * Get the color of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle colors array.
   */
  public GetColorBuffer(): b2Color[] {
    this.m_colorBuffer.data = this.RequestBuffer(this.m_colorBuffer.data);
    return this.m_colorBuffer.data;
  }

  /**
   * Get the particle-group of each particle.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle group array.
   */
  public GetGroupBuffer(): Array<b2ParticleGroup | null> {
    return this.m_groupBuffer;
  }

  /**
   * Get the weight of each particle
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle positions array.
   */
  public GetWeightBuffer(): number[] {
    return this.m_weightBuffer;
  }

  /**
   * Get the user-specified data of each particle.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle user-data array.
   */
  public GetUserDataBuffer<T>(): T[] {
    this.m_userDataBuffer.data = this.RequestBuffer(this.m_userDataBuffer.data);
    return this.m_userDataBuffer.data;
  }

  /**
   * Get the flags for each particle. See the b2ParticleFlag enum.
   *
   * Array is length GetParticleCount()
   *
   * @return the pointer to the head of the particle-flags array.
   */
  public GetFlagsBuffer(): b2ParticleFlag[] {
    return this.m_flagsBuffer.data;
  }

  /**
   * Set flags for a particle. See the b2ParticleFlag enum.
   */
  public SetParticleFlags(index: number, newFlags: b2ParticleFlag): void {
    const oldFlags = this.m_flagsBuffer.data[index];
    if (oldFlags & ~newFlags) {
      // If any flags might be removed
      this.m_needsUpdateAllParticleFlags = true;
    }
    if (~this.m_allParticleFlags & newFlags) {
      // If any flags were added
      if (newFlags & b2ParticleFlag.b2_tensileParticle) {
        this.m_accumulation2Buffer = this.RequestBuffer(this.m_accumulation2Buffer);
      }
      if (newFlags & b2ParticleFlag.b2_colorMixingParticle) {
        this.m_colorBuffer.data = this.RequestBuffer(this.m_colorBuffer.data);
      }
      this.m_allParticleFlags |= newFlags;
    }
    this.m_flagsBuffer.data[index] = newFlags;
  }

  /**
   * Get flags for a particle. See the b2ParticleFlag enum.
   */
  public GetParticleFlags(index: number): b2ParticleFlag {
    return this.m_flagsBuffer.data[index];
  }

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
  public SetFlagsBuffer(buffer: b2ParticleFlag[]): void {
    this.SetUserOverridableBuffer(this.m_flagsBuffer, buffer);
  }

  public SetPositionBuffer(buffer: b2Vec2[] | Float32Array): void {
    if (buffer instanceof Float32Array) {
      if (buffer.length % 2 !== 0) { throw new Error(); }
      const count: number = buffer.length / 2;
      const array: b2TypedVec2[] = new Array(count);
      for (let i = 0; i < count; ++i) {
        array[i] = new b2TypedVec2(buffer.subarray(i * 2, i * 2 + 2));
      }
      buffer = array;
    }
    this.SetUserOverridableBuffer(this.m_positionBuffer, buffer);
  }

  public SetVelocityBuffer(buffer: b2TypedVec2[] | Float32Array): void {
    if (buffer instanceof Float32Array) {
      if (buffer.length % 2 !== 0) { throw new Error(); }
      const count: number = buffer.length / 2;
      const array: b2TypedVec2[] = new Array(count);
      for (let i = 0; i < count; ++i) {
        array[i] = new b2TypedVec2(buffer.subarray(i * 2, i * 2 + 2));
      }
      buffer = array;
    }
    this.SetUserOverridableBuffer(this.m_velocityBuffer, buffer);
  }

  public SetColorBuffer(buffer: b2Color[] | Float32Array): void {
    if (buffer instanceof Float32Array) {
      if (buffer.length % 4 !== 0) { throw new Error(); }
      const count: number = buffer.length / 4;
      const array: b2Color[] = new Array(count);
      for (let i = 0; i < count; ++i) {
        array[i] = new b2TypedColor(buffer.subarray(i * 4, i * 4 + 4));
      }
      buffer = array;
    }
    this.SetUserOverridableBuffer(this.m_colorBuffer, buffer);
  }

  public SetUserDataBuffer<T>(buffer: T[]): void {
    this.SetUserOverridableBuffer(this.m_userDataBuffer, buffer);
  }

  /**
   * Get contacts between particles
   * Contact data can be used for many reasons, for example to
   * trigger rendering or audio effects.
   */
  public GetContacts(): b2ParticleContact[] {
    return this.m_contactBuffer.data;
  }

  public GetContactCount(): number {
    return this.m_contactBuffer.count;
  }

  /**
   * Get contacts between particles and bodies
   *
   * Contact data can be used for many reasons, for example to
   * trigger rendering or audio effects.
   */
  public GetBodyContacts(): b2ParticleBodyContact[] {
    return this.m_bodyContactBuffer.data;
  }

  public GetBodyContactCount(): number {
    return this.m_bodyContactBuffer.count;
  }

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
  public GetPairs(): b2ParticlePair[] {
    return this.m_pairBuffer.data;
  }

  public GetPairCount(): number {
    return this.m_pairBuffer.count;
  }

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
  public GetTriads(): b2ParticleTriad[] {
    return this.m_triadBuffer.data;
  }

  public GetTriadCount(): number {
    return this.m_triadBuffer.count;
  }

  /**
   * Set an optional threshold for the maximum number of
   * consecutive particle iterations that a particle may contact
   * multiple bodies before it is considered a candidate for being
   * "stuck". Setting to zero or less disables.
   */
  public SetStuckThreshold(steps: number): void {
    this.m_stuckThreshold = steps;

    if (steps > 0) {
      this.m_lastBodyContactStepBuffer.data = this.RequestBuffer(this.m_lastBodyContactStepBuffer.data);
      this.m_bodyContactCountBuffer.data = this.RequestBuffer(this.m_bodyContactCountBuffer.data);
      this.m_consecutiveContactStepsBuffer.data = this.RequestBuffer(this.m_consecutiveContactStepsBuffer.data);
    }
  }

  /**
   * Get potentially stuck particles from the last step; the user
   * must decide if they are stuck or not, and if so, delete or
   * move them
   */
  public GetStuckCandidates(): number[] {
    ///return m_stuckParticleBuffer.Data();
    return this.m_stuckParticleBuffer.Data();
  }

  /**
   * Get the number of stuck particle candidates from the last
   * step.
   */
  public GetStuckCandidateCount(): number {
    ///return m_stuckParticleBuffer.GetCount();
    return this.m_stuckParticleBuffer.GetCount();
  }

  /**
   * Compute the kinetic energy that can be lost by damping force
   */
  public ComputeCollisionEnergy(): number {
    const s_v = b2ParticleSystem.ComputeCollisionEnergy_s_v;
    const vel_data = this.m_velocityBuffer.data;
    let sum_v2 = 0;
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const n = contact.normal;
      ///b2Vec2 v = m_velocityBuffer.data[b] - m_velocityBuffer.data[a];
      const v = b2Vec2.SubVV(vel_data[b], vel_data[a], s_v);
      const vn = b2Vec2.DotVV(v, n);
      if (vn < 0) {
        sum_v2 += vn * vn;
      }
    }
    return 0.5 * this.GetParticleMass() * sum_v2;
  }
  public static readonly ComputeCollisionEnergy_s_v = new b2Vec2();

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
  public SetStrictContactCheck(enabled: boolean): void {
    this.m_def.strictContactCheck = enabled;
  }

  /**
   * Get the status of the strict contact check.
   */
  public GetStrictContactCheck(): boolean {
    return this.m_def.strictContactCheck;
  }

  /**
   * Set the lifetime (in seconds) of a particle relative to the
   * current time.  A lifetime of less than or equal to 0.0f
   * results in the particle living forever until it's manually
   * destroyed by the application.
   */
  public SetParticleLifetime(index: number, lifetime: number): void {
    // DEBUG: b2Assert(this.ValidateParticleIndex(index));
    const initializeExpirationTimes = this.m_indexByExpirationTimeBuffer.data === null;
    this.m_expirationTimeBuffer.data = this.RequestBuffer(this.m_expirationTimeBuffer.data);
    this.m_indexByExpirationTimeBuffer.data = this.RequestBuffer(this.m_indexByExpirationTimeBuffer.data);

    // Initialize the inverse mapping buffer.
    if (initializeExpirationTimes) {
      const particleCount = this.GetParticleCount();
      for (let i = 0; i < particleCount; ++i) {
        this.m_indexByExpirationTimeBuffer.data[i] = i;
      }
    }
    ///const int32 quantizedLifetime = (int32)(lifetime / m_def.lifetimeGranularity);
    const quantizedLifetime = lifetime / this.m_def.lifetimeGranularity;
    // Use a negative lifetime so that it's possible to track which
    // of the infinite lifetime particles are older.
    const newExpirationTime = quantizedLifetime > 0.0 ? this.GetQuantizedTimeElapsed() + quantizedLifetime : quantizedLifetime;
    if (newExpirationTime !== this.m_expirationTimeBuffer.data[index]) {
      this.m_expirationTimeBuffer.data[index] = newExpirationTime;
      this.m_expirationTimeBufferRequiresSorting = true;
    }
  }

  /**
   * Get the lifetime (in seconds) of a particle relative to the
   * current time.  A value > 0.0f is returned if the particle is
   * scheduled to be destroyed in the future, values <= 0.0f
   * indicate the particle has an infinite lifetime.
   */
  public GetParticleLifetime(index: number): number {
    // DEBUG: b2Assert(this.ValidateParticleIndex(index));
    return this.ExpirationTimeToLifetime(this.GetExpirationTimeBuffer()[index]);
  }

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
  public SetDestructionByAge(enable: boolean): void {
    if (enable) {
      this.GetExpirationTimeBuffer();
    }
    this.m_def.destroyByAge = enable;
  }

  /**
   * Get whether the oldest particle will be destroyed in
   * CreateParticle() when the maximum number of particles are
   * present in the system.
   */
  public GetDestructionByAge(): boolean {
    return this.m_def.destroyByAge;
  }

  /**
   * Get the array of particle expiration times indexed by
   * particle index.
   *
   * GetParticleCount() items are in the returned array.
   */
  public GetExpirationTimeBuffer(): number[] {
    this.m_expirationTimeBuffer.data = this.RequestBuffer(this.m_expirationTimeBuffer.data);
    return this.m_expirationTimeBuffer.data;
  }

  /**
   * Convert a expiration time value in returned by
   * GetExpirationTimeBuffer() to a time in seconds relative to
   * the current simulation time.
   */
  public ExpirationTimeToLifetime(expirationTime: number): number {
    return (expirationTime > 0 ?
      expirationTime - this.GetQuantizedTimeElapsed() :
      expirationTime) * this.m_def.lifetimeGranularity;
  }

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
  public GetIndexByExpirationTimeBuffer(): number[] {
    // If particles are present, initialize / reinitialize the lifetime buffer.
    if (this.GetParticleCount()) {
      this.SetParticleLifetime(0, this.GetParticleLifetime(0));
    } else {
      this.m_indexByExpirationTimeBuffer.data = this.RequestBuffer(this.m_indexByExpirationTimeBuffer.data);
    }
    return this.m_indexByExpirationTimeBuffer.data;
  }

  /**
   * Apply an impulse to one particle. This immediately modifies
   * the velocity. Similar to b2Body::ApplyLinearImpulse.
   *
   * @param index the particle that will be modified.
   * @param impulse impulse the world impulse vector, usually in N-seconds or kg-m/s.
   */
  public ParticleApplyLinearImpulse(index: number, impulse: XY): void {
    this.ApplyLinearImpulse(index, index + 1, impulse);
  }

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
  public ApplyLinearImpulse(firstIndex: number, lastIndex: number, impulse: XY): void {
    const vel_data = this.m_velocityBuffer.data;
    const numParticles = (lastIndex - firstIndex);
    const totalMass = numParticles * this.GetParticleMass();
    ///const b2Vec2 velocityDelta = impulse / totalMass;
    const velocityDelta = new b2Vec2().Copy(impulse).SelfMul(1 / totalMass);
    for (let i = firstIndex; i < lastIndex; i++) {
      ///m_velocityBuffer.data[i] += velocityDelta;
      vel_data[i].SelfAdd(velocityDelta);
    }
  }

  public static IsSignificantForce(force: XY): boolean {
    return force.x !== 0 || force.y !== 0;
  }

  /**
   * Apply a force to the center of a particle.
   *
   * @param index the particle that will be modified.
   * @param force the world force vector, usually in Newtons (N).
   */
  public ParticleApplyForce(index: number, force: XY): void {
    if (b2ParticleSystem.IsSignificantForce(force) &&
      this.ForceCanBeApplied(this.m_flagsBuffer.data[index])) {
      this.PrepareForceBuffer();
      ///m_forceBuffer[index] += force;
      this.m_forceBuffer[index].SelfAdd(force);
    }
  }

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
  public ApplyForce(firstIndex: number, lastIndex: number, force: XY): void {
    // Ensure we're not trying to apply force to particles that can't move,
    // such as wall particles.
    // DEBUG: let flags = 0;
    // DEBUG: for (let i = firstIndex; i < lastIndex; i++) {
    // DEBUG:   flags |= this.m_flagsBuffer.data[i];
    // DEBUG: }
    // DEBUG: b2Assert(this.ForceCanBeApplied(flags));

    // Early out if force does nothing (optimization).
    ///const b2Vec2 distributedForce = force / (float32)(lastIndex - firstIndex);
    const distributedForce =  new b2Vec2().Copy(force).SelfMul(1 / (lastIndex - firstIndex));
    if (b2ParticleSystem.IsSignificantForce(distributedForce)) {
      this.PrepareForceBuffer();

      // Distribute the force over all the particles.
      for (let i = firstIndex; i < lastIndex; i++) {
        ///m_forceBuffer[i] += distributedForce;
        this.m_forceBuffer[i].SelfAdd(distributedForce);
      }
    }
  }

  /**
   * Get the next particle-system in the world's particle-system
   * list.
   */
  public GetNext(): b2ParticleSystem | null {
    return this.m_next;
  }

  /**
   * Query the particle system for all particles that potentially
   * overlap the provided AABB.
   * b2QueryCallback::ShouldQueryParticleSystem is ignored.
   *
   * @param callback a user implemented callback class.
   * @param aabb the query box.
   */
  public QueryAABB(callback: b2QueryCallback, aabb: b2AABB): void {
    if (this.m_proxyBuffer.count === 0) {
      return;
    }
    const beginProxy = 0;
    const endProxy = this.m_proxyBuffer.count;
    const firstProxy = std_lower_bound(this.m_proxyBuffer.data, beginProxy, endProxy,
      b2ParticleSystem.computeTag(
        this.m_inverseDiameter * aabb.lowerBound.x,
        this.m_inverseDiameter * aabb.lowerBound.y),
      b2ParticleSystem_Proxy.CompareProxyTag);
    const lastProxy = std_upper_bound(this.m_proxyBuffer.data, firstProxy, endProxy,
      b2ParticleSystem.computeTag(
        this.m_inverseDiameter * aabb.upperBound.x,
        this.m_inverseDiameter * aabb.upperBound.y),
      b2ParticleSystem_Proxy.CompareTagProxy);
    const pos_data = this.m_positionBuffer.data;
    for (let k = firstProxy; k < lastProxy; ++k) {
      const proxy = this.m_proxyBuffer.data[k];
      const i = proxy.index;
      const p = pos_data[i];
      if (aabb.lowerBound.x < p.x && p.x < aabb.upperBound.x &&
        aabb.lowerBound.y < p.y && p.y < aabb.upperBound.y) {
        if (!callback.ReportParticle(this, i)) {
          break;
        }
      }
    }
  }

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
  public QueryShapeAABB(callback: b2QueryCallback, shape: b2Shape, xf: b2Transform, childIndex: number = 0): void {
    const s_aabb = b2ParticleSystem.QueryShapeAABB_s_aabb;
    const aabb = s_aabb;
    shape.ComputeAABB(aabb, xf, childIndex);
    this.QueryAABB(callback, aabb);
  }
  public static readonly QueryShapeAABB_s_aabb = new b2AABB();

  public QueryPointAABB(callback: b2QueryCallback, point: XY, slop: number = b2_linearSlop): void {
    const s_aabb = b2ParticleSystem.QueryPointAABB_s_aabb;
    const aabb = s_aabb;
    aabb.lowerBound.Set(point.x - slop, point.y - slop);
    aabb.upperBound.Set(point.x + slop, point.y + slop);
    this.QueryAABB(callback, aabb);
  }
  public static readonly QueryPointAABB_s_aabb = new b2AABB();

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
  public RayCast(callback: b2RayCastCallback, point1: XY, point2: XY): void {
    const s_aabb = b2ParticleSystem.RayCast_s_aabb;
    const s_p = b2ParticleSystem.RayCast_s_p;
    const s_v = b2ParticleSystem.RayCast_s_v;
    const s_n = b2ParticleSystem.RayCast_s_n;
    const s_point = b2ParticleSystem.RayCast_s_point;
    if (this.m_proxyBuffer.count === 0) {
      return;
    }
    const pos_data = this.m_positionBuffer.data;
    const aabb = s_aabb;
    b2Vec2.MinV(point1, point2, aabb.lowerBound);
    b2Vec2.MaxV(point1, point2, aabb.upperBound);
    let fraction = 1;
    // solving the following equation:
    // ((1-t)*point1+t*point2-position)^2=diameter^2
    // where t is a potential fraction
    ///b2Vec2 v = point2 - point1;
    const v = b2Vec2.SubVV(point2, point1, s_v);
    const v2 = b2Vec2.DotVV(v, v);
    const enumerator = this.GetInsideBoundsEnumerator(aabb);

    let i: number;
    while ((i = enumerator.GetNext()) >= 0) {
      ///b2Vec2 p = point1 - m_positionBuffer.data[i];
      const p = b2Vec2.SubVV(point1, pos_data[i], s_p);
      const pv = b2Vec2.DotVV(p, v);
      const p2 = b2Vec2.DotVV(p, p);
      const determinant = pv * pv - v2 * (p2 - this.m_squaredDiameter);
      if (determinant >= 0) {
        const sqrtDeterminant = b2Sqrt(determinant);
        // find a solution between 0 and fraction
        let t = (-pv - sqrtDeterminant) / v2;
        if (t > fraction) {
          continue;
        }
        if (t < 0) {
          t = (-pv + sqrtDeterminant) / v2;
          if (t < 0 || t > fraction) {
            continue;
          }
        }
        ///b2Vec2 n = p + t * v;
        const n = b2Vec2.AddVMulSV(p, t, v, s_n);
        n.Normalize();
        ///float32 f = callback.ReportParticle(this, i, point1 + t * v, n, t);
        const f = callback.ReportParticle(this, i, b2Vec2.AddVMulSV(point1, t, v, s_point), n, t);
        fraction = b2Min(fraction, f);
        if (fraction <= 0) {
          break;
        }
      }
    }
  }
  public static readonly RayCast_s_aabb = new b2AABB();
  public static readonly RayCast_s_p = new b2Vec2();
  public static readonly RayCast_s_v = new b2Vec2();
  public static readonly RayCast_s_n = new b2Vec2();
  public static readonly RayCast_s_point = new b2Vec2();

  /**
   * Compute the axis-aligned bounding box for all particles
   * contained within this particle system.
   * @param aabb Returns the axis-aligned bounding box of the system.
   */
  public ComputeAABB(aabb: b2AABB): void {
    const particleCount = this.GetParticleCount();
    // DEBUG: b2Assert(aabb !== null);
    aabb.lowerBound.x = +b2_maxFloat;
    aabb.lowerBound.y = +b2_maxFloat;
    aabb.upperBound.x = -b2_maxFloat;
    aabb.upperBound.y = -b2_maxFloat;

    const pos_data = this.m_positionBuffer.data;
    for (let i = 0; i < particleCount; i++) {
      const p = pos_data[i];
      b2Vec2.MinV(aabb.lowerBound, p, aabb.lowerBound);
      b2Vec2.MaxV(aabb.upperBound, p, aabb.upperBound);
    }
    aabb.lowerBound.x -= this.m_particleDiameter;
    aabb.lowerBound.y -= this.m_particleDiameter;
    aabb.upperBound.x += this.m_particleDiameter;
    aabb.upperBound.y += this.m_particleDiameter;
  }

  /**
   * All particle types that require creating pairs
   */
  public static readonly k_pairFlags: number = b2ParticleFlag.b2_springParticle;

  /**
   * All particle types that require creating triads
   */
  public static readonly k_triadFlags = b2ParticleFlag.b2_elasticParticle;

  /**
   * All particle types that do not produce dynamic pressure
   */
  public static readonly k_noPressureFlags = b2ParticleFlag.b2_powderParticle | b2ParticleFlag.b2_tensileParticle;

  /**
   * All particle types that apply extra damping force with bodies
   */
  public static readonly k_extraDampingFlags = b2ParticleFlag.b2_staticPressureParticle;

  public static readonly k_barrierWallFlags = b2ParticleFlag.b2_barrierParticle | b2ParticleFlag.b2_wallParticle;

  public FreeBuffer<T>(b: T[] | null, capacity: number): void {
    if (b === null) {
      return;
    }
    b.length = 0;
  }

  public FreeUserOverridableBuffer<T>(b: b2ParticleSystem_UserOverridableBuffer<T>): void {
    if (b.userSuppliedCapacity === 0) {
      this.FreeBuffer(b.data, this.m_internalAllocatedCapacity);
    }
  }

  /**
   * Reallocate a buffer
   */
  public ReallocateBuffer3<T>(oldBuffer: T[] | null, oldCapacity: number, newCapacity: number): T[] {
    // b2Assert(newCapacity > oldCapacity);
    if (newCapacity <= oldCapacity) { throw new Error(); }
    const newBuffer = (oldBuffer) ? oldBuffer.slice() : [];
    newBuffer.length = newCapacity;
    return newBuffer;
  }

  /**
   * Reallocate a buffer
   */
  public ReallocateBuffer5<T>(buffer: T[] | null, userSuppliedCapacity: number, oldCapacity: number, newCapacity: number, deferred: boolean): T[] {
    // b2Assert(newCapacity > oldCapacity);
    if (newCapacity <= oldCapacity) { throw new Error(); }
    // A 'deferred' buffer is reallocated only if it is not NULL.
    // If 'userSuppliedCapacity' is not zero, buffer is user supplied and must
    // be kept.
    // b2Assert(!userSuppliedCapacity || newCapacity <= userSuppliedCapacity);
    if (!(!userSuppliedCapacity || newCapacity <= userSuppliedCapacity)) { throw new Error(); }
    if ((!deferred || buffer) && !userSuppliedCapacity) {
      buffer = this.ReallocateBuffer3(buffer, oldCapacity, newCapacity);
    }
    return buffer as any; // TODO: fix this
  }

  /**
   * Reallocate a buffer
   */
  public ReallocateBuffer4<T>(buffer: b2ParticleSystem_UserOverridableBuffer<any>, oldCapacity: number, newCapacity: number, deferred: boolean): T[] {
    // DEBUG: b2Assert(newCapacity > oldCapacity);
    return this.ReallocateBuffer5(buffer.data, buffer.userSuppliedCapacity, oldCapacity, newCapacity, deferred);
  }

  public RequestBuffer<T>(buffer: T[] | null): T[] {
    if (!buffer) {
      if (this.m_internalAllocatedCapacity === 0) {
        this.ReallocateInternalAllocatedBuffers(b2_minParticleSystemBufferCapacity);
      }

      buffer = [];
      buffer.length = this.m_internalAllocatedCapacity;
    }
    return buffer;
  }

  /**
   * Reallocate the handle / index map and schedule the allocation
   * of a new pool for handle allocation.
   */
  public ReallocateHandleBuffers(newCapacity: number): void {
    // DEBUG: b2Assert(newCapacity > this.m_internalAllocatedCapacity);
    // Reallocate a new handle / index map buffer, copying old handle pointers
    // is fine since they're kept around.
    this.m_handleIndexBuffer.data = this.ReallocateBuffer4(this.m_handleIndexBuffer, this.m_internalAllocatedCapacity, newCapacity, true);
    // Set the size of the next handle allocation.
    ///this.m_handleAllocator.SetItemsPerSlab(newCapacity - this.m_internalAllocatedCapacity);
  }

  public ReallocateInternalAllocatedBuffers(capacity: number): void {
    function LimitCapacity(capacity: number, maxCount: number): number {
      return maxCount && capacity > maxCount ? maxCount : capacity;
    }

    // Don't increase capacity beyond the smallest user-supplied buffer size.
    capacity = LimitCapacity(capacity, this.m_def.maxCount);
    capacity = LimitCapacity(capacity, this.m_flagsBuffer.userSuppliedCapacity);
    capacity = LimitCapacity(capacity, this.m_positionBuffer.userSuppliedCapacity);
    capacity = LimitCapacity(capacity, this.m_velocityBuffer.userSuppliedCapacity);
    capacity = LimitCapacity(capacity, this.m_colorBuffer.userSuppliedCapacity);
    capacity = LimitCapacity(capacity, this.m_userDataBuffer.userSuppliedCapacity);
    if (this.m_internalAllocatedCapacity < capacity) {
      this.ReallocateHandleBuffers(capacity);
      this.m_flagsBuffer.data = this.ReallocateBuffer4(this.m_flagsBuffer, this.m_internalAllocatedCapacity, capacity, false);

      // Conditionally defer these as they are optional if the feature is
      // not enabled.
      const stuck = this.m_stuckThreshold > 0;
      this.m_lastBodyContactStepBuffer.data = this.ReallocateBuffer4(this.m_lastBodyContactStepBuffer, this.m_internalAllocatedCapacity, capacity, stuck);
      this.m_bodyContactCountBuffer.data = this.ReallocateBuffer4(this.m_bodyContactCountBuffer, this.m_internalAllocatedCapacity, capacity, stuck);
      this.m_consecutiveContactStepsBuffer.data = this.ReallocateBuffer4(this.m_consecutiveContactStepsBuffer, this.m_internalAllocatedCapacity, capacity, stuck);
      this.m_positionBuffer.data = this.ReallocateBuffer4(this.m_positionBuffer, this.m_internalAllocatedCapacity, capacity, false);
      this.m_velocityBuffer.data = this.ReallocateBuffer4(this.m_velocityBuffer, this.m_internalAllocatedCapacity, capacity, false);
      this.m_forceBuffer = this.ReallocateBuffer5(this.m_forceBuffer, 0, this.m_internalAllocatedCapacity, capacity, false);
      this.m_weightBuffer = this.ReallocateBuffer5(this.m_weightBuffer, 0, this.m_internalAllocatedCapacity, capacity, false);
      this.m_staticPressureBuffer = this.ReallocateBuffer5(this.m_staticPressureBuffer, 0, this.m_internalAllocatedCapacity, capacity, true);
      this.m_accumulationBuffer = this.ReallocateBuffer5(this.m_accumulationBuffer, 0, this.m_internalAllocatedCapacity, capacity, false);
      this.m_accumulation2Buffer = this.ReallocateBuffer5(this.m_accumulation2Buffer, 0, this.m_internalAllocatedCapacity, capacity, true);
      this.m_depthBuffer = this.ReallocateBuffer5(this.m_depthBuffer, 0, this.m_internalAllocatedCapacity, capacity, true);
      this.m_colorBuffer.data = this.ReallocateBuffer4(this.m_colorBuffer, this.m_internalAllocatedCapacity, capacity, true);
      this.m_groupBuffer = this.ReallocateBuffer5(this.m_groupBuffer, 0, this.m_internalAllocatedCapacity, capacity, false);
      this.m_userDataBuffer.data = this.ReallocateBuffer4(this.m_userDataBuffer, this.m_internalAllocatedCapacity, capacity, true);
      this.m_expirationTimeBuffer.data = this.ReallocateBuffer4(this.m_expirationTimeBuffer, this.m_internalAllocatedCapacity, capacity, true);
      this.m_indexByExpirationTimeBuffer.data = this.ReallocateBuffer4(this.m_indexByExpirationTimeBuffer, this.m_internalAllocatedCapacity, capacity, false);
      this.m_internalAllocatedCapacity = capacity;
    }
  }

  public CreateParticleForGroup(groupDef: b2IParticleGroupDef, xf: b2Transform, p: XY): void {
    const particleDef = new b2ParticleDef();
    particleDef.flags = b2Maybe(groupDef.flags, 0);
    ///particleDef.position = b2Mul(xf, p);
    b2Transform.MulXV(xf, p, particleDef.position);
    ///particleDef.velocity =
    ///  groupDef.linearVelocity +
    ///  b2Cross(groupDef.angularVelocity,
    ///      particleDef.position - groupDef.position);
    b2Vec2.AddVV(
      b2Maybe(groupDef.linearVelocity, b2Vec2.ZERO),
      b2Vec2.CrossSV(
        b2Maybe(groupDef.angularVelocity, 0),
        b2Vec2.SubVV(
          particleDef.position,
          b2Maybe(groupDef.position, b2Vec2.ZERO),
          b2Vec2.s_t0,
        ),
        b2Vec2.s_t0,
      ),
      particleDef.velocity,
    );
    particleDef.color.Copy(b2Maybe(groupDef.color, b2Color.ZERO));
    particleDef.lifetime = b2Maybe(groupDef.lifetime, 0);
    particleDef.userData = groupDef.userData;
    this.CreateParticle(particleDef);
  }

  public CreateParticlesStrokeShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void {
    const s_edge = b2ParticleSystem.CreateParticlesStrokeShapeForGroup_s_edge;
    const s_d = b2ParticleSystem.CreateParticlesStrokeShapeForGroup_s_d;
    const s_p = b2ParticleSystem.CreateParticlesStrokeShapeForGroup_s_p;
    let stride = b2Maybe(groupDef.stride, 0);
    if (stride === 0) {
      stride = this.GetParticleStride();
    }
    let positionOnEdge = 0;
    const childCount = shape.GetChildCount();
    for (let childIndex = 0; childIndex < childCount; childIndex++) {
      let edge: b2EdgeShape | null = null;
      if (shape.GetType() === b2ShapeType.e_edgeShape) {
        edge = shape as b2EdgeShape;
      } else {
        // DEBUG: b2Assert(shape.GetType() === b2ShapeType.e_chainShape);
        edge = s_edge;
        (shape as b2ChainShape).GetChildEdge(edge, childIndex);
      }
      const d = b2Vec2.SubVV(edge.m_vertex2, edge.m_vertex1, s_d);
      const edgeLength = d.Length();

      while (positionOnEdge < edgeLength) {
        ///b2Vec2 p = edge.m_vertex1 + positionOnEdge / edgeLength * d;
        const p = b2Vec2.AddVMulSV(edge.m_vertex1, positionOnEdge / edgeLength, d, s_p);
        this.CreateParticleForGroup(groupDef, xf, p);
        positionOnEdge += stride;
      }
      positionOnEdge -= edgeLength;
    }
  }
  public static readonly CreateParticlesStrokeShapeForGroup_s_edge = new b2EdgeShape();
  public static readonly CreateParticlesStrokeShapeForGroup_s_d = new b2Vec2();
  public static readonly CreateParticlesStrokeShapeForGroup_s_p = new b2Vec2();

  public CreateParticlesFillShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void {
    const s_aabb = b2ParticleSystem.CreateParticlesFillShapeForGroup_s_aabb;
    const s_p = b2ParticleSystem.CreateParticlesFillShapeForGroup_s_p;
    let stride = b2Maybe(groupDef.stride, 0);
    if (stride === 0) {
      stride = this.GetParticleStride();
    }
    ///b2Transform identity;
    /// identity.SetIdentity();
    const identity = b2Transform.IDENTITY;
    const aabb = s_aabb;
    // DEBUG: b2Assert(shape.GetChildCount() === 1);
    shape.ComputeAABB(aabb, identity, 0);
    for (let y = Math.floor(aabb.lowerBound.y / stride) * stride; y < aabb.upperBound.y; y += stride) {
      for (let x = Math.floor(aabb.lowerBound.x / stride) * stride; x < aabb.upperBound.x; x += stride) {
        const p = s_p.Set(x, y);
        if (shape.TestPoint(identity, p)) {
          this.CreateParticleForGroup(groupDef, xf, p);
        }
      }
    }
  }
  public static readonly CreateParticlesFillShapeForGroup_s_aabb = new b2AABB();
  public static readonly CreateParticlesFillShapeForGroup_s_p = new b2Vec2();

  public CreateParticlesWithShapeForGroup(shape: b2Shape, groupDef: b2IParticleGroupDef, xf: b2Transform): void {
    switch (shape.GetType()) {
      case b2ShapeType.e_edgeShape:
      case b2ShapeType.e_chainShape:
        this.CreateParticlesStrokeShapeForGroup(shape, groupDef, xf);
        break;
      case b2ShapeType.e_polygonShape:
      case b2ShapeType.e_circleShape:
        this.CreateParticlesFillShapeForGroup(shape, groupDef, xf);
        break;
      default:
        // DEBUG: b2Assert(false);
        break;
    }
  }

  public CreateParticlesWithShapesForGroup(shapes: b2Shape[], shapeCount: number, groupDef: b2IParticleGroupDef, xf: b2Transform): void {
    const compositeShape = new b2ParticleSystem_CompositeShape(shapes, shapeCount);
    this.CreateParticlesFillShapeForGroup(compositeShape, groupDef, xf);
  }

  public CloneParticle(oldIndex: number, group: b2ParticleGroup): number {
    const def = new b2ParticleDef();
    def.flags = this.m_flagsBuffer.data[oldIndex];
    def.position.Copy(this.m_positionBuffer.data[oldIndex]);
    def.velocity.Copy(this.m_velocityBuffer.data[oldIndex]);
    if (this.m_colorBuffer.data) {
      def.color.Copy(this.m_colorBuffer.data[oldIndex]);
    }
    if (this.m_userDataBuffer.data) {
      def.userData = this.m_userDataBuffer.data[oldIndex];
    }
    def.group = group;
    const newIndex = this.CreateParticle(def);
    if (this.m_handleIndexBuffer.data) {
      const handle = this.m_handleIndexBuffer.data[oldIndex];
      if (handle) { handle.SetIndex(newIndex); }
      this.m_handleIndexBuffer.data[newIndex] = handle;
      this.m_handleIndexBuffer.data[oldIndex] = null;
    }
    if (this.m_lastBodyContactStepBuffer.data) {
      this.m_lastBodyContactStepBuffer.data[newIndex] =
        this.m_lastBodyContactStepBuffer.data[oldIndex];
    }
    if (this.m_bodyContactCountBuffer.data) {
      this.m_bodyContactCountBuffer.data[newIndex] =
        this.m_bodyContactCountBuffer.data[oldIndex];
    }
    if (this.m_consecutiveContactStepsBuffer.data) {
      this.m_consecutiveContactStepsBuffer.data[newIndex] =
        this.m_consecutiveContactStepsBuffer.data[oldIndex];
    }
    if (this.m_hasForce) {
      this.m_forceBuffer[newIndex].Copy(this.m_forceBuffer[oldIndex]);
    }
    if (this.m_staticPressureBuffer) {
      this.m_staticPressureBuffer[newIndex] = this.m_staticPressureBuffer[oldIndex];
    }
    if (this.m_depthBuffer) {
      this.m_depthBuffer[newIndex] = this.m_depthBuffer[oldIndex];
    }
    if (this.m_expirationTimeBuffer.data) {
      this.m_expirationTimeBuffer.data[newIndex] =
        this.m_expirationTimeBuffer.data[oldIndex];
    }
    return newIndex;
  }

  public DestroyParticlesInGroup(group: b2ParticleGroup, callDestructionListener: boolean = false): void {
    for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
      this.DestroyParticle(i, callDestructionListener);
    }
  }

  public DestroyParticleGroup(group: b2ParticleGroup): void {
    // DEBUG: b2Assert(this.m_groupCount > 0);
    // DEBUG: b2Assert(group !== null);

    if (this.m_world.m_destructionListener) {
      this.m_world.m_destructionListener.SayGoodbyeParticleGroup(group);
    }

    this.SetGroupFlags(group, 0);
    for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
      this.m_groupBuffer[i] = null;
    }

    if (group.m_prev) {
      group.m_prev.m_next = group.m_next;
    }
    if (group.m_next) {
      group.m_next.m_prev = group.m_prev;
    }
    if (group === this.m_groupList) {
      this.m_groupList = group.m_next;
    }

    --this.m_groupCount;
  }

  public static ParticleCanBeConnected(flags: b2ParticleFlag, group: b2ParticleGroup | null): boolean {
    return ((flags & (b2ParticleFlag.b2_wallParticle | b2ParticleFlag.b2_springParticle | b2ParticleFlag.b2_elasticParticle)) !== 0) ||
      ((group !== null) && ((group.GetGroupFlags() & b2ParticleGroupFlag.b2_rigidParticleGroup) !== 0));
  }

  public UpdatePairsAndTriads(firstIndex: number, lastIndex: number, filter: b2ParticleSystem_ConnectionFilter): void {
    const s_dab = b2ParticleSystem.UpdatePairsAndTriads_s_dab;
    const s_dbc = b2ParticleSystem.UpdatePairsAndTriads_s_dbc;
    const s_dca = b2ParticleSystem.UpdatePairsAndTriads_s_dca;
    const pos_data = this.m_positionBuffer.data;
    // Create pairs or triads.
    // All particles in each pair/triad should satisfy the following:
    // * firstIndex <= index < lastIndex
    // * don't have b2_zombieParticle
    // * ParticleCanBeConnected returns true
    // * ShouldCreatePair/ShouldCreateTriad returns true
    // Any particles in each pair/triad should satisfy the following:
    // * filter.IsNeeded returns true
    // * have one of k_pairFlags/k_triadsFlags
    // DEBUG: b2Assert(firstIndex <= lastIndex);
    let particleFlags = 0;
    for (let i = firstIndex; i < lastIndex; i++) {
      particleFlags |= this.m_flagsBuffer.data[i];
    }
    if (particleFlags & b2ParticleSystem.k_pairFlags) {
      for (let k = 0; k < this.m_contactBuffer.count; k++) {
        const contact = this.m_contactBuffer.data[k];
        const a = contact.indexA;
        const b = contact.indexB;
        const af = this.m_flagsBuffer.data[a];
        const bf = this.m_flagsBuffer.data[b];
        const groupA = this.m_groupBuffer[a];
        const groupB = this.m_groupBuffer[b];
        if (a >= firstIndex && a < lastIndex &&
          b >= firstIndex && b < lastIndex &&
          !((af | bf) & b2ParticleFlag.b2_zombieParticle) &&
          ((af | bf) & b2ParticleSystem.k_pairFlags) &&
          (filter.IsNecessary(a) || filter.IsNecessary(b)) &&
          b2ParticleSystem.ParticleCanBeConnected(af, groupA) &&
          b2ParticleSystem.ParticleCanBeConnected(bf, groupB) &&
          filter.ShouldCreatePair(a, b)) {
          ///b2ParticlePair& pair = m_pairBuffer.Append();
          const pair = this.m_pairBuffer.data[this.m_pairBuffer.Append()];
          pair.indexA = a;
          pair.indexB = b;
          pair.flags = contact.flags;
          pair.strength = b2Min(
            groupA ? groupA.m_strength : 1,
            groupB ? groupB.m_strength : 1);
          ///pair.distance = b2Distance(pos_data[a], pos_data[b]); // TODO: this was wrong!
          pair.distance = b2Vec2.DistanceVV(pos_data[a], pos_data[b]);
        }
        ///std::stable_sort(m_pairBuffer.Begin(), m_pairBuffer.End(), ComparePairIndices);
        std_stable_sort(this.m_pairBuffer.data, 0, this.m_pairBuffer.count, b2ParticleSystem.ComparePairIndices);
        ///m_pairBuffer.Unique(MatchPairIndices);
        this.m_pairBuffer.Unique(b2ParticleSystem.MatchPairIndices);
      }
    }
    if (particleFlags & b2ParticleSystem.k_triadFlags) {
      const diagram = new b2VoronoiDiagram(lastIndex - firstIndex);
      ///let necessary_count = 0;
      for (let i = firstIndex; i < lastIndex; i++) {
        const flags = this.m_flagsBuffer.data[i];
        const group = this.m_groupBuffer[i];
        if (!(flags & b2ParticleFlag.b2_zombieParticle) &&
          b2ParticleSystem.ParticleCanBeConnected(flags, group)) {
          ///if (filter.IsNecessary(i)) {
          ///++necessary_count;
          ///}
          diagram.AddGenerator(pos_data[i], i, filter.IsNecessary(i));
        }
      }
      ///if (necessary_count === 0) {
      /////debugger;
      ///for (let i = firstIndex; i < lastIndex; i++) {
      ///  filter.IsNecessary(i);
      ///}
      ///}
      const stride = this.GetParticleStride();
      diagram.Generate(stride / 2, stride * 2);
      const system = this;
      const callback = /*UpdateTriadsCallback*/(a: number, b: number, c: number): void => {
        const af = system.m_flagsBuffer.data[a];
        const bf = system.m_flagsBuffer.data[b];
        const cf = system.m_flagsBuffer.data[c];
        if (((af | bf | cf) & b2ParticleSystem.k_triadFlags) &&
          filter.ShouldCreateTriad(a, b, c)) {
          const pa = pos_data[a];
          const pb = pos_data[b];
          const pc = pos_data[c];
          const dab = b2Vec2.SubVV(pa, pb, s_dab);
          const dbc = b2Vec2.SubVV(pb, pc, s_dbc);
          const dca = b2Vec2.SubVV(pc, pa, s_dca);
          const maxDistanceSquared = b2_maxTriadDistanceSquared * system.m_squaredDiameter;
          if (b2Vec2.DotVV(dab, dab) > maxDistanceSquared ||
            b2Vec2.DotVV(dbc, dbc) > maxDistanceSquared ||
            b2Vec2.DotVV(dca, dca) > maxDistanceSquared) {
            return;
          }
          const groupA = system.m_groupBuffer[a];
          const groupB = system.m_groupBuffer[b];
          const groupC = system.m_groupBuffer[c];
          ///b2ParticleTriad& triad = m_system.m_triadBuffer.Append();
          const triad = system.m_triadBuffer.data[system.m_triadBuffer.Append()];
          triad.indexA = a;
          triad.indexB = b;
          triad.indexC = c;
          triad.flags = af | bf | cf;
          triad.strength = b2Min(b2Min(
              groupA ? groupA.m_strength : 1,
              groupB ? groupB.m_strength : 1),
            groupC ? groupC.m_strength : 1);
          ///let midPoint = b2Vec2.MulSV(1.0 / 3.0, b2Vec2.AddVV(pa, b2Vec2.AddVV(pb, pc, new b2Vec2()), new b2Vec2()), new b2Vec2());
          const midPoint_x = (pa.x + pb.x + pc.x) / 3.0;
          const midPoint_y = (pa.y + pb.y + pc.y) / 3.0;
          ///triad.pa = b2Vec2.SubVV(pa, midPoint, new b2Vec2());
          triad.pa.x = pa.x - midPoint_x;
          triad.pa.y = pa.y - midPoint_y;
          ///triad.pb = b2Vec2.SubVV(pb, midPoint, new b2Vec2());
          triad.pb.x = pb.x - midPoint_x;
          triad.pb.y = pb.y - midPoint_y;
          ///triad.pc = b2Vec2.SubVV(pc, midPoint, new b2Vec2());
          triad.pc.x = pc.x - midPoint_x;
          triad.pc.y = pc.y - midPoint_y;
          triad.ka = -b2Vec2.DotVV(dca, dab);
          triad.kb = -b2Vec2.DotVV(dab, dbc);
          triad.kc = -b2Vec2.DotVV(dbc, dca);
          triad.s = b2Vec2.CrossVV(pa, pb) + b2Vec2.CrossVV(pb, pc) + b2Vec2.CrossVV(pc, pa);
        }
      };
      diagram.GetNodes(callback);
      ///std::stable_sort(m_triadBuffer.Begin(), m_triadBuffer.End(), CompareTriadIndices);
      std_stable_sort(this.m_triadBuffer.data, 0, this.m_triadBuffer.count, b2ParticleSystem.CompareTriadIndices);
      ///m_triadBuffer.Unique(MatchTriadIndices);
      this.m_triadBuffer.Unique(b2ParticleSystem.MatchTriadIndices);
    }
  }
  private static UpdatePairsAndTriads_s_dab = new b2Vec2();
  private static UpdatePairsAndTriads_s_dbc = new b2Vec2();
  private static UpdatePairsAndTriads_s_dca = new b2Vec2();

  public UpdatePairsAndTriadsWithReactiveParticles(): void {
    const filter = new b2ParticleSystem_ReactiveFilter(this.m_flagsBuffer);
    this.UpdatePairsAndTriads(0, this.m_count, filter);

    for (let i = 0; i < this.m_count; i++) {
      this.m_flagsBuffer.data[i] &= ~b2ParticleFlag.b2_reactiveParticle;
    }
    this.m_allParticleFlags &= ~b2ParticleFlag.b2_reactiveParticle;
  }

  public static ComparePairIndices(a: b2ParticlePair, b: b2ParticlePair): boolean {
    const diffA = a.indexA - b.indexA;
    if (diffA !== 0) { return diffA < 0; }
    return a.indexB < b.indexB;
  }

  public static MatchPairIndices(a: b2ParticlePair, b: b2ParticlePair): boolean {
    return a.indexA === b.indexA && a.indexB === b.indexB;
  }

  public static CompareTriadIndices(a: b2ParticleTriad, b: b2ParticleTriad): boolean {
    const diffA = a.indexA - b.indexA;
    if (diffA !== 0) { return diffA < 0; }
    const diffB = a.indexB - b.indexB;
    if (diffB !== 0) { return diffB < 0; }
    return a.indexC < b.indexC;
  }

  public static MatchTriadIndices(a: b2ParticleTriad, b: b2ParticleTriad): boolean {
    return a.indexA === b.indexA && a.indexB === b.indexB && a.indexC === b.indexC;
  }

  public static InitializeParticleLists(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void {
    const bufferIndex = group.GetBufferIndex();
    const particleCount = group.GetParticleCount();
    for (let i = 0; i < particleCount; i++) {
      const node: b2ParticleSystem_ParticleListNode = nodeBuffer[i];
      node.list = node;
      node.next = null;
      node.count = 1;
      node.index = i + bufferIndex;
    }
  }

  public MergeParticleListsInContact(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void {
    const bufferIndex = group.GetBufferIndex();
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      /*const b2ParticleContact&*/
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      if (!group.ContainsParticle(a) || !group.ContainsParticle(b)) {
        continue;
      }
      let listA: b2ParticleSystem_ParticleListNode = nodeBuffer[a - bufferIndex].list;
      let listB: b2ParticleSystem_ParticleListNode = nodeBuffer[b - bufferIndex].list;
      if (listA === listB) {
        continue;
      }
      // To minimize the cost of insertion, make sure listA is longer than
      // listB.
      if (listA.count < listB.count) {
        const _tmp = listA;
        listA = listB;
        listB = _tmp; ///b2Swap(listA, listB);
      }
      // DEBUG: b2Assert(listA.count >= listB.count);
      b2ParticleSystem.MergeParticleLists(listA, listB);
    }
  }

  public static MergeParticleLists(listA: b2ParticleSystem_ParticleListNode, listB: b2ParticleSystem_ParticleListNode): void {
    // Insert listB between index 0 and 1 of listA
    // Example:
    //     listA => a1 => a2 => a3 => null
    //     listB => b1 => b2 => null
    // to
    //     listA => listB => b1 => b2 => a1 => a2 => a3 => null
    // DEBUG: b2Assert(listA !== listB);
    for (let b: b2ParticleSystem_ParticleListNode = listB; ; ) {
      b.list = listA;
      const nextB: b2ParticleSystem_ParticleListNode | null = b.next;
      if (nextB) {
        b = nextB;
      } else {
        b.next = listA.next;
        break;
      }
    }
    listA.next = listB;
    listA.count += listB.count;
    listB.count = 0;
  }

  public static FindLongestParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): b2ParticleSystem_ParticleListNode {
    const particleCount = group.GetParticleCount();
    let result: b2ParticleSystem_ParticleListNode = nodeBuffer[0];
    for (let i = 0; i < particleCount; i++) {
      const node: b2ParticleSystem_ParticleListNode = nodeBuffer[i];
      if (result.count < node.count) {
        result = node;
      }
    }
    return result;
  }

  public MergeZombieParticleListNodes(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[], survivingList: b2ParticleSystem_ParticleListNode): void {
    const particleCount = group.GetParticleCount();
    for (let i = 0; i < particleCount; i++) {
      const node: b2ParticleSystem_ParticleListNode = nodeBuffer[i];
      if (node !== survivingList &&
        (this.m_flagsBuffer.data[node.index] & b2ParticleFlag.b2_zombieParticle)) {
        b2ParticleSystem.MergeParticleListAndNode(survivingList, node);
      }
    }
  }

  public static MergeParticleListAndNode(list: b2ParticleSystem_ParticleListNode, node: b2ParticleSystem_ParticleListNode): void {
    // Insert node between index 0 and 1 of list
    // Example:
    //     list => a1 => a2 => a3 => null
    //     node => null
    // to
    //     list => node => a1 => a2 => a3 => null
    // DEBUG: b2Assert(node !== list);
    // DEBUG: b2Assert(node.list === node);
    // DEBUG: b2Assert(node.count === 1);
    node.list = list;
    node.next = list.next;
    list.next = node;
    list.count++;
    node.count = 0;
  }

  public CreateParticleGroupsFromParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[], survivingList: b2ParticleSystem_ParticleListNode): void {
    const particleCount = group.GetParticleCount();
    const def = new b2ParticleGroupDef();
    def.groupFlags = group.GetGroupFlags();
    def.userData = group.GetUserData();
    for (let i = 0; i < particleCount; i++) {
      const list: b2ParticleSystem_ParticleListNode = nodeBuffer[i];
      if (!list.count || list === survivingList) {
        continue;
      }
      // DEBUG: b2Assert(list.list === list);
      const newGroup: b2ParticleGroup = this.CreateParticleGroup(def);
      for (let node: b2ParticleSystem_ParticleListNode | null = list; node; node = node.next) {
        const oldIndex = node.index;
        // DEBUG: const flags = this.m_flagsBuffer.data[oldIndex];
        // DEBUG: b2Assert(!(flags & b2ParticleFlag.b2_zombieParticle));
        const newIndex = this.CloneParticle(oldIndex, newGroup);
        this.m_flagsBuffer.data[oldIndex] |= b2ParticleFlag.b2_zombieParticle;
        node.index = newIndex;
      }
    }
  }

  public UpdatePairsAndTriadsWithParticleList(group: b2ParticleGroup, nodeBuffer: b2ParticleSystem_ParticleListNode[]): void {
    const bufferIndex = group.GetBufferIndex();
    // Update indices in pairs and triads. If an index belongs to the group,
    // replace it with the corresponding value in nodeBuffer.
    // Note that nodeBuffer is allocated only for the group and the index should
    // be shifted by bufferIndex.
    for (let k = 0; k < this.m_pairBuffer.count; k++) {
      const pair = this.m_pairBuffer.data[k];
      const a = pair.indexA;
      const b = pair.indexB;
      if (group.ContainsParticle(a)) {
        pair.indexA = nodeBuffer[a - bufferIndex].index;
      }
      if (group.ContainsParticle(b)) {
        pair.indexB = nodeBuffer[b - bufferIndex].index;
      }
    }
    for (let k = 0; k < this.m_triadBuffer.count; k++) {
      const triad = this.m_triadBuffer.data[k];
      const a = triad.indexA;
      const b = triad.indexB;
      const c = triad.indexC;
      if (group.ContainsParticle(a)) {
        triad.indexA = nodeBuffer[a - bufferIndex].index;
      }
      if (group.ContainsParticle(b)) {
        triad.indexB = nodeBuffer[b - bufferIndex].index;
      }
      if (group.ContainsParticle(c)) {
        triad.indexC = nodeBuffer[c - bufferIndex].index;
      }
    }
  }

  public ComputeDepth(): void {
    const contactGroups: b2ParticleContact[] = []; // TODO: static
    let contactGroupsCount = 0;
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const groupA = this.m_groupBuffer[a];
      const groupB = this.m_groupBuffer[b];
      if (groupA && groupA === groupB &&
        (groupA.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth)) {
        contactGroups[contactGroupsCount++] = contact;
      }
    }
    const groupsToUpdate: b2ParticleGroup[] = []; // TODO: static
    let groupsToUpdateCount = 0;
    for (let group = this.m_groupList; group; group = group.GetNext()) {
      if (group.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth) {
        groupsToUpdate[groupsToUpdateCount++] = group;
        this.SetGroupFlags(group,
          group.m_groupFlags &
          ~b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth);
        for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
          this.m_accumulationBuffer[i] = 0;
        }
      }
    }
    // Compute sum of weight of contacts except between different groups.
    for (let k = 0; k < contactGroupsCount; k++) {
      const contact = contactGroups[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const w = contact.weight;
      this.m_accumulationBuffer[a] += w;
      this.m_accumulationBuffer[b] += w;
    }

    // DEBUG: b2Assert(this.m_depthBuffer !== null);
    for (let i = 0; i < groupsToUpdateCount; i++) {
      const group = groupsToUpdate[i];
      for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
        const w = this.m_accumulationBuffer[i];
        this.m_depthBuffer[i] = w < 0.8 ? 0 : b2_maxFloat;
      }
    }
    // The number of iterations is equal to particle number from the deepest
    // particle to the nearest surface particle, and in general it is smaller
    // than sqrt of total particle number.
    ///int32 iterationCount = (int32)b2Sqrt((float)m_count);
    const iterationCount = b2Sqrt(this.m_count) >> 0;
    for (let t = 0; t < iterationCount; t++) {
      let updated = false;
      for (let k = 0; k < contactGroupsCount; k++) {
        const contact = contactGroups[k];
        const a = contact.indexA;
        const b = contact.indexB;
        const r = 1 - contact.weight;
        ///float32& ap0 = m_depthBuffer[a];
        const ap0 = this.m_depthBuffer[a];
        ///float32& bp0 = m_depthBuffer[b];
        const bp0 = this.m_depthBuffer[b];
        const ap1 = bp0 + r;
        const bp1 = ap0 + r;
        if (ap0 > ap1) {
          ///ap0 = ap1;
          this.m_depthBuffer[a] = ap1;
          updated = true;
        }
        if (bp0 > bp1) {
          ///bp0 = bp1;
          this.m_depthBuffer[b] = bp1;
          updated = true;
        }
      }
      if (!updated) {
        break;
      }
    }
    for (let i = 0; i < groupsToUpdateCount; i++) {
      const group = groupsToUpdate[i];
      for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
        if (this.m_depthBuffer[i] < b2_maxFloat) {
          this.m_depthBuffer[i] *= this.m_particleDiameter;
        } else {
          this.m_depthBuffer[i] = 0;
        }
      }
    }
  }

  public GetInsideBoundsEnumerator(aabb: Readonly<b2AABB>): b2ParticleSystem_InsideBoundsEnumerator {
    const lowerTag = b2ParticleSystem.computeTag(this.m_inverseDiameter * aabb.lowerBound.x - 1,
      this.m_inverseDiameter * aabb.lowerBound.y - 1);
    const upperTag = b2ParticleSystem.computeTag(this.m_inverseDiameter * aabb.upperBound.x + 1,
      this.m_inverseDiameter * aabb.upperBound.y + 1);
    ///const Proxy* beginProxy = m_proxyBuffer.Begin();
    const beginProxy = 0;
    ///const Proxy* endProxy = m_proxyBuffer.End();
    const endProxy = this.m_proxyBuffer.count;
    ///const Proxy* firstProxy = std::lower_bound(beginProxy, endProxy, lowerTag);
    const firstProxy = std_lower_bound(this.m_proxyBuffer.data, beginProxy, endProxy, lowerTag, b2ParticleSystem_Proxy.CompareProxyTag);
    ///const Proxy* lastProxy = std::upper_bound(firstProxy, endProxy, upperTag);
    const lastProxy = std_upper_bound(this.m_proxyBuffer.data, beginProxy, endProxy, upperTag, b2ParticleSystem_Proxy.CompareTagProxy);

    // DEBUG: b2Assert(beginProxy <= firstProxy);
    // DEBUG: b2Assert(firstProxy <= lastProxy);
    // DEBUG: b2Assert(lastProxy <= endProxy);

    return new b2ParticleSystem_InsideBoundsEnumerator(this, lowerTag, upperTag, firstProxy, lastProxy);
  }

  public UpdateAllParticleFlags(): void {
    this.m_allParticleFlags = 0;
    for (let i = 0; i < this.m_count; i++) {
      this.m_allParticleFlags |= this.m_flagsBuffer.data[i];
    }
    this.m_needsUpdateAllParticleFlags = false;
  }

  public UpdateAllGroupFlags(): void {
    this.m_allGroupFlags = 0;
    for (let group = this.m_groupList; group; group = group.GetNext()) {
      this.m_allGroupFlags |= group.m_groupFlags;
    }
    this.m_needsUpdateAllGroupFlags = false;
  }

  public AddContact(a: number, b: number, contacts: b2GrowableBuffer<b2ParticleContact>): void {
    // DEBUG: b2Assert(contacts === this.m_contactBuffer);
    const flags_data = this.m_flagsBuffer.data;
    const pos_data = this.m_positionBuffer.data;
    ///b2Vec2 d = m_positionBuffer.data[b] - m_positionBuffer.data[a];
    const d = b2Vec2.SubVV(pos_data[b], pos_data[a], b2ParticleSystem.AddContact_s_d);
    const distBtParticlesSq = b2Vec2.DotVV(d, d);
    if (0 < distBtParticlesSq && distBtParticlesSq < this.m_squaredDiameter) {
      const invD = b2InvSqrt(distBtParticlesSq);
      ///b2ParticleContact& contact = contacts.Append();
      const contact = this.m_contactBuffer.data[this.m_contactBuffer.Append()];
      contact.indexA = a;
      contact.indexB = b;
      contact.flags = flags_data[a] | flags_data[b];
      contact.weight = 1 - distBtParticlesSq * invD * this.m_inverseDiameter;
      contact.normal.x = invD * d.x;
      contact.normal.y = invD * d.y;
    }
  }
  public static readonly AddContact_s_d = new b2Vec2();

  public FindContacts_Reference(contacts: b2GrowableBuffer<b2ParticleContact>): void {
    // DEBUG: b2Assert(contacts === this.m_contactBuffer);
    const beginProxy = 0;
    const endProxy = this.m_proxyBuffer.count;

    this.m_contactBuffer.count = 0;
    for (let a = beginProxy, c = beginProxy; a < endProxy; a++) {
      const rightTag = b2ParticleSystem.computeRelativeTag(this.m_proxyBuffer.data[a].tag, 1, 0);
      for (let b = a + 1; b < endProxy; b++) {
        if (rightTag < this.m_proxyBuffer.data[b].tag) { break; }
        this.AddContact(this.m_proxyBuffer.data[a].index, this.m_proxyBuffer.data[b].index, this.m_contactBuffer);
      }
      const bottomLeftTag = b2ParticleSystem.computeRelativeTag(this.m_proxyBuffer.data[a].tag, -1, 1);
      for (; c < endProxy; c++) {
        if (bottomLeftTag <= this.m_proxyBuffer.data[c].tag) { break; }
      }
      const bottomRightTag = b2ParticleSystem.computeRelativeTag(this.m_proxyBuffer.data[a].tag, 1, 1);
      for (let b = c; b < endProxy; b++) {
        if (bottomRightTag < this.m_proxyBuffer.data[b].tag) { break; }
        this.AddContact(this.m_proxyBuffer.data[a].index, this.m_proxyBuffer.data[b].index, this.m_contactBuffer);
      }
    }
  }

  ///void ReorderForFindContact(FindContactInput* reordered, int alignedCount) const;
  ///void GatherChecksOneParticle(const uint32 bound, const int startIndex, const int particleIndex, int* nextUncheckedIndex, b2GrowableBuffer<FindContactCheck>& checks) const;
  ///void GatherChecks(b2GrowableBuffer<FindContactCheck>& checks) const;
  ///void FindContacts_Simd(b2GrowableBuffer<b2ParticleContact>& contacts) const;

  public FindContacts(contacts: b2GrowableBuffer<b2ParticleContact>): void {
    this.FindContacts_Reference(contacts);
  }

  ///static void UpdateProxyTags(const uint32* const tags, b2GrowableBuffer<Proxy>& proxies);
  ///static bool ProxyBufferHasIndex(int32 index, const Proxy* const a, int count);
  ///static int NumProxiesWithSameTag(const Proxy* const a, const Proxy* const b, int count);
  ///static bool AreProxyBuffersTheSame(const b2GrowableBuffer<Proxy>& a, const b2GrowableBuffer<Proxy>& b);

  public UpdateProxies_Reference(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void {
    // DEBUG: b2Assert(proxies === this.m_proxyBuffer);
    const pos_data = this.m_positionBuffer.data;
    const inv_diam = this.m_inverseDiameter;
    for (let k = 0; k < this.m_proxyBuffer.count; ++k) {
      const proxy = this.m_proxyBuffer.data[k];
      const i = proxy.index;
      const p = pos_data[i];
      proxy.tag = b2ParticleSystem.computeTag(inv_diam * p.x, inv_diam * p.y);
    }
  }

  ///void UpdateProxies_Simd(b2GrowableBuffer<Proxy>& proxies) const;

  public UpdateProxies(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void {
    this.UpdateProxies_Reference(proxies);
  }

  public SortProxies(proxies: b2GrowableBuffer<b2ParticleSystem_Proxy>): void {
    // DEBUG: b2Assert(proxies === this.m_proxyBuffer);

    ///std::sort(proxies.Begin(), proxies.End());
    std_sort(this.m_proxyBuffer.data, 0, this.m_proxyBuffer.count, b2ParticleSystem_Proxy.CompareProxyProxy);
  }

  public FilterContacts(contacts: b2GrowableBuffer<b2ParticleContact>): void {
    // Optionally filter the contact.
    const contactFilter = this.GetParticleContactFilter();
    if (contactFilter === null) {
      return;
    }

    /// contacts.RemoveIf(b2ParticleContactRemovePredicate(this, contactFilter));
    // DEBUG: b2Assert(contacts === this.m_contactBuffer);
    const system = this;
    const predicate = (contact: b2ParticleContact): boolean => {
      return ((contact.flags & b2ParticleFlag.b2_particleContactFilterParticle) !== 0) && !contactFilter.ShouldCollideParticleParticle(system, contact.indexA, contact.indexB);
    };
    this.m_contactBuffer.RemoveIf(predicate);
  }

  public NotifyContactListenerPreContact(particlePairs: b2ParticlePairSet): void {
    const contactListener = this.GetParticleContactListener();
    if (contactListener === null) {
      return;
    }

    ///particlePairs.Initialize(m_contactBuffer.Begin(), m_contactBuffer.GetCount(), GetFlagsBuffer());
    particlePairs.Initialize(this.m_contactBuffer, this.m_flagsBuffer);

    throw new Error(); // TODO: notify
  }

  public NotifyContactListenerPostContact(particlePairs: b2ParticlePairSet): void {
    const contactListener = this.GetParticleContactListener();
    if (contactListener === null) {
      return;
    }

    // Loop through all new contacts, reporting any new ones, and
    // "invalidating" the ones that still exist.
    ///const b2ParticleContact* const endContact = m_contactBuffer.End();
    ///for (b2ParticleContact* contact = m_contactBuffer.Begin(); contact < endContact; ++contact)
    for (let k = 0; k < this.m_contactBuffer.count; ++k) {
      const contact = this.m_contactBuffer.data[k];
      ///ParticlePair pair;
      ///pair.first = contact.GetIndexA();
      ///pair.second = contact.GetIndexB();
      ///const int32 itemIndex = particlePairs.Find(pair);
      const itemIndex = -1; // TODO
      if (itemIndex >= 0) {
        // Already touching, ignore this contact.
        particlePairs.Invalidate(itemIndex);
      } else {
        // Just started touching, inform the listener.
        contactListener.BeginContactParticleParticle(this, contact);
      }
    }

    // Report particles that are no longer touching.
    // That is, any pairs that were not invalidated above.
    ///const int32 pairCount = particlePairs.GetCount();
    ///const ParticlePair* const pairs = particlePairs.GetBuffer();
    ///const int8* const valid = particlePairs.GetValidBuffer();
    ///for (int32 i = 0; i < pairCount; ++i)
    ///{
    ///  if (valid[i])
    ///  {
    ///    contactListener.EndContactParticleParticle(this, pairs[i].first, pairs[i].second);
    ///  }
    ///}

    throw new Error(); // TODO: notify
  }

  public static b2ParticleContactIsZombie(contact: b2ParticleContact): boolean {
    return (contact.flags & b2ParticleFlag.b2_zombieParticle) === b2ParticleFlag.b2_zombieParticle;
  }

  public UpdateContacts(exceptZombie: boolean): void {
    this.UpdateProxies(this.m_proxyBuffer);
    this.SortProxies(this.m_proxyBuffer);

    const particlePairs = new b2ParticlePairSet(); // TODO: static
    this.NotifyContactListenerPreContact(particlePairs);

    this.FindContacts(this.m_contactBuffer);
    this.FilterContacts(this.m_contactBuffer);

    this.NotifyContactListenerPostContact(particlePairs);

    if (exceptZombie) {
      this.m_contactBuffer.RemoveIf(b2ParticleSystem.b2ParticleContactIsZombie);
    }
  }

  public NotifyBodyContactListenerPreContact(fixtureSet: b2ParticleSystem_FixtureParticleSet): void {
    const contactListener = this.GetFixtureContactListener();
    if (contactListener === null) {
      return;
    }

    ///fixtureSet.Initialize(m_bodyContactBuffer.Begin(), m_bodyContactBuffer.GetCount(), GetFlagsBuffer());
    fixtureSet.Initialize(this.m_bodyContactBuffer, this.m_flagsBuffer);

    throw new Error(); // TODO: notify
  }

  public NotifyBodyContactListenerPostContact(fixtureSet: b2ParticleSystem_FixtureParticleSet): void {
    const contactListener = this.GetFixtureContactListener();
    if (contactListener === null) {
      return;
    }

    // Loop through all new contacts, reporting any new ones, and
    // "invalidating" the ones that still exist.
    ///for (b2ParticleBodyContact* contact = m_bodyContactBuffer.Begin(); contact !== m_bodyContactBuffer.End(); ++contact)
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      // DEBUG: b2Assert(contact !== null);
      ///FixtureParticle fixtureParticleToFind;
      ///fixtureParticleToFind.first = contact.fixture;
      ///fixtureParticleToFind.second = contact.index;
      ///const int32 index = fixtureSet.Find(fixtureParticleToFind);
      const index = -1; // TODO
      if (index >= 0) {
        // Already touching remove this from the set.
        fixtureSet.Invalidate(index);
      } else {
        // Just started touching, report it!
        contactListener.BeginContactFixtureParticle(this, contact);
      }
    }

    // If the contact listener is enabled, report all fixtures that are no
    // longer in contact with particles.
    ///const FixtureParticle* const fixtureParticles = fixtureSet.GetBuffer();
    ///const int8* const fixtureParticlesValid = fixtureSet.GetValidBuffer();
    ///const int32 fixtureParticleCount = fixtureSet.GetCount();
    ///for (int32 i = 0; i < fixtureParticleCount; ++i)
    ///{
    ///  if (fixtureParticlesValid[i])
    ///  {
    ///    const FixtureParticle* const fixtureParticle = &fixtureParticles[i];
    ///    contactListener.EndContactFixtureParticle(fixtureParticle.first, this, fixtureParticle.second);
    ///  }
    ///}

    throw new Error(); // TODO: notify
  }

  public UpdateBodyContacts(): void {
    const s_aabb = b2ParticleSystem.UpdateBodyContacts_s_aabb;

    // If the particle contact listener is enabled, generate a set of
    // fixture / particle contacts.
    const fixtureSet = new b2ParticleSystem_FixtureParticleSet(); // TODO: static
    this.NotifyBodyContactListenerPreContact(fixtureSet);

    if (this.m_stuckThreshold > 0) {
      const particleCount = this.GetParticleCount();
      for (let i = 0; i < particleCount; i++) {
        // Detect stuck particles, see comment in
        // b2ParticleSystem::DetectStuckParticle()
        this.m_bodyContactCountBuffer.data[i] = 0;
        if (this.m_timestamp > (this.m_lastBodyContactStepBuffer.data[i] + 1)) {
          this.m_consecutiveContactStepsBuffer.data[i] = 0;
        }
      }
    }
    this.m_bodyContactBuffer.SetCount(0);
    this.m_stuckParticleBuffer.SetCount(0);

    const aabb = s_aabb;
    this.ComputeAABB(aabb);

    if (this.UpdateBodyContacts_callback === null) {
      this.UpdateBodyContacts_callback = new b2ParticleSystem_UpdateBodyContactsCallback(this);
    }
    const callback = this.UpdateBodyContacts_callback;
    callback.m_contactFilter = this.GetFixtureContactFilter();
    this.m_world.QueryAABB(callback, aabb);

    if (this.m_def.strictContactCheck) {
      this.RemoveSpuriousBodyContacts();
    }

    this.NotifyBodyContactListenerPostContact(fixtureSet);
  }
  public static readonly UpdateBodyContacts_s_aabb = new b2AABB();
  public UpdateBodyContacts_callback: b2ParticleSystem_UpdateBodyContactsCallback | null = null;

  public Solve(step: b2TimeStep): void {
    const s_subStep = b2ParticleSystem.Solve_s_subStep;
    if (this.m_count === 0) {
      return;
    }
    // If particle lifetimes are enabled, destroy particles that are too old.
    if (this.m_expirationTimeBuffer.data) {
      this.SolveLifetimes(step);
    }
    if (this.m_allParticleFlags & b2ParticleFlag.b2_zombieParticle) {
      this.SolveZombie();
    }
    if (this.m_needsUpdateAllParticleFlags) {
      this.UpdateAllParticleFlags();
    }
    if (this.m_needsUpdateAllGroupFlags) {
      this.UpdateAllGroupFlags();
    }
    if (this.m_paused) {
      return;
    }
    for (this.m_iterationIndex = 0; this.m_iterationIndex < step.particleIterations; this.m_iterationIndex++) {
      ++this.m_timestamp;
      const subStep = s_subStep.Copy(step);
      subStep.dt /= step.particleIterations;
      subStep.inv_dt *= step.particleIterations;
      this.UpdateContacts(false);
      this.UpdateBodyContacts();
      this.ComputeWeight();
      if (this.m_allGroupFlags & b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth) {
        this.ComputeDepth();
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_reactiveParticle) {
        this.UpdatePairsAndTriadsWithReactiveParticles();
      }
      if (this.m_hasForce) {
        this.SolveForce(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_viscousParticle) {
        this.SolveViscous();
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_repulsiveParticle) {
        this.SolveRepulsive(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_powderParticle) {
        this.SolvePowder(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_tensileParticle) {
        this.SolveTensile(subStep);
      }
      if (this.m_allGroupFlags & b2ParticleGroupFlag.b2_solidParticleGroup) {
        this.SolveSolid(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_colorMixingParticle) {
        this.SolveColorMixing();
      }
      this.SolveGravity(subStep);
      if (this.m_allParticleFlags & b2ParticleFlag.b2_staticPressureParticle) {
        this.SolveStaticPressure(subStep);
      }
      this.SolvePressure(subStep);
      this.SolveDamping(subStep);
      if (this.m_allParticleFlags & b2ParticleSystem.k_extraDampingFlags) {
        this.SolveExtraDamping();
      }
      // SolveElastic and SolveSpring refer the current velocities for
      // numerical stability, they should be called as late as possible.
      if (this.m_allParticleFlags & b2ParticleFlag.b2_elasticParticle) {
        this.SolveElastic(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_springParticle) {
        this.SolveSpring(subStep);
      }
      this.LimitVelocity(subStep);
      if (this.m_allGroupFlags & b2ParticleGroupFlag.b2_rigidParticleGroup) {
        this.SolveRigidDamping();
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_barrierParticle) {
        this.SolveBarrier(subStep);
      }
      // SolveCollision, SolveRigid and SolveWall should be called after
      // other force functions because they may require particles to have
      // specific velocities.
      this.SolveCollision(subStep);
      if (this.m_allGroupFlags & b2ParticleGroupFlag.b2_rigidParticleGroup) {
        this.SolveRigid(subStep);
      }
      if (this.m_allParticleFlags & b2ParticleFlag.b2_wallParticle) {
        this.SolveWall();
      }
      // The particle positions can be updated only at the end of substep.
      for (let i = 0; i < this.m_count; i++) {
        ///m_positionBuffer.data[i] += subStep.dt * m_velocityBuffer.data[i];
        this.m_positionBuffer.data[i].SelfMulAdd(subStep.dt, this.m_velocityBuffer.data[i]);
      }
    }
  }
  public static readonly Solve_s_subStep = new b2TimeStep();

  public SolveCollision(step: b2TimeStep): void {
    const s_aabb = b2ParticleSystem.SolveCollision_s_aabb;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;

    // This function detects particles which are crossing boundary of bodies
    // and modifies velocities of them so that they will move just in front of
    // boundary. This function function also applies the reaction force to
    // bodies as precisely as the numerical stability is kept.
    const aabb = s_aabb;
    aabb.lowerBound.x = +b2_maxFloat;
    aabb.lowerBound.y = +b2_maxFloat;
    aabb.upperBound.x = -b2_maxFloat;
    aabb.upperBound.y = -b2_maxFloat;
    for (let i = 0; i < this.m_count; i++) {
      const v = vel_data[i];
      const p1 = pos_data[i];
      ///let p2 = p1 + step.dt * v;
      const p2_x = p1.x + step.dt * v.x;
      const p2_y = p1.y + step.dt * v.y;
      ///aabb.lowerBound = b2Min(aabb.lowerBound, b2Min(p1, p2));
      aabb.lowerBound.x = b2Min(aabb.lowerBound.x, b2Min(p1.x, p2_x));
      aabb.lowerBound.y = b2Min(aabb.lowerBound.y, b2Min(p1.y, p2_y));
      ///aabb.upperBound = b2Max(aabb.upperBound, b2Max(p1, p2));
      aabb.upperBound.x = b2Max(aabb.upperBound.x, b2Max(p1.x, p2_x));
      aabb.upperBound.y = b2Max(aabb.upperBound.y, b2Max(p1.y, p2_y));
    }
    if (this.SolveCollision_callback === null) {
      this.SolveCollision_callback = new b2ParticleSystem_SolveCollisionCallback(this, step);
    }
    const callback = this.SolveCollision_callback;
    callback.m_step = step;
    this.m_world.QueryAABB(callback, aabb);
  }
  public static readonly SolveCollision_s_aabb = new b2AABB();
  public SolveCollision_callback: b2ParticleSystem_SolveCollisionCallback | null = null;

  public LimitVelocity(step: b2TimeStep): void {
    const vel_data = this.m_velocityBuffer.data;
    const criticalVelocitySquared = this.GetCriticalVelocitySquared(step);
    for (let i = 0; i < this.m_count; i++) {
      const v = vel_data[i];
      const v2 = b2Vec2.DotVV(v, v);
      if (v2 > criticalVelocitySquared) {
        ///v *= b2Sqrt(criticalVelocitySquared / v2);
        v.SelfMul(b2Sqrt(criticalVelocitySquared / v2));
      }
    }
  }

  public SolveGravity(step: b2TimeStep): void {
    const s_gravity = b2ParticleSystem.SolveGravity_s_gravity;
    const vel_data = this.m_velocityBuffer.data;
    ///b2Vec2 gravity = step.dt * m_def.gravityScale * m_world.GetGravity();
    const gravity = b2Vec2.MulSV(step.dt * this.m_def.gravityScale, this.m_world.GetGravity(), s_gravity);
    for (let i = 0; i < this.m_count; i++) {
      vel_data[i].SelfAdd(gravity);
    }
  }
  public static readonly SolveGravity_s_gravity = new b2Vec2();

  public SolveBarrier(step: b2TimeStep): void {
    const s_aabb = b2ParticleSystem.SolveBarrier_s_aabb;
    const s_va = b2ParticleSystem.SolveBarrier_s_va;
    const s_vb = b2ParticleSystem.SolveBarrier_s_vb;
    const s_pba = b2ParticleSystem.SolveBarrier_s_pba;
    const s_vba = b2ParticleSystem.SolveBarrier_s_vba;
    const s_vc = b2ParticleSystem.SolveBarrier_s_vc;
    const s_pca = b2ParticleSystem.SolveBarrier_s_pca;
    const s_vca = b2ParticleSystem.SolveBarrier_s_vca;
    const s_qba = b2ParticleSystem.SolveBarrier_s_qba;
    const s_qca = b2ParticleSystem.SolveBarrier_s_qca;
    const s_dv = b2ParticleSystem.SolveBarrier_s_dv;
    const s_f = b2ParticleSystem.SolveBarrier_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    // If a particle is passing between paired barrier particles,
    // its velocity will be decelerated to avoid passing.
    for (let i = 0; i < this.m_count; i++) {
      const flags = this.m_flagsBuffer.data[i];
      ///if ((flags & b2ParticleSystem.k_barrierWallFlags) === b2ParticleSystem.k_barrierWallFlags)
      if ((flags & b2ParticleSystem.k_barrierWallFlags) !== 0) {
        vel_data[i].SetZero();
      }
    }
    const tmax = b2_barrierCollisionTime * step.dt;
    const mass = this.GetParticleMass();
    for (let k = 0; k < this.m_pairBuffer.count; k++) {
      const pair = this.m_pairBuffer.data[k];
      if (pair.flags & b2ParticleFlag.b2_barrierParticle) {
        const a = pair.indexA;
        const b = pair.indexB;
        const pa = pos_data[a];
        const pb = pos_data[b];
        /// b2AABB aabb;
        const aabb = s_aabb;
        ///aabb.lowerBound = b2Min(pa, pb);
        b2Vec2.MinV(pa, pb, aabb.lowerBound);
        ///aabb.upperBound = b2Max(pa, pb);
        b2Vec2.MaxV(pa, pb, aabb.upperBound);
        const aGroup = this.m_groupBuffer[a];
        const bGroup = this.m_groupBuffer[b];
        ///b2Vec2 va = GetLinearVelocity(aGroup, a, pa);
        const va = this.GetLinearVelocity(aGroup, a, pa, s_va);
        ///b2Vec2 vb = GetLinearVelocity(bGroup, b, pb);
        const vb = this.GetLinearVelocity(bGroup, b, pb, s_vb);
        ///b2Vec2 pba = pb - pa;
        const pba = b2Vec2.SubVV(pb, pa, s_pba);
        ///b2Vec2 vba = vb - va;
        const vba = b2Vec2.SubVV(vb, va, s_vba);
        ///InsideBoundsEnumerator enumerator = GetInsideBoundsEnumerator(aabb);
        const enumerator = this.GetInsideBoundsEnumerator(aabb);
        let c: number;
        while ((c = enumerator.GetNext()) >= 0) {
          const pc = pos_data[c];
          const cGroup = this.m_groupBuffer[c];
          if (aGroup !== cGroup && bGroup !== cGroup) {
            ///b2Vec2 vc = GetLinearVelocity(cGroup, c, pc);
            const vc = this.GetLinearVelocity(cGroup, c, pc, s_vc);
            // Solve the equation below:
            //   (1-s)*(pa+t*va)+s*(pb+t*vb) = pc+t*vc
            // which expresses that the particle c will pass a line
            // connecting the particles a and b at the time of t.
            // if s is between 0 and 1, c will pass between a and b.
            ///b2Vec2 pca = pc - pa;
            const pca = b2Vec2.SubVV(pc, pa, s_pca);
            ///b2Vec2 vca = vc - va;
            const vca = b2Vec2.SubVV(vc, va, s_vca);
            const e2 = b2Vec2.CrossVV(vba, vca);
            const e1 = b2Vec2.CrossVV(pba, vca) - b2Vec2.CrossVV(pca, vba);
            const e0 = b2Vec2.CrossVV(pba, pca);
            let s: number, t: number;
            ///b2Vec2 qba, qca;
            const qba = s_qba,
              qca = s_qca;
            if (e2 === 0) {
              if (e1 === 0) { continue; }
              t = -e0 / e1;
              if (!(t >= 0 && t < tmax)) { continue; }
              ///qba = pba + t * vba;
              b2Vec2.AddVMulSV(pba, t, vba, qba);
              ///qca = pca + t * vca;
              b2Vec2.AddVMulSV(pca, t, vca, qca);
              s = b2Vec2.DotVV(qba, qca) / b2Vec2.DotVV(qba, qba);
              if (!(s >= 0 && s <= 1)) { continue; }
            } else {
              const det = e1 * e1 - 4 * e0 * e2;
              if (det < 0) { continue; }
              const sqrtDet = b2Sqrt(det);
              let t1 = (-e1 - sqrtDet) / (2 * e2);
              let t2 = (-e1 + sqrtDet) / (2 * e2);
              ///if (t1 > t2) b2Swap(t1, t2);
              if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
              }
              t = t1;
              ///qba = pba + t * vba;
              b2Vec2.AddVMulSV(pba, t, vba, qba);
              ///qca = pca + t * vca;
              b2Vec2.AddVMulSV(pca, t, vca, qca);
              ///s = b2Dot(qba, qca) / b2Dot(qba, qba);
              s = b2Vec2.DotVV(qba, qca) / b2Vec2.DotVV(qba, qba);
              if (!(t >= 0 && t < tmax && s >= 0 && s <= 1)) {
                t = t2;
                if (!(t >= 0 && t < tmax)) { continue; }
                ///qba = pba + t * vba;
                b2Vec2.AddVMulSV(pba, t, vba, qba);
                ///qca = pca + t * vca;
                b2Vec2.AddVMulSV(pca, t, vca, qca);
                ///s = b2Dot(qba, qca) / b2Dot(qba, qba);
                s = b2Vec2.DotVV(qba, qca) / b2Vec2.DotVV(qba, qba);
                if (!(s >= 0 && s <= 1)) { continue; }
              }
            }
            // Apply a force to particle c so that it will have the
            // interpolated velocity at the collision point on line ab.
            ///b2Vec2 dv = va + s * vba - vc;
            const dv = s_dv;
            dv.x = va.x + s * vba.x - vc.x;
            dv.y = va.y + s * vba.y - vc.y;
            ///b2Vec2 f = GetParticleMass() * dv;
            const f = b2Vec2.MulSV(mass, dv, s_f);
            if (cGroup && this.IsRigidGroup(cGroup)) {
              // If c belongs to a rigid group, the force will be
              // distributed in the group.
              const mass = cGroup.GetMass();
              const inertia = cGroup.GetInertia();
              if (mass > 0) {
                ///cGroup.m_linearVelocity += 1 / mass * f;
                cGroup.m_linearVelocity.SelfMulAdd(1 / mass, f);
              }
              if (inertia > 0) {
                ///cGroup.m_angularVelocity += b2Cross(pc - cGroup.GetCenter(), f) / inertia;
                cGroup.m_angularVelocity += b2Vec2.CrossVV(
                  b2Vec2.SubVV(pc, cGroup.GetCenter(), b2Vec2.s_t0),
                  f) / inertia;
              }
            } else {
              ///m_velocityBuffer.data[c] += dv;
              vel_data[c].SelfAdd(dv);
            }
            // Apply a reversed force to particle c after particle
            // movement so that momentum will be preserved.
            ///ParticleApplyForce(c, -step.inv_dt * f);
            this.ParticleApplyForce(c, f.SelfMul(-step.inv_dt));
          }
        }
      }
    }
  }
  public static readonly SolveBarrier_s_aabb = new b2AABB();
  public static readonly SolveBarrier_s_va = new b2Vec2();
  public static readonly SolveBarrier_s_vb = new b2Vec2();
  public static readonly SolveBarrier_s_pba = new b2Vec2();
  public static readonly SolveBarrier_s_vba = new b2Vec2();
  public static readonly SolveBarrier_s_vc = new b2Vec2();
  public static readonly SolveBarrier_s_pca = new b2Vec2();
  public static readonly SolveBarrier_s_vca = new b2Vec2();
  public static readonly SolveBarrier_s_qba = new b2Vec2();
  public static readonly SolveBarrier_s_qca = new b2Vec2();
  public static readonly SolveBarrier_s_dv = new b2Vec2();
  public static readonly SolveBarrier_s_f = new b2Vec2();

  public SolveStaticPressure(step: b2TimeStep): void {
    this.m_staticPressureBuffer = this.RequestBuffer(this.m_staticPressureBuffer);
    const criticalPressure = this.GetCriticalPressure(step);
    const pressurePerWeight = this.m_def.staticPressureStrength * criticalPressure;
    const maxPressure = b2_maxParticlePressure * criticalPressure;
    const relaxation = this.m_def.staticPressureRelaxation;
    /// Compute pressure satisfying the modified Poisson equation:
    ///   Sum_for_j((p_i - p_j) * w_ij) + relaxation * p_i =
    ///   pressurePerWeight * (w_i - b2_minParticleWeight)
    /// by iterating the calculation:
    ///   p_i = (Sum_for_j(p_j * w_ij) + pressurePerWeight *
    ///         (w_i - b2_minParticleWeight)) / (w_i + relaxation)
    /// where
    ///   p_i and p_j are static pressure of particle i and j
    ///   w_ij is contact weight between particle i and j
    ///   w_i is sum of contact weight of particle i
    for (let t = 0; t < this.m_def.staticPressureIterations; t++) {
      ///memset(m_accumulationBuffer, 0, sizeof(*m_accumulationBuffer) * m_count);
      for (let i = 0; i < this.m_count; i++) {
        this.m_accumulationBuffer[i] = 0;
      }
      for (let k = 0; k < this.m_contactBuffer.count; k++) {
        const contact = this.m_contactBuffer.data[k];
        if (contact.flags & b2ParticleFlag.b2_staticPressureParticle) {
          const a = contact.indexA;
          const b = contact.indexB;
          const w = contact.weight;
          this.m_accumulationBuffer[a] += w * this.m_staticPressureBuffer[b]; // a <- b
          this.m_accumulationBuffer[b] += w * this.m_staticPressureBuffer[a]; // b <- a
        }
      }
      for (let i = 0; i < this.m_count; i++) {
        const w = this.m_weightBuffer[i];
        if (this.m_flagsBuffer.data[i] & b2ParticleFlag.b2_staticPressureParticle) {
          const wh = this.m_accumulationBuffer[i];
          const h =
            (wh + pressurePerWeight * (w - b2_minParticleWeight)) /
            (w + relaxation);
          this.m_staticPressureBuffer[i] = b2Clamp(h, 0.0, maxPressure);
        } else {
          this.m_staticPressureBuffer[i] = 0;
        }
      }
    }
  }

  public ComputeWeight(): void {
    // calculates the sum of contact-weights for each particle
    // that means dimensionless density
    ///memset(m_weightBuffer, 0, sizeof(*m_weightBuffer) * m_count);
    for (let k = 0; k < this.m_count; k++) {
      this.m_weightBuffer[k] = 0;
    }
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      const w = contact.weight;
      this.m_weightBuffer[a] += w;
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const w = contact.weight;
      this.m_weightBuffer[a] += w;
      this.m_weightBuffer[b] += w;
    }
  }

  public SolvePressure(step: b2TimeStep): void {
    const s_f = b2ParticleSystem.SolvePressure_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    // calculates pressure as a linear function of density
    const criticalPressure = this.GetCriticalPressure(step);
    const pressurePerWeight = this.m_def.pressureStrength * criticalPressure;
    const maxPressure = b2_maxParticlePressure * criticalPressure;
    for (let i = 0; i < this.m_count; i++) {
      const w = this.m_weightBuffer[i];
      const h = pressurePerWeight * b2Max(0.0, w - b2_minParticleWeight);
      this.m_accumulationBuffer[i] = b2Min(h, maxPressure);
    }
    // ignores particles which have their own repulsive force
    if (this.m_allParticleFlags & b2ParticleSystem.k_noPressureFlags) {
      for (let i = 0; i < this.m_count; i++) {
        if (this.m_flagsBuffer.data[i] & b2ParticleSystem.k_noPressureFlags) {
          this.m_accumulationBuffer[i] = 0;
        }
      }
    }
    // static pressure
    if (this.m_allParticleFlags & b2ParticleFlag.b2_staticPressureParticle) {
      // DEBUG: b2Assert(this.m_staticPressureBuffer !== null);
      for (let i = 0; i < this.m_count; i++) {
        if (this.m_flagsBuffer.data[i] & b2ParticleFlag.b2_staticPressureParticle) {
          this.m_accumulationBuffer[i] += this.m_staticPressureBuffer[i];
        }
      }
    }
    // applies pressure between each particles in contact
    const velocityPerPressure = step.dt / (this.m_def.density * this.m_particleDiameter);
    const inv_mass = this.GetParticleInvMass();
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      const b = contact.body;
      const w = contact.weight;
      const m = contact.mass;
      const n = contact.normal;
      const p = pos_data[a];
      const h = this.m_accumulationBuffer[a] + pressurePerWeight * w;
      ///b2Vec2 f = velocityPerPressure * w * m * h * n;
      const f = b2Vec2.MulSV(velocityPerPressure * w * m * h, n, s_f);
      ///m_velocityBuffer.data[a] -= GetParticleInvMass() * f;
      vel_data[a].SelfMulSub(inv_mass, f);
      b.ApplyLinearImpulse(f, p, true);
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const w = contact.weight;
      const n = contact.normal;
      const h = this.m_accumulationBuffer[a] + this.m_accumulationBuffer[b];
      ///b2Vec2 f = velocityPerPressure * w * h * n;
      const f = b2Vec2.MulSV(velocityPerPressure * w * h, n, s_f);
      ///m_velocityBuffer.data[a] -= f;
      vel_data[a].SelfSub(f);
      ///m_velocityBuffer.data[b] += f;
      vel_data[b].SelfAdd(f);
    }
  }
  public static readonly SolvePressure_s_f = new b2Vec2();

  public SolveDamping(step: b2TimeStep): void {
    const s_v = b2ParticleSystem.SolveDamping_s_v;
    const s_f = b2ParticleSystem.SolveDamping_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    // reduces normal velocity of each contact
    const linearDamping = this.m_def.dampingStrength;
    const quadraticDamping = 1 / this.GetCriticalVelocity(step);
    const inv_mass = this.GetParticleInvMass();
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      const b = contact.body;
      const w = contact.weight;
      const m = contact.mass;
      const n = contact.normal;
      const p = pos_data[a];
      ///b2Vec2 v = b.GetLinearVelocityFromWorldPoint(p) - m_velocityBuffer.data[a];
      const v = b2Vec2.SubVV(b.GetLinearVelocityFromWorldPoint(p, b2Vec2.s_t0), vel_data[a], s_v);
      const vn = b2Vec2.DotVV(v, n);
      if (vn < 0) {
        const damping = b2Max(linearDamping * w, b2Min(-quadraticDamping * vn, 0.5));
        ///b2Vec2 f = damping * m * vn * n;
        const f = b2Vec2.MulSV(damping * m * vn, n, s_f);
        ///m_velocityBuffer.data[a] += GetParticleInvMass() * f;
        vel_data[a].SelfMulAdd(inv_mass, f);
        ///b.ApplyLinearImpulse(-f, p, true);
        b.ApplyLinearImpulse(f.SelfNeg(), p, true);
      }
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const w = contact.weight;
      const n = contact.normal;
      ///b2Vec2 v = m_velocityBuffer.data[b] - m_velocityBuffer.data[a];
      const v = b2Vec2.SubVV(vel_data[b], vel_data[a], s_v);
      const vn = b2Vec2.DotVV(v, n);
      if (vn < 0) {
        ///float32 damping = b2Max(linearDamping * w, b2Min(- quadraticDamping * vn, 0.5f));
        const damping = b2Max(linearDamping * w, b2Min(-quadraticDamping * vn, 0.5));
        ///b2Vec2 f = damping * vn * n;
        const f = b2Vec2.MulSV(damping * vn, n, s_f);
        ///this.m_velocityBuffer.data[a] += f;
        vel_data[a].SelfAdd(f);
        ///this.m_velocityBuffer.data[b] -= f;
        vel_data[b].SelfSub(f);
      }
    }
  }
  public static readonly SolveDamping_s_v = new b2Vec2();
  public static readonly SolveDamping_s_f = new b2Vec2();

  public SolveRigidDamping(): void {
    const s_t0 = b2ParticleSystem.SolveRigidDamping_s_t0;
    const s_t1 = b2ParticleSystem.SolveRigidDamping_s_t1;
    const s_p = b2ParticleSystem.SolveRigidDamping_s_p;
    const s_v = b2ParticleSystem.SolveRigidDamping_s_v;
    const invMassA = [0.0],
      invInertiaA = [0.0],
      tangentDistanceA = [0.0]; // TODO: static
    const invMassB = [0.0],
      invInertiaB = [0.0],
      tangentDistanceB = [0.0]; // TODO: static
    // Apply impulse to rigid particle groups colliding with other objects
    // to reduce relative velocity at the colliding point.
    const pos_data = this.m_positionBuffer.data;
    const damping = this.m_def.dampingStrength;
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      const aGroup = this.m_groupBuffer[a];
      if (aGroup && this.IsRigidGroup(aGroup)) {
        const b = contact.body;
        const n = contact.normal;
        const w = contact.weight;
        const p = pos_data[a];
        ///b2Vec2 v = b.GetLinearVelocityFromWorldPoint(p) - aGroup.GetLinearVelocityFromWorldPoint(p);
        const v = b2Vec2.SubVV(b.GetLinearVelocityFromWorldPoint(p, s_t0), aGroup.GetLinearVelocityFromWorldPoint(p, s_t1), s_v);
        const vn = b2Vec2.DotVV(v, n);
        if (vn < 0) {
          // The group's average velocity at particle position 'p' is pushing
          // the particle into the body.
          ///this.InitDampingParameterWithRigidGroupOrParticle(&invMassA, &invInertiaA, &tangentDistanceA, true, aGroup, a, p, n);
          this.InitDampingParameterWithRigidGroupOrParticle(invMassA, invInertiaA, tangentDistanceA, true, aGroup, a, p, n);
          // Calculate b.m_I from public functions of b2Body.
          ///this.InitDampingParameter(&invMassB, &invInertiaB, &tangentDistanceB, b.GetMass(), b.GetInertia() - b.GetMass() * b.GetLocalCenter().LengthSquared(), b.GetWorldCenter(), p, n);
          this.InitDampingParameter(invMassB, invInertiaB, tangentDistanceB, b.GetMass(), b.GetInertia() - b.GetMass() * b.GetLocalCenter().LengthSquared(), b.GetWorldCenter(), p, n);
          ///float32 f = damping * b2Min(w, 1.0) * this.ComputeDampingImpulse(invMassA, invInertiaA, tangentDistanceA, invMassB, invInertiaB, tangentDistanceB, vn);
          const f = damping * b2Min(w, 1.0) * this.ComputeDampingImpulse(invMassA[0], invInertiaA[0], tangentDistanceA[0], invMassB[0], invInertiaB[0], tangentDistanceB[0], vn);
          ///this.ApplyDamping(invMassA, invInertiaA, tangentDistanceA, true, aGroup, a, f, n);
          this.ApplyDamping(invMassA[0], invInertiaA[0], tangentDistanceA[0], true, aGroup, a, f, n);
          ///b.ApplyLinearImpulse(-f * n, p, true);
          b.ApplyLinearImpulse(b2Vec2.MulSV(-f, n, b2Vec2.s_t0), p, true);
        }
      }
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      const n = contact.normal;
      const w = contact.weight;
      const aGroup = this.m_groupBuffer[a];
      const bGroup = this.m_groupBuffer[b];
      const aRigid = this.IsRigidGroup(aGroup);
      const bRigid = this.IsRigidGroup(bGroup);
      if (aGroup !== bGroup && (aRigid || bRigid)) {
        ///b2Vec2 p = 0.5f * (this.m_positionBuffer.data[a] + this.m_positionBuffer.data[b]);
        const p = b2Vec2.MidVV(pos_data[a], pos_data[b], s_p);
        ///b2Vec2 v = GetLinearVelocity(bGroup, b, p) - GetLinearVelocity(aGroup, a, p);
        const v = b2Vec2.SubVV(this.GetLinearVelocity(bGroup, b, p, s_t0), this.GetLinearVelocity(aGroup, a, p, s_t1), s_v);
        const vn = b2Vec2.DotVV(v, n);
        if (vn < 0) {
          ///this.InitDampingParameterWithRigidGroupOrParticle(&invMassA, &invInertiaA, &tangentDistanceA, aRigid, aGroup, a, p, n);
          this.InitDampingParameterWithRigidGroupOrParticle(invMassA, invInertiaA, tangentDistanceA, aRigid, aGroup, a, p, n);
          ///this.InitDampingParameterWithRigidGroupOrParticle(&invMassB, &invInertiaB, &tangentDistanceB, bRigid, bGroup, b, p, n);
          this.InitDampingParameterWithRigidGroupOrParticle(invMassB, invInertiaB, tangentDistanceB, bRigid, bGroup, b, p, n);
          ///float32 f = damping * w * this.ComputeDampingImpulse(invMassA, invInertiaA, tangentDistanceA, invMassB, invInertiaB, tangentDistanceB, vn);
          const f = damping * w * this.ComputeDampingImpulse(invMassA[0], invInertiaA[0], tangentDistanceA[0], invMassB[0], invInertiaB[0], tangentDistanceB[0], vn);
          ///this.ApplyDamping(invMassA, invInertiaA, tangentDistanceA, aRigid, aGroup, a, f, n);
          this.ApplyDamping(invMassA[0], invInertiaA[0], tangentDistanceA[0], aRigid, aGroup, a, f, n);
          ///this.ApplyDamping(invMassB, invInertiaB, tangentDistanceB, bRigid, bGroup, b, -f, n);
          this.ApplyDamping(invMassB[0], invInertiaB[0], tangentDistanceB[0], bRigid, bGroup, b, -f, n);
        }
      }
    }
  }
  public static readonly SolveRigidDamping_s_t0 = new b2Vec2();
  public static readonly SolveRigidDamping_s_t1 = new b2Vec2();
  public static readonly SolveRigidDamping_s_p = new b2Vec2();
  public static readonly SolveRigidDamping_s_v = new b2Vec2();

  public SolveExtraDamping(): void {
    const s_v = b2ParticleSystem.SolveExtraDamping_s_v;
    const s_f = b2ParticleSystem.SolveExtraDamping_s_f;
    const vel_data = this.m_velocityBuffer.data;
    // Applies additional damping force between bodies and particles which can
    // produce strong repulsive force. Applying damping force multiple times
    // is effective in suppressing vibration.
    const pos_data = this.m_positionBuffer.data;
    const inv_mass = this.GetParticleInvMass();
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      if (this.m_flagsBuffer.data[a] & b2ParticleSystem.k_extraDampingFlags) {
        const b = contact.body;
        const m = contact.mass;
        const n = contact.normal;
        const p = pos_data[a];
        ///b2Vec2 v = b.GetLinearVelocityFromWorldPoint(p) - m_velocityBuffer.data[a];
        const v = b2Vec2.SubVV(b.GetLinearVelocityFromWorldPoint(p, b2Vec2.s_t0), vel_data[a], s_v);
        ///float32 vn = b2Dot(v, n);
        const vn = b2Vec2.DotVV(v, n);
        if (vn < 0) {
          ///b2Vec2 f = 0.5f * m * vn * n;
          const f = b2Vec2.MulSV(0.5 * m * vn, n, s_f);
          ///m_velocityBuffer.data[a] += GetParticleInvMass() * f;
          vel_data[a].SelfMulAdd(inv_mass, f);
          ///b.ApplyLinearImpulse(-f, p, true);
          b.ApplyLinearImpulse(f.SelfNeg(), p, true);
        }
      }
    }
  }
  public static readonly SolveExtraDamping_s_v = new b2Vec2();
  public static readonly SolveExtraDamping_s_f = new b2Vec2();

  public SolveWall(): void {
    const vel_data = this.m_velocityBuffer.data;
    for (let i = 0; i < this.m_count; i++) {
      if (this.m_flagsBuffer.data[i] & b2ParticleFlag.b2_wallParticle) {
        vel_data[i].SetZero();
      }
    }
  }

  public SolveRigid(step: b2TimeStep): void {
    const s_position = b2ParticleSystem.SolveRigid_s_position;
    const s_rotation = b2ParticleSystem.SolveRigid_s_rotation;
    const s_transform = b2ParticleSystem.SolveRigid_s_transform;
    const s_velocityTransform = b2ParticleSystem.SolveRigid_s_velocityTransform;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    for (let group = this.m_groupList; group; group = group.GetNext()) {
      if (group.m_groupFlags & b2ParticleGroupFlag.b2_rigidParticleGroup) {
        group.UpdateStatistics();
        ///b2Rot rotation(step.dt * group.m_angularVelocity);
        const rotation = s_rotation;
        rotation.SetAngle(step.dt * group.m_angularVelocity);
        ///b2Transform transform(group.m_center + step.dt * group.m_linearVelocity - b2Mul(rotation, group.m_center), rotation);
        const position = b2Vec2.AddVV(
          group.m_center,
          b2Vec2.SubVV(
            b2Vec2.MulSV(step.dt, group.m_linearVelocity, b2Vec2.s_t0),
            b2Rot.MulRV(rotation, group.m_center, b2Vec2.s_t1),
            b2Vec2.s_t0),
          s_position);
        const transform = s_transform;
        transform.SetPositionRotation(position, rotation);
        ///group.m_transform = b2Mul(transform, group.m_transform);
        b2Transform.MulXX(transform, group.m_transform, group.m_transform);
        const velocityTransform = s_velocityTransform;
        velocityTransform.p.x = step.inv_dt * transform.p.x;
        velocityTransform.p.y = step.inv_dt * transform.p.y;
        velocityTransform.q.s = step.inv_dt * transform.q.s;
        velocityTransform.q.c = step.inv_dt * (transform.q.c - 1);
        for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
          ///m_velocityBuffer.data[i] = b2Mul(velocityTransform, m_positionBuffer.data[i]);
          b2Transform.MulXV(velocityTransform, pos_data[i], vel_data[i]);
        }
      }
    }
  }
  public static readonly SolveRigid_s_position = new b2Vec2();
  public static readonly SolveRigid_s_rotation = new b2Rot();
  public static readonly SolveRigid_s_transform = new b2Transform();
  public static readonly SolveRigid_s_velocityTransform = new b2Transform();

  public SolveElastic(step: b2TimeStep): void {
    const s_pa = b2ParticleSystem.SolveElastic_s_pa;
    const s_pb = b2ParticleSystem.SolveElastic_s_pb;
    const s_pc = b2ParticleSystem.SolveElastic_s_pc;
    const s_r = b2ParticleSystem.SolveElastic_s_r;
    const s_t0 = b2ParticleSystem.SolveElastic_s_t0;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    const elasticStrength = step.inv_dt * this.m_def.elasticStrength;
    for (let k = 0; k < this.m_triadBuffer.count; k++) {
      const triad = this.m_triadBuffer.data[k];
      if (triad.flags & b2ParticleFlag.b2_elasticParticle) {
        const a = triad.indexA;
        const b = triad.indexB;
        const c = triad.indexC;
        const oa = triad.pa;
        const ob = triad.pb;
        const oc = triad.pc;
        ///b2Vec2 pa = m_positionBuffer.data[a];
        const pa = s_pa.Copy(pos_data[a]);
        ///b2Vec2 pb = m_positionBuffer.data[b];
        const pb = s_pb.Copy(pos_data[b]);
        ///b2Vec2 pc = m_positionBuffer.data[c];
        const pc = s_pc.Copy(pos_data[c]);
        const va = vel_data[a];
        const vb = vel_data[b];
        const vc = vel_data[c];
        ///pa += step.dt * va;
        pa.SelfMulAdd(step.dt, va);
        ///pb += step.dt * vb;
        pb.SelfMulAdd(step.dt, vb);
        ///pc += step.dt * vc;
        pc.SelfMulAdd(step.dt, vc);
        ///b2Vec2 midPoint = (float32) 1 / 3 * (pa + pb + pc);
        const midPoint_x = (pa.x + pb.x + pc.x) / 3.0;
        const midPoint_y = (pa.y + pb.y + pc.y) / 3.0;
        ///pa -= midPoint;
        pa.x -= midPoint_x;
        pa.y -= midPoint_y;
        ///pb -= midPoint;
        pb.x -= midPoint_x;
        pb.y -= midPoint_y;
        ///pc -= midPoint;
        pc.x -= midPoint_x;
        pc.y -= midPoint_y;
        ///b2Rot r;
        const r = s_r;
        r.s = b2Vec2.CrossVV(oa, pa) + b2Vec2.CrossVV(ob, pb) + b2Vec2.CrossVV(oc, pc);
        r.c = b2Vec2.DotVV(oa, pa) + b2Vec2.DotVV(ob, pb) + b2Vec2.DotVV(oc, pc);
        const r2 = r.s * r.s + r.c * r.c;
        let invR = b2InvSqrt(r2);
        if (!isFinite(invR)) {
          invR = 1.98177537e+019;
        }
        r.s *= invR;
        r.c *= invR;
        ///r.angle = Math.atan2(r.s, r.c); // TODO: optimize
        const strength = elasticStrength * triad.strength;
        ///va += strength * (b2Mul(r, oa) - pa);
        b2Rot.MulRV(r, oa, s_t0);
        b2Vec2.SubVV(s_t0, pa, s_t0);
        b2Vec2.MulSV(strength, s_t0, s_t0);
        va.SelfAdd(s_t0);
        ///vb += strength * (b2Mul(r, ob) - pb);
        b2Rot.MulRV(r, ob, s_t0);
        b2Vec2.SubVV(s_t0, pb, s_t0);
        b2Vec2.MulSV(strength, s_t0, s_t0);
        vb.SelfAdd(s_t0);
        ///vc += strength * (b2Mul(r, oc) - pc);
        b2Rot.MulRV(r, oc, s_t0);
        b2Vec2.SubVV(s_t0, pc, s_t0);
        b2Vec2.MulSV(strength, s_t0, s_t0);
        vc.SelfAdd(s_t0);
      }
    }
  }
  public static readonly SolveElastic_s_pa = new b2Vec2();
  public static readonly SolveElastic_s_pb = new b2Vec2();
  public static readonly SolveElastic_s_pc = new b2Vec2();
  public static readonly SolveElastic_s_r = new b2Rot();
  public static readonly SolveElastic_s_t0 = new b2Vec2();

  public SolveSpring(step: b2TimeStep): void {
    const s_pa = b2ParticleSystem.SolveSpring_s_pa;
    const s_pb = b2ParticleSystem.SolveSpring_s_pb;
    const s_d = b2ParticleSystem.SolveSpring_s_d;
    const s_f = b2ParticleSystem.SolveSpring_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    const springStrength = step.inv_dt * this.m_def.springStrength;
    for (let k = 0; k < this.m_pairBuffer.count; k++) {
      const pair = this.m_pairBuffer.data[k];
      if (pair.flags & b2ParticleFlag.b2_springParticle) {
        ///int32 a = pair.indexA;
        const a = pair.indexA;
        ///int32 b = pair.indexB;
        const b = pair.indexB;
        ///b2Vec2 pa = m_positionBuffer.data[a];
        const pa = s_pa.Copy(pos_data[a]);
        ///b2Vec2 pb = m_positionBuffer.data[b];
        const pb = s_pb.Copy(pos_data[b]);
        ///b2Vec2& va = m_velocityBuffer.data[a];
        const va = vel_data[a];
        ///b2Vec2& vb = m_velocityBuffer.data[b];
        const vb = vel_data[b];
        ///pa += step.dt * va;
        pa.SelfMulAdd(step.dt, va);
        ///pb += step.dt * vb;
        pb.SelfMulAdd(step.dt, vb);
        ///b2Vec2 d = pb - pa;
        const d = b2Vec2.SubVV(pb, pa, s_d);
        ///float32 r0 = pair.distance;
        const r0 = pair.distance;
        ///float32 r1 = d.Length();
        const r1 = d.Length();
        ///float32 strength = springStrength * pair.strength;
        const strength = springStrength * pair.strength;
        ///b2Vec2 f = strength * (r0 - r1) / r1 * d;
        const f = b2Vec2.MulSV(strength * (r0 - r1) / r1, d, s_f);
        ///va -= f;
        va.SelfSub(f);
        ///vb += f;
        vb.SelfAdd(f);
      }
    }
  }
  public static readonly SolveSpring_s_pa = new b2Vec2();
  public static readonly SolveSpring_s_pb = new b2Vec2();
  public static readonly SolveSpring_s_d = new b2Vec2();
  public static readonly SolveSpring_s_f = new b2Vec2();

  public SolveTensile(step: b2TimeStep): void {
    const s_weightedNormal = b2ParticleSystem.SolveTensile_s_weightedNormal;
    const s_s = b2ParticleSystem.SolveTensile_s_s;
    const s_f = b2ParticleSystem.SolveTensile_s_f;
    const vel_data = this.m_velocityBuffer.data;
    // DEBUG: b2Assert(this.m_accumulation2Buffer !== null);
    for (let i = 0; i < this.m_count; i++) {
      this.m_accumulation2Buffer[i] = new b2Vec2();
      this.m_accumulation2Buffer[i].SetZero();
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      if (contact.flags & b2ParticleFlag.b2_tensileParticle) {
        const a = contact.indexA;
        const b = contact.indexB;
        const w = contact.weight;
        const n = contact.normal;
        ///b2Vec2 weightedNormal = (1 - w) * w * n;
        const weightedNormal = b2Vec2.MulSV((1 - w) * w, n, s_weightedNormal);
        ///m_accumulation2Buffer[a] -= weightedNormal;
        this.m_accumulation2Buffer[a].SelfSub(weightedNormal);
        ///m_accumulation2Buffer[b] += weightedNormal;
        this.m_accumulation2Buffer[b].SelfAdd(weightedNormal);
      }
    }
    const criticalVelocity = this.GetCriticalVelocity(step);
    const pressureStrength = this.m_def.surfaceTensionPressureStrength * criticalVelocity;
    const normalStrength = this.m_def.surfaceTensionNormalStrength * criticalVelocity;
    const maxVelocityVariation = b2_maxParticleForce * criticalVelocity;
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      if (contact.flags & b2ParticleFlag.b2_tensileParticle) {
        const a = contact.indexA;
        const b = contact.indexB;
        const w = contact.weight;
        const n = contact.normal;
        const h = this.m_weightBuffer[a] + this.m_weightBuffer[b];
        ///b2Vec2 s = m_accumulation2Buffer[b] - m_accumulation2Buffer[a];
        const s = b2Vec2.SubVV(this.m_accumulation2Buffer[b], this.m_accumulation2Buffer[a], s_s);
        const fn = b2Min(
          pressureStrength * (h - 2) + normalStrength * b2Vec2.DotVV(s, n),
          maxVelocityVariation) * w;
        ///b2Vec2 f = fn * n;
        const f = b2Vec2.MulSV(fn, n, s_f);
        ///m_velocityBuffer.data[a] -= f;
        vel_data[a].SelfSub(f);
        ///m_velocityBuffer.data[b] += f;
        vel_data[b].SelfAdd(f);
      }
    }
  }
  public static readonly SolveTensile_s_weightedNormal = new b2Vec2();
  public static readonly SolveTensile_s_s = new b2Vec2();
  public static readonly SolveTensile_s_f = new b2Vec2();

  public SolveViscous(): void {
    const s_v = b2ParticleSystem.SolveViscous_s_v;
    const s_f = b2ParticleSystem.SolveViscous_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    const viscousStrength = this.m_def.viscousStrength;
    const inv_mass = this.GetParticleInvMass();
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      if (this.m_flagsBuffer.data[a] & b2ParticleFlag.b2_viscousParticle) {
        const b = contact.body;
        const w = contact.weight;
        const m = contact.mass;
        const p = pos_data[a];
        ///b2Vec2 v = b.GetLinearVelocityFromWorldPoint(p) - m_velocityBuffer.data[a];
        const v = b2Vec2.SubVV(b.GetLinearVelocityFromWorldPoint(p, b2Vec2.s_t0), vel_data[a], s_v);
        ///b2Vec2 f = viscousStrength * m * w * v;
        const f = b2Vec2.MulSV(viscousStrength * m * w, v, s_f);
        ///m_velocityBuffer.data[a] += GetParticleInvMass() * f;
        vel_data[a].SelfMulAdd(inv_mass, f);
        ///b.ApplyLinearImpulse(-f, p, true);
        b.ApplyLinearImpulse(f.SelfNeg(), p, true);
      }
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      if (contact.flags & b2ParticleFlag.b2_viscousParticle) {
        const a = contact.indexA;
        const b = contact.indexB;
        const w = contact.weight;
        ///b2Vec2 v = m_velocityBuffer.data[b] - m_velocityBuffer.data[a];
        const v = b2Vec2.SubVV(vel_data[b], vel_data[a], s_v);
        ///b2Vec2 f = viscousStrength * w * v;
        const f = b2Vec2.MulSV(viscousStrength * w, v, s_f);
        ///m_velocityBuffer.data[a] += f;
        vel_data[a].SelfAdd(f);
        ///m_velocityBuffer.data[b] -= f;
        vel_data[b].SelfSub(f);
      }
    }
  }
  public static readonly SolveViscous_s_v = new b2Vec2();
  public static readonly SolveViscous_s_f = new b2Vec2();

  public SolveRepulsive(step: b2TimeStep): void {
    const s_f = b2ParticleSystem.SolveRepulsive_s_f;
    const vel_data = this.m_velocityBuffer.data;
    const repulsiveStrength = this.m_def.repulsiveStrength * this.GetCriticalVelocity(step);
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      if (contact.flags & b2ParticleFlag.b2_repulsiveParticle) {
        const a = contact.indexA;
        const b = contact.indexB;
        if (this.m_groupBuffer[a] !== this.m_groupBuffer[b]) {
          const w = contact.weight;
          const n = contact.normal;
          ///b2Vec2 f = repulsiveStrength * w * n;
          const f = b2Vec2.MulSV(repulsiveStrength * w, n, s_f);
          ///m_velocityBuffer.data[a] -= f;
          vel_data[a].SelfSub(f);
          ///m_velocityBuffer.data[b] += f;
          vel_data[b].SelfAdd(f);
        }
      }
    }
  }
  public static readonly SolveRepulsive_s_f = new b2Vec2();

  public SolvePowder(step: b2TimeStep): void {
    const s_f = b2ParticleSystem.SolvePowder_s_f;
    const pos_data = this.m_positionBuffer.data;
    const vel_data = this.m_velocityBuffer.data;
    const powderStrength = this.m_def.powderStrength * this.GetCriticalVelocity(step);
    const minWeight = 1.0 - b2_particleStride;
    const inv_mass = this.GetParticleInvMass();
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      const a = contact.index;
      if (this.m_flagsBuffer.data[a] & b2ParticleFlag.b2_powderParticle) {
        const w = contact.weight;
        if (w > minWeight) {
          const b = contact.body;
          const m = contact.mass;
          const p = pos_data[a];
          const n = contact.normal;
          const f = b2Vec2.MulSV(powderStrength * m * (w - minWeight), n, s_f);
          vel_data[a].SelfMulSub(inv_mass, f);
          b.ApplyLinearImpulse(f, p, true);
        }
      }
    }
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      if (contact.flags & b2ParticleFlag.b2_powderParticle) {
        const w = contact.weight;
        if (w > minWeight) {
          const a = contact.indexA;
          const b = contact.indexB;
          const n = contact.normal;
          const f = b2Vec2.MulSV(powderStrength * (w - minWeight), n, s_f);
          vel_data[a].SelfSub(f);
          vel_data[b].SelfAdd(f);
        }
      }
    }
  }
  public static readonly SolvePowder_s_f = new b2Vec2();

  public SolveSolid(step: b2TimeStep): void {
    const s_f = b2ParticleSystem.SolveSolid_s_f;
    const vel_data = this.m_velocityBuffer.data;
    // applies extra repulsive force from solid particle groups
    this.m_depthBuffer = this.RequestBuffer(this.m_depthBuffer);
    const ejectionStrength = step.inv_dt * this.m_def.ejectionStrength;
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      const a = contact.indexA;
      const b = contact.indexB;
      if (this.m_groupBuffer[a] !== this.m_groupBuffer[b]) {
        const w = contact.weight;
        const n = contact.normal;
        const h = this.m_depthBuffer[a] + this.m_depthBuffer[b];
        const f = b2Vec2.MulSV(ejectionStrength * h * w, n, s_f);
        vel_data[a].SelfSub(f);
        vel_data[b].SelfAdd(f);
      }
    }
  }
  public static readonly SolveSolid_s_f = new b2Vec2();

  public SolveForce(step: b2TimeStep): void {
    const vel_data = this.m_velocityBuffer.data;
    const velocityPerForce = step.dt * this.GetParticleInvMass();
    for (let i = 0; i < this.m_count; i++) {
      ///m_velocityBuffer.data[i] += velocityPerForce * m_forceBuffer[i];
      vel_data[i].SelfMulAdd(velocityPerForce, this.m_forceBuffer[i]);
    }
    this.m_hasForce = false;
  }

  public SolveColorMixing(): void {
    // mixes color between contacting particles
    const colorMixing = 0.5 * this.m_def.colorMixingStrength;
    if (colorMixing) {
      for (let k = 0; k < this.m_contactBuffer.count; k++) {
        const contact = this.m_contactBuffer.data[k];
        const a = contact.indexA;
        const b = contact.indexB;
        if (this.m_flagsBuffer.data[a] & this.m_flagsBuffer.data[b] &
          b2ParticleFlag.b2_colorMixingParticle) {
          const colorA = this.m_colorBuffer.data[a];
          const colorB = this.m_colorBuffer.data[b];
          // Use the static method to ensure certain compilers inline
          // this correctly.
          b2Color.MixColors(colorA, colorB, colorMixing);
        }
      }
    }
  }

  public SolveZombie(): void {
    // removes particles with zombie flag
    let newCount = 0;
    const newIndices: number[] = []; // TODO: static
    for (let i = 0; i < this.m_count; i++) {
      newIndices[i] = b2_invalidParticleIndex;
    }
    // DEBUG: b2Assert(newIndices.length === this.m_count);
    let allParticleFlags = 0;
    for (let i = 0; i < this.m_count; i++) {
      const flags = this.m_flagsBuffer.data[i];
      if (flags & b2ParticleFlag.b2_zombieParticle) {
        const destructionListener = this.m_world.m_destructionListener;
        if ((flags & b2ParticleFlag.b2_destructionListenerParticle) && destructionListener) {
          destructionListener.SayGoodbyeParticle(this, i);
        }
        // Destroy particle handle.
        if (this.m_handleIndexBuffer.data) {
          const handle = this.m_handleIndexBuffer.data[i];
          if (handle) {
            handle.SetIndex(b2_invalidParticleIndex);
            this.m_handleIndexBuffer.data[i] = null;
            ///m_handleAllocator.Free(handle);
          }
        }
        newIndices[i] = b2_invalidParticleIndex;
      } else {
        newIndices[i] = newCount;
        if (i !== newCount) {
          // Update handle to reference new particle index.
          if (this.m_handleIndexBuffer.data) {
            const handle = this.m_handleIndexBuffer.data[i];
            if (handle) { handle.SetIndex(newCount); }
            this.m_handleIndexBuffer.data[newCount] = handle;
          }
          this.m_flagsBuffer.data[newCount] = this.m_flagsBuffer.data[i];
          if (this.m_lastBodyContactStepBuffer.data) {
            this.m_lastBodyContactStepBuffer.data[newCount] = this.m_lastBodyContactStepBuffer.data[i];
          }
          if (this.m_bodyContactCountBuffer.data) {
            this.m_bodyContactCountBuffer.data[newCount] = this.m_bodyContactCountBuffer.data[i];
          }
          if (this.m_consecutiveContactStepsBuffer.data) {
            this.m_consecutiveContactStepsBuffer.data[newCount] = this.m_consecutiveContactStepsBuffer.data[i];
          }
          this.m_positionBuffer.data[newCount].Copy(this.m_positionBuffer.data[i]);
          this.m_velocityBuffer.data[newCount].Copy(this.m_velocityBuffer.data[i]);
          this.m_groupBuffer[newCount] = this.m_groupBuffer[i];
          if (this.m_hasForce) {
            this.m_forceBuffer[newCount].Copy(this.m_forceBuffer[i]);
          }
          if (this.m_staticPressureBuffer) {
            this.m_staticPressureBuffer[newCount] = this.m_staticPressureBuffer[i];
          }
          if (this.m_depthBuffer) {
            this.m_depthBuffer[newCount] = this.m_depthBuffer[i];
          }
          if (this.m_colorBuffer.data) {
            this.m_colorBuffer.data[newCount].Copy(this.m_colorBuffer.data[i]);
          }
          if (this.m_userDataBuffer.data) {
            this.m_userDataBuffer.data[newCount] = this.m_userDataBuffer.data[i];
          }
          if (this.m_expirationTimeBuffer.data) {
            this.m_expirationTimeBuffer.data[newCount] = this.m_expirationTimeBuffer.data[i];
          }
        }
        newCount++;
        allParticleFlags |= flags;
      }
    }

    // predicate functions
    const Test = {
      ///static bool IsProxyInvalid(const Proxy& proxy)
      IsProxyInvalid: (proxy: b2ParticleSystem_Proxy) => {
        return proxy.index < 0;
      },
      ///static bool IsContactInvalid(const b2ParticleContact& contact)
      IsContactInvalid: (contact: b2ParticleContact) => {
        return contact.indexA < 0 || contact.indexB < 0;
      },
      ///static bool IsBodyContactInvalid(const b2ParticleBodyContact& contact)
      IsBodyContactInvalid: (contact: b2ParticleBodyContact) => {
        return contact.index < 0;
      },
      ///static bool IsPairInvalid(const b2ParticlePair& pair)
      IsPairInvalid: (pair: b2ParticlePair) => {
        return pair.indexA < 0 || pair.indexB < 0;
      },
      ///static bool IsTriadInvalid(const b2ParticleTriad& triad)
      IsTriadInvalid: (triad: b2ParticleTriad) => {
        return triad.indexA < 0 || triad.indexB < 0 || triad.indexC < 0;
      },
    };

    // update proxies
    for (let k = 0; k < this.m_proxyBuffer.count; k++) {
      const proxy = this.m_proxyBuffer.data[k];
      proxy.index = newIndices[proxy.index];
    }
    this.m_proxyBuffer.RemoveIf(Test.IsProxyInvalid);

    // update contacts
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      contact.indexA = newIndices[contact.indexA];
      contact.indexB = newIndices[contact.indexB];
    }
    this.m_contactBuffer.RemoveIf(Test.IsContactInvalid);

    // update particle-body contacts
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      contact.index = newIndices[contact.index];
    }
    this.m_bodyContactBuffer.RemoveIf(Test.IsBodyContactInvalid);

    // update pairs
    for (let k = 0; k < this.m_pairBuffer.count; k++) {
      const pair = this.m_pairBuffer.data[k];
      pair.indexA = newIndices[pair.indexA];
      pair.indexB = newIndices[pair.indexB];
    }
    this.m_pairBuffer.RemoveIf(Test.IsPairInvalid);

    // update triads
    for (let k = 0; k < this.m_triadBuffer.count; k++) {
      const triad = this.m_triadBuffer.data[k];
      triad.indexA = newIndices[triad.indexA];
      triad.indexB = newIndices[triad.indexB];
      triad.indexC = newIndices[triad.indexC];
    }
    this.m_triadBuffer.RemoveIf(Test.IsTriadInvalid);

    // Update lifetime indices.
    if (this.m_indexByExpirationTimeBuffer.data) {
      let writeOffset = 0;
      for (let readOffset = 0; readOffset < this.m_count; readOffset++) {
        const newIndex = newIndices[this.m_indexByExpirationTimeBuffer.data[readOffset]];
        if (newIndex !== b2_invalidParticleIndex) {
          this.m_indexByExpirationTimeBuffer.data[writeOffset++] = newIndex;
        }
      }
    }

    // update groups
    for (let group = this.m_groupList; group; group = group.GetNext()) {
      let firstIndex = newCount;
      let lastIndex = 0;
      let modified = false;
      for (let i = group.m_firstIndex; i < group.m_lastIndex; i++) {
        const j = newIndices[i];
        if (j >= 0) {
          firstIndex = b2Min(firstIndex, j);
          lastIndex = b2Max(lastIndex, j + 1);
        } else {
          modified = true;
        }
      }
      if (firstIndex < lastIndex) {
        group.m_firstIndex = firstIndex;
        group.m_lastIndex = lastIndex;
        if (modified) {
          if (group.m_groupFlags & b2ParticleGroupFlag.b2_solidParticleGroup) {
            this.SetGroupFlags(group, group.m_groupFlags | b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth);
          }
        }
      } else {
        group.m_firstIndex = 0;
        group.m_lastIndex = 0;
        if (!(group.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupCanBeEmpty)) {
          this.SetGroupFlags(group, group.m_groupFlags | b2ParticleGroupFlag.b2_particleGroupWillBeDestroyed);
        }
      }
    }

    // update particle count
    this.m_count = newCount;
    this.m_allParticleFlags = allParticleFlags;
    this.m_needsUpdateAllParticleFlags = false;

    // destroy bodies with no particles
    for (let group = this.m_groupList; group; ) {
      const next = group.GetNext();
      if (group.m_groupFlags & b2ParticleGroupFlag.b2_particleGroupWillBeDestroyed) {
        this.DestroyParticleGroup(group);
      }
      group = next;
    }
  }

  /**
   * Destroy all particles which have outlived their lifetimes set
   * by SetParticleLifetime().
   */
  public SolveLifetimes(step: b2TimeStep): void {
    // Update the time elapsed.
    this.m_timeElapsed = this.LifetimeToExpirationTime(step.dt);
    // Get the floor (non-fractional component) of the elapsed time.
    const quantizedTimeElapsed = this.GetQuantizedTimeElapsed();

    const expirationTimes = this.m_expirationTimeBuffer.data;
    const expirationTimeIndices = this.m_indexByExpirationTimeBuffer.data;
    const particleCount = this.GetParticleCount();
    // Sort the lifetime buffer if it's required.
    if (this.m_expirationTimeBufferRequiresSorting) {
      ///const ExpirationTimeComparator expirationTimeComparator(expirationTimes);
      ///std::sort(expirationTimeIndices, expirationTimeIndices + particleCount, expirationTimeComparator);

      /**
       * Compare the lifetime of particleIndexA and particleIndexB
       * returning true if the lifetime of A is greater than B for
       * particles that will expire.  If either particle's lifetime is
       * infinite (<= 0.0f) this function return true if the lifetime
       * of A is lesser than B. When used with std::sort() this
       * results in an array of particle indicies sorted in reverse
       * order by particle lifetime.
       *
       * For example, the set of lifetimes
       * (1.0, 0.7, 0.3, 0.0, -1.0, 2.0)
       * would be sorted as
       * (0.0, 1.0, -2.0, 1.0, 0.7, 0.3)
       */
      const ExpirationTimeComparator = (particleIndexA: number, particleIndexB: number): boolean => {
        const expirationTimeA = expirationTimes[particleIndexA];
        const expirationTimeB = expirationTimes[particleIndexB];
        const infiniteExpirationTimeA = expirationTimeA <= 0.0;
        const infiniteExpirationTimeB = expirationTimeB <= 0.0;
        return infiniteExpirationTimeA === infiniteExpirationTimeB ?
          expirationTimeA > expirationTimeB : infiniteExpirationTimeA;
      };

      std_sort(expirationTimeIndices, 0, particleCount, ExpirationTimeComparator);

      this.m_expirationTimeBufferRequiresSorting = false;
    }

    // Destroy particles which have expired.
    for (let i = particleCount - 1; i >= 0; --i) {
      const particleIndex = expirationTimeIndices[i];
      const expirationTime = expirationTimes[particleIndex];
      // If no particles need to be destroyed, skip this.
      if (quantizedTimeElapsed < expirationTime || expirationTime <= 0) {
        break;
      }
      // Destroy this particle.
      this.DestroyParticle(particleIndex);
    }
  }

  public RotateBuffer(start: number, mid: number, end: number): void {
    // move the particles assigned to the given group toward the end of array
    if (start === mid || mid === end) {
      return;
    }
    // DEBUG: b2Assert(mid >= start && mid <= end);

    function newIndices(i: number): number {
      if (i < start) {
        return i;
      } else if (i < mid) {
        return i + end - mid;
      } else if (i < end) {
        return i + start - mid;
      } else {
        return i;
      }
    }

    ///std::rotate(m_flagsBuffer.data + start, m_flagsBuffer.data + mid, m_flagsBuffer.data + end);
    std_rotate(this.m_flagsBuffer.data, start, mid, end);
    if (this.m_lastBodyContactStepBuffer.data) {
      ///std::rotate(m_lastBodyContactStepBuffer.data + start, m_lastBodyContactStepBuffer.data + mid, m_lastBodyContactStepBuffer.data + end);
      std_rotate(this.m_lastBodyContactStepBuffer.data, start, mid, end);
    }
    if (this.m_bodyContactCountBuffer.data) {
      ///std::rotate(m_bodyContactCountBuffer.data + start, m_bodyContactCountBuffer.data + mid, m_bodyContactCountBuffer.data + end);
      std_rotate(this.m_bodyContactCountBuffer.data, start, mid, end);
    }
    if (this.m_consecutiveContactStepsBuffer.data) {
      ///std::rotate(m_consecutiveContactStepsBuffer.data + start, m_consecutiveContactStepsBuffer.data + mid, m_consecutiveContactStepsBuffer.data + end);
      std_rotate(this.m_consecutiveContactStepsBuffer.data, start, mid, end);
    }
    ///std::rotate(m_positionBuffer.data + start, m_positionBuffer.data + mid, m_positionBuffer.data + end);
    std_rotate(this.m_positionBuffer.data, start, mid, end);
    ///std::rotate(m_velocityBuffer.data + start, m_velocityBuffer.data + mid, m_velocityBuffer.data + end);
    std_rotate(this.m_velocityBuffer.data, start, mid, end);
    ///std::rotate(m_groupBuffer + start, m_groupBuffer + mid, m_groupBuffer + end);
    std_rotate(this.m_groupBuffer, start, mid, end);
    if (this.m_hasForce) {
      ///std::rotate(m_forceBuffer + start, m_forceBuffer + mid, m_forceBuffer + end);
      std_rotate(this.m_forceBuffer, start, mid, end);
    }
    if (this.m_staticPressureBuffer) {
      ///std::rotate(m_staticPressureBuffer + start, m_staticPressureBuffer + mid, m_staticPressureBuffer + end);
      std_rotate(this.m_staticPressureBuffer, start, mid, end);
    }
    if (this.m_depthBuffer) {
      ///std::rotate(m_depthBuffer + start, m_depthBuffer + mid, m_depthBuffer + end);
      std_rotate(this.m_depthBuffer, start, mid, end);
    }
    if (this.m_colorBuffer.data) {
      ///std::rotate(m_colorBuffer.data + start, m_colorBuffer.data + mid, m_colorBuffer.data + end);
      std_rotate(this.m_colorBuffer.data, start, mid, end);
    }
    if (this.m_userDataBuffer.data) {
      ///std::rotate(m_userDataBuffer.data + start, m_userDataBuffer.data + mid, m_userDataBuffer.data + end);
      std_rotate(this.m_userDataBuffer.data, start, mid, end);
    }

    // Update handle indices.
    if (this.m_handleIndexBuffer.data) {
      ///std::rotate(m_handleIndexBuffer.data + start, m_handleIndexBuffer.data + mid, m_handleIndexBuffer.data + end);
      std_rotate(this.m_handleIndexBuffer.data, start, mid, end);
      for (let i = start; i < end; ++i) {
        const handle = this.m_handleIndexBuffer.data[i];
        if (handle) { handle.SetIndex(newIndices(handle.GetIndex())); }
      }
    }

    if (this.m_expirationTimeBuffer.data) {
      ///std::rotate(m_expirationTimeBuffer.data + start, m_expirationTimeBuffer.data + mid, m_expirationTimeBuffer.data + end);
      std_rotate(this.m_expirationTimeBuffer.data, start, mid, end);
      // Update expiration time buffer indices.
      const particleCount = this.GetParticleCount();
      const indexByExpirationTime = this.m_indexByExpirationTimeBuffer.data;
      for (let i = 0; i < particleCount; ++i) {
        indexByExpirationTime[i] = newIndices(indexByExpirationTime[i]);
      }
    }

    // update proxies
    for (let k = 0; k < this.m_proxyBuffer.count; k++) {
      const proxy = this.m_proxyBuffer.data[k];
      proxy.index = newIndices(proxy.index);
    }

    // update contacts
    for (let k = 0; k < this.m_contactBuffer.count; k++) {
      const contact = this.m_contactBuffer.data[k];
      contact.indexA = newIndices(contact.indexA);
      contact.indexB = newIndices(contact.indexB);
    }

    // update particle-body contacts
    for (let k = 0; k < this.m_bodyContactBuffer.count; k++) {
      const contact = this.m_bodyContactBuffer.data[k];
      contact.index = newIndices(contact.index);
    }

    // update pairs
    for (let k = 0; k < this.m_pairBuffer.count; k++) {
      const pair = this.m_pairBuffer.data[k];
      pair.indexA = newIndices(pair.indexA);
      pair.indexB = newIndices(pair.indexB);
    }

    // update triads
    for (let k = 0; k < this.m_triadBuffer.count; k++) {
      const triad = this.m_triadBuffer.data[k];
      triad.indexA = newIndices(triad.indexA);
      triad.indexB = newIndices(triad.indexB);
      triad.indexC = newIndices(triad.indexC);
    }

    // update groups
    for (let group = this.m_groupList; group; group = group.GetNext()) {
      group.m_firstIndex = newIndices(group.m_firstIndex);
      group.m_lastIndex = newIndices(group.m_lastIndex - 1) + 1;
    }
  }

  public GetCriticalVelocity(step: b2TimeStep): number {
    return this.m_particleDiameter * step.inv_dt;
  }

  public GetCriticalVelocitySquared(step: b2TimeStep): number {
    const velocity = this.GetCriticalVelocity(step);
    return velocity * velocity;
  }

  public GetCriticalPressure(step: b2TimeStep): number {
    return this.m_def.density * this.GetCriticalVelocitySquared(step);
  }

  public GetParticleStride(): number {
    return b2_particleStride * this.m_particleDiameter;
  }

  public GetParticleMass(): number {
    const stride = this.GetParticleStride();
    return this.m_def.density * stride * stride;
  }

  public GetParticleInvMass(): number {
    ///return 1.777777 * this.m_inverseDensity * this.m_inverseDiameter * this.m_inverseDiameter;
    // mass = density * stride^2, so we take the inverse of this.
    const inverseStride = this.m_inverseDiameter * (1.0 / b2_particleStride);
    return this.m_inverseDensity * inverseStride * inverseStride;
  }

  /**
   * Get the world's contact filter if any particles with the
   * b2_contactFilterParticle flag are present in the system.
   */
  public GetFixtureContactFilter(): b2ContactFilter | null {
    return (this.m_allParticleFlags & b2ParticleFlag.b2_fixtureContactFilterParticle) ?
      this.m_world.m_contactManager.m_contactFilter : null;
  }

  /**
   * Get the world's contact filter if any particles with the
   * b2_particleContactFilterParticle flag are present in the
   * system.
   */
  public GetParticleContactFilter(): b2ContactFilter | null {
    return (this.m_allParticleFlags & b2ParticleFlag.b2_particleContactFilterParticle) ?
      this.m_world.m_contactManager.m_contactFilter : null;
  }

  /**
   * Get the world's contact listener if any particles with the
   * b2_fixtureContactListenerParticle flag are present in the
   * system.
   */
  public GetFixtureContactListener(): b2ContactListener | null {
    return (this.m_allParticleFlags & b2ParticleFlag.b2_fixtureContactListenerParticle) ?
      this.m_world.m_contactManager.m_contactListener : null;
  }

  /**
   * Get the world's contact listener if any particles with the
   * b2_particleContactListenerParticle flag are present in the
   * system.
   */
  public GetParticleContactListener(): b2ContactListener | null {
    return (this.m_allParticleFlags & b2ParticleFlag.b2_particleContactListenerParticle) ?
      this.m_world.m_contactManager.m_contactListener : null;
  }

  public SetUserOverridableBuffer<T>(buffer: b2ParticleSystem_UserOverridableBuffer<T>, data: T[]): void {
    buffer.data = data;
    buffer.userSuppliedCapacity = data.length;
  }

  public SetGroupFlags(group: b2ParticleGroup, newFlags: b2ParticleGroupFlag): void {
    const oldFlags = group.m_groupFlags;
    if ((oldFlags ^ newFlags) & b2ParticleGroupFlag.b2_solidParticleGroup) {
      // If the b2_solidParticleGroup flag changed schedule depth update.
      newFlags |= b2ParticleGroupFlag.b2_particleGroupNeedsUpdateDepth;
    }
    if (oldFlags & ~newFlags) {
      // If any flags might be removed
      this.m_needsUpdateAllGroupFlags = true;
    }
    if (~this.m_allGroupFlags & newFlags) {
      // If any flags were added
      if (newFlags & b2ParticleGroupFlag.b2_solidParticleGroup) {
        this.m_depthBuffer = this.RequestBuffer(this.m_depthBuffer);
      }
      this.m_allGroupFlags |= newFlags;
    }
    group.m_groupFlags = newFlags;
  }

  public static BodyContactCompare(lhs: b2ParticleBodyContact, rhs: b2ParticleBodyContact): boolean {
    if (lhs.index === rhs.index) {
      // Subsort by weight, decreasing.
      return lhs.weight > rhs.weight;
    }
    return lhs.index < rhs.index;
  }

  public RemoveSpuriousBodyContacts(): void {
    // At this point we have a list of contact candidates based on AABB
    // overlap.The AABB query that  generated this returns all collidable
    // fixtures overlapping particle bounding boxes.  This breaks down around
    // vertices where two shapes intersect, such as a "ground" surface made
    // of multiple b2PolygonShapes; it potentially applies a lot of spurious
    // impulses from normals that should not actually contribute.  See the
    // Ramp example in Testbed.
    //
    // To correct for this, we apply this algorithm:
    //   * sort contacts by particle and subsort by weight (nearest to farthest)
    //   * for each contact per particle:
    //      - project a point at the contact distance along the inverse of the
    //        contact normal
    //      - if this intersects the fixture that generated the contact, apply
    //         it, otherwise discard as impossible
    //      - repeat for up to n nearest contacts, currently we get good results
    //        from n=3.
    ///std::sort(m_bodyContactBuffer.Begin(), m_bodyContactBuffer.End(), b2ParticleSystem::BodyContactCompare);
    std_sort(this.m_bodyContactBuffer.data, 0, this.m_bodyContactBuffer.count, b2ParticleSystem.BodyContactCompare);

    ///int32 discarded = 0;
    ///std::remove_if(m_bodyContactBuffer.Begin(), m_bodyContactBuffer.End(), b2ParticleBodyContactRemovePredicate(this, &discarded));
    ///
    ///m_bodyContactBuffer.SetCount(m_bodyContactBuffer.GetCount() - discarded);

    const s_n = b2ParticleSystem.RemoveSpuriousBodyContacts_s_n;
    const s_pos = b2ParticleSystem.RemoveSpuriousBodyContacts_s_pos;
    const s_normal = b2ParticleSystem.RemoveSpuriousBodyContacts_s_normal;

    // Max number of contacts processed per particle, from nearest to farthest.
    // This must be at least 2 for correctness with concave shapes; 3 was
    // experimentally arrived at as looking reasonable.
    const k_maxContactsPerPoint = 3;
    const system = this;
    // Index of last particle processed.
    let lastIndex = -1;
    // Number of contacts processed for the current particle.
    let currentContacts = 0;
    // Output the number of discarded contacts.
    // let discarded = 0;
    const b2ParticleBodyContactRemovePredicate = (contact: b2ParticleBodyContact): boolean => {
      // This implements the selection criteria described in
      // RemoveSpuriousBodyContacts().
      // This functor is iterating through a list of Body contacts per
      // Particle, ordered from near to far.  For up to the maximum number of
      // contacts we allow per point per step, we verify that the contact
      // normal of the Body that genenerated the contact makes physical sense
      // by projecting a point back along that normal and seeing if it
      // intersects the fixture generating the contact.

      if (contact.index !== lastIndex) {
        currentContacts = 0;
        lastIndex = contact.index;
      }

      if (currentContacts++ > k_maxContactsPerPoint) {
        // ++discarded;
        return true;
      }

      // Project along inverse normal (as returned in the contact) to get the
      // point to check.
      ///b2Vec2 n = contact.normal;
      const n = s_n.Copy(contact.normal);
      // weight is 1-(inv(diameter) * distance)
      ///n *= system.m_particleDiameter * (1 - contact.weight);
      n.SelfMul(system.m_particleDiameter * (1 - contact.weight));
      ///b2Vec2 pos = system.m_positionBuffer.data[contact.index] + n;
      const pos = b2Vec2.AddVV(system.m_positionBuffer.data[contact.index], n, s_pos);

      // pos is now a point projected back along the contact normal to the
      // contact distance. If the surface makes sense for a contact, pos will
      // now lie on or in the fixture generating
      if (!contact.fixture.TestPoint(pos)) {
        const childCount = contact.fixture.GetShape().GetChildCount();
        for (let childIndex = 0; childIndex < childCount; childIndex++) {
          const normal = s_normal;
          const distance = contact.fixture.ComputeDistance(pos, normal, childIndex);
          if (distance < b2_linearSlop) {
            return false;
          }
        }
        // ++discarded;
        return true;
      }

      return false;
    };
    this.m_bodyContactBuffer.count = std_remove_if(this.m_bodyContactBuffer.data, b2ParticleBodyContactRemovePredicate, this.m_bodyContactBuffer.count);
  }
  private static RemoveSpuriousBodyContacts_s_n = new b2Vec2();
  private static RemoveSpuriousBodyContacts_s_pos = new b2Vec2();
  private static RemoveSpuriousBodyContacts_s_normal = new b2Vec2();

  public DetectStuckParticle(particle: number): void {
    // Detect stuck particles
    //
    // The basic algorithm is to allow the user to specify an optional
    // threshold where we detect whenever a particle is contacting
    // more than one fixture for more than threshold consecutive
    // steps. This is considered to be "stuck", and these are put
    // in a list the user can query per step, if enabled, to deal with
    // such particles.

    if (this.m_stuckThreshold <= 0) {
      return;
    }

    // Get the state variables for this particle.
    ///int32 * const consecutiveCount = &m_consecutiveContactStepsBuffer.data[particle];
    ///int32 * const lastStep = &m_lastBodyContactStepBuffer.data[particle];
    ///int32 * const bodyCount = &m_bodyContactCountBuffer.data[particle];

    // This is only called when there is a body contact for this particle.
    ///++(*bodyCount);
    ++this.m_bodyContactCountBuffer.data[particle];

    // We want to only trigger detection once per step, the first time we
    // contact more than one fixture in a step for a given particle.
    ///if (*bodyCount === 2)
    if (this.m_bodyContactCountBuffer.data[particle] === 2) {
      ///++(*consecutiveCount);
      ++this.m_consecutiveContactStepsBuffer.data[particle];
      ///if (*consecutiveCount > m_stuckThreshold)
      if (this.m_consecutiveContactStepsBuffer.data[particle] > this.m_stuckThreshold) {
        ///int32& newStuckParticle = m_stuckParticleBuffer.Append();
        ///newStuckParticle = particle;
        this.m_stuckParticleBuffer.data[this.m_stuckParticleBuffer.Append()] = particle;
      }
    }
    ///*lastStep = m_timestamp;
    this.m_lastBodyContactStepBuffer.data[particle] = this.m_timestamp;
  }

  /**
   * Determine whether a particle index is valid.
   */
  public ValidateParticleIndex(index: number): boolean {
    return index >= 0 && index < this.GetParticleCount() &&
      index !== b2_invalidParticleIndex;
  }

  /**
   * Get the time elapsed in
   * b2ParticleSystemDef::lifetimeGranularity.
   */
  public GetQuantizedTimeElapsed(): number {
    ///return (int32)(m_timeElapsed >> 32);
    return Math.floor(this.m_timeElapsed / 0x100000000);
  }

  /**
   * Convert a lifetime in seconds to an expiration time.
   */
  public LifetimeToExpirationTime(lifetime: number): number {
    ///return m_timeElapsed + (int64)((lifetime / m_def.lifetimeGranularity) * (float32)(1LL << 32));
    return this.m_timeElapsed + Math.floor(((lifetime / this.m_def.lifetimeGranularity) * 0x100000000));
  }

  public ForceCanBeApplied(flags: b2ParticleFlag): boolean {
    return !(flags & b2ParticleFlag.b2_wallParticle);
  }

  public PrepareForceBuffer(): void {
    if (!this.m_hasForce) {
      ///memset(m_forceBuffer, 0, sizeof(*m_forceBuffer) * m_count);
      for (let i = 0; i < this.m_count; i++) {
        this.m_forceBuffer[i].SetZero();
      }
      this.m_hasForce = true;
    }
  }

  public IsRigidGroup(group: b2ParticleGroup | null): boolean {
    return (group !== null) && ((group.m_groupFlags & b2ParticleGroupFlag.b2_rigidParticleGroup) !== 0);
  }

  public GetLinearVelocity(group: b2ParticleGroup | null, particleIndex: number, point: b2Vec2, out: b2Vec2): b2Vec2 {
    if (group && this.IsRigidGroup(group)) {
      return group.GetLinearVelocityFromWorldPoint(point, out);
    } else {
      ///return m_velocityBuffer.data[particleIndex];
      return out.Copy(this.m_velocityBuffer.data[particleIndex]);
    }
  }

  public InitDampingParameter(invMass: number[], invInertia: number[], tangentDistance: number[], mass: number, inertia: number, center: b2Vec2, point: b2Vec2, normal: b2Vec2): void {
    ///*invMass = mass > 0 ? 1 / mass : 0;
    invMass[0] = mass > 0 ? 1 / mass : 0;
    ///*invInertia = inertia > 0 ? 1 / inertia : 0;
    invInertia[0] = inertia > 0 ? 1 / inertia : 0;
    ///*tangentDistance = b2Cross(point - center, normal);
    tangentDistance[0] = b2Vec2.CrossVV(b2Vec2.SubVV(point, center, b2Vec2.s_t0), normal);
  }

  public InitDampingParameterWithRigidGroupOrParticle(invMass: number[], invInertia: number[], tangentDistance: number[], isRigidGroup: boolean, group: b2ParticleGroup | null, particleIndex: number, point: b2Vec2, normal: b2Vec2): void {
    if (group && isRigidGroup) {
      this.InitDampingParameter(invMass, invInertia, tangentDistance, group.GetMass(), group.GetInertia(), group.GetCenter(), point, normal);
    } else {
      const flags = this.m_flagsBuffer.data[particleIndex];
      this.InitDampingParameter(invMass, invInertia, tangentDistance, flags & b2ParticleFlag.b2_wallParticle ? 0 : this.GetParticleMass(), 0, point, point, normal);
    }
  }

  public ComputeDampingImpulse(invMassA: number, invInertiaA: number, tangentDistanceA: number, invMassB: number, invInertiaB: number, tangentDistanceB: number, normalVelocity: number): number {
    const invMass =
      invMassA + invInertiaA * tangentDistanceA * tangentDistanceA +
      invMassB + invInertiaB * tangentDistanceB * tangentDistanceB;
    return invMass > 0 ? normalVelocity / invMass : 0;
  }

  public ApplyDamping(invMass: number, invInertia: number, tangentDistance: number, isRigidGroup: boolean, group: b2ParticleGroup | null, particleIndex: number, impulse: number, normal: b2Vec2): void {
    if (group && isRigidGroup) {
      ///group.m_linearVelocity += impulse * invMass * normal;
      group.m_linearVelocity.SelfMulAdd(impulse * invMass, normal);
      ///group.m_angularVelocity += impulse * tangentDistance * invInertia;
      group.m_angularVelocity += impulse * tangentDistance * invInertia;
    } else {
      ///m_velocityBuffer.data[particleIndex] += impulse * invMass * normal;
      this.m_velocityBuffer.data[particleIndex].SelfMulAdd(impulse * invMass, normal);
    }
  }
}

export class b2ParticleSystem_UserOverridableBuffer<T> {
  public _data: T[] | null = null;
  public get data(): T[] { return this._data as T[]; } // HACK: may return null
  public set data(value: T[]) { this._data = value; }
  public userSuppliedCapacity: number = 0;
}

export class b2ParticleSystem_Proxy {
  public index: number = b2_invalidParticleIndex;
  public tag: number = 0;
  public static CompareProxyProxy(a: b2ParticleSystem_Proxy, b: b2ParticleSystem_Proxy): boolean {
    return a.tag < b.tag;
  }
  public static CompareTagProxy(a: number, b: b2ParticleSystem_Proxy): boolean {
    return a < b.tag;
  }
  public static CompareProxyTag(a: b2ParticleSystem_Proxy, b: number): boolean {
    return a.tag < b;
  }
}

export class b2ParticleSystem_InsideBoundsEnumerator {
  public m_system: b2ParticleSystem;
  public m_xLower: number;
  public m_xUpper: number;
  public m_yLower: number;
  public m_yUpper: number;
  public m_first: number;
  public m_last: number;
  /**
   * InsideBoundsEnumerator enumerates all particles inside the
   * given bounds.
   *
   * Construct an enumerator with bounds of tags and a range of
   * proxies.
   */
  constructor(system: b2ParticleSystem, lower: number, upper: number, first: number, last: number) {
    this.m_system = system;
    this.m_xLower = (lower & b2ParticleSystem.xMask) >>> 0;
    this.m_xUpper = (upper & b2ParticleSystem.xMask) >>> 0;
    this.m_yLower = (lower & b2ParticleSystem.yMask) >>> 0;
    this.m_yUpper = (upper & b2ParticleSystem.yMask) >>> 0;
    this.m_first = first;
    this.m_last = last;
    // DEBUG: b2Assert(this.m_first <= this.m_last);
  }

  /**
   * Get index of the next particle. Returns
   * b2_invalidParticleIndex if there are no more particles.
   */
  public GetNext(): number {
    while (this.m_first < this.m_last) {
      const xTag = (this.m_system.m_proxyBuffer.data[this.m_first].tag & b2ParticleSystem.xMask) >>> 0;
      // #if B2_ASSERT_ENABLED
      // DEBUG: const yTag = (this.m_system.m_proxyBuffer.data[this.m_first].tag & b2ParticleSystem_yMask) >>> 0;
      // DEBUG: b2Assert(yTag >= this.m_yLower);
      // DEBUG: b2Assert(yTag <= this.m_yUpper);
      // #endif
      if (xTag >= this.m_xLower && xTag <= this.m_xUpper) {
        return (this.m_system.m_proxyBuffer.data[this.m_first++]).index;
      }
      this.m_first++;
    }
    return b2_invalidParticleIndex;
  }
}

export class b2ParticleSystem_ParticleListNode {
  /**
   * The head of the list.
   */
  public list!: b2ParticleSystem_ParticleListNode;
  /**
   * The next node in the list.
   */
  public next: b2ParticleSystem_ParticleListNode | null = null;
  /**
   * Number of entries in the list. Valid only for the node at the
   * head of the list.
   */
  public count: number = 0;
  /**
   * Particle index.
   */
  public index: number = 0;
}

/**
 * @constructor
 */
export class b2ParticleSystem_FixedSetAllocator<T> {
  public Allocate(itemSize: number, count: number): number {
    // TODO
    return count;
  }

  public Clear(): void {
    // TODO
  }

  public GetCount(): number {
    // TODO
    return 0;
  }

  public Invalidate(itemIndex: number): void {
    // TODO
  }

  public GetValidBuffer(): boolean[] {
    // TODO
    return [];
  }

  public GetBuffer(): T[] {
    // TODO
    return [];
  }

  public SetCount(count: number): void {
    // TODO
  }
}

export class b2ParticleSystem_FixtureParticle {
  public first: b2Fixture;
  public second: number = b2_invalidParticleIndex;
  constructor(fixture: b2Fixture, particle: number) {
    this.first = fixture;
    this.second = particle;
  }
}

export class b2ParticleSystem_FixtureParticleSet extends b2ParticleSystem_FixedSetAllocator<b2ParticleSystem_FixtureParticle> {
  public Initialize(bodyContactBuffer: b2GrowableBuffer<b2ParticleBodyContact>, flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>): void {
    // TODO
  }
  public Find(pair: b2ParticleSystem_FixtureParticle): number {
    // TODO
    return b2_invalidParticleIndex;
  }
}

export class b2ParticleSystem_ParticlePair {
  public first: number = b2_invalidParticleIndex;
  public second: number = b2_invalidParticleIndex;
  constructor(particleA: number, particleB: number) {
    this.first = particleA;
    this.second = particleB;
  }
}

export class b2ParticlePairSet extends b2ParticleSystem_FixedSetAllocator<b2ParticleSystem_ParticlePair> {
  public Initialize(contactBuffer: b2GrowableBuffer<b2ParticleContact>, flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>): void {
    // TODO
  }

  public Find(pair: b2ParticleSystem_ParticlePair): number {
    // TODO
    return b2_invalidParticleIndex;
  }
}

export class b2ParticleSystem_ConnectionFilter {
  /**
   * Is the particle necessary for connection?
   * A pair or a triad should contain at least one 'necessary'
   * particle.
   */
  public IsNecessary(index: number): boolean {
    return true;
  }

  /**
   * An additional condition for creating a pair.
   */
  public ShouldCreatePair(a: number, b: number): boolean {
    return true;
  }

  /**
   * An additional condition for creating a triad.
   */
  public ShouldCreateTriad(a: number, b: number, c: number): boolean {
    return true;
  }
}

export class b2ParticleSystem_DestroyParticlesInShapeCallback extends b2QueryCallback {
  public m_system: b2ParticleSystem;
  public m_shape: b2Shape;
  public m_xf: b2Transform;
  public m_callDestructionListener: boolean = false;
  public m_destroyed: number = 0;

  constructor(system: b2ParticleSystem, shape: b2Shape, xf: b2Transform, callDestructionListener: boolean) {
    super();
    this.m_system = system;
    this.m_shape = shape;
    this.m_xf = xf;
    this.m_callDestructionListener = callDestructionListener;
    this.m_destroyed = 0;
  }

  public override ReportFixture(fixture: b2Fixture): boolean {
    return false;
  }

  public override ReportParticle(particleSystem: b2ParticleSystem, index: number): boolean {
    if (particleSystem !== this.m_system) {
      return false;
    }
    // DEBUG: b2Assert(index >= 0 && index < this.m_system.m_count);
    if (this.m_shape.TestPoint(this.m_xf, this.m_system.m_positionBuffer.data[index])) {
      this.m_system.DestroyParticle(index, this.m_callDestructionListener);
      this.m_destroyed++;
    }
    return true;
  }

  public Destroyed(): number {
    return this.m_destroyed;
  }
}

export class b2ParticleSystem_JoinParticleGroupsFilter extends b2ParticleSystem_ConnectionFilter {
  public m_threshold: number = 0;

  constructor(threshold: number) {
    super();
    this.m_threshold = threshold;
  }

  /**
   * An additional condition for creating a pair.
   */
  public override ShouldCreatePair(a: number, b: number): boolean {
    return (a < this.m_threshold && this.m_threshold <= b) ||
      (b < this.m_threshold && this.m_threshold <= a);
  }

  /**
   * An additional condition for creating a triad.
   */
  public override ShouldCreateTriad(a: number, b: number, c: number): boolean {
    return (a < this.m_threshold || b < this.m_threshold || c < this.m_threshold) &&
      (this.m_threshold <= a || this.m_threshold <= b || this.m_threshold <= c);
  }
}

export class b2ParticleSystem_CompositeShape extends b2Shape {
  constructor(shapes: b2Shape[], shapeCount: number = shapes.length) {
    super(b2ShapeType.e_unknown, 0);
    this.m_shapes = shapes;
    this.m_shapeCount = shapeCount;
  }

  public m_shapes: b2Shape[];
  public m_shapeCount: number = 0;

  public Clone(): b2Shape {
    // DEBUG: b2Assert(false);
    throw new Error();
  }

  public GetChildCount(): number {
    return 1;
  }

  /**
   * @see b2Shape::TestPoint
   */
  public TestPoint(xf: b2Transform, p: XY): boolean {
    for (let i = 0; i < this.m_shapeCount; i++) {
      if (this.m_shapes[i].TestPoint(xf, p)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @see b2Shape::ComputeDistance
   */
  public ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number {
    // DEBUG: b2Assert(false);
    return 0;
  }

  /**
   * Implement b2Shape.
   */
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean {
    // DEBUG: b2Assert(false);
    return false;
  }

  /**
   * @see b2Shape::ComputeAABB
   */
  public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void {
    const s_subaabb = new b2AABB();
    aabb.lowerBound.x = +b2_maxFloat;
    aabb.lowerBound.y = +b2_maxFloat;
    aabb.upperBound.x = -b2_maxFloat;
    aabb.upperBound.y = -b2_maxFloat;
    // DEBUG: b2Assert(childIndex === 0);
    for (let i = 0; i < this.m_shapeCount; i++) {
      const childCount = this.m_shapes[i].GetChildCount();
      for (let j = 0; j < childCount; j++) {
        const subaabb = s_subaabb;
        this.m_shapes[i].ComputeAABB(subaabb, xf, j);
        aabb.Combine1(subaabb);
      }
    }
  }

  /**
   * @see b2Shape::ComputeMass
   */
  public ComputeMass(massData: b2MassData, density: number): void {
    // DEBUG: b2Assert(false);
  }

  public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void {
    // DEBUG: b2Assert(false);
  }

  public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number {
    // DEBUG: b2Assert(false);
    return 0;
  }

  public Dump(log: (format: string, ...args: any[]) => void): void {
    // DEBUG: b2Assert(false);
  }
}

export class b2ParticleSystem_ReactiveFilter extends b2ParticleSystem_ConnectionFilter {
  public m_flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>;
  constructor(flagsBuffer: b2ParticleSystem_UserOverridableBuffer<b2ParticleFlag>) {
    super();
    this.m_flagsBuffer = flagsBuffer;
  }
  public override IsNecessary(index: number): boolean {
    return (this.m_flagsBuffer.data[index] & b2ParticleFlag.b2_reactiveParticle) !== 0;
  }
}

export class b2ParticleSystem_UpdateBodyContactsCallback extends b2FixtureParticleQueryCallback {
  public m_contactFilter: b2ContactFilter | null = null;
  constructor(system: b2ParticleSystem, contactFilter: b2ContactFilter | null = null) {
    super(system); // base class constructor
    this.m_contactFilter = contactFilter;
  }

  public ShouldCollideFixtureParticle(fixture: b2Fixture, particleSystem: b2ParticleSystem, particleIndex: number): boolean {
    // Call the contact filter if it's set, to determine whether to
    // filter this contact.  Returns true if contact calculations should
    // be performed, false otherwise.
    if (this.m_contactFilter) {
      const flags = this.m_system.GetFlagsBuffer();
      if (flags[particleIndex] & b2ParticleFlag.b2_fixtureContactFilterParticle) {
        return this.m_contactFilter.ShouldCollideFixtureParticle(fixture, this.m_system, particleIndex);
      }
    }
    return true;
  }

  public override ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, a: number): void {
    const s_n = b2ParticleSystem_UpdateBodyContactsCallback.ReportFixtureAndParticle_s_n;
    const s_rp = b2ParticleSystem_UpdateBodyContactsCallback.ReportFixtureAndParticle_s_rp;
    const ap = this.m_system.m_positionBuffer.data[a];
    const n = s_n;
    const d = fixture.ComputeDistance(ap, n, childIndex);
    if (d < this.m_system.m_particleDiameter && this.ShouldCollideFixtureParticle(fixture, this.m_system, a)) {
      const b = fixture.GetBody();
      const bp = b.GetWorldCenter();
      const bm = b.GetMass();
      const bI = b.GetInertia() - bm * b.GetLocalCenter().LengthSquared();
      const invBm = bm > 0 ? 1 / bm : 0;
      const invBI = bI > 0 ? 1 / bI : 0;
      const invAm =
        this.m_system.m_flagsBuffer.data[a] &
        b2ParticleFlag.b2_wallParticle ? 0 : this.m_system.GetParticleInvMass();
      ///b2Vec2 rp = ap - bp;
      const rp = b2Vec2.SubVV(ap, bp, s_rp);
      const rpn = b2Vec2.CrossVV(rp, n);
      const invM = invAm + invBm + invBI * rpn * rpn;

      ///b2ParticleBodyContact& contact = m_system.m_bodyContactBuffer.Append();
      const contact = this.m_system.m_bodyContactBuffer.data[this.m_system.m_bodyContactBuffer.Append()];
      contact.index = a;
      contact.body = b;
      contact.fixture = fixture;
      contact.weight = 1 - d * this.m_system.m_inverseDiameter;
      ///contact.normal = -n;
      contact.normal.Copy(n.SelfNeg());
      contact.mass = invM > 0 ? 1 / invM : 0;
      this.m_system.DetectStuckParticle(a);
    }
  }
  public static readonly ReportFixtureAndParticle_s_n = new b2Vec2();
  public static readonly ReportFixtureAndParticle_s_rp = new b2Vec2();
}

export class b2ParticleSystem_SolveCollisionCallback extends b2FixtureParticleQueryCallback {
  public m_step: b2TimeStep;
  constructor(system: b2ParticleSystem, step: b2TimeStep) {
    super(system); // base class constructor
    this.m_step = step;
  }

  public override ReportFixtureAndParticle(fixture: b2Fixture, childIndex: number, a: number): void {
    const s_p1 = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_p1;
    const s_output = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_output;
    const s_input = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_input;
    const s_p = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_p;
    const s_v = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_v;
    const s_f = b2ParticleSystem_SolveCollisionCallback.ReportFixtureAndParticle_s_f;

    const body = fixture.GetBody();
    const ap = this.m_system.m_positionBuffer.data[a];
    const av = this.m_system.m_velocityBuffer.data[a];
    const output = s_output;
    const input = s_input;
    if (this.m_system.m_iterationIndex === 0) {
      // Put 'ap' in the local space of the previous frame
      ///b2Vec2 p1 = b2MulT(body.m_xf0, ap);
      const p1 = b2Transform.MulTXV(body.m_xf0, ap, s_p1);
      if (fixture.GetShape().GetType() === b2ShapeType.e_circleShape) {
        // Make relative to the center of the circle
        ///p1 -= body.GetLocalCenter();
        p1.SelfSub(body.GetLocalCenter());
        // Re-apply rotation about the center of the circle
        ///p1 = b2Mul(body.m_xf0.q, p1);
        b2Rot.MulRV(body.m_xf0.q, p1, p1);
        // Subtract rotation of the current frame
        ///p1 = b2MulT(body.m_xf.q, p1);
        b2Rot.MulTRV(body.m_xf.q, p1, p1);
        // Return to local space
        ///p1 += body.GetLocalCenter();
        p1.SelfAdd(body.GetLocalCenter());
      }
      // Return to global space and apply rotation of current frame
      ///input.p1 = b2Mul(body.m_xf, p1);
      b2Transform.MulXV(body.m_xf, p1, input.p1);
    } else {
      ///input.p1 = ap;
      input.p1.Copy(ap);
    }
    ///input.p2 = ap + m_step.dt * av;
    b2Vec2.AddVMulSV(ap, this.m_step.dt, av, input.p2);
    input.maxFraction = 1;
    if (fixture.RayCast(output, input, childIndex)) {
      const n = output.normal;
      ///b2Vec2 p = (1 - output.fraction) * input.p1 + output.fraction * input.p2 + b2_linearSlop * n;
      const p = s_p;
      p.x = (1 - output.fraction) * input.p1.x + output.fraction * input.p2.x + b2_linearSlop * n.x;
      p.y = (1 - output.fraction) * input.p1.y + output.fraction * input.p2.y + b2_linearSlop * n.y;
      ///b2Vec2 v = m_step.inv_dt * (p - ap);
      const v = s_v;
      v.x = this.m_step.inv_dt * (p.x - ap.x);
      v.y = this.m_step.inv_dt * (p.y - ap.y);
      ///m_system.m_velocityBuffer.data[a] = v;
      this.m_system.m_velocityBuffer.data[a].Copy(v);
      ///b2Vec2 f = m_step.inv_dt * m_system.GetParticleMass() * (av - v);
      const f = s_f;
      f.x = this.m_step.inv_dt * this.m_system.GetParticleMass() * (av.x - v.x);
      f.y = this.m_step.inv_dt * this.m_system.GetParticleMass() * (av.y - v.y);
      this.m_system.ParticleApplyForce(a, f);
    }
  }
  public static readonly ReportFixtureAndParticle_s_p1 = new b2Vec2();
  public static readonly ReportFixtureAndParticle_s_output = new b2RayCastOutput();
  public static readonly ReportFixtureAndParticle_s_input = new b2RayCastInput();
  public static readonly ReportFixtureAndParticle_s_p = new b2Vec2();
  public static readonly ReportFixtureAndParticle_s_v = new b2Vec2();
  public static readonly ReportFixtureAndParticle_s_f = new b2Vec2();

  public override ReportParticle(system: b2ParticleSystem, index: number): boolean {
    return false;
  }
}

// #endif
