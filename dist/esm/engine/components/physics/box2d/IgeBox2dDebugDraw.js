import { b2DrawFlags } from "../../../../export/exports.js"
export class igeBox2dDebugDraw {
    m_drawFlags = b2DrawFlags.e_none;
    AppendFlags(flags) { }
    ClearFlags(flags) { }
    DrawCircle(center, radius, color) { }
    DrawParticles(centers, radius, colors, count) { }
    DrawPoint(p, size, color) { }
    DrawPolygon(vertices, vertexCount, color) { }
    DrawSegment(p1, p2, color) { }
    DrawSolidCircle(center, radius, axis, color) { }
    DrawSolidPolygon(vertices, vertexCount, color) { }
    DrawTransform(xf) { }
    GetFlags() {
        return this.m_drawFlags;
    }
    PopTransform(xf) { }
    PushTransform(xf) { }
    SetFlags(flags) { }
}
