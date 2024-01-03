import { b2_maxFloat, b2_epsilon } from "../common/b2_settings.js"
import { b2Vec2, b2Transform } from "../common/b2_math.js"
import { b2ManifoldType } from "./b2_collision.js"
const b2CollideCircles_s_pA = new b2Vec2();
const b2CollideCircles_s_pB = new b2Vec2();
export function b2CollideCircles(manifold, circleA, xfA, circleB, xfB) {
    manifold.pointCount = 0;
    const pA = b2Transform.MulXV(xfA, circleA.m_p, b2CollideCircles_s_pA);
    const pB = b2Transform.MulXV(xfB, circleB.m_p, b2CollideCircles_s_pB);
    const distSqr = b2Vec2.DistanceSquaredVV(pA, pB);
    const radius = circleA.m_radius + circleB.m_radius;
    if (distSqr > radius * radius) {
        return;
    }
    manifold.type = b2ManifoldType.e_circles;
    manifold.localPoint.Copy(circleA.m_p);
    manifold.localNormal.SetZero();
    manifold.pointCount = 1;
    manifold.points[0].localPoint.Copy(circleB.m_p);
    manifold.points[0].id.key = 0;
}
const b2CollidePolygonAndCircle_s_c = new b2Vec2();
const b2CollidePolygonAndCircle_s_cLocal = new b2Vec2();
const b2CollidePolygonAndCircle_s_faceCenter = new b2Vec2();
export function b2CollidePolygonAndCircle(manifold, polygonA, xfA, circleB, xfB) {
    manifold.pointCount = 0;
    // Compute circle position in the frame of the polygon.
    const c = b2Transform.MulXV(xfB, circleB.m_p, b2CollidePolygonAndCircle_s_c);
    const cLocal = b2Transform.MulTXV(xfA, c, b2CollidePolygonAndCircle_s_cLocal);
    // Find the min separating edge.
    let normalIndex = 0;
    let separation = (-b2_maxFloat);
    const radius = polygonA.m_radius + circleB.m_radius;
    const vertexCount = polygonA.m_count;
    const vertices = polygonA.m_vertices;
    const normals = polygonA.m_normals;
    for (let i = 0; i < vertexCount; ++i) {
        const s = b2Vec2.DotVV(normals[i], b2Vec2.SubVV(cLocal, vertices[i], b2Vec2.s_t0));
        if (s > radius) {
            // Early out.
            return;
        }
        if (s > separation) {
            separation = s;
            normalIndex = i;
        }
    }
    // Vertices that subtend the incident face.
    const vertIndex1 = normalIndex;
    const vertIndex2 = (vertIndex1 + 1) % vertexCount;
    const v1 = vertices[vertIndex1];
    const v2 = vertices[vertIndex2];
    // If the center is inside the polygon ...
    if (separation < b2_epsilon) {
        manifold.pointCount = 1;
        manifold.type = b2ManifoldType.e_faceA;
        manifold.localNormal.Copy(normals[normalIndex]);
        b2Vec2.MidVV(v1, v2, manifold.localPoint);
        manifold.points[0].localPoint.Copy(circleB.m_p);
        manifold.points[0].id.key = 0;
        return;
    }
    // Compute barycentric coordinates
    const u1 = b2Vec2.DotVV(b2Vec2.SubVV(cLocal, v1, b2Vec2.s_t0), b2Vec2.SubVV(v2, v1, b2Vec2.s_t1));
    const u2 = b2Vec2.DotVV(b2Vec2.SubVV(cLocal, v2, b2Vec2.s_t0), b2Vec2.SubVV(v1, v2, b2Vec2.s_t1));
    if (u1 <= 0) {
        if (b2Vec2.DistanceSquaredVV(cLocal, v1) > radius * radius) {
            return;
        }
        manifold.pointCount = 1;
        manifold.type = b2ManifoldType.e_faceA;
        b2Vec2.SubVV(cLocal, v1, manifold.localNormal).SelfNormalize();
        manifold.localPoint.Copy(v1);
        manifold.points[0].localPoint.Copy(circleB.m_p);
        manifold.points[0].id.key = 0;
    }
    else if (u2 <= 0) {
        if (b2Vec2.DistanceSquaredVV(cLocal, v2) > radius * radius) {
            return;
        }
        manifold.pointCount = 1;
        manifold.type = b2ManifoldType.e_faceA;
        b2Vec2.SubVV(cLocal, v2, manifold.localNormal).SelfNormalize();
        manifold.localPoint.Copy(v2);
        manifold.points[0].localPoint.Copy(circleB.m_p);
        manifold.points[0].id.key = 0;
    }
    else {
        const faceCenter = b2Vec2.MidVV(v1, v2, b2CollidePolygonAndCircle_s_faceCenter);
        const separation = b2Vec2.DotVV(b2Vec2.SubVV(cLocal, faceCenter, b2Vec2.s_t1), normals[vertIndex1]);
        if (separation > radius) {
            return;
        }
        manifold.pointCount = 1;
        manifold.type = b2ManifoldType.e_faceA;
        manifold.localNormal.Copy(normals[vertIndex1]).SelfNormalize();
        manifold.localPoint.Copy(faceCenter);
        manifold.points[0].localPoint.Copy(circleB.m_p);
        manifold.points[0].id.key = 0;
    }
}
