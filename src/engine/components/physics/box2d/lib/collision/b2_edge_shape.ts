/*
* Copyright (c) 2006-2010 Erin Catto http://www.box2d.org
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
import { b2_polygonRadius } from "../common/b2_settings.js";
import { b2Vec2, b2Rot, b2Transform, XY } from "../common/b2_math.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js";
import { b2DistanceProxy } from "./b2_distance.js";
import { b2MassData } from "./b2_shape.js";
import { b2Shape, b2ShapeType } from "./b2_shape.js";

/// A line segment (edge) shape. These can be connected in chains or loops
/// to other edge shapes. Edges created independently are two-sided and do
/// no provide smooth movement across junctions.
export class b2EdgeShape extends b2Shape {
  public readonly m_vertex1: b2Vec2 = new b2Vec2();
  public readonly m_vertex2: b2Vec2 = new b2Vec2();
  public readonly m_vertex0: b2Vec2 = new b2Vec2();
  public readonly m_vertex3: b2Vec2 = new b2Vec2();

  /// Uses m_vertex0 and m_vertex3 to create smooth collision.
  public m_oneSided: boolean = false;

  constructor() {
    super(b2ShapeType.e_edgeShape, b2_polygonRadius);
  }

  /// Set this as a part of a sequence. Vertex v0 precedes the edge and vertex v3
	/// follows. These extra vertices are used to provide smooth movement
	/// across junctions. This also makes the collision one-sided. The edge
	/// normal points to the right looking from v1 to v2.
	// void SetOneSided(const b2Vec2& v0, const b2Vec2& v1,const b2Vec2& v2, const b2Vec2& v3);
  public SetOneSided(v0: XY, v1: XY, v2: XY, v3: XY): this {
    this.m_vertex0.Copy(v0);
    this.m_vertex1.Copy(v1);
    this.m_vertex2.Copy(v2);
    this.m_vertex3.Copy(v3);
    this.m_oneSided = true;
    return this;
  }

	/// Set this as an isolated edge. Collision is two-sided.
  public SetTwoSided(v1: XY, v2: XY): this {
    this.m_vertex1.Copy(v1);
    this.m_vertex2.Copy(v2);
    this.m_oneSided = false;
    return this;
  }

  /// Implement b2Shape.
  public Clone(): b2EdgeShape {
    return new b2EdgeShape().Copy(this);
  }

  public override Copy(other: b2EdgeShape): this {
    super.Copy(other);

    // DEBUG: b2Assert(other instanceof b2EdgeShape);

    this.m_vertex1.Copy(other.m_vertex1);
    this.m_vertex2.Copy(other.m_vertex2);
    this.m_vertex0.Copy(other.m_vertex0);
    this.m_vertex3.Copy(other.m_vertex3);
    this.m_oneSided = other.m_oneSided;

    return this;
  }

  /// @see b2Shape::GetChildCount
  public GetChildCount(): number {
    return 1;
  }

  /// @see b2Shape::TestPoint
  public TestPoint(xf: b2Transform, p: XY): boolean {
    return false;
  }

  // #if B2_ENABLE_PARTICLE
  /// @see b2Shape::ComputeDistance
  private static ComputeDistance_s_v1 = new b2Vec2();
  private static ComputeDistance_s_v2 = new b2Vec2();
  private static ComputeDistance_s_d = new b2Vec2();
  private static ComputeDistance_s_s = new b2Vec2();
  public ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number {
    const v1 = b2Transform.MulXV(xf, this.m_vertex1, b2EdgeShape.ComputeDistance_s_v1);
    const v2 = b2Transform.MulXV(xf, this.m_vertex2, b2EdgeShape.ComputeDistance_s_v2);

    const d = b2Vec2.SubVV(p, v1, b2EdgeShape.ComputeDistance_s_d);
    const s = b2Vec2.SubVV(v2, v1, b2EdgeShape.ComputeDistance_s_s);
    const ds = b2Vec2.DotVV(d, s);
    if (ds > 0) {
      const s2 = b2Vec2.DotVV(s, s);
      if (ds > s2) {
        b2Vec2.SubVV(p, v2, d);
      } else {
        d.SelfMulSub(ds / s2, s);
      }
    }
    normal.Copy(d);
    return normal.Normalize();
  }
  // #endif

  /// Implement b2Shape.
  // p = p1 + t * d
  // v = v1 + s * e
  // p1 + t * d = v1 + s * e
  // s * e - t * d = p1 - v1
  private static RayCast_s_p1 = new b2Vec2();
  private static RayCast_s_p2 = new b2Vec2();
  private static RayCast_s_d = new b2Vec2();
  private static RayCast_s_e = new b2Vec2();
  private static RayCast_s_q = new b2Vec2();
  private static RayCast_s_r = new b2Vec2();
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean {
    // Put the ray into the edge's frame of reference.
    const p1: b2Vec2 = b2Transform.MulTXV(xf, input.p1, b2EdgeShape.RayCast_s_p1);
    const p2: b2Vec2 = b2Transform.MulTXV(xf, input.p2, b2EdgeShape.RayCast_s_p2);
    const d: b2Vec2 = b2Vec2.SubVV(p2, p1, b2EdgeShape.RayCast_s_d);

    const v1: b2Vec2 = this.m_vertex1;
    const v2: b2Vec2 = this.m_vertex2;
    const e: b2Vec2 = b2Vec2.SubVV(v2, v1, b2EdgeShape.RayCast_s_e);

  	// Normal points to the right, looking from v1 at v2
    const normal: b2Vec2 = output.normal.Set(e.y, -e.x).SelfNormalize();

    // q = p1 + t * d
    // dot(normal, q - v1) = 0
    // dot(normal, p1 - v1) + t * dot(normal, d) = 0
    const numerator: number = b2Vec2.DotVV(normal, b2Vec2.SubVV(v1, p1, b2Vec2.s_t0));
    if (this.m_oneSided && numerator > 0.0) {
      return false;
    }

    const denominator: number = b2Vec2.DotVV(normal, d);

    if (denominator === 0) {
      return false;
    }

    const t: number = numerator / denominator;
    if (t < 0 || input.maxFraction < t) {
      return false;
    }

    const q: b2Vec2 = b2Vec2.AddVMulSV(p1, t, d, b2EdgeShape.RayCast_s_q);

    // q = v1 + s * r
    // s = dot(q - v1, r) / dot(r, r)
    const r: b2Vec2 = b2Vec2.SubVV(v2, v1, b2EdgeShape.RayCast_s_r);
    const rr: number = b2Vec2.DotVV(r, r);
    if (rr === 0) {
      return false;
    }

    const s: number = b2Vec2.DotVV(b2Vec2.SubVV(q, v1, b2Vec2.s_t0), r) / rr;
    if (s < 0 || 1 < s) {
      return false;
    }

    output.fraction = t;
    b2Rot.MulRV(xf.q, output.normal, output.normal);
    if (numerator > 0) {
      output.normal.SelfNeg();
    }
    return true;
  }

  /// @see b2Shape::ComputeAABB
  private static ComputeAABB_s_v1 = new b2Vec2();
  private static ComputeAABB_s_v2 = new b2Vec2();
  public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void {
    const v1: b2Vec2 = b2Transform.MulXV(xf, this.m_vertex1, b2EdgeShape.ComputeAABB_s_v1);
    const v2: b2Vec2 = b2Transform.MulXV(xf, this.m_vertex2, b2EdgeShape.ComputeAABB_s_v2);

    b2Vec2.MinV(v1, v2, aabb.lowerBound);
    b2Vec2.MaxV(v1, v2, aabb.upperBound);

    const r: number = this.m_radius;
    aabb.lowerBound.SelfSubXY(r, r);
    aabb.upperBound.SelfAddXY(r, r);
  }

  /// @see b2Shape::ComputeMass
  public ComputeMass(massData: b2MassData, density: number): void {
    massData.mass = 0;
    b2Vec2.MidVV(this.m_vertex1, this.m_vertex2, massData.center);
    massData.I = 0;
  }

  public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void {
    proxy.m_vertices = proxy.m_buffer;
    proxy.m_vertices[0].Copy(this.m_vertex1);
    proxy.m_vertices[1].Copy(this.m_vertex2);
    proxy.m_count = 2;
    proxy.m_radius = this.m_radius;
  }

  public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number {
    c.SetZero();
    return 0;
  }

  public Dump(log: (format: string, ...args: any[]) => void): void {
    log("    const shape: b2EdgeShape = new b2EdgeShape();\n");
    log("    shape.m_radius = %.15f;\n", this.m_radius);
    log("    shape.m_vertex0.Set(%.15f, %.15f);\n", this.m_vertex0.x, this.m_vertex0.y);
    log("    shape.m_vertex1.Set(%.15f, %.15f);\n", this.m_vertex1.x, this.m_vertex1.y);
    log("    shape.m_vertex2.Set(%.15f, %.15f);\n", this.m_vertex2.x, this.m_vertex2.y);
    log("    shape.m_vertex3.Set(%.15f, %.15f);\n", this.m_vertex3.x, this.m_vertex3.y);
    log("    shape.m_oneSided = %s;\n", this.m_oneSided);
  }
}
