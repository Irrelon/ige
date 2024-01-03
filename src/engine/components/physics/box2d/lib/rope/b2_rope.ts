// MIT License

// Copyright (c) 2019 Erin Catto

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { b2Vec2, b2Atan2 } from "../common/b2_math.js";
import { b2Draw, b2Color } from "../common/b2_draw.js";
import { b2_pi } from "../common/b2_settings.js";

export enum b2StretchingModel {
  b2_pbdStretchingModel,
  b2_xpbdStretchingModel,
}

export enum b2BendingModel {
  b2_springAngleBendingModel = 0,
  b2_pbdAngleBendingModel,
  b2_xpbdAngleBendingModel,
  b2_pbdDistanceBendingModel,
  b2_pbdHeightBendingModel,
  b2_pbdTriangleBendingModel,
}

///
export class b2RopeTuning {
  public stretchingModel: b2StretchingModel = b2StretchingModel.b2_pbdStretchingModel;
  public bendingModel: b2BendingModel = b2BendingModel.b2_pbdAngleBendingModel;
  public damping: number = 0.0;
  public stretchStiffness: number = 1.0;
  public stretchHertz: number = 0.0;
  public stretchDamping: number = 0.0;
  public bendStiffness: number = 0.5;
  public bendHertz: number = 1.0;
  public bendDamping: number = 0.0;
  public isometric: boolean = false;
  public fixedEffectiveMass: boolean = false;
  public warmStart: boolean = false;

  public Copy(other: Readonly<b2RopeTuning>): this {
    this.stretchingModel = other.stretchingModel;
    this.bendingModel = other.bendingModel;
    this.damping = other.damping;
    this.stretchStiffness = other.stretchStiffness;
    this.stretchHertz = other.stretchHertz;
    this.stretchDamping = other.stretchDamping;
    this.bendStiffness = other.bendStiffness;
    this.bendHertz = other.bendHertz;
    this.bendDamping = other.bendDamping;
    this.isometric = other.isometric;
    this.fixedEffectiveMass = other.fixedEffectiveMass;
    this.warmStart = other.warmStart;
    return this;
  }
}

///
export class b2RopeDef {
  public readonly position: b2Vec2 = new b2Vec2();
  // b2Vec2* vertices;
  public readonly vertices: b2Vec2[] = [];
  // int32 count;
  public count: number = 0;
  // float* masses;
  public readonly masses: number[] = [];
  // b2Vec2 gravity;
  public readonly gravity: b2Vec2 = new b2Vec2();
  // b2RopeTuning tuning;
  public readonly tuning: b2RopeTuning = new b2RopeTuning();
}

class b2RopeStretch {
  public i1: number = 0;
  public i2: number = 0;
  public invMass1: number = 0.0;
  public invMass2: number = 0.0;
  public L: number = 0.0;
  public lambda: number = 0.0;
  public spring: number = 0.0;
  public damper: number = 0.0;
}

class b2RopeBend {
  public i1: number = 0;
  public i2: number = 0;
  public i3: number = 0;
  public invMass1: number = 0.0;
  public invMass2: number = 0.0;
  public invMass3: number = 0.0;
  public invEffectiveMass: number = 0.0;
  public lambda: number = 0.0;
  public L1: number = 0.0;
  public L2: number = 0.0;
  public alpha1: number = 0.0;
  public alpha2: number = 0.0;
  public spring: number = 0.0;
  public damper: number = 0.0;
}

///
export class b2Rope {
  private readonly m_position: b2Vec2 = new b2Vec2();

  private m_count: number = 0;
  private m_stretchCount: number = 0;
  private m_bendCount: number = 0;

  // b2RopeStretch* m_stretchConstraints;
  private readonly m_stretchConstraints: b2RopeStretch[] = [];
  // b2RopeBend* m_bendConstraints;
  private readonly m_bendConstraints: b2RopeBend[] = [];

  // b2Vec2* m_bindPositions;
  private readonly m_bindPositions: b2Vec2[] = [];
  // b2Vec2* m_ps;
  private readonly m_ps: b2Vec2[] = [];
  // b2Vec2* m_p0s;
  private readonly m_p0s: b2Vec2[] = [];
  // b2Vec2* m_vs;
  private readonly m_vs: b2Vec2[] = [];

  // float* m_invMasses;
  private readonly m_invMasses: number[] = [];
  // b2Vec2 m_gravity;
  private readonly m_gravity: b2Vec2 = new b2Vec2();

