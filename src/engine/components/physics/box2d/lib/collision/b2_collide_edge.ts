// DEBUG: import { b2Assert } from "../common/b2_settings.js";
import { b2_maxManifoldPoints } from "../common/b2_settings.js";
import { b2Min, b2Vec2, b2Rot, b2Transform } from "../common/b2_math.js";
import { b2ContactFeatureType, b2ContactID } from "./b2_collision.js";
import { b2Manifold, b2ManifoldType, b2ManifoldPoint, b2ClipVertex, b2ClipSegmentToLine } from "./b2_collision.js";
import { b2CircleShape } from "./b2_circle_shape.js";
import { b2PolygonShape } from "./b2_polygon_shape.js";
import { b2EdgeShape } from "./b2_edge_shape.js";

const b2CollideEdgeAndCircle_s_Q: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_e: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_d: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_e1: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_e2: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_P: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_n: b2Vec2 = new b2Vec2();
const b2CollideEdgeAndCircle_s_id: b2ContactID = new b2ContactID();
export function b2CollideEdgeAndCircle(manifold: b2Manifold, edgeA: b2EdgeShape, xfA: b2Transform, circleB: b2CircleShape, xfB: b2Transform): void {
  manifold.pointCount = 0;

  // Compute circle in frame of edge
  const Q: b2Vec2 = b2Transform.MulTXV(xfA, b2Transform.MulXV(xfB, circleB.m_p, b2Vec2.s_t0), b2CollideEdgeAndCircle_s_Q);

  const A: b2Vec2 = edgeA.m_vertex1;
  const B: b2Vec2 = edgeA.m_vertex2;
  const e: b2Vec2 = b2Vec2.SubVV(B, A, b2CollideEdgeAndCircle_s_e);

  // Normal points to the right for a CCW winding
  // b2Vec2 n(e.y, -e.x);
  // const n: b2Vec2 = b2CollideEdgeAndCircle_s_n.Set(-e.y, e.x);
  const n: b2Vec2 = b2CollideEdgeAndCircle_s_n.Set(e.y, -e.x);
  // float offset = b2Dot(n, Q - A);
  const offset: number = b2Vec2.DotVV(n, b2Vec2.SubVV(Q, A, b2Vec2.s_t0));

  const oneSided: boolean = edgeA.m_oneSided;
  if (oneSided && offset < 0.0) {
    return;
  }

  // Barycentric coordinates
  const u: number = b2Vec2.DotVV(e, b2Vec2.SubVV(B, Q, b2Vec2.s_t0));
  const v: number = b2Vec2.DotVV(e, b2Vec2.SubVV(Q, A, b2Vec2.s_t0));

  const radius: number = edgeA.m_radius + circleB.m_radius;

  // const cf: b2ContactFeature = new b2ContactFeature();
  const id: b2ContactID = b2CollideEdgeAndCircle_s_id;
  id.cf.indexB = 0;
  id.cf.typeB = b2ContactFeatureType.e_vertex;

  // Region A
  if (v <= 0) {
    const P: b2Vec2 = A;
    const d: b2Vec2 = b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
    const dd: number = b2Vec2.DotVV(d, d);
    if (dd > radius * radius) {
      return;
    }

    // Is there an edge connected to A?
    if (edgeA.m_oneSided) {
      const A1: b2Vec2 = edgeA.m_vertex0;
      const B1: b2Vec2 = A;
      const e1: b2Vec2 = b2Vec2.SubVV(B1, A1, b2CollideEdgeAndCircle_s_e1);
      const u1: number = b2Vec2.DotVV(e1, b2Vec2.SubVV(B1, Q, b2Vec2.s_t0));

      // Is the circle in Region AB of the previous edge?
      if (u1 > 0) {
        return;
      }
    }

    id.cf.indexA = 0;
    id.cf.typeA = b2ContactFeatureType.e_vertex;
    manifold.pointCount = 1;
    manifold.type = b2ManifoldType.e_circles;
    manifold.localNormal.SetZero();
    manifold.localPoint.Copy(P);
    manifold.points[0].id.Copy(id);
    // manifold.points[0].id.key = 0;
    // manifold.points[0].id.cf = cf;
    manifold.points[0].localPoint.Copy(circleB.m_p);
    return;
  }

  // Region B
  if (u <= 0) {
    const P: b2Vec2 = B;
    const d: b2Vec2 = b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
    const dd: number = b2Vec2.DotVV(d, d);
    if (dd > radius * radius) {
      return;
    }

    // Is there an edge connected to B?
    if (edgeA.m_oneSided) {
      const B2: b2Vec2 = edgeA.m_vertex3;
      const A2: b2Vec2 = B;
      const e2: b2Vec2 = b2Vec2.SubVV(B2, A2, b2CollideEdgeAndCircle_s_e2);
      const v2: number = b2Vec2.DotVV(e2, b2Vec2.SubVV(Q, A2, b2Vec2.s_t0));

      // Is the circle in Region AB of the next edge?
      if (v2 > 0) {
        return;
      }
    }

    id.cf.indexA = 1;
    id.cf.typeA = b2ContactFeatureType.e_vertex;
    manifold.pointCount = 1;
    manifold.type = b2ManifoldType.e_circles;
    manifold.localNormal.SetZero();
    manifold.localPoint.Copy(P);
    manifold.points[0].id.Copy(id);
    // manifold.points[0].id.key = 0;
    // manifold.points[0].id.cf = cf;
    manifold.points[0].localPoint.Copy(circleB.m_p);
    return;
  }

  // Region AB
  const den: number = b2Vec2.DotVV(e, e);
  // DEBUG: b2Assert(den > 0);
  const P: b2Vec2 = b2CollideEdgeAndCircle_s_P;
  P.x = (1 / den) * (u * A.x + v * B.x);
  P.y = (1 / den) * (u * A.y + v * B.y);
  const d: b2Vec2 = b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
  const dd: number = b2Vec2.DotVV(d, d);
  if (dd > radius * radius) {
    return;
  }

  if (offset < 0) {
    n.Set(-n.x, -n.y);
  }
  n.Normalize();

  id.cf.indexA = 0;
  id.cf.typeA = b2ContactFeatureType.e_face;
  manifold.pointCount = 1;
  manifold.type = b2ManifoldType.e_faceA;
  manifold.localNormal.Copy(n);
  manifold.localPoint.Copy(A);
  manifold.points[0].id.Copy(id);
  // manifold.points[0].id.key = 0;
  // manifold.points[0].id.cf = cf;
  manifold.points[0].localPoint.Copy(circleB.m_p);
}

