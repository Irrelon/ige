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

import { b2_linearSlop, b2_maxFloat, b2_maxManifoldPoints } from "../common/b2_settings.js";
import { b2Vec2, b2Transform, b2Rot } from "../common/b2_math.js";
import { b2Manifold, b2ClipVertex, b2ContactFeature, b2ContactFeatureType, b2ManifoldType, b2ClipSegmentToLine, b2ManifoldPoint } from "./b2_collision.js";
import { b2PolygonShape } from "./b2_polygon_shape.js";

// Find the max separation between poly1 and poly2 using edge normals from poly1.
const b2FindMaxSeparation_s_xf: b2Transform = new b2Transform();
const b2FindMaxSeparation_s_n: b2Vec2 = new b2Vec2();
const b2FindMaxSeparation_s_v1: b2Vec2 = new b2Vec2();
function b2FindMaxSeparation(edgeIndex: [number], poly1: b2PolygonShape, xf1: b2Transform, poly2: b2PolygonShape, xf2: b2Transform): number {
  const count1: number = poly1.m_count;
  const count2: number = poly2.m_count;
  const n1s: b2Vec2[] = poly1.m_normals;
  const v1s: b2Vec2[] = poly1.m_vertices;
  const v2s: b2Vec2[] = poly2.m_vertices;
  const xf: b2Transform = b2Transform.MulTXX(xf2, xf1, b2FindMaxSeparation_s_xf);

  let bestIndex: number = 0;
  let maxSeparation: number = -b2_maxFloat;

  for (let i: number = 0; i < count1; ++i) {
    // Get poly1 normal in frame2.
    const n: b2Vec2 = b2Rot.MulRV(xf.q, n1s[i], b2FindMaxSeparation_s_n);
    const v1: b2Vec2 = b2Transform.MulXV(xf, v1s[i], b2FindMaxSeparation_s_v1);

    // Find deepest point for normal i.
    let si: number = b2_maxFloat;
    for (let j: number = 0; j < count2; ++j) {
      const sij = b2Vec2.DotVV(n, b2Vec2.SubVV(v2s[j], v1, b2Vec2.s_t0));
      if (sij < si) {
        si = sij;
      }
    }

    if (si > maxSeparation) {
      maxSeparation = si;
      bestIndex = i;
    }
  }

  edgeIndex[0] = bestIndex;
  return maxSeparation;
}

const b2FindIncidentEdge_s_normal1: b2Vec2 = new b2Vec2();
function b2FindIncidentEdge(c: [b2ClipVertex, b2ClipVertex], poly1: b2PolygonShape, xf1: b2Transform, edge1: number, poly2: b2PolygonShape, xf2: b2Transform): void {
  const normals1: b2Vec2[] = poly1.m_normals;

  const count2: number = poly2.m_count;
  const vertices2: b2Vec2[] = poly2.m_vertices;
  const normals2: b2Vec2[] = poly2.m_normals;

  // DEBUG: b2Assert(0 <= edge1 && edge1 < poly1.m_count);

  // Get the normal of the reference edge in poly2's frame.
  const normal1: b2Vec2 = b2Rot.MulTRV(xf2.q, b2Rot.MulRV(xf1.q, normals1[edge1], b2Vec2.s_t0), b2FindIncidentEdge_s_normal1);

  // Find the incident edge on poly2.
  let index: number = 0;
  let minDot: number = b2_maxFloat;
  for (let i: number = 0; i < count2; ++i) {
    const dot: number = b2Vec2.DotVV(normal1, normals2[i]);
    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }

  // Build the clip vertices for the incident edge.
  const i1: number = index;
  const i2: number = i1 + 1 < count2 ? i1 + 1 : 0;

  const c0: b2ClipVertex = c[0];
  b2Transform.MulXV(xf2, vertices2[i1], c0.v);
  const cf0: b2ContactFeature = c0.id.cf;
  cf0.indexA = edge1;
  cf0.indexB = i1;
  cf0.typeA = b2ContactFeatureType.e_face;
  cf0.typeB = b2ContactFeatureType.e_vertex;

  const c1: b2ClipVertex = c[1];
  b2Transform.MulXV(xf2, vertices2[i2], c1.v);
  const cf1: b2ContactFeature = c1.id.cf;
  cf1.indexA = edge1;
  cf1.indexB = i2;
  cf1.typeA = b2ContactFeatureType.e_face;
  cf1.typeB = b2ContactFeatureType.e_vertex;
}

// Find edge normal of max separation on A - return if separating axis is found
// Find edge normal of max separation on B - return if separation axis is found
// Choose reference edge as min(minA, minB)
// Find incident edge
// Clip