  private readonly m_tuning: b2RopeTuning = new b2RopeTuning();

  public Create(def: b2RopeDef): void {
    // b2Assert(def.count >= 3);
    this.m_position.Copy(def.position);
    this.m_count = def.count;
    function make_array<T>(array: T[], count: number, make: (index: number) => T): void {
      for (let index = 0; index < count; ++index) {
        array[index] = make(index);
      }
    }
    // this.m_bindPositions = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
    make_array(this.m_bindPositions, this.m_count, () => new b2Vec2());
    // this.m_ps = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
    make_array(this.m_ps, this.m_count, () => new b2Vec2());
    // this.m_p0s = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
    make_array(this.m_p0s, this.m_count, () => new b2Vec2());
    // this.m_vs = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
    make_array(this.m_vs, this.m_count, () => new b2Vec2());
    // this.m_invMasses = (float*)b2Alloc(this.m_count * sizeof(float));
    make_array(this.m_invMasses, this.m_count, () => 0.0);

    for (let i = 0; i < this.m_count; ++i) {
      this.m_bindPositions[i].Copy(def.vertices[i]);
      // this.m_ps[i] = def.vertices[i] + this.m_position;
      this.m_ps[i].Copy(def.vertices[i]).SelfAdd(this.m_position);
      // this.m_p0s[i] = def.vertices[i] + this.m_position;
      this.m_p0s[i].Copy(def.vertices[i]).SelfAdd(this.m_position);
      this.m_vs[i].SetZero();

      const m: number = def.masses[i];
      if (m > 0.0) {
        this.m_invMasses[i] = 1.0 / m;
      } else {
        this.m_invMasses[i] = 0.0;
      }
    }

    this.m_stretchCount = this.m_count - 1;
    this.m_bendCount = this.m_count - 2;

    // this.m_stretchConstraints = (b2RopeStretch*)b2Alloc(this.m_stretchCount * sizeof(b2RopeStretch));
    make_array(this.m_stretchConstraints, this.m_stretchCount, () => new b2RopeStretch());
    // this.m_bendConstraints = (b2RopeBend*)b2Alloc(this.m_bendCount * sizeof(b2RopeBend));
    make_array(this.m_bendConstraints, this.m_bendCount, () => new b2RopeBend());

    for (let i = 0; i < this.m_stretchCount; ++i) {
      const c: b2RopeStretch = this.m_stretchConstraints[i];

      const p1: b2Vec2 = this.m_ps[i];
      const p2: b2Vec2 = this.m_ps[i + 1];

      c.i1 = i;
      c.i2 = i + 1;
      c.L = b2Vec2.DistanceVV(p1, p2);
      c.invMass1 = this.m_invMasses[i];
      c.invMass2 = this.m_invMasses[i + 1];
      c.lambda = 0.0;
      c.damper = 0.0;
      c.spring = 0.0;
    }

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const p1: b2Vec2 = this.m_ps[i];
      const p2: b2Vec2 = this.m_ps[i + 1];
      const p3: b2Vec2 = this.m_ps[i + 2];

      c.i1 = i;
      c.i2 = i + 1;
      c.i3 = i + 2;
      c.invMass1 = this.m_invMasses[i];
      c.invMass2 = this.m_invMasses[i + 1];
      c.invMass3 = this.m_invMasses[i + 2];
      c.invEffectiveMass = 0.0;
      c.L1 = b2Vec2.DistanceVV(p1, p2);
      c.L2 = b2Vec2.DistanceVV(p2, p3);
      c.lambda = 0.0;

      // Pre-compute effective mass (TODO use flattened config)
      const e1: b2Vec2 = b2Vec2.SubVV(p2, p1, new b2Vec2());
      const e2: b2Vec2 = b2Vec2.SubVV(p3, p2, new b2Vec2());
      const L1sqr: number = e1.LengthSquared();
      const L2sqr: number = e2.LengthSquared();

      if (L1sqr * L2sqr === 0.0) {
        continue;
      }

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * e1.Skew();
      const Jd1: b2Vec2 = new b2Vec2().Copy(e1).SelfSkew().SelfMul(-1.0 / L1sqr);
      // b2Vec2 Jd2 = (1.0 / L2sqr) * e2.Skew();
      const Jd2: b2Vec2 = new b2Vec2().Copy(e2).SelfSkew().SelfMul(1.0 / L2sqr);

      // b2Vec2 J1 = -Jd1;
      const J1 = Jd1.Clone().SelfNeg();
      // b2Vec2 J2 = Jd1 - Jd2;
      const J2 = Jd1.Clone().SelfSub(Jd2);
      // b2Vec2 J3 = Jd2;
      const J3 = Jd2.Clone();

      c.invEffectiveMass = c.invMass1 * b2Vec2.DotVV(J1, J1) + c.invMass2 * b2Vec2.DotVV(J2, J2) + c.invMass3 * b2Vec2.DotVV(J3, J3);

      // b2Vec2 r = p3 - p1;
      const r: b2Vec2 = b2Vec2.SubVV(p3, p1, new b2Vec2());

      const rr: number = r.LengthSquared();
      if (rr === 0.0) {
        continue;
      }

      // a1 = h2 / (h1 + h2)
      // a2 = h1 / (h1 + h2)
      c.alpha1 = b2Vec2.DotVV(e2, r) / rr;
      c.alpha2 = b2Vec2.DotVV(e1, r) / rr;
    }