enum b2EPAxisType {
  e_unknown = 0,
  e_edgeA = 1,
  e_edgeB = 2,
}

class b2EPAxis {
  public normal: b2Vec2 = new b2Vec2();
  public type: b2EPAxisType = b2EPAxisType.e_unknown;
  public index: number = 0;
  public separation: number = 0;
}

class b2TempPolygon {
  public vertices: b2Vec2[] = [];
  public normals: b2Vec2[] = [];
  public count: number = 0;
}

class b2ReferenceFace {
  public i1: number = 0;
  public i2: number = 0;
  public readonly v1: b2Vec2 = new b2Vec2();
  public readonly v2: b2Vec2 = new b2Vec2();
  public readonly normal: b2Vec2 = new b2Vec2();
  public readonly sideNormal1: b2Vec2 = new b2Vec2();
  public sideOffset1: number = 0;
  public readonly sideNormal2: b2Vec2 = new b2Vec2();
  public sideOffset2: number = 0;
}

// static b2EPAxis b2ComputeEdgeSeparation(const b2TempPolygon& polygonB, const b2Vec2& v1, const b2Vec2& normal1)
const b2ComputeEdgeSeparation_s_axis = new b2EPAxis();
const b2ComputeEdgeSeparation_s_axes: [ b2Vec2, b2Vec2 ] = [ new b2Vec2(), new b2Vec2() ];
function b2ComputeEdgeSeparation(polygonB: Readonly<b2TempPolygon>, v1: Readonly<b2Vec2>, normal1: Readonly<b2Vec2>): b2EPAxis {
  // b2EPAxis axis;
  const axis: b2EPAxis = b2ComputeEdgeSeparation_s_axis;
  axis.type = b2EPAxisType.e_edgeA;
  axis.index = -1;
  axis.separation = -Number.MAX_VALUE; // -FLT_MAX;
  axis.normal.SetZero();

  // b2Vec2 axes[2] = { normal1, -normal1 };
  const axes: [b2Vec2, b2Vec2] = b2ComputeEdgeSeparation_s_axes;
  axes[0].Copy(normal1);
  axes[1].Copy(normal1).SelfNeg();

  // Find axis with least overlap (min-max problem)
  for (let j = 0; j < 2; ++j) {
    let sj: number = Number.MAX_VALUE; // FLT_MAX;

    // Find deepest polygon vertex along axis j
    for (let i = 0; i < polygonB.count; ++i) {
      // float si = b2Dot(axes[j], polygonB.vertices[i] - v1);
      const si: number = b2Vec2.DotVV(axes[j], b2Vec2.SubVV(polygonB.vertices[i], v1, b2Vec2.s_t0));
      if (si < sj) {
        sj = si;
      }
    }

    if (sj > axis.separation) {
      axis.index = j;
      axis.separation = sj;
      axis.normal.Copy(axes[j]);
    }
  }

  return axis;
}

