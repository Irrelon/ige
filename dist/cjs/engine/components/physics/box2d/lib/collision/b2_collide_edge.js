"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2CollideEdgeAndPolygon = exports.b2CollideEdgeAndCircle = void 0;
// DEBUG: import { b2Assert } from "../common/b2_settings.js"
const b2_settings_js_1 = require("../common/b2_settings.js");
const b2_math_js_1 = require("../common/b2_math.js");
const b2_collision_js_1 = require("./b2_collision.js");
const b2_collision_js_2 = require("./b2_collision.js");
const b2CollideEdgeAndCircle_s_Q = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_e = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_d = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_e1 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_e2 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_P = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_n = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndCircle_s_id = new b2_collision_js_1.b2ContactID();
function b2CollideEdgeAndCircle(manifold, edgeA, xfA, circleB, xfB) {
    manifold.pointCount = 0;
    // Compute circle in frame of edge
    const Q = b2_math_js_1.b2Transform.MulTXV(xfA, b2_math_js_1.b2Transform.MulXV(xfB, circleB.m_p, b2_math_js_1.b2Vec2.s_t0), b2CollideEdgeAndCircle_s_Q);
    const A = edgeA.m_vertex1;
    const B = edgeA.m_vertex2;
    const e = b2_math_js_1.b2Vec2.SubVV(B, A, b2CollideEdgeAndCircle_s_e);
    // Normal points to the right for a CCW winding
    // b2Vec2 n(e.y, -e.x);
    // const n: b2Vec2 = b2CollideEdgeAndCircle_s_n.Set(-e.y, e.x);
    const n = b2CollideEdgeAndCircle_s_n.Set(e.y, -e.x);
    // float offset = b2Dot(n, Q - A);
    const offset = b2_math_js_1.b2Vec2.DotVV(n, b2_math_js_1.b2Vec2.SubVV(Q, A, b2_math_js_1.b2Vec2.s_t0));
    const oneSided = edgeA.m_oneSided;
    if (oneSided && offset < 0.0) {
        return;
    }
    // Barycentric coordinates
    const u = b2_math_js_1.b2Vec2.DotVV(e, b2_math_js_1.b2Vec2.SubVV(B, Q, b2_math_js_1.b2Vec2.s_t0));
    const v = b2_math_js_1.b2Vec2.DotVV(e, b2_math_js_1.b2Vec2.SubVV(Q, A, b2_math_js_1.b2Vec2.s_t0));
    const radius = edgeA.m_radius + circleB.m_radius;
    // const cf: b2ContactFeature = new b2ContactFeature();
    const id = b2CollideEdgeAndCircle_s_id;
    id.cf.indexB = 0;
    id.cf.typeB = b2_collision_js_1.b2ContactFeatureType.e_vertex;
    // Region A
    if (v <= 0) {
        const P = A;
        const d = b2_math_js_1.b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
        const dd = b2_math_js_1.b2Vec2.DotVV(d, d);
        if (dd > radius * radius) {
            return;
        }
        // Is there an edge connected to A?
        if (edgeA.m_oneSided) {
            const A1 = edgeA.m_vertex0;
            const B1 = A;
            const e1 = b2_math_js_1.b2Vec2.SubVV(B1, A1, b2CollideEdgeAndCircle_s_e1);
            const u1 = b2_math_js_1.b2Vec2.DotVV(e1, b2_math_js_1.b2Vec2.SubVV(B1, Q, b2_math_js_1.b2Vec2.s_t0));
            // Is the circle in Region AB of the previous edge?
            if (u1 > 0) {
                return;
            }
        }
        id.cf.indexA = 0;
        id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        manifold.pointCount = 1;
        manifold.type = b2_collision_js_2.b2ManifoldType.e_circles;
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
        const P = B;
        const d = b2_math_js_1.b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
        const dd = b2_math_js_1.b2Vec2.DotVV(d, d);
        if (dd > radius * radius) {
            return;
        }
        // Is there an edge connected to B?
        if (edgeA.m_oneSided) {
            const B2 = edgeA.m_vertex3;
            const A2 = B;
            const e2 = b2_math_js_1.b2Vec2.SubVV(B2, A2, b2CollideEdgeAndCircle_s_e2);
            const v2 = b2_math_js_1.b2Vec2.DotVV(e2, b2_math_js_1.b2Vec2.SubVV(Q, A2, b2_math_js_1.b2Vec2.s_t0));
            // Is the circle in Region AB of the next edge?
            if (v2 > 0) {
                return;
            }
        }
        id.cf.indexA = 1;
        id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        manifold.pointCount = 1;
        manifold.type = b2_collision_js_2.b2ManifoldType.e_circles;
        manifold.localNormal.SetZero();
        manifold.localPoint.Copy(P);
        manifold.points[0].id.Copy(id);
        // manifold.points[0].id.key = 0;
        // manifold.points[0].id.cf = cf;
        manifold.points[0].localPoint.Copy(circleB.m_p);
        return;
    }
    // Region AB
    const den = b2_math_js_1.b2Vec2.DotVV(e, e);
    // DEBUG: b2Assert(den > 0);
    const P = b2CollideEdgeAndCircle_s_P;
    P.x = (1 / den) * (u * A.x + v * B.x);
    P.y = (1 / den) * (u * A.y + v * B.y);
    const d = b2_math_js_1.b2Vec2.SubVV(Q, P, b2CollideEdgeAndCircle_s_d);
    const dd = b2_math_js_1.b2Vec2.DotVV(d, d);
    if (dd > radius * radius) {
        return;
    }
    if (offset < 0) {
        n.Set(-n.x, -n.y);
    }
    n.Normalize();
    id.cf.indexA = 0;
    id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_face;
    manifold.pointCount = 1;
    manifold.type = b2_collision_js_2.b2ManifoldType.e_faceA;
    manifold.localNormal.Copy(n);
    manifold.localPoint.Copy(A);
    manifold.points[0].id.Copy(id);
    // manifold.points[0].id.key = 0;
    // manifold.points[0].id.cf = cf;
    manifold.points[0].localPoint.Copy(circleB.m_p);
}
exports.b2CollideEdgeAndCircle = b2CollideEdgeAndCircle;
var b2EPAxisType;
(function (b2EPAxisType) {
    b2EPAxisType[b2EPAxisType["e_unknown"] = 0] = "e_unknown";
    b2EPAxisType[b2EPAxisType["e_edgeA"] = 1] = "e_edgeA";
    b2EPAxisType[b2EPAxisType["e_edgeB"] = 2] = "e_edgeB";
})(b2EPAxisType || (b2EPAxisType = {}));
class b2EPAxis {
    constructor() {
        this.normal = new b2_math_js_1.b2Vec2();
        this.type = b2EPAxisType.e_unknown;
        this.index = 0;
        this.separation = 0;
    }
}
class b2TempPolygon {
    constructor() {
        this.vertices = [];
        this.normals = [];
        this.count = 0;
    }
}
class b2ReferenceFace {
    constructor() {
        this.i1 = 0;
        this.i2 = 0;
        this.v1 = new b2_math_js_1.b2Vec2();
        this.v2 = new b2_math_js_1.b2Vec2();
        this.normal = new b2_math_js_1.b2Vec2();
        this.sideNormal1 = new b2_math_js_1.b2Vec2();
        this.sideOffset1 = 0;
        this.sideNormal2 = new b2_math_js_1.b2Vec2();
        this.sideOffset2 = 0;
    }
}
// static b2EPAxis b2ComputeEdgeSeparation(const b2TempPolygon& polygonB, const b2Vec2& v1, const b2Vec2& normal1)
const b2ComputeEdgeSeparation_s_axis = new b2EPAxis();
const b2ComputeEdgeSeparation_s_axes = [new b2_math_js_1.b2Vec2(), new b2_math_js_1.b2Vec2()];
function b2ComputeEdgeSeparation(polygonB, v1, normal1) {
    // b2EPAxis axis;
    const axis = b2ComputeEdgeSeparation_s_axis;
    axis.type = b2EPAxisType.e_edgeA;
    axis.index = -1;
    axis.separation = -Number.MAX_VALUE; // -FLT_MAX;
    axis.normal.SetZero();
    // b2Vec2 axes[2] = { normal1, -normal1 };
    const axes = b2ComputeEdgeSeparation_s_axes;
    axes[0].Copy(normal1);
    axes[1].Copy(normal1).SelfNeg();
    // Find axis with least overlap (min-max problem)
    for (let j = 0; j < 2; ++j) {
        let sj = Number.MAX_VALUE; // FLT_MAX;
        // Find deepest polygon vertex along axis j
        for (let i = 0; i < polygonB.count; ++i) {
            // float si = b2Dot(axes[j], polygonB.vertices[i] - v1);
            const si = b2_math_js_1.b2Vec2.DotVV(axes[j], b2_math_js_1.b2Vec2.SubVV(polygonB.vertices[i], v1, b2_math_js_1.b2Vec2.s_t0));
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
const b2ComputePolygonSeparation_s_n = new b2_math_js_1.b2Vec2();
function b2ComputePolygonSeparation(polygonB, v1, v2) {
    const axis = b2ComputePolygonSeparation_s_axis;
    axis.type = b2EPAxisType.e_unknown;
    axis.index = -1;
    axis.separation = -Number.MAX_VALUE; // -FLT_MAX;
    axis.normal.SetZero();
    for (let i = 0; i < polygonB.count; ++i) {
        // b2Vec2 n = -polygonB.normals[i];
        const n = b2_math_js_1.b2Vec2.NegV(polygonB.normals[i], b2ComputePolygonSeparation_s_n);
        // float s1 = b2Dot(n, polygonB.vertices[i] - v1);
        const s1 = b2_math_js_1.b2Vec2.DotVV(n, b2_math_js_1.b2Vec2.SubVV(polygonB.vertices[i], v1, b2_math_js_1.b2Vec2.s_t0));
        // float s2 = b2Dot(n, polygonB.vertices[i] - v2);
        const s2 = b2_math_js_1.b2Vec2.DotVV(n, b2_math_js_1.b2Vec2.SubVV(polygonB.vertices[i], v2, b2_math_js_1.b2Vec2.s_t0));
        // float s = b2Min(s1, s2);
        const s = (0, b2_math_js_1.b2Min)(s1, s2);
        if (s > axis.separation) {
            axis.type = b2EPAxisType.e_edgeB;
            axis.index = i;
            axis.separation = s;
            axis.normal.Copy(n);
        }
    }
    return axis;
}
const b2CollideEdgeAndPolygon_s_xf = new b2_math_js_1.b2Transform();
const b2CollideEdgeAndPolygon_s_centroidB = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_edge1 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_normal1 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_edge0 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_normal0 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_edge2 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_normal2 = new b2_math_js_1.b2Vec2();
const b2CollideEdgeAndPolygon_s_tempPolygonB = new b2TempPolygon();
const b2CollideEdgeAndPolygon_s_ref = new b2ReferenceFace();
const b2CollideEdgeAndPolygon_s_clipPoints = [new b2_collision_js_2.b2ClipVertex(), new b2_collision_js_2.b2ClipVertex()];
const b2CollideEdgeAndPolygon_s_clipPoints1 = [new b2_collision_js_2.b2ClipVertex(), new b2_collision_js_2.b2ClipVertex()];
const b2CollideEdgeAndPolygon_s_clipPoints2 = [new b2_collision_js_2.b2ClipVertex(), new b2_collision_js_2.b2ClipVertex()];
function b2CollideEdgeAndPolygon(manifold, edgeA, xfA, polygonB, xfB) {
    manifold.pointCount = 0;
    // b2Transform xf = b2MulT(xfA, xfB);
    const xf = b2_math_js_1.b2Transform.MulTXX(xfA, xfB, b2CollideEdgeAndPolygon_s_xf);
    // b2Vec2 centroidB = b2Mul(xf, polygonB.m_centroid);
    const centroidB = b2_math_js_1.b2Transform.MulXV(xf, polygonB.m_centroid, b2CollideEdgeAndPolygon_s_centroidB);
    // b2Vec2 v1 = edgeA.m_vertex1;
    const v1 = edgeA.m_vertex1;
    // b2Vec2 v2 = edgeA.m_vertex2;
    const v2 = edgeA.m_vertex2;
    // b2Vec2 edge1 = v2 - v1;
    const edge1 = b2_math_js_1.b2Vec2.SubVV(v2, v1, b2CollideEdgeAndPolygon_s_edge1);
    edge1.Normalize();
    // Normal points to the right for a CCW winding
    // b2Vec2 normal1(edge1.y, -edge1.x);
    const normal1 = b2CollideEdgeAndPolygon_s_normal1.Set(edge1.y, -edge1.x);
    // float offset1 = b2Dot(normal1, centroidB - v1);
    const offset1 = b2_math_js_1.b2Vec2.DotVV(normal1, b2_math_js_1.b2Vec2.SubVV(centroidB, v1, b2_math_js_1.b2Vec2.s_t0));
    const oneSided = edgeA.m_oneSided;
    if (oneSided && offset1 < 0.0) {
        return;
    }
    // Get polygonB in frameA
    // b2TempPolygon tempPolygonB;
    const tempPolygonB = b2CollideEdgeAndPolygon_s_tempPolygonB;
    tempPolygonB.count = polygonB.m_count;
    for (let i = 0; i < polygonB.m_count; ++i) {
        if (tempPolygonB.vertices.length <= i) {
            tempPolygonB.vertices.push(new b2_math_js_1.b2Vec2());
        }
        if (tempPolygonB.normals.length <= i) {
            tempPolygonB.normals.push(new b2_math_js_1.b2Vec2());
        }
        // tempPolygonB.vertices[i] = b2Mul(xf, polygonB.m_vertices[i]);
        b2_math_js_1.b2Transform.MulXV(xf, polygonB.m_vertices[i], tempPolygonB.vertices[i]);
        // tempPolygonB.normals[i] = b2Mul(xf.q, polygonB.m_normals[i]);
        b2_math_js_1.b2Rot.MulRV(xf.q, polygonB.m_normals[i], tempPolygonB.normals[i]);
    }
    const radius = polygonB.m_radius + edgeA.m_radius;
    // b2EPAxis edgeAxis = b2ComputeEdgeSeparation(tempPolygonB, v1, normal1);
    const edgeAxis = b2ComputeEdgeSeparation(tempPolygonB, v1, normal1);
    if (edgeAxis.separation > radius) {
        return;
    }
    // b2EPAxis polygonAxis = b2ComputePolygonSeparation(tedge0.y, -edge0.xempPolygonB, v1, v2);
    const polygonAxis = b2ComputePolygonSeparation(tempPolygonB, v1, v2);
    if (polygonAxis.separation > radius) {
        return;
    }
    // Use hysteresis for jitter reduction.
    const k_relativeTol = 0.98;
    const k_absoluteTol = 0.001;
    // b2EPAxis primaryAxis;
    let primaryAxis;
    if (polygonAxis.separation - radius > k_relativeTol * (edgeAxis.separation - radius) + k_absoluteTol) {
        primaryAxis = polygonAxis;
    }
    else {
        primaryAxis = edgeAxis;
    }
    if (oneSided) {
        // Smooth collision
        // See https://box2d.org/posts/2020/06/ghost-collisions/
        // b2Vec2 edge0 = v1 - edgeA.m_vertex0;
        const edge0 = b2_math_js_1.b2Vec2.SubVV(v1, edgeA.m_vertex0, b2CollideEdgeAndPolygon_s_edge0);
        edge0.Normalize();
        // b2Vec2 normal0(edge0.y, -edge0.x);
        const normal0 = b2CollideEdgeAndPolygon_s_normal0.Set(edge0.y, -edge0.x);
        const convex1 = b2_math_js_1.b2Vec2.CrossVV(edge0, edge1) >= 0.0;
        // b2Vec2 edge2 = edgeA.m_vertex3 - v2;
        const edge2 = b2_math_js_1.b2Vec2.SubVV(edgeA.m_vertex3, v2, b2CollideEdgeAndPolygon_s_edge2);
        edge2.Normalize();
        // b2Vec2 normal2(edge2.y, -edge2.x);
        const normal2 = b2CollideEdgeAndPolygon_s_normal2.Set(edge2.y, -edge2.x);
        const convex2 = b2_math_js_1.b2Vec2.CrossVV(edge1, edge2) >= 0.0;
        const sinTol = 0.1;
        const side1 = b2_math_js_1.b2Vec2.DotVV(primaryAxis.normal, edge1) <= 0.0;
        // Check Gauss Map
        if (side1) {
            if (convex1) {
                if (b2_math_js_1.b2Vec2.CrossVV(primaryAxis.normal, normal0) > sinTol) {
                    // Skip region
                    return;
                }
                // Admit region
            }
            else {
                // Snap region
                primaryAxis = edgeAxis;
            }
        }
        else {
            if (convex2) {
                if (b2_math_js_1.b2Vec2.CrossVV(normal2, primaryAxis.normal) > sinTol) {
                    // Skip region
                    return;
                }
                // Admit region
            }
            else {
                // Snap region
                primaryAxis = edgeAxis;
            }
        }
    }
    // b2ClipVertex clipPoints[2];
    const clipPoints = b2CollideEdgeAndPolygon_s_clipPoints;
    // b2ReferenceFace ref;
    const ref = b2CollideEdgeAndPolygon_s_ref;
    if (primaryAxis.type === b2EPAxisType.e_edgeA) {
        manifold.type = b2_collision_js_2.b2ManifoldType.e_faceA;
        // Search for the polygon normal that is most anti-parallel to the edge normal.
        let bestIndex = 0;
        let bestValue = b2_math_js_1.b2Vec2.DotVV(primaryAxis.normal, tempPolygonB.normals[0]);
        for (let i = 1; i < tempPolygonB.count; ++i) {
            const value = b2_math_js_1.b2Vec2.DotVV(primaryAxis.normal, tempPolygonB.normals[i]);
            if (value < bestValue) {
                bestValue = value;
                bestIndex = i;
            }
        }
        const i1 = bestIndex;
        const i2 = i1 + 1 < tempPolygonB.count ? i1 + 1 : 0;
        clipPoints[0].v.Copy(tempPolygonB.vertices[i1]);
        clipPoints[0].id.cf.indexA = 0;
        clipPoints[0].id.cf.indexB = i1;
        clipPoints[0].id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_face;
        clipPoints[0].id.cf.typeB = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        clipPoints[1].v.Copy(tempPolygonB.vertices[i2]);
        clipPoints[1].id.cf.indexA = 0;
        clipPoints[1].id.cf.indexB = i2;
        clipPoints[1].id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_face;
        clipPoints[1].id.cf.typeB = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        ref.i1 = 0;
        ref.i2 = 1;
        ref.v1.Copy(v1);
        ref.v2.Copy(v2);
        ref.normal.Copy(primaryAxis.normal);
        ref.sideNormal1.Copy(edge1).SelfNeg(); // ref.sideNormal1 = -edge1;
        ref.sideNormal2.Copy(edge1);
    }
    else {
        manifold.type = b2_collision_js_2.b2ManifoldType.e_faceB;
        clipPoints[0].v.Copy(v2);
        clipPoints[0].id.cf.indexA = 1;
        clipPoints[0].id.cf.indexB = primaryAxis.index;
        clipPoints[0].id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        clipPoints[0].id.cf.typeB = b2_collision_js_1.b2ContactFeatureType.e_face;
        clipPoints[1].v.Copy(v1);
        clipPoints[1].id.cf.indexA = 0;
        clipPoints[1].id.cf.indexB = primaryAxis.index;
        clipPoints[1].id.cf.typeA = b2_collision_js_1.b2ContactFeatureType.e_vertex;
        clipPoints[1].id.cf.typeB = b2_collision_js_1.b2ContactFeatureType.e_face;
        ref.i1 = primaryAxis.index;
        ref.i2 = ref.i1 + 1 < tempPolygonB.count ? ref.i1 + 1 : 0;
        ref.v1.Copy(tempPolygonB.vertices[ref.i1]);
        ref.v2.Copy(tempPolygonB.vertices[ref.i2]);
        ref.normal.Copy(tempPolygonB.normals[ref.i1]);
        // CCW winding
        ref.sideNormal1.Set(ref.normal.y, -ref.normal.x);
        ref.sideNormal2.Copy(ref.sideNormal1).SelfNeg(); // ref.sideNormal2 = -ref.sideNormal1;
    }
    ref.sideOffset1 = b2_math_js_1.b2Vec2.DotVV(ref.sideNormal1, ref.v1);
    ref.sideOffset2 = b2_math_js_1.b2Vec2.DotVV(ref.sideNormal2, ref.v2);
    // Clip incident edge against reference face side planes
    // b2ClipVertex clipPoints1[2];
    const clipPoints1 = b2CollideEdgeAndPolygon_s_clipPoints1; // [new b2ClipVertex(), new b2ClipVertex()];
    // b2ClipVertex clipPoints2[2];
    const clipPoints2 = b2CollideEdgeAndPolygon_s_clipPoints2; // [new b2ClipVertex(), new b2ClipVertex()];
    // int32 np;
    let np;
    // Clip to side 1
    np = (0, b2_collision_js_2.b2ClipSegmentToLine)(clipPoints1, clipPoints, ref.sideNormal1, ref.sideOffset1, ref.i1);
    if (np < b2_settings_js_1.b2_maxManifoldPoints) {
        return;
    }
    // Clip to side 2
    np = (0, b2_collision_js_2.b2ClipSegmentToLine)(clipPoints2, clipPoints1, ref.sideNormal2, ref.sideOffset2, ref.i2);
    if (np < b2_settings_js_1.b2_maxManifoldPoints) {
        return;
    }
    // Now clipPoints2 contains the clipped points.
    if (primaryAxis.type === b2EPAxisType.e_edgeA) {
        manifold.localNormal.Copy(ref.normal);
        manifold.localPoint.Copy(ref.v1);
    }
    else {
        manifold.localNormal.Copy(polygonB.m_normals[ref.i1]);
        manifold.localPoint.Copy(polygonB.m_vertices[ref.i1]);
    }
    let pointCount = 0;
    for (let i = 0; i < b2_settings_js_1.b2_maxManifoldPoints; ++i) {
        const separation = b2_math_js_1.b2Vec2.DotVV(ref.normal, b2_math_js_1.b2Vec2.SubVV(clipPoints2[i].v, ref.v1, b2_math_js_1.b2Vec2.s_t0));
        if (separation <= radius) {
            const cp = manifold.points[pointCount];
            if (primaryAxis.type === b2EPAxisType.e_edgeA) {
                b2_math_js_1.b2Transform.MulTXV(xf, clipPoints2[i].v, cp.localPoint); // cp.localPoint = b2MulT(xf, clipPoints2[i].v);
                cp.id.Copy(clipPoints2[i].id);
            }
            else {
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
exports.b2CollideEdgeAndPolygon = b2CollideEdgeAndPolygon;
