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
import { b2_maxFloat, b2_epsilon, b2_epsilon_sq, b2_maxManifoldPoints, b2MakeArray, b2MakeNumberArray } from "../common/b2_settings.js";
import { b2Abs, b2Min, b2Max, b2Vec2, b2Rot, b2Transform, XY } from "../common/b2_math.js";
import { b2Shape } from "./b2_shape.js";
import { b2Distance, b2DistanceInput, b2DistanceOutput, b2SimplexCache } from "./b2_distance.js";

/// @file
/// Structures and functions used for computing contact points, distance
/// queries, and TOI queries.

export enum b2ContactFeatureType {
  e_vertex = 0,
  e_face = 1,
}

/// The features that intersect to form the contact point
/// This must be 4 bytes or less.
export class b2ContactFeature {
  private _key: number = 0;
  private _key_invalid = false;
  private _indexA: number = 0;
  private _indexB: number = 0;
  private _typeA: b2ContactFeatureType = 0;
  private _typeB: b2ContactFeatureType = 0;

  public get key(): number {
    if (this._key_invalid) {
      this._key_invalid = false;
      this._key = this._indexA | (this._indexB << 8) | (this._typeA << 16) | (this._typeB << 24);
    }
    return this._key;
  }

  public set key(value: number) {
    this._key = value;
    this._key_invalid = false;
    this._indexA = this._key & 0xff;
    this._indexB = (this._key >> 8) & 0xff;
    this._typeA = (this._key >> 16) & 0xff;
    this._typeB = (this._key >> 24) & 0xff;
  }

  public get indexA(): number {
    return this._indexA;
  }

  public set indexA(value: number) {
    this._indexA = value;
    this._key_invalid = true;
  }

  public get indexB(): number {
    return this._indexB;
  }

  public set indexB(value: number) {
    this._indexB = value;
    this._key_invalid = true;
  }

  public get typeA(): number {
    return this._typeA;
  }

  public set typeA(value: number) {
    this._typeA = value;
    this._key_invalid = true;
  }

  public get typeB(): number {
    return this._typeB;
  }

  public set typeB(value: number) {
    this._typeB = value;
    this._key_invalid = true;
  }
}

/// Contact ids to facilitate warm starting.
export class b2ContactID {
  public readonly cf: b2ContactFeature = new b2ContactFeature();

  public Copy(o: b2ContactID): b2ContactID {
    this.key = o.key;
    return this;
  }

  public Clone(): b2ContactID {
    return new b2ContactID().Copy(this);
  }

  public get key(): number {
    return this.cf.key;
  }

  public set key(value: number) {
    this.cf.key = value;
  }
}

/// A manifold point is a contact point belonging to a contact
/// manifold. It holds details related to the geometry and dynamics
/// of the contact points.
/// The local point usage depends on the manifold type:
/// -e_circles: the local center of circleB
/// -e_faceA: the local center of cirlceB or the clip point of polygonB
/// -e_faceB: the clip point of polygonA
/// This structure is stored across time steps, so we keep it small.
/// Note: the impulses are used for internal caching and may not
/// provide reliable contact forces, especially for high speed collisions.
export class b2ManifoldPoint {
  public readonly localPoint: b2Vec2 = new b2Vec2();  ///< usage depends on manifold type
  public normalImpulse: number = 0;      ///< the non-penetration impulse
  public tangentImpulse: number = 0;      ///< the friction impulse
  public readonly id: b2ContactID = new b2ContactID(); ///< uniquely identifies a contact point between two shapes

  public static MakeArray(length: number): b2ManifoldPoint[] {
    return b2MakeArray(length, (i: number): b2ManifoldPoint => new b2ManifoldPoint());
  }

  public Reset(): void {
    this.localPoint.SetZero();
    this.normalImpulse = 0;
    this.tangentImpulse = 0;
    this.id.key = 0;
  }