// static b2EPAxis b2ComputePolygonSeparation(const b2TempPolygon& polygonB, const b2Vec2& v1, const b2Vec2& v2)
const b2ComputePolygonSeparation_s_axis = new b2EPAxis();
const b2ComputePolygonSeparation_s_n = new b2Vec2();
function b2ComputePolygonSeparation(polygonB: Readonly<b2TempPolygon>, v1: Readonly<b2Vec2>, v2: Readonly<b2Vec2>): b2EPAxis {
  const axis: b2EPAxis = b2ComputePolygonSeparation_s_axis;
  axis.type = b2EPAxisType.e_unknown;
  axis.index = -1;
  axis.separation = -Number.MAX_VALUE; // -FLT_MAX;
  axis.normal.SetZero();

  for (let i = 0; i < polygonB.count; ++i) {
    // b2Vec2 n = -polygonB.normals[i];
    const n: b2Vec2 = b2Vec2.NegV(polygonB.normals[i], b2ComputePolygonSeparation_s_n);

    // float s1 = b2Dot(n, polygonB.vertices[i] - v1);
    const s1: number = b2Vec2.DotVV(n, b2Vec2.SubVV(polygonB.vertices[i], v1, b2Vec2.s_t0));
    // float s2 = b2Dot(n, polygonB.vertices[i] - v2);
    const s2: number = b2Vec2.DotVV(n, b2Vec2.SubVV(polygonB.vertices[i], v2, b2Vec2.s_t0));
    // float s = b2Min(s1, s2);
    const s: number = b2Min(s1, s2);

    if (s > axis.separation) {
      axis.type = b2EPAxisType.e_edgeB;
      axis.index = i;
      axis.separation = s;
      axis.normal.Copy(n);
    }
  }

  return axis;
}

