/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
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
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
import { b2_epsilon, b2_epsilon_sq, b2_polygonRadius, b2_linearSlop } from "../common/b2_settings.js"
import { b2Max, b2Vec2, b2Rot, b2Transform } from "../common/b2_math.js"
/// A distance proxy is used by the GJK algorithm.
/// It encapsulates any shape.
export class b2DistanceProxy {
    m_buffer = b2Vec2.MakeArray(2);
    m_vertices = this.m_buffer;
    m_count = 0;
    m_radius = 0;
    Copy(other) {
        if (other.m_vertices === other.m_buffer) {
            this.m_vertices = this.m_buffer;
            this.m_buffer[0].Copy(other.m_buffer[0]);
            this.m_buffer[1].Copy(other.m_buffer[1]);
        }
        else {
            this.m_vertices = other.m_vertices;
        }
        this.m_count = other.m_count;
        this.m_radius = other.m_radius;
        return this;
    }
    Reset() {
        this.m_vertices = this.m_buffer;
        this.m_count = 0;
        this.m_radius = 0;
        return this;
    }
    SetShape(shape, index) {
        shape.SetupDistanceProxy(this, index);
    }
    SetVerticesRadius(vertices, count, radius) {
        this.m_vertices = vertices;
        this.m_count = count;
        this.m_radius = radius;
    }
    GetSupport(d) {
        let bestIndex = 0;
        let bestValue = b2Vec2.DotVV(this.m_vertices[0], d);
        for (let i = 1; i < this.m_count; ++i) {
            const value = b2Vec2.DotVV(this.m_vertices[i], d);
            if (value > bestValue) {
                bestIndex = i;
                bestValue = value;
            }
        }
        return bestIndex;
    }
    GetSupportVertex(d) {
        let bestIndex = 0;
        let bestValue = b2Vec2.DotVV(this.m_vertices[0], d);
        for (let i = 1; i < this.m_count; ++i) {
            const value = b2Vec2.DotVV(this.m_vertices[i], d);
            if (value > bestValue) {
                bestIndex = i;
                bestValue = value;
            }
        }
        return this.m_vertices[bestIndex];
    }
    GetVertexCount() {
        return this.m_count;
    }
    GetVertex(index) {
        // DEBUG: b2Assert(0 <= index && index < this.m_count);
        return this.m_vertices[index];
    }
}
export class b2SimplexCache {
    metric = 0;
    count = 0;
    indexA = [0, 0, 0];
    indexB = [0, 0, 0];
    Reset() {
        this.metric = 0;
        this.count = 0;
        return this;
    }
}
export class b2DistanceInput {
    proxyA = new b2DistanceProxy();
    proxyB = new b2DistanceProxy();
    transformA = new b2Transform();
    transformB = new b2Transform();
    useRadii = false;
    Reset() {
        this.proxyA.Reset();
        this.proxyB.Reset();
        this.transformA.SetIdentity();
        this.transformB.SetIdentity();
        this.useRadii = false;
        return this;
    }
}
export class b2DistanceOutput {
    pointA = new b2Vec2();
    pointB = new b2Vec2();
    distance = 0;
    iterations = 0; ///< number of GJK iterations used
    Reset() {
        this.pointA.SetZero();
        this.pointB.SetZero();
        this.distance = 0;
        this.iterations = 0;
        return this;
    }
}
/// Input parameters for b2ShapeCast
export class b2ShapeCastInput {
    proxyA = new b2DistanceProxy();
    proxyB = new b2DistanceProxy();
    transformA = new b2Transform();
    transformB = new b2Transform();
    translationB = new b2Vec2();
}
/// Output results for b2ShapeCast
export class b2ShapeCastOutput {
    point = new b2Vec2();
    normal = new b2Vec2();
    lambda = 0.0;
    iterations = 0;
}
export let b2_gjkCalls = 0;
export let b2_gjkIters = 0;
export let b2_gjkMaxIters = 0;
export function b2_gjk_reset() {
    b2_gjkCalls = 0;
    b2_gjkIters = 0;
    b2_gjkMaxIters = 0;
}
export class b2SimplexVertex {
    wA = new b2Vec2(); // support point in proxyA
    wB = new b2Vec2(); // support point in proxyB
    w = new b2Vec2(); // wB - wA
    a = 0; // barycentric coordinate for closest point
    indexA = 0; // wA index
    indexB = 0; // wB index
    Copy(other) {
        this.wA.Copy(other.wA); // support point in proxyA
        this.wB.Copy(other.wB); // support point in proxyB
        this.w.Copy(other.w); // wB - wA
        this.a = other.a; // barycentric coordinate for closest point
        this.indexA = other.indexA; // wA index
        this.indexB = other.indexB; // wB index
        return this;
    }
}
export class b2Simplex {
    m_v1 = new b2SimplexVertex();
    m_v2 = new b2SimplexVertex();
    m_v3 = new b2SimplexVertex();
    m_vertices = [ /*3*/];
    m_count = 0;
    constructor() {
        this.m_vertices[0] = this.m_v1;
        this.m_vertices[1] = this.m_v2;
        this.m_vertices[2] = this.m_v3;
    }
    ReadCache(cache, proxyA, transformA, proxyB, transformB) {
        // DEBUG: b2Assert(0 <= cache.count && cache.count <= 3);
        // Copy data from cache.
        this.m_count = cache.count;
        const vertices = this.m_vertices;
        for (let i = 0; i < this.m_count; ++i) {
            const v = vertices[i];
            v.indexA = cache.indexA[i];
            v.indexB = cache.indexB[i];
            const wALocal = proxyA.GetVertex(v.indexA);
            const wBLocal = proxyB.GetVertex(v.indexB);
            b2Transform.MulXV(transformA, wALocal, v.wA);
            b2Transform.MulXV(transformB, wBLocal, v.wB);
            b2Vec2.SubVV(v.wB, v.wA, v.w);
            v.a = 0;
        }
        // Compute the new simplex metric, if it is substantially different than
        // old metric then flush the simplex.
        if (this.m_count > 1) {
            const metric1 = cache.metric;
            const metric2 = this.GetMetric();
            if (metric2 < 0.5 * metric1 || 2 * metric1 < metric2 || metric2 < b2_epsilon) {
                // Reset the simplex.
                this.m_count = 0;
            }
        }
        // If the cache is empty or invalid ...
        if (this.m_count === 0) {
            const v = vertices[0];
            v.indexA = 0;
            v.indexB = 0;
            const wALocal = proxyA.GetVertex(0);
            const wBLocal = proxyB.GetVertex(0);
            b2Transform.MulXV(transformA, wALocal, v.wA);
            b2Transform.MulXV(transformB, wBLocal, v.wB);
            b2Vec2.SubVV(v.wB, v.wA, v.w);
            v.a = 1;
            this.m_count = 1;
        }
    }
    WriteCache(cache) {
        cache.metric = this.GetMetric();
        cache.count = this.m_count;
        const vertices = this.m_vertices;
        for (let i = 0; i < this.m_count; ++i) {
            cache.indexA[i] = vertices[i].indexA;
            cache.indexB[i] = vertices[i].indexB;
        }
    }
    GetSearchDirection(out) {
        switch (this.m_count) {
            case 1:
                return b2Vec2.NegV(this.m_v1.w, out);
            case 2: {
                const e12 = b2Vec2.SubVV(this.m_v2.w, this.m_v1.w, out);
                const sgn = b2Vec2.CrossVV(e12, b2Vec2.NegV(this.m_v1.w, b2Vec2.s_t0));
                if (sgn > 0) {
                    // Origin is left of e12.
                    return b2Vec2.CrossOneV(e12, out);
                }
                else {
                    // Origin is right of e12.
                    return b2Vec2.CrossVOne(e12, out);
                }
            }
            default:
                // DEBUG: b2Assert(false);
                return out.SetZero();
        }
    }
    GetClosestPoint(out) {
        switch (this.m_count) {
            case 0:
                // DEBUG: b2Assert(false);
                return out.SetZero();
            case 1:
                return out.Copy(this.m_v1.w);
            case 2:
                return out.Set(this.m_v1.a * this.m_v1.w.x + this.m_v2.a * this.m_v2.w.x, this.m_v1.a * this.m_v1.w.y + this.m_v2.a * this.m_v2.w.y);
            case 3:
                return out.SetZero();
            default:
                // DEBUG: b2Assert(false);
                return out.SetZero();
        }
    }
    GetWitnessPoints(pA, pB) {
        switch (this.m_count) {
            case 0:
                // DEBUG: b2Assert(false);
                break;
            case 1:
                pA.Copy(this.m_v1.wA);
                pB.Copy(this.m_v1.wB);
                break;
            case 2:
                pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x;
                pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y;
                pB.x = this.m_v1.a * this.m_v1.wB.x + this.m_v2.a * this.m_v2.wB.x;
                pB.y = this.m_v1.a * this.m_v1.wB.y + this.m_v2.a * this.m_v2.wB.y;
                break;
            case 3:
                pB.x = pA.x = this.m_v1.a * this.m_v1.wA.x + this.m_v2.a * this.m_v2.wA.x + this.m_v3.a * this.m_v3.wA.x;
                pB.y = pA.y = this.m_v1.a * this.m_v1.wA.y + this.m_v2.a * this.m_v2.wA.y + this.m_v3.a * this.m_v3.wA.y;
                break;
            default:
                // DEBUG: b2Assert(false);
                break;
        }
    }
    GetMetric() {
        switch (this.m_count) {
            case 0:
                // DEBUG: b2Assert(false);
                return 0;
            case 1:
                return 0;
            case 2:
                return b2Vec2.DistanceVV(this.m_v1.w, this.m_v2.w);
            case 3:
                return b2Vec2.CrossVV(b2Vec2.SubVV(this.m_v2.w, this.m_v1.w, b2Vec2.s_t0), b2Vec2.SubVV(this.m_v3.w, this.m_v1.w, b2Vec2.s_t1));
            default:
                // DEBUG: b2Assert(false);
                return 0;
        }
    }
    Solve2() {
        const w1 = this.m_v1.w;
        const w2 = this.m_v2.w;
        const e12 = b2Vec2.SubVV(w2, w1, b2Simplex.s_e12);
        // w1 region
        const d12_2 = (-b2Vec2.DotVV(w1, e12));
        if (d12_2 <= 0) {
            // a2 <= 0, so we clamp it to 0
            this.m_v1.a = 1;
            this.m_count = 1;
            return;
        }
        // w2 region
        const d12_1 = b2Vec2.DotVV(w2, e12);
        if (d12_1 <= 0) {
            // a1 <= 0, so we clamp it to 0
            this.m_v2.a = 1;
            this.m_count = 1;
            this.m_v1.Copy(this.m_v2);
            return;
        }
        // Must be in e12 region.
        const inv_d12 = 1 / (d12_1 + d12_2);
        this.m_v1.a = d12_1 * inv_d12;
        this.m_v2.a = d12_2 * inv_d12;
        this.m_count = 2;
    }
    Solve3() {
        const w1 = this.m_v1.w;
        const w2 = this.m_v2.w;
        const w3 = this.m_v3.w;
        // Edge12
        // [1      1     ][a1] = [1]
        // [w1.e12 w2.e12][a2] = [0]
        // a3 = 0
        const e12 = b2Vec2.SubVV(w2, w1, b2Simplex.s_e12);
        const w1e12 = b2Vec2.DotVV(w1, e12);
        const w2e12 = b2Vec2.DotVV(w2, e12);
        const d12_1 = w2e12;
        const d12_2 = (-w1e12);
        // Edge13
        // [1      1     ][a1] = [1]
        // [w1.e13 w3.e13][a3] = [0]
        // a2 = 0
        const e13 = b2Vec2.SubVV(w3, w1, b2Simplex.s_e13);
        const w1e13 = b2Vec2.DotVV(w1, e13);
        const w3e13 = b2Vec2.DotVV(w3, e13);
        const d13_1 = w3e13;
        const d13_2 = (-w1e13);
        // Edge23
        // [1      1     ][a2] = [1]
        // [w2.e23 w3.e23][a3] = [0]
        // a1 = 0
        const e23 = b2Vec2.SubVV(w3, w2, b2Simplex.s_e23);
        const w2e23 = b2Vec2.DotVV(w2, e23);
        const w3e23 = b2Vec2.DotVV(w3, e23);
        const d23_1 = w3e23;
        const d23_2 = (-w2e23);
        // Triangle123
        const n123 = b2Vec2.CrossVV(e12, e13);
        const d123_1 = n123 * b2Vec2.CrossVV(w2, w3);
        const d123_2 = n123 * b2Vec2.CrossVV(w3, w1);
        const d123_3 = n123 * b2Vec2.CrossVV(w1, w2);
        // w1 region
        if (d12_2 <= 0 && d13_2 <= 0) {
            this.m_v1.a = 1;
            this.m_count = 1;
            return;
        }
        // e12
        if (d12_1 > 0 && d12_2 > 0 && d123_3 <= 0) {
            const inv_d12 = 1 / (d12_1 + d12_2);
            this.m_v1.a = d12_1 * inv_d12;
            this.m_v2.a = d12_2 * inv_d12;
            this.m_count = 2;
            return;
        }
        // e13
        if (d13_1 > 0 && d13_2 > 0 && d123_2 <= 0) {
            const inv_d13 = 1 / (d13_1 + d13_2);
            this.m_v1.a = d13_1 * inv_d13;
            this.m_v3.a = d13_2 * inv_d13;
            this.m_count = 2;
            this.m_v2.Copy(this.m_v3);
            return;
        }
        // w2 region
        if (d12_1 <= 0 && d23_2 <= 0) {
            this.m_v2.a = 1;
            this.m_count = 1;
            this.m_v1.Copy(this.m_v2);
            return;
        }
        // w3 region
        if (d13_1 <= 0 && d23_1 <= 0) {
            this.m_v3.a = 1;
            this.m_count = 1;
            this.m_v1.Copy(this.m_v3);
            return;
        }
        // e23
        if (d23_1 > 0 && d23_2 > 0 && d123_1 <= 0) {
            const inv_d23 = 1 / (d23_1 + d23_2);
            this.m_v2.a = d23_1 * inv_d23;
            this.m_v3.a = d23_2 * inv_d23;
            this.m_count = 2;
            this.m_v1.Copy(this.m_v3);
            return;
        }
        // Must be in triangle123
        const inv_d123 = 1 / (d123_1 + d123_2 + d123_3);
        this.m_v1.a = d123_1 * inv_d123;
        this.m_v2.a = d123_2 * inv_d123;
        this.m_v3.a = d123_3 * inv_d123;
        this.m_count = 3;
    }
    static s_e12 = new b2Vec2();
    static s_e13 = new b2Vec2();
    static s_e23 = new b2Vec2();
}
const b2Distance_s_simplex = new b2Simplex();
const b2Distance_s_saveA = [0, 0, 0];
const b2Distance_s_saveB = [0, 0, 0];
const b2Distance_s_p = new b2Vec2();
const b2Distance_s_d = new b2Vec2();
const b2Distance_s_normal = new b2Vec2();
const b2Distance_s_supportA = new b2Vec2();
const b2Distance_s_supportB = new b2Vec2();
export function b2Distance(output, cache, input) {
    ++b2_gjkCalls;
    const proxyA = input.proxyA;
    const proxyB = input.proxyB;
    const transformA = input.transformA;
    const transformB = input.transformB;
    // Initialize the simplex.
    const simplex = b2Distance_s_simplex;
    simplex.ReadCache(cache, proxyA, transformA, proxyB, transformB);
    // Get simplex vertices as an array.
    const vertices = simplex.m_vertices;
    const k_maxIters = 20;
    // These store the vertices of the last simplex so that we
    // can check for duplicates and prevent cycling.
    const saveA = b2Distance_s_saveA;
    const saveB = b2Distance_s_saveB;
    let saveCount = 0;
    // Main iteration loop.
    let iter = 0;
    while (iter < k_maxIters) {
        // Copy simplex so we can identify duplicates.
        saveCount = simplex.m_count;
        for (let i = 0; i < saveCount; ++i) {
            saveA[i] = vertices[i].indexA;
            saveB[i] = vertices[i].indexB;
        }
        switch (simplex.m_count) {
            case 1:
                break;
            case 2:
                simplex.Solve2();
                break;
            case 3:
                simplex.Solve3();
                break;
            default:
                // DEBUG: b2Assert(false);
                break;
        }
        // If we have 3 points, then the origin is in the corresponding triangle.
        if (simplex.m_count === 3) {
            break;
        }
        // Get search direction.
        const d = simplex.GetSearchDirection(b2Distance_s_d);
        // Ensure the search direction is numerically fit.
        if (d.LengthSquared() < b2_epsilon_sq) {
            // The origin is probably contained by a line segment
            // or triangle. Thus the shapes are overlapped.
            // We can't return zero here even though there may be overlap.
            // In case the simplex is a point, segment, or triangle it is difficult
            // to determine if the origin is contained in the CSO or very close to it.
            break;
        }
        // Compute a tentative new simplex vertex using support points.
        const vertex = vertices[simplex.m_count];
        vertex.indexA = proxyA.GetSupport(b2Rot.MulTRV(transformA.q, b2Vec2.NegV(d, b2Vec2.s_t0), b2Distance_s_supportA));
        b2Transform.MulXV(transformA, proxyA.GetVertex(vertex.indexA), vertex.wA);
        vertex.indexB = proxyB.GetSupport(b2Rot.MulTRV(transformB.q, d, b2Distance_s_supportB));
        b2Transform.MulXV(transformB, proxyB.GetVertex(vertex.indexB), vertex.wB);
        b2Vec2.SubVV(vertex.wB, vertex.wA, vertex.w);
        // Iteration count is equated to the number of support point calls.
        ++iter;
        ++b2_gjkIters;
        // Check for duplicate support points. This is the main termination criteria.
        let duplicate = false;
        for (let i = 0; i < saveCount; ++i) {
            if (vertex.indexA === saveA[i] && vertex.indexB === saveB[i]) {
                duplicate = true;
                break;
            }
        }
        // If we found a duplicate support point we must exit to avoid cycling.
        if (duplicate) {
            break;
        }
        // New vertex is ok and needed.
        ++simplex.m_count;
    }
    b2_gjkMaxIters = b2Max(b2_gjkMaxIters, iter);
    // Prepare output.
    simplex.GetWitnessPoints(output.pointA, output.pointB);
    output.distance = b2Vec2.DistanceVV(output.pointA, output.pointB);
    output.iterations = iter;
    // Cache the simplex.
    simplex.WriteCache(cache);
    // Apply radii if requested.
    if (input.useRadii) {
        const rA = proxyA.m_radius;
        const rB = proxyB.m_radius;
        if (output.distance > (rA + rB) && output.distance > b2_epsilon) {
            // Shapes are still no overlapped.
            // Move the witness points to the outer surface.
            output.distance -= rA + rB;
            const normal = b2Vec2.SubVV(output.pointB, output.pointA, b2Distance_s_normal);
            normal.Normalize();
            output.pointA.SelfMulAdd(rA, normal);
            output.pointB.SelfMulSub(rB, normal);
        }
        else {
            // Shapes are overlapped when radii are considered.
            // Move the witness points to the middle.
            const p = b2Vec2.MidVV(output.pointA, output.pointB, b2Distance_s_p);
            output.pointA.Copy(p);
            output.pointB.Copy(p);
            output.distance = 0;
        }
    }
}
/// Perform a linear shape cast of shape B moving and shape A fixed. Determines the hit point, normal, and translation fraction.
// GJK-raycast
// Algorithm by Gino van den Bergen.
// "Smooth Mesh Contacts with GJK" in Game Physics Pearls. 2010
// bool b2ShapeCast(b2ShapeCastOutput* output, const b2ShapeCastInput* input);
const b2ShapeCast_s_n = new b2Vec2();
const b2ShapeCast_s_simplex = new b2Simplex();
const b2ShapeCast_s_wA = new b2Vec2();
const b2ShapeCast_s_wB = new b2Vec2();
const b2ShapeCast_s_v = new b2Vec2();
const b2ShapeCast_s_p = new b2Vec2();
const b2ShapeCast_s_pointA = new b2Vec2();
const b2ShapeCast_s_pointB = new b2Vec2();
export function b2ShapeCast(output, input) {
    output.iterations = 0;
    output.lambda = 1.0;
    output.normal.SetZero();
    output.point.SetZero();
    // const b2DistanceProxy* proxyA = &input.proxyA;
    const proxyA = input.proxyA;
    // const b2DistanceProxy* proxyB = &input.proxyB;
    const proxyB = input.proxyB;
    // float32 radiusA = b2Max(proxyA.m_radius, b2_polygonRadius);
    const radiusA = b2Max(proxyA.m_radius, b2_polygonRadius);
    // float32 radiusB = b2Max(proxyB.m_radius, b2_polygonRadius);
    const radiusB = b2Max(proxyB.m_radius, b2_polygonRadius);
    // float32 radius = radiusA + radiusB;
    const radius = radiusA + radiusB;
    // b2Transform xfA = input.transformA;
    const xfA = input.transformA;
    // b2Transform xfB = input.transformB;
    const xfB = input.transformB;
    // b2Vec2 r = input.translationB;
    const r = input.translationB;
    // b2Vec2 n(0.0f, 0.0f);
    const n = b2ShapeCast_s_n.Set(0.0, 0.0);
    // float32 lambda = 0.0f;
    let lambda = 0.0;
    // Initial simplex
    const simplex = b2ShapeCast_s_simplex;
    simplex.m_count = 0;
    // Get simplex vertices as an array.
    // b2SimplexVertex* vertices = &simplex.m_v1;
    const vertices = simplex.m_vertices;
    // Get support point in -r direction
    // int32 indexA = proxyA.GetSupport(b2MulT(xfA.q, -r));
    let indexA = proxyA.GetSupport(b2Rot.MulTRV(xfA.q, b2Vec2.NegV(r, b2Vec2.s_t1), b2Vec2.s_t0));
    // b2Vec2 wA = b2Mul(xfA, proxyA.GetVertex(indexA));
    let wA = b2Transform.MulXV(xfA, proxyA.GetVertex(indexA), b2ShapeCast_s_wA);
    // int32 indexB = proxyB.GetSupport(b2MulT(xfB.q, r));
    let indexB = proxyB.GetSupport(b2Rot.MulTRV(xfB.q, r, b2Vec2.s_t0));
    // b2Vec2 wB = b2Mul(xfB, proxyB.GetVertex(indexB));
    let wB = b2Transform.MulXV(xfB, proxyB.GetVertex(indexB), b2ShapeCast_s_wB);
    // b2Vec2 v = wA - wB;
    const v = b2Vec2.SubVV(wA, wB, b2ShapeCast_s_v);
    // Sigma is the target distance between polygons
    // float32 sigma = b2Max(b2_polygonRadius, radius - b2_polygonRadius);
    const sigma = b2Max(b2_polygonRadius, radius - b2_polygonRadius);
    // const float32 tolerance = 0.5f * b2_linearSlop;
    const tolerance = 0.5 * b2_linearSlop;
    // Main iteration loop.
    // const int32 k_maxIters = 20;
    const k_maxIters = 20;
    // int32 iter = 0;
    let iter = 0;
    // while (iter < k_maxIters && v.Length() - sigma > tolerance)
    while (iter < k_maxIters && v.Length() - sigma > tolerance) {
        // DEBUG: b2Assert(simplex.m_count < 3);
        output.iterations += 1;
        // Support in direction -v (A - B)
        // indexA = proxyA.GetSupport(b2MulT(xfA.q, -v));
        indexA = proxyA.GetSupport(b2Rot.MulTRV(xfA.q, b2Vec2.NegV(v, b2Vec2.s_t1), b2Vec2.s_t0));
        // wA = b2Mul(xfA, proxyA.GetVertex(indexA));
        wA = b2Transform.MulXV(xfA, proxyA.GetVertex(indexA), b2ShapeCast_s_wA);
        // indexB = proxyB.GetSupport(b2MulT(xfB.q, v));
        indexB = proxyB.GetSupport(b2Rot.MulTRV(xfB.q, v, b2Vec2.s_t0));
        // wB = b2Mul(xfB, proxyB.GetVertex(indexB));
        wB = b2Transform.MulXV(xfB, proxyB.GetVertex(indexB), b2ShapeCast_s_wB);
        // b2Vec2 p = wA - wB;
        const p = b2Vec2.SubVV(wA, wB, b2ShapeCast_s_p);
        // -v is a normal at p
        v.Normalize();
        // Intersect ray with plane
        const vp = b2Vec2.DotVV(v, p);
        const vr = b2Vec2.DotVV(v, r);
        if (vp - sigma > lambda * vr) {
            if (vr <= 0.0) {
                return false;
            }
            lambda = (vp - sigma) / vr;
            if (lambda > 1.0) {
                return false;
            }
            // n = -v;
            n.Copy(v).SelfNeg();
            simplex.m_count = 0;
        }
        // Reverse simplex since it works with B - A.
        // Shift by lambda * r because we want the closest point to the current clip point.
        // Note that the support point p is not shifted because we want the plane equation
        // to be formed in unshifted space.
        // b2SimplexVertex* vertex = vertices + simplex.m_count;
        const vertex = vertices[simplex.m_count];
        vertex.indexA = indexB;
        // vertex.wA = wB + lambda * r;
        vertex.wA.Copy(wB).SelfMulAdd(lambda, r);
        vertex.indexB = indexA;
        // vertex.wB = wA;
        vertex.wB.Copy(wA);
        // vertex.w = vertex.wB - vertex.wA;
        vertex.w.Copy(vertex.wB).SelfSub(vertex.wA);
        vertex.a = 1.0;
        simplex.m_count += 1;
        switch (simplex.m_count) {
            case 1:
                break;
            case 2:
                simplex.Solve2();
                break;
            case 3:
                simplex.Solve3();
                break;
            default:
            // DEBUG: b2Assert(false);
        }
        // If we have 3 points, then the origin is in the corresponding triangle.
        if (simplex.m_count === 3) {
            // Overlap
            return false;
        }
        // Get search direction.
        // v = simplex.GetClosestPoint();
        simplex.GetClosestPoint(v);
        // Iteration count is equated to the number of support point calls.
        ++iter;
    }
    if (iter === 0) {
        // Initial overlap
        return false;
    }
    // Prepare output.
    const pointA = b2ShapeCast_s_pointA;
    const pointB = b2ShapeCast_s_pointB;
    simplex.GetWitnessPoints(pointA, pointB);
    if (v.LengthSquared() > 0.0) {
        // n = -v;
        n.Copy(v).SelfNeg();
        n.Normalize();
    }
    // output.point = pointA + radiusA * n;
    output.normal.Copy(n);
    output.lambda = lambda;
    output.iterations = iter;
    return true;
}
