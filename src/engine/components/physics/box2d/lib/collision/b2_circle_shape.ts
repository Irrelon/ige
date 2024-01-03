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

// DEBUG: import { b2Assert } from "../common/b2_settings.js";
import { b2_pi, b2_epsilon } from "../common/b2_settings.js";
import { b2Sq, b2Sqrt, b2Asin, b2Pow, b2Vec2, b2Transform, XY } from "../common/b2_math.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js";
import { b2DistanceProxy } from "./b2_distance.js";
import { b2MassData } from "./b2_shape.js";
import { b2Shape, b2ShapeType } from "./b2_shape.js";

/// A solid circle shape
export class b2CircleShape extends b2Shape {
  public readonly m_p: b2Vec2 = new b2Vec2();

  constructor(radius: number = 0) {
    super(b2ShapeType.e_circleShape, radius);
  }

  public Set(position: XY, radius: number = this.m_radius): this {
    this.m_p.Copy(position);
    this.m_radius = radius;
    return this;
  }

  /// Implement b2Shape.
  public Clone(): b2CircleShape {
    return new b2CircleShape().Copy(this);
  }

  public override Copy(other: b2CircleShape): this {
    super.Copy(other);

    // DEBUG: b2Assert(other instanceof b2CircleShape);

    this.m_p.Copy(other.m_p);
    return this;
  }

  /// @see b2Shape::GetChildCount
  public GetChildCount(): number {
    return 1;
  }

  /// Implement b2Shape.
  private static TestPoint_s_center = new b2Vec2();
  private static TestPoint_s_d = new b2Vec2();
  public TestPoint(transform: b2Transform, p: XY): boolean {
    const center: b2Vec2 = b2Transform.MulXV(transform, this.m_p, b2CircleShape.TestPoint_s_center);
    const d: b2Vec2 = b2Vec2.SubVV(p, center, b2CircleShape.TestPoint_s_d);
    return b2Vec2.DotVV(d, d) <= b2Sq(this.m_radius);
  }

  // #if B2_ENABLE_PARTICLE
  /// @see b2Shape::ComputeDistance
  private static ComputeDistance_s_center = new b2Vec2();
  public ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number {
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
  private static RayCast_s_position = new b2Vec2();
  private static RayCast_s_s = new b2Vec2();
  private static RayCast_s_r = new b2Vec2();
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, transform: b2Transform, childIndex: number): boolean {
    const position: b2Vec2 = b2Transform.MulXV(transform, this.m_p, b2CircleShape.RayCast_s_position);
    const s: b2Vec2 = b2Vec2.SubVV(input.p1, position, b2CircleShape.RayCast_s_s);
    const b: number = b2Vec2.DotVV(s, s) - b2Sq(this.m_radius);

    // Solve quadratic equation.
    const r: b2Vec2 = b2Vec2.SubVV(input.p2, input.p1, b2CircleShape.RayCast_s_r);
    const c: number = b2Vec2.DotVV(s, r);
    const rr: number = b2Vec2.DotVV(r, r);
    const sigma = c * c - rr * b;

    // Check for negative discriminant and short segment.
    if (sigma < 0 || rr < b2_epsilon) {
      return false;
    }

    // Find the point of intersection of the line with the circle.
    let a: number = (-(c + b2Sqrt(sigma)));

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
  private static ComputeAABB_s_p = new b2Vec2();
  public ComputeAABB(aabb: b2AABB, transform: b2Transform, childIndex: number): void {
    const p: b2Vec2 = b2Transform.MulXV(transform, this.m_p, b2CircleShape.ComputeAABB_s_p);
    aabb.lowerBound.Set(p.x - this.m_radius, p.y - this.m_radius);
    aabb.upperBound.Set(p.x + this.m_radius, p.y + this.m_radius);
  }

  /// @see b2Shape::ComputeMass
  public ComputeMass(massData: b2MassData, density: number): void {
    const radius_sq: number = b2Sq(this.m_radius);
    massData.mass = density * b2_pi * radius_sq;
    massData.center.Copy(this.m_p);

    // inertia about the local origin
    massData.I = massData.mass * (0.5 * radius_sq + b2Vec2.DotVV(this.m_p, this.m_p));
  }

  public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void {
    proxy.m_vertices = proxy.m_buffer;
    proxy.m_vertices[0].Copy(this.m_p);
    proxy.m_count = 1;
    proxy.m_radius = this.m_radius;
  }

  public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number {
    const p: b2Vec2 = b2Transform.MulXV(xf, this.m_p, new b2Vec2());
    const l: number = (-(b2Vec2.DotVV(normal, p) - offset));

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
    const r2: number = this.m_radius * this.m_radius;
    const l2: number = l * l;
    const area: number = r2 * (b2Asin(l / this.m_radius) + b2_pi / 2) + l * b2Sqrt(r2 - l2);
    const com: number = (-2 / 3 * b2Pow(r2 - l2, 1.5) / area);

    c.x = p.x + normal.x * com;
    c.y = p.y + normal.y * com;

    return area;
  }

  public Dump(log: (format: string, ...args: any[]) => void): void {
    log("    const shape: b2CircleShape = new b2CircleShape();\n");
    log("    shape.m_radius = %.15f;\n", this.m_radius);
    log("    shape.m_p.Set(%.15f, %.15f);\n", this.m_p.x, this.m_p.y);
  }
}