const b2CollideEdgeAndPolygon_s_xf = new b2Transform();
const b2CollideEdgeAndPolygon_s_centroidB = new b2Vec2();
const b2CollideEdgeAndPolygon_s_edge1 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_normal1 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_edge0 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_normal0 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_edge2 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_normal2 = new b2Vec2();
const b2CollideEdgeAndPolygon_s_tempPolygonB = new b2TempPolygon();
const b2CollideEdgeAndPolygon_s_ref = new b2ReferenceFace();
const b2CollideEdgeAndPolygon_s_clipPoints: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
const b2CollideEdgeAndPolygon_s_clipPoints1: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
const b2CollideEdgeAndPolygon_s_clipPoints2: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
export function b2CollideEdgeAndPolygon(manifold: b2Manifold, edgeA: b2EdgeShape, xfA: b2Transform, polygonB: b2PolygonShape, xfB: b2Transform): void {
  manifold.pointCount = 0;

  // b2Transform xf = b2MulT(xfA, xfB);
  const xf = b2Transform.MulTXX(xfA, xfB, b2CollideEdgeAndPolygon_s_xf);

  // b2Vec2 centroidB = b2Mul(xf, polygonB.m_centroid);
  const centroidB: b2Vec2 = b2Transform.MulXV(xf, polygonB.m_centroid, b2CollideEdgeAndPolygon_s_centroidB);

  // b2Vec2 v1 = edgeA.m_vertex1;
  const v1: b2Vec2 = edgeA.m_vertex1;
  // b2Vec2 v2 = edgeA.m_vertex2;
  const v2: b2Vec2 = edgeA.m_vertex2;

  // b2Vec2 edge1 = v2 - v1;
  const edge1: b2Vec2 = b2Vec2.SubVV(v2, v1, b2CollideEdgeAndPolygon_s_edge1);
  edge1.Normalize();

  // Normal points to the right for a CCW winding
  // b2Vec2 normal1(edge1.y, -edge1.x);
  const normal1 = b2CollideEdgeAndPolygon_s_normal1.Set(edge1.y, -edge1.x);
  // float offset1 = b2Dot(normal1, centroidB - v1);
  const offset1: number = b2Vec2.DotVV(normal1, b2Vec2.SubVV(centroidB, v1, b2Vec2.s_t0));

  const oneSided: boolean = edgeA.m_oneSided;
  if (oneSided && offset1 < 0.0) {
    return;
  }

  // Get polygonB in frameA
  // b2TempPolygon tempPolygonB;
  const tempPolygonB: b2TempPolygon = b2CollideEdgeAndPolygon_s_tempPolygonB;
  tempPolygonB.count = polygonB.m_count;
  for (let i = 0; i < polygonB.m_count; ++i) {
    if (tempPolygonB.vertices.length <= i) { tempPolygonB.vertices.push(new b2Vec2()); }
    if (tempPolygonB.normals.length <= i) { tempPolygonB.normals.push(new b2Vec2()); }
    // tempPolygonB.vertices[i] = b2Mul(xf, polygonB.m_vertices[i]);
    b2Transform.MulXV(xf, polygonB.m_vertices[i], tempPolygonB.vertices[i]);
    // tempPolygonB.normals[i] = b2Mul(xf.q, polygonB.m_normals[i]);
    b2Rot.MulRV(xf.q, polygonB.m_normals[i], tempPolygonB.normals[i]);
  }

  const radius: number = polygonB.m_radius + edgeA.m_radius;

  // b2EPAxis edgeAxis = b2ComputeEdgeSeparation(tempPolygonB, v1, normal1);
  const edgeAxis: b2EPAxis = b2ComputeEdgeSeparation(tempPolygonB, v1, normal1);
  if (edgeAxis.separation > radius) {
    return;
  }

  // b2EPAxis polygonAxis = b2ComputePolygonSeparation(tedge0.y, -edge0.xempPolygonB, v1, v2);
  const polygonAxis: b2EPAxis = b2ComputePolygonSeparation(tempPolygonB, v1, v2);
  if (polygonAxis.separation > radius) {
    return;
  }

  // Use hysteresis for jitter reduction.
  const k_relativeTol: number = 0.98;
  const k_absoluteTol: number = 0.001;

  // b2EPAxis primaryAxis;
  let primaryAxis: b2EPAxis;
  if (polygonAxis.separation - radius > k_relativeTol * (edgeAxis.separation - radius) + k_absoluteTol) {
    primaryAxis = polygonAxis;
  } else {
    primaryAxis = edgeAxis;
  }

  if (oneSided) {
    // Smooth collision
    // See https://box2d.org/posts/2020/06/ghost-collisions/

    // b2Vec2 edge0 = v1 - edgeA.m_vertex0;
    const edge0: b2Vec2 = b2Vec2.SubVV(v1, edgeA.m_vertex0, b2CollideEdgeAndPolygon_s_edge0);
    edge0.Normalize();
    // b2Vec2 normal0(edge0.y, -edge0.x);
    const normal0: b2Vec2 = b2CollideEdgeAndPolygon_s_normal0.Set(edge0.y, -edge0.x);
    const convex1: boolean = b2Vec2.CrossVV(edge0, edge1) >= 0.0;

    // b2Vec2 edge2 = edgeA.m_vertex3 - v2;
    const edge2: b2Vec2 = b2Vec2.SubVV(edgeA.m_vertex3, v2, b2CollideEdgeAndPolygon_s_edge2);
    edge2.Normalize();
    // b2Vec2 normal2(edge2.y, -edge2.x);
    const normal2: b2Vec2 = b2CollideEdgeAndPolygon_s_normal2.Set(edge2.y, -edge2.x);
    const convex2: boolean = b2Vec2.CrossVV(edge1, edge2) >= 0.0;

    const sinTol: number = 0.1;
    const side1: boolean = b2Vec2.DotVV(primaryAxis.normal, edge1) <= 0.0;

    // Check Gauss Map
    if (side1) {
      if (convex1) {
        if (b2Vec2.CrossVV(primaryAxis.normal, normal0) > sinTol) {
          // Skip region
          return;
        }

        // Admit region
      } else {
        // Snap region
        primaryAxis = edgeAxis;
      }
    } else {
      if (convex2) {
        if (b2Vec2.CrossVV(normal2, primaryAxis.normal) > sinTol) {
          // Skip region
          return;
        }

        // Admit region
      } else {
        // Snap region
        primaryAxis = edgeAxis;
      }
    }
  }

  // b2ClipVertex clipPoints[2];
  const clipPoints: [b2ClipVertex, b2ClipVertex] = b2CollideEdgeAndPolygon_s_clipPoints;
  // b2ReferenceFace ref;
  const ref: b2ReferenceFace = b2CollideEdgeAndPolygon_s_ref;
  if (primaryAxis.type === b2EPAxisType.e_edgeA) {
    manifold.type = b2ManifoldType.e_faceA;

    // Search for the polygon normal that is most anti-parallel to the edge normal.
    let bestIndex: number = 0;
    let bestValue: number = b2Vec2.DotVV(primaryAxis.normal, tempPolygonB.normals[0]);
    for (let i = 1; i < tempPolygonB.count; ++i) {
      const value: number = b2Vec2.DotVV(primaryAxis.normal, tempPolygonB.normals[i]);
      if (value < bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }

    const i1: number = bestIndex;
    const i2: number = i1 + 1 < tempPolygonB.count ? i1 + 1 : 0;

    clipPoints[0].v.Copy(tempPolygonB.vertices[i1]);
    clipPoints[0].id.cf.indexA = 0;
    clipPoints[0].id.cf.indexB = i1;
    clipPoints[0].id.cf.typeA = b2ContactFeatureType.e_face;
    clipPoints[0].id.cf.typeB = b2ContactFeatureType.e_vertex;

    clipPoints[1].v.Copy(tempPolygonB.vertices[i2]);
    clipPoints[1].id.cf.indexA = 0;
    clipPoints[1].id.cf.indexB = i2;
    clipPoints[1].id.cf.typeA = b2ContactFeatureType.e_face;
    clipPoints[1].id.cf.typeB = b2ContactFeatureType.e_vertex;

    ref.i1 = 0;
    ref.i2 = 1;
    ref.v1.Copy(v1);
    ref.v2.Copy(v2);
    ref.normal.Copy(primaryAxis.normal);
    ref.sideNormal1.Copy(edge1).SelfNeg(); // ref.sideNormal1 = -edge1;
    ref.sideNormal2.Copy(edge1);
  } else {
    manifold.type = b2ManifoldType.e_faceB;

    clipPoints[0].v.Copy(v2);
    clipPoints[0].id.cf.indexA = 1;
    clipPoints[0].id.cf.indexB = primaryAxis.index;
    clipPoints[0].id.cf.typeA = b2ContactFeatureType.e_vertex;
    clipPoints[0].id.cf.typeB = b2ContactFeatureType.e_face;

    clipPoints[1].v.Copy(v1);
    clipPoints[1].id.cf.indexA = 0;
    clipPoints[1].id.cf.indexB = primaryAxis.index;
    clipPoints[1].id.cf.typeA = b2ContactFeatureType.e_vertex;
    clipPoints[1].id.cf.typeB = b2ContactFeatureType.e_face;

    ref.i1 = primaryAxis.index;
    ref.i2 = ref.i1 + 1 < tempPolygonB.count ? ref.i1 + 1 : 0;
    ref.v1.Copy(tempPolygonB.vertices[ref.i1]);
    ref.v2.Copy(tempPolygonB.vertices[ref.i2]);
    ref.normal.Copy(tempPolygonB.normals[ref.i1]);

    // CCW winding
    ref.sideNormal1.Set(ref.normal.y, -ref.normal.x);
    ref.sideNormal2.Copy(ref.sideNormal1).SelfNeg(); // ref.sideNormal2 = -ref.sideNormal1;
  }

  ref.sideOffset1 = b2Vec2.DotVV(ref.sideNormal1, ref.v1);
  ref.sideOffset2 = b2Vec2.DotVV(ref.sideNormal2, ref.v2);

  // Clip incident edge against reference face side planes
  // b2ClipVertex clipPoints1[2];
  const clipPoints1: [b2ClipVertex, b2ClipVertex] = b2CollideEdgeAndPolygon_s_clipPoints1; // [new b2ClipVertex(), new b2ClipVertex()];
  // b2ClipVertex clipPoints2[2];
  const clipPoints2: [b2ClipVertex, b2ClipVertex] = b2CollideEdgeAndPolygon_s_clipPoints2; // [new b2ClipVertex(), new b2ClipVertex()];
  // int32 np;
  let np: number;

  // Clip to side 1
  np = b2ClipSegmentToLine(clipPoints1, clipPoints, ref.sideNormal1, ref.sideOffset1, ref.i1);

  if (np < b2_maxManifoldPoints) {
    return;
  }

  // Clip to side 2
  np = b2ClipSegmentToLine(clipPoints2, clipPoints1, ref.sideNormal2, ref.sideOffset2, ref.i2);

  if (np < b2_maxManifoldPoints) {
    return;
  }

  // Now clipPoints2 contains the clipped points.
  if (primaryAxis.type === b2EPAxisType.e_edgeA) {
    manifold.localNormal.Copy(ref.normal);
    manifold.localPoint.Copy(ref.v1);
  } else {
    manifold.localNormal.Copy(polygonB.m_normals[ref.i1]);
    manifold.localPoint.Copy(polygonB.m_vertices[ref.i1]);
  }

  let pointCount = 0;
  for (let i = 0; i < b2_maxManifoldPoints; ++i) {
    const separation: number = b2Vec2.DotVV(ref.normal, b2Vec2.SubVV(clipPoints2[i].v, ref.v1, b2Vec2.s_t0));

    if (separation <= radius) {
      const cp: b2ManifoldPoint = manifold.points[pointCount];

      if (primaryAxis.type === b2EPAxisType.e_edgeA) {
        b2Transform.MulTXV(xf, clipPoints2[i].v, cp.localPoint); // cp.localPoint = b2MulT(xf, clipPoints2[i].v);
        cp.id.Copy(clipPoints2[i].id);
      } else {
        cp.localPoint.Copy(clipPoints2[i].v);
        cp.id.cf.typeA = clipPoints2[i].id.cf.typeB;
        cp.id.cf.typeB = clipPoints2[i].id.cf.typeA;
        cp.id.cf.indexA = clipPoints2[i].id.cf.indexB;
        cp.id.cf.indexB = clipPoints2[i].id.cf.indexA;
      }

      ++pointCount;
    }
  }

  manifold.pointCount = pointCount;
}
