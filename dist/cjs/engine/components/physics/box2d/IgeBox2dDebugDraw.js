"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeBox2dDebugDraw = void 0;
const b2_draw_1 = require("./lib/common/b2_draw.js");
class igeBox2dDebugDraw {
    constructor() {
        this.m_drawFlags = b2_draw_1.b2DrawFlags.e_none;
    }
    AppendFlags(flags) {
    }
    ClearFlags(flags) {
    }
    DrawCircle(center, radius, color) {
    }
    DrawParticles(centers, radius, colors, count) {
    }
    DrawPoint(p, size, color) {
    }
    DrawPolygon(vertices, vertexCount, color) {
    }
    DrawSegment(p1, p2, color) {
    }
    DrawSolidCircle(center, radius, axis, color) {
    }
    DrawSolidPolygon(vertices, vertexCount, color) {
    }
    DrawTransform(xf) {
    }
    GetFlags() {
        return this.m_drawFlags;
    }
    PopTransform(xf) {
    }
    PushTransform(xf) {
    }
    SetFlags(flags) {
    }
}
exports.igeBox2dDebugDraw = igeBox2dDebugDraw;
