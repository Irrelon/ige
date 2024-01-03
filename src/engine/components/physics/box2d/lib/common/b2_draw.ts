/*
* Copyright (c) 2011 Erin Catto http://box2d.org
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

import { b2Transform, XY } from "./b2_math.js";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

/// Color for debug drawing. Each value has the range [0,1].
export class b2Color implements RGBA {
  public static readonly ZERO: Readonly<b2Color> = new b2Color(0, 0, 0, 0);

  public static readonly RED: Readonly<b2Color> = new b2Color(1, 0, 0);
  public static readonly GREEN: Readonly<b2Color> = new b2Color(0, 1, 0);
  public static readonly BLUE: Readonly<b2Color> = new b2Color(0, 0, 1);

  constructor(public r: number = 0.5, public g: number = 0.5, public b: number = 0.5, public a: number = 1.0) {}

  public Clone(): b2Color {
    return new b2Color().Copy(this);
  }

  public Copy(other: RGBA): this {
    this.r = other.r;
    this.g = other.g;
    this.b = other.b;
    this.a = other.a;
    return this;
  }

  public IsEqual(color: RGBA): boolean {
    return (this.r === color.r) && (this.g === color.g) && (this.b === color.b) && (this.a === color.a);
  }

  public IsZero(): boolean {
    return (this.r === 0) && (this.g === 0) && (this.b === 0) && (this.a === 0);
  }

  public Set(r: number, g: number, b: number, a: number = this.a): void {
    this.SetRGBA(r, g, b, a);
  }

  public SetByteRGB(r: number, g: number, b: number): this {
    this.r = r / 0xff;
    this.g = g / 0xff;
    this.b = b / 0xff;
    return this;
  }

  public SetByteRGBA(r: number, g: number, b: number, a: number): this {
    this.r = r / 0xff;
    this.g = g / 0xff;
    this.b = b / 0xff;
    this.a = a / 0xff;
    return this;
  }

  public SetRGB(rr: number, gg: number, bb: number): this {
    this.r = rr;
    this.g = gg;
    this.b = bb;
    return this;
  }

  public SetRGBA(rr: number, gg: number, bb: number, aa: number): this {
    this.r = rr;
    this.g = gg;
    this.b = bb;
    this.a = aa;
    return this;
  }

  public SelfAdd(color: RGBA): this {
    this.r += color.r;
    this.g += color.g;
    this.b += color.b;
    this.a += color.a;
    return this;
  }

  public Add<T extends RGBA>(color: RGBA, out: T): T {
    out.r = this.r + color.r;
    out.g = this.g + color.g;
    out.b = this.b + color.b;
    out.a = this.a + color.a;
    return out;
  }

  public SelfSub(color: RGBA): this {
    this.r -= color.r;
    this.g -= color.g;
    this.b -= color.b;
    this.a -= color.a;
    return this;
  }

  public Sub<T extends RGBA>(color: RGBA, out: T): T {
    out.r = this.r - color.r;
    out.g = this.g - color.g;
    out.b = this.b - color.b;
    out.a = this.a - color.a;
    return out;
  }

  public SelfMul(s: number): this {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    this.a *= s;
    return this;
  }

  public Mul<T extends RGBA>(s: number, out: T): T {
    out.r = this.r * s;
    out.g = this.g * s;
    out.b = this.b * s;
    out.a = this.a * s;
    return out;
  }

  public Mix(mixColor: RGBA, strength: number): void {
    b2Color.MixColors(this, mixColor, strength);
  }

  public static MixColors(colorA: RGBA, colorB: RGBA, strength: number): void {
    const dr = (strength * (colorB.r - colorA.r));
    const dg = (strength * (colorB.g - colorA.g));
    const db = (strength * (colorB.b - colorA.b));
    const da = (strength * (colorB.a - colorA.a));
    colorA.r += dr;
    colorA.g += dg;
    colorA.b += db;
    colorA.a += da;
    colorB.r -= dr;
    colorB.g -= dg;
    colorB.b -= db;
    colorB.a -= da;
  }

  public MakeStyleString(alpha: number = this.a): string {
    return b2Color.MakeStyleString(this.r, this.g, this.b, alpha);
  }

  public static MakeStyleString(r: number, g: number, b: number, a: number = 1.0): string {
    // function clamp(x: number, lo: number, hi: number) { return x < lo ? lo : hi < x ? hi : x; }
    r *= 255; // r = clamp(r, 0, 255);
    g *= 255; // g = clamp(g, 0, 255);
    b *= 255; // b = clamp(b, 0, 255);
    // a = clamp(a, 0, 1);
    if (a < 1) {
      return `rgba(${r},${g},${b},${a})`;
    } else {
      return `rgb(${r},${g},${b})`;
    }
  }
}

export class b2TypedColor implements b2Color {
  public readonly data: Float32Array;
  public get r(): number { return this.data[0]; } public set r(value: number) { this.data[0] = value; }
  public get g(): number { return this.data[1]; } public set g(value: number) { this.data[1] = value; }
  public get b(): number { return this.data[2]; } public set b(value: number) { this.data[2] = value; }
  public get a(): number { return this.data[3]; } public set a(value: number) { this.data[3] = value; }

  constructor();
  constructor(data: Float32Array);
  constructor(rr: number, gg: number, bb: number);
  constructor(rr: number, gg: number, bb: number, aa: number);
  constructor(...args: any[]) {
    if (args[0] instanceof Float32Array) {
      if (args[0].length !== 4) { throw new Error(); }
      this.data = args[0];
    } else {
      const rr: number = typeof args[0] === "number" ? args[0] : 0.5;
      const gg: number = typeof args[1] === "number" ? args[1] : 0.5;
      const bb: number = typeof args[2] === "number" ? args[2] : 0.5;
      const aa: number = typeof args[3] === "number" ? args[3] : 1.0;
      this.data = new Float32Array([ rr, gg, bb, aa ]);
    }
  }

  public Clone(): b2TypedColor {
    return new b2TypedColor(new Float32Array(this.data));
  }

  public Copy(other: RGBA): this {
    if (other instanceof b2TypedColor) {
      this.data.set(other.data);
    }
    else {
      this.r = other.r;
      this.g = other.g;
      this.b = other.b;
      this.a = other.a;
    }
    return this;
  }

  public IsEqual(color: RGBA): boolean {
    return (this.r === color.r) && (this.g === color.g) && (this.b === color.b) && (this.a === color.a);
  }

  public IsZero(): boolean {
    return (this.r === 0) && (this.g === 0) && (this.b === 0) && (this.a === 0);
  }

  public Set(r: number, g: number, b: number, a: number = this.a): void {
    this.SetRGBA(r, g, b, a);
  }

  public SetByteRGB(r: number, g: number, b: number): this {
    this.r = r / 0xff;
    this.g = g / 0xff;
    this.b = b / 0xff;
    return this;
  }

  public SetByteRGBA(r: number, g: number, b: number, a: number): this {
    this.r = r / 0xff;
    this.g = g / 0xff;
    this.b = b / 0xff;
    this.a = a / 0xff;
    return this;
  }

  public SetRGB(rr: number, gg: number, bb: number): this {
    this.r = rr;
    this.g = gg;
    this.b = bb;
    return this;
  }

  public SetRGBA(rr: number, gg: number, bb: number, aa: number): this {
    this.r = rr;
    this.g = gg;
    this.b = bb;
    this.a = aa;
    return this;
  }

  public SelfAdd(color: RGBA): this {
    this.r += color.r;
    this.g += color.g;
    this.b += color.b;
    this.a += color.a;
    return this;
  }

  public Add<T extends RGBA>(color: RGBA, out: T): T {
    out.r = this.r + color.r;
    out.g = this.g + color.g;
    out.b = this.b + color.b;
    out.a = this.a + color.a;
    return out;
  }

  public SelfSub(color: RGBA): this {
    this.r -= color.r;
    this.g -= color.g;
    this.b -= color.b;
    this.a -= color.a;
    return this;
  }

  public Sub<T extends RGBA>(color: RGBA, out: T): T {
    out.r = this.r - color.r;
    out.g = this.g - color.g;
    out.b = this.b - color.b;
    out.a = this.a - color.a;
    return out;
  }

  public SelfMul(s: number): this {
    this.r *= s;
    this.g *= s;
    this.b *= s;
    this.a *= s;
    return this;
  }

  public Mul<T extends RGBA>(s: number, out: T): T {
    out.r = this.r * s;
    out.g = this.g * s;
    out.b = this.b * s;
    out.a = this.a * s;
    return out;
  }

  public Mix(mixColor: RGBA, strength: number): void {
    b2Color.MixColors(this, mixColor, strength);
  }

  public MakeStyleString(alpha: number = this.a): string {
    return b2Color.MakeStyleString(this.r, this.g, this.b, alpha);
  }
}

export enum b2DrawFlags {
  e_none = 0,
  e_shapeBit = 0x0001, ///< draw shapes
  e_jointBit = 0x0002, ///< draw joint connections
  e_aabbBit = 0x0004, ///< draw axis aligned bounding boxes
  e_pairBit = 0x0008, ///< draw broad-phase pairs
  e_centerOfMassBit = 0x0010, ///< draw center of mass frame
  // #if B2_ENABLE_PARTICLE
  e_particleBit = 0x0020, ///< draw particles
  // #endif
  // #if B2_ENABLE_CONTROLLER
  e_controllerBit = 0x0040, /// @see b2Controller list
  // #endif
  e_all = 0x003f,
}

/// Implement and register this class with a b2World to provide debug drawing of physics
/// entities in your game.
export abstract class b2Draw {
  public m_drawFlags: b2DrawFlags = 0;

  public SetFlags(flags: b2DrawFlags): void {
    this.m_drawFlags = flags;
  }

  public GetFlags(): b2DrawFlags {
    return this.m_drawFlags;
  }

  public AppendFlags(flags: b2DrawFlags): void {
    this.m_drawFlags |= flags;
  }

  public ClearFlags(flags: b2DrawFlags): void {
    this.m_drawFlags &= ~flags;
  }

  public abstract PushTransform(xf: b2Transform): void;

  public abstract PopTransform(xf: b2Transform): void;

  public abstract DrawPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;

  public abstract DrawSolidPolygon(vertices: XY[], vertexCount: number, color: RGBA): void;

  public abstract DrawCircle(center: XY, radius: number, color: RGBA): void;

  public abstract DrawSolidCircle(center: XY, radius: number, axis: XY, color: RGBA): void;

  // #if B2_ENABLE_PARTICLE
  public abstract DrawParticles(centers: XY[], radius: number, colors: RGBA[] | null, count: number): void;
  // #endif

  public abstract DrawSegment(p1: XY, p2: XY, color: RGBA): void;

  public abstract DrawTransform(xf: b2Transform): void;

  public abstract DrawPoint(p: XY, size: number, color: RGBA): void;
}
