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

// DEBUG: import { b2Assert, b2_epsilon_sq } from "../common/b2_settings.js";
import { b2_epsilon, b2_maxFloat, b2_linearSlop, b2_polygonRadius } from "../common/b2_settings.js";
import { b2Vec2, b2Rot, b2Transform, XY } from "../common/b2_math.js";
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js";
import { b2DistanceProxy } from "./b2_distance.js";
import { b2MassData } from "./b2_shape.js";
import { b2Shape, b2ShapeType } from "./b2_shape.js";

/// A solid convex polygon. It is assumed that the interior of the polygon is to
/// the left of each edge.
/// In most cases you should not need many vertices for a convex polygon.
export class b2PolygonShape extends b2Shape {
  public readonly m_centroid: b2Vec2 = new b2Vec2(0, 0);
  public m_vertices: b2Vec2[] = [];
  public m_normals: b2Vec2[] = [];
  public m_count: number = 0;

  constructor() {
    super(b2ShapeType.e_polygonShape, b2_polygonRadius);
  }

  /// Implement b2Shape.
  public Clone(): b2PolygonShape {
    return new b2PolygonShape().Copy(this);
  }

  public override Copy(other: b2PolygonShape): this {
    super.Copy(other);

    // DEBUG: b2Assert(other instanceof b2PolygonShape);

    this.m_centroid.Copy(other.m_centroid);
    this.m_count = other.m_count;
    this.m_vertices = b2Vec2.MakeArray(this.m_count);
    this.m_normals = b2Vec2.MakeArray(this.m_count);
    for (let i: number = 0; i < this.m_count; ++i) {
      this.m_vertices[i].Copy(other.m_vertices[i]);
      this.m_normals[i].Copy(other.m_normals[i]);
    }
    return this;
  }

  /// @see b2Shape::GetChildCount
  public GetChildCount(): number {
    return 1;
  }

