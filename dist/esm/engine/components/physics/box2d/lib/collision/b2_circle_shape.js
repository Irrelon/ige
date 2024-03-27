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
import { b2_pi, b2_epsilon } from "../common/b2_settings.js"
import { b2Sq, b2Sqrt, b2Asin, b2Pow, b2Vec2, b2Transform } from "../common/b2_math.js"
import { b2Shape, b2ShapeType } from "./b2_shape.js"
/// A solid circle shape
export class b2CircleShape extends b2Shape {
    m_p = new b2Vec2();
    constructor(radius = 0) {
        super(b2ShapeType.e_circleShape, radius);
    }
    Set(position, radius = this.m_radius) {
        this.m_p.Copy(position);
        this.m_radius = radius;
        return this;
    }
    /// Implement b2Shape.
    Clone() {
        return new b2CircleShape().Copy(this);
    }
    Copy(other) {
        super.Copy(other);
        // DEBUG: b2Assert(other instanceof b2CircleShape);
        this.m_p.Copy(other.m_p);
        return this;
    }
    /// @see b2Shape::GetChildCount
    GetChildCount() {
        return 1;
    }
    /// Implement b2Shape.
    static TestPoint_s_center = new b2Vec2();
    static TestPoint_s_d = new b2Vec2();
    TestPoint(transform, p) {
        const center = b2Transform.MulXV(transform, this.m_p, b2CircleShape.TestPoint_s_center);
        const d = b2Vec2.SubVV(p, center, b2CircleShape.TestPoint_s_d);
        return b2Vec2.DotVV(d, d) <= b2Sq(this.m_radius);
    }
    // #if B2_ENABLE_PARTICLE
    /// @see b2Shape::ComputeDistance
    static ComputeDistance_s_center = new b2Vec2();
    ComputeDistance(xf, p, normal, childIndex) {
        const center = b2Transform.MulXV(xf, this.m_p, b2CircleShape.ComputeDistance_s_center);
        b2Vec2.SubVV(p, center, normal);
        return normal.Normalize() - this.m_radius;
    }
    // #endif
    /// Implement b2Shape.
    /// @note because the circle is solid, rays that start inside do not hit because the normal is
    /// not defined.
    // Collision Detection in Interactive 3D Environments by Gino van den Bergen
    // From Section 3.1.2
    // x = s + a * r
    // norm(x) = radius
    static RayCast_s_position = new b2Vec2();
    static RayCast_s_s = new b2Vec2();
    static RayCast_s_r = new b2Vec2();
    RayCast(output, input, transform, childIndex) {
        const position = b2Transform.MulXV(transform, this.m_p, b2CircleShape.RayCast_s_position);
        const s = b2Vec2.SubVV(input.p1, position, b2CircleShape.RayCast_s_s);
        const b = b2Vec2.DotVV(s, s) - b2Sq(this.m_radius);
        // Solve quadratic equation.
        const r = b2Vec2.SubVV(input.p2, input.p1, b2CircleShape.RayCast_s_r);
        const c = b2Vec2.DotVV(s, r);
        const rr = b2Vec2.DotVV(r, r);
        const sigma = c * c - rr * b;
        // Check for negative discriminant and short segment.
        if (sigma < 0 || rr < b2_epsilon) {
            return false;
        }
        // Find the point of intersection of the line with the circle.
        let a = (-(c + b2Sqrt(sigma)));
        // Is the intersection point on the segment?
        if (0 <= a && a <= input.maxFraction * rr) {
            a /= rr;
            output.fraction = a;
            b2Vec2.AddVMulSV(s, a, r, output.normal).SelfNormalize();
            return true;
        }
        return false;
    }
    /// @see b2Shape::ComputeAABB
    static ComputeAABB_s_p = new b2Vec2();
    ComputeAABB(aabb, transform, childIndex) {
        const p = b2Transform.MulXV(transform, this.m_p, b2CircleShape.ComputeAABB_s_p);
        aabb.lowerBound.Set(p.x - this.m_radius, p.y - this.m_radius);
        aabb.upperBound.Set(p.x + this.m_radius, p.y + this.m_radius);
    }
    /// @see b2Shape::ComputeMass
    ComputeMass(massData, density) {
        const radius_sq = b2Sq(this.m_radius);
        massData.mass = density * b2_pi * radius_sq;
        massData.center.Copy(this.m_p);
        // inertia about the local origin
        massData.I = massData.mass * (0.5 * radius_sq + b2Vec2.DotVV(this.m_p, this.m_p));
    }
    SetupDistanceProxy(proxy, index) {
        proxy.m_vertices = proxy.m_buffer;
        proxy.m_vertices[0].Copy(this.m_p);
        proxy.m_count = 1;
        proxy.m_radius = this.m_radius;
    }
    ComputeSubmergedArea(normal, offset, xf, c) {
        const p = b2Transform.MulXV(xf, this.m_p, new b2Vec2());
        const l = (-(b2Vec2.DotVV(normal, p) - offset));
        if (l < (-this.m_radius) + b2_epsilon) {
            // Completely dry
            return 0;
        }
        if (l > this.m_radius) {
            // Completely wet
            c.Copy(p);
            return b2_pi * this.m_radius * this.m_radius;
        }
        // Magic
        const r2 = this.m_radius * this.m_radius;
        const l2 = l * l;
        const area = r2 * (b2Asin(l / this.m_radius) + b2_pi / 2) + l * b2Sqrt(r2 - l2);
        const com = (-2 / 3 * b2Pow(r2 - l2, 1.5) / area);
        c.x = p.x + normal.x * com;
        c.y = p.y + normal.y * com;
        return area;
    }
    Dump(log) {
        log("    const shape: b2CircleShape = new b2CircleShape();\n");
        log("    shape.m_radius = %.15f;\n", this.m_radius);
        log("    shape.m_p.Set(%.15f, %.15f);\n", this.m_p.x, this.m_p.y);
    }
}
