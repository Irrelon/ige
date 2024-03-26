import { RGBA, XY } from "./lib/index.js"
import { b2Draw, b2DrawFlags } from "./lib/common/b2_draw.js"
import { b2Transform } from "./lib/common/b2_math.js"
export declare class igeBox2dDebugDraw implements b2Draw {
    m_drawFlags: b2DrawFlags;
    AppendFlags(flags: b2DrawFlags): void;
    ClearFlags(flags: b2DrawFlags): void;
    DrawCircle(center: XY, radius: number, color: RGBA): void;
    DrawParticles(centers: XY[], radius: number, colors: RGBA[] | null, count: number): void;
    DrawPoint(p: XY, size: number, color: RGBA): void;
    DrawPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;
    DrawSegment(p1: XY, p2: XY, color: RGBA): void;
    DrawSolidCircle(center: XY, radius: number, axis: XY, color: RGBA): void;
    DrawSolidPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;
    DrawTransform(xf: b2Transform): void;
    GetFlags(): b2DrawFlags;
    PopTransform(xf: b2Transform): void;
    PushTransform(xf: b2Transform): void;
    SetFlags(flags: b2DrawFlags): void;
}