    this.m_gravity.Copy(def.gravity);

    this.SetTuning(def.tuning);
  }

  public SetTuning(tuning: b2RopeTuning): void {
    this.m_tuning.Copy(tuning);

    // Pre-compute spring and damper values based on tuning

    const bendOmega: number = 2.0 * b2_pi * this.m_tuning.bendHertz;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const L1sqr: number = c.L1 * c.L1;
      const L2sqr: number = c.L2 * c.L2;

      if (L1sqr * L2sqr === 0.0) {
        c.spring = 0.0;
        c.damper = 0.0;
        continue;
      }

      // Flatten the triangle formed by the two edges
      const J2: number = 1.0 / c.L1 + 1.0 / c.L2;
      const sum: number = c.invMass1 / L1sqr + c.invMass2 * J2 * J2 + c.invMass3 / L2sqr;
      if (sum === 0.0) {
        c.spring = 0.0;
        c.damper = 0.0;
        continue;
      }

      const mass: number = 1.0 / sum;

      c.spring = mass * bendOmega * bendOmega;
      c.damper = 2.0 * mass * this.m_tuning.bendDamping * bendOmega;
    }

    const stretchOmega: number = 2.0 * b2_pi * this.m_tuning.stretchHertz;

    for (let i = 0; i < this.m_stretchCount; ++i) {
      const c: b2RopeStretch = this.m_stretchConstraints[i];

      const sum: number = c.invMass1 + c.invMass2;
      if (sum === 0.0) {
        continue;
      }

      const mass: number = 1.0 / sum;

      c.spring = mass * stretchOmega * stretchOmega;
      c.damper = 2.0 * mass * this.m_tuning.stretchDamping * stretchOmega;
    }
  }

  public Step(dt: number, iterations: number, position: Readonly<b2Vec2>): void {
    if (dt === 0.0) {
      return;
    }

    const inv_dt: number = 1.0 / dt;
    const d: number = Math.exp(- dt * this.m_tuning.damping);

    // Apply gravity and damping
    for (let i = 0; i < this.m_count; ++i) {
      if (this.m_invMasses[i] > 0.0) {
        // this.m_vs[i] *= d;
        this.m_vs[i].x *= d;
        this.m_vs[i].y *= d;
        // this.m_vs[i] += dt * this.m_gravity;
        this.m_vs[i].x += dt * this.m_gravity.x;
        this.m_vs[i].y += dt * this.m_gravity.y;
      }
      else {
        // this.m_vs[i] = inv_dt * (this.m_bindPositions[i] + position - this.m_p0s[i]);
        this.m_vs[i].x = inv_dt * (this.m_bindPositions[i].x + position.x - this.m_p0s[i].x);
        this.m_vs[i].y = inv_dt * (this.m_bindPositions[i].y + position.y - this.m_p0s[i].y);
      }
    }

    // Apply bending spring
    if (this.m_tuning.bendingModel === b2BendingModel.b2_springAngleBendingModel) {
      this.ApplyBendForces(dt);
    }

    for (let i = 0; i < this.m_bendCount; ++i) {
      this.m_bendConstraints[i].lambda = 0.0;
    }

    for (let i = 0; i < this.m_stretchCount; ++i) {
      this.m_stretchConstraints[i].lambda = 0.0;
    }

    // Update position
    for (let i = 0; i < this.m_count; ++i) {
      // this.m_ps[i] += dt * this.m_vs[i];
      this.m_ps[i].x += dt * this.m_vs[i].x;
      this.m_ps[i].y += dt * this.m_vs[i].y;
    }

    // Solve constraints
    for (let i = 0; i < iterations; ++i) {
      if (this.m_tuning.bendingModel === b2BendingModel.b2_pbdAngleBendingModel) {
        this.SolveBend_PBD_Angle();
      }
      else if (this.m_tuning.bendingModel === b2BendingModel.b2_xpbdAngleBendingModel) {
        this.SolveBend_XPBD_Angle(dt);
      }
      else if (this.m_tuning.bendingModel === b2BendingModel.b2_pbdDistanceBendingModel) {
        this.SolveBend_PBD_Distance();
      }
      else if (this.m_tuning.bendingModel === b2BendingModel.b2_pbdHeightBendingModel) {
        this.SolveBend_PBD_Height();
      }
      else if (this.m_tuning.bendingModel === b2BendingModel.b2_pbdTriangleBendingModel) {
        this.SolveBend_PBD_Triangle();
      }

      if (this.m_tuning.stretchingModel === b2StretchingModel.b2_pbdStretchingModel) {
        this.SolveStretch_PBD();
      }
      else if (this.m_tuning.stretchingModel === b2StretchingModel.b2_xpbdStretchingModel) {
        this.SolveStretch_XPBD(dt);
      }
    }

    // Constrain velocity
    for (let i = 0; i < this.m_count; ++i) {
      // this.m_vs[i] = inv_dt * (this.m_ps[i] - this.m_p0s[i]);
      this.m_vs[i].x = inv_dt * (this.m_ps[i].x - this.m_p0s[i].x);
      this.m_vs[i].y = inv_dt * (this.m_ps[i].y - this.m_p0s[i].y);
      this.m_p0s[i].Copy(this.m_ps[i]);
    }
  }

  public Reset(position: Readonly<b2Vec2>): void {
    this.m_position.Copy(position);

    for (let i = 0; i < this.m_count; ++i) {
      // this.m_ps[i] = this.m_bindPositions[i] + this.m_position;
      this.m_ps[i].x = this.m_bindPositions[i].x + this.m_position.x;
      this.m_ps[i].y = this.m_bindPositions[i].y + this.m_position.y;
      // this.m_p0s[i] = this.m_bindPositions[i] + this.m_position;
      this.m_p0s[i].x = this.m_bindPositions[i].x + this.m_position.x;
      this.m_p0s[i].y = this.m_bindPositions[i].y + this.m_position.y;
      this.m_vs[i].SetZero();
    }

    for (let i = 0; i < this.m_bendCount; ++i) {
      this.m_bendConstraints[i].lambda = 0.0;
    }

    for (let i = 0; i < this.m_stretchCount; ++i) {
      this.m_stretchConstraints[i].lambda = 0.0;
    }
  }

  public Draw(draw: b2Draw): void {
    const c: b2Color = new b2Color(0.4, 0.5, 0.7);
    const pg: b2Color = new b2Color(0.1, 0.8, 0.1);
    const pd: b2Color = new b2Color(0.7, 0.2, 0.4);

    for (let i = 0; i < this.m_count - 1; ++i) {
      draw.DrawSegment(this.m_ps[i], this.m_ps[i + 1], c);

      const pc: Readonly<b2Color> = this.m_invMasses[i] > 0.0 ? pd : pg;
      draw.DrawPoint(this.m_ps[i], 5.0, pc);
    }

    const pc: Readonly<b2Color> = this.m_invMasses[this.m_count - 1] > 0.0 ? pd : pg;
    draw.DrawPoint(this.m_ps[this.m_count - 1], 5.0, pc);
  }

  private SolveStretch_PBD(): void {
    const stiffness: number = this.m_tuning.stretchStiffness;

    for (let i = 0; i < this.m_stretchCount; ++i) {
      const c: b2RopeStretch = this.m_stretchConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1].Clone();
      const p2: b2Vec2 = this.m_ps[c.i2].Clone();

      // b2Vec2 d = p2 - p1;
      const d: b2Vec2 = p2.Clone().SelfSub(p1);
      const L: number = d.Normalize();

      const sum: number = c.invMass1 + c.invMass2;
      if (sum === 0.0) {
        continue;
      }

      const s1: number = c.invMass1 / sum;
      const s2: number = c.invMass2 / sum;

      // p1 -= stiffness * s1 * (c.L - L) * d;
      p1.x -= stiffness * s1 * (c.L - L) * d.x;
      p1.y -= stiffness * s1 * (c.L - L) * d.y;
      // p2 += stiffness * s2 * (c.L - L) * d;
      p2.x += stiffness * s2 * (c.L - L) * d.x;
      p2.y += stiffness * s2 * (c.L - L) * d.y;

      this.m_ps[c.i1].Copy(p1);
      this.m_ps[c.i2].Copy(p2);
    }
  }

  private SolveStretch_XPBD(dt: number): void {
    // 	b2Assert(dt > 0.0);

    for (let i = 0; i < this.m_stretchCount; ++i) {
      const c: b2RopeStretch = this.m_stretchConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1].Clone();
      const p2: b2Vec2 = this.m_ps[c.i2].Clone();

      const dp1: b2Vec2 = p1.Clone().SelfSub(this.m_p0s[c.i1]);
      const dp2: b2Vec2 = p2.Clone().SelfSub(this.m_p0s[c.i2]);

      // b2Vec2 u = p2 - p1;
      const u: b2Vec2 = p2.Clone().SelfSub(p1);
      const L: number = u.Normalize();

      // b2Vec2 J1 = -u;
      const J1: b2Vec2 = u.Clone().SelfNeg();
      // b2Vec2 J2 = u;
      const J2: b2Vec2 = u;

      const sum: number = c.invMass1 + c.invMass2;
      if (sum === 0.0) {
        continue;
      }

      const alpha: number = 1.0 / (c.spring * dt * dt);	// 1 / kg
      const beta: number = dt * dt * c.damper;				// kg * s
      const sigma: number = alpha * beta / dt;				// non-dimensional
      const C: number = L - c.L;

      // This is using the initial velocities
      const Cdot: number = b2Vec2.DotVV(J1, dp1) + b2Vec2.DotVV(J2, dp2);

      const B: number = C + alpha * c.lambda + sigma * Cdot;
      const sum2: number = (1.0 + sigma) * sum + alpha;

      const impulse: number = -B / sum2;

      // p1 += (c.invMass1 * impulse) * J1;
      p1.x += (c.invMass1 * impulse) * J1.x;
      p1.y += (c.invMass1 * impulse) * J1.y;
      // p2 += (c.invMass2 * impulse) * J2;
      p2.x += (c.invMass2 * impulse) * J2.x;
      p2.y += (c.invMass2 * impulse) * J2.y;

      this.m_ps[c.i1].Copy(p1);
      this.m_ps[c.i2].Copy(p2);
      c.lambda += impulse;
    }
  }

  private SolveBend_PBD_Angle(): void {
    const stiffness: number = this.m_tuning.bendStiffness;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1];
      const p2: b2Vec2 = this.m_ps[c.i2];
      const p3: b2Vec2 = this.m_ps[c.i3];

      // b2Vec2 d1 = p2 - p1;
      const d1 = p2.Clone().SelfSub(p1);
      // b2Vec2 d2 = p3 - p2;
      const d2 = p3.Clone().SelfSub(p2);
      const a: number = b2Vec2.CrossVV(d1, d2);
      const b: number = b2Vec2.DotVV(d1, d2);

      const angle: number = b2Atan2(a, b);

      let L1sqr: number = 0.0, L2sqr: number = 0.0;

      if (this.m_tuning.isometric) {
        L1sqr = c.L1 * c.L1;
        L2sqr = c.L2 * c.L2;
      }
      else {
        L1sqr = d1.LengthSquared();
        L2sqr = d2.LengthSquared();
      }

      if (L1sqr * L2sqr === 0.0) {
        continue;
      }

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
      const Jd1: b2Vec2 = new b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
      // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
      const Jd2: b2Vec2 = new b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);

      // b2Vec2 J1 = -Jd1;
      const J1 = Jd1.Clone().SelfNeg();
      // b2Vec2 J2 = Jd1 - Jd2;
      const J2 = Jd1.Clone().SelfSub(Jd2);
      // b2Vec2 J3 = Jd2;
      const J3 = Jd2;

      let sum: number = 0.0;
      if (this.m_tuning.fixedEffectiveMass) {
        sum = c.invEffectiveMass;
      }
      else {
        sum = c.invMass1 * b2Vec2.DotVV(J1, J1) + c.invMass2 * b2Vec2.DotVV(J2, J2) + c.invMass3 * b2Vec2.DotVV(J3, J3);
      }

      if (sum === 0.0) {
        sum = c.invEffectiveMass;
      }

      const impulse: number = -stiffness * angle / sum;

      // p1 += (c.invMass1 * impulse) * J1;
      p1.x += (c.invMass1 * impulse) * J1.x;
      p1.y += (c.invMass1 * impulse) * J1.y;
      // p2 += (c.invMass2 * impulse) * J2;
      p2.x += (c.invMass2 * impulse) * J2.x;
      p2.y += (c.invMass2 * impulse) * J2.y;
      // p3 += (c.invMass3 * impulse) * J3;
      p3.x += (c.invMass3 * impulse) * J3.x;
      p3.y += (c.invMass3 * impulse) * J3.y;

      this.m_ps[c.i1].Copy(p1);
      this.m_ps[c.i2].Copy(p2);
      this.m_ps[c.i3].Copy(p3);
    }
  }

  private SolveBend_XPBD_Angle(dt: number): void {
    // b2Assert(dt > 0.0);

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1];
      const p2: b2Vec2 = this.m_ps[c.i2];
      const p3: b2Vec2 = this.m_ps[c.i3];

      const dp1: b2Vec2 = p1.Clone().SelfSub(this.m_p0s[c.i1]);
      const dp2: b2Vec2 = p2.Clone().SelfSub(this.m_p0s[c.i2]);
      const dp3: b2Vec2 = p3.Clone().SelfSub(this.m_p0s[c.i3]);

      // b2Vec2 d1 = p2 - p1;
      const d1 = p2.Clone().SelfSub(p1);
      // b2Vec2 d2 = p3 - p2;
      const d2 = p3.Clone().SelfSub(p2);

      let L1sqr: number, L2sqr: number;

      if (this.m_tuning.isometric) {
        L1sqr = c.L1 * c.L1;
        L2sqr = c.L2 * c.L2;
      }
      else {
        L1sqr = d1.LengthSquared();
        L2sqr = d2.LengthSquared();
      }

      if (L1sqr * L2sqr === 0.0) {
        continue;
      }

      const a: number = b2Vec2.CrossVV(d1, d2);
      const b: number = b2Vec2.DotVV(d1, d2);

      const angle: number = b2Atan2(a, b);

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
      // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();

      // b2Vec2 J1 = -Jd1;
      // b2Vec2 J2 = Jd1 - Jd2;
      // b2Vec2 J3 = Jd2;

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
      const Jd1: b2Vec2 = new b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
      // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
      const Jd2: b2Vec2 = new b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);

      // b2Vec2 J1 = -Jd1;
      const J1 = Jd1.Clone().SelfNeg();
      // b2Vec2 J2 = Jd1 - Jd2;
      const J2 = Jd1.Clone().SelfSub(Jd2);
      // b2Vec2 J3 = Jd2;
      const J3 = Jd2;

      let sum: number;
      if (this.m_tuning.fixedEffectiveMass) {
        sum = c.invEffectiveMass;
      }
      else {
        sum = c.invMass1 * b2Vec2.DotVV(J1, J1) + c.invMass2 * b2Vec2.DotVV(J2, J2) + c.invMass3 * b2Vec2.DotVV(J3, J3);
      }

      if (sum === 0.0) {
        continue;
      }

      const alpha: number = 1.0 / (c.spring * dt * dt);
      const beta: number = dt * dt * c.damper;
      const sigma: number = alpha * beta / dt;
      const C: number = angle;

      // This is using the initial velocities
      const Cdot: number = b2Vec2.DotVV(J1, dp1) + b2Vec2.DotVV(J2, dp2) + b2Vec2.DotVV(J3, dp3);

      const B: number = C + alpha * c.lambda + sigma * Cdot;
      const sum2: number = (1.0 + sigma) * sum + alpha;

      const impulse: number = -B / sum2;

      // p1 += (c.invMass1 * impulse) * J1;
      p1.x += (c.invMass1 * impulse) * J1.x;
      p1.y += (c.invMass1 * impulse) * J1.y;
      // p2 += (c.invMass2 * impulse) * J2;
      p2.x += (c.invMass2 * impulse) * J2.x;
      p2.y += (c.invMass2 * impulse) * J2.y;
      // p3 += (c.invMass3 * impulse) * J3;
      p3.x += (c.invMass3 * impulse) * J3.x;
      p3.y += (c.invMass3 * impulse) * J3.y;

      this.m_ps[c.i1].Copy(p1);
      this.m_ps[c.i2].Copy(p2);
      this.m_ps[c.i3].Copy(p3);
      c.lambda += impulse;
    }
  }

  private SolveBend_PBD_Distance(): void {
    const stiffness: number = this.m_tuning.bendStiffness;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const i1: number = c.i1;
      const i2: number = c.i3;

      const p1: b2Vec2 = this.m_ps[i1].Clone();
      const p2: b2Vec2 = this.m_ps[i2].Clone();

      // b2Vec2 d = p2 - p1;
      const d = p2.Clone().SelfSub(p1);
      const L: number = d.Normalize();

      const sum: number = c.invMass1 + c.invMass3;
      if (sum === 0.0) {
        continue;
      }

      const s1: number = c.invMass1 / sum;
      const s2: number = c.invMass3 / sum;

      // p1 -= stiffness * s1 * (c.L1 + c.L2 - L) * d;
      p1.x -= stiffness * s1 * (c.L1 + c.L2 - L) * d.x;
      p1.y -= stiffness * s1 * (c.L1 + c.L2 - L) * d.y;
      // p2 += stiffness * s2 * (c.L1 + c.L2 - L) * d;
      p2.x += stiffness * s2 * (c.L1 + c.L2 - L) * d.x;
      p2.y += stiffness * s2 * (c.L1 + c.L2 - L) * d.y;

      this.m_ps[i1].Copy(p1);
      this.m_ps[i2].Copy(p2);
    }
  }

  private SolveBend_PBD_Height(): void {
    const stiffness: number = this.m_tuning.bendStiffness;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1].Clone();
      const p2: b2Vec2 = this.m_ps[c.i2].Clone();
      const p3: b2Vec2 = this.m_ps[c.i3].Clone();

      // Barycentric coordinates are held constant
      const d = new b2Vec2();
      // b2Vec2 d = c.alpha1 * p1 + c.alpha2 * p3 - p2;
      d.x = c.alpha1 * p1.x + c.alpha2 * p3.x - p2.x;
      d.y = c.alpha1 * p1.y + c.alpha2 * p3.y - p2.y;
      const dLen: number = d.Length();

      if (dLen === 0.0) {
        continue;
      }

      // b2Vec2 dHat = (1.0 / dLen) * d;
      const dHat = d.Clone().SelfMul(1.0 / dLen);

      // b2Vec2 J1 = c.alpha1 * dHat;
      const J1 = dHat.Clone().SelfMul(c.alpha1);
      // b2Vec2 J2 = -dHat;
      const J2 = dHat.Clone().SelfNeg();
      // b2Vec2 J3 = c.alpha2 * dHat;
      const J3 = dHat.Clone().SelfMul(c.alpha2);

      const sum: number = c.invMass1 * c.alpha1 * c.alpha1 + c.invMass2 + c.invMass3 * c.alpha2 * c.alpha2;

      if (sum === 0.0) {
        continue;
      }

      const C: number = dLen;
      const mass: number = 1.0 / sum;
      const impulse: number = -stiffness * mass * C;

      // p1 += (c.invMass1 * impulse) * J1;
      p1.x += (c.invMass1 * impulse) * J1.x;
      p1.y += (c.invMass1 * impulse) * J1.y;
      // p2 += (c.invMass2 * impulse) * J2;
      p2.x += (c.invMass2 * impulse) * J2.x;
      p2.y += (c.invMass2 * impulse) * J2.y;
      // p3 += (c.invMass3 * impulse) * J3;
      p3.x += (c.invMass3 * impulse) * J3.x;
      p3.y += (c.invMass3 * impulse) * J3.y;

      this.m_ps[c.i1].Copy(p1);
      this.m_ps[c.i2].Copy(p2);
      this.m_ps[c.i3].Copy(p3);
    }
  }

  // M. Kelager: A Triangle Bending Constraint Model for PBD
  private SolveBend_PBD_Triangle(): void {
    const stiffness = this.m_tuning.bendStiffness;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const b0 = this.m_ps[c.i1].Clone();
      const v = this.m_ps[c.i2].Clone();
      const b1 = this.m_ps[c.i3].Clone();

      const wb0 = c.invMass1;
      const wv = c.invMass2;
      const wb1 = c.invMass3;

      const W = wb0 + wb1 + 2.0 * wv;
      const invW = stiffness / W;

      const d = new b2Vec2();
      d.x = v.x - (1.0 / 3.0) * (b0.x + v.x + b1.x);
      d.y = v.y - (1.0 / 3.0) * (b0.y + v.y + b1.y);

      const db0 = new b2Vec2();
      db0.x = 2.0 * wb0 * invW * d.x;
      db0.y = 2.0 * wb0 * invW * d.y;
      const dv = new b2Vec2();
      dv.x = -4.0 * wv * invW * d.x;
      dv.y = -4.0 * wv * invW * d.y;
      const db1 = new b2Vec2();
      db1.x = 2.0 * wb1 * invW * d.x;
      db1.y = 2.0 * wb1 * invW * d.y;

      b0.SelfAdd(db0);
      v.SelfAdd(dv);
      b1.SelfAdd(db1);

      this.m_ps[c.i1].Copy(b0);
      this.m_ps[c.i2].Copy(v);
      this.m_ps[c.i3].Copy(b1);
    }
  }

  private ApplyBendForces(dt: number): void {
    // omega = 2 * pi * hz
    const omega: number = 2.0 * b2_pi * this.m_tuning.bendHertz;

    for (let i = 0; i < this.m_bendCount; ++i) {
      const c: b2RopeBend = this.m_bendConstraints[i];

      const p1: b2Vec2 = this.m_ps[c.i1].Clone();
      const p2: b2Vec2 = this.m_ps[c.i2].Clone();
      const p3: b2Vec2 = this.m_ps[c.i3].Clone();

      const v1: b2Vec2 = this.m_vs[c.i1];
      const v2: b2Vec2 = this.m_vs[c.i2];
      const v3: b2Vec2 = this.m_vs[c.i3];

      // b2Vec2 d1 = p2 - p1;
      const d1 = p1.Clone().SelfSub(p1);
      // b2Vec2 d2 = p3 - p2;
      const d2 = p3.Clone().SelfSub(p2);

      let L1sqr: number, L2sqr: number;

      if (this.m_tuning.isometric) {
        L1sqr = c.L1 * c.L1;
        L2sqr = c.L2 * c.L2;
      }
      else {
        L1sqr = d1.LengthSquared();
        L2sqr = d2.LengthSquared();
      }

      if (L1sqr * L2sqr === 0.0) {
        continue;
      }

      const a: number = b2Vec2.CrossVV(d1, d2);
      const b: number = b2Vec2.DotVV(d1, d2);

      const angle: number = b2Atan2(a, b);

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
      // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();

      // b2Vec2 J1 = -Jd1;
      // b2Vec2 J2 = Jd1 - Jd2;
      // b2Vec2 J3 = Jd2;

      // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
      const Jd1: b2Vec2 = new b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
      // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
      const Jd2: b2Vec2 = new b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);

      // b2Vec2 J1 = -Jd1;
      const J1 = Jd1.Clone().SelfNeg();
      // b2Vec2 J2 = Jd1 - Jd2;
      const J2 = Jd1.Clone().SelfSub(Jd2);
      // b2Vec2 J3 = Jd2;
      const J3 = Jd2;

      let sum: number = 0.0;
      if (this.m_tuning.fixedEffectiveMass) {
        sum = c.invEffectiveMass;
      }
      else {
        sum = c.invMass1 * b2Vec2.DotVV(J1, J1) + c.invMass2 * b2Vec2.DotVV(J2, J2) + c.invMass3 * b2Vec2.DotVV(J3, J3);
      }

      if (sum === 0.0) {
        continue;
      }

      const mass: number = 1.0 / sum;

      const spring: number = mass * omega * omega;
      const damper: number = 2.0 * mass * this.m_tuning.bendDamping * omega;

      const C: number = angle;
      const Cdot: number = b2Vec2.DotVV(J1, v1) + b2Vec2.DotVV(J2, v2) + b2Vec2.DotVV(J3, v3);

      const impulse: number = -dt * (spring * C + damper * Cdot);

      // this.m_vs[c.i1] += (c.invMass1 * impulse) * J1;
      this.m_vs[c.i1].x += (c.invMass1 * impulse) * J1.x;
      this.m_vs[c.i1].y += (c.invMass1 * impulse) * J1.y;
      // this.m_vs[c.i2] += (c.invMass2 * impulse) * J2;
      this.m_vs[c.i2].x += (c.invMass2 * impulse) * J2.x;
      this.m_vs[c.i2].y += (c.invMass2 * impulse) * J2.y;
      // this.m_vs[c.i3] += (c.invMass3 * impulse) * J3;
      this.m_vs[c.i3].x += (c.invMass3 * impulse) * J3.x;
      this.m_vs[c.i3].y += (c.invMass3 * impulse) * J3.y;
    }
  }
}