  /// Create a convex hull from the given array of points.
  /// @warning the points may be re-ordered, even if they form a convex polygon
  /// @warning collinear points are handled but not removed. Collinear points
  /// may lead to poor stacking behavior.
  private static Set_s_r = new b2Vec2();
  private static Set_s_v = new b2Vec2();
  public Set(vertices: XY[]): b2PolygonShape;
  public Set(vertices: XY[], count: number): b2PolygonShape;
  public Set(vertices: number[]): b2PolygonShape;
  public Set(...args: any[]): b2PolygonShape {
    if (typeof args[0][0] === "number") {
      const vertices: number[] = args[0];
      if (vertices.length % 2 !== 0) { throw new Error(); }
      return this._Set((index: number): XY => ({ x: vertices[index * 2], y: vertices[index * 2 + 1] }), vertices.length / 2);
    } else {
      const vertices: XY[] = args[0];
      const count: number = args[1] || vertices.length;
      return this._Set((index: number): XY => vertices[index], count);
    }
  }
  public _Set(vertices: (index: number) => XY, count: number): b2PolygonShape {

    // DEBUG: b2Assert(3 <= count);
    if (count < 3) {
      return this.SetAsBox(1, 1);
    }

    let n: number = count;

    // Perform welding and copy vertices into local buffer.
    const ps: XY[] = [];
    for (let i = 0; i < n; ++i) {
      const /*b2Vec2*/ v = vertices(i);

      let /*bool*/ unique = true;
      for (let /*int32*/ j = 0; j < ps.length; ++j) {
        if (b2Vec2.DistanceSquaredVV(v, ps[j]) < ((0.5 * b2_linearSlop) * (0.5 * b2_linearSlop))) {
          unique = false;
          break;
        }
      }

      if (unique) {
        ps.push(v);
      }
    }

    n = ps.length;
    if (n < 3) {
      // Polygon is degenerate.
      // DEBUG: b2Assert(false);
      return this.SetAsBox(1.0, 1.0);
    }

    // Create the convex hull using the Gift wrapping algorithm
    // http://en.wikipedia.org/wiki/Gift_wrapping_algorithm

    // Find the right most point on the hull
    let i0: number = 0;
    let x0: number = ps[0].x;
    for (let i: number = 1; i < n; ++i) {
      const x: number = ps[i].x;
      if (x > x0 || (x === x0 && ps[i].y < ps[i0].y)) {
        i0 = i;
        x0 = x;
      }
    }

    const hull: number[] = [];
    let m: number = 0;
    let ih: number = i0;

    for (; ;) {
      hull[m] = ih;

      let ie: number = 0;
      for (let j: number = 1; j < n; ++j) {
        if (ie === ih) {
          ie = j;
          continue;
        }

        const r: b2Vec2 = b2Vec2.SubVV(ps[ie], ps[hull[m]], b2PolygonShape.Set_s_r);
        const v: b2Vec2 = b2Vec2.SubVV(ps[j], ps[hull[m]], b2PolygonShape.Set_s_v);
        const c: number = b2Vec2.CrossVV(r, v);
        if (c < 0) {
          ie = j;
        }

        // Collinearity check
        if (c === 0 && v.LengthSquared() > r.LengthSquared()) {
          ie = j;
        }
      }

      ++m;
      ih = ie;

      if (ie === i0) {
        break;
      }
    }

    this.m_count = m;
    this.m_vertices = b2Vec2.MakeArray(this.m_count);
    this.m_normals = b2Vec2.MakeArray(this.m_count);

    // Copy vertices.
    for (let i: number = 0; i < m; ++i) {
      this.m_vertices[i].Copy(ps[hull[i]]);
    }

    // Compute normals. Ensure the edges have non-zero length.
    for (let i: number = 0; i < m; ++i) {
      const vertexi1: b2Vec2 = this.m_vertices[i];
      const vertexi2: b2Vec2 = this.m_vertices[(i + 1) % m];
      const edge: b2Vec2 = b2Vec2.SubVV(vertexi2, vertexi1, b2Vec2.s_t0); // edge uses s_t0
      // DEBUG: b2Assert(edge.LengthSquared() > b2_epsilon_sq);
      b2Vec2.CrossVOne(edge, this.m_normals[i]).SelfNormalize();
    }

    // Compute the polygon centroid.
    b2PolygonShape.ComputeCentroid(this.m_vertices, m, this.m_centroid);

    return this;
  }

  /// Build vertices to represent an axis-aligned box or an oriented box.
  /// @param hx the half-width.
  /// @param hy the half-height.
  /// @param center the center of the box in local coordinates.
  /// @param angle the rotation of the box in local coordinates.
  public SetAsBox(hx: number, hy: number, center?: XY, angle: number = 0): b2PolygonShape {
    this.m_count = 4;
    this.m_vertices = b2Vec2.MakeArray(this.m_count);
    this.m_normals = b2Vec2.MakeArray(this.m_count);
    this.m_vertices[0].Set((-hx), (-hy));
    this.m_vertices[1].Set(hx, (-hy));
    this.m_vertices[2].Set(hx, hy);
    this.m_vertices[3].Set((-hx), hy);
    this.m_normals[0].Set(0, (-1));
    this.m_normals[1].Set(1, 0);
    this.m_normals[2].Set(0, 1);
    this.m_normals[3].Set((-1), 0);
    this.m_centroid.SetZero();

    if (center) {
      this.m_centroid.Copy(center);

      const xf: b2Transform = new b2Transform();
      xf.SetPosition(center);
      xf.SetRotationAngle(angle);

      // Transform vertices and normals.
      for (let i: number = 0; i < this.m_count; ++i) {
        b2Transform.MulXV(xf, this.m_vertices[i], this.m_vertices[i]);
        b2Rot.MulRV(xf.q, this.m_normals[i], this.m_normals[i]);
      }
    }

    return this;
  }