  public Copy(o: b2ManifoldPoint): b2ManifoldPoint {
    this.localPoint.Copy(o.localPoint);
    this.normalImpulse = o.normalImpulse;
    this.tangentImpulse = o.tangentImpulse;
    this.id.Copy(o.id);
    return this;
  }
}

export enum b2ManifoldType {
  e_unknown = -1,
  e_circles = 0,
  e_faceA = 1,
  e_faceB = 2,
}

/// A manifold for two touching convex shapes.
/// Box2D supports multiple types of contact:
/// - clip point versus plane with radius
/// - point versus point with radius (circles)
/// The local point usage depends on the manifold type:
/// -e_circles: the local center of circleA
/// -e_faceA: the center of faceA
/// -e_faceB: the center of faceB
/// Similarly the local normal usage:
/// -e_circles: not used
/// -e_faceA: the normal on polygonA
/// -e_faceB: the normal on polygonB
/// We store contacts in this way so that position correction can
/// account for movement, which is critical for continuous physics.
/// All contact scenarios must be expressed in one of these types.
/// This structure is stored across time steps, so we keep it small.
export class b2Manifold {
  public readonly points: b2ManifoldPoint[] = b2ManifoldPoint.MakeArray(b2_maxManifoldPoints);
  public readonly localNormal: b2Vec2 = new b2Vec2();
  public readonly localPoint: b2Vec2 = new b2Vec2();
  public type: b2ManifoldType = b2ManifoldType.e_unknown;
  public pointCount: number = 0;

  public Reset(): void {
    for (let i: number = 0; i < b2_maxManifoldPoints; ++i) {
      // DEBUG: b2Assert(this.points[i] instanceof b2ManifoldPoint);
      this.points[i].Reset();
    }
    this.localNormal.SetZero();
    this.localPoint.SetZero();
    this.type = b2ManifoldType.e_unknown;
    this.pointCount = 0;
  }

  public Copy(o: b2Manifold): b2Manifold {
    this.pointCount = o.pointCount;
    for (let i: number = 0; i < b2_maxManifoldPoints; ++i) {
      // DEBUG: b2Assert(this.points[i] instanceof b2ManifoldPoint);
      this.points[i].Copy(o.points[i]);
    }
    this.localNormal.Copy(o.localNormal);
    this.localPoint.Copy(o.localPoint);
    this.type = o.type;
    return this;
  }

  public Clone(): b2Manifold {
    return new b2Manifold().Copy(this);
  }
}

export class b2WorldManifold {
  public readonly normal: b2Vec2 = new b2Vec2();
  public readonly points: b2Vec2[] = b2Vec2.MakeArray(b2_maxManifoldPoints);
  public readonly separations: number[] = b2MakeNumberArray(b2_maxManifoldPoints);

