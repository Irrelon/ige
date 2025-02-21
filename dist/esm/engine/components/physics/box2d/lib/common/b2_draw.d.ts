import type { b2Transform, XY } from "./b2_math.js"
export interface RGB {
    r: number;
    g: number;
    b: number;
}
export interface RGBA extends RGB {
    a: number;
}
export declare class b2Color implements RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
    static readonly ZERO: Readonly<b2Color>;
    static readonly RED: Readonly<b2Color>;
    static readonly GREEN: Readonly<b2Color>;
    static readonly BLUE: Readonly<b2Color>;
    constructor(r?: number, g?: number, b?: number, a?: number);
    static MixColors(colorA: RGBA, colorB: RGBA, strength: number): void;
    static MakeStyleString(r: number, g: number, b: number, a?: number): string;
    Clone(): b2Color;
    Copy(other: RGBA): this;
    IsEqual(color: RGBA): boolean;
    IsZero(): boolean;
    Set(r: number, g: number, b: number, a?: number): void;
    SetByteRGB(r: number, g: number, b: number): this;
    SetByteRGBA(r: number, g: number, b: number, a: number): this;
    SetRGB(rr: number, gg: number, bb: number): this;
    SetRGBA(rr: number, gg: number, bb: number, aa: number): this;
    SelfAdd(color: RGBA): this;
    Add<T extends RGBA>(color: RGBA, out: T): T;
    SelfSub(color: RGBA): this;
    Sub<T extends RGBA>(color: RGBA, out: T): T;
    SelfMul(s: number): this;
    Mul<T extends RGBA>(s: number, out: T): T;
    Mix(mixColor: RGBA, strength: number): void;
    MakeStyleString(alpha?: number): string;
}
export declare class b2TypedColor implements b2Color {
    readonly data: Float32Array;
    constructor();
    constructor(data: Float32Array);
    constructor(rr: number, gg: number, bb: number);
    constructor(rr: number, gg: number, bb: number, aa: number);
    get r(): number;
    set r(value: number);
    get g(): number;
    set g(value: number);
    get b(): number;
    set b(value: number);
    get a(): number;
    set a(value: number);
    Clone(): b2TypedColor;
    Copy(other: RGBA): this;
    IsEqual(color: RGBA): boolean;
    IsZero(): boolean;
    Set(r: number, g: number, b: number, a?: number): void;
    SetByteRGB(r: number, g: number, b: number): this;
    SetByteRGBA(r: number, g: number, b: number, a: number): this;
    SetRGB(rr: number, gg: number, bb: number): this;
    SetRGBA(rr: number, gg: number, bb: number, aa: number): this;
    SelfAdd(color: RGBA): this;
    Add<T extends RGBA>(color: RGBA, out: T): T;
    SelfSub(color: RGBA): this;
    Sub<T extends RGBA>(color: RGBA, out: T): T;
    SelfMul(s: number): this;
    Mul<T extends RGBA>(s: number, out: T): T;
    Mix(mixColor: RGBA, strength: number): void;
    MakeStyleString(alpha?: number): string;
}
export declare enum b2DrawFlags {
    e_none = 0,
    e_shapeBit = 1,///< draw shapes
    e_jointBit = 2,///< draw joint connections
    e_aabbBit = 4,///< draw axis aligned bounding boxes
    e_pairBit = 8,///< draw broad-phase pairs
    e_centerOfMassBit = 16,///< draw center of mass frame
    e_particleBit = 32,///< draw particles
    e_controllerBit = 64,/// @see b2Controller list
    e_all = 63
}
export declare abstract class b2Draw {
    m_drawFlags: b2DrawFlags;
    SetFlags(flags: b2DrawFlags): void;
    GetFlags(): b2DrawFlags;
    AppendFlags(flags: b2DrawFlags): void;
    ClearFlags(flags: b2DrawFlags): void;
    abstract PushTransform(xf: b2Transform): void;
    abstract PopTransform(xf: b2Transform): void;
    abstract DrawPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;
    abstract DrawSolidPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;
    abstract DrawCircle(center: XY, radius: number, color: RGBA): void;
    abstract DrawSolidCircle(center: XY, radius: number, axis: XY, color: RGBA): void;
    abstract DrawParticles(centers: XY[], radius: number, colors: RGBA[] | null, count: number): void;
    abstract DrawSegment(p1: XY, p2: XY, color: RGBA): void;
    abstract DrawTransform(xf: b2Transform): void;
    abstract DrawPoint(p: XY, size: number, color: RGBA): void;
}