  /// @see b2Shape::TestPoint
  private static TestPoint_s_pLocal = new b2Vec2();
  public TestPoint(xf: b2Transform, p: XY): boolean {
    const pLocal: b2Vec2 = b2Transform.MulTXV(xf, p, b2PolygonShape.TestPoint_s_pLocal);

    for (let i: number = 0; i < this.m_count; ++i) {
      const dot: number = b2Vec2.DotVV(this.m_normals[i], b2Vec2.SubVV(pLocal, this.m_vertices[i], b2Vec2.s_t0));
      if (dot > 0) {
        return false;
      }
    }

    return true;
  }

  // #if B2_ENABLE_PARTICLE
  /// @see b2Shape::ComputeDistance
  private static ComputeDistance_s_pLocal = new b2Vec2();
  private static ComputeDistance_s_normalForMaxDistance = new b2Vec2();
  private static ComputeDistance_s_minDistance = new b2Vec2();
  private static ComputeDistance_s_distance = new b2Vec2();
  public ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number {
    const pLocal = b2Transform.MulTXV(xf, p, b2PolygonShape.ComputeDistance_s_pLocal);
    let maxDistance = -b2_maxFloat;
    const normalForMaxDistance = b2PolygonShape.ComputeDistance_s_normalForMaxDistance.Copy(pLocal);

    for (let i = 0; i < this.m_count; ++i) {
      const dot = b2Vec2.DotVV(this.m_normals[i], b2Vec2.SubVV(pLocal, this.m_vertices[i], b2Vec2.s_t0));
      if (dot > maxDistance) {
        maxDistance = dot;
        normalForMaxDistance.Copy(this.m_normals[i]);
      }
    }

    if (maxDistance > 0) {
      const minDistance = b2PolygonShape.ComputeDistance_s_minDistance.Copy(normalForMaxDistance);
      let minDistance2 = maxDistance * maxDistance;
      for (let i = 0; i < this.m_count; ++i) {
        const distance = b2Vec2.SubVV(pLocal, this.m_vertices[i], b2PolygonShape.ComputeDistance_s_distance);
        const distance2 = distance.LengthSquared();
        if (minDistance2 > distance2) {
          minDistance.Copy(distance);
          minDistance2 = distance2;
        }
      }

      b2Rot.MulRV(xf.q, minDistance, normal);
      normal.Normalize();
      return Math.sqrt(minDistance2);
    } else {
      b2Rot.MulRV(xf.q, normalForMaxDistance, normal);
      return maxDistance;
    }
  }
  // #endif

  /// Implement b2Shape.
  /// @note because the polygon is solid, rays that start inside do not hit because the normal is
  /// not defined.
  private static RayCast_s_p1 = new b2Vec2();
  private static RayCast_s_p2 = new b2Vec2();
  private static RayCast_s_d = new b2Vec2();
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean {
    // Put the ray into the polygon's frame of reference.
    const p1: b2Vec2 = b2Transform.MulTXV(xf, input.p1, b2PolygonShape.RayCast_s_p1);
    const p2: b2Vec2 = b2Transform.MulTXV(xf, input.p2, b2PolygonShape.RayCast_s_p2);
    const d: b2Vec2 = b2Vec2.SubVV(p2, p1, b2PolygonShape.RayCast_s_d);

    let lower: number = 0, upper = input.maxFraction;

    let index: number = -1;

    for (let i: number = 0; i < this.m_count; ++i) {
      // p = p1 + a * d
      // dot(normal, p - v) = 0
      // dot(normal, p1 - v) + a * dot(normal, d) = 0
      const numerator: number = b2Vec2.DotVV(this.m_normals[i], b2Vec2.SubVV(this.m_vertices[i], p1, b2Vec2.s_t0));
      const denominator: number = b2Vec2.DotVV(this.m_normals[i], d);

      if (denominator === 0) {
        if (numerator < 0) {
          return false;
        }
      } else {
        // Note: we want this predicate without division:
        // lower < numerator / denominator, where denominator < 0
        // Since denominator < 0, we have to flip the inequality:
        // lower < numerator / denominator <==> denominator * lower > numerator.
        if (denominator < 0 && numerator < lower * denominator) {
          // Increase lower.
          // The segment enters this half-space.
          lower = numerator / denominator;
          index = i;
        } else if (denominator > 0 && numerator < upper * denominator) {
          // Decrease upper.
          // The segment exits this half-space.
          upper = numerator / denominator;
        }
      }

      // The use of epsilon here causes the assert on lower to trip
      // in some cases. Apparently the use of epsilon was to make edge
      // shapes work, but now those are handled separately.
      // if (upper < lower - b2_epsilon)
      if (upper < lower) {
        return false;
      }
    }

    // DEBUG: b2Assert(0 <= lower && lower <= input.maxFraction);

    if (index >= 0) {
      output.fraction = lower;
      b2Rot.MulRV(xf.q, this.m_normals[index], output.normal);
      return true;
    }

    return false;
  }