  private static Initialize_s_pointA = new b2Vec2();
  private static Initialize_s_pointB = new b2Vec2();
  private static Initialize_s_cA = new b2Vec2();
  private static Initialize_s_cB = new b2Vec2();
  private static Initialize_s_planePoint = new b2Vec2();
  private static Initialize_s_clipPoint = new b2Vec2();
  public Initialize(manifold: b2Manifold, xfA: b2Transform, radiusA: number, xfB: b2Transform, radiusB: number): void {
    if (manifold.pointCount === 0) {
      return;
    }

    switch (manifold.type) {
    case b2ManifoldType.e_circles: {
        this.normal.Set(1, 0);
        const pointA: b2Vec2 = b2Transform.MulXV(xfA, manifold.localPoint, b2WorldManifold.Initialize_s_pointA);
        const pointB: b2Vec2 = b2Transform.MulXV(xfB, manifold.points[0].localPoint, b2WorldManifold.Initialize_s_pointB);
        if (b2Vec2.DistanceSquaredVV(pointA, pointB) > b2_epsilon_sq) {
          b2Vec2.SubVV(pointB, pointA, this.normal).SelfNormalize();
        }

        const cA: b2Vec2 = b2Vec2.AddVMulSV(pointA, radiusA, this.normal, b2WorldManifold.Initialize_s_cA);
        const cB: b2Vec2 = b2Vec2.SubVMulSV(pointB, radiusB, this.normal, b2WorldManifold.Initialize_s_cB);
        b2Vec2.MidVV(cA, cB, this.points[0]);
        this.separations[0] = b2Vec2.DotVV(b2Vec2.SubVV(cB, cA, b2Vec2.s_t0), this.normal); // b2Dot(cB - cA, normal);
        break;
      }

    case b2ManifoldType.e_faceA: {
        b2Rot.MulRV(xfA.q, manifold.localNormal, this.normal);
        const planePoint: b2Vec2 = b2Transform.MulXV(xfA, manifold.localPoint, b2WorldManifold.Initialize_s_planePoint);

        for (let i: number = 0; i < manifold.pointCount; ++i) {
          const clipPoint: b2Vec2 = b2Transform.MulXV(xfB, manifold.points[i].localPoint, b2WorldManifold.Initialize_s_clipPoint);
          const s: number = radiusA - b2Vec2.DotVV(b2Vec2.SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal);
          const cA: b2Vec2 = b2Vec2.AddVMulSV(clipPoint, s, this.normal, b2WorldManifold.Initialize_s_cA);
          const cB: b2Vec2 = b2Vec2.SubVMulSV(clipPoint, radiusB, this.normal, b2WorldManifold.Initialize_s_cB);
          b2Vec2.MidVV(cA, cB, this.points[i]);
          this.separations[i] = b2Vec2.DotVV(b2Vec2.SubVV(cB, cA, b2Vec2.s_t0), this.normal); // b2Dot(cB - cA, normal);
        }
        break;
      }

    case b2ManifoldType.e_faceB: {
        b2Rot.MulRV(xfB.q, manifold.localNormal, this.normal);
        const planePoint: b2Vec2 = b2Transform.MulXV(xfB, manifold.localPoint, b2WorldManifold.Initialize_s_planePoint);

        for (let i: number = 0; i < manifold.pointCount; ++i) {
          const clipPoint: b2Vec2 = b2Transform.MulXV(xfA, manifold.points[i].localPoint, b2WorldManifold.Initialize_s_clipPoint);
          const s: number = radiusB - b2Vec2.DotVV(b2Vec2.SubVV(clipPoint, planePoint, b2Vec2.s_t0), this.normal);
          const cB: b2Vec2 = b2Vec2.AddVMulSV(clipPoint, s, this.normal, b2WorldManifold.Initialize_s_cB);
          const cA: b2Vec2 = b2Vec2.SubVMulSV(clipPoint, radiusA, this.normal, b2WorldManifold.Initialize_s_cA);
          b2Vec2.MidVV(cA, cB, this.points[i]);
          this.separations[i] = b2Vec2.DotVV(b2Vec2.SubVV(cA, cB, b2Vec2.s_t0), this.normal); // b2Dot(cA - cB, normal);
        }

        // Ensure normal points from A to B.
        this.normal.SelfNeg();
        break;
      }
    }
  }
}

/// This is used for determining the state of contact points.
export enum b2PointState {
  b2_nullState = 0, ///< point does not exist
  b2_addState = 1, ///< point was added in the update
  b2_persistState = 2, ///< point persisted across the update
  b2_removeState = 3,  ///< point was removed in the update
}