// The normal points from 1 to 2
const b2CollidePolygons_s_incidentEdge: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
const b2CollidePolygons_s_clipPoints1: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
const b2CollidePolygons_s_clipPoints2: [b2ClipVertex, b2ClipVertex] = [ new b2ClipVertex(), new b2ClipVertex() ];
const b2CollidePolygons_s_edgeA: [number] = [ 0 ];
const b2CollidePolygons_s_edgeB: [number] = [ 0 ];
const b2CollidePolygons_s_localTangent: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_localNormal: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_planePoint: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_normal: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_tangent: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_ntangent: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_v11: b2Vec2 = new b2Vec2();
const b2CollidePolygons_s_v12: b2Vec2 = new b2Vec2();
export function b2CollidePolygons(manifold: b2Manifold, polyA: b2PolygonShape, xfA: b2Transform, polyB: b2PolygonShape, xfB: b2Transform): void {
  manifold.pointCount = 0;
  const totalRadius: number = polyA.m_radius + polyB.m_radius;

  const edgeA: [number] = b2CollidePolygons_s_edgeA; edgeA[0] = 0;
  const separationA: number = b2FindMaxSeparation(edgeA, polyA, xfA, polyB, xfB);
  if (separationA > totalRadius) {
    return;
  }

  const edgeB: [number] = b2CollidePolygons_s_edgeB; edgeB[0] = 0;
  const separationB: number = b2FindMaxSeparation(edgeB, polyB, xfB, polyA, xfA);
  if (separationB > totalRadius) {
    return;
  }

  let poly1: b2PolygonShape; // reference polygon
  let poly2: b2PolygonShape; // incident polygon
  let xf1: b2Transform, xf2: b2Transform;
  let edge1: number = 0; // reference edge
  let flip: number = 0;
  const k_tol: number = 0.1 * b2_linearSlop;

  if (separationB > separationA + k_tol) {
    poly1 = polyB;
    poly2 = polyA;
    xf1 = xfB;
    xf2 = xfA;
    edge1 = edgeB[0];
    manifold.type = b2ManifoldType.e_faceB;
    flip = 1;
  } else {
    poly1 = polyA;
    poly2 = polyB;
    xf1 = xfA;
    xf2 = xfB;
    edge1 = edgeA[0];
    manifold.type = b2ManifoldType.e_faceA;
    flip = 0;
  }

  const incidentEdge: [b2ClipVertex, b2ClipVertex] = b2CollidePolygons_s_incidentEdge;
  b2FindIncidentEdge(incidentEdge, poly1, xf1, edge1, poly2, xf2);

  const count1: number = poly1.m_count;
  const vertices1: b2Vec2[] = poly1.m_vertices;

  const iv1: number = edge1;
  const iv2: number = edge1 + 1 < count1 ? edge1 + 1 : 0;

  const local_v11: b2Vec2 = vertices1[iv1];
  const local_v12: b2Vec2 = vertices1[iv2];

  const localTangent: b2Vec2 = b2Vec2.SubVV(local_v12, local_v11, b2CollidePolygons_s_localTangent);
  localTangent.Normalize();

  const localNormal: b2Vec2 = b2Vec2.CrossVOne(localTangent, b2CollidePolygons_s_localNormal);
  const planePoint: b2Vec2 = b2Vec2.MidVV(local_v11, local_v12, b2CollidePolygons_s_planePoint);

  const tangent: b2Vec2 = b2Rot.MulRV(xf1.q, localTangent, b2CollidePolygons_s_tangent);
  const normal: b2Vec2 = b2Vec2.CrossVOne(tangent, b2CollidePolygons_s_normal);

  const v11: b2Vec2 = b2Transform.MulXV(xf1, local_v11, b2CollidePolygons_s_v11);
  const v12: b2Vec2 = b2Transform.MulXV(xf1, local_v12, b2CollidePolygons_s_v12);

  // Face offset.
  const frontOffset: number = b2Vec2.DotVV(normal, v11);

  // Side offsets, extended by polytope skin thickness.
  const sideOffset1: number = -b2Vec2.DotVV(tangent, v11) + totalRadius;
  const sideOffset2: number = b2Vec2.DotVV(tangent, v12) + totalRadius;

  // Clip incident edge against extruded edge1 side edges.
  const clipPoints1: [b2ClipVertex, b2ClipVertex] = b2CollidePolygons_s_clipPoints1;
  const clipPoints2: [b2ClipVertex, b2ClipVertex] = b2CollidePolygons_s_clipPoints2;
  let np: number;

  // Clip to box side 1
  const ntangent: b2Vec2 = b2Vec2.NegV(tangent, b2CollidePolygons_s_ntangent);
  np = b2ClipSegmentToLine(clipPoints1, incidentEdge, ntangent, sideOffset1, iv1);

  if (np < 2) {
    return;
  }

  // Clip to negative box side 1
  np = b2ClipSegmentToLine(clipPoints2, clipPoints1, tangent, sideOffset2, iv2);

  if (np < 2) {
    return;
  }

  // Now clipPoints2 contains the clipped points.
  manifold.localNormal.Copy(localNormal);
  manifold.localPoint.Copy(planePoint);

  let pointCount: number = 0;
  for (let i: number = 0; i < b2_maxManifoldPoints; ++i) {
    const cv: b2ClipVertex = clipPoints2[i];
    const separation: number = b2Vec2.DotVV(normal, cv.v) - frontOffset;

    if (separation <= totalRadius) {
      const cp: b2ManifoldPoint = manifold.points[pointCount];
      b2Transform.MulTXV(xf2, cv.v, cp.localPoint);
      cp.id.Copy(cv.id);
      if (flip) {
        // Swap features
        const cf: b2ContactFeature = cp.id.cf;
        cp.id.cf.indexA = cf.indexB;
        cp.id.cf.indexB = cf.indexA;
        cp.id.cf.typeA = cf.typeB;
        cp.id.cf.typeB = cf.typeA;
      }
      ++pointCount;
    }
  }

  manifold.pointCount = pointCount;
}