  /// @see b2Shape::ComputeAABB
  private static ComputeAABB_s_v = new b2Vec2();
  public ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void {
    const lower: b2Vec2 = b2Transform.MulXV(xf, this.m_vertices[0], aabb.lowerBound);
    const upper: b2Vec2 = aabb.upperBound.Copy(lower);

    for (let i: number = 0; i < this.m_count; ++i) {
      const v: b2Vec2 = b2Transform.MulXV(xf, this.m_vertices[i], b2PolygonShape.ComputeAABB_s_v);
      b2Vec2.MinV(v, lower, lower);
      b2Vec2.MaxV(v, upper, upper);
    }

    const r: number = this.m_radius;
    lower.SelfSubXY(r, r);
    upper.SelfAddXY(r, r);
  }

  /// @see b2Shape::ComputeMass
  private static ComputeMass_s_center = new b2Vec2();
  private static ComputeMass_s_s = new b2Vec2();
  private static ComputeMass_s_e1 = new b2Vec2();
  private static ComputeMass_s_e2 = new b2Vec2();
  public ComputeMass(massData: b2MassData, density: number): void {
    // Polygon mass, centroid, and inertia.
    // Let rho be the polygon density in mass per unit area.
    // Then:
    // mass = rho * int(dA)
    // centroid.x = (1/mass) * rho * int(x * dA)
    // centroid.y = (1/mass) * rho * int(y * dA)
    // I = rho * int((x*x + y*y) * dA)
    //
    // We can compute these integrals by summing all the integrals
    // for each triangle of the polygon. To evaluate the integral
    // for a single triangle, we make a change of variables to
    // the (u,v) coordinates of the triangle:
    // x = x0 + e1x * u + e2x * v
    // y = y0 + e1y * u + e2y * v
    // where 0 <= u && 0 <= v && u + v <= 1.
    //
    // We integrate u from [0,1-v] and then v from [0,1].
    // We also need to use the Jacobian of the transformation:
    // D = cross(e1, e2)
    //
    // Simplification: triangle centroid = (1/3) * (p1 + p2 + p3)
    //
    // The rest of the derivation is handled by computer algebra.

    // DEBUG: b2Assert(this.m_count >= 3);

    const center: b2Vec2 = b2PolygonShape.ComputeMass_s_center.SetZero();
    let area: number = 0;
    let I: number = 0;

    // Get a reference point for forming triangles.
    // Use the first vertex to reduce round-off errors.
    const s: b2Vec2 = b2PolygonShape.ComputeMass_s_s.Copy(this.m_vertices[0]);

    const k_inv3: number = 1 / 3;

    for (let i: number = 0; i < this.m_count; ++i) {
      // Triangle vertices.
      const e1: b2Vec2 = b2Vec2.SubVV(this.m_vertices[i], s, b2PolygonShape.ComputeMass_s_e1);
      const e2: b2Vec2 = b2Vec2.SubVV(this.m_vertices[(i + 1) % this.m_count], s, b2PolygonShape.ComputeMass_s_e2);

      const D: number = b2Vec2.CrossVV(e1, e2);

      const triangleArea: number = 0.5 * D;
      area += triangleArea;

      // Area weighted centroid
      center.SelfAdd(b2Vec2.MulSV(triangleArea * k_inv3, b2Vec2.AddVV(e1, e2, b2Vec2.s_t0), b2Vec2.s_t1));

      const ex1: number = e1.x;
      const ey1: number = e1.y;
      const ex2: number = e2.x;
      const ey2: number = e2.y;

      const intx2: number = ex1 * ex1 + ex2 * ex1 + ex2 * ex2;
      const inty2: number = ey1 * ey1 + ey2 * ey1 + ey2 * ey2;

      I += (0.25 * k_inv3 * D) * (intx2 + inty2);
    }

    // Total mass
    massData.mass = density * area;

    // Center of mass
    // DEBUG: b2Assert(area > b2_epsilon);
    center.SelfMul(1 / area);
    b2Vec2.AddVV(center, s, massData.center);

    // Inertia tensor relative to the local origin (point s).
    massData.I = density * I;

    // Shift to center of mass then to original body origin.
    massData.I += massData.mass * (b2Vec2.DotVV(massData.center, massData.center) - b2Vec2.DotVV(center, center));
  }