/// Compute the point states given two manifolds. The states pertain to the transition from manifold1
/// to manifold2. So state1 is either persist or remove while state2 is either add or persist.
export function b2GetPointStates(state1: b2PointState[], state2: b2PointState[], manifold1: b2Manifold, manifold2: b2Manifold): void {
  // Detect persists and removes.
  let i: number;
  for (i = 0; i < manifold1.pointCount; ++i) {
    const id: b2ContactID = manifold1.points[i].id;
    const key: number = id.key;

    state1[i] = b2PointState.b2_removeState;

    for (let j: number = 0, jct = manifold2.pointCount; j < jct; ++j) {
      if (manifold2.points[j].id.key === key) {
        state1[i] = b2PointState.b2_persistState;
        break;
      }
    }
  }
  for (; i < b2_maxManifoldPoints; ++i) {
    state1[i] = b2PointState.b2_nullState;
  }

  // Detect persists and adds.
  for (i = 0; i < manifold2.pointCount; ++i) {
    const id: b2ContactID = manifold2.points[i].id;
    const key: number = id.key;

    state2[i] = b2PointState.b2_addState;

    for (let j: number = 0, jct = manifold1.pointCount; j < jct; ++j) {
      if (manifold1.points[j].id.key === key) {
        state2[i] = b2PointState.b2_persistState;
        break;
      }
    }
  }
  for (; i < b2_maxManifoldPoints; ++i) {
    state2[i] = b2PointState.b2_nullState;
  }
}

/// Used for computing contact manifolds.
export class b2ClipVertex {
  public readonly v: b2Vec2 = new b2Vec2();
  public readonly id: b2ContactID = new b2ContactID();

  public static MakeArray(length: number): b2ClipVertex[] {
    return b2MakeArray(length, (i: number): b2ClipVertex => new b2ClipVertex());
  }

  public Copy(other: b2ClipVertex): b2ClipVertex {
    this.v.Copy(other.v);
    this.id.Copy(other.id);
    return this;
  }
}

/// Ray-cast input data. The ray extends from p1 to p1 + maxFraction * (p2 - p1).
export class b2RayCastInput {
  public readonly p1: b2Vec2 = new b2Vec2();
  public readonly p2: b2Vec2 = new b2Vec2();
  public maxFraction: number = 1;

  public Copy(o: b2RayCastInput): b2RayCastInput {
    this.p1.Copy(o.p1);
    this.p2.Copy(o.p2);
    this.maxFraction = o.maxFraction;
    return this;
  }
}

/// Ray-cast output data. The ray hits at p1 + fraction * (p2 - p1), where p1 and p2
/// come from b2RayCastInput.
export class b2RayCastOutput {
  public readonly normal: b2Vec2 = new b2Vec2();
  public fraction: number = 0;

  public Copy(o: b2RayCastOutput): b2RayCastOutput {
    this.normal.Copy(o.normal);
    this.fraction = o.fraction;
    return this;
  }
}

/// An axis aligned bounding box.
export class b2AABB {
  public readonly lowerBound: b2Vec2 = new b2Vec2(); ///< the lower vertex
  public readonly upperBound: b2Vec2 = new b2Vec2(); ///< the upper vertex

  private readonly m_cache_center: b2Vec2 = new b2Vec2(); // access using GetCenter()
  private readonly m_cache_extent: b2Vec2 = new b2Vec2(); // access using GetExtents()

  public Copy(o: b2AABB): b2AABB {
    this.lowerBound.Copy(o.lowerBound);
    this.upperBound.Copy(o.upperBound);
    return this;
  }

  /// Verify that the bounds are sorted.
  public IsValid(): boolean {
    if (!this.lowerBound.IsValid()) { return false; }
    if (!this.upperBound.IsValid()) { return false; }
    if (this.upperBound.x < this.lowerBound.x) { return false; }
    if (this.upperBound.y < this.lowerBound.y) { return false; }
    return true;
  }

  /// Get the center of the AABB.
  public GetCenter(): b2Vec2 {
    return b2Vec2.MidVV(this.lowerBound, this.upperBound, this.m_cache_center);
  }

  /// Get the extents of the AABB (half-widths).
  public GetExtents(): b2Vec2 {
    return b2Vec2.ExtVV(this.lowerBound, this.upperBound, this.m_cache_extent);
  }

  /// Get the perimeter length
  public GetPerimeter(): number {
    const wx: number = this.upperBound.x - this.lowerBound.x;
    const wy: number = this.upperBound.y - this.lowerBound.y;
    return 2 * (wx + wy);
  }

