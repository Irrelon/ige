"use strict";
// MIT License
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2Rope = exports.b2RopeDef = exports.b2RopeTuning = exports.b2BendingModel = exports.b2StretchingModel = void 0;
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
const b2_math_1 = require("../common/b2_math");
const b2_draw_1 = require("../common/b2_draw");
const b2_settings_1 = require("../common/b2_settings");
var b2StretchingModel;
(function (b2StretchingModel) {
    b2StretchingModel[b2StretchingModel["b2_pbdStretchingModel"] = 0] = "b2_pbdStretchingModel";
    b2StretchingModel[b2StretchingModel["b2_xpbdStretchingModel"] = 1] = "b2_xpbdStretchingModel";
})(b2StretchingModel || (exports.b2StretchingModel = b2StretchingModel = {}));
var b2BendingModel;
(function (b2BendingModel) {
    b2BendingModel[b2BendingModel["b2_springAngleBendingModel"] = 0] = "b2_springAngleBendingModel";
    b2BendingModel[b2BendingModel["b2_pbdAngleBendingModel"] = 1] = "b2_pbdAngleBendingModel";
    b2BendingModel[b2BendingModel["b2_xpbdAngleBendingModel"] = 2] = "b2_xpbdAngleBendingModel";
    b2BendingModel[b2BendingModel["b2_pbdDistanceBendingModel"] = 3] = "b2_pbdDistanceBendingModel";
    b2BendingModel[b2BendingModel["b2_pbdHeightBendingModel"] = 4] = "b2_pbdHeightBendingModel";
    b2BendingModel[b2BendingModel["b2_pbdTriangleBendingModel"] = 5] = "b2_pbdTriangleBendingModel";
})(b2BendingModel || (exports.b2BendingModel = b2BendingModel = {}));
///
class b2RopeTuning {
    constructor() {
        this.stretchingModel = b2StretchingModel.b2_pbdStretchingModel;
        this.bendingModel = b2BendingModel.b2_pbdAngleBendingModel;
        this.damping = 0.0;
        this.stretchStiffness = 1.0;
        this.stretchHertz = 0.0;
        this.stretchDamping = 0.0;
        this.bendStiffness = 0.5;
        this.bendHertz = 1.0;
        this.bendDamping = 0.0;
        this.isometric = false;
        this.fixedEffectiveMass = false;
        this.warmStart = false;
    }
    Copy(other) {
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
exports.b2RopeTuning = b2RopeTuning;
///
class b2RopeDef {
    constructor() {
        this.position = new b2_math_1.b2Vec2();
        // b2Vec2* vertices;
        this.vertices = [];
        // int32 count;
        this.count = 0;
        // float* masses;
        this.masses = [];
        // b2Vec2 gravity;
        this.gravity = new b2_math_1.b2Vec2();
        // b2RopeTuning tuning;
        this.tuning = new b2RopeTuning();
    }
}
exports.b2RopeDef = b2RopeDef;
class b2RopeStretch {
    constructor() {
        this.i1 = 0;
        this.i2 = 0;
        this.invMass1 = 0.0;
        this.invMass2 = 0.0;
        this.L = 0.0;
        this.lambda = 0.0;
        this.spring = 0.0;
        this.damper = 0.0;
    }
}
class b2RopeBend {
    constructor() {
        this.i1 = 0;
        this.i2 = 0;
        this.i3 = 0;
        this.invMass1 = 0.0;
        this.invMass2 = 0.0;
        this.invMass3 = 0.0;
        this.invEffectiveMass = 0.0;
        this.lambda = 0.0;
        this.L1 = 0.0;
        this.L2 = 0.0;
        this.alpha1 = 0.0;
        this.alpha2 = 0.0;
        this.spring = 0.0;
        this.damper = 0.0;
    }
}
///
class b2Rope {
    constructor() {
        this.m_position = new b2_math_1.b2Vec2();
        this.m_count = 0;
        this.m_stretchCount = 0;
        this.m_bendCount = 0;
        // b2RopeStretch* m_stretchConstraints;
        this.m_stretchConstraints = [];
        // b2RopeBend* m_bendConstraints;
        this.m_bendConstraints = [];
        // b2Vec2* m_bindPositions;
        this.m_bindPositions = [];
        // b2Vec2* m_ps;
        this.m_ps = [];
        // b2Vec2* m_p0s;
        this.m_p0s = [];
        // b2Vec2* m_vs;
        this.m_vs = [];
        // float* m_invMasses;
        this.m_invMasses = [];
        // b2Vec2 m_gravity;
        this.m_gravity = new b2_math_1.b2Vec2();
        this.m_tuning = new b2RopeTuning();
    }
    Create(def) {
        // b2Assert(def.count >= 3);
        this.m_position.Copy(def.position);
        this.m_count = def.count;
        function make_array(array, count, make) {
            for (let index = 0; index < count; ++index) {
                array[index] = make(index);
            }
        }
        // this.m_bindPositions = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
        make_array(this.m_bindPositions, this.m_count, () => new b2_math_1.b2Vec2());
        // this.m_ps = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
        make_array(this.m_ps, this.m_count, () => new b2_math_1.b2Vec2());
        // this.m_p0s = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
        make_array(this.m_p0s, this.m_count, () => new b2_math_1.b2Vec2());
        // this.m_vs = (b2Vec2*)b2Alloc(this.m_count * sizeof(b2Vec2));
        make_array(this.m_vs, this.m_count, () => new b2_math_1.b2Vec2());
        // this.m_invMasses = (float*)b2Alloc(this.m_count * sizeof(float));
        make_array(this.m_invMasses, this.m_count, () => 0.0);
        for (let i = 0; i < this.m_count; ++i) {
            this.m_bindPositions[i].Copy(def.vertices[i]);
            // this.m_ps[i] = def.vertices[i] + this.m_position;
            this.m_ps[i].Copy(def.vertices[i]).SelfAdd(this.m_position);
            // this.m_p0s[i] = def.vertices[i] + this.m_position;
            this.m_p0s[i].Copy(def.vertices[i]).SelfAdd(this.m_position);
            this.m_vs[i].SetZero();
            const m = def.masses[i];
            if (m > 0.0) {
                this.m_invMasses[i] = 1.0 / m;
            }
            else {
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
            const c = this.m_stretchConstraints[i];
            const p1 = this.m_ps[i];
            const p2 = this.m_ps[i + 1];
            c.i1 = i;
            c.i2 = i + 1;
            c.L = b2_math_1.b2Vec2.DistanceVV(p1, p2);
            c.invMass1 = this.m_invMasses[i];
            c.invMass2 = this.m_invMasses[i + 1];
            c.lambda = 0.0;
            c.damper = 0.0;
            c.spring = 0.0;
        }
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const p1 = this.m_ps[i];
            const p2 = this.m_ps[i + 1];
            const p3 = this.m_ps[i + 2];
            c.i1 = i;
            c.i2 = i + 1;
            c.i3 = i + 2;
            c.invMass1 = this.m_invMasses[i];
            c.invMass2 = this.m_invMasses[i + 1];
            c.invMass3 = this.m_invMasses[i + 2];
            c.invEffectiveMass = 0.0;
            c.L1 = b2_math_1.b2Vec2.DistanceVV(p1, p2);
            c.L2 = b2_math_1.b2Vec2.DistanceVV(p2, p3);
            c.lambda = 0.0;
            // Pre-compute effective mass (TODO use flattened config)
            const e1 = b2_math_1.b2Vec2.SubVV(p2, p1, new b2_math_1.b2Vec2());
            const e2 = b2_math_1.b2Vec2.SubVV(p3, p2, new b2_math_1.b2Vec2());
            const L1sqr = e1.LengthSquared();
            const L2sqr = e2.LengthSquared();
            if (L1sqr * L2sqr === 0.0) {
                continue;
            }
            // b2Vec2 Jd1 = (-1.0 / L1sqr) * e1.Skew();
            const Jd1 = new b2_math_1.b2Vec2().Copy(e1).SelfSkew().SelfMul(-1.0 / L1sqr);
            // b2Vec2 Jd2 = (1.0 / L2sqr) * e2.Skew();
            const Jd2 = new b2_math_1.b2Vec2().Copy(e2).SelfSkew().SelfMul(1.0 / L2sqr);
            // b2Vec2 J1 = -Jd1;
            const J1 = Jd1.Clone().SelfNeg();
            // b2Vec2 J2 = Jd1 - Jd2;
            const J2 = Jd1.Clone().SelfSub(Jd2);
            // b2Vec2 J3 = Jd2;
            const J3 = Jd2.Clone();
            c.invEffectiveMass = c.invMass1 * b2_math_1.b2Vec2.DotVV(J1, J1) + c.invMass2 * b2_math_1.b2Vec2.DotVV(J2, J2) + c.invMass3 * b2_math_1.b2Vec2.DotVV(J3, J3);
            // b2Vec2 r = p3 - p1;
            const r = b2_math_1.b2Vec2.SubVV(p3, p1, new b2_math_1.b2Vec2());
            const rr = r.LengthSquared();
            if (rr === 0.0) {
                continue;
            }
            // a1 = h2 / (h1 + h2)
            // a2 = h1 / (h1 + h2)
            c.alpha1 = b2_math_1.b2Vec2.DotVV(e2, r) / rr;
            c.alpha2 = b2_math_1.b2Vec2.DotVV(e1, r) / rr;
        }
        this.m_gravity.Copy(def.gravity);
        this.SetTuning(def.tuning);
    }
    SetTuning(tuning) {
        this.m_tuning.Copy(tuning);
        // Pre-compute spring and damper values based on tuning
        const bendOmega = 2.0 * b2_settings_1.b2_pi * this.m_tuning.bendHertz;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const L1sqr = c.L1 * c.L1;
            const L2sqr = c.L2 * c.L2;
            if (L1sqr * L2sqr === 0.0) {
                c.spring = 0.0;
                c.damper = 0.0;
                continue;
            }
            // Flatten the triangle formed by the two edges
            const J2 = 1.0 / c.L1 + 1.0 / c.L2;
            const sum = c.invMass1 / L1sqr + c.invMass2 * J2 * J2 + c.invMass3 / L2sqr;
            if (sum === 0.0) {
                c.spring = 0.0;
                c.damper = 0.0;
                continue;
            }
            const mass = 1.0 / sum;
            c.spring = mass * bendOmega * bendOmega;
            c.damper = 2.0 * mass * this.m_tuning.bendDamping * bendOmega;
        }
        const stretchOmega = 2.0 * b2_settings_1.b2_pi * this.m_tuning.stretchHertz;
        for (let i = 0; i < this.m_stretchCount; ++i) {
            const c = this.m_stretchConstraints[i];
            const sum = c.invMass1 + c.invMass2;
            if (sum === 0.0) {
                continue;
            }
            const mass = 1.0 / sum;
            c.spring = mass * stretchOmega * stretchOmega;
            c.damper = 2.0 * mass * this.m_tuning.stretchDamping * stretchOmega;
        }
    }
    Step(dt, iterations, position) {
        if (dt === 0.0) {
            return;
        }
        const inv_dt = 1.0 / dt;
        const d = Math.exp(-dt * this.m_tuning.damping);
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
    Reset(position) {
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
    Draw(draw) {
        const c = new b2_draw_1.b2Color(0.4, 0.5, 0.7);
        const pg = new b2_draw_1.b2Color(0.1, 0.8, 0.1);
        const pd = new b2_draw_1.b2Color(0.7, 0.2, 0.4);
        for (let i = 0; i < this.m_count - 1; ++i) {
            draw.DrawSegment(this.m_ps[i], this.m_ps[i + 1], c);
            const pc = this.m_invMasses[i] > 0.0 ? pd : pg;
            draw.DrawPoint(this.m_ps[i], 5.0, pc);
        }
        const pc = this.m_invMasses[this.m_count - 1] > 0.0 ? pd : pg;
        draw.DrawPoint(this.m_ps[this.m_count - 1], 5.0, pc);
    }
    SolveStretch_PBD() {
        const stiffness = this.m_tuning.stretchStiffness;
        for (let i = 0; i < this.m_stretchCount; ++i) {
            const c = this.m_stretchConstraints[i];
            const p1 = this.m_ps[c.i1].Clone();
            const p2 = this.m_ps[c.i2].Clone();
            // b2Vec2 d = p2 - p1;
            const d = p2.Clone().SelfSub(p1);
            const L = d.Normalize();
            const sum = c.invMass1 + c.invMass2;
            if (sum === 0.0) {
                continue;
            }
            const s1 = c.invMass1 / sum;
            const s2 = c.invMass2 / sum;
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
    SolveStretch_XPBD(dt) {
        // 	b2Assert(dt > 0.0);
        for (let i = 0; i < this.m_stretchCount; ++i) {
            const c = this.m_stretchConstraints[i];
            const p1 = this.m_ps[c.i1].Clone();
            const p2 = this.m_ps[c.i2].Clone();
            const dp1 = p1.Clone().SelfSub(this.m_p0s[c.i1]);
            const dp2 = p2.Clone().SelfSub(this.m_p0s[c.i2]);
            // b2Vec2 u = p2 - p1;
            const u = p2.Clone().SelfSub(p1);
            const L = u.Normalize();
            // b2Vec2 J1 = -u;
            const J1 = u.Clone().SelfNeg();
            // b2Vec2 J2 = u;
            const J2 = u;
            const sum = c.invMass1 + c.invMass2;
            if (sum === 0.0) {
                continue;
            }
            const alpha = 1.0 / (c.spring * dt * dt); // 1 / kg
            const beta = dt * dt * c.damper; // kg * s
            const sigma = alpha * beta / dt; // non-dimensional
            const C = L - c.L;
            // This is using the initial velocities
            const Cdot = b2_math_1.b2Vec2.DotVV(J1, dp1) + b2_math_1.b2Vec2.DotVV(J2, dp2);
            const B = C + alpha * c.lambda + sigma * Cdot;
            const sum2 = (1.0 + sigma) * sum + alpha;
            const impulse = -B / sum2;
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
    SolveBend_PBD_Angle() {
        const stiffness = this.m_tuning.bendStiffness;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const p1 = this.m_ps[c.i1];
            const p2 = this.m_ps[c.i2];
            const p3 = this.m_ps[c.i3];
            // b2Vec2 d1 = p2 - p1;
            const d1 = p2.Clone().SelfSub(p1);
            // b2Vec2 d2 = p3 - p2;
            const d2 = p3.Clone().SelfSub(p2);
            const a = b2_math_1.b2Vec2.CrossVV(d1, d2);
            const b = b2_math_1.b2Vec2.DotVV(d1, d2);
            const angle = (0, b2_math_1.b2Atan2)(a, b);
            let L1sqr = 0.0, L2sqr = 0.0;
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
            const Jd1 = new b2_math_1.b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
            // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
            const Jd2 = new b2_math_1.b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);
            // b2Vec2 J1 = -Jd1;
            const J1 = Jd1.Clone().SelfNeg();
            // b2Vec2 J2 = Jd1 - Jd2;
            const J2 = Jd1.Clone().SelfSub(Jd2);
            // b2Vec2 J3 = Jd2;
            const J3 = Jd2;
            let sum = 0.0;
            if (this.m_tuning.fixedEffectiveMass) {
                sum = c.invEffectiveMass;
            }
            else {
                sum = c.invMass1 * b2_math_1.b2Vec2.DotVV(J1, J1) + c.invMass2 * b2_math_1.b2Vec2.DotVV(J2, J2) + c.invMass3 * b2_math_1.b2Vec2.DotVV(J3, J3);
            }
            if (sum === 0.0) {
                sum = c.invEffectiveMass;
            }
            const impulse = -stiffness * angle / sum;
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
    SolveBend_XPBD_Angle(dt) {
        // b2Assert(dt > 0.0);
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const p1 = this.m_ps[c.i1];
            const p2 = this.m_ps[c.i2];
            const p3 = this.m_ps[c.i3];
            const dp1 = p1.Clone().SelfSub(this.m_p0s[c.i1]);
            const dp2 = p2.Clone().SelfSub(this.m_p0s[c.i2]);
            const dp3 = p3.Clone().SelfSub(this.m_p0s[c.i3]);
            // b2Vec2 d1 = p2 - p1;
            const d1 = p2.Clone().SelfSub(p1);
            // b2Vec2 d2 = p3 - p2;
            const d2 = p3.Clone().SelfSub(p2);
            let L1sqr, L2sqr;
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
            const a = b2_math_1.b2Vec2.CrossVV(d1, d2);
            const b = b2_math_1.b2Vec2.DotVV(d1, d2);
            const angle = (0, b2_math_1.b2Atan2)(a, b);
            // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
            // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
            // b2Vec2 J1 = -Jd1;
            // b2Vec2 J2 = Jd1 - Jd2;
            // b2Vec2 J3 = Jd2;
            // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
            const Jd1 = new b2_math_1.b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
            // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
            const Jd2 = new b2_math_1.b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);
            // b2Vec2 J1 = -Jd1;
            const J1 = Jd1.Clone().SelfNeg();
            // b2Vec2 J2 = Jd1 - Jd2;
            const J2 = Jd1.Clone().SelfSub(Jd2);
            // b2Vec2 J3 = Jd2;
            const J3 = Jd2;
            let sum;
            if (this.m_tuning.fixedEffectiveMass) {
                sum = c.invEffectiveMass;
            }
            else {
                sum = c.invMass1 * b2_math_1.b2Vec2.DotVV(J1, J1) + c.invMass2 * b2_math_1.b2Vec2.DotVV(J2, J2) + c.invMass3 * b2_math_1.b2Vec2.DotVV(J3, J3);
            }
            if (sum === 0.0) {
                continue;
            }
            const alpha = 1.0 / (c.spring * dt * dt);
            const beta = dt * dt * c.damper;
            const sigma = alpha * beta / dt;
            const C = angle;
            // This is using the initial velocities
            const Cdot = b2_math_1.b2Vec2.DotVV(J1, dp1) + b2_math_1.b2Vec2.DotVV(J2, dp2) + b2_math_1.b2Vec2.DotVV(J3, dp3);
            const B = C + alpha * c.lambda + sigma * Cdot;
            const sum2 = (1.0 + sigma) * sum + alpha;
            const impulse = -B / sum2;
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
    SolveBend_PBD_Distance() {
        const stiffness = this.m_tuning.bendStiffness;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const i1 = c.i1;
            const i2 = c.i3;
            const p1 = this.m_ps[i1].Clone();
            const p2 = this.m_ps[i2].Clone();
            // b2Vec2 d = p2 - p1;
            const d = p2.Clone().SelfSub(p1);
            const L = d.Normalize();
            const sum = c.invMass1 + c.invMass3;
            if (sum === 0.0) {
                continue;
            }
            const s1 = c.invMass1 / sum;
            const s2 = c.invMass3 / sum;
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
    SolveBend_PBD_Height() {
        const stiffness = this.m_tuning.bendStiffness;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const p1 = this.m_ps[c.i1].Clone();
            const p2 = this.m_ps[c.i2].Clone();
            const p3 = this.m_ps[c.i3].Clone();
            // Barycentric coordinates are held constant
            const d = new b2_math_1.b2Vec2();
            // b2Vec2 d = c.alpha1 * p1 + c.alpha2 * p3 - p2;
            d.x = c.alpha1 * p1.x + c.alpha2 * p3.x - p2.x;
            d.y = c.alpha1 * p1.y + c.alpha2 * p3.y - p2.y;
            const dLen = d.Length();
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
            const sum = c.invMass1 * c.alpha1 * c.alpha1 + c.invMass2 + c.invMass3 * c.alpha2 * c.alpha2;
            if (sum === 0.0) {
                continue;
            }
            const C = dLen;
            const mass = 1.0 / sum;
            const impulse = -stiffness * mass * C;
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
    SolveBend_PBD_Triangle() {
        const stiffness = this.m_tuning.bendStiffness;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const b0 = this.m_ps[c.i1].Clone();
            const v = this.m_ps[c.i2].Clone();
            const b1 = this.m_ps[c.i3].Clone();
            const wb0 = c.invMass1;
            const wv = c.invMass2;
            const wb1 = c.invMass3;
            const W = wb0 + wb1 + 2.0 * wv;
            const invW = stiffness / W;
            const d = new b2_math_1.b2Vec2();
            d.x = v.x - (1.0 / 3.0) * (b0.x + v.x + b1.x);
            d.y = v.y - (1.0 / 3.0) * (b0.y + v.y + b1.y);
            const db0 = new b2_math_1.b2Vec2();
            db0.x = 2.0 * wb0 * invW * d.x;
            db0.y = 2.0 * wb0 * invW * d.y;
            const dv = new b2_math_1.b2Vec2();
            dv.x = -4.0 * wv * invW * d.x;
            dv.y = -4.0 * wv * invW * d.y;
            const db1 = new b2_math_1.b2Vec2();
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
    ApplyBendForces(dt) {
        // omega = 2 * pi * hz
        const omega = 2.0 * b2_settings_1.b2_pi * this.m_tuning.bendHertz;
        for (let i = 0; i < this.m_bendCount; ++i) {
            const c = this.m_bendConstraints[i];
            const p1 = this.m_ps[c.i1].Clone();
            const p2 = this.m_ps[c.i2].Clone();
            const p3 = this.m_ps[c.i3].Clone();
            const v1 = this.m_vs[c.i1];
            const v2 = this.m_vs[c.i2];
            const v3 = this.m_vs[c.i3];
            // b2Vec2 d1 = p2 - p1;
            const d1 = p1.Clone().SelfSub(p1);
            // b2Vec2 d2 = p3 - p2;
            const d2 = p3.Clone().SelfSub(p2);
            let L1sqr, L2sqr;
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
            const a = b2_math_1.b2Vec2.CrossVV(d1, d2);
            const b = b2_math_1.b2Vec2.DotVV(d1, d2);
            const angle = (0, b2_math_1.b2Atan2)(a, b);
            // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
            // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
            // b2Vec2 J1 = -Jd1;
            // b2Vec2 J2 = Jd1 - Jd2;
            // b2Vec2 J3 = Jd2;
            // b2Vec2 Jd1 = (-1.0 / L1sqr) * d1.Skew();
            const Jd1 = new b2_math_1.b2Vec2().Copy(d1).SelfSkew().SelfMul(-1.0 / L1sqr);
            // b2Vec2 Jd2 = (1.0 / L2sqr) * d2.Skew();
            const Jd2 = new b2_math_1.b2Vec2().Copy(d2).SelfSkew().SelfMul(1.0 / L2sqr);
            // b2Vec2 J1 = -Jd1;
            const J1 = Jd1.Clone().SelfNeg();
            // b2Vec2 J2 = Jd1 - Jd2;
            const J2 = Jd1.Clone().SelfSub(Jd2);
            // b2Vec2 J3 = Jd2;
            const J3 = Jd2;
            let sum = 0.0;
            if (this.m_tuning.fixedEffectiveMass) {
                sum = c.invEffectiveMass;
            }
            else {
                sum = c.invMass1 * b2_math_1.b2Vec2.DotVV(J1, J1) + c.invMass2 * b2_math_1.b2Vec2.DotVV(J2, J2) + c.invMass3 * b2_math_1.b2Vec2.DotVV(J3, J3);
            }
            if (sum === 0.0) {
                continue;
            }
            const mass = 1.0 / sum;
            const spring = mass * omega * omega;
            const damper = 2.0 * mass * this.m_tuning.bendDamping * omega;
            const C = angle;
            const Cdot = b2_math_1.b2Vec2.DotVV(J1, v1) + b2_math_1.b2Vec2.DotVV(J2, v2) + b2_math_1.b2Vec2.DotVV(J3, v3);
            const impulse = -dt * (spring * C + damper * Cdot);
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
exports.b2Rope = b2Rope;