  private static Validate_s_e = new b2Vec2();
  private static Validate_s_v = new b2Vec2();
  public Validate(): boolean {
    for (let i: number = 0; i < this.m_count; ++i) {
      const i1 = i;
      const i2 = (i + 1) % this.m_count;
      const p: b2Vec2 = this.m_vertices[i1];
      const e: b2Vec2 = b2Vec2.SubVV(this.m_vertices[i2], p, b2PolygonShape.Validate_s_e);

      for (let j: number = 0; j < this.m_count; ++j) {
        if (j === i1 || j === i2) {
          continue;
        }

        const v: b2Vec2 = b2Vec2.SubVV(this.m_vertices[j], p, b2PolygonShape.Validate_s_v);
        const c: number = b2Vec2.CrossVV(e, v);
        if (c < 0) {
          return false;
        }
      }
    }

    return true;
  }

  public SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void {
    proxy.m_vertices = this.m_vertices;
    proxy.m_count = this.m_count;
    proxy.m_radius = this.m_radius;
  }

  private static ComputeSubmergedArea_s_normalL = new b2Vec2();
  private static ComputeSubmergedArea_s_md = new b2MassData();
  private static ComputeSubmergedArea_s_intoVec = new b2Vec2();
  private static ComputeSubmergedArea_s_outoVec = new b2Vec2();
  private static ComputeSubmergedArea_s_center = new b2Vec2();
  public ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number {
    // Transform plane into shape co-ordinates
    const normalL: b2Vec2 = b2Rot.MulTRV(xf.q, normal, b2PolygonShape.ComputeSubmergedArea_s_normalL);
    const offsetL: number = offset - b2Vec2.DotVV(normal, xf.p);

    const depths: number[] = [];
    let diveCount: number = 0;
    let intoIndex: number = -1;
    let outoIndex: number = -1;

    let lastSubmerged: boolean = false;
    for (let i: number = 0; i < this.m_count; ++i) {
      depths[i] = b2Vec2.DotVV(normalL, this.m_vertices[i]) - offsetL;
      const isSubmerged: boolean = depths[i] < (-b2_epsilon);
      if (i > 0) {
        if (isSubmerged) {
          if (!lastSubmerged) {
            intoIndex = i - 1;
            diveCount++;
          }
        } else {
          if (lastSubmerged) {
            outoIndex = i - 1;
            diveCount++;
          }
        }
      }
      lastSubmerged = isSubmerged;
    }
    switch (diveCount) {
      case 0:
        if (lastSubmerged) {
          // Completely submerged
          const md: b2MassData = b2PolygonShape.ComputeSubmergedArea_s_md;
          this.ComputeMass(md, 1);
          b2Transform.MulXV(xf, md.center, c);
          return md.mass;
        } else {
          // Completely dry
          return 0;
        }
      case 1:
        if (intoIndex === (-1)) {
          intoIndex = this.m_count - 1;
        } else {
          outoIndex = this.m_count - 1;
        }
        break;
    }
    const intoIndex2: number = ((intoIndex + 1) % this.m_count);
    const outoIndex2: number = ((outoIndex + 1) % this.m_count);
    const intoLamdda: number = (0 - depths[intoIndex]) / (depths[intoIndex2] - depths[intoIndex]);
    const outoLamdda: number = (0 - depths[outoIndex]) / (depths[outoIndex2] - depths[outoIndex]);

    const intoVec: b2Vec2 = b2PolygonShape.ComputeSubmergedArea_s_intoVec.Set(
      this.m_vertices[intoIndex].x * (1 - intoLamdda) + this.m_vertices[intoIndex2].x * intoLamdda,
      this.m_vertices[intoIndex].y * (1 - intoLamdda) + this.m_vertices[intoIndex2].y * intoLamdda);
    const outoVec: b2Vec2 = b2PolygonShape.ComputeSubmergedArea_s_outoVec.Set(
      this.m_vertices[outoIndex].x * (1 - outoLamdda) + this.m_vertices[outoIndex2].x * outoLamdda,
      this.m_vertices[outoIndex].y * (1 - outoLamdda) + this.m_vertices[outoIndex2].y * outoLamdda);

    // Initialize accumulator
    let area: number = 0;
    const center: b2Vec2 = b2PolygonShape.ComputeSubmergedArea_s_center.SetZero();
    let p2: b2Vec2 = this.m_vertices[intoIndex2];
    let p3: b2Vec2;

    // An awkward loop from intoIndex2+1 to outIndex2
    let i: number = intoIndex2;
    while (i !== outoIndex2) {
      i = (i + 1) % this.m_count;
      if (i === outoIndex2) {
        p3 = outoVec;
      } else {
        p3 = this.m_vertices[i];
      }

      const triangleArea: number = 0.5 * ((p2.x - intoVec.x) * (p3.y - intoVec.y) - (p2.y - intoVec.y) * (p3.x - intoVec.x));
      area += triangleArea;
      // Area weighted centroid
      center.x += triangleArea * (intoVec.x + p2.x + p3.x) / 3;
      center.y += triangleArea * (intoVec.y + p2.y + p3.y) / 3;

      p2 = p3;
    }

    // Normalize and transform centroid
    center.SelfMul(1 / area);
    b2Transform.MulXV(xf, center, c);

    return area;
  }