  /// Combine an AABB into this one.
  public Combine1(aabb: b2AABB): b2AABB {
    this.lowerBound.x = b2Min(this.lowerBound.x, aabb.lowerBound.x);
    this.lowerBound.y = b2Min(this.lowerBound.y, aabb.lowerBound.y);
    this.upperBound.x = b2Max(this.upperBound.x, aabb.upperBound.x);
    this.upperBound.y = b2Max(this.upperBound.y, aabb.upperBound.y);
    return this;
  }

  /// Combine two AABBs into this one.
  public Combine2(aabb1: b2AABB, aabb2: b2AABB): b2AABB {
    this.lowerBound.x = b2Min(aabb1.lowerBound.x, aabb2.lowerBound.x);
    this.lowerBound.y = b2Min(aabb1.lowerBound.y, aabb2.lowerBound.y);
    this.upperBound.x = b2Max(aabb1.upperBound.x, aabb2.upperBound.x);
    this.upperBound.y = b2Max(aabb1.upperBound.y, aabb2.upperBound.y);
    return this;
  }

  public static Combine(aabb1: b2AABB, aabb2: b2AABB, out: b2AABB): b2AABB {
    out.Combine2(aabb1, aabb2);
    return out;
  }

  /// Does this aabb contain the provided AABB.
  public Contains(aabb: b2AABB): boolean {
    let result: boolean = true;
    result = result && this.lowerBound.x <= aabb.lowerBound.x;
    result = result && this.lowerBound.y <= aabb.lowerBound.y;
    result = result && aabb.upperBound.x <= this.upperBound.x;
    result = result && aabb.upperBound.y <= this.upperBound.y;
    return result;
  }

  // From Real-time Collision Detection, p179.
  public RayCast(output: b2RayCastOutput, input: b2RayCastInput): boolean {
    let tmin: number = (-b2_maxFloat);
    let tmax: number = b2_maxFloat;

    const p_x: number = input.p1.x;
    const p_y: number = input.p1.y;
    const d_x: number = input.p2.x - input.p1.x;
    const d_y: number = input.p2.y - input.p1.y;
    const absD_x: number = b2Abs(d_x);
    const absD_y: number = b2Abs(d_y);

    const normal: b2Vec2 = output.normal;

    if (absD_x < b2_epsilon) {
      // Parallel.
      if (p_x < this.lowerBound.x || this.upperBound.x < p_x) {
        return false;
      }
    } else {
      const inv_d: number = 1 / d_x;
      let t1: number = (this.lowerBound.x - p_x) * inv_d;
      let t2: number = (this.upperBound.x - p_x) * inv_d;

      // Sign of the normal vector.
      let s: number = (-1);

      if (t1 > t2) {
        const t3: number = t1;
        t1 = t2;
        t2 = t3;
        s = 1;
      }

      // Push the min up
      if (t1 > tmin) {
        normal.x = s;
        normal.y = 0;
        tmin = t1;
      }

      // Pull the max down
      tmax = b2Min(tmax, t2);

      if (tmin > tmax) {
        return false;
      }
    }

    if (absD_y < b2_epsilon) {
      // Parallel.
      if (p_y < this.lowerBound.y || this.upperBound.y < p_y) {
        return false;
      }
    } else {
      const inv_d: number = 1 / d_y;
      let t1: number = (this.lowerBound.y - p_y) * inv_d;
      let t2: number = (this.upperBound.y - p_y) * inv_d;

      // Sign of the normal vector.
      let s: number = (-1);

      if (t1 > t2) {
        const t3: number = t1;
        t1 = t2;
        t2 = t3;
        s = 1;
      }

      // Push the min up
      if (t1 > tmin) {
        normal.x = 0;
        normal.y = s;
        tmin = t1;
      }

      // Pull the max down
      tmax = b2Min(tmax, t2);

      if (tmin > tmax) {
        return false;
      }
    }

    // Does the ray start inside the box?
    // Does the ray intersect beyond the max fraction?
    if (tmin < 0 || input.maxFraction < tmin) {
      return false;
    }

    // Intersection.
    output.fraction = tmin;

    return true;
  }