  public Dump(log: (format: string, ...args: any[]) => void): void {
    log("    const shape: b2PolygonShape = new b2PolygonShape();\n");
    log("    const vs: b2Vec2[] = [];\n");
    for (let i: number = 0; i < this.m_count; ++i) {
      log("    vs[%d] = new b2Vec2(%.15f, %.15f);\n", i, this.m_vertices[i].x, this.m_vertices[i].y);
    }
    log("    shape.Set(vs, %d);\n", this.m_count);
  }

  private static ComputeCentroid_s_s = new b2Vec2();
  private static ComputeCentroid_s_p1 = new b2Vec2();
  private static ComputeCentroid_s_p2 = new b2Vec2();
  private static ComputeCentroid_s_p3 = new b2Vec2();
  private static ComputeCentroid_s_e1 = new b2Vec2();
  private static ComputeCentroid_s_e2 = new b2Vec2();
  public static ComputeCentroid(vs: b2Vec2[], count: number, out: b2Vec2): b2Vec2 {
    // DEBUG: b2Assert(count >= 3);

    const c: b2Vec2 = out; c.SetZero();
    let area: number = 0;

    // Get a reference point for forming triangles.
    // Use the first vertex to reduce round-off errors.
    const s: b2Vec2 = b2PolygonShape.ComputeCentroid_s_s.Copy(vs[0]);

    const inv3: number = 1 / 3;

    for (let i: number = 0; i < count; ++i) {
      // Triangle vertices.
      const p1: b2Vec2 = b2Vec2.SubVV(vs[0], s, b2PolygonShape.ComputeCentroid_s_p1);
      const p2: b2Vec2 = b2Vec2.SubVV(vs[i], s, b2PolygonShape.ComputeCentroid_s_p2);
      const p3: b2Vec2 = b2Vec2.SubVV(vs[(i + 1) % count], s, b2PolygonShape.ComputeCentroid_s_p3);

      const e1: b2Vec2 = b2Vec2.SubVV(p2, p1, b2PolygonShape.ComputeCentroid_s_e1);
      const e2: b2Vec2 = b2Vec2.SubVV(p3, p1, b2PolygonShape.ComputeCentroid_s_e2);

      const D: number = b2Vec2.CrossVV(e1, e2);

      const triangleArea: number = 0.5 * D;
      area += triangleArea;

      // Area weighted centroid
      c.x += triangleArea * inv3 * (p1.x + p2.x + p3.x);
      c.y += triangleArea * inv3 * (p1.y + p2.y + p3.y);
    }

    // Centroid
    // DEBUG: b2Assert(area > b2_epsilon);
    // c = (1.0f / area) * c + s;
    c.x = (1 / area) * c.x + s.x;
    c.y = (1 / area) * c.y + s.y;
    return c;
  }

  /*
  public static ComputeOBB(obb, vs, count) {
    const i: number = 0;
    const p: Array = [count + 1];
    for (i = 0; i < count; ++i) {
      p[i] = vs[i];
    }
    p[count] = p[0];
    const minArea = b2_maxFloat;
    for (i = 1; i <= count; ++i) {
      const root = p[i - 1];
      const uxX = p[i].x - root.x;
      const uxY = p[i].y - root.y;
      const length = b2Sqrt(uxX * uxX + uxY * uxY);
      uxX /= length;
      uxY /= length;
      const uyX = (-uxY);
      const uyY = uxX;
      const lowerX = b2_maxFloat;
      const lowerY = b2_maxFloat;
      const upperX = (-b2_maxFloat);
      const upperY = (-b2_maxFloat);
      for (let j: number = 0; j < count; ++j) {
        const dX = p[j].x - root.x;
        const dY = p[j].y - root.y;
        const rX = (uxX * dX + uxY * dY);
        const rY = (uyX * dX + uyY * dY);
        if (rX < lowerX) lowerX = rX;
        if (rY < lowerY) lowerY = rY;
        if (rX > upperX) upperX = rX;
        if (rY > upperY) upperY = rY;
      }
      const area = (upperX - lowerX) * (upperY - lowerY);
      if (area < 0.95 * minArea) {
        minArea = area;
        obb.R.ex.x = uxX;
        obb.R.ex.y = uxY;
        obb.R.ey.x = uyX;
        obb.R.ey.y = uyY;
        const center_x: number = 0.5 * (lowerX + upperX);
        const center_y: number = 0.5 * (lowerY + upperY);
        const tMat = obb.R;
        obb.center.x = root.x + (tMat.ex.x * center_x + tMat.ey.x * center_y);
        obb.center.y = root.y + (tMat.ex.y * center_x + tMat.ey.y * center_y);
        obb.extents.x = 0.5 * (upperX - lowerX);
        obb.extents.y = 0.5 * (upperY - lowerY);
      }
    }
  }
  */
}