  public TestContain(point: XY): boolean {
    if (point.x < this.lowerBound.x || this.upperBound.x < point.x) { return false; }
    if (point.y < this.lowerBound.y || this.upperBound.y < point.y) { return false; }
    return true;
  }

  public TestOverlap(other: b2AABB): boolean {
    if (this.upperBound.x < other.lowerBound.x) { return false; }
    if (this.upperBound.y < other.lowerBound.y) { return false; }
    if (other.upperBound.x < this.lowerBound.x) { return false; }
    if (other.upperBound.y < this.lowerBound.y) { return false; }
    return true;
  }
}

export function b2TestOverlapAABB(a: b2AABB, b: b2AABB): boolean {
  if (a.upperBound.x < b.lowerBound.x) { return false; }
  if (a.upperBound.y < b.lowerBound.y) { return false; }
  if (b.upperBound.x < a.lowerBound.x) { return false; }
  if (b.upperBound.y < a.lowerBound.y) { return false; }
  return true;
}

/// Clipping for contact manifolds.
export function b2ClipSegmentToLine(vOut: [b2ClipVertex, b2ClipVertex], vIn: [b2ClipVertex, b2ClipVertex], normal: b2Vec2, offset: number, vertexIndexA: number): number {
  // Start with no output points
  let count: number = 0;

  const vIn0: b2ClipVertex = vIn[0];
  const vIn1: b2ClipVertex = vIn[1];

  // Calculate the distance of end points to the line
  const distance0: number = b2Vec2.DotVV(normal, vIn0.v) - offset;
  const distance1: number = b2Vec2.DotVV(normal, vIn1.v) - offset;

  // If the points are behind the plane
  if (distance0 <= 0) { vOut[count++].Copy(vIn0); }
  if (distance1 <= 0) { vOut[count++].Copy(vIn1); }

  // If the points are on different sides of the plane
  if (distance0 * distance1 < 0) {
    // Find intersection point of edge and plane
    const interp: number = distance0 / (distance0 - distance1);
    const v: b2Vec2 = vOut[count].v;
    v.x = vIn0.v.x + interp * (vIn1.v.x - vIn0.v.x);
    v.y = vIn0.v.y + interp * (vIn1.v.y - vIn0.v.y);

    // VertexA is hitting edgeB.
    const id: b2ContactID = vOut[count].id;
    id.cf.indexA = vertexIndexA;
    id.cf.indexB = vIn0.id.cf.indexB;
    id.cf.typeA = b2ContactFeatureType.e_vertex;
    id.cf.typeB = b2ContactFeatureType.e_face;
    ++count;

    // b2Assert(count === 2);
  }

  return count;
}

/// Determine if two generic shapes overlap.
const b2TestOverlapShape_s_input: b2DistanceInput = new b2DistanceInput();
const b2TestOverlapShape_s_simplexCache: b2SimplexCache = new b2SimplexCache();
const b2TestOverlapShape_s_output: b2DistanceOutput = new b2DistanceOutput();
export function b2TestOverlapShape(shapeA: b2Shape, indexA: number, shapeB: b2Shape, indexB: number, xfA: b2Transform, xfB: b2Transform): boolean {
  const input: b2DistanceInput = b2TestOverlapShape_s_input.Reset();
  input.proxyA.SetShape(shapeA, indexA);
  input.proxyB.SetShape(shapeB, indexB);
  input.transformA.Copy(xfA);
  input.transformB.Copy(xfB);
  input.useRadii = true;

  const simplexCache: b2SimplexCache = b2TestOverlapShape_s_simplexCache.Reset();
  simplexCache.count = 0;

  const output: b2DistanceOutput = b2TestOverlapShape_s_output.Reset();

  b2Distance(output, simplexCache, input);

  return output.distance < 10 * b2_epsilon;
}
